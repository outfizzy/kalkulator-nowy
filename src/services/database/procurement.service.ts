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
            id: row.unique_id, // Map unique_id from view to id in interface
            uniqueId: row.unique_id, // Also keep uniqueId if needed, but id is cleaner
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
            ownerId: row.owner_id
        }));
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
