import type { Installation, InstallationTeam } from '../types';

export interface ScheduleSuggestion {
    date: string; // YYYY-MM-DD
    teamId: string;
    score: number; // 0-100
    reason: string;
    distance?: number;
}

export class SchedulerService {

    // Core function to find best slots
    static findOptimalSlots(
        targetInstallation: Installation,
        existingInstallations: Installation[],
        teams: InstallationTeam[],
        startDate: Date = new Date(), // Search from
        daysToScan: number = 30
    ): ScheduleSuggestion[] {
        const suggestions: ScheduleSuggestion[] = [];

        if (!targetInstallation.client.coordinates) {
            return []; // Cannot score without location
        }

        const duration = targetInstallation.expectedDuration || 1;
        const targetLat = targetInstallation.client.coordinates.lat;
        const targetLng = targetInstallation.client.coordinates.lng;

        // Iterate over next X days
        for (let i = 1; i <= daysToScan; i++) {
            const checkDate = new Date(startDate);
            checkDate.setDate(startDate.getDate() + i);

            // Skip weekends if needed (optional logic, for now we allow all days)
            const dateStr = checkDate.toISOString().split('T')[0];

            // Check each team
            for (const team of teams) {
                // Check if team is available for 'duration' days starting from checkDate
                if (this.isTeamAvailable(team.id, dateStr, duration, existingInstallations)) {

                    // Calculate score
                    const { score, reason, distance } = this.calculateScore(
                        targetLat,
                        targetLng,
                        dateStr,
                        team.id,
                        existingInstallations
                    );

                    if (score > 0) {
                        suggestions.push({
                            date: dateStr,
                            teamId: team.id,
                            score,
                            reason,
                            distance
                        });
                    }
                }
            }
        }

        // Sort by score descending
        return suggestions.sort((a, b) => b.score - a.score).slice(0, 5); // Return top 5
    }

    private static isTeamAvailable(
        teamId: string,
        startDateStr: string,
        duration: number,
        installations: Installation[]
    ): boolean {
        // Need to check availability for [startDateStr ... startDateStr + duration - 1]
        const start = new Date(startDateStr);

        for (let d = 0; d < duration; d++) {
            const current = new Date(start);
            current.setDate(start.getDate() + d);
            const currentStr = current.toISOString().split('T')[0];

            // Check if ANY installation overlaps with this day for this team
            const conflict = installations.some(inst => {
                if (inst.teamId !== teamId || inst.status === 'cancelled' || !inst.scheduledDate) return false;

                // Check overlap
                // Inst start
                const instStart = new Date(inst.scheduledDate);
                const instDur = inst.expectedDuration || 1;

                // Check if currentStr is within [instStart, instStart + instDur]
                // Simplest: generate all dates for inst
                for (let k = 0; k < instDur; k++) {
                    const occupiedDate = new Date(instStart);
                    occupiedDate.setDate(instStart.getDate() + k);
                    if (occupiedDate.toISOString().split('T')[0] === currentStr) {
                        return true;
                    }
                }
                return false;
            });

            if (conflict) return false;
        }

        return true;
    }

    private static calculateScore(
        lat: number,
        lng: number,
        dateStr: string,
        teamId: string,
        installations: Installation[]
    ): { score: number, reason: string, distance?: number } {

        // Base score for availability
        let score = 50;
        const reasons: string[] = ['Dostępny termin'];

        // Check surrounding jobs for this team (Cluster bonus)
        // Check -1 day and +1 day (or same day if we allowed multiple/day but we don't usually)

        const check = new Date(dateStr);
        const prevDay = new Date(check); prevDay.setDate(check.getDate() - 1);
        const nextDay = new Date(check); nextDay.setDate(check.getDate() + 1);

        const prevDayStr = prevDay.toISOString().split('T')[0];
        const nextDayStr = nextDay.toISOString().split('T')[0];

        const nearbyJobs = installations.filter(inst =>
            inst.teamId === teamId &&
            inst.client.coordinates &&
            inst.status !== 'cancelled' &&
            inst.scheduledDate &&
            (inst.scheduledDate.startsWith(prevDayStr) || inst.scheduledDate.startsWith(nextDayStr))
        );

        let minDistance = 9999;

        if (nearbyJobs.length > 0) {
            // Find closest job
            nearbyJobs.forEach(job => {
                const dist = this.getDistanceFromLatLonInKm(
                    lat, lng,
                    job.client.coordinates!.lat, job.client.coordinates!.lng
                );
                if (dist < minDistance) minDistance = dist;
            });

            // Bonus for proximity
            if (minDistance < 20) {
                score += 40;
                reasons.push(`Zespół jest ${Math.round(minDistance)}km obok dzień wcześniej/później`);
            } else if (minDistance < 50) {
                score += 20;
                reasons.push(`Zespół w okolicy (${Math.round(minDistance)}km)`);
            }
        } else {
            // No nearby jobs -> Check distance from HQ (Assume center of Poland/Warsaw for now or 52,19)
            // Or just give standard score
            reasons.push('Start z bazy');
        }

        return {
            score,
            reason: reasons.join(', '),
            distance: minDistance < 9999 ? minDistance : undefined
        };
    }

    private static getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private static deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    // New Batch Scheduling Logic
    static scheduleBatch(
        installationsToSchedule: Installation[],
        existingInstallations: Installation[],
        teams: InstallationTeam[],
        startDate: Date = new Date(),
        daysToScan: number = 60 // Look further ahead for bulk
    ): { success: boolean; updates: { id: string; scheduledDate: string; teamId: string }[]; failedIds: string[] } {

        // 1. Sort installations to schedule? 
        // Strategy: Group by location (Cluster) could be better, but for now specific order or just simple greedy.
        // Let's sort by "Parts Ready" first, then generic.
        const queue = [...installationsToSchedule]
            .filter(inst => inst.partsReady) // Strict requirement: Only schedule if parts are ready
            .sort((a, b) => { // Keep sort just in case
                if (a.partsReady && !b.partsReady) return -1;
                if (!a.partsReady && b.partsReady) return 1;
                return 0;
            });

        const updates: { id: string; scheduledDate: string; teamId: string }[] = [];
        const failedIds: string[] = [];

        // Virtual timeline including existing jobs + new planned ones
        const virtualContext = [...existingInstallations];

        // Loop through queue
        for (const inst of queue) {
            // Find best slot given the CURRENT virtual context
            const suggestions = this.findOptimalSlots(inst, virtualContext, teams, startDate, daysToScan);

            if (suggestions.length > 0) {
                // Pick the best one (Score #1)
                const bestSlot = suggestions[0];

                // Add to updates
                updates.push({
                    id: inst.id,
                    scheduledDate: bestSlot.date,
                    teamId: bestSlot.teamId
                });

                // Add to virtual context so next iteration sees it as busy
                virtualContext.push({
                    ...inst,
                    scheduledDate: bestSlot.date,
                    teamId: bestSlot.teamId,
                    status: 'scheduled'
                });
            } else {
                failedIds.push(inst.id);
            }
        }

        return {
            success: failedIds.length === 0,
            updates,
            failedIds
        };
    }
}
