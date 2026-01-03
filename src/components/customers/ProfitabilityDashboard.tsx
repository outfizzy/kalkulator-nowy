import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { CustomerCost, Customer } from '../../types';

interface ProfitabilityDashboardProps {
    customer: Customer & { id: string };
}

export const ProfitabilityDashboard: React.FC<ProfitabilityDashboardProps> = ({ customer }) => {
    const [costs, setCosts] = useState<CustomerCost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCost, setNewCost] = useState<Partial<CustomerCost>>({
        type: 'material',
        currency: 'PLN',
        date: new Date().toISOString().split('T')[0]
    });

    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalCosts: 0,
        profit: 0,
        margin: 0
    });

    useEffect(() => {
        loadData();
    }, [customer.id]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [costsData, offersData] = await Promise.all([
                DatabaseService.getCustomerCosts(customer.id),
                DatabaseService.getCustomerOffers(customer.id)
            ]);

            setCosts(costsData);

            // Calculate Revenue (Sold offers/contracts)
            // Ideally we check contracts, but let's assume sold offers for now or implementation plan says "Revenue vs Costs"
            // Let's grab sold offers value
            const soldOffers = offersData.filter(o => o.status === 'sold');
            const revenue = soldOffers.reduce((sum: number, o: any) => sum + (o.pricing.sellingPriceNet || 0), 0);

            const totalCosts = costsData.reduce((sum: number, c: CustomerCost) => sum + c.amount, 0); // simplifying currency for now (assuming all PLN or normalized)

            const profit = revenue - totalCosts;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            setStats({
                totalRevenue: revenue,
                totalCosts,
                profit,
                margin
            });

        } catch (error) {
            console.error('Error loading profitability:', error);
            toast.error('Błąd ładowania danych finansowych');
        } finally {
            setLoading(false);
        }
    }, [customer.id]);

    const handleAddCost = async () => {
        if (!newCost.amount || !newCost.type) return;

        try {
            await DatabaseService.addCustomerCost({
                ...newCost as Omit<CustomerCost, 'id' | 'created_at'>,
                customer_id: customer.id,
                amount: parseFloat(newCost.amount.toString()) // ensure number
            });
            toast.success('Dodano koszt');
            setShowAddModal(false);
            setNewCost({ type: 'material', currency: 'PLN', date: new Date().toISOString().split('T')[0] });
            loadData();
        } catch (error) {
            console.error('Error adding cost:', error);
            toast.error('Błąd dodawania kosztu');
        }
    };

    const handleDeleteCost = async (id: string) => {
        if (!confirm('Czy na pewno chcesz usunąć ten koszt?')) return;
        try {
            await DatabaseService.deleteCustomerCost(id);
            toast.success('Usunięto koszt');
            loadData();
        } catch (error) {
            console.error('Error deleting cost:', error);
            toast.error('Błąd usuwania kosztu');
        }
    };

    const formatMoney = (amount: number, currency: string = 'PLN') =>
        amount.toLocaleString('pl-PL', { style: 'currency', currency });

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie finansów...</div>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Przychód (Sprzedaż)</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{formatMoney(stats.totalRevenue)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Koszty Całkowite</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{formatMoney(stats.totalCosts)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Zysk</div>
                    <div className={`text-2xl font-bold mt-1 ${stats.profit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                        {formatMoney(stats.profit)}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Marża Rzeczywista</div>
                    <div className={`text-2xl font-bold mt-1 ${stats.margin >= 25 ? 'text-green-600' : stats.margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {stats.margin.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Cost Ledger */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Rejestr Kosztów</h3>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                    >
                        + Dodaj Koszt
                    </button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Typ</th>
                            <th className="p-3">Opis / Źródło</th>
                            <th className="p-3 text-right">Kwota</th>
                            <th className="p-3 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {costs.map(cost => (
                            <tr key={cost.id} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-600">{cost.date}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize 
                                        ${cost.type === 'commission' ? 'bg-purple-100 text-purple-700' :
                                            cost.type === 'measurement' ? 'bg-blue-100 text-blue-700' :
                                                cost.type === 'installation' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-700'}`}>
                                        {cost.type === 'measurement' ? 'Pomiar' :
                                            cost.type === 'commission' ? 'Prowizja' :
                                                cost.type === 'material' ? 'Materiały' : cost.type}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-800">
                                    {cost.description}
                                    {cost.source_ref && <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1 rounded">{cost.source_ref}</span>}
                                </td>
                                <td className="p-3 text-right font-medium text-red-600">
                                    -{formatMoney(cost.amount, cost.currency)}
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() => handleDeleteCost(cost.id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {costs.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Brak zarejestrowanych kosztów</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Cost Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">Dodaj Koszt</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Typ Kosztu</label>
                                <select
                                    className="w-full border rounded-lg p-2"
                                    value={newCost.type}
                                    onChange={e => setNewCost({ ...newCost, type: e.target.value as CustomerCost['type'] })}
                                >
                                    <option value="material">Materiały</option>
                                    <option value="measurement">Pomiar</option>
                                    <option value="installation">Montaż</option>
                                    <option value="commission">Prowizja</option>
                                    <option value="delivery">Dostawa</option>
                                    <option value="other">Inne</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kwota (PLN)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg p-2"
                                    placeholder="np. 150.00"
                                    value={newCost.amount || ''}
                                    onChange={e => setNewCost({ ...newCost, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg p-2"
                                    value={newCost.date}
                                    onChange={e => setNewCost({ ...newCost, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Opis</label>
                                <textarea
                                    className="w-full border rounded-lg p-2"
                                    rows={3}
                                    value={newCost.description || ''}
                                    onChange={e => setNewCost({ ...newCost, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleAddCost}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    disabled={!newCost.amount}
                                >
                                    Zapisz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
