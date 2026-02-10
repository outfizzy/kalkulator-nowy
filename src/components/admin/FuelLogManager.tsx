import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../services/database';
import { supabase } from '../../lib/supabase';
import type { FuelLog } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const FuelLogManager: React.FC = () => {
    const [logs, setLogs] = useState<FuelLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'installer' | 'sales_rep'>('all');

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const data = await DatabaseService.getFuelLogs();
                setLogs(data);
            } catch (error) {
                console.error('Error loading fuel logs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.type === filter;
    });

    const handleDelete = async (logId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;

        try {
            const { error } = await supabase
                .from('fuel_logs')
                .delete()
                .eq('id', logId);

            if (error) throw error;

            toast.success('Wpis usunięty');
            // Reload logs
            const data = await DatabaseService.getFuelLogs();
            setLogs(data);
        } catch (error) {
            console.error('Error deleting log:', error);
            toast.error('Błąd usuwania wpisu');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Rejestr Paliwowy</h1>
                    <p className="text-slate-500 text-sm">Przegląd zużycia paliwa przez pracowników</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        to="/admin/fuel-prices"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Zarządzaj cenami
                    </Link>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'all' | 'installer' | 'sales_rep')}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Wszyscy</option>
                        <option value="installer">Montażyści</option>
                        <option value="sales_rep">Sprzedawcy</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Pracownik</th>
                                <th className="px-4 py-3">Rola</th>
                                <th className="px-4 py-3">Rodzaj</th>
                                <th className="px-4 py-3">Pojazd</th>
                                <th className="px-4 py-3">Licznik</th>
                                <th className="px-4 py-3">Paliwo</th>
                                <th className="px-4 py-3">Koszt</th>
                                <th className="px-4 py-3">Zdjęcia</th>
                                <th className="px-4 py-3">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        {format(new Date(log.logDate), 'dd MMM yyyy', { locale: pl })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {log.userName || 'Nieznany'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${log.type === 'installer'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {log.type === 'installer' ? 'Montażysta' : 'Sprzedawca'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {(log as any).trip_type ? (
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                {(log as any).trip_type}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.vehiclePlate || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono">
                                        {log.odometerReading ? `${log.odometerReading} km` : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.liters} L
                                    </td>
                                    <td className="px-4 py-3 font-medium text-emerald-600">
                                        {log.cost != null ? `${log.cost.toFixed(2)} PLN` : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <a
                                                href={log.odometerPhotoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                                            >
                                                Licznik
                                            </a>
                                            <span className="text-slate-300">|</span>
                                            <a
                                                href={log.receiptPhotoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                                            >
                                                Paragon
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleDelete(log.id)}
                                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                                        >
                                            Usuń
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
