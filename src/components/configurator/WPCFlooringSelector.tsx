
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SelectedAddon } from '../../types';

interface WPCFlooringSelectorProps {
    currentAddons: SelectedAddon[];
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    roofWidth: number;
    roofDepth: number;
    availableItems: any[]; // DB Entries
}

const WPC_COLORS = [
    { id: 'brown', name: 'Brąz', hex: '#8B4513' },
    { id: 'dark-brown', name: 'Ciemny Brąz', hex: '#5D4037' },
    { id: 'grey', name: 'Szary', hex: '#808080' },
    { id: 'anthracite', name: 'Antracyt', hex: '#37474F' },
    { id: 'light-grey', name: 'Jasny Szary', hex: '#B0BEC5' },
    { id: 'teak', name: 'Teak', hex: '#A1887F' }
];

export const WPCFlooringSelector: React.FC<WPCFlooringSelectorProps> = ({
    currentAddons,
    onAdd,
    onRemove,
    roofWidth,
    roofDepth,
    availableItems
}) => {
    // Derive options from DB
    const wpcTypes = useMemo(() => {
        return availableItems
            .filter(i => i.properties?.type === 'material')
            .map(i => ({
                id: i.id,
                name: i.properties.name.replace(' (m2)', ''), // Clean name
                pricePerM2: i.price,
                description: i.properties.description
            }));
    }, [availableItems]);

    const installationOptions = useMemo(() => {
        return availableItems
            .filter(i => i.properties?.type === 'installation')
            .map(i => ({
                id: i.id,
                name: i.properties.name.replace(' (m2)', ''),
                pricePerM2: i.price
            }));
    }, [availableItems]);

    const existingFloor = currentAddons.find(a => a.type === 'wpc-floor');

    const [width, setWidth] = useState(existingFloor?.width || roofWidth);
    const [depth, setDepth] = useState(existingFloor?.depth || roofDepth);
    const [color, setColor] = useState(existingFloor?.flooringColor || WPC_COLORS[0].id);

    // Default to first available type
    const [typeId, setTypeId] = useState(existingFloor?.flooringType || (wpcTypes[0]?.id || ''));
    const [installId, setInstallId] = useState(
        (existingFloor?.installationOption as any) || (installationOptions[0]?.id || '')
    );

    // Update defaults if data loads later
    useEffect(() => {
        if (!typeId && wpcTypes.length > 0) setTypeId(wpcTypes[0].id);
        if (!installId && installationOptions.length > 0) setInstallId(installationOptions[0].id);
    }, [wpcTypes, installationOptions, typeId, installId]);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Calculate price
    const area = (width / 1000) * (depth / 1000);
    const selectedType = wpcTypes.find(t => t.id === typeId);
    const selectedInstall = installationOptions.find(i => i.id === installId);

    const typePrice = selectedType?.pricePerM2 || 0;
    const installPrice = selectedInstall?.pricePerM2 || 0;
    const totalPrice = Math.round(area * (typePrice + installPrice));

    const drawVisualization = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale calculation
        const padding = 20;
        const availableWidth = canvas.width - (padding * 2);
        const availableHeight = canvas.height - (padding * 2);

        const scaleX = availableWidth / width;
        const scaleY = availableHeight / depth;
        const scale = Math.min(scaleX, scaleY);

        const drawWidth = width * scale;
        const drawHeight = depth * scale;

        const startX = (canvas.width - drawWidth) / 2;
        const startY = (canvas.height - drawHeight) / 2;

        // Draw background (foundation/ground)
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(startX, startY, drawWidth, drawHeight);

        // Draw planks
        const plankWidthMm = 140; // Standard plank width
        const gapMm = 5;
        const plankWidthPx = plankWidthMm * scale;
        const gapPx = gapMm * scale;

        const selectedColorHex = WPC_COLORS.find(c => c.id === color)?.hex || '#8B4513';

        ctx.fillStyle = selectedColorHex;

        // Vertical planks
        const numPlanks = Math.floor(width / (plankWidthMm + gapMm));

        for (let i = 0; i < numPlanks; i++) {
            const x = startX + (i * (plankWidthPx + gapPx));

            // Draw plank
            ctx.fillRect(x, startY, plankWidthPx, drawHeight);

            // Add texture effect
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x, startY, plankWidthPx / 4, drawHeight); // Shadow line
            ctx.fillStyle = selectedColorHex; // Reset color
        }

        // Draw dimensions
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';

        // Width label
        ctx.fillText(`${width} mm`, canvas.width / 2, startY - 5);

        // Depth label
        ctx.save();
        ctx.translate(startX - 10, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${depth} mm`, 0, 0);
        ctx.restore();
    }, [width, depth, color]);

    useEffect(() => {
        drawVisualization();
    }, [drawVisualization]);

    const handleAdd = () => {
        if (!selectedType) return;

        const addon: SelectedAddon = {
            id: existingFloor?.id || crypto.randomUUID(),
            type: 'wpc-floor',
            name: `Podłoga WPC ${selectedType.name}`,
            width,
            depth,
            price: totalPrice,
            flooringColor: color,
            flooringType: typeId,
            installationOption: installId,
            description: `Kolor: ${WPC_COLORS.find(c => c.id === color)?.name}, Typ: ${selectedType.description}, Montaż: ${selectedInstall?.name || 'Brak'}`
        };
        onAdd(addon);
    };

    if (wpcTypes.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center text-slate-400 text-sm">
                Brak dostępnych wariantów podłogi w cenniku.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Konfiguracja Podłogi</h3>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość (mm)</label>
                            <input
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Głębokość (mm)</label>
                            <input
                                type="number"
                                value={depth}
                                onChange={(e) => setDepth(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Type */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Rodzaj Deski</label>
                        <div className="space-y-2">
                            {wpcTypes.map(t => (
                                <label key={t.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="wpc-type"
                                            checked={typeId === t.id}
                                            onChange={() => setTypeId(t.id)}
                                            className="w-4 h-4 text-accent focus:ring-accent"
                                        />
                                        <div>
                                            <div className="font-medium">{t.name}</div>
                                            <div className="text-xs text-slate-500">{t.description}</div>
                                        </div>
                                    </div>
                                    <span className="text-sm text-slate-500 whitespace-nowrap">{t.pricePerM2} €/m²</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Kolor</label>
                        <div className="grid grid-cols-3 gap-3">
                            {WPC_COLORS.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => setColor(c.id)}
                                    className={`cursor-pointer p-2 border rounded-lg flex flex-col items-center gap-2 transition-all ${color === c.id ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'hover:border-slate-300'
                                        }`}
                                >
                                    <div
                                        className="w-full h-8 rounded shadow-sm"
                                        style={{ backgroundColor: c.hex }}
                                    />
                                    <span className="text-xs font-medium text-center">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Installation */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Montaż</label>
                        <div className="space-y-2">
                            {installationOptions.map(opt => (
                                <label key={opt.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="install-opt"
                                            checked={installId === opt.id}
                                            onChange={() => setInstallId(opt.id)}
                                            className="w-4 h-4 text-accent focus:ring-accent"
                                        />
                                        <span className="font-medium">{opt.name}</span>
                                    </div>
                                    <span className="text-sm text-slate-500">+{opt.pricePerM2} €/m²</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Summary & Action */}
                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                        <div>
                            <div className="text-sm text-slate-500">Powierzchnia: {area.toFixed(2)} m²</div>
                            <div className="text-2xl font-bold text-accent">{totalPrice} €</div>
                        </div>
                        {existingFloor ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAdd}
                                    className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent-dark"
                                >
                                    Aktualizuj
                                </button>
                                <button
                                    onClick={() => onRemove(existingFloor.id)}
                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50"
                                >
                                    Usuń
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleAdd}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                            >
                                Dodaj Podłogę
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Visualization */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-lg mb-4">Wizualizacja</h3>
                <div className="flex-1 bg-slate-50 rounded-lg flex items-center justify-center p-4 min-h-[400px]">
                    <canvas
                        ref={canvasRef}
                        width={600}
                        height={400}
                        className="max-w-full h-auto shadow-lg rounded bg-white"
                    />
                </div>
                <p className="text-xs text-center text-slate-400 mt-4">
                    * Wizualizacja poglądowa. Rzeczywisty wygląd może się różnić.
                </p>
            </div>
        </div>
    );
};
