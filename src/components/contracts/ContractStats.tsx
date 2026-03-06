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

export const ContractStats: React.FC<ContractStatsProps> = ({ contracts, showCommission = false }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeView, setActiveView] = useState<'overview' | 'reps' | 'months'>('overview');

    // Available years
    const years = useMemo(() => {
        const ys = new Set<number>();
        contracts.forEach(c => {
            const d = new Date(c.createdAt);
            if (!isNaN(d.getTime())) ys.add(d.getFullYear());
        });
        if (ys.size === 0) ys.add(new Date().getFullYear());
        return Array.from(ys).sort((a, b) => b - a);
    }, [contracts]);

    // Filtered by year
    const yearContracts = useMemo(() =>
        contracts.filter(c => new Date(c.createdAt).getFullYear() === selectedYear),
        [contracts, selectedYear]
    );

    // Per-rep stats
    const repStats = useMemo(() => {
        const repMap = new Map<string, RepStats>();
        yearContracts.forEach(c => {
            const repId = c.salesRepId || 'unknown';
            const repName = c.salesRep ? `${c.salesRep.firstName} ${c.salesRep.lastName}` : 'Brak przypisania';
            if (!repMap.has(repId)) repMap.set(repId, { repId, repName, count: 0, totalValueNet: 0, totalCommission: 0, totalProfit: 0 });
            const r = repMap.get(repId)!;
            r.count += 1;
            r.totalValueNet += Math.max(Number(c.pricing?.sellingPriceNet || 0), Number(c.pricing?.finalPriceNet || 0));
            r.totalCommission += Number(c.commission || 0);
            r.totalProfit += Number(c.pricing?.marginValue || 0);
        });
        return Array.from(repMap.values()).sort((a, b) => b.totalValueNet - a.totalValueNet);
    }, [yearContracts]);

    // Monthly breakdown
    const monthData = useMemo(() => {
        const months: MonthData[] = [];
        for (let m = 0; m < 12; m++) {
            const key = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
            months.push({
                key,
                label: `${MONTH_LABELS_PL[m]} ${selectedYear}`,
                count: 0,
                totalNet: 0,
                totalProfit: 0,
                totalCommission: 0,
                byRep: {},
                byStatus: {}
            });
        }

        yearContracts.forEach(c => {
            const d = new Date(c.createdAt);
            const monthIdx = d.getMonth();
            const md = months[monthIdx];
            md.count += 1;
            const net = Math.max(Number(c.pricing?.sellingPriceNet || 0), Number(c.pricing?.finalPriceNet || 0));
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
    }, [yearContracts, selectedYear]);

    // Totals
    const totals = useMemo(() => ({
        count: yearContracts.length,
        totalNet: yearContracts.reduce((s, c) => s + Math.max(Number(c.pricing?.sellingPriceNet || 0), Number(c.pricing?.finalPriceNet || 0)), 0),
        totalProfit: yearContracts.reduce((s, c) => s + Number(c.pricing?.marginValue || 0), 0),
        totalCommission: yearContracts.reduce((s, c) => s + Number(c.commission || 0), 0),
        signed: yearContracts.filter(c => c.status === 'signed' || c.status === 'completed').length,
        cancelled: yearContracts.filter(c => c.status === 'cancelled').length,
    }), [yearContracts]);

    const maxMonthNet = Math.max(...monthData.map(m => m.totalNet), 1);

    const repColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        repStats.forEach((r, i) => { map[r.repId] = REP_COLORS[i % REP_COLORS.length]; });
        return map;
    }, [repStats]);

    return (
        <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header with year selector + view toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-lg font-bold text-slate-800">Statystyki Umów</h3>
                </div>
                <div className="flex items-center gap-2">
                    {/* Year selector */}
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {/* View toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        {([['overview', 'Przegląd'], ['reps', 'Przedstawiciele'], ['months', 'Miesiące']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => setActiveView(id)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Umowy</p>
                    <p className="text-2xl font-bold text-slate-800">{totals.count}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">{totals.signed} podpisanych</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wartość Netto</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalNet)}</p>
                    <p className="text-xs text-slate-400 mt-1">Razem {selectedYear}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Zysk</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalProfit)}</p>
                    <p className="text-xs text-slate-400 mt-1">Marża potencjalna</p>
                </div>
                {showCommission && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Prowizje</p>
                        <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totals.totalCommission)}</p>
                        <p className="text-xs text-slate-400 mt-1">Razem {selectedYear}</p>
                    </div>
                )}
                {!showCommission && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Anulowane</p>
                        <p className="text-2xl font-bold text-red-500">{totals.cancelled}</p>
                        <p className="text-xs text-slate-400 mt-1">Utracone umowy</p>
                    </div>
                )}
            </div>

            {/* VIEW: OVERVIEW — Monthly bar chart */}
            {activeView === 'overview' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-700 mb-4">Obrót miesięczny (Netto)</h4>
                    <div className="flex items-end gap-1.5" style={{ height: 200 }}>
                        {monthData.map((m, idx) => {
                            const pct = maxMonthNet > 0 ? (m.totalNet / maxMonthNet) * 100 : 0;
                            const now = new Date();
                            const isCurrent = idx === now.getMonth() && selectedYear === now.getFullYear();
                            return (
                                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                        <p className="font-bold">{m.label}</p>
                                        <p>{m.count} umów · {formatCurrency(m.totalNet)}</p>
                                        <p className="text-green-400">Zysk: {formatCurrency(m.totalProfit)}</p>
                                    </div>
                                    {/* Bar */}
                                    <div
                                        className={`w-full rounded-t-md transition-all duration-300 ${isCurrent ? 'bg-indigo-500' : 'bg-indigo-300 group-hover:bg-indigo-400'}`}
                                        style={{ height: `${Math.max(pct, 2)}%`, minHeight: m.count > 0 ? 8 : 2 }}
                                    />
                                    {/* Label */}
                                    <p className={`text-[10px] mt-1.5 font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {MONTH_LABELS_PL[idx]}
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
                            const cnt = yearContracts.filter(c => c.status === key).length;
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
                                <th className="px-4 py-3 text-right">Wartość Netto</th>
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
                    {repStats.length > 0 && (
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
                                                            title={`${MONTH_LABELS_PL[idx]}: ${cnt} umów`}
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
                                <th className="px-4 py-3 text-right">Wartość Netto</th>
                                <th className="px-4 py-3 text-right">Zysk</th>
                                {showCommission && <th className="px-4 py-3 text-right">Prowizje</th>}
                                <th className="px-4 py-3 rounded-r-lg">Statusy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthData.map((m, idx) => {
                                if (m.count === 0) return (
                                    <tr key={m.key} className="text-slate-300">
                                        <td className="px-4 py-2.5 text-xs">{MONTH_LABELS_PL[idx]} {selectedYear}</td>
                                        <td className="px-4 py-2.5 text-right text-xs">0</td>
                                        <td className="px-4 py-2.5 text-right text-xs">-</td>
                                        <td className="px-4 py-2.5 text-right text-xs">-</td>
                                        {showCommission && <td className="px-4 py-2.5 text-right text-xs">-</td>}
                                        <td className="px-4 py-2.5 text-xs">-</td>
                                    </tr>
                                );
                                return (
                                    <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800">{MONTH_LABELS_PL[idx]} {selectedYear}</td>
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
                                <td className="px-4 py-3 rounded-l-lg">RAZEM {selectedYear}</td>
                                <td className="px-4 py-3 text-right">{totals.count}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(totals.totalNet)}</td>
                                <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totals.totalProfit)}</td>
                                {showCommission && <td className="px-4 py-3 text-right text-indigo-700">{formatCurrency(totals.totalCommission)}</td>}
                                <td className="px-4 py-3 rounded-r-lg"></td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Monthly per-rep matrix */}
                    {repStats.length > 1 && (
                        <div className="p-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Wartość netto wg przedstawiciela i miesiąca</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>
                                            <th className="px-2 py-1.5 text-left text-slate-400 font-medium">Rep</th>
                                            {MONTH_LABELS_PL.map(l => <th key={l} className="px-2 py-1.5 text-right text-slate-400 font-medium">{l}</th>)}
                                            <th className="px-2 py-1.5 text-right text-slate-600 font-bold">Razem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {repStats.map(rep => (
                                            <tr key={rep.repId} className="hover:bg-slate-50">
                                                <td className="px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: repColorMap[rep.repId] }} />
                                                    {rep.repName}
                                                </td>
                                                {monthData.map((m) => {
                                                    const rd = m.byRep[rep.repId];
                                                    return (
                                                        <td key={m.key} className={`px-2 py-1.5 text-right ${rd ? 'text-slate-700 font-medium' : 'text-slate-200'}`}>
                                                            {rd ? formatCurrency(rd.totalNet) : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-1.5 text-right font-bold text-slate-800">{formatCurrency(rep.totalValueNet)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
