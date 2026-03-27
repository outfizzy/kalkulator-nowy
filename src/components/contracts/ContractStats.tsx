import React, { useMemo, useState } from 'react';
import type { Contract } from '../../types';

interface ContractStatsProps {
    contracts: Contract[];
    showCommission?: boolean;
}

interface RepStats {
    repId: string;
    repName: string;
    count: number;
    totalValueNet: number;
    totalCommission: number;
    totalProfit: number;
}

interface MonthData {
    key: string; // '2026-01'
    label: string; // 'Sty 2026'
    count: number;
    totalNet: number;
    totalProfit: number;
    totalCommission: number;
    byRep: Record<string, { count: number; totalNet: number; totalProfit: number; totalCommission: number }>;
    byStatus: Record<string, number>;
}

const MONTH_LABELS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const STATUS_LABELS: Record<string, string> = { draft: 'Szkic', signed: 'Podpisana', completed: 'Zakończona', cancelled: 'Anulowana' };
const STATUS_COLORS: Record<string, string> = { draft: '#94a3b8', signed: '#22c55e', completed: '#6366f1', cancelled: '#ef4444' };
const REP_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#14b8a6'];

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

/**
 * Extract the net value from a contract, handling all possible sources:
 * - Manual contracts: pricing.finalPriceNet
 * - Offer-based contracts: pricing.sellingPriceNet (or finalPriceNet as override)
 * - Also considers installationCosts.totalNet for installation price
 */
const getContractNetValue = (c: Contract): number => {
    const finalNet = Number(c.pricing?.finalPriceNet || 0);
    const sellingNet = Number(c.pricing?.sellingPriceNet || 0);
    // Use the higher of finalPriceNet and sellingPriceNet as the source of truth
    // finalPriceNet is the override for signed contracts, sellingPriceNet is the original
    const baseNet = Math.max(finalNet, sellingNet);
    // Add installation price if present
    const installNet = Number(c.pricing?.installationCosts?.totalNet || 0);
    return baseNet + installNet;
};

/**
 * Get the relevant date for a contract (prefers signedAt for signed/completed, falls back to createdAt)
 */
const getContractDate = (c: Contract): Date => {
    if (c.signedAt) return new Date(c.signedAt);
    return new Date(c.createdAt);
};

/** Date preset helper */
type DatePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'lastYear' | 'all' | 'custom';

const getPresetRange = (preset: DatePreset): { from: string; to: string } => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    switch (preset) {
        case 'thisMonth':
            return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: formatDateISO(now) };
        case 'lastMonth': {
            const lm = m === 0 ? 11 : m - 1;
            const ly = m === 0 ? y - 1 : y;
            const lastDay = new Date(ly, lm + 1, 0).getDate();
            return { from: `${ly}-${String(lm + 1).padStart(2, '0')}-01`, to: `${ly}-${String(lm + 1).padStart(2, '0')}-${lastDay}` };
        }
        case 'thisQuarter': {
            const qStart = Math.floor(m / 3) * 3;
            return { from: `${y}-${String(qStart + 1).padStart(2, '0')}-01`, to: formatDateISO(now) };
        }
        case 'thisYear':
            return { from: `${y}-01-01`, to: formatDateISO(now) };
        case 'lastYear':
            return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
        case 'all':
            return { from: '', to: '' };
        default:
            return { from: '', to: '' };
    }
};

const formatDateISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const ContractStats: React.FC<ContractStatsProps> = ({ contracts, showCommission = false }) => {
    const [activeView, setActiveView] = useState<'overview' | 'reps' | 'months'>('overview');
    const [activePreset, setActivePreset] = useState<DatePreset>('thisYear');

    // Date range state
    const initialRange = getPresetRange('thisYear');
    const [dateFrom, setDateFrom] = useState(initialRange.from);
    const [dateTo, setDateTo] = useState(initialRange.to);

    // Apply preset
    const applyPreset = (preset: DatePreset) => {
        setActivePreset(preset);
        if (preset === 'custom') return;
        const range = getPresetRange(preset);
        setDateFrom(range.from);
        setDateTo(range.to);
    };

    // Filtered contracts by date range (excluding cancelled from stats)
    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            // Exclude cancelled contracts from statistics
            if (c.status === 'cancelled') return false;

            const d = getContractDate(c);
            if (isNaN(d.getTime())) return false;

            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (d < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (d > to) return false;
            }
            return true;
        });
    }, [contracts, dateFrom, dateTo]);

    // All contracts in range (including cancelled, for status counts)
    const allInRange = useMemo(() => {
        return contracts.filter(c => {
            const d = getContractDate(c);
            if (isNaN(d.getTime())) return false;
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (d < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (d > to) return false;
            }
            return true;
        });
    }, [contracts, dateFrom, dateTo]);

    // Per-rep stats
    const repStats = useMemo(() => {
        const repMap = new Map<string, RepStats>();
        filteredContracts.forEach(c => {
            const repId = c.salesRepId || 'unknown';
            const repName = c.salesRep ? `${c.salesRep.firstName} ${c.salesRep.lastName}` : 'Brak przypisania';
            if (!repMap.has(repId)) repMap.set(repId, { repId, repName, count: 0, totalValueNet: 0, totalCommission: 0, totalProfit: 0 });
            const r = repMap.get(repId)!;
            r.count += 1;
            r.totalValueNet += getContractNetValue(c);
            r.totalCommission += Number(c.commission || 0);
            r.totalProfit += Number(c.pricing?.marginValue || 0);
        });
        return Array.from(repMap.values()).sort((a, b) => b.totalValueNet - a.totalValueNet);
    }, [filteredContracts]);

    // Determine year range for monthly breakdown
    const yearRange = useMemo(() => {
        if (filteredContracts.length === 0) return { startYear: new Date().getFullYear(), endYear: new Date().getFullYear() };
        const dates = filteredContracts.map(c => getContractDate(c));
        const minYear = Math.min(...dates.map(d => d.getFullYear()));
        const maxYear = Math.max(...dates.map(d => d.getFullYear()));
        return { startYear: minYear, endYear: maxYear };
    }, [filteredContracts]);

    // Monthly breakdown across all years in range
    const monthData = useMemo(() => {
        const months: MonthData[] = [];
        for (let y = yearRange.startYear; y <= yearRange.endYear; y++) {
            const startM = (dateFrom && y === yearRange.startYear) ? new Date(dateFrom).getMonth() : 0;
            const endM = (dateTo && y === yearRange.endYear) ? new Date(dateTo).getMonth() : 11;
            for (let m = startM; m <= endM; m++) {
                const key = `${y}-${String(m + 1).padStart(2, '0')}`;
                months.push({
                    key,
                    label: `${MONTH_LABELS_PL[m]} ${y}`,
                    count: 0,
                    totalNet: 0,
                    totalProfit: 0,
                    totalCommission: 0,
                    byRep: {},
                    byStatus: {}
                });
            }
        }

        filteredContracts.forEach(c => {
            const d = getContractDate(c);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const md = months.find(m => m.key === key);
            if (!md) return;

            md.count += 1;
            const net = getContractNetValue(c);
            const profit = Number(c.pricing?.marginValue || 0);
            const commission = Number(c.commission || 0);
            md.totalNet += net;
            md.totalProfit += profit;
            md.totalCommission += commission;

            // By rep
            const repId = c.salesRepId || 'unknown';
            if (!md.byRep[repId]) md.byRep[repId] = { count: 0, totalNet: 0, totalProfit: 0, totalCommission: 0 };
            md.byRep[repId].count += 1;
            md.byRep[repId].totalNet += net;
            md.byRep[repId].totalProfit += profit;
            md.byRep[repId].totalCommission += commission;

            // By status
            const st = c.status || 'draft';
            md.byStatus[st] = (md.byStatus[st] || 0) + 1;
        });

        return months;
    }, [filteredContracts, yearRange, dateFrom, dateTo]);

    // Totals
    const totals = useMemo(() => ({
        count: filteredContracts.length,
        totalNet: filteredContracts.reduce((s, c) => s + getContractNetValue(c), 0),
        totalProfit: filteredContracts.reduce((s, c) => s + Number(c.pricing?.marginValue || 0), 0),
        totalCommission: filteredContracts.reduce((s, c) => s + Number(c.commission || 0), 0),
        signed: allInRange.filter(c => c.status === 'signed' || c.status === 'completed').length,
        cancelled: allInRange.filter(c => c.status === 'cancelled').length,
        allCount: allInRange.length,
    }), [filteredContracts, allInRange]);

    const maxMonthNet = Math.max(...monthData.map(m => m.totalNet), 1);

    const repColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        repStats.forEach((r, i) => { map[r.repId] = REP_COLORS[i % REP_COLORS.length]; });
        return map;
    }, [repStats]);

    // Date range label
    const dateLabel = useMemo(() => {
        const labels: Record<DatePreset, string> = {
            thisMonth: 'Bieżący miesiąc',
            lastMonth: 'Poprzedni miesiąc',
            thisQuarter: 'Bieżący kwartał',
            thisYear: 'Bieżący rok',
            lastYear: 'Poprzedni rok',
            all: 'Cały okres',
            custom: 'Własny zakres'
        };
        return labels[activePreset];
    }, [activePreset]);

    return (
        <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header with date range + view toggle */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-lg font-bold text-slate-800">Statystyki Umów</h3>
                        <span className="text-xs text-slate-400 font-medium">{dateLabel}</span>
                    </div>
                    {/* View toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        {([['overview', 'Przegląd'], ['reps', 'Przedstawiciele'], ['months', 'Miesiące']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => setActiveView(id)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date range controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Preset buttons */}
                    {([
                        ['thisMonth', 'Ten miesiąc'],
                        ['lastMonth', 'Poprzedni'],
                        ['thisQuarter', 'Kwartał'],
                        ['thisYear', `${new Date().getFullYear()}`],
                        ['lastYear', `${new Date().getFullYear() - 1}`],
                        ['all', 'Wszystko']
                    ] as [DatePreset, string][]).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => applyPreset(id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${activePreset === id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                            {label}
                        </button>
                    ))}

                    {/* Custom date picker separator */}
                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Custom date inputs */}
                    <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setActivePreset('custom'); }}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-[130px]"
                        />
                        <span className="text-xs text-slate-400 font-medium">—</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setActivePreset('custom'); }}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-[130px]"
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Umowy</p>
                    <p className="text-2xl font-bold text-slate-800">{totals.count}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">{totals.signed} podpisanych</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Obrót Netto</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalNet)}</p>
                    <p className="text-xs text-slate-400 mt-1">{totals.count > 0 ? `Śr. ${formatCurrency(totals.totalNet / totals.count)}` : '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Zysk</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalProfit)}</p>
                    <p className="text-xs text-slate-400 mt-1">{totals.totalNet > 0 ? `${((totals.totalProfit / totals.totalNet) * 100).toFixed(1)}% marży` : '-'}</p>
                </div>
                {showCommission && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Prowizje</p>
                        <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totals.totalCommission)}</p>
                        <p className="text-xs text-slate-400 mt-1">{totals.totalNet > 0 ? `${((totals.totalCommission / totals.totalNet) * 100).toFixed(1)}% obrotu` : '-'}</p>
                    </div>
                )}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Anulowane</p>
                    <p className="text-2xl font-bold text-red-500">{totals.cancelled}</p>
                    <p className="text-xs text-slate-400 mt-1">{totals.allCount > 0 ? `${((totals.cancelled / totals.allCount) * 100).toFixed(0)}% wszystkich` : '-'}</p>
                </div>
            </div>

            {/* VIEW: OVERVIEW — Monthly bar chart */}
            {activeView === 'overview' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-700 mb-4">Obrót miesięczny (Netto)</h4>
                    <div className="flex items-end gap-1.5" style={{ height: 200 }}>
                        {monthData.map((m) => {
                            const pct = maxMonthNet > 0 ? (m.totalNet / maxMonthNet) * 100 : 0;
                            const now = new Date();
                            const [mYear, mMonth] = m.key.split('-').map(Number);
                            const isCurrent = (mMonth - 1) === now.getMonth() && mYear === now.getFullYear();
                            return (
                                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group relative" style={{ minWidth: 20 }}>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                        <p className="font-bold">{m.label}</p>
                                        <p>{m.count} umów · {formatCurrency(m.totalNet)}</p>
                                        <p className="text-green-400">Zysk: {formatCurrency(m.totalProfit)}</p>
                                        {showCommission && <p className="text-indigo-300">Prowizje: {formatCurrency(m.totalCommission)}</p>}
                                    </div>
                                    {/* Bar */}
                                    <div
                                        className={`w-full rounded-t-md transition-all duration-300 ${isCurrent ? 'bg-indigo-500' : 'bg-indigo-300 group-hover:bg-indigo-400'}`}
                                        style={{ height: `${Math.max(pct, 2)}%`, minHeight: m.count > 0 ? 8 : 2 }}
                                    />
                                    {/* Label */}
                                    <p className={`text-[10px] mt-1.5 font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {m.label.split(' ')[0]}
                                    </p>
                                    {m.count > 0 && (
                                        <p className="text-[9px] text-slate-400">{m.count}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Status breakdown mini-legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                        {Object.entries(STATUS_LABELS).map(([key, label]) => {
                            const cnt = allInRange.filter(c => c.status === key).length;
                            if (cnt === 0) return null;
                            return (
                                <div key={key} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                                    <span className="text-xs text-slate-600 font-medium">{label}: <strong>{cnt}</strong></span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* VIEW: REPS — Per-rep table */}
            {activeView === 'reps' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Przedstawiciel</th>
                                <th className="px-4 py-3 text-right">Umowy</th>
                                <th className="px-4 py-3 text-right">Obrót Netto</th>
                                <th className="px-4 py-3 text-right">Zysk</th>
                                {showCommission && <th className="px-4 py-3 text-right">Prowizja</th>}
                                <th className="px-4 py-3 text-right rounded-r-lg">Śr. Wartość</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {repStats.map((stat) => (
                                <tr key={stat.repId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: repColorMap[stat.repId] }} />
                                        {stat.repName}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">{stat.count}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(stat.totalValueNet)}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(stat.totalProfit)}</td>
                                    {showCommission && <td className="px-4 py-3 text-right text-indigo-600 font-medium">{formatCurrency(stat.totalCommission)}</td>}
                                    <td className="px-4 py-3 text-right text-slate-500">{stat.count > 0 ? formatCurrency(stat.totalValueNet / stat.count) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold text-slate-800">
                            <tr>
                                <td className="px-4 py-3 rounded-l-lg">RAZEM</td>
                                <td className="px-4 py-3 text-right">{totals.count}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(totals.totalNet)}</td>
                                <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totals.totalProfit)}</td>
                                {showCommission && <td className="px-4 py-3 text-right text-indigo-700">{formatCurrency(totals.totalCommission)}</td>}
                                <td className="px-4 py-3 text-right rounded-r-lg">{totals.count > 0 ? formatCurrency(totals.totalNet / totals.count) : '-'}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Per-rep monthly mini-bars */}
                    {repStats.length > 0 && monthData.length > 0 && (
                        <div className="p-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rozkład miesięczny wg przedstawiciela</h4>
                            <div className="space-y-3">
                                {repStats.map(rep => {
                                    const repMonthly = monthData.map(m => m.byRep[rep.repId]?.count || 0);
                                    const maxRepMonth = Math.max(...repMonthly, 1);
                                    return (
                                        <div key={rep.repId} className="flex items-center gap-3">
                                            <div className="w-32 flex items-center gap-2 flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: repColorMap[rep.repId] }} />
                                                <span className="text-xs text-slate-600 font-medium truncate">{rep.repName}</span>
                                            </div>
                                            <div className="flex-1 flex items-end gap-0.5" style={{ height: 24 }}>
                                                {repMonthly.map((cnt, idx) => (
                                                    <div key={idx} className="flex-1 flex justify-center">
                                                        <div
                                                            className="w-full rounded-sm transition-all"
                                                            style={{
                                                                backgroundColor: repColorMap[rep.repId],
                                                                height: `${cnt > 0 ? Math.max((cnt / maxRepMonth) * 100, 15) : 4}%`,
                                                                opacity: cnt > 0 ? 0.8 : 0.15,
                                                                minHeight: cnt > 0 ? 6 : 1
                                                            }}
                                                            title={`${monthData[idx]?.label || ''}: ${cnt} umów`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs text-slate-500 font-bold w-6 text-right">{rep.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW: MONTHS — Monthly detail table */}
            {activeView === 'months' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Miesiąc</th>
                                <th className="px-4 py-3 text-right">Umowy</th>
                                <th className="px-4 py-3 text-right">Obrót Netto</th>
                                <th className="px-4 py-3 text-right">Zysk</th>
                                {showCommission && <th className="px-4 py-3 text-right">Prowizje</th>}
                                <th className="px-4 py-3 rounded-r-lg">Statusy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthData.map((m) => {
                                if (m.count === 0) return (
                                    <tr key={m.key} className="text-slate-300">
                                        <td className="px-4 py-2.5 text-xs">{m.label}</td>
                                        <td className="px-4 py-2.5 text-right text-xs">0</td>
                                        <td className="px-4 py-2.5 text-right text-xs">-</td>
                                        <td className="px-4 py-2.5 text-right text-xs">-</td>
                                        {showCommission && <td className="px-4 py-2.5 text-right text-xs">-</td>}
                                        <td className="px-4 py-2.5 text-xs">-</td>
                                    </tr>
                                );
                                return (
                                    <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800">{m.label}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-700">{m.count}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(m.totalNet)}</td>
                                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(m.totalProfit)}</td>
                                        {showCommission && <td className="px-4 py-3 text-right text-indigo-600 font-medium">{formatCurrency(m.totalCommission)}</td>}
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {Object.entries(m.byStatus).map(([st, cnt]) => (
                                                    <span key={st} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: STATUS_COLORS[st] + '20', color: STATUS_COLORS[st] }}>
                                                        {cnt} {STATUS_LABELS[st] || st}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold text-slate-800">
                            <tr>
                                <td className="px-4 py-3 rounded-l-lg">RAZEM</td>
                                <td className="px-4 py-3 text-right">{totals.count}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(totals.totalNet)}</td>
                                <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totals.totalProfit)}</td>
                                {showCommission && <td className="px-4 py-3 text-right text-indigo-700">{formatCurrency(totals.totalCommission)}</td>}
                                <td className="px-4 py-3 rounded-r-lg"></td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Monthly per-rep matrix: Count + Net + Commission */}
                    {repStats.length > 0 && monthData.length > 0 && (
                        <div className="p-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                Umowy i prowizje wg przedstawiciela i miesiąca
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2 text-left text-slate-500 font-bold">Przedstawiciel</th>
                                            {monthData.map(m => (
                                                <th key={m.key} className="px-3 py-2 text-center text-slate-500 font-bold border-l border-slate-100">
                                                    {m.label}
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-center text-slate-700 font-bold border-l border-slate-200 bg-slate-50">Razem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {repStats.map(rep => (
                                            <tr key={rep.repId} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: repColorMap[rep.repId] }} />
                                                        {rep.repName}
                                                    </div>
                                                </td>
                                                {monthData.map((m) => {
                                                    const rd = m.byRep[rep.repId];
                                                    if (!rd || rd.count === 0) return (
                                                        <td key={m.key} className="px-3 py-3 text-center text-slate-200 border-l border-slate-50">—</td>
                                                    );
                                                    return (
                                                        <td key={m.key} className="px-3 py-3 border-l border-slate-50">
                                                            <div className="text-center">
                                                                <div className="font-bold text-slate-800">{rd.count} <span className="text-slate-400 font-normal">um.</span></div>
                                                                <div className="text-[10px] text-slate-500 mt-0.5">{formatCurrency(rd.totalNet)}</div>
                                                                {showCommission && (
                                                                    <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                                                                        {formatCurrency(rd.totalCommission)} prow.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-3 py-3 border-l border-slate-200 bg-slate-50">
                                                    <div className="text-center">
                                                        <div className="font-bold text-slate-800">{rep.count} <span className="text-slate-400 font-normal">um.</span></div>
                                                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">{formatCurrency(rep.totalValueNet)}</div>
                                                        {showCommission && (
                                                            <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                                                                {formatCurrency(rep.totalCommission)} prow.
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                                            <td className="px-3 py-2.5 font-bold text-slate-700">RAZEM</td>
                                            {monthData.map(m => (
                                                <td key={m.key} className="px-3 py-2.5 border-l border-slate-100">
                                                    <div className="text-center">
                                                        <div className="font-bold text-slate-700">{m.count}</div>
                                                        <div className="text-[10px] text-slate-500">{formatCurrency(m.totalNet)}</div>
                                                        {showCommission && (
                                                            <div className="text-[10px] text-indigo-600 font-bold">{formatCurrency(m.totalCommission)}</div>
                                                        )}
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="px-3 py-2.5 border-l border-slate-200 bg-slate-100">
                                                <div className="text-center">
                                                    <div className="font-bold text-slate-800">{totals.count}</div>
                                                    <div className="text-[10px] text-slate-700 font-bold">{formatCurrency(totals.totalNet)}</div>
                                                    {showCommission && (
                                                        <div className="text-[10px] text-indigo-700 font-bold">{formatCurrency(totals.totalCommission)}</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
