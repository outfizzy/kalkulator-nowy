import React, { useMemo } from 'react';
import { ROOF_MODELS, type RoofModelId, type DachrechnerInputs, type DachrechnerResults } from '../../services/dachrechner.service';

// ============================================================================
// DACHRECHNER DIAGRAM - Model-specific structural visualizations
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

// ---- MODEL THEME COLORS ----
const MODEL_THEMES: Record<string, { primary: string; secondary: string; accent: string; roofGrad: [string, string]; label: string }> = {
    orangeline: { primary: '#f97316', secondary: '#fed7aa', accent: '#ea580c', roofGrad: ['#fdba74', '#f97316'], label: 'Orangeline' },
    'orangeline+': { primary: '#f97316', secondary: '#fed7aa', accent: '#ea580c', roofGrad: ['#fdba74', '#f97316'], label: 'Orangeline+' },
    trendline: { primary: '#3b82f6', secondary: '#bfdbfe', accent: '#2563eb', roofGrad: ['#93c5fd', '#3b82f6'], label: 'Trendline' },
    'trendline+': { primary: '#3b82f6', secondary: '#bfdbfe', accent: '#2563eb', roofGrad: ['#93c5fd', '#3b82f6'], label: 'Trendline+' },
    topline: { primary: '#8b5cf6', secondary: '#ddd6fe', accent: '#7c3aed', roofGrad: ['#c4b5fd', '#8b5cf6'], label: 'Topline' },
    topline_xl: { primary: '#7c3aed', secondary: '#c4b5fd', accent: '#6d28d9', roofGrad: ['#a78bfa', '#7c3aed'], label: 'Topline XL' },
    designline: { primary: '#06b6d4', secondary: '#a5f3fc', accent: '#0891b2', roofGrad: ['#67e8f9', '#06b6d4'], label: 'Designline' },
    ultraline_classic: { primary: '#10b981', secondary: '#a7f3d0', accent: '#059669', roofGrad: ['#6ee7b7', '#10b981'], label: 'Ultraline Classic' },
    ultraline_style: { primary: '#10b981', secondary: '#a7f3d0', accent: '#059669', roofGrad: ['#6ee7b7', '#10b981'], label: 'Ultraline Style' },
    ultraline_compact: { primary: '#059669', secondary: '#a7f3d0', accent: '#047857', roofGrad: ['#34d399', '#059669'], label: 'Ultraline Compact' },
    skyline: { primary: '#64748b', secondary: '#e2e8f0', accent: '#475569', roofGrad: ['#cbd5e1', '#94a3b8'], label: 'Skyline' },
    skyline_freistand: { primary: '#64748b', secondary: '#e2e8f0', accent: '#475569', roofGrad: ['#cbd5e1', '#94a3b8'], label: 'Skyline Freistand' },
    carport: { primary: '#78716c', secondary: '#e7e5e4', accent: '#57534e', roofGrad: ['#d6d3d1', '#a8a29e'], label: 'Carport' },
    carport_freistand: { primary: '#78716c', secondary: '#e7e5e4', accent: '#57534e', roofGrad: ['#d6d3d1', '#a8a29e'], label: 'Carport Freistand' },
};

// ---- DIMENSION COLORS ----
const DIM_COL = {
    height: '#7c3aed',
    depth: '#0891b2',
    post: '#2563eb',
    rafter: '#f97316',
    angle: '#dc2626',
    window: '#0d9488',
    wedge: '#d97706',
    struct: '#334155',
    glass: '#7dd3fc',
};

// ============================================================================
// SHARED DIMENSION PRIMITIVES
// ============================================================================

interface PtFn { (x: number, y: number): { x: number; y: number }; }

const DimVertical = ({ pt, baseX, y1, y2, label, value, offsetX, color = DIM_COL.height }: {
    pt: PtFn; baseX: number; y1: number; y2: number; label: string; value: number; offsetX: number; color?: string;
}) => {
    const p1 = pt(baseX, y1);
    const p2 = pt(baseX, y2);
    const lx = p1.x + offsetX;
    const ty = (p1.y + p2.y) / 2;
    const isLeft = offsetX < 0;
    return (
        <g>
            <line x1={p1.x} y1={p1.y} x2={lx} y2={p1.y} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
            <line x1={p2.x} y1={p2.y} x2={lx} y2={p2.y} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
            <line x1={lx} y1={p1.y} x2={lx} y2={p2.y} stroke={color} strokeWidth="1.5" />
            <polygon points={`${lx - 3},${p1.y + 6} ${lx},${p1.y} ${lx + 3},${p1.y + 6}`} fill={color} />
            <polygon points={`${lx - 3},${p2.y - 6} ${lx},${p2.y} ${lx + 3},${p2.y - 6}`} fill={color} />
            <rect x={isLeft ? lx - 55 : lx + 2} y={ty - 17} width="52" height="34" fill="white" stroke={color} strokeWidth="0.7" rx="5" filter="url(#dimShadow)" />
            <text x={isLeft ? lx - 29 : lx + 28} y={ty - 3} textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>{label}</text>
            <text x={isLeft ? lx - 29 : lx + 28} y={ty + 12} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">{Math.round(value)}</text>
        </g>
    );
};

