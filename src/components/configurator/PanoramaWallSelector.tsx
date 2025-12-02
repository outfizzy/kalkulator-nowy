import React, { useState, useMemo, useEffect } from 'react';
import { panoramaWallsData } from '../../data/panorama_walls';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';

interface PanoramaWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
}

export const PanoramaWallSelector: React.FC<PanoramaWallSelectorProps> = ({ onAdd, onRemove, currentAddons }) => {
    const existing = currentAddons.find(a => a.id.startsWith('panorama-'));

    const [variantName, setVariantName] = useState<string>(existing?.id.split('-')[1] || 'AL23');
    const [width, setWidth] = useState<number>(existing?.width || 3000);
    const [height, setHeight] = useState<number>(existing?.height || 2500);
    const [numTracks, setNumTracks] = useState<string>(existing?.variant ? existing.variant.split('_')[0] : '3');
    const [selectedMaterials, setSelectedMaterials] = useState<Record<string, number>>({});

    const variant = panoramaWallsData.variants[variantName];

    // Calculate valid track options based on width and panel limits
    const validTrackOptions = useMemo(() => {
        if (!variant) return [];

        const minPanelWidth = variant.panel.paneel_width_min_mm;
        const maxPanelWidth = variant.panel.paneel_width_max_mm;

        // Calculate min and max number of panels possible for this width
        // Each track corresponds to one panel
        const minPanels = Math.ceil(width / maxPanelWidth);
        const maxPanels = Math.floor(width / minPanelWidth);

        const availableKeys = Object.keys(variant.panel.price_per_panel);

        return availableKeys.filter(key => {
            const tracks = parseInt(key);
            return tracks >= minPanels && tracks <= maxPanels;
        }).sort((a, b) => parseInt(a) - parseInt(b));
    }, [variant, width]);

    // Auto-select valid track if current selection is invalid
    useEffect(() => {
        if (validTrackOptions.length > 0 && !validTrackOptions.includes(numTracks)) {
            setNumTracks(validTrackOptions[0]);
        } else if (validTrackOptions.length === 0 && numTracks !== '') {
            // If no valid options, clear selection
            setNumTracks('');
        }
    }, [validTrackOptions, numTracks]);

    // Calculate prices
    const { totalPrice, breakdown } = useMemo(() => {
        if (!variant || !numTracks || !validTrackOptions.includes(numTracks)) return { totalPrice: 0, breakdown: [] };

        let total = 0;
        const breakdownItems = [];

        // 1. Panels
        const tracksCount = parseInt(numTracks);
        const panelPrice = variant.panel.price_per_panel[numTracks];
        const panelsCost = tracksCount * panelPrice;

        total += panelsCost;
        breakdownItems.push({ name: `${tracksCount}x Panel szklany`, price: panelsCost });

        // 2. Mandatory Materials

        // Bottom Track (Width)
        const bottomTrack = variant.loose_material.find(m => m.name.includes('Laufschiene unten'));
        if (bottomTrack) {
            const price = (width / 1000) * (bottomTrack.price_per_track[numTracks] || 0);
            total += price;
            breakdownItems.push({ name: `Szyna dolna (${width}mm)`, price });
        }

        // Top Track (Width)
        const topTrack = variant.loose_material.find(m => m.name.includes('Laufschiene oben'));
        if (topTrack) {
            const price = (width / 1000) * (topTrack.price_per_track[numTracks] || 0);
            total += price;
            breakdownItems.push({ name: `Szyna górna (${width}mm)`, price });
        }

        // Side Profile (2x Height)
        const sideProfile = variant.loose_material.find(m => m.name.includes('Seitenprofil'));
        if (sideProfile) {
            const price = (height * 2 / 1000) * (sideProfile.price_per_track[numTracks] || 0);
            total += price;
            breakdownItems.push({ name: `Profile boczne (2x ${height}mm)`, price });
        }

        // 3. Selected Optional Materials
        Object.entries(selectedMaterials).forEach(([matName, qty]) => {
            if (qty > 0) {
                const mat = variant.loose_material.find(m => m.name === matName);
                if (mat) {
                    let price = 0;
                    if (mat.unit === 'm1') {
                        price = qty * (mat.price_per_track[numTracks] || 0);
                    } else {
                        price = qty * (mat.price_per_track[numTracks] || 0);
                    }
                    total += price;
                    breakdownItems.push({ name: `${matName}`, price });
                }
            }
        });

        return { totalPrice: total, breakdown: breakdownItems };
    }, [variant, numTracks, width, height, selectedMaterials, validTrackOptions]);

    const handleAdd = () => {
        if (!validTrackOptions.includes(numTracks)) return;

        onAdd({
            id: `panorama-${variantName}`,
            type: 'panorama',
            name: `Panorama ${variantName} (${numTracks} Tory)`,
            variant: `${numTracks}_tracks`,
            width,
            height,
            quantity: 1,
            price: totalPrice,
            description: breakdown.map(i => i.name).join(', ')
        });
    };

    const toggleMaterial = (name: string, unit: string) => {
        setSelectedMaterials(prev => {
            const current = prev[name] || 0;
            if (current > 0) {
                const next = { ...prev };
                delete next[name];
                return next;
            } else {
                // For m1 items, default to width in meters. For pcs, default to 1.
                return { ...prev, [name]: unit === 'm1' ? width / 1000 : 1 };
            }
        });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg">Panorama Schiebewand</h4>
                    <p className="text-sm text-slate-500">System przesuwny bezramowy / pełnoszklany</p>
                </div>
                {existing && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Wybrano</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Variant Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Model Systemu</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(panoramaWallsData.variants).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setVariantName(v)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${variantName === v
                                        ? 'border-accent bg-accent text-white'
                                        : 'border-slate-200 text-slate-600 hover:border-accent/50'
                                        }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Szerokość (mm)</label>
                            <input
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Wysokość (mm)</label>
                            <input
                                type="number"
                                value={height}
                                max={variant?.panel.max_height_mm}
                                onChange={(e) => setHeight(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                            <div className="text-xs text-slate-400 mt-1">Max: {variant?.panel.max_height_mm}mm</div>
                        </div>
                    </div>

                    {/* Tracks Selection (Auto-filtered) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Liczba Torów / Paneli</label>
                        {validTrackOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {validTrackOptions.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNumTracks(t)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${numTracks === t
                                            ? 'border-accent bg-accent text-white'
                                            : 'border-slate-200 text-slate-600 hover:border-accent/50'
                                            }`}
                                    >
                                        {t} Tory
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                                Brak dostępnych konfiguracji dla tej szerokości. Zmień szerokość (min. {variant?.panel.paneel_width_min_mm}mm na panel).
                            </div>
                        )}
                    </div>

                    {/* Optional Materials */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Dodatkowe Elementy</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-lg">
                            {variant?.loose_material
                                .filter(m => !['Laufschiene unten', 'Laufschiene oben', 'Seitenprofil'].some(n => m.name.includes(n)))
                                .map(mat => (
                                    <div key={mat.name} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedMaterials[mat.name]}
                                                onChange={() => toggleMaterial(mat.name, mat.unit)}
                                                className="w-4 h-4 text-accent rounded border-slate-300 focus:ring-accent"
                                            />
                                            <span className="text-sm text-slate-700">{mat.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">
                                            {formatCurrency(mat.price_per_track[numTracks] || 0)}/{mat.unit}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Visualization & Summary */}
                <div className="space-y-6">
                    {/* Visualization */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col">
                        <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <span className="text-xl">👁️</span> Podgląd konfiguracji
                        </h5>

                        <div className="flex-1 flex items-center justify-center min-h-[200px] bg-white rounded-xl border border-slate-200 p-8 relative overflow-hidden">
                            {/* Frame */}
                            <div
                                className="relative border-t-4 border-b-4 border-slate-700 bg-slate-50 shadow-inner"
                                style={{
                                    width: '100%',
                                    maxWidth: '500px',
                                    aspectRatio: `${width / (height || 2500)}`,
                                    maxHeight: '250px'
                                }}
                            >
                                {/* Panels */}
                                <div className="absolute inset-0 flex items-end">
                                    {Array.from({ length: parseInt(numTracks) || 0 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-full border-r border-l border-slate-300 relative bg-blue-50/30 backdrop-blur-sm transition-all hover:bg-blue-100/40"
                                            style={{
                                                width: `${100 / (parseInt(numTracks) || 1)}%`,
                                                // Simulate track offset slightly for visual depth
                                                transform: `translateY(${i % 2 === 0 ? '0' : '-2px'})`,
                                                zIndex: i
                                            }}
                                        >
                                            {/* Handle/Glass edge detail */}
                                            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-slate-400 opacity-30" />
                                        </div>
                                    ))}
                                </div>

                                {/* Dimensions Label */}
                                <div className="absolute -bottom-6 left-0 right-0 text-center text-xs font-mono text-slate-500">
                                    ↔ {width} mm
                                </div>
                                <div className="absolute top-0 bottom-0 -left-6 flex items-center text-xs font-mono text-slate-500 [writing-mode:vertical-lr] rotate-180">
                                    ↕ {height} mm
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-500">
                            <div className="bg-white p-2 rounded border border-slate-100 text-center">
                                <span className="block font-bold text-slate-700">{numTracks}</span>
                                Tory / Panele
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-100 text-center">
                                <span className="block font-bold text-slate-700">{Math.round(width / (parseInt(numTracks) || 1))} mm</span>
                                Szer. panelu
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 h-fit">
                        <h5 className="font-bold text-slate-800 mb-4">Kalkulacja Kosztów</h5>
                        <div className="space-y-3 text-sm mb-6">
                            {breakdown.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{item.name}</span>
                                    <span className="font-medium">{formatCurrency(item.price)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex justify-between items-end mb-6">
                            <span className="font-bold text-slate-700">Razem Netto:</span>
                            <span className="text-2xl font-bold text-accent">{formatCurrency(totalPrice)}</span>
                        </div>

                        <button
                            onClick={handleAdd}
                            disabled={validTrackOptions.length === 0}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${validTrackOptions.length === 0
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-accent hover:bg-accent/90 shadow-accent/20 hover:scale-[1.02]'
                                }`}
                        >
                            {existing ? 'Zaktualizuj Konfigurację' : 'Dodaj do Oferty'}
                        </button>

                        {existing && (
                            <button
                                onClick={() => onRemove(existing.id)}
                                className="w-full mt-3 py-2 text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Usuń z oferty
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
