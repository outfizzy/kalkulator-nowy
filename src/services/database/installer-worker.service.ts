import { supabase } from '../../lib/supabase';

const getSupabaseClient = () => {
    if (!supabase) {
        throw new Error('Supabase client is not initialized.');
    }
    return supabase;
};

export interface InstallerWorker {
    id: string;
    profileId: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    hourlyRate: number;
    hourlyRateCurrency: string;
    preferredLanguage: string;
    status: 'available' | 'on_leave' | 'inactive';
    teamId: string | null;
    teamName?: string;
    teamColor?: string;
    notes: string | null;
    hasAccount: boolean;
    createdAt: string;
}

type CreateWorkerInput = {
    profileId?: string | null;
    firstName: string;
    lastName?: string;
    phone?: string;
    hourlyRate?: number;
    hourlyRateCurrency?: string;
    preferredLanguage?: string;
    teamId?: string | null;
    notes?: string;
};

type UpdateWorkerInput = Partial<Omit<CreateWorkerInput, 'profileId'>> & {
    status?: 'available' | 'on_leave' | 'inactive';
};

const mapRow = (row: any): InstallerWorker => ({
    id: row.id,
    profileId: row.profile_id,
    firstName: row.first_name,
    lastName: row.last_name || '',
    phone: row.phone,
    hourlyRate: Number(row.hourly_rate) || 0,
    hourlyRateCurrency: row.hourly_rate_currency || 'PLN',
    preferredLanguage: row.preferred_language || 'pl',
    status: row.status,
    teamId: row.team_id,
    teamName: row.installation_teams?.name || undefined,
    teamColor: row.installation_teams?.color || undefined,
    notes: row.notes,
    hasAccount: !!row.profile_id,
    createdAt: row.created_at,
});

export const InstallerWorkerService = {
    /**
     * Get all workers, optionally joined with team info
     */
    async getAllWorkers(): Promise<InstallerWorker[]> {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('installer_workers')
            .select('*, installation_teams(name, color)')
            .neq('status', 'inactive')
            .order('first_name');

        if (error) throw error;
        return (data || []).map(mapRow);
    },

    /**
     * Get workers assigned to a specific team
     */
    async getTeamWorkers(teamId: string): Promise<InstallerWorker[]> {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('installer_workers')
            .select('*, installation_teams(name, color)')
            .eq('team_id', teamId)
            .neq('status', 'inactive')
            .order('first_name');

        if (error) throw error;
        return (data || []).map(mapRow);
    },

    /**
     * Get workers NOT assigned to any team (waiting pool)
     */
    async getUnassignedWorkers(): Promise<InstallerWorker[]> {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('installer_workers')
            .select('*')
            .is('team_id', null)
            .neq('status', 'inactive')
            .order('first_name');

        if (error) throw error;
        return (data || []).map(mapRow);
    },

    /**
     * Create a new worker (with or without a linked profile)
     */
    async createWorker(input: CreateWorkerInput): Promise<InstallerWorker> {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('installer_workers')
            .insert({
                profile_id: input.profileId || null,
                first_name: input.firstName,
                last_name: input.lastName || '',
                phone: input.phone || null,
                hourly_rate: input.hourlyRate || 0,
                hourly_rate_currency: input.hourlyRateCurrency || 'PLN',
                preferred_language: input.preferredLanguage || 'pl',
                team_id: input.teamId || null,
                notes: input.notes || null,
            })
            .select('*, installation_teams(name, color)')
            .single();

        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Update an existing worker
     */
    async updateWorker(id: string, input: UpdateWorkerInput): Promise<void> {
        const dbUpdates: Record<string, any> = {};
        if (input.firstName !== undefined) dbUpdates.first_name = input.firstName;
        if (input.lastName !== undefined) dbUpdates.last_name = input.lastName;
        if (input.phone !== undefined) dbUpdates.phone = input.phone;
        if (input.hourlyRate !== undefined) dbUpdates.hourly_rate = input.hourlyRate;
        if (input.hourlyRateCurrency !== undefined) dbUpdates.hourly_rate_currency = input.hourlyRateCurrency;
        if (input.preferredLanguage !== undefined) dbUpdates.preferred_language = input.preferredLanguage;
        if (input.teamId !== undefined) dbUpdates.team_id = input.teamId;
        if (input.notes !== undefined) dbUpdates.notes = input.notes;
        if (input.status !== undefined) dbUpdates.status = input.status;
        dbUpdates.updated_at = new Date().toISOString();

        const client = getSupabaseClient();
        const { error } = await client
            .from('installer_workers')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Permanently assign a worker to a team
     */
    async assignToTeam(workerId: string, teamId: string): Promise<void> {
        await this.updateWorker(workerId, { teamId });
    },

    /**
     * Remove a worker from their team (move to waiting pool)
     */
    async removeFromTeam(workerId: string): Promise<void> {
        await this.updateWorker(workerId, { teamId: null });
    },

    /**
     * Link a worker to a user profile (after account creation)
     */
    async linkProfile(workerId: string, profileId: string): Promise<void> {
        const client = getSupabaseClient();
        const { error } = await client
            .from('installer_workers')
            .update({ profile_id: profileId, updated_at: new Date().toISOString() })
            .eq('id', workerId);

        if (error) throw error;
    },

    /**
     * Soft-delete: mark worker as inactive
     */
    async deactivateWorker(workerId: string): Promise<void> {
        await this.updateWorker(workerId, { status: 'inactive', teamId: null });
    },

    /**
     * Find a worker by their profile_id
     */
    async getWorkerByProfile(profileId: string): Promise<InstallerWorker | null> {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('installer_workers')
            .select('*, installation_teams(name, color)')
            .eq('profile_id', profileId)
            .maybeSingle();

        if (error) throw error;
        return data ? mapRow(data) : null;
    },
};