const DimHorizontal = ({ pt, baseY, x1, x2, label, value, offsetY, color = DIM_COL.depth }: {
    pt: PtFn; baseY: number; x1: number; x2: number; label: string; value: number; offsetY: number; color?: string;
}) => {
    const p1 = pt(x1, baseY);
    const p2 = pt(x2, baseY);
    const ly = p1.y + offsetY;
    const tx = (p1.x + p2.x) / 2;
    const w = Math.max(label.length * 6 + 50, 70);
    return (
        <g>
            <line x1={p1.x} y1={p1.y} x2={p1.x} y2={ly} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
            <line x1={p2.x} y1={p2.y} x2={p2.x} y2={ly} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
            <line x1={p1.x} y1={ly} x2={p2.x} y2={ly} stroke={color} strokeWidth="1.5" />
            <polygon points={`${p1.x + 6},${ly - 3} ${p1.x},${ly} ${p1.x + 6},${ly + 3}`} fill={color} />
            <polygon points={`${p2.x - 6},${ly - 3} ${p2.x},${ly} ${p2.x - 6},${ly + 3}`} fill={color} />
            <rect x={tx - w / 2} y={ly - 11} width={w} height="22" fill="white" stroke={color} strokeWidth="0.7" rx="5" filter="url(#dimShadow)" />
            <text x={tx} y={ly + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{label}: {Math.round(value)}</text>
        </g>
    );
};

// ============================================================================
// SVG DEFS shared by all models
// ============================================================================
const SharedDefs = ({ theme }: { theme: typeof MODEL_THEMES[string] }) => (
    <defs>
        <filter id="dimShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#00000015" />
        </filter>
        <filter id="structShadow" x="-2%" y="-2%" width="104%" height="108%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#00000020" />
        </filter>
        <pattern id="groundHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="0.8" />
        </pattern>
        <pattern id="wallHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.roofGrad[0]} />
            <stop offset="100%" stopColor={theme.roofGrad[1]} />
        </linearGradient>
        <linearGradient id="postGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="gutterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="profileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.9" />
            <stop offset="100%" stopColor={theme.accent} />
        </linearGradient>
    </defs>
);

// ============================================================================
// STRUCTURAL ELEMENTS
// ============================================================================

// Wall (house side)
const Wall = ({ pt, h1, extraHeight = 400 }: { pt: PtFn; h1: number; extraHeight?: number }) => {
    const p0 = pt(0, 0);
    const pH = pt(0, h1 + extraHeight);
    return (
        <g>
            <rect x={pH.x - 25} y={pH.y} width="25" height={p0.y - pH.y} fill="url(#wallHatch)" opacity="0.4" />
            <line x1={p0.x} y1={p0.y} x2={pH.x} y2={pH.y} stroke={DIM_COL.struct} strokeWidth="4" />
        </g>
    );
};

// Ground
const Ground = ({ ox, dw, oy }: { ox: number; dw: number; oy: number }) => (
    <g>
        <rect x={ox - 40} y={oy} width={dw + 80} height="12" fill="url(#groundHatch)" opacity="0.5" />
        <line x1={ox - 40} y1={oy} x2={ox + dw + 40} y2={oy} stroke={DIM_COL.struct} strokeWidth="3" />
    </g>
);

// Post with correct width
const Post = ({ pt, x, h, width, side = 'right' }: { pt: PtFn; x: number; h: number; width: number; side?: 'left' | 'right' }) => {
    const pBot = pt(x, 0);
    const pTop = pt(x, h);
    // Scale post width relative to structure
    const pW = Math.max(8, (pt(width, 0).x - pt(0, 0).x));
    const xStart = side === 'right' ? pBot.x - pW : pBot.x;
    return (
        <g filter="url(#structShadow)">
            <rect x={xStart} y={pTop.y} width={pW} height={pBot.y - pTop.y} fill="url(#postGrad)" stroke={DIM_COL.struct} strokeWidth="1.5" rx="1" />
            {/* Base plate */}
            <rect x={xStart - 3} y={pBot.y - 6} width={pW + 6} height="6" fill="#94a3b8" stroke={DIM_COL.struct} strokeWidth="1" rx="1" />
            {/* Post width label */}
            <text x={xStart + pW / 2} y={pBot.y - 12} textAnchor="middle" fontSize="8" fill="#64748b">{Math.round(width)}</text>
        </g>
    );
};

// Sloped roof panel
const SlopedRoof = ({ pt, x1, y1, x2, y2, profileH = 25 }: { pt: PtFn; x1: number; y1: number; x2: number; y2: number; profileH?: number }) => {
    const p1 = pt(x1, y1);
    const p2 = pt(x2, y2);
    const p1b = pt(x1, y1 + profileH);
    const p2b = pt(x2, y2 + profileH);
    return (
        <g filter="url(#structShadow)">
            {/* Main roof panel */}
            <polygon
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p2b.x},${p2b.y} ${p1b.x},${p1b.y}`}
                fill="url(#roofGrad)" stroke={DIM_COL.struct} strokeWidth="2"
            />
            {/* Top surface highlight */}
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="1" opacity="0.4" />
        </g>
    );
};

// Flat roof panel
const FlatRoof = ({ pt, x1, x2, y, height = 130 }: { pt: PtFn; x1: number; x2: number; y: number; height?: number }) => {
    const p1 = pt(x1, y);
    const p2 = pt(x2, y);
    const p1b = pt(x1, y + height);
    const p2b = pt(x2, y + height);
    return (
        <g filter="url(#structShadow)">
            <rect x={p1.x} y={p1b.y} width={p2.x - p1.x} height={p1.y - p1b.y} fill="url(#roofGrad)" stroke={DIM_COL.struct} strokeWidth="2" rx="2" />
            <line x1={p1.x} y1={p1b.y} x2={p2.x} y2={p2b.y} stroke="white" strokeWidth="1" opacity="0.3" />
        </g>
    );
};

// Standard gutter (trapezoid)
const GutterStandard = ({ pt, x, y, size = 60 }: { pt: PtFn; x: number; y: number; size?: number }) => {
    const p = pt(x, y);
    const s = Math.max(15, size * 0.15);
    return (
        <g>
            <polygon points={`${p.x - s * 0.8},${p.y} ${p.x + s},${p.y} ${p.x + s * 0.7},${p.y + s * 0.8} ${p.x - s * 0.4},${p.y + s * 0.8}`}
                fill="url(#gutterGrad)" stroke={DIM_COL.struct} strokeWidth="1.5" />
        </g>
    );
};

// Round gutter
const GutterRound = ({ pt, x, y }: { pt: PtFn; x: number; y: number }) => {
    const p = pt(x, y);
    return (
        <g>
            <path d={`M ${p.x - 12} ${p.y} Q ${p.x} ${p.y + 18} ${p.x + 18} ${p.y}`}
                fill="none" stroke="#64748b" strokeWidth="2.5" />
            <circle cx={p.x + 3} cy={p.y + 12} r="3" fill="#64748b" />
        </g>
    );
};

// Wall connection profile
const WallProfile = ({ pt, y, profileH, color }: { pt: PtFn; y: number; profileH: number; color: string }) => {
    const p = pt(0, y);
    const pb = pt(0, y + profileH);
    return (
        <g>
            <rect x={p.x - 4} y={pb.y} width="12" height={p.y - pb.y} fill={color} stroke={DIM_COL.struct} strokeWidth="1" rx="1" opacity="0.8" />
        </g>
    );
};

// Glass panel (for Ultraline/Skyline)
const GlassPanel = ({ pt, x1, y1, x2, y2 }: { pt: PtFn; x1: number; y1: number; x2: number; y2: number }) => {
    const p1 = pt(x1, y1);
    const p2 = pt(x2, y2);
    return (
        <g>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={DIM_COL.glass} strokeWidth="3" opacity="0.6" />
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="1" opacity="0.4" />
        </g>
    );
};

// Keil (wedge) indicator
const WedgeIndicator = ({ pt, x, yBase, height, side, color = DIM_COL.wedge }: { pt: PtFn; x: number; yBase: number; height: number; side: 'left' | 'right'; color?: string }) => {
    const p1 = pt(x, yBase);
    const p2 = pt(x, yBase + height);
    const dir = side === 'left' ? -1 : 1;
    return (
        <g opacity="0.6">
            <polygon
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p2.x + dir * 10},${p2.y}`}
                fill={color} opacity="0.2" stroke={color} strokeWidth="1" strokeDasharray="3 2"
            />
        </g>
    );
};

