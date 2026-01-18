
import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';
import { PricingService } from '../../services/pricing.service';

type GlassType = 'standard' | 'matt' | 'ig';

interface AluminumWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofWidth?: number;
    maxRoofDepth?: number;

    availableItems: AddonPriceEntry[];
}

import type { AddonPriceEntry } from '../../services/pricing.service';

export const AluminumWallSelector: React.FC<AluminumWallSelectorProps> = ({
    onAdd,
    onRemove,
    maxRoofDepth = 3000,
    availableItems,
}) => {
    // Component State
    const [activeTab, setActiveTab] = useState<WallType>('side');

    // Side Wall State
    const [sideWidth, setSideWidth] = useState<number>(3000);
    const [sideHeight, setSideHeight] = useState<number>(2500); // Fixed or default
    const [sideGlass, setSideGlass] = useState<GlassType>('standard');
    const [sideSprosse, setSideSprosse] = useState<boolean>(false);
    const [sideQty, setSideQty] = useState<number>(0);
    const [sideExtras, setSideExtras] = useState<Set<string>>(new Set());

    // Front Wall State
    const [frontWidth, setFrontWidth] = useState<number>(3000);
    const [frontHeight, setFrontHeight] = useState<number>(2500);
    const [frontGlass, setFrontGlass] = useState<GlassType>('standard');
    const [frontSprosse, setFrontSprosse] = useState<boolean>(false);
    const [frontQty, setFrontQty] = useState<number>(0);
    const [frontExtras, setFrontExtras] = useState<Set<string>>(new Set());

    const currentType = activeTab;
    const currentQty = currentType === 'side' ? sideQty : frontQty;
    const currentExtras = currentType === 'side' ? sideExtras : frontExtras;

    const toggleExtra = (id: string, type: WallType) => {
        const setFn = type === 'side' ? setSideExtras : setFrontExtras;
        const current = type === 'side' ? sideExtras : frontExtras;
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setFn(next);
    };


    // Auto-default side width to roof depth
    React.useEffect(() => {
        if (maxRoofDepth) setSideWidth(maxRoofDepth);
    }, [maxRoofDepth]);

    // Helper to calculate extras price
    const calculateExtrasPrice = (extras: Set<string>) => {
        let sum = 0;
        extras.forEach(id => {
            const item = availableItems.find(i => i.id === id);
            if (item) sum += item.price_upe_net_eur;
        });
        return sum;
    };

    // Simplified Calculation using PricingService
    const calculatePrice = (width: number, height: number, glass: GlassType, sprosse: boolean) => {
        // Find best matching wall base price from availableItems
        // We look for items with pricing_basis = 'BY_WIDTH' or 'PER_M2' or 'FIXED' that match "Wall"
        // In Manual Pricing, we might have specific addon codes for "Wall Base" vs "Wall Extra".
        // Use heuristics or specific codes if defined.

        // For now, let's assume availableItems contains "Extra" options (like Sprosse, Matt Glass)
        // AND maybe base wall items?
        // Actually, in the old logic, Base Price came from `sideTables` (Matrix).
        // In New Logic, Base Price must be in `pricing_addons` too, likely as 'wall_base' or similar.
        // Let's assume we filter availableItems for 'wall_base'.

        // TEMPORARY: If no base item found, default to 0. 
        // We rely on "Extras" mostly here? No, Walls MUST have a base price.
        // The user imported data should have it.

        // Heuristic: Find item with name containing "Ściana" or "Wall" and pricing_basis
        // OR rely on a passed prop `baseWallItem`. 
        // Since we only get `availableItems` (addons), we might need `baseItems` too?
        // Or `availableItems` INCLUDES base items.

        // Let's iterate availableItems to find a "Base" match if possible, or just calculate extras.
        // For MVP Manual Import, maybe user adds "Wall" as an addon?

        // Fallback to legacy calc style if pure addons:
        let price = 0; // Base is 0 if not found

        // Try finding a match by width? 
        // This is complex without data. 
        // Let's assume the price is purely composed of selected "Addons" for now OR
        // we use a specific "Wall Base" item if it exists.

        return price;
    };

    // We need to fetch the actual price from the PricingService or Data.
    // For Manual Mode: We probably need a "Find Price" button or auto-calc based on new Service.
    // Let's assume `availableItems` contains everything.

    // 1. Group Available Models (Base Walls)
    const availableModels = useMemo(() => {
        // Filter items that look like "Base Models" (not small extras like Sprosse/Glass upgrade if separate)
        // Heuristic: Price > 100 EUR or explicit property?
        // Or just show EVERYTHING in the dropdown and let user pick "Wall Base"?
        // Better: Expect "Wall System" items.
        // For now, show unique items.
        return availableItems.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.id === item.id
            ))
        );
    }, [availableItems]);

    // 2. Select Model
    const [selectedModelId, setSelectedModelId] = useState<string>('');

    useEffect(() => {
        if (!selectedModelId && availableModels.length > 0) {
            setSelectedModelId(availableModels[0].id);
        }
    }, [availableModels, selectedModelId]);

    // Pricing Logic
    const [basePrice, setBasePrice] = useState<number>(0);
    const [matchedName, setMatchedName] = useState<string>('');

    // Calculate Base Price
    useEffect(() => {
        const calculate = async () => {
            const model = availableModels.find(m => m.id === selectedModelId);
            if (!model) {
                setBasePrice(0);
                setMatchedName('');
                return;
            }
            setMatchedName(model.addon_name);
            const w = activeTab === 'side' ? sideWidth : frontWidth;
            const h = activeTab === 'side' ? sideHeight : frontHeight;
            // Use Service (Matrix/Area/Linear)
            const p = await PricingService.calculateAddonPrice(model, w, h);
            setBasePrice(p);
        };
        calculate();
    }, [selectedModelId, activeTab, sideWidth, sideHeight, frontWidth, frontHeight, availableModels]);


    const currentExtrasPrice = useMemo(() => calculateExtrasPrice(currentType === 'side' ? sideExtras : frontExtras),
        [sideExtras, frontExtras, currentType, availableItems]);

    const totalUnitPrice = basePrice + currentExtrasPrice;

    const handleSave = () => {
        const qty = currentQty;
        if (qty > 0) {
            const extraNames = Array.from(currentExtras).map(id => availableItems.find(i => i.id === id)?.addon_name).join(', ');

            onAdd({
                id: `alu-${currentType}`,
                type: 'fixedWall',
                name: matchedName || `Ściana Alu ${currentType === 'side' ? 'Boczna' : 'Frontowa'}`,
                variant: activeTab === 'side' ? 'Boczna' : 'Frontowa',
                width: currentType === 'side' ? sideWidth : frontWidth,
                height: currentType === 'side' ? sideHeight : frontHeight,
                quantity: qty,
                price: totalUnitPrice * qty,
                description: `Wymiary: ${currentType === 'side' ? sideWidth : frontWidth}x${currentType === 'side' ? sideHeight : frontHeight}. ${extraNames}`
            });
        } else {
            onRemove(`alu-${currentType}`);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-slate-800 text-lg">Ściany Aluminiowe Stałe</h4>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('side')} className={`px-4 py-2 rounded ${activeTab === 'side' ? 'bg-white shadow' : ''}`}>Boczna</button>
                    <button onClick={() => setActiveTab('front')} className={`px-4 py-2 rounded ${activeTab === 'front' ? 'bg-white shadow' : ''}`}>Frontowa</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    {/* Model Selector */}
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

                    {/* Controls */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Szerokość
                            {currentType === 'side' && <span className="text-xs text-slate-500 ml-1">(Max: {maxRoofDepth}mm)</span>}
                        </label>
                        <input
                            type="number"
                            value={currentType === 'side' ? sideWidth : frontWidth}
                            onChange={e => {
                                const val = Number(e.target.value);
                                if (currentType === 'side') {
                                    setSideWidth(maxRoofDepth ? Math.min(val, maxRoofDepth) : val);
                                } else {
                                    setFrontWidth(val);
                                }
                            }}
                            max={currentType === 'side' ? maxRoofDepth : undefined}
                            className={`w-full border p-2 rounded ${currentType === 'side' && sideWidth >= (maxRoofDepth || 99999) ? 'border-orange-300 bg-orange-50' : ''}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Wysokość</label>
                        <input
                            type="number"
                            value={currentType === 'side' ? sideHeight : frontHeight}
                            onChange={e => currentType === 'side' ? setSideHeight(Number(e.target.value)) : setFrontHeight(Number(e.target.value))}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    {/* DB Options - Key Logic */}
                    {availableItems.length > 0 && (
                        <div className="border-t pt-4">
                            <label className="block text-sm font-bold mb-2">Opcje Dodatkowe (Wybierz jeśli nie są w cenie podstawowej)</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {availableItems.map(item => (
                                    <label key={item.id} className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-slate-50">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={currentExtras.has(item.id)}
                                                onChange={() => toggleExtra(item.id, currentType)}
                                                className="text-accent rounded"
                                            />
                                            <span className="text-sm">{item.addon_name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">{formatCurrency(item.price_upe_net_eur)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Qty */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => currentType === 'side' ? setSideQty(Math.max(0, sideQty - 1)) : setFrontQty(Math.max(0, frontQty - 1))} className="p-2 border rounded">-</button>
                        <span className="font-bold text-xl">{currentQty}</span>
                        <button onClick={() => currentType === 'side' ? setSideQty(sideQty + 1) : setFrontQty(frontQty + 1)} className="p-2 border rounded">+</button>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {/* Visualization Area - Simplified Placeholder */}
                    <div className="bg-slate-50 h-64 rounded-xl border flex items-center justify-center mb-4">
                        <span className="text-slate-400">Wizualizacja ({currentType === 'side' ? sideWidth : frontWidth}mm x {currentType === 'side' ? sideHeight : frontHeight}mm)</span>
                    </div>
                    <div className="bg-white p-4 border rounded-xl flex justify-between items-center">
                        <div>
                            <div className="text-sm text-slate-500">Cena jedn.</div>
                            <div className="font-bold text-xl text-accent">{formatCurrency(totalUnitPrice)}</div>
                        </div>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent-dark"
                        >
                            {currentQty > 0 ? 'Aktualizuj' : 'Dodaj'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
