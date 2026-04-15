import React from 'react';
import { ROOF_MODELS, type RoofModelId, type DachrechnerInputs, type DachrechnerResults } from '../../services/dachrechner.service';

// ============================================================================
// DACHRECHNER DIAGRAM — Professional aluminum profile visualizations
// Matching Excel reference: POST on LEFT, WALL on RIGHT
// Profiles with internal chambers, foundation dashes, proper gutter
// ============================================================================

export interface DimensionOptions {
    showHeights: boolean;
    showDepths: boolean;
    showRafters: boolean;
    showWindows: boolean;
    showWedges: boolean;
    showAngles: boolean;
    showPostDimensions: boolean;
}

interface DachrechnerDiagramProps {
    modelId: RoofModelId;
    inputs: DachrechnerInputs;
    results: DachrechnerResults | null;
    options?: DimensionOptions;
    view?: 'side' | 'front';
}

// ---- THEMES per model ID ----
const TH: Record<string, { pri: string; sec: string; acc: string; label: string }> = {
    orangeline: { pri: '#f97316', sec: '#fed7aa', acc: '#ea580c', label: 'Ecoline' },
    'orangeline+': { pri: '#f97316', sec: '#fed7aa', acc: '#ea580c', label: 'Ecoline+' },
    trendline: { pri: '#3b82f6', sec: '#bfdbfe', acc: '#2563eb', label: 'Trendstyle' },
    'trendline+': { pri: '#3b82f6', sec: '#bfdbfe', acc: '#2563eb', label: 'Trendstyle+' },
    trendline_freistand: { pri: '#3b82f6', sec: '#bfdbfe', acc: '#2563eb', label: 'Trendstyle Freistand' },
    topline: { pri: '#8b5cf6', sec: '#ddd6fe', acc: '#7c3aed', label: 'Topstyle' },
    topline_xl: { pri: '#7c3aed', sec: '#c4b5fd', acc: '#6d28d9', label: 'Topstyle XL' },
    designline: { pri: '#06b6d4', sec: '#a5f3fc', acc: '#0891b2', label: 'Designstyle' },
    ultraline_classic: { pri: '#10b981', sec: '#a7f3d0', acc: '#059669', label: 'Ultrastyle Classic' },
    ultraline_style: { pri: '#10b981', sec: '#a7f3d0', acc: '#059669', label: 'Ultrastyle Style' },
    ultraline_compact: { pri: '#059669', sec: '#a7f3d0', acc: '#047857', label: 'Ultrastyle Compact' },
    skyline: { pri: '#64748b', sec: '#e2e8f0', acc: '#475569', label: 'Skystyle' },
    skyline_freistand: { pri: '#64748b', sec: '#e2e8f0', acc: '#475569', label: 'Skystyle Freistand' },
    carport: { pri: '#78716c', sec: '#e7e5e4', acc: '#57534e', label: 'Carport' },
    carport_freistand: { pri: '#78716c', sec: '#e7e5e4', acc: '#57534e', label: 'Carport Freistand' },
};

// Dimension colors matching Excel: H=orange, D=cyan, S=green, α=purple, P=blue
const DC = { h: '#f97316', d: '#0ea5e9', p: '#2563eb', s: '#16a34a', a: '#7c3aed', w: '#0d9488', k: '#d97706', st: '#1e293b' };

interface Pt { x: number; y: number }
type PtFn = (x: number, y: number) => Pt;

