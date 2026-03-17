import { supabase } from '../../lib/supabase';
import type { ProcurementItem, OrderedItem } from '../../types';

interface ProcurementViewRow {
    unique_id: string; // Changed from id to unique_id to match view
    source_type: 'contract' | 'installation' | 'inventory';
    source_id: string;
    item_id: string;
    reference_number: string;
    client_name: string;
    client_city: string;
    item_name: string;
    category: string;
    status: string;
    planned_delivery_date: string | null;
    delivery_week: string | null;
    confirmed_delivery_date: string | null;
    purchase_cost: number;
    created_at: string;
    owner_id: string;
    advance_paid: boolean | null;
    sales_rep_name: string | null;
    signed_at: string | null;
    details: string | null;
    technical_spec: string | null;
}

export const ProcurementService = {
    async getItems(): Promise<ProcurementItem[]> {
        const { data, error } = await supabase
            .from('view_procurement_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Use unknown cast first for safety with raw SQL views
        const rawData = data as unknown as ProcurementViewRow[];

        return rawData.map(row => ({
            id: row.unique_id,
            uniqueId: row.unique_id,
            sourceType: row.source_type,
            sourceId: row.source_id,
            itemId: row.item_id,
            referenceNumber: row.reference_number,
            clientName: row.client_name,
            clientCity: row.client_city,
            itemName: row.item_name,
            category: row.category,
            status: row.status,
            plannedDeliveryDate: row.planned_delivery_date,
            delivery_week: row.delivery_week || undefined,
            confirmed_delivery_date: row.confirmed_delivery_date || undefined,
            purchaseCost: Number(row.purchase_cost),
            createdAt: row.created_at,
            ownerId: row.owner_id,
            advancePaid: row.advance_paid ?? false,
            salesRepName: row.sales_rep_name || undefined,
            signedAt: row.signed_at || undefined,
            details: row.details || undefined,
            technicalSpec: row.technical_spec || undefined
        }));
    },

    async getItemsEnriched(): Promise<ProcurementItem[]> {
        const items = await this.getItems();

        // Enrich contract items with plannedInstallationWeeks + advance info
        const contractIds = [...new Set(items.filter(i => i.sourceType === 'contract').map(i => i.sourceId))];
        if (contractIds.length > 0) {
            const { data: contractRows } = await supabase
                .from('contracts')
                .select('id, contract_data, advance_paid, advance_amount')
                .in('id', contractIds);

            if (contractRows) {
                const contractMap = new Map<string, any>();
                contractRows.forEach((row: any) => contractMap.set(row.id, row));

                return items.map(item => {
                    if (item.sourceType === 'contract') {
                        const row = contractMap.get(item.sourceId);
                        if (row) {
                            const advanceAmount = Number(row.advance_amount) || 0;
                            return {
                                ...item,
                                plannedInstallationWeeks: row.contract_data?.plannedInstallationWeeks,
                                // Key fix: if no advance amount, treat as paid (don't block)
                                advancePaid: advanceAmount > 0 ? (row.advance_paid ?? false) : true,
                                advanceAmount,
                            } as any;
                        }
                    }
                    return item;
                });
            }
        }
        return items;
    },

    // ── Audit Log ──
    async logAction(action: string, itemName: string, contractId?: string, contractRef?: string, itemId?: string, details?: Record<string, any>) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            let userName = 'System';
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                userName = profile?.full_name || user.email || 'Unknown';
            }
            await supabase.from('procurement_audit_log').insert({
                user_id: user?.id,
                user_name: userName,
                action,
                item_id: itemId,
                item_name: itemName,
                contract_id: contractId,
                contract_ref: contractRef,
                details: details || {},
            });
        } catch (err) {
            console.error('Audit log failed (non-critical):', err);
        }
    },

    async getAuditLog(limit = 50): Promise<any[]> {
        const { data, error } = await supabase
            .from('procurement_audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) { console.error('Audit log fetch error:', error); return []; }
        return data || [];
    },

    async getProcurementStats(): Promise<{ pending: number; ordered: number; delivered: number; pendingValue: number; orderedValue: number; contractsReady: number }> {
        const items = await this.getItems();
        const pending = items.filter(i => i.status === 'pending');
        const ordered = items.filter(i => i.status === 'ordered');
        const delivered = items.filter(i => i.status === 'delivered');

        // Contracts where ALL items are delivered
        const contractGroups = new Map<string, { total: number; delivered: number }>();
        items.filter(i => i.sourceType === 'contract').forEach(i => {
            const g = contractGroups.get(i.sourceId) || { total: 0, delivered: 0 };
            g.total++;
            if (i.status === 'delivered') g.delivered++;
            contractGroups.set(i.sourceId, g);
        });
        const contractsReady = [...contractGroups.values()].filter(g => g.total > 0 && g.delivered === g.total).length;

        return {
            pending: pending.length,
            ordered: ordered.length,
            delivered: delivered.length,
            pendingValue: pending.reduce((s, i) => s + (i.purchaseCost || 0), 0),
            orderedValue: ordered.reduce((s, i) => s + (i.purchaseCost || 0), 0),
            contractsReady,
        };
    },

    async updateItemStatus(sourceType: string, sourceId: string, itemId: string, updates: Partial<OrderedItem> & { delivery_week?: string; confirmed_delivery_date?: string | null }) {
        if (sourceType === 'contract') {
            await this.updateContractItem(sourceId, itemId, updates as OrderedItem);
        } else if (sourceType === 'installation') {
            await this.updateInstallationItem(itemId, updates);
        } else if (sourceType === 'inventory') {
            await this.updateInventoryRequest(itemId, updates);
        } else {
            throw new Error(`Unknown source type: ${sourceType}`);
        }
    },

    // --- Private Update Helpers ---

    async updateContractItem(contractId: string, itemId: string, updates: Partial<OrderedItem>) {
        // 1. Fetch current contract data
        const { data: contract, error: fetchError } = await supabase
            .from('contracts')
            .select('contract_data')
            .eq('id', contractId)
            .single();

        if (fetchError) throw fetchError;

        const contractData = contract.contract_data || {};
        const items = (contractData.orderedItems || []) as OrderedItem[];

        // 2. Find and update item
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error('Item not found in contract');

        items[index] = { ...items[index], ...updates };

        // 3. Write back
        const { error: updateError } = await supabase
            .from('contracts')
            .update({
                contract_data: {
                    ...contractData,
                    orderedItems: items
                }
            })
            .eq('id', contractId);

        if (updateError) throw updateError;
    },

    async batchUpdateContractItems(contractId: string, itemUpdates: { itemId: string; updates: Partial<OrderedItem> }[]) {
        // 1. Fetch current contract data ONCE
        const { data: contract, error: fetchError } = await supabase
            .from('contracts')
            .select('contract_data')
            .eq('id', contractId)
            .single();

        if (fetchError) throw fetchError;

        const contractData = contract.contract_data || {};
        const items = (contractData.orderedItems || []) as OrderedItem[];

        // 2. Apply ALL updates to the items array
        for (const { itemId, updates } of itemUpdates) {
            const index = items.findIndex(i => i.id === itemId);
            if (index !== -1) {
                items[index] = { ...items[index], ...updates };
            }
        }

        // 3. Write back ONCE
        const { error: updateError } = await supabase
            .from('contracts')
            .update({
                contract_data: {
                    ...contractData,
                    orderedItems: items
                }
            })
            .eq('id', contractId);

        if (updateError) throw updateError;
    },

    async updateInstallationItem(itemId: string, updates: { status?: string, plannedDeliveryDate?: string, delivery_week?: string, confirmed_delivery_date?: string | null }) {
        const dbUpdates: {
            status?: string;
            ordered_at?: string;
            planned_delivery_date?: string | null;
            delivery_week?: string;
            confirmed_delivery_date?: string | null;
        } = {};
        if (updates.status) {
            dbUpdates.status = updates.status;
            if (updates.status === 'ordered') {
                dbUpdates.ordered_at = new Date().toISOString();
            }
        }
        if (updates.plannedDeliveryDate) dbUpdates.planned_delivery_date = updates.plannedDeliveryDate;
        if (updates.delivery_week !== undefined) dbUpdates.delivery_week = updates.delivery_week;
        if (updates.confirmed_delivery_date !== undefined) dbUpdates.confirmed_delivery_date = updates.confirmed_delivery_date;

        const { error } = await supabase
            .from('installation_order_items')
            .update(dbUpdates)
            .eq('id', itemId);

        if (error) throw error;
    },

    async updateInventoryRequest(requestId: string, updates: { status?: string, delivery_week?: string, confirmed_delivery_date?: string | null }) {
        const dbUpdates: {
            status?: string;
            delivery_week?: string;
            confirmed_delivery_date?: string | null;
        } = {};
        // Map 'delivered' -> 'completed' for inventory if needed
        if (updates.status) {
            if (updates.status === 'delivered') dbUpdates.status = 'completed';
            else dbUpdates.status = updates.status;
        }
        if (updates.delivery_week !== undefined) dbUpdates.delivery_week = updates.delivery_week;
        if (updates.confirmed_delivery_date !== undefined) dbUpdates.confirmed_delivery_date = updates.confirmed_delivery_date;

        const { data: request, error: updateError } = await supabase
            .from('order_requests')
            .update(dbUpdates)
            .eq('id', requestId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Auto-increment inventory if delivered
        if (updates.status === 'delivered' && request?.inventory_item_id) {
            const { InventoryService } = await import('./inventory.service');
            // Assuming quantity is in request.quantity
            try {
                // Fetch current user ID for the log
                const { data: { user } } = await supabase.auth.getUser();

                // Fetch current item to calculate new quantity
                const { data: currentInvItem } = await supabase
                    .from('inventory_items')
                    .select('quantity')
                    .eq('id', request.inventory_item_id)
                    .single();

                if (currentInvItem) {
                    const newQuantity = (currentInvItem.quantity || 0) + (request.quantity || 0);

                    await InventoryService.updateQuantity(
                        request.inventory_item_id,
                        newQuantity,
                        user?.id,
                        'purchase',
                        requestId,
                        'order_request',
                        `Automatyczne przyjęcie z zamówienia: ${request.item_name}`
                    );
                }
            } catch (err) {
                console.error('Failed to auto-increment inventory:', err);
            }
        }
    }
};
