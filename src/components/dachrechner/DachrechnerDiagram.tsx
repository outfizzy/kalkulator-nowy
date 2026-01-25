import React from 'react';
import { ROOF_MODELS, type RoofModelId, type DachrechnerInputs, type DachrechnerResults } from '../../services/dachrechner.service';

interface DimensionOptions {
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
}

export const DachrechnerDiagram: React.FC<DachrechnerDiagramProps> = ({ modelId, inputs, results, options }) => {
    const model = ROOF_MODELS[modelId];
    const cat = model.category;

    const opts: DimensionOptions = options || {
        showHeights: true, showDepths: true, showRafters: true,
        showWindows: true, showWedges: true, showAngles: true, showPostDimensions: true,
    };

    const isFreestanding = cat === 'flat_freestanding' || cat === 'carport_freestanding';
    const isFlat = cat === 'flat' || cat === 'flat_freestanding' || cat === 'carport' || cat === 'carport_freestanding';
    const isUltraline = cat === 'ultraline' || cat === 'ultraline_compact';
    const isSloped = !isFlat && !isUltraline;

    const h3 = inputs.h3 || results?.h3 || 2250;
    const depth = inputs.depth || 5000;
    const h1 = inputs.h1 || results?.h1 || (isFlat ? h3 : 2800);
    const overhang = inputs.overhang || results?.overhang || 0;

    // Canvas - increased size for better spacing
    const W = 980, H = 750;
    const PAD = { left: 170, right: 130, top: 90, bottom: 150 };
    const DW = W - PAD.left - PAD.right;
    const DH = H - PAD.top - PAD.bottom;

    const maxH = Math.max(h1, h3) * 1.2;
    const maxW = depth * 1.2;
    const scale = Math.min(DH / maxH, DW / maxW);

    const OX = PAD.left;
    const OY = H - PAD.bottom;

    const pt = (x: number, y: number) => ({ x: OX + x * scale, y: OY - y * scale });

    // Colors
    const COL = {
        height: '#7c3aed',
        depth: '#0891b2',
        post: '#2563eb',
        rafter: '#f97316',
        angle: '#dc2626',
        window: '#0d9488',
        wedge: '#d97706',
        struct: '#334155',
    };

    const legX = depth - overhang;
    const endX = depth;

    // Vertical dimension - improved positioning
    const DimV = ({ baseX, y1, y2, label, value, offsetX }: {
        baseX: number, y1: number, y2: number, label: string, value: number, offsetX: number
    }) => {
        const p1 = pt(baseX, y1);
        const p2 = pt(baseX, y2);
        const lx = p1.x + offsetX;
        const ty = (p1.y + p2.y) / 2;
        const isLeft = offsetX < 0;

        return (
            <g>
                <line x1={p1.x} y1={p1.y} x2={lx} y2={p1.y} stroke={COL.height} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.4" />
                <line x1={p2.x} y1={p2.y} x2={lx} y2={p2.y} stroke={COL.height} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.4" />
                <line x1={lx} y1={p1.y} x2={lx} y2={p2.y} stroke={COL.height} strokeWidth="1.5" />
                <polygon points={`${lx - 3},${p1.y + 7} ${lx},${p1.y} ${lx + 3},${p1.y + 7}`} fill={COL.height} />
                <polygon points={`${lx - 3},${p2.y - 7} ${lx},${p2.y} ${lx + 3},${p2.y - 7}`} fill={COL.height} />
                <rect x={isLeft ? lx - 52 : lx + 4} y={ty - 16} width="48" height="32" fill="white" stroke={COL.height} strokeWidth="0.5" rx="4" />
                <text x={isLeft ? lx - 28 : lx + 28} y={ty - 2} textAnchor="middle" fontSize="11" fontWeight="bold" fill={COL.height}>{label}</text>
                <text x={isLeft ? lx - 28 : lx + 28} y={ty + 12} textAnchor="middle" fontSize="10" fill={COL.height}>{Math.round(value)}</text>
            </g>
        );
    };

    // Horizontal dimension - improved positioning with dynamic Y offset
    const DimH = ({ baseY, x1, x2, label, value, offsetY, color = COL.depth }: {
        baseY: number, x1: number, x2: number, label: string, value: number, offsetY: number, color?: string
    }) => {
        const p1 = pt(x1, baseY);
        const p2 = pt(x2, baseY);
        const ly = p1.y + offsetY;
        const tx = (p1.x + p2.x) / 2;
        const labelWidth = label.length * 7 + 50;

        return (
            <g>
                <line x1={p1.x} y1={p1.y} x2={p1.x} y2={ly} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.4" />
                <line x1={p2.x} y1={p2.y} x2={p2.x} y2={ly} stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.4" />
                <line x1={p1.x} y1={ly} x2={p2.x} y2={ly} stroke={color} strokeWidth="1.5" />
                <polygon points={`${p1.x + 7},${ly - 3} ${p1.x},${ly} ${p1.x + 7},${ly + 3}`} fill={color} />
                <polygon points={`${p2.x - 7},${ly - 3} ${p2.x},${ly} ${p2.x - 7},${ly + 3}`} fill={color} />
                <rect x={tx - labelWidth / 2} y={ly - 10} width={labelWidth} height="20" fill="white" stroke={color} strokeWidth="0.5" rx="4" />
                <text x={tx} y={ly + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill={color}>{label}: {Math.round(value)}</text>
            </g>
        );
    };

    // Sparren diagonal
    const SparrenDim = () => {
        if (!opts.showRafters || !results?.sparrenMitte || isFlat || isUltraline) return null;
        const p1 = pt(0, h1);
        const p2 = pt(endX, h3);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;
        const nx = -dy / len * 35, ny = dx / len * 35;
        const mx = (p1.x + p2.x) / 2 + nx, my = (p1.y + p2.y) / 2 + ny;

        return (
            <g>
                <line x1={p1.x + nx} y1={p1.y + ny} x2={p2.x + nx} y2={p2.y + ny} stroke={COL.rafter} strokeWidth="1.5" />
                <rect x={mx - 32} y={my - 12} width="64" height="24" fill="white" stroke={COL.rafter} strokeWidth="0.5" rx="4" />
                <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill={COL.rafter}>S1: {Math.round(results.sparrenMitte)}</text>
            </g>
        );
    };

    // Angle arc - positioned clearly away from structure
    const AngleArc = () => {
        if (!opts.showAngles || !results?.angleAlpha || isFlat || isUltraline) return null;
        const c = pt(0, h1);
        const r = 45;
        const rad = results.angleAlpha * Math.PI / 180;
        const arcEndX = r * Math.cos(-rad);
        const arcEndY = r * Math.sin(-rad);

        // Position the label outside the arc
        const labelX = r + 30;
        const labelY = -15;

        return (
            <g transform={`translate(${c.x + 40}, ${c.y + 35})`}>
                {/* Arc path */}
                <path
                    d={`M ${r} 0 A ${r} ${r} 0 0 0 ${arcEndX} ${arcEndY}`}
                    fill="none"
                    stroke={COL.angle}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                />
                {/* Angle label with background */}
                <rect x={labelX - 5} y={labelY - 12} width="60" height="20" fill="white" stroke={COL.angle} strokeWidth="0.5" rx="4" />
                <text x={labelX + 25} y={labelY + 2} textAnchor="middle" fontSize="12" fontWeight="bold" fill={COL.angle}>α = {results.angleAlpha.toFixed(1)}°</text>
            </g>
        );
    };

    // Info panel for window/wedge dimensions - positioned in top-right corner
    // Uses wider layout with proper label/value separation
    const InfoPanel = () => {
        const items: Array<{ label: string, value: number, color: string }> = [];

        if (opts.showWindows && results) {
            if (results.fensterF1) items.push({ label: 'F1 Rinne', value: results.fensterF1, color: COL.window });
            if (results.fensterF2) items.push({ label: 'F2 Breite', value: results.fensterF2, color: COL.window });
            if (results.fensterF3) items.push({ label: 'F3 Haus', value: results.fensterF3, color: COL.window });
        }

        if (opts.showWedges && results) {
            if (results.keilhoeheK1) items.push({ label: 'K1 Rinne', value: results.keilhoeheK1, color: COL.wedge });
            if (results.keilhoeheK2) items.push({ label: 'K2 Haus', value: results.keilhoeheK2, color: COL.wedge });
        }

        if (items.length === 0) return null;

        const panelWidth = 120;
        const rowHeight = 20;
        const panelHeight = items.length * rowHeight + 14;

        return (
            <g transform={`translate(${W - PAD.right - panelWidth + 50}, ${PAD.top})`}>
                <rect x="0" y="0" width={panelWidth} height={panelHeight} fill="white" stroke="#e2e8f0" strokeWidth="1" rx="6" />
                <text x={panelWidth / 2} y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#64748b">WYMIARY</text>
                {items.map((item, i) => (
                    <g key={i} transform={`translate(8, ${i * rowHeight + 28})`}>
                        <circle cx="0" cy="-3" r="4" fill={item.color} />
                        <text x="12" y="0" fontSize="10" fill="#334155">{item.label}</text>
                        <text x={panelWidth - 16} y="0" textAnchor="end" fontSize="10" fontWeight="bold" fill={item.color}>{Math.round(item.value)}</text>
                    </g>
                ))}
            </g>
        );
    };

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <defs>
                <pattern id="ground" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="12" stroke="#94a3b8" strokeWidth="1" />
                </pattern>
                <pattern id="wall" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
                <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7dd3fc" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="postGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
            </defs>

            <rect x="0" y="0" width={W} height={H} fill="#f8fafc" />

            {/* Title */}
            <text x={W / 2} y="35" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1e293b">{model.name}</text>
            <text x={W / 2} y="55" textAnchor="middle" fontSize="11" fill="#64748b">
                {isSloped ? 'Dach skośny przyścienny' : isUltraline ? 'Ultraline - spadek wewnętrzny' : isFreestanding ? 'Dach płaski wolnostojący' : 'Dach płaski przyścienny'}
            </text>

            {/* Ground */}
            <rect x={OX - 30} y={OY} width={DW + 60} height="15" fill="url(#ground)" opacity="0.6" />
            <line x1={OX - 30} y1={OY} x2={OX + DW + 30} y2={OY} stroke={COL.struct} strokeWidth="3" />

            {/* Wall */}
            {!isFreestanding && (
                <g>
                    <rect x={pt(0, 0).x - 22} y={pt(0, h1 + 300).y} width="22" height={pt(0, 0).y - pt(0, h1 + 300).y} fill="url(#wall)" />
                    <line x1={pt(0, 0).x} y1={pt(0, 0).y} x2={pt(0, h1 + 300).x} y2={pt(0, h1 + 300).y} stroke={COL.struct} strokeWidth="4" />
                </g>
            )}

            {/* Left Post (freestanding) */}
            {isFreestanding && (
                <g>
                    <rect x={pt(0, 0).x} y={pt(0, h1).y} width={15} height={h1 * scale} fill="url(#postGrad)" stroke={COL.struct} strokeWidth="1.5" />
                    <rect x={pt(0, 0).x - 8} y={pt(0, 0).y} width={31} height="8" fill={COL.struct} rx="2" />
                </g>
            )}

            {/* Right Post */}
            <g>
                <rect x={pt(legX, 0).x - 15} y={pt(legX, h3).y} width={15} height={h3 * scale} fill="url(#postGrad)" stroke={COL.struct} strokeWidth="1.5" />
                <rect x={pt(legX, 0).x - 23} y={pt(legX, 0).y} width={31} height="8" fill={COL.struct} rx="2" />
            </g>

            {/* Roof */}
            <g>
                {isSloped ? (
                    <>
                        <polygon
                            points={`${pt(0, h1).x},${pt(0, h1).y} ${pt(endX, h3).x},${pt(endX, h3).y} ${pt(endX, h3 + 100).x},${pt(endX, h3 + 100).y} ${pt(0, h1 + 100).x},${pt(0, h1 + 100).y}`}
                            fill="url(#roofGrad)" stroke="#0ea5e9" strokeWidth="2"
                        />
                        <rect x={pt(endX - 90, h3).x} y={pt(endX, h3 - 20).y} width={90 * scale} height={70 * scale} fill="#94a3b8" stroke={COL.struct} rx="3" />
                    </>
                ) : (
                    <>
                        <rect x={pt(0, h1).x} y={pt(0, h1 + 130).y} width={endX * scale} height={130 * scale} fill="url(#roofGrad)" stroke="#0ea5e9" strokeWidth="2" rx="3" />
                        {isUltraline && (
                            <line x1={pt(80, h1 + 15).x} y1={pt(80, h1 + 15).y} x2={pt(endX - 80, h1 - 60).x} y2={pt(endX - 80, h1 - 60).y} stroke="#7dd3fc" strokeWidth="2" strokeDasharray="6 3" />
                        )}
                    </>
                )}
            </g>

            {/* ===== DIMENSIONS - with better spacing ===== */}

            {/* Heights - LEFT side, staggered offsets */}
            {opts.showHeights && isSloped && !isFreestanding && (
                <DimV baseX={0} y1={0} y2={h1} label="H1" value={h1} offsetX={-60} />
            )}
            {opts.showHeights && results?.heightH2 && !isFlat && (
                <DimV baseX={0} y1={0} y2={results.heightH2} label="H2" value={results.heightH2} offsetX={-120} />
            )}

            {/* H3 - RIGHT side */}
            {opts.showHeights && (
                <DimV baseX={legX} y1={0} y2={h3} label="H3" value={h3} offsetX={60} />
            )}

            {/* Depths - BOTTOM, well-spaced Y offsets to prevent overlap */}
            {opts.showDepths && (
                <DimH baseY={0} x1={0} x2={endX} label="Tiefe" value={depth} offsetY={35} />
            )}
            {opts.showDepths && results?.depthD1 && (
                <DimH baseY={0} x1={0} x2={results.depthD1} label="D1" value={results.depthD1} offsetY={60} />
            )}

            {/* Post dimensions - clearly separated */}
            {opts.showPostDimensions && results?.depthD4post && (
                <DimH baseY={0} x1={0} x2={results.depthD4post} label="D4 Słup" value={results.depthD4post} offsetY={85} color={COL.post} />
            )}
            {opts.showPostDimensions && results?.depthD5 && (
                <DimH baseY={0} x1={0} x2={results.depthD5} label="D5 Wolny" value={results.depthD5} offsetY={110} color={COL.post} />
            )}

            {/* Overhang */}
            {isUltraline && overhang > 0 && opts.showDepths && (
                <DimH baseY={h1 + 150} x1={legX} x2={endX} label="U1" value={overhang} offsetY={-30} />
            )}

            {/* Sparren */}
            <SparrenDim />

            {/* Angle */}
            <AngleArc />

            {/* Beta angle */}
            {opts.showAngles && (isUltraline || isFlat) && results?.angleBeta && (
                <g transform={`translate(${PAD.left + 20}, ${PAD.top + 30})`}>
                    <rect x="0" y="-14" width="80" height="22" fill="white" stroke={COL.angle} strokeWidth="0.5" rx="4" />
                    <text x="40" y="2" textAnchor="middle" fontSize="12" fontWeight="bold" fill={COL.angle}>β = {results.angleBeta.toFixed(1)}°</text>
                </g>
            )}

            {/* Info Panel */}
            <InfoPanel />

            {/* Legend - bottom left */}
            <g transform={`translate(${PAD.left}, ${H - 40})`}>
                <rect x="-10" y="-15" width="350" height="35" fill="white" fillOpacity="0.9" stroke="#e2e8f0" rx="6" />
                <circle cx="10" cy="3" r="5" fill={COL.height} /><text x="22" y="7" fontSize="10" fill="#334155">Wysokości</text>
                <circle cx="95" cy="3" r="5" fill={COL.depth} /><text x="107" y="7" fontSize="10" fill="#334155">Głębokości</text>
                <circle cx="190" cy="3" r="5" fill={COL.post} /><text x="202" y="7" fontSize="10" fill="#334155">Ze/Bez słupa</text>
                <circle cx="290" cy="3" r="5" fill={COL.rafter} /><text x="302" y="7" fontSize="10" fill="#334155">Krokwie</text>
            </g>
        </svg>
    );
};
