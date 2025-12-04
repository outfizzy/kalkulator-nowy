import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import type { OrderRequest } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTranslation } from '../../contexts/TranslationContext';

export const OrderRequestList: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [requests, setRequests] = useState<OrderRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRequests = async () => {
            if (!currentUser) return;
            try {
                const data = await DatabaseService.getOrderRequests(currentUser.id);
                setRequests(data);
            } catch (error) {
                console.error('Error loading requests:', error);
            } finally {
                setLoading(false);
            }
        };
        loadRequests();
    }, [currentUser]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">{t('requests.statusPending')}</span>;
            case 'ordered': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{t('requests.statusOrdered')}</span>;
            case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t('requests.statusCompleted')}</span>;
            case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">{t('requests.statusRejected')}</span>;
            default: return status;
        }
    };

    if (loading) return <div className="text-center py-4">{t('common.loading')}</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">{t('requests.myRequests')}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th className="px-6 py-3">{t('requests.date')}</th>
                            <th className="px-6 py-3">{t('requests.item')}</th>
                            <th className="px-6 py-3">{t('requests.quantity')}</th>
                            <th className="px-6 py-3">{t('requests.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-slate-500">
                                    {t('requests.noRequests')}
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr key={req.id} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        {format(req.createdAt, 'dd.MM.yyyy', { locale: pl })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {req.itemName}
                                        {req.description && (
                                            <p className="text-xs text-slate-500 font-normal">{req.description}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.quantity}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(req.status)}
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
