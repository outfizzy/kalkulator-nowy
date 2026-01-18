import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    variables: string[];
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTemplateInput {
    name: string;
    subject: string;
    body: string;
    category?: string;
    variables?: string[];
    is_active?: boolean;
}

export const EmailTemplateService = {
    async getTemplates(activeOnly = false): Promise<EmailTemplate[]> {
        let query = supabase
            .from('email_templates')
            .select('*')
            .order('name');

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createTemplate(template: CreateTemplateInput): Promise<EmailTemplate> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('email_templates')
            .insert({
                ...template,
                created_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTemplate(id: string, updates: Partial<CreateTemplateInput>): Promise<EmailTemplate> {
        const { data, error } = await supabase
            .from('email_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    parseTemplate(templateBody: string, context: Record<string, string>): string {
        let result = templateBody;
        for (const [key, value] of Object.entries(context)) {
            const placeholder = `{{${key}}}`;
            // Global replace
            result = result.split(placeholder).join(value || '');
        }
        return result;
    }
};
