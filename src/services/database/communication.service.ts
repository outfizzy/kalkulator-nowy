import { supabase } from '../../lib/supabase';
import type { Communication } from '../../types';

export const CommunicationService = {
    async getLeadCommunications(leadId: string): Promise<Communication[]> {
        const [commsResult, messagesResult] = await Promise.all([
            supabase
                .from('customer_communications')
                .select(`*, user:profiles(first_name, last_name)`)
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false }),
            supabase
                .from('lead_messages')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
        ]);

        if (commsResult.error) {
            console.error('Error fetching lead communications:', commsResult.error);
            return [];
        }

        const comms: Communication[] = commsResult.data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            customerId: row.customer_id,
            leadId: row.lead_id,
            type: row.type,
            direction: row.direction,
            subject: row.subject,
            content: row.content,
            date: row.date,
            externalId: row.external_id,
            metadata: row.metadata,
            createdAt: new Date(row.created_at),
            user: row.user ? {
                firstName: row.user.first_name,
                lastName: row.user.last_name
            } : undefined
        }));

        const messages: Communication[] = (messagesResult.data || []).map((msg: any) => ({
            id: msg.id,
            userId: msg.sender_type === 'user' ? 'system' : 'client', // fallback
            leadId: msg.lead_id,
            type: 'email' as const, // Treat as email/message
            direction: msg.sender_type === 'client' ? 'inbound' as const : 'outbound' as const,
            subject: msg.sender_type === 'client' ? 'Wiadomość / Aktywność Klienta' : 'Wiadomość do Klienta',
            content: msg.content,
            date: msg.created_at,
            createdAt: new Date(msg.created_at),
            metadata: { isLeadMessage: true, offerId: msg.offer_id }
        }));

        // Merge and sort
        return [...comms, ...messages].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async getCommunications(customerId: string): Promise<Communication[]> {
        // 1. Fetch standard communications (CRM)
        const commsPromise = supabase
            .from('customer_communications')
            .select('*') // Removed invalid join
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        // 2. Fetch Leads and Offers for this customer
        const leadsPromise = supabase.from('leads').select('id').eq('customer_id', customerId);
        const offersPromise = supabase.from('offers').select('id').eq('customer_id', customerId);

        const [commsResult, leadsResult, offersResult] = await Promise.all([
            commsPromise,
            leadsPromise,
            offersPromise
        ]);

        if (commsResult.error) {
            console.error('Error fetching communications:', JSON.stringify(commsResult.error, null, 2));
            return [];
        }

        const commsData = commsResult.data || [];

        // 1b. Fetch User Profiles manually to avoid PGRST200
        const userIds = [...new Set(commsData.map((c: any) => c.user_id).filter(Boolean))];
        let profilesMap: Record<string, any> = {};

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', userIds);

            if (profiles) {
                profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            }
        }

        const leadIds = (leadsResult.data || []).map(l => l.id);
        const offerIds = (offersResult.data || []).map(o => o.id);

        let messages: any[] = [];

        // 3. Fetch lead_messages related to leads/offers (AND related to customer if needed)
        // We use OR logic to be safe
        if (leadIds.length > 0 || offerIds.length > 0) {
            let query = supabase
                .from('lead_messages')
                .select('*')
                .order('created_at', { ascending: false });

            const conditions: string[] = [];
            if (leadIds.length > 0) conditions.push(`lead_id.in.(${leadIds.join(',')})`);
            if (offerIds.length > 0) conditions.push(`offer_id.in.(${offerIds.join(',')})`);

            if (conditions.length > 0) {
                query = query.or(conditions.join(','));
                const msgResult = await query;
                if (msgResult.data) messages = msgResult.data;
            }
        }

        // 4. Map CRM Comms
        const mappedComms = commsData.map((row: any) => {
            const profile = profilesMap[row.user_id];
            return {
                id: row.id,
                userId: row.user_id,
                customerId: row.customer_id,
                leadId: row.lead_id,
                type: row.type,
                direction: row.direction || 'outbound',
                subject: row.subject,
                content: row.content,
                date: row.date,
                externalId: row.external_id,
                metadata: row.metadata,
                createdAt: new Date(row.created_at),
                user: profile ? {
                    firstName: profile.first_name || '',
                    lastName: profile.last_name || ''
                } : undefined
            };
        });

        // 5. Map Client Messages
        const mappedMessages = messages.map((msg: any) => ({
            id: msg.id,
            userId: msg.sender_type === 'user' ? 'system' : 'client',
            leadId: msg.lead_id,
            customerId: customerId,
            type: 'email' as const,
            direction: msg.sender_type === 'client' ? 'inbound' as const : 'outbound' as const,
            subject: msg.sender_type === 'client' ? 'Wiadomość / Aktywność Klienta' : 'Wiadomość',
            content: msg.content,
            date: msg.created_at,
            createdAt: new Date(msg.created_at),
            metadata: { isLeadMessage: true, offerId: msg.offer_id }
        }));

        // 6. Merge and Sort
        return [...mappedComms, ...mappedMessages].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async addCommunication(comm: Omit<Communication, 'id' | 'createdAt' | 'user' | 'userId'>): Promise<Communication> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('communications')
            .insert({
                lead_id: comm.leadId,
                user_id: user.id,
                type: comm.type,
                title: comm.subject,
                content: comm.content,
                direction: comm.direction
            })
            .select(`
                *,
                user:users!user_id (
                    first_name,
                    last_name
                )
            `)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            type: data.type,
            direction: data.direction,
            subject: data.title,
            content: data.content,
            date: data.created_at,
            createdAt: new Date(data.created_at),
            userId: data.user_id,
            leadId: data.lead_id,
            user: {
                firstName: data.user.first_name || '',
                lastName: data.user.last_name || ''
            }
        };
    }
};
