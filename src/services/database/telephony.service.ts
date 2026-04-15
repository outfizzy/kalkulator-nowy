import { supabase } from '../../lib/supabase';
import { normalizePhone } from '../../utils/phone';

// ===== TYPES =====

export interface PhoneNumber {
    id: string;
    twilio_sid: string;
    phone_number: string;
    friendly_name: string;
    assigned_to: string | null;
    capabilities: { voice: boolean; sms: boolean; mms: boolean };
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    assignee?: { fullName: string };
}

export interface CallLog {
    id: string;
    twilio_call_sid: string | null;
    direction: 'inbound' | 'outbound';
    from_number: string;
    to_number: string;
    status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'missed' | 'busy' | 'failed' | 'voicemail' | 'no-answer';
    duration_seconds: number;
    recording_url: string | null;
    recording_duration: number;
    transcription: string | null;
    summary: string | null;
    sentiment: string | null;
    user_id: string | null;
    lead_id: string | null;
    customer_id: string | null;
    phone_number_id: string | null;
    notes: string;
    tags: string[];
    metadata: Record<string, any>;
    started_at: string;
    ended_at: string | null;
    created_at: string;
    // Joined
    lead?: { name: string } | null;
    customer?: { firstName: string; lastName: string } | null;
    user?: { fullName: string } | null;
}

export interface Voicemail {
    id: string;
    call_log_id: string;
    recording_url: string;
    transcription: string;
    duration_seconds: number;
    is_listened: boolean;
    listened_by: string | null;
    listened_at: string | null;
    created_at: string;
    // Joined
    call_log?: CallLog;
}

export interface SMSLog {
    id: string;
    twilio_message_sid: string | null;
    direction: 'inbound' | 'outbound';
    from_number: string;
    to_number: string;
    body: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received' | 'undelivered';
    user_id: string | null;
    lead_id: string | null;
    customer_id: string | null;
    phone_number_id: string | null;
    media_urls: string[];
    channel: 'sms' | 'whatsapp';
    error_code: string | null;
    error_message: string | null;
    created_at: string;
    // Joined
    lead?: { name: string } | null;
    customer?: { firstName: string; lastName: string } | null;
}

export interface TelephonySettings {
    [key: string]: any;
}

// ===== SERVICE =====

