import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ── Priority System ──
type NotifPriority = 'urgent' | 'important' | 'info';

interface NotifEvent {
    id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    priority: NotifPriority;
}

// ── Sound System (lazy-init AudioContext after user gesture) ──
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch {
            return null;
        }
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

// Initialize AudioContext on first user interaction
if (typeof window !== 'undefined') {
    const initAudio = () => {
        getAudioContext();
        window.removeEventListener('click', initAudio);
        window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
}

const SOUND_CONFIGS = {
    urgent: { freqs: [880, 1100, 880], duration: 150, volume: 0.25 },
    important: { freqs: [660, 880], duration: 120, volume: 0.15 },
    info: { freqs: [520], duration: 80, volume: 0.08 },
};

function playNotificationSound(priority: NotifPriority) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const config = SOUND_CONFIGS[priority];
    config.freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = priority === 'urgent' ? 'triangle' : 'sine';
        gain.gain.setValueAtTime(config.volume, ctx.currentTime);
        const start = ctx.currentTime + i * (config.duration / 1000 + 0.06);
        osc.start(start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + config.duration / 1000);
        osc.stop(start + config.duration / 1000 + 0.1);
    });
}

// ── Tab Title Manager ──
let unreadCount = 0;
let baseTitle = '';

function getBaseTitle(): string {
    if (!baseTitle) {
        baseTitle = document.title.replace(/^\(\d+\)\s*🔔\s*/, '');
    }
    return baseTitle;
}

function updateTabTitle(count: number) {
    unreadCount = count;
    const base = getBaseTitle();
    document.title = count > 0 ? `(${count}) 🔔 ${base}` : base;
}

// Reset on focus
if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => updateTabTitle(0));
}

// ── Dedup tracker (30s window) ──
const recentNotifs = new Map<string, number>();

function isDuplicate(key: string): boolean {
    const now = Date.now();
    const lastSeen = recentNotifs.get(key);
    if (lastSeen && now - lastSeen < 30_000) return true;
    recentNotifs.set(key, now);
    // Cleanup
    for (const [k, v] of recentNotifs) {
        if (now - v > 60_000) recentNotifs.delete(k);
    }
    return false;
}

// ── Priority Detection ──
function detectPriority(title: string): NotifPriority {
    const t = (title || '').toLowerCase();
    if (t.includes('zaakceptowana') || t.includes('akzeptiert') || t.includes('angenommen')) return 'urgent';
    if (t.includes('wiadomość') || t.includes('nachricht') || t.includes('formularz') || t.includes('konfigura')) return 'urgent';
    if (t.includes('otworzono') || t.includes('otwarł') || t.includes('angesehen')) return 'important';
    if (t.includes('pomiar') || t.includes('aufmaß')) return 'important';
    return 'info';
}

