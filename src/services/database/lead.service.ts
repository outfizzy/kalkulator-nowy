import { supabase } from '../../lib/supabase';
import type { Lead, LeadStatus, LeadSource, Customer, LeadMessage } from '../../types';
import { CustomerService } from './customer.service';
import { TaskService } from './task.service';

export const LeadService = {
    async createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
        // Debug: Log supabase instance status
        console.log('LeadService.createLead: Checking auth', {
            supabaseDefined: !!supabase,
            authDefined: !!supabase?.auth,
            url: import.meta.env.VITE_SUPABASE_URL ? 'DEFINED' : 'MISSING'
        });

        if (!supabase) throw new Error('Supabase Client is undefined in LeadService');
        if (!supabase.auth) throw new Error('Supabase Auth is undefined in LeadService');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Ensure customer exists
        let customerId = lead.customerId;

        if (lead.customerData) {
            try {
                // Map Lead Data to Customer
                const fullAddress = lead.customerData.address || '';
                let street = fullAddress;
                let houseNumber = '';
                const match = fullAddress.match(/^(.+)\s+(\d+[a-zA-Z-\/]*)$/);
                if (match) {
                    street = match[1];
                    houseNumber = match[2];
                }

                // [Fair Module] - Fallback address for Trade Fair leads
                const isFair = lead.source === 'targi';
                const defaultCity = isFair ? 'Targi (Do Uzupełnienia)' : '';
                const defaultZip = isFair ? '00-000' : '';
                const defaultStreet = isFair ? '-' : '';
                const defaultHouse = isFair ? '0' : '';

                const customerInput: Customer = {
                    salutation: (lead.customerData.companyName ? 'Firma' : 'Herr') as 'Herr' | 'Frau' | 'Firma',
                    firstName: lead.customerData.firstName || '',
                    lastName: lead.customerData.lastName || '',
                    street: street || defaultStreet,
                    houseNumber: houseNumber || defaultHouse,
                    postalCode: lead.customerData.postalCode || defaultZip,
                    city: lead.customerData.city || defaultCity,
                    phone: lead.customerData.phone || '',
                    email: lead.customerData.email || '',
                    country: 'Deutschland',
                    // [Fix 2026-01-13] Pass Representative ID to bypass RLS and ensure ownership
                    representative_id: lead.assignedTo || user.id,
                    source: lead.source || 'targi'
                };

                // Use SECURE version to bypass RLS (especially important for fair leads)
                // Note: The RPC might fail if passed NULL for NOT NULL columns (lastName, city, postalCode).
                // We ensure above they default to empty strings, but let's be explicit if customerInput was modified.
                const customer = await CustomerService.ensureCustomerSecure(customerInput);
                customerId = customer.id;
            } catch (e) {
                console.error('Failed to ensure customer for lead:', e);
                // Log detailed error for debugging
                console.error('Customer data:', lead.customerData);
                const errString = e instanceof Error ? e.message : JSON.stringify(e);
                console.error('Error details:', errString);

                // If it's the "new row for relation" error, it's RLS or constraint
                throw new Error(`Could not create/link customer: ${errString}`);
            }
        }

        // Fail if we still don't have a customerId and logic requires it (usually a lead implies a potential customer)
        if (!customerId && lead.customerData) {
            console.warn('Proceeding to create lead without linked customer_id, rely on customer_data json.');
        }

        const { data, error } = await supabase
            .from('leads')
            .insert({
                status: lead.status,
                source: lead.source,
                customer_data: lead.customerData,
                customer_id: customerId,
                // [Fix 2026-01-12] New leads should be unassigned by default. 
                // Only assign if explicit or status is NOT 'new'.
                assigned_to: lead.assignedTo || (lead.status === 'new' ? null : user.id),
                email_message_id: lead.emailMessageId,
                notes: lead.notes,
                last_contact_date: lead.lastContactDate ? lead.lastContactDate.toISOString() : null,
                // Fair Module
                fair_id: lead.fairId,
                fair_photos: lead.fairPhotos,
                fair_prize: lead.fairPrize,
                fair_products: lead.fairProducts,
                attachments: lead.attachments
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...lead,
            id: data.id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        } as Lead;
    },

    async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
        const dbUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        if (updates.status) dbUpdates.status = updates.status;
        if (updates.source) dbUpdates.source = updates.source;
        if (updates.customerData) dbUpdates.customer_data = updates.customerData;
        if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
        if (updates.emailMessageId) dbUpdates.email_message_id = updates.emailMessageId;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.lastContactDate) dbUpdates.last_contact_date = updates.lastContactDate.toISOString();
        if (updates.clientWillContactAt) dbUpdates.client_will_contact_at = updates.clientWillContactAt.toISOString();
        // AI Score from measurements or scorer
        if (updates.aiScore !== undefined) dbUpdates.ai_score = updates.aiScore;
        if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary;

        const { error } = await supabase
            .from('leads')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // --- Phase 1: Ownership Sync Logic ---
        // If assignedTo changed, update the Customer's representative_id as well
        if (updates.assignedTo) {
            try {
                // 1. Get the lead's customer_id
                const { data: leadData } = await supabase
                    .from('leads')
                    .select('customer_id')
                    .eq('id', id)
                    .single();

                if (leadData?.customer_id) {
                    // 2. Update Customer Representative
                    const { error: custError } = await supabase
                        .from('customers')
                        .update({ representative_id: updates.assignedTo })
                        .eq('id', leadData.customer_id);

                    if (custError) {
                        console.error('Failed to sync Customer Representative ownership:', custError);
                    } else {
                        console.log(`Ownership Synced: Customer ${leadData.customer_id} is now assigned to ${updates.assignedTo}`);

                        // --- Phase 3: Automation (Welcome Email) ---
                        // Trigger only if we have customer data and a new specific assignee
                        await this.sendWelcomeEmail(id, updates.assignedTo, leadData.customer_id);
                    }
                }
            } catch (err) {
                console.error('Error during Ownership Sync:', err);
            }
        }

        // Automation: Create Task when Client Will Contact date is set
        if (updates.clientWillContactAt) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch lead to get name
                    const { data: leadData } = await supabase.from('leads').select('customer_data').eq('id', id).single();
                    const name = leadData?.customer_data?.lastName || 'Klient';

                    await TaskService.createTask({
                        userId: user.id,
                        title: `Kontakt z klientem: ${name} `,
                        description: 'Klient prosił o kontakt (lub sam się odezwie) w tym terminie.',
                        dueDate: updates.clientWillContactAt.toISOString(),
                        status: 'pending',
                        priority: 'high',
                        type: 'call',
                        leadId: id
                    });
                }
            } catch (err) {
                console.error('Failed to create automation task for lead:', err);
            }
        }
    },

    async deleteLead(id: string): Promise<void> {
        // 1. Check for existing offers
        const { count, error: countError } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', id);

        if (countError) throw countError;
        if (count && count > 0) {
            throw new Error('Nie można usunąć leada, który posiada utworzone oferty. Najpierw usuń oferty.');
        }

        // 2. Cascade delete messages (if foreign key cascade isn't set, better safe than sorry)
        const { error: msgError } = await supabase
            .from('lead_messages')
            .delete()
            .eq('lead_id', id);

        if (msgError) console.warn('Error cleaning up lead messages:', msgError);

        // 3. Delete the Lead
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getLeads(): Promise<Lead[]> {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leads:', error);
            throw error;
        }

        // Manually fetch assignees
        const assigneeIds = Array.from(new Set((data || []).map(l => l.assigned_to).filter(Boolean)));
        const assigneeMap = new Map<string, { first_name?: string; last_name?: string }>();

        if (assigneeIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', assigneeIds);

            if (profiles) {
                profiles.forEach(p => assigneeMap.set(p.id, {
                    first_name: (p.full_name || '').split(' ')[0],
                    last_name: (p.full_name || '').split(' ').slice(1).join(' ')
                }));
            }
        }

        return (data || []).map((lead) => {
            const assigneeProfile = lead.assigned_to ? assigneeMap.get(lead.assigned_to) : null;
            return {
                ...lead,
                id: lead.id,
                assignedTo: lead.assigned_to,
                status: lead.status as LeadStatus,
                source: lead.source as LeadSource,
                createdAt: new Date(lead.created_at),
                updatedAt: new Date(lead.updated_at),

                lastContactDate: lead.last_contact_date ? new Date(lead.last_contact_date) : undefined,
                clientWillContactAt: lead.client_will_contact_at ? new Date(lead.client_will_contact_at) : undefined,
                customerData: lead.customer_data,
                salesRep: undefined,
                assignee: assigneeProfile ? {
                    firstName: assigneeProfile.first_name || '',
                    lastName: assigneeProfile.last_name || ''
                } : undefined
            };
        });
    },

    async getStaleLeads(days = 3): Promise<Lead[]> {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const threshold = date.toISOString();

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .lt('updated_at', threshold)
            .not('status', 'in', '("won","lost")')
            .order('updated_at', { ascending: true });

        if (error) throw error;

        // Manually fetch assignees to avoid join errors
        const assigneeIds = Array.from(new Set((data || []).map(l => l.assigned_to).filter(Boolean)));
        const assigneeMap = new Map<string, { first_name?: string; last_name?: string }>();

        if (assigneeIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name') // Assuming fields exist on profiles
                .in('id', assigneeIds);

            if (profiles) {
                profiles.forEach(p => assigneeMap.set(p.id, {
                    first_name: (p.full_name || '').split(' ')[0],
                    last_name: (p.full_name || '').split(' ').slice(1).join(' ')
                }));
            }
        }

        return (data || []).map((row) => {
            const assigneeProfile = row.assigned_to ? assigneeMap.get(row.assigned_to) : null;

            return {
                id: row.id,
                status: row.status as LeadStatus,
                source: row.source as LeadSource,
                customerData: row.customer_data,
                customerId: row.customer_id,
                assignedTo: row.assigned_to,
                emailMessageId: row.email_message_id,
                notes: row.notes,
                lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
                clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
                assignee: assigneeProfile ? {
                    firstName: assigneeProfile.first_name || '',
                    lastName: assigneeProfile.last_name || ''
                } : undefined
            };
        });
    },

    async getLead(id: string): Promise<Lead | null> {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;

        return {
            ...data,
            id: data.id,
            assignedTo: data.assigned_to,
            status: data.status as LeadStatus,
            source: data.source as LeadSource,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            lastContactDate: data.last_contact_date ? new Date(data.last_contact_date) : undefined,
            clientWillContactAt: data.client_will_contact_at ? new Date(data.client_will_contact_at) : undefined,
            customerData: data.customer_data,
            // Fair Module Data Mapping
            fairId: data.fair_id,
            fairPhotos: data.fair_photos || [],
            fairPrize: data.fair_prize,
            fairProducts: data.fair_products || [],
            salesRep: undefined,
            assignee: data.assignee ? {
                firstName: (data.assignee.full_name || '').split(' ')[0] || '',
                lastName: (data.assignee.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined
        };
    },

    async getMessages(leadId: string): Promise<LeadMessage[]> {
        const { data, error } = await supabase
            .from('lead_messages')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching lead messages:', error);
            return [];
        }

        return data.map(row => ({
            id: row.id,
            leadId: row.lead_id,
            offerId: row.offer_id,
            senderType: row.sender_type as 'client' | 'user',
            content: row.content,
            isRead: row.is_read,
            createdAt: new Date(row.created_at)
        }));
    },

    async sendClientMessage(token: string, content: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('send_client_message', {
            token_input: token,
            message_content: content
        });

        if (error) {
            console.error('Error sending client message:', error);
            return false;
        }

        return data; // returns boolean
    },

    async sendUserMessage(leadId: string, content: string): Promise<LeadMessage> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('lead_messages')
            .insert({
                lead_id: leadId,
                sender_type: 'user',
                content: content,
                is_read: true // Read by default for sender
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            leadId: data.lead_id,
            offerId: data.offer_id,
            senderType: data.sender_type,
            content: data.content,
            isRead: data.is_read,
            createdAt: new Date(data.created_at)
        };
    },

    async getCustomerLeads(customerId: string): Promise<Lead[]> {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching customer leads:', error);
            throw error;
        }

        return (data || []).map((lead) => ({
            ...lead,
            id: lead.id,
            assignedTo: lead.assigned_to,
            status: lead.status as LeadStatus,
            source: lead.source as LeadSource,
            createdAt: new Date(lead.created_at),
            updatedAt: new Date(lead.updated_at),
            lastContactDate: lead.last_contact_date ? new Date(lead.last_contact_date) : undefined,
            clientWillContactAt: lead.client_will_contact_at ? new Date(lead.client_will_contact_at) : undefined,
            customerData: lead.customer_data,
            salesRep: undefined,
            aiScore: lead.ai_score,
            aiSummary: lead.ai_summary
        }));
    },

    async scoreLead(leadId: string): Promise<{ score: number; summary: string; icon: string }> {
        // 1. Get full lead data
        const lead = await this.getLead(leadId);
        if (!lead) throw new Error("Lead not found");

        // 2. Call Edge Function
        const { data, error } = await supabase.functions.invoke('lead-scorer', {
            body: { lead }
        });

        if (error) {
            console.error("AI Scoring Error:", error);
            throw error;
        }

        return data;
    },

    async sendWelcomeEmail(leadId: string, userId: string, customerId: string): Promise<void> {
        try {
            // 1. Fetch User (Handlowiec) details
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', userId)
                .single();

            // 2. Fetch Customer details (Email)
            const { data: customer } = await supabase
                .from('customers')
                .select('email, first_name, last_name, company_name')
                .eq('id', customerId)
                .single();

            if (!userProfile || !customer || !customer.email) {
                console.log('Skipping Welcome Email: Missing user or customer email.');
                return;
            }

            // 3. Prepare Email Content
            const subject = `Opiekun Twojej Oferty - ${userProfile.full_name}`;
            const html = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Dzień dobry ${customer.first_name} ${customer.last_name},</h2>
                    <p>Nazywam się <strong>${userProfile.full_name}</strong> i zostałem przypisany jako Twój osobisty opiekun w sprawie zapytania o zadaszenie.</p>
                    <p>Możesz się ze mną kontaktować bezpośrednio:</p>
                    <ul>
                        <li>Telefon: <strong>${userProfile.phone || 'Brak'}</strong></li>
                        <li>Email: <a href="mailto:${userProfile.email}">${userProfile.email}</a></li>
                    </ul>
                    <p>Wkrótce skontaktuję się z Tobą, aby omówić szczegóły.</p>
                    <br/>
                    <p>Pozdrawiam,<br/>${userProfile.full_name}</p>
                </div>
            `;

            // 4. Send using Edge Function
            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: customer.email,
                    subject: subject,
                    html: html
                }
            });

            if (error) throw error;
            console.log(`Welcome Email sent to ${customer.email}`);

        } catch (err) {
            console.error('Failed to send Welcome Email:', err);
        }
    }
};
