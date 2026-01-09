
import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

import type { AddonPriceEntry } from '../../services/pricing.service';
interface PanoramaWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    availableItems: AddonPriceEntry[];
}

export const PanoramaWallSelector: React.FC<PanoramaWallSelectorProps> = ({
    onAdd,
    onRemove,
    currentAddons,
    availableItems
}) => {
    const existing = currentAddons.find(a => a.id.startsWith('panorama-'));

    const [systemType, setSystemType] = useState<'AL22' | 'AL23'>(existing?.id.includes('AL23') ? 'AL23' : 'AL22');
    const [width, setWidth] = useState<number>(existing?.width || 3000);
    const [height, setHeight] = useState<number>(existing?.height || 2500);
    const [numTracks, setNumTracks] = useState<number>(existing?.variant ? parseInt(existing.variant) : 3);


    // Derive available track counts from DB items
    const availableTracks = useMemo(() => {
        // In Manual Pricing, we assume availableItems contains "Panorama Base" items which might specify tracks in name
        // OR we just allow standard 3,4,5,6 and look for price match later.
        // Let's scrape availableItems for distinct track numbers if possible.
        const tracks = new Set<number>();
        availableItems.forEach(item => {
            const name = item.addon_name || '';
            const match = name.match(/(\d+)[- ](tor|rail|spur|gleis|lauf)/i);
            if (match) {
                tracks.add(parseInt(match[1]));
            }
        });

        if (tracks.size === 0) return [3, 4, 5, 6]; // Default if no specific items found
        return Array.from(tracks).sort((a, b) => a - b);
    }, [availableItems]);

    // Ensure numTracks is valid when switching systems
    // Ensure valid track selection
    useEffect(() => {
        if (availableTracks.length > 0 && !availableTracks.includes(numTracks)) {
            // Defer update to avoid strict mode double invocation issues or warning
            const t = setTimeout(() => setNumTracks(availableTracks[0]), 0);
            return () => clearTimeout(t);
        }
    }, [availableTracks, numTracks]);

    // Calculate limit of panels based on width (approximate logic matching commercial rules)
    // AL22/23 usually max 1100mm per panel or so.
    // If DB doesn't have rules, we'll use a generic safe rule: Min 600mm, Max 1300mm per panel.
    // Panel width = Width / numTracks.
    const panelWidth = width / numTracks;
    const isDimensionValid = panelWidth >= 500 && panelWidth <= 1500;

    // Pricing Logic
    const { totalPrice, breakdown } = useMemo(() => {
        if (availableItems.length === 0) return { totalPrice: 0, breakdown: [] };

        let total = 0;
        const items: { name: string, price: number }[] = [];

        // Find Base Price for System + Tracks + Width
        // Look for items with pricing_basis = 'BY_OPENING_WIDTH' (or similar)
        // Name should match System (AL22/23) (or just generic 'Panorama' if system not in name)
        // AND Track count.

        // Filter candidates
        const candidates = availableItems.filter(i => {
            const n = i.addon_name.toLowerCase();
            return n.includes(systemType.toLowerCase()) && n.includes(`${numTracks}-`);
        });

        // Find best match by Width (if multiple items for different widths exist)
        // OR find one item with BY_OPENING_WIDTH basis.

        let match = candidates.find(i => i.pricing_basis === 'BY_OPENING_WIDTH');

        // Fallback: Exact match on width property?
        if (!match) {
            match = candidates.find(i => {
                const w = i.properties?.width || i.properties?.max_width;
                return w && Number(w) >= width;
            });
        }

        // Fallback 2: Any item matching system & tracks
        if (!match && candidates.length > 0) match = candidates[0];

        if (match) {
            let price = match.price_upe_net_eur;

            // Calculate Logic
            if (match.pricing_basis === 'BY_OPENING_WIDTH') {
                // Price per Meter of Opening Width
                price = price * (width / 1000);
            } else if (match.pricing_basis === 'PER_M2') {
                price = price * (width / 1000) * (height / 1000);
            }

            total += price;
            items.push({ name: match.addon_name, price });
        } else {
            // Cannot find price
            // Maybe manual component logic?
            // For now return 0 or maybe warn.
        }

        return { totalPrice: total, breakdown: items };
    }, [availableItems, width, height, numTracks, systemType]);

    const handleAdd = () => {
        onAdd({
            id: `panorama-${systemType}`,
            type: 'panorama',
            name: `Panorama ${systemType} (${numTracks} Tory)`,
            variant: `${numTracks}_tracks`,
            width,
            height,
            quantity: 1,
            price: totalPrice,
            description: breakdown.map(i => i.name).join(', ')
        });
    };

    if (availableItems.length === 0) {
        return <div className="p-4 text-center text-slate-400">Brak danych cennikowych dla systemów Panorama.</div>;
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg">Panorama Schiebewand</h4>
                    <p className="text-sm text-slate-500">System przesuwny bezramowy</p>
                </div>
                {existing && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Wybrano</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* System Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Model Systemu</label>
                        <div className="flex gap-2">
                            {['AL22', 'AL23'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSystemType(s as 'AL22' | 'AL23')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${systemType === s ? 'border-accent bg-accent text-white' : 'border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Szerokość (mm)</label>
                            <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full border p-2 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Wysokość (mm)</label>
                            <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full border p-2 rounded-lg" />
                        </div>
                    </div>

                    {/* Tracks */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Liczba Torów</label>
                        <div className="flex flex-wrap gap-2">
                            {availableTracks.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setNumTracks(t)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${numTracks === t ? 'border-accent bg-accent text-white' : 'border-slate-200'}`}
                                >
                                    {t} Tory
                                </button>
                            ))}
                        </div>
                        {!isDimensionValid && (
                            <p className="text-red-500 text-xs mt-2">Uwaga: Nietypowa szerokość panelu ({Math.round(panelWidth)}mm).</p>
                        )}
                    </div>
                </div>

                {/* Summary & Visualization Placeholder */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800 mb-4">Podsumowanie</h5>
                    <div className="space-y-2 mb-6">
                        {breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-600">
                                <span>{item.name}</span>
                                <span>{formatCurrency(item.price)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-200 mb-4">
                        <span className="font-bold">Razem:</span>
                        <span className="font-bold text-accent text-xl">{formatCurrency(totalPrice)}</span>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-dark"
                    >
                        {existing ? 'Zaktualizuj' : 'Dodaj do Oferty'}
                    </button>
                    {existing && (
                        <button onClick={() => onRemove(existing.id)} className="w-full mt-2 text-red-500 text-sm hover:underline">Usuń</button>
                    )}
                </div>
            </div>
        </div>
    );
};
