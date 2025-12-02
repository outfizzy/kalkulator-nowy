import React, { useState, useMemo } from 'react';
import { aluminiumWallsData, priceAluSeitenwand, priceAluFrontwand, type GlassVariant } from '../../data/aluminium_walls';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

interface AluminumWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofWidth: number;
    maxRoofDepth: number;
}

type WallType = 'side' | 'front';

export const AluminumWallSelector: React.FC<AluminumWallSelectorProps> = ({ onAdd, onRemove, currentAddons, maxRoofWidth, maxRoofDepth }) => {
    const existingSide = currentAddons.find(a => a.id === 'alu-seitenwand');
    const existingFront = currentAddons.find(a => a.id === 'alu-frontwand');
    // const existing = existingSide || existingFront;

    const [activeTab, setActiveTab] = useState<WallType>(existingFront ? 'front' : 'side');

    // Side Wall State
    const [sideWidth, setSideWidth] = useState<number>(existingSide?.width || maxRoofDepth || 3000);
    const [sideHeight, setSideHeight] = useState<number>(2200);
    const [sideGlass, setSideGlass] = useState<GlassVariant>(existingSide?.variant?.includes('Mat') ? 'matt' : existingSide?.variant?.includes('IG') ? 'ig' : 'klar');
    const [sideSprosse, setSideSprosse] = useState<boolean>(existingSide?.variant?.includes('Sprosse') || false);
    const [sideQty, setSideQty] = useState<number>(existingSide?.quantity || 0);

    // Front Wall State
    const [frontWidth, setFrontWidth] = useState<number>(existingFront?.width || maxRoofWidth || 4000);
    const [frontHeight, setFrontHeight] = useState<number>(2200);
    const [frontGlass, setFrontGlass] = useState<GlassVariant>(existingFront?.variant?.includes('Mat') ? 'matt' : existingFront?.variant?.includes('IG') ? 'ig' : 'klar');
    const [frontSprosse, setFrontSprosse] = useState<boolean>(existingFront?.variant?.includes('Sprosse') || false);
    const [frontQty, setFrontQty] = useState<number>(existingFront?.quantity || 0);

    // Calculations
    const sidePrice = useMemo(() => priceAluSeitenwand(sideWidth, sideGlass, sideSprosse), [sideWidth, sideGlass, sideSprosse]);
    const frontPrice = useMemo(() => priceAluFrontwand(frontWidth, frontGlass, frontSprosse), [frontWidth, frontGlass, frontSprosse]);

    const handleSaveSide = () => {
        if (sideQty > 0) {
            onAdd({
                id: 'alu-seitenwand',
                type: 'fixedWall',
                name: 'Ściana aluminiowa boczna (Alu-Seitenwand)',
                variant: `${sideGlass === 'klar' ? 'Klar' : sideGlass === 'matt' ? 'Mat' : 'IG'} ${sideSprosse ? '+ Sprosse' : ''}`,
                width: sideWidth,
                quantity: sideQty,
                price: sidePrice * sideQty,
                description: `Wymiary: ${sideWidth}mm x ${sideHeight}mm`
            });
        } else {
            onRemove('alu-seitenwand');
        }
    };

    const handleSaveFront = () => {
        if (frontQty > 0) {
            onAdd({
                id: 'alu-frontwand',
                type: 'fixedWall',
                name: 'Ściana aluminiowa frontowa (Alu-Frontwand)',
                variant: `${frontGlass === 'klar' ? 'Klar' : frontGlass === 'matt' ? 'Mat' : 'IG'} ${frontSprosse ? '+ Sprosse' : ''}`,
                width: frontWidth,
                quantity: frontQty,
                price: frontPrice * frontQty,
                description: `Wymiary: ${frontWidth}mm x ${frontHeight}mm`
            });
        } else {
            onRemove('alu-frontwand');
        }
    };

    // Helper to determine number of fields based on width (approximate logic based on data)
    const getFields = (width: number, type: WallType) => {
        const products = type === 'side'
            ? aluminiumWallsData.aluminium_seitenwand.products
            : aluminiumWallsData.aluminium_frontwand.products;
        const product = products.find(p => p.width_mm >= width) || products[products.length - 1];
        return product.fields;
    };

    const currentWidth = activeTab === 'side' ? sideWidth : frontWidth;
    const currentHeight = activeTab === 'side' ? sideHeight : frontHeight;
    const currentGlass = activeTab === 'side' ? sideGlass : frontGlass;
    const currentSprosse = activeTab === 'side' ? sideSprosse : frontSprosse;
    const currentFields = getFields(currentWidth, activeTab);
    const currentPrice = activeTab === 'side' ? sidePrice : frontPrice;
    const currentQty = activeTab === 'side' ? sideQty : frontQty;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-slate-800 text-lg">Ściany Aluminiowe Stałe</h4>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('side')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'side' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Boczna (Seitenwand)
                    </button>
                    <button
                        onClick={() => setActiveTab('front')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'front' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Frontowa (Frontwand)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Szerokość (mm)</label>
                            <input
                                type="number"
                                value={activeTab === 'side' ? sideWidth : frontWidth}
                                min={1000}
                                max={activeTab === 'side' ? 5000 : 7000}
                                step={100}
                                onChange={(e) => activeTab === 'side' ? setSideWidth(Number(e.target.value)) : setFrontWidth(Number(e.target.value))}
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Wysokość (mm)</label>
                            <input
                                type="number"
                                value={activeTab === 'side' ? sideHeight : frontHeight}
                                min={1800}
                                max={3000}
                                step={10}
                                onChange={(e) => activeTab === 'side' ? setSideHeight(Number(e.target.value)) : setFrontHeight(Number(e.target.value))}
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Wariant szkła</label>
                        <div className="flex gap-2">
                            {(['klar', 'matt', 'ig'] as GlassVariant[]).map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => activeTab === 'side' ? setSideGlass(opt) : setFrontGlass(opt)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${currentGlass === opt
                                        ? 'border-accent bg-accent text-white shadow-md'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {opt === 'klar' ? 'Klar' : opt === 'matt' ? 'Mat' : 'IG'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={currentSprosse}
                            onChange={(e) => activeTab === 'side' ? setSideSprosse(e.target.checked) : setFrontSprosse(e.target.checked)}
                            className="w-5 h-5 text-accent rounded focus:ring-accent"
                        />
                        <span className="font-medium text-slate-700">Fenster-Sprosse (Szprosy)</span>
                    </label>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ilość (szt.)</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => activeTab === 'side' ? setSideQty(Math.max(0, sideQty - 1)) : setFrontQty(Math.max(0, frontQty - 1))}
                                className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xl font-bold text-slate-500"
                            >-</button>
                            <div className="flex-1 text-center font-bold text-xl bg-slate-50 py-2.5 rounded-xl border border-slate-200">
                                {currentQty}
                            </div>
                            <button
                                onClick={() => activeTab === 'side' ? setSideQty(sideQty + 1) : setFrontQty(frontQty + 1)}
                                className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xl font-bold text-slate-500"
                            >+</button>
                        </div>
                    </div>
                </div>

                {/* Visualization */}
                <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col">
                    <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">👁️</span> Podgląd konfiguracji
                    </h5>

                    <div className="flex-1 flex items-center justify-center min-h-[200px] bg-white rounded-xl border border-slate-200 p-8 relative overflow-hidden">
                        <div
                            className="relative border-4 border-slate-700 bg-slate-100 shadow-inner"
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                aspectRatio: `${currentWidth / currentHeight}`,
                                maxHeight: '250px'
                            }}
                        >
                            <div className="absolute inset-0 flex">
                                {Array.from({ length: currentFields }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-full border-r border-slate-400 relative ${currentGlass === 'matt' ? 'bg-white/80 backdrop-blur-sm' :
                                            currentGlass === 'ig' ? 'bg-blue-50/30' :
                                                'bg-blue-100/20'
                                            }`}
                                        style={{ width: `${100 / currentFields}%` }}
                                    >
                                        {currentSprosse && (
                                            <div className="absolute top-1/3 left-0 right-0 h-2 bg-slate-400 opacity-70" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Dimensions */}
                            <div className="absolute -bottom-8 left-0 right-0 text-center text-xs font-mono text-slate-500">
                                ↔ {currentWidth} mm
                            </div>
                            <div className="absolute top-0 bottom-0 -left-8 flex items-center text-xs font-mono text-slate-500 [writing-mode:vertical-lr] rotate-180">
                                ↕ {currentHeight} mm
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Konfiguracja</div>
                            <div className="font-bold text-slate-800">{activeTab === 'side' ? 'Ściana Boczna' : 'Ściana Frontowa'}</div>
                            <div className="text-xs text-slate-400 mt-1">{currentFields} pola/pól</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Cena jednostkowa</div>
                            <div className="font-bold text-accent text-lg">{formatCurrency(currentPrice)}</div>
                        </div>
                    </div>

                    <button
                        onClick={activeTab === 'side' ? handleSaveSide : handleSaveFront}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${currentQty > 0
                            ? 'bg-accent hover:bg-accent/90 hover:shadow-accent/30 hover:scale-[1.02]'
                            : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                        disabled={currentQty === 0}
                    >
                        {activeTab === 'side'
                            ? (existingSide ? 'Zaktualizuj Ścianę Boczną' : `Dodaj Ścianę Boczną (+${formatCurrency(sidePrice * sideQty)})`)
                            : (existingFront ? 'Zaktualizuj Ścianę Frontową' : `Dodaj Ścianę Frontową (+${formatCurrency(frontPrice * frontQty)})`)
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};
