import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AgentOffer {
    id: string;
    offer_number: string;
    public_token: string;
    status: string;
    created_at: string;
    pricing: any;
    product_config: any;
    variants: any[];
}

interface LeadAIData {
    ai_analysis: any;
    ai_draft_email: string | null;
    ai_draft_sms: string | null;
    ai_sentiment: string | null;
    /** Pełne EK/marże/wyceny per dostawca zapisywane przez workera */
    pricing_details: any;
    // wyprowadzane z customer_data (kolumny email/phone nie istnieją w leads)
    email: string | null;
    phone: string | null;
}

interface AgentActivityPanelProps {
    leadId: string;
    leadStatus: string;
}

const fmtEUR = (n: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));

const URGENCY_BADGE: Record<string, { label: string; color: string }> = {
    high: { label: '🔴 Pilne', color: 'bg-red-100 text-red-700' },
    medium: { label: '🟡 Średnie', color: 'bg-yellow-100 text-yellow-700' },
    low: { label: '🟢 Niskie', color: 'bg-green-100 text-green-700' },
};

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({ leadId, leadStatus }) => {
    const [agentOffers, setAgentOffers] = useState<AgentOffer[]>([]);
    const [leadAI, setLeadAI] = useState<LeadAIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEK, setShowEK] = useState(false);
    const [showPositions, setShowPositions] = useState(false);
    const [purchaseTier, setPurchaseTier] = useState<string>('recommended');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingSMS, setSendingSMS] = useState(false);
    // Auto-follow-upy: pauza per lead (cron pomija ten lead, dopóki włączona)
    const [followupsPaused, setFollowupsPaused] = useState<boolean | null>(null);
    const [pauseSaving, setPauseSaving] = useState(false);

    const toggleFollowupsPause = async () => {
        if (followupsPaused === null || pauseSaving) return;
        const next = !followupsPaused;
        setPauseSaving(true);
        try {
            const { error } = await supabase.from('leads').update({ followups_paused: next }).eq('id', leadId);
            if (error) throw error;
            setFollowupsPaused(next);
        } catch (e) { console.error('followups pause error', e); }
        finally { setPauseSaving(false); }
    };

    const isAgentStatus = ['offer_agent', 'offer_agent_sent', 'needs_info'].includes(leadStatus);

    useEffect(() => {
        const fetchAgentOffers = async () => {
            try {
                const { data } = await supabase
                    .from('offers')
                    .select('id, offer_number, public_token, status, created_at, pricing, product_config, variants')
                    .eq('lead_id', leadId)
                    .order('created_at', { ascending: false });
                
                if (data) {
                    setAgentOffers(data.filter((o: any) => o.product_config?.agentGenerated));
                }
            } catch (e) {
                console.warn('Agent offers not loaded', e);
            } finally {
                setLoading(false);
            }
        };
        const fetchLeadAI = async () => {
            try {
                const { data } = await supabase
                    .from('leads')
                    .select('ai_analysis, ai_draft_email, ai_draft_sms, ai_sentiment, customer_data, pricing_details, followups_paused')
                    .eq('id', leadId)
                    .single();
                if (data) {
                    setFollowupsPaused((data as any).followups_paused === true);
                    const cd = (data as any).customer_data || {};
                    setLeadAI({
                        ai_analysis: (data as any).ai_analysis,
                        ai_draft_email: (data as any).ai_draft_email,
                        ai_draft_sms: (data as any).ai_draft_sms,
                        ai_sentiment: (data as any).ai_sentiment,
                        pricing_details: (data as any).pricing_details,
                        email: cd.email || null,
                        phone: cd.phone || null,
                    });
                }
            } catch (e) { /* ignore */ }
        };
        fetchAgentOffers();
        fetchLeadAI();
    }, [leadId]);

    if (loading) return null;
    if (!isAgentStatus && agentOffers.length === 0 && !leadAI?.ai_analysis) return null;

    const latestOffer = agentOffers[0];
    const pricingSource = latestOffer?.product_config?.pricingSource;
    const variants = latestOffer?.variants || [];
    const recommended = variants.find((v: any) => v.tier === 'recommended');
    const offerUrl = latestOffer ? `${window.location.origin}/p/offer/${latestOffer.public_token}` : '';

    // Timeline steps
    const steps = [
        { 
            key: 'extract', 
            label: 'Dane klienta odczytane',
            sublabel: latestOffer?.product_config ? 
                `${latestOffer.product_config.width || '?'}×${latestOffer.product_config.projection || '?'}mm · ${latestOffer.product_config.color || ''}` : 
                'Czekam na przetworzenie...',
            done: !!latestOffer,
            icon: '📋',
        },
        { 
            key: 'price', 
            label: pricingSource === 'live_configurator' ? 'Live ceny z konfiguratora' : 'Wycena kalkulacyjna',
            sublabel: pricingSource === 'live_configurator'
                ? `✅ Porównano ceny: ${((leadAI?.pricing_details?.suppliersUsed as string[] | undefined)
                    ?.map(sup => sup === 'mb' ? 'MB Aluminium' : sup.charAt(0).toUpperCase() + sup.slice(1))
                    .join(' + ')) || 'Aluxe + Teranda + Aliplast + MB'}`
                : latestOffer ? 'Ceny na podstawie kalkulatora cenowego' : 'Oczekuję na worker...',
            done: !!latestOffer,
            icon: pricingSource === 'live_configurator' ? '🤖' : '💰',
            highlight: pricingSource === 'live_configurator',
        },
        { 
            key: 'offer', 
            label: 'Oferta wygenerowana',
            sublabel: latestOffer ? `${latestOffer.offer_number} · ${variants.length} warianty` : '',
            done: !!latestOffer,
            icon: '📄',
        },
        { 
            key: 'email', 
            label: 'Email wysłany do klienta',
            sublabel: latestOffer?.status === 'sent' ? '✅ Klient otrzymał ofertę' : 'Oczekuję...',
            done: latestOffer?.status === 'sent',
            icon: '📧',
        },
    ];

    return (
        <div className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 rounded-lg border border-violet-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <div>
                        <h3 className="text-white font-bold text-sm">Offer Agent</h3>
                        <p className="text-violet-200 text-[10px]">
                            {isAgentStatus && !latestOffer ? 'Przetwarzam...' : 'Oferta wygenerowana'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pricingSource === 'live_configurator' && (
                        <span className="px-2 py-0.5 bg-green-400/20 text-green-100 text-[10px] font-bold rounded-full border border-green-300/30">
                            🔴 LIVE PRICING
                        </span>
                    )}
                    {/* Pauza auto-follow-upów dla TEGO leada */}
                    {latestOffer && followupsPaused !== null && (
                        <button
                            onClick={toggleFollowupsPause}
                            disabled={pauseSaving}
                            title={followupsPaused
                                ? 'Follow-upy wstrzymane dla tego leada — kliknij, aby wznowić'
                                : 'Auto-follow-upy aktywne (jeśli włączone globalnie) — kliknij, aby wstrzymać dla tego leada'}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors cursor-pointer
                                ${followupsPaused
                                    ? 'bg-amber-400/30 text-amber-100 border-amber-300/40 hover:bg-amber-400/40'
                                    : 'bg-white/10 text-violet-100 border-white/20 hover:bg-white/20'}`}
                        >
                            {pauseSaving ? '…' : followupsPaused ? '⏸ Follow-upy wstrzymane' : '▶ Follow-upy aktywne'}
                        </button>
                    )}
                </div>
            </div>

            {/* Processing indicator */}
            {isAgentStatus && !latestOffer && (
                <div className="px-4 py-6 text-center">
                    <div className="relative inline-block">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-100 border-t-violet-600"></div>
                        <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
                    </div>
                    <p className="text-violet-700 font-semibold text-sm mt-3">Agent pracuje nad ofertą...</p>
                    <p className="text-violet-400 text-xs mt-1">Konfiguruje produkty u dostawców (30-120s)</p>
                </div>
            )}

            {/* Timeline */}
            {latestOffer && (
                <div className="px-4 py-3">
                    <div className="space-y-2">
                        {steps.map((step, idx) => (
                            <div key={step.key} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                        step.done 
                                            ? step.highlight 
                                                ? 'bg-green-100 ring-2 ring-green-300' 
                                                : 'bg-violet-100'
                                            : 'bg-slate-100'
                                    }`}>
                                        {step.done ? step.icon : '⏳'}
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`w-0.5 h-4 ${step.done ? 'bg-violet-200' : 'bg-slate-100'}`} />
                                    )}
                                </div>
                                <div className="pt-0.5 min-w-0">
                                    <p className={`text-xs font-bold ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {step.label}
                                    </p>
                                    <p className={`text-[10px] ${step.done ? 'text-slate-500' : 'text-slate-300'} truncate`}>
                                        {step.sublabel}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ TIER SUMMARY WITH EK ═══ */}
            {variants.length > 0 && (
                <div className="px-4 py-3 border-t border-violet-100">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Warianty oferty</p>
                        <button 
                            onClick={() => setShowEK(!showEK)}
                            className="text-[10px] text-violet-600 font-bold hover:text-violet-800 transition-colors"
                        >
                            {showEK ? '🔒 Ukryj EK' : '💰 Pokaż EK / Marże'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {variants.map((v: any) => {
                            const isRec = v.tier === 'recommended';
                            const ekTotal = v.purchasePriceEUR || 0;
                            const marginEUR = v.marginEUR || (v.totalNetEUR - ekTotal - (v.installationCostEUR || 0));
                            const marginPct = v.marginPercent || (ekTotal > 0 ? Math.round(marginEUR / ekTotal * 100) : 0);
                            const breakdown = v.purchaseBreakdown || [];

                            return (
                                <div key={v.tier} className={`rounded-lg overflow-hidden border ${
                                    isRec ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 bg-slate-50/50'
                                }`}>
                                    {/* Tier header row */}
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            {isRec && <span className="text-[9px]">⭐</span>}
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-700">{v.modelName || v.label}</p>
                                                <p className="text-[9px] text-slate-400">{v.label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${isRec ? 'text-violet-700' : 'text-slate-800'}`}>
                                                {fmtEUR(v.totalGrossEUR || 0)} €
                                            </p>
                                            <p className="text-[9px] text-slate-400">brutto</p>
                                        </div>
                                    </div>

                                    {/* EK Breakdown (internal) */}
                                    {showEK && (
                                        <div className="bg-white border-t border-slate-200 px-3 py-2">
                                            {/* Margin summary */}
                                            <div className="flex items-center justify-between mb-2 py-1.5 px-2 bg-emerald-50 rounded-md">
                                                <span className="text-[10px] font-bold text-emerald-800">💰 Marża</span>
                                                <span className="text-[11px] font-black text-emerald-700">
                                                    {fmtEUR(marginEUR)} € ({marginPct}%)
                                                </span>
                                            </div>

                                            {/* EK per position */}
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                                                EK Pozycje (zakup netto)
                                            </p>
                                            {breakdown.length > 0 ? (
                                                <div className="space-y-1">
                                                    {breakdown.map((item: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-[10px]">
                                                            <span className="text-slate-600 truncate pr-2 flex items-center gap-1">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    item.category === 'Dachkonstruktion' ? 'bg-blue-400' :
                                                                    item.category === 'Zubehör' ? 'bg-amber-400' :
                                                                    item.category === 'Montage' ? 'bg-green-400' : 'bg-slate-300'
                                                                }`} />
                                                                {item.position}
                                                                {item.supplier && (
                                                                    <span className="text-[8px] text-slate-400 ml-1">({item.supplier})</span>
                                                                )}
                                                            </span>
                                                            <span className="font-mono text-slate-700 font-semibold shrink-0">
                                                                {fmtEUR(item.ekEUR)} €
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {/* Total EK */}
                                                    <div className="flex items-center justify-between text-[10px] pt-1 mt-1 border-t border-dashed border-slate-200">
                                                        <span className="font-bold text-slate-700">Σ EK Gesamt</span>
                                                        <span className="font-mono font-bold text-slate-800">
                                                            {fmtEUR(ekTotal)} €
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-slate-500">EK (szacunkowy)</span>
                                                        <span className="font-mono text-slate-700">{fmtEUR(ekTotal)} €</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-slate-500">VK netto</span>
                                                        <span className="font-mono text-slate-700">{fmtEUR(v.totalNetEUR)} €</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ 📋 DETAILED OFFER POSITIONS ═══ */}
            {variants.length > 0 && (
                <div className="px-4 py-3 border-t border-violet-100">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">📋 Pozycje oferty (szczegóły)</p>
                        <button 
                            onClick={() => setShowPositions?.(!showPositions)}
                            className="text-[10px] text-violet-600 font-bold hover:text-violet-800 transition-colors"
                        >
                            {showPositions ? '▲ Zwiń' : '▼ Rozwiń pozycje'}
                        </button>
                    </div>
                    {showPositions && variants.map((v: any) => {
                        const items: any[] = v.items || v.productItems || latestOffer?.product_config?.items || [];
                        const addons: any[] = v.addons || latestOffer?.product_config?.addons || [];
                        const accessories: any[] = v.selectedAccessories || latestOffer?.product_config?.selectedAccessories || [];
                        const customItems: any[] = v.customItems || latestOffer?.product_config?.customItems || [];
                        const modelName = v.modelName || latestOffer?.product_config?.modelId || '?';
                        const width = v.width || latestOffer?.product_config?.width;
                        const projection = v.projection || latestOffer?.product_config?.projection;
                        const color = v.color || latestOffer?.product_config?.color;
                        const roofType = v.roofType || latestOffer?.product_config?.roofType;
                        const supplier = v.supplier || v.purchaseBreakdown?.[0]?.supplier || 'kalkulator';
                        const isRec = v.tier === 'recommended';

                        return (
                            <div key={v.tier} className={`mb-3 rounded-lg border overflow-hidden ${
                                isRec ? 'border-violet-200' : 'border-slate-200'
                            }`}>
                                {/* Variant header */}
                                <div className={`px-3 py-2 flex items-center justify-between ${
                                    isRec ? 'bg-violet-50' : 'bg-slate-50'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {isRec && <span className="text-[9px]">⭐</span>}
                                        <span className="text-[11px] font-bold text-slate-700">{v.label}</span>
                                        <span className="text-[9px] text-slate-400">{modelName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase">{supplier}</span>
                                        <span className="text-[11px] font-black text-slate-800">{fmtEUR(v.totalGrossEUR || 0)} €</span>
                                    </div>
                                </div>

                                {/* Positions list */}
                                <div className="bg-white px-3 py-2">
                                    {/* Base construction */}
                                    <div className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            <span className="font-semibold text-slate-700">Konstruktion: {modelName}</span>
                                        </span>
                                        <span className="text-slate-500">{width}×{projection}mm · {color || 'RAL 7016'}</span>
                                    </div>

                                    {/* Roof */}
                                    {roofType && (
                                        <div className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                                <span className="text-slate-600">Dacheindeckung</span>
                                            </span>
                                            <span className="text-slate-500">{roofType === 'glass' ? 'VSG Glas' : 'Polycarbonat'}</span>
                                        </div>
                                    )}

                                    {/* Items from calculator */}
                                    {items.map((item: any, i: number) => (
                                        <div key={`item-${i}`} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                <span className="text-slate-600">{item.name || item.label || item.position}</span>
                                                {item.config && <span className="text-[8px] text-slate-400 ml-1">({item.config})</span>}
                                            </span>
                                            {item.dimensions && <span className="text-[9px] text-slate-400">{item.dimensions}</span>}
                                        </div>
                                    ))}

                                    {/* Addons */}
                                    {addons.map((addon: any, i: number) => (
                                        <div key={`addon-${i}`} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                <span className="text-slate-600">{addon.name}</span>
                                                {addon.variant && <span className="text-[8px] text-slate-400 ml-1">({addon.variant})</span>}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Accessories */}
                                    {accessories.map((acc: any, i: number) => (
                                        <div key={`acc-${i}`} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                <span className="text-slate-600">{acc.name}{acc.quantity > 1 ? ` ×${acc.quantity}` : ''}</span>
                                            </span>
                                        </div>
                                    ))}

                                    {/* Custom items */}
                                    {customItems.map((ci: any, i: number) => (
                                        <div key={`ci-${i}`} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                <span className="text-slate-600">{ci.name}{ci.quantity > 1 ? ` ×${ci.quantity}` : ''}</span>
                                            </span>
                                            {ci.description && <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{ci.description}</span>}
                                        </div>
                                    ))}

                                    {/* Installation */}
                                    {(v.installationCostEUR || 0) > 0 && (
                                        <div className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="font-semibold text-slate-700">Montage & Lieferung</span>
                                            </span>
                                            <span className="font-mono text-slate-700">{fmtEUR(v.installationCostEUR)} €</span>
                                        </div>
                                    )}

                                    {/* No items fallback */}
                                    {items.length === 0 && addons.length === 0 && accessories.length === 0 && customItems.length === 0 && (
                                        <p className="text-[10px] text-slate-400 py-2 italic">Brak szczegółowych pozycji (oferta z kalkulatora)</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ SUPPLIER PRICE COMPARISON — z leads.pricing_details (worker zapisuje tam liveQuotes) ═══ */}
            {showEK && (() => {
                const quotes: any[] = leadAI?.pricing_details?.liveQuotes || recommended?.liveQuotes || [];
                const okQuotes = quotes
                    .filter((q: any) => q.success && ((q.priceEK ?? q.priceEUR) > 0))
                    .sort((a: any, b: any) => (a.priceEK ?? a.priceEUR) - (b.priceEK ?? b.priceEUR));
                if (okQuotes.length === 0) return null;
                return (
                <div className="px-4 py-3 border-t border-violet-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-2">
                        🏭 Porównanie dostawców (EK netto)
                    </p>
                    <div className="space-y-1.5">
                        {okQuotes.map((q: any, i: number) => {
                                const cheapest = i === 0;
                                const price = q.priceEK ?? q.priceEUR;
                                const supplierLabel = q.supplier === 'mb' ? 'MB Aluminium'
                                    : (q.supplier?.charAt(0).toUpperCase() + q.supplier?.slice(1));
                                return (
                                    <div key={i} className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded-md ${
                                        cheapest ? 'bg-green-50 border border-green-200' : 'bg-slate-50'
                                    }`}>
                                        <span className="flex items-center gap-1.5">
                                            {cheapest && <span className="text-green-600 text-[9px]">🏆</span>}
                                            <span className={`font-semibold ${cheapest ? 'text-green-800' : 'text-slate-600'}`}>
                                                {supplierLabel}
                                            </span>
                                            <span className="text-slate-400">· {q.productLabel || q.product}</span>
                                        </span>
                                        <span className={`font-mono font-bold ${cheapest ? 'text-green-700' : 'text-slate-700'}`}>
                                            {fmtEUR(price)} €
                                        </span>
                                    </div>
                                );
                        })}
                    </div>
                </div>
                );
            })()}

            {/* ═══ OFERTA ZAKUPOWA (EK) — dokladny sklad zamowienia u dostawcow,
                 na podstawie ktorego powstala oferta kliencka ═══ */}
            {showEK && (() => {
                const pkgs: any[] = leadAI?.pricing_details?.packages || [];
                // fallback dla starszych ofert: purchaseBreakdown z wariantow
                const fallbackPkgs = pkgs.length === 0 ? (variants || [])
                    .filter((v: any) => Array.isArray(v.purchaseBreakdown) && v.purchaseBreakdown.length > 0)
                    .map((v: any) => ({
                        tier: v.tier, name: v.label,
                        purchaseEK: v.purchasePriceEUR, marginAmount: v.marginEUR, marginPercent: v.marginPercent,
                        customerNetto: v.priceNetEUR, customerBrutto: v.priceGrossEUR,
                        items: v.purchaseBreakdown.map((b: any) => ({ name: b.position, category: b.category, supplier: b.supplier, ekNetto: b.ekEUR, quantity: 1 })),
                    })) : [];
                const allPkgs = pkgs.length > 0 ? pkgs : fallbackPkgs;
                if (allPkgs.length === 0) return null;

                const active = allPkgs.find((pk: any) => pk.tier === purchaseTier) || allPkgs[1] || allPkgs[0];
                const supplierName = (sup: string) => sup === 'mb' ? 'MB Aluminium'
                    : sup === 'aluxe' ? 'Aluxe' : sup === 'teranda' ? 'Teranda'
                    : sup === 'aliplast' ? 'Aliplast' : (sup || 'Inne');
                const groups: Record<string, any[]> = {};
                (active?.items || []).forEach((it: any) => {
                    const k = it.supplier && it.supplier !== '-' ? it.supplier : '_inne';
                    (groups[k] = groups[k] || []).push(it);
                });
                const orders: any[] = leadAI?.pricing_details?.supplierOrders || [];
                const TIER_PL: Record<string, string> = { economy: 'Basis', recommended: 'Empfohlen', value: 'Komfort', premium: 'Premium' };

                return (
                <div className="px-4 py-3 border-t border-violet-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-2">
                        📦 Oferta zakupowa (EK) — z czego składa się oferta klienta
                    </p>
                    {/* przelacznik pakietow */}
                    <div className="flex gap-1 mb-2 flex-wrap">
                        {allPkgs.map((pk: any) => (
                            <button key={pk.tier}
                                onClick={() => setPurchaseTier(pk.tier)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                                    (active?.tier === pk.tier)
                                        ? 'bg-violet-600 text-white border-violet-600'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300'
                                }`}>
                                {TIER_PL[pk.tier] || pk.tier}
                            </button>
                        ))}
                    </div>

                    {Object.entries(groups).map(([sup, items]) => {
                        const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.ekNetto) || 0), 0);
                        return (
                            <div key={sup} className="mb-2 rounded-lg border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between px-2 py-1 bg-slate-100">
                                    <span className="text-[10px] font-bold text-slate-600">🏭 {supplierName(sup)}</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-700">{fmtEUR(subtotal)} € EK</span>
                                </div>
                                {items.map((it: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between px-2 py-1 text-[10px] border-t border-slate-100">
                                        <span className="text-slate-600 truncate pr-2">
                                            {it.quantity > 1 ? `${it.quantity}× ` : ''}{it.name}
                                        </span>
                                        <span className="font-mono text-slate-500 shrink-0">{fmtEUR(Number(it.ekNetto) || 0)} €</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {/* podsumowanie EK → VK */}
                    <div className="rounded-lg bg-violet-50 border border-violet-200 px-2 py-1.5 space-y-0.5">
                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Razem zakup (EK netto)</span><span className="font-mono font-bold text-slate-700">{fmtEUR(Number(active?.purchaseEK) || 0)} €</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Marża ({Math.round(Number(active?.marginPercent) || 0)}%)</span><span className="font-mono font-bold text-emerald-700">+{fmtEUR(Number(active?.marginAmount) || 0)} €</span></div>
                        <div className="flex justify-between text-[10px] pt-0.5 border-t border-violet-200"><span className="text-slate-600 font-bold">Klient netto / brutto</span><span className="font-mono font-bold text-violet-800">{fmtEUR(Number(active?.customerNetto) || 0)} € / {fmtEUR(Number(active?.customerBrutto) || 0)} €</span></div>
                    </div>

                    {/* linki do zapisanych ofert u dostawcow */}
                    {orders.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1">Zapisane oferty u dostawcy</p>
                            <div className="flex flex-wrap gap-1">
                                {orders.map((o: any, i: number) => (
                                    <a key={i} href={o.url} target="_blank" rel="noopener noreferrer"
                                       className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-700 hover:bg-amber-100">
                                        🔗 {supplierName(o.supplier)}: {o.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                );
            })()}

            {/* Actions */}
            {latestOffer && (
                <div className="px-4 py-3 border-t border-violet-100 flex flex-wrap gap-2">
                    <a
                        href={offerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Podgląd oferty
                    </a>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(offerUrl);
                            const btn = document.activeElement as HTMLElement;
                            if (btn) {
                                btn.textContent = '✅ Skopiowano!';
                                setTimeout(() => { btn.textContent = '📋 Link'; }, 2000);
                            }
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                        📋 Link
                    </button>
                </div>
            )}

            {/* ═══ 📂 PREVIOUS OFFERS HISTORY ═══ */}
            {agentOffers.length > 1 && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-2">
                        📂 Poprzednie oferty ({agentOffers.length - 1})
                    </p>
                    <div className="space-y-1.5">
                        {agentOffers.slice(1).map((offer) => {
                            const date = new Date(offer.created_at);
                            const dateStr = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                            const oldUrl = `${window.location.origin}/p/offer/${offer.public_token}`;
                            const recVariant = offer.variants?.find((v: any) => v.tier === 'recommended');
                            const priceStr = recVariant?.totalGrossEUR ? `${fmtEUR(recVariant.totalGrossEUR)} € brutto` : '';

                            return (
                                <div key={offer.id} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-slate-600">{offer.offer_number}</span>
                                            {priceStr && <span className="text-[9px] text-slate-400">{priceStr}</span>}
                                        </div>
                                        <p className="text-[9px] text-slate-400">{dateStr} · {timeStr}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <a
                                            href={oldUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-colors"
                                        >
                                            👁 Podgląd
                                        </a>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(oldUrl);
                                                toast.success('Link skopiowany!');
                                            }}
                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-colors"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ 🧠 CLAUDE AI ANALYSIS ═══ */}
            {(() => {
                const ai = leadAI?.ai_analysis || latestOffer?.product_config?.aiAnalysis;
                if (!ai || (!ai.customerProfile && !ai.internalNotes)) return null;
                const urgency = URGENCY_BADGE[ai.urgency] || URGENCY_BADGE.medium;
                
                return (
                    <div className="px-4 py-3 border-t border-violet-100">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">🧠 Analiza Claude AI</p>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${urgency.color}`}>
                                {urgency.label}
                            </span>
                        </div>
                        
                        {ai.customerProfile && (
                            <div className="bg-slate-50 rounded-md px-3 py-2 mb-2">
                                <p className="text-[10px] font-bold text-slate-500 mb-0.5">Profil klienta</p>
                                {typeof ai.customerProfile === 'string' ? (
                                    <p className="text-[11px] text-slate-700">{ai.customerProfile}</p>
                                ) : (
                                    <div className="text-[11px] text-slate-700 space-y-0.5">
                                        {Object.entries(ai.customerProfile as Record<string, any>).map(([k, v]) => (
                                            <div key={k}><span className="font-semibold text-slate-500">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {ai.reasoning && (
                            <div className="bg-blue-50 rounded-md px-3 py-2 mb-2">
                                <p className="text-[10px] font-bold text-blue-500 mb-0.5">💡 Uzasadnienie doboru</p>
                                <p className="text-[11px] text-blue-700">{typeof ai.reasoning === 'string' ? ai.reasoning : JSON.stringify(ai.reasoning)}</p>
                            </div>
                        )}

                        {ai.tierStrategy && typeof ai.tierStrategy === 'object' && (
                            <div className="space-y-1 mb-2">
                                <p className="text-[10px] font-bold text-slate-500">Strategia tierów</p>
                                {Object.entries(ai.tierStrategy as Record<string, any>).map(([tier, reason]) => (
                                    <div key={tier} className="flex gap-2 text-[10px]">
                                        <span className="font-bold text-slate-500 shrink-0 w-20">{tier}:</span>
                                        <span className="text-slate-600">{typeof reason === 'string' ? reason : JSON.stringify(reason)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {ai.tierStrategy && typeof ai.tierStrategy === 'string' && (
                            <div className="bg-slate-50 rounded-md px-3 py-2 mb-2">
                                <p className="text-[10px] font-bold text-slate-500 mb-0.5">Strategia tierów</p>
                                <p className="text-[11px] text-slate-600">{ai.tierStrategy}</p>
                            </div>
                        )}

                        {ai.internalNotes && (
                            <div className="bg-amber-50 rounded-md px-3 py-2">
                                <p className="text-[10px] font-bold text-amber-600 mb-0.5">📌 Notatki wewnętrzne</p>
                                <p className="text-[11px] text-amber-800">{ai.internalNotes}</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ═══ 📧 DRAFT EMAIL (needs_info) ═══ */}
            {leadStatus === 'needs_info' && leadAI?.ai_draft_email && (() => {
                let emailData: { subject: string; body: string };
                try { emailData = JSON.parse(leadAI.ai_draft_email!); } catch { return null; }
                
                const handleSendEmail = async () => {
                    if (!leadAI.email) { toast.error('Brak emaila klienta'); return; }
                    setSendingEmail(true);
                    try {
                        await supabase.functions.invoke('send-email', {
                            body: {
                                to: leadAI.email,
                                subject: emailData.subject,
                                html: `<div style="font-family:Arial,sans-serif;max-width:600px">${emailData.body.replace(/\n/g, '<br>')}</div>`,
                                fromName: 'Polendach24',
                            },
                        });
                        await supabase.from('leads').update({ 
                            status: 'contacted', 
                            ai_draft_email: null,
                            updated_at: new Date().toISOString(),
                        }).eq('id', leadId);
                        toast.success('Email wysłany!');
                        setTimeout(() => window.location.reload(), 1000);
                    } catch (err) {
                        toast.error('Błąd wysyłki emaila');
                    } finally {
                        setSendingEmail(false);
                    }
                };

                return (
                    <div className="px-4 py-3 border-t border-orange-200 bg-orange-50/50">
                        <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mb-2">
                            📧 Proponowany email do klienta
                        </p>
                        <div className="bg-white rounded-lg border border-orange-200 overflow-hidden mb-2">
                            <div className="px-3 py-1.5 bg-orange-100/50 border-b border-orange-200">
                                <p className="text-[10px] text-orange-500">Do: {leadAI.email || '—'}</p>
                                <p className="text-[11px] font-bold text-orange-800">{emailData.subject}</p>
                            </div>
                            <div className="px-3 py-2">
                                <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                                    {emailData.body}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail || !leadAI.email}
                                className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all disabled:opacity-50"
                            >
                                {sendingEmail ? '⏳ Wysyłam...' : '✅ Wyślij email'}
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* ═══ 📱 DRAFT SMS (needs_info) ═══ */}
            {leadStatus === 'needs_info' && leadAI?.ai_draft_sms && (
                <div className="px-4 py-3 border-t border-orange-200 bg-orange-50/50">
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mb-2">
                        📱 Proponowany SMS
                    </p>
                    <div className="bg-white rounded-lg border border-orange-200 px-3 py-2 mb-2">
                        <p className="text-[10px] text-orange-500 mb-1">Do: {leadAI.phone || '—'}</p>
                        <p className="text-[11px] text-slate-700">{leadAI.ai_draft_sms}</p>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(leadAI.ai_draft_sms || '');
                            toast.success('SMS skopiowany do schowka');
                        }}
                        className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                        📋 Kopiuj SMS
                    </button>
                </div>
            )}

            {/* ═══ Missing info badge ═══ */}
            {leadStatus === 'needs_info' && leadAI?.ai_analysis?.missingInfo && (
                <div className="px-4 py-3 border-t border-orange-200">
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mb-1.5">
                        ⚠️ Brakujące dane
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {(leadAI.ai_analysis.missingInfo as string[]).map((item: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded-full">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
