import { supabase } from '../../lib/supabase';
import type { OrderRequest, OrderRequestStatus } from '../../types';

export const OrderService = {
    // --- Order Requests ---
    async createOrderRequest(request: Omit<OrderRequest, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<{ error: any }> {
        const { error } = await supabase
            .from('order_requests')
            .insert({
                user_id: request.userId,
                item_name: request.itemName,
                quantity: request.quantity,
                description: request.description,
                status: request.status
            });
        return { error };
    },

    async getOrderRequests(userId?: string): Promise<OrderRequest[]> {
        let query = supabase
            .from('order_requests')
            .select('*, user:profiles(full_name)')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            itemName: row.item_name,
            quantity: row.quantity,
            description: row.description,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            user: row.user ? {
                firstName: row.user.full_name?.split(' ')[0] || '',
                lastName: row.user.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async updateOrderRequestStatus(id: string, status: OrderRequestStatus): Promise<{ error: any }> {
        const { error } = await supabase
            .from('order_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        return { error };
    },
};
