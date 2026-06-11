import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingDown, Eye, Package, ShoppingCart, Ruler, CheckCircle2, Send, Power, Loader2, Flame } from 'lucide-react';
import { toast } from 'react-hot-toast';

/* ============================================================================
 * LEJEK OFERT AGENTA (ostatnie 30 dni) + sterowanie auto-follow-upami.
 * Wysłane → otwarte → wybrany pakiet → koszyk → prośba o pomiar / akceptacja.
 * Przełącznik globalny zapisuje app_settings['offer_followups'].enabled —
 * cron sprawdza go przy każdym uruchomieniu, więc wyłączenie działa od ręki.
 * ========================================================================== */

interface FunnelStats {
    sent: number;
    viewed: number;
    tierSelected: number;
    cartUsed: number;
    measurement: number;
    accepted: number;
    topExtras: { name: string; count: number }[];
    topTiers: { name: string; count: number }[];
    followupsSent: { stage: string; count: number }[];
    hotAlerts: number;
}

const STAGE_LABELS: Record<string, string> = {
    stage1: 'S1 · 3 dni („Haben Sie Fragen?")',
    stage2: 'S2 · 10 dni (gwarancja ceny)',
    stage3: 'S3 · 23 dni (wygasa + SMS)',
    hot_lead_alert: 'Alerty „gorący lead"',
};

