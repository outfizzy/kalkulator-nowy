import React, { useMemo, useState } from 'react';
import type { Contract } from '../../types';
import { calculateDachrechner, type RoofModelId, type DachrechnerResults, ROOF_MODELS } from '../../services/dachrechner.service';

interface Props {
    contract: Contract;
}

// Map product modelId → Dachrechner model key
const MODEL_MAP: Record<string, RoofModelId> = {
    'orangestyle': 'orangeline',
    'orangestyle+': 'orangeline+',
    'trendstyle': 'trendline',
    'trendstyle+': 'trendline+',
    'topstyle': 'topline',
    'topstyle xl': 'topline_xl',
    'designstyle': 'designline',
    'designline': 'designline',
    'ultrastyle': 'ultraline_classic',
    'ultrastyle classic': 'ultraline_classic',
    'ultrastyle style': 'ultraline_style',
    'ultrastyle compact': 'ultraline_compact',
    'skystyle': 'skyline',
    'skystyle freistand': 'skyline_freistand',
    'carport': 'carport',
    'carport freistand': 'carport_freistand',
    // Configurator names
    'trendline': 'trendline',
    'trendline+': 'trendline+',
    'orangeline': 'orangeline',
    'orangeline+': 'orangeline+',
    'topline': 'topline',
    'topline xl': 'topline_xl',
    'ultraline': 'ultraline_classic',
    'skyline': 'skyline',
};

const fmt = (val: number | null, unit = 'mm'): string => {
    if (val === null || val === undefined) return '—';
    return `${Math.round(val)} ${unit}`;
};

const fmtDeg = (val: number | null): string => {
    if (val === null || val === undefined) return '—';
    return `${val.toFixed(1)}°`;
};

