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

    const [width, setWidth] = useState<number>(existing?.width || maxRoofDepth || 3000);
    const [glass, setGlass] = useState<'clear' | 'mat' | 'ig'>(existing?.variant?.includes('Mat') ? 'mat' : existing?.variant?.includes('IG') ? 'ig' : 'clear');
    const [specialRal, setSpecialRal] = useState<boolean>(existing?.variant?.includes('RAL') || false);
    const [leftQty, setLeftQty] = useState<number>(existingLeft?.quantity || 0);
    const [rightQty, setRightQty] = useState<number>(existingRight?.quantity || 0);

    const handleSave = () => {
        const unitPrice = priceKeilfenster(width, glass, specialRal);

        if (leftQty > 0) {
            onAdd({
                id: 'keil-left',
                type: 'other',
                name: 'Keilfenster Lewy',
                variant: `${glass === 'clear' ? 'Klar' : glass === 'mat' ? 'Mat' : 'IG'} ${specialRal ? '+ RAL' : ''}`,
                width,
                quantity: leftQty,
                price: leftQty * unitPrice
            });
        } else {
            onRemove('keil-left');
        }

        if (rightQty > 0) {
            onAdd({
                id: 'keil-right',
                type: 'other',
                name: 'Keilfenster Prawy',
                variant: `${glass === 'clear' ? 'Klar' : glass === 'mat' ? 'Mat' : 'IG'} ${specialRal ? '+ RAL' : ''}`,
                width,
                quantity: rightQty,
                price: rightQty * unitPrice
            });
        } else {
            onRemove('keil-right');
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-slate-800 text-lg mb-4">Keilfenster (Klinowe okno boczne)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość otworu (mm)</label>
                        <input type="number" value={width} min={2000} max={5000} onChange={e => setWidth(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2.5" />
                        <p className="text-xs text-slate-400 mt-1">Dostępne: 2000 - 5000 mm</p>
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
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${glass === opt.id ? 'border-accent bg-accent text-white' : 'border-slate-200'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={specialRal} onChange={e => setSpecialRal(e.target.checked)} className="rounded text-accent focus:ring-accent" />
                        Sonder RAL (+{keilfensterData.colors.special_ral_surcharge_percent}%)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Lewy (szt.)</label>
                            <input type="number" min={0} value={leftQty} onChange={e => setLeftQty(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Prawy (szt.)</label>
                            <input type="number" min={0} value={rightQty} onChange={e => setRightQty(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2" />
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between"><span className="text-slate-500">Cena jedn.:</span><span className="font-medium">{formatCurrency(priceKeilfenster(width, glass, specialRal))}</span></div>
                        <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold">Razem:</span><span className="font-bold text-accent text-lg">{formatCurrency(priceKeilfenster(width, glass, specialRal) * (leftQty + rightQty))}</span></div>
                    </div>
                    <button onClick={handleSave} className="w-full mt-4 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90">Zapisz Keilfenster</button>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">W zestawie: {keilfensterData.options.included.join(', ')}</p>
                </div>
            </div>
        </div>
    );
};
