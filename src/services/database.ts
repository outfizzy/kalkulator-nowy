import { supabase } from '../lib/supabase';
import type { Offer, MeasurementReport, Installation, Contract, User } from '../types';

// Normalize pricing object to avoid undefined values in UI (e.g. toLocaleString on undefined)
const normalizePricing = (pricing: any): any => {
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

// Helper: generate sequential contract number PL/1100/MM/RRRR for current month/year
const generateContractNumberFromList = (contracts: Contract[]): string => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();

    const currentMonthContracts = contracts.filter(c => {
        const parts = (c.contractNumber || '').split('/');
        return parts.length >= 4 && parts[2] === month && parts[3] === year.toString();
    });

    let maxNum = 0;
    currentMonthContracts.forEach(c => {
        const parts = c.contractNumber.split('/');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const base = 1100;
    const nextNum = maxNum === 0 ? base : maxNum + 1;
    return `PL/${nextNum}/${month}/${year}`;
};

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
            pricing: normalizePricing(row.pricing),
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
            pricing: normalizePricing(data.pricing),
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
                margin_percentage: offer.pricing.marginPercentage
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerNumber: data.offer_number,
            customer: data.customer_data,
            product: data.product_config,
            pricing: normalizePricing(data.pricing),
            status: data.status as Offer['status'],
            snowZone: data.snow_zone,
            commission: data.commission,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.user_id
        } as Offer;
    },

    async updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
        const dbUpdates: Record<string, unknown> = {
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
    async getUniqueCustomers(): Promise<{ customer: any; lastOfferDate: Date; offerCount: number }[]> {
        const normalizeCustomer = (raw: any = {}) => ({
            salutation: ['Herr', 'Frau', 'Firma'].includes(raw.salutation) ? raw.salutation : 'Herr',
            firstName: (raw.firstName || '').toString(),
            lastName: (raw.lastName || '').toString(),
            street: (raw.street || '').toString(),
            houseNumber: (raw.houseNumber || '').toString(),
            postalCode: (raw.postalCode || '').toString(),
            city: (raw.city || '').toString(),
            phone: (raw.phone || '').toString(),
            email: (raw.email || '').toString(),
            country: (raw.country || 'Deutschland').toString(),
        });

        const { data, error } = await supabase
            .from('offers')
            .select('customer_data, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const customerMap = new Map<string, { customer: any; lastOfferDate: Date; offerCount: number }>();

        (data || []).forEach(row => {
            const customer = normalizeCustomer(row.customer_data);
            const email = customer.email.toLowerCase();
            const firstName = customer.firstName;
            const lastName = customer.lastName;
            const city = customer.city;

            // Unikalny klucz oparty o email lub kombinację imię+nazwisko+miasto (spójne z utils/storage.ts)
            const key = email || `${firstName}_${lastName}_${city}`.toLowerCase();
            const createdAt = new Date(row.created_at);

            const existing = customerMap.get(key);

            if (!existing) {
                customerMap.set(key, {
                    customer,
                    lastOfferDate: createdAt,
                    offerCount: 1
                });
            } else {
                // Aktualizujemy dane klienta, jeśli ta oferta jest nowsza
                if (createdAt > existing.lastOfferDate) {
                    existing.customer = customer;
                    existing.lastOfferDate = createdAt;
                }
                existing.offerCount += 1;
            }
        });

        // Zwracamy posortowaną listę – najnowsze oferty na górze
        return Array.from(customerMap.values()).sort(
            (a, b) => b.lastOfferDate.getTime() - a.lastOfferDate.getTime()
        );
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
            pricing: row.contract_data.pricing,
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            comments: row.contract_data.comments?.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined
        }));
    },

    async createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'contractNumber'>): Promise<Contract> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate sequential contract number for current month/year
        const existingContracts = await DatabaseService.getContracts();
        const newContractNumber = generateContractNumberFromList(existingContracts);

        const contractData = {
            contractNumber: newContractNumber,
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
            contractNumber: newContractNumber,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Contract;
    },

    async updateContract(id: string, contract: Partial<Contract>): Promise<void> {
        const updates: Record<string, unknown> = {};
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
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map(row => {
            const installationData = (row as any).installation_data || {};
            const clientData = installationData.client || {};

            const client = {
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                city: clientData.city || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                coordinates: clientData.coordinates
            };

            const scheduledRaw = (row as any).scheduled_date as string | null;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            return {
                id: row.id,
                offerId: row.offer_id,
                client,
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId || (row as any).team_id,
                notes: installationData.notes,
                acceptance: installationData.acceptance,
                createdAt: new Date(row.created_at)
            };
        });
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
        const dbUpdates: Record<string, unknown> = {};
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
            partnerMargin: typeof row.partner_margin === 'number' ? row.partner_margin : undefined
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
            partnerMargin: typeof data.partner_margin === 'number' ? data.partner_margin : undefined
        };
    },
    async updateUserProfile(profile: Partial<User>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const updates: Record<string, unknown> = {
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
            status: row.status as 'pending' | 'active' | 'blocked',
            companyName: row.company_name || undefined,
            nip: row.nip || undefined,
            partnerMargin: typeof row.partner_margin === 'number' ? row.partner_margin : undefined
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

    async verifyCurrentPassword(email: string, password: string): Promise<{ error: any }> {
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

    async getInstallationsForInstaller(userId: string): Promise<Installation[]> {
        const { data: assignments, error: assignError } = await supabase
            .from('installation_assignments')
            .select('installation_id')
            .eq('user_id', userId);

        if (assignError) throw assignError;
        if (!assignments || assignments.length === 0) return [];

        const ids = assignments.map((a: any) => a.installation_id);

        const { data, error } = await supabase
            .from('installations')
            .select('*')
            .in('id', ids);

        if (error) throw error;

        return (data || []).map(row => {
            const installationData = (row as any).installation_data || {};
            const clientData = installationData.client || {};

            const client = {
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                city: clientData.city || installationData.city || '',
                address: clientData.address || installationData.address || '',
                phone: clientData.phone || installationData.phone || '',
                coordinates: clientData.coordinates
            };

            const scheduledRaw = (row as any).scheduled_date as string | null;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            return {
                id: row.id,
                offerId: row.offer_id,
                client,
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId,
                notes: installationData.notes,
                acceptance: installationData.acceptance,
                createdAt: new Date(row.created_at)
            } as Installation;
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

        return (data || []).map(row => (row as any).user_id as string);
    },

    async saveInstallationAcceptance(installationId: string, acceptance: any): Promise<void> {
        // Merge acceptance into existing installation_data and mark as completed
        const { data, error: fetchError } = await supabase
            .from('installations')
            .select('installation_data')
            .eq('id', installationId)
            .single();

        if (fetchError) throw fetchError;

        const existing = (data?.installation_data as any) || {};
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
        if (!assignments || assignments.length === 0) return { completedCount: 0 };

        const ids = assignments.map((a: any) => a.installation_id);

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
        const statsMap = new Map<string, any>();

        // Process offers
        offers.forEach(offer => {
            const userId = offer.user_id;
            if (!statsMap.has(userId)) {
                const user = userMap.get(userId);
                statsMap.set(userId, {
                    userId,
                    userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                    role: user?.role || 'sales_rep',
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
                    role: user?.role || 'sales_rep',
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
                    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
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
                    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
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
                    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                    : undefined;

                return {
                    raw: row,
                    profile,
                    createdByName: createdByName || ''
                };
            })
            .filter(({ raw, profile, createdByName }) => {
                const offerNumber = raw.offer_number?.toLowerCase() || '';
                const customerName = `${raw.customer_data?.firstName || ''} ${raw.customer_data?.lastName || ''}`.toLowerCase();
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
            const assignments = (allAssignments || []).filter((a: any) => a.user_id === installer.id);
            const assignedInstallationIds = assignments.map((a: any) => a.installation_id);

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
            comments: data.contract_data.comments?.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
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
                profiles:user_id (
                    id,
                    full_name
                )
            `);

        if (membersError) throw membersError;

        // Map members to teams
        return teams.map(team => {
            const teamMembers = members
                .filter((m: any) => m.team_id === team.id)
                .map((m: any) => {
                    // Handle potential missing profile or name split
                    const fullName = m.profiles?.full_name || 'Unknown User';
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
            const assignments = members.map((m: any) => ({
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
            comments: row.contract_data.comments?.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
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
            const contract = contractRow as any;

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
                    address: `${client.street || ''} ${client.houseNumber || ''}`.trim(),
                    phone: client.phone || '',
                    coordinates: undefined // Will be geocoded later if needed
                },
                productSummary: `${contractData.product.modelId} ${contractData.product.width}x${contractData.product.projection}mm`
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
                console.error(`Error creating installation for contract ${contract.id}:`, insertError);
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
    }

};
