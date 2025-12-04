import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../services/database';
import type { OrderRequest, OrderRequestStatus } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export const OrderRequestManager: React.FC = () => {
    const [requests, setRequests] = useState<OrderRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<OrderRequestStatus | 'all'>('all');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await DatabaseService.getOrderRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error loading requests:', error);
            toast.error('Błąd ładowania zapotrzebowań');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: OrderRequestStatus) => {
        try {
            const { error } = await DatabaseService.updateOrderRequestStatus(id, newStatus);
            if (error) throw error;

            setRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status: newStatus } : req
            ));
            toast.success('Status zaktualizowany');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Błąd aktualizacji statusu');
        }
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(req => req.status === filter);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'ordered': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    if (loading) return <div className="text-center py-8">Ładowanie...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Zarządzanie Zapotrzebowaniami</h3>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as OrderRequestStatus | 'all')}
                    className="border border-slate-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Wszystkie</option>
                    <option value="pending">Oczekujące</option>
                    <option value="ordered">Zamówione</option>
                    <option value="completed">Odebrane</option>
                    <option value="rejected">Odrzucone</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Zgłaszający</th>
                            <th className="px-6 py-3">Przedmiot</th>
                            <th className="px-6 py-3">Ilość</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                    Brak zgłoszeń
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {format(req.createdAt, 'dd.MM.yyyy HH:mm', { locale: pl })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {req.user?.firstName} {req.user?.lastName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium">{req.itemName}</div>
                                        {req.description && (
                                            <div className="text-xs text-slate-500 mt-1">{req.description}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.quantity}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                                            {req.status === 'pending' && 'Oczekujące'}
                                            {req.status === 'ordered' && 'Zamówione'}
                                            {req.status === 'completed' && 'Odebrane'}
                                            {req.status === 'rejected' && 'Odrzucone'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {req.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(req.id, 'ordered')}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200"
                                                >
                                                    Zamów
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(req.id, 'rejected')}
                                                    className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 px-2 py-1 rounded border border-red-200"
                                                >
                                                    Odrzuć
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'ordered' && (
                                            <button
                                                onClick={() => handleStatusUpdate(req.id, 'completed')}
                                                className="text-green-600 hover:text-green-800 font-medium text-xs bg-green-50 px-2 py-1 rounded border border-green-200"
                                            >
                                                Oznacz jako odebrane
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
