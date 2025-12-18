import React, { useEffect, useState } from 'react';
import { InstallationService } from '../../services/database/installation.service';
import type { OrderItem } from '../../types';
import { toast } from 'react-hot-toast';

export const ManagerOrdersWidget: React.FC = () => {
    const [items, setItems] = useState<(OrderItem & { installation: { client: any; productSummary: string } })[]>([]);
    const [loading, setLoading] = useState(true);

    const loadItems = async () => {
        try {
            const data = await InstallationService.getManagerOrderItems();
            setItems(data);
        } catch (error) {
            console.error('Error loading manager items:', error);
            toast.error('Błąd ładowania zapotrzebowania');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadItems();
    }, []);

    const handleStatusChange = async (item: OrderItem, newStatus: OrderItem['status']) => {
        try {
            // Optimistic update
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));

            await InstallationService.upsertOrderItem({
                ...item,
                status: newStatus,
                installationId: item.installationId
            });

            if (newStatus === 'delivered') {
                // Remove from list if delivered? Or keep for a moment?
                // The service query excludes delivered, so on reload it will accept.
                // Let's remove it after a delay or immediately
                setTimeout(() => {
                    setItems(prev => prev.filter(i => i.id !== item.id));
                }, 500);
                toast.success('Oznaczono jako dostarczone');
            } else {
                toast.success('Zmieniono status');
            }

        } catch (error) {
            console.error(error);
            toast.error('Błąd aktualizacji statusu');
            // Revert
            void loadItems();
        }
    };

    if (loading) return <div className="p-4 text-slate-400 text-sm">Ładowanie zapotrzebowania...</div>;

    if (items.length === 0) return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 shadow-sm">
            brak aktywnych zapotrzebowań
        </div>
    );

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">📦</span>
                    Zapotrzebowanie (Manager)
                </h3>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {items.length}
                </span>
            </div>

            <div className="overflow-y-auto p-0 flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Element</th>
                            <th className="px-4 py-2">Montaż</th>
                            <th className="px-4 py-2">Dostawa</th>
                            <th className="px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-800">{item.name}</div>
                                    <div className="text-xs text-slate-500">Ilość: {item.quantity}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-700">{item.installation.client?.city}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-[150px]" title={item.installation.productSummary}>
                                        {item.installation.productSummary}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {item.plannedDeliveryDate ? (
                                        <div className={`text-xs font-medium ${new Date(item.plannedDeliveryDate) < new Date() ? 'text-red-500' : 'text-slate-600'
                                            }`}>
                                            {item.plannedDeliveryDate}
                                        </div>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={item.status}
                                        onChange={(e) => handleStatusChange(item, e.target.value as OrderItem['status'])}
                                        className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer min-w-[100px] ${item.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                                item.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}
                                    >
                                        <option value="pending">Oczekuje</option>
                                        <option value="ordered">Zamówione</option>
                                        <option value="delivered">Dostarczone</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
