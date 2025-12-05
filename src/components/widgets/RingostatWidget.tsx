/**
 * RingostatWidget - Widget do wyświetlania statystyk połączeń z Ringostat
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { Customer, User } from '../../types';

interface CustomerMatch {
    customer: Customer;
    lastOfferDate: Date;
    offerCount: number;
    latestOfferId?: string;
}
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
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today'); // Default to today for admin dashboard relevance
    const [showDetails, setShowDetails] = useState(false);
    const [customers, setCustomers] = useState<CustomerMatch[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [callActions, setCallActions] = useState<Record<string, CallAction>>({});
    const [activeTab, setActiveTab] = useState<'calls' | 'team' | 'missed'>('calls');

    const getDateRange = useCallback(() => {
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
    }, [dateRange]);



    const fetchUsers = useCallback(async () => {
        try {
            const allUsers = await DatabaseService.getAllUsers();
            setUsers(allUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        try {
            const uniqueCustomers = await DatabaseService.getUniqueCustomers();
            setCustomers(uniqueCustomers);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    }, []);

    const fetchCallActions = useCallback(async () => {
        try {
            let { data, error } = await supabase
                .from('call_actions')
                .select(`*, user: profiles(full_name, role)`);

            // If error (e.g. role column missing or RLS issue), try fetching without role
            if (error) {
                // Fallback fetch logic if specific column/relation issues exist (simplified for brevity)
                const retry = await supabase.from('call_actions').select(`*`);
                data = retry.data;
                error = retry.error;
            }

            if (data) {
                const actionsMap: Record<string, CallAction> = {};
                data.forEach((action) => {
                    actionsMap[action.call_id] = {
                        ...action,
                        user: action.user || { full_name: 'Nieznany' }
                    };
                });
                setCallActions(actionsMap);
            }
        } catch (err) {
            console.error('Error fetching call actions:', err);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        setError(null);
        try {
            const { dateFrom, dateTo } = getDateRange();
            const response = await fetch(`/api/ringostat-calls?date_from=${dateFrom}&date_to=${dateTo}`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setStats(data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Błąd pobierania danych';
            setError(errorMessage);
            setStats({ total: 0, answered: 0, missed: 0, byNumber: {}, calls: [] });
        }
    }, [getDateRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchStats(),
                fetchCustomers(),
                fetchCallActions(),
                fetchUsers()
            ]);
        } finally {
            setLoading(false);
        }
    }, [fetchStats, fetchCustomers, fetchCallActions, fetchUsers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCallback = async (callId: string) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase.from('call_actions').insert({
                call_id: callId, customer_id: null, user_id: currentUser.id, action_type: 'callback'
            });
            if (error) throw error;
            toast.success('Oznaczono jako oddzwonione');
            fetchCallActions();
        } catch {
            toast.error('Błąd zapisu akcji');
        }
    };

    // --- Helpers ---

    const normalizePhoneNumber = (phone: string | undefined | null) => {
        if (!phone) return '';
        let p = phone.replace(/\D/g, '');
        if (p.startsWith('00')) p = p.substring(2);
        if ((p.startsWith('48') || p.startsWith('49')) && p.length > 9) p = p.substring(2);
        if (p.startsWith('0')) p = p.substring(1);
        return p;
    };

    const getCustomerMatch = (phoneNumber: string) => {
        const normalizedCall = normalizePhoneNumber(phoneNumber);
        if (normalizedCall.length < 7) return undefined;
        return customers.find(c => {
            const cleanStored = normalizePhoneNumber(c.customer.phone);
            return cleanStored.length >= 7 && (normalizedCall === cleanStored || normalizedCall.endsWith(cleanStored) || cleanStored.endsWith(normalizedCall));
        });
    };

    const getUserForExtension = useCallback((extension: string) => {
        // This is a naive heuristic since we don't have explicit 'extension' field yet.
        // We can try to match if user.phone contains the extension, or just rely on hardcoded map if we had one.
        // For now, let's look for a user whose phone number ENDS with this extension (common setup).
        return users.find(u => u.phone && u.phone.endsWith(extension));
    }, [users]);



    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    // --- Data Processing ---

    const allCalls = (stats?.calls || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredCalls = allCalls;

    const missedCallsQueue = allCalls.filter(call => call.status === 'missed' && call.direction === 'incoming' && !callActions[call.id]);

    // Group stats by consultant (internal extension)
    const consultantStats = React.useMemo(() => {
        const statsMap: Record<string, { name: string, total: number, answered: number, missed: number, extension: string }> = {};

        allCalls.forEach(call => {
            // Identify internal side
            const internalNumber = call.direction === 'outgoing' ? call.caller : call.callee;

            // If internal number is valid (e.g. 3 digits)
            if (internalNumber && internalNumber.length >= 3 && internalNumber.length <= 4) {
                if (!statsMap[internalNumber]) {
                    const user = getUserForExtension(internalNumber);
                    statsMap[internalNumber] = {
                        name: user ? `${user.firstName} ${user.lastName}` : `Konsultant ${internalNumber}`,
                        total: 0, answered: 0, missed: 0, extension: internalNumber
                    };
                }
                statsMap[internalNumber].total++;
                if (call.status === 'answered') statsMap[internalNumber].answered++;
                else statsMap[internalNumber].missed++;
            }
        });

        return Object.values(statsMap).sort((a, b) => b.total - a.total);
    }, [allCalls, getUserForExtension]);


    // Compact View (unchanged logic mostly, but cleaner)
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">📞 Ringostat</h3>
                    <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="text-xs border rounded px-2 py-1">
                        <option value="today">Dziś</option>
                        <option value="week">Tydzień</option>
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {/* Show a simplified missed calls alert if any */}
                    {missedCallsQueue.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                            <div className="text-red-700 font-bold text-xs flex justify-between">
                                <span>⚠️ Nieodebrane ({missedCallsQueue.length})</span>
                            </div>
                        </div>
                    )}
                    {filteredCalls.slice(0, 5).map(call => (
                        <div key={call.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                            <span className={call.direction === 'incoming' ? 'text-blue-500' : 'text-orange-500'}>
                                {call.direction === 'incoming' ? '↙' : '↗'} {call.direction === 'incoming' ? call.caller : call.callee}
                            </span>
                            <span className={call.status === 'answered' ? 'text-green-500' : 'text-red-500'}>
                                {call.status === 'answered' ? 'Odebrane' : 'Nieodebrane'}
                            </span>
                        </div>
                    ))}
                </div>
                <button onClick={() => setShowDetails(true)} className="w-full py-2 text-xs text-accent font-bold mt-2">Pełny Raport →</button>
            </div>
        );
    }

    // Full Admin View
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        📞 Centrum Połączeń
                        {loading && <span className="animate-spin ml-2 text-accent">⟳</span>}
                    </h2>
                    {/* Tabs */}
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('calls')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'calls' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Lista Połączeń
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Wyniki Zespołu
                        </button>
                        <button
                            onClick={() => setActiveTab('missed')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'missed' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span>Do Oddzwonienia</span>
                            {missedCallsQueue.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{missedCallsQueue.length}</span>}
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="today">Dziś</option>
                        <option value="week">7 dni</option>
                        <option value="month">30 dni</option>
                    </select>
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-accent transition-colors" title="Odśwież">🔄</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 bg-white rounded-b-2xl">
                {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

                {/* View: Calls List */}
                {activeTab === 'calls' && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="p-3 text-left">Czas</th>
                                    <th className="p-3 text-left">Kierunek</th>
                                    <th className="p-3 text-left">Klient</th>
                                    <th className="p-3 text-left">Konsultant</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCalls.map(call => {
                                    const match = getCustomerMatch(call.direction === 'outgoing' ? call.callee : call.caller);
                                    const clientNum = call.direction === 'outgoing' ? call.callee : call.caller;
                                    const internalNum = call.direction === 'outgoing' ? call.caller : call.callee;
                                    const internalUser = getUserForExtension(internalNum);
                                    const isMissed = call.status === 'missed';
                                    const action = callActions[call.id];

                                    return (
                                        <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 whitespace-nowrap text-slate-500">{formatDate(call.date)}</td>
                                            <td className="p-3">
                                                <span className={`flex items-center gap-1 ${call.direction === 'incoming' ? 'text-blue-600' : 'text-orange-500'}`}>
                                                    {call.direction === 'incoming' ? '↙ Przychodzące' : '↗ Wychodzące'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {match ? (
                                                    <Link to={`/customers/${match.customer.id}`} className="font-bold text-slate-700 hover:text-accent hover:underline">
                                                        {match.customer.firstName} {match.customer.lastName}
                                                    </Link>
                                                ) : (
                                                    <span className="font-mono text-slate-600">{clientNum}</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {internalUser ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                            {internalUser.firstName[0]}{internalUser.lastName[0]}
                                                        </div>
                                                        <span className="text-slate-700">{internalUser.firstName} {internalUser.lastName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-mono">{internalNum || '-'}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${isMissed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {isMissed ? 'Nieodebrane' : 'Odebrane'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {isMissed && !action && call.direction === 'incoming' && (
                                                    <button onClick={() => handleCallback(call.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-medium">Oddzwoń</button>
                                                )}
                                                {action && <span className="text-xs text-green-600 font-bold">✓ Oddzwonione</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* View: Team Stats */}
                {activeTab === 'team' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {consultantStats.map(stat => (
                            <div key={stat.extension} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                        {stat.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{stat.name}</div>
                                        <div className="text-xs text-slate-400">Ext: {stat.extension}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-slate-50 rounded p-2">
                                        <div className="font-bold text-slate-700">{stat.total}</div>
                                        <div className="text-[10px] text-slate-400">Razem</div>
                                    </div>
                                    <div className="bg-green-50 rounded p-2">
                                        <div className="font-bold text-green-600">{stat.answered}</div>
                                        <div className="text-[10px] text-green-600">Odebrane</div>
                                    </div>
                                    <div className="bg-red-50 rounded p-2">
                                        <div className="font-bold text-red-600">{stat.missed}</div>
                                        <div className="text-[10px] text-red-600">Nieodebrane</div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-green-500" style={{ width: `${stat.total ? (stat.answered / stat.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {consultantStats.length === 0 && (
                            <div className="col-span-full text-center py-10 text-slate-400">Brak danych dla wybranego okresu</div>
                        )}
                    </div>
                )}

                {/* View: Missed Queue */}
                {activeTab === 'missed' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm flex items-start gap-3">
                            <div className="text-xl">⚠️</div>
                            <div>
                                <div className="font-bold">Kolejka połączeń nieodebranych</div>
                                <p>Poniższa lista zawiera połączenia przychodzące, na które nikt jeszcze nie oddzwonił (brak akcji "callback" w systemie).</p>
                            </div>
                        </div>

                        {missedCallsQueue.length > 0 ? (
                            <div className="grid gap-2">
                                {missedCallsQueue.map(call => {
                                    const match = getCustomerMatch(call.caller);
                                    return (
                                        <div key={call.id} className="bg-white border border-red-100 shadow-sm rounded-lg p-3 flex items-center justify-between hover:bg-red-50/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="text-red-500 font-bold whitespace-nowrap">{formatDate(call.date)}</div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-lg">
                                                        {match ? `${match.customer.firstName} ${match.customer.lastName}` : call.caller}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Dzwonił na numer: <span className="font-mono">{call.callee}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCallback(call.id)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2"
                                            >
                                                <span>📞</span> Oddzwoń
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <div className="text-4xl mb-2">🎉</div>
                                <div>Wszystkie połączenia obsłużone!</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showDetails && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-lg">Raport Połączeń</h2>
                            <button onClick={() => setShowDetails(false)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-slate-100">✕</button>
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            <RingostatWidget compact={false} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    // End of component
};

