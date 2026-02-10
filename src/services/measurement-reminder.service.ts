import { supabase } from '../lib/supabase';
import type { Measurement, Lead, LeadStatus } from '../types';
import { LeadService } from './database/lead.service';
import { TaskService } from './database/task.service';

export interface PendingMeasurement extends Measurement {
    lead?: Lead;
}

export type MeasurementOutcome = 'signed' | 'considering' | 'rejected' | 'no_show';

export class MeasurementReminderService {
    /**
     * Get measurements that are completed but don't have outcome filled
     */
    static async getPendingMeasurements(): Promise<PendingMeasurement[]> {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('measurements')
                .select(`
                    *,
                    lead:leads(*)
                `)
                .lte('scheduled_date', yesterday.toISOString())
                .is('outcome', null)
                .eq('reminder_sent', false)
                .order('scheduled_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching pending measurements:', error);
            return [];
        }
    }

    /**
     * Send reminder notification to user about pending measurement
     */
    static async sendReminder(measurementId: string): Promise<void> {
        try {
            const { data: measurement, error: fetchError } = await supabase
                .from('measurements')
                .select(`
                    *,
                    lead:leads(*),
                    assigned_user:profiles(*)
                `)
                .eq('id', measurementId)
                .single();

            if (fetchError) throw fetchError;

            // Create notification
            await supabase
                .from('notifications')
                .insert({
                    user_id: measurement.assigned_to,
                    title: 'Uzupełnij dane pomiaru',
                    message: `Pomiar u ${measurement.lead?.name || 'klienta'} - uzupełnij km i wynik`,
                    type: 'measurement_reminder',
                    link: `/measurements/${measurementId}/outcome`,
                    read: false
                });

            // Mark reminder as sent
            await supabase
                .from('measurements')
                .update({ reminder_sent: true })
                .eq('id', measurementId);

        } catch (error) {
            console.error('Error sending reminder:', error);
            throw error;
        }
    }

    /**
     * Update measurement outcome and automatically move lead in Kanban
     */
    static async updateMeasurementOutcome(
        measurementId: string,
        outcome: MeasurementOutcome,
        notes?: string
    ): Promise<void> {
        try {
            // 1. Get measurement with lead
            const { data: measurement, error: fetchError } = await supabase
                .from('measurements')
                .select('*, lead:leads(*)')
                .eq('id', measurementId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Update measurement
            await supabase
                .from('measurements')
                .update({
                    outcome,
                    outcome_notes: notes,
                    completed_at: new Date().toISOString()
                })
                .eq('id', measurementId);

            // 3. Update lead status based on outcome
            if (measurement.lead_id) {
                await this.updateLeadAfterMeasurement(measurement.lead_id, outcome);
            }

        } catch (error) {
            console.error('Error updating measurement outcome:', error);
            throw error;
        }
    }

    /**
     * Automatically update lead status based on measurement outcome
     */
    static async updateLeadAfterMeasurement(
        leadId: string,
        outcome: MeasurementOutcome
    ): Promise<void> {
        try {
            const outcomeToStatusMap: Record<MeasurementOutcome, LeadStatus> = {
                'signed': 'won',
                'considering': 'measurement_completed',
                'rejected': 'lost',
                'no_show': 'measurement_scheduled' // Keep in scheduled, needs rescheduling
            };

            const newStatus = outcomeToStatusMap[outcome];

            // Update lead status
            await LeadService.updateLead(leadId, {
                status: newStatus,
                updated_at: new Date().toISOString()
            });

            // If considering, create follow-up task
            if (outcome === 'considering') {
                const { data: lead } = await supabase
                    .from('leads')
                    .select('*, assigned_to')
                    .eq('id', leadId)
                    .single();

                if (lead) {
                    const followUpDate = new Date();
                    followUpDate.setDate(followUpDate.getDate() + 3); // Follow up in 3 days

                    await TaskService.createTask({
                        title: `Follow-up po pomiarze - ${lead.name}`,
                        description: 'Klient zastanawia się nad ofertą. Skontaktuj się ponownie.',
                        lead_id: leadId,
                        assigned_to: lead.assigned_to,
                        due_date: followUpDate.toISOString(),
                        priority: 'high',
                        status: 'pending'
                    });
                }
            }

        } catch (error) {
            console.error('Error updating lead after measurement:', error);
            throw error;
        }
    }

    /**
     * Check all pending measurements and send reminders
     * This should be called by a cron job daily
     */
    static async checkAndSendReminders(): Promise<{
        sent: number;
        failed: number;
    }> {
        try {
            const pendingMeasurements = await this.getPendingMeasurements();

            let sent = 0;
            let failed = 0;

            for (const measurement of pendingMeasurements) {
                try {
                    await this.sendReminder(measurement.id);
                    sent++;
                } catch (error) {
                    console.error(`Failed to send reminder for measurement ${measurement.id}:`, error);
                    failed++;
                }
            }

            return { sent, failed };
        } catch (error) {
            console.error('Error in checkAndSendReminders:', error);
            return { sent: 0, failed: 0 };
        }
    }

    /**
     * Get measurements with outcomes for reporting
     */
    static async getMeasurementOutcomes(startDate: string, endDate: string): Promise<{
        signed: number;
        considering: number;
        rejected: number;
        no_show: number;
        pending: number;
    }> {
        try {
            const { data, error } = await supabase
                .from('measurements')
                .select('outcome')
                .gte('scheduled_date', startDate)
                .lte('scheduled_date', endDate);

            if (error) throw error;

            const outcomes = (data || []).reduce((acc, m) => {
                if (m.outcome) {
                    acc[m.outcome as MeasurementOutcome]++;
                } else {
                    acc.pending++;
                }
                return acc;
            }, {
                signed: 0,
                considering: 0,
                rejected: 0,
                no_show: 0,
                pending: 0
            });

            return outcomes;
        } catch (error) {
            console.error('Error fetching measurement outcomes:', error);
            return {
                signed: 0,
                considering: 0,
                rejected: 0,
                no_show: 0,
                pending: 0
            };
        }
    }
}
