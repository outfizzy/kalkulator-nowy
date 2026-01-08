
import React, { useState } from 'react';
import type { SelectedAddon } from '../../types';
import { formatCurrency } from '../../utils/translations';

interface LightingSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    availableItems: any[]; // DB Entries
}

export const LightingSelector: React.FC<LightingSelectorProps> = ({ onAdd, onRemove, currentAddons, availableItems }) => {
    // Identify DB items by known strings/identifiers
    // Case insensitive matching with multilingual support
    const spotItem = availableItems.find(i => {
        const n = i.properties?.name?.toLowerCase() || '';
        return n.includes('spot') || n.includes('punkt');
    });
    const stripItem = availableItems.find(i => {
        const n = i.properties?.name?.toLowerCase() || '';
        return n.includes('listwa') || n.includes('strip') || n.includes('led-band') || n.includes('band');
    });
    const heaterItem = availableItems.find(i => {
        const n = i.properties?.name?.toLowerCase() || '';
        return n.includes('promiennik') || n.includes('heizstrahler') || n.includes('heater') || n.includes('wärme');
    });

    // Find other items (unmatched)
    const otherItems = availableItems.filter(i => i !== spotItem && i !== stripItem && i !== heaterItem);

    const existingSpots = currentAddons.find(a => a.id === 'led-spots');
    const existingStrip = currentAddons.find(a => a.id === 'led-strip');
    const existingHeater = currentAddons.find(a => a.id === 'heater');

    const [spotsQty, setSpotsQty] = useState<number>(existingSpots?.quantity || 6);
    const [stripLength, setStripLength] = useState<number>(existingStrip?.length ? existingStrip.length / 1000 : 3);
    const [heaterQty, setHeaterQty] = useState<number>(existingHeater?.quantity || 1);

    const handleSaveSpots = () => {
        if (!spotItem) return;
        if (spotsQty > 0) {
            onAdd({
                id: 'led-spots',
                type: 'lighting',
                name: spotItem.properties.name,
                quantity: spotsQty,
                price: spotsQty * spotItem.price
            });
        } else {
            onRemove('led-spots');
        }
    };

    const handleSaveStrip = () => {
        if (!stripItem) return;
        if (stripLength > 0) {
            onAdd({
                id: 'led-strip',
                type: 'lighting',
                name: stripItem.properties.name,
                length: stripLength * 1000,
                price: stripLength * stripItem.price
            });
        } else {
            onRemove('led-strip');
        }
    };

    const handleSaveHeater = () => {
        if (!heaterItem) return;
        if (heaterQty > 0) {
            onAdd({
                id: 'heater',
                type: 'heater',
                name: heaterItem.properties.name,
                quantity: heaterQty,
                price: heaterQty * heaterItem.price
            });
        } else {
            onRemove('heater');
        }
    };

    const handleGenericAdd = (item: any, qty: number) => {
        const id = `extra-${item.id}`;
        if (qty > 0) {
            onAdd({
                id,
                type: 'lighting', // Use valid type
                name: item.properties.name,
                quantity: qty,
                price: qty * item.price,
                description: item.properties.description
            });
        } else {
            onRemove(id);
        }
    };

    if (availableItems.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center text-slate-400 text-sm">
                Brak dostępnych elementów oświetlenia w cenniku.
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-slate-800 text-lg mb-4">Oświetlenie i Komfort</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LED Spots */}
                {spotItem && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-semibold text-slate-700">{spotItem.properties.name}</h5>
                                <p className="text-xs text-slate-500">{spotItem.properties.description}</p>
                            </div>
                            <span className="text-xs font-bold text-accent">{formatCurrency(spotItem.price)} / {spotItem.properties.unit || 'szt'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="number" min={0} value={spotsQty} onChange={e => setSpotsQty(Number(e.target.value))} className="w-16 border rounded-lg p-2 text-center" />
                            <button onClick={handleSaveSpots} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition">Zapisz</button>
                        </div>
                    </div>
                )}

                {/* LED Strip */}
                {stripItem && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-semibold text-slate-700">{stripItem.properties.name}</h5>
                                <p className="text-xs text-slate-500">{stripItem.properties.description}</p>
                            </div>
                            <span className="text-xs font-bold text-accent">{formatCurrency(stripItem.price)} / {stripItem.properties.unit || 'mb'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="number" min={0} value={stripLength} onChange={e => setStripLength(Number(e.target.value))} className="w-16 border rounded-lg p-2 text-center" />
                            <button onClick={handleSaveStrip} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition">Zapisz (mb)</button>
                        </div>
                    </div>
                )}

                {/* Heater */}
                {heaterItem && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-semibold text-slate-700">{heaterItem.properties.name}</h5>
                                <p className="text-xs text-slate-500">{heaterItem.properties.description}</p>
                            </div>
                            <span className="text-xs font-bold text-accent">{formatCurrency(heaterItem.price)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="number" min={0} value={heaterQty} onChange={e => setHeaterQty(Number(e.target.value))} className="w-16 border rounded-lg p-2 text-center" />
                            <button onClick={handleSaveHeater} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition">Dodaj</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Generic Other Items Loop */}
            {otherItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <h5 className="font-semibold text-slate-700 mb-3 text-sm">Pozostałe opcje:</h5>
                    <div className="space-y-3">
                        {otherItems.map(item => {
                            const existing = currentAddons.find(a => a.id === `extra-${item.id}`);
                            const qty = existing?.quantity || 0;
                            return (
                                <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded px-2 -mx-2">
                                    <div>
                                        <div className="text-sm font-medium text-slate-700">{item.properties.name}</div>
                                        <div className="text-xs text-slate-500">{item.properties.description}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm font-bold text-accent">{formatCurrency(item.price)}</div>
                                        <div className="flex items-center border rounded-lg bg-white">
                                            <button onClick={() => handleGenericAdd(item, qty - 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-l">-</button>
                                            <span className="w-8 text-center text-sm font-bold">{qty}</span>
                                            <button onClick={() => handleGenericAdd(item, qty + 1)} className="w-8 h-8 flex items-center justify-center text-accent hover:bg-accent/10 rounded-r">+</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
