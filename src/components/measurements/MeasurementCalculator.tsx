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
import { ProjectMeasurement, SiteDetails } from '../../types';
import { Camera, ChevronRight, ClipboardList, PenTool } from 'lucide-react';

// Dimension display options
interface DimensionOptions {
    showHeights: boolean;
    showDepths: boolean;
    showRafters: boolean;
    showWindows: boolean;
    showWedges: boolean;
    showAngles: boolean;
    showPostDimensions: boolean;
}

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
        width: 5000, // Default Width
        postCount: 2, // Default Post Count
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

    return (
        <div className="space-y-6">
            {/* Header / Meta */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full md:w-auto">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nazwa Pomiaru</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={readOnly}
                            className="text-2xl font-bold text-slate-900 border-none p-0 focus:ring-0 w-full placeholder-slate-300"
                            placeholder="Wpisz nazwę..."
                        />
                    </div>
                    {onSave && !readOnly && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? 'Zapisywanie...' : 'Zapisz Pomiar'}
                        </button>
                    )}
                </div>
                {/* Notes */}
                <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notatki</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        disabled={readOnly}
                        className="w-full border-slate-200 rounded-lg text-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Dodatkowe uwagi do pomiaru..."
                        rows={2}
                    />
                </div>
            </div>

            {/* Model Selector - Only show in Calc Tab */}
            {activeTab === 'calc' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all">
                    <label className="block text-sm font-bold text-slate-700 mb-3">Wybierz Model Dachu</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {modelOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => !readOnly && setSelectedModel(opt.id)}
                                disabled={readOnly}
                                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-center border ${selectedModel === opt.id
                                    ? 'bg-blue-600 text-white shadow-md border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                            >
                                {opt.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Calculations Grid OR Survey Form */}
            {activeTab === 'calc' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Left Column: Inputs & Toggles */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-100 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                Wymiary (mm)
                            </h2>

                            <div className="space-y-4 relative z-10">
                                {requiredInputs.includes('h3') && (
                                    <InputField label="H3 - Rinne" sublabel="Wysokość rynny" value={inputs.h3 || ''} onChange={v => handleInputChange('h3', v)} readOnly={readOnly} />
                                )}
                                <InputField label="Bestelltiefe" sublabel="Głębokość (D)" value={inputs.depth || ''} onChange={v => handleInputChange('depth', v)} readOnly={readOnly} />

                                {/* Width Inputs */}
                                <InputField label="Szerokość całk." sublabel="Systembreite" value={inputs.width || ''} onChange={v => handleInputChange('width', v)} readOnly={readOnly} />
                                <InputField label="Liczba słupów" sublabel="Ilość (Pfosten)" value={inputs.postCount || ''} onChange={v => handleInputChange('postCount', v)} readOnly={readOnly} />
                                {requiredInputs.includes('h1') && (
                                    <InputField label="H1 - Wandprofil" sublabel="Wysokość przy ścianie" value={inputs.h1 || ''} onChange={v => handleInputChange('h1', v)} readOnly={readOnly} />
                                )}
                                {requiredInputs.includes('overhang') && (
                                    <InputField label="U1 - Überstand" sublabel="Wysunięcie dachu" value={inputs.overhang || ''} onChange={v => handleInputChange('overhang', v)} readOnly={readOnly} />
                                )}
                            </div>
                        </div>

                        {/* Dimension Display Toggles */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                Widoczność Wymiarów
                            </h2>
                            <div className="space-y-2">
                                <ToggleBtn active={dimOptions.showHeights} onClick={() => toggleOption('showHeights')} label="Wysokości (H)" color="purple" />
                                <ToggleBtn active={dimOptions.showDepths} onClick={() => toggleOption('showDepths')} label="Głębokości (D)" color="cyan" />
                                <ToggleBtn active={dimOptions.showPostDimensions} onClick={() => toggleOption('showPostDimensions')} label="Słupy (D)" color="blue" />
                                <ToggleBtn active={dimOptions.showRafters} onClick={() => toggleOption('showRafters')} label="Krokwie (S)" color="orange" />
                                <ToggleBtn active={dimOptions.showWindows} onClick={() => toggleOption('showWindows')} label="Okna (F)" color="teal" />
                                <ToggleBtn active={dimOptions.showWedges} onClick={() => toggleOption('showWedges')} label="Kliny (K)" color="amber" />
                                <ToggleBtn active={dimOptions.showAngles} onClick={() => toggleOption('showAngles')} label="Kąty" color="red" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visualization */}
                    <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Wizualizacja Techniczna</h2>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setView('side')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'side'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Widok z Boku
                                </button>
                                <button
                                    onClick={() => setView('front')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'front'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Widok z Frontu
                                </button>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-4 flex-1 min-h-[500px] flex items-center justify-center border border-slate-100 relative group">
                            <DachrechnerDiagram
                                modelId={selectedModel}
                                inputs={inputs}
                                results={results}
                                options={dimOptions}
                                view={view}
                            />
                            <div className="absolute bottom-4 right-4 text-xs text-slate-300 pointer-events-none opacity-50">
                                Generated by OfferApp
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- SURVEY TAB ---
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* 1. Ground & Foundation */}
                    <SurveySection title="1. Podłoże i Fundamenty" icon={<div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">1</div>}>
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

                        <div className="border-t border-slate-100 pt-4"></div>
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

                        <div className="border-t border-slate-100 pt-4"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Spadek L-P" sublabel="Lewa-Prawa" value={siteDetails.slopeLeftRight || ''} onChange={v => setSiteDetails(p => ({ ...p, slopeLeftRight: parseFloat(v) }))} readOnly={readOnly} />
                            <InputField label="Spadek Ś-O" sublabel="Ściana-Ogród" value={siteDetails.slopeFrontBack || ''} onChange={v => setSiteDetails(p => ({ ...p, slopeFrontBack: parseFloat(v) }))} readOnly={readOnly} />
                        </div>
                    </SurveySection>

                    {/* 2. Wall Construction */}
                    <SurveySection title="2. Montaż do ściany" icon={<div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>}>
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

                        <div className="border-t border-slate-100 pt-4"></div>
                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="border-t border-slate-100 pt-4"></div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Przeszkody na ścianie</label>
                        <textarea
                            value={siteDetails.wallObstacles || ''}
                            onChange={e => setSiteDetails(p => ({ ...p, wallObstacles: e.target.value }))}
                            className="w-full border-slate-200 rounded-lg text-sm p-3 focus:ring-2 focus:ring-blue-100 placeholder-slate-300"
                            placeholder="Np. rynny spustowe, gniazdka, oświetlenie, rolety..."
                            rows={3}
                            disabled={readOnly}
                        />
                    </SurveySection>

                    {/* 3. Logistics */}
                    <SurveySection title="3. Logistyka i Dostęp" icon={<div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">3</div>}>
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

                        <div className="border-t border-slate-100 pt-4"></div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">Dostęp do prądu (230V)</label>
                            <input
                                type="checkbox"
                                checked={siteDetails.hasPower || false}
                                onChange={e => setSiteDetails(p => ({ ...p, hasPower: e.target.checked }))}
                                className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                disabled={readOnly}
                            />
                        </div>
                        {!siteDetails.hasPower && (
                            <InputField label="Ile metrów kabla?" sublabel="Wymagany przedłużacz" value={siteDetails.cablesLengthIfNeeded || ''} onChange={v => setSiteDetails(p => ({ ...p, cablesLengthIfNeeded: parseFloat(v) }))} readOnly={readOnly} />
                        )}
                    </SurveySection>

                    {/* 4. Photos Placeholder */}
                    <div className="md:col-span-2 xl:col-span-3 bg-white rounded-2xl border border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <Camera className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Zdjęcia z Pomiaru</h3>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">Dodaj zdjęcia obecnego stanu, detali montażowych, przeszkód oraz podłoża.</p>
                        <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-2 px-6 rounded-lg shadow-sm transition-all" disabled>
                            Dodaj Zdjęcia (Wkrótce)
                        </button>
                    </div>
                </div>
            )}

            {/* Results Panel - only in Calc tab */}
            {activeTab === 'calc' && results && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Construction Dimensions */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Wymiary Konstrukcyjne</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Heights */}
                            {dimOptions.showHeights && (
                                <ResultGroup title="Wysokości (H)" icon="↕" color="purple">
                                    <ResultRow label="H3 Rinne" value={`${fmt(results.h3)} mm`} show={results.h3 !== null} />
                                    <ResultRow label="H1 Wandprofil" value={`${fmt(results.h1)} mm`} show={results.h1 !== null} />
                                    <ResultRow label="H2 Oberkante" value={`${fmt(results.heightH2)} mm`} show={results.heightH2 !== null} />
                                    <ResultRow label="H2 XL" value={`${fmt(results.heightH2XL)} mm`} show={results.heightH2XL !== null} />
                                </ResultGroup>
                            )}

                            {/* Angles */}
                            {dimOptions.showAngles && (
                                <ResultGroup title="Kąty" icon="∠" color="red">
                                    <ResultRow label="α Neigung" value={`${fmt(results.angleAlpha, 1)}°`} show={results.angleAlpha !== null} />
                                    <ResultRow label="Spadek" value={`${fmt(results.inclinationMmM, 1)} mm/m`} show={results.inclinationMmM !== null} />
                                    <ResultRow label="β Glas" value={`${fmt(results.angleBeta, 1)}°`} show={results.angleBeta !== null} />
                                </ResultGroup>
                            )}

                            {/* Widths */}
                            {dimOptions.showPostDimensions && (
                                <ResultGroup title="Szerokości (B)" icon="↔" color="blue">
                                    <ResultRow label="Szerokość całk." value={`${fmt(inputs.width)} mm`} show={!!inputs.width} />
                                    <ResultRow label="Liczba słupów" value={`${inputs.postCount || 2} szt.`} show={!!inputs.width} />
                                    <ResultRow
                                        label="Szer. w świetle"
                                        value={`${fmt(results.innerWidth)} mm (x${(inputs.postCount || 2) - 1})`}
                                        show={results.innerWidth !== null}
                                        highlight
                                    />
                                </ResultGroup>
                            )}

                            {/* Rafters */}
                            {dimOptions.showRafters && (
                                <ResultGroup title="Krokwie (S)" icon="⌇" color="orange">
                                    <ResultRow label="S1 Mitte" value={`${fmt(results.sparrenMitte)} mm`} show={results.sparrenMitte !== null} />
                                    <ResultRow label="S1 Außen" value={`${fmt(results.sparrenAussen)} mm`} show={results.sparrenAussen !== null} />
                                </ResultGroup>
                            )}

                            {/* Posts */}
                            {dimOptions.showPostDimensions && (
                                <ResultGroup title="Słupy (D)" icon="▮" color="blue">
                                    <ResultRow label="D4 do słupa" value={`${fmt(results.depthD4post)} mm`} show={results.depthD4post !== null} highlight />
                                    <ResultRow label="D5 wolnostojący" value={`${fmt(results.depthD5)} mm`} show={results.depthD5 !== null} highlight />
                                    <ResultRow label="D2alt ściana-słup" value={`${fmt(results.depthD2alt)} mm`} show={results.depthD2alt !== null} />
                                </ResultGroup>
                            )}
                        </div>
                    </div>

                    {/* Element Dimensions */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Wymiary Elementów</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Depths */}
                            {dimOptions.showDepths && (
                                <ResultGroup title="Głębokości (D)" icon="↔" color="cyan">
                                    <ResultRow label="D1 Wandanschluss" value={`${fmt(results.depthD1)} mm`} show={results.depthD1 !== null} />
                                    <ResultRow label="D2 Standard" value={`${fmt(results.depthD2)} mm`} show={results.depthD2 !== null} />
                                    <ResultRow label="D3 Rund" value={`${fmt(results.depthD3)} mm`} show={results.depthD3 !== null} />
                                    <ResultRow label="D4 Klassik" value={`${fmt(results.depthD4)} mm`} show={results.depthD4 !== null} />
                                </ResultGroup>
                            )}

                            {/* Windows */}
                            {dimOptions.showWindows && (
                                <ResultGroup title="Okna / Szyby (F)" icon="⊞" color="teal">
                                    <ResultRow label="F1 Rinnenseite" value={`${fmt(results.fensterF1)} mm`} show={results.fensterF1 !== null} />
                                    <ResultRow label="F2 Breite" value={`${fmt(results.fensterF2)} mm`} show={results.fensterF2 !== null} />
                                    <ResultRow label="F3 Hausseite" value={`${fmt(results.fensterF3)} mm`} show={results.fensterF3 !== null} />
                                </ResultGroup>
                            )}

                            {/* Wedges */}
                            {dimOptions.showWedges && (
                                <ResultGroup title="Kliny (K)" icon="▲" color="amber">
                                    <ResultRow label="K1 Rinnenseite" value={`${fmt(results.keilhoeheK1)} mm`} show={results.keilhoeheK1 !== null} />
                                    <ResultRow label="K2 Hausseite" value={`${fmt(results.keilhoeheK2)} mm`} show={results.keilhoeheK2 !== null} />
                                </ResultGroup>
                            )}

                            {/* Overhang */}
                            {results.overhang !== null && results.overhang > 0 && (
                                <ResultGroup title="Wysunięcie (U)" icon="➜" color="indigo">
                                    <ResultRow label="U1 Überstand" value={`${fmt(results.overhang)} mm`} show={true} />
                                </ResultGroup>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
}

const InputField: React.FC<InputFieldProps> = ({ label, sublabel, value, onChange, readOnly }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
        <div className="relative">
            <input
                type="number"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={readOnly}
                className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none font-mono text-lg transition-all
                    ${readOnly
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'
                    }`}
            />
            {!readOnly && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">mm</span>}
        </div>
        <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
    </div>
);

interface ToggleBtnProps {
    active: boolean;
    onClick: () => void;
    label: string;
    color: string;
}

const ToggleBtn: React.FC<ToggleBtnProps> = ({ active, onClick, label, color }) => {
    const colors: Record<string, string> = {
        purple: 'bg-purple-100 border-purple-200 text-purple-700 shadow-sm',
        cyan: 'bg-cyan-100 border-cyan-200 text-cyan-700 shadow-sm',
        blue: 'bg-blue-100 border-blue-200 text-blue-700 shadow-sm',
        orange: 'bg-orange-100 border-orange-200 text-orange-700 shadow-sm',
        teal: 'bg-teal-100 border-teal-200 text-teal-700 shadow-sm',
        amber: 'bg-amber-100 border-amber-200 text-amber-700 shadow-sm',
        red: 'bg-red-100 border-red-200 text-red-700 shadow-sm',
    };

    return (
        <button
            onClick={onClick}
            className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-3
                ${active ? colors[color] : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
        >
            <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white ${active ? 'bg-current' : 'bg-slate-300'}`}></span>
            {label}
        </button>
    );
};

interface ResultGroupProps {
    title: string;
    icon: string;
    color: string;
    children: React.ReactNode;
}

const colorMap: Record<string, string> = {
    red: 'border-red-100 bg-red-50/30',
    purple: 'border-purple-100 bg-purple-50/30',
    blue: 'border-blue-100 bg-blue-50/30',
    orange: 'border-orange-100 bg-orange-50/30',
    teal: 'border-teal-100 bg-teal-50/30',
    amber: 'border-amber-100 bg-amber-50/30',
    indigo: 'border-indigo-100 bg-indigo-50/30',
    cyan: 'border-cyan-100 bg-cyan-50/30',
};

const ResultGroup: React.FC<ResultGroupProps> = ({ title, icon, color, children }) => (
    <div className={`p-4 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide opacity-80">
            <span>{icon}</span>
            {title}
        </h3>
        <div className="space-y-1.5">
            {children}
        </div>
    </div>
);

interface ResultRowProps {
    label: string;
    value: string;
    show: boolean;
    highlight?: boolean;
}

const ResultRow: React.FC<ResultRowProps> = ({ label, value, show, highlight }) => {
    if (!show) return null;
    return (
        <div className={`flex justify-between items-center py-1 text-sm ${highlight ? 'font-bold text-blue-700 bg-blue-50 -mx-2 px-2 rounded' : 'text-slate-600'}`}>
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    );
};

const SurveySection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
            {icon}
            <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const SelectField = ({ label, value, onChange, options, readOnly }: { label: string, value: string, onChange: (v: string) => void, options: { label: string, value: string }[], readOnly?: boolean }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all appearance-none"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const TextField = ({ label, value, onChange, readOnly }: { label: string, value: string, onChange: (v: string) => void, readOnly?: boolean }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all"
        />
    </div>
);
