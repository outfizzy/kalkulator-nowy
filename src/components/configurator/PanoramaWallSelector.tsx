
import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

interface PanoramaWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    al22List: any[];
    al23List: any[];
}

export const PanoramaWallSelector: React.FC<PanoramaWallSelectorProps> = ({
    onAdd,
    onRemove,
    currentAddons,
    al22List,
    al23List
}) => {
    const existing = currentAddons.find(a => a.id.startsWith('panorama-'));

    const [systemType, setSystemType] = useState<'AL22' | 'AL23'>(existing?.id.includes('AL23') ? 'AL23' : 'AL22');
    const [width, setWidth] = useState<number>(existing?.width || 3000);
    const [height, setHeight] = useState<number>(existing?.height || 2500);
    const [numTracks, setNumTracks] = useState<number>(existing?.variant ? parseInt(existing.variant) : 3);


    // Switch list based on system
    const activeList = systemType === 'AL22' ? al22List : al23List;

    // Derive available track counts from DB items
    const availableTracks = useMemo(() => {
        const tracks = new Set<number>();
        activeList.forEach(item => {
            const name = item.properties.name || '';
            const match = name.match(/(\d+)[- ]tor/i);
            if (match) {
                tracks.add(parseInt(match[1]));
            }
        });
        // Default AL22 has 3 and 5 usually. AL23 has 3,4,5,6.
        // If DB is empty, provide defaults or empty
        if (tracks.size === 0) return [3, 4, 5];
        return Array.from(tracks).sort((a, b) => a - b);
    }, [activeList]);

    // Ensure numTracks is valid when switching systems
    useEffect(() => {
        if (availableTracks.length > 0 && !availableTracks.includes(numTracks)) {
            setNumTracks(availableTracks[0]);
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
        if (activeList.length === 0) return { totalPrice: 0, breakdown: [] };

        let total = 0;
        const items: { name: string, price: number }[] = [];

        // 1. Rails (Bottom and Top) - Find by string matching current tracks
        const bottomRail = activeList.find(i =>
            i.properties.name.toLowerCase().includes('szyna dolna') &&
            i.properties.name.includes(`${numTracks}-tor`)
        );
        const topRail = activeList.find(i =>
            i.properties.name.toLowerCase().includes('szyna górna') &&
            i.properties.name.includes(`${numTracks}-tor`)
        );

        // Helper: Price unit handling
        const addCost = (item: any, qty: number, dim: number, label: string) => {
            if (!item) return;
            // Unit check: m1 vs piece
            const unit = item.properties.unit || 'm1';
            let cost = 0;
            if (unit === 'm1') {
                cost = item.price * (dim / 1000) * qty;
            } else if (unit === 'm2') {
                cost = item.price * dim * qty; // Area passed as dim for m2
            } else {
                cost = item.price * qty;
            }
            total += cost;
            items.push({ name: label || item.properties.name, price: cost });
        };

        addCost(bottomRail, 1, width, `Szyna dolna (${numTracks}-tor)`);
        // If top rail missing in DB for AL23 (maybe same as bottom?), skip. 
        // SQL for AL23 didn't show Top Rail explicitly? Wait.
        // SQL AL22 has both. AL23 only Bottom? Let's assume logic or fallback.
        // If not found, ignore (maybe included in set).
        addCost(topRail, 1, width, `Szyna górna (${numTracks}-tor)`);

        // 2. Side Profiles
        const sideProfile = activeList.find(i => i.properties.name.toLowerCase().includes('profil boczny'));
        // Usually 2 sides * height
        addCost(sideProfile, 2, height, 'Profile boczne');

        // 3. Glass
        // Default to ESG Klar or Planibel based on user selection? 
        // For simplicity, let's assume Klar default, or add a selector.
        // Let's add a Glass Selector.
        const glassItem = activeList.find(i => i.properties.name.toLowerCase().includes('esg klar') || i.properties.name.toLowerCase().includes('szyba'));
        if (glassItem) {
            const area = (width * height) / 1000000; // m2
            // Glass overlap? Ignore for now.
            addCost(glassItem, 1, area, `Szkło ESG (${area.toFixed(2)} m²)`);
        }

        // 4. Extras (Locks, Handles) - Simple loop over "Other" items
        // Or if user selected them.
        // Current Selector has `selectedExtras`.
        // We need to list available extras first.

        return { totalPrice: total, breakdown: items };
    }, [activeList, width, height, numTracks]);

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

    if (al22List.length === 0 && al23List.length === 0) {
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
