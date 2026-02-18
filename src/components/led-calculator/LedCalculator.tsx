import React, { useState, useMemo, useCallback } from 'react';
import {
    type LedRoofType,
    type LedControlType,
    type LedInputs,
    type LedElementConfig,
    type LedResults,
    ROOF_TYPE_CONFIGS,
    getRoofTypeOptions,
    getAvailableElements,
    createDefaultInputs,
    calculateLedConfig,
    formatPrice,
} from '../../services/led-calculator.service';
import { LedPartsTable } from './LedPartsTable';
import { LedDiagram } from './LedDiagram';

// ==================== STEP INDICATOR ====================

const StepIndicator: React.FC<{ currentStep: number; onStepClick: (step: number) => void }> = ({ currentStep, onStepClick }) => {
    const steps = [
        { num: 1, label: 'Dachtyp & Steuerung', icon: '🏠' },
        { num: 2, label: 'Konfiguration', icon: '⚡' },
        { num: 3, label: 'Ergebnis', icon: '📋' },
    ];

    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, i) => (
                <React.Fragment key={step.num}>
                    {i > 0 && (
                        <div className={`h-0.5 w-12 transition-colors ${currentStep >= step.num ? 'bg-amber-400' : 'bg-slate-200'}`} />
                    )}
                    <button
                        onClick={() => onStepClick(step.num)}
                        disabled={step.num > currentStep + 1}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                            ${currentStep === step.num
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-200/50 scale-105'
                                : currentStep > step.num
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <span className="text-lg">{step.icon}</span>
                        <span className="hidden sm:inline">{step.label}</span>
                        <span className="sm:hidden">{step.num}</span>
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};

// ==================== ROOF TYPE CARD ====================

const RoofTypeCard: React.FC<{
    roofType: LedRoofType;
    label: string;
    labelDE: string;
    isSelected: boolean;
    onClick: () => void;
}> = ({ roofType, label, labelDE, isSelected, onClick }) => {
    const config = ROOF_TYPE_CONFIGS[roofType];

    const getIcon = () => {
        if (roofType.includes('Carport')) return '🚗';
        if (roofType.includes('Skyline')) return '🏙️';
        if (roofType.includes('Ultraline')) return '📐';
        if (roofType.includes('O_Oplus')) return '🏡';
        return '🏠';
    };

    return (
        <button
            onClick={onClick}
            className={`relative p-4 rounded-2xl border-2 transition-all text-left group hover:scale-[1.02]
                ${isSelected
                    ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-100/50 ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-md'
                }`}
        >
            {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs">✓</span>
                </div>
            )}
            <div className="text-2xl mb-2">{getIcon()}</div>
            <h3 className={`font-bold text-sm leading-tight ${isSelected ? 'text-amber-900' : 'text-slate-800'}`}>
                {labelDE}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
                {config.isFreestanding && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">
                        Freistand
                    </span>
                )}
                {config.hasWandanschluss && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        Wandanschluss
                    </span>
                )}
                {config.hasOverstand && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                        Überstand
                    </span>
                )}
            </div>
        </button>
    );
};

// ==================== ELEMENT CONFIG ROW ====================

