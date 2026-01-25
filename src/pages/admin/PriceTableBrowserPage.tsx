import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

interface PriceTable {
    id: string;
    name: string;
    type: string;
    currency: string;
    is_active: boolean;
    attributes: Record<string, any>;
    entryCount?: number;
}

interface PriceEntry {
    id: string;
    width_mm: number;
    projection_mm: number;
    price: number;
}

type Category = 'roofs' | 'walls' | 'surcharges' | 'awnings' | 'wpc' | 'aluminum';

const CATEGORY_CONFIG: Record<Category, { label: string; icon: string; patterns: string[] }> = {
    roofs: {
        label: 'Dachy',
        icon: '🏠',
        patterns: ['Orangeline', 'Trendline', 'Topline', 'Designline', 'Ultraline', 'Skyline', 'Carport']
    },
    walls: {
        label: 'Ściany',
        icon: '🧱',
        patterns: ['Side Wall', 'Front Wall', 'Wedge', 'Sliding', 'Schiebetür', 'Panorama']
    },
    surcharges: {
        label: 'Dopłaty',
        icon: '📐',
        patterns: ['Surcharge', 'Matt', 'Stopsol', 'IR Gold', 'Freestanding Surcharge']
    },
    awnings: {
        label: 'Markizy',
        icon: '☀️',
        patterns: ['Awning', 'ZIP', 'Markis']
    },
    wpc: {
        label: 'Podłogi WPC',
        icon: '🪵',
        patterns: ['WPC']
    },
    aluminum: {
        label: 'Ściany Alu',
        icon: '🔲',
        patterns: ['Aluminum Wall']
    },
};

