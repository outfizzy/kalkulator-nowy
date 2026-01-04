import { supabase } from '../../lib/supabase';
import type { User } from '../../types';
import type { AuthError } from '@supabase/supabase-js';

export const UserService = {
    async getSalesReps(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'sales_rep');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            username: (row.full_name || '').split(' ')[0].toLowerCase() || '',
            firstName: (row.full_name || '').split(' ')[0] || '',
            lastName: (row.full_name || '').split(' ').slice(1).join(' ') || '',
            email: '',
            role: row.role as User['role'],
            createdAt: new Date(row.created_at),
            phone: row.phone,
            monthlyTarget: row.monthly_target,
            status: row.status as 'pending' | 'active' | 'blocked',
            companyName: row.company_name || undefined,
            nip: row.nip || undefined,
            partnerMargin: typeof row.partner_margin === 'number' ? row.partner_margin : undefined,
            commissionRate: typeof row.commission_rate === 'number' ? row.commission_rate : undefined,
            hourlyRateCurrency: row.hourly_rate_currency,
            commissionConfig: row.commission_config
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
            substituteUntil: data.substitute_until ? new Date(data.substitute_until) : undefined,
            hourlyRateCurrency: data.hourly_rate_currency,
            commissionConfig: data.commission_config
        };
    },

    async getUsersByIds(ids: string[]): Promise<User[]> {
        if (!ids || ids.length === 0) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ids);

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            username: (row.full_name || '').split(' ')[0].toLowerCase() || '',
            firstName: (row.full_name || '').split(' ')[0] || '',
            lastName: (row.full_name || '').split(' ').slice(1).join(' ') || '',
            email: '',
            role: row.role as User['role'],
            createdAt: new Date(row.created_at),
            phone: row.phone,
            status: row.status as 'pending' | 'active' | 'blocked',
            hourlyRate: typeof row.hourly_rate === 'number' ? row.hourly_rate : undefined,
            hourlyRateCurrency: row.hourly_rate_currency
        }));
    },

    async checkEmailConfigColumn(userId: string): Promise<{ error: Error | null }> {
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
            console.error('UserService updateUserProfile error:', error);
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

    async getAllUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            username: (row.full_name || '').split(' ')[0].toLowerCase() || '',
            firstName: (row.full_name || '').split(' ')[0] || '',
            lastName: (row.full_name || '').split(' ').slice(1).join(' ') || '',
            email: '',
            role: row.role as User['role'],
            createdAt: new Date(row.created_at),
            phone: row.phone,
            monthlyTarget: row.monthly_target,
            status: row.status as 'pending' | 'active' | 'blocked',
            companyName: row.company_name || undefined,
            nip: row.nip || undefined,
            partnerMargin: typeof row.partner_margin === 'number' ? row.partner_margin : undefined,
            commissionRate: typeof row.commission_rate === 'number' ? row.commission_rate : undefined,
            hourlyRate: typeof row.hourly_rate === 'number' ? row.hourly_rate : undefined,
            commissionConfig: row.commission_config
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
        if (rate < 0 || rate > 1) {
            throw new Error('Commission rate must be between 0 and 1 (0% to 100%)');
        }

        const { error } = await supabase
            .from('profiles')
            .update({ commission_rate: rate, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateCommissionConfig(userId: string, config: import('../../types').CommissionConfig): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ commission_config: config, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateHourlyRate(userId: string, rate: number, currency: 'PLN' | 'EUR' = 'PLN'): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({
                hourly_rate: rate,
                hourly_rate_currency: currency,
                updated_at: new Date().toISOString()
            })
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const response = await fetch('/api/delete-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }
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

    // --- Delegation ---
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

    async getDelegatedUserIds(): Promise<string[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

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

    async getSalesRepStats(startDate?: Date, endDate?: Date): Promise<import('../../types').SalesRepStat[]> {
        type SalesRepStatWithMargin = import('../../types').SalesRepStat & { marginSum: number };
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
        const statsMap = new Map<string, SalesRepStatWithMargin>();

        // process offers
        (offers || []).forEach((offer: {
            user_id: string;
            status: string;
            pricing: { sellingPriceNet?: number; marginValue?: number; marginPercentage?: number } | null;
            created_at: string;
        }) => {
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
                    pendingOffersCount: 0,
                    marginSum: 0
                } as unknown as SalesRepStatWithMargin);
            }

            const stats = statsMap.get(userId) as SalesRepStatWithMargin | undefined;
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
                    stats.totalValue += offer.pricing?.sellingPriceNet || 0;
                    stats.totalMarginValue += offer.pricing?.marginValue || 0;
                }

                const margin = offer.pricing?.marginPercentage || 0;
                stats.marginSum = (stats.marginSum || 0) + margin;
            }
        });

        // Process reports for mileage
        (reports || []).forEach((report: { user_id: string; data: { distance?: number; date: string } }) => {
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
                } as unknown as SalesRepStatWithMargin);
            }

            const stats = statsMap.get(userId) as SalesRepStatWithMargin | undefined;
            if (stats && reportData && typeof (reportData as any).distance === 'number') {
                stats.totalDistance += (reportData as any).distance;
            }
        });

        return Array.from(statsMap.values()).map(stat => {
            const statWithMargin = stat as unknown as SalesRepStatWithMargin;
            const marginSum = statWithMargin.marginSum || 0;
            stat.avgMarginPercent = stat.totalOffers > 0 ? marginSum / stat.totalOffers : 0;
            stat.conversionRate = stat.totalOffers > 0 ? (stat.soldOffers / stat.totalOffers) * 100 : 0;
            delete (stat as any).marginSum;
            return stat;
        });
    }
};