// ============================================================================
// INFO PANEL (window/wedge dimensions)
// ============================================================================
const InfoPanel = ({ results, opts, panelX, panelY }: { results: DachrechnerResults; opts: DimensionOptions; panelX: number; panelY: number }) => {
    const items: Array<{ label: string; value: number; color: string; unit?: string }> = [];

    if (opts.showWindows) {
        if (results.fensterF1) items.push({ label: 'F1 Okno rynna', value: results.fensterF1, color: DIM_COL.window });
        if (results.fensterF2) items.push({ label: 'F2 Szer. okna', value: results.fensterF2, color: DIM_COL.window });
        if (results.fensterF3) items.push({ label: 'F3 Okno ściana', value: results.fensterF3, color: DIM_COL.window });
    }
    if (opts.showWedges) {
        if (results.keilhoeheK1) items.push({ label: 'K1 Klin rynna', value: results.keilhoeheK1, color: DIM_COL.wedge });
        if (results.keilhoeheK2) items.push({ label: 'K2 Klin ściana', value: results.keilhoeheK2, color: DIM_COL.wedge });
    }
    if (opts.showAngles) {
        if (results.angleAlpha) items.push({ label: 'α Nachylenie', value: results.angleAlpha, color: DIM_COL.angle, unit: '°' });
        if (results.angleBeta) items.push({ label: 'β Szkło', value: results.angleBeta, color: DIM_COL.angle, unit: '°' });
        if (results.inclinationMmM) items.push({ label: 'Nachylenie', value: results.inclinationMmM, color: DIM_COL.angle, unit: 'mm/m' });
    }

    if (items.length === 0) return null;

    const pw = 155;
    const rh = 22;
    const ph = items.length * rh + 26;

    return (
        <g transform={`translate(${panelX}, ${panelY})`}>
            <rect x="0" y="0" width={pw} height={ph} fill="white" stroke="#e2e8f0" strokeWidth="1" rx="8" filter="url(#dimShadow)" />
            <text x={pw / 2} y="16" textAnchor="middle" fontSize="9" fontWeight="800" fill="#64748b" letterSpacing="1">WYMIARY DODATKOWE</text>
            {items.map((item, i) => (
                <g key={i} transform={`translate(10, ${i * rh + 32})`}>
                    <circle cx="0" cy="-3" r="4" fill={item.color} />
                    <text x="12" y="0" fontSize="10" fill="#334155" fontWeight="500">{item.label}</text>
                    <text x={pw - 18} y="0" textAnchor="end" fontSize="10" fontWeight="bold" fill={item.color}>
                        {item.unit === '°' || item.unit === 'mm/m' ? item.value.toFixed(1) : Math.round(item.value)}{item.unit || ''}
                    </text>
                </g>
            ))}
        </g>
    );
};

