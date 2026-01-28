import type { Customer, CustomerCost } from '../../types';
import type { CustomerWithMetadata } from '../../utils/storage';
import { supabase } from '../../lib/supabase';

export const CustomerService = {
    // Existing methods...
    async getCustomers(): Promise<Customer[]> {
        // 1. Fetch customers raw
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*');
        // .order('lastName', { ascending: true }); // Removed due to case sensitivity issues

        if (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }

        if (!customers || customers.length === 0) return [];

        // 2. Extract IDs to fetch profiles
        const userIds = new Set<string>();
        customers.forEach(c => {
            if (c.representative_id) userIds.add(c.representative_id);
            if (c.contract_signer_id) userIds.add(c.contract_signer_id);
        });

        const idArray = Array.from(userIds);
        const profilesMap = new Map<string, { full_name: string }>();

        if (idArray.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', idArray);

            if (profilesError) {
                console.error('Error fetching related profiles:', profilesError);
                // Continue without profiles rather than failing completely
            }

            if (profiles) {
                profiles.forEach(p => {
                    profilesMap.set(p.id, p);
                });
            }
        }

        // 3. Map to final structure
        return customers.map((raw) => {
            const rep = raw.representative_id ? profilesMap.get(raw.representative_id) : undefined;
            const signer = raw.contract_signer_id ? profilesMap.get(raw.contract_signer_id) : undefined;

            // Normalize fields from potential snake_case
            const c: Customer = {
                ...raw,
                firstName: raw.firstName || raw.first_name || '',
                lastName: raw.lastName || raw.last_name || '',
                companyName: raw.companyName || raw.company_name,
                postalCode: raw.postalCode || raw.postal_code || raw['postal-code'] || '',
                houseNumber: raw.houseNumber || raw.house_number || '',
                email: raw.email || '',
                phone: raw.phone || raw.phone_number || '',
                city: raw.city || ''
            };

            return {
                ...c,
                representative: rep ? {
                    firstName: (rep.full_name || '').split(' ')[0] || '',
                    lastName: (rep.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined,
                contractSigner: signer ? {
                    firstName: (signer.full_name || '').split(' ')[0] || '',
                    lastName: (signer.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined
            };
        });
    },

    async getCustomer(id: string): Promise<Customer | null> {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching customer:', error);
            throw error;
        }

        if (!customer) return null;

        // Fetch profiles if needed
        const idsToFetch: string[] = [];
        if (customer.representative_id) idsToFetch.push(customer.representative_id);
        if (customer.contract_signer_id) idsToFetch.push(customer.contract_signer_id);

        const profilesMap = new Map<string, { full_name: string }>();

        if (idsToFetch.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', idsToFetch);

            if (profiles) {
                profiles.forEach(p => profilesMap.set(p.id, p));
            }
        }

        const rep = customer.representative_id ? profilesMap.get(customer.representative_id) : undefined;
        const signer = customer.contract_signer_id ? profilesMap.get(customer.contract_signer_id) : undefined;

        // Cast to any to assume base properties match
        const c = customer as unknown as Customer;

        return {
            ...c,
            representative: rep ? {
                firstName: (rep.full_name || '').split(' ')[0] || '',
                lastName: (rep.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined,
            contractSigner: signer ? {
                firstName: (signer.full_name || '').split(' ')[0] || '',
                lastName: (signer.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined
        };
    },

    async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
        // [Defensive] Check if supabase client is initialized
        if (!supabase) {
            const error = new Error('Supabase client is not initialized');
            console.error('Error creating customer:', error);
            throw error;
        }

        // [Sanitization] Convert empty strings to null to avoid Unique Constraint violations
        const safeCustomer = {
            ...customer,
            email: customer.email?.trim() || null,
            phone: customer.phone?.trim() || null,
            companyName: customer.companyName?.trim() || null,
            postalCode: customer.postalCode?.trim() || null,
            city: customer.city?.trim() || null,
            street: customer.street?.trim() || null,
            houseNumber: customer.houseNumber?.trim() || null,
            contract_number: customer.contract_number?.trim() || null,
        };

        const { data, error } = await supabase
            .from('customers')
            .insert([safeCustomer])
            .select()
            .single();

        if (error) {
            console.error('Error creating customer:', error);
            throw error;
        }

        // Auto-create contract if contract_number is provided
        if (customer.contract_number?.trim()) {
            try {
                const { ContractService } = await import('./contract.service');

                // Create minimal manual contract with just the contract number
                await ContractService.createManualContract({
                    customer: data,
                    items: [{
                        id: crypto.randomUUID(),
                        modelId: 'other',
                        description: 'Umowa importowana - szczegóły do uzupełnienia',
                        quantity: 1,
                        price: 0
                    }],
                    contractDetails: {
                        contractNumber: customer.contract_number.trim(),
                        createdAt: new Date(),
                        signedAt: undefined, // Draft status
                        advance: 0,
                        comments: 'Automatycznie utworzona przy dodawaniu klienta. Uzupełnij szczegóły w sekcji Umowy.'
                    }
                });

                console.log(`Auto-created contract ${customer.contract_number} for customer ${data.id}`);
            } catch (contractError) {
                console.error('Failed to auto-create contract:', contractError);
                // Don't fail customer creation if contract creation fails
                // User can create contract manually later
            }
        }

        return data;
    },

    async ensureCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
        const email = customer.email?.trim()?.toLowerCase();
        const phone = customer.phone?.replace(/\s/g, ''); // strip spaces from phone for check

        // 1. Try to find by email
        if (email) {
            const { data: existing } = await supabase
                .from('customers')
                .select('*')
                .ilike('email', email) // Case insensitive
                .maybeSingle();

            if (existing) return existing;
        }

        // 2. Try to find by Phone
        if (phone && phone.length > 5) { // Basic length check to avoid matching empty/short trash
            // Note: phone numbers are hard to match exactly due to formatting (+48, 0048, spaces).
            // Ideally we should normalize phone in DB. For now, we try exact or simple match.
            const { data: existing } = await supabase
                .from('customers')
                .select('*')
                .or(`phone.eq.${phone},phone.eq.${customer.phone?.trim()}`)
                .limit(1)
                .maybeSingle();

            if (existing) return existing;
        }

        // 3. Create if not found
        return await this.createCustomer(customer);
    },

    /**
     * Secure version of ensureCustomer that uses RPC to bypass RLS.
     * Use this for Legacy Imports or cases where Rep needs to find existing customer hidden by RLS.
     */
    async ensureCustomerSecure(customer: Partial<Customer>): Promise<Customer> {
        const { data, error } = await supabase.rpc('get_or_create_customer_v2', {
            p_email: customer.email ?? null,
            p_phone: customer.phone ?? null,
            p_first_name: customer.firstName ?? null,
            p_last_name: customer.lastName ?? null,
            p_company_name: customer.companyName ?? null,
            p_street: customer.street ?? null,
            p_house_number: customer.houseNumber ?? null,
            p_postal_code: customer.postalCode ?? null,
            p_city: customer.city ?? null,
            p_country: customer.country || 'Deutschland',
            p_representative_id: customer.representative_id || null,
            p_source: customer.source || 'manual'
        });

        if (error) throw error;
        // Data returned from RPC is JSONB, we cast it to Customer
        // RPC v2 returns the full customer row
        return data as Customer;
    },

    async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCustomer(id: string): Promise<void> {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Cost Management ---

    async getCustomerCosts(customerId: string): Promise<CustomerCost[]> {
        const { data, error } = await supabase
            .from('customer_costs')
            .select('*')
            .eq('customer_id', customerId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async addCustomerCost(cost: Omit<CustomerCost, 'id' | 'created_at'>): Promise<CustomerCost> {
        const { data, error } = await supabase
            .from('customer_costs')
            .insert([cost])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCustomerCost(id: string): Promise<void> {
        const { error } = await supabase
            .from('customer_costs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async findDuplicates(): Promise<{ key: string; type: 'email' | 'name'; customers: Customer[] }[]> {
        const customers = await this.getCustomers();
        const groups: { key: string; type: 'email' | 'name'; customers: Customer[] }[] = [];

        // 1. Check Emails
        const emailMap = new Map<string, Customer[]>();
        customers.forEach(c => {
            if (c.email) {
                const email = c.email.toLowerCase().trim();
                if (!emailMap.has(email)) emailMap.set(email, []);
                emailMap.get(email)?.push(c);
            }
        });

        emailMap.forEach((list, email) => {
            if (list.length > 1) {
                groups.push({ key: email, type: 'email', customers: list });
            }
        });

        // 2. Check Names (First + Last)
        const nameMap = new Map<string, Customer[]>();
        customers.forEach(c => {
            const key = `${c.lastName?.toLowerCase() || ''}_${c.firstName?.toLowerCase() || ''}`.trim();
            // Skip empty names
            if (key.length > 3 && key !== '_') {
                if (!nameMap.has(key)) nameMap.set(key, []);
                nameMap.get(key)?.push(c);
            }
        });

        nameMap.forEach((list) => {
            if (list.length > 1) {
                // Determine readable key
                const readableKey = `${list[0].firstName} ${list[0].lastName}`;

                // Avoid adding if all members are already in an email group together?
                // For now, let's keep it simple and just allow "Name" duplicates even if they overlap with Email duplicates.
                // Deduplication of *groups* can be complex.

                // Slight optimization: If this EXACT set of IDs is already in `groups` (from email), skip it.
                const groupIds = new Set(list.map(c => c.id));
                const alreadyExists = groups.some(g => {
                    if (g.customers.length !== list.length) return false;
                    return g.customers.every(gc => groupIds.has(gc.id));
                });

                if (!alreadyExists) {
                    groups.push({ key: readableKey, type: 'name', customers: list });
                }
            }
        });

        return groups;
    },

    async mergeCustomers(primaryId: string, duplicateIds: string[]): Promise<void> {
        const { error } = await supabase.rpc('merge_customers', {
            primary_customer_id: primaryId,
            duplicate_customer_ids: duplicateIds
        });

        if (error) {
            console.error('Error merging customers:', error);
            throw error;
        }
    },

    async getUniqueCustomers(): Promise<CustomerWithMetadata[]> {
        // Use existing getCustomers() and simple mapping for now
        // This is needed for backward compatibility with components expecting this method
        const customers = await this.getCustomers();

        // Simple mock of Metadata structure if needed or just return customers
        // The error suggests components act as if it exists.
        // Based on grep, it returns { customer, lastOfferDate, offerCount }

        // Since we don't have easy access to offers here without circular dep,
        // we'll do a basic fetch or standard return.
        // Ideally we should move the full logic here, but for a quick fix to stop the crash:

        // Let's refetch offers to be accurate or accept a slight performance hit?
        // Better: simple aggregation or join.

        const { data: offers } = await supabase
            .from('offers')
            .select('created_at, customer_id, customer_data');

        const map = new Map<string, { customer: Customer, lastOfferDate: Date, offerCount: number }>();

        // 1. Process real Customers from DB
        customers.forEach(c => {
            const key = c.id!;
            map.set(key, {
                customer: c,
                lastOfferDate: new Date(0), // default
                offerCount: 0
            });
        });

        // 2. Add Offer stats
        if (offers) {
            offers.forEach((o) => {
                const cId = o.customer_id;
                if (cId && map.has(cId)) {
                    const entry = map.get(cId)!;
                    entry.offerCount++;
                    const d = new Date(o.created_at);
                    if (d > entry.lastOfferDate) {
                        entry.lastOfferDate = d;
                    }
                }
            });
        }

        return Array.from(map.values()).sort((a, b) => b.lastOfferDate.getTime() - a.lastOfferDate.getTime());
    }
};