// ============================================================================
// DIMENSION LINES — with colored label + numeric value
// ============================================================================
const DimV = ({ pt, bx, y1, y2, label, val, ox, color = DC.h }: {
    pt: PtFn; bx: number; y1: number; y2: number; label: string; val: number; ox: number; color?: string;
}) => {
    const p1 = pt(bx, y1), p2 = pt(bx, y2);
    const lx = p1.x + ox, my = (p1.y + p2.y) / 2;
    const left = ox < 0;
    const bw = 48, bh = 26, rx = left ? lx - bw - 4 : lx + 4;
    return (
        <g>
            <line x1={p1.x} y1={p1.y} x2={lx} y2={p1.y} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.35" />
            <line x1={p2.x} y1={p2.y} x2={lx} y2={p2.y} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.35" />
            <line x1={lx} y1={p1.y + 5} x2={lx} y2={p2.y - 5} stroke={color} strokeWidth="1.5" />
            <path d={`M${lx},${p1.y} l-3,6 6,0Z`} fill={color} />
            <path d={`M${lx},${p2.y} l-3,-6 6,0Z`} fill={color} />
            <rect x={rx} y={my - bh / 2} width={bw} height={bh} fill="white" stroke={color} strokeWidth="0.7" rx="4" />
            <text x={rx + bw / 2} y={my - 3} textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>{label}</text>
            <text x={rx + bw / 2} y={my + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill={color} fontFamily="monospace">{Math.round(val)}</text>
        </g>
    );
};

const DimH = ({ pt, by, x1, x2, label, val, oy, color = DC.d }: {
    pt: PtFn; by: number; x1: number; x2: number; label: string; val: number; oy: number; color?: string;
}) => {
    const p1 = pt(x1, by), p2 = pt(x2, by);
    const ly = p1.y + oy, mx = (p1.x + p2.x) / 2;
    const txt = `${label}: ${Math.round(val)}`;
    const bw = Math.max(txt.length * 6.5 + 10, 56);
    return (
        <g>
            <line x1={p1.x} y1={p1.y + 2} x2={p1.x} y2={ly} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.25" />
            <line x1={p2.x} y1={p2.y + 2} x2={p2.x} y2={ly} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.25" />
            <line x1={p1.x + 5} y1={ly} x2={p2.x - 5} y2={ly} stroke={color} strokeWidth="1.5" />
            <path d={`M${p1.x},${ly} l6,-3 0,6Z`} fill={color} />
            <path d={`M${p2.x},${ly} l-6,-3 0,6Z`} fill={color} />
            <rect x={mx - bw / 2} y={ly - 9} width={bw} height="18" fill="white" stroke={color} strokeWidth="0.6" rx="3" />
            <text x={mx} y={ly + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="monospace">{txt}</text>
        </g>
    );
};

// ============================================================================
// SVG DEFS
// ============================================================================
const Defs = () => (
    <defs>
        <filter id="ds" x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#00000008" />
        </filter>
        <pattern id="wallH" width="8" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="0.8" />
        </pattern>
        <pattern id="gndH" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="profG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
    </defs>
);

// ============================================================================
// STRUCTURAL ELEMENTS — aluminum profile style matching Excel
// ============================================================================

// WALL — hatched rectangle, right side
const Wall = ({ x, yBot, yTop, w = 24 }: { x: number; yBot: number; yTop: number; w?: number }) => (
    <g>
        <rect x={x} y={yTop} width={w} height={yBot - yTop} fill="url(#wallH)" opacity="0.5" />
        <line x1={x} y1={yTop} x2={x} y2={yBot} stroke={DC.st} strokeWidth="2.5" />
        <line x1={x + w} y1={yTop} x2={x + w} y2={yBot} stroke={DC.st} strokeWidth="0.8" opacity="0.5" />
        <line x1={x} y1={yTop} x2={x + w} y2={yTop} stroke={DC.st} strokeWidth="1" />
    </g>
);

// GROUND — thick line with hatch below
const Ground = ({ x1, x2, y }: { x1: number; x2: number; y: number }) => (
    <g>
        <rect x={x1} y={y} width={x2 - x1} height="14" fill="url(#gndH)" opacity="0.35" />
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={DC.st} strokeWidth="3" />
    </g>
);

// POST — aluminum square profile with center dashed line + cap + foundation below ground
const Post = ({ x, yBot, yTop, w }: { x: number; yBot: number; yTop: number; w: number }) => {
    const mx = x + w / 2, h = yBot - yTop;
    return (
        <g>
            {/* Main profile body */}
            <rect x={x} y={yTop} width={w} height={h} fill="url(#profG)" stroke={DC.st} strokeWidth="2" />
            {/* Internal chamber — dashed center axis */}
            <line x1={mx} y1={yTop + 8} x2={mx} y2={yBot - 8} stroke={DC.st} strokeWidth="1" strokeDasharray="6 4" opacity="0.45" />
            {/* Top cap plate */}
            <rect x={x - 2} y={yTop - 3} width={w + 4} height="4" fill="#94a3b8" stroke={DC.st} strokeWidth="1" rx="0.5" />
            {/* Foundation below ground — dashed rectangle */}
            <rect x={x - 3} y={yBot} width={w + 6} height="18" fill="none" stroke={DC.st} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.45" />
        </g>
    );
};

// GUTTER — U-channel profile at low end of sloped roof
const Gutter = ({ x, y }: { x: number; y: number }) => (
    <g>
        <path d={`M${x},${y - 2} l-14,0 l0,14 q0,4 4,4 l6,0 q4,0 4,-4Z`}
            fill="#d1d5db" stroke={DC.st} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Drain dot */}
        <circle cx={x - 7} cy={y + 14} r="2" fill="#64748b" opacity="0.3" />
    </g>
);

// WALL BRACKET — L-profile connecting roof to wall (Wandprofil)
const WallBracket = ({ x, y, h, color }: { x: number; y: number; h: number; color: string }) => (
    <g>
        <rect x={x} y={y} width="8" height={h} fill={color} stroke={DC.st} strokeWidth="1" rx="0.5" opacity="0.85" />
        <rect x={x} y={y} width="20" height="5" fill={color} stroke={DC.st} strokeWidth="0.8" rx="0.5" opacity="0.8" />
        {/* Mounting screws */}
        <circle cx={x + 4} cy={y + h * 0.33} r="2" fill="none" stroke={DC.st} strokeWidth="0.7" opacity="0.4" />
        <circle cx={x + 4} cy={y + h * 0.66} r="2" fill="none" stroke={DC.st} strokeWidth="0.7" opacity="0.4" />
    </g>
);

// SLOPED PROFILE — thick parallelogram with 3 internal chamber dashed lines
const SlopedProfile = ({ x1, y1, x2, y2, t }: {
    x1: number; y1: number; x2: number; y2: number; t: number;
}) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;
    const nx = -dy / len * t, ny = dx / len * t;
    return (
        <g>
            <polygon
                points={`${x1},${y1} ${x2},${y2} ${x2 + nx},${y2 + ny} ${x1 + nx},${y1 + ny}`}
                fill="#e2e8f0" stroke={DC.st} strokeWidth="2" strokeLinejoin="round"
            />
            {/* 3 internal chamber lines */}
            {[0.25, 0.5, 0.75].map(f => (
                <line key={f} x1={x1 + nx * f} y1={y1 + ny * f} x2={x2 + nx * f} y2={y2 + ny * f}
                    stroke={DC.st} strokeWidth={f === 0.5 ? "0.8" : "0.5"} strokeDasharray={f === 0.5 ? "6 4" : "4 4"} opacity={f === 0.5 ? "0.4" : "0.25"} />
            ))}
        </g>
    );
};

