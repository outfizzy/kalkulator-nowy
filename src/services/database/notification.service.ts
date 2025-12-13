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
            isRead: row.read,
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
            .eq('read', false);

        if (error) throw error;
        return count || 0;
    },

    async markNotificationAsRead(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) throw error;
    },

    async markAllNotificationsAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) throw error;
    }
};
