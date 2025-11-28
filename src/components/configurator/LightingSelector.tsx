import React, { useState } from 'react';
import catalogData from '../../data/catalog.json';
import type { SelectedAddon } from '../../types';

interface LightingSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
}

export const LightingSelector: React.FC<LightingSelectorProps> = ({ onAdd, onRemove, currentAddons }) => {
    const existingSpots = currentAddons.find(a => a.id === 'led-spots');
    const existingStrip = currentAddons.find(a => a.id === 'led-strip');

    const [spotsQty, setSpotsQty] = useState<number>(existingSpots?.quantity || 6);
    const [stripLength, setStripLength] = useState<number>(existingStrip?.length ? existingStrip.length / 1000 : 3);

    const handleSaveSpots = () => {
        if (spotsQty > 0) {
            onAdd({
                id: 'led-spots',
                type: 'lighting',
                name: 'LED Spots (Punktowe)',
                quantity: spotsQty,
                price: spotsQty * catalogData.addons.lighting.spots.price
            });
        } else {
            onRemove('led-spots');
        }
    };

    const handleSaveStrip = () => {
        if (stripLength > 0) {
            onAdd({
                id: 'led-strip',
                type: 'lighting',
                name: 'LED Listwa (Taśma)',
                length: stripLength * 1000,
                price: stripLength * catalogData.addons.lighting.strip.price
            });
        } else {
            onRemove('led-strip');
        }
    };

    const handleSaveHeater = () => {
        onAdd({
            id: 'heater',
            type: 'heater',
            name: catalogData.addons.heater.name,
            quantity: 1,
            price: catalogData.addons.heater.price
        });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-slate-800 text-lg mb-4">Oświetlenie i Komfort</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LED Spots */}
                <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h5 className="font-semibold text-slate-700">LED Spots</h5>
                            <p className="text-xs text-slate-500">Punktowe w krokwiach</p>
                        </div>
                        <span className="text-xs font-bold text-accent">{catalogData.addons.lighting.spots.price} € / szt.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="number" min={0} value={spotsQty} onChange={e => setSpotsQty(Number(e.target.value))} className="w-16 border rounded-lg p-2 text-center" />
                        <button onClick={handleSaveSpots} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition">Zapisz</button>
                    </div>
                </div>

                {/* LED Strip */}
                <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h5 className="font-semibold text-slate-700">LED Listwa</h5>
                            <p className="text-xs text-slate-500">Taśma zintegrowana</p>
                        </div>
                        <span className="text-xs font-bold text-accent">{catalogData.addons.lighting.strip.price} € / mb</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="number" min={0} value={stripLength} onChange={e => setStripLength(Number(e.target.value))} className="w-16 border rounded-lg p-2 text-center" />
                        <button onClick={handleSaveStrip} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition">Zapisz (mb)</button>
                    </div>
                </div>

                {/* Heater */}
                <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h5 className="font-semibold text-slate-700">Heizstrahler</h5>
                            <p className="text-xs text-slate-500">Promiennik ciepła</p>
                        </div>
                        <span className="text-xs font-bold text-accent">{catalogData.addons.heater.price} €</span>
                    </div>
                    <button onClick={handleSaveHeater} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition">Dodaj</button>
                </div>
            </div>
        </div>
    );
};