// FLAT PROFILE — horizontal thick bar with internal chamber lines
const FlatProfile = ({ x1, x2, y, t }: { x1: number; x2: number; y: number; t: number }) => (
    <g>
        <rect x={x1} y={y} width={x2 - x1} height={t} fill="#e2e8f0" stroke={DC.st} strokeWidth="2" />
        {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={x1 + 5} y1={y + t * f} x2={x2 - 5} y2={y + t * f}
                stroke={DC.st} strokeWidth={f === 0.5 ? "0.8" : "0.5"} strokeDasharray={f === 0.5 ? "6 4" : "4 4"} opacity={f === 0.5 ? "0.4" : "0.25"} />
        ))}
    </g>
);

// GLASS PANEL — thin blue fill between structural points
const GlassPanel = ({ x1, y1, x2, y2, thick = 3 }: { x1: number; y1: number; x2: number; y2: number; thick?: number }) => {
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;
    const nx = -dy / len * thick, ny = dx / len * thick;
    return (
        <polygon points={`${x1 - nx},${y1 - ny} ${x2 - nx},${y2 - ny} ${x2 + nx},${y2 + ny} ${x1 + nx},${y1 + ny}`}
            fill="#bae6fd" fillOpacity="0.3" stroke="#7dd3fc" strokeWidth="1" />
    );
};