// ============================================================================
// MODEL-SPECIFIC DETAILS
// ============================================================================

// Profile thickness per model (visual mm scale)
const PROFILE_DETAILS: Record<string, { profileH: number; hasLED: boolean; gutterType: 'standard' | 'round' | 'klassiek' | 'integrated'; desc: string }> = {
    orangeline: { profileH: 30, hasLED: false, gutterType: 'standard', desc: '8° stały kąt, profil standardowy' },
    'orangeline+': { profileH: 35, hasLED: false, gutterType: 'standard', desc: '8° stały kąt, profil rozszerzony' },
    trendline: { profileH: 35, hasLED: false, gutterType: 'standard', desc: 'Kąt obliczany, 3 typy rynien' },
    'trendline+': { profileH: 42, hasLED: false, gutterType: 'standard', desc: 'Kąt obliczany, profil wzmocniony' },
    topline: { profileH: 55, hasLED: false, gutterType: 'standard', desc: 'Profil premium 93mm, offset 155mm' },
    topline_xl: { profileH: 65, hasLED: false, gutterType: 'standard', desc: 'Profil XL 117mm, słupek 196mm' },
    designline: { profileH: 50, hasLED: true, gutterType: 'integrated', desc: 'Profil LED, zintegrowana rynna' },
    ultraline_classic: { profileH: 60, hasLED: false, gutterType: 'integrated', desc: 'Spadek wewnętrzny, dowolny wysunięcie' },
    ultraline_style: { profileH: 60, hasLED: false, gutterType: 'integrated', desc: 'Spadek wewnętrzny, stałe 120mm' },
    ultraline_compact: { profileH: 55, hasLED: false, gutterType: 'integrated', desc: 'Kompaktowa wersja, bez wysunięcia' },
    skyline: { profileH: 50, hasLED: false, gutterType: 'integrated', desc: 'Dach płaski, kąt szkła 95mm' },
    skyline_freistand: { profileH: 50, hasLED: false, gutterType: 'integrated', desc: 'Płaski wolnostojący' },
    carport: { profileH: 45, hasLED: false, gutterType: 'integrated', desc: 'Wiata, kąt szkła 28mm' },
    carport_freistand: { profileH: 45, hasLED: false, gutterType: 'integrated', desc: 'Wiata wolnostojąca' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DachrechnerDiagram: React.FC<DachrechnerDiagramProps> = ({ modelId, inputs, results, options, view = 'side' }) => {
    const model = ROOF_MODELS[modelId];
    const theme = MODEL_THEMES[modelId] || MODEL_THEMES.orangeline;
    const details = PROFILE_DETAILS[modelId] || PROFILE_DETAILS.orangeline;

    const opts: DimensionOptions = options || {
        showHeights: true, showDepths: true, showRafters: true,
        showWindows: true, showWedges: true, showAngles: true, showPostDimensions: true,
    };

    const cat = model.category;
    const isFreestanding = cat === 'flat_freestanding' || cat === 'carport_freestanding';
    const isFlat = cat === 'flat' || cat === 'flat_freestanding' || cat === 'carport' || cat === 'carport_freestanding';
    const isUltraline = cat === 'ultraline' || cat === 'ultraline_compact';
    const isSloped = !isFlat && !isUltraline;

    const h3 = inputs.h3 || results?.h3 || 2250;
    const depth = inputs.depth || 5000;
    const h1 = inputs.h1 || results?.h1 || (isFlat ? h3 : 2800);
    const overhang = inputs.overhang || results?.overhang || 0;
    const postWidth = model.postWidth;

    // ---- FRONT VIEW ----
    if (view === 'front') {
        return <FrontView modelId={modelId} inputs={inputs} results={results} theme={theme} opts={opts} details={details} />;
    }

    // ---- SIDE VIEW ----
    const W = 1000, H = 780;
    const PAD = { left: 180, right: 140, top: 95, bottom: 155 };
    const DW = W - PAD.left - PAD.right;
    const DH = H - PAD.top - PAD.bottom;

    const maxH = Math.max(h1, h3) * 1.25;
    const maxW = depth * 1.15;
    const scale = Math.min(DH / maxH, DW / maxW);

    const OX = PAD.left;
    const OY = H - PAD.bottom;
    const pt: PtFn = (x, y) => ({ x: OX + x * scale, y: OY - y * scale });

    const legX = depth - overhang;
    const endX = depth;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <SharedDefs theme={theme} />

            {/* Background */}
            <rect x="0" y="0" width={W} height={H} fill="#fafbfc" rx="12" />

            {/* Title bar */}
            <rect x="0" y="0" width={W} height="75" fill="white" stroke="#e2e8f0" strokeWidth="1" />
            <circle cx="30" cy="38" r="16" fill={theme.primary} opacity="0.15" />
            <circle cx="30" cy="38" r="8" fill={theme.primary} />
            <text x="55" y="32" fontSize="17" fontWeight="800" fill="#1e293b">{theme.label}</text>
            <text x="55" y="50" fontSize="11" fill="#64748b">{details.desc}</text>
            {/* Post width badge */}
            <rect x={W - 140} y="20" width="120" height="36" fill={theme.secondary} stroke={theme.primary} strokeWidth="0.5" rx="8" />
            <text x={W - 80} y="35" textAnchor="middle" fontSize="9" fill={theme.accent} fontWeight="700">SŁUPEK</text>
            <text x={W - 80} y="49" textAnchor="middle" fontSize="12" fill={theme.accent} fontWeight="800">{postWidth} mm</text>

            {/* Freestanding badge */}
            {isFreestanding && (
                <g>
                    <rect x={W - 280} y="22" width="125" height="32" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx="8" />
                    <circle cx={W - 265} cy="38" r="4" fill="#f59e0b" />
                    <text x={W - 255} y="42" fontSize="11" fontWeight="800" fill="#b45309">WOLNOSTOJĄCY</text>
                </g>
            )}

            {/* Ground */}
            <Ground ox={OX} dw={DW} oy={OY} />

            {/* ---- STRUCTURAL RENDERING PER MODEL CATEGORY ---- */}

            {/* WALL (not freestanding) */}
            {!isFreestanding && <Wall pt={pt} h1={h1} />}

            {/* Left post (freestanding) — taller side */}
            {isFreestanding && (
                <g>
                    <Post pt={pt} x={postWidth} h={h1} width={postWidth} side="left" />
                    {/* Foundation L */}
                    {(() => {
                        const p = pt(0, 0); return (
                            <g>
                                <rect x={p.x - 5} y={p.y} width={Math.max(12, postWidth * scale) + 16} height="4" fill="#f59e0b" rx="2" />
                                <rect x={p.x - 8} y={p.y + 4} width={Math.max(12, postWidth * scale) + 22} height="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.8" rx="2" />
                            </g>
                        );
                    })()}
                </g>
            )}

            {/* Right post */}
            <Post pt={pt} x={legX} h={h3} width={postWidth} side="right" />

            {/* Foundation R (freestanding) */}
            {isFreestanding && (() => {
                const p = pt(legX, 0); const pW = Math.max(10, postWidth * scale); return (
                    <g>
                        <rect x={p.x - pW - 5} y={p.y} width={pW + 16} height="4" fill="#f59e0b" rx="2" />
                        <rect x={p.x - pW - 8} y={p.y + 4} width={pW + 22} height="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.8" rx="2" />
                    </g>
                );
            })()}

            {/* Passage label between posts (freestanding) */}
            {isFreestanding && opts.showDepths && (() => {
                const p1 = pt(postWidth + 50, h3 * 0.4);
                const p2 = pt(legX - postWidth - 50, h3 * 0.4);
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                return (
                    <g opacity="0.5">
                        <line x1={p1.x} y1={my} x2={p2.x} y2={my} stroke="#f59e0b" strokeWidth="1" strokeDasharray="8 4" />
                        <rect x={mx - 50} y={my - 12} width="100" height="24" fill="#fffbeb" stroke="#f59e0b" strokeWidth="0.8" rx="6" />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#b45309">⟷  PRZEJAZD</text>
                    </g>
                );
            })()}

            {/* ROOF PANEL */}
            {isSloped && (
                <g>
                    <SlopedRoof pt={pt} x1={0} y1={h1} x2={endX} y2={h3} profileH={details.profileH} />
                    {/* Wall profile connection */}
                    <WallProfile pt={pt} y={h1 - 5} profileH={details.profileH + 10} color={theme.primary} />
                    {/* Gutter */}
                    <GutterStandard pt={pt} x={endX} y={h3} />
                    {/* LED strip for Designline */}
                    {details.hasLED && (
                        <g>
                            <line x1={pt(50, h1 - 2).x} y1={pt(50, h1 - 2).y} x2={pt(endX - 50, h3 - 2).x} y2={pt(endX - 50, h3 - 2).y}
                                stroke="#fbbf24" strokeWidth="3" opacity="0.7" />
                            <line x1={pt(50, h1 - 2).x} y1={pt(50, h1 - 2).y} x2={pt(endX - 50, h3 - 2).x} y2={pt(endX - 50, h3 - 2).y}
                                stroke="white" strokeWidth="1" opacity="0.5" />
                        </g>
                    )}
                    {/* Wedge indicators */}
                    {opts.showWedges && results?.keilhoeheK1 && (
                        <WedgeIndicator pt={pt} x={legX} yBase={h3} height={results.keilhoeheK1} side="right" />
                    )}
                    {opts.showWedges && results?.keilhoeheK2 && !isFreestanding && (
                        <WedgeIndicator pt={pt} x={0} yBase={h1 - results.keilhoeheK2} height={results.keilhoeheK2} side="left" />
                    )}
                </g>
            )}

            {isUltraline && (
                <g>
                    <FlatRoof pt={pt} x1={0} x2={endX} y={h1} height={details.profileH * 2} />
                    {/* Internal glass pitch line */}
                    <GlassPanel pt={pt} x1={80} y1={h1 + 15} x2={endX - 120} y2={h1 - 60} />
                    {/* Wall profile */}
                    <WallProfile pt={pt} y={h1 - 5} profileH={details.profileH * 2 + 10} color={theme.primary} />
                    {/* Overhang indicator */}
                    {overhang > 0 && (
                        <g>
                            <line x1={pt(legX, h1 + details.profileH).x} y1={pt(legX, h1 + details.profileH).y}
                                x2={pt(endX, h1 + details.profileH).x} y2={pt(endX, h1 + details.profileH).y}
                                stroke={theme.accent} strokeWidth="2" strokeDasharray="6 3" />
                        </g>
                    )}
                </g>
            )}

            {isFlat && (
                <g>
                    <FlatRoof pt={pt} x1={isFreestanding ? 0 : 0} x2={endX} y={h1} height={details.profileH * 2} />
                    {!isFreestanding && <WallProfile pt={pt} y={h1 - 5} profileH={details.profileH * 2 + 10} color={theme.primary} />}
                    {/* Glass angle for Skyline/Carport */}
                    {results?.angleBeta && (
                        <GlassPanel pt={pt} x1={80} y1={h1 + 10} x2={endX - 100} y2={h1 - 40} />
                    )}
                </g>
            )}

            {/* ---- DIMENSIONS ---- */}

            {/* Heights LEFT */}
            {opts.showHeights && isSloped && !isFreestanding && (
                <DimVertical pt={pt} baseX={0} y1={0} y2={h1} label="H1" value={h1} offsetX={-65} />
            )}
            {/* H1 for freestanding (left post height) */}
            {opts.showHeights && isFreestanding && (
                <DimVertical pt={pt} baseX={0} y1={0} y2={h1} label="H1" value={h1} offsetX={-65} />
            )}
            {opts.showHeights && results?.heightH2 && !isFlat && (
                <DimVertical pt={pt} baseX={0} y1={0} y2={results.heightH2} label="H2" value={results.heightH2} offsetX={-125} />
            )}

            {/* H3 RIGHT */}
            {opts.showHeights && (
                <DimVertical pt={pt} baseX={legX} y1={0} y2={h3} label="H3" value={h3} offsetX={65} />
            )}

            {/* Depths BOTTOM */}
            {opts.showDepths && (
                <DimHorizontal pt={pt} baseY={0} x1={0} x2={endX} label="Tiefe (C)" value={depth} offsetY={35} />
            )}
            {opts.showDepths && results?.depthD1 && (
                <DimHorizontal pt={pt} baseY={0} x1={0} x2={results.depthD1} label="D1" value={results.depthD1} offsetY={60} />
            )}
            {opts.showDepths && results?.depthD2 && (
                <DimHorizontal pt={pt} baseY={0} x1={0} x2={results.depthD2} label="D2 Rynna" value={results.depthD2} offsetY={85} />
            )}

            {/* Post dimensions */}
            {opts.showPostDimensions && results?.depthD4post && (
                <DimHorizontal pt={pt} baseY={0} x1={0} x2={results.depthD4post} label="D4 Słup" value={results.depthD4post} offsetY={110} color={DIM_COL.post} />
            )}
            {opts.showPostDimensions && results?.depthD5 && (
                <DimHorizontal pt={pt} baseY={0} x1={0} x2={results.depthD5} label="D5 Wolny" value={results.depthD5} offsetY={135} color={DIM_COL.post} />
            )}

            {/* Overhang */}
            {isUltraline && overhang > 0 && opts.showDepths && (
                <DimHorizontal pt={pt} baseY={h1 + 80} x1={legX} x2={endX} label="U1" value={overhang} offsetY={-25} color={theme.primary} />
            )}

            {/* Rafter (Sparren) - diagonal */}
            {opts.showRafters && results?.sparrenMitte && isSloped && (() => {
                const p1 = pt(0, h1);
                const p2 = pt(endX, h3);
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) return null;
                const nx = -dy / len * 30, ny = dx / len * 30;
                const mx = (p1.x + p2.x) / 2 + nx, my = (p1.y + p2.y) / 2 + ny;
                return (
                    <g>
                        <line x1={p1.x + nx} y1={p1.y + ny} x2={p2.x + nx} y2={p2.y + ny} stroke={DIM_COL.rafter} strokeWidth="1.5" strokeDasharray="6 3" />
                        <rect x={mx - 38} y={my - 13} width="76" height="26" fill="white" stroke={DIM_COL.rafter} strokeWidth="0.7" rx="6" filter="url(#dimShadow)" />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={DIM_COL.rafter}>S1: {Math.round(results.sparrenMitte!)}</text>
                    </g>
                );
            })()}

            {/* Angle α arc */}
            {opts.showAngles && results?.angleAlpha && isSloped && (() => {
                const c = pt(0, h1);
                const r = 45;
                const rad = results.angleAlpha * Math.PI / 180;
                const ex = r * Math.cos(-rad);
                const ey = r * Math.sin(-rad);
                return (
                    <g transform={`translate(${c.x + 40}, ${c.y + 30})`}>
                        <path d={`M ${r} 0 A ${r} ${r} 0 0 0 ${ex} ${ey}`} fill="none" stroke={DIM_COL.angle} strokeWidth="2" strokeDasharray="4 2" />
                        <rect x={r + 8} y="-15" width="65" height="22" fill="white" stroke={DIM_COL.angle} strokeWidth="0.7" rx="5" filter="url(#dimShadow)" />
                        <text x={r + 40} y="1" textAnchor="middle" fontSize="12" fontWeight="800" fill={DIM_COL.angle}>α = {results.angleAlpha.toFixed(1)}°</text>
                    </g>
                );
            })()}

            {/* β angle for flat/ultraline */}
            {opts.showAngles && (isUltraline || isFlat) && results?.angleBeta && (
                <g transform={`translate(${PAD.left + 25}, ${PAD.top + 25})`}>
                    <rect x="0" y="-14" width="90" height="24" fill="white" stroke={DIM_COL.angle} strokeWidth="0.7" rx="6" filter="url(#dimShadow)" />
                    <text x="45" y="2" textAnchor="middle" fontSize="12" fontWeight="800" fill={DIM_COL.angle}>β = {results.angleBeta.toFixed(1)}°</text>
                </g>
            )}

            {/* Info Panel */}
            {results && (
                <InfoPanel results={results} opts={opts} panelX={W - PAD.right - 150} panelY={PAD.top + 5} />
            )}

            {/* Legend */}
            <g transform={`translate(${PAD.left - 20}, ${H - 38})`}>
                <rect x="0" y="-12" width="420" height="30" fill="white" fillOpacity="0.95" stroke="#e2e8f0" rx="8" />
                {[
                    { c: DIM_COL.height, l: 'Wysokości' },
                    { c: DIM_COL.depth, l: 'Głębokości' },
                    { c: DIM_COL.post, l: 'Słupy' },
                    { c: DIM_COL.rafter, l: 'Krokwie' },
                    { c: theme.primary, l: theme.label },
                ].map((item, i) => (
                    <g key={i} transform={`translate(${i * 84 + 12}, 0)`}>
                        <circle cx="0" cy="3" r="5" fill={item.c} />
                        <text x="10" y="7" fontSize="10" fill="#334155" fontWeight="500">{item.l}</text>
                    </g>
                ))}
            </g>
        </svg>
    );
};

