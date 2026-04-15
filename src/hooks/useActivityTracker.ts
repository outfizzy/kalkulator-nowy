import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Maps URL paths to human-readable module names for the Pulse dashboard.
 */
const PATH_TO_MODULE: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/leads': 'Leady',
    '/customers': 'Klienci',
    '/new-offer': 'Oferty',
    '/offers': 'Oferty',
    '/mail': 'Poczta e-mail',
    '/telephony/calls': 'Połączenia',
    '/telephony/sms': 'SMS',
    '/telephony/whatsapp': 'WhatsApp',
    '/telephony/voicemail': 'Poczta głosowa',
    '/telephony/numbers': 'Zarządzanie numerami',
    '/contracts': 'Umowy',
    '/installations': 'Kalendarz montaży',
    '/reports/measurements': 'Pomiary',
    '/dachrechner': 'Kalkulator dachowy',
    '/visualizer': 'Wizualizator 3D',
    '/ai-assistant': 'Asystent AI',
    '/tasks': 'Zadania',
    '/admin/users': 'Zarządzanie zespołem',
    '/admin/pricing': 'Cenniki',
    '/admin/stats': 'Statystyki',
    '/admin/pulse': 'Puls Firmy',
    '/admin/wallet': 'Portfel prowizji',
    '/admin/inventory': 'Magazyn',
    '/admin/fairs': 'Targi',
    '/admin/routing': 'Planowanie tras',
    '/admin/profitability': 'Rentowność',
    '/admin/b2b': 'Portal B2B',
    '/procurement': 'Zamówienia',
    '/deliveries': 'Dostawy',
    '/service': 'Serwis',
    '/campaigns': 'Kampanie e-mail',
    '/portfolio': 'Mapa realizacji',
    '/settings': 'Ustawienia',
};

function getModuleName(pathname: string): string {
    // Exact match first
    if (PATH_TO_MODULE[pathname]) return PATH_TO_MODULE[pathname];
    // Prefix match (e.g. /leads/123 → Leady)
    const sorted = Object.keys(PATH_TO_MODULE).sort((a, b) => b.length - a.length);
    for (const prefix of sorted) {
        if (pathname.startsWith(prefix)) return PATH_TO_MODULE[prefix];
    }
    return 'Inne';
}

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds
const MIN_PAGE_DURATION = 3; // Don't log pages viewed less than 3 seconds

/**
 * Hook that silently tracks user activity:
 * 1. Heartbeat every 60s → updates user_sessions.last_heartbeat + profiles.last_seen_at
 * 2. Page views → logs navigation with time spent per module
 *
 * Fixed issues from v1:
 * - Race condition: session is guaranteed to exist before page views
 * - Multiple tabs: reuses existing active session instead of creating duplicates
 * - Cleanup: properly closes page views even on nav away
 * - sendBeacon: removed (doesn't work with RLS auth headers)
 */
