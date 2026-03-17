import { supabase } from '../../lib/supabase';

/**
 * Smart Lead Auto-Assignment Service
 * 
 * Assigns unassigned leads to sales reps based on:
 * 1. PLZ clustering — prefers reps who already have leads in the same postal code area
 * 2. Workload balancing — avoids overloading reps with too many active leads
 * 3. Round-robin fallback — if no PLZ match, assigns to the rep with fewest active leads
 * 
 * IMPORTANT: Never changes existing assignments. Only assigns leads with assigned_to = NULL.
 */
export const LeadAutoAssignService = {

    /**
     * Find the best sales rep for a lead based on PLZ + workload
     * Returns the user ID of the best rep, or null if no reps available
     */
    async findBestRep(postalCode?: string): Promise<string | null> {
        try {
            // 1. Get designated auto-assign reps only
            const AUTO_ASSIGN_REPS = [
                '4e151d84-8cae-4ec8-90c4-a3bd46365b40', // Oliwia Duz
                '0375aad6-5e1b-43c1-82c1-640f8cb7feb9', // Mike Ledwin
                '15fb3c80-269f-42eb-8dcd-be11ed8153b1', // Hubert Kosciow
                'ef37f787-e9e9-4fbb-9f3f-9ef653e3c91c', // Artur Nagorny
            ];
            const { data: reps } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('id', AUTO_ASSIGN_REPS)
                .neq('status', 'blocked');

            if (!reps || reps.length === 0) return null;

            const repIds = reps.map(r => r.id);

            // 2. Get active lead counts per rep (not won/lost)
            const { data: leadCounts } = await supabase
                .from('leads')
                .select('assigned_to')
                .in('assigned_to', repIds)
                .not('status', 'in', '("won","lost")');

            const workload = new Map<string, number>();
            repIds.forEach(id => workload.set(id, 0));
            (leadCounts || []).forEach(l => {
                if (l.assigned_to) {
                    workload.set(l.assigned_to, (workload.get(l.assigned_to) || 0) + 1);
                }
            });

            // 3. PLZ clustering: if postalCode provided, find reps with most leads in same PLZ prefix
            const plzPrefix = postalCode ? postalCode.substring(0, 2) : null;
            let plzScores = new Map<string, number>();

            if (plzPrefix && plzPrefix.length >= 2) {
                const { data: plzLeads } = await supabase
                    .from('leads')
                    .select('assigned_to, customer_data')
                    .in('assigned_to', repIds)
                    .not('status', 'in', '("won","lost")');

                (plzLeads || []).forEach(l => {
                    if (l.assigned_to && l.customer_data?.postalCode) {
                        const prefix = l.customer_data.postalCode.substring(0, 2);
                        if (prefix === plzPrefix) {
                            plzScores.set(l.assigned_to, (plzScores.get(l.assigned_to) || 0) + 1);
                        }
                    }
                });
            }

            // 4. Score each rep: PLZ bonus + inverse workload
            const MAX_ACTIVE = 25; // Skip reps with more than this
            const scored = repIds
                .filter(id => (workload.get(id) || 0) < MAX_ACTIVE)
                .map(id => ({
                    id,
                    plzScore: plzScores.get(id) || 0,
                    workload: workload.get(id) || 0,
                    // Higher = better: PLZ proximity * 3 - workload penalty
                    totalScore: (plzScores.get(id) || 0) * 3 - (workload.get(id) || 0)
                }))
                .sort((a, b) => {
                    // Primary: PLZ score (descending)
                    if (a.plzScore !== b.plzScore) return b.plzScore - a.plzScore;
                    // Secondary: Workload (ascending — fewer leads = better)
                    return a.workload - b.workload;
                });

            if (scored.length === 0) return null;

            const best = scored[0];
            const repName = reps.find(r => r.id === best.id)?.full_name || 'Unknown';

            return best.id;
        } catch (err) {
            console.error('[AutoAssign] Error finding best rep:', err);
            return null;
        }
    },

    /**
     * Auto-assign a specific lead if it has no owner
     * Returns the assigned rep ID or null
     */
    async autoAssignLead(leadId: string): Promise<string | null> {
        try {
            // Check if lead already has an owner
            const { data: lead } = await supabase
                .from('leads')
                .select('assigned_to, customer_data, status')
                .eq('id', leadId)
                .single();

            if (!lead || lead.assigned_to) return null; // Already assigned

            const postalCode = lead.customer_data?.postalCode;
            const bestRep = await this.findBestRep(postalCode);

            if (!bestRep) return null;

            // Assign
            const { error } = await supabase
                .from('leads')
                .update({ assigned_to: bestRep, updated_at: new Date().toISOString() })
                .eq('id', leadId)
                .is('assigned_to', null); // Safety: only if still unassigned

            if (error) {
                console.error('[AutoAssign] Failed to assign:', error);
                return null;
            }

            // Send notification to the assigned rep
            try {
                const { data: creatorProfile } = await supabase.from('profiles').select('full_name').eq('id', bestRep).maybeSingle();
                const customerName = lead.customer_data?.lastName
                    ? `${lead.customer_data.firstName || ''} ${lead.customer_data.lastName}`.trim()
                    : 'Nowy klient';
                const plz = lead.customer_data?.postalCode || '';

                await supabase.from('notifications').insert({
                    user_id: bestRep,
                    type: 'info',
                    title: '📋 Nowy lead przypisany automatycznie',
                    message: `${customerName}${plz ? ` • PLZ ${plz}` : ''} • Status: ${lead.status}`,
                    link: `/leads`
                });
            } catch { /* notification failure is non-critical */ }

            return bestRep;
        } catch (err) {
            console.error('[AutoAssign] Error:', err);
            return null;
        }
    },

    /**
     * Batch auto-assign all unassigned leads in early pipeline stages
     * Call this from admin panel or scheduled job
     */
    async autoAssignUnassignedLeads(): Promise<{ assigned: number; errors: number }> {
        let assigned = 0;
        let errors = 0;

        try {
            const { data: unassigned } = await supabase
                .from('leads')
                .select('id')
                .is('assigned_to', null)
                .in('status', ['new', 'formularz', 'contacted'])
                .order('created_at', { ascending: true });

            if (!unassigned || unassigned.length === 0) return { assigned: 0, errors: 0 };

            for (const lead of unassigned) {
                const result = await this.autoAssignLead(lead.id);
                if (result) assigned++;
                else errors++;
            }
        } catch (err) {
            console.error('[AutoAssign] Batch error:', err);
        }

        return { assigned, errors };
    }
};