// ============================================================================
// PROFILE DETAILS TABLE
// ============================================================================
const PROF: Record<string, { ph: number; led: boolean; desc: string }> = {
    orangeline: { ph: 30, led: false, desc: '8° stały kąt nachylenia' },
    'orangeline+': { ph: 35, led: false, desc: '8° stały kąt, profil rozszerzony' },
    trendline: { ph: 35, led: false, desc: 'Kąt obliczany, 3 typy rynien' },
    'trendline+': { ph: 42, led: false, desc: 'Profil wzmocniony' },
    trendline_freistand: { ph: 35, led: false, desc: 'Wolnostojący, kąt obliczany' },
    topline: { ph: 55, led: false, desc: 'Profil premium 93mm' },
    topline_xl: { ph: 65, led: false, desc: 'Profil XL 117mm' },
    designline: { ph: 50, led: true, desc: 'LED, zintegrowana rynna' },
    ultraline_classic: { ph: 60, led: false, desc: 'Regulowane wysunięcie' },
    ultraline_style: { ph: 60, led: false, desc: 'Stałe 120mm' },
    ultraline_compact: { ph: 55, led: false, desc: 'Kompaktowa' },
    skyline: { ph: 50, led: false, desc: 'Dach płaski' },
    skyline_freistand: { ph: 50, led: false, desc: 'Płaski wolnostojący' },
    carport: { ph: 45, led: false, desc: 'Wiata' },
    carport_freistand: { ph: 45, led: false, desc: 'Wiata wolnostojąca' },
};

// ============================================================================
// INFO CARD — additional calculated values
// ============================================================================
const InfoCard = ({ results, opts, px, py }: { results: DachrechnerResults; opts: DimensionOptions; px: number; py: number }) => {
    const items: Array<{ l: string; v: number; c: string; u?: string }> = [];
    if (opts.showWindows) {
        if (results.fensterF1) items.push({ l: 'F1 Rinne', v: results.fensterF1, c: DC.w });
        if (results.fensterF2) items.push({ l: 'F2 Breite', v: results.fensterF2, c: DC.w });
        if (results.fensterF3) items.push({ l: 'F3 Haus', v: results.fensterF3, c: DC.w });
    }
    if (opts.showWedges) {
        if (results.keilhoeheK1) items.push({ l: 'K1 Rinne', v: results.keilhoeheK1, c: DC.k });
        if (results.keilhoeheK2) items.push({ l: 'K2 Haus', v: results.keilhoeheK2, c: DC.k });
    }
    if (opts.showAngles) {
        if (results.angleAlpha) items.push({ l: 'α', v: results.angleAlpha, c: DC.a, u: '°' });
        if (results.angleBeta) items.push({ l: 'β', v: results.angleBeta, c: DC.a, u: '°' });
        if (results.inclinationMmM) items.push({ l: 'Spadek', v: results.inclinationMmM, c: DC.a, u: 'mm/m' });
    }
    if (items.length === 0) return null;
    const w = 130, rh = 17, h = items.length * rh + 20;
    return (
        <g transform={`translate(${px},${py})`}>
            <rect x="0" y="0" width={w} height={h} fill="white" fillOpacity="0.95" stroke="#e2e8f0" strokeWidth="0.8" rx="6" filter="url(#ds)" />
            <text x={w / 2} y="13" textAnchor="middle" fontSize="7" fontWeight="800" fill="#94a3b8" letterSpacing="1">DODATKOWE</text>
            {items.map((it, i) => (
                <g key={i} transform={`translate(6,${i * rh + 24})`}>
                    <circle cx="0" cy="-3" r="2.5" fill={it.c} />
                    <text x="8" y="0" fontSize="8" fill="#475569" fontWeight="500">{it.l}</text>
                    <text x={w - 12} y="0" textAnchor="end" fontSize="8.5" fontWeight="bold" fill={it.c}>
                        {it.u === '°' || it.u === 'mm/m' ? it.v.toFixed(1) : Math.round(it.v)}{it.u || ''}
                    </text>
                </g>
            ))}
        </g>
    );
};

