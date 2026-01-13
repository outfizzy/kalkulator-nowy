import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
// formatCurrency removed

interface AddonEditorProps {
    tableId: string;
    tableName: string;
    onClose: () => void;
}

interface AddonEntry {
    id: string;
    addon_name: string;
    price_upe_net_eur: number;
    unit: string;
    image_url?: string;
    properties?: any;
    addon_group: string;
    _changed?: boolean;
}

export const AddonEditor: React.FC<AddonEditorProps> = ({ tableId, tableName, onClose }) => {
    const [entries, setEntries] = useState<AddonEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableId]);

    const loadEntries = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('pricing_addons')
            .select('*')
            .eq('price_table_id', tableId)
            .order('addon_name');

        if (error) {
            toast.error('Błąd pobierania elementów');
            console.error(error);
        } else {
            setEntries(data || []);
        }
        setLoading(false);
    };

    const handleFieldChange = (id: string, field: keyof AddonEntry, value: any) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value, _changed: true } : e));
    };

    const handleImageUpload = async (id: string, file: File) => {
        const toastId = toast.loading('Wysyłanie zdjęcia...');
        try {
            const ext = file.name.split('.').pop();
            const fileName = `addon_${id}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

            // Update in DB immediately
            const { error: dbError } = await supabase.from('pricing_addons').update({ image_url: publicUrl }).eq('id', id);
            if (dbError) throw dbError;

            // Update Local State
            setEntries(prev => prev.map(e => e.id === id ? { ...e, image_url: publicUrl } : e));

            toast.success('Zdjęcie dodane!', { id: toastId });
        } catch (e: any) {
            console.error(e);
            toast.error('Błąd wysyłania: ' + e.message, { id: toastId });
        }
    };

    const saveChanges = async () => {
        const changed = entries.filter(e => e._changed);
        if (changed.length === 0) return;

        setSaving(true);
        const updates = changed.map(e => ({
            id: e.id,
            addon_name: e.addon_name,
            price_upe_net_eur: e.price_upe_net_eur,
            unit: e.unit,
            properties: e.properties // Include properties in update
        }));

        const { error } = await supabase.from('pricing_addons').upsert(updates);

        if (error) {
            toast.error('Błąd zapisu');
            console.error(error);
        } else {
            toast.success('Zapisano zmiany');
            // Reset changed flags
            setEntries(prev => prev.map(e => ({ ...e, _changed: false })));
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg shrink-0">
                <div>
                    <h2 className="text-xl font-bold">🛠️ Edytor Dodatków: <span className="text-blue-400">{tableName}</span></h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded">Zamknij</button>
                    <button
                        onClick={saveChanges}
                        disabled={saving || entries.filter(e => e._changed).length === 0}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded disabled:opacity-50"
                    >
                        {saving ? 'Zapisuję...' : 'Zapisz Zmiany'}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto bg-slate-50 p-8">
                <div className="max-w-7xl mx-auto bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-16 text-center">Foto</th>
                                <th className="p-4">Nazwa Elementu</th>
                                <th className="p-4 w-32">Cena (Netto)</th>
                                <th className="p-4 w-24">Jedn.</th>
                                <th className="p-4 w-64">Atrybuty (Dla Kalkulatora)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-50 group">
                                    <td className="p-4 text-center">
                                        <div className="relative w-12 h-12 bg-slate-100 rounded border border-slate-200 mx-auto flex items-center justify-center overflow-hidden">
                                            {entry.image_url ? (
                                                <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-slate-300 text-xs">Brak</span>
                                            )}

                                            {/* Hover Upload Button */}
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                <span className="text-white text-[10px] font-bold">Zmień</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => e.target.files?.[0] && handleImageUpload(entry.id, e.target.files[0])}
                                                />
                                            </label>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            value={entry.addon_name}
                                            onChange={(e) => handleFieldChange(entry.id, 'addon_name', e.target.value)}
                                            className="w-full font-medium text-slate-700 bg-transparent border-none focus:ring-0 p-0"
                                        />
                                        <div className="text-xs text-slate-400 mt-1">{entry.addon_group}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="relative">
                                            <span className="absolute left-0 top-0 text-slate-400">€</span>
                                            <input
                                                type="number"
                                                value={entry.price_upe_net_eur}
                                                onChange={(e) => handleFieldChange(entry.id, 'price_upe_net_eur', parseFloat(e.target.value))}
                                                className="w-full pl-4 font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            value={entry.unit}
                                            onChange={(e) => handleFieldChange(entry.id, 'unit', e.target.value)}
                                            className="w-full text-sm text-slate-500 bg-transparent border-none focus:ring-0 p-0"
                                        />
                                    </td>
                                    <td className="p-4">
                                        {/* Attributes Editor */}
                                        <div className="space-y-2">
                                            {/* Awning Attributes */}
                                            {(entry.addon_group === 'awnings' || entry.addon_group === 'zip_screens') && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        value={entry.properties?.awning_type || ''}
                                                        onChange={(e) => handleFieldChange(entry.id, 'properties', { ...entry.properties, awning_type: e.target.value || undefined })}
                                                        className="text-xs p-1 border rounded bg-white"
                                                    >
                                                        <option value="">-- Typ --</option>
                                                        <option value="over_glass">Dachowa (Nad Szkłem)</option>
                                                        <option value="under_glass">Pod-Dachowa (Pod Szkłem)</option>
                                                        <option value="vertical">Pionowa (Side)</option>
                                                    </select>
                                                    <select
                                                        value={entry.properties?.motor_count || ''}
                                                        onChange={(e) => handleFieldChange(entry.id, 'properties', { ...entry.properties, motor_count: e.target.value ? parseInt(e.target.value) : undefined })}
                                                        className="text-xs p-1 border rounded bg-white"
                                                    >
                                                        <option value="">-- Silniki --</option>
                                                        <option value="1">1 Silnik</option>
                                                        <option value="2">2 Silniki</option>
                                                    </select>
                                                </div>
                                            )}
                                            {/* Search Keywords */}
                                            {/* Not implemented yet as simple tags are cleaner */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        Brak elementów w tym cenniku.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
