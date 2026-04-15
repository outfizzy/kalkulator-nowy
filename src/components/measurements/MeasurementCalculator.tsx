import React, { useState, useEffect, useMemo } from 'react';
import {
    calculateDachrechner,
    getModelOptions,
    getModelInputs,
    ROOF_MODELS,
    type RoofModelId,
    type DachrechnerInputs,
    type DachrechnerResults
} from '../../services/dachrechner.service';
import { DachrechnerDiagram } from '../dachrechner/DachrechnerDiagram';
import { ProjectMeasurement, SiteDetails, DimensionOptions } from '../../types';
import { Camera, ChevronRight, ClipboardList, PenTool, ArrowUpDown, ArrowLeftRight, Triangle, Ruler, Square, Layers } from 'lucide-react';

// Model categories for grouped selector — grouped by product line
const MODEL_CATEGORIES = [
    {
        label: 'Ecoline',
        icon: '🟠',
        models: ['orangeline', 'orangeline+'] as RoofModelId[],
    },
    {
        label: 'Trendstyle',
        icon: '🔵',
        models: ['trendline', 'trendline+', 'trendline_freistand'] as RoofModelId[],
    },
    {
        label: 'Topstyle',
        icon: '🟣',
        models: ['topline', 'topline_xl', 'designline'] as RoofModelId[],
    },
    {
        label: 'Ultrastyle',
        icon: '🟢',
        models: ['ultraline_classic', 'ultraline_style', 'ultraline_compact'] as RoofModelId[],
    },
    {
        label: 'Skystyle / Carport',
        icon: '⬜',
        models: ['skyline', 'skyline_freistand', 'carport', 'carport_freistand'] as RoofModelId[],
    },
];

interface MeasurementCalculatorProps {
    initialData?: ProjectMeasurement;
    onSave?: (data: {
        name: string;
        modelId: string;
        inputs: DachrechnerInputs;
        results: DachrechnerResults;
        dimensionOptions: DimensionOptions;
        siteDetails: SiteDetails;
        notes?: string;
    }) => Promise<void>;
    readOnly?: boolean;
}

