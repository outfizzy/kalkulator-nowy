import { supabase } from '../../lib/supabase';

export interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details: any;
    createdAt: Date;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export const ActivityService = {
    async logActivity(
        userId: string,
        action: string,
        entityType: string,
        entityId: string | null = null,
        details: any = {}
    ): Promise<void> {
        try {
            await supabase.from('activity_logs').insert({
                user_id: userId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                details
            });
        } catch (error) {
            console.error('Failed to log activity:', error);
            // Non-blocking error
        }
    },

    async getLogs(limit = 50, offset = 0, filters?: any): Promise<ActivityLog[]> {
        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                user:users(first_name, last_name, email)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters?.entityType) {
            query = query.eq('entity_type', filters.entityType);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            details: row.details,
            createdAt: new Date(row.created_at),
            user: row.user ? {
                firstName: row.user.first_name,
                lastName: row.user.last_name,
                email: row.user.email
            } : undefined
        }));
    }
};
