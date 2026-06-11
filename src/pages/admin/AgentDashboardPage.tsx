import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

// ===== TYPES =====
interface AgentJob {
    id: string;
    leadId: string;
    leadName: string;
    leadEmail: string;
    product: string;
    dimensions: string;
    status: 'processing' | 'completed' | 'failed';
    offerId?: string;
    offerNumber?: string;
    offerUrl?: string;
    tiers?: { tier: string; label: string; totalGross: number }[];
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    durationMs?: number;
}

interface AgentStats {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgDurationMs: number;
    totalRevenuePotential: number;
    todayJobs: number;
}

// ===== COMPONENT =====
export const AgentDashboardPage: React.FC = () => {
    const [jobs, setJobs] = useState<AgentJob[]>([]);
    const [stats, setStats] = useState<AgentStats>({
        totalJobs: 0, completedJobs: 0, failedJobs: 0,
        avgDurationMs: 0, totalRevenuePotential: 0, todayJobs: 0,
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            // Fetch offers created by agent (product_config contains agentGenerated: true)
            const { data: offers, error: offersError } = await supabase
                .from('offers')
                .select('id, offer_number, customer_data, product_config, pricing, variants, status, public_token, lead_id, created_at, updated_at')
                .not('variants', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100);

            if (offersError) throw offersError;

            // Filter only agent-generated offers (those with tier variants)
            const agentOffers = (offers || []).filter((o: any) => {
                const variants = o.variants;
                return Array.isArray(variants) && variants.length > 0 && variants.some((v: any) => v.tier);
            });

            // Map to AgentJob format
            const mappedJobs: AgentJob[] = agentOffers.map((o: any) => {
                const cd = o.customer_data || {};
                const pc = o.product_config || {};
                const tiers = (o.variants || [])
                    .filter((v: any) => v.tier)
                    .map((v: any) => ({
                        tier: v.tier,
                        label: v.label || v.tier,
                        totalGross: v.totalGrossEUR || v.pricing?.sellingPriceGross || 0,
                    }));

                const created = new Date(o.created_at);
                const updated = new Date(o.updated_at);

                return {
                    id: o.id,
                    leadId: o.lead_id || '',
                    leadName: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Unbekannt',
                    leadEmail: cd.email || '',
                    product: pc.description || getModelName(pc.modelId) || 'Terrassenüberdachung',
                    dimensions: pc.width && pc.projection ? `${pc.width} × ${pc.projection} mm` : '',
                    // pricing_pending = placeholder bez cen (wycena live trwa) → 'processing';
                    // pricing_failed/error → 'failed'; reszta → 'completed'
                    status: (o.status === 'pricing_pending'
                        ? 'processing'
                        : (o.status === 'pricing_failed' || o.status === 'pricing_error')
                            ? 'failed'
                            : 'completed') as 'processing' | 'completed' | 'failed',
                    offerId: o.id,
                    offerNumber: o.offer_number,
                    offerUrl: o.public_token ? `https://polendach24.app/p/offer/${o.public_token}` : undefined,
                    tiers,
                    createdAt: created,
                    completedAt: updated,
                    durationMs: updated.getTime() - created.getTime(),
                };
            });

            setJobs(mappedJobs);

            // Calculate stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayJobs = mappedJobs.filter(j => j.createdAt >= today).length;
            const completed = mappedJobs.filter(j => j.status === 'completed').length;
            const failed = mappedJobs.filter(j => j.status === 'failed').length;
            const durations = mappedJobs.filter(j => j.durationMs && j.durationMs > 0).map(j => j.durationMs!);
            const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
            const totalRevenue = mappedJobs.reduce((sum, j) => {
                const recommended = j.tiers?.find(t => t.tier === 'recommended');
                return sum + (recommended?.totalGross || 0);
            }, 0);

            setStats({
                totalJobs: mappedJobs.length,
                completedJobs: completed,
                failedJobs: failed,
                avgDurationMs: avgDuration,
                totalRevenuePotential: totalRevenue,
                todayJobs,
            });
        } catch (error) {
            console.error('Failed to load agent data:', error);
            toast.error('Fehler beim Laden der Agent-Daten');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData, refreshKey]);

    const filteredJobs = filter === 'all'
        ? jobs
        : jobs.filter(j => j.status === filter);

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        const secs = Math.round(ms / 1000);
        if (secs < 60) return `${secs}s`;
        return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    };

    const formatPrice = (v: number): string =>
        v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const timeAgo = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'gerade eben';
        if (mins < 60) return `vor ${mins} Min.`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `vor ${hours} Std.`;
        const days = Math.floor(hours / 24);
        return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-100 border-t-violet-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg">🤖</span>
                    </div>
                </div>
                <p className="mt-4 text-slate-400 text-sm animate-pulse">Agent-Dashboard wird geladen...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white text-lg">🤖</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Offer Agent Dashboard</h1>
                        <p className="text-xs text-slate-400">Automatische 3-Tier Angebotserstellung</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-700">Agent aktiv</span>
                    </div>
                    <button
                        onClick={() => { setRefreshKey(k => k + 1); setLoading(true); }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Aktualisieren"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ═══ STATS CARDS ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    {
                        label: 'Heute', value: stats.todayJobs.toString(),
                        icon: '📅', bg: 'bg-blue-50', border: 'border-blue-100',
                        text: 'text-blue-700', sub: 'Angebote',
                    },
                    {
                        label: 'Gesamt', value: stats.totalJobs.toString(),
                        icon: '📊', bg: 'bg-slate-50', border: 'border-slate-100',
                        text: 'text-slate-700', sub: 'erstellt',
                    },
                    {
                        label: 'Erfolgsrate', value: stats.totalJobs > 0
                            ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}%`
                            : '—',
                        icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-100',
                        text: 'text-emerald-700', sub: `${stats.completedJobs} ok / ${stats.failedJobs} fail`,
                    },
                    {
                        label: 'Ø Dauer', value: stats.avgDurationMs > 0
                            ? formatDuration(stats.avgDurationMs)
                            : '—',
                        icon: '⚡', bg: 'bg-amber-50', border: 'border-amber-100',
                        text: 'text-amber-700', sub: 'pro Angebot',
                    },
                    {
                        label: 'Pipeline', value: stats.totalRevenuePotential > 0
                            ? `€${formatPrice(stats.totalRevenuePotential)}`
                            : '—',
                        icon: '💰', bg: 'bg-violet-50', border: 'border-violet-100',
                        text: 'text-violet-700', sub: 'Empf. Tier',
                    },
                    {
                        label: 'Ø Wert', value: stats.totalJobs > 0
                            ? `€${formatPrice(stats.totalRevenuePotential / stats.totalJobs)}`
                            : '—',
                        icon: '📈', bg: 'bg-fuchsia-50', border: 'border-fuchsia-100',
                        text: 'text-fuchsia-700', sub: 'pro Angebot',
                    },
                ].map((card, i) => (
                    <div key={i} className={`${card.bg} border ${card.border} rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">{card.icon}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                        </div>
                        <p className={`text-xl font-black ${card.text} tabular-nums`}>{card.value}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* ═══ FILTER TABS ═══ */}
            <div className="flex items-center gap-2">
                {[
                    { key: 'all' as const, label: 'Alle', count: jobs.length },
                    { key: 'completed' as const, label: 'Erfolgreich', count: jobs.filter(j => j.status === 'completed').length },
                    { key: 'failed' as const, label: 'Fehlgeschlagen', count: jobs.filter(j => j.status === 'failed').length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filter === tab.key
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                filter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ JOBS TABLE ═══ */}
            {filteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🤖</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Noch keine Agent-Angebote</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Ziehen Sie einen Lead im Kanban auf die Spalte "Oferta Agent 🤖", um den Agenten zu starten.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kunde</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produkt</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">3 Tiers</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Angebot</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Erstellt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredJobs.map(job => (
                                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {job.status === 'completed' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                    Gesendet
                                                </span>
                                            ) : job.status === 'failed' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    Fehler
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold animate-pulse">
                                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9" /></svg>
                                                    Verarbeitet
                                                </span>
                                            )}
                                        </td>

                                        {/* Customer */}
                                        <td className="px-4 py-3">
                                            <div>
                                                <a
                                                    href={job.leadId ? `/leads/${job.leadId}` : '#'}
                                                    className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                                                >
                                                    {job.leadName}
                                                </a>
                                                {job.leadEmail && (
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{job.leadEmail}</p>
                                                )}
                                            </div>
                                        </td>

                                        {/* Product */}
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-slate-700 font-medium">{job.product}</p>
                                            {job.dimensions && (
                                                <p className="text-[11px] text-slate-400">{job.dimensions}</p>
                                            )}
                                        </td>

                                        {/* Tiers */}
                                        <td className="px-4 py-3">
                                            {job.tiers && job.tiers.length > 0 ? (
                                                <div className="flex gap-1">
                                                    {job.tiers.map((t, i) => {
                                                        const isRec = t.tier === 'recommended';
                                                        const isPrem = t.tier === 'premium';
                                                        return (
                                                            <span
                                                                key={i}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                                                                    isRec
                                                                        ? 'bg-indigo-100 text-indigo-700'
                                                                        : isPrem
                                                                            ? 'bg-amber-100 text-amber-700'
                                                                            : 'bg-slate-100 text-slate-500'
                                                                }`}
                                                                title={t.label}
                                                            >
                                                                €{formatPrice(t.totalGross)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>

                                        {/* Offer Link */}
                                        <td className="px-4 py-3">
                                            {job.offerUrl ? (
                                                <a
                                                    href={job.offerUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    {job.offerNumber}
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>

                                        {/* Created */}
                                        <td className="px-4 py-3">
                                            <p className="text-xs text-slate-500">{timeAgo(job.createdAt)}</p>
                                            <p className="text-[10px] text-slate-300">
                                                {job.createdAt.toLocaleDateString('de-DE')} {job.createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ FOOTER INFO ═══ */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <p>Auto-Refresh alle 30 Sekunden</p>
                <p>
                    Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
            </div>
        </div>
    );
};

// Helpers
function getModelName(modelId: string): string {
    const map: Record<string, string> = {
        'trendstyle': 'Trendstyle', 'topstyle': 'Topstyle', 'designline': 'Designline',
        'pergola': 'Pergola', 'pergola-nuun': 'Pergola Nuun', 'carport': 'Carport',
        'terrassendach': 'Terrassenüberdachung',
    };
    return map[modelId] || modelId || 'Terrassenüberdachung';
}
