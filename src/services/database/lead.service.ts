import { supabase } from '../../lib/supabase';
import type { Lead, LeadStatus, LeadSource, Customer, LeadMessage } from '../../types';
import { CustomerService } from './customer.service';
import { TaskService } from './task.service';
import { LeadAutoAssignService } from './lead-auto-assign.service';
import { normalizePhone } from '../../utils/phone';

export const LeadService = {
    async createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {



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
                    phone: normalizePhone(lead.customerData.phone) || '',
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
                // Leads with status 'new' have no owner until manually assigned
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

    /**
     * Auto-assign newly created lead if unassigned (new/formularz/contacted)
     * Call this AFTER createLead returns successfully
     */
    async autoAssignIfNeeded(leadId: string): Promise<string | null> {
        return LeadAutoAssignService.autoAssignLead(leadId);
    },

    async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
        const dbUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.source) dbUpdates.source = updates.source;
        if (updates.customerData) dbUpdates.customer_data = updates.customerData;
        if (updates.emailMessageId) dbUpdates.email_message_id = updates.emailMessageId;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.lastContactDate) dbUpdates.last_contact_date = updates.lastContactDate.toISOString();
        if (updates.clientWillContactAt) dbUpdates.client_will_contact_at = updates.clientWillContactAt.toISOString();
        // AI Score from measurements or scorer
        if (updates.aiScore !== undefined) dbUpdates.ai_score = updates.aiScore;
        if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary;
        if (updates.lostReason !== undefined) dbUpdates.lost_reason = updates.lostReason;
        if (updates.lostBy !== undefined) dbUpdates.lost_by = updates.lostBy;
        if (updates.lostAt !== undefined) dbUpdates.lost_at = updates.lostAt instanceof Date ? updates.lostAt.toISOString() : updates.lostAt;
        if (updates.wonReason !== undefined) dbUpdates.won_reason = updates.wonReason;
        if (updates.wonValue !== undefined) dbUpdates.won_value = updates.wonValue;
        if (updates.wonAt !== undefined) dbUpdates.won_at = updates.wonAt instanceof Date ? updates.wonAt.toISOString() : updates.wonAt;

        // --- Auto-Assignment: When moving out of 'new' with no owner, assign current user ---
        if (updates.status && updates.status !== 'new' && updates.assignedTo === undefined) {
            // Check if lead currently has no owner
            const { data: currentLead } = await supabase
                .from('leads')
                .select('assigned_to, status')
                .eq('id', id)
                .single();

            if (currentLead && !currentLead.assigned_to) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    dbUpdates.assigned_to = user.id;
                }
            }
        }

        // --- Assignment Protection Logic ---
        if (updates.assignedTo !== undefined) {
            if (updates.assignedTo === null) {
                // Only allow clearing assignment when moving to 'new' status
                if (updates.status === 'new') {
                    dbUpdates.assigned_to = null;
                } else {
                    // Check current lead state before clearing
                    const { data: currentLead } = await supabase
                        .from('leads')
                        .select('assigned_to, status')
                        .eq('id', id)
                        .single();

                    if (currentLead?.assigned_to) {
                        console.warn(
                            `[LeadService] ⚠️ BLOCKED: Attempt to clear assigned_to on lead ${id} ` +
                            `(current: ${currentLead.assigned_to}, status: ${currentLead.status} → ${updates.status || 'unchanged'}). ` +
                            `Keeping existing assignment.`
                        );
                        // Do NOT set assigned_to = null — keep existing assignment
                    } else {
                        dbUpdates.assigned_to = null;
                    }
                }
            } else {
                dbUpdates.assigned_to = updates.assignedTo;
            }
        }

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

                        // --- Phase 3: Automation (Welcome Email) ---
                        // Trigger only if we have customer data and a new specific assignee
                        // [Disabled by user request 2026-01-29]
                        // await this.sendWelcomeEmail(id, updates.assignedTo, leadData.customer_id);
                    }
                }
            } catch (err) {
                console.error('Error during Ownership Sync:', err);
            }
        }

        // --- Customer Data Sync: When customerData changes, update linked Customer record ---
        if (updates.customerData) {
            try {
                const { data: leadData } = await supabase
                    .from('leads')
                    .select('customer_id')
                    .eq('id', id)
                    .single();

                if (leadData?.customer_id) {
                    const cd = updates.customerData;
                    // Parse address into street + houseNumber
                    const fullAddress = cd.address || (cd as any).street || '';
                    let street = fullAddress;
                    let houseNumber = '';
                    const match = fullAddress.match(/^(.+)\s+(\d+[a-zA-Z-\/]*)$/);
                    if (match) {
                        street = match[1];
                        houseNumber = match[2];
                    }

                    const customerUpdates: Record<string, unknown> = {};
                    if (cd.firstName) customerUpdates.first_name = cd.firstName;
                    if (cd.lastName) customerUpdates.last_name = cd.lastName;
                    if (cd.email) customerUpdates.email = cd.email;
                    if (cd.phone) customerUpdates.phone = normalizePhone(cd.phone);
                    if (street) customerUpdates.street = street;
                    if (houseNumber) customerUpdates.house_number = houseNumber;
                    if (cd.postalCode) customerUpdates.postal_code = cd.postalCode;
                    if (cd.city) customerUpdates.city = cd.city;
                    if (cd.companyName) customerUpdates.company_name = cd.companyName;

                    if (Object.keys(customerUpdates).length > 0) {
                        const { error: custUpdateError } = await supabase
                            .from('customers')
                            .update(customerUpdates)
                            .eq('id', leadData.customer_id);

                        if (custUpdateError) {
                            console.error('[LeadService] Failed to sync customer data:', custUpdateError);
                        } else {
                        }
                    }
                }
            } catch (err) {
                console.error('[LeadService] Error during customer data sync:', err);
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

    async getLeads(options?: { excludeStatuses?: string[] }): Promise<Lead[]> {
        let query = supabase
            .from('leads')
            .select('*')
            .order('updated_at', { ascending: false });

        // Optionally exclude certain statuses for faster loading
        if (options?.excludeStatuses && options.excludeStatuses.length > 0) {
            for (const status of options.excludeStatuses) {
                query = query.neq('status', status);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching leads:', error);
            throw error;
        }

        // Manually fetch assignees and lost_by profiles
        const allUserIds = new Set<string>();
        (data || []).forEach(l => {
            if (l.assigned_to) allUserIds.add(l.assigned_to);
            if (l.lost_by) allUserIds.add(l.lost_by);
        });
        const assigneeMap = new Map<string, { first_name?: string; last_name?: string; full_name?: string }>();

        if (allUserIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', Array.from(allUserIds));

            if (profiles) {
                profiles.forEach(p => assigneeMap.set(p.id, {
                    first_name: (p.full_name || '').split(' ')[0],
                    last_name: (p.full_name || '').split(' ').slice(1).join(' '),
                    full_name: p.full_name || ''
                }));
            }
        }

        return (data || []).map((lead) => {
            const assigneeProfile = lead.assigned_to ? assigneeMap.get(lead.assigned_to) : null;
            const lostByProfile = lead.lost_by ? assigneeMap.get(lead.lost_by) : null;
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
                lostReason: lead.lost_reason,
                lostBy: lead.lost_by || undefined,
                lostByName: lostByProfile?.full_name || undefined,
                lostAt: lead.lost_at ? new Date(lead.lost_at) : undefined,
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
                lostReason: row.lost_reason,
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

        // Fetch assignee and lost_by profiles
        const userIds = new Set<string>();
        if (data.assigned_to) userIds.add(data.assigned_to);
        if (data.lost_by) userIds.add(data.lost_by);

        const profileMap = new Map<string, string>();
        if (userIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', Array.from(userIds));
            if (profiles) {
                profiles.forEach(p => profileMap.set(p.id, p.full_name || ''));
            }
        }

        const assigneeName = data.assigned_to ? profileMap.get(data.assigned_to) : null;
        const lostByName = data.lost_by ? profileMap.get(data.lost_by) : null;

        return {
            ...data,
            id: data.id,
            assignedTo: data.assigned_to,
            customerId: data.customer_id,
            status: data.status as LeadStatus,
            source: data.source as LeadSource,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            lastContactDate: data.last_contact_date ? new Date(data.last_contact_date) : undefined,
            clientWillContactAt: data.client_will_contact_at ? new Date(data.client_will_contact_at) : undefined,
            customerData: data.customer_data,
            lostReason: data.lost_reason,
            lostBy: data.lost_by || undefined,
            lostByName: lostByName || undefined,
            lostAt: data.lost_at ? new Date(data.lost_at) : undefined,
            // Fair Module Data Mapping
            fairId: data.fair_id,
            fairPhotos: data.fair_photos || [],
            fairPrize: data.fair_prize,
            fairProducts: data.fair_products || [],
            // AI
            aiScore: data.ai_score,
            aiSummary: data.ai_summary,
            // Attachments
            attachments: data.attachments || [],
            salesRep: undefined,
            assignee: assigneeName ? {
                firstName: assigneeName.split(' ')[0] || '',
                lastName: assigneeName.split(' ').slice(1).join(' ') || ''
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
            lostReason: lead.lost_reason,
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

        } catch (err) {
            console.error('Failed to send Welcome Email:', err);
        }
    },

    /**
     * Check for duplicate leads/customers based on email, phone, or lastName+city.
     * Used by LeadForm to warn users before creating duplicates.
     */
    async checkDuplicates(params: {
        email?: string;
        phone?: string;
        lastName?: string;
        city?: string;
    }): Promise<{
        type: 'lead' | 'customer';
        matchOn: 'email' | 'phone' | 'name_city';
        id: string;
        name: string;
        email?: string;
        phone?: string;
        status?: string;
        assigneeName?: string;
        createdAt?: string;
    }[]> {
        const results: any[] = [];
        const seenIds = new Set<string>();

        const email = params.email?.trim().toLowerCase();
        const phone = params.phone?.replace(/[\s\-()\/]/g, '');
        const lastName = params.lastName?.trim().toLowerCase();
        const city = params.city?.trim().toLowerCase();

        // --- 1. Search LEADS by email ---
        if (email && email.length > 3 && email.includes('@')) {
            try {
                const { data: leadsByEmail } = await supabase
                    .from('leads')
                    .select('id, customer_data, status, assigned_to, created_at')
                    .filter('customer_data->>email', 'ilike', email)
                    .limit(5);

                if (leadsByEmail) {
                    for (const l of leadsByEmail) {
                        if (!seenIds.has(l.id)) {
                            seenIds.add(l.id);
                            results.push({
                                type: 'lead',
                                matchOn: 'email',
                                id: l.id,
                                name: `${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || ''}`.trim() || 'Unbekannt',
                                email: l.customer_data?.email,
                                phone: l.customer_data?.phone,
                                status: l.status,
                                assignedTo: l.assigned_to,
                                createdAt: l.created_at,
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Lead email search failed:', e);
            }
        }

        // --- 2. Search LEADS by phone ---
        if (phone && phone.length > 5) {
            try {
                // Use normalizePhone for comparison
                const normalized = normalizePhone(phone);
                const phoneVariants = [phone, normalized];
                // Also try without country code
                if (normalized.startsWith('+49')) phoneVariants.push('0' + normalized.slice(3));
                if (normalized.startsWith('+48')) phoneVariants.push(normalized.slice(3));

                for (const variant of phoneVariants) {
                    if (!variant) continue;
                    const { data: leadsByPhone } = await supabase
                        .from('leads')
                        .select('id, customer_data, status, assigned_to, created_at')
                        .filter('customer_data->>phone', 'ilike', `%${variant}%`)
                        .limit(5);

                    if (leadsByPhone) {
                        for (const l of leadsByPhone) {
                            if (!seenIds.has(l.id)) {
                                seenIds.add(l.id);
                                results.push({
                                    type: 'lead',
                                    matchOn: 'phone',
                                    id: l.id,
                                    name: `${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || ''}`.trim() || 'Unbekannt',
                                    email: l.customer_data?.email,
                                    phone: l.customer_data?.phone,
                                    status: l.status,
                                    assignedTo: l.assigned_to,
                                    createdAt: l.created_at,
                                });
                            }
                        }
                    }
                    if (results.length > 0) break; // Found by phone, stop
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Lead phone search failed:', e);
            }
        }

        // --- 3. Search LEADS by lastName + city ---
        if (lastName && lastName.length > 1 && city && city.length > 1) {
            try {
                const { data: leadsByName } = await supabase
                    .from('leads')
                    .select('id, customer_data, status, assigned_to, created_at')
                    .filter('customer_data->>lastName', 'ilike', lastName)
                    .filter('customer_data->>city', 'ilike', city)
                    .limit(5);

                if (leadsByName) {
                    for (const l of leadsByName) {
                        if (!seenIds.has(l.id)) {
                            seenIds.add(l.id);
                            results.push({
                                type: 'lead',
                                matchOn: 'name_city',
                                id: l.id,
                                name: `${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || ''}`.trim() || 'Unbekannt',
                                email: l.customer_data?.email,
                                phone: l.customer_data?.phone,
                                status: l.status,
                                assignedTo: l.assigned_to,
                                createdAt: l.created_at,
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Lead name+city search failed:', e);
            }
        }

        // --- 4. Search CUSTOMERS by email ---
        if (email && email.length > 3 && email.includes('@')) {
            try {
                const { data: custByEmail } = await supabase
                    .from('customers')
                    .select('id, first_name, last_name, email, phone, created_at')
                    .ilike('email', email)
                    .limit(5);

                if (custByEmail) {
                    for (const c of custByEmail) {
                        const key = `cust_${c.id}`;
                        if (!seenIds.has(key)) {
                            seenIds.add(key);
                            results.push({
                                type: 'customer',
                                matchOn: 'email',
                                id: c.id,
                                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unbekannt',
                                email: c.email,
                                phone: c.phone,
                                createdAt: c.created_at,
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Customer email search failed:', e);
            }
        }

        // --- 5. Search CUSTOMERS by phone ---
        if (phone && phone.length > 5) {
            try {
                const normalized = normalizePhone(phone);
                const { data: custByPhone } = await supabase
                    .from('customers')
                    .select('id, first_name, last_name, email, phone, created_at')
                    .or(`phone.eq.${normalized},phone.eq.${phone}`)
                    .limit(5);

                if (custByPhone) {
                    for (const c of custByPhone) {
                        const key = `cust_${c.id}`;
                        if (!seenIds.has(key)) {
                            seenIds.add(key);
                            results.push({
                                type: 'customer',
                                matchOn: 'phone',
                                id: c.id,
                                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unbekannt',
                                email: c.email,
                                phone: c.phone,
                                createdAt: c.created_at,
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Customer phone search failed:', e);
            }
        }

        // --- 6. Search CUSTOMERS by lastName + city ---
        if (lastName && lastName.length > 1 && city && city.length > 1) {
            try {
                const { data: custByName } = await supabase
                    .from('customers')
                    .select('id, first_name, last_name, email, phone, city, created_at')
                    .ilike('last_name', lastName)
                    .ilike('city', city)
                    .limit(5);

                if (custByName) {
                    for (const c of custByName) {
                        const key = `cust_${c.id}`;
                        if (!seenIds.has(key)) {
                            seenIds.add(key);
                            results.push({
                                type: 'customer',
                                matchOn: 'name_city',
                                id: c.id,
                                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unbekannt',
                                email: c.email,
                                phone: c.phone,
                                createdAt: c.created_at,
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Customer name+city search failed:', e);
            }
        }

        // Fetch assignee names for leads that have assigned_to
        const assigneeIds = [...new Set(results.filter(r => r.assignedTo).map(r => r.assignedTo))];
        if (assigneeIds.length > 0) {
            try {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', assigneeIds);

                if (profiles) {
                    const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));
                    results.forEach(r => {
                        if (r.assignedTo) {
                            r.assigneeName = profileMap.get(r.assignedTo) || undefined;
                            delete r.assignedTo;
                        }
                    });
                }
            } catch (e) {
                console.warn('[DuplicateCheck] Profile fetch failed:', e);
            }
        }

        return results;
    }
};
