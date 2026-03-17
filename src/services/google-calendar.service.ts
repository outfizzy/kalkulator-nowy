import type { Installation } from '../types';

/**
 * Google Calendar Sync Service
 * 
 * Frontend service for syncing installations with Google Calendar.
 * All operations are fire-and-forget — failures are logged but never block the main flow.
 */
export const GoogleCalendarService = {
    /**
     * Check if Google Calendar is connected
     */
    async isConnected(): Promise<boolean> {
        try {
            const res = await fetch('/api/google-calendar/sync?action=status');
            if (!res.ok) return false;
            const data = await res.json();
            return data.connected === true;
        } catch {
            return false;
        }
    },

    /**
     * Start OAuth flow — redirects the browser to Google consent screen
     */
    startAuth(returnUrl: string = '/settings') {
        window.location.href = `/api/google-calendar/auth?returnUrl=${encodeURIComponent(returnUrl)}`;
    },

    /**
     * Sync an installation to Google Calendar (create or update)
     * Fire-and-forget: never throws
     */
    async syncInstallation(installation: Installation, googleEventId?: string | null): Promise<string | null> {
        if (!installation.scheduledDate) return null;

        try {
            const res = await fetch('/api/google-calendar/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    installation: {
                        id: installation.id,
                        client: installation.client,
                        contractNumber: installation.contractNumber,
                        productSummary: installation.productSummary,
                        status: installation.status,
                        scheduledDate: installation.scheduledDate,
                        expectedDuration: installation.expectedDuration || 1,
                        sourceType: installation.sourceType,
                        title: installation.title,
                        notes: installation.notes,
                    },
                    googleEventId: googleEventId || null,
                }),
            });

            if (!res.ok) {
                console.warn('[GCal] Sync failed:', await res.text());
                return null;
            }

            const data = await res.json();
            console.log(`[GCal] Event ${data.action}: ${data.eventId}`);
            return data.eventId || null;
        } catch (err) {
            console.warn('[GCal] Sync error (non-blocking):', err);
            return null;
        }
    },

    /**
     * Delete a Google Calendar event
     * Fire-and-forget: never throws
     */
    async deleteEvent(googleEventId: string): Promise<void> {
        if (!googleEventId) return;

        try {
            await fetch('/api/google-calendar/sync', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleEventId }),
            });
            console.log(`[GCal] Event deleted: ${googleEventId}`);
        } catch (err) {
            console.warn('[GCal] Delete error (non-blocking):', err);
        }
    },

    /**
     * Pull changes from Google Calendar
     */
    async pullChanges(): Promise<any[]> {
        try {
            const res = await fetch('/api/google-calendar/sync?action=pull');
            if (!res.ok) return [];
            const data = await res.json();
            return data.events || [];
        } catch {
            return [];
        }
    },

    /**
     * Get raw Google Calendar events for a date range (no AI processing)
     */
    async getEventsForRange(timeMin: string, timeMax: string): Promise<any[]> {
        try {
            const res = await fetch(`/api/google-calendar/sync?action=events&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.events || [];
        } catch {
            return [];
        }
    },

    /**
     * Import unlinked Google Calendar events with AI parsing + customer matching
     */
    async importEvents(): Promise<any[]> {
        const res = await fetch('/api/google-calendar/sync?action=import');
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText);
        }
        const data = await res.json();
        return data.events || [];
    },
};
