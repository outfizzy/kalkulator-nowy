import { supabase, normalizePricing } from './base.service';
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

        // Ensure customer exists in customers table
        let customerId = offer.customer.id;
        try {
            const customer = await CustomerService.ensureCustomer(offer.customer);
            customerId = customer.id;
        } catch (e) {
            console.error('Failed to ensure customer:', e);
            // Fallback: proceed without strict link if needed
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
                commission: offer.commission,
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

    async updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
        // Convert to DB format
        const dbUpdates: any = {};
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
                    const name = (offerData?.customer_data as any)?.lastName || 'Klient';

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

        const regionOffers = data.filter((o: any) => {
            const pc = o.customer_data?.postalCode || '';
            return pc.startsWith(postalCodePrefix);
        });

        if (regionOffers.length === 0) return { winRate: 0, avgMargin: 0, totalOffers: 0 };

        const total = regionOffers.length;
        const sold = regionOffers.filter((o: any) => o.status === 'sold').length;
        const winRate = (sold / total) * 100;

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

        return data.map((row: any) => ({
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
        const { data: detailsData, error: detailsError } = await supabase.rpc('get_offer_details_by_token', { token_input: token });

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

    async markAsViewed(token: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('mark_offer_viewed', { token_input: token });
        if (error) {
            console.error('Error marking offer as viewed:', error);
            return false;
        }
        return data;
    }
};
