/**
 * RingostatWidget - Widget do wyświetlania statystyk połączeń z Ringostat
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CallStats {
    total: number;
    answered: number;
    missed: number;
    byNumber: Record<string, { total: number; answered: number; missed: number }>;
    calls: Array<{
        id: string;
        date: string;
        duration: number;
        caller: string;
        callee: string;
        status: 'answered' | 'missed';
        direction: 'incoming' | 'outgoing';
        recording?: string;
    }>;
    error?: string;
}

interface RingostatWidgetProps {
    compact?: boolean; // For dashboard tile view
}

export const RingostatWidget: React.FC<RingostatWidgetProps> = ({ compact = false }) => {
    const [stats, setStats] = useState<CallStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
    const [showDetails, setShowDetails] = useState(false);

    const getDateRange = () => {
        const now = new Date();
        const dateTo = now.toISOString().split('T')[0];
        let dateFrom: string;

        switch (dateRange) {
            case 'today':
                dateFrom = dateTo;
                break;
            case 'week':
                dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case 'month':
                dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
        }

        return { dateFrom, dateTo };
    };

    const fetchStats = async () => {
        setLoading(true);
        setError(null);

        try {
            const { dateFrom, dateTo } = getDateRange();

            const { data, error: fnError } = await supabase.functions.invoke('ringostat-calls', {
                body: { date_from: dateFrom, date_to: dateTo }
            });

            if (fnError) throw fnError;

            setStats(data);
        } catch (err: any) {
            console.error('Error fetching Ringostat stats:', err);
            setError(err.message || 'Błąd pobierania danych');
            // Set empty stats on error
            setStats({
                total: 0,
                answered: 0,
                missed: 0,
                byNumber: {},
                calls: []
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Compact view for dashboard tile
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 h-full">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        📞 Ringostat
                    </h3>
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as any)}
                        className="text-xs border rounded px-2 py-1"
                    >
                        <option value="today">Dziś</option>
                        <option value="week">Tydzień</option>
                        <option value="month">Miesiąc</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-20">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-sm text-center py-4">{error}</div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-50 rounded-lg p-2">
                                <div className="text-2xl font-bold text-slate-800">{stats?.total || 0}</div>
                                <div className="text-[10px] text-slate-500">Wszystkie</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                                <div className="text-2xl font-bold text-green-600">{stats?.answered || 0}</div>
                                <div className="text-[10px] text-green-600">Odebrane</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-2">
                                <div className="text-2xl font-bold text-red-600">{stats?.missed || 0}</div>
                                <div className="text-[10px] text-red-600">Nieodebrane</div>
                            </div>
                        </div>

                        {stats && stats.total > 0 && (
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${(stats.answered / stats.total) * 100}%` }}
                                ></div>
                            </div>
                        )}

                        <button
                            onClick={() => setShowDetails(true)}
                            className="w-full py-2 text-xs text-accent hover:bg-accent/5 rounded-lg font-bold"
                        >
                            Zobacz szczegóły →
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    📞 Statystyki Połączeń Ringostat
                </h2>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as any)}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="today">Dziś</option>
                        <option value="week">Ostatni tydzień</option>
                        <option value="month">Ostatni miesiąc</option>
                    </select>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent-dark"
                    >
                        🔄 Odśwież
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
                    {error}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-slate-800">{stats?.total || 0}</div>
                            <div className="text-sm text-slate-500">Wszystkie połączenia</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-green-600">{stats?.answered || 0}</div>
                            <div className="text-sm text-green-600">Odebrane</div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-red-600">{stats?.missed || 0}</div>
                            <div className="text-sm text-red-600">Nieodebrane</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-blue-600">
                                {stats && stats.total > 0
                                    ? Math.round((stats.answered / stats.total) * 100)
                                    : 0}%
                            </div>
                            <div className="text-sm text-blue-600">Procent odebranych</div>
                        </div>
                    </div>

                    {/* By Phone Number */}
                    {stats && Object.keys(stats.byNumber).length > 0 && (
                        <div>
                            <h3 className="font-bold text-lg mb-3">📱 Połączenia wg numeru</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="text-left p-3 rounded-l-lg">Numer</th>
                                            <th className="text-center p-3">Wszystkie</th>
                                            <th className="text-center p-3">Odebrane</th>
                                            <th className="text-center p-3">Nieodebrane</th>
                                            <th className="text-center p-3 rounded-r-lg">% odebranych</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(stats.byNumber)
                                            .sort((a, b) => b[1].total - a[1].total)
                                            .slice(0, 10)
                                            .map(([number, data]) => (
                                                <tr key={number} className="border-b border-slate-100">
                                                    <td className="p-3 font-mono">{number}</td>
                                                    <td className="p-3 text-center font-bold">{data.total}</td>
                                                    <td className="p-3 text-center text-green-600">{data.answered}</td>
                                                    <td className="p-3 text-center text-red-600">{data.missed}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${(data.answered / data.total) >= 0.8
                                                                ? 'bg-green-100 text-green-700'
                                                                : (data.answered / data.total) >= 0.5
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.round((data.answered / data.total) * 100)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Calls */}
                    {stats && stats.calls.length > 0 && (
                        <div>
                            <h3 className="font-bold text-lg mb-3">📋 Ostatnie połączenia</h3>
                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 rounded-l-lg">Data</th>
                                            <th className="text-left p-3">Kierunek</th>
                                            <th className="text-left p-3">Dzwoniący</th>
                                            <th className="text-left p-3">Odbierający</th>
                                            <th className="text-center p-3">Czas trwania</th>
                                            <th className="text-center p-3 rounded-r-lg">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.calls.map(call => (
                                            <tr key={call.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="p-3 text-slate-500">{formatDate(call.date)}</td>
                                                <td className="p-3">
                                                    <span className={`text-lg ${call.direction === 'incoming' ? 'text-blue-500' : 'text-orange-500'}`}>
                                                        {call.direction === 'incoming' ? '📥' : '📤'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono">{call.caller || '-'}</td>
                                                <td className="p-3 font-mono">{call.callee || '-'}</td>
                                                <td className="p-3 text-center">{formatDuration(call.duration)}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${call.status === 'answered'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {call.status === 'answered' ? 'Odebrane' : 'Nieodebrane'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {stats && stats.total === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <div className="text-4xl mb-2">📞</div>
                            <p>Brak połączeń w wybranym okresie</p>
                        </div>
                    )}
                </div>
            )}

            {/* Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">📞 Szczegóły połączeń</h2>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-slate-400 hover:text-slate-600 text-2xl"
                            >
                                ✕
                            </button>
                        </div>
                        {/* Reuse full view content here */}
                        <RingostatWidget compact={false} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RingostatWidget;
