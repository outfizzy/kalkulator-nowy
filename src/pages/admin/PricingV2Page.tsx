import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/translations';

interface PriceTable {
    id: string;
    name: string;
    type: string;
    pricing_base: string;
    is_active: boolean;
    attributes: Record<string, any>;
    discount_percent: number;
    created_at: string;
}

interface MatrixEntry {
    id: string;
    width_mm: number;
    projection_mm: number;
    price: number;
}

type CategoryKey = 'roofs' | 'walls' | 'panorama' | 'awnings' | 'surcharges' | 'other';

const CATEGORIES: Record<CategoryKey, { label: string; icon: string; filter: (name: string) => boolean }> = {
    roofs: {
        label: 'Zadaszenia',
        icon: '🏠',
        filter: (name) => /^Aluxe V2 - (Orangeline|Trendline|Topline|Designline|Ultraline|Skyline|Carport)/i.test(name) && !name.includes('Surcharge')
    },
    walls: {
        label: 'Ściany & Schiebetür',
        icon: '🚪',
        filter: (name) => name.includes('Side Wall') || name.includes('Front Wall') || name.includes('Wedge') || name.includes('Schiebetür') || name.includes('Keilfenster')
    },
    panorama: {
        label: 'Panorama',
        icon: '🪟',
        filter: (name) => name.includes('Panorama AL')
    },
    awnings: {
        label: 'Markizy & ZIP',
        icon: '☀️',
        filter: (name) => name.includes('Aufdach') || name.includes('Unterdach') || name.includes('ZIP Screen')
    },
    surcharges: {
        label: 'Dopłaty',
        icon: '💰',
        filter: (name) => name.includes('Surcharge') || name.includes('Freestanding')
    },
    other: {
        label: 'Inne',
        icon: '📦',
        filter: () => true // Catch-all
    }
};

