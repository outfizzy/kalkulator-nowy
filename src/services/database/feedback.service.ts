import { supabase } from '../../lib/supabase';

export interface CustomerFeedback {
    id: string;
    token: string;
    contractId?: string;
    customerId?: string;
    installationId?: string;
    ratingOverall?: number;
    ratingService?: number;
    ratingProduction?: number;
    ratingInstallation?: number;
    commentDe?: string;
    commentPl?: string;
    highlights?: string;
    improvements?: string;
    customerName?: string;
    customerEmail?: string;
    salesRepId?: string;
    sentAt?: Date;
    submittedAt?: Date;
    status: 'pending' | 'submitted' | 'google_redirected';
    googleRedirected: boolean;
    createdAt: Date;
}

export const FeedbackService = {
    /**
     * Create a feedback request (generates token, sends email later)
     */
    async createFeedbackRequest(params: {
        contractId?: string;
        customerId?: string;
        installationId?: string;
        customerName: string;
        customerEmail: string;
        salesRepId?: string;
    }): Promise<{ token: string; id: string }> {
        const { data, error } = await supabase
            .from('customer_feedback')
            .insert({
                contract_id: params.contractId,
                customer_id: params.customerId,
                installation_id: params.installationId,
                customer_name: params.customerName,
                customer_email: params.customerEmail,
                sales_rep_id: params.salesRepId,
                sent_at: new Date().toISOString(),
                status: 'pending'
            })
            .select('id, token')
            .single();

        if (error) throw error;
        return { token: data.token, id: data.id };
    },

    /**
     * Get feedback by token (public - for form)
     */
    async getFeedbackByToken(token: string): Promise<CustomerFeedback | null> {
        const { data, error } = await supabase
            .from('customer_feedback')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return mapFeedback(data);
    },

    /**
     * Submit feedback (public - from form)
     */
    async submitFeedback(token: string, feedback: {
        ratingOverall: number;
        ratingService: number;
        ratingProduction: number;
        ratingInstallation: number;
        commentDe?: string;
        highlights?: string;
        improvements?: string;
    }): Promise<void> {
        const { error } = await supabase
            .from('customer_feedback')
            .update({
                rating_overall: feedback.ratingOverall,
                rating_service: feedback.ratingService,
                rating_production: feedback.ratingProduction,
                rating_installation: feedback.ratingInstallation,
                comment_de: feedback.commentDe,
                highlights: feedback.highlights,
                improvements: feedback.improvements,
                submitted_at: new Date().toISOString(),
                status: 'submitted'
            })
            .eq('token', token);

        if (error) throw error;
    },

    /**
     * Mark as Google redirected
     */
    async markGoogleRedirected(token: string): Promise<void> {
        await supabase
            .from('customer_feedback')
            .update({
                google_redirected: true,
                status: 'google_redirected'
            })
            .eq('token', token);
    },

    /**
     * Get all feedback (admin/manager)
     */
    async getAllFeedback(): Promise<CustomerFeedback[]> {
        const { data, error } = await supabase
            .from('customer_feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapFeedback);
    },

    /**
     * Update Polish translation
     */
    async updateTranslation(id: string, commentPl: string): Promise<void> {
        const { error } = await supabase
            .from('customer_feedback')
            .update({ comment_pl: commentPl })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Get feedback stats
     */
    async getStats(): Promise<{
        total: number;
        submitted: number;
        avgOverall: number;
        avgService: number;
        avgProduction: number;
        avgInstallation: number;
        fiveStarCount: number;
        googleRedirectCount: number;
    }> {
        const { data, error } = await supabase
            .from('customer_feedback')
            .select('*');

        if (error) throw error;
        const all = data || [];
        const submitted = all.filter(f => f.submitted_at);
        const withRating = submitted.filter(f => f.rating_overall);

        return {
            total: all.length,
            submitted: submitted.length,
            avgOverall: avg(withRating.map(f => f.rating_overall)),
            avgService: avg(withRating.map(f => f.rating_service)),
            avgProduction: avg(withRating.map(f => f.rating_production)),
            avgInstallation: avg(withRating.map(f => f.rating_installation)),
            fiveStarCount: withRating.filter(f => f.rating_overall === 5).length,
            googleRedirectCount: all.filter(f => f.google_redirected).length,
        };
    }
};

function avg(nums: (number | null)[]): number {
    const valid = nums.filter((n): n is number => n !== null && n !== undefined);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((s, n) => s + n, 0) / valid.length) * 10) / 10;
}

function mapFeedback(row: any): CustomerFeedback {
    return {
        id: row.id,
        token: row.token,
        contractId: row.contract_id,
        customerId: row.customer_id,
        installationId: row.installation_id,
        ratingOverall: row.rating_overall,
        ratingService: row.rating_service,
        ratingProduction: row.rating_production,
        ratingInstallation: row.rating_installation,
        commentDe: row.comment_de,
        commentPl: row.comment_pl,
        highlights: row.highlights,
        improvements: row.improvements,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        salesRepId: row.sales_rep_id,
        sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
        submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
        status: row.status,
        googleRedirected: row.google_redirected,
        createdAt: new Date(row.created_at)
    };
}