export const TelephonyService = {

    // ─── PHONE NUMBERS ───

    async getPhoneNumbers(): Promise<PhoneNumber[]> {
        const { data, error } = await supabase
            .from('phone_numbers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch assignee names
        const assignedIds = (data || []).filter(p => p.assigned_to).map(p => p.assigned_to);
        let profiles: Record<string, { fullName: string }> = {};

        if (assignedIds.length > 0) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', assignedIds);

            for (const p of profileData || []) {
                profiles[p.id] = { fullName: p.full_name };
            }
        }

        return (data || []).map(p => ({
            ...p,
            assignee: p.assigned_to ? profiles[p.assigned_to] : undefined
        }));
    },

    async addPhoneNumber(twilio_sid: string, phone_number: string, friendly_name: string): Promise<PhoneNumber> {
        const { data, error } = await supabase
            .from('phone_numbers')
            .insert({ twilio_sid, phone_number, friendly_name })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async assignPhoneNumber(id: string, assigned_to: string | null): Promise<void> {
        const { error } = await supabase
            .from('phone_numbers')
            .update({ assigned_to, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    async togglePhoneNumber(id: string, is_active: boolean): Promise<void> {
        const { error } = await supabase
            .from('phone_numbers')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    async deletePhoneNumber(id: string): Promise<void> {
        const { error } = await supabase
            .from('phone_numbers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── PHONE NUMBER USERS (Multi-user access) ───

    async getPhoneNumberUsers(phoneNumberId?: string): Promise<{ id: string; phone_number_id: string; user_id: string; can_whatsapp: boolean; can_voice: boolean; can_sms: boolean; created_at: string }[]> {
        let query = supabase.from('phone_number_users').select('*');
        if (phoneNumberId) query = query.eq('phone_number_id', phoneNumberId);
        const { data, error } = await query.order('created_at');
        if (error) throw error;
        return data || [];
    },

    async addPhoneNumberUser(phoneNumberId: string, userId: string, caps?: { can_whatsapp?: boolean; can_voice?: boolean; can_sms?: boolean }): Promise<void> {
        const { error } = await supabase.from('phone_number_users').upsert({
            phone_number_id: phoneNumberId,
            user_id: userId,
            can_whatsapp: caps?.can_whatsapp ?? true,
            can_voice: caps?.can_voice ?? true,
            can_sms: caps?.can_sms ?? true,
        }, { onConflict: 'phone_number_id,user_id' });
        if (error) throw error;
    },

    async removePhoneNumberUser(phoneNumberId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('phone_number_users')
            .delete()
            .eq('phone_number_id', phoneNumberId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async updatePhoneNumberUserCaps(phoneNumberId: string, userId: string, caps: { can_whatsapp?: boolean; can_voice?: boolean; can_sms?: boolean }): Promise<void> {
        const { error } = await supabase.from('phone_number_users')
            .update(caps)
            .eq('phone_number_id', phoneNumberId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    // ─── CALL LOGS ───

    async getCallLogs(options?: {
        direction?: 'inbound' | 'outbound';
        status?: string;
        userId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: CallLog[]; count: number }> {
        let query = supabase
            .from('call_logs')
            .select('*', { count: 'exact' })
            .order('started_at', { ascending: false });

        if (options?.direction) query = query.eq('direction', options.direction);
        if (options?.status) query = query.eq('status', options.status);
        if (options?.userId) query = query.eq('user_id', options.userId);
        if (options?.limit) query = query.limit(options.limit);
        if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // Enrich with lead/customer/user names
        const enriched = await this._enrichCallLogs(data || []);
        return { data: enriched, count: count || 0 };
    },

    async getCallById(id: string): Promise<CallLog | null> {
        const { data, error } = await supabase
            .from('call_logs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        const [enriched] = await this._enrichCallLogs([data]);
        return enriched;
    },

    async getCallLogsByPhone(phoneNumber: string): Promise<CallLog[]> {
        // Normalize phone to compare
        const normalized = phoneNumber.replace(/\s/g, '');
        const { data, error } = await supabase
            .from('call_logs')
            .select('*')
            .or(`from_number.eq.${normalized},to_number.eq.${normalized}`)
            .order('started_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return this._enrichCallLogs(data || []);
    },

    async getCallLogsByLeadId(leadId: string): Promise<CallLog[]> {
        const { data, error } = await supabase
            .from('call_logs')
            .select('*')
            .eq('lead_id', leadId)
            .order('started_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return this._enrichCallLogs(data || []);
    },

    async updateCallLog(id: string, updates: Partial<CallLog>): Promise<void> {
        const { error } = await supabase
            .from('call_logs')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async addCallNotes(id: string, notes: string, tags?: string[]): Promise<void> {
        const updates: any = { notes };
        if (tags) updates.tags = tags;

        const { error } = await supabase
            .from('call_logs')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async linkCallToLead(callId: string, leadId: string): Promise<void> {
        const { error } = await supabase
            .from('call_logs')
            .update({ lead_id: leadId })
            .eq('id', callId);

        if (error) throw error;
    },

    async linkCallToCustomer(callId: string, customerId: string): Promise<void> {
        const { error } = await supabase
            .from('call_logs')
            .update({ customer_id: customerId })
            .eq('id', callId);

        if (error) throw error;
    },

    // ─── VOICEMAILS ───

    async getVoicemails(unlistenedOnly = false): Promise<Voicemail[]> {
        let query = supabase
            .from('voicemails')
            .select('*, call_log:call_logs(*)')
            .order('created_at', { ascending: false });

        if (unlistenedOnly) query = query.eq('is_listened', false);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async markVoicemailListened(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('voicemails')
            .update({
                is_listened: true,
                listened_by: userId,
                listened_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    },

    // ─── SMS ───

    async getSMSLogs(options?: {
        direction?: 'inbound' | 'outbound';
        phoneNumber?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: SMSLog[]; count: number }> {
        let query = supabase
            .from('sms_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (options?.direction) query = query.eq('direction', options.direction);
        if (options?.phoneNumber) query = query.or(`from_number.eq.${options.phoneNumber},to_number.eq.${options.phoneNumber}`);
        if (options?.limit) query = query.limit(options.limit);
        if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

        const { data, error, count } = await query;
        if (error) throw error;
        return { data: data || [], count: count || 0 };
    },

    async getSMSConversations(): Promise<{ phoneNumber: string; lastMessage: SMSLog; messageCount: number }[]> {
        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('channel', 'sms')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const grouped: Record<string, SMSLog[]> = {};
        for (const sms of data || []) {
            const otherNumber = sms.direction === 'outbound' ? sms.to_number : sms.from_number;
            if (!grouped[otherNumber]) grouped[otherNumber] = [];
            grouped[otherNumber].push(sms);
        }

        return Object.entries(grouped)
            .map(([phoneNumber, messages]) => ({
                phoneNumber,
                lastMessage: messages[0],
                messageCount: messages.length
            }))
            .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    },

    async getSMSThread(phoneNumber: string): Promise<SMSLog[]> {
        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('channel', 'sms')
            .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async sendSMS(to: string, body: string, fromNumberId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('twilio-sms', {
            body: { to, body, fromNumberId, channel: 'sms' },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) throw error;
        return data;
    },

    // ── WhatsApp Methods ──

    async sendWhatsApp(to: string, body: string, fromNumberId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('twilio-sms', {
            body: { to, body, fromNumberId, channel: 'whatsapp' },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) throw error;
        return data;
    },

    async getWhatsAppConversations(): Promise<{ phoneNumber: string; lastMessage: SMSLog; messageCount: number }[]> {
        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('channel', 'whatsapp')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const grouped: Record<string, SMSLog[]> = {};
        for (const msg of data || []) {
            const otherNumber = msg.direction === 'outbound' ? msg.to_number : msg.from_number;
            if (!grouped[otherNumber]) grouped[otherNumber] = [];
            grouped[otherNumber].push(msg);
        }

        return Object.entries(grouped)
            .map(([phoneNumber, messages]) => ({
                phoneNumber,
                lastMessage: messages[0],
                messageCount: messages.length
            }))
            .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    },

    async getWhatsAppThread(phoneNumber: string): Promise<SMSLog[]> {
        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('channel', 'whatsapp')
            .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getAllMessagesByPhone(phoneNumber: string): Promise<SMSLog[]> {
        // Strip whatsapp: prefix and leading + for matching
        const clean = phoneNumber.replace('whatsapp:', '').trim();
        const variants = [clean];
        if (clean.startsWith('+')) variants.push(clean.substring(1));
        else variants.push('+' + clean);

        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
            .or(variants.map(v => `from_number.ilike.%${v},to_number.ilike.%${v}`).join(','))
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // ── WhatsApp Campaign Methods ──

    async getWhatsAppTemplates(): Promise<any[]> {
        const { data, error } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createWhatsAppTemplate(template: { name: string; category: string; body: string; media_urls?: string[] }): Promise<any> {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('whatsapp_templates')
            .insert({ ...template, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateWhatsAppTemplate(id: string, updates: { name?: string; category?: string; body?: string; media_urls?: string[] }): Promise<any> {
        const { data, error } = await supabase
            .from('whatsapp_templates')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async uploadWhatsAppMedia(file: File): Promise<string> {
        const ext = file.name.split('.').pop();
        const path = `templates/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from('whatsapp-media').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('whatsapp-media').getPublicUrl(path);
        return publicUrl;
    },

    async deleteWhatsAppTemplate(id: string): Promise<void> {
        const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
        if (error) throw error;
    },

    async submitTemplateForApproval(templateId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const { data, error } = await supabase.functions.invoke('whatsapp-template-approval', {
            body: { action: 'create', templateId },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (error) throw error;
        return data;
    },

    async checkTemplateApprovalStatus(templateId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const { data, error } = await supabase.functions.invoke('whatsapp-template-approval', {
            body: { action: 'status', templateId },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (error) throw error;
        return data;
    },

    async getWhatsAppCampaigns(): Promise<any[]> {
        const { data, error } = await supabase
            .from('whatsapp_campaigns')
            .select('*, whatsapp_templates(name, category)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getWhatsAppCampaignDetail(id: string): Promise<any> {
        const { data, error } = await supabase
            .from('whatsapp_campaigns')
            .select('*, whatsapp_templates(*)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async getCampaignRecipients(campaignId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('whatsapp_campaign_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createCampaign(campaign: { name: string; template_id: string; filters: any }): Promise<any> {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('whatsapp_campaigns')
            .insert({ ...campaign, created_by: user?.id, status: 'draft' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async addCampaignRecipients(campaignId: string, recipients: { lead_id?: string; customer_id?: string; phone: string; name: string; message_body: string }[]): Promise<void> {
        const rows = recipients.map(r => ({ ...r, campaign_id: campaignId, status: 'pending' }));
        const { error } = await supabase.from('whatsapp_campaign_recipients').insert(rows);
        if (error) throw error;
        // Update total
        await supabase.from('whatsapp_campaigns').update({ total_recipients: recipients.length }).eq('id', campaignId);
    },

    async launchCampaign(campaignId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const { data, error } = await supabase.functions.invoke('whatsapp-campaign', {
            body: { campaignId },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (error) throw error;
        return data;
    },

    async getLeadContacts(filters?: { statuses?: string[]; sources?: string[] }): Promise<{ id: string; firstName: string; lastName: string; phone: string; email: string; city: string; status: string; source: string; companyName: string }[]> {
        let query = supabase.from('leads').select('id, customer_data, status, source').not('customer_data', 'is', null);
        if (filters?.statuses && filters.statuses.length > 0) {
            query = query.in('status', filters.statuses);
        }
        if (filters?.sources && filters.sources.length > 0) {
            query = query.in('source', filters.sources);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return (data || [])
            .map((l: any) => ({
                id: l.id,
                firstName: l.customer_data?.firstName || '',
                lastName: l.customer_data?.lastName || '',
                phone: l.customer_data?.phone || '',
                email: l.customer_data?.email || '',
                city: l.customer_data?.city || '',
                status: l.status || '',
                source: l.source || '',
                companyName: l.customer_data?.companyName || '',
            }))
            .filter((c: any) => c.phone && c.phone.trim() !== '');
    },

    // ─── CALLING ───

    async getTwilioToken(): Promise<{ token: string; identity: string }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('voice-token', {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error || !data?.token) throw new Error('Failed to get Twilio token');
        return data;
    },

    async initiateCall(to: string, fromNumberId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('twilio-call', {
            body: { to, fromNumberId },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) throw error;
        return data;
    },

    // ─── SETTINGS ───

    async getSettings(): Promise<TelephonySettings> {
        const { data, error } = await supabase
            .from('telephony_settings')
            .select('*');

        if (error) throw error;
        const settings: TelephonySettings = {};
        for (const s of data || []) {
            settings[s.setting_key] = s.setting_value;
        }
        return settings;
    },

    async updateSetting(key: string, value: any): Promise<void> {
        const { error } = await supabase
            .from('telephony_settings')
            .upsert({
                setting_key: key,
                setting_value: value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' });

        if (error) throw error;
    },

    // ─── CONTACT LOOKUP ───

    /**
     * Generate multiple phone number format variants for fuzzy DB matching.
     * E.g. "+491711234567" → ["+491711234567", "491711234567", "01711234567", "1711234567", ...]
     */
    _phoneVariants(phoneNumber: string): string[] {
        const variants = new Set<string>();

        // Original input
        const raw = phoneNumber.trim();
        variants.add(raw);

        // Stripped (no spaces/dashes/parens)
        const stripped = raw.replace(/[\s\-()/.]/g, '');
        variants.add(stripped);

        // E.164 normalized
        const e164 = normalizePhone(phoneNumber);
        if (e164) variants.add(e164);

        // Without + prefix
        if (e164.startsWith('+')) {
            variants.add(e164.slice(1));
        }

        // German national format (0171...)
        if (e164.startsWith('+49')) {
            variants.add('0' + e164.slice(3));
            variants.add(e164.slice(3)); // Just digits without country code
        }

        // Polish national format (502...)
        if (e164.startsWith('+48')) {
            variants.add(e164.slice(3));
        }

        // Also strip + from stripped
        if (stripped.startsWith('+')) {
            variants.add(stripped.slice(1));
        }

        return [...variants].filter(v => v.length >= 7);
    },

    async lookupContact(phoneNumber: string): Promise<{
        type: 'lead' | 'customer' | null;
        id: string | null;
        name: string | null;
        leadStatus?: string | null;
        assignedTo?: string | null;
        assignedToName?: string | null;
    }> {
        const variants = this._phoneVariants(phoneNumber);

        // Build OR filter for all variants against leads
        const leadFilter = variants
            .map(v => `customer_data->>phone.eq.${v}`)
            .join(',');

        const { data: leads } = await supabase
            .from('leads')
            .select('id, customer_data, status, assigned_to')
            .or(leadFilter)
            .limit(1);

        if (leads && leads.length > 0) {
            const cd = leads[0].customer_data || {};
            let assignedToName: string | null = null;

            if (leads[0].assigned_to) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', leads[0].assigned_to)
                    .single();
                assignedToName = profile?.full_name || null;
            }

            return {
                type: 'lead',
                id: leads[0].id,
                name: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Lead',
                leadStatus: leads[0].status || null,
                assignedTo: leads[0].assigned_to || null,
                assignedToName,
            };
        }

        // Then customers — try all variants
        const custFilter = variants
            .map(v => `phone.eq.${v}`)
            .join(',');

        const { data: customers } = await supabase
            .from('customers')
            .select('id, first_name, last_name')
            .or(custFilter)
            .limit(1);

        if (customers && customers.length > 0) {
            return {
                type: 'customer',
                id: customers[0].id,
                name: `${customers[0].first_name} ${customers[0].last_name}`
            };
        }

        return { type: null, id: null, name: null };
    },

    // ─── STATS ───

    async getCallStats(): Promise<{
        totalCalls: number;
        inbound: number;
        outbound: number;
        missed: number;
        avgDuration: number;
        totalDuration: number;
    }> {
        const { data, error } = await supabase
            .from('call_logs')
            .select('direction, status, duration_seconds');

        if (error) throw error;
        const logs = data || [];

        return {
            totalCalls: logs.length,
            inbound: logs.filter(l => l.direction === 'inbound').length,
            outbound: logs.filter(l => l.direction === 'outbound').length,
            missed: logs.filter(l => l.status === 'missed' || l.status === 'no-answer').length,
            avgDuration: logs.length > 0
                ? Math.round(logs.reduce((s, l) => s + (l.duration_seconds || 0), 0) / logs.length)
                : 0,
            totalDuration: logs.reduce((s, l) => s + (l.duration_seconds || 0), 0)
        };
    },

    /**
     * Get today's call statistics for the dashboard badge
     */
    async getTodayCallStats(): Promise<{
        total: number;
        inbound: number;
        outbound: number;
        missed: number;
        completed: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('call_logs')
            .select('direction, status')
            .gte('started_at', today.toISOString());

        if (error) throw error;
        const logs = data || [];

        return {
            total: logs.length,
            inbound: logs.filter(l => l.direction === 'inbound').length,
            outbound: logs.filter(l => l.direction === 'outbound').length,
            missed: logs.filter(l => l.status === 'missed' || l.status === 'no-answer').length,
            completed: logs.filter(l => l.status === 'completed').length,
        };
    },

    /**
     * Remove duplicate call entries based on twilio_call_sid.
     * Keeps the entry with the most complete data (recording > longer duration > newer).
     * Returns the count of removed duplicates.
     */
    async removeDuplicateCalls(): Promise<{ removed: number; total: number }> {
        // Fetch all calls with a twilio_call_sid
        const { data, error } = await supabase
            .from('call_logs')
            .select('id, twilio_call_sid, recording_url, duration_seconds, created_at')
            .not('twilio_call_sid', 'is', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const logs = data || [];

        // Group by twilio_call_sid
        const groups: Record<string, typeof logs> = {};
        for (const log of logs) {
            if (!log.twilio_call_sid) continue;
            if (!groups[log.twilio_call_sid]) groups[log.twilio_call_sid] = [];
            groups[log.twilio_call_sid].push(log);
        }

        const toDelete: string[] = [];
        for (const [_sid, group] of Object.entries(groups)) {
            if (group.length <= 1) continue;

            // Sort: prefer recording > longer duration > newer
            group.sort((a, b) => {
                if (a.recording_url && !b.recording_url) return -1;
                if (!a.recording_url && b.recording_url) return 1;
                if ((a.duration_seconds || 0) !== (b.duration_seconds || 0)) {
                    return (b.duration_seconds || 0) - (a.duration_seconds || 0);
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            // Keep the first (best), delete the rest
            for (let i = 1; i < group.length; i++) {
                toDelete.push(group[i].id);
            }
        }

        if (toDelete.length > 0) {
            // Delete in batches of 50
            for (let i = 0; i < toDelete.length; i += 50) {
                const batch = toDelete.slice(i, i + 50);
                await supabase.from('call_logs').delete().in('id', batch);
            }
        }

        return { removed: toDelete.length, total: logs.length };
    },

    // ─── HELPERS ───

    async _enrichCallLogs(logs: any[]): Promise<CallLog[]> {
        const leadIds = [...new Set(logs.filter(l => l.lead_id).map(l => l.lead_id))];
        const customerIds = [...new Set(logs.filter(l => l.customer_id).map(l => l.customer_id))];
        const userIds = [...new Set(logs.filter(l => l.user_id).map(l => l.user_id))];

        const [leads, customers, users] = await Promise.all([
            leadIds.length > 0
                ? supabase.from('leads').select('id, customer_data').in('id', leadIds).then(r => r.data || [])
                : Promise.resolve([]),
            customerIds.length > 0
                ? supabase.from('customers').select('id, first_name, last_name').in('id', customerIds).then(r => r.data || [])
                : Promise.resolve([]),
            userIds.length > 0
                ? supabase.from('profiles').select('id, full_name').in('id', userIds).then(r => r.data || [])
                : Promise.resolve([])
        ]);

        const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, { name: `${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || ''}`.trim() || 'Lead' }]));
        const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, { firstName: c.first_name, lastName: c.last_name }]));
        const userMap = Object.fromEntries(users.map((u: any) => [u.id, { fullName: u.full_name }]));

        // Phone-based fallback: for calls without lead/customer, try to match by phone number
        const unlinkedLogs = logs.filter(l => !l.lead_id && !l.customer_id);
        const phoneLookups: Record<string, { type: 'lead' | 'customer'; id: string; name: string; leadName?: string; custFirstName?: string; custLastName?: string } | null> = {};

        if (unlinkedLogs.length > 0) {
            // Collect unique phone numbers from unlinked calls
            const phonesToLookup = [...new Set(unlinkedLogs.map(l =>
                l.direction === 'inbound' ? l.from_number : l.to_number
            ).filter(Boolean))];

            // Batch lookup: gather all variants for all phones
            const allLeadFilters: string[] = [];
            const allCustFilters: string[] = [];
            const phoneToVariants: Record<string, string[]> = {};

            for (const phone of phonesToLookup) {
                const variants = this._phoneVariants(phone);
                phoneToVariants[phone] = variants;
                for (const v of variants) {
                    allLeadFilters.push(`customer_data->>phone.eq.${v}`);
                    allCustFilters.push(`phone.eq.${v}`);
                }
            }

            // Query leads by phone variants (batch)
            if (allLeadFilters.length > 0) {
                const { data: matchedLeads } = await supabase
                    .from('leads')
                    .select('id, customer_data')
                    .or(allLeadFilters.join(','))
                    .limit(50);

                if (matchedLeads && matchedLeads.length > 0) {
                    for (const phone of phonesToLookup) {
                        if (phoneLookups[phone]) continue;
                        const variants = phoneToVariants[phone];
                        const match = matchedLeads.find((l: any) => {
                            const lPhone = l.customer_data?.phone || '';
                            return variants.some(v => v === lPhone);
                        });
                        if (match) {
                            const cd = match.customer_data || {};
                            const name = `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Lead';
                            phoneLookups[phone] = { type: 'lead', id: match.id, name, leadName: name };
                        }
                    }
                }
            }

            // Query customers by phone variants (batch)
            if (allCustFilters.length > 0) {
                const { data: matchedCustomers } = await supabase
                    .from('customers')
                    .select('id, first_name, last_name, phone')
                    .or(allCustFilters.join(','))
                    .limit(50);

                if (matchedCustomers && matchedCustomers.length > 0) {
                    for (const phone of phonesToLookup) {
                        if (phoneLookups[phone]) continue;
                        const variants = phoneToVariants[phone];
                        const match = matchedCustomers.find((c: any) => {
                            return variants.some(v => v === c.phone);
                        });
                        if (match) {
                            phoneLookups[phone] = {
                                type: 'customer',
                                id: match.id,
                                name: `${match.first_name} ${match.last_name}`,
                                custFirstName: match.first_name,
                                custLastName: match.last_name
                            };
                        }
                    }
                }
            }

            // Auto-link discovered matches in the background (fire-and-forget)
            for (const log of unlinkedLogs) {
                const phone = log.direction === 'inbound' ? log.from_number : log.to_number;
                const match = phoneLookups[phone];
                if (match) {
                    if (match.type === 'lead') {
                        supabase.from('call_logs').update({ lead_id: match.id }).eq('id', log.id).then(() => {});
                    } else {
                        supabase.from('call_logs').update({ customer_id: match.id }).eq('id', log.id).then(() => {});
                    }
                }
            }
        }

        return logs.map(l => {
            // If already linked, use the existing data
            if (l.lead_id || l.customer_id) {
                return {
                    ...l,
                    lead: l.lead_id ? leadMap[l.lead_id] || null : null,
                    customer: l.customer_id ? customerMap[l.customer_id] || null : null,
                    user: l.user_id ? userMap[l.user_id] || null : null,
                };
            }

            // Phone-based fallback
            const phone = l.direction === 'inbound' ? l.from_number : l.to_number;
            const match = phoneLookups[phone];
            if (match) {
                return {
                    ...l,
                    lead_id: match.type === 'lead' ? match.id : null,
                    customer_id: match.type === 'customer' ? match.id : null,
                    lead: match.type === 'lead' ? { name: match.name } : null,
                    customer: match.type === 'customer' ? { firstName: match.custFirstName || '', lastName: match.custLastName || '' } : null,
                    user: l.user_id ? userMap[l.user_id] || null : null,
                };
            }

            return {
                ...l,
                lead: null,
                customer: null,
                user: l.user_id ? userMap[l.user_id] || null : null,
            };
        });
    }
};
