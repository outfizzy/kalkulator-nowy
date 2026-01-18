import React, { useState } from 'react';
import type { SelectedAddon } from '../../types';
import { formatCurrency } from '../../utils/translations';
import type { AddonPriceEntry } from '../../services/pricing.service';

interface LightingSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    availableItems: AddonPriceEntry[];
}

export const LightingSelector: React.FC<LightingSelectorProps> = ({ onAdd, onRemove, currentAddons, availableItems }) => {

    // Helper to generic add/remove
    const handleItemChange = (item: AddonPriceEntry, qty: number) => {
        // Use item.id as the key, or a normalized ID if needed.
        // For new items, we use the DB ID directly if possible, or prefix it.
        // But currentAddons might use 'led-spots' legacy IDs.
        // To support legacy + new, we should check if this item maps to a legacy ID.

        let id = `addon-${item.id}`;
        let type: SelectedAddon['type'] = 'lighting';

        // Legacy mapping for icons/grouping optimization if needed
        const n = item.addon_name.toLowerCase();
        if (n.includes('heat') || n.includes('promiennik') || n.includes('wärme')) type = 'heater';

        if (qty > 0) {
            onAdd({
                id,
                type,
                name: item.addon_name,
                quantity: qty,
                price: qty * item.price_upe_net_eur,
                description: item.properties?.description,
                pricing_basis: item.pricing_basis,
                properties: item.properties
            });
        } else {
            onRemove(id);
        }
    };

    if (availableItems.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center text-slate-400 text-sm">
                Brak dostępnych elementów oświetlenia i ogrzewania dla tego modelu.
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-slate-800 text-lg mb-4">Oświetlenie i Komfort</h4>

            <div className="space-y-4">
                {availableItems.map(item => {
                    // Try to find existing by ID (addon-ID) OR by legacy IDs if name matches?
                    // Safe approach: rely on the new generated ID 'addon-{id}'.
                    // Users might have to re-select if we change IDs, but this is a clean break for consistent imports.

                    const id = `addon-${item.id}`;
                    const existing = currentAddons.find(a => a.id === id);
                    const qty = existing?.quantity || 0;

                    return (
                        <div key={item.id} className="flex flex-col sm:flex-row justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-3 -mx-3 transition-colors">
                            <div className="flex-1 mb-2 sm:mb-0">
                                <div className="font-semibold text-slate-700">{item.addon_name}</div>
                                {item.properties?.description && (
                                    <div className="text-xs text-slate-500 mt-0.5">{item.properties.description}</div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-sm font-bold text-accent whitespace-nowrap">
                                    {formatCurrency(item.price_upe_net_eur)} <span className="text-slate-400 font-normal text-xs">/ {item.unit || 'szt'}</span>
                                </div>

                                <div className="flex items-center border rounded-lg bg-white shadow-sm">
                                    <button
                                        onClick={() => handleItemChange(item, qty - 1)}
                                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-red-500 rounded-l-lg transition-colors font-medium text-lg"
                                        disabled={qty === 0}
                                    >
                                        −
                                    </button>
                                    <span className="w-10 text-center text-sm font-bold text-slate-800">{qty}</span>
                                    <button
                                        onClick={() => handleItemChange(item, qty + 1)}
                                        className="w-10 h-10 flex items-center justify-center text-accent hover:bg-accent/10 rounded-r-lg transition-colors font-medium text-lg"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
