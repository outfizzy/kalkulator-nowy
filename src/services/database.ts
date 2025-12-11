import { supabase } from '../lib/supabase';
import type { Offer, MeasurementReport, Installation, Contract, User, PricingResult, Customer, SalesRepStat, Measurement, WalletTransaction, WalletStats, OrderRequest, OrderRequestStatus, FuelLog, FailureReport, FailureReportStatus, Lead, LeadStatus, LeadSource, Communication, Task, TaskStatus, TaskPriority, TaskType, Note, Notification as AppNotification } from '../types';
import type { AuthError } from '@supabase/supabase-js';

interface InstallationData {
    client?: Installation['client'];
    productSummary?: string;
    teamId?: string;
    notes?: string;
    acceptance?: Installation['acceptance'];
    // Legacy flat fields that might exist in old data
    firstName?: string;
    lastName?: string;
    city?: string;
    address?: string;
    phone?: string;
    coordinates?: { lat: number; lng: number };
}

// Normalize pricing object to avoid undefined values in UI (e.g. toLocaleString on undefined)
const normalizePricing = (pricing: Partial<PricingResult> | null | undefined): PricingResult => {
    const p = pricing || {};
    return {
        ...p,
        basePrice: Number(p.basePrice ?? 0),
        addonsPrice: Number(p.addonsPrice ?? 0),
        totalCost: Number(p.totalCost ?? 0),
        sellingPriceNet: Number(p.sellingPriceNet ?? 0),
        sellingPriceGross: Number(p.sellingPriceGross ?? 0),
        finalPriceNet: typeof p.finalPriceNet === 'number' ? p.finalPriceNet : undefined,
        marginPercentage: typeof p.marginPercentage === 'number' ? p.marginPercentage : 0,
        marginValue: Number(p.marginValue ?? 0),
    };
};

