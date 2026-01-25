import React, { useState, useEffect, useMemo } from 'react';
import {
    calculateDachrechner,
    getModelOptions,
    getModelInputs,
    ROOF_MODELS,
    type RoofModelId,
    type DachrechnerInputs,
    type DachrechnerResults
} from '../services/dachrechner.service';
import { DachrechnerDiagram } from '../components/dachrechner/DachrechnerDiagram';

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

export const DachrechnerPage: React.FC = () => {
    const [selectedModel, setSelectedModel] = useState<RoofModelId>('trendline');
    const [inputs, setInputs] = useState<DachrechnerInputs>({
        h3: 2250,
        depth: 5000,
        h1: 2800,
        overhang: 120,
    });
    const [results, setResults] = useState<DachrechnerResults | null>(null);
    const [dimOptions, setDimOptions] = useState<DimensionOptions>({
        showHeights: true,
        showDepths: true,
        showRafters: true,
        showWindows: true,
        showWedges: true,
        showAngles: true,
        showPostDimensions: true,
    });

    const modelOptions = useMemo(() => getModelOptions(), []);
    const requiredInputs = useMemo(() => getModelInputs(selectedModel), [selectedModel]);

    useEffect(() => {
        const calculated = calculateDachrechner(selectedModel, inputs);
        setResults(calculated);
    }, [selectedModel, inputs]);

    const handleInputChange = (field: keyof DachrechnerInputs, value: string) => {
        const numValue = parseFloat(value) || 0;
        setInputs(prev => ({ ...prev, [field]: numValue }));
    };

    const toggleOption = (key: keyof DimensionOptions) => {
        setDimOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const fmt = (value: number | null, decimals: number = 0): string => {
        if (value === null || isNaN(value)) return '-';
        return value.toFixed(decimals);
    };

    const model = ROOF_MODELS[selectedModel];

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Dachrechner
                            </h1>
                            <p className="text-slate-500 mt-1">Kalkulator wymiarów konstrukcji dachowych</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-500">Wybrany model</div>
                            <div className="text-xl font-bold text-blue-600">{model.name}</div>
                        </div>
                    </div>
                </div>

                {/* Model Selector */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Wybierz Model</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {modelOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setSelectedModel(opt.id)}
                                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedModel === opt.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {opt.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Input Panel */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                Dane Wejściowe
                            </h2>

                            <div className="space-y-4">
                                {requiredInputs.includes('h3') && (
                                    <InputField label="H3 - Rinne [mm]" sublabel="Wysokość rynny" value={inputs.h3 || ''} onChange={v => handleInputChange('h3', v)} />
                                )}
                                <InputField label="Bestelltiefe [mm]" sublabel="Głębokość zamówienia" value={inputs.depth || ''} onChange={v => handleInputChange('depth', v)} />
                                {requiredInputs.includes('h1') && (
                                    <InputField label="H1 - Wandprofil [mm]" sublabel="Wysokość profilu ściennego" value={inputs.h1 || ''} onChange={v => handleInputChange('h1', v)} />
                                )}
                                {requiredInputs.includes('overhang') && (
                                    <InputField label="U1 - Überstand [mm]" sublabel="Wysunięcie dachu" value={inputs.overhang || ''} onChange={v => handleInputChange('overhang', v)} />
                                )}
                            </div>
                        </div>

                        {/* Dimension Toggles */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                Pokaż Wymiary
                            </h2>
                            <div className="space-y-2">
                                <ToggleBtn active={dimOptions.showHeights} onClick={() => toggleOption('showHeights')} label="Wysokości (H)" color="purple" />
                                <ToggleBtn active={dimOptions.showDepths} onClick={() => toggleOption('showDepths')} label="Głębokości (D)" color="cyan" />
                                <ToggleBtn active={dimOptions.showPostDimensions} onClick={() => toggleOption('showPostDimensions')} label="Ze słupem / Bez słupa" color="blue" />
                                <ToggleBtn active={dimOptions.showRafters} onClick={() => toggleOption('showRafters')} label="Krokwie (S)" color="orange" />
                                <ToggleBtn active={dimOptions.showWindows} onClick={() => toggleOption('showWindows')} label="Okna/Szyby (F)" color="teal" />
                                <ToggleBtn active={dimOptions.showWedges} onClick={() => toggleOption('showWedges')} label="Kliny/Keilfenster (K)" color="amber" />
                                <ToggleBtn active={dimOptions.showAngles} onClick={() => toggleOption('showAngles')} label="Kąty (α, β)" color="red" />
                            </div>
                        </div>
                    </div>

                    {/* Visualization */}
                    <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Wizualizacja</h2>
                        <div className="bg-slate-50/50 rounded-xl p-4 min-h-[400px] flex items-center justify-center border border-slate-100">
                            <DachrechnerDiagram
                                modelId={selectedModel}
                                inputs={inputs}
                                results={results}
                                options={dimOptions}
                            />
                        </div>
                    </div>
                </div>

                {/* Results Panel - All Dimensions */}
                {results && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Structural Dimensions */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Wymiary Konstrukcyjne</h2>

                            <div className="grid grid-cols-2 gap-4">
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
                                        <ResultRow label="mm/m" value={`${fmt(results.inclinationMmM, 1)}`} show={results.inclinationMmM !== null} />
                                        <ResultRow label="β Glas" value={`${fmt(results.angleBeta, 1)}°`} show={results.angleBeta !== null} />
                                    </ResultGroup>
                                )}

                                {/* Rafters */}
                                {dimOptions.showRafters && (
                                    <ResultGroup title="Krokwie (S)" icon="⌇" color="orange">
                                        <ResultRow label="S1 Mitte" value={`${fmt(results.sparrenMitte)} mm`} show={results.sparrenMitte !== null} />
                                        <ResultRow label="S1 Außen" value={`${fmt(results.sparrenAussen)} mm`} show={results.sparrenAussen !== null} />
                                    </ResultGroup>
                                )}

                                {/* Post Dimensions - ZE SŁUPEM / BEZ SŁUPA */}
                                {dimOptions.showPostDimensions && (
                                    <ResultGroup title="Słupy (D)" icon="▮" color="blue">
                                        <ResultRow label="D4 do słupa" value={`${fmt(results.depthD4post)} mm`} show={results.depthD4post !== null} highlight />
                                        <ResultRow label="D5 wolnostojący" value={`${fmt(results.depthD5)} mm`} show={results.depthD5 !== null} highlight />
                                        <ResultRow label="D2alt ściana-słup" value={`${fmt(results.depthD2alt)} mm`} show={results.depthD2alt !== null} />
                                    </ResultGroup>
                                )}
                            </div>
                        </div>

                        {/* Right: Depths and Window Dimensions */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Wymiary Elementów</h2>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Depths */}
                                {dimOptions.showDepths && (
                                    <ResultGroup title="Głębokości (D)" icon="↔" color="cyan">
                                        <ResultRow label="D1 Wandanschluss" value={`${fmt(results.depthD1)} mm`} show={results.depthD1 !== null} />
                                        <ResultRow label="D2 Standard" value={`${fmt(results.depthD2)} mm`} show={results.depthD2 !== null} />
                                        <ResultRow label="D3 Rund" value={`${fmt(results.depthD3)} mm`} show={results.depthD3 !== null} />
                                        <ResultRow label="D4 Klassik" value={`${fmt(results.depthD4)} mm`} show={results.depthD4 !== null} />
                                    </ResultGroup>
                                )}

                                {/* Windows - Keilfenster / Seitenteile */}
                                {dimOptions.showWindows && (
                                    <ResultGroup title="Okna / Szyby (F)" icon="⊞" color="teal">
                                        <ResultRow label="F1 Rinnenseite" value={`${fmt(results.fensterF1)} mm`} show={results.fensterF1 !== null} />
                                        <ResultRow label="F2 Breite" value={`${fmt(results.fensterF2)} mm`} show={results.fensterF2 !== null} />
                                        <ResultRow label="F3 Hausseite" value={`${fmt(results.fensterF3)} mm`} show={results.fensterF3 !== null} />
                                    </ResultGroup>
                                )}

                                {/* Wedges - Keilfenster */}
                                {dimOptions.showWedges && (
                                    <ResultGroup title="Kliny / Keilfenster (K)" icon="▲" color="amber">
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

                {/* Ideas and Enhancement Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        💡 Pomysły na Ulepszenia
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <IdeaCard
                            icon="📋"
                            title="Integracja z Klientami"
                            desc="Zapisuj obliczenia do klienta, historia obliczeń, powiązanie z ofertą"
                            status="planned"
                        />
                        <IdeaCard
                            icon="📄"
                            title="Eksport PDF"
                            desc="Generuj profesjonalny raport z wizualizacją i wymiarami dla klienta"
                            status="planned"
                        />
                        <IdeaCard
                            icon="📦"
                            title="Lista Materiałów (BOM)"
                            desc="Automatycznie generuj listę materiałów do zamówienia"
                            status="idea"
                        />
                        <IdeaCard
                            icon="📐"
                            title="Widok Boczny"
                            desc="Dodaj widok z boku (ściana stała boczna, Seitenteile)"
                            status="idea"
                        />
                        <IdeaCard
                            icon="🔧"
                            title="Szablony Konfiguracji"
                            desc="Zapisz popularne konfiguracje jako szablony do szybkiego użycia"
                            status="idea"
                        />
                        <IdeaCard
                            icon="📱"
                            title="Kopiuj do Schowka"
                            desc="Szybkie kopiowanie wymiarów do zamówienia u dostawcy"
                            status="idea"
                        />
                    </div>
                </div>
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
}

const InputField: React.FC<InputFieldProps> = ({ label, sublabel, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none font-mono text-lg"
        />
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
        purple: 'bg-purple-100 border-purple-300 text-purple-700',
        cyan: 'bg-cyan-100 border-cyan-300 text-cyan-700',
        blue: 'bg-blue-100 border-blue-300 text-blue-700',
        orange: 'bg-orange-100 border-orange-300 text-orange-700',
        teal: 'bg-teal-100 border-teal-300 text-teal-700',
        amber: 'bg-amber-100 border-amber-300 text-amber-700',
        red: 'bg-red-100 border-red-300 text-red-700',
    };

    return (
        <button
            onClick={onClick}
            className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2
                ${active ? colors[color] : 'bg-slate-50 border-slate-200 text-slate-400'}`}
        >
            <span className={`w-3 h-3 rounded-full ${active ? 'bg-current' : 'bg-slate-300'}`}></span>
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
    red: 'border-red-200 bg-red-50/50',
    purple: 'border-purple-200 bg-purple-50/50',
    blue: 'border-blue-200 bg-blue-50/50',
    orange: 'border-orange-200 bg-orange-50/50',
    teal: 'border-teal-200 bg-teal-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
    indigo: 'border-indigo-200 bg-indigo-50/50',
    cyan: 'border-cyan-200 bg-cyan-50/50',
};

const ResultGroup: React.FC<ResultGroupProps> = ({ title, icon, color, children }) => (
    <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm">
            <span>{icon}</span>
            {title}
        </h3>
        <div className="space-y-1">
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
        <div className={`flex justify-between items-center py-0.5 text-xs ${highlight ? 'font-bold text-blue-700' : 'text-slate-600'}`}>
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    );
};

interface IdeaCardProps {
    icon: string;
    title: string;
    desc: string;
    status: 'planned' | 'idea';
}

const IdeaCard: React.FC<IdeaCardProps> = ({ icon, title, desc, status }) => (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{icon}</span>
            <span className="font-bold text-slate-700">{title}</span>
            {status === 'planned' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Planowane</span>}
        </div>
        <p className="text-slate-500 text-xs">{desc}</p>
    </div>
);

export default DachrechnerPage;
