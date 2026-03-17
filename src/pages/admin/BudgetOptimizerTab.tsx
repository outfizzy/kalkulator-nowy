import React, { useState, useEffect, useMemo } from 'react';
import { FacebookService } from '../../services/database/facebook.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// BUDGET OPTIMIZER — AI-Powered Campaign Budget Recommendations
// ═══════════════════════════════════════════

interface CampaignMetrics {
    id: string;
    name: string;
    status: string;
    daily_budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    cpc: number;
    ctr: number;
    reach: number;
    frequency: number;
    conversions: number;
    score: number; // 0-100 performance score
    recommendation: 'boost' | 'maintain' | 'reduce' | 'pause';
    reason: string;
    suggestedBudget: number;
}

function calculatePerformanceScore(c: any): { score: number; recommendation: 'boost' | 'maintain' | 'reduce' | 'pause'; reason: string } {
    const insights = c.insights?.data?.[0] || {};
    const ctr = Number(insights.ctr || 0);
    const cpc = Number(insights.cpc || 0);
    const spend = Number(insights.spend || 0);
    const clicks = Number(insights.clicks || 0);
    const impressions = Number(insights.impressions || 0);
    const reach = Number(insights.reach || 0);
    const frequency = Number(insights.frequency || 0);

    let score = 50; // baseline
    let reasons: string[] = [];

    // CTR scoring (industry avg for construction/home: ~0.9%)
    if (ctr > 2.5) { score += 20; reasons.push('Świetny CTR (' + ctr.toFixed(2) + '%)'); }
    else if (ctr > 1.5) { score += 10; reasons.push('Dobry CTR'); }
    else if (ctr > 0.8) { score += 0; }
    else if (ctr > 0) { score -= 15; reasons.push('Niski CTR (' + ctr.toFixed(2) + '%)'); }

    // CPC scoring (good for construction: < 1.50€)
    if (cpc > 0 && cpc < 0.5) { score += 15; reasons.push('Bardzo niski CPC (' + cpc.toFixed(2) + '€)'); }
    else if (cpc > 0 && cpc < 1.5) { score += 5; }
    else if (cpc > 3) { score -= 20; reasons.push('Wysoki CPC (' + cpc.toFixed(2) + '€)'); }
    else if (cpc > 2) { score -= 10; reasons.push('Podwyższony CPC'); }

    // Frequency penalty (> 3 = ad fatigue)
    if (frequency > 5) { score -= 15; reasons.push('Zmęczenie reklamą (freq: ' + frequency.toFixed(1) + ')'); }
    else if (frequency > 3) { score -= 5; reasons.push('Wysoka częstotliwość'); }

    // Volume bonus
    if (clicks > 100) { score += 5; }
    if (impressions > 5000) { score += 5; }

    // Zero performance penalty
    if (spend > 10 && clicks === 0) { score -= 30; reasons.push('Wydano ' + spend.toFixed(0) + '€ bez kliknięć!'); }

    score = Math.max(0, Math.min(100, score));

    let recommendation: 'boost' | 'maintain' | 'reduce' | 'pause';
    if (score >= 75) { recommendation = 'boost'; if (reasons.length === 0) reasons.push('Wysoka skuteczność — zwiększ budżet'); }
    else if (score >= 50) { recommendation = 'maintain'; if (reasons.length === 0) reasons.push('Stabilna skuteczność'); }
    else if (score >= 30) { recommendation = 'reduce'; if (reasons.length === 0) reasons.push('Poniżej średniej — zmniejsz budżet'); }
    else { recommendation = 'pause'; if (reasons.length === 0) reasons.push('Bardzo niska skuteczność — zatrzymaj'); }

    return { score, recommendation, reason: reasons.join(' • ') };
}

