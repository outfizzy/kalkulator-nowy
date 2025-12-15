import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { awningsData } from '../../data/awnings';
import { formatCurrency } from '../../utils/translations';
import type { SelectedAddon } from '../../types';
import { PricingService } from '../../services/pricing.service';

interface AwningSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofWidth: number;
    maxRoofDepth: number;
}

export const AwningSelector: React.FC<AwningSelectorProps> = ({ onAdd, onRemove, currentAddons, maxRoofWidth, maxRoofDepth }) => {
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

    // --- Dynamic Pricing State ---
    const [matrix, setMatrix] = useState<any[]>([]);
    const [supplierCosts, setSupplierCosts] = useState<any[]>([]);
    // const [pricesLoading, setPricesLoading] = useState(false);

    // Fetch dynamic pricing from Supabase
    useEffect(() => {
        const fetchPricing = async () => {
            // setPricesLoading(true);
            try {
                // 1. Get Matrix
                const entries = await PricingService.getPriceMatrix(type);
                setMatrix(entries);

                // 2. Get Product & Supplier Costs
                const { data: product } = await supabase.from('product_definitions').select('provider').eq('code', type).single();

                if (product?.provider) {
                    const costs = await PricingService.getSupplierCosts(product.provider);
                    setSupplierCosts(costs);
                } else {
                    setSupplierCosts([]);
                }
            } catch (e) {
                console.error("Pricing fetch error", e);
            }
            // setPricesLoading(false);
        };
        fetchPricing();
    }, [type]);

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

    // Calculate Price
    const { totalPrice, breakdown } = useMemo(() => {
        if (!data) return { totalPrice: 0, breakdown: [] };

        const items: { name: string, price: number }[] = [];
        let total = 0;

        // Base Price Calculation
        if (isZipScreen) {
            // ZIP Screen pricing logic (Still static for ZIP screen if not seeded? I seeded it!)
            // Seed bucket: "zip_screen" -> inserted entries.
            // Check if we use matrix for ZIP screen

            let basePrice = 0;

            if (matrix.length > 0) {
                // Dynamic Lookup
                const price = PricingService.calculateMatrixPrice(matrix, width, projection);
                basePrice = price || 0;
            } else {
                // Fallback Static
                const zipData = data as any;
                const widths = zipData.widths_mm;
                const priceWidth = widths.find((w: number) => w >= width) || widths[widths.length - 1];
                const drops = zipData.drops_mm;
                const dropIndex = drops.findIndex((d: number) => d >= projection);
                const finalDropIndex = dropIndex !== -1 ? dropIndex : drops.length - 1;
                basePrice = zipData.prices[priceWidth.toString()]?.[finalDropIndex] || 0;
            }

            total += basePrice;
            items.push({
                name: `Senkrechtmarkise ZIP(${width}x${projection}mm)`,
                price: basePrice
            });

        } else {
            // Aufdach/Unterdach pricing logic
            const isTwoFields = width > data.limits.max_single_field_width_mm;

            // NOTE: My seed script currently only migrated ONE FIELD prices for awnings.
            // If isTwoFields is true, we unfortunately must rely on static data for now 
            // until I improve the seed/schema to differentiate 1-field vs 2-field tables.

            let basePrice = 0;

            if (!isTwoFields && matrix.length > 0) {
                // Dynamic from DB
                const price = PricingService.calculateMatrixPrice(matrix, width, projection);
                basePrice = price || 0;
            } else {
                // Static Fallback
                const pricingData = isTwoFields ? data.two_fields : data.one_field;
                const widths = Object.keys(pricingData.prices).map(Number).sort((a, b) => a - b);
                const priceWidth = widths.find(w => w >= width) || widths[widths.length - 1];
                const projections = pricingData.projection_mm;
                const projIndex = projections.findIndex((p: number) => p >= projection);
                const priceProjectionIndex = projIndex !== -1 ? projIndex : projections.length - 1;
                basePrice = pricingData.prices[priceWidth.toString()]?.[priceProjectionIndex] || 0;
            }

            total += basePrice;
            items.push({
                name: `${data.type === 'aufdachmarkise_zip' ? 'Markiza Dachowa' : 'Markiza Poddachowa'} (${width}x${projection}mm)${isTwoFields ? ' - 2 pola' : ''} `,
                price: basePrice
            });
        }

        // Apply Supplier Costs (Automatically adds to total and breakdown)
        if (supplierCosts.length > 0) {
            const costResult = PricingService.calculateTotalWithCosts(total, supplierCosts);

            // The service calculates total starting from base. We need diffs.
            // Actually, calculateTotalWithCosts takes a 'basePrice' and adds costs.
            // 'total' so far IS the base price for the costs calculation?
            // Usually additional costs are on top of Product Price.
            // Yes.

            const costsOnly = costResult.breakdown.filter(b => b.name !== 'Cena Bazowa');
            costsOnly.forEach(c => {
                items.push({ name: c.name, price: c.value });
            });
            total = costResult.total;
        }

        // Special Color
        if (data.colors && !data.colors.standard.includes(color)) {
            total += data.colors.special_color_surcharge_eur;
            items.push({ name: `Kolor niestandardowy: ${color} `, price: data.colors.special_color_surcharge_eur });
        }

        // Extras (only for Aufdach/Unterdach)
        if (!isZipScreen && data.extras) {
            if (extras.includes('wind_sensor')) {
                total += data.extras.wind_rain_sensor_eur;
                items.push({ name: 'Czujnik wiatru/deszczu', price: data.extras.wind_rain_sensor_eur });
            }
        }

        return { totalPrice: total, breakdown: items };
    }, [data, type, width, projection, color, extras, isZipScreen, matrix, supplierCosts]);

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
