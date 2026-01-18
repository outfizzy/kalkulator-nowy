
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/translations';
import { PricingService } from '../../services/pricing.service';

type ProductType = 'Roof' | 'Panorama' | 'Wall' | 'Awning' | 'Skyline' | 'Carport' | 'Fence' | 'Accessory';
type ModelFamily = 'Trendline' | 'Topline' | 'Topline XL' | 'Ultraline';
type CoverType = 'Poly' | 'Glass';
type PanoramaModel = '3-Tor' | '5-Tor';
type WallModel = 'Side Wall' | 'Front Wall' | 'Sliding Door' | 'Wedge';
type AwningModel = 'On-Roof Awning' | 'Under-Roof Awning' | 'ZIP Screen';
type ConstructionType = 'Attached' | 'Freestanding';
type FenceModel = 'Zonweringspaneel' | 'Fence Element (Aluminium)' | 'Fence Element (Door)';

export const ProductConfiguratorV2: React.FC = () => {
    // State
    const [productType, setProductType] = useState<ProductType>('Roof');

    // Roof State
    const [model, setModel] = useState<ModelFamily>('Trendline');
    const [cover, setCover] = useState<CoverType>('Poly');
    const [zone, setZone] = useState<number>(1);
    const [isFreestandingRoof, setIsFreestandingRoof] = useState(false);
    const [includeFoundation, setIncludeFoundation] = useState(false);

    // Panorama State
    const [panoramaModel, setPanoramaModel] = useState<PanoramaModel>('3-Tor');

    // Wall State
    const [wallModel, setWallModel] = useState<WallModel>('Side Wall');

    // Awning State
    const [awningModel, setAwningModel] = useState<AwningModel>('On-Roof Awning');

    // Construction Type (for Skyline & Carport)
    const [constructionType, setConstructionType] = useState<ConstructionType>('Attached');

    // Fence State
    const [fenceModel, setFenceModel] = useState<FenceModel>('Zonweringspaneel');

    // Accessory State
    const [accessories, setAccessories] = useState<{ id: string, name: string }[]>([]);
    const [selectedAccessory, setSelectedAccessory] = useState<string>('');

    // Common State
    const [width, setWidth] = useState(3000);
    const [projection, setProjection] = useState(2500);

    const [price, setPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    // Load Accessories on Mount
    useEffect(() => {
        const fetchAccessories = async () => {
            const { data } = await supabase
                .from('price_tables')
                .select('id, name')
                .eq('attributes->>type', 'accessory')
                .eq('is_active', true)
                .order('name');

            if (data && data.length > 0) {
                setAccessories(data);
                setSelectedAccessory(data[0].name);
            }
        };
        fetchAccessories();
    }, []);

    // Reset Freestanding state when model changes to unsupported type
    useEffect(() => {
        if (!['Trendline', 'Topline'].includes(model)) {
            setIsFreestandingRoof(false);
            setIncludeFoundation(false);
        }
    }, [model]);

    // Reset Foundation when Freestanding is unchecked
    useEffect(() => {
        if (!isFreestandingRoof) {
            setIncludeFoundation(false);
        }
    }, [isFreestandingRoof]);

    // Fetch Price Logic
    useEffect(() => {
        const fetchPrice = async () => {
            setLoading(true);
            setPrice(null);
            setDebugInfo('');

            // Helper to add price
            let totalPrice = 0;
            let log = '';

            try {
                // 1. Determine Main Table Name
                let tableName = '';
                let description = '';

                if (productType === 'Roof') {
                    tableName = `Aluxe V2 - ${model} ${cover} (Zone ${zone})`;
                    description = `${model} ${cover} Z${zone}`;
                } else if (productType === 'Panorama') {
                    tableName = `Aluxe V2 - Panorama (${panoramaModel})`;
                    description = `Panorama ${panoramaModel}`;
                } else if (productType === 'Wall') {
                    if (wallModel === 'Sliding Door') tableName = `Aluxe V2 - Sliding Door`;
                    else if (wallModel === 'Wedge') tableName = `Aluxe V2 - Wedge (Glass)`;
                    else tableName = `Aluxe V2 - ${wallModel} (Glass)`;
                    description = `${wallModel}`;
                } else if (productType === 'Awning') {
                    tableName = `Aluxe V2 - ${awningModel}`;
                    description = `${awningModel}`;
                } else if (productType === 'Skyline' || productType === 'Carport') {
                    const fsSuffix = constructionType === 'Freestanding' ? ' Freestanding' : '';
                    tableName = `Aluxe V2 - ${productType}${fsSuffix} (Zone ${zone})`;
                    description = `${productType} ${constructionType} Zone ${zone}`;
                } else if (productType === 'Fence') {
                    tableName = `Aluxe V2 - ${fenceModel}`;
                    description = `${fenceModel}`;
                } else if (productType === 'Accessory') {
                    tableName = selectedAccessory;
                    description = selectedAccessory;
                }

                log += `Fetching for: ${description}\nMain Table: "${tableName}"\n`;

                if (!tableName) {
                    setDebugInfo(log + '❌ No table name derived.\n');
                    setLoading(false);
                    return;
                }


                // 2. Fetch Base Price
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id, name, type')
                    .eq('name', tableName)
                    .limit(1);

                if (!tables || tables.length === 0) {
                    setDebugInfo(log + `❌ Table "${tableName}" not found.\n`);
                    setLoading(false);
                    return;
                }
                const table = tables[0];
                log += `✅ Found Table: ${table.name}\n`;

                let lookupWidth = width;
                let lookupProjection = projection;

                // Adjust Dimensions based on Type
                if (productType === 'Wall') {
                    if (wallModel === 'Side Wall' || wallModel === 'Wedge') lookupWidth = 0; // Use Projection (Depth)
                    else lookupProjection = 0; // Use Width
                } else if (productType === 'Fence') {
                    if (fenceModel === 'Zonweringspaneel') lookupWidth = 0; // Uses Projection (Height)
                    // Others use both W x P
                } else if (productType === 'Accessory') {
                    lookupWidth = 0;
                    lookupProjection = 0;
                }

                // If using Freestanding Surcharge (Roofs only), we must ensure we have a width to lookup
                // Standard roofs use Width x Projection. Surcharges use Width x 0.

                const basePrice = await PricingService.calculateMatrixPrice(table.id, lookupWidth, lookupProjection);

                if (basePrice !== null) {
                    totalPrice += basePrice;
                    log += `💰 Base Price: ${basePrice} EUR\n`;

                    // 3. Handle Addons (Roof Freestanding Surcharge)
                    if (productType === 'Roof' && isFreestandingRoof) {
                        log += `--- Addon: Freestanding Surcharge ---\n`;

                        // Select correct table based on Foundation option
                        // The 'Foundation' table contains the TOTAL surcharge price (Base + Foundation), so we use one or the other.
                        const surchargeTableName = includeFoundation
                            ? 'Aluxe V2 - Freestanding Surcharge (Foundation)'
                            : 'Aluxe V2 - Freestanding Surcharge';

                        const surchargeTable = await supabase.from('price_tables').select('id').eq('name', surchargeTableName).single();

                        if (surchargeTable.data) {
                            const surcharge = await PricingService.calculateMatrixPrice(surchargeTable.data.id, width, 0); // Projection 0 for simple types
                            if (surcharge) {
                                totalPrice += surcharge;
                                log += `➕ Surcharge (${includeFoundation ? 'adj. w/ Foundation' : 'Base'}): +${surcharge} EUR\n`;
                            } else log += `⚠️ Surcharge price not found for width ${width}\n`;
                        } else log += `❌ Surcharge table "${surchargeTableName}" not found\n`;
                    }

                    setPrice(totalPrice);
                } else {
                    log += `⚠️ No price found for dimensions ${lookupWidth}x${lookupProjection}\n`;
                    setPrice(null);
                }

            } catch (err: any) {
                log += `Error: ${err.message}\n`;
            } finally {
                setDebugInfo(log);
                setLoading(false);
            }
        };

        fetchPrice();
    }, [width, projection, productType, model, cover, zone, panoramaModel, wallModel, awningModel, constructionType, fenceModel, selectedAccessory, isFreestandingRoof, includeFoundation]);

    return (
        <div className="max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Aluxe Calculator V2</h1>
                    <p className="text-slate-500">Fresh implementation based on Aluxe Preisliste.xlsx</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">
                        Batch 1-5 Complete: All Products
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CONTROLS */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        ⚙️ Konfiguracja
                    </h2>

                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-1 rounded-lg flex flex-wrap gap-1">
                            {(['Roof', 'Skyline', 'Carport', 'Panorama', 'Wall', 'Awning', 'Fence', 'Accessory'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setProductType(type)}
                                    className={`flex-1 min-w-[30%] py-2 px-1 text-xs font-bold rounded-md transition-all whitespace-nowrap ${productType === type
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {type === 'Roof' ? 'Zadaszenie' :
                                        type === 'Skyline' ? 'Skyline' :
                                            type === 'Carport' ? 'Carport' :
                                                type === 'Panorama' ? 'Panorama' :
                                                    type === 'Wall' ? 'Ściany' :
                                                        type === 'Awning' ? 'Markizy' :
                                                            type === 'Fence' ? 'Ogrodzenia' : 'Akcesoria'}
                                </button>
                            ))}
                        </div>

                        {productType === 'Roof' && (
                            <>
                                {/* Model Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Model Rodziny</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Trendline', 'Topline', 'Topline XL', 'Ultraline'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setModel(m)}
                                                className={`p-2 text-sm rounded-lg border transition-all ${model === m
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cover Type */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Pokrycie Dachu</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setCover('Poly')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${cover === 'Poly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Polycarbonat
                                        </button>
                                        <button
                                            onClick={() => setCover('Glass')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${cover === 'Glass' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Szkło (Glass)
                                        </button>
                                    </div>
                                </div>

                                {/* Zone */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Strefa Śniegowa (Zone)</label>
                                    <select
                                        value={zone}
                                        onChange={e => setZone(Number(e.target.value))}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                    >
                                        <option value={1}>Strefa 1 (75kg/m² or Zone 1)</option>
                                        <option value={2}>Strefa 2 (Zone 1a & 2)</option>
                                        <option value={3}>Strefa 3 (Zone 2a & 3)</option>
                                    </select>
                                </div>

                                {/* Freestanding Options */}
                                {/* Only for Trendline & Topline (as per price list header "für Orangeline, Trendline, Topline und Designline") */}
                                {['Trendline', 'Topline'].includes(model) && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isFreestandingRoof}
                                                onChange={e => setIsFreestandingRoof(e.target.checked)}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="font-bold text-sm text-slate-700">Konstrukcja Wolnostojąca</span>
                                        </label>

                                        {isFreestandingRoof && (
                                            <div className="mt-2 ml-8">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={includeFoundation}
                                                        onChange={e => setIncludeFoundation(e.target.checked)}
                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm text-slate-600">Dodaj Fundament (Foundation)</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {(productType === 'Skyline' || productType === 'Carport') && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Typ Konstrukcji</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        {(['Attached', 'Freestanding'] as const).map(ct => (
                                            <button
                                                key={ct}
                                                onClick={() => setConstructionType(ct)}
                                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${constructionType === ct ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {ct === 'Attached' ? 'Przyścienne' : 'Wolnostojące'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Strefa Śniegowa</label>
                                    <select
                                        value={zone}
                                        onChange={e => setZone(Number(e.target.value))}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                    >
                                        <option value={1}>Strefa 1 (Zone 1)</option>
                                        <option value={2}>Strefa 2 (Zone 2)</option>
                                        <option value={3}>Strefa 3 (Zone 3)</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {productType === 'Panorama' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Model Panoramy</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPanoramaModel('3-Tor')}
                                        className={`flex-1 p-3 rounded-lg border font-bold transition-all ${panoramaModel === '3-Tor' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:border-indigo-300 text-slate-600'}`}
                                    >
                                        3-Tor
                                    </button>
                                    <button
                                        onClick={() => setPanoramaModel('5-Tor')}
                                        className={`flex-1 p-3 rounded-lg border font-bold transition-all ${panoramaModel === '5-Tor' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:border-indigo-300 text-slate-600'}`}
                                    >
                                        5-Tor
                                    </button>
                                </div>
                            </div>
                        )}

                        {productType === 'Wall' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Typ Ściany / Elementu</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['Side Wall', 'Front Wall', 'Sliding Door', 'Wedge'] as const).map(wm => (
                                        <button
                                            key={wm}
                                            onClick={() => setWallModel(wm)}
                                            className={`p-2 text-sm rounded-lg border transition-all ${wallModel === wm
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            {wm}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {productType === 'Fence' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Typ Ogrodzenia</label>
                                <div className="flex flex-col gap-2">
                                    {(['Zonweringspaneel', 'Fence Element (Aluminium)', 'Fence Element (Door)'] as const).map(fm => (
                                        <button
                                            key={fm}
                                            onClick={() => setFenceModel(fm)}
                                            className={`p-3 text-sm rounded-lg border transition-all text-left font-medium ${fenceModel === fm
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            {fm === 'Zonweringspaneel' ? 'Panel Przeciwsłoneczny (Zonweringspaneel)' :
                                                fm === 'Fence Element (Aluminium)' ? 'Element Ogrodzenia (Alu)' :
                                                    'Drzwi Ogrodzeniowe (Door)'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {productType === 'Accessory' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Wybierz Akcesorium</label>
                                <select
                                    value={selectedAccessory}
                                    onChange={e => setSelectedAccessory(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-sm"
                                >
                                    {accessories.map(acc => (
                                        <option key={acc.id} value={acc.name}>
                                            {acc.name.replace('Aluxe V2 - ', '')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <hr className="border-slate-100" />

                        {/* Dimensions */}
                        {productType !== 'Accessory' && (
                            <div className="grid grid-cols-2 gap-4">
                                {/* WIDTH INPUT */}
                                {(!['Wall', 'Fence'].includes(productType) ||
                                    (productType === 'Wall' && !['Side Wall', 'Wedge'].includes(wallModel)) ||
                                    (productType === 'Fence' && fenceModel !== 'Zonweringspaneel')
                                ) && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Szerokość (mm)</label>
                                            <input
                                                type="number"
                                                value={width}
                                                onChange={e => setWidth(Number(e.target.value))}
                                                className="w-full p-2 border border-slate-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                step={100}
                                            />
                                        </div>
                                    )}

                                {/* PROJECTION / HEIGHT INPUT */}
                                {(!['Wall'].includes(productType) ||
                                    (productType === 'Wall' && ['Side Wall', 'Wedge'].includes(wallModel))
                                ) && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                {['Roof'].includes(productType) ? 'Wysięg (mm)' :
                                                    ['Panorama'].includes(productType) ? 'Wysokość (mm)' :
                                                        ['Fence'].includes(productType) ? 'Wysokość (mm)' :
                                                            productType === 'Awning' && awningModel === 'ZIP Screen' ? 'Wysokość (mm)' :
                                                                ['Skyline', 'Carport'].includes(productType) ? 'Wysięg (Długość)' :
                                                                    'Długość / Głębokość (mm)'}
                                            </label>
                                            <input
                                                type="number"
                                                value={projection}
                                                onChange={e => setProjection(Number(e.target.value))}
                                                className="w-full p-2 border border-slate-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                step={100}
                                            />
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RESULTS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-100 flex flex-col justify-center items-center text-center min-h-[300px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/0 pointer-events-none" />

                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <span className="text-slate-400 font-medium">Przeliczanie...</span>
                            </div>
                        ) : price !== null ? (
                            <div className="relative z-10 transition-all duration-300 transform scale-100">
                                <div className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-2">Cena Katalogowa Netto</div>
                                <div className="text-6xl font-black text-slate-900 tracking-tight mb-4">
                                    {formatCurrency(price)}
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-medium text-sm">
                                    <span>Model:</span>
                                    <strong>
                                        {productType === 'Roof'
                                            ? `${model} ${cover} (Zone ${zone})${isFreestandingRoof ? ' + Freestanding' : ''}`
                                            : productType === 'Panorama'
                                                ? `Panorama ${panoramaModel}`
                                                : productType === 'Wall'
                                                    ? `${wallModel}`
                                                    : productType === 'Awning'
                                                        ? `${awningModel}`
                                                        : productType === 'Fence'
                                                            ? `${fenceModel}`
                                                            : productType === 'Accessory'
                                                                ? selectedAccessory.replace('Aluxe V2 - ', '')
                                                                : `${productType} ${constructionType} (Zone ${zone})`}
                                    </strong>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 text-center">
                                <div className="text-4xl mb-4">⚠️</div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Brak Ceny</h3>
                                <p className="text-slate-500">
                                    {productType === 'Accessory' ? 'Produkt niedostępny.' : `Kombinacja ${width}x${projection} nie występuje w cenniku.`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* DEBUG PANEL */}
                    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                        <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-slate-300 font-mono text-xs font-bold uppercase">System Logs</h3>
                            <button
                                onClick={() => setDebugInfo('')}
                                className="text-[10px] text-slate-500 hover:text-white uppercase transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                        <pre className="p-4 text-green-400 font-mono text-xs overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                            {debugInfo || '// Ready...'}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};