const ElementConfigRow: React.FC<{
    label: string;
    config: LedElementConfig;
    maxStripes: number;
    maxSpots: number;
    onChange: (config: LedElementConfig) => void;
    disabled?: boolean;
}> = ({ label, config, maxStripes, maxSpots, onChange, disabled }) => {
    return (
        <div className={`flex items-center gap-3 py-3 px-4 rounded-xl border transition-all
            ${(config.stripes > 0 || config.spots > 0)
                ? 'border-amber-200 bg-amber-50/50'
                : 'border-slate-100 bg-white'
            }
            ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
            </div>

            {/* Stripes */}
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 w-14 text-right">Stripes:</span>
                <div className="flex gap-0.5">
                    {Array.from({ length: maxStripes + 1 }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => onChange({ ...config, stripes: i })}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                                ${config.stripes === i
                                    ? 'bg-amber-400 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            {i}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spots */}
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 w-10 text-right">Spots:</span>
                <div className="flex gap-0.5">
                    {Array.from({ length: maxSpots + 1 }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => onChange({ ...config, spots: i })}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                                ${config.spots === i
                                    ? 'bg-sky-400 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            {i}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================

interface LedCalculatorProps {
    onSave?: (data: { inputs: LedInputs; results: LedResults }) => void;
    initialData?: { inputs: LedInputs; results: LedResults };
}

export const LedCalculator: React.FC<LedCalculatorProps> = ({ onSave, initialData }) => {
    const [step, setStep] = useState(initialData ? 3 : 1);
    const [inputs, setInputs] = useState<LedInputs>(initialData?.inputs || createDefaultInputs());
    const [results, setResults] = useState<LedResults | null>(initialData?.results || null);

    const config = ROOF_TYPE_CONFIGS[inputs.roofType];
    const roofOptions = useMemo(() => getRoofTypeOptions(), []);

    // Update mittelsparren array when field count changes
    const updateFieldCount = useCallback((count: number) => {
        const clamped = Math.max(1, Math.min(12, count));
        const mittelsparrenCount = config.hasMittelsparren ? Math.max(0, clamped - 1) : 0;
        const currentMs = inputs.mittelsparren;
        const newMs: LedElementConfig[] = Array.from({ length: mittelsparrenCount }, (_, i) =>
            currentMs[i] || { stripes: 0, spots: 0 }
        );
        setInputs(prev => ({ ...prev, fieldCount: clamped, mittelsparren: newMs }));
    }, [config.hasMittelsparren, inputs.mittelsparren]);

    const handleRoofTypeChange = useCallback((roofType: LedRoofType) => {
        const newConfig = ROOF_TYPE_CONFIGS[roofType];
        setInputs(prev => {
            const mittelsparrenCount = newConfig.hasMittelsparren ? Math.max(0, prev.fieldCount - 1) : 0;
            return {
                ...prev,
                roofType,
                wandanschluss: newConfig.hasWandanschluss ? prev.wandanschluss : { stripes: 0, spots: 0 },
                mittelsparren: Array.from({ length: mittelsparrenCount }, (_, i) =>
                    prev.mittelsparren[i] || { stripes: 0, spots: 0 }
                ),
            };
        });
    }, []);

    const handleCalculate = useCallback(() => {
        const calculatedResults = calculateLedConfig(inputs);
        setResults(calculatedResults);
        setStep(3);
    }, [inputs]);

    const handleSave = useCallback(() => {
        if (results && onSave) {
            onSave({ inputs, results });
        }
    }, [inputs, results, onSave]);

    // ==================== STEP 1: ROOF TYPE ====================
    const renderStep1 = () => (
        <div className="space-y-8">
            {/* Roof Type Selection */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Dachtyp wählen</h2>
                <p className="text-sm text-slate-500 mb-4">Wählen Sie den Typ des Daches für die LED-Beleuchtung</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {roofOptions.map(opt => (
                        <RoofTypeCard
                            key={opt.id}
                            roofType={opt.id}
                            label={opt.label}
                            labelDE={opt.labelDE}
                            isSelected={inputs.roofType === opt.id}
                            onClick={() => handleRoofTypeChange(opt.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Control Type */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Steuerung</h2>
                <p className="text-sm text-slate-500 mb-4">Wählen Sie die Steuerungsart für die LED-Beleuchtung</p>
                <div className="flex gap-3">
                    {(['Standard', 'Somfy iO'] as LedControlType[]).map(ct => (
                        <button
                            key={ct}
                            onClick={() => setInputs(prev => ({ ...prev, controlType: ct }))}
                            className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center
                                ${inputs.controlType === ct
                                    ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg'
                                    : 'border-slate-200 bg-white hover:border-amber-200'
                                }`}
                        >
                            <div className="text-2xl mb-1">{ct === 'Standard' ? '🎛️' : '📱'}</div>
                            <span className="font-bold text-sm">{ct}</span>
                            <p className="text-xs text-slate-500 mt-1">
                                {ct === 'Standard' ? 'Mit Fernbedienung' : 'Smart Home Integration'}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Remote control */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <input
                    type="checkbox"
                    id="includeRemote"
                    checked={inputs.includeRemote}
                    onChange={e => setInputs(prev => ({ ...prev, includeRemote: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="includeRemote" className="text-sm font-medium text-slate-700 cursor-pointer">
                    inkl. Fernbedienung
                </label>
            </div>

            <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm shadow-lg shadow-amber-200/50 hover:shadow-xl hover:scale-[1.01] transition-all"
            >
                Weiter zur Konfiguration →
            </button>
        </div>
    );

    // ==================== STEP 2: CONFIGURATION ====================
    const renderStep2 = () => (
        <div className="space-y-6">
            {/* Dimensions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Feldzahl (1-12)</label>
                    <input
                        type="number"
                        min={1}
                        max={12}
                        value={inputs.fieldCount}
                        onChange={e => updateFieldCount(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Breite (mm)</label>
                    <input
                        type="number"
                        min={1000}
                        max={15000}
                        step={100}
                        value={inputs.width}
                        onChange={e => setInputs(prev => ({ ...prev, width: parseInt(e.target.value) || 1000 }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tiefe (mm)</label>
                    <input
                        type="number"
                        min={1000}
                        max={12000}
                        step={100}
                        value={inputs.depth}
                        onChange={e => setInputs(prev => ({ ...prev, depth: parseInt(e.target.value) || 1000 }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                    />
                </div>
                {config.hasOverstand && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Überstand (mm)</label>
                        <input
                            type="number"
                            min={0}
                            max={4000}
                            step={100}
                            value={inputs.overstandDepth || 0}
                            onChange={e => setInputs(prev => ({ ...prev, overstandDepth: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                        />
                    </div>
                )}
            </div>

            {/* Visual Diagram */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <LedDiagram inputs={inputs} />
            </div>

            {/* LED Configuration per Element */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">LED-Auswahl pro Element</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Wählen Sie die Anzahl der Stripes und Spots für jedes Bauteil
                </p>

                <div className="space-y-2">
                    {/* Rinne */}
                    <ElementConfigRow
                        label="🔲 Rinne"
                        config={inputs.rinne}
                        maxStripes={config.maxStripes.rinne}
                        maxSpots={config.maxSpots.rinne}
                        onChange={c => setInputs(prev => ({ ...prev, rinne: c }))}
                    />

                    {/* Außensparren links */}
                    <ElementConfigRow
                        label="◀️ Außensparren (links)"
                        config={inputs.aussensparrenLinks}
                        maxStripes={config.maxStripes.aussensparren}
                        maxSpots={config.maxSpots.aussensparren}
                        onChange={c => setInputs(prev => ({ ...prev, aussensparrenLinks: c }))}
                    />

                    {/* Mittelsparren */}
                    {config.hasMittelsparren && inputs.mittelsparren.map((ms, i) => (
                        <ElementConfigRow
                            key={`ms-${i}`}
                            label={`🔸 Mittelsparren ${i + 1}`}
                            config={ms}
                            maxStripes={config.maxStripes.mittelsparren}
                            maxSpots={config.maxSpots.mittelsparren}
                            onChange={c => {
                                const newMs = [...inputs.mittelsparren];
                                newMs[i] = c;
                                setInputs(prev => ({ ...prev, mittelsparren: newMs }));
                            }}
                        />
                    ))}

                    {!config.hasMittelsparren && (
                        <div className="py-2 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                            <span className="text-xs text-slate-400 italic">
                                Keine Mittelsparren für diesen Dachtyp
                            </span>
                        </div>
                    )}

                    {/* Außensparren rechts */}
                    <ElementConfigRow
                        label="▶️ Außensparren (rechts)"
                        config={inputs.aussensparrenRechts}
                        maxStripes={config.maxStripes.aussensparren}
                        maxSpots={config.maxSpots.aussensparren}
                        onChange={c => setInputs(prev => ({ ...prev, aussensparrenRechts: c }))}
                    />

                    {/* Wandanschluss */}
                    {config.hasWandanschluss && (
                        <ElementConfigRow
                            label="🧱 Wandanschluss"
                            config={inputs.wandanschluss}
                            maxStripes={config.maxStripes.wandanschluss}
                            maxSpots={config.maxSpots.wandanschluss}
                            onChange={c => setInputs(prev => ({ ...prev, wandanschluss: c }))}
                        />
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                >
                    ← Zurück
                </button>
                <button
                    onClick={handleCalculate}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm shadow-lg shadow-amber-200/50 hover:shadow-xl hover:scale-[1.01] transition-all"
                >
                    Berechnen & Stückliste anzeigen →
                </button>
            </div>
        </div>
    );

    // ==================== STEP 3: RESULTS ====================
    const renderStep3 = () => {
        if (!results) return null;

        return (
            <div className="space-y-6">
                {/* Summary header */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">💡</span>
                        <div>
                            <h2 className="text-lg font-bold">LED Beleuchtung — Kalkulation</h2>
                            <p className="text-amber-100 text-sm">
                                {config.labelDE} • {inputs.controlType} • {inputs.fieldCount} Felder
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                            <div className="text-xs text-amber-100 mb-0.5">Netto (EK)</div>
                            <div className="text-xl font-bold">{formatPrice(results.totalNet)}</div>
                        </div>
                        <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                            <div className="text-xs text-amber-100 mb-0.5">Netto (Endkunde)</div>
                            <div className="text-xl font-bold">{formatPrice(results.endCustomerNet)}</div>
                        </div>
                        <div className="bg-white/30 rounded-xl p-3 backdrop-blur-sm">
                            <div className="text-xs text-amber-100 mb-0.5">Brutto (Endkunde)</div>
                            <div className="text-xl font-bold">{formatPrice(results.endCustomerGross)}</div>
                        </div>
                    </div>
                </div>

                {/* Diagram */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">LED-Platzierung</h3>
                    <LedDiagram inputs={inputs} />
                </div>

                {/* Parts table */}
                <LedPartsTable results={results} />

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setStep(2)}
                        className="px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                    >
                        ← Bearbeiten
                    </button>
                    {onSave && (
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:scale-[1.01] transition-all"
                        >
                            💾 Konfiguration speichern
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <StepIndicator currentStep={step} onStepClick={setStep} />

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 md:p-8">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
};
