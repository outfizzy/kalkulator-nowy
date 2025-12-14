import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface MatrixEditorProps {
    tableId: string;
    onClose: () => void;
    tableName: string;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({ tableId, onClose, tableName }) => {
    const [entries, setEntries] = useState<any[]>([]);
    const [widths, setWidths] = useState<number[]>([]);
    const [projections, setProjections] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadMatrix = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', tableId);

        if (error) {
            toast.error('Błąd pobierania danych');
            console.error(error);
        } else if (data) {
            setEntries(data);

            // Extract Headers
            const distinctWidths = [...new Set(data.map(e => e.width_mm))].sort((a, b) => a - b);
            const distinctProjections = [...new Set(data.map(e => e.projection_mm))].sort((a, b) => a - b);

            setWidths(distinctWidths);
            setProjections(distinctProjections);
        }
        setLoading(false);
    };

    // Initial Load
    useEffect(() => {
        loadMatrix();
    }, [tableId]);

    const handlePriceChange = (width: number, projection: number, newValue: string) => {
        const val = parseFloat(newValue);
        if (isNaN(val)) return;

        // Optimistic Update
        const updated = entries.map(e => {
            if (e.width_mm === width && e.projection_mm === projection) {
                return { ...e, price: val, _changed: true };
            }
            return e;
        });
        setEntries(updated);
    };

    const saveChanges = async () => {
        setSaving(true);
        const changed = entries.filter(e => e._changed);
        if (changed.length === 0) {
            setSaving(false);
            return;
        }

        // Batch update (Supabase doesn't support massive bulk update easily, so loop or upsert)
        // Upsert is safer
        const { error } = await supabase
            .from('price_matrix_entries')
            .upsert(changed.map(e => ({
                id: e.id,
                price_table_id: tableId,
                width_mm: e.width_mm,
                projection_mm: e.projection_mm,
                price: e.price
            })));

        if (error) {
            toast.error('Błąd zapisu');
            console.error(error);
        } else {
            toast.success('Zapisano zmiany');
            // Reset _changed flag
            setEntries(entries.map(e => ({ ...e, _changed: false })));
        }
        setSaving(false);
    };

    // Helper to get price
    const getPrice = (w: number, p: number) => {
        return entries.find(e => e.width_mm === w && e.projection_mm === p)?.price || 0;
    };

    // UI Helpers
    const isChanged = (w: number, p: number) => {
        return entries.find(e => e.width_mm === w && e.projection_mm === p)?._changed;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Edycja: {tableName}</h3>
                        <p className="text-sm text-slate-500">Kliknij na cenę aby edytować</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Anuluj</button>
                        <button
                            onClick={saveChanges}
                            disabled={saving}
                            className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50"
                        >
                            {saving ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-auto p-4 bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">Ładowanie...</div>
                    ) : (
                        <div className="inline-block min-w-full">
                            <div className="grid gap-px bg-slate-200 border border-slate-300 shadow-sm rounded-lg overflow-hidden"
                                style={{
                                    gridTemplateColumns: `100px repeat(${widths.length}, minmax(100px, 1fr))`
                                }}>

                                {/* Header Row */}
                                <div className="bg-slate-100 p-3 font-bold text-xs text-slate-500 sticky top-0 z-10 flex items-center justify-center">
                                    Wysięg \ Szer.
                                </div>
                                {widths.map(w => (
                                    <div key={w} className="bg-slate-100 p-3 font-bold text-xs text-slate-700 text-center sticky top-0 z-10">
                                        {w} mm
                                    </div>
                                ))}

                                {/* Rows */}
                                {projections.map(p => (
                                    <React.Fragment key={p}>
                                        {/* Row Header */}
                                        <div className="bg-slate-100 p-3 font-bold text-xs text-slate-700 flex items-center justify-center sticky left-0 z-10">
                                            {p} mm
                                        </div>
                                        {/* Cells */}
                                        {widths.map(w => {
                                            const price = getPrice(w, p);
                                            const changed = isChanged(w, p);
                                            return (
                                                <div key={`${w}-${p}`} className={`bg-white p-1 relative group ${changed ? 'bg-yellow-50' : ''}`}>
                                                    <input
                                                        type="number"
                                                        defaultValue={price}
                                                        onBlur={(e) => handlePriceChange(w, p, e.target.value)}
                                                        className={`w-full h-full text-center text-sm focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded ${changed ? 'font-bold text-amber-700' : 'text-slate-600'}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
