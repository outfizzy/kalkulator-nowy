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

type Category = 'roofs' | 'walls' | 'surcharges' | 'awnings';

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

    // Fetch all price tables
    useEffect(() => {
        async function fetchTables() {
            setLoading(true);
            const { data, error } = await supabase
                .from('price_tables')
                .select('id, name, type, currency, is_active, attributes')
                .eq('is_active', true)
                .ilike('name', 'Aluxe V2 -%')
                .order('name');

            if (error) {
                console.error('Error fetching tables:', error);
                setLoading(false);
                return;
            }

            // Get entry counts
            const tablesWithCounts = await Promise.all(
                (data || []).map(async (table) => {
                    const { count } = await supabase
                        .from('price_matrix_entries')
                        .select('*', { count: 'exact', head: true })
                        .eq('price_table_id', table.id);
                    return { ...table, entryCount: count || 0 };
                })
            );

            setTables(tablesWithCounts);
            setLoading(false);
        }
        fetchTables();
    }, []);

    // Filter tables by category
    const filteredTables = useMemo(() => {
        const patterns = CATEGORY_CONFIG[activeCategory].patterns;
        return tables.filter(t =>
            patterns.some(p => t.name.includes(p)) &&
            // Exclude surcharges from other categories unless we're in surcharges
            (activeCategory === 'surcharges' || !t.name.includes('Surcharge'))
        );
    }, [tables, activeCategory]);

    // Group tables by model
    const groupedTables = useMemo(() => {
        const groups: Record<string, PriceTable[]> = {};
        filteredTables.forEach(table => {
            // Extract model name from table name
            const match = table.name.match(/Aluxe V2 - ([A-Za-z+\s]+)/);
            const model = match ? match[1].split(' ')[0].trim() : 'Other';
            if (!groups[model]) groups[model] = [];
            groups[model].push(table);
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

    // Build matrix grid from entries
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

        // Refresh entries
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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    📋 Cenniki Aluxe
                </h1>
                <p className="text-gray-500 mt-1">Przeglądaj i edytuj tabele cenowe</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tables List */}
                    <div className="bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-800">
                                {CATEGORY_CONFIG[activeCategory].icon} {CATEGORY_CONFIG[activeCategory].label}
                                <span className="ml-2 text-sm text-gray-500">
                                    ({filteredTables.length} tabel)
                                </span>
                            </h2>
                        </div>
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {Object.entries(groupedTables).map(([model, modelTables]) => (
                                <div key={model}>
                                    <button
                                        onClick={() => setExpandedModel(expandedModel === model ? null : model)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="font-medium text-gray-800">
                                            {expandedModel === model ? '▼' : '▶'} {model}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {modelTables.length} {modelTables.length === 1 ? 'tabela' : 'tabel'}
                                        </span>
                                    </button>
                                    {expandedModel === model && (
                                        <div className="bg-gray-50 px-4 pb-3">
                                            {modelTables.map(table => (
                                                <button
                                                    key={table.id}
                                                    onClick={() => setSelectedTable(table)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${selectedTable?.id === table.id
                                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                            : 'hover:bg-white border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span>{table.name.replace('Aluxe V2 - ', '')}</span>
                                                        <span className="text-gray-400">{table.entryCount} poz.</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {Object.keys(groupedTables).length === 0 && (
                                <div className="p-8 text-center text-gray-400">
                                    Brak tabel w tej kategorii
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Matrix Editor */}
                    <div className="bg-white rounded-xl shadow-sm border">
                        {selectedTable ? (
                            <>
                                <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                                    <div>
                                        <h2 className="font-semibold text-gray-800">
                                            {selectedTable.name.replace('Aluxe V2 - ', '')}
                                        </h2>
                                        <p className="text-sm text-gray-500">{entries.length} pozycji cenowych</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {Object.keys(editingEntries).length > 0 && (
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {saving ? 'Zapisuję...' : `💾 Zapisz (${Object.keys(editingEntries).length})`}
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
                                <div className="p-4 overflow-auto max-h-[500px]">
                                    {matrixGrid.widths.length > 0 ? (
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="border bg-gray-100 p-2 text-left sticky top-0">
                                                        W \ P
                                                    </th>
                                                    {matrixGrid.projections.map(p => (
                                                        <th key={p} className="border bg-gray-100 p-2 text-center sticky top-0 min-w-[70px]">
                                                            {p}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {matrixGrid.widths.map(w => (
                                                    <tr key={w}>
                                                        <td className="border bg-gray-50 p-2 font-medium">{w}</td>
                                                        {matrixGrid.projections.map(p => {
                                                            const cell = matrixGrid.cells[`${w}-${p}`];
                                                            if (!cell) {
                                                                return <td key={p} className="border p-1 bg-gray-100">-</td>;
                                                            }
                                                            const isEdited = editingEntries[cell.id] !== undefined;
                                                            const displayPrice = isEdited ? editingEntries[cell.id] : cell.price;
                                                            return (
                                                                <td key={p} className={`border p-1 ${isEdited ? 'bg-yellow-50' : ''}`}>
                                                                    <input
                                                                        type="number"
                                                                        value={displayPrice}
                                                                        onChange={(e) => handlePriceChange(cell.id, parseFloat(e.target.value) || 0)}
                                                                        className={`w-full px-1 py-0.5 text-right text-sm border rounded ${isEdited ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                                                                            }`}
                                                                        step="0.01"
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center text-gray-400 py-8">
                                            Brak danych w tej tabeli
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-12 text-center text-gray-400">
                                <div className="text-4xl mb-4">📊</div>
                                <p>Wybierz tabelę z listy aby zobaczyć cennik</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
