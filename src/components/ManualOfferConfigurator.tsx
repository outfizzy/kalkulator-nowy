import React, { useState } from 'react';
import type { ProductConfig } from '../types';

interface ManualOfferConfiguratorProps {
    onComplete: (config: ProductConfig) => void;
    initialData?: ProductConfig;
}

export const ManualOfferConfigurator: React.FC<ManualOfferConfiguratorProps> = ({
    onComplete,
    initialData
}) => {
    // Basic state for standard config (for visualization)
    const [modelId, setModelId] = useState<string>(initialData?.modelId || '');
    const [roofType, setRoofType] = useState<ProductConfig['roofType']>(initialData?.roofType || 'polycarbonate');

    // Manual inputs
    const [description, setDescription] = useState(initialData?.manualDescription || '');
    const [price, setPrice] = useState<string>(initialData?.manualPrice?.toString() || '');

    // List of models for visualization selection
    const models = [
        { id: 'trendstyle', name: 'Trendstyle', type: 'polycarbonate' },
        { id: 'trendstyle_plus', name: 'Trendstyle+', type: 'polycarbonate' },
        { id: 'topstyle', name: 'Topstyle', type: 'polycarbonate' },
        { id: 'topstyle_xl', name: 'Topstyle XL', type: 'polycarbonate' },
        { id: 'skystyle', name: 'Skystyle', type: 'glass' },
        { id: 'ultrastyle', name: 'Ultrastyle', type: 'polycarbonate' },
        { id: 'carport', name: 'Carport', type: 'polycarbonate' },
        { id: 'orangestyle', name: 'Orangestyle', type: 'polycarbonate' }
    ];

    const handleSubmit = () => {
        if (!modelId) {
            alert('Wybierz model produktu (dla wizualizacji)');
            return;
        }
        if (!description) {
            alert('Podaj opis oferty');
            return;
        }
        if (!price || isNaN(Number(price))) {
            alert('Podaj poprawną cenę');
            return;
        }

        const config: ProductConfig = {
            modelId,
            roofType,
            width: 5000, // Dummy for validation if needed, or visualization default
            projection: 3000, // Dummy
            color: 'RAL 7016', // Default for visualization
            customColor: false,
            installationType: 'wall-mounted', // Default
            addons: [],
            isManual: true, // FLAG FOR MANUAL MODE
            manualDescription: description,
            manualPrice: Number(price)
        };

        onComplete(config);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Model Selection (Visuals only) */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🖼️</span> Wybierz Model (do wizualizacji)
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    Ten model zostanie pokazany klientowi na wizualizacji w ofercie. Nie wpływa on na cenę w trybie ręcznym.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {models.map(model => (
                        <div
                            key={model.id}
                            onClick={() => {
                                setModelId(model.id);
                                if (model.id === 'skystyle') setRoofType('glass');
                                else setRoofType('polycarbonate');
                            }}
                            className={`cursor-pointer border-2 rounded-xl p-4 transition-all relative ${modelId === model.id
                                ? 'border-accent bg-accent/5 shadow-md'
                                : 'border-slate-100 hover:border-accent/30'
                                }`}
                        >
                            <div className={`w-3 h-3 rounded-full absolute top-3 right-3 ${modelId === model.id ? 'bg-accent' : 'bg-slate-200'}`} />
                            <h3 className="text-lg font-bold mb-1 text-slate-900">{model.name}</h3>
                            <p className="text-xs text-slate-500">{model.type === 'glass' ? 'Tylko Szkło VSG' : 'Poliwęglan / Szkło'}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 2. Manual Inputs */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">✍️</span> Opis i Cena (Ręcznie)
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pełny Opis Oferty / Specyfikacja</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                            className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none font-mono text-sm"
                            placeholder="Wpisz tutaj pełną treść oferty, która ma się wyświetlić klientowi.&#10;Np:&#10;- Zadaszenie Trendstyle 4000x3000mm&#10;- Kolor RAL 7016&#10;- Oświetlenie LED (6 punktów)&#10;- Montaż w cenie"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            To pole zastąpi standardową tabelę techniczną w podglądzie oferty dla klienta.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cena Netto (EUR)</label>
                        <div className="relative max-w-xs">
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none text-lg font-bold"
                                placeholder="0.00"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">EUR</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSubmit}
                    className="px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg shadow-xl shadow-accent/20 hover:bg-accent/90 transition-all transform hover:-translate-y-0.5"
                >
                    Zatwierdź Ofertę Ręczną ➜
                </button>
            </div>
        </div>
    );
};
