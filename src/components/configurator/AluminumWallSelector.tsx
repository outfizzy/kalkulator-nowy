
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
    availableItems: any[];
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

    const sideBasePrice = useMemo(() => 0, [sideWidth]); // Placeholder
    const sideExtrasPrice = useMemo(() => calculateExtrasPrice(sideExtras), [sideExtras, availableItems]);
    const totalSidePrice = sideBasePrice + sideExtrasPrice;

    const frontBasePrice = useMemo(() => 0, [frontWidth]); // Placeholder
    const frontExtrasPrice = useMemo(() => calculateExtrasPrice(frontExtras), [frontExtras, availableItems]);
    const totalFrontPrice = frontBasePrice + frontExtrasPrice;

    const toggleExtra = (id: string, type: WallType) => {
        if (type === 'side') {
            const next = new Set(sideExtras);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSideExtras(next);
        } else {
            const next = new Set(frontExtras);
            if (next.has(id)) next.delete(id); else next.add(id);
            setFrontExtras(next);
        }
    };

    const handleSaveSide = () => {
        const extraNames = Array.from(sideExtras).map(id => availableItems.find(i => i.id === id)?.addon_name).join(', ');
        if (sideQty > 0) {
            onAdd({
                id: 'alu-side',
                type: 'fixedWall',
                name: 'Ściana Alu Boczna',
                variant: `${sideGlass} ${sideSprosse ? '+ Sprosse' : ''}`,
                width: sideWidth,
                depth: 0,
                quantity: sideQty,
                price: totalSidePrice * sideQty,
                description: `Szkło: ${sideGlass}. ${extraNames}`
            });
        } else {
            onRemove('alu-side');
        }
    };

    const handleSaveFront = () => {
        const extraNames = Array.from(frontExtras).map(id => availableItems.find(i => i.id === id)?.addon_name).join(', ');
        if (frontQty > 0) {
            onAdd({
                id: 'alu-front',
                type: 'fixedWall',
                name: 'Ściana Alu Frontowa',
                variant: `${frontGlass} ${frontSprosse ? '+ Sprosse' : ''}`,
                width: frontWidth,
                depth: 0,
                quantity: frontQty,
                price: totalFrontPrice * frontQty,
                description: `Szkło: ${frontGlass}. ${extraNames}`
            });
        } else {
            onRemove('alu-front');
        }
    };

    const currentType = activeTab;
    const currentPrice = currentType === 'side' ? totalSidePrice : totalFrontPrice;
    const currentQty = currentType === 'side' ? sideQty : frontQty;
    const currentExtras = currentType === 'side' ? sideExtras : frontExtras;

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
                                    // Clamp to maxRoofDepth
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
                    {/* Glass toggles */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Szkło</label>
                        <div className="flex gap-1 text-xs">
                            {['klar', 'matt', 'ig'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => currentType === 'side' ? setSideGlass(g as any) : setFrontGlass(g as any)}
                                    className={`px-2 py-1 border rounded capitalize ${(currentType === 'side' ? sideGlass : frontGlass) === g ? 'bg-accent text-white' : ''}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={currentType === 'side' ? sideSprosse : frontSprosse}
                            onChange={(e) => currentType === 'side' ? setSideSprosse(e.target.checked) : setFrontSprosse(e.target.checked)}
                        />
                        Szprosy (Fenstersprosse)
                    </label>

                    {/* DB Options - Key Logic */}
                    {availableItems.length > 0 && (
                        <div className="border-t pt-4">
                            <label className="block text-sm font-bold mb-2">Opcje Dodatkowe</label>
                            <div className="space-y-2">
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
                            <div className="font-bold text-xl text-accent">{formatCurrency(currentPrice)}</div>
                        </div>
                        <button
                            onClick={activeTab === 'side' ? handleSaveSide : handleSaveFront}
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
