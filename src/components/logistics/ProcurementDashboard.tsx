import React, { useState, useEffect } from 'react';
import { ProcurementService } from '../../services/database/procurement.service';
import type { ProcurementItem, OrderedItem } from '../../types';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const ProcurementDashboard: React.FC = () => {
    const [items, setItems] = useState<ProcurementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('pending'); // Default to pending actions
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Edit State
    const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
    const [editForm, setEditForm] = useState({
        delivery_week: '',
        confirmed_delivery_date: ''
    });

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const data = await ProcurementService.getItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to load procurement items', error);
            toast.error('Błąd ładowania listy zamówień');
        } finally {
            setLoading(false);
        }
    };

    // Helpers (moved up to be accessible)
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Oczekuje';
            case 'ordered': return 'Zamówione';
            case 'delivered': return 'Dostarczone';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'ordered': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const handleStatusUpdate = async (item: ProcurementItem, newStatus: OrderedItem['status']) => {
        setProcessingId(item.itemId);
        try {
            await ProcurementService.updateItemStatus(item.sourceType, item.sourceId, item.itemId, {
                status: newStatus,
            });

            // Optimistic update
            setItems(prev => prev.map(i =>
                i.itemId === item.itemId ? { ...i, status: newStatus } : i
            ));

            toast.success(`Status zmieniony na: ${getStatusLabel(newStatus)}`);
        } catch (error) {
            console.error('Failed to update status', error);
            toast.error('Nie udało się zaktualizować statusu');
        } finally {
            setProcessingId(null);
        }
    };

    const handleEditDelivery = (item: ProcurementItem) => {
        setEditingItem(item);
        setEditForm({
            delivery_week: item.delivery_week || '',
            confirmed_delivery_date: item.confirmed_delivery_date || ''
        });
    };

    const saveDeliveryInfo = async () => {
        if (!editingItem) return;

        try {
            await ProcurementService.updateItemStatus(
                editingItem.sourceType,
                editingItem.sourceId,
                editingItem.itemId,
                {
                    delivery_week: editForm.delivery_week || undefined,
                    confirmed_delivery_date: editForm.confirmed_delivery_date || null
                }
            );

            // Optimistic update
            setItems(prev => prev.map(i =>
                i.itemId === editingItem.itemId ? {
                    ...i,
                    delivery_week: editForm.delivery_week,
                    confirmed_delivery_date: editForm.confirmed_delivery_date
                } : i
            ));

            toast.success('Zaktualizowano informacje o dostawie');
            setEditingItem(null);
        } catch (error) {
            console.error('Failed to update delivery info', error);
            toast.error('Błąd zapisu danych dostawy');
        }
    };

    // Derived state
    const filteredItems = items.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesSearch = searchTerm === '' ||
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.clientName.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStatus && matchesCategory && matchesSearch;
    });

    const categories = Array.from(new Set(items.map(i => i.category))).sort();

    // Stats
    const stats = {
        pendingCount: items.filter(i => i.status === 'pending').length,
        orderedValue: items.filter(i => i.status === 'ordered').reduce((sum, i) => sum + i.purchaseCost, 0),
        pendingValue: items.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.purchaseCost, 0),
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Logistyka i Zamówienia</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500 mb-1">Do Zamówienia (Ilość)</div>
                    <div className="text-3xl font-bold text-slate-900">{stats.pendingCount}</div>
                    <div className="text-xs text-yellow-600 font-medium mt-2">Działanie wymagane</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500 mb-1">Wartość "Do Zamówienia"</div>
                    <div className="text-3xl font-bold text-slate-900">
                        {stats.pendingValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500 mb-1">Wartość "W Realizacji"</div>
                    <div className="text-3xl font-bold text-slate-900">
                        {stats.orderedValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {['all', 'pending', 'ordered', 'delivered'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === status
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {status === 'all' ? 'Wszystkie' : getStatusLabel(status)}
                            </button>
                        ))}
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="all">Wszystkie kategorie</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="relative w-full md:w-64">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Szukaj (klient, nr umowy, produkt)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Status / Źródło</th>
                                <th className="px-6 py-4">Produkt / Kategoria</th>
                                <th className="px-6 py-4">Klient / Odniesienie</th>
                                <th className="px-6 py-4">Dostawa / Koszt</th>
                                <th className="px-6 py-4 text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Brak elementów spełniających kryteria
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={`${item.id}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                                    {getStatusLabel(item.status)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                                    {item.sourceType === 'contract' ? 'UMOWA' : item.sourceType === 'installation' ? 'MONTAŻ' : 'MAGAZYN'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{item.itemName}</div>
                                            <div className="text-xs text-slate-500">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{item.clientName}</div>
                                            {item.sourceType === 'contract' ? (
                                                <Link to={`/contracts/${item.sourceId}`} className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                                                    {item.referenceNumber}
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </Link>
                                            ) : (
                                                <div className="text-xs text-slate-500">{item.referenceNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {/* Edit Delivery Button / Display */}
                                                {item.status === 'ordered' || item.status === 'delivered' ? (
                                                    <button
                                                        onClick={() => handleEditDelivery(item)}
                                                        className="text-left group"
                                                        title="Kliknij aby edytować datę dostawy"
                                                    >
                                                        {item.confirmed_delivery_date ? (
                                                            <div className="text-green-600 font-medium flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                {new Date(item.confirmed_delivery_date).toLocaleDateString()}
                                                            </div>
                                                        ) : item.delivery_week ? (
                                                            <div className="text-blue-600 font-medium flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Tydzień {item.delivery_week}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-400 italic group-hover:text-blue-500 transition-colors">
                                                                + Dodaj termin
                                                            </div>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="text-slate-800">
                                                        {item.plannedDeliveryDate ? new Date(item.plannedDeliveryDate).toLocaleDateString() : '-'}
                                                    </div>
                                                )}

                                                <div className="text-xs text-slate-500 mt-1">
                                                    Koszt: {item.purchaseCost > 0 ? item.purchaseCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {item.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(item, 'ordered')}
                                                        disabled={processingId === item.itemId}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {processingId === item.itemId ? '...' : 'Zamów'}
                                                    </button>
                                                )}
                                                {item.status === 'ordered' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditDelivery(item)}
                                                            className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors"
                                                        >
                                                            Termin
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(item, 'delivered')}
                                                            disabled={processingId === item.itemId}
                                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {processingId === item.itemId ? '...' : 'Odebrano'}
                                                        </button>
                                                    </div>
                                                )}
                                                {(item.status === 'delivered' || item.status === 'completed') && (
                                                    <span className="text-xs text-slate-400 font-medium px-2">Zakończone</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Delivery Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Potwierdzenie terminu dostawy</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Wprowadź szacowany tydzień dostawy LUB dokładną datę potwierdzoną przez producenta.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Szacowany Tydzień (np. 2026-W05)
                                </label>
                                <input
                                    type="text"
                                    placeholder="2026-W.."
                                    value={editForm.delivery_week}
                                    onChange={(e) => setEditForm({ ...editForm, delivery_week: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-500">LUB</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Dokładna Data Dostawy (Potwierdzona)
                                </label>
                                <input
                                    type="date"
                                    value={editForm.confirmed_delivery_date}
                                    onChange={(e) => setEditForm({ ...editForm, confirmed_delivery_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Wypełnienie daty ma priorytet nad tygodniem w kalendarzu.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={saveDeliveryInfo}
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Zapisz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
