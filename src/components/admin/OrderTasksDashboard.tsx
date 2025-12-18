import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { InstallationService } from '../../services/database/installation.service';
import type { OrderItem } from '../../types';

export const OrderTasksDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<(OrderItem & { installation: { client: any; productSummary: string } })[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await InstallationService.getManagerOrderItems();
            setItems(data);
        } catch (error) {
            console.error('Error loading order tasks:', error);
            toast.error('Błąd ładowania zadań');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleStatusUpdate = async (item: OrderItem, newStatus: OrderItem['status']) => {
        try {
            const updates: any = { status: newStatus };
            if (newStatus === 'ordered' && !item.orderedAt) {
                updates.orderedAt = new Date().toISOString();
            }

            await InstallationService.upsertOrderItem({
                installationId: item.installationId,
                id: item.id,
                ...updates
            });

            toast.success('Zaktualizowano status');
            loadData(); // Reload to refresh list (e.g. remove if delivered? or just update)
        } catch (error) {
            console.error(error);
            toast.error('Błąd aktualizacji');
        }
    };

    const handleDateUpdate = async (item: OrderItem, date: string) => {
        try {
            await InstallationService.upsertOrderItem({
                installationId: item.installationId,
                id: item.id,
                plannedDeliveryDate: date
            });
            toast.success('Zaktualizowano datę');
            loadData();
        } catch (error) {
            toast.error('Błąd aktualizacji daty');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Ładowanie zadań...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Zapotrzebowania i Zamówienia</h2>
                    <p className="text-sm text-slate-500">Lista elementów wymagających zamówienia lub śledzenia dostawy</p>
                </div>
                <div className="text-sm text-slate-500">
                    Oczekujące: <span className="font-bold text-orange-600">{items.filter(i => i.status === 'pending').length}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Klient / Instalacja</th>
                            <th className="px-6 py-3">Produkt</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Planowana Dostawa</th>
                            <th className="px-6 py-3 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                    Brak aktywnych zamówień do obsłużenia.
                                </td>
                            </tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{item.installation.client?.lastName || 'Instalacja'}</div>
                                        <div className="text-xs text-slate-500">{item.installation.client?.city}</div>
                                        <div className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{item.installation.productSummary}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {item.name}
                                        {item.quantity > 1 && <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">x{item.quantity}</span>}
                                        {item.notes && <div className="text-xs text-amber-600 mt-1">{item.notes}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${item.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                                item.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'}`}>
                                            {item.status === 'pending' ? 'Do zamówienia' :
                                                item.status === 'ordered' ? 'Zamówione' : 'Dostarczone'}
                                        </span>
                                        {item.orderedAt && (
                                            <div className="text-xs text-slate-400 mt-1">
                                                Zam.: {item.orderedAt.toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="date"
                                            value={item.plannedDeliveryDate || ''}
                                            onChange={(e) => handleDateUpdate(item, e.target.value)}
                                            className="text-xs border border-slate-200 rounded p-1 focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {item.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatusUpdate(item, 'ordered')}
                                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                                            >
                                                Oznacz jako Zamówione
                                            </button>
                                        )}
                                        {item.status === 'ordered' && (
                                            <button
                                                onClick={() => handleStatusUpdate(item, 'delivered')}
                                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                                            >
                                                Oznacz jako Dostarczone
                                            </button>
                                        )}
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