export const OfferFunnelWidget: React.FC = () => {
    const [stats, setStats] = useState<FunnelStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [followupsEnabled, setFollowupsEnabled] = useState<boolean | null>(null);
    const [toggling, setToggling] = useState(false);

    const load = async () => {
        try {
            const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
            const [offersRes, interactionsRes, followupsRes, settingRes] = await Promise.all([
                supabase.from('offers').select('id', { count: 'exact', head: true })
                    .eq('status', 'sent').contains('product_config', { agentGenerated: true }).gte('created_at', since),
                supabase.from('offer_interactions').select('offer_id, event_type, event_data').gte('created_at', since),
                supabase.from('offer_followups').select('stage, channel').gte('sent_at', since),
                supabase.from('app_settings').select('value').eq('key', 'offer_followups').maybeSingle(),
            ]);

            const inter = interactionsRes.data || [];
            const byType = (t: string) => new Set(inter.filter(i => i.event_type === t).map(i => i.offer_id)).size;
            const cartOffers = new Set(inter.filter(i => i.event_type === 'cart_extra_added').map(i => i.offer_id)).size;

            const extraCounts: Record<string, number> = {};
            inter.filter(i => i.event_type === 'cart_extra_added' && i.event_data?.extra)
                .forEach(i => { const k = String(i.event_data.extra); extraCounts[k] = (extraCounts[k] || 0) + 1; });
            const tierCounts: Record<string, number> = {};
            inter.filter(i => i.event_type === 'tier_selected' && i.event_data?.label)
                .forEach(i => { const k = String(i.event_data.label); tierCounts[k] = (tierCounts[k] || 0) + 1; });

            const fuCounts: Record<string, number> = {};
            (followupsRes.data || []).forEach(f => { fuCounts[f.stage] = (fuCounts[f.stage] || 0) + 1; });

            setStats({
                sent: offersRes.count || 0,
                viewed: byType('offer_view'),
                tierSelected: byType('tier_selected'),
                cartUsed: cartOffers,
                measurement: byType('measurement_request'),
                accepted: byType('offer_accept'),
                topExtras: Object.entries(extraCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, count })),
                topTiers: Object.entries(tierCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, count })),
                followupsSent: Object.entries(fuCounts).map(([stage, count]) => ({ stage, count })),
                hotAlerts: fuCounts['hot_lead_alert'] || 0,
            });
            setFollowupsEnabled(settingRes.data?.value?.enabled === true);
        } catch (e) {
            console.error('Funnel load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleFollowups = async () => {
        if (followupsEnabled === null || toggling) return;
        const next = !followupsEnabled;
        setToggling(true);
        try {
            const { error } = await supabase.from('app_settings')
                .update({ value: { enabled: next }, updated_at: new Date().toISOString() })
                .eq('key', 'offer_followups');
            if (error) throw error;
            setFollowupsEnabled(next);
            toast.success(next
                ? 'Auto-follow-upy WŁĄCZONE — cron wysyła raz dziennie (~10:00). Stop przy każdej odpowiedzi klienta.'
                : 'Auto-follow-upy WYŁĄCZONE — żadne wiadomości nie wyjdą.');
        } catch (e) {
            toast.error('Nie udało się zmienić ustawienia');
            console.error(e);
        } finally {
            setToggling(false);
        }
    };

    const funnelSteps = stats ? [
        { label: 'Wysłane', value: stats.sent, icon: Send, color: 'bg-slate-500' },
        { label: 'Otwarte', value: stats.viewed, icon: Eye, color: 'bg-blue-500' },
        { label: 'Wybrany pakiet', value: stats.tierSelected, icon: Package, color: 'bg-indigo-500' },
        { label: 'Koszyk (extras)', value: stats.cartUsed, icon: ShoppingCart, color: 'bg-emerald-500' },
        { label: 'Prośba o pomiar', value: stats.measurement, icon: Ruler, color: 'bg-amber-500' },
        { label: 'Akceptacja', value: stats.accepted, icon: CheckCircle2, color: 'bg-green-600' },
    ] : [];
    const maxVal = Math.max(1, ...(funnelSteps.map(s => s.value)));

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header + przełącznik follow-upów */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <TrendingDown className="w-5 h-5 text-[#1E6FD9]" />
                    <div>
                        <h3 className="text-[15px] font-bold text-slate-800">Lejek ofert agenta</h3>
                        <p className="text-[11px] text-slate-400">ostatnie 30 dni</p>
                    </div>
                </div>
                <button
                    onClick={toggleFollowups}
                    disabled={followupsEnabled === null || toggling}
                    className={`inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-[12px] font-bold border transition-all cursor-pointer
                        ${followupsEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    title="Globalny wyłącznik automatycznych follow-upów ofert. Cron i tak pomija leady, gdzie klient odpisał (mail/SMS/telefon/wiadomość), poprosił o pomiar lub status się zmienił."
                >
                    {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                    Auto-follow-upy: {followupsEnabled === null ? '…' : followupsEnabled ? 'WŁ' : 'WYŁ'}
                    <span className={`w-8 h-4.5 rounded-full relative transition-colors ${followupsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ height: 18, width: 32 }}>
                        <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all" style={{ left: followupsEnabled ? 16 : 2 }} />
                    </span>
                </button>
            </div>

            {loading || !stats ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : (
                <div className="p-5 space-y-5">
                    {/* Lejek */}
                    <div className="space-y-2">
                        {funnelSteps.map((s, i) => {
                            const pct = stats.sent > 0 ? Math.round((s.value / stats.sent) * 100) : 0;
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="flex items-center gap-3">
                                    <span className="w-40 shrink-0 flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                                        <Icon className="w-3.5 h-3.5 text-slate-400" /> {s.label}
                                    </span>
                                    <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden relative">
                                        <div className={`h-full ${s.color} rounded-lg transition-all duration-700`}
                                            style={{ width: `${Math.max(2, (s.value / maxVal) * 100)}%`, opacity: 0.85 }} />
                                        <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-black text-white drop-shadow">{s.value}</span>
                                    </div>
                                    <span className="w-12 shrink-0 text-right text-[11px] font-bold text-slate-400 tabular-nums">
                                        {i === 0 ? '100%' : `${pct}%`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Co wybierają klienci */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Najczęściej wybierane pakiety</p>
                            {stats.topTiers.length === 0 ? <p className="text-[12px] text-slate-400">brak danych</p> :
                                stats.topTiers.map(t => (
                                    <div key={t.name} className="flex justify-between text-[12px] py-0.5">
                                        <span className="text-slate-600 font-medium truncate pr-2">{t.name}</span>
                                        <span className="font-bold text-slate-800 tabular-nums">{t.count}×</span>
                                    </div>
                                ))}
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Najczęściej dodawane extras</p>
                            {stats.topExtras.length === 0 ? <p className="text-[12px] text-slate-400">brak danych</p> :
                                stats.topExtras.map(t => (
                                    <div key={t.name} className="flex justify-between text-[12px] py-0.5">
                                        <span className="text-slate-600 font-medium truncate pr-2">{t.name}</span>
                                        <span className="font-bold text-slate-800 tabular-nums">{t.count}×</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Follow-upy wysłane */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2">Follow-upy (30 dni):</span>
                        {stats.followupsSent.length === 0 ? (
                            <span className="text-[12px] text-slate-400 pt-2">jeszcze żadnych nie wysłano</span>
                        ) : stats.followupsSent.map(f => (
                            <span key={f.stage} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-600 pt-2">
                                {f.stage === 'hot_lead_alert' && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                                {STAGE_LABELS[f.stage] || f.stage}: <strong>{f.count}</strong>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfferFunnelWidget;
