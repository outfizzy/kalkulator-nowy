import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

export interface EmailFooter {
    id: string;
    name: string;
    content: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FooterAssignment {
    id: string;
    user_id: string;
    footer_id: string;
    is_default: boolean;
}

export interface CreateFooterInput {
    name: string;
    content: string;
    is_active?: boolean;
}

export const EmailFooterService = {
    async getFooters(activeOnly = false): Promise<EmailFooter[]> {
        let query = supabase
            .from('email_footers')
            .select('*')
            .order('name');

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createFooter(footer: CreateFooterInput): Promise<EmailFooter> {
        const { data, error } = await supabase
            .from('email_footers')
            .insert(footer)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateFooter(id: string, updates: Partial<CreateFooterInput>): Promise<EmailFooter> {
        const { data, error } = await supabase
            .from('email_footers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteFooter(id: string): Promise<void> {
        const { error } = await supabase
            .from('email_footers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Assignment Logic
    async getAssignmentsForFooter(footerId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('user_footer_assignments')
            .select('user_id')
            .eq('footer_id', footerId);

        if (error) throw error;
        return data?.map(a => a.user_id) || [];
    },

    async updateAssignments(footerId: string, userIds: string[]) {
        // 1. Delete existing for this footer
        // Note: This is a simple approach. For scaling, might want diffing.
        const { error: deleteError } = await supabase
            .from('user_footer_assignments')
            .delete()
            .eq('footer_id', footerId);

        if (deleteError) throw deleteError;

        if (userIds.length > 0) {
            const rows = userIds.map(uid => ({
                footer_id: footerId,
                user_id: uid,
                is_default: true // Default to true for now as we usually just interpret "assigned" as "use this"
            }));

            const { error: insertError } = await supabase
                .from('user_footer_assignments')
                .insert(rows);

            if (insertError) throw insertError;
        }
    },

    async getFooterForUser(userId: string): Promise<EmailFooter | null> {
        // Find assignment
        const { data: assignment, error } = await supabase
            .from('user_footer_assignments')
            .select('footer_id')
            .eq('user_id', userId)
            .maybeSingle(); // Assuming one footer per user for simplicty, or taking one

        if (error) console.error('Error fetching footer assignment:', error);
        if (!assignment) return null;

        // Fetch footer
        const { data: footer, error: footerError } = await supabase
            .from('email_footers')
            .select('*')
            .eq('id', assignment.footer_id)
            .single();

        if (footerError) {
            console.error('Error fetching footer content:', footerError);
            return null;
        }

        return footer;
    }
};