// ============================================================================
// MAIN COMPONENT — SIDE VIEW
// ============================================================================
export const DachrechnerDiagram: React.FC<DachrechnerDiagramProps> = ({ modelId, inputs, results, options, view = 'side' }) => {
    const model = ROOF_MODELS[modelId];
    const theme = TH[modelId] || TH.orangeline;
    const prof = PROF[modelId] || PROF.orangeline;

    const opts: DimensionOptions = options || {
        showHeights: true, showDepths: true, showRafters: true,
        showWindows: true, showWedges: true, showAngles: true, showPostDimensions: true,
    };

    const cat = model.category;
    const isFree = cat === 'flat_freestanding' || cat === 'carport_freestanding' || cat === 'calculated_angle_freestanding';
    const isFlat = cat === 'flat' || cat === 'flat_freestanding' || cat === 'carport' || cat === 'carport_freestanding';
    const isUltra = cat === 'ultraline' || cat === 'ultraline_compact';
    const isSloped = !isFlat && !isUltra;

    const h3 = inputs.h3 || results?.h3 || 2250;
    const depth = inputs.depth || 5000;
    const h1 = inputs.h1 || results?.h1 || (isFlat ? h3 : 2800);
    const overhang = inputs.overhang || results?.overhang || 0;
    const postW = model.postWidth;

    if (view === 'front') return <FrontView modelId={modelId} inputs={inputs} results={results} theme={theme} opts={opts} prof={prof} />;

    // ---- SIDE VIEW LAYOUT ----
    const W = 1000, H = 720;
    let dimCount = 0;
    if (opts.showDepths) { dimCount++; if (results?.depthD1) dimCount++; if (results?.depthD2) dimCount++; }
    if (opts.showPostDimensions) { if (results?.depthD4post) dimCount++; if (results?.depthD5) dimCount++; }

    const PAD = { l: opts.showHeights ? 110 : 60, r: opts.showHeights ? 130 : 60, t: 56, b: Math.max(65, 38 + dimCount * 24) };
    const DW = W - PAD.l - PAD.r, DH = H - PAD.t - PAD.b;
    const maxH = Math.max(h1, h3) * 1.25, maxW = depth * 1.12;
    const sc = Math.min(DH / maxH, DW / maxW);
    const OX = PAD.l, OY = H - PAD.b;
    const pt: PtFn = (x, y) => ({ x: OX + x * sc, y: OY - y * sc });

    const psw = Math.max(10, postW * sc); // post screen width
    const pth = Math.max(12, prof.ph * sc * 0.65); // profile screen thickness

    // Key screen coords
    const gndY = pt(0, 0).y;
    const gutX = pt(0, 0).x;
    const walX = pt(depth, 0).x;
    const h3Y = pt(0, h3).y;
    const h1Y = pt(0, h1).y;

    // Profile endpoints
    const profL = { x: gutX + psw, y: h3Y };        // Left = on top of post (gutter side)
    const profR = { x: isFree ? walX - psw : walX, y: h1Y }; // Right = wall side

    // Bottom dims
    const bdims: Array<{ x1: number; x2: number; l: string; v: number; c: string }> = [];
    if (opts.showDepths) {
        if (results?.depthD1) bdims.push({ x1: 0, x2: results.depthD1, l: 'D1', v: results.depthD1, c: DC.d });
        if (results?.depthD2) bdims.push({ x1: 0, x2: results.depthD2, l: 'D2', v: results.depthD2, c: DC.d });
        bdims.push({ x1: 0, x2: depth, l: 'Tiefe', v: depth, c: DC.d });
    }
    if (opts.showPostDimensions) {
        if (results?.depthD4post) bdims.push({ x1: 0, x2: results.depthD4post, l: 'D4', v: results.depthD4post, c: DC.p });
        if (results?.depthD5) bdims.push({ x1: 0, x2: results.depthD5, l: 'D5', v: results.depthD5, c: DC.p });
    }

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Defs />
            <rect x="0" y="0" width={W} height={H} fill="white" rx="8" />

            {/* ── TITLE BAR ── */}
            <rect x="0" y="0" width={W} height="48" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.6" rx="8" />
            <circle cx="20" cy="24" r="8" fill={theme.pri} opacity="0.15" />
            <circle cx="20" cy="24" r="4" fill={theme.pri} />
            <text x="36" y="20" fontSize="12" fontWeight="800" fill="#0f172a">{theme.label}</text>
            <text x="36" y="34" fontSize="8.5" fill="#94a3b8">{prof.desc}</text>
            <rect x={W - 100} y="10" width="85" height="28" fill={theme.sec} stroke={theme.pri} strokeWidth="0.4" rx="5" />
            <text x={W - 57} y="21" textAnchor="middle" fontSize="7" fill={theme.acc} fontWeight="700">PFOSTEN</text>
            <text x={W - 57} y="32" textAnchor="middle" fontSize="10" fill={theme.acc} fontWeight="800">{postW}mm</text>
            {isFree && (
                <g>
                    <rect x={W - 198} y="13" width="88" height="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.6" rx="5" />
                    <text x={W - 154} y="28" textAnchor="middle" fontSize="8" fontWeight="800" fill="#b45309">FREISTAND</text>
                </g>
            )}

            {/* ── GROUND ── */}
            <Ground x1={gutX - 50} x2={walX + 50} y={gndY} />

            {/* ── WALL (right side, non-freestanding) ── */}
            {!isFree && <Wall x={walX} yBot={gndY} yTop={Math.min(h1Y, h3Y) - 80} />}

            {/* ── LEFT POST (gutter side) ── */}
            <Post x={gutX} yBot={gndY} yTop={h3Y} w={psw} />

            {/* ── RIGHT POST (freestanding only) ── */}
            {isFree && <Post x={walX - psw} yBot={gndY} yTop={h1Y} w={psw} />}

            {/* ═══════ ROOF STRUCTURES ═══════ */}

            {/* SLOPED: Ecoline, Trendstyle, Topstyle, Designstyle */}
            {isSloped && (
                <g>
                    {/* Roof profile — sits ON post cap, goes up to wall */}
                    <SlopedProfile x1={profL.x} y1={profL.y} x2={profR.x} y2={profR.y} t={pth} />

                    {/* Gutter at gutter end (left) */}
                    <Gutter x={gutX} y={profL.y} />

                    {/* Wall bracket at wall end (right, non-freestanding) */}
                    {!isFree && <WallBracket x={walX - 8} y={profR.y} h={pth + 10} color={theme.pri} />}

                    {/* Glass panel under roof */}
                    <GlassPanel x1={profL.x + 15} y1={profL.y + pth + 3} x2={profR.x - 15} y2={profR.y + pth + 3} />

                    {/* LED strip for Designstyle */}
                    {prof.led && (
                        <line x1={profL.x + 20} y1={profL.y + pth + 1}
                            x2={profR.x - 20} y2={profR.y + pth + 1}
                            stroke="#fbbf24" strokeWidth="2.5" opacity="0.45" />
                    )}
                </g>
            )}

            {/* ULTRALINE: flat roof */}
            {isUltra && (
                <g>
                    {/* Flat profile from post to wall, at h1 height */}
                    <FlatProfile x1={gutX} x2={walX} y={h1Y - pth} t={pth} />
                    <WallBracket x={walX - 8} y={h1Y - pth} h={pth + 10} color={theme.pri} />
                    {/* Glass panel underneath with angle */}
                    <GlassPanel x1={gutX + psw + 10} y1={h1Y} x2={walX - 12} y2={h1Y + pth * 1.2} />
                    {/* Overhang extension (dashed, extends left beyond post) */}
                    {overhang > 0 && (
                        <g>
                            <line x1={gutX - overhang * sc} y1={h1Y - pth / 2} x2={gutX} y2={h1Y - pth / 2}
                                stroke={theme.acc} strokeWidth="1.5" strokeDasharray="5 3" />
                            <rect x={gutX - overhang * sc} y={h1Y - pth} width={overhang * sc} height={pth}
                                fill="#e2e8f0" stroke={DC.st} strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
                        </g>
                    )}
                </g>
            )}

            {/* FLAT: Skystyle, Carport */}
            {isFlat && (
                <g>
                    <FlatProfile x1={gutX} x2={walX} y={h1Y - pth} t={pth} />
                    {!isFree && <WallBracket x={walX - 8} y={h1Y - pth} h={pth + 10} color={theme.pri} />}
                    {results?.angleBeta && (
                        <GlassPanel x1={gutX + psw + 10} y1={h1Y} x2={walX - 12} y2={h1Y + pth} />
                    )}
                </g>
            )}

            {/* ═══════ DIMENSIONS ═══════ */}

            {/* LEFT: H3 (gutter/post height) */}
            {opts.showHeights && (
                <DimV pt={pt} bx={0} y1={0} y2={h3} label="H3" val={h3} ox={-50} color={DC.h} />
            )}

            {/* RIGHT: H1 (wall height) — sloped + freestanding */}
            {opts.showHeights && (isSloped || isFree) && (
                <DimV pt={pt} bx={depth} y1={0} y2={h1} label="H1" val={h1} ox={40} color={DC.h} />
            )}

            {/* RIGHT: H2 (total height including profile) */}
            {opts.showHeights && results?.heightH2 && !isFlat && (
                <DimV pt={pt} bx={depth} y1={0} y2={results.heightH2} label="H2" val={results.heightH2} ox={90} color={DC.h} />
            )}

            {/* BOTTOM: D1, D2, Tiefe, D4, D5 */}
            {bdims.map((d, i) => (
                <DimH key={d.l} pt={pt} by={0} x1={d.x1} x2={d.x2} label={d.l} val={d.v} oy={24 + i * 24} color={d.c} />
            ))}

            {/* TOP: S1 rafter diagonal */}
            {opts.showRafters && results?.sparrenMitte && isSloped && (() => {
                const mx = (profL.x + profR.x) / 2;
                const my = (profL.y + profR.y) / 2 - 18;
                return (
                    <g>
                        <line x1={profL.x + 10} y1={profL.y - 6} x2={profR.x - 10} y2={profR.y - 6}
                            stroke={DC.s} strokeWidth="1.2" />
                        <path d={`M${profL.x + 10},${profL.y - 6} l5,-3 0,6Z`} fill={DC.s} />
                        <path d={`M${profR.x - 10},${profR.y - 6} l-5,-3 0,6Z`} fill={DC.s} />
                        <rect x={mx - 34} y={my - 10} width="68" height="20" fill="white" stroke={DC.s} strokeWidth="0.6" rx="4" />
                        <text x={mx} y={my + 3} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={DC.s} fontFamily="monospace">
                            S1: {Math.round(results.sparrenMitte!)}
                        </text>
                    </g>
                );
            })()}

            {/* α angle at gutter/post end */}
            {opts.showAngles && results?.angleAlpha && isSloped && (() => {
                const cx = profL.x + 20;
                const cy = profL.y + pth + 15;
                const r = 30, rad = results.angleAlpha * Math.PI / 180;
                return (
                    <g>
                        <line x1={cx} y1={cy} x2={cx + 45} y2={cy} stroke={DC.a} strokeWidth="0.7" opacity="0.4" />
                        <path d={`M${cx + r},${cy} A${r},${r} 0 0 0 ${cx + r * Math.cos(-rad)},${cy + r * Math.sin(-rad)}`}
                            fill="none" stroke={DC.a} strokeWidth="1.5" />
                        <rect x={cx + r + 4} y={cy - 10} width="54" height="16" fill="white" stroke={DC.a} strokeWidth="0.5" rx="3" />
                        <text x={cx + r + 31} y={cy + 1} textAnchor="middle" fontSize="9" fontWeight="800" fill={DC.a}>
                            α = {results.angleAlpha.toFixed(1)}°
                        </text>
                    </g>
                );
            })()}

            {/* β angle for ultraline/flat */}
            {opts.showAngles && (isUltra || isFlat) && results?.angleBeta && (() => {
                const bx = walX - psw - 50;
                const by = h1Y - pth - 14;
                return (
                    <g>
                        <rect x={bx - 4} y={by - 10} width="54" height="16" fill="white" stroke={DC.a} strokeWidth="0.5" rx="3" />
                        <text x={bx + 23} y={by + 1} textAnchor="middle" fontSize="9" fontWeight="800" fill={DC.a}>
                            β = {results.angleBeta.toFixed(1)}°
                        </text>
                    </g>
                );
            })()}

            {/* U1 overhang for ultraline */}
            {isUltra && overhang > 0 && opts.showDepths && (() => {
                const ox1 = gutX - overhang * sc;
                const uy = h1Y - pth - 12;
                return (
                    <g>
                        <line x1={ox1} y1={uy} x2={gutX} y2={uy} stroke="#e11d48" strokeWidth="1.5" />
                        <path d={`M${ox1},${uy} l5,-3 0,6Z`} fill="#e11d48" />
                        <path d={`M${gutX},${uy} l-5,-3 0,6Z`} fill="#e11d48" />
                        <rect x={(ox1 + gutX) / 2 - 26} y={uy - 12} width="52" height="16" fill="white" stroke="#e11d48" strokeWidth="0.5" rx="3" />
                        <text x={(ox1 + gutX) / 2} y={uy - 2} textAnchor="middle" fontSize="9" fontWeight="800" fill="#e11d48" fontFamily="monospace">
                            U1: {Math.round(overhang)}
                        </text>
                    </g>
                );
            })()}

            {/* Info card — positioned lower right to avoid overlaps */}
            {results && <InfoCard results={results} opts={opts} px={W - PAD.r - 125} py={PAD.t + 6} />}

            <text x={W - 8} y={H - 6} textAnchor="end" fontSize="6" fill="#cbd5e1">mm</text>
        </svg>
    );
};

