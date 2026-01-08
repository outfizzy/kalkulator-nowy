
import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';
import { PricingService } from '../../services/pricing.service';


interface KeilfensterSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofDepth: number;
    availableItems: any[];
    tables: { table: any, entries: any[] }[]; // Changed from baseMatrix
}

type GlassType = 'standard' | 'mat' | 'clear' | 'ig'; // Keilfenster usually standard or mat

export const KeilfensterSelector: React.FC<KeilfensterSelectorProps> = ({
    onAdd,
    onRemove,
    currentAddons,
    availableItems,
    tables
}) => {
    const existing = currentAddons.find(a => a.id === 'keilfenster');

    const [width, setWidth] = useState<number>(existing?.width || 2000);
    const [glass, setGlass] = useState<GlassType>(existing?.variant?.includes('Mat') ? 'mat' : 'standard');
    const [specialRal, setSpecialRal] = useState<boolean>(false);

    // Configurable height logic if needed, but usually fixed or derived for Keilfenster
    // For now assuming matrix lookup by width

    // DB Options State
    const [selectedDbOptions, setSelectedDbOptions] = useState<Set<string>>(new Set());

    const [height1, setHeight1] = useState(1000);
    const [height2, setHeight2] = useState(2000);
    const [leftQty, setLeftQty] = useState(0);
    const [rightQty, setRightQty] = useState(0);

    const baseMatrix = useMemo(() => tables.flatMap(t => t.entries), [tables]);

    const entry = useMemo(() => {
        if (!baseMatrix.length) return null;
        // Use standard service logic for consistency (finds first entry >= width)
        return PricingService.findMatrixEntry(baseMatrix, width, 0);
    }, [baseMatrix, width]);

    const baseUnitPrice = useMemo(() => {
        if (entry) {
            let price = entry.price || entry.structure_price || 0;
            const props = entry.properties || {};

            // Add Surcharges from Matrix Properties
            if (glass === 'mat') price += (props.surcharge_matt || 0);
            if (glass === 'ig') price += (props.surcharge_ig || 0);

            // Special RAL logic (if not in matrix, use static rule or check table config)
            // For now sticking to static +30% rule as it's likely a global rule
            if (specialRal) price *= 1.30;

            return price;
        }

        return 0;
    }, [entry, glass, specialRal]);

    const optionsPrice = useMemo(() => {
        let sum = 0;
        selectedDbOptions.forEach(id => {
            const item = availableItems.find(i => i.id === id);
            if (item) sum += item.price;
        });
        return sum;
    }, [selectedDbOptions, availableItems]);

    const totalUnitPrice = baseUnitPrice + optionsPrice;

    const toggleOption = (id: string) => {
        const next = new Set(selectedDbOptions);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedDbOptions(next);
    };

    const handleSave = () => {
        const optionsDesc = Array.from(selectedDbOptions)
            .map(id => availableItems.find(i => i.id === id)?.properties.name)
            .join(', ');

        const desc = `Wymiary: ${width}mm x ${height1}mm / ${height2}mm. ${optionsDesc ? `Opcje: ${optionsDesc}` : ''}`;

        if (leftQty > 0) {
            onAdd({
                id: 'keil-left',
                type: 'other',
                name: 'Keilfenster Lewy',
                variant: `${glass} ${specialRal ? '+ RAL' : ''}`,
                width,
                quantity: leftQty,
                price: leftQty * totalUnitPrice,
                description: desc
            });
        } else {
            onRemove('keil-left');
        }

        if (rightQty > 0) {
            onAdd({
                id: 'keil-right',
                type: 'other',
                name: 'Keilfenster Prawy',
                variant: `${glass} ${specialRal ? '+ RAL' : ''}`,
                width,
                quantity: rightQty,
                price: rightQty * totalUnitPrice,
                description: desc
            });
        } else {
            onRemove('keil-right');
        }
    };

    // Visualization Props
    const padding = 20;
    const drawHeight = 150;
    const drawWidth = 300;
    const scaleY = drawHeight / Math.max(height1, height2, 500);
    const x1 = padding;
    const y1 = padding + drawHeight - (height1 * scaleY);
    const x2 = padding + drawWidth;
    const y2 = padding + drawHeight - (height2 * scaleY);
    const x3 = padding + drawWidth;
    const y3 = padding + drawHeight;
    const x4 = padding;
    const y4 = padding + drawHeight;
    const points = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-slate-800 text-lg mb-4">Keilfenster (Klinowe okno boczne)</h4>

            {(baseMatrix.length === 0) && <div className="p-2 mb-4 bg-yellow-100 text-yellow-800 rounded text-xs">Uwaga: Brak cennika bazowego w DB.</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość (mm)</label>
                        <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full border p-2 rounded" />
                    </div>
                    {/* ... Heights ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Wysokość L (mm)</label>
                            <input type="number" value={height1} onChange={e => setHeight1(Number(e.target.value))} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Wysokość P (mm)</label>
                            <input type="number" value={height2} onChange={e => setHeight2(Number(e.target.value))} className="w-full border p-2 rounded" />
                        </div>
                    </div>

                    {/* Glass Selection */}
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
                        <span className="font-medium">Sonder RAL (+30%)</span>
                    </label>

                    {/* DB Options */}
                    {availableItems.length > 0 && (
                        <div className="border-t border-slate-100 pt-4 mt-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Dodatkowe Opcje (z Bazy)</label>
                            <div className="space-y-2">
                                {availableItems.map(item => (
                                    <label key={item.id} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedDbOptions.has(item.id)}
                                                onChange={() => toggleOption(item.id)}
                                                className="rounded text-accent focus:ring-accent"
                                            />
                                            <span className="text-sm">{item.properties.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{formatCurrency(item.price)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase">Lewy (szt.)</label>
                            <input type="number" value={leftQty} onChange={e => setLeftQty(Number(e.target.value))} className="w-full border p-2 rounded text-center" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase">Prawy (szt.)</label>
                            <input type="number" value={rightQty} onChange={e => setRightQty(Number(e.target.value))} className="w-full border p-2 rounded text-center" />
                        </div>
                    </div>
                </div>

                {/* Visuals */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex items-center justify-center min-h-[200px] relative">
                        <svg width="100%" height="200" viewBox={`0 0 ${drawWidth + 2 * padding} ${drawHeight + 2 * padding}`}>
                            <polygon points={points} fill={glass === 'mat' ? 'rgba(255,255,255,0.9)' : 'rgba(200, 230, 255, 0.4)'} stroke="#334155" strokeWidth="2" />
                        </svg>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between font-bold text-lg mb-4">
                            <span>Suma:</span>
                            <span className="text-accent">{formatCurrency(totalUnitPrice * (leftQty + rightQty))}</span>
                        </div>
                        <button onClick={handleSave} className="w-full py-3 bg-accent text-white rounded-xl font-bold">Zapisz</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
