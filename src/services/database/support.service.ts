import { supabase } from '../../lib/supabase';
import { TaskService } from './task.service';
import type { FailureReport, FailureReportStatus, FuelLog } from '../../types';
import { PostgrestError } from '@supabase/supabase-js';

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
            return {
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
                user: profile ? {
                    firstName: (profile.full_name || '').split(' ')[0] || '',
                    lastName: (profile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined
            };
        });
    },
};
