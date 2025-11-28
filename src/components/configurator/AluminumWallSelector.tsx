import React, { useState } from 'react';
import { priceAluSeitenwand, priceAluFrontwand, type GlassVariant } from '../../data/aluminium_walls';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

interface AluminumWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofWidth: number;
    maxRoofDepth: number;
}

export const AluminumWallSelector: React.FC<AluminumWallSelectorProps> = ({ onAdd, onRemove, currentAddons, maxRoofWidth, maxRoofDepth }) => {
    // State for Side Walls
    const existingSideLeft = currentAddons.find(a => a.id === 'alu-side-left');
    const existingSideRight = currentAddons.find(a => a.id === 'alu-side-right');
    const existingSide = existingSideLeft || existingSideRight;

    const [sideWidth, setSideWidth] = useState<number>(existingSide?.width || maxRoofDepth || 3000);
    const [sideGlass, setSideGlass] = useState<GlassVariant>(existingSide?.variant?.includes('matt') ? 'matt' : existingSide?.variant?.includes('ig') ? 'ig' : 'klar');
    const [sideSprosse, setSideSprosse] = useState<boolean>(existingSide?.variant?.includes('szpros') || false);
    const [sideLeftQty, setSideLeftQty] = useState<number>(existingSideLeft?.quantity || 0);
    const [sideRightQty, setSideRightQty] = useState<number>(existingSideRight?.quantity || 0);

    // State for Front Walls
    const existingFront = currentAddons.find(a => a.id === 'alu-front');
    const [frontWidth, setFrontWidth] = useState<number>(existingFront?.width || maxRoofWidth || 3000);
    const [frontGlass, setFrontGlass] = useState<GlassVariant>(existingFront?.variant?.includes('matt') ? 'matt' : existingFront?.variant?.includes('ig') ? 'ig' : 'klar');
    const [frontSprosse, setFrontSprosse] = useState<boolean>(existingFront?.variant?.includes('szpros') || false);
    const [frontQty, setFrontQty] = useState<number>(existingFront?.quantity || 0);

    const handleSaveSide = () => {
        const unitPrice = priceAluSeitenwand(sideWidth, sideGlass, sideSprosse);

        if (sideLeftQty > 0) {
            onAdd({
                id: 'alu-side-left',
                type: 'other',
                name: 'Aluminium Seitenwand Lewa',
                variant: `${sideGlass} ${sideSprosse ? '+ szpros' : ''}`,
                width: sideWidth,
                quantity: sideLeftQty,
                price: sideLeftQty * unitPrice
            });
        } else {
            onRemove('alu-side-left');
        }

        if (sideRightQty > 0) {
            onAdd({
                id: 'alu-side-right',
                type: 'other',
                name: 'Aluminium Seitenwand Prawa',
                variant: `${sideGlass} ${sideSprosse ? '+ szpros' : ''}`,
                width: sideWidth,
                quantity: sideRightQty,
                price: sideRightQty * unitPrice
            });
        } else {
            onRemove('alu-side-right');
        }
    };

    const handleSaveFront = () => {
        const unitPrice = priceAluFrontwand(frontWidth, frontGlass, frontSprosse);
        if (frontQty > 0) {
            onAdd({
                id: 'alu-front',
                type: 'other',
                name: 'Aluminium Frontwand',
                variant: `${frontGlass} ${frontSprosse ? '+ szpros' : ''}`,
                width: frontWidth,
                quantity: frontQty,
                price: frontQty * unitPrice
            });
        } else {
            onRemove('alu-front');
        }
    };

    return (
        <div className="space-y-6">
            {/* Side Walls Block */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-bold text-slate-800 text-lg mb-4">Ściany boczne (Seitenwand)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Głębokość (mm)</label>
                            <input type="number" value={sideWidth} onChange={e => setSideWidth(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2.5" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Wariant szkła</label>
                            <div className="flex gap-2">
                                {(['klar', 'matt', 'ig'] as GlassVariant[]).map(opt => (
                                    <button key={opt} onClick={() => setSideGlass(opt)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${sideGlass === opt ? 'border-accent bg-accent text-white' : 'border-slate-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={sideSprosse} onChange={e => setSideSprosse(e.target.checked)} className="rounded text-accent focus:ring-accent" />
                            Szprosy (Fenstersprosse)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Lewa (szt.)</label>
                                <input type="number" min={0} value={sideLeftQty} onChange={e => setSideLeftQty(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Prawa (szt.)</label>
                                <input type="number" min={0} value={sideRightQty} onChange={e => setSideRightQty(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-slate-500">Cena jedn.:</span><span className="font-medium">{formatCurrency(priceAluSeitenwand(sideWidth, sideGlass, sideSprosse))}</span></div>
                            <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold">Razem:</span><span className="font-bold text-accent text-lg">{formatCurrency(priceAluSeitenwand(sideWidth, sideGlass, sideSprosse) * (sideLeftQty + sideRightQty))}</span></div>
                        </div>
                        <button onClick={handleSaveSide} className="w-full mt-4 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90">Zapisz Ściany Boczne</button>
                    </div>
                </div>
            </div>

            {/* Front Walls Block */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-bold text-slate-800 text-lg mb-4">Ściana frontowa (Frontwand)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość (mm)</label>
                            <input type="number" value={frontWidth} onChange={e => setFrontWidth(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2.5" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Wariant szkła</label>
                            <div className="flex gap-2">
                                {(['klar', 'matt', 'ig'] as GlassVariant[]).map(opt => (
                                    <button key={opt} onClick={() => setFrontGlass(opt)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${frontGlass === opt ? 'border-accent bg-accent text-white' : 'border-slate-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={frontSprosse} onChange={e => setFrontSprosse(e.target.checked)} className="rounded text-accent focus:ring-accent" />
                            Szprosy (Fenstersprosse)
                        </label>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ilość</label>
                            <input type="number" min={0} value={frontQty} onChange={e => setFrontQty(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2" />
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-slate-500">Cena jedn.:</span><span className="font-medium">{formatCurrency(priceAluFrontwand(frontWidth, frontGlass, frontSprosse))}</span></div>
                            <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold">Razem:</span><span className="font-bold text-accent text-lg">{formatCurrency(priceAluFrontwand(frontWidth, frontGlass, frontSprosse) * frontQty)}</span></div>
                        </div>
                        <button onClick={handleSaveFront} className="w-full mt-4 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90">Zapisz Ścianę Frontową</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
