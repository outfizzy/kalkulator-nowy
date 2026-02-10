/**
 * RingostatWidget - Widget do wyświetlania statystyk połączeń z Ringostat
 * Supports: call sync to DB, customer matching, callback tracking with rep name
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
        disposition?: string;
    }>;
    sync?: {
        synced: number;
        matched: number;
        communications_created: number;
    };
    error?: string;
}

interface CallbackInfo {
    id: string;
    ringostat_id?: string;
    call_id?: string;
    user_id: string;
    callback_at?: string;
    created_at: string;
    user_name: string;
}

interface RingostatWidgetProps {
    compact?: boolean;
}

export const RingostatWidget: React.FC<RingostatWidgetProps> = ({ compact = false }) => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState<CallStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
    const [showDetails, setShowDetails] = useState(false);
    const [customers, setCustomers] = useState<CustomerMatch[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [callbacks, setCallbacks] = useState<Record<string, CallbackInfo>>({});
    const [activeTab, setActiveTab] = useState<'calls' | 'team' | 'missed'>('calls');
    const [syncing, setSyncing] = useState(false);
    const [playingRecording, setPlayingRecording] = useState<string | null>(null);

    const getDateRange = useCallback(() => {
        const now = new Date();
        const dateTo = now.toISOString().split('T')[0];
        let dateFrom: string;
        switch (dateRange) {
            case 'today': dateFrom = dateTo; break;
            case 'week': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; break;
            case 'month': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; break;
            default: dateFrom = dateTo;
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

    const fetchCallbacks = useCallback(async () => {
        try {
            // Fetch from call_log (primary) — where callback_by is set
            const { data: callLogCallbacks } = await supabase
                .from('call_log')
                .select('ringostat_id, callback_by, callback_at')
                .not('callback_by', 'is', null);

            // Fetch from call_actions (legacy)
            const { data: callActions } = await supabase
                .from('call_actions')
                .select('*');

            // Fetch profile names for callback users
            const userIds = new Set<string>();
            (callLogCallbacks || []).forEach(c => { if (c.callback_by) userIds.add(c.callback_by); });
            (callActions || []).forEach(c => { if (c.user_id) userIds.add(c.user_id); });

            let profilesMap: Record<string, string> = {};
            if (userIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, first_name, last_name')
                    .in('id', Array.from(userIds));
                if (profiles) {
                    profilesMap = profiles.reduce((acc, p) => ({
                        ...acc,
                        [p.id]: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Nieznany'
                    }), {});
                }
            }

            const cbMap: Record<string, CallbackInfo> = {};

            // Map call_log callbacks
            (callLogCallbacks || []).forEach(c => {
                if (c.ringostat_id && c.callback_by) {
                    cbMap[c.ringostat_id] = {
                        id: c.ringostat_id,
                        ringostat_id: c.ringostat_id,
                        user_id: c.callback_by,
                        callback_at: c.callback_at,
                        created_at: c.callback_at || '',
                        user_name: profilesMap[c.callback_by] || 'Nieznany'
                    };
                }
            });

            // Map legacy call_actions (fallback)
            (callActions || []).forEach(a => {
                if (a.call_id && !cbMap[a.call_id]) {
                    cbMap[a.call_id] = {
                        id: a.id,
                        call_id: a.call_id,
                        user_id: a.user_id,
                        created_at: a.created_at,
                        user_name: profilesMap[a.user_id] || 'Nieznany'
                    };
                }
            });

            setCallbacks(cbMap);
        } catch (err) {
            console.error('Error fetching callbacks:', err);
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

    const handleSync = useCallback(async () => {
        setSyncing(true);
        try {
            const { dateFrom, dateTo } = getDateRange();
            const response = await fetch(`/api/ringostat-calls?date_from=${dateFrom}&date_to=${dateTo}&sync=true`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            if (data.sync) {
                toast.success(`Zsynchronizowano ${data.sync.synced} połączeń, ${data.sync.matched} dopasowanych do klientów`);
            }
            setStats(data);
            fetchCallbacks(); // Refresh callbacks after sync
        } catch (err: unknown) {
            toast.error('Błąd synchronizacji');
        } finally {
            setSyncing(false);
        }
    }, [getDateRange, fetchCallbacks]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([fetchStats(), fetchCustomers(), fetchCallbacks(), fetchUsers()]);
        } finally {
            setLoading(false);
        }
    }, [fetchStats, fetchCustomers, fetchCallbacks, fetchUsers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Callback handler ---
    const handleCallback = async (callId: string) => {
        if (!currentUser) return;
        try {
            // Update call_log table
            const { error: callLogError } = await supabase
                .from('call_log')
                .update({
                    callback_by: currentUser.id,
                    callback_at: new Date().toISOString()
                })
                .eq('ringostat_id', callId);

            if (callLogError) {
                console.warn('call_log update failed (may not exist yet):', callLogError.message);
            }

            // Also insert into call_actions (legacy compatibility)
            await supabase.from('call_actions').insert({
                call_id: callId,
                customer_id: null,
                user_id: currentUser.id,
                action_type: 'callback'
            }).then(() => { }, () => { }); // Ignore errors on legacy table

            toast.success('Oznaczono jako oddzwonione');
            fetchCallbacks();
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
        return users.find(u => u.phone && u.phone.endsWith(extension));
    }, [users]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    // --- Data Processing ---
    const allCalls = (stats?.calls || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const filteredCalls = allCalls;
    const missedCallsQueue = allCalls.filter(call => call.status === 'missed' && call.direction === 'incoming' && !callbacks[call.id]);

    // Group stats by consultant
    const consultantStats = useMemo(() => {
        const statsMap: Record<string, { name: string; total: number; answered: number; missed: number; extension: string }> = {};
        allCalls.forEach(call => {
            const internalNumber = call.direction === 'outgoing' ? call.caller : call.callee;
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

    // --- Compact View ---
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">📞 Ringostat</h3>
                    <div className="flex items-center gap-2">
                        <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="text-xs border rounded px-2 py-1">
                            <option value="today">Dziś</option>
                            <option value="week">Tydzień</option>
                        </select>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium disabled:opacity-50"
                            title="Synchronizuj połączenia z bazą danych"
                        >
                            {syncing ? '⟳' : '🔄'} Sync
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {missedCallsQueue.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                            <div className="text-red-700 font-bold text-xs flex justify-between">
                                <span>⚠️ Nieodebrane ({missedCallsQueue.length})</span>
                            </div>
                        </div>
                    )}
                    {filteredCalls.slice(0, 5).map(call => {
                        const cb = callbacks[call.id];
                        const isHandled = call.status === 'answered' || !!cb;
                        return (
                            <div key={call.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                                <span className={call.direction === 'incoming' ? 'text-blue-500' : 'text-orange-500'}>
                                    {call.direction === 'incoming' ? '↙' : '↗'} {call.direction === 'incoming' ? call.caller : call.callee}
                                </span>
                                <span className={isHandled ? 'text-green-500 font-medium' : 'text-red-500 font-bold'}>
                                    {call.status === 'answered'
                                        ? 'Odebrane'
                                        : (cb ? `✓ ${cb.user_name}` : 'Nieodebrane')}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => setShowDetails(true)} className="w-full py-2 text-xs text-accent font-bold mt-2">Pełny Raport →</button>
            </div>
        );
    }

    // --- Full Admin View ---
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px] relative overflow-hidden group">
            {/* Decorative element like WalletWidget */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Centrum Połączeń
                            {loading && <span className="animate-spin ml-2 text-blue-500">⟳</span>}
                        </h2>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('calls')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'calls'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Lista Połączeń
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'team'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Wyniki Zespołu
                        </button>
                        <button
                            onClick={() => setActiveTab('missed')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'missed'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            <span>Do Oddzwonienia</span>
                            {missedCallsQueue.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                                    {missedCallsQueue.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as any)}
                        className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white font-medium text-slate-700 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                        <option value="today">📅 Dziś</option>
                        <option value="week">📊 7 dni</option>
                        <option value="month">📈 30 dni</option>
                    </select>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        title="Synchronizuj połączenia do bazy danych i dopasuj do klientów"
                    >
                        {syncing ? <span className="animate-spin">⟳</span> : '🔄'}
                        <span>{syncing ? 'Synchronizacja...' : 'Sync'}</span>
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                        title="Odśwież"
                    >
                        <span className="text-xl">🔄</span>
                    </button>
                </div>
            </div>

            {/* Sync info badge */}
            {stats?.sync && (
                <div className="mx-6 mt-3 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800 flex items-center gap-3">
                    <span className="text-lg">✅</span>
                    <div>
                        <strong>Zsynchronizowano:</strong> {stats.sync.synced} nowych połączeń,{' '}
                        {stats.sync.matched} dopasowanych do klientów,{' '}
                        {stats.sync.communications_created} wpisów komunikacji
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 bg-white rounded-b-2xl">
                {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}


                {/* View: Calls List */}
                {activeTab === 'calls' && (
                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
                        <table className="w-full text-sm min-w-[1200px]">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 font-semibold">
                                <tr>
                                    <th className="p-4 text-left border-b-2 border-slate-200 whitespace-nowrap">⏰ Czas</th>
                                    <th className="p-4 text-left border-b-2 border-slate-200 whitespace-nowrap">↔️ Kierunek</th>
                                    <th className="p-4 text-left border-b-2 border-slate-200 whitespace-nowrap">👤 Klient</th>
                                    <th className="p-4 text-left border-b-2 border-slate-200 whitespace-nowrap">💼 Konsultant</th>
                                    <th className="p-4 text-center border-b-2 border-slate-200 whitespace-nowrap">📊 Status</th>
                                    <th className="p-4 text-center border-b-2 border-slate-200 whitespace-nowrap">⏱️ Czas trwania</th>
                                    <th className="p-4 text-right border-b-2 border-slate-200 whitespace-nowrap">⚡ Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCalls.map(call => {
                                    const match = getCustomerMatch(call.direction === 'outgoing' ? call.callee : call.caller);
                                    const clientNum = call.direction === 'outgoing' ? call.callee : call.caller;
                                    const internalNum = call.direction === 'outgoing' ? call.caller : call.callee;
                                    const internalUser = getUserForExtension(internalNum);
                                    const isMissed = call.status === 'missed';
                                    const cb = callbacks[call.id];

                                    return (
                                        <tr key={call.id} className={`hover:bg-blue-50/30 transition-all duration-150 border-b border-slate-100 ${isMissed && !cb ? 'bg-red-50/50 hover:bg-red-50/70' : 'hover:shadow-sm'}`}>
                                            <td className="p-4 whitespace-nowrap text-slate-600 font-medium">{formatDate(call.date)}</td>
                                            <td className="p-4">
                                                <span className={`flex items-center gap-2 font-semibold px-3 py-1.5 rounded-lg ${call.direction === 'incoming' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                    {call.direction === 'incoming' ? '↙ Przychodzące' : '↗ Wychodzące'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {match ? (
                                                    <Link to={`/customers/${match.customer.id}`} className="font-bold text-slate-800 hover:text-blue-600 hover:underline flex items-center gap-2 group">
                                                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-sm group-hover:shadow-md transition-all">
                                                            {match.customer.firstName[0]}{match.customer.lastName[0]}
                                                        </span>
                                                        {match.customer.firstName} {match.customer.lastName}
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">{clientNum}</span>
                                                        <Link
                                                            to={`/customers/new?phone=${clientNum}`}
                                                            className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center hover:scale-110 transition-all font-bold text-sm shadow-sm hover:shadow-md"
                                                            title="Dodaj do bazy"
                                                        >
                                                            +
                                                        </Link>
                                                    </div>
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
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${isMissed ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'}`}>
                                                    {isMissed ? '❌ Nieodebrane' : '✅ Odebrane'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-lg font-semibold">
                                                    {call.duration > 0 ? formatDuration(call.duration) : '—'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Recording player */}
                                                    {call.recording && (
                                                        <button
                                                            onClick={() => setPlayingRecording(playingRecording === call.id ? null : call.id)}
                                                            className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg hover:from-purple-600 hover:to-pink-600 font-bold shadow-sm hover:shadow-md transition-all"
                                                            title="Odtwórz nagranie"
                                                        >
                                                            {playingRecording === call.id ? '⏹ Stop' : '▶ Nagranie'}
                                                        </button>
                                                    )}
                                                    {/* Callback button */}
                                                    {isMissed && !cb && call.direction === 'incoming' && (
                                                        <button
                                                            onClick={() => handleCallback(call.id)}
                                                            className="text-xs bg-gradient-to-r from-red-500 to-rose-500 text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-rose-600 font-bold shadow-sm hover:shadow-md transition-all animate-pulse"
                                                        >
                                                            📞 Oddzwoń
                                                        </button>
                                                    )}
                                                    {/* Callback info */}
                                                    {cb && (
                                                        <span
                                                            className="text-xs text-green-600 font-bold cursor-help border-b border-dotted border-green-600"
                                                            title={`Oddzwonił: ${cb.user_name}\nData: ${cb.callback_at ? new Date(cb.callback_at).toLocaleString('pl-PL') : new Date(cb.created_at).toLocaleString('pl-PL')}`}
                                                        >
                                                            ✓ {cb.user_name}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Inline audio player */}
                                                {playingRecording === call.id && call.recording && (
                                                    <div className="mt-2">
                                                        <audio controls autoPlay className="w-full h-8" style={{ maxWidth: 250 }}>
                                                            <source src={call.recording} />
                                                        </audio>
                                                    </div>
                                                )}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {consultantStats.map(stat => (
                            <div key={stat.extension} className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:scale-105">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                                        {stat.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg">{stat.name}</div>
                                        <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">Ext: {stat.extension}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200">
                                        <div className="font-bold text-slate-800 text-xl">{stat.total}</div>
                                        <div className="text-[10px] text-slate-500 font-semibold mt-1">Razem</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                                        <div className="font-bold text-green-700 text-xl">{stat.answered}</div>
                                        <div className="text-[10px] text-green-600 font-semibold mt-1">Odebrane</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 border border-red-200">
                                        <div className="font-bold text-red-700 text-xl">{stat.missed}</div>
                                        <div className="text-[10px] text-red-600 font-semibold mt-1">Nieodebrane</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500" style={{ width: `${stat.total ? (stat.answered / stat.total) * 100 : 0}%` }} />
                                    </div>
                                    <div className="text-xs text-center mt-2 font-semibold text-slate-600">
                                        {stat.total ? Math.round((stat.answered / stat.total) * 100) : 0}% skuteczności
                                    </div>
                                </div>
                            </div>
                        ))}
                        {consultantStats.length === 0 && (
                            <div className="col-span-full text-center py-16">
                                <div className="text-6xl mb-4">📊</div>
                                <div className="text-slate-400 text-lg">Brak danych dla wybranego okresu</div>
                            </div>
                        )}
                    </div>
                )}

                {/* View: Missed Queue */}
                {activeTab === 'missed' && (
                    <div className="space-y-6">
                        <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl text-orange-900 text-sm flex items-start gap-4 shadow-sm">
                            <div className="text-3xl">⚠️</div>
                            <div>
                                <div className="font-bold text-lg mb-1">Kolejka połączeń nieodebranych</div>
                                <p className="text-orange-800">Połączenia przychodzące, na które nikt jeszcze nie oddzwonił. Kliknij "Oddzwoń" aby oznaczyć jako obsłużone.</p>
                            </div>
                        </div>

                        {missedCallsQueue.length > 0 ? (
                            <div className="grid gap-3">
                                {missedCallsQueue.map(call => {
                                    const match = getCustomerMatch(call.caller);
                                    return (
                                        <div key={call.id} className="bg-white border-2 border-red-200 shadow-md rounded-2xl p-4 flex items-center justify-between hover:bg-red-50/50 hover:border-red-300 transition-all hover:shadow-lg">
                                            <div className="flex items-center gap-5">
                                                <div className="text-red-600 font-bold whitespace-nowrap bg-red-50 px-3 py-2 rounded-lg">{formatDate(call.date)}</div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-xl flex items-center gap-2">
                                                        {match ? (
                                                            <>
                                                                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                                                                    {match.customer.firstName[0]}{match.customer.lastName[0]}
                                                                </span>
                                                                {match.customer.firstName} {match.customer.lastName}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="w-10 h-10 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xl">📞</span>
                                                                {call.caller}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        {match && <span className="font-mono mr-2 bg-slate-100 px-2 py-0.5 rounded">{call.caller}</span>}
                                                        Dzwonił na: <span className="font-mono bg-blue-50 px-2 py-0.5 rounded text-blue-700">{call.callee}</span>
                                                    </div>
                                                    {!match && (
                                                        <Link to={`/customers/new?phone=${call.caller}`} className="text-green-600 text-sm font-bold hover:underline mt-2 inline-flex items-center gap-1">
                                                            <span className="text-lg">+</span> Dodaj klienta
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCallback(call.id)}
                                                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-lg transform hover:scale-105 active:scale-95"
                                            >
                                                <span>📞</span> Oddzwoń
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                                <div className="text-7xl mb-4 animate-bounce">🎉</div>
                                <div className="text-2xl font-bold text-green-700 mb-2">Świetna robota!</div>
                                <div className="text-green-600">Wszystkie połączenia obsłużone!</div>
                            </div>
                        )}

                        {/* Show recently handled callbacks */}
                        {Object.keys(callbacks).length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-slate-500 mb-3">Ostatnio oddzwonione</h3>
                                <div className="space-y-1">
                                    {allCalls
                                        .filter(c => c.status === 'missed' && c.direction === 'incoming' && callbacks[c.id])
                                        .slice(0, 10)
                                        .map(call => {
                                            const cb = callbacks[call.id];
                                            const match = getCustomerMatch(call.caller);
                                            return (
                                                <div key={call.id} className="flex items-center justify-between text-sm py-2 px-3 bg-green-50/50 rounded-lg border border-green-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-green-600">✓</span>
                                                        <span className="text-slate-600">{formatDate(call.date)}</span>
                                                        <span className="font-medium text-slate-800">
                                                            {match ? `${match.customer.firstName} ${match.customer.lastName}` : call.caller}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-green-700 font-medium">
                                                        Oddzwonił: <strong>{cb.user_name}</strong>
                                                        {cb.callback_at && (
                                                            <span className="ml-1 text-slate-400">
                                                                ({new Date(cb.callback_at).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit' })})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
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
};