export function PricingV2Page() {
    const [tables, setTables] = useState<PriceTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>('roofs');
    const [selectedTable, setSelectedTable] = useState<PriceTable | null>(null);
    const [matrixEntries, setMatrixEntries] = useState<MatrixEntry[]>([]);
    const [loadingMatrix, setLoadingMatrix] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
    const [tempDiscount, setTempDiscount] = useState<number>(0);

    // Load V2 tables
    useEffect(() => {
        const loadTables = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('price_tables')
                    .select('*')
                    .ilike('name', 'Aluxe V2 -%')
                    .order('name');

                if (error) throw error;
                setTables(data || []);
            } catch (e: any) {
                toast.error('Błąd ładowania cenników: ' + e.message);
            } finally {
                setLoading(false);
            }
        };
        loadTables();
    }, []);

    // Group tables by category
    const groupedTables = useMemo(() => {
        const filtered = tables.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const groups: Record<CategoryKey, PriceTable[]> = {
            roofs: [],
            walls: [],
            panorama: [],
            awnings: [],
            surcharges: [],
            other: []
        };

        filtered.forEach(table => {
            let assigned = false;
            for (const [key, config] of Object.entries(CATEGORIES)) {
                if (key !== 'other' && config.filter(table.name)) {
                    groups[key as CategoryKey].push(table);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) groups.other.push(table);
        });

        return groups;
    }, [tables, searchTerm]);

    // Load matrix entries for selected table
    const loadMatrixEntries = async (tableId: string) => {
        setLoadingMatrix(true);
        try {
            const { data, error } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', tableId)
                .order('width_mm')
                .order('projection_mm');

            if (error) throw error;
            setMatrixEntries(data || []);
        } catch (e: any) {
            toast.error('Błąd ładowania matrycy: ' + e.message);
        } finally {
            setLoadingMatrix(false);
        }
    };

    // Save discount
    const saveDiscount = async (tableId: string, discount: number) => {
        try {
            const { error } = await supabase
                .from('price_tables')
                .update({ discount_percent: discount })
                .eq('id', tableId);

            if (error) throw error;

            setTables(prev => prev.map(t =>
                t.id === tableId ? { ...t, discount_percent: discount } : t
            ));
            toast.success('Rabat zapisany');
        } catch (e: any) {
            toast.error('Błąd zapisywania rabatu: ' + e.message);
        }
        setEditingDiscount(null);
    };

    // Render category section
    const renderCategory = (key: CategoryKey) => {
        const config = CATEGORIES[key];
        const categoryTables = groupedTables[key];
        const isExpanded = expandedCategory === key;

        if (categoryTables.length === 0) return null;

        return (
            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                <button
                    onClick={() => setExpandedCategory(isExpanded ? null : key)}
                    className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <span className="font-bold text-slate-800">{config.label}</span>
                        <span className="px-2 py-0.5 bg-slate-200 rounded-full text-sm text-slate-600">
                            {categoryTables.length}
                        </span>
                    </div>
                    <svg className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isExpanded && (
                    <div className="divide-y divide-slate-100">
                        {categoryTables.map(table => (
                            <div
                                key={table.id}
                                className={`p-4 hover:bg-blue-50 transition-colors cursor-pointer ${selectedTable?.id === table.id ? 'bg-blue-100' : ''
                                    }`}
                                onClick={() => {
                                    setSelectedTable(table);
                                    loadMatrixEntries(table.id);
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800">
                                            {table.name.replace('Aluxe V2 - ', '')}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded ${table.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {table.is_active ? 'Aktywny' : 'Nieaktywny'}
                                            </span>
                                            <span>{table.pricing_base}</span>
                                        </div>
                                    </div>

                                    {/* Discount Editor */}
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        {editingDiscount === table.id ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={tempDiscount}
                                                    onChange={e => setTempDiscount(Number(e.target.value))}
                                                    className="w-16 p-1 text-sm border rounded text-center"
                                                    min={-100}
                                                    max={100}
                                                />
                                                <span className="text-sm">%</span>
                                                <button
                                                    onClick={() => saveDiscount(table.id, tempDiscount)}
                                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => setEditingDiscount(null)}
                                                    className="px-2 py-1 bg-slate-300 text-slate-700 text-xs rounded"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditingDiscount(table.id);
                                                    setTempDiscount(table.discount_percent || 0);
                                                }}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${(table.discount_percent || 0) !== 0
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {(table.discount_percent || 0) !== 0
                                                    ? `${table.discount_percent > 0 ? '+' : ''}${table.discount_percent}%`
                                                    : '0%'}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedTable(table);
                                                loadMatrixEntries(table.id);
                                            }}
                                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
                                        >
                                            Podgląd
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Render matrix view
    const renderMatrixView = () => {
        if (!selectedTable) return null;

        // Group by width for 2D display
        const widths = [...new Set(matrixEntries.map(e => e.width_mm))].sort((a, b) => a - b);
        const projections = [...new Set(matrixEntries.map(e => e.projection_mm))].sort((a, b) => a - b);

        const getPriceCell = (w: number, p: number) => {
            const entry = matrixEntries.find(e => e.width_mm === w && e.projection_mm === p);
            return entry ? entry.price : null;
        };

        const discount = selectedTable.discount_percent || 0;

        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800">
                            {selectedTable.name.replace('Aluxe V2 - ', '')}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {matrixEntries.length} wpisów | Rabat: {discount}%
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedTable(null)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {loadingMatrix ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : projections.length > 0 && widths.length > 0 ? (
                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr>
                                    <th className="p-2 border text-left bg-slate-200 sticky left-0 z-10">
                                        Szer \ Wys
                                    </th>
                                    {projections.map(p => (
                                        <th key={p} className="p-2 border text-center whitespace-nowrap bg-slate-100">
                                            {p} mm
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {widths.map(w => (
                                    <tr key={w} className="hover:bg-slate-50">
                                        <td className="p-2 border font-medium bg-slate-50 sticky left-0">
                                            {w} mm
                                        </td>
                                        {projections.map(p => {
                                            const price = getPriceCell(w, p);
                                            const discountedPrice = price !== null && discount !== 0
                                                ? price * (1 - discount / 100)
                                                : price;
                                            return (
                                                <td key={p} className="p-2 border text-center">
                                                    {price !== null ? (
                                                        <div>
                                                            <div className={discount !== 0 ? 'text-xs line-through text-slate-400' : 'font-medium'}>
                                                                {formatCurrency(price)}
                                                            </div>
                                                            {discount !== 0 && discountedPrice !== null && (
                                                                <div className="font-medium text-green-600">
                                                                    {formatCurrency(discountedPrice)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // Linearized list for single-dimension tables
                    <div className="space-y-2 max-h-[60vh] overflow-auto">
                        {matrixEntries.map(entry => {
                            const dimension = entry.width_mm || entry.projection_mm;
                            const discountedPrice = discount !== 0
                                ? entry.price * (1 - discount / 100)
                                : entry.price;
                            return (
                                <div key={entry.id} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="font-medium">{dimension} mm</span>
                                    <div className="text-right">
                                        {discount !== 0 ? (
                                            <>
                                                <span className="text-sm line-through text-slate-400 mr-2">
                                                    {formatCurrency(entry.price)}
                                                </span>
                                                <span className="font-bold text-green-600">
                                                    {formatCurrency(discountedPrice)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="font-bold">{formatCurrency(entry.price)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-2xl font-bold mb-2">📊 Cenniki Aluxe V2</h1>
                    <p className="text-indigo-200">
                        Zarządzaj cennikami kalkulatora V2 w jednym miejscu
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 -mt-4">
                {/* Search */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Szukaj cennika..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                        Znaleziono {tables.length} cenników V2
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left: Category List */}
                    <div>
                        {loading ? (
                            <div className="bg-white rounded-xl p-8 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <>
                                {Object.keys(CATEGORIES).map(key => renderCategory(key as CategoryKey))}
                            </>
                        )}
                    </div>

                    {/* Right: Matrix View */}
                    <div className="lg:sticky lg:top-4 self-start">
                        {selectedTable ? (
                            renderMatrixView()
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                                <div className="text-4xl mb-4">📋</div>
                                <p>Wybierz cennik z listy, aby zobaczyć szczegóły</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
