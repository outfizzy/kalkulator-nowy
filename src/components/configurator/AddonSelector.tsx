import React, { useMemo, useState } from 'react';
import type { SelectedAddon } from '../../types';
import catalogData from '../../data/catalog.json';
import { keilfensterData, priceKeilfenster } from '../../data/keilfenster';
import { aluminiumWallsData, priceAluSeitenwand, priceAluFrontwand, priceAluSchiebetuer, isAluWallCompatible } from '../../data/aluminium_walls';
import type { GlassVariant } from '../../data/aluminium_walls';

interface AddonSelectorProps {
    onUpdate: (addons: SelectedAddon[]) => void;
    currentAddons: SelectedAddon[];
    dimensions: { width: number; projection: number };
    modelId?: string;
}

const formatMoney = (value: number) => `${value.toFixed(2)} EUR`;

export const AddonSelector: React.FC<AddonSelectorProps> = ({ onUpdate, currentAddons, dimensions, modelId }) => {
    const [spotsQty, setSpotsQty] = useState<number>(6);
    const [stripLength, setStripLength] = useState<number>(3);
    const [zipWidth, setZipWidth] = useState<number>(dimensions.width);
    const [zipHeight, setZipHeight] = useState<number>(2500);
    const [keilWidth, setKeilWidth] = useState<number>(Math.min(4000, dimensions.width));
    const [keilGlass, setKeilGlass] = useState<'clear' | 'mat' | 'ig'>('clear');
    const [keilSpecialRal, setKeilSpecialRal] = useState<boolean>(false);
    const [keilLeftQty, setKeilLeftQty] = useState<number>(1);
    const [keilRightQty, setKeilRightQty] = useState<number>(1);
    const [aluWallGlass, setAluWallGlass] = useState<GlassVariant>('klar');
    const [aluWallFensterSprosse, setAluWallFensterSprosse] = useState<boolean>(false);
    const [aluWallWidth, setAluWallWidth] = useState<number>(Math.min(3000, dimensions.width));
    const [frontWallWidth, setFrontWallWidth] = useState<number>(Math.min(4000, dimensions.width));
    const [frontWallGlass, setFrontWallGlass] = useState<GlassVariant>('klar');
    const [frontWallFensterSprosse, setFrontWallFensterSprosse] = useState<boolean>(false);
    const [frontWallQty, setFrontWallQty] = useState<number>(1);
    const [sideWallLeftQty, setSideWallLeftQty] = useState<number>(0);
    const [sideWallRightQty, setSideWallRightQty] = useState<number>(0);
    const [schiebetuerWidth, setSchiebetuerWidth] = useState<number>(Math.min(3000, dimensions.width));
    const [schiebetuerGlass, setSchiebetuerGlass] = useState<GlassVariant>('klar');
    const [schiebetuerQty, setSchiebetuerQty] = useState<number>(0);

    const areaM2 = useMemo(() => (dimensions.width * dimensions.projection) / 1_000_000, [dimensions]);
    const aluCompatible = useMemo(() => isAluWallCompatible(modelId || ''), [modelId]);

    const upsertAddon = (id: string, addon?: SelectedAddon) => {
        if (!addon) {
            onUpdate(currentAddons.filter(a => a.id !== id));
            return;
        }
        onUpdate([
            ...currentAddons.filter(a => a.id !== id),
            { ...addon, id }
        ]);
    };

    const removeAddon = (id: string) => upsertAddon(id, undefined);

    const slidingPrice = (modelId: string, width: number, height: number) => {
        const model = catalogData.addons.slidingWalls.models.find(m => m.id === modelId);
        if (!model || !model.pricing || model.pricing.length === 0) return 0;
        const match = model.pricing.find(p => p.width >= width && p.height >= height) || model.pricing[model.pricing.length - 1];
        return match.price;
    };

    const renderSelectedList = () => (
        <div className="bg-slate-50 p-4 rounded-xl h-fit">
            <h4 className="font-bold text-slate-700 mb-4">Wybrane dodatki</h4>
            {currentAddons.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Brak wybranych dodatków</p>
            ) : (
                <ul className="space-y-3">
                    {currentAddons.map((addon) => (
                        <li key={addon.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                            <button
                                onClick={() => removeAddon(addon.id)}
                                className="absolute top-1 right-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                aria-label="Usuń dodatek"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <p className="font-medium text-sm">{addon.name}</p>
                            <p className="text-xs text-slate-500">
                                {addon.variant && <span className="mr-2">{addon.variant}</span>}
                                {addon.quantity !== undefined && <span>{addon.quantity} szt. </span>}
                                {addon.length && <span>{addon.length} mm </span>}
                                {addon.width && addon.height && <span>{addon.width}×{addon.height} mm </span>}
                                {addon.projection && <span>{addon.projection} mm proj. </span>}
                            </p>
                            <p className="text-xs font-bold text-accent mt-1">{formatMoney(addon.price)}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-800">Dodatki i zabudowy</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Oświetlenie / Komfort */}
                    <div className="space-y-4 border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">Oświetlenie / Komfort</h4>
                            <span className="text-xs text-slate-500">LED + Heizstrahler</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h5 className="font-semibold">LED Spots</h5>
                                        <p className="text-xs text-slate-500">Punktowe w krokwiach</p>
                                    </div>
                                    <span className="text-xs text-slate-500">{catalogData.addons.lighting.spots.price} EUR / szt.</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={0}
                                        value={spotsQty}
                                        onChange={(e) => setSpotsQty(Number(e.target.value))}
                                        className="w-20 text-center border rounded-lg p-2"
                                    />
                                    <button
                                        onClick={() => spotsQty > 0 ? upsertAddon('led-spots', {
                                            id: 'led-spots',
                                            type: 'lighting',
                                            name: 'LED Spots',
                                            quantity: spotsQty,
                                            price: spotsQty * catalogData.addons.lighting.spots.price
                                        }) : removeAddon('led-spots')}
                                        className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                                    >
                                        Zapisz
                                    </button>
                                </div>
                            </div>

                            <div className="border p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h5 className="font-semibold">LED Listwa</h5>
                                        <p className="text-xs text-slate-500">Taśma zintegrowana</p>
                                    </div>
                                    <span className="text-xs text-slate-500">{catalogData.addons.lighting.strip.price} EUR / mb</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={0}
                                        value={stripLength}
                                        onChange={(e) => setStripLength(Number(e.target.value))}
                                        className="w-20 text-center border rounded-lg p-2"
                                    />
                                    <button
                                        onClick={() => stripLength > 0 ? upsertAddon('led-strip', {
                                            id: 'led-strip',
                                            type: 'lighting',
                                            name: 'LED Listwa',
                                            length: stripLength * 1000,
                                            price: stripLength * catalogData.addons.lighting.strip.price
                                        }) : removeAddon('led-strip')}
                                        className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                                    >
                                        Zapisz
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <h5 className="font-semibold">Heizstrahler</h5>
                                <p className="text-xs text-slate-500">Promiennik ciepła</p>
                            </div>
                            <button
                                onClick={() => upsertAddon('heater', {
                                    id: 'heater',
                                    type: 'heater',
                                    name: catalogData.addons.heater.name,
                                    quantity: 1,
                                    price: catalogData.addons.heater.price
                                })}
                                className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                            >
                                Dodaj ({formatMoney(catalogData.addons.heater.price)})
                            </button>
                        </div>
                    </div>

                    {/* ZIP / Markizy */}
                    <div className="space-y-4 border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">ZIP Screen i Markizy</h4>
                            <span className="text-xs text-slate-500">Cena wg m² / powierzchni dachu</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-600">ZIP szerokość (mm)</label>
                                <input
                                    type="number"
                                    value={zipWidth}
                                    onChange={e => setZipWidth(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600">ZIP wysokość (mm)</label>
                                <input
                                    type="number"
                                    value={zipHeight}
                                    onChange={e => setZipHeight(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-700">Powierzchnia: {(zipWidth * zipHeight / 1_000_000).toFixed(2)} m²</span>
                            <button
                                onClick={() => {
                                    const area = zipWidth * zipHeight / 1_000_000;
                                    upsertAddon('zip-screen', {
                                        id: 'zip-screen',
                                        type: 'zipScreen',
                                        name: catalogData.addons.zipScreen.name,
                                        width: zipWidth,
                                        height: zipHeight,
                                        price: area * catalogData.addons.zipScreen.pricePerSqM
                                    });
                                }}
                                className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                            >
                                Zapisz ZIP
                            </button>
                        </div>

                        <div className="border p-3 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <h5 className="font-semibold">Markiza dachowa (Aufdach)</h5>
                                <button
                                    onClick={() => upsertAddon('awning-roof', {
                                        id: 'awning-roof',
                                        type: 'awning',
                                        name: catalogData.addons.awnings.roof.name,
                                        projection: dimensions.projection,
                                        width: dimensions.width,
                                        price: areaM2 * catalogData.addons.awnings.roof.pricePerSqM
                                    })}
                                    className="text-xs bg-accent text-white px-3 py-1 rounded"
                                >
                                    Dodaj ({formatMoney(areaM2 * catalogData.addons.awnings.roof.pricePerSqM)})
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <h5 className="font-semibold">Markiza poddachowa (Unterdach)</h5>
                                <button
                                    onClick={() => upsertAddon('awning-under', {
                                        id: 'awning-under',
                                        type: 'awning',
                                        name: catalogData.addons.awnings.under.name,
                                        projection: dimensions.projection,
                                        width: dimensions.width,
                                        price: areaM2 * catalogData.addons.awnings.under.pricePerSqM
                                    })}
                                    className="text-xs bg-accent text-white px-3 py-1 rounded"
                                >
                                    Dodaj ({formatMoney(areaM2 * catalogData.addons.awnings.under.pricePerSqM)})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Aluminiowe ściany / fronty / drzwi przesuwne w ramie */}
                    {aluCompatible && (
                        <div className="space-y-4 border rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800">Zabudowy aluminiowe (Seitenwand / Frontwand / Schiebetüren)</h4>
                                <span className="text-xs text-slate-500">Klar / Mat / IG + szpros</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {(['klar', 'matt', 'ig'] as GlassVariant[]).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setAluWallGlass(opt); setFrontWallGlass(opt); setSchiebetuerGlass(opt); }}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold border ${aluWallGlass === opt ? 'border-accent bg-white text-accent' : 'border-slate-300 text-slate-700 hover:border-accent/50'}`}
                                    >
                                        {opt === 'klar' ? 'Klar 44.2' : opt === 'matt' ? 'Mat 44.2' : 'Isolierglas'}
                                    </button>
                                ))}
                                <label className="text-xs text-slate-600 flex items-center gap-2 ml-2">
                                    <input type="checkbox" checked={aluWallFensterSprosse} onChange={e => { setAluWallFensterSprosse(e.target.checked); setFrontWallFensterSprosse(e.target.checked); }} />
                                    Fenstersprosse (szpros)
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border p-3 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-semibold">Seitenwand (lewa/prawa)</h5>
                                        <span className="text-xs text-slate-500">max szer. 5000</span>
                                    </div>
                                    <label className="text-xs text-slate-600">Szerokość (mm)</label>
                                    <input type="number" value={aluWallWidth} min={1000} max={5000} onChange={e => setAluWallWidth(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-600">Lewa qty</label>
                                            <input type="number" min={0} max={4} value={sideWallLeftQty} onChange={e => setSideWallLeftQty(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-600">Prawa qty</label>
                                            <input type="number" min={0} max={4} value={sideWallRightQty} onChange={e => setSideWallRightQty(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const unitPrice = priceAluSeitenwand(aluWallWidth, aluWallGlass, aluWallFensterSprosse);
                                            if (sideWallLeftQty > 0) {
                                                upsertAddon('alu-side-left', {
                                                    id: 'alu-side-left',
                                                    type: 'other',
                                                    name: 'Aluminium Seitenwand Lewa',
                                                    variant: aluWallGlass,
                                                    width: aluWallWidth,
                                                    quantity: sideWallLeftQty,
                                                    price: sideWallLeftQty * unitPrice
                                                });
                                            } else {
                                                removeAddon('alu-side-left');
                                            }
                                            if (sideWallRightQty > 0) {
                                                upsertAddon('alu-side-right', {
                                                    id: 'alu-side-right',
                                                    type: 'other',
                                                    name: 'Aluminium Seitenwand Prawa',
                                                    variant: aluWallGlass,
                                                    width: aluWallWidth,
                                                    quantity: sideWallRightQty,
                                                    price: sideWallRightQty * unitPrice
                                                });
                                            } else {
                                                removeAddon('alu-side-right');
                                            }
                                        }}
                                        className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                                    >
                                        Zapisz Seitenwand (od {formatMoney(priceAluSeitenwand(aluWallWidth, aluWallGlass, aluWallFensterSprosse))}/szt.)
                                    </button>
                                    <p className="text-[11px] text-slate-500">Opcje: {aluminiumWallsData.aluminium_seitenwand.options.optional.map(o => `${o.name} (${formatMoney(o.price_eur)})`).join(', ')}.</p>
                                </div>

                                <div className="border p-3 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-semibold">Frontwand</h5>
                                        <span className="text-xs text-slate-500">wys. 2200/2400</span>
                                    </div>
                                    <label className="text-xs text-slate-600">Szerokość (mm)</label>
                                    <input type="number" value={frontWallWidth} min={1000} max={7000} onChange={e => setFrontWallWidth(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                    <label className="text-xs text-slate-600">Ilość</label>
                                    <input type="number" min={0} max={2} value={frontWallQty} onChange={e => setFrontWallQty(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                    <button
                                        onClick={() => {
                                            const unitPrice = priceAluFrontwand(frontWallWidth, frontWallGlass, frontWallFensterSprosse);
                                            if (frontWallQty > 0) {
                                                upsertAddon('alu-front', {
                                                    id: 'alu-front',
                                                    type: 'other',
                                                    name: 'Aluminium Frontwand',
                                                    variant: frontWallGlass,
                                                    width: frontWallWidth,
                                                    quantity: frontWallQty,
                                                    price: frontWallQty * unitPrice
                                                });
                                            } else {
                                                removeAddon('alu-front');
                                            }
                                        }}
                                        className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                                    >
                                        Zapisz Frontwand (od {formatMoney(priceAluFrontwand(frontWallWidth, frontWallGlass, frontWallFensterSprosse))}/szt.)
                                    </button>
                                    <p className="text-[11px] text-slate-500">Opcje: {aluminiumWallsData.aluminium_frontwand.options.optional.map(o => `${o.name} (${formatMoney(o.price_eur)})`).join(', ')}.</p>
                                </div>
                            </div>

                            <div className="border p-3 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <h5 className="font-semibold">Szyby przesuwne w ramie (Alu Schiebetüren)</h5>
                                    <span className="text-xs text-slate-500">feld do 1500 mm</span>
                                </div>
                                <label className="text-xs text-slate-600">Szerokość (mm)</label>
                                <input type="number" value={schiebetuerWidth} min={2000} max={6000} onChange={e => setSchiebetuerWidth(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                <label className="text-xs text-slate-600">Ilość</label>
                                <input type="number" min={0} max={4} value={schiebetuerQty} onChange={e => setSchiebetuerQty(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                                <button
                                    onClick={() => {
                                        const { price, config } = priceAluSchiebetuer(schiebetuerWidth, schiebetuerGlass);
                                        if (schiebetuerQty > 0) {
                                            upsertAddon('alu-schiebetuer', {
                                                id: 'alu-schiebetuer',
                                                type: 'slidingWall',
                                                name: 'Szyba przesuwna w ramie',
                                                variant: `${schiebetuerGlass} (${config})`,
                                                width: schiebetuerWidth,
                                                quantity: schiebetuerQty,
                                                price: schiebetuerQty * price
                                            });
                                        } else {
                                            removeAddon('alu-schiebetuer');
                                        }
                                    }}
                                    className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                                >
                                    Zapisz Schiebetür (od {formatMoney(priceAluSchiebetuer(schiebetuerWidth, schiebetuerGlass).price)}/szt.)
                                </button>
                                <p className="text-[11px] text-slate-500">Konfiguracje: {aluminiumWallsData.aluminium_schiebetueren.products.map(p => `${p.width_mm}mm (${p.configuration})`).join(', ')}.</p>
                            </div>
                        </div>
                    )}

                    {/* Keilfenster */}
                    <div className="border p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold">Keilfenster (klinowe okno boczne)</h4>
                                <p className="text-xs text-slate-500">Orangestyle / Trendstyle / Topline / Designstyle</p>
                            </div>
                            <span className="text-xs text-slate-500">Tabele 44.2, dopłaty mat/IG</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-600">Szerokość otworu (mm)</label>
                                <input
                                    type="number"
                                    value={keilWidth}
                                    min={2000}
                                    max={5000}
                                    onChange={e => setKeilWidth(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">Dobieramy najbliższą większą wartość z tabeli (2000–5000).</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600">Kolor</label>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={keilSpecialRal}
                                            onChange={e => setKeilSpecialRal(e.target.checked)}
                                        />
                                        Sonder RAL (+{keilfensterData.colors.special_ral_surcharge_percent}%)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'clear', label: 'Klar 44.2' },
                                { id: 'mat', label: 'Mat 44.2 (+dopłata)' },
                                { id: 'ig', label: 'IG 33.1/10/33.1 (+dopłata)' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setKeilGlass(opt.id as 'clear' | 'mat' | 'ig')}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold border ${keilGlass === opt.id ? 'border-accent bg-white text-accent' : 'border-slate-300 text-slate-700 hover:border-accent/50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-600">Lewy (qty)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={4}
                                    value={keilLeftQty}
                                    onChange={e => setKeilLeftQty(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600">Prawy (qty)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={4}
                                    value={keilRightQty}
                                    onChange={e => setKeilRightQty(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (keilLeftQty > 0) {
                                        const price = priceKeilfenster(keilWidth, keilGlass, keilSpecialRal) * keilLeftQty;
                                        upsertAddon('keil-left', {
                                            id: 'keil-left',
                                            type: 'other',
                                            name: 'Keilfenster Lewy',
                                            variant: keilGlass,
                                            width: keilWidth,
                                            quantity: keilLeftQty,
                                            price
                                        });
                                    } else {
                                        removeAddon('keil-left');
                                    }
                                }}
                                className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                            >
                                Zapisz lewy ({formatMoney(priceKeilfenster(keilWidth, keilGlass, keilSpecialRal))}/szt.)
                            </button>
                            <button
                                onClick={() => {
                                    if (keilRightQty > 0) {
                                        const price = priceKeilfenster(keilWidth, keilGlass, keilSpecialRal) * keilRightQty;
                                        upsertAddon('keil-right', {
                                            id: 'keil-right',
                                            type: 'other',
                                            name: 'Keilfenster Prawy',
                                            variant: keilGlass,
                                            width: keilWidth,
                                            quantity: keilRightQty,
                                            price
                                        });
                                    } else {
                                        removeAddon('keil-right');
                                    }
                                }}
                                className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold"
                            >
                                Zapisz prawy ({formatMoney(priceKeilfenster(keilWidth, keilGlass, keilSpecialRal))}/szt.)
                            </button>
                        </div>

                        <div className="text-[11px] text-slate-500">
                            W zestawie: {keilfensterData.options.included.join(', ')}. Opcje dodatkowe (na zapytanie): {keilfensterData.options.optional.map(o => `${o.name} (${formatMoney(o.price_eur)})`).join(', ')}.
                        </div>
                    </div>

                    {/* Panoramiczne szyby przesuwne (bezramowe) */}
                    <div className="space-y-3 border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">Systemy szyb przesuwnych (Panoramaschiebewand)</h4>
                            <span className="text-xs text-slate-500">Ceny wg modelu</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {catalogData.addons.slidingWalls.models.map(model => {
                                const price = slidingPrice(model.id, dimensions.width, 2100);
                                return (
                                    <div key={model.id} className="border p-4 rounded-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-semibold">{model.name}</h5>
                                            <span className="text-xs text-slate-500">{price > 0 ? formatMoney(price) : 'na zapytanie'}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2">{model.description}</p>
                                        <button
                                            onClick={() => upsertAddon(`sliding-${model.id}`, {
                                                id: `sliding-${model.id}`,
                                                type: 'slidingWall',
                                                name: `Szyba przesuwna ${model.name}`,
                                                variant: model.id,
                                                width: model.pricing[0]?.width || dimensions.width,
                                                height: model.pricing[0]?.height || 2100,
                                                price: price || 0
                                            })}
                                            className="text-xs bg-accent text-white px-3 py-1 rounded"
                                        >
                                            Dodaj / aktualizuj
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {renderSelectedList()}
            </div>
        </div>
    );
};
