import { supabase } from '../../lib/supabase';
import { TaskService } from './task.service';
import type { OrderRequest, OrderRequestStatus, OrderItem, OrderItemStatus } from '../../types';
import { PostgrestError } from '@supabase/supabase-js';

export const OrderService = {
    // --- Order Requests ---
    async createOrderRequest(request: Omit<OrderRequest, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<{ error: PostgrestError | null }> {
        const { error } = await supabase
            .from('order_requests')
            .insert({
                user_id: request.userId,
                item_name: request.itemName,
                quantity: request.quantity,
                description: request.description,
                inventory_item_id: request.inventoryItemId,
                status: request.status
            });

        if (!error) {
            // Auto-create a task for the manager
            try {
                await TaskService.createTask({
                    title: `📦 ZAPOTRZEBOWANIE: ${request.itemName} (${request.quantity})`,
                    description: `Zgłoszono zapotrzebowanie.\nIlość: ${request.quantity}\nOpis: ${request.description || 'Brak'}\nZgłaszający ID: ${request.userId}`,
                    status: 'pending',
                    priority: 'medium',
                    type: 'other',
                    dueDate: new Date().toISOString(),
                    userId: request.userId
                });
            } catch (taskError) {
                console.error('Failed to auto-create task for order request:', taskError);
            }
        }

        return { error };
    },

    async getOrderRequests(userId?: string): Promise<OrderRequest[]> {
        let query = supabase
            .from('order_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual join for user profiles
        const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
        const profileMap = new Map<string, { full_name: string }>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            profiles?.forEach(p => profileMap.set(p.id, p));
        }

        return data.map(row => {
            const profile = profileMap.get(row.user_id);
            return {
                id: row.id,
                userId: row.user_id,
                itemName: row.item_name,
                quantity: row.quantity,
                description: row.description,
                status: row.status,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
                user: profile ? {
                    firstName: (profile.full_name || '').split(' ')[0] || '',
                    lastName: (profile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined
            };
        });
    },

    async updateOrderRequestStatus(id: string, status: OrderRequestStatus): Promise<{ error: PostgrestError | null }> {
        const { error } = await supabase
            .from('order_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        return { error };
    },

    // --- Installation Order Items ---

    async getInstallationItems(installationId: string): Promise<OrderItem[]> {
        const { data, error } = await supabase
            .from('installation_order_items')
            .select('*')
            .eq('installation_id', installationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            installationId: row.installation_id,
            name: row.name,
            type: row.type as OrderItem['type'],
            quantity: row.quantity,
            status: row.status as OrderItemStatus,
            plannedDeliveryDate: row.planned_delivery_date,
            orderedAt: row.ordered_at ? new Date(row.ordered_at) : undefined,
            notes: row.notes,
            isManagerResponsible: row.is_manager_responsible,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    },

    async addInstallationItem(item: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: OrderItem | null, error: PostgrestError | null }> {
        const { data, error } = await supabase
            .from('installation_order_items')
            .insert({
                installation_id: item.installationId,
                name: item.name,
                type: item.type,
                quantity: item.quantity,
                status: item.status,
                planned_delivery_date: item.plannedDeliveryDate,
                ordered_at: item.orderedAt ? item.orderedAt.toISOString() : null,
                notes: item.notes,
                is_manager_responsible: item.isManagerResponsible
            })
            .select()
            .single();

        if (error) return { data: null, error };

        return {
            data: {
                id: data.id,
                installationId: data.installation_id,
                name: data.name,
                type: data.type as OrderItem['type'],
                quantity: data.quantity,
                status: data.status as OrderItemStatus,
                plannedDeliveryDate: data.planned_delivery_date,
                orderedAt: data.ordered_at ? new Date(data.ordered_at) : undefined,
                notes: data.notes,
                isManagerResponsible: data.is_manager_responsible,
                createdAt: new Date(data.created_at),
                updatedAt: new Date(data.updated_at)
            },
            error: null
        };
    },

    async updateInstallationItem(id: string, updates: Partial<OrderItem>): Promise<{ error: PostgrestError | null }> {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.plannedDeliveryDate !== undefined) dbUpdates.planned_delivery_date = updates.plannedDeliveryDate;
        if (updates.orderedAt !== undefined) dbUpdates.ordered_at = updates.orderedAt?.toISOString();
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.isManagerResponsible !== undefined) dbUpdates.is_manager_responsible = updates.isManagerResponsible;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('installation_order_items')
            .update(dbUpdates)
            .eq('id', id);

        return { error };
    },

    async deleteInstallationItem(id: string): Promise<{ error: PostgrestError | null }> {
        const { error } = await supabase
            .from('installation_order_items')
            .delete()
            .eq('id', id);
        return { error };
    }
};
