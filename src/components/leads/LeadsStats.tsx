import React, { useMemo, useState } from 'react';
import type { Lead } from '../../types';
import type { Fair } from '../../services/database/fair.service';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, differenceInDays, differenceInHours } from 'date-fns';
import { pl } from 'date-fns/locale';

interface LeadsStatsProps {
    leads: Lead[];
    fairs?: Fair[];
}

type TimeRange = 'all' | '30d' | '90d' | '6m' | '12m';

export const LeadsStats: React.FC<LeadsStatsProps> = ({ leads, fairs = [] }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

    const filteredLeads = useMemo(() => {
        if (timeRange === 'all') return leads;
        const now = new Date();
        const cutoff: Record<TimeRange, Date> = {
            all: new Date(0),
            '30d': subWeeks(now, 4),
            '90d': subMonths(now, 3),
            '6m': subMonths(now, 6),
            '12m': subMonths(now, 12),
        };
        return leads.filter(l => new Date(l.createdAt) >= cutoff[timeRange]);
    }, [leads, timeRange]);

    const stats = useMemo(() => {
        const total = filteredLeads.length;
        const won = filteredLeads.filter(l => l.status === 'won').length;
        const lost = filteredLeads.filter(l => l.status === 'lost').length;
        const active = total - won - lost;
        const newClients = filteredLeads.filter(l => ['new', 'formularz'].includes(l.status)).length;
        const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

        // ── Won Value ──
        const totalWonValue = filteredLeads
            .filter(l => l.status === 'won' && l.wonValue)
            .reduce((sum, l) => sum + (l.wonValue || 0), 0);

        // ── Average AI Score ──
        const aiScoredLeads = filteredLeads.filter(l => l.aiScore !== undefined && l.aiScore !== null);
        const avgAiScore = aiScoredLeads.length > 0
            ? Math.round(aiScoredLeads.reduce((sum, l) => sum + (l.aiScore || 0), 0) / aiScoredLeads.length)
            : null;

        // ── Stale Leads ──
        const staleThresholds: Record<string, number> = {
            new: 1, formularz: 2, contacted: 3,
            measurement_scheduled: 2, measurement_completed: 3,
            offer_sent: 5, negotiation: 7
        };
        const now = new Date();
        const staleCount = filteredLeads.filter(l => {
            if (['won', 'lost', 'fair'].includes(l.status)) return false;
            const threshold = staleThresholds[l.status] || 3;
            const lastDate = l.lastContactDate ? new Date(l.lastContactDate) : new Date(l.createdAt);
            return differenceInDays(now, lastDate) > threshold;
        }).length;

        // ── Average Response Time (hours) ──
        const responseTimes: number[] = [];
        filteredLeads.forEach(lead => {
            if (lead.status !== 'new' && lead.lastContactDate && lead.createdAt) {
                const hours = differenceInHours(new Date(lead.lastContactDate), new Date(lead.createdAt));
                if (hours > 0 && hours < 720) responseTimes.push(hours);
            }
        });
        const avgResponseHours = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : null;

        // ── Monthly Trend ──
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = subMonths(thisMonthStart, 1);
        const thisMonthLeads = filteredLeads.filter(l => new Date(l.createdAt) >= thisMonthStart).length;
        const lastMonthLeads = filteredLeads.filter(l => {
            const d = new Date(l.createdAt);
            return d >= lastMonthStart && d < thisMonthStart;
        }).length;
        const trendPercent = lastMonthLeads > 0
            ? (((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100).toFixed(0)
            : null;

        // ── Weekly Timeline (last 12 weeks) ──
        const weeklyData: { week: string; weekLabel: string; count: number; won: number; lost: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
            const weekLeads = leads.filter(l => {
                const d = new Date(l.createdAt);
                return d >= weekStart && d < weekEnd;
            });
            weeklyData.push({
                week: format(weekStart, 'dd.MM', { locale: pl }),
                weekLabel: format(weekStart, 'dd MMM', { locale: pl }),
                count: weekLeads.length,
                won: weekLeads.filter(l => l.status === 'won').length,
                lost: weekLeads.filter(l => l.status === 'lost').length,
            });
        }
        const maxWeekly = Math.max(...weeklyData.map(w => w.count), 1);

        // ── Monthly Timeline (last 6 months) ──
        const monthlyData: { month: string; count: number; won: number; lost: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const mStart = startOfMonth(subMonths(now, i));
            const mEnd = startOfMonth(subMonths(now, i - 1));
            const mLeads = leads.filter(l => {
                const d = new Date(l.createdAt);
                return d >= mStart && d < mEnd;
            });
            monthlyData.push({
                month: format(mStart, 'LLL yyyy', { locale: pl }),
                count: mLeads.length,
                won: mLeads.filter(l => l.status === 'won').length,
                lost: mLeads.filter(l => l.status === 'lost').length,
            });
        }

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
            count: filteredLeads.filter(l => l.status === s.id).length,
        }));
        const pipelineTotal = pipelineCounts.reduce((a, b) => a + b.count, 0);

        // ── Source Stats ──
        interface SourceStatItem { id: string; name: string; count: number; won: number; conversion: string; isFair: boolean; }
        const sourceMap: Record<string, SourceStatItem> = {};
        filteredLeads.forEach(lead => {
            let key: string = lead.source;
            let name = lead.source === 'targi' ? 'Targi (Nieznane)' : (lead.source || 'Inne');
            let isFair = false;
            if (lead.source === 'targi') {
                isFair = true;
                if (lead.fairId) {
                    key = lead.fairId;
                    const fair = fairs.find(f => f.id === lead.fairId);
                    name = fair ? fair.name : lead.fairId;
                } else { key = 'targi_unknown'; }
            } else if (lead.source === 'website' || lead.source === 'manual') {
                name = lead.source === 'website' ? 'Strona WWW' : 'Ręczne';
            }
            if (!sourceMap[key]) sourceMap[key] = { id: key, name, count: 0, won: 0, conversion: '0.0', isFair };
            sourceMap[key].count++;
            if (lead.status === 'won') sourceMap[key].won++;
        });
        const sourceStats = Object.values(sourceMap).map(item => ({
            ...item,
            conversion: item.count > 0 ? ((item.won / item.count) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.count - a.count);

        // ── Assignee Stats ──
        interface RepStats { id: string; name: string; total: number; active: number; won: number; lost: number; conversion: string; wonValue: number; }
        const assigneeStats: Record<string, RepStats> = {};
        filteredLeads.forEach(lead => {
            const assigneeId = lead.assignedTo || 'unassigned';
            const name = lead.assignee
                ? `${lead.assignee.firstName} ${lead.assignee.lastName}`.trim()
                : (lead.assignedTo ? 'Nieznany' : 'Nieprzypisane');
            if (!assigneeStats[assigneeId]) assigneeStats[assigneeId] = { id: assigneeId, name, total: 0, active: 0, won: 0, lost: 0, conversion: '0.0', wonValue: 0 };
            const rep = assigneeStats[assigneeId];
            rep.total++;
            if (lead.status === 'won') { rep.won++; rep.wonValue += lead.wonValue || 0; }
            else if (lead.status === 'lost') rep.lost++;
            else rep.active++;
        });
        const tableData = Object.values(assigneeStats).map(rep => ({
            ...rep,
            conversion: rep.total > 0 ? ((rep.won / rep.total) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.total - a.total);
        const topPerformer = tableData.length > 0 ? [...tableData].sort((a, b) => b.won - a.won)[0] : null;

        // ── Lost Reason Stats ──
        const lostLeads = filteredLeads.filter(l => l.status === 'lost');
        const lostReasonMap: Record<string, number> = {};
        lostLeads.forEach(lead => {
            const reason = lead.lostReason || 'Nie podano powodu';
            lostReasonMap[reason] = (lostReasonMap[reason] || 0) + 1;
        });
        const lostReasonStats = Object.entries(lostReasonMap)
            .map(([reason, count]) => ({ reason, count, percentage: lostLeads.length > 0 ? ((count / lostLeads.length) * 100).toFixed(1) : '0.0' }))
            .sort((a, b) => b.count - a.count);

        // ── Lost By Stats ──
        const lostByMap: Record<string, { name: string; count: number }> = {};
        lostLeads.forEach(lead => {
            const userId = lead.lostBy || lead.assignedTo || 'unknown';
            const name = lead.lostByName || (lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}`.trim() : '') || 'Nieznany';
            if (!lostByMap[userId]) lostByMap[userId] = { name, count: 0 };
            lostByMap[userId].count++;
        });
        const lostByStats = Object.entries(lostByMap)
            .map(([id, { name, count }]) => ({ id, name, count, percentage: lostLeads.length > 0 ? ((count / lostLeads.length) * 100).toFixed(1) : '0.0' }))
            .sort((a, b) => b.count - a.count);

        // ── Recent Leads (last 10 added) ──
        const recentLeads = [...filteredLeads]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10);

        return {
            total, won, lost, active, newClients, conversionRate, topPerformer,
            totalWonValue, avgAiScore, staleCount,
            avgResponseHours, thisMonthLeads, trendPercent,
            weeklyData, maxWeekly, monthlyData,
            pipelineCounts, pipelineTotal,
            uniqueAssignees: Object.keys(assigneeStats).length,
            detailedStats: tableData, sourceStats,
            lostReasonStats, lostByStats, recentLeads
        };
    }, [filteredLeads, fairs, leads]);

    if (leads.length === 0) return null;

    const formatResponseTime = (hours: number | null): string => {
        if (!hours) return '—';
        if (hours < 1) return `${Math.round(hours * 60)}min`;
        if (hours < 24) return `${hours.toFixed(1)}h`;
        return `${(hours / 24).toFixed(1)}d`;
    };

    const formatValue = (value: number): string => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value.toFixed(0);
    };

    const STATUS_LABELS: Record<string, string> = {
        new: 'Nowy', formularz: 'Formularz', contacted: 'Skontaktowano',
        offer_sent: 'Oferta', measurement_scheduled: 'Pomiar um.',
        measurement_completed: 'Po pomiarze', negotiation: 'Negocjacje',
        won: 'Wygrany', lost: 'Utracony', fair: 'Targi',
    };
    const STATUS_COLORS: Record<string, string> = {
        new: 'bg-blue-100 text-blue-700', formularz: 'bg-teal-100 text-teal-700',
        contacted: 'bg-indigo-100 text-indigo-700', offer_sent: 'bg-yellow-100 text-yellow-700',
        measurement_scheduled: 'bg-cyan-100 text-cyan-700', measurement_completed: 'bg-purple-100 text-purple-700',
        negotiation: 'bg-orange-100 text-orange-700', won: 'bg-emerald-100 text-emerald-700',
        lost: 'bg-red-100 text-red-700', fair: 'bg-pink-100 text-pink-700',
    };

    return (
        <div className="space-y-6 mb-6">
            {/* ══════════ Time Range Filter ══════════ */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Statystyki Leadów
                </h2>
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {([
                        ['all', 'Wszystko'],
                        ['30d', '30 dni'],
                        ['90d', '90 dni'],
                        ['6m', '6 mies.'],
                        ['12m', '12 mies.'],
                    ] as [TimeRange, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTimeRange(key)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${timeRange === key
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════════ KPI Cards ══════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                    { label: 'Wszystkie', value: stats.total, icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, color: 'text-slate-900', iconColor: 'text-slate-400', sub: `${stats.uniqueAssignees} handlowców` },
                    { label: 'Nowi Klienci', value: stats.newClients, icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>, color: 'text-blue-700', iconColor: 'text-blue-300', bg: 'from-blue-50 to-cyan-50', sub: 'Leady + Form.' },
                    { label: 'W Toku', value: stats.active, icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, color: 'text-indigo-700', iconColor: 'text-indigo-300', sub: 'Wymaga działania' },
                    { label: 'Konwersja', value: `${stats.conversionRate}%`, icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, color: 'text-emerald-700', iconColor: 'text-emerald-300', bg: 'from-emerald-50 to-green-50', sub: `${stats.won} wyg. / ${stats.lost} utr.` },
                    { label: 'Czas Reakcji', value: formatResponseTime(stats.avgResponseHours), icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: stats.avgResponseHours && stats.avgResponseHours < 4 ? 'text-emerald-600' : stats.avgResponseHours && stats.avgResponseHours < 24 ? 'text-amber-600' : 'text-red-600', iconColor: 'text-amber-300', sub: 'Śr. do 1. kontaktu' },
                    { label: 'Ten Miesiąc', value: stats.thisMonthLeads, icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, color: 'text-violet-700', iconColor: 'text-violet-300', sub: stats.trendPercent ? `${Number(stats.trendPercent) >= 0 ? '↑' : '↓'} ${Math.abs(Number(stats.trendPercent))}% vs ub. mies.` : 'Nowych leadów', subColor: stats.trendPercent && Number(stats.trendPercent) >= 0 ? 'text-emerald-500' : 'text-red-500' },
                    { label: 'Wartość', value: stats.totalWonValue > 0 ? `${formatValue(stats.totalWonValue)}€` : '—', icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-amber-700', iconColor: 'text-amber-300', bg: 'from-amber-50 to-yellow-50', sub: 'Wygrane umowy' },
                    { label: 'Zagrożone', value: stats.staleCount, icon: <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>, color: stats.staleCount > 0 ? 'text-red-600' : 'text-emerald-600', iconColor: stats.staleCount > 0 ? 'text-red-300' : 'text-emerald-300', sub: 'Bez kontaktu' },
                ].map((card, i) => (
                    <div key={i} className={`bg-gradient-to-br ${card.bg || 'from-white to-slate-50'} p-3 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}>
                        <div className={`absolute -top-2 -right-2 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity ${card.iconColor}`}>{card.icon}</div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                        <div className={`text-xl font-black mt-0.5 ${card.color}`}>{card.value}</div>
                        <p className={`text-[9px] mt-0.5 truncate ${(card as any).subColor || 'text-slate-400'}`}>{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* ══════════ Weekly Lead Intake Timeline ══════════ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Nowe Leady — Tygodniowo (12 tyg.)
                    </h3>
                    <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Nowe</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Wygrane</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Utracone</span>
                    </div>
                </div>
                <div className="flex items-end gap-1.5" style={{ height: '140px' }}>
                    {stats.weeklyData.map((w, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group/bar">
                            <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                {w.count}
                            </div>
                            <div className="w-full flex flex-col gap-px" style={{ height: `${Math.max((w.count / stats.maxWeekly) * 100, w.count > 0 ? 8 : 0)}%` }}>
                                {w.lost > 0 && <div className="bg-red-400 rounded-t-sm flex-shrink-0" style={{ height: `${(w.lost / w.count) * 100}%`, minHeight: '3px' }} />}
                                {w.won > 0 && <div className="bg-emerald-500 flex-shrink-0" style={{ height: `${(w.won / w.count) * 100}%`, minHeight: '3px' }} />}
                                <div className="bg-indigo-500 rounded-t-sm flex-1 min-h-0 hover:bg-indigo-600 transition-colors" style={{ minHeight: w.count > 0 ? '3px' : 0 }} />
                            </div>
                            <span className="text-[8px] text-slate-400 font-medium leading-none">{w.week}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════ Monthly Summary + Recent Leads ══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Summary */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Miesięczne Podsumowanie
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 text-xs bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Miesiąc</th>
                                    <th className="px-4 py-2 text-right font-medium">Nowe</th>
                                    <th className="px-4 py-2 text-right font-medium text-emerald-600">Wyg.</th>
                                    <th className="px-4 py-2 text-right font-medium text-red-500">Utr.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.monthlyData.map((m, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium text-slate-700 capitalize">{m.month}</td>
                                        <td className="px-4 py-2 text-right font-bold">{m.count}</td>
                                        <td className="px-4 py-2 text-right font-bold text-emerald-600">{m.won}</td>
                                        <td className="px-4 py-2 text-right font-bold text-red-500">{m.lost}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Leads Added */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Ostatnio Dodane Leady
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {stats.recentLeads.map(lead => (
                            <div key={lead.id} className="px-4 py-2 flex items-center justify-between hover:bg-slate-50 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {STATUS_LABELS[lead.status] || lead.status}
                                    </span>
                                    <span className="font-medium text-slate-800 truncate">
                                        {lead.customerData?.firstName} {lead.customerData?.lastName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {lead.customerData?.city && <span className="text-[10px] text-slate-400">{lead.customerData.city}</span>}
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {format(new Date(lead.createdAt), 'dd.MM.yy HH:mm', { locale: pl })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════ Pipeline Bar ══════════ */}
            {stats.pipelineTotal > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                            Rozkład Pipeline
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">{stats.pipelineTotal} aktywnych</span>
                    </div>
                    <div className="flex rounded-full overflow-hidden h-6 bg-slate-100">
                        {stats.pipelineCounts.filter(s => s.count > 0).map(s => (
                            <div key={s.id} className="h-full transition-all duration-500 relative group/bar"
                                style={{ width: `${(s.count / stats.pipelineTotal) * 100}%`, backgroundColor: s.color, minWidth: s.count > 0 ? '20px' : 0 }}
                                title={`${s.label}: ${s.count}`}>
                                {(s.count / stats.pipelineTotal) > 0.06 && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">{s.count}</span>
                                )}
                            </div>
                        ))}
                    </div>
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

            {/* ══════════ Tables ══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Performance */}
                {stats.detailedStats.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Efektywność Zespołu
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 text-xs bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-2">Przedstawiciel</th>
                                        <th className="px-4 py-2 text-right">Razem</th>
                                        <th className="px-4 py-2 text-right text-emerald-600">Wyg.</th>
                                        <th className="px-4 py-2 text-right text-red-500">Utr.</th>
                                        <th className="px-4 py-2 text-right">%</th>
                                        {stats.detailedStats.some(r => r.wonValue > 0) && <th className="px-4 py-2 text-right">Wartość</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stats.detailedStats.map((rep, idx) => (
                                        <tr key={rep.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-medium text-slate-900">
                                                <div className="flex items-center gap-1.5">
                                                    {idx === 0 && rep.won > 0 && <span className="text-amber-400 text-xs">★</span>}
                                                    {rep.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold">{rep.total}</td>
                                            <td className="px-4 py-2 text-right text-emerald-600 font-bold">{rep.won}</td>
                                            <td className="px-4 py-2 text-right text-red-500 font-semibold">{rep.lost}</td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="text-xs">{rep.conversion}%</span>
                                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(parseFloat(rep.conversion), 100)}%` }} /></div>
                                                </div>
                                            </td>
                                            {stats.detailedStats.some(r => r.wonValue > 0) && (
                                                <td className="px-4 py-2 text-right font-semibold text-amber-600">
                                                    {rep.wonValue > 0 ? `${formatValue(rep.wonValue)}€` : '—'}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Sources */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Źródła Leadów
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 text-xs bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2">Źródło</th>
                                    <th className="px-4 py-2 text-right">Ilość</th>
                                    <th className="px-4 py-2 text-right text-emerald-600">Wyg.</th>
                                    <th className="px-4 py-2 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.sourceStats.map(source => (
                                    <tr key={source.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium text-slate-900">
                                            <div className="flex items-center gap-1.5">
                                                {source.isFair && <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                                {!source.isFair && source.name.includes('WWW') && <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                                                {!source.isFair && source.name.includes('Ręczne') && <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                                {source.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold">{source.count}</td>
                                        <td className="px-4 py-2 text-right text-emerald-600 font-bold">{source.won}</td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-xs">{source.conversion}%</span>
                                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(parseFloat(source.conversion), 100)}%` }} /></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ══════════ Lost Analysis ══════════ */}
            {stats.lostReasonStats.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-red-100 bg-red-50">
                            <h3 className="font-bold text-sm text-red-800 flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Utracone
                            </h3>
                        </div>
                        <div className="p-5 flex flex-col items-center justify-center">
                            <div className="text-4xl font-bold text-red-600">{stats.lost}</div>
                            <div className="text-xs text-slate-500 mt-1">({stats.total > 0 ? ((stats.lost / stats.total) * 100).toFixed(1) : '0.0'}% wszystkich)</div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-red-100 bg-red-50">
                            <h3 className="font-bold text-sm text-red-800">Powody Utraty</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 text-xs bg-red-50/50 border-b border-red-100">
                                    <tr>
                                        <th className="px-4 py-2">Powód</th>
                                        <th className="px-4 py-2 text-right">Ilość</th>
                                        <th className="px-4 py-2 text-right">Udział</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stats.lostReasonStats.map(item => (
                                        <tr key={item.reason} className="hover:bg-red-50/30">
                                            <td className="px-4 py-2 font-medium text-slate-900 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                                {item.reason}
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-red-600">{item.count}</td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="text-xs">{item.percentage}%</span>
                                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }} /></div>
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
                    <div className="px-5 py-3 border-b border-amber-100 bg-amber-50">
                        <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Kto tracił leady?
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 text-xs bg-amber-50/50 border-b border-amber-100">
                                <tr>
                                    <th className="px-4 py-2">Przedstawiciel</th>
                                    <th className="px-4 py-2 text-right">Utracone</th>
                                    <th className="px-4 py-2 text-right">Udział</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.lostByStats.map(item => (
                                    <tr key={item.id} className="hover:bg-amber-50/30">
                                        <td className="px-4 py-2 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[9px] font-bold text-amber-700 border border-amber-200">
                                                    {item.name[0]}
                                                </div>
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-amber-600">{item.count}</td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-xs">{item.percentage}%</span>
                                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }} /></div>
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
