import React, { useState } from 'react';
import { priceKeilfenster, keilfensterData } from '../../data/keilfenster';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

interface KeilfensterSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofDepth: number;
}

export const KeilfensterSelector: React.FC<KeilfensterSelectorProps> = ({ onAdd, onRemove, currentAddons, maxRoofDepth }) => {
    const existingLeft = currentAddons.find(a => a.id === 'keil-left');
    const existingRight = currentAddons.find(a => a.id === 'keil-right');
    const existing = existingLeft || existingRight;

    // Parse existing dimensions if available (stored in variant or description usually, but here we might need to rely on defaults if not structured)
    // For now, we'll stick to defaults or simple parsing if we decide to store it in a structured way later.
    const [width, setWidth] = useState<number>(existing?.width || maxRoofDepth || 3000);
    const [height1, setHeight1] = useState<number>(keilfensterData.dimensions.min_height_h1_mm);
    const [height2, setHeight2] = useState<number>(500);

    const [glass, setGlass] = useState<'clear' | 'mat' | 'ig'>(existing?.variant?.includes('Mat') ? 'mat' : existing?.variant?.includes('IG') ? 'ig' : 'clear');
    const [specialRal, setSpecialRal] = useState<boolean>(existing?.variant?.includes('RAL') || false);
    const [leftQty, setLeftQty] = useState<number>(existingLeft?.quantity || 0);
    const [rightQty, setRightQty] = useState<number>(existingRight?.quantity || 0);

    // Update heights if we can parse them from existing data (optional improvement for later)

    const handleSave = () => {
        const unitPrice = priceKeilfenster(width, glass, specialRal);

        if (leftQty > 0) {
            onAdd({
                id: 'keil-left',
                type: 'other',
                name: 'Keilfenster Lewy',
                variant: `${glass === 'clear' ? 'Klar' : glass === 'mat' ? 'Mat' : 'IG'} ${specialRal ? '+ RAL' : ''} (${height1}mm / ${height2}mm)`,
                width,
                quantity: leftQty,
                price: leftQty * unitPrice,
                description: `Wymiary: ${width}mm x ${height1}mm (niski) x ${height2}mm (wysoki)`
            });
        } else {
            onRemove('keil-left');
        }

        if (rightQty > 0) {
            onAdd({
                id: 'keil-right',
                type: 'other',
                name: 'Keilfenster Prawy',
                variant: `${glass === 'clear' ? 'Klar' : glass === 'mat' ? 'Mat' : 'IG'} ${specialRal ? '+ RAL' : ''} (${height1}mm / ${height2}mm)`,
                width,
                quantity: rightQty,
                price: rightQty * unitPrice,
                description: `Wymiary: ${width}mm x ${height1}mm (niski) x ${height2}mm (wysoki)`
            });
        } else {
            onRemove('keil-right');
        }
    };

    // Visualization Logic
    // Polygon points: 
    // Bottom-Left: 0, MaxH
    // Bottom-Right: Width, MaxH
    // Top-Right: Width, MaxH - h2
    // Top-Left: 0, MaxH - h1

    // Actually, let's just use a fixed viewbox and map coordinates.
    const padding = 20;
    const drawHeight = 150;
    const drawWidth = 300;

    // Scale factors
    const scaleY = drawHeight / Math.max(height1, height2, 500); // minimal height for scaling

    // Coordinates
    const x1 = padding;
    const y1 = padding + drawHeight - (height1 * scaleY); // Top-Left Y

    const x2 = padding + drawWidth;
    const y2 = padding + drawHeight - (height2 * scaleY); // Top-Right Y

    const x3 = padding + drawWidth;
    const y3 = padding + drawHeight; // Bottom-Right Y

    const x4 = padding;
    const y4 = padding + drawHeight; // Bottom-Left Y

    const points = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-slate-800 text-lg mb-4">Keilfenster (Klinowe okno boczne)</h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość (mm)</label>
                        <input
                            type="number"
                            value={width}
                            min={2000}
                            max={5000}
                            onChange={e => setWidth(Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent"
                        />
                        <p className="text-xs text-slate-400 mt-1">Dostępne: 2000 - 5000 mm</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Wysokość Lewa (mm)</label>
                            <input
                                type="number"
                                value={height1}
                                min={keilfensterData.dimensions.min_height_h1_mm}
                                max={keilfensterData.dimensions.max_height_h2_mm}
                                onChange={e => setHeight1(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Wysokość Prawa (mm)</label>
                            <input
                                type="number"
                                value={height2}
                                min={keilfensterData.dimensions.min_height_h1_mm}
                                max={keilfensterData.dimensions.max_height_h2_mm}
                                onChange={e => setHeight2(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Wariant szkła</label>
                        <div className="flex gap-2">
                            {[
                                { id: 'clear', label: 'Klar' },
                                { id: 'mat', label: 'Mat' },
                                { id: 'ig', label: 'IG' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setGlass(opt.id as 'clear' | 'mat' | 'ig')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${glass === opt.id ? 'border-accent bg-accent text-white shadow-md' : 'border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <input type="checkbox" checked={specialRal} onChange={e => setSpecialRal(e.target.checked)} className="rounded text-accent focus:ring-accent w-4 h-4" />
                        <span className="font-medium">Sonder RAL (+{keilfensterData.colors.special_ral_surcharge_percent}%)</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Lewy (szt.)</label>
                            <div className="flex items-center">
                                <button onClick={() => setLeftQty(Math.max(0, leftQty - 1))} className="w-8 h-8 rounded-l-lg border border-slate-300 bg-slate-100 hover:bg-slate-200">-</button>
                                <input type="number" min={0} value={leftQty} onChange={e => setLeftQty(Number(e.target.value))} className="w-full border-y border-slate-300 h-8 text-center focus:outline-none" />
                                <button onClick={() => setLeftQty(leftQty + 1)} className="w-8 h-8 rounded-r-lg border border-slate-300 bg-slate-100 hover:bg-slate-200">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Prawy (szt.)</label>
                            <div className="flex items-center">
                                <button onClick={() => setRightQty(Math.max(0, rightQty - 1))} className="w-8 h-8 rounded-l-lg border border-slate-300 bg-slate-100 hover:bg-slate-200">-</button>
                                <input type="number" min={0} value={rightQty} onChange={e => setRightQty(Number(e.target.value))} className="w-full border-y border-slate-300 h-8 text-center focus:outline-none" />
                                <button onClick={() => setRightQty(rightQty + 1)} className="w-8 h-8 rounded-r-lg border border-slate-300 bg-slate-100 hover:bg-slate-200">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visualization & Summary */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex items-center justify-center min-h-[200px] relative">
                        <div className="absolute top-2 left-2 text-xs font-bold text-slate-400">PODGLĄD KSZTAŁTU</div>

                        <svg width="100%" height="200" viewBox={`0 0 ${drawWidth + 2 * padding} ${drawHeight + 2 * padding}`} className="drop-shadow-lg">
                            {/* Grid lines for reference */}
                            <defs>
                                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="0.5" opacity="0.1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />

                            {/* The Shape */}
                            <polygon
                                points={points}
                                fill={glass === 'mat' ? 'rgba(255,255,255,0.9)' : glass === 'ig' ? 'rgba(200, 230, 255, 0.4)' : 'rgba(220, 240, 255, 0.3)'}
                                stroke="#334155"
                                strokeWidth="2"
                            />

                            {/* Dimensions Labels */}
                            {/* Left Height */}
                            <text x={x1 - 10} y={(y1 + y4) / 2} textAnchor="end" className="text-[10px] fill-slate-500 font-mono">{height1}mm</text>
                            {/* Right Height */}
                            <text x={x2 + 10} y={(y2 + y3) / 2} textAnchor="start" className="text-[10px] fill-slate-500 font-mono">{height2}mm</text>
                            {/* Width */}
                            <text x={(x3 + x4) / 2} y={y4 + 15} textAnchor="middle" className="text-[10px] fill-slate-500 font-mono">{width}mm</text>
                        </svg>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-slate-500">Cena jedn.:</span><span className="font-medium">{formatCurrency(priceKeilfenster(width, glass, specialRal))}</span></div>
                            <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold">Razem:</span><span className="font-bold text-accent text-lg">{formatCurrency(priceKeilfenster(width, glass, specialRal) * (leftQty + rightQty))}</span></div>
                        </div>
                        <button onClick={handleSave} className="w-full mt-4 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all hover:scale-[1.02]">
                            Zapisz Keilfenster
                        </button>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">W zestawie: {keilfensterData.options.included.join(', ')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
