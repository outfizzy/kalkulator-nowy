import { supabase } from '../lib/supabase';
import type { Offer, MeasurementReport, Installation, Contract, User, PricingResult, Customer, SalesRepStat, Measurement, WalletTransaction, WalletStats, OrderRequest, OrderRequestStatus, FuelLog, FailureReport, FailureReportStatus } from '../types';
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
    async getUniqueCustomers(): Promise<{ customer: Customer; lastOfferDate: Date; offerCount: number }[]> {
        const normalizeCustomer = (raw: Record<string, unknown> = {}): Customer => ({
            salutation: (['Herr', 'Frau', 'Firma'].includes(raw.salutation as string) ? raw.salutation : 'Herr') as Customer['salutation'],
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

        const customerMap = new Map<string, { customer: Customer; lastOfferDate: Date; offerCount: number }>();

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
            commissionRate: typeof data.commission_rate === 'number' ? data.commission_rate : undefined
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
                    userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
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
                    userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
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
                profiles:user_id (
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
    },

    // ==================== Measurement Management ====================

    async getMeasurements(): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
                *,
                sales_rep:profiles!sales_rep_id(full_name)
            `)
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

    async getMeasurementsBySalesRep(userId: string): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
                *,
                sales_rep:profiles!sales_rep_id(full_name)
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
                sales_rep:profiles!sales_rep_id(full_name)
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
                sales_rep:profiles!sales_rep_id(full_name)
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
                deleted_by_profile:profiles!deleted_by(full_name),
                processed_by_profile:profiles!processed_by(full_name)
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
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `${report.userId}/${fileName}`;

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
    }
};
