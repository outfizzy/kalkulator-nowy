import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

import { formatCurrency } from '../../utils/translations';

interface AdditionalCost {
    id: string;
    name: string;
    product_definition_id: string;
    cost_type: 'fixed' | 'per_m' | 'per_item' | 'percentage';
    value: number;
    attributes: Record<string, string>;
    is_active: boolean;
    product?: { name: string };
}

export const AdditionalCostsManager = () => {
    const [costs, setCosts] = useState<AdditionalCost[]>([]);
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<AdditionalCost>>({
        attributes: {}
    });
    const [attrKey, setAttrKey] = useState('');
    const [attrValue, setAttrValue] = useState('');

    useEffect(() => {
        fetchCosts();
        fetchProducts();
    }, []);

    const fetchCosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('additional_costs')
            .select('*, product:product_definitions(name)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast.error('Błąd pobierania dopłat');
        } else {
            setCosts(data || []);
        }
        setLoading(false);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from('product_definitions').select('id, name').order('name');
        setProducts(data || []);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.value || !formData.product_definition_id) {
            toast.error('Uzupełnij wymagane pola (Nazwa, Wartość, Produkt)');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                product_definition_id: formData.product_definition_id,
                cost_type: formData.cost_type || 'fixed',
                value: formData.value,
                attributes: formData.attributes || {},
                is_active: true
            };

            const { error } = await supabase
                .from('additional_costs')
                .insert(payload);

            if (error) throw error;

            toast.success('Dopłata dodana!');
            setIsEditing(false);
            setFormData({ attributes: {} });
            fetchCosts();
        } catch (e: any) {
            toast.error('Błąd zapisu: ' + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Czy na pewno usunąć tę dopłatę?')) return;
        await supabase.from('additional_costs').delete().eq('id', id);
        fetchCosts();
        toast.success('Usunięto');
    };

    const addAttribute = () => {
        if (!attrKey || !attrValue) return;
        setFormData(prev => ({
            ...prev,
            attributes: { ...prev.attributes, [attrKey]: attrValue }
        }));
        setAttrKey('');
        setAttrValue('');
    };

    const removeAttribute = (key: string) => {
        const newAttrs = { ...formData.attributes };
        delete newAttrs[key];
        setFormData(prev => ({ ...prev, attributes: newAttrs }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Cennik Dopłat (Exact Match)</h3>
                    <p className="text-sm text-slate-500">Dodaj pozycje z cennika (np. dopłata do koloru, słupa) dla konkretnych wariantów.</p>
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90"
                >
                    + Dodaj Dopłatę
                </button>
            </div>

            {isEditing && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <h4 className="font-bold mb-4 text-lg">Nowa Dopłata</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Produkt</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                value={formData.product_definition_id || ''}
                                onChange={e => setFormData({ ...formData, product_definition_id: e.target.value })}
                            >
                                <option value="">-- Wybierz --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nazwa (z cennika)</label>
                            <input
                                className="w-full p-2 border rounded-lg"
                                placeholder="np. Dopłata do szkła matowego"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Typ Kosztu</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                value={formData.cost_type || 'fixed'}
                                onChange={e => setFormData({ ...formData, cost_type: e.target.value as any })}
                            >
                                <option value="fixed">Stała kwota (Fixed)</option>
                                <option value="per_m">Za metr bieżący</option>
                                <option value="per_item">Za sztukę</option>
                                <option value="percentage">Procent od bazy (%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Wartość</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded-lg"
                                placeholder="0.00"
                                value={formData.value || ''}
                                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Attributes Edit */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <label className="block text-sm font-bold mb-2">Warunki (Kiedy ta dopłata obowiązuje?)</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                placeholder="Pole (np. post_height)"
                                className="flex-1 p-2 border rounded text-sm"
                                list="attr-keys"
                                value={attrKey}
                                onChange={e => setAttrKey(e.target.value)}
                            />
                            <input
                                placeholder="Wartość (np. 3000)"
                                className="flex-1 p-2 border rounded text-sm"
                                value={attrValue}
                                onChange={e => setAttrValue(e.target.value)}
                            />
                            <button onClick={addAttribute} className="px-3 bg-slate-200 rounded hover:bg-slate-300">+</button>
                        </div>
                        <datalist id="attr-keys">
                            <option value="snow_zone" />
                            <option value="roof_type" />
                            <option value="post_height" />
                            <option value="mounting" />
                        </datalist>

                        <div className="flex flex-wrap gap-2">
                            {formData.attributes && Object.entries(formData.attributes).map(([k, v]) => (
                                <span key={k} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-2">
                                    {k}: <b>{v as string}</b>
                                    <button onClick={() => removeAttribute(k)} className="text-red-500 hover:text-red-700">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600">Anuluj</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Zapisz</button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Nazwa</th>
                            <th className="p-4">Produkt</th>
                            <th className="p-4">Typ</th>
                            <th className="p-4">Wartość</th>
                            <th className="p-4">Warunki</th>
                            <th className="p-4 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Ładowanie...</td></tr>
                        ) : costs.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Brak zdefiniowanych dopłat.</td></tr>
                        ) : (
                            costs.map(cost => (
                                <tr key={cost.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium">{cost.name}</td>
                                    <td className="p-4 text-sm text-slate-600">{cost.product?.name}</td>
                                    <td className="p-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${cost.cost_type === 'percentage' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 border-slate-200'
                                            }`}>
                                            {cost.cost_type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">
                                        {cost.cost_type === 'percentage'
                                            ? `${cost.value}%`
                                            : formatCurrency(cost.value)
                                        }
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {cost.attributes && Object.entries(cost.attributes).map(([k, v]) => (
                                                <span key={k} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-[10px]">
                                                    {k}: {v as string}
                                                </span>
                                            ))}
                                            {(!cost.attributes || Object.keys(cost.attributes).length === 0) && (
                                                <span className="text-xs text-slate-400 italic">Globalna</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(cost.id)} className="text-red-500 hover:text-red-700 p-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
