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
    const [height, setHeight] = useState<number>(2200); // Default height
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
                price: totalPrice,
                description: `Wymiary: ${width}mm x ${height}mm`
            });
        } else {
            onRemove('alu-schiebetuer');
        }
    };

    const existingAddon = currentAddons.find(a => a.id === 'alu-schiebetuer');

    const panelCount = width < 3000 ? 3 : width < 4000 ? 4 : 5;

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Szerokość (mm)</label>
                            <input
                                type="number"
                                value={width}
                                min={2000}
                                max={Math.min(6000, maxRoofWidth)}
                                step={100}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Wysokość (mm)</label>
                            <input
                                type="number"
                                value={height}
                                min={1800}
                                max={2600}
                                step={10}
                                onChange={(e) => setHeight(Number(e.target.value))}
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <input
                            type="range"
                            min={2000}
                            max={Math.min(6000, maxRoofWidth)}
                            step={100}
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-full accent-accent h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>2000mm</span>
                            <span>{Math.min(6000, maxRoofWidth)}mm</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Wariant szkła</label>
                        <div className="flex gap-2">
                            {(['klar', 'matt', 'ig'] as GlassVariant[]).map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setGlass(opt)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${glass === opt
                                        ? 'border-accent bg-accent text-white shadow-md'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {opt === 'klar' ? 'Klar' : opt === 'matt' ? 'Mat' : 'IG'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ilość zestawów</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(Math.max(0, quantity - 1))}
                                className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xl font-bold text-slate-500"
                            >-</button>
                            <div className="flex-1 text-center font-bold text-xl bg-slate-50 py-2.5 rounded-xl border border-slate-200">
                                {quantity}
                            </div>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xl font-bold text-slate-500"
                            >+</button>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Visual Representation */}
                <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col">
                    <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">👁️</span> Podgląd konfiguracji
                    </h5>

                    <div className="flex-1 flex items-center justify-center min-h-[200px] bg-white rounded-xl border border-slate-200 p-8 relative overflow-hidden">
                        {/* Frame */}
                        <div
                            className="relative border-4 border-slate-700 bg-slate-100 shadow-inner"
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                aspectRatio: `${width / height}`,
                                maxHeight: '250px'
                            }}
                        >
                            {/* Panels */}
                            <div className="absolute inset-0 flex">
                                {Array.from({ length: panelCount }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-full border-r border-slate-400 relative ${glass === 'matt' ? 'bg-white/80 backdrop-blur-sm' :
                                            glass === 'ig' ? 'bg-blue-50/30' :
                                                'bg-blue-100/20'
                                            }`}
                                        style={{ width: `${100 / panelCount}%` }}
                                    >
                                        {/* Handle/Frame detail */}
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-slate-400 rounded-full mr-1 opacity-50" />
                                    </div>
                                ))}
                            </div>

                            {/* Dimensions Label */}
                            <div className="absolute -bottom-8 left-0 right-0 text-center text-xs font-mono text-slate-500">
                                ↔ {width} mm
                            </div>
                            <div className="absolute top-0 bottom-0 -left-8 flex items-center text-xs font-mono text-slate-500 [writing-mode:vertical-lr] rotate-180">
                                ↕ {height} mm
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Konfiguracja</div>
                            <div className="font-bold text-slate-800">{config}</div>
                            <div className="text-xs text-slate-400 mt-1">{panelCount} panele</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Cena jednostkowa</div>
                            <div className="font-bold text-accent text-lg">{formatCurrency(price)}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${quantity > 0
                            ? 'bg-accent hover:bg-accent/90 hover:shadow-accent/30 hover:scale-[1.02]'
                            : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                        disabled={quantity === 0}
                    >
                        {existingAddon ? 'Zaktualizuj Ofertę' : `Dodaj do Oferty (+${formatCurrency(totalPrice)})`}
                    </button>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Dostępne warianty:</p>
                <div className="flex flex-wrap gap-2">
                    {aluminiumWallsData.aluminium_schiebetueren.products.map(p => (
                        <span key={p.width_mm} className={`text-[10px] px-2 py-1 rounded border transition-colors ${width === p.width_mm ? 'bg-accent text-white border-accent' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                            {p.width_mm}mm ({p.configuration})
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