// ============================================================================
// FRONT VIEW
// ============================================================================
const FrontView: React.FC<{
    modelId: RoofModelId; inputs: DachrechnerInputs; results: DachrechnerResults | null;
    theme: typeof TH[string]; opts: DimensionOptions; prof: typeof PROF[string];
}> = ({ modelId, inputs, results, theme, opts, prof }) => {
    const model = ROOF_MODELS[modelId];
    const width = inputs.width || 5000, posts = inputs.postCount || 2;
    const h3 = inputs.h3 || results?.h3 || 2250;
    const pw = model.postWidth;
    const totalPw = posts * pw;
    const iw = posts > 1 ? (width - totalPw) / (posts - 1) : 0;

    const W = 1000, H = 700;
    const PAD = { l: 90, r: 90, t: 60, b: 90 };
    const DW = W - PAD.l - PAD.r, DH = H - PAD.t - PAD.b;
    const sc = Math.min(DH / (h3 * 1.2), DW / (width * 1.1));
    const OX = PAD.l + (DW - width * sc) / 2, OY = H - PAD.b;
    const pt: PtFn = (x, y) => ({ x: OX + x * sc, y: OY - y * sc });

    const psw = Math.max(8, pw * sc);
    const beamH = Math.max(10, prof.ph * sc * 0.5);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Defs />
            <rect x="0" y="0" width={W} height={H} fill="white" rx="8" />
            <rect x="0" y="0" width={W} height="48" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.6" rx="8" />
            <circle cx="20" cy="24" r="8" fill={theme.pri} opacity="0.15" />
            <circle cx="20" cy="24" r="4" fill={theme.pri} />
            <text x="36" y="20" fontSize="12" fontWeight="800" fill="#0f172a">{theme.label} — Vorderansicht</text>
            <text x="36" y="34" fontSize="8.5" fill="#94a3b8">{pw}mm × {posts} Stk. | Lichte Weite: {Math.round(iw)}mm</text>

            <Ground x1={OX - 20} x2={OX + width * sc + 20} y={OY} />

            {/* Posts */}
            {Array.from({ length: posts }).map((_, i) => {
                const x = i * (pw + iw);
                const px = pt(x, 0).x;
                const topY = pt(0, h3).y;
                return (
                    <g key={i}>
                        <Post x={px} yBot={OY} yTop={topY} w={psw} />
                        {/* Inner width dimension between posts */}
                        {i < posts - 1 && opts.showPostDimensions && (() => {
                            const p1x = px + psw;
                            const p2x = pt(x + pw + iw, 0).x;
                            const midY = (topY + OY) / 2;
                            return (
                                <g>
                                    <line x1={p1x} y1={midY - 6} x2={p1x} y2={midY + 6} stroke={DC.p} strokeWidth="1.5" />
                                    <line x1={p2x} y1={midY - 6} x2={p2x} y2={midY + 6} stroke={DC.p} strokeWidth="1.5" />
                                    <line x1={p1x} y1={midY} x2={p2x} y2={midY} stroke={DC.p} strokeWidth="1.5" />
                                    <rect x={(p1x + p2x) / 2 - 26} y={midY - 10} width="52" height="18" fill="white" stroke={DC.p} strokeWidth="0.5" rx="3" />
                                    <text x={(p1x + p2x) / 2} y={midY + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill={DC.p} fontFamily="monospace">
                                        {Math.round(iw)}
                                    </text>
                                </g>
                            );
                        })()}
                    </g>
                );
            })}

            {/* Top beam / profile */}
            {(() => {
                const bx1 = pt(0, 0).x;
                const bx2 = pt(width, 0).x;
                const by = pt(0, h3).y;
                return <FlatProfile x1={bx1} x2={bx2} y={by - beamH} t={beamH} />;
            })()}

            {/* B (width) */}
            {opts.showPostDimensions && <DimH pt={pt} by={0} x1={0} x2={width} label="B" val={width} oy={24} color={DC.p} />}
            {/* H3 */}
            {opts.showHeights && <DimV pt={pt} bx={-80 / sc} y1={0} y2={h3} label="H3" val={h3} ox={-30} color={DC.h} />}
            <text x={W - 8} y={H - 6} textAnchor="end" fontSize="6" fill="#cbd5e1">mm</text>
        </svg>
    );
};