export const TechnicalDataPanel: React.FC<Props> = ({ contract }) => {
    const [expanded, setExpanded] = useState(false);
    const product = contract.product;

    // Resolve Dachrechner model
    const drModelId = useMemo<RoofModelId | null>(() => {
        const raw = (product.modelId || '').toLowerCase().trim();
        // Check freestanding
        const isFreestanding = product.installationType === 'freestanding';
        if (raw.includes('skyline') || raw.includes('skystyle')) {
            return isFreestanding ? 'skyline_freistand' : 'skyline';
        }
        if (raw.includes('carport')) {
            return isFreestanding ? 'carport_freistand' : 'carport';
        }
        return MODEL_MAP[raw] || null;
    }, [product.modelId, product.installationType]);

    // Calculate Dachrechner results
    const drResults = useMemo<DachrechnerResults | null>(() => {
        if (!drModelId || !product.projection) return null;
        try {
            return calculateDachrechner(drModelId, {
                h3: product.frontHeight || product.postsHeight || 2200,
                depth: product.projection,
                h1: product.rearHeight,
                width: product.width,
                overhang: undefined,
                postCount: product.numberOfPosts || product.customPostCount || 2,
            });
        } catch {
            return null;
        }
    }, [drModelId, product]);

    // LED calculations
    const ledCount = product.ledCount || 0;
    const numberOfFields = product.numberOfFields || product.moduleCount || 1;
    const totalLeds = ledCount * numberOfFields;
    const roofModel = drModelId ? ROOF_MODELS[drModelId] : null;

    // Addon summary
    const addons = product.addons || [];
    const accessories = product.selectedAccessories || [];

    if (!drResults && totalLeds === 0 && addons.length === 0) {
        return null; // Nothing to show
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            {/* Header */}
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Dane Techniczne / Dachrechner</h3>
                        <p className="text-[10px] text-slate-400">
                            {roofModel ? roofModel.name : product.modelId} • {product.width}×{product.projection}mm
                            {totalLeds > 0 && ` • ${totalLeds} LED`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Quick badges */}
                    {drResults?.angleAlpha && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                            ∠ {fmtDeg(drResults.angleAlpha)}
                        </span>
                    )}
                    {totalLeds > 0 && (
                        <span className="text-[10px] font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                            💡 {totalLeds} LED Spots
                        </span>
                    )}
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Collapsed Summary Row */}
            {!expanded && drResults && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {drResults.h3 !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">H3: {fmt(drResults.h3)}</span>
                    )}
                    {drResults.h1 !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">H1: {fmt(drResults.h1)}</span>
                    )}
                    {drResults.heightH2 !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">H2: {fmt(drResults.heightH2)}</span>
                    )}
                    {drResults.depthD2 !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">D2: {fmt(drResults.depthD2)}</span>
                    )}
                    {drResults.sparrenMitte !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">S1: {fmt(drResults.sparrenMitte)}</span>
                    )}
                    {drResults.fensterF1 !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">F1: {fmt(drResults.fensterF1)}</span>
                    )}
                    {drResults.fensterF2 !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">F2: {fmt(drResults.fensterF2)}</span>
                    )}
                </div>
            )}

            {/* Expanded Full View */}
            {expanded && (
                <div className="mt-5 space-y-5">
                    {/* ── Dachrechner Results ── */}
                    {drResults && (
                        <>
                            {/* Structural Heights */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">📐 Höhen / Wysokości</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <DataCard label="H3 (Vorne)" sublabel="Höhe Unterkante Rinne" value={fmt(drResults.h3)} highlight />
                                    <DataCard label="H1 (Hinten)" sublabel="Höhe Unterkante Wandprofil" value={fmt(drResults.h1)} highlight />
                                    <DataCard label="H2" sublabel="Oberkante Wandprofil" value={fmt(drResults.heightH2)} />
                                    {drResults.heightH2XL && (
                                        <DataCard label="H2 XL" sublabel="Oberkante XL-Variante" value={fmt(drResults.heightH2XL)} />
                                    )}
                                </div>
                            </div>

                            {/* Angles */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">📏 Neigung / Kąt nachylenia</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <DataCard label="α (Neigung)" sublabel="Dachneigung" value={fmtDeg(drResults.angleAlpha)} highlight />
                                    <DataCard label="Gefälle" sublabel="mm pro Meter" value={drResults.inclinationMmM ? `${Math.round(drResults.inclinationMmM)} mm/m` : '—'} />
                                    {drResults.angleBeta !== null && (
                                        <DataCard label="β (Glasneigung)" sublabel="Glaswinkel" value={fmtDeg(drResults.angleBeta)} />
                                    )}
                                </div>
                            </div>

                            {/* Depths */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">↔️ Tiefen / Głębokości</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <DataCard label="Bestelltiefe" sublabel="Eingabe" value={fmt(drResults.depth)} highlight />
                                    <DataCard label="D1" sublabel="Hinterkante Wandanschluss" value={fmt(drResults.depthD1)} />
                                    <DataCard label="D2" sublabel="mit Standard-Rinne" value={fmt(drResults.depthD2)} />
                                    {drResults.depthD3 !== null && <DataCard label="D3" sublabel="Rinne rund" value={fmt(drResults.depthD3)} />}
                                    {drResults.depthD4 !== null && <DataCard label="D4" sublabel="Rinne klassiek" value={fmt(drResults.depthD4)} />}
                                    <DataCard label="D2alt" sublabel="Zwischen Ständer/Wand" value={fmt(drResults.depthD2alt)} />
                                    <DataCard label="D4 Pfosten" sublabel="Tiefe bis Außenkante" value={fmt(drResults.depthD4post)} />
                                    {drResults.depthD5 !== null && <DataCard label="D5" sublabel="Freistand-Tiefe" value={fmt(drResults.depthD5)} />}
                                </div>
                            </div>

                            {/* Rafter Lengths */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">📦 Sparren / Krokwie</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <DataCard label="S1 Mitte" sublabel="Länge Sparren Mitte" value={fmt(drResults.sparrenMitte)} highlight />
                                    {drResults.sparrenAussen !== null && (
                                        <DataCard label="S1 Außen" sublabel="Länge Sparren Außen" value={fmt(drResults.sparrenAussen)} />
                                    )}
                                </div>
                            </div>

                            {/* Window/Wall Dimensions */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">🪟 Fenster / Wymiary okien i ścian</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <DataCard label="F1" sublabel="Höhe Rinnenseite" value={fmt(drResults.fensterF1)} highlight />
                                    <DataCard label="F2" sublabel="Breite (Tiefe Wnęka)" value={fmt(drResults.fensterF2)} highlight />
                                    {drResults.fensterF3 !== null && (
                                        <DataCard label="F3" sublabel="Höhe Hausseite" value={fmt(drResults.fensterF3)} />
                                    )}
                                    {drResults.keilhoeheK1 !== null && (
                                        <DataCard label="K1" sublabel="Keilhöhe Rinne" value={fmt(drResults.keilhoeheK1)} />
                                    )}
                                    {drResults.keilhoeheK2 !== null && (
                                        <DataCard label="K2" sublabel="Keilhöhe Haus" value={fmt(drResults.keilhoeheK2)} />
                                    )}
                                    {drResults.innerWidth !== null && (
                                        <DataCard label="Innenbreite" sublabel="Zwischen Pfosten" value={fmt(drResults.innerWidth)} highlight />
                                    )}
                                </div>
                            </div>

                            {/* Post Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">🏗️ Pfosten / Słupy</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <DataCard label="Pfostenbreite" sublabel="Pfostengröße" value={fmt(drResults.postWidth)} />
                                    <DataCard label="Pfosten Anzahl" sublabel="Anzahl" value={`${product.numberOfPosts || product.customPostCount || 2}`} />
                                    {product.numberOfFields && (
                                        <DataCard label="Felder" sublabel="Sektionen" value={`${product.numberOfFields}`} />
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── LED Configuration ── */}
                    {totalLeds > 0 && (
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">💡 LED Spots</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <DataCard label="Spots pro Feld" sublabel="Per Rafter" value={`${ledCount}`} highlight />
                                <DataCard label="Anzahl Felder" sublabel="Sektionen" value={`${numberOfFields}`} />
                                <DataCard label="Gesamt LED" sublabel="Total" value={`${totalLeds} Spots`} highlight />
                            </div>
                        </div>
                    )}

                    {/* ── Addons Summary ── */}
                    {addons.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">🧩 Zusätze / Dodatki</h4>
                            <div className="space-y-1.5">
                                {addons.map((addon, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-slate-700">{addon.name}</span>
                                            {addon.variant && <span className="text-[10px] text-slate-400 ml-2">({addon.variant})</span>}
                                            {(addon as any).quantity && (addon as any).quantity > 1 && (
                                                <span className="text-[10px] font-bold text-slate-500 ml-1">×{(addon as any).quantity}</span>
                                            )}
                                            {(addon as any).width && (addon as any).height && (
                                                <span className="text-[10px] text-blue-500 ml-2 font-mono">
                                                    {(addon as any).width}×{(addon as any).height}mm
                                                </span>
                                            )}
                                            {(addon as any).side && (
                                                <span className="text-[10px] text-purple-500 ml-2">
                                                    {(addon as any).side === 'left' ? '← Links' : (addon as any).side === 'right' ? 'Rechts →' : '⬆ Vorne'}
                                                </span>
                                            )}
                                        </div>
                                        {addon.price > 0 && (
                                            <span className="text-xs font-bold text-slate-600">
                                                {addon.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Accessories Summary ── */}
                    {accessories.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">⚙️ Zubehör / Akcesoria</h4>
                            <div className="space-y-1.5">
                                {accessories.map((acc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-xs text-slate-700">
                                            {acc.quantity > 1 && <strong>{acc.quantity}× </strong>}
                                            {acc.name}
                                        </span>
                                        <span className="text-xs font-bold text-slate-600">
                                            {(acc.price * acc.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Quick Ref: Copy for Order ── */}
                    {drResults && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <button
                                onClick={() => {
                                    const lines = [
                                        `Model: ${product.modelId}`,
                                        `Breite: ${product.width}mm × Tiefe: ${product.projection}mm`,
                                        drResults.h3 ? `H3: ${Math.round(drResults.h3)}mm` : '',
                                        drResults.h1 ? `H1: ${Math.round(drResults.h1)}mm` : '',
                                        drResults.heightH2 ? `H2: ${Math.round(drResults.heightH2)}mm` : '',
                                        drResults.angleAlpha ? `Neigung: ${drResults.angleAlpha.toFixed(1)}°` : '',
                                        drResults.depthD2 ? `D2: ${Math.round(drResults.depthD2)}mm` : '',
                                        drResults.sparrenMitte ? `Sparren: ${Math.round(drResults.sparrenMitte)}mm` : '',
                                        drResults.fensterF1 ? `F1: ${Math.round(drResults.fensterF1)}mm` : '',
                                        drResults.fensterF2 ? `F2: ${Math.round(drResults.fensterF2)}mm` : '',
                                        `Pfosten: ${product.numberOfPosts || 2}, Breite: ${drResults.postWidth}mm`,
                                        totalLeds > 0 ? `LED: ${totalLeds} Spots (${ledCount}×${numberOfFields})` : '',
                                        `Farbe: ${product.color}`,
                                    ].filter(Boolean).join('\n');
                                    navigator.clipboard.writeText(lines);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                            >
                                📋 Wszystkie wymiary → Schowek
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Small Data Card Component ──
const DataCard: React.FC<{ label: string; sublabel: string; value: string; highlight?: boolean }> = ({ label, sublabel, value, highlight }) => (
    <div className={`p-2.5 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="text-[10px] font-bold text-slate-500 uppercase">{label}</div>
        <div className={`text-sm font-bold mt-0.5 font-mono ${highlight ? 'text-blue-800' : 'text-slate-800'}`}>{value}</div>
        <div className="text-[9px] text-slate-400 mt-0.5">{sublabel}</div>
    </div>
);