export const MeasurementCalculator: React.FC<MeasurementCalculatorProps> = ({ initialData, onSave, readOnly = false }) => {
    const [name, setName] = useState(initialData?.name || 'Nowy Pomiar');
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [selectedModel, setSelectedModel] = useState<RoofModelId>((initialData?.modelId as RoofModelId) || 'trendline');

    const [inputs, setInputs] = useState<DachrechnerInputs>(initialData?.inputs as any || {
        h3: 2250,
        depth: 5000,
        h1: 2800,
        overhang: 120,
        width: 5000,
        postCount: 2,
    });

    const [view, setView] = useState<'side' | 'front'>('side');
    const [results, setResults] = useState<DachrechnerResults | null>(initialData?.results as any || null);

    const [dimOptions, setDimOptions] = useState<DimensionOptions>((initialData?.dimensionOptions as any) || {
        showHeights: true,
        showDepths: true,
        showRafters: true,
        showWindows: true,
        showWedges: true,
        showAngles: true,
        showPostDimensions: true,
    });

    const [siteDetails, setSiteDetails] = useState<SiteDetails>(initialData?.siteDetails || {});
    const [activeTab, setActiveTab] = useState<'calc' | 'survey'>('calc');

    const [isSaving, setIsSaving] = useState(false);

    const modelOptions = useMemo(() => getModelOptions(), []);
    const requiredInputs = useMemo(() => getModelInputs(selectedModel), [selectedModel]);

    useEffect(() => {
        const calculated = calculateDachrechner(selectedModel, inputs);
        setResults(calculated);
    }, [selectedModel, inputs]);

    const handleInputChange = (field: keyof DachrechnerInputs, value: string) => {
        if (readOnly) return;
        const numValue = parseFloat(value) || 0;
        setInputs(prev => ({ ...prev, [field]: numValue }));
    };

    const toggleOption = (key: keyof DimensionOptions) => {
        setDimOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!onSave || !results) return;
        try {
            setIsSaving(true);
            await onSave({
                name,
                modelId: selectedModel,
                inputs,
                results,
                dimensionOptions: dimOptions,
                siteDetails,
                notes
            });
        } finally {
            setIsSaving(false);
        }
    };

    const fmt = (value: number | null, decimals: number = 0): string => {
        if (value === null || isNaN(value)) return '-';
        return value.toFixed(decimals);
    };

    const model = ROOF_MODELS[selectedModel];
    const modelLabel = modelOptions.find(m => m.id === selectedModel)?.name || selectedModel;

    // Toggle chip definitions
    const toggleChips: { key: keyof DimensionOptions; label: string; shortLabel: string; color: string; icon: React.ReactNode }[] = [
        { key: 'showHeights', label: 'Wysokości', shortLabel: 'H', color: 'purple', icon: <ArrowUpDown className="w-3 h-3" /> },
        { key: 'showDepths', label: 'Głębokości', shortLabel: 'D', color: 'cyan', icon: <ArrowLeftRight className="w-3 h-3" /> },
        { key: 'showPostDimensions', label: 'Słupy', shortLabel: 'P', color: 'blue', icon: <Square className="w-3 h-3" /> },
        { key: 'showRafters', label: 'Krokwie', shortLabel: 'S', color: 'orange', icon: <Ruler className="w-3 h-3" /> },
        { key: 'showWindows', label: 'Okna', shortLabel: 'F', color: 'teal', icon: <Layers className="w-3 h-3" /> },
        { key: 'showWedges', label: 'Kliny', shortLabel: 'K', color: 'amber', icon: <Triangle className="w-3 h-3" /> },
        { key: 'showAngles', label: 'Kąty', shortLabel: 'α', color: 'red', icon: <span className="text-xs font-bold">∠</span> },
    ];

    return (
        <div className="space-y-4">
            {/* Header / Meta — compact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nazwa Pomiaru</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={readOnly}
                            className="text-xl md:text-2xl font-bold text-slate-900 border-none p-0 focus:ring-0 w-full placeholder-slate-300 bg-transparent"
                            placeholder="Wpisz nazwę..."
                        />
                    </div>
                    {onSave && !readOnly && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            {isSaving ? 'Zapisywanie...' : '💾 Zapisz'}
                        </button>
                    )}
                </div>
                {/* Notes — collapsible on mobile */}
                <details className="mt-3 group">
                    <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                        📝 Notatki {notes ? `(${notes.length} znaków)` : '(dodaj)'}
                    </summary>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        disabled={readOnly}
                        className="w-full border-slate-200 rounded-lg text-sm p-2 mt-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Dodatkowe uwagi do pomiaru..."
                        rows={2}
                    />
                </details>
            </div>

            {/* Model Selector — Grouped by category */}
            {activeTab === 'calc' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                    <label className="block text-xs font-bold text-slate-500 mb-3">Model Dachu</label>
                    <div className="space-y-2">
                        {MODEL_CATEGORIES.map(cat => (
                            <div key={cat.label}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <span>{cat.icon}</span>
                                    {cat.label}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {cat.models.map(mid => {
                                        const mOpt = modelOptions.find(m => m.id === mid);
                                        if (!mOpt) return null;
                                        const isActive = selectedModel === mid;
                                        return (
                                            <button
                                                key={mid}
                                                onClick={() => !readOnly && setSelectedModel(mid)}
                                                disabled={readOnly}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isActive
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/50 scale-[1.02]'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                                                    } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                                            >
                                                {mOpt.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Calculator Area */}
            {activeTab === 'calc' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Inputs */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                Wymiary (mm)
                            </h2>

                            <div className="space-y-3">
                                {requiredInputs.includes('h3') && (
                                    <InputField label="H3 — Rinne" sublabel="Wysokość rynny" value={inputs.h3 || ''} onChange={v => handleInputChange('h3', v)} readOnly={readOnly} icon={<ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />} />
                                )}
                                <InputField label="Bestelltiefe" sublabel="Głębokość (D)" value={inputs.depth || ''} onChange={v => handleInputChange('depth', v)} readOnly={readOnly} icon={<ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />} />

                                <InputField label="Szerokość" sublabel="Breite (B)" value={inputs.width || ''} onChange={v => handleInputChange('width', v)} readOnly={readOnly} icon={<ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />} />
                                <InputField label="Słupy" sublabel="Pfosten (szt)" value={inputs.postCount || ''} onChange={v => handleInputChange('postCount', v)} readOnly={readOnly} icon={<Square className="w-3.5 h-3.5 text-blue-400" />} />

                                {requiredInputs.includes('h1') && (
                                    <InputField label="H1 — Wandprofil" sublabel="Wys. przy ścianie" value={inputs.h1 || ''} onChange={v => handleInputChange('h1', v)} readOnly={readOnly} icon={<ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />} />
                                )}
                                {requiredInputs.includes('overhang') && (
                                    <InputField label="U1 — Überstand" sublabel="Wysunięcie" value={inputs.overhang || ''} onChange={v => handleInputChange('overhang', v)} readOnly={readOnly} icon={<Ruler className="w-3.5 h-3.5 text-green-400" />} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Visualization + Controls */}
                    <div className="lg:col-span-9 space-y-3">
                        {/* Diagram Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Diagram header */}
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-700">Wizualizacja</h2>
                                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setView('side')}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${view === 'side'
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Bok
                                    </button>
                                    <button
                                        onClick={() => setView('front')}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${view === 'front'
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Front
                                    </button>
                                </div>
                            </div>

                            {/* SVG Diagram */}
                            <div className="bg-gradient-to-b from-slate-50/80 to-white p-2 md:p-4 min-h-[350px] md:min-h-[500px] flex items-center justify-center">
                                <DachrechnerDiagram
                                    modelId={selectedModel}
                                    inputs={inputs}
                                    results={results}
                                    options={dimOptions}
                                    view={view}
                                />
                            </div>

                            {/* Toggle Chips — inline row below diagram */}
                            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 hidden sm:inline">Warstwy:</span>
                                {toggleChips.map(chip => {
                                    const active = dimOptions[chip.key];
                                    const colorClasses: Record<string, string> = {
                                        purple: active ? 'bg-purple-100 text-purple-700 border-purple-200' : '',
                                        cyan: active ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : '',
                                        blue: active ? 'bg-blue-100 text-blue-700 border-blue-200' : '',
                                        orange: active ? 'bg-orange-100 text-orange-700 border-orange-200' : '',
                                        teal: active ? 'bg-teal-100 text-teal-700 border-teal-200' : '',
                                        amber: active ? 'bg-amber-100 text-amber-700 border-amber-200' : '',
                                        red: active ? 'bg-red-100 text-red-700 border-red-200' : '',
                                    };
                                    return (
                                        <button
                                            key={chip.key}
                                            onClick={() => toggleOption(chip.key)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${active
                                                ? colorClasses[chip.color]
                                                : 'bg-white/70 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                            title={chip.label}
                                        >
                                            {chip.icon}
                                            <span className="hidden sm:inline">{chip.label}</span>
                                            <span className="sm:hidden">{chip.shortLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Compact Results Grid */}
                        {results && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {/* Heights */}
                                    {dimOptions.showHeights && (
                                        <CompactResultCard title="Wysokości" color="purple" items={[
                                            results.h3 !== null && { label: 'H3 Rinne', value: fmt(results.h3) },
                                            results.h1 !== null && { label: 'H1 Wand', value: fmt(results.h1) },
                                            results.heightH2 !== null && { label: 'H2 Ober.', value: fmt(results.heightH2) },
                                            results.heightH2XL !== null && { label: 'H2 XL', value: fmt(results.heightH2XL) },
                                        ].filter(Boolean) as { label: string; value: string }[]} />
                                    )}
                                    {/* Angles */}
                                    {dimOptions.showAngles && (results.angleAlpha !== null || results.angleBeta !== null) && (
                                        <CompactResultCard title="Kąty" color="red" items={[
                                            results.angleAlpha !== null && { label: 'α', value: `${fmt(results.angleAlpha, 1)}°` },
                                            results.inclinationMmM !== null && { label: 'Spadek', value: `${fmt(results.inclinationMmM, 1)} mm/m` },
                                            results.angleBeta !== null && { label: 'β Glas', value: `${fmt(results.angleBeta, 1)}°` },
                                        ].filter(Boolean) as { label: string; value: string }[]} />
                                    )}
                                    {/* Posts */}
                                    {dimOptions.showPostDimensions && (
                                        <CompactResultCard title="Słupy" color="blue" items={[
                                            { label: 'Szerokość', value: `${fmt(inputs.width)}` },
                                            { label: 'Słupy', value: `${inputs.postCount || 2} szt` },
                                            results.innerWidth !== null && { label: 'W świetle', value: fmt(results.innerWidth), highlight: true },
                                            results.depthD4post !== null && { label: 'D4 Słup', value: fmt(results.depthD4post) },
                                            results.depthD5 !== null && { label: 'D5 Wolny', value: fmt(results.depthD5) },
                                        ].filter(Boolean) as { label: string; value: string; highlight?: boolean }[]} />
                                    )}
                                    {/* Depths */}
                                    {dimOptions.showDepths && (
                                        <CompactResultCard title="Głębokości" color="cyan" items={[
                                            results.depthD1 !== null && { label: 'D1', value: fmt(results.depthD1) },
                                            results.depthD2 !== null && { label: 'D2 Std', value: fmt(results.depthD2) },
                                            results.depthD3 !== null && { label: 'D3 Rund', value: fmt(results.depthD3) },
                                            results.depthD4 !== null && { label: 'D4 Klass.', value: fmt(results.depthD4) },
                                            results.depthD2alt !== null && { label: 'D2 alt', value: fmt(results.depthD2alt) },
                                        ].filter(Boolean) as { label: string; value: string }[]} />
                                    )}
                                    {/* Rafters */}
                                    {dimOptions.showRafters && (results.sparrenMitte !== null || results.sparrenAussen !== null) && (
                                        <CompactResultCard title="Krokwie" color="orange" items={[
                                            results.sparrenMitte !== null && { label: 'S1 Mitte', value: fmt(results.sparrenMitte) },
                                            results.sparrenAussen !== null && { label: 'S1 Außen', value: fmt(results.sparrenAussen) },
                                        ].filter(Boolean) as { label: string; value: string }[]} />
                                    )}
                                    {/* Windows */}
                                    {dimOptions.showWindows && (results.fensterF1 !== null || results.fensterF2 !== null) && (
                                        <CompactResultCard title="Okna" color="teal" items={[
                                            results.fensterF1 !== null && { label: 'F1 Rinne', value: fmt(results.fensterF1) },
                                            results.fensterF2 !== null && { label: 'F2 Breite', value: fmt(results.fensterF2) },
                                            results.fensterF3 !== null && { label: 'F3 Haus', value: fmt(results.fensterF3) },
                                        ].filter(Boolean) as { label: string; value: string }[]} />
                                    )}
                                    {/* Wedges */}
                                    {dimOptions.showWedges && (results.keilhoeheK1 !== null || results.keilhoeheK2 !== null) && (
                                        <CompactResultCard title="Kliny" color="amber" items={[
                                            results.keilhoeheK1 !== null && { label: 'K1 Rinne', value: fmt(results.keilhoeheK1) },
                                            results.keilhoeheK2 !== null && { label: 'K2 Haus', value: fmt(results.keilhoeheK2) },
                                        ].filter(Boolean) as { label: string; value: string }[]} />
                                    )}
                                    {/* Overhang */}
                                    {results.overhang !== null && results.overhang > 0 && (
                                        <CompactResultCard title="Wysunięcie" color="indigo" items={[
                                            { label: 'U1', value: fmt(results.overhang) },
                                        ]} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // --- SURVEY TAB ---
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* 1. Ground & Foundation */}
                    <SurveySection title="1. Podłoże i Fundamenty" icon={<div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</div>}>
                        <SelectField
                            label="Rodzaj podłoża"
                            value={siteDetails.groundType || ''}
                            onChange={v => setSiteDetails(p => ({ ...p, groundType: v as any }))}
                            options={[
                                { label: 'Wybierz...', value: '' },
                                { label: 'Wylewka betonowa', value: 'concrete' },
                                { label: 'Kostka brukowa', value: 'paving_stones' },
                                { label: 'Trawnik / Grunt', value: 'grass' },
                                { label: 'Taras wentylowany', value: 'terrace' },
                                { label: 'Inne', value: 'other' },
                            ]}
                            readOnly={readOnly}
                        />
                        {siteDetails.groundType === 'other' && (
                            <TextField label="Jakie inne?" value={siteDetails.groundTypeOther || ''} onChange={v => setSiteDetails(p => ({ ...p, groundTypeOther: v }))} readOnly={readOnly} />
                        )}

                        <div className="border-t border-slate-100 pt-3"></div>
                        <SelectField
                            label="Istniejące stopy fundamentowe"
                            value={siteDetails.hasFoundation || ''}
                            onChange={v => setSiteDetails(p => ({ ...p, hasFoundation: v as any }))}
                            options={[
                                { label: 'Wybierz...', value: '' },
                                { label: 'Tak - gotowe', value: 'yes' },
                                { label: 'Nie', value: 'no' },
                                { label: 'Do wykonania przez nas', value: 'to_do' },
                            ]}
                            readOnly={readOnly}
                        />
                        <div className="border-t border-slate-100 pt-3"></div>
                        <div className="grid grid-cols-2 gap-3">
                            <InputField label="Spadek L-P" sublabel="Lewa-Prawa" value={siteDetails.slopeLeftRight || ''} onChange={v => setSiteDetails(p => ({ ...p, slopeLeftRight: parseFloat(v) }))} readOnly={readOnly} />
                            <InputField label="Spadek Ś-O" sublabel="Ściana-Ogród" value={siteDetails.slopeFrontBack || ''} onChange={v => setSiteDetails(p => ({ ...p, slopeFrontBack: parseFloat(v) }))} readOnly={readOnly} />
                        </div>
                    </SurveySection>

                    {/* 2. Wall Construction */}
                    <SurveySection title="2. Montaż do ściany" icon={<div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>}>
                        <SelectField
                            label="Rodzaj ściany"
                            value={siteDetails.wallType || ''}
                            onChange={v => setSiteDetails(p => ({ ...p, wallType: v as any }))}
                            options={[
                                { label: 'Wybierz...', value: '' },
                                { label: 'Beton', value: 'concrete' },
                                { label: 'Cegła pełna', value: 'brick' },
                                { label: 'Porotherm / Pustak', value: 'porotherm' },
                                { label: 'Gazobeton (Ytong)', value: 'ytong' },
                                { label: 'Drewno', value: 'wood' },
                                { label: 'Inne', value: 'other' },
                            ]}
                            readOnly={readOnly}
                        />
                        <div className="border-t border-slate-100 pt-3"></div>
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Ocieplenie"
                                value={siteDetails.insulationType || ''}
                                onChange={v => setSiteDetails(p => ({ ...p, insulationType: v as any }))}
                                options={[
                                    { label: 'Brak', value: 'none' },
                                    { label: 'Styropian', value: 'styrofoam' },
                                    { label: 'Wełna', value: 'wool' },
                                ]}
                                readOnly={readOnly}
                            />
                            {siteDetails.insulationType !== 'none' && (
                                <InputField label="Grubość" sublabel="mm" value={siteDetails.insulationThickness || ''} onChange={v => setSiteDetails(p => ({ ...p, insulationThickness: parseFloat(v) }))} readOnly={readOnly} />
                            )}
                        </div>
                        <div className="border-t border-slate-100 pt-3"></div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Przeszkody na ścianie</label>
                        <textarea
                            value={siteDetails.wallObstacles || ''}
                            onChange={e => setSiteDetails(p => ({ ...p, wallObstacles: e.target.value }))}
                            className="w-full border-slate-200 rounded-lg text-sm p-2 focus:ring-2 focus:ring-blue-100 placeholder-slate-300"
                            placeholder="Np. rynny spustowe, gniazdka..."
                            rows={2}
                            disabled={readOnly}
                        />
                    </SurveySection>

                    {/* 3. Logistics */}
                    <SurveySection title="3. Logistyka i Dostęp" icon={<div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">3</div>}>
                        <SelectField
                            label="Dojście na montaż"
                            value={siteDetails.accessType || ''}
                            onChange={v => setSiteDetails(p => ({ ...p, accessType: v as any }))}
                            options={[
                                { label: 'Wybierz...', value: '' },
                                { label: 'Swobodne (ogród)', value: 'free' },
                                { label: 'Przez dom', value: 'house' },
                                { label: 'Wąskie przejście', value: 'narrow' },
                                { label: 'Schody', value: 'stairs' },
                                { label: 'Winda (apartament)', value: 'elevator' },
                            ]}
                            readOnly={readOnly}
                        />
                        <SelectField
                            label="Miejsce montażu"
                            value={siteDetails.installationFloor || ''}
                            onChange={v => setSiteDetails(p => ({ ...p, installationFloor: v as any }))}
                            options={[
                                { label: 'Parter', value: 'ground' },
                                { label: 'Balkon', value: 'balcony' },
                                { label: 'Taras na dachu', value: 'roof' },
                            ]}
                            readOnly={readOnly}
                        />
                        <div className="border-t border-slate-100 pt-3"></div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">Dostęp do prądu (230V)</label>
                            <input
                                type="checkbox"
                                checked={siteDetails.hasPower || false}
                                onChange={e => setSiteDetails(p => ({ ...p, hasPower: e.target.checked }))}
                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                        </div>
                        {!siteDetails.hasPower && (
                            <InputField label="Długość kabla" sublabel="Przedłużacz (m)" value={siteDetails.cablesLengthIfNeeded || ''} onChange={v => setSiteDetails(p => ({ ...p, cablesLengthIfNeeded: parseFloat(v) }))} readOnly={readOnly} />
                        )}
                    </SurveySection>

                    {/* 4. Photos Placeholder */}
                    <div className="md:col-span-2 xl:col-span-3 bg-white rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center">
                        <Camera className="w-8 h-8 text-slate-300 mb-2" />
                        <h3 className="text-sm font-medium text-slate-600 mb-1">Zdjęcia z Pomiaru</h3>
                        <p className="text-xs text-slate-400 max-w-sm mb-3">Dodaj zdjęcia obecnego stanu, detali montażowych, przeszkód oraz podłoża.</p>
                        <button className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium py-1.5 px-4 rounded-lg text-xs shadow-sm transition-all" disabled>
                            Dodaj Zdjęcia (Wkrótce)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== Compact Result Card =====
const compactColorMap: Record<string, { border: string; dot: string; bg: string }> = {
    purple: { border: 'border-purple-200', dot: 'bg-purple-500', bg: 'bg-purple-50/40' },
    red: { border: 'border-red-200', dot: 'bg-red-500', bg: 'bg-red-50/40' },
    blue: { border: 'border-blue-200', dot: 'bg-blue-500', bg: 'bg-blue-50/40' },
    cyan: { border: 'border-cyan-200', dot: 'bg-cyan-500', bg: 'bg-cyan-50/40' },
    orange: { border: 'border-orange-200', dot: 'bg-orange-500', bg: 'bg-orange-50/40' },
    teal: { border: 'border-teal-200', dot: 'bg-teal-500', bg: 'bg-teal-50/40' },
    amber: { border: 'border-amber-200', dot: 'bg-amber-500', bg: 'bg-amber-50/40' },
    indigo: { border: 'border-indigo-200', dot: 'bg-indigo-500', bg: 'bg-indigo-50/40' },
};

const CompactResultCard = ({ title, color, items }: { title: string; color: string; items: { label: string; value: string; highlight?: boolean }[] }) => {
    const c = compactColorMap[color] || compactColorMap.blue;
    if (items.length === 0) return null;
    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
            <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-2 h-2 rounded-full ${c.dot}`}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
            </div>
            <div className="space-y-1">
                {items.map((item, i) => (
                    <div key={i} className={`flex justify-between items-center text-xs ${item.highlight ? 'font-bold text-blue-700' : 'text-slate-600'}`}>
                        <span className="truncate mr-2 opacity-80">{item.label}</span>
                        <span className="font-mono font-semibold whitespace-nowrap">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ===== Component Helpers =====

interface InputFieldProps {
    label: string;
    sublabel: string;
    value: number | string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    icon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({ label, sublabel, value, onChange, readOnly, icon }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            {icon}
            {label}
        </label>
        <div className="relative">
            <input
                type="number"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={readOnly}
                className={`w-full px-3 py-2 rounded-lg border outline-none font-mono text-sm transition-all
                    ${readOnly
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50'
                    }`}
            />
            {!readOnly && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-semibold">mm</span>}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>
    </div>
);

const SurveySection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-4">
            {icon}
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const SelectField = ({ label, value, onChange, options, readOnly }: { label: string, value: string, onChange: (v: string) => void, options: { label: string, value: string }[], readOnly?: boolean }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all appearance-none text-sm"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const TextField = ({ label, value, onChange, readOnly }: { label: string, value: string, onChange: (v: string) => void, readOnly?: boolean }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</label>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all text-sm"
        />
    </div>
);
