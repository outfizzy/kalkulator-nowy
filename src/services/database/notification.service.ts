import { supabase } from '../../lib/supabase';
import type { Notification as AppNotification } from '../../types';

export const NotificationService = {
    async getNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            message: row.message,
            isRead: row.is_read, // Correct column name
            type: row.type || 'info', // Default to info if missing
            link: row.link,
            createdAt: new Date(row.created_at)
        }));
    },

    async getUnreadNotificationsCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false); // Correct column name

        if (error) throw error;
        return count || 0;
    },

    async markNotificationAsRead(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true }) // Correct column name
            .eq('id', id);

        if (error) throw error;
    },

    async markAllNotificationsAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true }) // Correct column name
            .eq('user_id', userId);

        if (error) throw error;
    },

    async createNotification(
        userId: string,
        type: 'info' | 'success' | 'warning' | 'error',
        title: string,
        message: string,
        link?: string,
        metadata?: any
    ): Promise<void> {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            link,
            metadata
        });

        if (error) throw error;
    }
};
