import { supabase } from '../../lib/supabase';
import type { Installation, User, InstallationTeam } from '../../types';
import { UserService } from './user.service';

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

export const InstallationService = {
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

    async checkInstallationForContract(offerId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('installations')
            .select('id')
            .eq('offer_id', offerId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return !!data;
    },

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
            // Check if installation already exists
            const exists = await this.checkInstallationForContract(contractRow.offer_id);
            if (exists) {
                console.warn(`Installation already exists for offer ${contractRow.offer_id}, skipping`);
                continue;
            }

            const contractData = contractRow.contract_data;
            const client = contractData.client;

            const installationData = {
                client: {
                    firstName: client.firstName || '',
                    lastName: client.lastName || '',
                    city: client.city || '',
                    address: `${client.street || ''} ${client.houseNumber || ''} `.trim(),
                    phone: client.phone || '',
                    coordinates: undefined
                },
                productSummary: `${contractData.product.modelId} ${contractData.product.width}x${contractData.product.projection} mm`
            };

            const { data: newInstallation, error: insertError } = await supabase
                .from('installations')
                .insert({
                    offer_id: contractRow.offer_id,
                    user_id: user.id,
                    status: 'pending',
                    installation_data: installationData
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating installation for contract ${contractRow.id}: `, insertError);
                continue;
            }

            createdInstallations.push({
                id: newInstallation.id,
                offerId: contractRow.offer_id,
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

    async saveInstallationAcceptance(
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

    async getInstallationsForInstaller(userId: string): Promise<Installation[]> {
        // Implement logic to filter by installer assignment
        // This likely requires a join table 'installation_assignments' or similar
        // For now, returning empty or based on existing logic if any
        // Based on getInstallerManagementStats, assignments exist.

        const { data, error } = await supabase
            .from('installation_assignments')
            .select('installation_id')
            .eq('user_id', userId);

        if (error) throw error;

        const installationIds = data.map(d => d.installation_id);

        if (installationIds.length === 0) return [];

        const { data: installations, error: instError } = await supabase
            .from('installations')
            .select('*')
            .in('id', installationIds);

        if (instError) throw instError;

        return (installations || []).map(row => {
            const installationData = (row as any).installation_data || {};

            return {
                id: row.id,
                offerId: row.offer_id,
                client: installationData.client || {},
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate: row.scheduled_date,
                teamId: installationData.teamId || row.team_id,
                notes: installationData.notes,
                createdAt: new Date(row.created_at)
            };
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
            .match({ installation_id: installationId, user_id: userId });
        if (error) throw error;
    },


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
                expectedDuration: (row as any).expected_duration || 1,
                deliveryDate: (row as any).delivery_date // Map from DB
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
        if (updates.partsReady !== undefined) dbUpdates.parts_ready = updates.partsReady;
        if (updates.expectedDuration !== undefined) dbUpdates.expected_duration = updates.expectedDuration;

        // Merge installation_data
        if (updates.client || updates.productSummary || updates.teamId || updates.notes || updates.acceptance) {
            const installationData = {
                ...currentData,
                ...(updates.client && { client: updates.client }),
                ...(updates.productSummary && { productSummary: updates.productSummary }),
                ...(updates.teamId !== undefined && { teamId: updates.teamId }),
                ...(updates.notes && { notes: updates.notes }),
                ...(updates.acceptance && { acceptance: updates.acceptance })
            };

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
        return this.getInstallations(); // Alias for consistency if needed, or if logic diverges later.
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
                createdAt: new Date(row.created_at),
                deliveryDate: (row as any).delivery_date // Map from DB
            };
        });
    },

    async getInstallerManagementStats(): Promise<{
        installer: User;
        totalAssignments: number;
        completedInstallations: number;
        inProgressInstallations: number;
        nextScheduledInstallation?: Installation;
    }[]> {
        // Get all installers
        const installers = await UserService.getInstallers();

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
                totalAssignments: installerInstallations.length,
                completedInstallations: completedCount,
                inProgressInstallations: inProgressCount,
                nextScheduledInstallation: upcomingInstallations[0]
            };
        }));

        return stats;
    },
    async getTeams(): Promise<InstallationTeam[]> {
        // Fetch teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });

        if (teamsError) throw teamsError;

        // Fetch members for all teams
        const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select('team_id, user_id');

        if (membersError) throw membersError;

        // Fetch profiles for these members
        const userIds = Array.from(new Set((members || []).map(m => m.user_id)));
        const profileMap = new Map<string, { full_name?: string }>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            if (profiles) {
                profiles.forEach(p => profileMap.set(p.id, p));
            }
        }

        // Map members to teams
        return teams.map((team: any) => {
            const teamMembers = (members || [])
                .filter((m: any) => m.team_id === team.id)
                .map((m: any) => {
                    const profile = profileMap.get(m.user_id);
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

        const { count, error } = await supabase
            .from('installations')
            .select('*', { count: 'exact', head: true })
            .in('id', ids)
            .eq('status', 'completed');

        if (error) throw error;

        return { completedCount: count || 0 };
    },

    async getAssignmentsForInstallation(installationId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('installation_assignments')
            .select('user_id')
            .eq('installation_id', installationId);

        if (error) throw error;

        return (data || []).map(row => (row as { user_id: string }).user_id);
    },

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

            const { error: membersError } = await supabase
                .from('team_members')
                .insert(membersData);

            if (membersError) throw membersError;
        }
    },

    async deleteTeam(id: string): Promise<void> {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
