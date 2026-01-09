import React, { useState, useMemo, useEffect } from 'react';
// import { supabase } from '../../lib/supabase';
import { awningsData } from '../../data/awnings';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';
import type { AddonPriceEntry } from '../../services/pricing.service';
// import { PricingService } from '../../services/pricing.service';

interface AwningSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    availableItems: AddonPriceEntry[];
    maxRoofWidth: number;
    maxRoofDepth: number;
    snowZone?: string;
}

export const AwningSelector: React.FC<AwningSelectorProps> = ({ onAdd, onRemove, currentAddons, maxRoofWidth, maxRoofDepth, availableItems }) => {
    const existing = currentAddons.find(a => a.id.startsWith('awning-'));

    const [type, setType] = useState<'aufdachmarkise_zip' | 'unterdachmarkise_zip' | 'zip_screen'>(
        (existing?.id.replace('awning-', '') as 'aufdachmarkise_zip' | 'unterdachmarkise_zip' | 'zip_screen') || 'aufdachmarkise_zip'
    );

    const [width, setWidth] = useState<number>(existing?.width || maxRoofWidth);
    const [projection, setProjection] = useState<number>((existing as any)?.depth || maxRoofDepth);
    const [color, setColor] = useState<string>('');
    const [fabric, setFabric] = useState<string>('');
    const [extras, setExtras] = useState<string[]>([]);

    const data = awningsData[type] as any;

    // Simplified Manual Pricing Logic
    // We expect availableItems (Pricing Addons) to contain entries for Awnings.
    // Logic: Find item matching Type + Width + Projection.
    // Or if Linear (BY_WIDTH).

    // Initialize color and fabric when data changes
    React.useEffect(() => {
        if (data) {
            if (!color || !data.colors.standard.includes(color)) {
                setColor(existing?.variant?.split(' | ')[0] || data.colors.standard[0]);
            }
            if (!fabric || !data.fabric_suppliers.includes(fabric)) {
                setFabric(existing?.variant?.split(' | ')[1] || data.fabric_suppliers[0]);
            }
        }
    }, [type, data]);

    const isZipScreen = type === 'zip_screen';

    // Calculate Price using Manual/CSV Items
    const { totalPrice, breakdown } = useMemo(() => {
        if (!data) return { totalPrice: 0, breakdown: [] };

        const items: { name: string, price: number }[] = [];
        let total = 0;

        // Find Base Item Logic
        // Strategy: 
        // 1. Look for Exact Item matching "Type" (e.g. "Aufdachmarkise") and dimensions?
        //    Likely users upload "Aufdachmarkise 4000x3000".
        // 2. Or "Aufdachmarkise" with BY_WIDTH basis.

        // Filter for type
        const typeKeywords = type === 'aufdachmarkise_zip' ? ['aufdach', 'dach']
            : type === 'unterdachmarkise_zip' ? ['unterdach', 'poddach']
                : ['zip', 'screen', 'pion'];

        let candidates = availableItems.filter(i => {
            const n = i.addon_name.toLowerCase();
            return typeKeywords.some(k => n.includes(k));
        });

        // Find best match
        let match = candidates.find(i => {
            // Strict dimension check if properties exist
            if (i.properties?.width && Number(i.properties.width) !== width) return false;
            if (i.properties?.projection && Number(i.properties.projection) !== projection) return false;
            return true;
        });

        // Fallback: Closest larger size?
        if (!match) {
            // naive find first that fits
            match = candidates.find(i => {
                const w = i.properties?.max_width || i.properties?.width;
                const p = i.properties?.max_projection || i.properties?.projection || i.properties?.drop;
                return (!w || Number(w) >= width) && (!p || Number(p) >= projection);
            });
        }

        // Fallback: Generic BY_WIDTH match
        if (!match) {
            match = candidates.find(i => i.pricing_basis === 'BY_WIDTH');
        }

        if (match) {
            let basePrice = match.price_upe_net_eur;

            // Apply Basis Calc
            // Note: Manual Pricing CSV logic for Awnings might be intricate.
            // Assuming simpler rules for now as requested.
            if (match.pricing_basis === 'BY_WIDTH') {
                basePrice = match.price_upe_net_eur * (width / 1000);
            } else if (match.pricing_basis === 'PER_M2') {
                basePrice = match.price_upe_net_eur * (width / 1000) * (projection / 1000);
            }

            total += basePrice;
            items.push({
                name: match.addon_name,
                price: basePrice
            });
        } else {
            // Fail safe
            // items.push({ name: 'Cena nie znana (brak w cenniku)', price: 0 });
        }


        // Special Color
        if (data.colors && !data.colors.standard.includes(color)) {
            total += data.colors.special_color_surcharge_eur;
            items.push({ name: `Kolor niestandardowy: ${color} `, price: data.colors.special_color_surcharge_eur });
        }

        // Extras (Wind Sensor) - Look for item in availableItems?
        // Or keep hardcoded if not in DB.
        // Let's look for known extra items. (Global lookup?)
        // Assuming currentAddons might handle extras, or just additive price here.
        if (!isZipScreen && extras.includes('wind_sensor')) {
            const sensorItem = availableItems.find(i => i.addon_name.toLowerCase().includes('sensor') || i.addon_name.toLowerCase().includes('czujnik'));
            const sensorPrice = sensorItem ? sensorItem.price_upe_net_eur : 150; // Fallback 150
            total += sensorPrice;
            items.push({ name: 'Czujnik wiatru/deszczu', price: sensorPrice });
        }

        return { totalPrice: total, breakdown: items };
    }, [data, type, width, projection, color, extras, isZipScreen, availableItems]);

    const handleAdd = () => {
        const typeName = type === 'aufdachmarkise_zip'
            ? 'Markiza Dachowa (Aufdach)'
            : type === 'unterdachmarkise_zip'
                ? 'Markiza Poddachowa (Unterdach)'
                : 'Senkrechtmarkise ZIP';

        onAdd({
            id: `awning - ${type} `,
            type: 'zipScreen',
            name: typeName,
            variant: `${color} | ${fabric} `,
            width,
            depth: projection,
            quantity: 1,
            price: totalPrice,
            description: breakdown.map(i => i.name).join(', ')
        });
    };

    const dimensionLabel = isZipScreen ? 'Wysokość (Drop)' : 'Wysięg (Projection)';
    const maxDimension = isZipScreen ? (data.limits?.max_drop_mm || 3000) : (data.limits?.max_projection_mm || 5000);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg">Markizy & ZIP Screen</h4>
                    <p className="text-sm text-slate-500">Ochrona przed słońcem i nagrzewaniem</p>
                </div>
                {existing && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Wybrano</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Rodzaj Systemu</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setType('aufdachmarkise_zip')}
                                className={`py - 3 px - 2 rounded - xl border - 2 font - bold text - xs transition - all ${type === 'aufdachmarkise_zip'
                                    ? 'border-accent bg-accent/5 text-accent'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    } `}
                            >
                                Aufdach
                            </button>
                            <button
                                onClick={() => setType('unterdachmarkise_zip')}
                                className={`py - 3 px - 2 rounded - xl border - 2 font - bold text - xs transition - all ${type === 'unterdachmarkise_zip'
                                    ? 'border-accent bg-accent/5 text-accent'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    } `}
                            >
                                Unterdach
                            </button>
                            <button
                                onClick={() => setType('zip_screen')}
                                className={`py - 3 px - 2 rounded - xl border - 2 font - bold text - xs transition - all ${type === 'zip_screen'
                                    ? 'border-accent bg-accent/5 text-accent'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    } `}
                            >
                                ZIP Screen
                            </button>
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Szerokość (mm)</label>
                            <input
                                type="number"
                                value={width}
                                max={data.limits?.max_coupled_width_mm || data.limits?.max_width_mm || 6000}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{dimensionLabel} (mm)</label>
                            <input
                                type="number"
                                value={projection}
                                max={maxDimension}
                                onChange={(e) => setProjection(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                    </div>

                    {/* Colors & Fabric */}
                    {data.colors && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Kolor Konstrukcji</label>
                            <select
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-accent"
                            >
                                {data.colors.standard.map((c: string) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="Sonderfarbe">Inny (Dopłata)</option>
                            </select>
                        </div>
                    )}

                    {data.fabric_suppliers && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Producent Tkaniny</label>
                            <div className="flex gap-2">
                                {data.fabric_suppliers.map((s: string) => (
                                    <button
                                        key={s}
                                        onClick={() => setFabric(s)}
                                        className={`px - 3 py - 2 rounded - lg text - sm border transition - all ${fabric === s
                                            ? 'border-accent bg-accent text-white'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            } `}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extras (only for Aufdach/Unterdach) */}
                    {!isZipScreen && data.extras && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Dodatki</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={extras.includes('wind_sensor')}
                                        onChange={(e) => {
                                            if (e.target.checked) setExtras([...extras, 'wind_sensor']);
                                            else setExtras(extras.filter(x => x !== 'wind_sensor'));
                                        }}
                                        className="w-5 h-5 text-accent rounded focus:ring-accent"
                                    />
                                    <span className="text-sm text-slate-700">Czujnik wiatru/deszczu</span>
                                    <span className="ml-auto font-bold text-slate-900">{formatCurrency(data.extras.wind_rain_sensor_eur)}</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ZIP Screen Includes */}
                    {isZipScreen && (data as any).includes && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h6 className="font-bold text-green-800 text-sm mb-2">W zestawie:</h6>
                            <ul className="text-xs text-green-700 space-y-1">
                                {(data as any).includes.map((item: string, idx: number) => (
                                    <li key={idx}>✓ {item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 h-fit">
                    <h5 className="font-bold text-slate-800 mb-4">Kalkulacja Kosztów</h5>

                    {/* Info Box for Aufdach/Unterdach */}
                    {!isZipScreen && data.two_fields && (
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs mb-4 border border-blue-100">
                            <strong>Info:</strong> {width > data.limits.max_single_field_width_mm ? data.two_fields.description : data.one_field.description}
                        </div>
                    )}

                    <div className="space-y-3 text-sm mb-6">
                        {breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-600">
                                <span className="pr-2">{item.name}</span>
                                <span className="font-medium whitespace-nowrap">{formatCurrency(item.price)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-between items-end mb-6">
                        <span className="font-bold text-slate-700">Razem Netto:</span>
                        <span className="text-2xl font-bold text-accent">{formatCurrency(totalPrice)}</span>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="w-full py-4 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all hover:scale-[1.02]"
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
    );
};