// ============================================================================
// FRONT VIEW COMPONENT
// ============================================================================

const FrontView: React.FC<{
    modelId: RoofModelId;
    inputs: DachrechnerInputs;
    results: DachrechnerResults | null;
    theme: typeof MODEL_THEMES[string];
    opts: DimensionOptions;
    details: typeof PROFILE_DETAILS[string];
}> = ({ modelId, inputs, results, theme, opts, details }) => {
    const model = ROOF_MODELS[modelId];
    const width = inputs.width || 5000;
    const posts = inputs.postCount || 2;
    const h3 = inputs.h3 || results?.h3 || 2250;
    const postWidth = model.postWidth;

    const totalPostWidth = posts * postWidth;
    const innerWidth = posts > 1 ? (width - totalPostWidth) / (posts - 1) : 0;

    const W = 1000, H = 780;
    const PAD = { left: 120, right: 120, top: 100, bottom: 160 };
    const DW = W - PAD.left - PAD.right;
    const DH = H - PAD.top - PAD.bottom;

    const maxH = h3 * 1.3;
    const maxW = width * 1.15;
    const scale = Math.min(DH / maxH, DW / maxW);

    const OX = PAD.left + (DW - width * scale) / 2;
    const OY = H - PAD.bottom;
    const pt: PtFn = (x, y) => ({ x: OX + x * scale, y: OY - y * scale });

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <SharedDefs theme={theme} />

            <rect x="0" y="0" width={W} height={H} fill="#fafbfc" rx="12" />

            {/* Title bar */}
            <rect x="0" y="0" width={W} height="75" fill="white" stroke="#e2e8f0" strokeWidth="1" />
            <circle cx="30" cy="38" r="16" fill={theme.primary} opacity="0.15" />
            <circle cx="30" cy="38" r="8" fill={theme.primary} />
            <text x="55" y="32" fontSize="17" fontWeight="800" fill="#1e293b">{theme.label} — Widok z frontu</text>
            <text x="55" y="50" fontSize="11" fill="#64748b">Słupek: {postWidth}mm × {posts} szt. | Rozstaw wewnętrzny: {Math.round(innerWidth)}mm</text>

            {/* Ground */}
            <Ground ox={OX - 30} dw={width * scale + 60} oy={OY} />

            {/* Posts */}
            {Array.from({ length: posts }).map((_, i) => {
                const x = i * (postWidth + innerWidth);
                const pBot = pt(x, 0);
                const pTop = pt(x, h3);
                const pW = Math.max(10, postWidth * scale);
                return (
                    <g key={i}>
                        <rect x={pBot.x} y={pTop.y} width={pW} height={pBot.y - pTop.y}
                            fill="url(#postGrad)" stroke={DIM_COL.struct} strokeWidth="1.5" rx="1" filter="url(#structShadow)" />
                        <rect x={pBot.x - 3} y={pBot.y - 6} width={pW + 6} height="6" fill="#94a3b8" stroke={DIM_COL.struct} rx="1" />
                        {/* Post width label */}
                        <text x={pBot.x + pW / 2} y={pBot.y - 12} textAnchor="middle" fontSize="8" fill="#64748b">{postWidth}</text>

                        {/* Inner width between posts */}
                        {i < posts - 1 && opts.showPostDimensions && (
                            <g>
                                {(() => {
                                    const p1 = pt(x + postWidth, h3 / 2);
                                    const p2 = pt(x + postWidth + innerWidth, h3 / 2);
                                    return (
                                        <g>
                                            <line x1={p1.x} y1={p1.y - 5} x2={p1.x} y2={p1.y + 5} stroke={DIM_COL.post} strokeWidth="1.5" />
                                            <line x1={p2.x} y1={p2.y - 5} x2={p2.x} y2={p2.y + 5} stroke={DIM_COL.post} strokeWidth="1.5" />
                                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={DIM_COL.post} strokeWidth="1.5" />
                                            <rect x={(p1.x + p2.x) / 2 - 35} y={p1.y - 12} width="70" height="24" fill="white" stroke={DIM_COL.post} strokeWidth="0.7" rx="5" filter="url(#dimShadow)" />
                                            <text x={(p1.x + p2.x) / 2} y={p1.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={DIM_COL.post}>
                                                {Math.round(innerWidth)}
                                            </text>
                                        </g>
                                    );
                                })()}
                            </g>
                        )}
                    </g>
                );
            })}

            {/* Beam / Roof bar at top */}
            {(() => {
                const p1 = pt(0, h3);
                const p2 = pt(width, h3);
                const barH = 20;
                return (
                    <g filter="url(#structShadow)">
                        <rect x={p1.x} y={p1.y - barH} width={p2.x - p1.x} height={barH}
                            fill="url(#roofGrad)" stroke={DIM_COL.struct} strokeWidth="1.5" rx="2" />
                    </g>
                );
            })()}

            {/* Total width dimension */}
            {opts.showPostDimensions && (
                <DimHorizontal pt={pt} baseY={0} x1={0} x2={width} label="Szerokość" value={width} offsetY={35} color={DIM_COL.post} />
            )}

            {/* Height H3 */}
            {opts.showHeights && (
                <DimVertical pt={pt} baseX={-200 / scale} y1={0} y2={h3} label="H3" value={h3} offsetX={-30} />
            )}

            {/* Legend */}
            <g transform={`translate(${PAD.left}, ${H - 38})`}>
                <rect x="0" y="-12" width="320" height="30" fill="white" fillOpacity="0.95" stroke="#e2e8f0" rx="8" />
                {[
                    { c: DIM_COL.height, l: 'Wysokości' },
                    { c: DIM_COL.post, l: 'Słupy / Szerokości' },
                    { c: theme.primary, l: theme.label },
                ].map((item, i) => (
                    <g key={i} transform={`translate(${i * 108 + 12}, 0)`}>
                        <circle cx="0" cy="3" r="5" fill={item.c} />
                        <text x="10" y="7" fontSize="10" fill="#334155" fontWeight="500">{item.l}</text>
                    </g>
                ))}
            </g>
        </svg>
    );
};
