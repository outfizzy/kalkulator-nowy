import React, { useState } from 'react';
import { Star, Wrench, ClipboardList } from 'lucide-react';
import { toCustomerLabel } from '../../utils/productLabel';

// ===== TYPES =====
export interface TierVariant {
    id: string;
    tier: 'economy' | 'recommended' | 'value' | 'premium';
    label: string;
    tagline: string;
    modelId?: string;
    modelName?: string;
    modelDescription?: string;
    modelHighlights?: string[];
    heroImage?: string;
    galleryImages?: string[];
    competitorCompare?: string;
    features: TierFeature[];
    customerPositions?: CustomerPosition[];
    purchaseBreakdown?: PurchaseItem[];
    dimensions?: string;
    color?: string;
    priceNetEUR: number;
    priceGrossEUR: number;
    installationDays: number;
    installationCostEUR: number;
    totalNetEUR: number;
    totalGrossEUR: number;
    purchasePriceEUR?: number;
    marginEUR?: number;
    marginPercent?: number;
    extras: TierExtra[];
}

export interface TierFeature {
    name: string;
    included: boolean;
    highlight?: boolean;
}

export interface TierExtra {
    name: string;
    description?: string;
    priceEUR: number;
}

export interface CustomerPosition {
    name: string;
    description?: string;
    included: boolean;
}

export interface PurchaseItem {
    position: string;
    ekEUR: number;
    category: string;
    supplier?: string;
}

// ===== HELPERS =====
const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));

/** Remove supplier/internal/Polish names from customer-facing text */
const clean = (t: string) => toCustomerLabel(t);

// ===== COMPONENT =====
interface Props {
    variants: TierVariant[];
    onSelectTier?: (tier: TierVariant) => void;
    onRequestMeasurement?: () => void;
    productName?: string;
    dimensions?: string;
}

