import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface DuplicateTableModalProps {
    tableId: string;
    sourceTableName: string;
    products: { id: string; name: string }[];
    onClose: () => void;
    onSuccess: () => void;
}

export const DuplicateTableModal: React.FC<DuplicateTableModalProps> = ({
    tableId,
    sourceTableName,
    products,
    onClose,
    onSuccess
}) => {
    const [newName, setNewName] = useState(`Kopia - ${sourceTableName}`);
    const [targetProductId, setTargetProductId] = useState('');
    const [saving, setSaving] = useState(false);

    const handleDuplicate = async () => {
        if (!targetProductId) {
            toast.error('Wybierz produkt docelowy');
            return;
        }
        if (!newName) {
            toast.error('Podaj nazwę nowego cennika');
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Kopiowanie cennika...');

        try {
            // 1. Fetch source table details to get attributes, type, etc.
            const { data: sourceTable, error: tableErr } = await supabase
                .from('price_tables')
                .select('*')
                .eq('id', tableId)
                .single();

            if (tableErr) throw tableErr;

            // 2. Create new table
            const { data: newTable, error: createErr } = await supabase
                .from('price_tables')
                .insert({
                    name: newName,
                    product_definition_id: targetProductId,
                    type: sourceTable.type,
                    attributes: sourceTable.attributes,
                    configuration: sourceTable.configuration,
                    is_active: false // Start as inactive
                })
                .select()
                .single();

            if (createErr) throw createErr;

            // 3. Fetch source entries
            const { data: entries, error: entriesErr } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', tableId);

            if (entriesErr) throw entriesErr;

            if (entries && entries.length > 0) {
                // 4. Prepare new entries
                const newEntries = entries.map(e => ({
                    price_table_id: newTable.id,
                    width_mm: e.width_mm,
                    projection_mm: e.projection_mm,
                    price: e.price,
                    structure_price: e.structure_price,
                    glass_price: e.glass_price,
                    properties: e.properties
                }));

                // 5. Bulk insert entries
                // Supabase might limits batch size, but usually handles reasonable amounts.
                const { error: insertErr } = await supabase
                    .from('price_matrix_entries')
                    .insert(newEntries);

                if (insertErr) throw insertErr;
            }

            toast.success('Pomyślnie skopiowano cennik!', { id: toastId });
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            toast.error('Błąd kopiowania: ' + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Duplikuj Cennik</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nowa nazwa
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Przypisz do produktu
                        </label>
                        <select
                            value={targetProductId}
                            onChange={(e) => setTargetProductId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                        >
                            <option value="">-- Wybierz produkt --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            Możesz przypisać kopię do innego produktu (np. przenieść cennik Oświetlenia do nowej kategorii).
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleDuplicate}
                        disabled={saving}
                        className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent/90 disabled:opacity-50"
                    >
                        {saving ? 'Kopiowanie...' : 'Duplikuj'}
                    </button>
                </div>
            </div>
        </div>
    );
};
