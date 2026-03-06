/**
 * RingostatWidget - Widget do wyświetlania statystyk połączeń z Ringostat
 * Shows: call list, team stats, missed call queue with callback tracking
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

interface CallRecord {
    id: string;
    date: string;
    duration: number;
    caller: string;
    callee: string;
    status: 'answered' | 'missed';
    direction: 'incoming' | 'outgoing';
    recording?: string;
    disposition?: string;
    internal_extension?: string;
    client_number?: string;
}

interface CallStats {
    total: number;
    answered: number;
    missed: number;
    byNumber: Record<string, { total: number; answered: number; missed: number }>;
    calls: CallRecord[];
    sync?: { synced: number; matched: number; communications_created: number };
    error?: string;
}

interface CallbackInfo {
    id: string;
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
        try { setUsers(await DatabaseService.getAllUsers()); } catch (err) { console.error('Error fetching users:', err); }
    }, []);

    const fetchCustomers = useCallback(async () => {
        try { setCustomers(await DatabaseService.getUniqueCustomers()); } catch (err) { console.error('Error fetching customers:', err); }
    }, []);

    const fetchCallbacks = useCallback(async () => {
        try {
            // Fetch from call_log (synced calls)
            const { data: callLogCbs } = await supabase.from('call_log').select('ringostat_id, callback_by, callback_at').not('callback_by', 'is', null);
            // Fetch from call_actions (primary callback storage)
            const { data: callActions } = await supabase.from('call_actions').select('*').eq('action_type', 'callback');

            const userIds = new Set<string>();
            (callLogCbs || []).forEach(c => { if (c.callback_by) userIds.add(c.callback_by); });
            (callActions || []).forEach(c => { if (c.user_id) userIds.add(c.user_id); });

            let profilesMap: Record<string, string> = {};
            if (userIds.size > 0) {
                const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(userIds));
                if (profErr) console.error('Profile fetch error:', profErr.message);
                if (profiles) {
                    profilesMap = profiles.reduce((acc, p) => ({
                        ...acc,
                        [p.id]: p.full_name || 'Użytkownik'
                    }), {} as Record<string, string>);
                }
            }

            const cbMap: Record<string, CallbackInfo> = {};
            // call_actions is primary — populate first
            (callActions || []).forEach(a => {
                if (a.call_id) {
                    cbMap[a.call_id] = { id: a.id, user_id: a.user_id, created_at: a.created_at, user_name: profilesMap[a.user_id] || 'Użytkownik' };
                }
            });
            // call_log overrides if present (has callback_at timestamp)
            (callLogCbs || []).forEach(c => {
                if (c.ringostat_id && c.callback_by) {
                    cbMap[c.ringostat_id] = { id: c.ringostat_id, user_id: c.callback_by, callback_at: c.callback_at, created_at: c.callback_at || '', user_name: profilesMap[c.callback_by] || 'Użytkownik' };
                }
            });
            setCallbacks(cbMap);
        } catch (err) { console.error('Error fetching callbacks:', err); }
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
            setError(err instanceof Error ? err.message : 'Błąd pobierania danych');
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
            if (data.sync) toast.success(`Zsynchronizowano ${data.sync.synced} połączeń, ${data.sync.matched} dopasowanych`);
            setStats(data);
            fetchCallbacks();
        } catch { toast.error('Błąd synchronizacji'); }
        finally { setSyncing(false); }
    }, [getDateRange, fetchCallbacks]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { await Promise.all([fetchStats(), fetchCustomers(), fetchCallbacks(), fetchUsers()]); }
        finally { setLoading(false); }
    }, [fetchStats, fetchCustomers, fetchCallbacks, fetchUsers]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Callback handler — records who clicked ---
    const handleCallback = async (callId: string) => {
        if (!currentUser) return;
        const now = new Date().toISOString();
        const userName = currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Użytkownik';
        try {
            // Primary storage: call_actions (always works, no dependency on sync)
            const { error: actErr } = await supabase.from('call_actions').insert({
                call_id: callId,
                customer_id: null,
                user_id: currentUser.id,
                action_type: 'callback'
            });
            if (actErr) console.error('call_actions insert error:', actErr.message);

            // Secondary: also try updating call_log if that row exists
            await supabase.from('call_log').update({
                callback_by: currentUser.id,
                callback_at: now
            }).eq('ringostat_id', callId);

            // Instant UI update
            setCallbacks(prev => ({
                ...prev,
                [callId]: { id: callId, user_id: currentUser.id, callback_at: now, created_at: now, user_name: userName }
            }));
            toast.success(`Oddzwonione przez ${userName}`);
        } catch (err) {
            console.error('Callback save error:', err);
            toast.error('Błąd zapisu oddzwonienia');
        }
    };

    // --- Helpers ---
    const normalizePhone = (phone: string | undefined | null) => {
        if (!phone) return '';
        let p = phone.replace(/\D/g, '');
        if (p.startsWith('00')) p = p.substring(2);
        if ((p.startsWith('48') || p.startsWith('49')) && p.length > 9) p = p.substring(2);
        if (p.startsWith('0')) p = p.substring(1);
        return p;
    };

    const getCustomerMatch = (phoneNumber: string) => {
        const n = normalizePhone(phoneNumber);
        if (n.length < 7) return undefined;
        return customers.find(c => {
            const s = normalizePhone(c.customer.phone);
            return s.length >= 7 && (n === s || n.endsWith(s) || s.endsWith(n));
        });
    };

    const getUserForExtension = useCallback((ext: string) => {
        if (!ext || ext.length < 2 || ext.length > 5) return undefined;
        return users.find(u => {
            if (!u.phone) return false;
            const d = u.phone.replace(/\D/g, '');
            return d === ext || d.endsWith(ext);
        });
    }, [users]);

    const formatDate = (d: string) => d ? new Date(d).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
    const formatDuration = (s: number) => { if (!s) return '0s'; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };

    // --- Computed Data ---
    const allCalls = useMemo(() => (stats?.calls || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [stats]);
    const missedQueue = useMemo(() => allCalls.filter(c => c.status === 'missed' && c.direction === 'incoming' && !callbacks[c.id]), [allCalls, callbacks]);

    // Get consultant for a call (the internal person)
    const getCallConsultant = useCallback((call: CallRecord) => {
        const ext = call.internal_extension || (call.direction === 'outgoing' ? call.caller : call.callee);
        return getUserForExtension(ext);
    }, [getUserForExtension]);

    // Team stats
    const teamStats = useMemo(() => {
        const map: Record<string, { name: string; total: number; answered: number; missed: number; ext: string }> = {};
        allCalls.forEach(call => {
            const ext = call.internal_extension;
            if (!ext) return;
            if (!map[ext]) {
                const u = getUserForExtension(ext);
                map[ext] = { name: u ? `${u.firstName} ${u.lastName}` : `Kons. ${ext}`, total: 0, answered: 0, missed: 0, ext };
            }
            map[ext].total++;
            if (call.status === 'answered') map[ext].answered++; else map[ext].missed++;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [allCalls, getUserForExtension]);

    // =============== COMPACT VIEW ===============
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">📞 Ringostat</h3>
                    <div className="flex items-center gap-1.5">
                        <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="text-xs border rounded px-2 py-1">
                            <option value="today">Dziś</option><option value="week">Tydzień</option>
                        </select>
                        <button onClick={handleSync} disabled={syncing} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium disabled:opacity-50">
                            {syncing ? '⟳' : '🔄'}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-slate-800">{stats?.total || 0}</div>
                        <div className="text-[9px] text-slate-500 font-medium">Razem</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-green-700">{stats?.answered || 0}</div>
                        <div className="text-[9px] text-green-600 font-medium">Odebr.</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-red-700">{stats?.missed || 0}</div>
                        <div className="text-[9px] text-red-600 font-medium">Nieodebr.</div>
                    </div>
                </div>
                {missedQueue.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 mb-2">
                        <div className="text-red-700 font-bold text-xs">⚠️ Nieodebrane do oddzw. ({missedQueue.length})</div>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
                    {allCalls.slice(0, 6).map(call => {
                        const cb = callbacks[call.id];
                        const clientNum = call.client_number || (call.direction === 'incoming' ? call.caller : call.callee);
                        const match = getCustomerMatch(clientNum);
                        return (
                            <div key={call.id} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0 gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={call.direction === 'incoming' ? 'text-blue-500' : 'text-orange-500'}>{call.direction === 'incoming' ? '↙' : '↗'}</span>
                                    <span className="truncate text-slate-700">{match ? `${match.customer.firstName} ${match.customer.lastName}` : clientNum}</span>
                                </div>
                                <span className={`shrink-0 ${call.status === 'answered' || cb ? 'text-green-600' : 'text-red-500 font-bold'}`}>
                                    {call.status === 'answered' ? `✅ ${formatDuration(call.duration)}` : cb ? `✓ ${cb.user_name}` : '❌'}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => setShowDetails(true)} className="w-full py-2 text-xs text-blue-600 font-bold mt-2 hover:bg-blue-50 rounded-lg transition-colors">Pełny Raport →</button>
            </div>
        );
    }

    // =============== FULL VIEW ===============
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 space-y-2.5">
                {/* Title + controls */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-800">Centrum Połączeń{loading && <span className="animate-spin ml-1 text-blue-400 text-xs">⟳</span>}</h2>
                    </div>
                    <div className="flex gap-1.5 items-center shrink-0">
                        <select value={dateRange} onChange={e => setDateRange(e.target.value as any)}
                            className="border border-slate-200 rounded-md px-2 py-1 text-[11px] bg-white font-medium text-slate-600 focus:border-blue-400 transition-all">
                            <option value="today">Dziś</option><option value="week">7 dni</option><option value="month">30 dni</option>
                        </select>
                        <button onClick={handleSync} disabled={syncing}
                            className="px-2 py-1 bg-blue-600 text-white rounded-md text-[11px] font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 transition-colors">
                            <svg className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            <span className="hidden sm:inline">Sync</span>
                        </button>
                        <button onClick={fetchData} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-all" title="Odśwież">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-slate-50 rounded-md px-2 py-1.5 text-center border border-slate-100">
                        <div className="text-base font-bold text-slate-800">{stats?.total || 0}</div>
                        <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Razem</div>
                    </div>
                    <div className="bg-emerald-50 rounded-md px-2 py-1.5 text-center border border-emerald-100">
                        <div className="text-base font-bold text-emerald-700">{stats?.answered || 0}</div>
                        <div className="text-[8px] text-emerald-500 font-semibold uppercase tracking-wider">Odebrane</div>
                    </div>
                    <div className="bg-rose-50 rounded-md px-2 py-1.5 text-center border border-rose-100">
                        <div className="text-base font-bold text-rose-700">{stats?.missed || 0}</div>
                        <div className="text-[8px] text-rose-500 font-semibold uppercase tracking-wider">Nieodebrane</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-0.5 rounded-md">
                    {[
                        { key: 'calls' as const, icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>, label: 'Lista' },
                        { key: 'team' as const, icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Zespół' },
                        { key: 'missed' as const, icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, label: 'Oddzw.', badge: missedQueue.length },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab.icon} {tab.label}
                            {tab.badge ? <span className="bg-rose-500 text-white text-[8px] px-1 rounded-full min-w-[14px] text-center leading-[14px]">{tab.badge}</span> : null}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sync badge */}
            {stats?.sync && (
                <div className="mx-3 mt-2 p-1.5 bg-emerald-50 border border-emerald-100 rounded-md text-[11px] text-emerald-800 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span><strong>Sync:</strong> {stats.sync.synced} nowych, {stats.sync.matched} dopasowanych</span>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 max-h-[520px]">
                {error && <div className="p-2 mb-2 bg-rose-50 text-rose-600 rounded-md text-[11px]">{error}</div>}

                {/* ===== CALLS LIST ===== */}
                {activeTab === 'calls' && (
                    <div className="overflow-auto rounded-lg border border-slate-200 max-h-[440px]">
                        <table className="w-full text-[11px] min-w-[580px]">
                            <thead className="bg-slate-50/80 sticky top-0 z-10">
                                <tr className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">
                                    <th className="px-2 py-2 text-left border-b border-slate-200">Czas</th>
                                    <th className="px-2 py-2 text-left border-b border-slate-200">Nr klienta</th>
                                    <th className="px-2 py-2 text-left border-b border-slate-200">Nasz nr</th>
                                    <th className="px-2 py-2 text-left border-b border-slate-200">Klient</th>
                                    <th className="px-2 py-2 text-center border-b border-slate-200">Status</th>
                                    <th className="px-2 py-2 text-right border-b border-slate-200">Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allCalls.map(call => {
                                    // Consistent: always show client number and our internal number in proper columns
                                    const clientNum = call.client_number || (call.direction === 'outgoing' ? call.callee : call.caller);
                                    const internalNum = call.internal_extension || (call.direction === 'outgoing' ? call.caller : call.callee);
                                    const match = getCustomerMatch(clientNum);
                                    const consultant = getCallConsultant(call);
                                    // Smart status: if there's a recording AND duration, it was answered
                                    const isMissed = call.status === 'missed' && !(call.recording && call.duration > 0);
                                    const cb = callbacks[call.id];
                                    const dirColor = call.direction === 'incoming' ? 'text-blue-500' : 'text-amber-500';
                                    const dirArrow = call.direction === 'incoming' ? '↙' : '↗';

                                    return (
                                        <tr key={call.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${isMissed && !cb ? 'bg-rose-50/40' : ''}`}>
                                            {/* Time + direction */}
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <span className={`${dirColor} text-xs font-bold`}>{dirArrow}</span>
                                                    <span className="text-slate-500">{formatDate(call.date)}</span>
                                                </div>
                                            </td>
                                            {/* Client number — always the external/client number */}
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <span className="font-mono text-slate-700">{clientNum || '—'}</span>
                                            </td>
                                            {/* Our number — always the internal/company number */}
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <span className="font-mono text-slate-400">{internalNum || '—'}</span>
                                            </td>
                                            {/* Client match */}
                                            <td className="px-2 py-1.5">
                                                {match ? (
                                                    <Link to={`/customers/${match.customer.id}`} className="font-semibold text-slate-800 hover:text-blue-600 flex items-center gap-1">
                                                        <span className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-[7px] font-bold shrink-0">
                                                            {match.customer.firstName[0]}{match.customer.lastName[0]}
                                                        </span>
                                                        <span className="truncate max-w-[100px]">{match.customer.firstName} {match.customer.lastName}</span>
                                                    </Link>
                                                ) : consultant ? (
                                                    <span className="text-slate-500">{consultant.firstName} {consultant.lastName}</span>
                                                ) : (
                                                    <Link to={`/customers/new?phone=${clientNum}`}
                                                        className="text-slate-400 hover:text-green-600 flex items-center gap-1 transition-colors" title="Dodaj do bazy">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                                        <span className="text-[10px]">Dodaj</span>
                                                    </Link>
                                                )}
                                            </td>
                                            {/* Status + Duration */}
                                            <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                                {isMissed ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Nieodebr.
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{call.duration > 0 ? formatDuration(call.duration) : 'Odebr.'}
                                                    </span>
                                                )}
                                            </td>
                                            {/* Actions */}
                                            <td className="px-2 py-1.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {call.recording && (
                                                        <button onClick={() => setPlayingRecording(playingRecording === call.id ? null : call.id)}
                                                            className="text-[10px] bg-slate-700 text-white w-5 h-5 rounded flex items-center justify-center hover:bg-slate-800 transition-colors">
                                                            {playingRecording === call.id ? <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg> : <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                                        </button>
                                                    )}
                                                    {isMissed && !cb && call.direction === 'incoming' && (
                                                        <button onClick={() => handleCallback(call.id)}
                                                            className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded hover:bg-rose-700 font-semibold transition-colors flex items-center gap-0.5">
                                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                            Oddzwoń
                                                        </button>
                                                    )}
                                                    {cb && (
                                                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                                                            title={`Oddzwonił: ${cb.user_name}\n${cb.callback_at ? new Date(cb.callback_at).toLocaleString('pl-PL') : ''}`}>
                                                            <span className="inline-flex items-center gap-0.5"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{cb.user_name}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {playingRecording === call.id && call.recording && (
                                                    <audio controls autoPlay className="w-full h-6 mt-1" style={{ maxWidth: 150 }}><source src={call.recording} /></audio>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {allCalls.length === 0 && <div className="text-center py-8 text-slate-400 text-xs">Brak połączeń w wybranym okresie</div>}
                    </div>
                )}

                {/* ===== TEAM STATS ===== */}
                {activeTab === 'team' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teamStats.map(stat => (
                            <div key={stat.ext} className="bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:border-blue-200 transition-all">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                        {stat.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-800 text-sm truncate">{stat.name}</div>
                                        <div className="text-[9px] text-slate-400 font-mono">ext. {stat.ext}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-2.5">
                                    <div className="bg-slate-50 rounded-lg p-1.5"><div className="font-bold text-slate-800 text-base">{stat.total}</div><div className="text-[8px] text-slate-500 font-semibold">Razem</div></div>
                                    <div className="bg-green-50 rounded-lg p-1.5"><div className="font-bold text-green-700 text-base">{stat.answered}</div><div className="text-[8px] text-green-600 font-semibold">Odebr.</div></div>
                                    <div className="bg-red-50 rounded-lg p-1.5"><div className="font-bold text-red-700 text-base">{stat.missed}</div><div className="text-[8px] text-red-600 font-semibold">Nieodebr.</div></div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500" style={{ width: `${stat.total ? (stat.answered / stat.total) * 100 : 0}%` }} />
                                </div>
                                <div className="text-[9px] text-center mt-1 font-semibold text-slate-400">{stat.total ? Math.round((stat.answered / stat.total) * 100) : 0}% skuteczność</div>
                            </div>
                        ))}
                        {teamStats.length === 0 && <div className="col-span-full text-center py-8"><svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg><div className="text-slate-400 text-xs">Brak danych</div></div>}
                    </div>
                )}

                {/* ===== MISSED QUEUE ===== */}
                {activeTab === 'missed' && (
                    <div className="space-y-3">
                        <div className="p-2.5 bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start gap-2">
                            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                            <div>
                                <div className="font-bold text-xs mb-0.5">Kolejka nieodebranych</div>
                                <p className="text-amber-800">Kliknij „Oddzwoń" — Twoje imię zostanie zapisane przy połączeniu.</p>
                            </div>
                        </div>

                        {missedQueue.length > 0 ? (
                            <div className="space-y-2">
                                {missedQueue.map(call => {
                                    const match = getCustomerMatch(call.caller);
                                    return (
                                        <div key={call.id} className="bg-white border border-red-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-red-50/30 transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="text-red-600 font-bold whitespace-nowrap bg-red-50 px-2 py-1 rounded text-xs">{formatDate(call.date)}</div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 truncate">
                                                        {match ? `${match.customer.firstName} ${match.customer.lastName}` : call.caller}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Od: <span className="font-mono">{call.caller}</span> → Na: <span className="font-mono">{call.callee}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleCallback(call.id)}
                                                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 shadow-sm transition-all flex items-center justify-center gap-1 text-xs shrink-0 active:scale-95">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> Oddzwoń
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                                <svg className="w-10 h-10 mx-auto mb-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div className="text-sm font-bold text-emerald-700">Świetna robota!</div>
                                <div className="text-emerald-600 text-xs">Wszystkie połączenia obsłużone</div>
                            </div>
                        )}

                        {/* Recently called back — shows who handled it */}
                        {allCalls.filter(c => c.status === 'missed' && c.direction === 'incoming' && callbacks[c.id]).length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1"><svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Ostatnio oddzwonione</h3>
                                <div className="space-y-1">
                                    {allCalls.filter(c => c.status === 'missed' && c.direction === 'incoming' && callbacks[c.id]).slice(0, 10).map(call => {
                                        const cb = callbacks[call.id];
                                        const match = getCustomerMatch(call.caller);
                                        return (
                                            <div key={call.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-2 px-3 bg-green-50/50 rounded-lg border border-green-100 gap-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    <span className="text-slate-500 whitespace-nowrap">{formatDate(call.date)}</span>
                                                    <span className="font-medium text-slate-800 truncate">{match ? `${match.customer.firstName} ${match.customer.lastName}` : call.caller}</span>
                                                </div>
                                                <div className="text-green-700 font-bold pl-5 sm:pl-0 flex items-center gap-1 shrink-0">
                                                    <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px] font-bold">
                                                        {cb.user_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                    </span>
                                                    {cb.user_name}
                                                    {cb.callback_at && <span className="text-slate-400 font-normal ml-1">{new Date(cb.callback_at).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>}
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

            {/* Detail modal from compact view */}
            {showDetails && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-3 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-base">Raport Połączeń</h2>
                            <button onClick={() => setShowDetails(false)} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:bg-slate-100 text-sm">✕</button>
                        </div>
                        <div className="flex-1 overflow-auto"><RingostatWidget compact={false} /></div>
                    </div>
                </div>
            )}
        </div>
    );
};
