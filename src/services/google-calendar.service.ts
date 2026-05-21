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
     * ⛔ DISABLED — read-only mode: app only reads from Google Calendar, never writes back
     */
    async syncInstallation(installation: Installation, googleEventId?: string | null): Promise<string | null> {
        // Write operations disabled — Google Calendar is read-only source
        console.log('[GCal] syncInstallation DISABLED (read-only mode)');
        return googleEventId || null;
    },

    /**
     * Delete a Google Calendar event
     * ⛔ DISABLED — read-only mode: app only reads from Google Calendar, never writes back
     */
    async deleteEvent(googleEventId: string): Promise<void> {
        // Write operations disabled — Google Calendar is read-only source
        console.log('[GCal] deleteEvent DISABLED (read-only mode)');
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
