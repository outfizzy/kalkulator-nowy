import { supabase } from '../../lib/supabase';

const getClient = () => {
    if (!supabase) throw new Error('Supabase client not initialized');
    return supabase;
};

export interface CrewMember {
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
    hourlyRate?: number; // EUR/h
}

export interface WorkSession {
    id: string;
    teamId: string;
    leaderUserId: string;
    sessionDate: string;
    installationId: string | null;
    crewMembers: CrewMember[];
    crewRates: { id: string; name: string; hourlyRate: number }[];
    crewConfirmed: boolean;
    startedAt: string | null;
    endedAt: string | null;
    breakMinutes: number;
    driveToBase: boolean;
    driveToHotel: boolean;
    totalWorkMinutes: number | null;
    status: 'pending' | 'started' | 'paused' | 'completed';
    notes: string | null;
    // Cost breakdown
    fuelCost: number;
    fuelLiters: number;
    laborCost: number;
    hotelCost: number;
    totalCost: number;
}

export interface InstallerVehicle {
    id: string;
    teamId: string;
    licensePlate: string;
    vehicleName: string | null;
    isDefault: boolean;
}

const mapSession = (row: any): WorkSession => ({
    id: row.id,
    teamId: row.team_id,
    leaderUserId: row.leader_user_id,
    sessionDate: row.session_date,
    installationId: row.installation_id || null,
    crewMembers: typeof row.crew_members === 'string' ? JSON.parse(row.crew_members) : (row.crew_members || []),
    crewRates: typeof row.crew_rates === 'string' ? JSON.parse(row.crew_rates) : (row.crew_rates || []),
    crewConfirmed: row.crew_confirmed,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    breakMinutes: row.break_minutes || 0,
    driveToBase: row.drive_to_base || false,
    driveToHotel: row.drive_to_hotel || false,
    totalWorkMinutes: row.total_work_minutes,
    status: row.status,
    notes: row.notes,
    fuelCost: parseFloat(row.fuel_cost) || 0,
    fuelLiters: parseFloat(row.fuel_liters) || 0,
    laborCost: parseFloat(row.labor_cost) || 0,
    hotelCost: parseFloat(row.hotel_cost) || 0,
    totalCost: parseFloat(row.total_cost) || 0,
});

