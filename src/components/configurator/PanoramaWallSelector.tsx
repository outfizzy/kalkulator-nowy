
import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

import type { AddonPriceEntry } from '../../services/pricing.service';
interface PanoramaWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    availableItems: AddonPriceEntry[];
}

export const PanoramaWallSelector: React.FC<PanoramaWallSelectorProps> = ({
    onAdd,
    onRemove,
    currentAddons,
    availableItems
}) => {
    const existing = currentAddons.find(a => a.id.startsWith('panorama-'));

    // 1. Group Available Models
    // Filter items that are 'panorama' type. 
    // Usually 'availableItems' prop already filtered by ProductConfigurator to only include 'panorama' group.
    const availableModels = useMemo(() => {
        // De-duplicate by ID
        const unique = availableItems.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.id === item.id
            ))
        );
        return unique;
    }, [availableItems]);

    // 2. Select Model
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const [width, setWidth] = useState(3000);
    const [height, setHeight] = useState(2500);
    const [numTracks, setNumTracks] = useState(3);

    // Auto-select loop
    useEffect(() => {
        if (availableModels.length > 0) {
            // Try to find one matching existing? 
            if (existing && !selectedModelId) {
                const match = availableModels.find(m => existing.name.includes(m.addon_name));
                if (match) {
                    setSelectedModelId(match.id);
                    return;
                }
            }

            if (!selectedModelId) {
                setSelectedModelId(availableModels[0].id);
            }
        }
    }, [availableModels, existing, selectedModelId]);

    // Track Count Logic
    // If selected model is specific (e.g. 'Panorama AL22 3-Tor'), it might imply track count.
    // If selected model is generic 'Panorama AL22', we might need to select tracks.
    // However, usually Panorama pricing is Specific Item per Track Count OR Matrix.
    // Let's assume user selects the "Model Family" (e.g. AL23) and we find the specific item variant?
    // OR: usage of 'systemType' logic in original code suggests AL22/AL23 are toggleable.
    // We should allow selecting the *specific price list item* directly via dropdown.

    // Actually, for Panorama, usually we have different items for 3-rail, 4-rail etc.
    // If the imported items are separate (e.g. "AL22 3-gleisig", "AL22 4-gleisig"), 
    // then the Model Selector might become a list of "AL22 3-gleisig", "AL22 4-gleisig"...
    // That's okay, user picks exact system config.
    // OR we can try to group them. 
    // Let's keep it simple: Select the "Price List Item" (Model).

    const selectedModel = availableModels.find(m => m.id === selectedModelId);

    // Derive system type (e.g. AL23)
    const systemType = selectedModel ? (selectedModel.addon_name.match(/AL\d+/) || ['AL23'])[0] : 'AL23';

    // Parse Tracks from Selected Model Name if possible, else default
    useEffect(() => {
        if (selectedModel) {
            const match = selectedModel.addon_name.match(/(\d+)[- ](tor|rail|spur|gleis|lauf)/i);
            if (match) setNumTracks(parseInt(match[1]));
        }
    }, [selectedModel]);

    // Panel Width Check
    const panelWidth = width / numTracks;
    const isDimensionValid = panelWidth >= 500 && panelWidth <= 1500;

    // Pricing Logic via Service
    const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
    const [itemLabel, setItemLabel] = useState<string>('');

    // Define available tracks (Standard options)
    const availableTracks = [3, 4, 5];

    // Calculate Price
    useEffect(() => {
        const calculate = async () => {
            if (!selectedModel) {
                setCalculatedPrice(0);
                setItemLabel('');
                return;
            }

            setItemLabel(selectedModel.addon_name);
            const unitPrice = await PricingService.calculateAddonPrice(selectedModel, width, height);

            // Multiply by number of tracks (panels)
            setCalculatedPrice(unitPrice * numTracks);
        };
        calculate();
    }, [selectedModel, width, height, numTracks]);

    const { totalPrice, breakdown } = useMemo(() => {
        if (calculatedPrice <= 0) return { totalPrice: 0, breakdown: [] };

        return {
            totalPrice: calculatedPrice,
            breakdown: [{ name: itemLabel, price: calculatedPrice }]
        };
    }, [calculatedPrice, itemLabel]);

    const handleAdd = () => {
        onAdd({
            id: `panorama-${systemType}`,
            type: 'panorama',
            name: `Panorama ${systemType} (${numTracks} Tory)`,
            variant: `${numTracks}_tracks`,
            width,
            height,
            quantity: 1,
            price: totalPrice,
            description: breakdown.map(i => i.name).join(', ')
        });
    };

    if (availableItems.length === 0) {
        return <div className="p-4 text-center text-slate-400">Brak danych cennikowych dla systemów Panorama.</div>;
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg">Panorama Schiebewand</h4>
                    <p className="text-sm text-slate-500">System przesuwny bezramowy</p>
                </div>
                {existing && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Wybrano</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Model Selector (New) */}
                    {availableModels.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Model Systemu</label>
                            <select
                                value={selectedModelId}
                                onChange={(e) => setSelectedModelId(e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                            >
                                {availableModels.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.addon_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* System Selection (Legacy/Fallback - Optional, might remove if Model Selector covers found variant) */}
                    {/* Only show legacy buttons if NO model selected or if we want to filter generic types */}
                    {/* For now, keep it but maybe strictly rely on Model Selector? */}
                    {/* Actually, if user picks a specific model, we don't need AL22/AL23 toggle if the model name implies it. */}
                    {/* But let's keep it compatible for now. */}

                    {/* Dimensions */}

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Szerokość (mm)</label>
                            <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full border p-2 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Wysokość (mm)</label>
                            <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full border p-2 rounded-lg" />
                        </div>
                    </div>

                    {/* Tracks */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Liczba Torów</label>
                        <div className="flex flex-wrap gap-2">
                            {availableTracks.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setNumTracks(t)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${numTracks === t ? 'border-accent bg-accent text-white' : 'border-slate-200'}`}
                                >
                                    {t} Tory
                                </button>
                            ))}
                        </div>
                        {!isDimensionValid && (
                            <p className="text-red-500 text-xs mt-2">Uwaga: Nietypowa szerokość panelu ({Math.round(panelWidth)}mm).</p>
                        )}
                    </div>
                </div>

                {/* Summary & Visualization Placeholder */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800 mb-4">Podsumowanie</h5>
                    <div className="space-y-2 mb-6">
                        {breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-600">
                                <span>{item.name}</span>
                                <span>{formatCurrency(item.price)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-200 mb-4">
                        <span className="font-bold">Razem:</span>
                        <span className="font-bold text-accent text-xl">{formatCurrency(totalPrice)}</span>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-dark"
                    >
                        {existing ? 'Zaktualizuj' : 'Dodaj do Oferty'}
                    </button>
                    {existing && (
                        <button onClick={() => onRemove(existing.id)} className="w-full mt-2 text-red-500 text-sm hover:underline">Usuń</button>
                    )}
                </div>
            </div>
        </div>
    );
};
