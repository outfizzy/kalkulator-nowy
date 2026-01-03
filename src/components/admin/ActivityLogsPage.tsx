import React, { useEffect, useState } from 'react';
import { ActivityService, type ActivityLog } from '../../services/database/activity.service';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const ActivityLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await ActivityService.getLogs(100);
            setLogs(data);
        } catch (error) {
            console.error('Failed to load logs', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Logi Systemowe</h1>
                <button
                    onClick={loadLogs}
                    className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    Odśwież
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-3">Czas</th>
                                <th className="px-6 py-3">Użytkownik</th>
                                <th className="px-6 py-3">Akcja</th>
                                <th className="px-6 py-3">Obiekt</th>
                                <th className="px-6 py-3">Szczegóły</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        Ładowanie logów...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        Brak zarejestrowanych aktywności.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                                            {format(log.createdAt, 'dd MMM HH:mm:ss', { locale: pl })}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                                            <div className="text-xs text-slate-400 font-normal">{log.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium 
                                                ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">
                                            {log.entityType} <span className="text-slate-400">#{log.entityId?.slice(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                                            {formatDetails(log.details)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

function getActionColor(action: string) {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-700';
}

function formatDetails(details: any) {
    if (!details) return '-';
    // Simplified display logic
    if (Object.keys(details).length === 0) return '-';
    return JSON.stringify(details).replace(/[{"}]/g, ' ').trim();
}
