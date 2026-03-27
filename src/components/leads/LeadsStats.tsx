import React, { useMemo } from 'react';
import type { Lead } from '../../types';
import type { Fair } from '../../services/database/fair.service';

interface LeadsStatsProps {
    leads: Lead[];
    fairs?: Fair[];
}

export const LeadsStats: React.FC<LeadsStatsProps> = ({ leads, fairs = [] }) => {

    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === 'won').length;
        const lost = leads.filter(l => l.status === 'lost').length;
        const active = total - won - lost;
        const newClients = leads.filter(l => ['new', 'formularz'].includes(l.status)).length;

        const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

        // ── Average Response Time (hours) ──
        const responseTimes: number[] = [];
        leads.forEach(lead => {
            if (lead.status !== 'new' && lead.lastContactDate && lead.createdAt) {
                const hours = (new Date(lead.lastContactDate).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
                if (hours > 0 && hours < 720) responseTimes.push(hours); // max 30 days
            }
        });
        const avgResponseHours = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : null;

        // ── Monthly Trend ──
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonthLeads = leads.filter(l => new Date(l.createdAt) >= thisMonthStart).length;
        const lastMonthLeads = leads.filter(l => {
            const d = new Date(l.createdAt);
            return d >= lastMonthStart && d < thisMonthStart;
        }).length;
        const trendPercent = lastMonthLeads > 0
            ? (((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100).toFixed(0)
            : null;

        // ── Pipeline Distribution ──
        const pipelineStages = [
            { id: 'new', label: 'Nowe', color: '#3B82F6' },
            { id: 'formularz', label: 'Formularz', color: '#14B8A6' },
            { id: 'contacted', label: 'Kontakt', color: '#6366F1' },
            { id: 'offer_sent', label: 'Oferta', color: '#F59E0B' },
            { id: 'measurement_scheduled', label: 'Pomiar', color: '#06B6D4' },
            { id: 'measurement_completed', label: 'Po pomiarze', color: '#A855F7' },
            { id: 'negotiation', label: 'Negocjacje', color: '#F97316' },
        ];
        const pipelineCounts = pipelineStages.map(s => ({
            ...s,
            count: leads.filter(l => l.status === s.id).length,
        }));
        const pipelineTotal = pipelineCounts.reduce((a, b) => a + b.count, 0);

        // ── Source Stats ──
        interface SourceStatItem {
            id: string;
            name: string;
            count: number;
            won: number;
            conversion: string;
            isFair: boolean;
        }

        const sourceMap: Record<string, SourceStatItem> = {};
        leads.forEach(lead => {
            let key: string = lead.source;
            let name = lead.source === 'targi' ? 'Targi (Nieznane)' : (lead.source || 'Inne');
            let isFair = false;

            if (lead.source === 'targi') {
                isFair = true;
                if (lead.fairId) {
                    key = lead.fairId;
                    const fair = fairs.find(f => f.id === lead.fairId);
                    name = fair ? `🎡 ${fair.name}` : `🎡 ${lead.fairId}`;
                } else {
                    key = 'targi_unknown';
                }
            } else if (lead.source === 'website' || lead.source === 'manual') {
                name = lead.source === 'website' ? '🌐 Strona WWW' : '👤 Ręczne';
            }

            if (!sourceMap[key]) {
                sourceMap[key] = { id: key, name, count: 0, won: 0, conversion: '0.0', isFair };
            }
            sourceMap[key].count++;
            if (lead.status === 'won') sourceMap[key].won++;
        });

        const sourceStats = Object.values(sourceMap).map(item => ({
            ...item,
            conversion: item.count > 0 ? ((item.won / item.count) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.count - a.count);

        // ── Assignee Stats ──
        interface RepStats {
            id: string;
            name: string;
            total: number;
            active: number;
            won: number;
            lost: number;
            conversion: string;
        }

        const assigneeStats: Record<string, RepStats> = {};
        leads.forEach(lead => {
            const assigneeId = lead.assignedTo || 'unassigned';
            const name = lead.assignee
                ? `${lead.assignee.firstName} ${lead.assignee.lastName}`.trim()
                : (lead.assignedTo ? 'Nieznany' : 'Nieprzypisane');

            if (!assigneeStats[assigneeId]) {
                assigneeStats[assigneeId] = { id: assigneeId, name, total: 0, active: 0, won: 0, lost: 0, conversion: '0.0' };
            }
            const rep = assigneeStats[assigneeId];
            rep.total++;
            if (lead.status === 'won') rep.won++;
            else if (lead.status === 'lost') rep.lost++;
            else rep.active++;
        });

        const sortedAssignees = Object.values(assigneeStats).map(rep => ({
            ...rep,
            conversion: rep.total > 0 ? ((rep.won / rep.total) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.total - a.total);

        const topPerformer = sortedAssignees.length > 0 ? [...sortedAssignees].sort((a, b) => b.won - a.won)[0] : null;
        const tableData = [...sortedAssignees].sort((a, b) => b.total - a.total);

        // ── Lost Reason Stats ──
        const lostLeads = leads.filter(l => l.status === 'lost');
        const lostReasonMap: Record<string, number> = {};
        lostLeads.forEach(lead => {
            const reason = lead.lostReason || 'Nie podano powodu';
            lostReasonMap[reason] = (lostReasonMap[reason] || 0) + 1;
        });
        const lostReasonStats = Object.entries(lostReasonMap)
            .map(([reason, count]) => ({
                reason, count,
                percentage: lostLeads.length > 0 ? ((count / lostLeads.length) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.count - a.count);

        // ── Lost By Stats ──
        const lostByMap: Record<string, { name: string; count: number }> = {};
        lostLeads.forEach(lead => {
            const userId = lead.lostBy || lead.assignedTo || 'unknown';
            const name = lead.lostByName
                || (lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}`.trim() : '')
                || 'Nieznany';
            if (!lostByMap[userId]) lostByMap[userId] = { name, count: 0 };
            lostByMap[userId].count++;
        });
        const lostByStats = Object.entries(lostByMap)
            .map(([id, { name, count }]) => ({
                id, name, count,
                percentage: lostLeads.length > 0 ? ((count / lostLeads.length) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.count - a.count);

        return {
            total, won, lost, active, newClients,
            conversionRate, topPerformer,
            avgResponseHours, thisMonthLeads, trendPercent,
            pipelineCounts, pipelineTotal,
            uniqueAssignees: Object.keys(assigneeStats).length,
            detailedStats: tableData, sourceStats,
            lostReasonStats, lostByStats
        };
    }, [leads, fairs]);

    if (leads.length === 0) return null;

    // Format response time nicely
    const formatResponseTime = (hours: number | null): string => {
        if (!hours) return '—';
        if (hours < 1) return `${Math.round(hours * 60)}min`;
        if (hours < 24) return `${hours.toFixed(1)}h`;
        return `${(hours / 24).toFixed(1)}d`;
    };

    return (
        <div className="space-y-8 mb-6">
            {/* ══════════════ KPI Cards Grid ══════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                        <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wszystkie</p>
                    <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
                    {stats.topPerformer && stats.uniqueAssignees > 1 && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">Lider: <span className="font-semibold text-slate-600">{stats.topPerformer.name}</span></p>
                    )}
                </div>

                {/* New Clients */}
                <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-4 rounded-xl border border-blue-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                        <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Nowi Klienci</p>
                    <div className="text-2xl font-black text-blue-700 mt-1">{stats.newClients}</div>
                    <p className="text-[10px] text-blue-400 mt-1">Leady + Formularz</p>
                </div>

                {/* Active */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                        <svg className="w-12 h-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">W Toku</p>
                    <div className="text-2xl font-black text-indigo-600 mt-1">{stats.active}</div>
                    <p className="text-[10px] text-indigo-300 mt-1">Wymaga działania</p>
                </div>

                {/* Conversion Rate */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                        <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Konwersja</p>
                    <div className="text-2xl font-black text-emerald-700 mt-1">{stats.conversionRate}%</div>
                    <p className="text-[10px] text-emerald-400 mt-1">{stats.won} wygranych z {stats.total}</p>
                </div>

                {/* Response Time */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                        <svg className="w-12 h-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Czas Reakcji</p>
                    <div className={`text-2xl font-black mt-1 ${stats.avgResponseHours && stats.avgResponseHours < 4 ? 'text-emerald-600' : stats.avgResponseHours && stats.avgResponseHours < 24 ? 'text-amber-600' : 'text-red-600'}`}>
                        {formatResponseTime(stats.avgResponseHours)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Śr. do 1. kontaktu</p>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                        <svg className="w-12 h-12 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ten Miesiąc</p>
                    <div className="text-2xl font-black text-slate-800 mt-1">{stats.thisMonthLeads}</div>
                    {stats.trendPercent && (
                        <p className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${Number(stats.trendPercent) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {Number(stats.trendPercent) >= 0 ? '↑' : '↓'} {Math.abs(Number(stats.trendPercent))}% vs ub. mies.
                        </p>
                    )}
                </div>
            </div>

            {/* ══════════════ Pipeline Distribution Bar ══════════════ */}
            {stats.pipelineTotal > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                            Rozkład Pipeline
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">{stats.pipelineTotal} aktywnych</span>
                    </div>
                    {/* Stacked bar */}
                    <div className="flex rounded-full overflow-hidden h-5 bg-slate-100">
                        {stats.pipelineCounts.filter(s => s.count > 0).map(s => (
                            <div
                                key={s.id}
                                className="h-full transition-all duration-500 relative group/bar"
                                style={{
                                    width: `${(s.count / stats.pipelineTotal) * 100}%`,
                                    backgroundColor: s.color,
                                    minWidth: s.count > 0 ? '16px' : 0,
                                }}
                                title={`${s.label}: ${s.count}`}
                            >
                                {(s.count / stats.pipelineTotal) > 0.08 && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                                        {s.count}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                        {stats.pipelineCounts.filter(s => s.count > 0).map(s => (
                            <div key={s.id} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="font-medium">{s.label}</span>
                                <span className="text-slate-400">({s.count})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════ Tables Grid ══════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Performance */}
                {stats.detailedStats.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Efektywność Zespołu
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Analiza wyników handlowców</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Przedstawiciel</th>
                                        <th className="px-6 py-3 text-right">Razem</th>
                                        <th className="px-6 py-3 text-right text-green-600">Wygrane</th>
                                        <th className="px-6 py-3 text-right text-red-500">Utracone</th>
                                        <th className="px-6 py-3 text-right">Skuteczność</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.detailedStats.map((rep, index) => (
                                        <tr key={rep.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    {index === 0 && rep.won > 0 && (
                                                        <span className="text-yellow-400" title="Najlepszy wynik (Wygrane)">★</span>
                                                    )}
                                                    {rep.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-semibold">{rep.total}</td>
                                            <td className="px-6 py-3 text-right text-green-600 font-bold">{rep.won}</td>
                                            <td className="px-6 py-3 text-right text-red-500 font-semibold">{rep.lost}</td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>{rep.conversion}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full"
                                                            style={{ width: `${Math.min(parseFloat(rep.conversion), 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Sources Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                Źródła Leadów
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Analiza źródeł i targów</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">Źródło / Targi</th>
                                    <th className="px-6 py-3 text-right">Ilość</th>
                                    <th className="px-6 py-3 text-right text-green-600">Wygrane</th>
                                    <th className="px-6 py-3 text-right">Skuteczność</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.sourceStats.map((source) => (
                                    <tr key={source.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {source.isFair ? (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-purple-500">🎡</span> {source.name.replace('🎡 ', '')}
                                                </span>
                                            ) : (
                                                source.name
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right font-semibold">{source.count}</td>
                                        <td className="px-6 py-3 text-right text-green-600 font-bold">{source.won}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span>{source.conversion}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${Math.min(parseFloat(source.conversion), 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ══════════════ Lost Analysis ══════════════ */}
            {stats.lostReasonStats.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lost Summary Card */}
                    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                            <h3 className="font-bold text-red-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Utracone Szanse
                            </h3>
                            <p className="text-xs text-red-600 mt-0.5">Analiza powodów utraty</p>
                        </div>
                        <div className="p-6 flex flex-col items-center justify-center">
                            <div className="text-5xl font-bold text-red-600">{stats.lost}</div>
                            <div className="text-sm text-slate-500 mt-2">utraconych leadów</div>
                            <div className="text-xs text-slate-400 mt-1">
                                ({stats.total > 0 ? ((stats.lost / stats.total) * 100).toFixed(1) : '0.0'}% wszystkich)
                            </div>
                        </div>
                    </div>

                    {/* Lost Reasons Table */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-red-800">Powody Utraty</h3>
                                <p className="text-xs text-red-600 mt-0.5">Dlaczego tracimy klientów?</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 font-medium bg-red-50/50 border-b border-red-100">
                                    <tr>
                                        <th className="px-6 py-3">Powód</th>
                                        <th className="px-6 py-3 text-right">Ilość</th>
                                        <th className="px-6 py-3 text-right">Udział</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.lostReasonStats.map((item) => (
                                        <tr key={item.reason} className="hover:bg-red-50/30">
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                    {item.reason}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-red-600">{item.count}</td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>{item.percentage}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-500 rounded-full"
                                                            style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Who Lost Leads */}
            {stats.lostByStats.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Kto tracił leady?
                        </h3>
                        <p className="text-xs text-amber-600 mt-0.5">Który przedstawiciel oznaczył leady jako utracone</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 font-medium bg-amber-50/50 border-b border-amber-100">
                                <tr>
                                    <th className="px-6 py-3">Przedstawiciel</th>
                                    <th className="px-6 py-3 text-right">Utracone</th>
                                    <th className="px-6 py-3 text-right">Udział</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.lostByStats.map((item) => (
                                    <tr key={item.id} className="hover:bg-amber-50/30">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 border border-amber-200">
                                                    {item.name[0]}
                                                </div>
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-amber-600">{item.count}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span>{item.percentage}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-500 rounded-full"
                                                        style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