export function useActivityTracker() {
    const { currentUser } = useAuth();
    const location = useLocation();
    const sessionIdRef = useRef<string | null>(null);
    const currentPageViewIdRef = useRef<string | null>(null);
    const pageEnteredAtRef = useRef<number>(Date.now());
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionReadyRef = useRef(false);
    const lastPathRef = useRef<string>('');

    // ─── SESSION MANAGEMENT ───
    const ensureSession = useCallback(async (): Promise<string | null> => {
        if (!currentUser?.id) return null;
        // Already have a session
        if (sessionIdRef.current && sessionReadyRef.current) return sessionIdRef.current;

        try {
            // Check for existing active session (handles multiple tabs)
            const { data: existing } = await supabase
                .from('user_sessions')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .order('started_at', { ascending: false })
                .limit(1);

            if (existing && existing.length > 0) {
                sessionIdRef.current = existing[0].id;
                sessionReadyRef.current = true;
                // Resume — update heartbeat
                await supabase
                    .from('user_sessions')
                    .update({ last_heartbeat: new Date().toISOString() })
                    .eq('id', existing[0].id);
            } else {
                // Create new session
                const { data, error } = await supabase
                    .from('user_sessions')
                    .insert({
                        user_id: currentUser.id,
                        user_agent: navigator.userAgent.substring(0, 200),
                    })
                    .select('id')
                    .single();

                if (!error && data) {
                    sessionIdRef.current = data.id;
                    sessionReadyRef.current = true;
                }
            }

            // Mark online
            await supabase
                .from('profiles')
                .update({ is_online: true, last_seen_at: new Date().toISOString() })
                .eq('id', currentUser.id);

            return sessionIdRef.current;
        } catch {
            return null;
        }
    }, [currentUser?.id]);

    // ─── HEARTBEAT ───
    const sendHeartbeat = useCallback(async () => {
        if (!currentUser?.id || !sessionIdRef.current) return;

        try {
            const now = new Date().toISOString();
            // Batch both updates
            await Promise.all([
                supabase
                    .from('user_sessions')
                    .update({ last_heartbeat: now })
                    .eq('id', sessionIdRef.current),
                supabase
                    .from('profiles')
                    .update({ last_seen_at: now })
                    .eq('id', currentUser.id),
            ]);
        } catch {
            // If heartbeat fails, try to re-establish session
            sessionReadyRef.current = false;
            ensureSession();
        }
    }, [currentUser?.id, ensureSession]);

    // ─── PAGE VIEW TRACKING ───
    const closeCurrentPageView = useCallback(async () => {
        const pvId = currentPageViewIdRef.current;
        if (!pvId) return;

        const duration = Math.round((Date.now() - pageEnteredAtRef.current) / 1000);
        currentPageViewIdRef.current = null;

        try {
            if (duration < MIN_PAGE_DURATION) {
                // Too short — delete the record to avoid noise
                await supabase.from('page_views').delete().eq('id', pvId);
            } else {
                await supabase.from('page_views').update({
                    left_at: new Date().toISOString(),
                    duration_seconds: duration,
                }).eq('id', pvId);
            }
        } catch {
            // Silent — tracking should never break the app
        }
    }, []);

    const openPageView = useCallback(async (pathname: string) => {
        if (!currentUser?.id) return;

        // Ensure session exists first (fixes race condition)
        const sessionId = await ensureSession();
        if (!sessionId) return;

        const module = getModuleName(pathname);

        try {
            const { data } = await supabase
                .from('page_views')
                .insert({
                    user_id: currentUser.id,
                    session_id: sessionId,
                    path: pathname,
                    module,
                })
                .select('id')
                .single();

            if (data) {
                currentPageViewIdRef.current = data.id;
                pageEnteredAtRef.current = Date.now();
            }
        } catch {
            // Silent
        }
    }, [currentUser?.id, ensureSession]);

    // ─── INIT: Start session + heartbeat interval ───
    useEffect(() => {
        if (!currentUser?.id) return;

        // Initialize session
        ensureSession();

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, [currentUser?.id, ensureSession, sendHeartbeat]);

    // ─── TRACK PAGE CHANGES ───
    useEffect(() => {
        if (!currentUser?.id) return;

        const newPath = location.pathname;
        // Avoid double-tracking same path (React strict mode, etc.)
        if (newPath === lastPathRef.current) return;
        lastPathRef.current = newPath;

        // Close previous, then open new
        const track = async () => {
            await closeCurrentPageView();
            await openPageView(newPath);
        };
        track();

        // Don't close on unmount here — we close when a NEW page opens
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, currentUser?.id]);

    // ─── CLEANUP on tab close / visibility change ───
    useEffect(() => {
        if (!currentUser?.id) return;

        // When tab is hidden, close current page view (user switched away)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                closeCurrentPageView();
            } else {
                // Tab regained focus — re-open page view
                openPageView(location.pathname);
            }
        };

        // On unload — try to close page view (best effort, no sendBeacon as RLS blocks it)
        const handleBeforeUnload = () => {
            closeCurrentPageView();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentUser?.id, closeCurrentPageView, openPageView, location.pathname]);
}
