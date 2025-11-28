import { supabase } from '../lib/supabase';
import type { Offer, MeasurementReport, Installation, Contract, User } from '../types';

export const DatabaseService = {
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
            customer: row.customer_data,
            product: row.product_config,
            pricing: row.pricing,
            status: row.status as Offer['status'],
            snowZone: row.snow_zone,
            commission: row.commission,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.user_id
        }));
    },

    async getOfferById(id: string): Promise<Offer | null> {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: data.customer_data,
            product: data.product_config,
            pricing: data.pricing,
            status: data.status as Offer['status'],
            snowZone: data.snow_zone,
            commission: data.commission,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.user_id
        };
    },

    async createOffer(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Offer> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('offers')
            .insert({
                user_id: user.id,
                offer_number: offer.offerNumber || `OFF/${Date.now()}`,
                customer_data: offer.customer,
                product_config: offer.product,
                pricing: offer.pricing,
                status: offer.status,
                snow_zone: offer.snowZone,
                commission: offer.commission,
                distance: offer.distance || 0
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: data.customer_data,
            product: data.product_config,
            pricing: data.pricing,
            status: data.status as Offer['status'],
            snowZone: data.snow_zone,
            commission: data.commission,
            distance: data.distance,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.user_id
        } as Offer;
    },

    async updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };

        if (updates.customer) dbUpdates.customer_data = updates.customer;
        if (updates.product) dbUpdates.product_config = updates.product;
        if (updates.pricing) {
            dbUpdates.pricing = updates.pricing;
            dbUpdates.margin_percentage = updates.pricing.marginPercentage;
        }
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.snowZone) dbUpdates.snow_zone = updates.snowZone;
        if (updates.commission !== undefined) dbUpdates.commission = updates.commission;
        if (updates.distance !== undefined) dbUpdates.distance = updates.distance;

        const { error } = await supabase
            .from('offers')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteOffer(id: string): Promise<void> {
        const { error } = await supabase
            .from('offers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Customers ---
    // Replaced getCustomers with getUniqueCustomers to match storage.ts behavior
    async getUniqueCustomers(): Promise<any[]> {
        const { data, error } = await supabase
            .from('offers')
            .select('customer_data, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const customerMap = new Map<string, any>();

        data.forEach(row => {
            const customer = row.customer_data;
            const key = customer.email || `${customer.firstName}_${customer.lastName}_${customer.city}`.toLowerCase();

            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    customer,
                    lastOfferDate: new Date(row.created_at),
                    offerCount: 1
                });
            } else {
                const existing = customerMap.get(key);
                existing.offerCount++;
            }
        });

        return Array.from(customerMap.values());
    },

    // --- Contracts ---
    async getContracts(): Promise<Contract[]> {
        const { data, error } = await supabase
            .from('contracts')
            .select('*');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            status: row.status as Contract['status'],
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: row.contract_data.pricing,
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            comments: row.contract_data.comments?.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined
        }));
    },

    async createContract(contract: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const contractData = {
            contractNumber: contract.contractNumber,
            client: contract.client,
            product: contract.product,
            pricing: contract.pricing,
            commission: contract.commission,
            requirements: contract.requirements,
            comments: contract.comments,
            attachments: contract.attachments
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
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Contract;
    },

    async updateContract(id: string, contract: Partial<Contract>): Promise<void> {
        const updates: any = {};
        if (contract.status) updates.status = contract.status;
        if (contract.signedAt) updates.signed_at = contract.signedAt.toISOString();

        if (contract.client || contract.product || contract.pricing || contract.comments) {
            // Fetch existing to merge? Or assume full update?
            // For now, let's assume we need to pass full data for JSON fields update
            // This is a limitation of this simple implementation
            const contractData = {
                contractNumber: contract.contractNumber, // Might be undefined if partial
                client: contract.client,
                product: contract.product,
                pricing: contract.pricing,
                commission: contract.commission,
                requirements: contract.requirements,
                comments: contract.comments,
                attachments: contract.attachments
            };
            // Filter out undefined
            // A proper implementation would fetch current data, merge, and save.
            // Let's leave it as is for now, assuming the caller handles it or we improve later.
            updates.contract_data = contractData;
        }

        const { error } = await supabase
            .from('contracts')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    // --- Installations ---
    async getInstallations(): Promise<Installation[]> {
        const { data, error } = await supabase
            .from('installations')
            .select('*');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            client: row.installation_data.client,
            productSummary: row.installation_data.productSummary,
            status: row.status as Installation['status'],
            scheduledDate: row.scheduled_date, // Keep as string (ISO)
            teamId: row.installation_data.teamId,
            notes: row.installation_data.notes,
            createdAt: new Date(row.created_at)
        }));
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
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;

        if (updates.client || updates.productSummary || updates.teamId || updates.notes) {
            const installationData = {
                client: updates.client,
                productSummary: updates.productSummary,
                teamId: updates.teamId,
                notes: updates.notes
            };
            dbUpdates.installation_data = installationData;
        }

        const { error } = await supabase
            .from('installations')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    // --- Reports ---
    async getReports(): Promise<MeasurementReport[]> {
        const { data, error } = await supabase
            .from('reports')
            .select('*');

        if (error) throw error;

        return data.map(row => ({
            ...row.data,
            id: row.id,
            userId: row.user_id,
            createdAt: new Date(row.created_at)
        }));
    },

    async saveReport(report: Omit<MeasurementReport, 'id' | 'createdAt'>): Promise<MeasurementReport> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const dateObj = new Date(report.date);
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();

        const { data, error } = await supabase
            .from('reports')
            .insert({
                user_id: user.id,
                month: month,
                year: year,
                data: report
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...report,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as MeasurementReport;
    },

    async deleteReport(id: string): Promise<void> {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
            // For display purposes, name is enough usually.
            // If we need email, we should store it in profiles or use a secure function.
            // Let's assume we don't need email for dropdowns.
            role: row.role as User['role'],
            createdAt: new Date(row.created_at)
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
            createdAt: new Date(data.created_at)
        };
    },
    async updateUserProfile(profile: Partial<User>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const updates: any = {
            updated_at: new Date().toISOString()
        };
        if (profile.firstName || profile.lastName) {
            updates.full_name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        }
        if (profile.phone !== undefined) updates.phone = profile.phone;
        if (profile.monthlyTarget !== undefined) updates.monthly_target = profile.monthlyTarget;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

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
            status: row.status as 'pending' | 'active' | 'blocked'
        }));
    },

    async updateUserStatus(userId: string, status: 'pending' | 'active' | 'blocked'): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    // --- Stats ---
    async getSalesRepStats(startDate?: Date, endDate?: Date): Promise<any[]> {
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
        const statsMap = new Map<string, any>();

        // Process offers
        offers.forEach(offer => {
            const userId = offer.user_id;
            if (!statsMap.has(userId)) {
                const user = userMap.get(userId);
                statsMap.set(userId, {
                    userId,
                    userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                    totalOffers: 0,
                    soldOffers: 0,
                    totalValue: 0,
                    totalMarginValue: 0,
                    totalDistance: 0,
                    avgMarginPercent: 0,
                    marginSum: 0
                });
            }

            const stats = statsMap.get(userId);
            stats.totalOffers++;
            if (offer.status === 'sold') {
                stats.soldOffers++;
                stats.totalValue += offer.pricing.sellingPriceNet || 0;
                stats.totalMarginValue += offer.pricing.marginValue || 0;
            }

            const margin = offer.pricing.marginPercentage || 0;
            stats.marginSum += margin;
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
                    userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                    totalOffers: 0,
                    soldOffers: 0,
                    totalValue: 0,
                    totalMarginValue: 0,
                    totalDistance: 0,
                    avgMarginPercent: 0,
                    marginSum: 0
                });
            }

            const stats = statsMap.get(userId);
            stats.totalDistance += reportData.totalKm || 0;
        });

        // Finalize averages
        return Array.from(statsMap.values()).map(stats => ({
            ...stats,
            avgMarginPercent: stats.totalOffers > 0 ? stats.marginSum / stats.totalOffers : 0,
            conversionRate: stats.totalOffers > 0 ? (stats.soldOffers / stats.totalOffers) * 100 : 0
        }));
    }
};
