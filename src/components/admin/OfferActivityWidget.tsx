import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Eye, FileText, MessageSquare, Calendar, CheckCircle2,
    MousePointerClick, Download, ArrowUpRight, ChevronDown, Bell
} from 'lucide-react';

interface OfferActivity {
    id: string;
    offerId: string;
    leadId: string | null;
    eventType: string;
    eventData: Record<string, any>;
    createdAt: Date;
    // joined
    clientName?: string;
    offerName?: string;
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
    offer_view: {
        icon: <Eye className="w-3.5 h-3.5" />,
        label: 'Oferta otwarta',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    pdf_click: {
        icon: <FileText className="w-3.5 h-3.5" />,
        label: 'PDF otwarty',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
    },
    pdf_download: {
        icon: <Download className="w-3.5 h-3.5" />,
        label: 'PDF pobrany',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
    },
    message_sent: {
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        label: 'Wiadomość wysłana',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
    },
    measurement_request: {
        icon: <Calendar className="w-3.5 h-3.5" />,
        label: 'Prośba o pomiar',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
    },
    offer_accept: {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        label: 'Oferta zaakceptowana!',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
    },
    upgrade_request: {
        icon: <ArrowUpRight className="w-3.5 h-3.5" />,
        label: 'Zapytanie o upgrade',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
    },
    contact_request: {
        icon: <MousePointerClick className="w-3.5 h-3.5" />,
        label: 'Prośba o kontakt',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
    },
    addon_inquiry: {
        icon: <MousePointerClick className="w-3.5 h-3.5" />,
        label: 'Zapytanie o dodatek',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
    },
};

const DEFAULT_EVENT = {
    icon: <MousePointerClick className="w-3.5 h-3.5" />,
    label: 'Interakcja',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
};

function timeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'przed chwilą';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min temu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h temu`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'wczoraj';
    return `${days}d temu`;
}

export const OfferActivityWidget: React.FC = () => {
    const { currentUser } = useAuth();
    const [activities, setActivities] = useState<OfferActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const fetchActivities = async () => {
        try {
            // Get recent offer interactions (last 7 days, max 50)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const { data: interactions, error } = await supabase
                .from('offer_interactions')
                .select('id, offer_id, lead_id, event_type, event_data, created_at')
                .gte('created_at', sevenDaysAgo)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!interactions || interactions.length === 0) {
                setActivities([]);
                setLoading(false);
                return;
            }

            // Get unique offer_ids and lead_ids
            const offerIds = [...new Set(interactions.map(i => i.offer_id).filter(Boolean))];
            const leadIds = [...new Set(interactions.map(i => i.lead_id).filter(Boolean))];

            // Fetch offer names
            const offerMap = new Map<string, string>();
            if (offerIds.length > 0) {
                const { data: offers } = await supabase
                    .from('offers')
                    .select('id, product_data')
                    .in('id', offerIds);
                if (offers) {
                    offers.forEach(o => {
                        const pd = o.product_data as any;
                        offerMap.set(o.id, pd?.modelId || pd?.modelName || 'Angebot');
                    });
                }
            }

            // Fetch lead names
            const leadMap = new Map<string, string>();
            if (leadIds.length > 0) {
                const { data: leads } = await supabase
                    .from('leads')
                    .select('id, customer_data')
                    .in('id', leadIds);
                if (leads) {
                    leads.forEach(l => {
                        const cd = l.customer_data as any;
                        leadMap.set(l.id, `${cd?.firstName || ''} ${cd?.lastName || ''}`.trim() || 'Klient');
                    });
                }
            }

            const mapped: OfferActivity[] = interactions.map(i => ({
                id: i.id,
                offerId: i.offer_id,
                leadId: i.lead_id,
                eventType: i.event_type,
                eventData: i.event_data || {},
                createdAt: new Date(i.created_at),
                clientName: i.lead_id ? leadMap.get(i.lead_id) : undefined,
                offerName: i.offer_id ? offerMap.get(i.offer_id) : undefined,
            }));

            setActivities(mapped);
        } catch (e) {
            console.error('[OfferActivityWidget] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();

        // Realtime subscription for new interactions
        const channel = supabase
            .channel('offer-activity-feed')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'offer_interactions',
            }, () => {
                fetchActivities();
            })
            .subscribe();

        // Polling every 30s for reliability
        const interval = setInterval(fetchActivities, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    // Also listen for new lead_messages from clients
    useEffect(() => {
        const channel = supabase
            .channel('lead-messages-activity')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'lead_messages',
                filter: 'sender_type=eq.client',
            }, () => {
                // Trigger a notification sound or visual indicator
                fetchActivities();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const displayActivities = expanded ? activities : activities.slice(0, 8);
    const todayCount = activities.filter(a => {
        const today = new Date();
        return a.createdAt.toDateString() === today.toDateString();
    }).length;

    const acceptCount = activities.filter(a => a.eventType === 'offer_accept').length;
    const viewCount = activities.filter(a => a.eventType === 'offer_view').length;
    const messageCount = activities.filter(a => a.eventType === 'message_sent').length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: expanded ? 'none' : '480px' }}>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600 relative">
                        <Bell className="w-5 h-5" />
                        {todayCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                {todayCount > 9 ? '9+' : todayCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Aktywność Ofert</h3>
                        <p className="text-[10px] text-slate-400">Interakcje klientów z interaktywnymi ofertami • na żywo</p>
                    </div>
                </div>
                {/* Mini stats */}
                <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px]">
                        <Eye className="w-3 h-3 text-blue-400" />
                        <span className="font-bold text-slate-600">{viewCount}</span>
                    </div>
                    {messageCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px]">
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            <span className="font-bold text-slate-600">{messageCount}</span>
                        </div>
                    )}
                    {acceptCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="font-bold text-green-600">{acceptCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Activity list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-slate-600" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Eye className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium">Brak aktywności</p>
                        <p className="text-xs mt-1">Interakcje pojawią się gdy klient otworzy ofertę.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {displayActivities.map(activity => {
                            const config = EVENT_CONFIG[activity.eventType] || DEFAULT_EVENT;
                            const isHighPriority = ['offer_accept', 'measurement_request', 'message_sent'].includes(activity.eventType);

                            return (
                                <div
                                    key={activity.id}
                                    className={`flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/50 transition-colors ${isHighPriority ? 'bg-slate-50/30' : ''}`}
                                >
                                    <div className={`p-1.5 rounded-lg ${config.bgColor} ${config.color} shrink-0 mt-0.5`}>
                                        {config.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${config.color}`}>
                                                {config.label}
                                            </span>
                                            {isHighPriority && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {activity.clientName && (
                                                <>
                                                    {activity.leadId ? (
                                                        <Link
                                                            to={`/leads/${activity.leadId}`}
                                                            className="text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors"
                                                        >
                                                            {activity.clientName}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-700">{activity.clientName}</span>
                                                    )}
                                                    {activity.offerName && (
                                                        <span className="text-[10px] text-slate-400">• {activity.offerName}</span>
                                                    )}
                                                </>
                                            )}
                                            {!activity.clientName && activity.offerName && (
                                                <span className="text-xs text-slate-500">{activity.offerName}</span>
                                            )}
                                        </div>
                                        {/* Extra detail for specific events */}
                                        {activity.eventType === 'upgrade_request' && activity.eventData?.upgradeTitle && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">Upgrade: {activity.eventData.upgradeTitle}</p>
                                        )}
                                        {activity.eventType === 'pdf_click' && activity.eventData?.attachment_type && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {activity.eventData.attachment_type === 'visualization' ? '3D-Visualisierung' : 'Technische Zeichnung'}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0 mt-1">
                                        {timeAgo(activity.createdAt)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Show more */}
            {activities.length > 8 && (
                <button
                    onClick={() => setExpanded(p => !p)}
                    className="w-full py-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Pokaż mniej' : `Pokaż wszystkie (${activities.length})`}
                </button>
            )}
        </div>
    );
};
