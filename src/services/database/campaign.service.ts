import { supabase } from '../../lib/supabase';

export interface Campaign {
    id: string;
    name: string;
    subject: string;
    htmlBody: string;
    templateId?: string;
    status: 'draft' | 'sending' | 'sent' | 'failed' | 'cancelled';
    images: string[];
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    sentAt?: Date;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    openedCount: number;
}

export interface CampaignRecipient {
    id: string;
    campaignId: string;
    email: string;
    name?: string;
    customerId?: string;
    leadId?: string;
    status: 'pending' | 'sent' | 'failed' | 'bounced' | 'skipped';
    sentAt?: Date;
    errorMessage?: string;
}

export interface EmailUnsubscribe {
    id: string;
    email: string;
    token: string;
    customerId?: string;
    leadId?: string;
    unsubscribedAt: Date;
    source: 'link' | 'manual' | 'bounce';
}

function mapCampaign(row: any): Campaign {
    return {
        id: row.id,
        name: row.name,
        subject: row.subject,
        htmlBody: row.html_body,
        templateId: row.template_id,
        status: row.status,
        images: row.images || [],
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
        totalRecipients: row.total_recipients || 0,
        sentCount: row.sent_count || 0,
        failedCount: row.failed_count || 0,
        openedCount: row.opened_count || 0,
    };
}

function mapRecipient(row: any): CampaignRecipient {
    return {
        id: row.id,
        campaignId: row.campaign_id,
        email: row.email,
        name: row.name,
        customerId: row.customer_id,
        leadId: row.lead_id,
        status: row.status,
        sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
        errorMessage: row.error_message,
    };
}