const RECO_META = {
    boost: { icon: '🚀', label: 'Zwiększ budżet', color: 'bg-green-100 text-green-700 border-green-300', barColor: 'bg-green-500' },
    maintain: { icon: '✅', label: 'Utrzymaj', color: 'bg-blue-100 text-blue-700 border-blue-300', barColor: 'bg-blue-500' },
    reduce: { icon: '⚠️', label: 'Zmniejsz budżet', color: 'bg-amber-100 text-amber-700 border-amber-300', barColor: 'bg-amber-500' },
    pause: { icon: '⛔', label: 'Zatrzymaj', color: 'bg-red-100 text-red-700 border-red-300', barColor: 'bg-red-500' },
};

export default function BudgetOptimizerTab() {
    const [campaigns, setCampaigns] = useState<CampaignMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<string | null>(null);
    const [totalBudget, setTotalBudget] = useState(0);
    const [optimizedView, setOptimizedView] = useState(false);

    useEffect(() => { loadCampaigns(); }, []);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await FacebookService.getCampaigns();
            const rawCampaigns = data.data || [];
            
            const metrics: CampaignMetrics[] = rawCampaigns
                .filter((c: any) => c.status === 'ACTIVE' || c.status === 'PAUSED')
                .map((c: any) => {
                    const insights = c.insights?.data?.[0] || {};
                    const dailyBudget = Number(c.daily_budget || 0) / 100;
                    const { score, recommendation, reason } = calculatePerformanceScore(c);
                    
                    let suggestedBudget = dailyBudget;
                    if (recommendation === 'boost') suggestedBudget = Math.round(dailyBudget * 1.3 * 100) / 100;
                    else if (recommendation === 'reduce') suggestedBudget = Math.round(dailyBudget * 0.6 * 100) / 100;
                    else if (recommendation === 'pause') suggestedBudget = 0;

                    return {
                        id: c.id,
                        name: c.name,
                        status: c.status,
                        daily_budget: dailyBudget,
                        spend: Number(insights.spend || 0),
                        impressions: Number(insights.impressions || 0),
                        clicks: Number(insights.clicks || 0),
                        cpc: Number(insights.cpc || 0),
                        ctr: Number(insights.ctr || 0),
                        reach: Number(insights.reach || 0),
                        frequency: Number(insights.frequency || 0),
                        conversions: (insights.actions || []).filter((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.messaging_first_reply').reduce((sum: number, a: any) => sum + Number(a.value || 0), 0),
                        score,
                        recommendation,
                        reason,
                        suggestedBudget,
                    };
                })
                .sort((a: CampaignMetrics, b: CampaignMetrics) => b.score - a.score);

            setCampaigns(metrics);
            setTotalBudget(metrics.reduce((sum, c) => sum + c.daily_budget, 0));
        } catch (err: any) {
            toast.error('Błąd: ' + err.message);
        } finally { setLoading(false); }
    };

    const handleApplyBudget = async (campaign: CampaignMetrics) => {
        if (campaign.recommendation === 'pause') {
            setApplying(campaign.id);
            try {
                await FacebookService.updateCampaign(campaign.id, { status: 'PAUSED' });
                toast.success(`⏸️ Kampania "${campaign.name}" zatrzymana`);
                loadCampaigns();
            } catch (err: any) { toast.error(err.message); }
            finally { setApplying(null); }
        } else if (campaign.suggestedBudget !== campaign.daily_budget) {
            setApplying(campaign.id);
            try {
                await FacebookService.updateCampaign(campaign.id, { daily_budget: campaign.suggestedBudget });
                toast.success(`💰 Budżet "${campaign.name}" zmieniony na ${campaign.suggestedBudget.toFixed(2)}€/dzień`);
                loadCampaigns();
            } catch (err: any) { toast.error(err.message); }
            finally { setApplying(null); }
        }
    };

    const stats = useMemo(() => ({
        boostCount: campaigns.filter(c => c.recommendation === 'boost').length,
        maintainCount: campaigns.filter(c => c.recommendation === 'maintain').length,
        reduceCount: campaigns.filter(c => c.recommendation === 'reduce').length,
        pauseCount: campaigns.filter(c => c.recommendation === 'pause').length,
        currentTotal: campaigns.reduce((s, c) => s + c.daily_budget, 0),
        optimizedTotal: campaigns.reduce((s, c) => s + c.suggestedBudget, 0),
        savings: campaigns.reduce((s, c) => s + c.daily_budget, 0) - campaigns.reduce((s, c) => s + c.suggestedBudget, 0),
        avgScore: campaigns.length ? Math.round(campaigns.reduce((s, c) => s + c.score, 0) / campaigns.length) : 0,
    }), [campaigns]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
                    <span className="text-3xl">🧠</span>
                </div>
                <p className="text-slate-500 font-medium">AI analizuje kampanie...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-50" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">🧠</span>
                                Budget Optimizer AI
                            </h2>
                            <p className="text-emerald-200 text-sm mt-1">Inteligentna optymalizacja budżetów • {campaigns.length} kampanii</p>
                        </div>
                        <button onClick={loadCampaigns} className="px-4 py-2 bg-white/15 backdrop-blur rounded-lg text-sm font-medium hover:bg-white/25 transition-all border border-white/20">
                            🔄 Odśwież analizę
                        </button>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2.5">
                            <p className="text-2xl font-bold">{stats.avgScore}</p>
                            <p className="text-[10px] text-emerald-200 uppercase">Śr. wynik</p>
                        </div>
                        <div className="bg-green-500/20 rounded-lg px-3 py-2.5">
                            <p className="text-2xl font-bold text-green-300">🚀 {stats.boostCount}</p>
                            <p className="text-[10px] text-green-200 uppercase">Do zwiększenia</p>
                        </div>
                        <div className="bg-amber-500/20 rounded-lg px-3 py-2.5">
                            <p className="text-2xl font-bold text-amber-300">⚠️ {stats.reduceCount}</p>
                            <p className="text-[10px] text-amber-200 uppercase">Do zmniejszenia</p>
                        </div>
                        <div className="bg-red-500/20 rounded-lg px-3 py-2.5">
                            <p className="text-2xl font-bold text-red-300">⛔ {stats.pauseCount}</p>
                            <p className="text-[10px] text-red-200 uppercase">Do zatrzymania</p>
                        </div>
                        <div className="bg-white/10 rounded-lg px-3 py-2.5">
                            <p className="text-2xl font-bold">{stats.savings > 0 ? stats.savings.toFixed(0) + '€' : '—'}</p>
                            <p className="text-[10px] text-emerald-200 uppercase">Oszczędności/dzień</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Budget comparison bar */}
            {stats.savings > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-green-800">💡 Rekomendacja AI — oszczędź {stats.savings.toFixed(2)}€ dziennie</h3>
                        <span className="text-xs text-green-600 font-medium">{(stats.savings * 30).toFixed(0)}€ / miesiąc</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <span>Obecny: {stats.currentTotal.toFixed(2)}€/dzień</span>
                                <span>Zoptymalizowany: {stats.optimizedTotal.toFixed(2)}€/dzień</span>
                            </div>
                            <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-red-300 rounded-full" style={{ width: '100%' }} />
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all" style={{ width: `${(stats.optimizedTotal / stats.currentTotal) * 100}%` }} />
                            </div>
                        </div>
                        <span className="text-lg font-bold text-green-700">-{((stats.savings / stats.currentTotal) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            )}

            {/* Campaign cards */}
            <div className="space-y-3">
                {campaigns.map(c => {
                    const meta = RECO_META[c.recommendation];
                    return (
                        <div key={c.id} className={`bg-white rounded-xl shadow-sm border ${c.recommendation === 'boost' ? 'border-green-200' : c.recommendation === 'pause' ? 'border-red-200' : 'border-slate-200'} p-4 hover:shadow-md transition-all`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-bold text-slate-800 truncate">{c.name}</h4>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${meta.color}`}>
                                            {meta.icon} {meta.label}
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {c.status === 'ACTIVE' ? '▶ Aktywna' : '⏸ Wstrzymana'}
                                        </span>
                                    </div>

                                    {/* Performance score bar */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${meta.barColor}`} style={{ width: `${c.score}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 w-8 text-right">{c.score}</span>
                                    </div>

                                    {/* Metrics grid */}
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[10px]">
                                        <div className="bg-slate-50 rounded px-2 py-1">
                                            <p className="text-slate-400">Budżet</p>
                                            <p className="font-bold text-slate-700">{c.daily_budget.toFixed(2)}€/d</p>
                                        </div>
                                        <div className="bg-slate-50 rounded px-2 py-1">
                                            <p className="text-slate-400">Wydano</p>
                                            <p className="font-bold text-slate-700">{c.spend.toFixed(2)}€</p>
                                        </div>
                                        <div className={`rounded px-2 py-1 ${c.ctr > 1.5 ? 'bg-green-50' : c.ctr > 0.8 ? 'bg-slate-50' : 'bg-red-50'}`}>
                                            <p className="text-slate-400">CTR</p>
                                            <p className="font-bold">{c.ctr.toFixed(2)}%</p>
                                        </div>
                                        <div className={`rounded px-2 py-1 ${c.cpc > 0 && c.cpc < 1.5 ? 'bg-green-50' : c.cpc > 2.5 ? 'bg-red-50' : 'bg-slate-50'}`}>
                                            <p className="text-slate-400">CPC</p>
                                            <p className="font-bold">{c.cpc.toFixed(2)}€</p>
                                        </div>
                                        <div className="bg-slate-50 rounded px-2 py-1">
                                            <p className="text-slate-400">Kliknięcia</p>
                                            <p className="font-bold text-slate-700">{c.clicks.toLocaleString()}</p>
                                        </div>
                                        <div className={`rounded px-2 py-1 ${c.frequency > 3 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                            <p className="text-slate-400">Freq</p>
                                            <p className="font-bold">{c.frequency.toFixed(1)}</p>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <p className="text-[10px] text-slate-500 mt-2 italic">💡 {c.reason}</p>
                                </div>

                                {/* Action button */}
                                <div className="ml-4 flex flex-col items-end gap-2 flex-shrink-0">
                                    {c.recommendation !== 'maintain' && (
                                        <>
                                            <div className="text-right">
                                                {c.recommendation === 'boost' && (
                                                    <p className="text-xs text-green-600 font-bold">{c.daily_budget.toFixed(2)}€ → {c.suggestedBudget.toFixed(2)}€</p>
                                                )}
                                                {c.recommendation === 'reduce' && (
                                                    <p className="text-xs text-amber-600 font-bold">{c.daily_budget.toFixed(2)}€ → {c.suggestedBudget.toFixed(2)}€</p>
                                                )}
                                                {c.recommendation === 'pause' && (
                                                    <p className="text-xs text-red-600 font-bold">Zatrzymaj kampanię</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleApplyBudget(c)}
                                                disabled={applying === c.id}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                                    c.recommendation === 'boost' ? 'bg-green-500 text-white hover:bg-green-600' :
                                                    c.recommendation === 'reduce' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                                                    'bg-red-500 text-white hover:bg-red-600'
                                                } disabled:opacity-50`}
                                            >
                                                {applying === c.id ? '⏳...' : `${meta.icon} Zastosuj`}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {campaigns.length === 0 && (
                <div className="text-center py-12">
                    <span className="text-4xl">📊</span>
                    <p className="text-slate-500 mt-2">Brak kampanii do analizy. Stwórz kampanię w zakładce Kampanie.</p>
                </div>
            )}

            {/* AI insights footer */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs">🧠</span>
                    Jak działa AI Budget Optimizer
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] text-slate-400">
                    <div><strong className="text-white">CTR</strong><br/>Śr. branża budowlana: 0.9%. Powyżej 2.5% = bonus, poniżej 0.8% = kara</div>
                    <div><strong className="text-white">CPC</strong><br/>Dobry CPC &lt;1.50€. Powyżej 3€ = zmniejsz budżet</div>
                    <div><strong className="text-white">Częstotliwość</strong><br/>Ad fatigue powyżej 3.0. AI obniża wynik automatycznie</div>
                    <div><strong className="text-white">Rekomendacja</strong><br/>🚀 Boost +30% • ⚠️ Reduce -40% • ⛔ Pause = 0€</div>
                </div>
            </div>
        </div>
    );
}
