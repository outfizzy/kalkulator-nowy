import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════
// FACEBOOK ADS MANAGER SERVICE
// ═══════════════════════════════════════

// ─── TYPES ───

export interface FBPost {
    id: string;
    fb_post_id: string | null;
    content: string;
    media_urls: string[];
    post_type: 'text' | 'photo' | 'video' | 'link' | 'carousel';
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    scheduled_at: string | null;
    published_at: string | null;
    insights: Record<string, any>;
    ai_generated: boolean;
    template_used: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface FBCampaign {
    id: string;
    fb_campaign_id: string | null;
    name: string;
    status: string;
    objective: string;
    buying_type: string;
    daily_budget: number | null;
    lifetime_budget: number | null;
    start_time: string | null;
    end_time: string | null;
    targeting: Record<string, any>;
    insights: Record<string, any>;
    metadata: Record<string, any>;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface FBCreative {
    id: string;
    name: string;
    type: 'image' | 'video' | 'carousel';
    media_urls: string[];
    headline: string | null;
    body: string | null;
    description: string | null;
    cta_type: string | null;
    link_url: string | null;
    tags: string[];
    is_ai_generated: boolean;
    created_by: string | null;
    created_at: string;
}

export interface FBAudience {
    id: string;
    fb_audience_id: string | null;
    name: string;
    audience_type: 'custom' | 'lookalike' | 'saved';
    source_type: string | null;
    size_estimate: number;
    filters: Record<string, any>;
    status: string;
    last_synced_at: string | null;
    created_by: string | null;
    created_at: string;
}

export interface FBTemplate {
    id: string;
    name: string;
    category: string;
    prompt_template: string;
    example_output: string | null;
    variables: string[];
    is_active: boolean;
    usage_count: number;
    created_at: string;
}

export interface FBMetric {
    id: string;
    entity_type: string;
    entity_id: string;
    date: string;
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    cpc: number;
    cpm: number;
    ctr: number;
    frequency: number;
    conversions: number;
    likes: number;
    comments: number;
    shares: number;
}

// ─── EDGE FUNCTION CALLER ───

async function callFacebookApi(action: string, params: Record<string, any> = {}): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('facebook-api', {
        body: { action, ...params },
        headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
        // Supabase FunctionsHttpError may have nested error info
        const msg = typeof error === 'string' ? error
            : error?.message || (error as any)?.context?.body || JSON.stringify(error);
        throw new Error(msg);
    }
    if (data?.error) {
        const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        throw new Error(msg);
    }
    return data;
}

// ═══════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════

export const FacebookService = {

    // ─── CONNECTION ───

    async verifyConnection(): Promise<{ page: any; adAccount: any; connected: boolean }> {
        return await callFacebookApi('verify_connection');
    },

    async refreshToken(): Promise<any> {
        return await callFacebookApi('refresh_token');
    },

    // ─── POSTS ───

    async getFBPosts(): Promise<any> {
        return await callFacebookApi('get_posts', { limit: 25 });
    },

    async publishPost(params: {
        message: string;
        link?: string;
        media_url?: string;
        scheduled_time?: string;
    }): Promise<any> {
        return await callFacebookApi('publish_post', params);
    },

    async deletePost(postId: string): Promise<any> {
        return await callFacebookApi('delete_post', { post_id: postId });
    },

    // ─── INSTAGRAM ───

    async getInstagramAccount(): Promise<any> {
        return await callFacebookApi('get_instagram_account');
    },

    async publishInstagram(params: { image_url: string; caption: string; media_type?: string }): Promise<any> {
        return await callFacebookApi('publish_instagram', params);
    },

    async publishBoth(params: { message: string; media_url?: string; caption?: string; image_url?: string }): Promise<any> {
        return await callFacebookApi('publish_both', params);
    },

    // ─── LOCAL POSTS (Supabase) ───

    async getLocalPosts(): Promise<FBPost[]> {
        const { data, error } = await supabase
            .from('facebook_posts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async saveLocalPost(post: Partial<FBPost>): Promise<FBPost> {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('facebook_posts')
            .insert({ ...post, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateLocalPost(id: string, updates: Partial<FBPost>): Promise<void> {
        const { error } = await supabase
            .from('facebook_posts')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    // ─── CAMPAIGNS ───

    async getCampaigns(): Promise<any> {
        return await callFacebookApi('get_campaigns', { limit: 50 });
    },

    async createCampaign(params: {
        name: string;
        objective?: string;
        daily_budget?: number;
        lifetime_budget?: number;
        status?: string;
        start_time?: string;
        end_time?: string;
    }): Promise<any> {
        return await callFacebookApi('create_campaign', params);
    },

    async updateCampaign(campaignId: string, updates: Record<string, any>): Promise<any> {
        return await callFacebookApi('update_campaign', { campaign_id: campaignId, ...updates });
    },

    // ─── AD SETS ───

    async getAdSets(campaignId?: string): Promise<any> {
        return await callFacebookApi('get_adsets', { campaign_id: campaignId });
    },

    async createAdSet(params: any): Promise<any> {
        return await callFacebookApi('create_adset', params);
    },

    // ─── ADS ───

    async getAds(adsetId?: string): Promise<any> {
        return await callFacebookApi('get_ads', { adset_id: adsetId });
    },

    async createAd(params: any): Promise<any> {
        return await callFacebookApi('create_ad', params);
    },

    async uploadAdImage(imageUrl: string): Promise<any> {
        return await callFacebookApi('upload_ad_image', { image_url: imageUrl });
    },

    // ─── INSIGHTS ───

    async getAccountInsights(): Promise<any> {
        return await callFacebookApi('get_account_insights');
    },

    async getInsights(params: {
        entity_id?: string;
        time_range?: { since: string; until: string };
        level?: 'account' | 'campaign' | 'adset' | 'ad';
        breakdowns?: string;
    }): Promise<any> {
        return await callFacebookApi('get_insights', params);
    },

    async getPageInsights(period?: string): Promise<any> {
        return await callFacebookApi('get_page_insights', { period: period || 'week' });
    },

    // ─── AUDIENCES ───

    async getAudiences(): Promise<any> {
        return await callFacebookApi('get_audiences');
    },

    async createAudience(params: { name: string; description?: string }): Promise<any> {
        return await callFacebookApi('create_audience', params);
    },

    // ─── COMPETITOR RESEARCH ───

    async searchAdLibrary(searchTerms?: string, country?: string): Promise<any> {
        return await callFacebookApi('search_ad_library', { search_terms: searchTerms, country });
    },

    // ─── LEAD FORMS ───

    async getLeadForms(): Promise<any> {
        return await callFacebookApi('get_lead_forms');
    },

    async getLeads(formId: string, limit?: number): Promise<any> {
        return await callFacebookApi('get_leads', { form_id: formId, limit });
    },

    // ─── TEMPLATES ───

    async getTemplates(): Promise<FBTemplate[]> {
        const { data, error } = await supabase
            .from('facebook_templates')
            .select('*')
            .eq('is_active', true)
            .order('usage_count', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createTemplate(template: Partial<FBTemplate>): Promise<FBTemplate> {
        const { data, error } = await supabase
            .from('facebook_templates')
            .insert(template)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async incrementTemplateUsage(id: string): Promise<void> {
        const { error } = await supabase.rpc('increment_counter', {
            row_id: id,
            table_name: 'facebook_templates',
            column_name: 'usage_count'
        }).catch(() => {
            // Fallback: manual increment
            return supabase
                .from('facebook_templates')
                .update({ usage_count: supabase.rpc ? undefined : 1 })
                .eq('id', id);
        });
    },

    // ─── CREATIVES ───

    async getCreatives(): Promise<FBCreative[]> {
        const { data, error } = await supabase
            .from('facebook_creatives')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async saveCreative(creative: Partial<FBCreative>): Promise<FBCreative> {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('facebook_creatives')
            .insert({ ...creative, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ─── METRICS SNAPSHOTS ───

    async saveMetricSnapshot(metric: Partial<FBMetric>): Promise<void> {
        const { error } = await supabase
            .from('facebook_metrics')
            .upsert(metric, { onConflict: 'entity_type,entity_id,date' });
        if (error) throw error;
    },

    async getMetricsHistory(entityType: string, entityId: string, days = 30): Promise<FBMetric[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
            .from('facebook_metrics')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .gte('date', since.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // ─── AI CONTENT GENERATION ───

    async generatePostContent(params: {
        templateId?: string;
        category?: string;
        variables?: Record<string, string>;
        customPrompt?: string;
    }): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        let prompt = params.customPrompt || '';

        // If using a template
        if (params.templateId) {
            const { data: template } = await supabase
                .from('facebook_templates')
                .select('*')
                .eq('id', params.templateId)
                .single();

            if (template) {
                prompt = template.prompt_template;
                // Replace variables
                if (params.variables) {
                    for (const [key, value] of Object.entries(params.variables)) {
                        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
                    }
                }
            }
        }

        if (!prompt && params.category) {
            prompt = `Napisz post na Facebooka po niemiecku dla firmy Polendach24 (aluminiowe zadaszenia tarasowe, pergole, carporty). Kategoria: ${params.category}. Ton: profesjonalny, nowoczesny. Dodaj emotikony i CTA. Max 200 słów.`;
        }

        // Call Claude via morning-coffee-ai or similar
        const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
            body: {
                type: 'custom',
                customPrompt: prompt,
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;
        return data?.analysis || data?.content || 'Content generation failed';
    },

    // ─── LOCAL CAMPAIGNS (Supabase cache) ───

    async getLocalCampaigns(): Promise<FBCampaign[]> {
        const { data, error } = await supabase
            .from('facebook_campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async saveLocalCampaign(campaign: Partial<FBCampaign>): Promise<FBCampaign> {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('facebook_campaigns')
            .insert({ ...campaign, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
};
