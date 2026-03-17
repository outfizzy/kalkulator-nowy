import React, { useState, useMemo, useEffect } from 'react';
import type { Contract } from '../../types';
import { calculateDachrechner, ROOF_MODELS, type RoofModelId, type DachrechnerResults, type DachrechnerInputs } from '../../services/dachrechner.service';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Props {
    contract: Contract;
    onContractUpdate: (contract: Contract) => void;
}

// All available models for the selector
const MODEL_OPTIONS: { id: RoofModelId; label: string; group: string }[] = [
    { id: 'orangeline', label: 'Orangestyle', group: 'Standard' },
    { id: 'orangeline+', label: 'Orangestyle+', group: 'Standard' },
    { id: 'trendline', label: 'Trendstyle', group: 'Standard' },
    { id: 'trendline+', label: 'Trendstyle+', group: 'Standard' },
    { id: 'topline', label: 'Topstyle', group: 'Premium' },
    { id: 'topline_xl', label: 'Topstyle XL', group: 'Premium' },
    { id: 'designline', label: 'Designstyle', group: 'Premium' },
    { id: 'ultraline_classic', label: 'Ultrastyle Classic', group: 'Ultraline' },
    { id: 'ultraline_style', label: 'Ultrastyle Style', group: 'Ultraline' },
    { id: 'ultraline_compact', label: 'Ultrastyle Compact', group: 'Ultraline' },
    { id: 'skyline', label: 'Skystyle', group: 'Flat' },
    { id: 'skyline_freistand', label: 'Skystyle Freistand', group: 'Flat' },
    { id: 'carport', label: 'Carport', group: 'Flat' },
    { id: 'carport_freistand', label: 'Carport Freistand', group: 'Flat' },
];

// Map contract modelId → Dachrechner model key
function resolveModelId(contractModelId: string): RoofModelId {
    const raw = (contractModelId || '').toLowerCase().trim();
    const map: Record<string, RoofModelId> = {
        'orangestyle': 'orangeline', 'orangestyle+': 'orangeline+',
        'trendstyle': 'trendline', 'trendstyle+': 'trendline+',
        'topstyle': 'topline', 'topstyle xl': 'topline_xl',
        'designstyle': 'designline', 'designline': 'designline',
        'ultrastyle': 'ultraline_classic', 'ultrastyle classic': 'ultraline_classic',
        'ultrastyle style': 'ultraline_style', 'ultrastyle compact': 'ultraline_compact',
        'skystyle': 'skyline', 'carport': 'carport',
        'trendline': 'trendline', 'trendline+': 'trendline+',
        'orangeline': 'orangeline', 'orangeline+': 'orangeline+',
        'topline': 'topline', 'topline xl': 'topline_xl',
        'ultraline': 'ultraline_classic', 'skyline': 'skyline',
    };
    return map[raw] || 'trendline';
}

const fmt = (v: number | null, unit = 'mm'): string =>
    v === null || v === undefined ? '—' : `${Math.round(v)} ${unit}`;
const fmtDeg = (v: number | null): string =>
    v === null || v === undefined ? '—' : `${v.toFixed(1)}°`;

