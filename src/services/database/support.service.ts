import { supabase } from '../../lib/supabase';
import { TaskService } from './task.service';
import type { FailureReport, FailureReportStatus, FuelLog } from '../../types';
import { PostgrestError } from '@supabase/supabase-js';
import { FuelPriceService } from '../fuel-price.service';

export const SupportService = {
    // --- Failure Reports ---
    async createFailureReport(
        report: Omit<FailureReport, 'id' | 'createdAt' | 'updatedAt' | 'user'>,
        photoFile?: File
    ): Promise<{ error: PostgrestError | null }> {
        try {
            let photoUrl: string | undefined;

            // Upload photo if provided
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt} `;
                const filePath = `${report.userId} / ${fileName}`;

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

            if (!error) {
                // Auto-create a task for the manager (assigned to the reporter for now, visible to admins)
                try {
                    await TaskService.createTask({
                        title: `🔴 AWARIA: ${report.equipmentName}`,
                        description: `Zgłoszono awarię sprzętu.\nOpis: ${report.description}\nZdjęcie: ${photoUrl || 'Brak'}\nZgłaszający ID: ${report.userId}`,
                        status: 'pending',
                        priority: 'high',
                        type: 'other',
                        dueDate: new Date().toISOString(),
                        userId: report.userId // Assigned to reporter, but admins see all
                    });
                } catch (taskError) {
                    console.error('Failed to auto-create task for failure report:', taskError);
                    // Don't block the main flow if task creation fails
                }
            }

            return { error };
        } catch (error) {
            return { error: error as PostgrestError };
        }
    },

    async getFailureReports(userId?: string): Promise<FailureReport[]> {
        let query = supabase
            .from('failure_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual join for profiles
        const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
        const profileMap = new Map<string, { full_name: string }>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            profiles?.forEach(p => profileMap.set(p.id, p));
        }

        return data.map(row => {
            const profile = profileMap.get(row.user_id);
            return {
                id: row.id,
                userId: row.user_id,
                equipmentName: row.equipment_name,
                description: row.description,
                photoUrl: row.photo_url,
                status: row.status,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
                user: profile ? {
                    firstName: (profile.full_name || '').split(' ')[0] || '',
                    lastName: (profile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined
            };
        });
    },

    async updateFailureReportStatus(id: string, status: FailureReportStatus): Promise<{ error: PostgrestError | null }> {
        const { error } = await supabase
            .from('failure_reports')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        return { error };
    },

    // --- Fuel Logs ---
    async createFuelLog(log: Omit<FuelLog, 'id' | 'createdAt' | 'user'>): Promise<{ error: PostgrestError | null }> {
        const { error } = await supabase
            .from('fuel_logs')
            .insert({
                user_id: log.userId,
                vehicle_plate: log.vehiclePlate,
                odometer_reading: log.odometerReading || null,
                odometer_photo_url: log.odometerPhotoUrl || null,
                receipt_photo_url: log.receiptPhotoUrl || null,
                liters: log.liters,
                cost: log.cost || null,
                net_cost: log.netCost || null,
                currency: log.currency,
                log_date: log.logDate,
                type: log.type,
                fueling_type: log.fuelingType || 'external',
                station_name: log.stationName || null,
            });
        return { error };
    },

    async getFuelLogs(userId?: string): Promise<FuelLog[]> {
        let query = supabase
            .from('fuel_logs')
            .select('*')
            .order('log_date', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual join for profiles
        const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
        const profileMap = new Map<string, { full_name: string }>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            profiles?.forEach(p => profileMap.set(p.id, p));
        }

        return data.map(row => {
            const profile = profileMap.get(row.user_id);
            const profileName = profile?.full_name || '';
            const fallbackName = [row.first_name, row.last_name].filter(Boolean).join(' ');
            const displayName = profileName || fallbackName || 'Nieznany';
            return {
                id: row.id,
                userId: row.user_id,
                vehiclePlate: row.vehicle_plate,
                odometerReading: row.odometer_reading,
                odometerPhotoUrl: row.odometer_photo_url,
                receiptPhotoUrl: row.receipt_photo_url,
                liters: row.liters,
                cost: row.cost,
                netCost: row.net_cost,
                currency: row.currency,
                logDate: row.log_date,
                type: row.type,
                fuelingType: row.fueling_type || 'external',
                stationName: row.station_name,
                userName: displayName,
                createdAt: new Date(row.created_at),
                user: profile ? {
                    firstName: (profile.full_name || '').split(' ')[0] || '',
                    lastName: (profile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : fallbackName ? {
                    firstName: row.first_name || '',
                    lastName: row.last_name || ''
                } : undefined
            };
        });
    },

    async getFuelStats(month: number, year: number): Promise<{
        byUser: { userId: string; userName: string; totalLiters: number; totalCost: number; totalCostPLN: number; totalCostEUR: number; internalCount: number; externalCount: number; entries: number }[];
        totals: { totalLiters: number; totalCost: number; totalCostPLN: number; totalCostEUR: number; totalEntries: number };
    }> {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endMonth = month === 12 ? 1 : month + 1;
        const endYear = month === 12 ? year + 1 : year;
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

        // Fetch logs and prices in parallel
        const [logsResult, fuelPrices] = await Promise.all([
            supabase
                .from('fuel_logs')
                .select('*')
                .gte('log_date', startDate)
                .lt('log_date', endDate)
                .order('log_date', { ascending: false }),
            FuelPriceService.getAllPricesSorted()
        ]);

        const { data, error } = logsResult;
        if (error) throw error;
        if (!data || data.length === 0) return { byUser: [], totals: { totalLiters: 0, totalCost: 0, totalCostPLN: 0, totalCostEUR: 0, totalEntries: 0 } };

        // Fetch profiles
        const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
        const profileMap = new Map<string, string>();
        if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
            profiles?.forEach(p => profileMap.set(p.id, p.full_name || 'Nieznany'));
        }

        // Aggregate by user — use historical prices for internal fueling
        const userStats = new Map<string, { totalLiters: number; totalCost: number; totalCostPLN: number; totalCostEUR: number; internalCount: number; externalCount: number; entries: number }>();
        let totalLiters = 0, totalCost = 0, totalCostPLN = 0, totalCostEUR = 0;

        for (const row of data) {
            const uid = row.user_id;
            const existing = userStats.get(uid) || { totalLiters: 0, totalCost: 0, totalCostPLN: 0, totalCostEUR: 0, internalCount: 0, externalCount: 0, entries: 0 };
            const liters = Number(row.liters) || 0;
            existing.totalLiters += liters;

            // Calculate cost:
            // - External fueling: use the user-entered cost
            // - Internal fueling (company card): calculate from liters × historical price
            let logCost = Number(row.cost) || Number(row.net_cost) || 0;
            if (logCost === 0 && liters > 0 && row.fueling_type === 'internal') {
                // Look up price for this log's date from the pre-fetched price list
                const pricePerLiter = FuelPriceService.getPriceForDateFromList(row.log_date, fuelPrices);
                if (pricePerLiter) {
                    logCost = liters * pricePerLiter;
                }
            }

            // Internal fueling is always PLN, external uses its stored currency
            const logCurrency = row.fueling_type === 'internal' ? 'PLN' : (row.currency || 'PLN');
            if (logCurrency === 'PLN') {
                existing.totalCostPLN += logCost;
                totalCostPLN += logCost;
            } else {
                existing.totalCostEUR += logCost;
                totalCostEUR += logCost;
            }

            existing.totalCost += logCost;
            existing.entries += 1;
            if (row.fueling_type === 'internal') existing.internalCount++; else existing.externalCount++;
            userStats.set(uid, existing);
            totalLiters += liters;
            totalCost += logCost;
        }

        const byUser = Array.from(userStats.entries()).map(([userId, stats]) => ({
            userId,
            userName: profileMap.get(userId) || 'Nieznany',
            ...stats,
        })).sort((a, b) => b.totalCost - a.totalCost);

        return { byUser, totals: { totalLiters, totalCost, totalCostPLN, totalCostEUR, totalEntries: data.length } };
    },
};
