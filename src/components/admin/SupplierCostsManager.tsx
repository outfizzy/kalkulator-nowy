import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export const SupplierCostsManager = () => {
    const [costs, setCosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New Cost Form State
    const [newCost, setNewCost] = useState({
        provider: 'Aluxe',
        cost_name: '',
        cost_type: 'fixed',
        value: 0,
        currency: 'EUR'
    });

    const fetchCosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('supplier_costs')
            .select('*')
            .order('provider');

        if (error) {
            toast.error('Błąd pobierania kosztów');
        } else {
            setCosts(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCosts();
    }, []);

    const handleCreate = async () => {
        if (!newCost.cost_name || newCost.value <= 0) {
            toast.error('Wypełnij nazwę i wartość');
            return;
        }

        const { error } = await supabase.from('supplier_costs').insert({
            provider: newCost.provider,
            cost_name: newCost.cost_name,
            cost_type: newCost.cost_type,
            value: newCost.value,
            currency: newCost.currency,
            is_active: true
        });

        if (error) {
            toast.error('Błąd zapisu');
            console.error(error);
        } else {
            toast.success('Dodano koszt');
            setIsCreating(false);
            setNewCost({ provider: 'Aluxe', cost_name: '', cost_type: 'fixed', value: 0, currency: 'EUR' });
            fetchCosts();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Czy na pewno usunąć ten koszt?')) return;
        const { error } = await supabase.from('supplier_costs').delete().eq('id', id);
        if (error) toast.error('Błąd usuwania');
        else fetchCosts();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Koszty Dodatkowe i Narzuty</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                    + Dodaj Koszt
                </button>
            </div>

            {isCreating && (
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dostawca</label>
                        <select
                            value={newCost.provider}
                            onChange={(e) => setNewCost({ ...newCost, provider: e.target.value })}
                            className="w-full p-2 text-sm border rounded"
                        >
                            <option value="Aluxe">Aluxe</option>
                            <option value="Sattler">Sattler</option>
                            <option value="Inny">Inny</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nazwa Kosztu</label>
                        <input
                            type="text"
                            placeholder="np. Paleta / Pakowanie"
                            value={newCost.cost_name}
                            onChange={(e) => setNewCost({ ...newCost, cost_name: e.target.value })}
                            className="w-full p-2 text-sm border rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Typ</label>
                        <select
                            value={newCost.cost_type}
                            onChange={(e) => setNewCost({ ...newCost, cost_type: e.target.value })}
                            className="w-full p-2 text-sm border rounded"
                        >
                            <option value="fixed">Stała Kwota (EUR)</option>
                            <option value="percentage">Procent (%)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Wartość</label>
                        <input
                            type="number"
                            value={newCost.value}
                            onChange={(e) => setNewCost({ ...newCost, value: parseFloat(e.target.value) })}
                            className="w-full p-2 text-sm border rounded"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700 flex-1">Zapisz</button>
                        <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-white border text-slate-600 rounded text-sm hover:bg-slate-50">Anuluj</button>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 font-semibold text-slate-600">Dostawca</th>
                            <th className="p-3 font-semibold text-slate-600">Nazwa</th>
                            <th className="p-3 font-semibold text-slate-600">Rodzaj</th>
                            <th className="p-3 font-semibold text-slate-600">Wartość</th>
                            <th className="p-3 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-500">Ładowanie...</td></tr>
                        ) : costs.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-500">Brak zdefiniowanych kosztów dodatkowych.</td></tr>
                        ) : (
                            costs.map((cost) => (
                                <tr key={cost.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-900">{cost.provider}</td>
                                    <td className="p-3 text-slate-600">{cost.cost_name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${cost.cost_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {cost.cost_type === 'percentage' ? 'Narzut %' : 'Stała Opłata'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-slate-800">
                                        {cost.value} {cost.cost_type === 'percentage' ? '%' : cost.currency}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => handleDelete(cost.id)}
                                            className="text-red-500 hover:text-red-700 hover:underline"
                                        >
                                            Usuń
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
