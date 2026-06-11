import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Check, Minus, Plus, Shield, Globe, Star, Wrench, ShieldCheck } from 'lucide-react';
import type { TierVariant } from './TierComparisonSection';
import { getModelImage, getModelGallery, CROSS_SELL_IMAGES, PLACEHOLDER_IMAGE } from '../../config/modelImages';
import { toCustomerLabel } from '../../utils/productLabel';

/* ────────────────────────────────────────────────────────────── *
 *  HELPERS
 * ────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));

const fmt2 = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Strip supplier brand names + internal/Polish names from customer-facing labels */
const clean = (t: string): string => {
  // First pass: map internal/Polish names + numeric codes to clean German labels.
  let s = toCustomerLabel(t);
  s = s
    .replace(/\bTeranda TR15\b/gi, 'Trendstyle 15')
    .replace(/\bTeranda TR20\b/gi, 'Topstyle 20')
    .replace(/\bTeranda TR10\b/gi, 'Orangestyle 10')
    .replace(/\bTrendline plus\b/gi, 'Trendstyle Plus')
    .replace(/\bTrendline\b/gi, 'Trendstyle 15')
    .replace(/\bTopline XL\b/gi, 'Topstyle XL')
    .replace(/\bTopline\b/gi, 'Topstyle 20')
    .replace(/\bOrangeline plus\b/gi, 'Orangestyle Plus')
    .replace(/\bOrangeline\b/gi, 'Orangestyle 10')
    .replace(/\bUltraline\b/gi, 'Ultrastyle')
    .replace(/\bSkyline\b/gi, 'Skystyle');
  s = s
    .replace(/\bPanorama AL\d+\b/gi, 'Panorama Schiebewand')
    .replace(/\bZIP Screen C-Cube\b/gi, 'Senkrechtmarkise')
    .replace(/\bVerticale Zonwering\b/gi, 'Senkrechtmarkise')
    .replace(/\bPlatten\b/gi, 'Polycarbonat')
    .replace(/\bfür polycarbonat\b/gi, 'mit Polycarbonat');
  s = s.replace(/\b(aluxe|teranda|deponti|aliplast|c-cube)\b/gi, '');
  s = s.replace(/\((\d+)× Spots \+ (\d+)× Stripes\)/gi, '($1 Spots + $2 Stripes)');
  s = s.replace(/\((\d+)× Spots\)/gi, '($1 Spots)');
  // Strip emoji / pictographs + stray ★ — customer view is icon-only (lucide).
  s = s.replace(/[☀-➿⬀-⯿\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}️]/gu, '');
  s = s.replace(/\s*—\s*—\s*/g, ' — ').replace(/\s{2,}/g, ' ').trim();
  return s;
};

/* ────────────────────────────────────────────────────────────── *
 *  SVG ICON LIBRARY — Professional, zero-dependency icons
 * ────────────────────────────────────────────────────────────── */
const I: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z" />,
  star: <><path d="M12 2l2.4 7.2H22l-6 4.5 2.3 7.3L12 16.5 5.7 21l2.3-7.3-6-4.5h7.6z" fill="currentColor" opacity=".15"/><path d="M12 2l2.4 7.2H22l-6 4.5 2.3 7.3L12 16.5 5.7 21l2.3-7.3-6-4.5h7.6z" /></>,
  crown: <path d="M2 17l3-8 4 5 3-8 3 8 4-5 3 8H2zM4 19h16v2H4z" />,
  refresh: <><path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91A6 6 0 016.73 2.53l3.77 3.77z" />,
  ruler: <><path d="M21.73 18l-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3z" fill="none" /><path d="M3.5 18.5h17M6 14.5h2M9 10.5h2M12 6.5h2" /></>,
  paint: <><path d="M19 3H5a2 2 0 00-2 2v2a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" /><path d="M12 9v4M12 17v.01" /><path d="M8 13h8v5a3 3 0 01-3 3h-2a3 3 0 01-3-3v-5z" /></>,
  structure: <><path d="M2 20h20" /><path d="M5 20V8l7-5 7 5v12" /><path d="M9 20v-5h6v5" /></>,
  clipboard: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  snowflake: <><path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" /><circle cx="12" cy="12" r="3" fill="currentColor" opacity=".12" /></>,
  droplet: <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" opacity=".1" /><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2" /></>,
  expand: <path d="M21 3H3v18M21 3l-8 8M21 3v4M21 3h-4" />,
  chat: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 014 11.5 8.5 8.5 0 018.7 3.9 8.38 8.38 0 0112.5 3h.5a8.48 8.48 0 018 8v.5z" />,
  checkBadge: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></>,
  pkg: <><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" /></>,
  window: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  triangle: <path d="M12 2l10 18H2z" />,
  lightbulb: <><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 00-3 13.33V18h6v-2.67A7 7 0 0012 2z" /></>,
  arrowDown: <path d="M12 5v14M19 12l-7 7-7-7" />,
  sun: <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  measure: <><path d="M21.73 18l-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3z" fill="none" /><path d="M5 17h14" /><path d="M7 13h2M11 9h2" /></>,
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
};

