import { supabase } from '../../lib/supabase';
import type { InstallationTeam } from '../../types';

export const InstallationTeamService = {
    async getTeams(): Promise<InstallationTeam[]> {
        const { data, error } = await supabase
            .from('installation_teams')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            name: row.name,
            color: row.color,
            vehicle: row.vehicle,
            members: typeof row.members === 'string' ? JSON.parse(row.members) : row.members,
            isActive: row.is_active,
            fuelConsumption: row.fuel_consumption,
            vehicleMaintenanceRate: row.vehicle_maintenance_rate,
            workingDays: row.working_days || [1, 2, 3, 4, 5]
        }));
    },

    async createTeam(team: Omit<InstallationTeam, 'id' | 'isActive'>): Promise<InstallationTeam> {
        const { data, error } = await supabase
            .from('installation_teams')
            .insert({
                name: team.name,
                color: team.color,
                vehicle: team.vehicle,
                members: team.members,
                is_active: true,
                fuel_consumption: team.fuelConsumption,
                vehicle_maintenance_rate: team.vehicleMaintenanceRate,
                working_days: team.workingDays || [1, 2, 3, 4, 5]
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            color: data.color,
            vehicle: data.vehicle,
            members: typeof data.members === 'string' ? JSON.parse(data.members) : data.members,
            isActive: data.is_active,
            fuelConsumption: data.fuel_consumption,
            vehicleMaintenanceRate: data.vehicle_maintenance_rate,
            workingDays: data.working_days || [1, 2, 3, 4, 5]
        };
    },

    async updateTeam(id: string, updates: Partial<InstallationTeam>): Promise<void> {
        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.vehicle !== undefined) dbUpdates.vehicle = updates.vehicle;
        if (updates.members !== undefined) dbUpdates.members = updates.members;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.fuelConsumption !== undefined) dbUpdates.fuel_consumption = updates.fuelConsumption;
        if (updates.vehicleMaintenanceRate !== undefined) dbUpdates.vehicle_maintenance_rate = updates.vehicleMaintenanceRate;
        if (updates.workingDays !== undefined) dbUpdates.working_days = updates.workingDays;

        const { error } = await supabase
            .from('installation_teams')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTeam(id: string): Promise<void> {
        // Soft delete
        const { error } = await supabase
            .from('installation_teams')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    }
};
