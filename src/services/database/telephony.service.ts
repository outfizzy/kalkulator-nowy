import { supabase } from '../../lib/supabase';

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
        // Get all SMS grouped by the "other" phone number
        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
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
            .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async sendSMS(to: string, body: string, fromNumberId: string): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('twilio-sms', {
            body: { to, body, fromNumberId },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) throw error;
        return data;
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

    async lookupContact(phoneNumber: string): Promise<{
        type: 'lead' | 'customer' | null;
        id: string | null;
        name: string | null;
    }> {
        // Normalize number (strip spaces, dashes)
        const normalized = phoneNumber.replace(/[\s\-()]/g, '');

        // Check leads first (leads use customer_data JSONB)
        const { data: leads } = await supabase
            .from('leads')
            .select('id, customer_data')
            .or(`customer_data->>phone.eq.${normalized},customer_data->>phone.eq.${phoneNumber}`)
            .limit(1);

        if (leads && leads.length > 0) {
            const cd = leads[0].customer_data || {};
            return {
                type: 'lead',
                id: leads[0].id,
                name: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Lead'
            };
        }

        // Then customers
        const { data: customers } = await supabase
            .from('customers')
            .select('id, first_name, last_name')
            .or(`phone.eq.${normalized},phone.eq.${phoneNumber}`)
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

        return logs.map(l => ({
            ...l,
            lead: l.lead_id ? leadMap[l.lead_id] || null : null,
            customer: l.customer_id ? customerMap[l.customer_id] || null : null,
            user: l.user_id ? userMap[l.user_id] || null : null,
        }));
    }
};
