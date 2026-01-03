import { supabase } from '../../lib/supabase';
import type { Lead, LeadStatus, LeadSource, Customer, LeadMessage } from '../../types';
import { CustomerService } from './customer.service';
import { TaskService } from './task.service';

export const LeadService = {
    async createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Ensure customer exists
        let customerId = lead.customerId;
        try {
            if (lead.customerData) {
                // Map Lead Data to Customer
                const fullAddress = lead.customerData.address || '';
                let street = fullAddress;
                let houseNumber = '';
                const match = fullAddress.match(/^(.+)\s+(\d+[a-zA-Z-\/]*)$/);
                if (match) {
                    street = match[1];
                    houseNumber = match[2];
                }

                const customerInput: Customer = {
                    salutation: (lead.customerData.companyName ? 'Firma' : 'Herr') as 'Herr' | 'Frau' | 'Firma',
                    firstName: lead.customerData.firstName || '',
                    lastName: lead.customerData.lastName || '',
                    street: street,
                    houseNumber: houseNumber,
                    postalCode: lead.customerData.postalCode || '',
                    city: lead.customerData.city || '',
                    phone: lead.customerData.phone || '',
                    email: lead.customerData.email || '',
                    country: 'Deutschland'
                };

                const customer = await CustomerService.ensureCustomer(customerInput);
                customerId = customer.id;
            }
        } catch (e) {
            console.warn('Failed to ensure customer for lead:', e);
        }

        const { data, error } = await supabase
            .from('leads')
            .insert({
                status: lead.status,
                source: lead.source,
                customer_data: lead.customerData,
                customer_id: customerId,
                assigned_to: lead.assignedTo || user.id, // Default to current user if not set
                email_message_id: lead.emailMessageId,
                notes: lead.notes,
                last_contact_date: lead.lastContactDate ? lead.lastContactDate.toISOString() : null
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
        if (updates.notes) dbUpdates.notes = updates.notes;
        if (updates.lastContactDate) dbUpdates.last_contact_date = updates.lastContactDate.toISOString();
        if (updates.clientWillContactAt) dbUpdates.client_will_contact_at = updates.clientWillContactAt.toISOString();

        const { error } = await supabase
            .from('leads')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

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
            salesRep: undefined
        }));
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
                .select('id, first_name, last_name') // Assuming fields exist on profiles
                .in('id', assigneeIds);

            if (profiles) {
                profiles.forEach(p => assigneeMap.set(p.id, p));
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
            salesRep: undefined,
            assignee: data.assignee ? {
                firstName: data.assignee.first_name || '',
                lastName: data.assignee.last_name || ''
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
            salesRep: undefined
        }));
    }
};