export const DatabaseService = {
    // --- Leads ---


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

                const customer = await this.ensureCustomer(customerInput);
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
        const dbUpdates: Record<string, any> = {
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

                    await DatabaseService.createTask({
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

    async deleteCustomer(id: string) {
        // Warning: Supabase might block this if there are foreign key constraints (cascading).
        // Ensure ON DELETE CASCADE is set in DB or handle cleanup manually if needed.
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
    },

    async deleteOffer(id: string) {
        const { error } = await supabase.from('offers').delete().eq('id', id);
        if (error) throw error;
    },

    async deleteContract(id: string) {
        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if (error) throw error;
    },

    async checkAndAutoCompleteInstallations(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];

        // Find scheduled installations with date < today
        const { data: overdue, error: fetchError } = await supabase
            .from('installations')
            .select('id, scheduled_date, status')
            .eq('status', 'scheduled')
            .lt('scheduled_date', today);

        if (fetchError) throw fetchError;

        if (!overdue || overdue.length === 0) return 0;

        const ids = overdue.map(i => i.id);

        // Bulk update to verification
        const { error: updateError } = await supabase
            .from('installations')
            .update({ status: 'verification' })
            .in('id', ids);

        if (updateError) throw updateError;

        return ids.length;
    },

    // --- Offers ---
    async getOffers(): Promise<Offer[]> {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerNumber: row.offer_number,
            customer: { ...row.customer_data, id: row.customer_id },
            product: row.product_config,
            pricing: normalizePricing(row.pricing),
            status: row.status as Offer['status'],
            snowZone: row.snow_zone,
            commission: row.commission,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.user_id,
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined
        }));
    },

    async getOffersForMeasurement(): Promise<Offer[]> {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .in('status', ['draft', 'sent'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerNumber: row.offer_number,
            customer: row.customer_data,
            product: row.product_config,
            pricing: normalizePricing(row.pricing),
            status: row.status as Offer['status'],
            snowZone: row.snow_zone,
            commission: row.commission,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.user_id,
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined
        }));
    },

    async getOfferById(id: string): Promise<Offer | null> {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;

        let customer = { ...data.customer_data, id: data.customer_id };

        // Robustness: If customer data is missing essential fields (e.g. from bad migration), fetch it fresh
        if (data.customer_id && (!customer.firstName || !customer.lastName || !customer.city)) {
            const { data: freshCustomer } = await supabase
                .from('customers')
                .select('*')
                .eq('id', data.customer_id)
                .single();

            if (freshCustomer) {
                customer = {
                    id: freshCustomer.id,
                    salutation: freshCustomer.salutation,
                    firstName: freshCustomer.first_name,
                    lastName: freshCustomer.last_name,
                    street: freshCustomer.street,
                    houseNumber: freshCustomer.house_number,
                    postalCode: freshCustomer.postal_code,
                    city: freshCustomer.city,
                    phone: freshCustomer.phone,
                    email: freshCustomer.email,
                    country: freshCustomer.country,
                    companyName: freshCustomer.company_name
                };
            }
        }

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: customer,
            product: data.product_config,
            pricing: normalizePricing(data.pricing),
            status: data.status as Offer['status'],
            snowZone: data.snow_zone,
            commission: data.commission,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.user_id,
            clientWillContactAt: data.client_will_contact_at ? new Date(data.client_will_contact_at) : undefined
        };
    },

    async ensureCustomer(customerData: Customer, source: string = 'auto'): Promise<Customer & { id: string }> {
        if (customerData.id) {
            const existing = await this.getCustomer(customerData.id);
            if (existing && existing.id) return existing as Customer & { id: string };
        }

        // 2. Try to find by Email (Unique Identifier)
        if (customerData.email) {
            const { data } = await supabase
                .from('customers')
                .select('*')
                .ilike('email', customerData.email.trim())
                .limit(1)
                .single();

            if (data) {
                // If found, update with new data to ensure we have the latest details
                // Only update if we have meaningful new data
                if (Object.keys(customerData).length > 2) { // crude check if we have more than just email
                    try {
                        const updated = await this.updateCustomer(data.id, customerData);
                        return { ...updated, id: data.id };
                    } catch (e) {
                        console.warn('Failed to update existing customer in ensureCustomer', e);
                    }
                }
                return this._mapCustomerRow(data);
            }
        }

        // 3. Try to find by Phone (Secondary Identifier)
        if (customerData.phone) {
            const { data } = await supabase
                .from('customers')
                .select('*')
                .ilike('phone', customerData.phone.trim())
                .limit(1)
                .single();

            if (data) return this._mapCustomerRow(data);
        }

        // 4. Try to find by First Name + Last Name (Weak Identifier)
        if (customerData.firstName && customerData.lastName) {
            const { data } = await supabase
                .from('customers')
                .select('*')
                .ilike('first_name', customerData.firstName.trim())
                .ilike('last_name', customerData.lastName.trim())
                .limit(1)
                .single();

            if (data) return this._mapCustomerRow(data);
        }

        // 5. Create new if not found
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('customers')
            .insert({
                created_by: user.id,
                salutation: customerData.salutation,
                first_name: customerData.firstName,
                last_name: customerData.lastName,
                street: customerData.street,
                house_number: customerData.houseNumber,
                postal_code: customerData.postalCode,
                city: customerData.city,
                phone: customerData.phone,
                email: customerData.email,
                country: customerData.country || 'Deutschland',
                source: source
            })
            .select()
            .single();

        if (error) throw error;

        return this._mapCustomerRow(data);
    },

    _mapCustomerRow(data: any): Customer & { id: string } {
        return {
            id: data.id,
            salutation: data.salutation as Customer['salutation'],
            firstName: data.first_name,
            lastName: data.last_name,
            street: data.street,
            houseNumber: data.house_number,
            postalCode: data.postal_code,
            city: data.city,
            phone: data.phone,
            email: data.email,
            country: data.country,
        };
    },

    async createOffer(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Offer> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Ensure customer exists in customers table
        let customerId = offer.customer.id;
        try {
            const customer = await this.ensureCustomer(offer.customer);
            customerId = customer.id;
        } catch (e) {
            console.error('Failed to ensure customer:', e);
            // Fallback: proceed without strict link if needed, or fail. 
            // Fallback: proceed without strict link if needed, or fail.
            // We'll proceed but without customer_id if it failed, relying on customer_data jsonb
        }

        const { data, error } = await supabase
            .from('offers')
            .insert({
                user_id: user.id,
                offer_number: offer.offerNumber || `OFF / ${Date.now()} `,
                customer_data: { ...offer.customer, id: customerId }, // Ensure ID is saved in JSON
                customer_id: customerId,
                lead_id: offer.leadId, // Link to Lead
                product_config: offer.product,
                pricing: offer.pricing,
                status: offer.status,
                snow_zone: offer.snowZone,
                commission: offer.commission,
                margin_percentage: offer.pricing.marginPercentage
            })
            .select()
            .single();

        if (error) throw error;

        // If created from a Lead, update the Lead with customer_id if it was missing
        if (offer.leadId && customerId) {
            // Optimistic update, don't block
            supabase.from('leads').update({ customer_id: customerId, status: 'offer_sent' }).eq('id', offer.leadId).then(({ error }) => {
                if (error) console.error('Error linking lead to customer:', error);
            });
        }

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: { ...data.customer_data, id: customerId }, // Return with ID
            product: data.product_config,
            pricing: normalizePricing(data.pricing),
            status: data.status as Offer['status'],
            snowZone: data.snow_zone,
            commission: data.commission,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.user_id,
            leadId: data.lead_id
        } as Offer;
    },

    async updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
        // Convert to DB format
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.customer) dbUpdates.customer_data = updates.customer; // Full object update
        if (updates.product) dbUpdates.product_config = updates.product;
        if (updates.pricing) dbUpdates.pricing = updates.pricing;
        if (updates.snowZone) dbUpdates.snow_zone = updates.snowZone; // Update snow zone if changed
        if (updates.commission) dbUpdates.commission = updates.commission;
        if (updates.leadId) dbUpdates.lead_id = updates.leadId;
        if (updates.clientWillContactAt) dbUpdates.client_will_contact_at = updates.clientWillContactAt.toISOString();
        if (updates.settings) dbUpdates.settings_data = updates.settings;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.viewCount !== undefined) dbUpdates.view_count = updates.viewCount;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('offers')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Automation: Create Follow-up Task when Offer is SENT
        if (updates.status === 'sent') {
            try {
                const { data: offerData } = await supabase
                    .from('offers')
                    .select('offer_number, customer_data')
                    .eq('id', id)
                    .single();

                if (offerData) {
                    const customerName = (offerData.customer_data as any)?.lastName || 'Klient';
                    const title = `Przypomnienie: Oferta ${offerData.offer_number} (${customerName})`;

                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7);

                    const { data: { user } } = await supabase.auth.getUser();

                    if (user) {
                        await DatabaseService.createTask({
                            userId: user.id,
                            title,
                            description: 'Oferta wysłana 7 dni temu. Skontaktuj się z klientem.',
                            dueDate: dueDate.toISOString(),
                            status: 'pending',
                            priority: 'medium',
                            type: 'call',
                        });
                    }
                }
            } catch (taskError) {
                console.error('Failed to create follow-up task:', taskError);
                // Non-blocking error
            }
        }

        // Automation: Create Task when Client Will Contact date is set (Offer)
        if (updates.clientWillContactAt) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // We might already have offerData from previous block if status changed, but separate check is safer or just re-fetch if needed.
                    // To avoid double fetch, we could optimize, but for now simple:
                    const { data: offerData } = await supabase.from('offers').select('offer_number, customer_data').eq('id', id).single();
                    const name = (offerData?.customer_data as any)?.lastName || 'Klient';

                    await DatabaseService.createTask({
                        userId: user.id,
                        title: `Kontakt z klientem(Oferta ${offerData?.offer_number}): ${name} `,
                        description: 'Klient prosił o kontakt (lub sam się odezwie) w tym terminie.',
                        dueDate: updates.clientWillContactAt.toISOString(),
                        status: 'pending',
                        priority: 'high',
                        type: 'call',
                        customerId: updates.customer?.id // Offer is linked to customer
                    });
                }
            } catch (err) {
                console.error('Failed to create automation task for offer:', err);
            }
        }
    },



    // --- Customers ---
    // --- Customers ---
    async getCustomers(): Promise<Customer[]> {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id, // Ensure Customer type has ID if needed, or just return Customer data
            salutation: row.salutation as Customer['salutation'],
            firstName: row.first_name,
            lastName: row.last_name,
            street: row.street,
            houseNumber: row.house_number,
            postalCode: row.postal_code,
            city: row.city,
            phone: row.phone,
            email: row.email,
            country: row.country,
            // Add metadata if needed in Customer type
        }));
    },

    async getCustomer(id: string): Promise<Customer | null> {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;

        return {
            id: data.id, // We might need to extend Customer type to include ID
            salutation: data.salutation as Customer['salutation'],
            firstName: data.first_name,
            lastName: data.last_name,
            street: data.street,
            houseNumber: data.house_number,
            postalCode: data.postal_code,
            city: data.city,
            phone: data.phone,
            email: data.email,
            country: data.country,
        } as Customer & { id: string };
    },

    async createCustomer(customer: Customer): Promise<Customer & { id: string }> {
        return this.ensureCustomer(customer, 'manual');
    },



    // Updated to use customers table + offers + contracts for stats
    async getUniqueCustomers(): Promise<{ customer: Customer & { id?: string }; lastOfferDate: Date; offerCount: number; latestOfferId: string; contractCount: number; hasSignedContract: boolean }[]> {
        // 1. Fetch all data
        const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('*');
        if (customersError) throw customersError;

        const { data: offersData, error: offersError } = await supabase
            .from('offers')
            .select('id, customer_data, customer_id, created_at')
            .order('created_at', { ascending: false });
        if (offersError) throw offersError;

        const { data: contractsData, error: contractsError } = await supabase
            .from('contracts')
            .select('id, offer_id, status');
        if (contractsError) throw contractsError;

        // Map to store unique customers. Keys:
        // - "ID:<uuid>" for existing DB customers
        // - "EMAIL:<email>" for virtual customers found in offers (if email exists)
        // - "NAME:<first>:<last>" fallback
        const uniqueCustomers = new Map<string, {
            customer: Customer & { id?: string };
            offers: typeof offersData;
            contracts: typeof contractsData;
        }>();



        // 1. Initialize with DB Customers
        customersData.forEach(row => {
            const customer: Customer & { id?: string } = {
                id: row.id,
                salutation: row.salutation as Customer['salutation'],
                firstName: row.first_name,
                lastName: row.last_name,
                street: row.street,
                houseNumber: row.house_number,
                postalCode: row.postal_code,
                city: row.city,
                phone: row.phone,
                email: row.email,
                country: row.country,
            };
            uniqueCustomers.set(`ID:${row.id} `, { customer, offers: [], contracts: [] });
            // Also map email/name to this ID to catch duplicates from offers
            if (customer.email) uniqueCustomers.set(`EMAIL:${customer.email.toLowerCase()} `, { customer, offers: [], contracts: [] });
        });

        // 2. Process Offers
        offersData.forEach(offer => {
            const offerCustomer = offer.customer_data;
            if (!offerCustomer) return;

            let entry: any = null;

            // Try to find existing entry
            if (offer.customer_id && uniqueCustomers.has(`ID:${offer.customer_id} `)) {
                entry = uniqueCustomers.get(`ID:${offer.customer_id} `);
            } else if (offerCustomer.email && uniqueCustomers.has(`EMAIL:${offerCustomer.email.toLowerCase()} `)) {
                entry = uniqueCustomers.get(`EMAIL:${offerCustomer.email.toLowerCase()} `);
            } else {
                const nameKey = `NAME:${(offerCustomer.firstName || '').toLowerCase()}:${(offerCustomer.lastName || '').toLowerCase()} `;
                if (uniqueCustomers.has(nameKey)) {
                    entry = uniqueCustomers.get(nameKey);
                }
            }

            // If not found, create new Virtual Customer
            if (!entry) {
                const newCustomer = {
                    ...offerCustomer,
                    id: undefined // Explicitly undefined for virtual
                };
                entry = { customer: newCustomer, offers: [], contracts: [] };

                // Register keys
                if (offerCustomer.email) uniqueCustomers.set(`EMAIL:${offerCustomer.email.toLowerCase()} `, entry);
                const nameKey = `NAME:${(offerCustomer.firstName || '').toLowerCase()}:${(offerCustomer.lastName || '').toLowerCase()} `;
                uniqueCustomers.set(nameKey, entry);
            }

            entry.offers.push(offer);
        });

        // 3. Process Contracts (Link via Offers)
        const offerToCustomerMap = new Map<string, any>();
        // Build reverse lookup
        Array.from(uniqueCustomers.values()).forEach(entry => {
            entry.offers.forEach((o: any) => offerToCustomerMap.set(o.id, entry));
        });

        contractsData.forEach(contract => {
            const entry = offerToCustomerMap.get(contract.offer_id);
            if (entry) {
                entry.contracts.push(contract);
            }
        });

        // 4. Calculate Stats & Return List (Unique objects only)
        const result = new Set(uniqueCustomers.values());

        return Array.from(result).map(entry => {
            // Sort offers desc
            entry.offers.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const lastOffer = entry.offers[0];
            const signedContracts = entry.contracts.filter((c: any) => c.status === 'signed' || c.status === 'completed');

            return {
                customer: entry.customer,
                lastOfferDate: lastOffer ? new Date(lastOffer.created_at) : new Date(0),
                offerCount: entry.offers.length,
                latestOfferId: lastOffer?.id || '',
                contractCount: entry.contracts.length,
                hasSignedContract: signedContracts.length > 0
            };
        }).sort((a, b) => b.lastOfferDate.getTime() - a.lastOfferDate.getTime());
    },



    async getRegionStats(postalCodePrefix: string) {
        // Fetch all offers in this region
        // We use a text search on the JSONB column for now
        // performance warning: full table scan potential on large datasets if not indexed
        const { data, error } = await supabase
            .from('offers')
            .select('status, pricing, customer_data')
            .textSearch('customer_data', `'${postalCodePrefix}':*`) // simplistic approach
            // Better approach: filter in JS after fetching recent offers or use RPC
            // For now, let's fetch last 100 offers to save bandwidth and calc stats
            .limit(100);

        // Alternative safer queries if textSearch is tricky on jsonb:
        // .filter('customer_data->>postalCode', 'like', `${postalCodePrefix}%`) 

        if (error) {
            console.error("Error fetching region stats", error);
            return { winRate: 0, avgMargin: 0, totalOffers: 0 };
        }

        if (!data || data.length === 0) return { winRate: 0, avgMargin: 0, totalOffers: 0 };

        const regionOffers = data.filter((o: any) => {
            const pc = o.customer_data?.postalCode || '';
            return pc.startsWith(postalCodePrefix);
        });

        if (regionOffers.length === 0) return { winRate: 0, avgMargin: 0, totalOffers: 0 };

        const total = regionOffers.length;
        const sold = regionOffers.filter((o: any) => o.status === 'sold').length;
        const winRate = (sold / total) * 100;

        // Avg Margin
        const margins = regionOffers.map((o: any) => o.pricing?.marginPercentage || 0);
        const avgMargin = margins.reduce((a: number, b: number) => a + b, 0) / total;

        return { winRate, avgMargin, totalOffers: total };
    },



    async getCustomerOffers(customerId: string): Promise<Offer[]> {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerNumber: row.offer_number,
            customer: { ...row.customer_data, id: row.customer_id },
            product: row.product_config,
            pricing: normalizePricing(row.pricing),
            status: row.status as Offer['status'],
            snowZone: row.snow_zone,
            commission: row.commission,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.user_id,

            // Missing fields added to match getLeadOffers/getOffers rich objects
            leadId: row.lead_id,
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
            validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
            settings: row.settings_data || {},
            notes: row.notes,
            viewCount: row.view_count || 0
        }));
    },

    // --- Contracts ---
    async getContracts(): Promise<Contract[]> {
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            status: row.status as Contract['status'],
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: {
                ...row.contract_data.pricing,
                paymentMethod: row.contract_data.pricing?.paymentMethod,
                advancePayment: row.contract_data.pricing?.advancePayment,
                advancePaymentDate: row.contract_data.pricing?.advancePaymentDate ? new Date(row.contract_data.pricing.advancePaymentDate) : undefined,
            },
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            orderedItems: row.contract_data.orderedItems || [],
            comments: row.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined
        }));
    },

    async createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'contractNumber'>): Promise<Contract> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate sequential contract number using database function
        // This bypasses RLS to ensure sequential numbers across ALL users
        const { data: contractNumberData, error: rpcError } = await supabase
            .rpc('get_next_contract_number');

        if (rpcError) throw rpcError;
        const newContractNumber = contractNumberData as string;

        const contractData = {
            contractNumber: newContractNumber,
            client: contract.client,
            product: contract.product,
            pricing: contract.pricing,
            commission: contract.commission,
            requirements: contract.requirements,
            comments: contract.comments,
            attachments: contract.attachments,
            orderedItems: contract.orderedItems || []
        };

        const { data, error } = await supabase
            .from('contracts')
            .insert({
                offer_id: contract.offerId,
                user_id: user.id,
                contract_data: contractData,
                status: contract.status,
                signed_at: contract.signedAt ? contract.signedAt.toISOString() : null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...contract,
            contractNumber: newContractNumber,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Contract;
    },

    async updateContract(id: string, contract: Partial<Contract>): Promise<void> {
        // 1. Fetch existing contract to enable safe merging
        const existing = await this.getContracts();
        const current = existing.find(c => c.id === id);
        if (!current) throw new Error('Contract not found');

        const updates: Record<string, unknown> = {};

        // 2. Handle status updates with auto-sign logic
        if (contract.status && contract.status !== current.status) {
            updates.status = contract.status;

            // Auto-set signed_at when status changes to 'signed'
            if (contract.status === 'signed' && !current.signedAt) {
                updates.signed_at = new Date().toISOString();
            }
        }

        // 3. Handle explicit signed_at override
        if (contract.signedAt) {
            updates.signed_at = contract.signedAt.toISOString();
        }

        // 4. Handle contract_data updates with safe JSONB merge
        const needsDataUpdate = contract.client || contract.product ||
            contract.pricing || contract.comments ||
            contract.requirements || contract.attachments ||
            contract.orderedItems ||
            contract.contractNumber || contract.commission !== undefined;

        if (needsDataUpdate) {
            // Merge with existing data to prevent undefined overwrites
            const updatedData = {
                contractNumber: contract.contractNumber ?? current.contractNumber,
                client: contract.client ?? current.client,
                product: contract.product ?? current.product,
                pricing: contract.pricing ?? current.pricing,
                commission: contract.commission ?? current.commission,
                requirements: contract.requirements ?? current.requirements,
                orderedItems: contract.orderedItems ?? current.orderedItems ?? [],
                comments: contract.comments ?? current.comments,
                attachments: contract.attachments ?? current.attachments
            };
            updates.contract_data = updatedData;
        }

        // 5. Execute update only if there are changes
        if (Object.keys(updates).length === 0) {
            return; // Nothing to update
        }

        const { error } = await supabase
            .from('contracts')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async getCustomerContracts(customerId: string): Promise<Contract[]> {
        // Since we don't have direct customer_id on contracts table yet, we can filter by querying offers first OR filter in JS.
        // Assuming performance is not an issue yet, we can fetch all and filter, OR join with offers.
        // Better: Fetch offers for customer, then fetch contracts for those offer IDs.

        // 1. Get Offer IDs for customer
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('id')
            .eq('customer_id', customerId);

        if (offersError) throw offersError;
        const offerIds = offers.map(o => o.id);

        if (offerIds.length === 0) return [];

        // 2. Get Contracts for these offers
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .in('offer_id', offerIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: {
                ...row.contract_data.pricing,
                paymentMethod: row.contract_data.pricing?.paymentMethod,
                advancePayment: row.contract_data.pricing?.advancePayment,
                advancePaymentDate: row.contract_data.pricing?.advancePaymentDate ? new Date(row.contract_data.pricing.advancePaymentDate) : undefined,
            },
            status: row.status as Contract['status'],
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            orderedItems: row.contract_data.orderedItems || [],
            comments: row.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined
        }));
    },

    // --- Installations ---
    async getInstallations(): Promise<Installation[]> {
        const { data, error } = await supabase
            .from('installations')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map(row => {
            const installationData = (row as { installation_data: Partial<InstallationData> }).installation_data || {};
            const clientData: Partial<Installation['client']> = installationData.client || {};

            const client = {
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                city: clientData.city || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                coordinates: clientData.coordinates
            };

            const scheduledRaw = (row as { scheduled_date: string | null }).scheduled_date;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            return {
                id: row.id,
                offerId: row.offer_id,
                client,
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId || (row as { team_id?: string }).team_id,
                notes: installationData.notes,
                acceptance: (row as any).acceptance || installationData.acceptance,
                createdAt: new Date(row.created_at),
                partsReady: (row as any).parts_ready,
                expectedDuration: (row as any).expected_duration || 1
            };
        });
    },

    // --- Notes ---
    async getNotes(entityType: 'lead' | 'customer', entityId: string): Promise<Note[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*, user:user_id(id, first_name, last_name, email, avatar_url)')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            content: row.content,
            userId: row.user_id,
            attachments: row.attachments || [],
            createdAt: new Date(row.created_at),
            user: row.user ? {
                id: row.user.id,
                firstName: row.user.first_name,
                lastName: row.user.last_name,
                email: row.user.email,
                avatarUrl: row.user.avatar_url
            } : undefined
        }));
    },

    async createNote(note: Partial<Note>): Promise<Note> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('notes')
            .insert({
                entity_type: note.entityType,
                entity_id: note.entityId,
                content: note.content,
                user_id: user.id,
                attachments: note.attachments || []
            })
            .select('*, user:user_id(id, first_name, last_name, email, avatar_url)')
            .single();

        if (error) throw error;

        return {
            id: data.id,
            entityType: data.entity_type,
            entityId: data.entity_id,
            content: data.content,
            userId: data.user_id,
            attachments: data.attachments || [],
            createdAt: new Date(data.created_at),
            user: data.user ? {
                id: data.user.id,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                email: data.user.email,
                avatarUrl: data.user.avatar_url
            } : undefined
        };
    },

    async deleteNote(id: string): Promise<void> {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createInstallation(installation: Omit<Installation, 'id' | 'createdAt'>): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const installationData = {
            client: installation.client,
            productSummary: installation.productSummary,
            teamId: installation.teamId,
            notes: installation.notes
        };

        const { data, error } = await supabase
            .from('installations')
            .insert({
                offer_id: installation.offerId,
                user_id: user.id,
                scheduled_date: installation.scheduledDate || null,
                status: installation.status,
                installation_data: installationData
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...installation,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Installation;
    },

    async updateInstallation(id: string, updates: Partial<Installation>): Promise<void> {
        // First fetch current data to ensure we don't lose fields in JSONB
        const { data: current, error: fetchError } = await supabase
            .from('installations')
            .select('installation_data')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const currentData = (current?.installation_data as Partial<InstallationData>) || {};

        const dbUpdates: Record<string, unknown> = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;
        if (updates.partsReady !== undefined) dbUpdates.parts_ready = updates.partsReady;
        if (updates.expectedDuration !== undefined) dbUpdates.expected_duration = updates.expectedDuration;

        // Merge installation_data
        if (updates.client || updates.productSummary || updates.teamId || updates.notes || updates.acceptance) {
            const installationData = {
                ...currentData, // Keep existing fields
                ...(updates.client && { client: updates.client }),
                ...(updates.productSummary && { productSummary: updates.productSummary }),
                ...(updates.teamId !== undefined && { teamId: updates.teamId }), // Allow setting to null/undefined if passed explicitly?
                // Actually updates.teamId can be undefined if we want to clear it? 
                // But Partial<Installation> makes everything optional.
                // If we want to clear it, we might need to pass null.
                // For now, let's assume if it's in updates, we update it.
                ...(updates.notes && { notes: updates.notes }),
                ...(updates.acceptance && { acceptance: updates.acceptance })
            };

            // specific check for teamId clearing if needed, but usually we just overwrite.
            if (updates.teamId) installationData.teamId = updates.teamId;

            dbUpdates.installation_data = installationData;
        }

        const { error } = await supabase
            .from('installations')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async getAllInstallations(): Promise<Installation[]> {
        const { data, error } = await supabase
            .from('installations')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map(row => {
            const installationData = (row as { installation_data: Partial<InstallationData> }).installation_data || {};
            const clientData: Partial<Installation['client']> = installationData.client || {};

            const client = {
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                city: clientData.city || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                coordinates: clientData.coordinates
            };

            const scheduledRaw = (row as { scheduled_date: string | null }).scheduled_date;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            return {
                id: row.id,
                offerId: row.offer_id,
                client,
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId || (row as { team_id?: string }).team_id,
                notes: installationData.notes,
                acceptance: installationData.acceptance,
                createdAt: new Date(row.created_at)
            };
        });
    },

    async getCustomerInstallations(customerId: string): Promise<Installation[]> {
        // Similar to contracts, we link via offers
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('id')
            .eq('customer_id', customerId);

        if (offersError) throw offersError;
        const offerIds = offers.map(o => o.id);

        if (offerIds.length === 0) return [];

        const { data, error } = await supabase
            .from('installations')
            .select('*')
            .in('offer_id', offerIds)
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map(row => {
            const installationData = (row as { installation_data: Partial<InstallationData> }).installation_data || {};
            const clientData: Partial<Installation['client']> = installationData.client || {};

            const client = {
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                city: clientData.city || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                coordinates: clientData.coordinates
            };

            const scheduledRaw = (row as { scheduled_date: string | null }).scheduled_date;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            return {
                id: row.id,
                offerId: row.offer_id,
                client,
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId || (row as { team_id?: string }).team_id,
                notes: installationData.notes,
                acceptance: installationData.acceptance,
                createdAt: new Date(row.created_at)
            };
        });
    },

    // --- Users ---
    async getSalesReps(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'sales_rep'); // Or fetch all if admin needs to see admins too?

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            username: row.full_name?.split(' ')[0].toLowerCase() || '', // Fallback
            firstName: row.full_name?.split(' ')[0] || '',
            lastName: row.full_name?.split(' ').slice(1).join(' ') || '',
            email: '', // Email is in auth.users, not accessible easily from public table unless we duplicate it. 
            role: row.role as User['role'],
            createdAt: new Date(row.created_at),
            phone: row.phone,
            monthlyTarget: row.monthly_target,
            status: row.status as 'pending' | 'active' | 'blocked',
            companyName: row.company_name || undefined,
            nip: row.nip || undefined,
            partnerMargin: typeof row.partner_margin === 'number' ? row.partner_margin : undefined,
            commissionRate: typeof row.commission_rate === 'number' ? row.commission_rate : undefined
        }));
    },

    async getUserById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;

        return {
            id: data.id,
            username: data.full_name?.split(' ')[0].toLowerCase() || '',
            firstName: data.full_name?.split(' ')[0] || '',
            lastName: data.full_name?.split(' ').slice(1).join(' ') || '',
            email: '',
            role: data.role as User['role'],
            createdAt: new Date(data.created_at),
            phone: data.phone,
            monthlyTarget: data.monthly_target,
            status: data.status as 'pending' | 'active' | 'blocked',
            companyName: data.company_name || undefined,
            nip: data.nip || undefined,
            partnerMargin: typeof data.partner_margin === 'number' ? data.partner_margin : undefined,
            commissionRate: typeof data.commission_rate === 'number' ? data.commission_rate : undefined,
            substituteUserId: data.substitute_user_id,
            substituteUntil: data.substitute_until ? new Date(data.substitute_until) : undefined
        };
    },
    async checkEmailConfigColumn(userId: string): Promise<{ error: any }> {
        // Try selecting ALL required columns to verify schema closure
        const { error } = await supabase
            .from('profiles')
            .select('email_config, monthly_target, phone')
            .eq('id', userId)
            .single();
        return { error };
    },

    async updateUserProfile(profile: Partial<User>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };
        if (profile.firstName || profile.lastName) {
            updates.full_name = `${profile.firstName || ''} ${profile.lastName || ''} `.trim();
        }
        if (profile.phone !== undefined) updates.phone = profile.phone;
        if (profile.monthlyTarget !== undefined) updates.monthly_target = profile.monthlyTarget;
        if (profile.emailConfig !== undefined) updates.email_config = profile.emailConfig;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error('DatabaseService updateUserProfile error:', error);
            throw error;
        }
    },

    async updateUserLanguage(userId: string, language: 'pl' | 'mo' | 'uk'): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({
                preferred_language: language,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;
    },

    async getSoldOffersCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'sold');

        if (error) throw error;
        return count || 0;
    },

    // --- Admin User Management ---
    async getAllUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            username: row.full_name?.split(' ')[0].toLowerCase() || '',
            firstName: row.full_name?.split(' ')[0] || '',
            lastName: row.full_name?.split(' ').slice(1).join(' ') || '',
            email: '', // Email is in auth.users, not in profiles
            role: row.role as User['role'],
            createdAt: new Date(row.created_at),
            phone: row.phone,
            monthlyTarget: row.monthly_target,
            status: row.status as 'pending' | 'active' | 'blocked',
            companyName: row.company_name || undefined,
            nip: row.nip || undefined,
            partnerMargin: typeof row.partner_margin === 'number' ? row.partner_margin : undefined,
            commissionRate: typeof row.commission_rate === 'number' ? row.commission_rate : undefined
        }));
    },

    async updateUserStatus(userId: string, status: 'pending' | 'active' | 'blocked'): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateUserRole(userId: string, role: User['role']): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    async updatePartnerMargin(userId: string, margin: number): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ partner_margin: margin, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateCommissionRate(userId: string, rate: number): Promise<void> {
        // Validate rate is between 0 and 1
        if (rate < 0 || rate > 1) {
            throw new Error('Commission rate must be between 0 and 1 (0% to 100%)');
        }

        const { error } = await supabase
            .from('profiles')
            .update({ commission_rate: rate, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    async verifyCurrentPassword(email: string, password: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { error };
    },

    async updatePassword(password: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
    },

    async deleteUser(userId: string): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    },

    async getInstallers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'installer');

        if (error) throw error;

        return (data || []).map(row => ({
            id: row.id,
            username: row.full_name?.split(' ')[0].toLowerCase() || '',
            firstName: row.full_name?.split(' ')[0] || '',
            lastName: row.full_name?.split(' ').slice(1).join(' ') || '',
            email: '',
            role: row.role as User['role'],
            createdAt: new Date(row.created_at),
            phone: row.phone,
            monthlyTarget: row.monthly_target,
            status: row.status as 'pending' | 'active' | 'blocked'
        }));
    },

    async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
        const dbUpdates: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (updates.salutation !== undefined) dbUpdates.salutation = updates.salutation;
        if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
        if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
        if (updates.street !== undefined) dbUpdates.street = updates.street;
        if (updates.houseNumber !== undefined) dbUpdates.house_number = updates.houseNumber;
        if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.country !== undefined) dbUpdates.country = updates.country;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.email !== undefined) dbUpdates.email = updates.email;

        const { data, error } = await supabase
            .from('customers')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            salutation: data.salutation as Customer['salutation'],
            firstName: data.first_name,
            lastName: data.last_name,
            street: data.street,
            houseNumber: data.house_number,
            postalCode: data.postal_code,
            city: data.city,
            phone: data.phone,
            email: data.email,
            country: data.country,
        };
    },

    async getInstallationsForInstaller(userId: string): Promise<Installation[]> {
        // 1. Get user's teams
        const { data: teamMembers, error: teamError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);

        if (teamError) throw teamError;

        const teamIds = teamMembers?.map((tm: { team_id: string }) => tm.team_id) || [];

        // 2. Get direct assignments
        const { data: directAssignments, error: directError } = await supabase
            .from('installation_assignments')
            .select('installation_id')
            .eq('user_id', userId);

        if (directError) throw directError;

        const directInstallationIds = directAssignments?.map((da: { installation_id: string }) => da.installation_id) || [];

        // 3. Get all installations
        // Since teamId is in JSON, we fetch all and filter in JS for now
        // Ideally we would filter in DB but JSON filtering syntax can be tricky with multiple values
        const { data, error } = await supabase
            .from('installations')
            .select('*');

        if (error) throw error;

        return (data || [])
            .map(row => {
                const installationData = (row as { installation_data: Partial<InstallationData> }).installation_data || {};
                const clientData: Partial<Installation['client']> = installationData.client || {};

                const client = {
                    firstName: clientData.firstName || '',
                    lastName: clientData.lastName || '',
                    city: clientData.city || installationData.city || '',
                    address: clientData.address || installationData.address || '',
                    phone: clientData.phone || installationData.phone || '',
                    coordinates: clientData.coordinates
                };

                const scheduledRaw = (row as { scheduled_date: string | null }).scheduled_date;
                const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

                return {
                    id: row.id,
                    offerId: row.offer_id,
                    client,
                    productSummary: installationData.productSummary || '',
                    status: row.status as Installation['status'],
                    scheduledDate,
                    teamId: installationData.teamId || (row as { team_id?: string }).team_id,
                    notes: installationData.notes,
                    acceptance: installationData.acceptance,
                    createdAt: new Date(row.created_at)
                } as Installation;
            })
            .filter(inst => {
                const isTeamAssigned = inst.teamId && teamIds.includes(inst.teamId);
                const isDirectlyAssigned = directInstallationIds.includes(inst.id);
                return isTeamAssigned || isDirectlyAssigned;
            });
    },

    async assignInstaller(installationId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('installation_assignments')
            .insert({ installation_id: installationId, user_id: userId });

        if (error) throw error;
    },

    async unassignInstaller(installationId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('installation_assignments')
            .delete()
            .eq('installation_id', installationId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    async getAssignmentsForInstallation(installationId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('installation_assignments')
            .select('user_id')
            .eq('installation_id', installationId);

        if (error) throw error;

        return (data || []).map(row => (row as { user_id: string }).user_id);
    },

    async saveInstallationAcceptance(installationId: string, acceptance: Installation['acceptance']): Promise<void> {
        // Merge acceptance into existing installation_data and mark as completed
        const { data, error: fetchError } = await supabase
            .from('installations')
            .select('installation_data')
            .eq('id', installationId)
            .single();

        if (fetchError) throw fetchError;

        const existing = (data?.installation_data as Partial<InstallationData>) || {};
        const merged = {
            ...existing,
            acceptance
        };

        const { error } = await supabase
            .from('installations')
            .update({
                status: 'completed',
                installation_data: merged
            })
            .eq('id', installationId);

        if (error) throw error;
    },

    async getInstallerStats(userId: string): Promise<{ completedCount: number }> {
        // Count completed installations assigned to this installer
        // First get assignments
        const { data: assignments, error: assignError } = await supabase
            .from('installation_assignments')
            .select('installation_id')
            .eq('user_id', userId);

        if (assignError) throw assignError;

        // If no assignments, return 0
        if (!assignments || assignments.length === 0) return { completedCount: 0 };

        const ids = assignments.map((a: { installation_id: string }) => a.installation_id);

        // Count how many of these are completed
        const { count, error } = await supabase
            .from('installations')
            .select('*', { count: 'exact', head: true })
            .in('id', ids)
            .eq('status', 'completed');

        if (error) throw error;

        return { completedCount: count || 0 };
    },

    // --- Stats ---
    async getSalesRepStats(startDate?: Date, endDate?: Date): Promise<import('../types').SalesRepStat[]> {
        // Fetch offers for stats
        let offersQuery = supabase
            .from('offers')
            .select('user_id, status, pricing, created_at');

        if (startDate) {
            offersQuery = offersQuery.gte('created_at', startDate.toISOString());
        }
        if (endDate) {
            offersQuery = offersQuery.lte('created_at', endDate.toISOString());
        }

        const { data: offers, error: offersError } = await offersQuery;
        if (offersError) throw offersError;

        // Fetch reports for mileage stats
        const reportsQuery = supabase
            .from('reports')
            .select('user_id, data');

        const { data: reports, error: reportsError } = await reportsQuery;
        if (reportsError) throw reportsError;

        // Fetch all users to map names
        const users = await this.getAllUsers();
        const userMap = new Map(users.map(u => [u.id, u]));

        // Aggregate stats per user
        const statsMap = new Map<string, SalesRepStat>();

        // Process offers
        offers.forEach(offer => {
            const userId = offer.user_id;
            if (!statsMap.has(userId)) {
                const user = userMap.get(userId);
                statsMap.set(userId, {
                    userId,
                    userName: user ? `${user.firstName} ${user.lastName} ` : 'Unknown',
                    role: user?.role || 'sales_rep',
                    totalOffers: 0,
                    soldOffers: 0,
                    totalValue: 0,
                    totalMarginValue: 0,
                    totalDistance: 0,
                    avgMarginPercent: 0,
                    conversionRate: 0,
                    lastActivityDate: undefined,
                    pendingOffersCount: 0
                } as SalesRepStat & { marginSum: number });
            }

            const stats = statsMap.get(userId);
            if (stats) {
                stats.totalOffers++;

                // Track last activity
                const offerDate = new Date(offer.created_at);
                if (!stats.lastActivityDate || offerDate > stats.lastActivityDate) {
                    stats.lastActivityDate = offerDate;
                }

                // Track pending offers
                if (offer.status === 'draft') {
                    stats.pendingOffersCount = (stats.pendingOffersCount || 0) + 1;
                }

                if (offer.status === 'sold') {
                    stats.soldOffers++;
                    stats.totalValue += offer.pricing.sellingPriceNet || 0;
                    stats.totalMarginValue += offer.pricing.marginValue || 0;
                }

                const margin = offer.pricing.marginPercentage || 0;
                const marginSum = (stats as { marginSum?: number }).marginSum || 0;
                (stats as { marginSum?: number }).marginSum = marginSum + margin;
            }
        });

        // Process reports for mileage
        reports.forEach(report => {
            const userId = report.user_id;
            const reportData = report.data;

            // Filter by date if needed
            if (startDate || endDate) {
                const reportDate = new Date(reportData.date);
                if (startDate && reportDate < startDate) return;
                if (endDate && reportDate > endDate) return;
            }

            if (!statsMap.has(userId)) {
                const user = userMap.get(userId);
                statsMap.set(userId, {
                    userId,
                    userName: user ? `${user.firstName} ${user.lastName} ` : 'Unknown',
                    role: user?.role || 'sales_rep',
                    totalOffers: 0,
                    soldOffers: 0,
                    totalValue: 0,
                    totalMarginValue: 0,
                    totalDistance: 0,
                    avgMarginPercent: 0,
                    conversionRate: 0,
                    lastActivityDate: undefined,
                    pendingOffersCount: 0
                } as SalesRepStat & { marginSum: number });
            }

            const stats = statsMap.get(userId);
            if (stats) {
                // Track last activity from reports too
                const reportDate = new Date(reportData.date);
                if (!stats.lastActivityDate || reportDate > stats.lastActivityDate) {
                    stats.lastActivityDate = reportDate;
                }
                stats.totalDistance += reportData.totalKm || 0;
            }
        });

        return Array.from(statsMap.values()).map(stats => {
            const marginSum = (stats as { marginSum?: number }).marginSum || 0;
            return {
                userId: stats.userId,
                userName: stats.userName,
                role: stats.role,
                totalOffers: stats.totalOffers,
                soldOffers: stats.soldOffers,
                totalValue: stats.totalValue,
                totalMarginValue: stats.totalMarginValue,
                totalDistance: stats.totalDistance,
                avgMarginPercent: stats.totalOffers > 0 ? marginSum / stats.totalOffers : 0,
                conversionRate: stats.totalOffers > 0 ? (stats.soldOffers / stats.totalOffers) * 100 : 0
            };
        });
    },

    // --- Reports ---
    async getReports(): Promise<MeasurementReport[]> {
        const { data, error } = await supabase
            .from('reports')
            .select('*');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            date: row.data.date,
            salesRepId: row.user_id,
            carPlate: row.data.carPlate,
            odometerStart: row.data.odometerStart,
            odometerEnd: row.data.odometerEnd,
            totalKm: row.data.totalKm,
            withDriver: row.data.withDriver,
            carIssues: row.data.carIssues,
            reportDescription: row.data.reportDescription,
            visits: row.data.visits || [],
            signedContractsCount: row.data.signedContractsCount,
            offerIds: row.data.offerIds || [],
            createdAt: new Date(row.created_at)
        }));
    },

    async createReport(report: Omit<MeasurementReport, 'createdAt'>): Promise<MeasurementReport> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const reportData = {
            date: report.date,
            carPlate: report.carPlate,
            odometerStart: report.odometerStart,
            odometerEnd: report.odometerEnd,
            totalKm: report.totalKm,
            withDriver: report.withDriver,
            carIssues: report.carIssues,
            reportDescription: report.reportDescription,
            visits: report.visits,
            signedContractsCount: report.signedContractsCount,
            offerIds: report.offerIds
        };

        const { data, error } = await supabase
            .from('reports')
            .insert({
                user_id: user.id,
                data: reportData
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            date: data.data.date,
            salesRepId: data.user_id,
            carPlate: data.data.carPlate,
            odometerStart: data.data.odometerStart,
            odometerEnd: data.data.odometerEnd,
            totalKm: data.data.totalKm,
            withDriver: data.data.withDriver,
            carIssues: data.data.carIssues,
            reportDescription: data.data.reportDescription,
            visits: data.data.visits || [],
            signedContractsCount: data.data.signedContractsCount,
            offerIds: data.data.offerIds || [],
            createdAt: new Date(data.created_at)
        };
    },

    async getSystemStats(): Promise<{
        totalRevenue: number;
        activeUsers: number;
        pendingOffers: number;
        completedInstallations: number;
    }> {
        const { data: offers } = await supabase
            .from('offers')
            .select('pricing, status');

        const { count: activeUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        const { count: completedInstallations } = await supabase
            .from('installations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');

        const totalRevenue = offers?.reduce((sum, offer) => {
            if (offer.status === 'accepted' || offer.status === 'completed') {
                const pricing = normalizePricing(offer.pricing);
                return sum + (pricing.totalCost || 0); // Using totalCost as revenue proxy for now
            }
            return sum;
        }, 0) || 0;

        const pendingOffers = offers?.filter(o => o.status === 'pending').length || 0;

        return {
            totalRevenue,
            activeUsers: activeUsers || 0,
            pendingOffers,
            completedInstallations: completedInstallations || 0
        };
    },

    async deleteReport(id: string): Promise<void> {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Admin Offer Tracking ---
    async getPartnerOffers(): Promise<Offer[]> {
        // 1) Pobierz wszystkie oferty (bez joinów – unikamy błędu 400)
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (offersError) throw offersError;

        if (!offers || offers.length === 0) return [];

        // 2) Pobierz profile partnerów B2B
        const partners = (await this.getAllUsers()).filter(u => u.role === 'partner');
        if (partners.length === 0) return [];

        const partnerMap = new Map(partners.map(p => [p.id, p]));

        // 3) Zbuduj wynik tylko dla ofert, których user_id jest partnerem
        return offers
            .filter(row => partnerMap.has(row.user_id))
            .map(row => {
                const profile = partnerMap.get(row.user_id);
                const createdByName = profile
                    ? `${profile.firstName || ''} ${profile.lastName || ''} `.trim()
                    : undefined;

                return {
                    id: row.id,
                    offerNumber: row.offer_number,
                    customer: { ...row.customer_data, id: row.customer_id },
                    product: row.product_config,
                    pricing: normalizePricing(row.pricing),
                    status: row.status as Offer['status'],
                    snowZone: row.snow_zone,
                    commission: row.commission,
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.updated_at),
                    createdBy: row.user_id,
                    // dodatkowe pola używane w UI admina
                    companyName: profile?.companyName,
                    createdByName: createdByName || undefined
                };
            });
    },

    async getOffersByRole(role: string): Promise<Offer[]> {
        // Prosta implementacja: filtrujemy po roli profilu
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (offersError) throw offersError;

        if (!offers || offers.length === 0) return [];

        const users = await this.getAllUsers();
        const filteredUsers = users.filter(u => u.role === role);
        if (filteredUsers.length === 0) return [];

        const userMap = new Map(filteredUsers.map(u => [u.id, u]));

        return offers
            .filter(row => userMap.has(row.user_id))
            .map(row => {
                const profile = userMap.get(row.user_id);
                const createdByName = profile
                    ? `${profile.firstName || ''} ${profile.lastName || ''} `.trim()
                    : undefined;

                return {
                    id: row.id,
                    offerNumber: row.offer_number,
                    customer: row.customer_data,
                    product: row.product_config,
                    pricing: normalizePricing(row.pricing),
                    status: row.status as Offer['status'],
                    snowZone: row.snow_zone,
                    commission: row.commission,
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.updated_at),
                    createdBy: row.user_id,
                    companyName: profile?.companyName,
                    createdByName: createdByName || undefined
                };
            });
    },

    async searchOffers(query: string): Promise<Offer[]> {
        const lowerQuery = query.toLowerCase();

        // 1) Oferty
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (offersError) throw offersError;

        if (!offers || offers.length === 0) return [];

        // 2) Profile użytkowników
        const users = await this.getAllUsers();
        const userMap = new Map(users.map(u => [u.id, u]));

        // 3) Filtrowanie po numerze oferty / kliencie / firmie / autorze
        return offers
            .map(row => {
                const profile = userMap.get(row.user_id);
                const createdByName = profile
                    ? `${profile.firstName || ''} ${profile.lastName || ''} `.trim()
                    : undefined;

                return {
                    raw: row,
                    profile,
                    createdByName: createdByName || ''
                };
            })
            .filter(({ raw, profile, createdByName }) => {
                const offerNumber = raw.offer_number?.toLowerCase() || '';
                const customerName = `${raw.customer_data?.firstName || ''} ${raw.customer_data?.lastName || ''} `.toLowerCase();
                const companyName = profile?.companyName?.toLowerCase() || '';
                const createdByLower = createdByName.toLowerCase();

                return offerNumber.includes(lowerQuery) ||
                    customerName.includes(lowerQuery) ||
                    companyName.includes(lowerQuery) ||
                    createdByLower.includes(lowerQuery);
            })
            .map(({ raw, profile, createdByName }) => ({
                id: raw.id,
                offerNumber: raw.offer_number,
                customer: raw.customer_data,
                product: raw.product_config,
                pricing: normalizePricing(raw.pricing),
                status: raw.status as Offer['status'],
                snowZone: raw.snow_zone,
                commission: raw.commission,
                createdAt: new Date(raw.created_at),
                updatedAt: new Date(raw.updated_at),
                createdBy: raw.user_id,
                companyName: profile?.companyName,
                createdByName: createdByName || undefined
            }));
    },


    // --- Substitution / Delegation Logic ---

    async updateSubstitution(substituteUserId: string | null, substituteUntil: Date | null): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('profiles')
            .update({
                substitute_user_id: substituteUserId,
                substitute_until: substituteUntil ? substituteUntil.toISOString() : null
            })
            .eq('id', user.id);

        if (error) throw error;
    },

    // --- Tasks ---

    async getTasks(filters?: { leadId?: string; customerId?: string; status?: TaskStatus }): Promise<Task[]> {
        const { data: { user: _user } } = await supabase.auth.getUser(); // Kept as _user or simply remove if auth check is all that's needed. 
        // Better: just check session or remove if not needed. 
        // Actually, let's see why it was there.
        // It says "const { data: { user } } = await supabase.auth.getUser();"
        // If it's just for auth check, I can just await supabase.auth.getUser();
        // Or if I need the ID, I should use it.
        // Let's just create a valid replacement.
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('Not authenticated');
        // Assuming RLS handles visibility (own tasks + assigned)

        let query = supabase
            .from('tasks')
            .select(`
    *,
    assignee: user_id(
        first_name,
        last_name
    )
            `)
            .order('due_date', { ascending: true }); // Soonest first

        if (filters?.leadId) {
            query = query.eq('lead_id', filters.leadId);
        }
        if (filters?.customerId) {
            query = query.eq('customer_id', filters.customerId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        // If no specific filter, maybe show only my tasks or pending? 
        // For now, let RLS filter visibility, and fetches get everything relevant.
        // We might want to filter by assignee in UI.

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            leadId: row.lead_id,
            customerId: row.customer_id,
            title: row.title,
            description: row.description,
            dueDate: row.due_date,
            status: row.status as TaskStatus,
            priority: row.priority as TaskPriority,
            type: row.type as TaskType,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            assignee: row.assignee ? {
                firstName: row.assignee.first_name,
                lastName: row.assignee.last_name
            } : undefined
        }));
    },

    async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: task.userId || user.id, // Assign to self if not specified, or allow setting assignee
                lead_id: task.leadId,
                customer_id: task.customerId,
                title: task.title,
                description: task.description,
                due_date: task.dueDate,
                status: task.status,
                priority: task.priority,
                type: task.type
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...task,
            id: data.id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            userId: data.user_id
        } as Task;
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.userId) dbUpdates.user_id = updates.userId;

        const { error } = await supabase
            .from('tasks')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- End Tasks ---

    async getDelegatedUserIds(): Promise<string[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Find users who have appointed ME as substitute AND date is valid
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('substitute_user_id', user.id)
            .gt('substitute_until', new Date().toISOString());

        if (error) {
            console.error("Error fetching delegations:", error);
            return [];
        }

        return data.map(row => row.id);
    },

    // --- Installer Management ---
    async getInstallerManagementStats(): Promise<{
        installer: User;
        totalAssignments: number;
        completedInstallations: number;
        inProgressInstallations: number;
        nextScheduledInstallation?: Installation;
    }[]> {
        // Get all installers
        const installers = await this.getInstallers();

        // Get all installations
        const allInstallations = await this.getInstallations();

        // Get all assignments
        const { data: allAssignments, error: assignError } = await supabase
            .from('installation_assignments')
            .select('*');

        if (assignError) throw assignError;

        // Build stats for each installer
        const stats = await Promise.all(installers.map(async (installer) => {
            // Get assignments for this installer
            const assignments = (allAssignments || []).filter((a: { user_id: string }) => a.user_id === installer.id);
            const assignedInstallationIds = assignments.map((a: { installation_id: string }) => a.installation_id);

            // Filter installations for this installer
            const installerInstallations = allInstallations.filter(inst =>
                assignedInstallationIds.includes(inst.id)
            );

            const completedCount = installerInstallations.filter(i => i.status === 'completed').length;
            const inProgressCount = installerInstallations.filter(i =>
                i.status === 'scheduled' || i.status === 'pending'
            ).length;

            // Find next scheduled installation
            const upcomingInstallations = installerInstallations
                .filter(i => i.scheduledDate && i.status !== 'completed')
                .sort((a, b) => {
                    const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
                    const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
                    return dateA - dateB;
                });

            return {
                installer,
                totalAssignments: assignments.length,
                completedInstallations: completedCount,
                inProgressInstallations: inProgressCount,
                nextScheduledInstallation: upcomingInstallations[0]
            };
        }));

        return stats;
    },

    // Find contract by offer ID
    async findContractByOfferId(offerId: string): Promise<Contract | null> {
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('offer_id', offerId)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            offerId: data.offer_id,
            contractNumber: data.contract_data.contractNumber,
            status: data.status as Contract['status'],
            client: data.contract_data.client,
            product: data.contract_data.product,
            pricing: data.contract_data.pricing,
            commission: data.contract_data.commission,
            requirements: data.contract_data.requirements,
            orderedItems: data.contract_data.orderedItems || [],
            comments: data.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: data.contract_data.attachments || [],
            createdAt: new Date(data.created_at),
            signedAt: data.signed_at ? new Date(data.signed_at) : undefined
        };
    },

    // Add protocol PDF to contract attachments
    async addProtocolToContract(contractId: string, protocolBlob: Blob, installationId: string): Promise<void> {
        // Convert Blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(protocolBlob);
        });

        const base64Data = await base64Promise;

        // Fetch current contract
        const { data: currentData, error: fetchError } = await supabase
            .from('contracts')
            .select('contract_data')
            .eq('id', contractId)
            .single();

        if (fetchError) throw fetchError;

        const contractData = currentData?.contract_data || {};
        const existingAttachments = contractData.attachments || [];

        // Create new attachment
        const newAttachment = {
            id: crypto.randomUUID(),
            name: `Protokół Montażowy ${installationId.substring(0, 8)}.pdf`,
            url: base64Data,
            type: 'document' as const,
            createdAt: new Date()
        };

        // Update contract with new attachment
        const updatedContractData = {
            ...contractData,
            attachments: [...existingAttachments, newAttachment]
        };

        const { error: updateError } = await supabase
            .from('contracts')
            .update({ contract_data: updatedContractData })
            .eq('id', contractId);

        if (updateError) throw updateError;
    },

    // --- Team Management ---

    async createTeam(name: string, color: string, memberIds: string[]): Promise<void> {
        // 1. Create team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({ name, color })
            .select()
            .single();

        if (teamError) throw teamError;

        // 2. Add members
        if (memberIds.length > 0) {
            const membersData = memberIds.map(userId => ({
                team_id: team.id,
                user_id: userId
            }));

            const { error: membersError } = await supabase
                .from('team_members')
                .insert(membersData);

            if (membersError) throw membersError;
        }
    },

    async getTeams(): Promise<import('../types').InstallationTeam[]> {
        // Fetch teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });

        if (teamsError) throw teamsError;

        // Fetch members for all teams
        const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select(`
team_id,
    user_id,
    profiles: user_id(
        id,
        full_name
    )
            `);

        if (membersError) throw membersError;

        // Map members to teams
        return teams.map(team => {
            const teamMembers = (members || [])
                .filter((m: any) => m.team_id === team.id)
                .map((m: any) => {
                    // The Supabase query returns profiles as an array, we need to handle this
                    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    const fullName = profile?.full_name || 'Unknown User';
                    const [firstName, ...rest] = fullName.split(' ');
                    const lastName = rest.join(' ');

                    return {
                        id: m.user_id,
                        firstName: firstName || '',
                        lastName: lastName || ''
                    };
                });

            return {
                id: team.id,
                name: team.name,
                color: team.color,
                members: teamMembers
            };
        });
    },

    async updateTeam(id: string, name: string, color: string, memberIds: string[]): Promise<void> {
        // 1. Update team details
        const { error: teamError } = await supabase
            .from('teams')
            .update({ name, color })
            .eq('id', id);

        if (teamError) throw teamError;

        // 2. Update members (delete all and re-insert)
        // Transaction would be better but simple approach for now
        const { error: deleteError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', id);

        if (deleteError) throw deleteError;

        if (memberIds.length > 0) {
            const membersData = memberIds.map(userId => ({
                team_id: id,
                user_id: userId
            }));

            const { error: insertError } = await supabase
                .from('team_members')
                .insert(membersData);

            if (insertError) throw insertError;
        }
    },

    async deleteTeam(id: string): Promise<void> {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async assignTeamToInstallation(installationId: string, teamId: string): Promise<void> {
        // 1. Update installation with team_id
        const { error: updateError } = await supabase
            .from('installations')
            .update({ team_id: teamId })
            .eq('id', installationId);

        if (updateError) throw updateError;

        // 2. Get team members
        const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId);

        if (membersError) throw membersError;

        // 3. Sync installation_assignments
        // First, remove existing assignments for this installation
        const { error: deleteError } = await supabase
            .from('installation_assignments')
            .delete()
            .eq('installation_id', installationId);

        if (deleteError) throw deleteError;

        // Then add new assignments for all team members
        if (members && members.length > 0) {
            const assignments = members.map((m: { user_id: string }) => ({
                installation_id: installationId,
                user_id: m.user_id
            }))

                ;

            const { error: insertError } = await supabase
                .from('installation_assignments')
                .insert(assignments);

            if (insertError) throw insertError;
        }
    },

    // --- Bulk Installation Management ---

    // Get signed contracts that don't have an installation yet
    async getUnassignedContracts(): Promise<Contract[]> {
        // Get all signed contracts
        const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*')
            .eq('status', 'signed')
            .order('created_at', { ascending: false });

        if (contractsError) throw contractsError;

        // Get all installations to check which contracts already have them
        const { data: installations, error: installError } = await supabase
            .from('installations')
            .select('offer_id');

        if (installError) throw installError;

        const installationOfferIds = new Set((installations || []).map(i => i.offer_id));

        // Filter contracts that don't have installations
        const unassignedContracts = (contracts || []).filter(
            row => !installationOfferIds.has(row.offer_id)
        );

        return unassignedContracts.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            status: row.status as Contract['status'],
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: row.contract_data.pricing,
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            orderedItems: row.contract_data.orderedItems || [],
            comments: row.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined
        }));
    },

    // Check if installation exists for contract
    async checkInstallationForContract(offerId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('installations')
            .select('id')
            .eq('offer_id', offerId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return !!data;
    },

    // Bulk create installations from contracts
    async bulkCreateInstallations(contractIds: string[]): Promise<Installation[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch contracts
        const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*')
            .in('id', contractIds);

        if (contractsError) throw contractsError;
        if (!contracts || contracts.length === 0) return [];

        const createdInstallations: Installation[] = [];

        for (const contractRow of contracts) {
            const contract = contractRow as { id: string; offer_id: string; contract_data: { client: Customer; product: { modelId: string; width: number; projection: number } } };

            // Check if installation already exists
            const exists = await DatabaseService.checkInstallationForContract(contract.offer_id);
            if (exists) {
                console.warn(`Installation already exists for offer ${contract.offer_id}, skipping`);
                continue;
            }

            const contractData = contract.contract_data;
            const client = contractData.client;

            const installationData = {
                client: {
                    firstName: client.firstName || '',
                    lastName: client.lastName || '',
                    city: client.city || '',
                    address: `${client.street || ''} ${client.houseNumber || ''} `.trim(),
                    phone: client.phone || '',
                    coordinates: undefined // Will be geocoded later if needed
                },
                productSummary: `${contractData.product.modelId} ${contractData.product.width}x${contractData.product.projection} mm`
            };

            const { data: newInstallation, error: insertError } = await supabase
                .from('installations')
                .insert({
                    offer_id: contract.offer_id,
                    user_id: user.id,
                    status: 'pending',
                    installation_data: installationData
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating installation for contract ${contract.id}: `, JSON.stringify(insertError, null, 2));
                // Also attempt to log message if available
                if ('message' in insertError) {
                    console.error('Error details:', (insertError as any).message);
                }
                continue;
            }

            createdInstallations.push({
                id: newInstallation.id,
                offerId: contract.offer_id,
                client: installationData.client,
                productSummary: installationData.productSummary,
                status: 'pending' as Installation['status'],
                scheduledDate: undefined,
                teamId: undefined,
                notes: '',
                createdAt: new Date(newInstallation.created_at)
            });
        }

        return createdInstallations;
    },

    // ==================== Measurement Management ====================

    async getMeasurements(): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
    *
    `)
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((m: any) => ({
            id: m.id,
            offerId: m.offer_id,
            scheduledDate: new Date(m.scheduled_date),
            salesRepId: m.sales_rep_id,
            salesRepName: '', // Can be populated if we join profiles
            customerName: m.customer_name,
            customerAddress: m.customer_address,
            customerPhone: m.customer_phone,
            status: m.status,
            notes: m.notes,
            createdAt: new Date(m.created_at),
            updatedAt: new Date(m.updated_at),
            estimatedDuration: m.estimated_duration,
            orderInRoute: m.order_in_route,
            locationLat: m.location_lat,
            locationLng: m.location_lng,
            distanceFromPrevious: m.distance_from_previous
        }));
    },

    async createMeasurementReport(report: Omit<MeasurementReport, 'id' | 'createdAt'>): Promise<MeasurementReport> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('measurement_reports')
            .insert({
                user_id: user.id,
                date: report.date,
                car_plate: report.carPlate,
                odometer_start: report.odometerStart,
                odometer_end: report.odometerEnd,
                total_km: report.totalKm,
                with_driver: report.withDriver,
                car_issues: report.carIssues,
                report_description: report.reportDescription,
                measurements_snapshot: report.visits // JSONB
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            date: data.date,
            salesRepId: data.user_id,
            carPlate: data.car_plate,
            odometerStart: data.odometer_start,
            odometerEnd: data.odometer_end,
            totalKm: data.total_km,
            withDriver: data.with_driver,
            carIssues: data.car_issues,
            reportDescription: data.report_description,
            visits: data.measurements_snapshot,
            signedContractsCount: 0,
            offerIds: [],
            createdAt: new Date(data.created_at)
        };
    },

    async getMeasurementReports(filters?: { userId?: string; dateFrom?: string; dateTo?: string }): Promise<MeasurementReport[]> {
        let query = supabase
            .from('measurement_reports')
            .select('*')
            .order('date', { ascending: false });

        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters?.dateFrom) {
            query = query.gte('date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('date', filters.dateTo);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            date: row.date,
            salesRepId: row.user_id,
            carPlate: row.car_plate,
            odometerStart: row.odometer_start,
            odometerEnd: row.odometer_end,
            totalKm: row.total_km,
            withDriver: row.with_driver,
            carIssues: row.car_issues,
            reportDescription: row.report_description,
            visits: row.measurements_snapshot || [],
            signedContractsCount: (row.measurements_snapshot || []).filter((v: any) => v.outcome === 'signed').length,
            offerIds: [],
            createdAt: new Date(row.created_at)
        }));
    },

    async getMeasurementsBySalesRep(userId: string): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
    *,
    sales_rep: profiles!sales_rep_id(full_name)
        `)
            .eq('sales_rep_id', userId)
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((m: any) => ({
            id: m.id,
            offerId: m.offer_id,
            scheduledDate: new Date(m.scheduled_date),
            salesRepId: m.sales_rep_id,
            salesRepName: m.sales_rep?.full_name || '',
            customerName: m.customer_name,
            customerAddress: m.customer_address,
            customerPhone: m.customer_phone,
            status: m.status,
            notes: m.notes,
            createdAt: new Date(m.created_at),
            updatedAt: new Date(m.updated_at),
            estimatedDuration: m.estimated_duration,
            orderInRoute: m.order_in_route,
            locationLat: m.location_lat,
            locationLng: m.location_lng,
            distanceFromPrevious: m.distance_from_previous
        }));
    },

    async createMeasurement(measurement: {
        offerId?: string;
        scheduledDate: Date;
        salesRepId: string;
        customerName: string;
        customerAddress: string;
        customerPhone?: string;
        notes?: string;
        estimatedDuration?: number;
        locationLat?: number;
        locationLng?: number;
    }): Promise<Measurement> {
        const { data, error } = await supabase
            .from('measurements')
            .insert({
                offer_id: measurement.offerId,
                scheduled_date: measurement.scheduledDate.toISOString(),
                sales_rep_id: measurement.salesRepId,
                customer_name: measurement.customerName,
                customer_address: measurement.customerAddress,
                customer_phone: measurement.customerPhone,
                status: 'scheduled',
                notes: measurement.notes,
                estimated_duration: measurement.estimatedDuration,
                location_lat: measurement.locationLat,
                location_lng: measurement.locationLng
            })
            .select(`
        *,
        sales_rep: profiles!sales_rep_id(full_name)
            `)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerId: data.offer_id,
            scheduledDate: new Date(data.scheduled_date),
            salesRepId: data.sales_rep_id,
            salesRepName: data.sales_rep?.full_name || '',
            customerName: data.customer_name,
            customerAddress: data.customer_address,
            customerPhone: data.customer_phone,
            status: data.status,
            notes: data.notes,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    },

    async updateMeasurement(id: string, updates: {
        scheduledDate?: Date;
        customerName?: string;
        customerAddress?: string;
        customerPhone?: string;
        status?: 'scheduled' | 'completed' | 'cancelled';
        notes?: string;
        estimatedDuration?: number;
        orderInRoute?: number;
        locationLat?: number;
        locationLng?: number;
        distanceFromPrevious?: number;
    }): Promise<Measurement> {
        const updateData: any = {};
        if (updates.scheduledDate) updateData.scheduled_date = updates.scheduledDate.toISOString();
        if (updates.customerName) updateData.customer_name = updates.customerName;
        if (updates.customerAddress) updateData.customer_address = updates.customerAddress;
        if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone;
        if (updates.status) updateData.status = updates.status;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.estimatedDuration !== undefined) updateData.estimated_duration = updates.estimatedDuration;
        if (updates.orderInRoute !== undefined) updateData.order_in_route = updates.orderInRoute;
        if (updates.locationLat !== undefined) updateData.location_lat = updates.locationLat;
        if (updates.locationLng !== undefined) updateData.location_lng = updates.locationLng;
        if (updates.distanceFromPrevious !== undefined) updateData.distance_from_previous = updates.distanceFromPrevious;

        const { data, error } = await supabase
            .from('measurements')
            .update(updateData)
            .eq('id', id)
            .select(`
            *,
            sales_rep: profiles!sales_rep_id(full_name)
                `)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerId: data.offer_id,
            scheduledDate: new Date(data.scheduled_date),
            salesRepId: data.sales_rep_id,
            salesRepName: data.sales_rep?.full_name || '',
            customerName: data.customer_name,
            customerAddress: data.customer_address,
            customerPhone: data.customer_phone,
            status: data.status,
            notes: data.notes,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    },

    async deleteMeasurement(id: string): Promise<void> {
        const { error } = await supabase
            .from('measurements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Virtual Wallet ---

    async getWalletTransactions(filters?: { type?: 'income' | 'expense'; startDate?: Date; endDate?: Date }): Promise<WalletTransaction[]> {
        let query = supabase
            .from('wallet_transactions')
            .select('*')
            .order('date', { ascending: false });

        if (filters?.type) {
            query = query.eq('type', filters.type);
        }

        if (filters?.startDate) {
            query = query.gte('date', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('date', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            currency: row.currency || 'EUR',
            category: row.category,
            description: row.description,
            date: row.date,
            customerId: row.customer_id,
            customerName: row.customer_name,
            contractNumber: row.contract_number,
            processedBy: row.processed_by,
            createdAt: new Date(row.created_at)
        }));
    },

    async createWalletTransaction(transaction: Omit<WalletTransaction, 'id' | 'createdAt' | 'processedBy'>): Promise<WalletTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('wallet_transactions')
            .insert({
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                customer_id: transaction.customerId,
                customer_name: transaction.customerName,
                contract_number: transaction.contractNumber,
                processed_by: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            type: data.type,
            amount: Number(data.amount),
            currency: data.currency || 'EUR',
            category: data.category,
            description: data.description,
            date: data.date,
            customerId: data.customer_id,
            customerName: data.customer_name,
            contractNumber: data.contract_number,
            processedBy: data.processed_by,
            createdAt: new Date(data.created_at)
        };
    },

    async getWalletStats(): Promise<WalletStats> {
        const { data: transactions, error } = await supabase
            .from('wallet_transactions')
            .select('*');

        if (error) throw error;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const initialStats = {
            currentBalance: 0,
            totalIncome: 0,
            totalExpense: 0,
            monthlyIncome: 0,
            monthlyExpense: 0
        };

        const stats = {
            pln: { ...initialStats },
            eur: { ...initialStats }
        };

        transactions?.forEach(tx => {
            const amount = Number(tx.amount);
            const date = new Date(tx.date);
            const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            const currency = tx.currency as 'PLN' | 'EUR' || 'EUR'; // Default to EUR if missing

            const targetStats = currency === 'PLN' ? stats.pln : stats.eur;

            if (tx.type === 'income') {
                targetStats.totalIncome += amount;
                if (isCurrentMonth) {
                    targetStats.monthlyIncome += amount;
                }
            } else {
                targetStats.totalExpense += amount;
                if (isCurrentMonth) {
                    targetStats.monthlyExpense += amount;
                }
            }
        });

        stats.pln.currentBalance = stats.pln.totalIncome - stats.pln.totalExpense;
        stats.eur.currentBalance = stats.eur.totalIncome - stats.eur.totalExpense;

        return stats;
    },

    async exchangeWalletTransaction(transactionId: string, exchangeRate: number): Promise<WalletTransaction> {
        // First get the current transaction
        const { data: currentTx, error: fetchError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!currentTx) throw new Error('Transaction not found');
        if (currentTx.currency !== 'EUR') throw new Error('Can only exchange EUR transactions');

        const originalAmount = Number(currentTx.amount);
        const convertedAmount = originalAmount * exchangeRate;

        // Update the transaction with new currency and exchange info
        const { data, error } = await supabase
            .from('wallet_transactions')
            .update({
                currency: 'PLN',
                amount: convertedAmount,
                exchange_rate: exchangeRate,
                original_currency: 'EUR',
                original_amount: originalAmount
            })
            .eq('id', transactionId)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            type: data.type,
            amount: Number(data.amount),
            currency: data.currency,
            category: data.category,
            description: data.description,
            date: data.date,
            customerId: data.customer_id,
            customerName: data.customer_name,
            contractNumber: data.contract_number,
            processedBy: data.processed_by,
            createdAt: new Date(data.created_at),
            exchangeRate: data.exchange_rate,
            originalCurrency: data.original_currency,
            originalAmount: data.original_amount ? Number(data.original_amount) : undefined
        };
    },

    async deleteWalletTransaction(transactionId: string, reason: string): Promise<void> {
        // First, get the transaction to delete
        const { data: transaction, error: fetchError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!transaction) throw new Error('Transaction not found');

        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Insert into deleted_wallet_transactions
        const { error: insertError } = await supabase
            .from('deleted_wallet_transactions')
            .insert({
                original_transaction_id: transaction.id,
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                customer_id: transaction.customer_id,
                customer_name: transaction.customer_name,
                contract_number: transaction.contract_number,
                exchange_rate: transaction.exchange_rate,
                original_currency: transaction.original_currency,
                original_amount: transaction.original_amount,
                deletion_reason: reason,
                deleted_by: user.id,
                processed_by: transaction.processed_by,
                created_at: transaction.created_at
            });

        if (insertError) throw insertError;

        // Delete from wallet_transactions
        const { error: deleteError } = await supabase
            .from('wallet_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    async getDeletedWalletTransactions(): Promise<any[]> {
        const { data, error } = await supabase
            .from('deleted_wallet_transactions')
            .select(`
                *,
                deleted_by_profile: profiles!deleted_by(full_name),
                    processed_by_profile: profiles!processed_by(full_name)
                `)
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        return data?.map(tx => ({
            id: tx.id,
            originalTransactionId: tx.original_transaction_id,
            type: tx.type,
            amount: Number(tx.amount),
            currency: tx.currency,
            category: tx.category,
            description: tx.description,
            date: tx.date,
            customerId: tx.customer_id,
            customerName: tx.customer_name,
            contractNumber: tx.contract_number,
            exchangeRate: tx.exchange_rate,
            originalCurrency: tx.original_currency,
            originalAmount: tx.original_amount ? Number(tx.original_amount) : undefined,
            processedBy: tx.processed_by,
            createdAt: new Date(tx.created_at),
            deletionReason: tx.deletion_reason,
            deletedBy: tx.deleted_by,
            deletedAt: new Date(tx.deleted_at),
            deletedByName: tx.deleted_by_profile?.full_name,
            processedByName: tx.processed_by_profile?.full_name
        })) || [];
    },

    // --- Order Requests ---
    async createOrderRequest(request: Omit<OrderRequest, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<{ error: any }> {
        const { error } = await supabase
            .from('order_requests')
            .insert({
                user_id: request.userId,
                item_name: request.itemName,
                quantity: request.quantity,
                description: request.description,
                status: request.status
            });
        return { error };
    },

    async getOrderRequests(userId?: string): Promise<OrderRequest[]> {
        let query = supabase
            .from('order_requests')
            .select('*, user:profiles(full_name)')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            itemName: row.item_name,
            quantity: row.quantity,
            description: row.description,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            user: row.user ? {
                firstName: row.user.full_name?.split(' ')[0] || '',
                lastName: row.user.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async updateOrderRequestStatus(id: string, status: OrderRequestStatus): Promise<{ error: any }> {
        const { error } = await supabase
            .from('order_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        return { error };
    },

    // --- Fuel Logs ---
    async createFuelLog(log: Omit<FuelLog, 'id' | 'createdAt' | 'user'>): Promise<{ error: any }> {
        const { error } = await supabase
            .from('fuel_logs')
            .insert({
                user_id: log.userId,
                vehicle_plate: log.vehiclePlate,
                odometer_reading: log.odometerReading,
                odometer_photo_url: log.odometerPhotoUrl,
                receipt_photo_url: log.receiptPhotoUrl,
                liters: log.liters,
                cost: log.cost,
                currency: log.currency,
                log_date: log.logDate,
                type: log.type
            });
        return { error };
    },

    async getFuelLogs(userId?: string): Promise<FuelLog[]> {
        let query = supabase
            .from('fuel_logs')
            .select('*, user:profiles(full_name)')
            .order('log_date', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            vehiclePlate: row.vehicle_plate,
            odometerReading: row.odometer_reading,
            odometerPhotoUrl: row.odometer_photo_url,
            receiptPhotoUrl: row.receipt_photo_url,
            liters: row.liters,
            cost: row.cost,
            currency: row.currency,
            logDate: row.log_date,
            type: row.type,
            createdAt: new Date(row.created_at),
            user: row.user ? {
                firstName: row.user.full_name?.split(' ')[0] || '',
                lastName: row.user.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async updateInstallationAcceptance(
        installationId: string,
        acceptance: {
            acceptedAt: string;
            clientName: string;
            signature?: string;
            notes?: string;
        }
    ): Promise<{ error: any }> {
        const { error } = await supabase
            .from('installations')
            .update({
                acceptance: acceptance,
                status: 'completed'
            })
            .eq('id', installationId);

        return { error };
    },

    // --- Failure Reports ---
    async createFailureReport(
        report: Omit<FailureReport, 'id' | 'createdAt' | 'updatedAt' | 'user'>,
        photoFile?: File
    ): Promise<{ error: any }> {
        try {
            let photoUrl: string | undefined;

            // Upload photo if provided
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt} `;
                const filePath = `${report.userId} / ${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('failure-reports')
                    .upload(filePath, photoFile);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('failure-reports')
                    .getPublicUrl(filePath);

                photoUrl = urlData.publicUrl;
            }

            // Insert failure report
            const { error } = await supabase
                .from('failure_reports')
                .insert({
                    user_id: report.userId,
                    equipment_name: report.equipmentName,
                    description: report.description,
                    photo_url: photoUrl,
                    status: report.status || 'pending'
                });

            return { error };
        } catch (error) {
            return { error };
        }
    },

    async getFailureReports(userId?: string): Promise<FailureReport[]> {
        let query = supabase
            .from('failure_reports')
            .select('*, user:profiles(full_name)')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            equipmentName: row.equipment_name,
            description: row.description,
            photoUrl: row.photo_url,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            user: row.user ? {
                firstName: row.user.full_name?.split(' ')[0] || '',
                lastName: row.user.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async updateFailureReportStatus(id: string, status: FailureReportStatus): Promise<{ error: any }> {
        const { error } = await supabase
            .from('failure_reports')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        return { error };
    },

    async getLead(id: string): Promise<Lead | null> {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching lead:', error);
            return null;
        }

        // Map the response to our Lead type
        return {
            ...data,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            lastContactDate: data.last_contact_date ? new Date(data.last_contact_date) : undefined,
            clientWillContactAt: data.client_will_contact_at ? new Date(data.client_will_contact_at) : undefined,
            customerData: data.customer_data,
            salesRep: undefined // drivers/profiles join removed due to missing relation
        } as Lead;
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

        return data.map((lead: any) => ({
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

        return (data || []).map((lead: any) => ({
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
        }));
    },

    // --- Communications ---

    async getLeadCommunications(leadId: string): Promise<Communication[]> {
        const { data, error } = await supabase
            .from('customer_communications')
            .select(`
                *,
                user:profiles(first_name, last_name)
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching lead communications:', error);
            return [];
        }

        return data.map((row: any) => ({
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
    },

    async getCommunications(customerId: string): Promise<Communication[]> {
        const { data, error } = await supabase
            .from('customer_communications')
            .select(`
                *,
                user:profiles(first_name, last_name)
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching communications:', JSON.stringify(error, null, 2));
            return [];
        }

        return data.map((row: any) => ({
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
    },

    // Get offers for a specific lead
    async getLeadOffers(leadId: string): Promise<Offer[]> {
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError) throw leadError;

        let query = supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (lead.customerData?.email) {
            query = query.or(`lead_id.eq.${leadId},customer_data->>email.eq.${lead.customerData.email}`);
        } else {
            query = query.eq('lead_id', leadId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map((row: any) => ({
            id: row.id,
            offerNumber: row.offer_number,
            status: row.status as Offer['status'],
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            validUntil: new Date(row.valid_until),
            leadId: row.lead_id,
            createdBy: row.user_id, // Was row.created_by, check getOffers uses user_id

            // Map JSON columns to Offer properties using correct DB column names
            customer: row.customer_data,
            product: row.product_config, // Was product_data
            pricing: normalizePricing(row.pricing), // Was pricing_data
            settings: row.settings_data || {},
            commission: row.commission || 0,
            snowZone: row.snow_zone, // Added

            // Handle optional fields
            notes: row.notes,
            viewCount: row.view_count || 0
        })) as Offer[];
    },

    async uploadFile(file: File, bucket: string = 'attachments', path?: string): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = path ? `${path}/${fileName}` : fileName;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    },

    async addCommunication(comm: Omit<Communication, 'id' | 'createdAt' | 'user' | 'userId'>): Promise<Communication> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('customer_communications')
            .insert({
                user_id: user.id,
                customer_id: comm.customerId,
                lead_id: comm.leadId,
                type: comm.type,
                direction: comm.direction,
                subject: comm.subject,
                content: comm.content,
                date: comm.date,
                external_id: comm.externalId,
                metadata: comm.metadata || {}
            })
            .select('*, user:user_id(first_name, last_name)')
            .single();

        if (error) throw error;

        return {
            id: data.id,
            userId: data.user_id,
            customerId: data.customer_id,
            leadId: data.lead_id,
            type: data.type,
            direction: data.direction,
            subject: data.subject,
            content: data.content,
            date: data.date,
            externalId: data.external_id,
            metadata: data.metadata,
            createdAt: new Date(data.created_at),
            user: data.user ? {

                firstName: data.user.first_name,
                lastName: data.user.last_name
            } : undefined
        };
    },

    async calculateOrderCosts(offerId: string, manualOrderCosts?: number): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Get all reports that include this offer
        const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('*');

        if (reportsError) throw reportsError;

        // Filter reports that contain the offerId
        const linkedReports = reports.filter((r: any) => {
            const ids = r.data.offerIds || [];
            return Array.isArray(ids) && ids.includes(offerId);
        });

        // 2. Calculate Measurement Cost (Mileage)
        const MILEAGE_RATE = 0.50; // EUR per km
        let totalMeasurementCost = 0;

        linkedReports.forEach((r: any) => {
            const totalKm = r.data.totalKm || 0;
            const visitsCount = (r.data.visits || []).length || 1;

            // Split transport cost equally among all visits in that report
            const costPerVisit = (totalKm * MILEAGE_RATE) / visitsCount;
            totalMeasurementCost += costPerVisit;
        });

        // 3. Update Offer Pricing
        const { data: offerData, error: fetchError } = await supabase
            .from('offers')
            .select('pricing')
            .eq('id', offerId)
            .single();

        if (fetchError) throw fetchError;

        const currentPricing = offerData.pricing || {};
        const newPricing = {
            ...currentPricing,
            measurementCost: totalMeasurementCost,
            orderCosts: manualOrderCosts !== undefined ? manualOrderCosts : currentPricing.orderCosts
        };

        const { error: updateError } = await supabase
            .from('offers')
            .update({ pricing: newPricing })
            .eq('id', offerId);


        if (updateError) throw updateError;
    },



    // --- Notifications ---

    async getNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            message: row.message,
            link: row.link,
            isRead: row.is_read,
            createdAt: new Date(row.created_at),
            metadata: row.metadata
        }));
    },

    async getUnreadNotificationsCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    },

    async markNotificationAsRead(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
    },

    async markAllNotificationsAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    },

    async addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                link: notification.link,
                metadata: notification.metadata,
                is_read: false
            });

        if (error) throw error;
    },

};