export function PriceTableBrowserPage() {
    const [tables, setTables] = useState<PriceTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<Category>('roofs');
    const [expandedModel, setExpandedModel] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<PriceTable | null>(null);
    const [entries, setEntries] = useState<PriceEntry[]>([]);
    const [editingEntries, setEditingEntries] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);

    // Discount State
    const [discounts, setDiscounts] = useState<Record<string, number>>({});
    const [loadingDiscounts, setLoadingDiscounts] = useState(true);

    // Fetch all price tables and discounts
    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // 1. Fetch Tables
            const { data: tablesData, error: tablesError } = await supabase
                .from('price_tables')
                .select('id, name, type, currency, is_active, attributes')
                .eq('is_active', true)
                .ilike('name', 'Aluxe V2 -%')
                .order('name');

            if (tablesError) {
                console.error('Error fetching tables:', tablesError);
                setLoading(false);
                return;
            }

            // Get entry counts (optimized for small dataset, OK for admin)
            const tablesWithCounts = await Promise.all(
                (tablesData || []).map(async (table) => {
                    const { count } = await supabase
                        .from('price_matrix_entries')
                        .select('*', { count: 'exact', head: true })
                        .eq('price_table_id', table.id);
                    return { ...table, entryCount: count || 0 };
                })
            );

            setTables(tablesWithCounts);

            // 2. Fetch Discounts
            const { data: discountData, error: discountError } = await supabase
                .from('pricing_discounts')
                .select('model_family, discount_percent');

            if (!discountError && discountData) {
                const discountMap: Record<string, number> = {};
                discountData.forEach(d => {
                    discountMap[d.model_family] = d.discount_percent;
                });
                setDiscounts(discountMap);
            }

            setLoading(false);
        }
        fetchData();
    }, []);

    // Filter tables by category
    const filteredTables = useMemo(() => {
        const patterns = CATEGORY_CONFIG[activeCategory].patterns;
        return tables.filter(t =>
            patterns.some(p => t.name.includes(p)) &&
            (activeCategory === 'surcharges' ? t.name.includes('Surcharge') : !t.name.includes('Surcharge'))
        );
    }, [tables, activeCategory]);

    // Group tables by model
    const groupedTables = useMemo(() => {
        const groups: Record<string, PriceTable[]> = {};
        filteredTables.forEach(table => {
            const match = table.name.match(/Aluxe V2 - ([A-Za-z+\s]+)/);
            const model = match ? match[1].split(' ')[0].trim() : 'Other';
            // Clean up model name for grouping
            const cleanModel = model.replace('Freestanding', '').trim();
            if (!groups[cleanModel]) groups[cleanModel] = [];
            groups[cleanModel].push(table);
        });
        return groups;
    }, [filteredTables]);

    // Fetch entries for selected table
    useEffect(() => {
        if (!selectedTable) return;
        async function fetchEntries() {
            const { data, error } = await supabase
                .from('price_matrix_entries')
                .select('id, width_mm, projection_mm, price')
                .eq('price_table_id', selectedTable.id)
                .order('width_mm')
                .order('projection_mm');
            if (error) console.error('Error fetching entries:', error);
            setEntries(data || []);
            setEditingEntries({});
        }
        fetchEntries();
    }, [selectedTable]);

    // Build matrix grid
    const matrixGrid = useMemo(() => {
        if (entries.length === 0) return { widths: [], projections: [], cells: {} };

        const widths = [...new Set(entries.map(e => e.width_mm))].sort((a, b) => a - b);
        const projections = [...new Set(entries.map(e => e.projection_mm))].sort((a, b) => a - b);
        const cells: Record<string, PriceEntry> = {};

        entries.forEach(e => {
            cells[`${e.width_mm}-${e.projection_mm}`] = e;
        });

        return { widths, projections, cells };
    }, [entries]);

    // Handle price edit
    const handlePriceChange = (entryId: string, newPrice: number) => {
        setEditingEntries(prev => ({ ...prev, [entryId]: newPrice }));
    };

    // Handle discount save
    const handleDiscountSave = async (model: string, percent: number) => {
        const { error } = await supabase
            .from('pricing_discounts')
            .upsert({ model_family: model, discount_percent: percent }, { onConflict: 'model_family' });

        if (!error) {
            setDiscounts(prev => ({ ...prev, [model]: percent }));
        }
    };

    // Save changes
    const handleSave = async () => {
        setSaving(true);
        const updates = Object.entries(editingEntries).map(([id, price]) => ({
            id,
            price
        }));

        for (const update of updates) {
            await supabase
                .from('price_matrix_entries')
                .update({ price: update.price })
                .eq('id', update.id);
        }

        const { data } = await supabase
            .from('price_matrix_entries')
            .select('id, width_mm, projection_mm, price')
            .eq('price_table_id', selectedTable?.id)
            .order('width_mm')
            .order('projection_mm');
        setEntries(data || []);
        setEditingEntries({});
        setSaving(false);
    };

    // Helper to get active discount for current table
    const getActiveDiscount = () => {
        if (!selectedTable) return 0;
        // Try to find model name in tables
        const match = selectedTable.name.match(/Aluxe V2 - ([A-Za-z0-9+]+)/);
        const model = match ? match[1] : '';
        // Look for best match in discounts
        // 1. Exact Name
        // 2. GLOBAL
        return discounts[model] ?? discounts['GLOBAL'] ?? 0;
    };

    const activeDiscount = getActiveDiscount();

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        📋 Cenniki i Rabaty Zakupowe
                    </h1>
                    <p className="text-gray-500 mt-1">Zarządzaj cennikami katalogowymi oraz Twoimi rabatami zakupowymi</p>
                </div>
                <div className="flex gap-4 items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="font-semibold text-blue-900">Globalny Rabat Zakupowy:</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="w-20 px-2 py-1 border rounded text-right font-medium"
                            value={discounts['GLOBAL'] || 0}
                            onChange={(e) => setDiscounts(prev => ({ ...prev, 'GLOBAL': parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-blue-900 font-bold">%</span>
                        <button
                            onClick={() => handleDiscountSave('GLOBAL', discounts['GLOBAL'] || 0)}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                            Zapisz
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-6 border-b pb-4">
                {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeCategory === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Ładowanie cenników...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Tables List (Left Sidebar) */}
                    <div className="col-span-12 lg:col-span-3 bg-white rounded-xl shadow-sm border h-[fit-content]">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-800">
                                {CATEGORY_CONFIG[activeCategory].icon} {CATEGORY_CONFIG[activeCategory].label}
                                <span className="ml-2 text-sm text-gray-500">
                                    ({filteredTables.length})
                                </span>
                            </h2>
                        </div>
                        <div className="divide-y max-h-[700px] overflow-y-auto">
                            {Object.entries(groupedTables).map(([model, modelTables]) => (
                                <div key={model} className="bg-white">
                                    <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b">
                                        <span className="font-semibold text-gray-800">{model}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 uppercase tracking-wide">Rabat:</span>
                                            <input
                                                type="number"
                                                className="w-14 text-right px-1 py-0.5 border rounded text-xs"
                                                placeholder={`${discounts['GLOBAL'] || 0}`}
                                                value={discounts[model] ?? ''}
                                                onChange={(e) => setDiscounts(prev => ({ ...prev, [model]: parseFloat(e.target.value) }))}
                                                onBlur={(e) => handleDiscountSave(model, parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-gray-600">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        {modelTables.map(table => (
                                            <button
                                                key={table.id}
                                                onClick={() => setSelectedTable(table)}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors border-l-4 ${selectedTable?.id === table.id
                                                    ? 'bg-blue-50 border-blue-600 text-blue-900'
                                                    : 'hover:bg-gray-50 border-transparent text-gray-600'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="truncate pr-2" title={table.name}>{table.name.replace(`Aluxe V2 - ${model}`, '').trim() || 'Base Price'}</span>
                                                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{table.entryCount}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Matrix Editor (Main Content) */}
                    <div className="col-span-12 lg:col-span-9 bg-white rounded-xl shadow-sm border min-h-[600px]">
                        {selectedTable ? (
                            <>
                                <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
                                    <div>
                                        <h2 className="font-bold text-lg text-gray-900">
                                            {selectedTable.name.replace('Aluxe V2 - ', '')}
                                        </h2>
                                        <div className="flex gap-4 text-sm mt-1">
                                            <span className="text-gray-500">Pozycji: <b>{entries.length}</b></span>
                                            <span className="text-blue-600 bg-blue-50 px-2 rounded">
                                                Aktywny Rabat: <b>{activeDiscount}%</b>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {Object.keys(editingEntries).length > 0 && (
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm font-medium"
                                            >
                                                {saving ? 'Zapisuję...' : `💾 Zapisz Zmiany (${Object.keys(editingEntries).length})`}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedTable(null)}
                                            className="px-3 py-2 text-gray-500 hover:text-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 overflow-auto max-h-[calc(100vh-300px)]">
                                    {matrixGrid.widths.length > 0 ? (
                                        <table className="w-full text-sm border-collapse relative">
                                            <thead>
                                                <tr>
                                                    <th className="border bg-gray-100 p-2 text-left sticky top-0 z-10 min-w-[100px]">
                                                        Width \ Proj
                                                    </th>
                                                    {matrixGrid.projections.map(p => (
                                                        <th key={p} className="border bg-gray-100 p-2 text-center sticky top-0 z-10 min-w-[120px]">
                                                            {p} mm
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {matrixGrid.widths.map(w => (
                                                    <tr key={w} className="hover:bg-gray-50">
                                                        <td className="border bg-gray-50 p-2 font-bold text-gray-700 sticky left-0">{w} mm</td>
                                                        {matrixGrid.projections.map(p => {
                                                            const cell = matrixGrid.cells[`${w}-${p}`];
                                                            if (!cell) {
                                                                return <td key={p} className="border p-1 bg-gray-50/50 text-center text-gray-300">-</td>;
                                                            }

                                                            const isEdited = editingEntries[cell.id] !== undefined;
                                                            const displayPrice = isEdited ? editingEntries[cell.id] : cell.price;
                                                            const purchasePrice = displayPrice * (1 - activeDiscount / 100);

                                                            return (
                                                                <td key={p} className={`border p-2 min-w-[120px] ${isEdited ? 'bg-yellow-50' : ''}`}>
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="relative">
                                                                            <span className="absolute left-2 top-1.5 text-xs text-gray-400">€</span>
                                                                            <input
                                                                                type="number"
                                                                                value={displayPrice}
                                                                                onChange={(e) => handlePriceChange(cell.id, parseFloat(e.target.value) || 0)}
                                                                                className={`w-full pl-6 pr-1 py-1 text-right font-medium border rounded transition-colors ${isEdited
                                                                                    ? 'border-yellow-400 bg-yellow-50 text-yellow-900'
                                                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                                                    }`}
                                                                                step="0.01"
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-between items-center px-1">
                                                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Netto</span>
                                                                            <span className="text-xs font-bold text-green-700">
                                                                                €{purchasePrice.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                            <div className="text-5xl mb-4">📭</div>
                                            <p>Brak przykładowych danych w tej tabeli.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                                <div className="text-6xl mb-6 opacity-20">👈</div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">Wybierz cennik z listy</h3>
                                <p>Kliknij w kategorię po lewej stronie aby edytować ceny i sprawdzać rabaty.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