export const TierComparisonSection: React.FC<Props> = ({
    variants, onSelectTier, onRequestMeasurement, productName, dimensions,
}) => {
    const [showGross, setShowGross] = useState(true);

    const sorted = [...variants].sort((a, b) => {
        const order: Record<string, number> = { economy: 0, recommended: 1, value: 2, premium: 3 };
        return (order[a.tier] ?? 9) - (order[b.tier] ?? 9);
    });

    // ── Tier visual config ──
    const styles: Record<string, {
        accent: string; badge: string; badgeBg: string; border: string;
        btn: string; check: string; headerGrad: string; priceColor: string;
        ribbon: string; glow: string;
    }> = {
        economy: {
            accent: '#475569', badge: 'Basis', badgeBg: 'bg-slate-600',
            border: 'border-slate-200', btn: 'bg-slate-800 hover:bg-slate-900',
            check: 'text-emerald-500', headerGrad: 'from-slate-50 to-white',
            priceColor: 'text-slate-800', ribbon: '', glow: '',
        },
        recommended: {
            accent: '#1E6FD9', badge: 'Empfohlen', badgeBg: 'bg-[#1E6FD9]',
            border: 'border-[#1E6FD9]', btn: 'bg-[#1E6FD9] hover:bg-[#195FC0] shadow-cta',
            check: 'text-[#1E6FD9]', headerGrad: 'from-[#EAF2FE] via-[#F0F6FF] to-white',
            priceColor: 'text-[#195FC0]', ribbon: 'Beliebteste Wahl',
            glow: 'ring-2 ring-[#1E6FD9]/35',
        },
        premium: {
            accent: '#1e293b', badge: 'Premium', badgeBg: 'bg-gradient-to-r from-slate-800 to-slate-900',
            border: 'border-slate-300', btn: 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-lg shadow-slate-300/50',
            check: 'text-amber-500', headerGrad: 'from-slate-100 via-slate-50 to-white',
            priceColor: 'text-slate-800', ribbon: '', glow: '',
        },
    };

    return (
        <div id="tier-comparison" className="py-12 md:py-20">
            {/* ═══ HEADER ═══ */}
            <div className="text-center mb-12 md:mb-16 px-4">
                <p className="text-sm font-bold text-[#1E6FD9] uppercase tracking-[0.2em] mb-4">
                    Ihr persönliches Angebot
                </p>
                <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                    Wählen Sie Ihr Paket
                </h2>
                {productName && (
                    <p className="text-gray-400 mt-3 text-lg">
                        {clean(productName)}{dimensions ? ` · ${dimensions}` : ''}
                    </p>
                )}
                {/* Toggle */}
                <div className="inline-flex items-center mt-8 bg-gray-100 rounded-full p-1 shadow-inner">
                    {['Netto', 'Brutto (inkl. MwSt.)'].map((label, i) => (
                        <button
                            key={label}
                            onClick={() => setShowGross(i === 1)}
                            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                                (i === 0 ? !showGross : showGross)
                                    ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ TIER CARDS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-6xl mx-auto px-4">
                {sorted.map((v, idx) => {
                    const s = styles[v.tier] || styles.economy; // 'value' i nieznane tiery → bezpieczny fallback
                    const isRec = v.tier === 'recommended';
                    const price = showGross ? v.totalGrossEUR : v.totalNetEUR;
                    const positions = v.customerPositions || [];
                    const cleanFeatures = v.features
                        .filter(f => f.included)
                        .map(f => ({ ...f, name: clean(f.name) }))
                        .filter(f => f.name.length > 0);

                    return (
                        <div
                            key={v.id}
                            className={`
                                relative bg-white overflow-hidden flex flex-col
                                transition-all duration-300
                                ${s.border} ${s.glow}
                                ${isRec ? 'lg:scale-[1.04] lg:z-10 shadow-2xl' : 'shadow-md hover:shadow-xl'}
                                ${idx === 0 ? 'rounded-3xl lg:rounded-r-none lg:rounded-l-3xl' : ''}
                                ${idx === 1 ? 'rounded-3xl lg:rounded-none border-x-2' : ''}
                                ${idx === 2 ? 'rounded-3xl lg:rounded-l-none lg:rounded-r-3xl' : ''}
                            `}
                        >
                            {/* Ribbon */}
                            {s.ribbon && (
                                <div className="bg-[#1E6FD9] text-white text-center py-2.5 text-xs font-bold uppercase tracking-[0.15em]">
                                    {s.ribbon}
                                </div>
                            )}

                            {/* ── Header ── */}
                            <div className={`bg-gradient-to-b ${s.headerGrad} px-6 md:px-8 pt-7 pb-6`}>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white ${s.badgeBg}`}>
                                    {isRec && <Star className="w-3 h-3" fill="currentColor" />}
                                    {s.badge}
                                </span>

                                <h3 className="text-2xl font-extrabold text-gray-900 mt-4 mb-1">
                                    {clean(v.modelName || v.label)}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {clean(v.tagline)}
                                </p>

                                {/* PRICE */}
                                <div className="mt-6 flex items-end gap-2">
                                    <span className={`text-5xl font-black tracking-tight leading-none ${s.priceColor}`}>
                                        {fmt(price)}
                                    </span>
                                    <span className="text-xl text-gray-400 font-medium mb-1">€</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    {showGross ? 'inkl. 19% MwSt.' : 'zzgl. 19% MwSt.'} · inkl. Montage
                                </p>
                            </div>

                            {/* ── Specs Bar ── */}
                            <div className="flex items-center gap-4 px-6 md:px-8 py-3 bg-gray-50/80 border-y border-gray-100 text-xs text-gray-500">
                                {v.dimensions && (
                                    <span className="flex items-center gap-1.5">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-gray-400">
                                            <path d="M21 21H3V3" strokeLinecap="round" />
                                            <path d="M21 7l-4-4-4 4M17 3v18" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {v.dimensions}
                                    </span>
                                )}
                                {v.color && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-gray-700 ring-1 ring-gray-300" />
                                        {v.color}
                                    </span>
                                )}
                            </div>

                            {/* ═══ POSITIONS ═══ */}
                            <div className="px-6 md:px-8 py-6 flex-1 flex flex-col">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-5">
                                    {positions.length > 0
                                        ? `${positions.length} Positionen enthalten`
                                        : `${cleanFeatures.length} Leistungen enthalten`
                                    }
                                </p>

                                {/* Customer positions (if available) */}
                                {positions.length > 0 ? (
                                    <ul className="space-y-3.5">
                                        {positions.map((pos, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 shrink-0 mt-0.5 ${s.check}`}>
                                                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
                                                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800 leading-snug">
                                                        {clean(pos.name)}
                                                    </p>
                                                    {pos.description && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {clean(pos.description)}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    /* Fallback: features list */
                                    <ul className="space-y-3">
                                        {cleanFeatures.map((f, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 shrink-0 mt-0.5 ${s.check}`}>
                                                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
                                                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <span className={`text-sm leading-snug ${
                                                    f.highlight ? 'font-semibold text-gray-800' : 'text-gray-600'
                                                }`}>
                                                    {f.name}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Not included (crossed out) */}
                                {v.features.filter(f => !f.included).length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        {v.features.filter(f => !f.included).map((f, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1.5 opacity-40">
                                                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-300 shrink-0">
                                                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1" />
                                                    <path d="M8 12h8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                                                </svg>
                                                <span className="text-sm text-gray-400 line-through">{clean(f.name)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── CTA ── */}
                            <div className="px-6 md:px-8 pb-7 pt-2">
                                <button
                                    onClick={() => onSelectTier?.(v)}
                                    className={`w-full py-4 rounded-full font-semibold text-[15px] text-white
                                        transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-2 ${s.btn}`}
                                >
                                    {isRec && <Star className="w-4 h-4" fill="currentColor" />}
                                    {isRec ? 'Dieses Paket wählen' : 'Paket auswählen'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ DISCLAIMERS ═══ */}
            <div className="max-w-4xl mx-auto mt-12 md:mt-16 space-y-4 px-4">
                {/* Montage */}
                <div className="flex items-start gap-4 bg-[#EAF2FE]/80 border border-[#BFD9FB] rounded-2xl px-6 py-5">
                    <div className="shrink-0 w-10 h-10 bg-[#DCEAFD] rounded-xl flex items-center justify-center text-[#1E6FD9]">
                        <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#0A1628] mb-1">Montage: 1 Tag kalkuliert</p>
                        <p className="text-sm text-[#195FC0]/80 leading-relaxed">
                            In jedem Paket ist <strong>1 Montagetag</strong> enthalten.
                            Die genaue Montagezeit wird bei der Vor-Ort-Besichtigung durch unseren Fachberater festgelegt
                            und in der finalen Angebotsbestätigung berücksichtigt.
                        </p>
                    </div>
                </div>

                {/* Vorläufige Kalkulation */}
                <div className="flex items-start gap-4 bg-amber-50/80 border border-amber-200 rounded-2xl px-6 py-5">
                    <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900 mb-1">Vorläufige Kalkulation</p>
                        <p className="text-sm text-amber-700/70 leading-relaxed">
                            Diese Preise sind eine <strong>erste Preisindikation</strong> auf Basis Ihrer Angaben.
                            Nach Klärung aller Details (exakte Maße, Montagesituation, Sonderwünsche)
                            erhalten Sie eine <strong>verbindliche Angebotsbestätigung</strong> mit dem finalen Preis.
                        </p>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                        <strong>Hinweis:</strong> Technische Details, exakte Maße und Montagebedingungen werden
                        bei einem persönlichen Vor-Ort-Termin mit Ihrem Fachberater besprochen.
                        Wir empfehlen die Vereinbarung eines kostenlosen Aufmaßtermins.
                    </p>
                </div>

                {/* CTA */}
                <div className="text-center pt-6">
                    <button
                        onClick={onRequestMeasurement}
                        className="inline-flex items-center gap-3 px-10 py-4 rounded-full
                            bg-[#1E6FD9] hover:bg-[#195FC0] text-white font-semibold text-base
                            shadow-cta transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-2"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                        </svg>
                        Kostenlosen Aufmaßtermin vereinbaren
                    </button>
                    <p className="text-xs text-gray-400 mt-3">Unverbindlich · Kostenlos · Vor Ort bei Ihnen</p>
                </div>
            </div>
        </div>
    );
};