const SvgIcon = ({ name, className = 'w-5 h-5' }: { name: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {I[name] || I.pkg}
  </svg>
);

const CheckIcon = ({ className = 'w-5 h-5 text-emerald-500' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ────────────────────────────────────────────────────────────── *
 *  TIER CONFIG
 * ────────────────────────────────────────────────────────────── */
interface TierStyle {
  label: string; iconName: string; accent: string;
  badgeBg: string; btnCls: string; checkCls: string;
  ringCls: string; headerBg: string;
  /** Top accent edge of the card — gives each tier an instantly readable identity. */
  topBar: string;
  /** Soft tint behind the icon chips in the positions list. */
  chipTint: string;
}
/* ── Coherent tier palette (NOT a rainbow) ──
 *  Hierarchy is intentional: "Empfohlen" is the single visual anchor
 *  (brand blue, scaled, glowing). The others stay quieter so the eye lands
 *  on the recommendation first.
 *    Basis    → neutral slate  (calm, entry)
 *    Komfort  → teal           (a deeper, supportive accent — not loud)
 *    Empfohlen→ brand blue     (THE anchor)
 *    Premium  → graphite/dark with a discreet gold accent (elegant, not amber-loud)
 */
const TIER_STYLES: Record<string, TierStyle> = {
  economy: {
    label: 'Basis', iconName: 'home', accent: '#64748b',
    badgeBg: 'bg-slate-500', btnCls: 'bg-slate-700 hover:bg-slate-800 shadow-md shadow-slate-200/60',
    checkCls: 'text-emerald-500', ringCls: '',
    headerBg: 'from-slate-50 to-white',
    topBar: 'bg-gradient-to-r from-slate-400 to-slate-500',
    chipTint: 'bg-slate-100 text-slate-500',
  },
  value: {
    label: 'Komfort', iconName: 'refresh', accent: '#0d9488',
    badgeBg: 'bg-teal-600', btnCls: 'bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200/60',
    checkCls: 'text-teal-500', ringCls: '',
    headerBg: 'from-teal-50/70 to-white',
    topBar: 'bg-gradient-to-r from-teal-400 to-teal-600',
    chipTint: 'bg-teal-50 text-teal-600',
  },
  recommended: {
    label: 'Empfohlen', iconName: 'star', accent: '#1E6FD9',
    badgeBg: 'bg-[#1E6FD9]', btnCls: 'bg-[#1E6FD9] hover:bg-[#195FC0] shadow-cta',
    checkCls: 'text-[#1E6FD9]', ringCls: 'ring-2 ring-[#1E6FD9]/35',
    headerBg: 'from-[#EAF2FE] via-[#F0F6FF] to-white',
    topBar: 'bg-gradient-to-r from-[#1E6FD9] via-[#3B82F6] to-[#1E6FD9]',
    chipTint: 'bg-[#EAF2FE] text-[#1E6FD9]',
  },
  premium: {
    label: 'Premium', iconName: 'crown', accent: '#1e293b',
    badgeBg: 'bg-gradient-to-r from-slate-800 to-slate-900',
    btnCls: 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-lg shadow-slate-300/50',
    checkCls: 'text-amber-500', ringCls: '',
    headerBg: 'from-slate-100 via-slate-50 to-white',
    topBar: 'bg-gradient-to-r from-slate-700 via-slate-800 to-amber-500',
    chipTint: 'bg-amber-50 text-amber-600',
  },
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  roof: 'home', panorama: 'window', keilfenster: 'triangle', led: 'lightbulb',
  senkrechtmarkise: 'arrowDown', markise: 'sun', montage: 'wrench', material: 'ruler',
};

/* ────────────────────────────────────────────────────────────── *
 *  PROPS
 * ────────────────────────────────────────────────────────────── */
interface CrossSellItem {
  name: string; nameDE: string; category: string; supplier: string;
  purchaseNetto: number; customerBrutto: number; dimensions?: string;
  description: string; icon: string; confidence: number; source: string;
}

interface BotOfferViewProps {
  variants: TierVariant[];
  crossSell?: CrossSellItem[];
  customerName?: string;
  productName?: string;
  dimensions?: string;
  color?: string;
  offerNumber?: string;
  /** Creator's phone for CTA links (href format, e.g. "+4935615019981"). */
  creatorPhoneHref?: string;
  /** Creator's phone for display (e.g. "03561 501 9981"). */
  creatorPhoneDisplay?: string;
  onSelectTier: (tier: TierVariant) => void;
  onRequestMeasurement?: () => void;
  onAcceptOffer?: () => void;
  /** Optional: download the PDF of the currently selected package. */
  onDownloadPDF?: () => void;
  /** Optional: open the contact form prefilled with interest in a given extra. */
  onRequestExtra?: (extraName: string) => void;
  selectedTier: TierVariant | null;
}

/* ── Image Gallery Sub-component (top-level: nie remountuje się przy renderze rodzica) ── */
const CardGallery = ({ modelName, tier }: { modelName: string; tier: string }) => {
  const [idx, setIdx] = useState(0);
  const gallery = getModelGallery(modelName || '') || [];
  const fallback = getModelImage(modelName || '') || PLACEHOLDER_IMAGE;
  const images = gallery.length > 0 ? gallery.slice(0, 4) : [fallback];
  const s = TIER_STYLES[tier] || TIER_STYLES.economy;

  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-900">
      <img
        src={images[idx] || fallback}
        alt={modelName}
        className="w-full h-full object-cover transition-opacity duration-500"
        loading="lazy"
      />
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* tier badge */}
      <div className={`absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
        text-[11px] font-bold text-white backdrop-blur-md ring-1 ring-white/10
        ${tier === 'recommended' ? 'bg-[#1E6FD9]/90' : tier === 'premium' ? 'bg-[#0A1628]/85' : tier === 'value' ? 'bg-teal-700/85' : 'bg-white/15'}`}>
        <SvgIcon name={s.iconName} className="w-3.5 h-3.5" />
        {s.label}
      </div>

      {/* dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all duration-300 border-none cursor-pointer
                ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
 *  BOT OFFER VIEW — Premium Sales Experience v3
 * ════════════════════════════════════════════════════════════════ */
export const BotOfferView: React.FC<BotOfferViewProps> = ({
  variants, crossSell, customerName, productName, dimensions, color,
  offerNumber, creatorPhoneHref, creatorPhoneDisplay: creatorPhoneDisplayProp,
  onSelectTier, onRequestMeasurement, onAcceptOffer, onDownloadPDF,
  onRequestExtra, selectedTier,
}) => {
  const heroPhone = creatorPhoneHref || '+4935615019981';
  const heroPhoneLabel = creatorPhoneDisplayProp || '03561 501 9981';
  // Price view (Brutto = default for private customers). Persisted in localStorage.
  const [showGross, setShowGross] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('offerPriceMode');
      return saved ? saved === 'gross' : true;
    } catch { return true; }
  });
  // Short "Aktualisiere Preise …" loading micro-state on toggle.
  const [priceLoading, setPriceLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const cardsRef = useRef<HTMLDivElement>(null);
  // Extras the customer has clicked "Anfragen" on (→ button shows "Angefragt ✓").
  const [requestedExtras, setRequestedExtras] = useState<Set<string>>(new Set());

  const sorted = [...variants].sort((a, b) => {
    // Sort ascending by price — cheapest first, most expensive last
    return (a.totalNetEUR || 0) - (b.totalNetEUR || 0);
  });

  // Number of packages — layout must adapt to 1, 2, 3 or 4 (never assume 4).
  const N = sorted.length;
  const isSingle = N === 1;
  // Adaptive card grid: 1 → centered single; 2 → 2-up; 3/4 → multi-column.
  const cardGridClass = isSingle
    ? 'grid grid-cols-1 max-w-2xl mx-auto'
    : N === 2
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto'
      : N === 3
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5';

  // Toggle handler with a short loading state (microcopy: "Aktualisiere Preise …").
  const handlePriceToggle = (gross: boolean) => {
    if (gross === showGross) return;
    setPriceLoading(true);
    setShowGross(gross);
    try { localStorage.setItem('offerPriceMode', gross ? 'gross' : 'net'); } catch { /* ignore */ }
  };
  useEffect(() => {
    if (!priceLoading) return;
    const t = setTimeout(() => setPriceLoading(false), 450);
    return () => clearTimeout(t);
  }, [priceLoading]);

  // All unique feature names across tiers
  const allFeatures = Array.from(new Set(sorted.flatMap(v => v.features?.map(f => f.name) || [])));

  /* ── DIFF LOGIC: what does each tier ADD vs. the next-cheaper one? ──
   * Each higher package is a superset, so the customer should instantly see
   * the "jump" between tiers (green "+ Neu"). We compare the set of INCLUDED
   * feature names of each variant against the previous (cheaper) variant. */
  const includedNamesByIdx: Set<string>[] = sorted.map(
    v => new Set((v.features || []).filter(f => f.included).map(f => f.name))
  );
  // newFeatureNamesByVariantId[id] = Set of feature names this tier adds vs lower.
  const newFeatureNamesByVariantId: Record<string, Set<string>> = {};
  sorted.forEach((v, idx) => {
    const prev = idx > 0 ? includedNamesByIdx[idx - 1] : new Set<string>();
    const added = new Set<string>();
    includedNamesByIdx[idx].forEach(name => { if (!prev.has(name)) added.add(name); });
    // The cheapest tier has no "lower" to compare against → nothing is "new".
    newFeatureNamesByVariantId[v.id] = idx === 0 ? new Set<string>() : added;
  });
  // For the comparison table: the first (cheapest) variant index that includes a feature.
  const firstIncludingIdx = (name: string): number =>
    includedNamesByIdx.findIndex(set => set.has(name));

  // Cleaned (customer-facing) names of the features each tier adds — used to flag
  // "+ Neu" on card list items (positions/features share cleaned labels).
  const newCleanNamesByVariantId: Record<string, Set<string>> = {};
  sorted.forEach(v => {
    newCleanNamesByVariantId[v.id] = new Set(
      Array.from(newFeatureNamesByVariantId[v.id]).map(n => clean(n).toLowerCase()).filter(Boolean)
    );
  });
  const isNewItem = (variantId: string, itemName: string): boolean => {
    const set = newCleanNamesByVariantId[variantId];
    if (!set || set.size === 0) return false;
    const key = clean(itemName).toLowerCase();
    if (!key) return false;
    // Exact or containment match (positions may bundle a feature label).
    if (set.has(key)) return true;
    for (const n of set) { if (key.includes(n) || n.includes(key)) return true; }
    return false;
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Smooth-scroll to the package cards (used by the sticky bar when nothing is
  // selected yet — works for any number of packages).
  const scrollToCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Cheapest package (for the "ab … €" hint in the sticky bar before a choice).
  const cheapest = sorted[0];
  // The single package, when there is exactly one — lets the sticky bar work for N=1.
  const single = isSingle ? sorted[0] : null;

  /* ── Structural details from the pricing worker (per package) ──
   * "Technische Daten" follows the customer's selection: selected tier →
   * recommended → cheapest. Empty rows are filtered out (spec: never show
   * empty technical accordions). Falls back to the static spec grid when
   * the worker didn't deliver any details (older offers). */
  const detailsSource = selectedTier || sorted.find(v => v.tier === 'recommended') || sorted[0];
  const structuralDetails: { label: string; value: string; icon?: string }[] =
    (((detailsSource as any)?.structuralDetails || []) as any[])
      .filter(d => d && d.label && d.value);

  // Installation cost actually used by the pricing worker (single source of
  // truth — the hardcoded display value drifted from the calculation before).
  const installationNet = (detailsSource as any)?.installationCostEUR || 1200;


  /* ══════════════════════════════════════════════════════════════
   *  RENDER
   * ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">
      {/* ═══ CUSTOM ANIMATIONS ═══ */}
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100% { background-position: 200% center; } 50% { background-position: 0% center; } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(30,111,217,0.3); } 50% { box-shadow: 0 0 0 8px rgba(30,111,217,0); } }
        @keyframes border-glow { 0%,100% { box-shadow: 0 0 20px rgba(30,111,217,0.15), 0 0 40px rgba(30,111,217,0.05); } 50% { box-shadow: 0 0 25px rgba(30,111,217,0.25), 0 0 50px rgba(30,111,217,0.1); } }
        @keyframes float-dots { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-8px, 4px); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .shimmer-bg { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%); background-size: 200% 100%; animation: shimmer 4s ease infinite; }
        .glow-rec { animation: pulse-glow 2.5s ease infinite; }
        .card-rec-glow { animation: border-glow 3s ease-in-out infinite; }
        .float-dots { animation: float-dots 20s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
       *  1. HERO — Personalized Gradient
       * ═══════════════════════════════════════════════════════ */}
      <div id="offer-section-hero" className="relative rounded-2xl overflow-hidden bg-brand-gradient">
        {/* shimmer */}
        <div className="absolute inset-0 shimmer-bg opacity-[0.06] pointer-events-none" />
        {/* Animated dot pattern */}
        <div className="absolute inset-0 float-dots pointer-events-none opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#1E6FD9]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#6DB1FF]/[0.08] rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 px-5 py-5 sm:px-6 sm:py-6 md:px-10 md:py-7 text-center text-white">
          {/* Offer number badge */}
          {offerNumber && (
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/[0.07] border border-white/[0.08] mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-[#6DB1FF]">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Angebot {offerNumber}</span>
            </div>
          )}
          <h2 className="text-2xl md:text-[32px] font-black tracking-tight leading-[1.1]">
            {customerName
              ? <>Vielen Dank für Ihre Anfrage,<br className="hidden sm:block" /> <span className="bg-gradient-to-r from-[#6DB1FF] to-[#93C5FD] bg-clip-text text-transparent">{customerName}</span></>
              : 'Vielen Dank für Ihre Anfrage'}
          </h2>
          <p className="text-[12px] md:text-[13px] text-white/50 mt-2 max-w-lg mx-auto leading-relaxed">
            {isSingle
              ? 'Wir freuen uns über Ihr Interesse! Beim Aufmaß vor Ort zeigen wir Ihnen gerne unsere Aluminium-Konstruktionen im Detail.'
              : `${N} maßgeschneiderte Pakete für Sie — beim Aufmaß vor Ort zeigen wir Ihnen gerne unsere Aluminium-Konstruktionen im Detail.`}
          </p>

          {/* ── Unified info bar: dims/color + netto/brutto ── */}
          <div className="mt-4 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-0 bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl sm:rounded-full overflow-hidden">
            {/* Dims + Color */}
            {(dimensions || color) && (
              <div className="flex items-center gap-3 px-5 py-2 sm:py-2">
                {dimensions && (
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-white/90">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-[#6DB1FF]">
                      <path d="M21 3H3v18" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 3l-8 8M21 3v4M21 3h-4" strokeLinecap="round" />
                    </svg>
                    {dimensions}
                  </span>
                )}
                {dimensions && color && <span className="w-px h-4 bg-white/15" />}
                {color && (
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-white/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/30 ring-1 ring-white/20" />
                    {color}
                  </span>
                )}
              </div>
            )}

            {/* Divider */}
            {(dimensions || color) && (
              <span className="hidden sm:block w-px h-6 bg-white/10" />
            )}

            {/* Netto / Brutto toggle */}
            <div className="flex items-center gap-2 px-4 py-2 sm:py-1.5">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider hidden sm:inline">Preise</span>
              <div className="inline-flex items-center bg-white/[0.08] rounded-full p-0.5">
                {['Netto', 'Brutto'].map((label, i) => (
                  <button
                    key={label}
                    onClick={() => handlePriceToggle(i === 1)}
                    className={`px-3.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70
                      ${(i === 0 ? !showGross : showGross)
                        ? 'bg-white text-slate-900 shadow-md' : 'text-white/50 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* price-update microcopy */}
          <div className="h-4 mt-1">
            {priceLoading && (
              <p className="text-[11px] text-white/60 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Aktualisiere Preise …
              </p>
            )}
          </div>

          {/* Trust strip */}
          <div className="mt-2 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {[
              { Icon: Shield, label: '10 Jahre Garantie', color: 'text-[#10B981]' },
              { Icon: Wrench, label: '500+ Montagen', color: 'text-[#6DB1FF]' },
              { Icon: Globe, label: 'Made in EU', color: 'text-[#93C5FD]' },
              { Icon: Star, label: '4,9 Google', color: 'text-[#F59E0B]', fill: true },
            ].map(({ Icon, label, color, fill }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
                <Icon className={`w-3.5 h-3.5 ${color}`} {...(fill ? { fill: 'currentColor' } : {})} /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
       *  2. TIER CARDS — Apple-style
       * ═══════════════════════════════════════════════════════ */}
      <div id="offer-section-pakete" ref={cardsRef} className={cardGridClass}>
        {sorted.map((v, idx) => {
          const s = TIER_STYLES[v.tier] || TIER_STYLES.economy;
          const isRec = v.tier === 'recommended';
          const isSelected = selectedTier?.id === v.id;
          const price = showGross ? v.totalGrossEUR : v.totalNetEUR;
          const positions = (v as any).customerPositions || [];
          const features = v.features?.filter(f => f.included).map(f => ({ ...f, name: clean(f.name) })).filter(f => f.name.length > 0) || [];
          const isExpanded = expandedCards.has(v.id) || positions.length <= 8;
          // When collapsed, still surface any "+ Neu" items beyond the first 5 so the
          // upgrade vs. the cheaper package is visible at a glance (task: 10-sec diff).
          const collapsedPositions = positions.length > 5
            ? [
                ...positions.slice(0, 5),
                ...positions.slice(5).filter((p: any) => !isSingle && isNewItem(v.id, p.name)),
              ]
            : positions;
          const visiblePositions = isExpanded ? positions : collapsedPositions;
          const displayItems = visiblePositions.length > 0 ? visiblePositions : features.slice(0, 5);

          // Highlight the recommended card only when comparing several packages.
          const highlightRec = isRec && !isSingle;

          return (
            <div
              key={v.id}
              className={`
                relative bg-white overflow-hidden flex flex-col transition-all duration-300 fade-up rounded-2xl
                ${isSelected ? 'ring-2 ring-[#10B981] ring-offset-2' : s.ringCls}
                ${highlightRec ? 'lg:z-10 shadow-2xl card-rec-glow border-2 border-[#1E6FD9]/40' : 'shadow-card hover:shadow-card-hover hover:-translate-y-0.5 border border-[#E5E7EB]'}
              `}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* ── Top accent edge — gives every tier an instant, distinct identity ── */}
              <div className={`h-1.5 w-full ${s.topBar}`} />

              {/* Ribbon */}
              {highlightRec && (
                <div className="bg-[#1E6FD9] text-white text-center py-2 text-[11px] font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-1.5">
                  <SvgIcon name="star" className="w-3.5 h-3.5" /> Beliebteste Wahl
                </div>
              )}

              {/* Gallery */}
              <CardGallery modelName={v.modelName || productName || ''} tier={v.tier} />

              {/* ── Header: Name + Price ──
               *  Tier-tinted header background reinforces identity; the price is the
               *  single strongest element on the card — large, high-contrast, tabular. */}
              <div className={`relative bg-gradient-to-b ${s.headerBg} px-5 md:px-7 pt-5 pb-4 border-b border-slate-100/80`}>
                {/* Price diff chip — shows upgrade cost vs cheaper package */}
                {!isSingle && idx > 0 && (() => {
                  const prevPrice = showGross ? sorted[idx - 1].totalGrossEUR : sorted[idx - 1].totalNetEUR;
                  const diff = price - prevPrice;
                  if (diff <= 0) return null;
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-700 mb-3">
                      +{fmt(diff)} € vs. {(TIER_STYLES[sorted[idx-1].tier] || TIER_STYLES.economy).label}
                    </span>
                  );
                })()}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: s.accent }}>
                      <SvgIcon name={s.iconName} className="w-3.5 h-3.5" /> {s.label}
                    </span>
                    <h3 className={`font-extrabold text-slate-900 tracking-tight leading-tight mt-1.5 ${
                      sorted.length >= 4 ? 'text-lg' : 'text-xl'
                    }`}>
                      {clean(v.modelName || v.label)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug min-h-[1rem]">{clean(v.tagline)}</p>
                  </div>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-baseline gap-1">
                    <span className={`font-black text-slate-900 tracking-tighter tabular-nums leading-none ${
                      sorted.length >= 4 ? 'text-[28px]' : 'text-[34px]'
                    }`}>
                      {fmt(price)}
                    </span>
                    <span className={`font-extrabold text-slate-500 ${sorted.length >= 4 ? 'text-lg' : 'text-xl'}`}>€</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-medium mt-1.5">
                    {showGross ? 'inkl. MwSt. & Montage' : 'netto · zzgl. MwSt.'}
                  </p>
                </div>
              </div>

              {/* ── Specs mini-bar (only when there is something to show) ── */}
              {(v.dimensions || v.color) && (
                <div className="flex items-center gap-4 px-5 md:px-7 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[11px] text-slate-500 font-medium">
                  {v.dimensions && (
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-slate-400">
                        <path d="M21 3H3v18" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {v.dimensions}
                    </span>
                  )}
                  {v.color && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700 ring-1 ring-slate-300" />
                      {v.color}
                    </span>
                  )}
                </div>
              )}

              {/* ── POSITIONS / FEATURES ── */}
              <div className="px-5 md:px-7 py-5 flex-1 flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">
                  {positions.length > 0
                    ? `${positions.length} Positionen enthalten`
                    : `${features.length} Leistungen enthalten`}
                </p>

                <ul className="space-y-3">
                  {displayItems.map((item: any, i: number) => {
                    const catIconName = CATEGORY_ICON_MAP[item.category] || null;
                    // Does this item represent something NEW vs the cheaper package?
                    const isNew = !isSingle && isNewItem(v.id, item.name);
                    return (
                      <li
                        key={i}
                        className={`flex items-start gap-2.5 ${isNew ? '-mx-2 px-2 py-1.5 rounded-lg bg-emerald-50/70 ring-1 ring-emerald-100' : ''}`}
                      >
                        {isNew ? (
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                          </span>
                        ) : catIconName ? (
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${s.chipTint}`}>
                            <SvgIcon name={catIconName} className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <CheckIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.checkCls}`} />
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 leading-snug">
                            {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ''}
                            {clean(item.name)}
                            {isNew && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[9px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                                <Plus className="w-2.5 h-2.5" strokeWidth={3} /> Neu
                              </span>
                            )}
                          </p>
                          {(item.description || item.dimensions || item.note) && (
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              {item.dimensions && <span className="inline-flex items-center gap-0.5"><SvgIcon name="ruler" className="w-3 h-3 inline" /> {item.dimensions}</span>}
                              {item.dimensions && (item.description || item.note) && <span> · </span>}
                              {item.description || item.note}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* expand/collapse */}
                {positions.length > 8 && !isExpanded && (
                  <button
                    onClick={() => toggleExpand(v.id)}
                    className="mt-3 text-xs font-bold text-center py-2 rounded-lg
                      hover:bg-slate-50 transition-colors cursor-pointer border-none bg-transparent"
                    style={{ color: s.accent }}
                  >
                    + {positions.length - visiblePositions.length} weitere Positionen anzeigen ▾
                  </button>
                )}
                {isExpanded && positions.length > 8 && (
                  <button
                    onClick={() => toggleExpand(v.id)}
                    className="mt-3 text-xs font-semibold text-slate-400 text-center py-2
                      hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                  >
                    Weniger anzeigen ▴
                  </button>
                )}

                {/* Spacer — lets the list "breathe" downward so the inclusive note
                 *  and CTA stay anchored to the bottom on sparse cards (e.g. Basis). */}
                <div className="flex-1" />

                {/* ── Always-included basics — fills sparse cards & reassures, no big gap.
                 *  (Full "Technische Daten" live in their own section further down.) */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 font-medium leading-snug">
                  <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: s.accent }} />
                  <span>Inklusive Statik, Entwässerung &amp; fachgerechter Montage</span>
                </div>

              </div>

              {/* ── CTA ── */}
              <div className="px-5 md:px-7 pb-6 pt-1">
                <button
                  onClick={() => onSelectTier(v)}
                  aria-pressed={isSelected}
                  className={`w-full min-h-[48px] py-3.5 rounded-full font-semibold text-[14px] text-white
                    transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-none
                    flex items-center justify-center gap-2
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E6FD9]
                    ${isSelected ? 'bg-[#10B981] shadow-lg shadow-emerald-200' : s.btnCls}
                    ${highlightRec && !isSelected ? 'glow-rec' : ''}`}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                  {isSelected
                    ? 'Paket gewählt — Schritt 1/3'
                    : isSingle
                      ? 'Dieses Angebot wählen'
                      : highlightRec
                        ? 'Dieses Paket wählen'
                        : 'Paket auswählen'}
                </button>
                {/* Reassurance — non-binding note */}
                {isSelected && (
                  <p className="mt-2.5 text-[11px] text-slate-400 text-center leading-relaxed flex items-start justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
                    </svg>
                    <span>Unverbindlich — Ihre Auswahl dient lediglich dazu, dass wir uns optimal auf den Aufmaßtermin bei Ihnen vorbereiten können.</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
       *  2b. TRUST STRIP — directly under the package decision (near CTA)
       * ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-card">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
          <Shield className="w-4 h-4 text-emerald-500" /> 10 Jahre Garantie
        </span>
        <span className="hidden sm:inline w-px h-4 bg-slate-200" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
          <Wrench className="w-4 h-4 text-blue-500" /> 500+ Montagen
        </span>
        <span className="hidden sm:inline w-px h-4 bg-slate-200" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
          <Globe className="w-4 h-4 text-violet-500" /> Made in EU
        </span>
        <span className="hidden sm:inline w-px h-4 bg-slate-200" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
          <Star className="w-4 h-4 text-amber-400" fill="currentColor" /> 4,9 Google
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════
       *  3. TECHNICAL SPECIFICATIONS
       * ═══════════════════════════════════════════════════════ */}
      <div id="offer-section-technik" className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden">
        <div className="px-6 py-4 md:px-8 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-[#1E6FD9] shrink-0">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
            </svg>
            <h3 className="text-[15px] font-bold text-slate-800">Technische Daten</h3>
          </div>
          {/* Which package the construction details refer to */}
          {structuralDetails.length > 0 && detailsSource && !isSingle && (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
              style={{ background: (TIER_STYLES[detailsSource.tier] || TIER_STYLES.economy).accent }}>
              <SvgIcon name={(TIER_STYLES[detailsSource.tier] || TIER_STYLES.economy).iconName} className="w-3 h-3" />
              {(TIER_STYLES[detailsSource.tier] || TIER_STYLES.economy).label}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-100">
          {(structuralDetails.length > 0
            ? [
                // Live construction specs from the pricing worker (per package)
                ...structuralDetails.map(d => ({ label: d.label, value: d.value, svgName: d.icon || 'pkg' })),
                // Static facts the worker doesn't deliver
                { label: 'Farbe', value: color || 'RAL 7016', svgName: 'paint' },
                { label: 'Material', value: 'Aluminium (6063 T5)', svgName: 'structure' },
                { label: 'Garantie', value: '10 Jahre', svgName: 'shield' },
              ]
            : [
                { label: 'Breite', value: (() => {
                  const raw = dimensions?.split('×')[0]?.trim() || '—';
                  return raw !== '—' && !raw.includes('mm') ? `${raw} mm` : raw;
                })(), svgName: 'ruler' },
                { label: 'Tiefe (Ausladung)', value: (() => {
                  const raw = dimensions?.split('×')[1]?.trim() || '—';
                  return raw !== '—' && !raw.includes('mm') ? `${raw} mm` : raw;
                })(), svgName: 'measure' },
                { label: 'Farbe', value: color || 'RAL 7016', svgName: 'paint' },
                { label: 'Material', value: 'Aluminium (6063 T5)', svgName: 'structure' },
                { label: 'Statik', value: 'DIN EN 1991', svgName: 'clipboard' },
                { label: 'Schneelast', value: 'bis 150 kg/m²', svgName: 'snowflake' },
                { label: 'Entwässerung', value: 'Integriert', svgName: 'droplet' },
                { label: 'Garantie', value: '10 Jahre', svgName: 'shield' },
              ]
          ).map((spec, i) => (
            <div key={i} className="bg-white px-5 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                <SvgIcon name={(spec as any).svgName} className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{spec.label}</p>
              </div>
              <p className="text-sm font-bold text-slate-800">{spec.value}</p>
            </div>
          ))}
        </div>
        {/* Aluminium info */}
        <div className="px-6 py-4 md:px-8 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Premium Aluminium-Profile:</strong> Unsere Konstruktionen bestehen aus
            hochwertigem Aluminium 6063 T5 — korrosionsbeständig, wartungsfrei und pulverbeschichtet
            in Ihrer Wunschfarbe. Bei einem Vor-Ort-Termin zeigen wir Ihnen gerne Profilmuster.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">
            <strong className="text-slate-700">Maßanfertigung ohne Breitenlimit:</strong> Jede Anlage wird
            millimetergenau nach Ihren Maßen gefertigt. Dank modularer Bauweise (gekoppelte Felder)
            gibt es <strong className="text-slate-700">keine Begrenzung der Breite</strong> — auch 12 m
            und mehr sind kein Problem.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
       *  4. FEATURE COMPARISON TABLE — Split: Model + Extras
       *  (only meaningful when there is more than one package)
       * ═══════════════════════════════════════════════════════ */}
      {N > 1 && allFeatures.length > 0 && (() => {
        // Separate roof model features from extras
        const isRoofModel = (name: string) => {
          const c = clean(name).toLowerCase();
          return (c.includes('style') || c.includes('glas') || c.includes('polycarbonat'))
            && !c.includes('schiebewand') && !c.includes('panorama') && !c.includes('markise')
            && !c.includes('led') && !c.includes('screen') && !c.includes('zip')
            && !c.includes('keil') && !c.includes('fenster');
        };
        const modelFeatures = allFeatures.filter(isRoofModel);
        const extraFeatures = allFeatures.filter(f => !isRoofModel(f));

        // Group extras by category keyword (stable keys → icon + German label)
        const GROUP_META: Record<string, { label: string; iconName: string }> = {
          glazing: { label: 'Verglasung', iconName: 'window' },
          shade: { label: 'Sonnenschutz', iconName: 'sun' },
          light: { label: 'Beleuchtung', iconName: 'lightbulb' },
          other: { label: 'Weitere Ausstattung', iconName: 'pkg' },
        };
        const categorize = (name: string): string => {
          const c = clean(name).toLowerCase();
          if (c.includes('panorama') || c.includes('schiebewand') || c.includes('schiebetür') || c.includes('keil') || c.includes('fenster')) return 'glazing';
          if (c.includes('markise') || c.includes('screen') || c.includes('zip') || c.includes('sonnenschutz')) return 'shade';
          if (c.includes('led') || c.includes('beleuchtung') || c.includes('licht') || c.includes('spot') || c.includes('strip')) return 'light';
          return 'other';
        };

        // Build ordered groups
        const groupOrder = ['glazing', 'shade', 'light', 'other'];
        const grouped: Record<string, string[]> = {};
        for (const f of extraFeatures) {
          const cat = categorize(f);
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(f);
        }

        return (
          <div id="offer-section-vergleich" className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden">
            <div className="px-6 py-5 md:px-8 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-400">
                  <path d="M3 10h18M3 14h18M3 6h18M3 18h18" strokeLinecap="round" />
                </svg>
                Paketvergleich
              </h3>
              <p className="text-sm text-slate-400 mt-0.5 ml-[30px]">Alle Pakete im direkten Vergleich — <span className="text-emerald-600 font-semibold">grün</span> = neu im jeweiligen Paket</p>
            </div>
            {/* Table view: tablet & desktop only. First column is sticky so the
             *  feature label stays visible during horizontal scroll. On phones we
             *  render diff-cards instead (see below) — never a squeezed table. */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="sticky left-0 z-20 bg-slate-50 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3 min-w-[180px]">
                      Ausstattung
                    </th>
                    {sorted.map(v => {
                      const st = TIER_STYLES[v.tier] || TIER_STYLES.economy;
                      const isRec = v.tier === 'recommended';
                      return (
                        <th key={v.id} className={`text-center px-3 py-3 min-w-[84px] ${isRec ? 'bg-[#EAF2FE]' : ''}`}>
                          <span className="text-[11px] font-bold flex items-center gap-1 justify-center" style={{ color: st.accent }}>
                            <SvgIcon name={st.iconName} className="w-3.5 h-3.5" /> {st.label}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* ── Model row ── */}
                  <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                    <td className="sticky left-0 z-10 bg-slate-50 text-[12px] text-slate-500 font-bold px-5 py-3 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><SvgIcon name="home" className="w-3.5 h-3.5" /> Dachkonstruktion</span>
                    </td>
                    {sorted.map(v => {
                      const st = TIER_STYLES[v.tier] || TIER_STYLES.economy;
                      return (
                        <td key={v.id} className="text-center px-2 py-3">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white"
                            style={{ background: st.accent }}
                          >
                            {clean(v.modelName || v.label)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ── Model sub-features (roof type) ── */}
                  {modelFeatures.map((name, i) => {
                    const firstIdx = firstIncludingIdx(name);
                    return (
                      <tr key={`m-${name}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                        <td className={`sticky left-0 z-10 text-[12.5px] text-slate-500 font-medium px-5 py-2 pl-8 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          {clean(name)}
                        </td>
                        {sorted.map((v, vIdx) => {
                          const feat = v.features?.find(f => f.name === name);
                          const st = TIER_STYLES[v.tier] || TIER_STYLES.economy;
                          // "New" = first tier (beyond the cheapest) that introduces it.
                          const isNewHere = feat?.included && vIdx === firstIdx && firstIdx > 0;
                          return (
                            <td key={v.id} className={`text-center px-3 py-2 ${isNewHere ? 'bg-emerald-50' : v.tier === 'recommended' ? 'bg-[#EAF2FE]/70' : ''}`}>
                              {feat?.included ? (
                                isNewHere ? (
                                  <span className="inline-flex flex-col items-center gap-0.5">
                                    <Check className="w-4 h-4 text-emerald-600 mx-auto" strokeWidth={3} />
                                    <span className="text-[8px] font-black uppercase text-emerald-700 leading-none">Neu</span>
                                  </span>
                                ) : (
                                  <Check className={`w-4 h-4 mx-auto ${st.checkCls}`} strokeWidth={2.5} />
                                )
                              ) : (
                                <Minus className="w-4 h-4 mx-auto text-slate-300" strokeWidth={2} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* ── Extra feature groups ── */}
                  {groupOrder.map(groupName => {
                    const items = grouped[groupName];
                    if (!items || items.length === 0) return null;
                    return (
                      <React.Fragment key={groupName}>
                        <tr className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200">
                          <td className="sticky left-0 z-10 bg-slate-50 text-[12px] text-slate-500 font-bold px-5 py-2.5 uppercase tracking-wide">
                            <span className="flex items-center gap-1.5">
                              <SvgIcon name={GROUP_META[groupName]?.iconName || 'pkg'} className="w-3.5 h-3.5" />
                              {GROUP_META[groupName]?.label || groupName}
                            </span>
                          </td>
                          {sorted.map(v => (
                            <td key={v.id} className={`${v.tier === 'recommended' ? 'bg-[#EAF2FE]/50' : ''}`} />
                          ))}
                        </tr>
                        {items.map((name, i) => {
                          const firstIdx = firstIncludingIdx(name);
                          return (
                            <tr key={name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                              <td className={`sticky left-0 z-10 text-[12.5px] text-slate-600 font-medium px-5 py-2.5 pl-8 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                {clean(name)}
                              </td>
                              {sorted.map((v, vIdx) => {
                                const feat = v.features?.find(f => f.name === name);
                                const st = TIER_STYLES[v.tier] || TIER_STYLES.economy;
                                const isNewHere = feat?.included && vIdx === firstIdx && firstIdx > 0;
                                return (
                                  <td key={v.id} className={`text-center px-3 py-2.5 ${isNewHere ? 'bg-emerald-50' : v.tier === 'recommended' ? 'bg-[#EAF2FE]/70' : ''}`}>
                                    {feat?.included ? (
                                      isNewHere ? (
                                        <span className="inline-flex flex-col items-center gap-0.5">
                                          <Check className="w-4 h-4 text-emerald-600 mx-auto" strokeWidth={3} />
                                          <span className="text-[8px] font-black uppercase text-emerald-700 leading-none">Neu</span>
                                        </span>
                                      ) : (
                                        <Check className={`w-4 h-4 mx-auto ${st.checkCls}`} strokeWidth={2.5} />
                                      )
                                    ) : (
                                      <Minus className="w-4 h-4 mx-auto text-slate-300" strokeWidth={2} />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE: diff-cards (no squeezed table) ── */}
            <div className="sm:hidden divide-y divide-slate-100">
              {sorted.map((v, vIdx) => {
                const st = TIER_STYLES[v.tier] || TIER_STYLES.economy;
                const price = showGross ? v.totalGrossEUR : v.totalNetEUR;
                // Cleaned, de-duplicated names this package adds vs the cheaper one.
                const addedNames = Array.from(
                  new Set(
                    Array.from(newFeatureNamesByVariantId[v.id])
                      .map(n => clean(n))
                      .filter(Boolean)
                  )
                );
                return (
                  <div key={v.id} className={`px-5 py-4 ${v.tier === 'recommended' ? 'bg-[#EAF2FE]/70' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: st.accent }}>
                        <SvgIcon name={st.iconName} className="w-4 h-4" /> {st.label}
                        {v.tier === 'recommended' && (
                          <span className="text-[9px] font-black uppercase tracking-wide text-white bg-[#1E6FD9] rounded-full px-1.5 py-0.5">Beliebt</span>
                        )}
                      </span>
                      <span className="text-[15px] font-black text-slate-900 tabular-nums">{fmt(price)} €</span>
                    </div>
                    {vIdx === 0 ? (
                      <p className="mt-2 text-[12px] text-slate-500 flex items-start gap-1.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-px" strokeWidth={2.5} />
                        Alle Grundleistungen enthalten — Ihre Basis-Ausstattung.
                      </p>
                    ) : addedNames.length > 0 ? (
                      <div className="mt-2.5">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5">
                          Zusätzlich zum günstigeren Paket:
                        </p>
                        <ul className="space-y-1.5">
                          {addedNames.map((name, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-700">
                              <span className="shrink-0 w-4 h-4 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 mt-px">
                                <Plus className="w-2.5 h-2.5" strokeWidth={3} />
                              </span>
                              <span className="font-medium leading-snug">{name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-2 text-[12px] text-slate-400">Gleiche Ausstattung wie das günstigere Paket.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}



      {/* ═══════════════════════════════════════════════════════
       *  6. AUFMASS CTA — Dark Section
       * ═══════════════════════════════════════════════════════ */}
      {onRequestMeasurement && (
        <div className="relative bg-brand-gradient rounded-2xl p-7 md:p-10 overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/[0.02] rounded-full" />

          <div className="relative z-10">
            <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-2 flex items-center gap-2.5">
              <SvgIcon name="measure" className="w-6 h-6 text-[#6DB1FF]" /> Kostenloser Vor-Ort-Termin
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-lg">
              Unser Fachberater besucht Sie persönlich — mit Profilmustern, Farbkarten und Erfahrung aus über 500 Montagen.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
              {[
                { svgName: 'ruler', text: 'Exakte Aufmaße durch Fachberater' },
                { svgName: 'structure', text: 'Aluminium-Profilmuster vor Ort' },
                { svgName: 'chat', text: 'Persönliche Beratung zu Ihrem Projekt' },
                { svgName: 'checkBadge', text: 'Unverbindlich — keine versteckten Kosten' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SvgIcon name={item.svgName} className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <span className="text-[13px] text-slate-300 font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onRequestMeasurement}
              className="w-full sm:w-auto px-10 py-4 min-h-[48px] rounded-full font-semibold text-[15px] text-white
                bg-[#1E6FD9] hover:bg-[#195FC0]
                shadow-cta transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                border-none cursor-pointer flex items-center justify-center gap-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6DB1FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              Aufmaßtermin vereinbaren
            </button>
            <p className="text-[11px] text-slate-500 mt-3">
              Innerhalb 48h · In Ihrer Region · 100% kostenlos
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
       *  7. CROSS-SELL EXTRAS
       * ═══════════════════════════════════════════════════════ */}
      {crossSell && crossSell.length > 0 && (() => {
        const visible = [...crossSell]
          .filter(cs => cs.category !== 'roof_upgrade')
          .sort((a, b) => (a.source === 'live_configurator' ? -1 : 1) - (b.source === 'live_configurator' ? -1 : 1))
          .slice(0, 6);
        if (visible.length === 0) return null;

        return (
          <div id="offer-section-extras" className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden">
            <div className="px-6 py-5 md:px-8 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <SvgIcon name="bolt" className="w-5 h-5 text-amber-500" />
                Optionale Extras
              </h3>
              <p className="text-sm text-slate-400 mt-0.5 ml-[30px]">Erweitern Sie Ihr Paket nach Ihren Wünschen</p>
            </div>
            <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visible.map((cs, i) => {
                const csImage = CROSS_SELL_IMAGES[cs.category]
                  || (cs.name.toLowerCase().includes('markise') ? CROSS_SELL_IMAGES.markise : undefined)
                  || (cs.name.toLowerCase().includes('panorama') ? CROSS_SELL_IMAGES.panorama : undefined)
                  || (cs.name.toLowerCase().includes('zip') || cs.name.toLowerCase().includes('senkrechtmarkise') ? CROSS_SELL_IMAGES.senkrechtmarkise : undefined)
                  || (cs.name.toLowerCase().includes('led') ? CROSS_SELL_IMAGES.led : undefined);
                // Brak pasującego zdjęcia (np. WPC-Boden, Sonderfarbe) → neutralny kafel
                // z ikoną zamiast mylącej fotografii zadaszenia.
                const csIconName = cs.category === 'farbe' ? 'paint'
                  : cs.category === 'boden' ? 'ruler'
                  : 'pkg';

                return (
                  <div key={i} className="rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group">
                    <div className="relative h-24 bg-slate-100 overflow-hidden">
                      {csImage ? (
                        <>
                          <img src={csImage} alt={cs.nameDE} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <SvgIcon name={csIconName} className="w-9 h-9 text-slate-400" />
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-extrabold text-slate-900">
                        ab {fmt(cs.customerBrutto)} €
                      </span>
                    </div>
                    <div className="p-3.5">
                      <h4 className="text-[13px] font-bold text-slate-800 mb-1">{cs.nameDE}</h4>
                      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed line-clamp-2">{cs.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                          ${cs.source === 'live_configurator' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cs.source === 'live_configurator' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {cs.source === 'live_configurator' ? 'Exakter Preis' : 'Richtpreis'}
                        </span>
                        {(() => {
                          const isRequested = requestedExtras.has(cs.nameDE);
                          return (
                            <button
                              onClick={() => {
                                setRequestedExtras(prev => new Set(prev).add(cs.nameDE));
                                onRequestExtra?.(cs.nameDE);
                              }}
                              className={`text-[11px] font-bold rounded-lg px-3 py-1.5 cursor-pointer transition-colors border inline-flex items-center gap-1
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                                ${isRequested
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-[#1E6FD9] bg-[#EAF2FE] hover:bg-[#DCEAFD] border-[#BFD9FB]'}`}
                            >
                              {isRequested ? (<><Check className="w-3 h-3" strokeWidth={3} /> Angefragt</>) : 'Anfragen →'}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
       *  8. INSTALLATION INFO
       * ═══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden">
        <div className="px-6 py-5 md:px-8 flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 bg-[#EAF2FE] rounded-xl flex items-center justify-center text-[#1E6FD9]">
            <SvgIcon name="wrench" className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">Montage inklusive</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Im Preis ist <strong className="text-slate-700">1 Montage-Tag ({fmt(installationNet)} € netto) inkl. Transport</strong> bereits enthalten.
              Weitere Montagetage werden günstiger berechnet. Der tatsächliche Montageumfang wird
              bei einem Vor-Ort-Termin durch unseren Fachberater individuell bewertet.
            </p>
          </div>
        </div>
        <div className="px-6 pb-5 md:px-8 flex flex-wrap gap-4 ml-[60px]">
          {[
            { icon: 'checkBadge', text: '1 Tag Montage inkl.' },
            { icon: 'pkg', text: 'Transport inklusive' },
            { icon: 'measure', text: 'Bewertung vor Ort' },
          ].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <SvgIcon name={item.icon} className="w-3.5 h-3.5 text-[#6DB1FF]" />
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
       *  9. DISCLAIMERS
       * ═══════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-start gap-4 bg-amber-50/80 border border-amber-200 rounded-2xl px-6 py-5">
          <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600"><SvgIcon name="clipboard" className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-bold text-amber-900 mb-1">Vorläufige Kalkulation</p>
            <p className="text-sm text-amber-700/70 leading-relaxed">
              Diese Preise sind eine <strong>erste Preisindikation</strong> auf Basis Ihrer Angaben.
              Nach Klärung aller Details erhalten Sie eine <strong>verbindliche Angebotsbestätigung</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
       *  9. SELECTED TIER SUMMARY (Desktop)
       * ═══════════════════════════════════════════════════════ */}
      {selectedTier && (
        <div className="hidden md:block bg-brand-gradient rounded-2xl p-8 text-white" id="price-section">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <SvgIcon name={TIER_STYLES[selectedTier.tier]?.iconName || 'pkg'} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Ihr ausgewähltes Paket</p>
              <p className="text-xl font-extrabold">{clean(selectedTier.label)}</p>
            </div>
          </div>

          {/* Positions */}
          <div className="space-y-0 mb-5">
            {((selectedTier as any).customerPositions || []).map((pos: any, i: number) => (
              <div key={i} className="flex items-start justify-between py-2.5 border-b border-white/[0.06]">
                <div className="flex items-start gap-2 min-w-0">
                  <SvgIcon name={CATEGORY_ICON_MAP[pos.category] || 'pkg'} className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] text-slate-300">
                      {pos.quantity > 1 ? `${pos.quantity}× ` : ''}{clean(pos.name)}
                      {pos.dimensions && <span className="text-[10px] text-slate-500 ml-1">({pos.dimensions})</span>}
                    </p>
                    {pos.description && (
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{pos.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="pt-4 border-t border-white/10 space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-400">Summe netto</span>
              <span className="font-semibold tabular-nums">{fmt2(selectedTier.totalNetEUR)} €</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-400">MwSt. 19%</span>
              <span className="font-semibold tabular-nums">{fmt2(selectedTier.totalGrossEUR - selectedTier.totalNetEUR)} €</span>
            </div>
            <div className="h-px bg-white/15 my-2" />
            <div className="flex justify-between items-end">
              <span className="text-lg font-bold">Gesamtpreis</span>
              <span className="text-3xl font-black tabular-nums tracking-tight">{fmt2(selectedTier.totalGrossEUR)} €</span>
            </div>
            <p className="text-[11px] text-slate-500">inkl. MwSt., Lieferung & Montage</p>
          </div>

          {/* CTA */}
          <button
            onClick={onAcceptOffer}
            className="w-full mt-6 py-4 min-h-[48px] rounded-full font-semibold text-[15px] text-white
              bg-[#1E6FD9] hover:bg-[#195FC0]
              shadow-cta transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
              border-none cursor-pointer flex items-center justify-center gap-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6DB1FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]"
          >
            <Check className="w-5 h-5" />
            Angebot annehmen & Aufmaß vereinbaren
          </button>
          <p className="text-center text-[11px] text-slate-500 mt-2.5">
            Unverbindliche Vormerkung · Wir melden uns innerhalb 24h
          </p>
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              className="w-full mt-3 py-2.5 rounded-full font-semibold text-[12.5px] text-slate-300
                bg-white/[0.06] hover:bg-white/[0.12] border border-white/10
                transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Dieses Paket als PDF herunterladen
            </button>
          )}
          {/* Trust strip near the main CTA */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-white/10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> 10 Jahre Garantie
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Wrench className="w-3.5 h-3.5 text-blue-400" /> 500+ Montagen
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Globe className="w-3.5 h-3.5 text-violet-400" /> Made in EU
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" /> 4,9 Google
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
       *  10. MOBILE STICKY BOTTOM BAR — shown for ANY number of packages.
       *  States: (a) a package is selected (or single) → name + brutto + Weiter
       *          (b) nothing selected yet (N>1) → "ab … €" + Paket wählen
       * ═══════════════════════════════════════════════════════ */}
      {(() => {
        // For N=1 the single package acts as the context even before an explicit tap.
        const effective = selectedTier || single;
        return (
          <div className="fixed bottom-0 inset-x-0 z-50 md:hidden
            bg-[#0A1628]/[0.97] backdrop-blur-xl border-t border-white/10
            px-4 py-3 flex items-center justify-between gap-3
            shadow-[0_-4px_20px_rgba(10,22,40,0.3)]">
            {effective ? (
              <>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none flex items-center gap-1 truncate">
                    <SvgIcon name={TIER_STYLES[effective.tier]?.iconName || 'pkg'} className="w-3 h-3 shrink-0" />
                    <span className="truncate">{clean(effective.label)}</span>
                  </p>
                  <p className="text-xl font-black text-white tabular-nums tracking-tight mt-0.5">
                    {fmt(effective.totalGrossEUR)} € <span className="text-[10px] font-medium text-slate-400">inkl. MwSt.</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Make sure a tier is committed (covers N=1 / not-yet-tapped), then advance.
                    if (!selectedTier && effective) onSelectTier(effective);
                    onAcceptOffer?.();
                  }}
                  className="px-6 py-3 min-h-[48px] rounded-full font-semibold text-[14px] text-white whitespace-nowrap
                    bg-[#1E6FD9] hover:bg-[#195FC0]
                    shadow-cta border-none cursor-pointer
                    active:scale-[0.97] transition-all duration-300
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6DB1FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]"
                >
                  Weiter →
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    {N} Pakete · Ihre Wahl
                  </p>
                  <p className="text-xl font-black text-white tabular-nums tracking-tight mt-0.5">
                    ab {fmt(cheapest.totalGrossEUR)} € <span className="text-[10px] font-medium text-slate-400">inkl. MwSt.</span>
                  </p>
                </div>
                <button
                  onClick={scrollToCards}
                  className="px-6 py-3 min-h-[48px] rounded-full font-semibold text-[14px] text-white whitespace-nowrap
                    bg-[#1E6FD9] hover:bg-[#195FC0]
                    shadow-cta border-none cursor-pointer
                    active:scale-[0.97] transition-all duration-300
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6DB1FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]"
                >
                  Paket wählen →
                </button>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default BotOfferView;
