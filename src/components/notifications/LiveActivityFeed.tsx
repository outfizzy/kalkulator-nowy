import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
    id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    createdAt: string;
    userName?: string;
}

/**
 * Live Activity Feed — real-time ticker of events across the CRM.
 * Shows what's happening NOW — offers opened, messages received, forms filled.
 */
export const LiveActivityFeed: React.FC<{ maxItems?: number }> = ({ maxItems = 15 }) => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemId, setNewItemId] = useState<string | null>(null);
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    // Load initial data
    useEffect(() => {
        const loadRecent = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('id, title, message, type, link, created_at, metadata')
                .order('created_at', { ascending: false })
                .limit(maxItems);

            if (data) {
                setActivities(data.map(n => ({
                    id: n.id,
                    title: n.title || '',
                    message: n.message || '',
                    type: n.type || 'info',
                    link: n.link,
                    createdAt: n.created_at,
                })));
            }
            setLoading(false);
        };
        loadRecent();
    }, [maxItems]);

    // Listen for new events via custom DOM event
    useEffect(() => {
        const handleNew = () => {
            // Reload latest
            supabase
                .from('notifications')
                .select('id, title, message, type, link, created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .then(({ data }) => {
                    if (data && data[0]) {
                        const item: ActivityItem = {
                            id: data[0].id,
                            title: data[0].title || '',
                            message: data[0].message || '',
                            type: data[0].type || 'info',
                            link: data[0].link,
                            createdAt: data[0].created_at,
                        };
                        setActivities(prev => {
                            if (prev.some(a => a.id === item.id)) return prev;
                            setNewItemId(item.id);
                            setTimeout(() => setNewItemId(null), 2000);
                            return [item, ...prev].slice(0, maxItems);
                        });
                    }
                });
        };

        window.addEventListener('realtime-notification', handleNew);
        return () => window.removeEventListener('realtime-notification', handleNew);
    }, [maxItems]);

    const getIcon = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('zaakceptowana') || t.includes('akzeptiert'))
            return <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
        if (t.includes('wiadomość') || t.includes('nachricht'))
            return <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
        if (t.includes('formularz') || t.includes('konfigura'))
            return <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
        if (t.includes('otworzono') || t.includes('otwarł'))
            return <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
        return <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'teraz';
        if (mins < 60) return `${mins} min temu`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h temu`;
        return `${Math.floor(hours / 24)}d temu`;
    };

    const getPriorityDot = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('zaakceptowana') || t.includes('wiadomość') || t.includes('formularz') || t.includes('konfigura'))
            return 'bg-red-400';
        if (t.includes('otworzono') || t.includes('otwarł'))
            return 'bg-amber-400';
        return 'bg-slate-300';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="animate-pulse space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <h3 className="font-bold text-slate-800 text-sm">Aktywność na żywo</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Real-time</span>
            </div>

            {/* Feed */}
            <div ref={containerRef} className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                {activities.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Brak aktywności</div>
                ) : (
                    activities.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => item.link && navigate(item.link)}
                            className={`px-4 py-3 flex items-start gap-3 transition-all ${
                                item.link ? 'cursor-pointer hover:bg-slate-50' : ''
                            } ${newItemId === item.id ? 'bg-amber-50/80 animate-pulse' : ''}`}
                        >
                            {/* Priority dot */}
                            <div className="flex flex-col items-center gap-1 pt-1">
                                <div className={`w-2 h-2 rounded-full ${getPriorityDot(item.title)}`} />
                            </div>

                            {/* Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(item.title)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 leading-snug truncate">{item.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.message}</p>
                            </div>

                            {/* Time */}
                            <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
                                {getTimeAgo(item.createdAt)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
