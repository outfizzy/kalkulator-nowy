import React, { useState, useEffect, useMemo } from 'react';
import { ProcurementService, ProcurementItem } from '../../services/database/procurement.service';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// ── Helper ──
const fmt = (v: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

interface SupplierStats {
    name: string;
    totalItems: number;
    totalCost: number;
    pendingItems: number;
    orderedItems: number;
    deliveredItems: number;
    avgDeliveryDays: number | null;
}

interface MonthlyTrend {
    month: string;
    ordered: number;
    delivered: number;
    totalCost: number;
}

export const LogisticsKPIDashboard: React.FC = () => {
    const [items, setItems] = useState<ProcurementItem[]>([]);
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [procItems, logData] = await Promise.all([
                ProcurementService.getItems(),
                ProcurementService.getAuditLog(200),
            ]);
            setItems(procItems);
            setAuditLog(logData);
        } catch (err) {
            console.error('KPI load failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Computed KPIs ──
    const kpis = useMemo(() => {
        const pending = items.filter(i => i.status === 'pending');
        const ordered = items.filter(i => i.status === 'ordered');
        const delivered = items.filter(i => i.status === 'delivered');
        const total = items.length;

        // Total costs
        const totalPurchaseCost = items.reduce((s, i) => s + (i.purchaseCost || 0), 0);
        const pendingValue = pending.reduce((s, i) => s + (i.purchaseCost || 0), 0);
        const orderedValue = ordered.reduce((s, i) => s + (i.purchaseCost || 0), 0);
        const deliveredValue = delivered.reduce((s, i) => s + (i.purchaseCost || 0), 0);

        // On-time delivery rate (orders with confirmed_delivery_date that arrived within delivery_week)
        let onTimeCount = 0;
        let lateCount = 0;
        delivered.forEach(item => {
            if ((item as any).orderedAt && (item as any).confirmed_delivery_date) {
                const orderDate = new Date((item as any).orderedAt).getTime();
                const deliveryDate = new Date((item as any).confirmed_delivery_date).getTime();
                const days = (deliveryDate - orderDate) / 86400000;
                if (days <= 21) onTimeCount++; // within 3 weeks considered on-time
                else lateCount++;
            }
        });
        const onTimeRate = (onTimeCount + lateCount) > 0 ? Math.round((onTimeCount / (onTimeCount + lateCount)) * 100) : null;

        // Avg fulfillment time
        let totalDays = 0;
        let dayCount = 0;
        delivered.forEach(item => {
            if ((item as any).orderedAt && (item as any).confirmed_delivery_date) {
                const days = (new Date((item as any).confirmed_delivery_date).getTime() - new Date((item as any).orderedAt).getTime()) / 86400000;
                if (days > 0 && days < 365) { totalDays += days; dayCount++; }
            }
        });
        const avgFulfillmentDays = dayCount > 0 ? Math.round(totalDays / dayCount) : null;

        // Supplier breakdown
        const supplierMap = new Map<string, SupplierStats>();
        items.forEach(item => {
            const supplier = (item as any).supplier || 'Nieprzypisany';
            const existing = supplierMap.get(supplier) || {
                name: supplier,
                totalItems: 0, totalCost: 0,
                pendingItems: 0, orderedItems: 0, deliveredItems: 0,
                avgDeliveryDays: null
            };
            existing.totalItems++;
            existing.totalCost += item.purchaseCost || 0;
            if (item.status === 'pending') existing.pendingItems++;
            if (item.status === 'ordered') existing.orderedItems++;
            if (item.status === 'delivered') existing.deliveredItems++;
            supplierMap.set(supplier, existing);
        });
        const suppliers = [...supplierMap.values()].sort((a, b) => b.totalCost - a.totalCost);

        // Contracts ready for installation
        const contractGroups = new Map<string, { total: number; delivered: number; ref: string }>();
        items.filter(i => i.sourceType === 'contract').forEach(i => {
            const g = contractGroups.get(i.sourceId) || { total: 0, delivered: 0, ref: i.referenceNumber };
            g.total++;
            if (i.status === 'delivered') g.delivered++;
            contractGroups.set(i.sourceId, g);
        });
        const contractsReady = [...contractGroups.entries()].filter(([, g]) => g.total > 0 && g.delivered === g.total);
        const contractsPartial = [...contractGroups.entries()].filter(([, g]) => g.total > 0 && g.delivered > 0 && g.delivered < g.total);

        // Activity from audit log (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        const recentActions = auditLog.filter(a => new Date(a.created_at) > weekAgo);
        const ordersThisWeek = recentActions.filter(a => a.action === 'ordered' || a.action === 'batch_ordered').length;

        return {
            total, pending: pending.length, ordered: ordered.length, delivered: delivered.length,
            totalPurchaseCost, pendingValue, orderedValue, deliveredValue,
            onTimeRate, avgFulfillmentDays,
            suppliers, contractsReady, contractsPartial,
            ordersThisWeek, recentActions
        };
    }, [items, auditLog]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Ładowanie KPI logistyki...</p>
                </div>
            </div>
        );
    }

    const progressPercent = kpis.total > 0 ? Math.round((kpis.delivered / kpis.total) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        📊 KPI Logistyki
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Statystyki zamówień, dostawców i realizacji</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/procurement" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                        ← Zamówienia
                    </Link>
                    <button onClick={loadData} className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                        🔄 Odśwież
                    </button>
                </div>
            </div>

            {/* ── TOP KPI CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KPICard label="Łącznie pozycji" value={kpis.total} icon="📦" />
                <KPICard label="Oczekujące" value={kpis.pending} icon="⏳" color={kpis.pending > 0 ? 'amber' : 'green'} subtitle={`${fmt(kpis.pendingValue)}€`} />
                <KPICard label="Zamówione" value={kpis.ordered} icon="🚚" color="blue" subtitle={`${fmt(kpis.orderedValue)}€`} />
                <KPICard label="Dostarczone" value={kpis.delivered} icon="✅" color="emerald" subtitle={`${fmt(kpis.deliveredValue)}€`} />
                <KPICard label="Śr. czas dostawy" value={kpis.avgFulfillmentDays !== null ? `${kpis.avgFulfillmentDays} dni` : '—'} icon="⏱️" color="indigo" />
                <KPICard label="Terminowość" value={kpis.onTimeRate !== null ? `${kpis.onTimeRate}%` : '—'} icon="🎯" color={kpis.onTimeRate !== null && kpis.onTimeRate >= 80 ? 'emerald' : kpis.onTimeRate !== null && kpis.onTimeRate >= 50 ? 'amber' : 'slate'} />
            </div>

            {/* ── OVERALL PROGRESS BAR ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Postęp realizacji</span>
                    <span className="text-sm font-bold text-teal-700">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>⏳ {kpis.pending} oczekuje</span>
                    <span>🚚 {kpis.ordered} w drodze</span>
                    <span>✅ {kpis.delivered} zrealizowane</span>
                </div>
            </div>

            {/* ── TOTAL COSTS ── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">💰 Koszty zakupów</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-2xl font-bold">{fmt(kpis.totalPurchaseCost)}€</p>
                        <p className="text-xs text-slate-400">Łącznie</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-400">{fmt(kpis.pendingValue)}€</p>
                        <p className="text-xs text-slate-400">Do zamówienia</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-400">{fmt(kpis.orderedValue)}€</p>
                        <p className="text-xs text-slate-400">Zamówione</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-400">{fmt(kpis.deliveredValue)}€</p>
                        <p className="text-xs text-slate-400">Dostarczone</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── SUPPLIERS TABLE ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700">🏭 Dostawcy — zestawienie</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                                    <th className="px-4 py-2">Dostawca</th>
                                    <th className="px-3 py-2 text-center">Pozycje</th>
                                    <th className="px-3 py-2 text-right">Koszt</th>
                                    <th className="px-3 py-2 text-center">⏳</th>
                                    <th className="px-3 py-2 text-center">🚚</th>
                                    <th className="px-3 py-2 text-center">✅</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {kpis.suppliers.map(s => (
                                    <tr key={s.name} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-500">{s.totalItems}</td>
                                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">{fmt(s.totalCost)}€</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${s.pendingItems > 0 ? 'bg-amber-100 text-amber-700' : 'text-slate-300'}`}>
                                                {s.pendingItems}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${s.orderedItems > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-300'}`}>
                                                {s.orderedItems}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${s.deliveredItems > 0 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-300'}`}>
                                                {s.deliveredItems}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {kpis.suppliers.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Brak danych</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── SUPPLIER COST CHART (BAR) ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700">📊 Koszty wg dostawcy</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {kpis.suppliers.slice(0, 8).map(s => {
                            const max = kpis.suppliers[0]?.totalCost || 1;
                            const pct = Math.round((s.totalCost / max) * 100);
                            return (
                                <div key={s.name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{s.name}</span>
                                        <span className="text-xs font-bold text-slate-600">{fmt(s.totalCost)}€</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {kpis.suppliers.length === 0 && (
                            <div className="text-center text-sm text-slate-400 py-6">Brak danych o dostawcach</div>
                        )}
                    </div>
                </div>

                {/* ── CONTRACTS READY ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                        <h3 className="text-sm font-bold text-emerald-800">✅ Umowy gotowe do montażu ({kpis.contractsReady.length})</h3>
                    </div>
                    <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto">
                        {kpis.contractsReady.map(([id, g]) => (
                            <Link to={`/contracts/${id}`} key={id} className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50 hover:bg-emerald-100/50 rounded-lg transition-colors">
                                <span className="text-emerald-600 text-sm">✅</span>
                                <span className="text-sm font-medium text-emerald-800">{g.ref}</span>
                                <span className="text-[10px] text-emerald-500 ml-auto">{g.total} poz.</span>
                            </Link>
                        ))}
                        {kpis.contractsReady.length === 0 && (
                            <div className="text-center text-sm text-slate-400 py-4">Brak umów z kompletem materiałów</div>
                        )}
                    </div>
                </div>

                {/* ── CONTRACTS PARTIAL ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-amber-50 border-b border-amber-100">
                        <h3 className="text-sm font-bold text-amber-800">🔶 Umowy częściowo zrealizowane ({kpis.contractsPartial.length})</h3>
                    </div>
                    <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto">
                        {kpis.contractsPartial.map(([id, g]) => {
                            const pct = Math.round((g.delivered / g.total) * 100);
                            return (
                                <Link to={`/contracts/${id}`} key={id} className="flex items-center gap-2 px-3 py-2 bg-amber-50/50 hover:bg-amber-100/50 rounded-lg transition-colors">
                                    <span className="text-amber-600 text-sm">🔶</span>
                                    <span className="text-sm font-medium text-amber-800">{g.ref}</span>
                                    <div className="flex-1 mx-2">
                                        <div className="w-full bg-amber-100 rounded-full h-1.5">
                                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-amber-600 font-medium">{g.delivered}/{g.total}</span>
                                </Link>
                            );
                        })}
                        {kpis.contractsPartial.length === 0 && (
                            <div className="text-center text-sm text-slate-400 py-4">Brak</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── RECENT ACTIVITY ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">⚡ Ostatnia aktywność (7 dni)</h3>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{kpis.ordersThisWeek} zamówień w tym tygodniu</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {kpis.recentActions.slice(0, 20).map((entry, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-slate-50/50">
                            <span className="flex-shrink-0">
                                {entry.action === 'ordered' ? '📦' : entry.action === 'batch_ordered' ? '📦📦' : entry.action === 'delivered' ? '✅' : '🔄'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-slate-700">{entry.user_name}</span>
                                <span className="text-slate-400"> — </span>
                                <span className="text-slate-600">
                                    {entry.action === 'ordered' ? 'zamówił' : entry.action === 'batch_ordered' ? 'zamówił grupowo' : entry.action === 'delivered' ? 'oznaczył dostarczone' : entry.action}
                                </span>
                                <span className="text-slate-400 text-xs ml-1 truncate">{entry.item_name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                                {new Date(entry.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                    {kpis.recentActions.length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-400">Brak aktywności w ostatnich 7 dniach</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── KPI Card Component ──
const KPICard: React.FC<{ label: string; value: string | number; icon: string; color?: string; subtitle?: string }> = ({ label, value, icon, color = 'slate', subtitle }) => {
    const colorMap: Record<string, string> = {
        slate: 'text-slate-700',
        amber: 'text-amber-600',
        blue: 'text-blue-600',
        emerald: 'text-emerald-600',
        indigo: 'text-indigo-600',
        green: 'text-green-600',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{icon}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
            </div>
            <p className={`text-xl font-bold ${colorMap[color] || colorMap.slate}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    );
};
