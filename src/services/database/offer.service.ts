import { supabase } from '../../lib/supabase';
import { normalizePricing } from './base.service';
import type { Offer } from '../../types';
import { CustomerService } from './customer.service';
import { TaskService } from './task.service';

import { UserService } from './user.service';

export const OfferService = {
    // ... (rest of file)
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
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
            leadId: row.lead_id,
            viewCount: row.view_count,
            lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : undefined
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
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
            leadId: row.lead_id
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
                    companyName: freshCustomer.company_name,
                    street: freshCustomer.street,
                    houseNumber: freshCustomer.house_number,
                    postalCode: freshCustomer.postal_code,
                    city: freshCustomer.city,
                    phone: freshCustomer.phone,
                    email: freshCustomer.email,
                    country: freshCustomer.country
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
            leadId: data.lead_id,
            viewCount: data.view_count,
            lastViewedAt: data.last_viewed_at ? new Date(data.last_viewed_at) : undefined,
            clientWillContactAt: data.client_will_contact_at ? new Date(data.client_will_contact_at) : undefined,
            settings: data.settings_data
        };
    },

    async createOffer(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Offer> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // [GUARDRAILS] Check Margin for Sales Reps
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, commission_rate')
            .eq('id', user.id)
            .single();

        if (profile?.role === 'sales_rep') {
            const margin = offer.pricing.marginPercentage;
            if (margin < 30) {
                throw new Error('MarginGuard: Nie można utworzyć oferty z marżą poniżej 30% (Polityka firmy).');
            }
        }

        // [AUTOMATION] Calculate Commission for Sales Reps
        let calculatedCommission = offer.commission;
        if (profile?.commission_rate) {
            const rate = Number(profile.commission_rate);
            if (rate > 0) {
                // Commission = Net Price * Rate (e.g. 0.05)
                const netPrice = offer.pricing.sellingPriceNet || (offer.pricing.totalCost / 1.23);
                calculatedCommission = Math.round(netPrice * rate * 100) / 100;
            }
        }

        // Ensure customer exists in customers table
        // If customer already has an ID, verify it exists; otherwise find/create
        let customerId = offer.customer.id;

        if (customerId) {
            // Verify the customer exists
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('id', customerId)
                .single();

            if (!existingCustomer) {
                // Customer ID was invalid, need to find or create
                const customer = await CustomerService.ensureCustomer(offer.customer);
                customerId = customer.id;
            }
        } else {
            // No customer ID provided, find or create
            const customer = await CustomerService.ensureCustomer(offer.customer);
            customerId = customer.id;
        }

        const { data, error } = await supabase
            .from('offers')
            .insert({
                user_id: user.id,
                offer_number: offer.offerNumber || `OFF / ${Date.now()} `,
                customer_data: { ...offer.customer, id: customerId }, // Ensure ID is saved in JSON
                customer_id: customerId,
                lead_id: offer.leadId,
                product_config: offer.product,
                pricing: offer.pricing,
                status: offer.status,
                snow_zone: offer.snowZone,
                commission: calculatedCommission,
                margin_percentage: offer.pricing.marginPercentage
            })
            .select()
            .single();

        if (error) throw error;

        // If created from a Lead, update the Lead with customer_id if it was missing
        if (offer.leadId && customerId) {
            supabase.from('leads').update({ customer_id: customerId, status: 'offer_sent' }).eq('id', offer.leadId).then(({ error }) => {
                if (error) console.error('Error linking lead to customer:', error);
            });
        }

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: { ...data.customer_data, id: customerId },
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

    async createLegacyOffer(customerId: string, price: number, date: Date): Promise<Offer> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (!customer) throw new Error('Customer not found');

        const simplifiedProduct: any = {
            modelId: 'legacy',
            description: 'Import Historyczny',
            width: 0,
            projection: 0,
            roofType: 'glass',
            installationType: 'wall-mounted',
            color: 'standard'
        };

        const simplifiedPricing: any = {
            totalCost: price,
            sellingPriceNet: (price / 1.19), // Approximate net
            sellingPriceGross: price,
            marginPercentage: 30, // Default stub
            marginValue: 0,
            basePrice: 0,
            addonsPrice: 0
        };

        const { data, error } = await supabase
            .from('offers')
            .insert({
                user_id: user.id,
                offer_number: `LEGACY-${Date.now()}`,
                customer_data: { ...customer, id: customerId },
                customer_id: customerId,
                product_config: simplifiedProduct,
                pricing: simplifiedPricing,
                status: 'sold', // Immediately sold
                snow_zone: { id: '1', value: 0.85, description: '' },
                commission: 0,
                margin_percentage: 30,
                created_at: date.toISOString(),
                updated_at: date.toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: { ...data.customer_data, id: customerId },
            product: data.product_config,
            pricing: normalizePricing(data.pricing),
            status: data.status,
            snowZone: data.snow_zone,
            commission: data.commission,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.user_id
        } as Offer;
    },

    async updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
        // [GUARDRAILS] Check Margin for Sales Reps
        if (updates.pricing) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, commission_rate')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'sales_rep') {
                    const margin = updates.pricing.marginPercentage;
                    // Note: If updates.pricing is partial, we might miss marginPercentage.
                    // But usually pricing is replaced as a whole object.
                    // Let's assume updates.pricing is the FULL pricing object if present.
                    if (typeof margin === 'number' && margin < 30) {
                        throw new Error('MarginGuard: Nie można zaktualizować oferty z marżą poniżej 30% (Polityka firmy).');
                    }

                    // [AUTOMATION] Recalculate Commission on Pricing Change
                    if (profile.commission_rate) {
                        const rate = Number(profile.commission_rate);
                        if (rate > 0) {
                            const netPrice = updates.pricing.sellingPriceNet || (updates.pricing.totalCost / 1.23);
                            updates.commission = Math.round(netPrice * rate * 100) / 100;
                        }
                    }
                }
            }
        }

        // Convert to DB format
        const dbUpdates: {
            status?: Offer['status'];
            customer_data?: Offer['customer'];
            product_config?: Offer['product'];
            pricing?: Offer['pricing'];
            snow_zone?: Offer['snowZone'];
            commission?: number;
            lead_id?: string;
            client_will_contact_at?: string;
            settings_data?: Offer['settings'];
            notes?: string;
            view_count?: number;
            updated_at: string;
        } = {
            updated_at: new Date().toISOString()
        };

        if (updates.status) dbUpdates.status = updates.status;
        if (updates.customer) dbUpdates.customer_data = updates.customer;
        if (updates.product) dbUpdates.product_config = updates.product;
        if (updates.pricing) dbUpdates.pricing = updates.pricing;
        if (updates.snowZone) dbUpdates.snow_zone = updates.snowZone;
        if (updates.commission) dbUpdates.commission = updates.commission;
        if (updates.leadId) dbUpdates.lead_id = updates.leadId;
        if (updates.clientWillContactAt) dbUpdates.client_will_contact_at = updates.clientWillContactAt.toISOString();
        if (updates.settings) dbUpdates.settings_data = updates.settings;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.viewCount !== undefined) dbUpdates.view_count = updates.viewCount;

        const { error } = await supabase
            .from('offers')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Automation: Sync Lead status when Offer is REJECTED
        if (updates.status === 'rejected') {
            try {
                const { data: offerData } = await supabase.from('offers').select('lead_id').eq('id', id).single();
                if (offerData?.lead_id) {
                    await supabase.from('leads').update({ status: 'lost' }).eq('id', offerData.lead_id);
                }
            } catch (syncError) {
                console.error('Workflow Automation: Failed to sync Lead status on rejection:', syncError);
            }
        }

        // Automation: Create Follow-up Task when Offer is SENT
        if (updates.status === 'sent') {
            try {
                const { data: offerData } = await supabase
                    .from('offers')
                    .select('offer_number, customer_data')
                    .eq('id', id)
                    .single();

                if (offerData) {
                    const customerData = offerData.customer_data as Offer['customer'] | undefined;
                    const customerName = customerData?.lastName || 'Klient';
                    const title = `Przypomnienie: Oferta ${offerData.offer_number} (${customerName})`;

                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7);

                    const { data: { user } } = await supabase.auth.getUser();

                    if (user) {
                        await TaskService.createTask({
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
            }
        }

        // Automation: Create Task when Client Will Contact date is set (Offer)
        if (updates.clientWillContactAt) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: offerData } = await supabase.from('offers').select('offer_number, customer_data').eq('id', id).single();
                    const customerData = offerData?.customer_data as Offer['customer'] | undefined;
                    const name = customerData?.lastName || 'Klient';

                    await TaskService.createTask({
                        userId: user.id,
                        title: `Kontakt z klientem (Oferta ${offerData?.offer_number}): ${name} `,
                        description: 'Klient prosił o kontakt (lub sam się odezwie) w tym terminie.',
                        dueDate: updates.clientWillContactAt.toISOString(),
                        status: 'pending',
                        priority: 'high',
                        type: 'call',
                        customerId: updates.customer?.id
                    });
                }
            } catch (err) {
                console.error('Failed to create automation task for offer:', err);
            }
        }

        // Automation: Create Commission Cost when Offer is Accepted/Sold
        if (updates.status === 'accepted' || updates.status === 'sold') {
            try {
                // 1. Fetch full offer details if needed to get commission
                const { data: offerData } = await supabase
                    .from('offers')
                    .select('customer_id, commission, offer_number, user_id')
                    .eq('id', id)
                    .single();

                if (offerData && offerData.commission > 0 && offerData.customer_id) {
                    // 2. Check if cost already exists to avoid duplicates
                    const { data: existingCosts } = await supabase
                        .from('customer_costs')
                        .select('id')
                        .eq('source_ref', `offer:${id}`)
                        .eq('type', 'commission');

                    if (!existingCosts || existingCosts.length === 0) {
                        // 3. Create Cost Entry
                        await CustomerService.addCustomerCost({
                            customer_id: offerData.customer_id,
                            type: 'commission',
                            amount: offerData.commission,
                            currency: 'PLN',
                            description: `Prowizja od oferty ${offerData.offer_number}`,
                            date: new Date().toISOString().split('T')[0],
                            source_ref: `offer:${id}`,
                            // created_by is handled by RLS or defaulting to auth user, but let's be explicit if service supports it? 
                            // CustomerService.addCustomerCost doesn't take created_by in param (Omit<..., 'created_at'>), 
                            // but RLS/Database defaults usually handle auth.uid().
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to auto-create commission cost:', err);
                // Don't block the update
            }
        }
    },

    async deleteOffer(id: string) {
        const { error } = await supabase.from('offers').delete().eq('id', id);
        if (error) throw error;
    },

    async getRegionStats(postalCodePrefix: string) {
        const { data, error } = await supabase
            .from('offers')
            .select('status, pricing, customer_data')
            .textSearch('customer_data', `'${postalCodePrefix}':*`)
            .limit(100);

        if (error) {
            console.error("Error fetching region stats", error);
            return { winRate: 0, avgMargin: 0, totalOffers: 0 };
        }

        if (!data || data.length === 0) return { winRate: 0, avgMargin: 0, totalOffers: 0 };

        const regionOffers = data.filter((o: { customer_data: Offer['customer'] | null }) => {
            const pc = o.customer_data?.postalCode || '';
            return pc.startsWith(postalCodePrefix);
        });

        if (regionOffers.length === 0) return { winRate: 0, avgMargin: 0, totalOffers: 0 };

        const total = regionOffers.length;
        const sold = regionOffers.filter((o: { status: string }) => o.status === 'sold').length;
        const winRate = (sold / total) * 100;

        const margins = regionOffers.map((o: { pricing: Offer['pricing'] | null }) => o.pricing?.marginPercentage || 0);
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
            leadId: row.lead_id,
            viewCount: row.view_count,
            lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : undefined,
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
        }));
    },

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

        if (lead.customer_data?.email) {
            query = query.or(`lead_id.eq.${leadId},customer_data->>email.eq.${lead.customer_data.email}`);
        } else {
            query = query.eq('lead_id', leadId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map((row: {
            id: string;
            offer_number: string;
            customer_data: Offer['customer'];
            customer_id: string;
            product_config: Offer['product'];
            pricing: Offer['pricing']; // pricing can be complex raw data
            status: string;
            snow_zone: Offer['snowZone'];
            commission: number;
            created_at: string;
            updated_at: string;
            user_id: string;
            lead_id?: string;
            client_will_contact_at?: string;
            settings_data?: Offer['settings'];
        }) => ({
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
            leadId: row.lead_id,
            viewCount: row.view_count,
            lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : undefined,
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
            settings: row.settings_data
        }));
    },

    async getPartnerOffers(): Promise<Offer[]> {
        // 1) Pobierz wszystkie oferty (bez joinów – unikamy błędu 400)
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (offersError) throw offersError;

        if (!offers || offers.length === 0) return [];

        // 2) Pobierz profile partnerów B2B
        const partners = (await UserService.getAllUsers()).filter(u => u.role === 'partner');
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

    async ensurePublicToken(offerId: string): Promise<string> {
        // 1. Check if token exists
        const { data, error } = await supabase
            .from('offers')
            .select('public_token')
            .eq('id', offerId)
            .single();

        if (error) throw error;

        if (data.public_token) return data.public_token;

        // 2. Generate if missing
        const { data: updated, error: updateError } = await supabase
            .from('offers')
            .update({ public_token: crypto.randomUUID() })
            .eq('id', offerId)
            .select('public_token')
            .single();

        if (updateError) throw updateError;
        return updated.public_token;
    },

    async getOfferByToken(token: string): Promise<Offer | null> {
        // 1. Try to use the extended RPC to get Offer + Creator Profile
        const { data: detailsData, error: detailsError } = await supabase.rpc('get_print_view_data', { token_input: token });

        if (!detailsError && detailsData) {
            const row = detailsData.offer;
            const creator = detailsData.creator;

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
                leadId: row.lead_id,
                clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
                settings: row.settings_data,
                publicToken: row.public_token,
                creator: creator // Populated from Profile
            };
        }

        // 2. Fallback: Use the basic RPC function (no creator profile)
        if (detailsError) {
            console.warn('Extended offer details RPC failed (likely migration missing), using fallback.', detailsError);
        }

        const { data, error } = await supabase.rpc('get_offer_by_token', { token_input: token });

        if (error) {
            console.error('Error fetching offer by token:', error);
            return null;
        }

        if (!data || data.length === 0) return null;
        const row = data[0]; // RPC returns setof, so array

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
            leadId: row.lead_id,
            clientWillContactAt: row.client_will_contact_at ? new Date(row.client_will_contact_at) : undefined,
            settings: row.settings_data,
            publicToken: row.public_token
        };
    },

    /**
     * Get all offers for the same customer (for multi-offer comparison on public page)
     */
    async getSiblingOffers(token: string): Promise<{ id: string; offerNumber: string; product: any; pricing: any; publicToken: string; createdAt: Date }[]> {
        const { data, error } = await supabase.rpc('get_sibling_offers', { token_input: token });
        if (error || !data) {
            console.error('Error getting sibling offers:', error);
            return [];
        }
        return data.map((row: any) => ({
            id: row.id,
            offerNumber: row.offer_number,
            product: row.product_config,
            pricing: row.pricing,
            publicToken: row.public_token,
            createdAt: new Date(row.created_at),
        }));
    },

    async markAsViewed(token: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('mark_offer_viewed', { token_input: token });
        if (error) {
            console.error('Error marking offer as viewed:', error);
            return false;
        }
        return data;
    },
    /**
     * Notify the offer owner (sales rep) about a customer action on the public offer page.
     * Creates a notification visible in the bell icon and logs the interaction.
     */
    async notifyOfferAction(
        token: string,
        actionType: 'offer_accepted' | 'measurement_requested' | 'message_sent' | 'offer_viewed',
        actionData?: Record<string, any>
    ): Promise<boolean> {
        try {
            const { data, error } = await supabase.rpc('notify_offer_action', {
                token_input: token,
                action_type: actionType,
                action_data: actionData || {}
            });
            if (error) {
                console.error('Error notifying offer action:', error);
                return false;
            }
            return !!data;
        } catch (err) {
            console.error('Error notifying offer action:', err);
            return false;
        }
    },

    /**
     * Track customer interaction with public offer page
     */
    async trackInteraction(
        offerId: string,
        eventType: 'offer_view' | 'pdf_click' | 'pdf_download' | 'measurement_request' | 'message_sent' | 'addon_inquiry' | 'contact_request' | 'offer_accept' | 'upgrade_request',
        eventData?: Record<string, any>
    ): Promise<boolean> {
        try {
            // Get lead_id and customer_id from offer
            const { data: offer } = await supabase
                .from('offers')
                .select('lead_id, customer_id')
                .eq('id', offerId)
                .single();

            const { error } = await supabase
                .from('offer_interactions')
                .insert({
                    offer_id: offerId,
                    lead_id: offer?.lead_id || null,
                    customer_id: offer?.customer_id || null,
                    event_type: eventType,
                    event_data: eventData || {},
                    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
                });

            if (error) {
                console.error('Error tracking interaction:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking interaction:', err);
            return false;
        }
    },

    /**
     * Get all interactions for an offer
     */
    async getOfferInteractions(offerId: string): Promise<{
        id: string;
        eventType: string;
        eventData: Record<string, any>;
        createdAt: Date;
    }[]> {
        const { data, error } = await supabase
            .from('offer_interactions')
            .select('*')
            .eq('offer_id', offerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting interactions:', error);
            return [];
        }

        return data.map(row => ({
            id: row.id,
            eventType: row.event_type,
            eventData: row.event_data || {},
            createdAt: new Date(row.created_at)
        }));
    },

    /**
     * Get all interactions for a lead (across all their offers)
     */
    async getLeadInteractions(leadId: string): Promise<{
        id: string;
        offerId: string;
        eventType: string;
        eventData: Record<string, any>;
        createdAt: Date;
    }[]> {
        const { data, error } = await supabase
            .from('offer_interactions')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting lead interactions:', error);
            return [];
        }

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            eventType: row.event_type,
            eventData: row.event_data || {},
            createdAt: new Date(row.created_at)
        }));
    },

    /**
     * Get all interactions for a customer (across all their offers)
     */
    async getCustomerInteractions(customerId: string): Promise<{
        id: string;
        offerId: string;
        eventType: string;
        eventData: Record<string, any>;
        createdAt: Date;
    }[]> {
        const { data, error } = await supabase
            .from('offer_interactions')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting customer interactions:', error);
            return [];
        }

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            eventType: row.event_type,
            eventData: row.event_data || {},
            createdAt: new Date(row.created_at)
        }));
    },

    /**
     * Get recent activity summary for multiple leads (for highlighting active leads)
     */
    async getRecentLeadActivity(leadIds: string[]): Promise<Map<string, { count: number; lastActivity: Date | null; isHot: boolean }>> {
        if (leadIds.length === 0) return new Map();

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('offer_interactions')
            .select('lead_id, created_at')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting lead activity:', error);
            return new Map();
        }

        // Build map of lead activity
        const activityMap = new Map<string, { count: number; lastActivity: Date | null; isHot: boolean }>();

        // Initialize all leads
        leadIds.forEach(id => activityMap.set(id, { count: 0, lastActivity: null, isHot: false }));

        // Process results
        data.forEach(row => {
            if (!row.lead_id) return;
            const activity = activityMap.get(row.lead_id);
            if (activity) {
                activity.count++;
                if (!activity.lastActivity) {
                    activity.lastActivity = new Date(row.created_at);
                }
                // Mark as HOT if activity within 24h
                if (row.created_at >= twentyFourHoursAgo) {
                    activity.isHot = true;
                }
            }
        });

        return activityMap;
    }
};