export const InstallerSessionService = {
    // Get or create today's session for a team
    async getTodaySession(teamId: string, leaderUserId: string): Promise<WorkSession | null> {
        const client = getClient();
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
            .from('installer_work_sessions')
            .select('*')
            .eq('team_id', teamId)
            .eq('session_date', today)
            .maybeSingle();

        if (error) throw error;
        return data ? mapSession(data) : null;
    },

    // Create today's session with crew and link to installation
    async createSession(
        teamId: string,
        leaderUserId: string,
        crewMembers: CrewMember[],
        installationId?: string
    ): Promise<WorkSession> {
        const client = getClient();
        const today = new Date().toISOString().split('T')[0];

        // Snapshot crew rates at session creation time
        const crewRates = crewMembers.map(m => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            hourlyRate: m.hourlyRate || 0,
        }));

        const { data, error } = await client
            .from('installer_work_sessions')
            .insert({
                team_id: teamId,
                leader_user_id: leaderUserId,
                session_date: today,
                crew_members: crewMembers,
                crew_rates: crewRates,
                crew_confirmed: true,
                installation_id: installationId || null,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return mapSession(data);
    },

    // Update crew members (before starting)
    async updateCrew(sessionId: string, crewMembers: CrewMember[]): Promise<void> {
        const client = getClient();
        const crewRates = crewMembers.map(m => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            hourlyRate: m.hourlyRate || 0,
        }));

        const { error } = await client
            .from('installer_work_sessions')
            .update({
                crew_members: crewMembers,
                crew_rates: crewRates,
                crew_confirmed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

        if (error) throw error;
    },

    // Link session to installation
    async linkInstallation(sessionId: string, installationId: string): Promise<void> {
        const client = getClient();
        const { error } = await client
            .from('installer_work_sessions')
            .update({ installation_id: installationId, updated_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;
    },

    // Start the day
    async startDay(sessionId: string): Promise<WorkSession> {
        const client = getClient();
        const { data, error } = await client
            .from('installer_work_sessions')
            .update({
                started_at: new Date().toISOString(),
                status: 'started',
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) throw error;
        return mapSession(data);
    },

    // End the day — calculate labor cost from crew rates × hours
    async endDay(sessionId: string, driveToBase: boolean, hotelCost?: number): Promise<WorkSession> {
        const client = getClient();

        // Get session to calculate duration
        const { data: session } = await client
            .from('installer_work_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!session?.started_at) throw new Error('Session not started');

        const startedAt = new Date(session.started_at);
        const endedAt = new Date();
        const totalMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
        const workMinutes = totalMinutes - (session.break_minutes || 0);
        const workHours = workMinutes / 60;

        // Calculate labor cost from crew rates
        const crewRates = typeof session.crew_rates === 'string'
            ? JSON.parse(session.crew_rates)
            : (session.crew_rates || []);

        const laborCost = crewRates.reduce((sum: number, m: any) => {
            return sum + (workHours * (m.hourlyRate || 0));
        }, 0);

        const fuelCost = parseFloat(session.fuel_cost) || 0;
        const hotel = hotelCost || 0;
        const totalCostValue = laborCost + fuelCost + hotel;

        const { data, error } = await client
            .from('installer_work_sessions')
            .update({
                ended_at: endedAt.toISOString(),
                drive_to_base: driveToBase,
                drive_to_hotel: !driveToBase,
                total_work_minutes: workMinutes,
                labor_cost: Math.round(laborCost * 100) / 100,
                hotel_cost: hotel,
                total_cost: Math.round(totalCostValue * 100) / 100,
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) throw error;
        const result = mapSession(data);

        // Auto-push costs to installation if linked
        if (result.installationId) {
            await this.syncCostsToInstallation(result.installationId);
        }

        return result;
    },

    // Restart day — undo accidental end, reset to 'started' with fresh startedAt
    async restartDay(sessionId: string): Promise<WorkSession> {
        const client = getClient();
        const { data, error } = await client
            .from('installer_work_sessions')
            .update({
                started_at: new Date().toISOString(),
                ended_at: null,
                status: 'started',
                total_work_minutes: null,
                labor_cost: 0,
                total_cost: 0,
                drive_to_base: false,
                drive_to_hotel: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) throw error;
        return mapSession(data);
    },

    // Aggregate all session costs for an installation and push to installation financials
    async syncCostsToInstallation(installationId: string): Promise<void> {
        const client = getClient();

        // Get all completed sessions for this installation
        const { data: sessions, error } = await client
            .from('installer_work_sessions')
            .select('labor_cost, fuel_cost, hotel_cost, total_cost')
            .eq('installation_id', installationId)
            .eq('status', 'completed');

        if (error) {
            console.error('syncCostsToInstallation error:', error);
            return;
        }

        // Aggregate costs
        const totals = (sessions || []).reduce((acc, s) => ({
            laborCost: acc.laborCost + (parseFloat(s.labor_cost) || 0),
            fuelCost: acc.fuelCost + (parseFloat(s.fuel_cost) || 0),
            hotelCost: acc.hotelCost + (parseFloat(s.hotel_cost) || 0),
            totalCost: acc.totalCost + (parseFloat(s.total_cost) || 0),
        }), { laborCost: 0, fuelCost: 0, hotelCost: 0, totalCost: 0 });

        // Push to installation
        const { error: updateError } = await client
            .from('installations')
            .update({
                hotel_cost: Math.round(totals.hotelCost * 100) / 100,
                consumables_cost: Math.round(totals.fuelCost * 100) / 100,
                additional_costs: Math.round(totals.laborCost * 100) / 100,
            })
            .eq('id', installationId);

        if (updateError) {
            console.error('Failed to push costs to installation:', updateError);
        }
    },

    // Update fuel for a session
    async updateFuel(sessionId: string, fuelLiters: number, fuelCost: number): Promise<void> {
        const client = getClient();

        // Recalculate total cost
        const { data: session } = await client
            .from('installer_work_sessions')
            .select('labor_cost, hotel_cost, installation_id')
            .eq('id', sessionId)
            .single();

        const laborCost = parseFloat(session?.labor_cost) || 0;
        const hotelCost = parseFloat(session?.hotel_cost) || 0;
        const totalCostValue = laborCost + fuelCost + hotelCost;

        const { error } = await client
            .from('installer_work_sessions')
            .update({
                fuel_liters: fuelLiters,
                fuel_cost: fuelCost,
                total_cost: Math.round(totalCostValue * 100) / 100,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

        if (error) throw error;

        // Auto-sync costs to installation
        if (session?.installation_id) {
            await this.syncCostsToInstallation(session.installation_id);
        }
    },

    // Get sessions for date range (for weekly calendar)
    async getWeekSessions(teamId: string, startDate: string, endDate: string): Promise<WorkSession[]> {
        const client = getClient();
        const { data, error } = await client
            .from('installer_work_sessions')
            .select('*')
            .eq('team_id', teamId)
            .gte('session_date', startDate)
            .lte('session_date', endDate)
            .order('session_date');

        if (error) throw error;
        return (data || []).map(mapSession);
    },

    // Get all sessions for an installation (for cost report)
    async getInstallationSessions(installationId: string): Promise<WorkSession[]> {
        const client = getClient();
        const { data, error } = await client
            .from('installer_work_sessions')
            .select('*')
            .eq('installation_id', installationId)
            .order('session_date');

        if (error) throw error;
        return (data || []).map(mapSession);
    },

    // Get all sessions for all teams (admin report)
    async getAllSessions(startDate?: string, endDate?: string): Promise<WorkSession[]> {
        const client = getClient();
        let query = client
            .from('installer_work_sessions')
            .select('*')
            .order('session_date', { ascending: false });

        if (startDate) query = query.gte('session_date', startDate);
        if (endDate) query = query.lte('session_date', endDate);

        const { data, error } = await query.limit(200);
        if (error) throw error;
        return (data || []).map(mapSession);
    },

    // === Vehicles ===
    async getTeamVehicles(teamId: string): Promise<InstallerVehicle[]> {
        const client = getClient();
        const { data, error } = await client
            .from('installer_vehicles')
            .select('*')
            .eq('team_id', teamId)
            .order('is_default', { ascending: false });

        if (error) throw error;
        return (data || []).map((v: any) => ({
            id: v.id,
            teamId: v.team_id,
            licensePlate: v.license_plate,
            vehicleName: v.vehicle_name,
            isDefault: v.is_default,
        }));
    },

    async addVehicle(teamId: string, licensePlate: string, vehicleName?: string): Promise<InstallerVehicle> {
        const client = getClient();
        const { data, error } = await client
            .from('installer_vehicles')
            .insert({
                team_id: teamId,
                license_plate: licensePlate,
                vehicle_name: vehicleName || null,
                is_default: false,
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            teamId: data.team_id,
            licensePlate: data.license_plate,
            vehicleName: data.vehicle_name,
            isDefault: data.is_default,
        };
    },
};
