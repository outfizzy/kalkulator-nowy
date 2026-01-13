import { supabase } from '../../lib/supabase';

export interface ErrorReport {
    id: string;
    user_id?: string;
    error_message: string;
    error_stack?: string;
    component_stack?: string;
    url?: string;
    user_agent?: string;
    metadata?: any;
    status: 'new' | 'analyzed' | 'resolved' | 'ignored';
    created_at: string;
    updated_at: string;
    users?: {
        email: string;
        full_name: string;
    };
}

export const ErrorReportService = {
    async createReport(
        error: Error,
        componentStack?: string,
        metadata: any = {}
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            user_id: user?.id || null,
            error_message: error.message || 'Unknown Error',
            error_stack: error.stack,
            component_stack: componentStack,
            url: window.location.href,
            user_agent: navigator.userAgent,
            metadata: metadata,
            status: 'new'
        };

        const { error: dbError } = await supabase.from('error_reports').insert(payload);
        if (dbError) {
            console.error('Failed to submit error report:', dbError);
            // Fallback: don't throw, just log. We don't want to crash the error handler.
        }
    },

    async getReports(status?: string): Promise<ErrorReport[]> {
        let query = supabase
            .from('error_reports')
            .select(`
                *,
                users:user_id (email, full_name)
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ErrorReport[];
    },

    async updateStatus(id: string, status: 'new' | 'analyzed' | 'resolved' | 'ignored'): Promise<void> {
        const { error } = await supabase
            .from('error_reports')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    }
};
