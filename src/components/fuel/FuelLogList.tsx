import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import type { FuelLog } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTranslation } from '../../contexts/TranslationContext';

export const FuelLogList: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [logs, setLogs] = useState<FuelLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            if (!currentUser) return;
            try {
                const data = await DatabaseService.getFuelLogs(currentUser.id);
                setLogs(data);
            } catch (error) {
                console.error('Error loading fuel logs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, [currentUser]);

    if (loading) {
        return <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div>;
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                {t('fuel.noLogs')}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">{t('fuel.date')}</th>
                            <th className="px-4 py-3">{t('fuel.vehicle')}</th>
                            <th className="px-4 py-3">{t('fuel.odometer')}</th>
                            <th className="px-4 py-3">{t('fuel.fuel')}</th>
                            <th className="px-4 py-3">{t('fuel.costHeader')}</th>
                            <th className="px-4 py-3">{t('fuel.photos')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    {format(new Date(log.logDate), 'dd MMM yyyy', { locale: pl })}
                                </td>
                                <td className="px-4 py-3">
                                    {log.vehiclePlate || '-'}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                    {log.odometerReading} km
                                </td>
                                <td className="px-4 py-3">
                                    {log.liters} L
                                </td>
                                <td className="px-4 py-3 font-medium text-emerald-600">
                                    {log.cost.toFixed(2)} PLN
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <a
                                            href={log.odometerPhotoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                                        >
                                            {t('fuel.odometerLink')}
                                        </a>
                                        <span className="text-slate-300">|</span>
                                        <a
                                            href={log.receiptPhotoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                                        >
                                            {t('fuel.receiptLink')}
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
