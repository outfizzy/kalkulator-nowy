import React, { useState, useMemo } from 'react';
import { aluminiumWallsData, priceAluSchiebetuer, type GlassVariant } from '../../data/aluminium_walls';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

interface SlidingDoorSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofWidth: number;
}

export const SlidingDoorSelector: React.FC<SlidingDoorSelectorProps> = ({ onAdd, onRemove, currentAddons, maxRoofWidth }) => {
    const existing = currentAddons.find(a => a.id === 'alu-schiebetuer');

    const [width, setWidth] = useState<number>(existing?.width || 3000);
    const [glass, setGlass] = useState<GlassVariant>(existing?.variant?.includes('Mat') ? 'matt' : existing?.variant?.includes('IG') ? 'ig' : 'klar');
    const [quantity, setQuantity] = useState<number>(existing?.quantity || 0);

    const { price, config } = useMemo(() => priceAluSchiebetuer(width, glass), [width, glass]);
    const totalPrice = price * quantity;

    const handleSave = () => {
        if (quantity > 0) {
            onAdd({
                id: 'alu-schiebetuer',
                type: 'slidingWall',
                name: 'Szyba przesuwna w ramie (Alu Schiebetür)',
                variant: `${glass === 'klar' ? 'Klar' : glass === 'matt' ? 'Mat' : 'IG'} (${config})`,
                width,
                quantity,
                price: totalPrice
            });
        } else {
            onRemove('alu-schiebetuer');
        }
    };

    const existingAddon = currentAddons.find(a => a.id === 'alu-schiebetuer');

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg">Szyby przesuwne w ramie (Alu Schiebetüren)</h4>
                    <p className="text-sm text-slate-500">Feld (panel) do {aluminiumWallsData.aluminium_schiebetueren.limits.feldbreite_max_mm} mm</p>
                </div>
                <div className="text-right">
                    {existingAddon && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Wybrano</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość (mm)</label>
                        <input
                            type="number"
                            value={width}
                            min={2000}
                            max={Math.min(6000, maxRoofWidth)}
                            step={100}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>2000 mm</span>
                            <span>{Math.min(6000, maxRoofWidth)} mm</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Wariant szkła</label>
                        <div className="flex gap-2">
                            {(['klar', 'matt', 'ig'] as GlassVariant[]).map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setGlass(opt)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${glass === opt
                                        ? 'border-accent bg-accent text-white'
                                        : 'border-slate-200 text-slate-600 hover:border-accent/50'
                                        }`}
                                >
                                    {opt === 'klar' ? 'Klar' : opt === 'matt' ? 'Mat' : 'IG'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ilość</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(Math.max(0, quantity - 1))}
                                className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                            >-</button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                                className="w-20 text-center border border-slate-300 rounded-lg p-2.5 font-bold"
                            />
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                            >+</button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                    <div>
                        <h5 className="font-bold text-slate-700 mb-2">Szczegóły konfiguracji</h5>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Konfiguracja:</span>
                                <span className="font-medium">{config}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cena jedn.:</span>
                                <span className="font-medium">{formatCurrency(price)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                                <span className="font-bold text-slate-700">Razem:</span>
                                <span className="font-bold text-accent text-lg">{formatCurrency(totalPrice)}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-all ${quantity > 0
                            ? 'bg-accent hover:bg-accent/90 shadow-md hover:shadow-lg'
                            : 'bg-slate-300 cursor-not-allowed'}`}
                        disabled={quantity === 0}
                    >
                        {existingAddon ? 'Zaktualizuj' : 'Dodaj do oferty'}
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Dostępne konfiguracje:</p>
                <div className="flex flex-wrap gap-2">
                    {aluminiumWallsData.aluminium_schiebetueren.products.map(p => (
                        <span key={p.width_mm} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                            {p.width_mm}mm ({p.configuration})
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
