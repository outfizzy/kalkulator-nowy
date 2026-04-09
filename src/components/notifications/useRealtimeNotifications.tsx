import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

/**
 * Real-time notification listener using Supabase Realtime.
 * Shows auto-popup toasts when a new notification arrives for the current user.
 * Must be mounted inside a Router context (uses useNavigate).
 */
export const useRealtimeNotifications = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const channelRef = useRef<any>(null);

    const showNotificationToast = useCallback((notification: {
        id: string;
        title: string;
        message: string;
        type: string;
        link?: string;
    }) => {
        // Determine icon based on notification type/title
        const isOffer = notification.title?.includes('Ofert') || notification.title?.includes('Angebot');
        const isMessage = notification.title?.includes('Nachricht') || notification.title?.includes('wiadomość') || notification.title?.includes('Wiadomość');
        const isMeasurement = notification.title?.includes('Aufmaß') || notification.title?.includes('pomiar');
        const isAccept = notification.title?.includes('zaakceptowana') || notification.title?.includes('angenommen') || notification.title?.includes('Akzeptiert');
        const isView = notification.title?.includes('Otworzono') || notification.title?.includes('angesehen') || notification.title?.includes('otwarł');

        // Priority-based styling
        let bgColor = 'bg-indigo-50 border-indigo-200';
        let iconBg = 'bg-indigo-100 text-indigo-600';

        if (isAccept) {
            bgColor = 'bg-emerald-50 border-emerald-300';
            iconBg = 'bg-emerald-100 text-emerald-600';
        } else if (isMessage) {
            bgColor = 'bg-blue-50 border-blue-200';
            iconBg = 'bg-blue-100 text-blue-600';
        } else if (isMeasurement) {
            bgColor = 'bg-amber-50 border-amber-200';
            iconBg = 'bg-amber-100 text-amber-600';
        } else if (isView) {
            bgColor = 'bg-slate-50 border-slate-200';
            iconBg = 'bg-slate-100 text-slate-500';
        }

        // Show rich toast notification
        toast.custom(
            (t) => (
                <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full ${bgColor} border-2 shadow-xl rounded-xl pointer-events-auto overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02]`}
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (notification.link) {
                            navigate(notification.link);
                        }
                    }}
                >
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                {isAccept ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                ) : isMessage ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
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
                                <p className="text-sm font-bold text-slate-900 leading-snug">
                                    {notification.title}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                    {notification.message}
                                </p>
                                {notification.link && (
                                    <p className="text-[10px] text-indigo-600 font-medium mt-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        Kliknij aby otworzyć
                                    </p>
                                )}
                            </div>

                            {/* Dismiss */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.dismiss(t.id);
                                }}
                                className="p-1 hover:bg-black/5 rounded transition-colors flex-shrink-0"
                            >
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ),
            {
                duration: isAccept ? 15000 : isMessage ? 12000 : 8000,
                position: 'top-right',
            }
        );

        // Also play notification sound if available
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/polendach-logo.png',
                    tag: notification.id,
                });
            }
        } catch { /* browser notification not critical */ }
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
                    showNotificationToast({
                        id: row.id,
                        title: row.title || 'Nowe powiadomienie',
                        message: row.message || '',
                        type: row.type || 'info',
                        link: row.link,
                    });
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