export const CampaignService = {
    // ── Campaigns ─────────────────────────────────────────

    async getCampaigns(): Promise<Campaign[]> {
        const { data, error } = await supabase
            .from('email_campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapCampaign);
    },

    async getCampaign(id: string): Promise<Campaign> {
        const { data, error } = await supabase
            .from('email_campaigns')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return mapCampaign(data);
    },

    async createCampaign(input: {
        name: string;
        subject: string;
        htmlBody: string;
        templateId?: string;
        images?: string[];
        createdBy?: string;
    }): Promise<Campaign> {
        const { data, error } = await supabase
            .from('email_campaigns')
            .insert({
                name: input.name,
                subject: input.subject,
                html_body: input.htmlBody,
                template_id: input.templateId,
                images: input.images || [],
                created_by: input.createdBy,
            })
            .select()
            .single();
        if (error) throw error;
        return mapCampaign(data);
    },

    async updateCampaign(id: string, updates: Partial<{
        name: string;
        subject: string;
        htmlBody: string;
        templateId: string;
        images: string[];
        status: string;
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        sentAt: string;
    }>): Promise<Campaign> {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
        if (updates.htmlBody !== undefined) dbUpdates.html_body = updates.htmlBody;
        if (updates.templateId !== undefined) dbUpdates.template_id = updates.templateId;
        if (updates.images !== undefined) dbUpdates.images = updates.images;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.totalRecipients !== undefined) dbUpdates.total_recipients = updates.totalRecipients;
        if (updates.sentCount !== undefined) dbUpdates.sent_count = updates.sentCount;
        if (updates.failedCount !== undefined) dbUpdates.failed_count = updates.failedCount;
        if (updates.sentAt !== undefined) dbUpdates.sent_at = updates.sentAt;

        const { data, error } = await supabase
            .from('email_campaigns')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return mapCampaign(data);
    },

    async deleteCampaign(id: string): Promise<void> {
        const { error } = await supabase
            .from('email_campaigns')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ── Recipients ────────────────────────────────────────

    async getRecipients(campaignId: string): Promise<CampaignRecipient[]> {
        const { data, error } = await supabase
            .from('campaign_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []).map(mapRecipient);
    },

    async addRecipients(campaignId: string, recipients: {
        email: string;
        name?: string;
        customerId?: string;
        leadId?: string;
    }[]): Promise<void> {
        const rows = recipients.map(r => ({
            campaign_id: campaignId,
            email: r.email,
            name: r.name,
            customer_id: r.customerId,
            lead_id: r.leadId,
        }));
        const { error } = await supabase
            .from('campaign_recipients')
            .insert(rows);
        if (error) throw error;
    },

    async clearRecipients(campaignId: string): Promise<void> {
        const { error } = await supabase
            .from('campaign_recipients')
            .delete()
            .eq('campaign_id', campaignId);
        if (error) throw error;
    },

    // ── Unsubscribes ──────────────────────────────────────

    async getUnsubscribed(): Promise<EmailUnsubscribe[]> {
        const { data, error } = await supabase
            .from('email_unsubscribes')
            .select('*')
            .order('unsubscribed_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((r: any) => ({
            id: r.id,
            email: r.email,
            token: r.token,
            customerId: r.customer_id,
            leadId: r.lead_id,
            unsubscribedAt: new Date(r.unsubscribed_at),
            source: r.source,
        }));
    },

    async getUnsubscribedEmails(): Promise<Set<string>> {
        const { data, error } = await supabase
            .from('email_unsubscribes')
            .select('email');
        if (error) throw error;
        return new Set((data || []).map((r: any) => r.email.toLowerCase()));
    },

    async addUnsubscribe(email: string, customerId?: string, leadId?: string): Promise<void> {
        const { error } = await supabase
            .from('email_unsubscribes')
            .upsert({
                email: email.toLowerCase(),
                customer_id: customerId,
                lead_id: leadId,
                source: 'manual',
            }, { onConflict: 'email' });
        if (error) throw error;

        // Also update customer record
        if (customerId) {
            await supabase
                .from('customers')
                .update({ email_subscribed: false })
                .eq('id', customerId);
        }
    },

    async removeUnsubscribe(email: string): Promise<void> {
        const { data: unsub } = await supabase
            .from('email_unsubscribes')
            .select('customer_id')
            .eq('email', email.toLowerCase())
            .single();

        const { error } = await supabase
            .from('email_unsubscribes')
            .delete()
            .eq('email', email.toLowerCase());
        if (error) throw error;

        if (unsub?.customer_id) {
            await supabase
                .from('customers')
                .update({ email_subscribed: true })
                .eq('id', unsub.customer_id);
        }
    },

    // ── Eligible recipients ───────────────────────────────

    async getEligibleRecipients(segment: string = 'all', statusFilter?: string[]): Promise<{
        email: string;
        name: string;
        customerId?: string;
        leadId?: string;
        status: string;
        source: 'customer' | 'lead';
    }[]> {
        // Get unsubscribed emails (safe, returns empty set on error)
        let unsubscribed = new Set<string>();
        try {
            const { data: unsubs } = await supabase
                .from('email_unsubscribes')
                .select('email')
                .not('unsubscribed_at', 'is', null);
            unsubscribed = new Set((unsubs || []).map((r: any) => r.email.toLowerCase()));
        } catch (e) {
            console.warn('Could not load unsubscribes:', e);
        }

        const results: any[] = [];
        const seenEmails = new Set<string>();

        const addCustomer = (c: any, statusLabel: string = 'customer') => {
            if (!c.email || c.email_subscribed === false) return;
            const emailLower = c.email.toLowerCase().trim();
            if (unsubscribed.has(emailLower) || seenEmails.has(emailLower)) return;
            seenEmails.add(emailLower);
            results.push({
                email: c.email,
                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
                customerId: c.id,
                status: statusLabel,
                source: 'customer' as const,
            });
        };

        // ── Load customers based on segment ──
        const loadCustomers = segment === 'all' || segment === 'customers' || segment === 'customers_with_offers' || segment === 'customers_with_contracts';
        const loadLeads = segment === 'all' || segment === 'all_leads' || segment === 'leads_by_status';

        if (loadCustomers) {
            try {
                if (segment === 'customers_with_offers') {
                    // Join with offers table to find customers who have at least one offer
                    const { data: offerCustomerIds } = await supabase
                        .from('offers')
                        .select('customer_id')
                        .not('customer_id', 'is', null);
                    const uniqueIds = [...new Set((offerCustomerIds || []).map(o => o.customer_id).filter(Boolean))];
                    if (uniqueIds.length > 0) {
                        const { data: customers, error } = await supabase
                            .from('customers')
                            .select('id, email, first_name, last_name, email_subscribed')
                            .in('id', uniqueIds)
                            .not('email', 'is', null)
                            .neq('email', '');
                        if (error) throw error;
                        for (const c of (customers || [])) addCustomer(c, 'z ofertą');
                    }
                } else if (segment === 'customers_with_contracts') {
                    // Join with contracts table (client_id) for signed/active contracts
                    const { data: contractClientIds } = await supabase
                        .from('contracts')
                        .select('client_id')
                        .not('client_id', 'is', null);
                    const uniqueIds = [...new Set((contractClientIds || []).map(c => c.client_id).filter(Boolean))];
                    if (uniqueIds.length > 0) {
                        const { data: customers, error } = await supabase
                            .from('customers')
                            .select('id, email, first_name, last_name, email_subscribed')
                            .in('id', uniqueIds)
                            .not('email', 'is', null)
                            .neq('email', '');
                        if (error) throw error;
                        for (const c of (customers || [])) addCustomer(c, 'z umową');
                    }
                } else {
                    // All customers
                    const { data: customers, error: custErr } = await supabase
                        .from('customers')
                        .select('id, email, first_name, last_name, email_subscribed')
                        .not('email', 'is', null)
                        .neq('email', '');
                    if (custErr) throw custErr;
                    for (const c of (customers || [])) addCustomer(c);
                }
            } catch (e) {
                console.error('Error loading customers:', e);
            }
        }

        // ── Load leads ──
        if (loadLeads) {
            try {
                let leadsQuery = supabase
                    .from('leads')
                    .select('id, status, customer_data, customer_id');

                if (segment === 'leads_by_status' && statusFilter && statusFilter.length > 0) {
                    leadsQuery = leadsQuery.in('status', statusFilter);
                }

                const { data: leads, error: leadErr } = await leadsQuery;
                if (leadErr) throw leadErr;

                // Pre-load linked customers for name fallback
                const customerIds = (leads || [])
                    .map(l => l.customer_id)
                    .filter(Boolean);
                
                let customerMap = new Map<string, { first_name: string; last_name: string; email: string }>();
                if (customerIds.length > 0) {
                    const { data: linkedCustomers } = await supabase
                        .from('customers')
                        .select('id, first_name, last_name, email')
                        .in('id', customerIds);
                    for (const c of (linkedCustomers || [])) {
                        customerMap.set(c.id, c);
                    }
                }

                for (const l of (leads || [])) {
                    const cd = l.customer_data as any;
                    const linkedCust = l.customer_id ? customerMap.get(l.customer_id) : null;

                    const email = cd?.email || cd?.Email || cd?.e_mail || linkedCust?.email;
                    if (!email) continue;

                    const emailLower = email.toLowerCase().trim();
                    if (unsubscribed.has(emailLower) || seenEmails.has(emailLower)) continue;
                    seenEmails.add(emailLower);

                    let name = '';
                    const firstName = cd?.firstName || cd?.first_name || cd?.vorname || linkedCust?.first_name || '';
                    const lastName = cd?.lastName || cd?.last_name || cd?.nachname || linkedCust?.last_name || '';
                    name = `${firstName} ${lastName}`.trim();
                    if (!name) name = cd?.name || email;

                    results.push({
                        email,
                        name,
                        leadId: l.id,
                        customerId: l.customer_id,
                        status: l.status,
                        source: 'lead' as const,
                    });
                }
            } catch (e) {
                console.error('Error loading leads:', e);
            }
        }

        return results;
    },

    // ── Geo-radius recipient search ──────────────────────

    async getGeoRecipients(plz: string, radiusKm: number): Promise<{
        email: string;
        name: string;
        customerId?: string;
        leadId?: string;
        plz: string;
        city: string;
        distance: number;
        status: string;
        source: 'customer' | 'lead';
    }[]> {
        const { data, error } = await supabase.functions.invoke('plz-radius', {
            body: { plz, radiusKm },
        });

        if (error) {
            console.error('Geo search error:', error);
            throw new Error(error.message || 'Fehler bei der PLZ-Suche');
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return data?.recipients || [];
    },

    // ── Send Campaign ─────────────────────────────────────

    async sendCampaign(campaignId: string): Promise<void> {
        const { error } = await supabase.functions.invoke('send-campaign', {
            body: { campaignId }
        });
        if (error) throw error;
    },

    async getCampaignStats(): Promise<{
        totalCampaigns: number;
        totalSent: number;
        totalOpened: number;
        totalFailed: number;
        totalUnsubscribed: number;
        openRate: number;
    }> {
        const campaigns = await this.getCampaigns();
        const { count: unsubCount } = await supabase
            .from('email_unsubscribes')
            .select('*', { count: 'exact', head: true })
            .not('unsubscribed_at', 'is', null);

        const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
        const totalOpened = campaigns.reduce((sum, c) => sum + c.openedCount, 0);
        const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);

        return {
            totalCampaigns: campaigns.length,
            totalSent,
            totalOpened,
            totalFailed,
            totalUnsubscribed: unsubCount || 0,
            openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        };
    },

    // ── Upload image ──────────────────────────────────────

    async uploadCampaignImage(file: File): Promise<string> {
        // Compress image client-side before upload
        const compressed = await this._compressImage(file, 1200, 0.8);
        const ext = 'jpg'; // Always use jpg after compression
        const path = `campaigns/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { error } = await supabase.storage
            .from('campaign-images')
            .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
        if (error) {
            console.error('Campaign image upload error:', error);
            throw new Error(`Upload fehlgeschlagen: ${error.message}`);
        }

        const { data: urlData } = supabase.storage
            .from('campaign-images')
            .getPublicUrl(path);

        return urlData.publicUrl;
    },

    /** Compress an image file to maxWidth px and quality (0-1). Returns a Blob. */
    _compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Downscale if wider than maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas not supported')); return; }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Compression failed'));
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
            img.src = URL.createObjectURL(file);
        });
    },
};
