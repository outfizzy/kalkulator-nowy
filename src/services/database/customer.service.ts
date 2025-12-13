import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types';

export const CustomerService = {
    async getCustomers(): Promise<Customer[]> {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(this._mapCustomerRow);
    },

    async createCustomer(customer: Customer): Promise<Customer & { id: string }> {
        return this.ensureCustomer(customer, 'manual');
    },
    async getCustomer(id: string): Promise<Customer | null> {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this._mapCustomerRow(data);
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
                if (Object.keys(customerData).length > 2) {
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
                company_name: customerData.companyName,
                street: customerData.street,
                house_number: customerData.houseNumber,
                postal_code: customerData.postalCode,
                city: customerData.city,
                country: customerData.country,
                phone: customerData.phone,
                email: customerData.email,
                source: source
            })
            .select()
            .single();

        if (error) throw error;

        return this._mapCustomerRow(data);
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
        if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;

        const { data, error } = await supabase
            .from('customers')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return this._mapCustomerRow(data);
    },

    async deleteCustomer(id: string) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
    },

    _mapCustomerRow(data: any): Customer & { id: string } {
        return {
            id: data.id,
            salutation: data.salutation as Customer['salutation'],
            firstName: data.first_name,
            lastName: data.last_name,
            companyName: data.company_name,
            street: data.street,
            houseNumber: data.house_number,
            postalCode: data.postal_code,
            city: data.city,
            phone: data.phone,
            email: data.email,
            country: data.country,
        };
    },
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

        // Map to store unique customers
        const uniqueCustomers = new Map<string, {
            customer: Customer & { id?: string };
            offers: typeof offersData;
            contracts: typeof contractsData;
        }>();

        // 1. Initialize with DB Customers
        customersData.forEach((row: any) => {
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
                companyName: row.company_name
            };
            uniqueCustomers.set(`ID:${row.id} `, { customer, offers: [], contracts: [] });
            if (customer.email) uniqueCustomers.set(`EMAIL:${customer.email.toLowerCase()} `, { customer, offers: [], contracts: [] });
        });

        // 2. Process Offers
        offersData.forEach((offer: any) => {
            const offerCustomer = offer.customer_data;
            if (!offerCustomer) return;

            let entry: any = null;

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

            if (!entry) {
                const newCustomer = {
                    ...offerCustomer,
                    id: undefined
                };
                entry = { customer: newCustomer, offers: [], contracts: [] };

                if (offerCustomer.email) uniqueCustomers.set(`EMAIL:${offerCustomer.email.toLowerCase()} `, entry);
                const nameKey = `NAME:${(offerCustomer.firstName || '').toLowerCase()}:${(offerCustomer.lastName || '').toLowerCase()} `;
                uniqueCustomers.set(nameKey, entry);
            }

            entry.offers.push(offer);
        });

        // 3. Process Contracts
        const offerToCustomerMap = new Map<string, any>();
        Array.from(uniqueCustomers.values()).forEach(entry => {
            entry.offers.forEach((o: any) => offerToCustomerMap.set(o.id, entry));
        });

        contractsData.forEach((contract: any) => {
            const entry = offerToCustomerMap.get(contract.offer_id);
            if (entry) {
                entry.contracts.push(contract);
            }
        });

        // 4. Calculate Stats & Return List (Unique objects only)
        const result = new Set(uniqueCustomers.values());

        return Array.from(result).map((entry: any) => {
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
    async findDuplicates(): Promise<{ key: string; type: 'email' | 'name'; customers: Customer[] }[]> {
        const { data: allCustomers, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!allCustomers) return [];

        const customers = allCustomers.map(this._mapCustomerRow);
        const groups: { key: string; type: 'email' | 'name'; customers: Customer[] }[] = [];

        // 1. Group by Email
        const emailMap = new Map<string, Customer[]>();
        customers.forEach(c => {
            if (c.email) {
                const key = c.email.toLowerCase().trim();
                const list = emailMap.get(key) || [];
                list.push(c);
                emailMap.set(key, list);
            }
        });

        // 2. Group by Name (if no email match)
        // Note: For simplicity, we just look for exact name matches for now to avoid false positives
        const nameMap = new Map<string, Customer[]>();
        customers.forEach(c => {
            // Only group by name if they don't have email (or email is different? debatable).
            // Let's keep it simple: Exact name match is a candidate.
            if (c.firstName && c.lastName) {
                const key = `${c.firstName.toLowerCase().trim()} ${c.lastName.toLowerCase().trim()}`;
                const list = nameMap.get(key) || [];
                list.push(c);
                nameMap.set(key, list);
            }
        });

        // Convert Maps to result
        for (const [email, list] of emailMap.entries()) {
            if (list.length > 1) {
                groups.push({ key: email, type: 'email', customers: list });
            }
        }

        for (const [name, list] of nameMap.entries()) {
            if (list.length > 1) {
                // Avoid adding if already captured by email group (subset check)
                // Complex logic, but for MVP, let's just show them. User decides.
                // Actually, let's filter out ones that are entirely contained in an email group?
                // No, simpler: Just show all name matches too.

                // Deduplicate groups based on ID sets?
                const idsInGroup = new Set(list.map(c => c.id));
                const alreadyFound = groups.some(g => g.customers.every(c => idsInGroup.has(c.id)));
                if (!alreadyFound) {
                    groups.push({ key: name, type: 'name', customers: list });
                }
            }
        }

        return groups;
    },

    async mergeCustomers(primaryId: string, duplicateIds: string[]) {
        const { error } = await supabase.rpc('merge_customers', {
            primary_customer_id: primaryId,
            duplicate_customer_ids: duplicateIds
        });
        if (error) throw error;
    }
};