// ── Style constants ──
const PRIORITY_STYLES: Record<NotifPriority, { bg: string; iconBg: string; bar: string }> = {
    urgent: { bg: 'bg-red-50 border-red-300', iconBg: 'bg-red-100 text-red-600', bar: 'bg-red-500' },
    important: { bg: 'bg-amber-50 border-amber-300', iconBg: 'bg-amber-100 text-amber-600', bar: 'bg-amber-400' },
    info: { bg: 'bg-slate-50 border-slate-200', iconBg: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300' },
};
const DURATION: Record<NotifPriority, number> = { urgent: 15000, important: 8000, info: 5000 };
const MAX_TOASTS = 3;

// ── Queue with manual counter ──
const toastQueue: NotifEvent[] = [];
let activeToastCount = 0;

function trackToastLifecycle(duration: number) {
    activeToastCount++;
    setTimeout(() => {
        activeToastCount = Math.max(0, activeToastCount - 1);
    }, duration + 500); // +500ms buffer for animation
}

// ── Icon components ──
function NotifIcon({ title }: { title: string }) {
    const t = title.toLowerCase();
    if (t.includes('zaakceptowana') || t.includes('akzeptiert'))
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
    if (t.includes('nowa wiadomość od') || t.includes('neue e-mail'))
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
    if (t.includes('wiadomość') || t.includes('nachricht'))
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
    if (t.includes('formularz') || t.includes('konfigura'))
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    if (t.includes('pomiar') || t.includes('aufmaß'))
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    if (t.includes('otworzono') || t.includes('otwarł'))
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
}

/**
 * Real-time notification listener with priority system, sounds, and smart UX.
 * Must be mounted inside a Router context.
 */
export const useRealtimeNotifications = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const channelRef = useRef<any>(null);
    const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const showNotificationToast = useCallback((notification: NotifEvent) => {
        const styles = PRIORITY_STYLES[notification.priority];

        toast.custom(
            (t) => (
                <div
                    className={`max-w-sm w-full ${styles.bg} border-2 shadow-xl rounded-xl pointer-events-auto overflow-hidden cursor-pointer transition-all duration-300 ${
                        t.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                    } hover:shadow-2xl hover:scale-[1.02]`}
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (notification.link) navigate(notification.link);
                    }}
                >
                    {/* Priority bar */}
                    <div className={`h-1 ${styles.bar}`} />
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                                <NotifIcon title={notification.title} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900 leading-snug">{notification.title}</p>
                                    {notification.priority === 'urgent' && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500 text-white uppercase tracking-wider" style={{ animation: 'pulse 2s infinite' }}>Pilne</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                {notification.link && (
                                    <p className="text-[10px] text-indigo-600 font-medium mt-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        Kliknij aby otworzyć
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                                className="p-1 hover:bg-black/5 rounded transition-colors flex-shrink-0"
                            >
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ),
            {
                duration: DURATION[notification.priority],
                position: 'top-right',
            }
        );

        // Track when this toast will expire
        trackToastLifecycle(DURATION[notification.priority]);
    }, [navigate]);

    // Drain queued toasts when slots open up
    const drainQueue = useCallback(() => {
        if (toastQueue.length === 0) return;
        while (toastQueue.length > 0 && activeToastCount < MAX_TOASTS) {
            const next = toastQueue.shift();
            if (next) showNotificationToast(next);
        }
    }, [showNotificationToast]);

    useEffect(() => {
        if (!currentUser?.id) return;

        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Queue drain interval (check every 2s)
        drainIntervalRef.current = setInterval(drainQueue, 2000);

        // Subscribe to realtime INSERT on notifications table
        console.log('[RealtimeNotif] Subscribing for user:', currentUser.id);
        const channel = supabase
            .channel(`notifications:${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${currentUser.id}`,
                },
                (payload) => {
                    const row = payload.new as any;
                    console.log('[RealtimeNotif] Event received:', row.title, row.id);

                    const priority = detectPriority(row.title || '');
                    const dedupKey = `${row.type}:${row.title}`;

                    // Dedup: info-level → silent if repeated within 30s
                    if (priority === 'info' && isDuplicate(dedupKey)) {
                        console.log('[RealtimeNotif] Deduplicated:', row.title);
                        window.dispatchEvent(new CustomEvent('realtime-notification'));
                        if (!document.hasFocus()) updateTabTitle(unreadCount + 1);
                        return;
                    }

                    // Sound
                    playNotificationSound(priority);

                    // Tab title badge (when in background)
                    if (!document.hasFocus()) {
                        updateTabTitle(unreadCount + 1);
                    }

                    const event: NotifEvent = {
                        id: row.id,
                        title: row.title || 'Nowe powiadomienie',
                        message: row.message || '',
                        type: row.type || 'info',
                        link: row.link,
                        priority,
                    };

                    // Queue or show immediately
                    if (activeToastCount >= MAX_TOASTS) {
                        toastQueue.push(event);
                    } else {
                        showNotificationToast(event);
                    }

                    // Native browser notification (background only)
                    if (!document.hasFocus()) {
                        try {
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(row.title || 'Nowe powiadomienie', {
                                    body: row.message || '',
                                    icon: '/polendach-logo.png',
                                    tag: row.id,
                                });
                            }
                        } catch { /* not critical */ }
                    }

                    // Dispatch for bell counter + LiveActivityFeed
                    window.dispatchEvent(new CustomEvent('realtime-notification'));
                }
            )
            .subscribe((status) => {
                console.log('[RealtimeNotif] Subscription status:', status);
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            if (drainIntervalRef.current) {
                clearInterval(drainIntervalRef.current);
            }
        };
    }, [currentUser?.id, showNotificationToast, drainQueue]);
};
