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

// ── Sound System ──
const SOUNDS = {
    urgent: { freq: [880, 1100, 880], duration: 150, volume: 0.3 },
    important: { freq: [660, 880], duration: 120, volume: 0.2 },
    info: { freq: [520], duration: 80, volume: 0.1 },
};

function playNotificationSound(priority: NotifPriority) {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const config = SOUNDS[priority];
        config.freq.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.value = config.volume;
            const start = ctx.currentTime + i * (config.duration / 1000 + 0.05);
            osc.start(start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + config.duration / 1000);
            osc.stop(start + config.duration / 1000 + 0.05);
        });
    } catch { /* audio not available */ }
}

// ── Tab Title Manager ──
const originalTitle = document.title;
let unreadCount = 0;

function updateTabTitle(count: number) {
    unreadCount = count;
    if (count > 0) {
        document.title = `(${count}) 🔔 ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
}

// Reset on focus
if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
        updateTabTitle(0);
    });
}

// ── Dedup tracker ──
const recentNotifs = new Map<string, number>(); // key -> timestamp

function isDuplicate(notification: { title: string; type: string }): boolean {
    const key = `${notification.type}:${notification.title}`;
    const lastSeen = recentNotifs.get(key);
    const now = Date.now();
    if (lastSeen && now - lastSeen < 30_000) {
        // Same notification within 30s — deduplicate
        return true;
    }
    recentNotifs.set(key, now);
    // Cleanup old entries
    if (recentNotifs.size > 50) {
        for (const [k, v] of recentNotifs) {
            if (now - v > 60_000) recentNotifs.delete(k);
        }
    }
    return false;
}

// ── Priority Detection ──
function detectPriority(title: string, type: string): NotifPriority {
    const t = (title || '').toLowerCase();
    // URGENT: acceptance, new message, form completed
    if (t.includes('zaakceptowana') || t.includes('akzeptiert') || t.includes('angenommen')) return 'urgent';
    if (t.includes('wiadomość') || t.includes('nachricht') || t.includes('message')) return 'urgent';
    if (t.includes('formularz') || t.includes('konfigura')) return 'urgent';
    // IMPORTANT: offer opened, measurement
    if (t.includes('otworzono') || t.includes('otwarł') || t.includes('angesehen')) return 'important';
    if (t.includes('pomiar') || t.includes('aufmaß')) return 'important';
    // INFO: everything else
    return 'info';
}

// ── Toast Styling ──
const PRIORITY_STYLES: Record<NotifPriority, { bg: string; iconBg: string; border: string }> = {
    urgent: { bg: 'bg-red-50', iconBg: 'bg-red-100 text-red-600', border: 'border-red-300' },
    important: { bg: 'bg-amber-50', iconBg: 'bg-amber-100 text-amber-600', border: 'border-amber-300' },
    info: { bg: 'bg-slate-50', iconBg: 'bg-slate-100 text-slate-500', border: 'border-slate-200' },
};

const DURATION: Record<NotifPriority, number> = {
    urgent: 15000,
    important: 8000,
    info: 5000,
};

// ── Active toast counter for limiting ──
let activeToasts = 0;
const MAX_TOASTS = 3;
const toastQueue: NotifEvent[] = [];

function processQueue(showFn: (n: NotifEvent) => void) {
    while (toastQueue.length > 0 && activeToasts < MAX_TOASTS) {
        const next = toastQueue.shift()!;
        showFn(next);
    }
}

/**
 * Real-time notification listener with priority system, sounds, and smart UX.
 */
export const useRealtimeNotifications = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const channelRef = useRef<any>(null);

    const showNotificationToast = useCallback((notification: NotifEvent) => {
        // Enforce toast limit
        if (activeToasts >= MAX_TOASTS) {
            toastQueue.push(notification);
            return;
        }

        activeToasts++;
        const styles = PRIORITY_STYLES[notification.priority];

        // Determine icon
        const t = (notification.title || '').toLowerCase();
        const isAccept = t.includes('zaakceptowana') || t.includes('akzeptiert');
        const isMessage = t.includes('wiadomość') || t.includes('nachricht');
        const isForm = t.includes('formularz') || t.includes('konfigura');
        const isView = t.includes('otworzono') || t.includes('otwarł');
        const isMeasurement = t.includes('pomiar') || t.includes('aufmaß');

        toast.custom(
            (toastObj) => (
                <div
                    className={`${toastObj.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full ${styles.bg} ${styles.border} border-2 shadow-xl rounded-xl pointer-events-auto overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02]`}
                    onClick={() => {
                        toast.dismiss(toastObj.id);
                        if (notification.link) navigate(notification.link);
                    }}
                >
                    {/* Priority bar */}
                    <div className={`h-1 ${notification.priority === 'urgent' ? 'bg-red-500' : notification.priority === 'important' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                                {isAccept ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                ) : isMessage ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                ) : isForm ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                ) : isMeasurement ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                ) : isView ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900 leading-snug">{notification.title}</p>
                                    {notification.priority === 'urgent' && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500 text-white uppercase animate-pulse">Pilne</span>
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

                            {/* Dismiss */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toast.dismiss(toastObj.id); }}
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
                onClose: () => {
                    activeToasts = Math.max(0, activeToasts - 1);
                    processQueue(showNotificationToast);
                },
            }
        );
    }, [navigate]);

    useEffect(() => {
        if (!currentUser?.id) return;

        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Subscribe to realtime INSERT on notifications table for this user
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

                    // Detect priority
                    const priority = detectPriority(row.title || '', row.type || '');

                    // Dedup check — info-level can be silenced, urgent always shows
                    if (priority === 'info' && isDuplicate({ title: row.title, type: row.type })) {
                        console.log('[RealtimeNotif] Deduplicated (info):', row.title);
                        // Still update bell counter
                        window.dispatchEvent(new CustomEvent('realtime-notification'));
                        updateTabTitle(unreadCount + 1);
                        return;
                    }

                    // Play sound
                    playNotificationSound(priority);

                    // Update tab title
                    if (!document.hasFocus()) {
                        updateTabTitle(unreadCount + 1);
                    }

                    // Show toast
                    showNotificationToast({
                        id: row.id,
                        title: row.title || 'Nowe powiadomienie',
                        message: row.message || '',
                        type: row.type || 'info',
                        link: row.link,
                        priority,
                    });

                    // Native browser notification (when tab is in background)
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

                    // Dispatch event so NotificationsDropdown bell refreshes immediately
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
        };
    }, [currentUser?.id, showNotificationToast]);
};
