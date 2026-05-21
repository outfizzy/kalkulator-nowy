import React, { useState } from 'react';
import { Image, PenLine, ArrowRight } from 'lucide-react';
import type { ProductConfig } from '../types';

interface ManualOfferConfiguratorProps {
    onComplete: (config: ProductConfig) => void;
    initialData?: ProductConfig;
}

// Full model list — synced with ProductConfiguratorV2 ROOF_MODELS
const ALL_MODELS = [
    { id: 'Orangeline', name: 'Orangestyle', hasPoly: true, hasGlass: true, image_url: '/images/models/orangeline.jpg' },
    { id: 'Orangeline+', name: 'Orangestyle+', hasPoly: true, hasGlass: true, image_url: '/images/models/orangeline-plus.jpg' },
    { id: 'Trendline', name: 'Trendstyle', hasPoly: true, hasGlass: true, image_url: '/images/models/trendline.jpg' },
    { id: 'Trendline+', name: 'Trendstyle+', hasPoly: true, hasGlass: true, image_url: '/images/models/trendline-plus.jpg' },
    { id: 'Topline', name: 'Topstyle', hasPoly: true, hasGlass: true, image_url: '/images/models/topline.jpg' },
    { id: 'Topline XL', name: 'Topstyle XL', hasPoly: true, hasGlass: true, image_url: '/images/models/topline-xl.jpg' },
    { id: 'Designline', name: 'Designstyle', hasPoly: false, hasGlass: true, image_url: '/images/models/designline.jpg' },
    { id: 'Ultraline', name: 'Ultrastyle', hasPoly: false, hasGlass: true, image_url: '/images/models/ultraline.jpg' },
    { id: 'Skyline', name: 'Skystyle', hasPoly: false, hasGlass: false, image_url: '/images/models/skyline.jpg' },
    { id: 'Carport', name: 'Carport', hasPoly: false, hasGlass: false, image_url: '/images/models/carport.jpg' },
    // Teranda
    { id: 'TR10', name: 'Orangestyle 10', hasPoly: true, hasGlass: true, image_url: '/images/models/teranda-tr10.jpg' },
    { id: 'TR15', name: 'Trendstyle 15', hasPoly: true, hasGlass: true, image_url: '/images/models/teranda-tr15.jpg' },
    { id: 'TR20', name: 'Topstyle 20', hasPoly: true, hasGlass: true, image_url: '/images/models/teranda-tr20.jpg' },
    // Pergola Luxe
    { id: 'Pergola', name: 'Pergola', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola.jpg' },
    { id: 'Pergola Deluxe', name: 'Pergola Deluxe', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola-deluxe.jpg' },
    { id: 'Pergola Luxe', name: 'Pergola Luxe (Manuell)', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
    { id: 'Pergola Luxe Electric', name: 'Pergola Luxe (Elektrisch)', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
];

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
                    <Image className="w-6 h-6 text-indigo-500" /> Wybierz Model (do wizualizacji)
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    Ten model zostanie pokazany klientowi na wizualizacji w ofercie. Nie wpływa on na cenę w trybie ręcznym.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {ALL_MODELS.map(model => {
                        const isSelected = modelId === model.id;
                        return (
                            <div
                                key={model.id}
                                onClick={() => {
                                    setModelId(model.id);
                                    if (model.hasGlass && !model.hasPoly) setRoofType('glass');
                                    else setRoofType('polycarbonate');
                                }}
                                className={`cursor-pointer border-2 rounded-xl overflow-hidden transition-all relative group ${isSelected
                                    ? 'border-accent ring-2 ring-accent/20 shadow-lg'
                                    : 'border-slate-100 hover:border-accent/40 hover:shadow-md'
                                    }`}
                            >
                                {/* Image */}
                                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
                                    <img
                                        src={model.image_url}
                                        alt={model.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                    <div className="fallback-icon absolute inset-0 items-center justify-center text-slate-300 hidden">
                                        <Image className="w-10 h-10" />
                                    </div>
                                    {/* Selection indicator */}
                                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                        ? 'bg-accent border-accent'
                                        : 'bg-white/80 border-slate-300'}`}>
                                        {isSelected && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                {/* Info */}
                                <div className="p-3">
                                    <h4 className="font-bold text-sm text-slate-900 leading-tight">{model.name}</h4>
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                        {model.hasGlass && (
                                            <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">Szkło</span>
                                        )}
                                        {model.hasPoly && (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Poliwęglan</span>
                                        )}
                                        {!model.hasGlass && !model.hasPoly && (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Lamele</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 2. Manual Inputs */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PenLine className="w-6 h-6 text-indigo-500" /> Opis i Cena (Ręcznie)
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pełny Opis Oferty / Specyfikacja</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                            className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none font-mono text-sm"
                            placeholder={"Wpisz tutaj pełną treść oferty, która ma się wyświetlić klientowi.\nNp:\n- Zadaszenie Trendstyle 4000x3000mm\n- Kolor RAL 7016\n- Oświetlenie LED (6 punktów)\n- Montaż w cenie"}
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
                    className="px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg shadow-xl shadow-accent/20 hover:bg-accent/90 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                    Zatwierdź Ofertę Ręczną <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
