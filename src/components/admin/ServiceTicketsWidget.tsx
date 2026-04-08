import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ServiceTicketRow {
    id: string;
    ticket_number: string;
    status: string;
    priority: string;
    type: string;
    description: string;
    created_at: string;
    updated_at: string;
    client_id: string | null;
    contract_number: string | null;
    scheduled_date: string | null;
    client?: { firstName: string; lastName: string; city: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    new: { label: 'Nowe', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    open: { label: 'Przyjete', dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    scheduled: { label: 'Zaplanowane', dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
    in_progress: { label: 'W realizacji', dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    resolved: { label: 'Rozwiazane', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    closed: { label: 'Zamkniete', dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500' },
    rejected: { label: 'Odrzucone', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
};

const PRIORITY_ICONS: Record<string, string> = {
    low: '🟢', medium: '🟡', high: '🟠', critical: '🔴',
};

const TYPE_ICONS: Record<string, string> = {
    leak: '💧', electrical: '⚡', mechanical: '⚙️', visual: '👁️', other: '📋',
};

function getClientName(row: ServiceTicketRow): string {
    if (row.client) {
        const name = `${row.client.firstName || ''} ${row.client.lastName || ''}`.trim();
        if (name) return name;
    }
    // Parse from description
    const match = row.description?.match(/Klient:\s*(.+?)(?:\n|Adres:|Telefon:|$)/i);
    if (match?.[1]) return match[1].trim();
    return 'Brak danych';
}

export const ServiceTicketsWidget: React.FC = () => {
    const [tickets, setTickets] = useState<ServiceTicketRow[]>([]);
    const [counts, setCounts] = useState({ total: 0, new: 0, open: 0, scheduled: 0, inProgress: 0, critical: 0 });
    const [recentUpdated, setRecentUpdated] = useState<ServiceTicketRow[]>([]);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const { data, error } = await supabase
                    .from('service_tickets')
                    .select(`
                        id, ticket_number, status, priority, type, description,
                        created_at, updated_at, client_id, contract_number, scheduled_date,
                        client:client_id ( firstName:first_name, lastName:last_name, city )
                    `)
                    .order('updated_at', { ascending: false })
                    .limit(100);

                if (error) throw error;
                const rows = (data || []) as unknown as ServiceTicketRow[];
                setTickets(rows);

                // Counts
                const c = {
                    total: rows.length,
                    new: rows.filter(r => r.status === 'new').length,
                    open: rows.filter(r => r.status === 'open').length,
                    scheduled: rows.filter(r => r.status === 'scheduled').length,
                    inProgress: rows.filter(r => r.status === 'in_progress').length,
                    critical: rows.filter(r => r.priority === 'critical' || r.priority === 'high').length,
                };
                setCounts(c);

                // Recent 5 updated (non-closed/resolved)
                const active = rows
                    .filter(r => !['closed', 'resolved', 'rejected'].includes(r.status))
                    .slice(0, 5);
                setRecentUpdated(active);
            } catch (e) {
                console.error('ServiceTicketsWidget error:', e);
            }
        };

        fetchTickets();
    }, []);

    const activeCount = counts.new + counts.open + counts.scheduled + counts.inProgress;
    const hasUrgent = counts.critical > 0 || counts.new > 0;

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${hasUrgent ? 'border-orange-200' : 'border-slate-200'}`}>
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b ${hasUrgent ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100'} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${hasUrgent ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Serwis</h3>
                        <p className="text-xs text-slate-400">
                            {activeCount > 0
                                ? `${activeCount} aktywnych zgłoszeń`
                                : 'Brak aktywnych zgłoszeń'}
                        </p>
                    </div>
                    {hasUrgent && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full animate-pulse">
                            WYMAGA UWAGI
                        </span>
                    )}
                </div>
                <Link
                    to="/service"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                    Otwórz <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
            </div>

            <div className="p-4 sm:p-5">
                {/* Mini KPI */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                    {[
                        { label: 'Nowe', count: counts.new, dot: 'bg-blue-500', bg: counts.new > 0 ? 'bg-blue-50' : 'bg-slate-50' },
                        { label: 'Przyjęte', count: counts.open, dot: 'bg-yellow-500', bg: counts.open > 0 ? 'bg-yellow-50' : 'bg-slate-50' },
                        { label: 'Zaplanowane', count: counts.scheduled, dot: 'bg-purple-500', bg: counts.scheduled > 0 ? 'bg-purple-50' : 'bg-slate-50' },
                        { label: 'W realizacji', count: counts.inProgress, dot: 'bg-indigo-500', bg: counts.inProgress > 0 ? 'bg-indigo-50' : 'bg-slate-50' },
                        { label: 'Pilne', count: counts.critical, dot: counts.critical > 0 ? 'bg-red-500' : 'bg-slate-400', bg: counts.critical > 0 ? 'bg-red-50' : 'bg-slate-50' },
                    ].map(kpi => (
                        <div key={kpi.label} className={`${kpi.bg} rounded-xl p-2.5`}>
                            <div className="flex items-center gap-1 mb-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{kpi.label}</span>
                            </div>
                            <p className="text-lg font-black text-slate-800">{kpi.count}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Activity List */}
                {recentUpdated.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ostatnio aktywne</h4>
                        <div className="divide-y divide-slate-50">
                            {recentUpdated.map(row => {
                                const sc = STATUS_CONFIG[row.status] || STATUS_CONFIG.new;
                                const clientName = getClientName(row);
                                const typeIcon = TYPE_ICONS[row.type] || '📋';
                                const prioIcon = PRIORITY_ICONS[row.priority] || '🟡';
                                const updatedAgo = getTimeAgo(row.updated_at);

                                return (
                                    <Link
                                        to={`/service/${row.id}`}
                                        key={row.id}
                                        className="flex items-center justify-between py-2 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${sc.bg} ${sc.text} border border-slate-100`}>
                                                {sc.label}
                                            </span>
                                            <span className="text-xs">{typeIcon}</span>
                                            <span className="font-medium text-sm text-slate-800 truncate max-w-[120px]">{clientName}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{row.ticket_number}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs">{prioIcon}</span>
                                            <span className="text-[10px] text-slate-400">{updatedAgo}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {recentUpdated.length === 0 && (
                    <div className="text-center py-6 text-sm text-slate-400">
                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Brak aktywnych zgłoszeń serwisowych
                    </div>
                )}
            </div>
        </div>
    );
};

function getTimeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 3600) return `${Math.floor(diff / 60)}m temu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h temu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d temu`;
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}
