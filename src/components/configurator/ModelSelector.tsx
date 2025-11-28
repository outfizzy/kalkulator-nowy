import React from 'react';
import type { ProductModel } from '../../types';
import catalogData from '../../data/catalog.json';

interface ModelSelectorProps {
    onSelect: (modelId: string) => void;
    selectedModelId?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelect, selectedModelId }) => {
    const models = catalogData.models as unknown as ProductModel[];

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-800">Wybierz Model Zadaszenia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((model) => (
                    <div
                        key={model.id}
                        onClick={() => onSelect(model.id)}
                        className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${selectedModelId === model.id
                            ? 'border-accent ring-2 ring-accent/20'
                            : 'border-slate-200 hover:border-accent/50'
                            }`}
                    >
                        <div className="aspect-video bg-slate-100 relative">
                            {/* Placeholder for image */}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                {model.image ? (
                                    <img src={model.image} alt={model.name} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <span>Brak zdjęcia</span>
                                )}
                            </div>
                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-slate-700">
                                Max {model.maxSnowLoad} kN/m²
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-lg text-slate-900">{model.name}</h4>
                            <p className="text-sm text-slate-500 mt-1">{model.description}</p>
                            <div className="mt-3 flex gap-2">
                                {model.roofTypes.includes('glass') && (
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Szkło</span>
                                )}
                                {model.roofTypes.includes('polycarbonate') && (
                                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">Poliwęglan</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