export const ContractDachrechnerModule: React.FC<Props> = ({ contract, onContractUpdate }) => {
    const { currentUser } = useAuth();
    const [expanded, setExpanded] = useState(false);
    const [saving, setSaving] = useState(false);

    // ── Determine initial values from saved data or from contract product ──
    const savedData = contract.dachrechnerData;
    const product = contract.product;

    const initialModelId = savedData?.modelId
        ? savedData.modelId as RoofModelId
        : resolveModelId(product.modelId);

    const [modelId, setModelId] = useState<RoofModelId>(initialModelId);
    const [h3, setH3] = useState<number>(savedData?.inputs?.h3 ?? product.frontHeight ?? product.postsHeight ?? 2200);
    const [depth, setDepth] = useState<number>(savedData?.inputs?.depth ?? product.projection ?? 3000);
    const [h1, setH1] = useState<number>(savedData?.inputs?.h1 ?? product.rearHeight ?? 2700);
    const [overhang, setOverhang] = useState<number>(savedData?.inputs?.overhang ?? 300);
    const [width, setWidth] = useState<number>(savedData?.inputs?.width ?? product.width ?? 4000);
    const [postCount, setPostCount] = useState<number>(savedData?.inputs?.postCount ?? product.numberOfPosts ?? product.customPostCount ?? 2);

    // Track which inputs this model needs
    const modelDef = ROOF_MODELS[modelId];
    const requiredInputs = modelDef?.inputs || ['h3', 'depth', 'h1'];

    // ── Live Dachrechner calculation ──
    const results = useMemo<DachrechnerResults | null>(() => {
        if (!depth) return null;
        try {
            const inputs: DachrechnerInputs = {
                h3: requiredInputs.includes('h3') ? h3 : undefined,
                depth,
                h1: requiredInputs.includes('h1') ? h1 : undefined,
                overhang: requiredInputs.includes('overhang') ? overhang : undefined,
                width: width || undefined,
                postCount: postCount || undefined,
            };
            return calculateDachrechner(modelId, inputs);
        } catch (e) {
            console.warn('Dachrechner calc error:', e);
            return null;
        }
    }, [modelId, h3, depth, h1, overhang, width, postCount, requiredInputs]);

    // ── LED calc from product ──
    const ledCount = product.ledCount || 0;
    const numberOfFields = product.numberOfFields || product.moduleCount || 1;
    const totalLeds = ledCount * numberOfFields;

    // ── Save to Contract ──
    const handleSave = async () => {
        if (!results) return;
        setSaving(true);
        try {
            const dachrechnerData = {
                modelId,
                inputs: {
                    h3: requiredInputs.includes('h3') ? h3 : undefined,
                    depth,
                    h1: requiredInputs.includes('h1') ? h1 : undefined,
                    overhang: requiredInputs.includes('overhang') ? overhang : undefined,
                    width,
                    postCount,
                },
                results: results as any,
                savedAt: new Date().toISOString(),
                savedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : undefined,
            };
            const updated = { ...contract, dachrechnerData };
            await DatabaseService.updateContract(contract.id, updated as any);
            onContractUpdate(updated);
            toast.success('Dane Dachrechner zapisane do umowy');
        } catch {
            toast.error('Błąd zapisu Dachrechner');
        } finally {
            setSaving(false);
        }
    };

    // ── Copy all to clipboard ──
    const handleCopyAll = () => {
        if (!results) return;
        const lines = [
            `Model: ${modelDef?.name || modelId}`,
            `Breite: ${width}mm × Tiefe: ${depth}mm`,
            results.h3 !== null ? `H3: ${Math.round(results.h3)}mm` : '',
            results.h1 !== null ? `H1: ${Math.round(results.h1)}mm` : '',
            results.heightH2 !== null ? `H2: ${Math.round(results.heightH2)}mm` : '',
            results.angleAlpha !== null ? `Neigung α: ${results.angleAlpha.toFixed(1)}°` : '',
            results.inclinationMmM !== null ? `Gefälle: ${Math.round(results.inclinationMmM)} mm/m` : '',
            results.depthD1 !== null ? `D1: ${Math.round(results.depthD1)}mm` : '',
            results.depthD2 !== null ? `D2: ${Math.round(results.depthD2)}mm` : '',
            results.depthD2alt !== null ? `D2alt: ${Math.round(results.depthD2alt)}mm` : '',
            results.depthD4post !== null ? `D4 Pfosten: ${Math.round(results.depthD4post)}mm` : '',
            results.sparrenMitte !== null ? `S1 Mitte: ${Math.round(results.sparrenMitte)}mm` : '',
            results.sparrenAussen !== null ? `S1 Außen: ${Math.round(results.sparrenAussen)}mm` : '',
            results.fensterF1 !== null ? `F1: ${Math.round(results.fensterF1)}mm` : '',
            results.fensterF2 !== null ? `F2: ${Math.round(results.fensterF2)}mm` : '',
            results.fensterF3 !== null ? `F3: ${Math.round(results.fensterF3)}mm` : '',
            results.keilhoeheK1 !== null ? `K1: ${Math.round(results.keilhoeheK1)}mm` : '',
            results.keilhoeheK2 !== null ? `K2: ${Math.round(results.keilhoeheK2)}mm` : '',
            results.innerWidth !== null ? `Innenbreite: ${Math.round(results.innerWidth)}mm` : '',
            `Pfosten: ${postCount}, Breite: ${results.postWidth}mm`,
            totalLeds > 0 ? `LED: ${totalLeds} Spots (${ledCount}×${numberOfFields})` : '',
        ].filter(Boolean).join('\n');
        navigator.clipboard.writeText(lines);
        toast.success('Wymiary skopiowane do schowka');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-6 overflow-hidden">
            {/* ── Header ── */}
            <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-sm">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">📐 Dachrechner — Kalkulator Konstrukcji</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {modelDef?.name || modelId} • {width}×{depth}mm
                            {results?.angleAlpha && ` • ∠${results.angleAlpha.toFixed(1)}°`}
                            {totalLeds > 0 && ` • 💡 ${totalLeds} LED`}
                            {savedData && (
                                <span className="ml-2 text-green-600">✓ Zapisane {new Date(savedData.savedAt).toLocaleDateString('de-DE')}</span>
                            )}
                        </p>
                    </div>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* ── Collapsed Quick View ── */}
            {!expanded && results && (
                <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                    {results.h3 !== null && <Badge label="H3" value={fmt(results.h3)} />}
                    {results.h1 !== null && <Badge label="H1" value={fmt(results.h1)} />}
                    {results.heightH2 !== null && <Badge label="H2" value={fmt(results.heightH2)} />}
                    {results.angleAlpha !== null && <Badge label="∠α" value={fmtDeg(results.angleAlpha)} color="blue" />}
                    {results.depthD2 !== null && <Badge label="D2" value={fmt(results.depthD2)} />}
                    {results.sparrenMitte !== null && <Badge label="S1" value={fmt(results.sparrenMitte)} />}
                    {results.fensterF1 !== null && <Badge label="F1" value={fmt(results.fensterF1)} />}
                    {results.fensterF2 !== null && <Badge label="F2" value={fmt(results.fensterF2)} />}
                    {results.innerWidth !== null && <Badge label="Innen" value={fmt(results.innerWidth)} color="indigo" />}
                    {totalLeds > 0 && <Badge label="LED" value={`${totalLeds}`} color="yellow" />}
                </div>
            )}

            {/* ── Expanded: Full Calculator ── */}
            {expanded && (
                <div className="border-t border-slate-200">
                    {/* Input Section */}
                    <div className="p-5 bg-gradient-to-b from-slate-50 to-white">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">⚙️ Eingaben / Dane wejściowe</h4>
                            <div className="flex gap-2">
                                <button onClick={handleCopyAll} disabled={!results} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-300 flex items-center gap-1">
                                    📋 Kopiuj wymiary
                                </button>
                                <button onClick={handleSave} disabled={saving || !results} className="text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-300 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                                    {saving ? '⏳' : '💾'} {saving ? 'Zapisywanie...' : 'Zapisz do Umowy'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {/* Model Selector */}
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Model</label>
                                <select
                                    value={modelId}
                                    onChange={e => setModelId(e.target.value as RoofModelId)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                                >
                                    {['Standard', 'Premium', 'Ultraline', 'Flat'].map(group => (
                                        <optgroup key={group} label={group}>
                                            {MODEL_OPTIONS.filter(m => m.group === group).map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            {/* Width */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Breite / Szer. (mm)</label>
                                <input type="number" value={width} onChange={e => setWidth(parseInt(e.target.value) || 0)} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono" />
                            </div>

                            {/* Depth */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Tiefe / Głęb. (mm) <span className="text-red-400">*</span>
                                </label>
                                <input type="number" value={depth} onChange={e => setDepth(parseInt(e.target.value) || 0)} className="w-full p-2 border border-blue-300 bg-blue-50 rounded-lg text-sm font-mono font-bold" />
                            </div>

                            {/* H3 — if needed */}
                            {requiredInputs.includes('h3') && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        H3 Vorne (mm) <span className="text-red-400">*</span>
                                    </label>
                                    <input type="number" value={h3} onChange={e => setH3(parseInt(e.target.value) || 0)} className="w-full p-2 border border-blue-300 bg-blue-50 rounded-lg text-sm font-mono font-bold" />
                                </div>
                            )}

                            {/* H1 — if needed */}
                            {requiredInputs.includes('h1') && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        H1 Hinten (mm) <span className="text-red-400">*</span>
                                    </label>
                                    <input type="number" value={h1} onChange={e => setH1(parseInt(e.target.value) || 0)} className="w-full p-2 border border-blue-300 bg-blue-50 rounded-lg text-sm font-mono font-bold" />
                                </div>
                            )}

                            {/* Overhang — if needed (Ultraline) */}
                            {requiredInputs.includes('overhang') && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        Überstand U1 (mm) <span className="text-red-400">*</span>
                                    </label>
                                    <input type="number" value={overhang} onChange={e => setOverhang(parseInt(e.target.value) || 0)} className="w-full p-2 border border-blue-300 bg-blue-50 rounded-lg text-sm font-mono font-bold" />
                                </div>
                            )}

                            {/* Post Count */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pfosten / Słupy</label>
                                <input type="number" min={2} max={10} value={postCount} onChange={e => setPostCount(parseInt(e.target.value) || 2)} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono" />
                            </div>
                        </div>

                        {/* Model info hint */}
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>ℹ️</span>
                            <span>
                                {modelDef?.name}: Pfosten {modelDef?.postWidth}mm
                                {(modelDef as any)?.fixedAngle && ` • Festwinkel ${(modelDef as any).fixedAngle}°`}
                                {(modelDef as any)?.constants?.profileHeight && ` • Profil ${(modelDef as any).constants.profileHeight}mm`}
                                {' '}• Eingaben: {requiredInputs.join(', ')}
                            </span>
                        </div>
                    </div>

                    {/* Results Section */}
                    {results ? (
                        <div className="p-5 space-y-5">
                            {/* Angles & Key Values Banner */}
                            <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                {results.angleAlpha !== null && (
                                    <ResultHighlight icon="∠" label="Neigung α" value={fmtDeg(results.angleAlpha)} />
                                )}
                                {results.inclinationMmM !== null && (
                                    <ResultHighlight icon="↘" label="Gefälle" value={`${Math.round(results.inclinationMmM)} mm/m`} />
                                )}
                                {results.angleBeta !== null && (
                                    <ResultHighlight icon="◇" label="Glaswinkel β" value={fmtDeg(results.angleBeta)} />
                                )}
                                {results.innerWidth !== null && (
                                    <ResultHighlight icon="↔" label="Innenbreite" value={fmt(results.innerWidth)} />
                                )}
                            </div>

                            {/* Heights */}
                            <ResultSection title="📐 Höhen / Wysokości" items={[
                                { label: 'H3', sub: 'UK Rinne (vorne)', value: fmt(results.h3), hl: true },
                                { label: 'H1', sub: 'UK Wandprofil (hinten)', value: fmt(results.h1), hl: true },
                                { label: 'H2', sub: 'OK Wandprofil', value: fmt(results.heightH2) },
                                results.heightH2XL ? { label: 'H2 XL', sub: 'OK XL-Variante', value: fmt(results.heightH2XL) } : null,
                            ]} />

                            {/* Depths */}
                            <ResultSection title="↔️ Tiefen / Głębokości" items={[
                                { label: 'D1', sub: 'Hinterkante Wandanschluss', value: fmt(results.depthD1), hl: true },
                                { label: 'D2', sub: 'Standard-Rinne', value: fmt(results.depthD2), hl: true },
                                results.depthD3 ? { label: 'D3', sub: 'Rinne rund', value: fmt(results.depthD3) } : null,
                                results.depthD4 ? { label: 'D4', sub: 'Rinne klassiek', value: fmt(results.depthD4) } : null,
                                { label: 'D2alt', sub: 'Ständer/Wand', value: fmt(results.depthD2alt) },
                                { label: 'D4 Pfosten', sub: 'Außenkante', value: fmt(results.depthD4post) },
                                results.depthD5 ? { label: 'D5', sub: 'Freistand', value: fmt(results.depthD5) } : null,
                            ]} />

                            {/* Rafter */}
                            <ResultSection title="📦 Sparren / Krokwie" items={[
                                { label: 'S1 Mitte', sub: 'Sparren Mitte', value: fmt(results.sparrenMitte), hl: true },
                                results.sparrenAussen ? { label: 'S1 Außen', sub: 'Sparren Außen', value: fmt(results.sparrenAussen) } : null,
                            ]} />

                            {/* Windows/Walls */}
                            <ResultSection title="🪟 Fenster & Wände / Okna i ściany" items={[
                                { label: 'F1', sub: 'Höhe Rinnenseite', value: fmt(results.fensterF1), hl: true },
                                { label: 'F2', sub: 'Breite/Tiefe Wnęka', value: fmt(results.fensterF2), hl: true },
                                results.fensterF3 ? { label: 'F3', sub: 'Höhe Hausseite', value: fmt(results.fensterF3) } : null,
                                results.keilhoeheK1 ? { label: 'K1', sub: 'Keilhöhe Rinne', value: fmt(results.keilhoeheK1) } : null,
                                results.keilhoeheK2 ? { label: 'K2', sub: 'Keilhöhe Haus', value: fmt(results.keilhoeheK2) } : null,
                            ]} />

                            {/* Post & Structure info */}
                            <ResultSection title="🏗️ Struktur / Konstrukcja" items={[
                                { label: 'Pfostenbreite', sub: 'Pfostengröße', value: fmt(results.postWidth) },
                                { label: 'Pfosten', sub: 'Anzahl', value: `${postCount}` },
                                width ? { label: 'Breite Gesamt', sub: 'Außen-Außen', value: fmt(width) } : null,
                                results.innerWidth ? { label: 'Innenbreite', sub: 'Zwischen Pfosten', value: fmt(results.innerWidth), hl: true } : null,
                            ]} />

                            {/* LED */}
                            {totalLeds > 0 && (
                                <ResultSection title="💡 LED Spots" items={[
                                    { label: 'Spots/Feld', sub: 'Per Rafter', value: `${ledCount}`, hl: true },
                                    { label: 'Felder', sub: 'Sektionen', value: `${numberOfFields}` },
                                    { label: 'Gesamt', sub: 'Total LED', value: `${totalLeds} Spots`, hl: true },
                                ]} />
                            )}

                            {/* Addons from contract */}
                            {(product.addons || []).length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">🧩 Zusätze / Dodatki z umowy</h4>
                                    <div className="space-y-1">
                                        {(product.addons || []).map((addon, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-700">{addon.name}</span>
                                                    {addon.variant && <span className="text-slate-400 ml-1">({addon.variant})</span>}
                                                    {(addon as any).width && (addon as any).height && (
                                                        <span className="text-blue-500 ml-2 font-mono text-[10px]">{(addon as any).width}×{(addon as any).height}mm</span>
                                                    )}
                                                    {(addon as any).side && (
                                                        <span className="text-purple-500 ml-2 text-[10px]">
                                                            {(addon as any).side === 'left' ? '← Links' : (addon as any).side === 'right' ? 'Rechts →' : '⬆ Vorne'}
                                                        </span>
                                                    )}
                                                </div>
                                                {addon.price > 0 && (
                                                    <span className="font-bold text-slate-600">{addon.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Save footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                <div className="text-[10px] text-slate-400">
                                    {savedData ? (
                                        <span>✓ Ostatni zapis: {new Date(savedData.savedAt).toLocaleString('de-DE')} {savedData.savedBy && `przez ${savedData.savedBy}`}</span>
                                    ) : (
                                        <span className="text-amber-500">⚠ Dane nie zostały jeszcze zapisane do umowy</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleCopyAll} disabled={!results} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40">
                                        📋 Kopiuj
                                    </button>
                                    <button onClick={handleSave} disabled={saving || !results} className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                                        {saving ? '⏳ Zapisywanie...' : '💾 Zapisz do Umowy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400">
                            <p className="text-sm">Uzupełnij dane wejściowe powyżej, aby obliczyć wymiary</p>
                            <p className="text-xs mt-1">Podaj przynajmniej głębokość (Tiefe)</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Sub-Components ──

const Badge: React.FC<{ label: string; value: string; color?: 'slate' | 'blue' | 'indigo' | 'yellow' }> = ({ label, value, color = 'slate' }) => {
    const colors = {
        slate: 'bg-slate-100 text-slate-600 border-slate-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors[color]}`}>
            {label}: {value}
        </span>
    );
};

const ResultHighlight: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-100 shadow-sm">
        <span className="text-xl text-blue-500 font-bold">{icon}</span>
        <div>
            <div className="text-[10px] text-blue-400 font-bold uppercase">{label}</div>
            <div className="text-sm font-bold text-blue-800 font-mono">{value}</div>
        </div>
    </div>
);

const ResultSection: React.FC<{ title: string; items: (({ label: string; sub: string; value: string; hl?: boolean }) | null)[] }> = ({ title, items }) => {
    const filtered = items.filter(Boolean) as { label: string; sub: string; value: string; hl?: boolean }[];
    if (filtered.length === 0) return null;
    return (
        <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filtered.map((item, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg border ${item.hl ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</div>
                        <div className={`text-sm font-bold mt-0.5 font-mono ${item.hl ? 'text-blue-800' : 'text-slate-800'}`}>{item.value}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{item.sub}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
