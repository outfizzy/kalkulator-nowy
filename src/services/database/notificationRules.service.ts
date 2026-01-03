import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../types';

export interface NotificationRule {
    id: string;
    eventType: string;
    role: UserRole;
    isEnabled: boolean;
}

export const NotificationRulesService = {
    async getRules(): Promise<NotificationRule[]> {
        const { data, error } = await supabase
            .from('notification_rules')
            .select('*')
            .order('event_type');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            eventType: row.event_type,
            role: row.role as UserRole,
            isEnabled: row.is_enabled
        }));
    },

    async updateRule(id: string, isEnabled: boolean): Promise<void> {
        const { error } = await supabase
            .from('notification_rules')
            .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Checks if a specific role should be notified about an event.
     * Uses a cached approach or direct query. For now, direct query for simplicity.
     */
    async shouldNotify(eventType: string, role: UserRole): Promise<boolean> {
        // Optimization: In a high-traffic app, fetch all rules once and cache them.
        // For this scale, a single indexed query is fine.
        const { data, error } = await supabase
            .from('notification_rules')
            .select('is_enabled')
            .eq('event_type', eventType)
            .eq('role', role)
            .single();

        if (error || !data) {
            // Default to true if no rule exists (fail open) or false (fail closed)?
            // Let's fail OPEN for Admins, CLOSED for others if rule missing.
            return role === 'admin';
        }

        return data.is_enabled;
    }
};
