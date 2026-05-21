import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Eye, FileText, MessageSquare, Calendar, CheckCircle2,
    MousePointerClick, Download, ArrowUpRight, ChevronDown, ChevronRight,
    Bell, ExternalLink, User
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

interface LeadGroup {
    leadId: string | null;
    clientName: string;
    activities: OfferActivity[];
    latestAt: Date;
    hasHighPriority: boolean;
}

export const OfferActivityWidget: React.FC = () => {
    const { currentUser } = useAuth();
    const [activities, setActivities] = useState<OfferActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

    const toggleLead = (key: string) => {
        setExpandedLeads(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

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

    // Group activities by lead
    const leadGroups = useMemo(() => {
        const groups = new Map<string, LeadGroup>();
        const HP = ['offer_accept', 'measurement_request', 'message_sent'];

        activities.forEach(a => {
            const key = a.leadId || `orphan-${a.id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    leadId: a.leadId,
                    clientName: a.clientName || a.offerName || 'Nieznany',
                    activities: [],
                    latestAt: a.createdAt,
                    hasHighPriority: false,
                });
            }
            const g = groups.get(key)!;
            g.activities.push(a);
            if (a.createdAt > g.latestAt) g.latestAt = a.createdAt;
            if (HP.includes(a.eventType)) g.hasHighPriority = true;
        });

        return Array.from(groups.values()).sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
    }, [activities]);

    const displayGroups = expanded ? leadGroups : leadGroups.slice(0, 10);
    const todayCount = activities.filter(a => {
        const today = new Date();
        return a.createdAt.toDateString() === today.toDateString();
    }).length;

    const acceptCount = activities.filter(a => a.eventType === 'offer_accept').length;
    const viewCount = activities.filter(a => a.eventType === 'offer_view').length;
    const messageCount = activities.filter(a => a.eventType === 'message_sent').length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: expanded ? 'none' : '520px' }}>
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
                        <p className="text-[10px] text-slate-400">Interakcje klientów • pogrupowane po leadach • na żywo</p>
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

            {/* Activity list — grouped by lead */}
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
                    <div className="divide-y divide-slate-100">
                        {displayGroups.map(group => {
                            const key = group.leadId || group.activities[0]?.id || 'unknown';
                            const isOpen = expandedLeads.has(key);
                            const eventCounts = new Map<string, number>();
                            group.activities.forEach(a => {
                                eventCounts.set(a.eventType, (eventCounts.get(a.eventType) || 0) + 1);
                            });

                            return (
                                <div key={key}>
                                    {/* Lead header row — always visible */}
                                    <button
                                        onClick={() => toggleLead(key)}
                                        className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/80 transition-colors text-left ${group.hasHighPriority ? 'bg-amber-50/30' : ''}`}
                                    >
                                        {/* Expand chevron */}
                                        <div className="shrink-0 text-slate-400">
                                            {isOpen
                                                ? <ChevronDown className="w-4 h-4" />
                                                : <ChevronRight className="w-4 h-4" />
                                            }
                                        </div>

                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${group.hasHighPriority ? 'bg-rose-500' : 'bg-indigo-500'}`}>
                                            {group.clientName.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Name + summary */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800 truncate">{group.clientName}</span>
                                                {group.hasHighPriority && (
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                                )}
                                            </div>
                                            {/* Event type badges */}
                                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                {Array.from(eventCounts.entries()).map(([type, count]) => {
                                                    const cfg = EVENT_CONFIG[type] || DEFAULT_EVENT;
                                                    return (
                                                        <span key={type} className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded ${cfg.bgColor} ${cfg.color}`}>
                                                            {cfg.icon}
                                                            {count > 1 && <span>×{count}</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                            {timeAgo(group.latestAt)}
                                        </span>
                                    </button>

                                    {/* Expanded: detailed event list + go-to-lead button */}
                                    {isOpen && (
                                        <div className="bg-slate-50/50 border-t border-slate-100">
                                            {/* Individual events */}
                                            <div className="divide-y divide-slate-100/80">
                                                {group.activities.map(activity => {
                                                    const config = EVENT_CONFIG[activity.eventType] || DEFAULT_EVENT;
                                                    return (
                                                        <div key={activity.id} className="flex items-center gap-2.5 px-6 sm:px-8 py-2">
                                                            <div className={`p-1 rounded ${config.bgColor} ${config.color} shrink-0`}>
                                                                {config.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                                                                {activity.offerName && (
                                                                    <span className="text-[10px] text-slate-400 ml-1.5">• {activity.offerName}</span>
                                                                )}
                                                                {activity.eventType === 'upgrade_request' && activity.eventData?.upgradeTitle && (
                                                                    <span className="text-[10px] text-slate-400 ml-1">— {activity.eventData.upgradeTitle}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] text-slate-400 font-mono shrink-0">
                                                                {timeAgo(activity.createdAt)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Action: Go to lead */}
                                            {group.leadId && (
                                                <div className="px-6 sm:px-8 py-2.5 border-t border-slate-200/60">
                                                    <Link
                                                        to={`/leads/${group.leadId}`}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        Przejdź do leada
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Show more */}
            {leadGroups.length > 10 && (
                <button
                    onClick={() => setExpanded(p => !p)}
                    className="w-full py-2.5 border-t border-slate-100 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Pokaż mniej' : `Pokaż wszystkich (${leadGroups.length})`}
                </button>
            )}
        </div>
    );
};
