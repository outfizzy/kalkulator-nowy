/**
 * RingostatWidget - Widget do wyświetlania statystyk połączeń z Ringostat
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { Customer } from '../../types';

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

interface CallAction {
    id: string;
    call_id: string;
    user_id: string;
    action_type: string;
    created_at: string;
    user?: {
        full_name: string | null;
        role?: string;
    };
}

interface RingostatWidgetProps {
    compact?: boolean; // For dashboard tile view
}

export const RingostatWidget: React.FC<RingostatWidgetProps> = ({ compact = false }) => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState<CallStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
    const [showDetails, setShowDetails] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [callActions, setCallActions] = useState<Record<string, CallAction>>({});
    const [filterNumber, setFilterNumber] = useState<string>('all'); // 'all', '980', '981', '982'

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
            default:
                dateFrom = dateTo;
        }

        return { dateFrom, dateTo };
    };

    const fetchCustomers = async () => {
        try {
            // Use DatabaseService to get unique customers from offers (source of truth)
            const uniqueCustomers = await DatabaseService.getUniqueCustomers();

            // Map to the format expected by the widget (though getUniqueCustomers returns proper Customer objects)
            // We just need the list of customers
            setCustomers(uniqueCustomers.map((item: { customer: Customer }) => item.customer));
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchCallActions = async () => {
        try {
            const { data, error } = await supabase
                .from('call_actions')
                .select(`
    *,
    user: profiles(full_name, role)
        `);

            if (error) throw error;

            if (data) {
                const actionsMap: Record<string, CallAction> = {};
                data.forEach((action) => {
                    // Store latest action for each call_id
                    // In a real app, might want list of actions, but for now just "is handled"
                    actionsMap[action.call_id] = {
                        ...action,
                        user: action.user
                    };
                });
                setCallActions(actionsMap);
            }
        } catch (err) {
            console.error('Error fetching call actions:', err);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        setError(null);

        try {
            const { dateFrom, dateTo } = getDateRange();

            // Use Vercel API route
            const response = await fetch(`/api/ringostat-calls?date_from=${dateFrom}&date_to=${dateTo}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setStats(data);
        } catch (err: unknown) {
            console.error('Error fetching Ringostat stats:', err);
            const errorMessage = err instanceof Error ? err.message : 'Błąd pobierania danych';
            setError(errorMessage);
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
        fetchCustomers();
        fetchCallActions();
    }, [dateRange]);

    const handleCallback = async (callId: string) => {
        if (!currentUser) return;

        try {
            const { error } = await supabase
                .from('call_actions')
                .insert({
                    call_id: callId,
                    user_id: currentUser.id,
                    action_type: 'callback'
                });

            if (error) throw error;

            toast.success('Oznaczono jako oddzwonione');
            fetchCallActions(); // Refresh actions
        } catch (err) {
            console.error('Error saving callback action:', err);
            toast.error('Błąd zapisu akcji');
        }
    };

    const getCustomerName = (phoneNumber: string) => {
        if (!phoneNumber) return '-';

        // Helper to normalize phone number for comparison
        // Removes non-digits, and strips common prefixes (48, 49, 0) to compare the "core" number
        const normalize = (phone: string) => {
            if (!phone) return '';
            let p = phone.replace(/\D/g, ''); // Remove non-digits

            // Remove leading 00
            if (p.startsWith('00')) p = p.substring(2);

            // Remove country codes if present (48 PL, 49 DE)
            if ((p.startsWith('48') || p.startsWith('49')) && p.length > 9) {
                p = p.substring(2);
            }

            // Remove leading 0 (common in local formats)
            if (p.startsWith('0')) p = p.substring(1);

            return p;
        };

        const cleanIncoming = normalize(phoneNumber);

        const customer = customers.find(c => {
            const cleanStored = normalize(c.phone || '');
            // Match if one contains the other (to handle cases where one might still have extra digits)
            // but ensure we have enough digits to avoid false positives (e.g. "1")
            if (cleanIncoming.length < 7 || cleanStored.length < 7) return false;

            return cleanIncoming === cleanStored ||
                cleanIncoming.endsWith(cleanStored) ||
                cleanStored.endsWith(cleanIncoming);
        });

        if (customer) {
            return `${customer.firstName} ${customer.lastName}`;
        }
        return '-';
    };

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

    // Filter calls based on destination number and sort by date (newest first)
    const filteredCalls = (stats?.calls || [])
        .filter(call => {
            if (filterNumber === 'all') return true;
            return call.callee.endsWith(filterNumber);
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compact view for dashboard tile
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        📞 Ringostat
                    </h3>
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as 'today' | 'week' | 'month')}
                        className="text-xs border rounded px-2 py-1"
                    >
                        <option value="today">Dziś</option>
                        <option value="week">Tydzień</option>
                        <option value="month">Miesiąc</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center flex-1">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-sm text-center py-4">{error}</div>
                ) : (
                    <div className="space-y-3 flex-1">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2 border border-slate-200">
                                <div className="text-2xl font-bold text-slate-800">{stats?.total || 0}</div>
                                <div className="text-[10px] text-slate-500 font-medium">Wszystkie</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 border border-green-200">
                                <div className="text-2xl font-bold text-green-600">{stats?.answered || 0}</div>
                                <div className="text-[10px] text-green-600 font-medium">Odebrane</div>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 border border-red-200">
                                <div className="text-2xl font-bold text-red-600">{stats?.missed || 0}</div>
                                <div className="text-[10px] text-red-600 font-medium">Nieodebrane</div>
                            </div>
                        </div>

                        {stats && stats.total > 0 && (
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${(stats.answered / stats.total) * 100}%` }}
                                ></div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto min-h-0">
                            {filteredCalls.slice(0, 5).map(call => (
                                <div key={call.id} className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={call.status === 'answered' ? 'text-green-500' : 'text-red-500'}>
                                            {call.direction === 'incoming' ? '↙' : '↗'}
                                        </span>
                                        <div>
                                            <div className="font-medium text-slate-700">{getCustomerName(call.caller) !== '-' ? getCustomerName(call.caller) : call.caller}</div>
                                            <div className="text-[10px] text-slate-400">{formatDate(call.date)}</div>
                                        </div>
                                    </div>
                                    {call.status === 'missed' && (
                                        !callActions[call.id] ? (
                                            <button
                                                onClick={() => handleCallback(call.id)}
                                                title="Oznacz jako oddzwonione z telefonu"
                                                className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-[10px] font-bold"
                                            >
                                                Oddzwoń
                                            </button>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="text-green-600 font-bold text-[10px]">✓ Oddzwoniono</span>
                                                <span className="text-[8px] text-slate-400">
                                                    {callActions[call.id].user?.full_name?.split(' ')[0] || 'Użytkownik'}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowDetails(true)}
                            className="w-full py-2 text-xs text-accent hover:bg-accent/5 rounded-lg font-bold mt-auto"
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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    📞 Statystyki Połączeń Ringostat
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filterNumber}
                        onChange={e => setFilterNumber(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-slate-50"
                    >
                        <option value="all">Wszystkie numery</option>
                        <option value="980">...980</option>
                        <option value="981">...981</option>
                        <option value="982">...982</option>
                    </select>

                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as 'today' | 'week' | 'month')}
                        className="border rounded-lg px-3 py-2 text-sm bg-slate-50"
                    >
                        <option value="today">Dziś</option>
                        <option value="week">Ostatni tydzień</option>
                        <option value="month">Ostatni miesiąc</option>
                    </select>
                    <button
                        onClick={() => { fetchStats(); fetchCallActions(); }}
                        className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent-dark transition-colors shadow-sm"
                    >
                        🔄 Odśwież
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-60">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
                    {error}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 text-center border border-slate-200 shadow-sm">
                            <div className="text-3xl font-bold text-slate-800">{stats?.total || 0}</div>
                            <div className="text-sm text-slate-500 font-medium mt-1">Wszystkie połączenia</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200 shadow-sm">
                            <div className="text-3xl font-bold text-green-600">{stats?.answered || 0}</div>
                            <div className="text-sm text-green-600 font-medium mt-1">Odebrane</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center border border-red-200 shadow-sm">
                            <div className="text-3xl font-bold text-red-600">{stats?.missed || 0}</div>
                            <div className="text-sm text-red-600 font-medium mt-1">Nieodebrane</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200 shadow-sm">
                            <div className="text-3xl font-bold text-blue-600">
                                {stats && stats.total > 0
                                    ? Math.round((stats.answered / stats.total) * 100)
                                    : 0}%
                            </div>
                            <div className="text-sm text-blue-600 font-medium mt-1">Procent odebranych</div>
                        </div>
                    </div>

                    {/* Recent Calls */}
                    {filteredCalls.length > 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">📋 Lista połączeń</h3>
                                <span className="text-xs text-slate-500">Ostatnie 100 połączeń</span>
                            </div>
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="text-left p-3 font-semibold text-slate-600">Data</th>
                                            <th className="text-left p-3 font-semibold text-slate-600">Kierunek</th>
                                            <th className="text-left p-3 font-semibold text-slate-600">Klient</th>
                                            <th className="text-left p-3 font-semibold text-slate-600">Numer</th>
                                            <th className="text-left p-3 font-semibold text-slate-600">Odbierający</th>
                                            <th className="text-center p-3 font-semibold text-slate-600">Czas</th>
                                            <th className="text-center p-3 font-semibold text-slate-600">Status</th>
                                            <th className="text-center p-3 font-semibold text-slate-600">Akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredCalls.map(call => {
                                            const action = callActions[call.id];
                                            return (
                                                <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(call.date)}</td>
                                                    <td className="p-3">
                                                        <span className={`text-lg ${call.direction === 'incoming' ? 'text-blue-500' : 'text-orange-500'}`} title={call.direction === 'incoming' ? 'Przychodzące' : 'Wychodzące'}>
                                                            {call.direction === 'incoming' ? '↙' : '↗'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-800">
                                                        {getCustomerName(call.caller)}
                                                    </td>
                                                    <td className="p-3 font-mono text-slate-600">{call.caller || '-'}</td>
                                                    <td className="p-3 font-mono text-slate-600">{call.callee || '-'}</td>
                                                    <td className="p-3 text-center text-slate-600">{formatDuration(call.duration)}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${call.status === 'answered'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {call.status === 'answered' ? 'Odebrane' : 'Nieodebrane'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {call.status === 'missed' ? (
                                                            action ? (
                                                                <div className="text-xs text-green-600 flex flex-col items-center">
                                                                    <span className="font-bold">✓ Oddzwonione</span>
                                                                    <span className="text-[10px] text-slate-600 font-medium">
                                                                        {action.user?.full_name || 'Użytkownik'}
                                                                    </span>
                                                                    {action.user?.role && (
                                                                        <span className="text-[9px] text-slate-400">
                                                                            ({action.user.role === 'sales_rep' ? 'Handlowiec' :
                                                                                action.user.role === 'admin' ? 'Admin' :
                                                                                    action.user.role === 'manager' ? 'Manager' : action.user.role})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCallback(call.id)}
                                                                    title="Kliknij jeśli oddzwoniłeś z telefonu komórkowego"
                                                                    className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-bold shadow-sm flex items-center gap-1"
                                                                >
                                                                    <span>📱</span>
                                                                    <span>Oznacz: Oddzwoniono</span>
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                            <div className="text-4xl mb-3 opacity-50">📭</div>
                            <p className="text-slate-500 font-medium">Brak połączeń spełniających kryteria</p>
                        </div>
                    )}
                </div>
            )}
            {/* Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">📞 Szczegóły połączeń</h2>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <RingostatWidget compact={false} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RingostatWidget;
