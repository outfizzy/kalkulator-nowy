import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import { supabase } from '../../lib/supabase';
import type { FuelLog, User } from '../../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FuelPriceService } from '../../services/fuel-price.service';
import { UserService } from '../../services/database/user.service';
import { v4 as uuidv4 } from 'uuid';

// ── Helpers ──
interface FuelPrice { valid_from: string; valid_to: string | null; price_per_liter: number; }

function calcLogCost(log: FuelLog, prices: FuelPrice[]): number {
    const explicit = log.cost ?? (log as any).netCost ?? (log as any).net_cost ?? 0;
    if (explicit > 0) return explicit;
    if (log.liters > 0 && log.fuelingType === 'internal') {
        const price = FuelPriceService.getPriceForDateFromList(log.logDate, prices);
        if (price) return log.liters * price;
    }
    return 0;
}

// ── Tab type ──
type TabId = 'stats' | 'logs' | 'history';

export const FuelLogManager: React.FC = () => {
    const [logs, setLogs] = useState<FuelLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'installer' | 'sales_rep'>('all');
    const [activeTab, setActiveTab] = useState<TabId>('stats');
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);

    // ── Add Fuel Modal State ──
    const [showAddModal, setShowAddModal] = useState(false);
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editLiters, setEditLiters] = useState<number>(0);
    const [addFuelingType, setAddFuelingType] = useState<'internal' | 'external'>('external');
    const [addUserId, setAddUserId] = useState('');
    const [addLiters, setAddLiters] = useState<number | ''>('');
    const [addCost, setAddCost] = useState<number | ''>('');
    const [addCurrency, setAddCurrency] = useState<'PLN' | 'EUR'>('PLN');
    const [addVehiclePlate, setAddVehiclePlate] = useState('');
    const [addLogDate, setAddLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<{ liters?: number; cost?: number; currency?: string; stationName?: string } | null>(null);
    const receiptInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [data, prices] = await Promise.all([
                    DatabaseService.getFuelLogs(),
                    FuelPriceService.getAllPricesSorted()
                ]);
                setLogs(data);
                setFuelPrices(prices);
            } catch (error) {
                console.error('Error loading fuel logs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Load sales reps for the modal
    useEffect(() => {
        UserService.getSalesReps().then(setSalesReps).catch(console.error);
    }, []);

    // ── Receipt upload + AI analysis ──
    const handleReceiptFile = useCallback(async (file: File) => {
        setReceiptFile(file);
        const url = URL.createObjectURL(file);
        setReceiptPreview(url);
        setAiResult(null);

        // Try AI analysis
        setAiAnalyzing(true);
        try {
            const base64 = await fileToBase64(file);
            const { data, error } = await supabase.functions.invoke('analyze-receipt', {
                body: { image: base64, mimeType: file.type }
            });
            if (!error && data) {
                setAiResult(data);
                // Auto-fill form fields if AI found values
                if (data.liters && !addLiters) setAddLiters(data.liters);
                if (data.cost && !addCost) setAddCost(data.cost);
                if (data.currency) setAddCurrency(data.currency === 'EUR' ? 'EUR' : 'PLN');
                toast.success('🤖 AI przeanalizowało paragon!');
            }
        } catch (err) {
            console.warn('AI receipt analysis not available:', err);
            // Not critical — user can fill manually
        } finally {
            setAiAnalyzing(false);
        }
    }, [addLiters, addCost]);

    // ── Submit new fuel log ──
    const handleSubmitFuel = async () => {
        if (!addUserId) { toast.error('Wybierz przedstawiciela handlowego'); return; }
        if (!addLiters || addLiters <= 0) { toast.error('Podaj ilość litrów'); return; }
        if (addFuelingType === 'external' && (!addCost || addCost <= 0)) { toast.error('Podaj kwotę tankowania'); return; }

        setAddSubmitting(true);
        try {
            // Upload receipt photo if exists
            let receiptUrl: string | undefined;
            if (receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `receipts/${fileName}`;
                const { error: uploadErr } = await supabase.storage.from('fuel-logs').upload(filePath, receiptFile);
                if (uploadErr) throw uploadErr;
                const { data: urlData } = supabase.storage.from('fuel-logs').getPublicUrl(filePath);
                receiptUrl = urlData.publicUrl;
            }

            const { error } = await DatabaseService.createFuelLog({
                userId: addUserId,
                type: 'sales_rep',
                fuelingType: addFuelingType,
                liters: Number(addLiters),
                cost: addFuelingType === 'external' ? Number(addCost) : undefined,
                currency: addFuelingType === 'external' ? addCurrency : 'PLN',
                vehiclePlate: addVehiclePlate || undefined,
                receiptPhotoUrl: receiptUrl,
                logDate: addLogDate,
            });

            if (error) throw error;

            toast.success(`Tankowanie ${addFuelingType === 'internal' ? 'wewnętrzne' : 'zewnętrzne'} zapisane!`);
            // Refresh data
            const data = await DatabaseService.getFuelLogs();
            setLogs(data);
            // Reset modal
            resetAddModal();
        } catch (err) {
            console.error('Error creating fuel log:', err);
            toast.error('Błąd zapisu tankowania');
        } finally {
            setAddSubmitting(false);
        }
    };

    const resetAddModal = () => {
        setShowAddModal(false);
        setAddFuelingType('external');
        setAddUserId('');
        setAddLiters('');
        setAddCost('');
        setAddCurrency('PLN');
        setAddVehiclePlate('');
        setAddLogDate(new Date().toISOString().split('T')[0]);
        setReceiptFile(null);
        setReceiptPreview(null);
        setAiResult(null);
    };

    // ── Filtered logs by role ──
    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.type === filter;
    });

    // ── Month-filtered logs ──
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthLogs = useMemo(() =>
        filteredLogs.filter(log => {
            const d = new Date(log.logDate);
            return d >= monthStart && d <= monthEnd;
        }),
        [filteredLogs, monthStart.getTime(), monthEnd.getTime()]
    );

    // ── Monthly Summary Stats ──
    const monthlyStats = useMemo(() => {
        let totalLiters = 0;
        let totalCost = 0;
        let internalCount = 0;
        let externalCount = 0;
        let salesRepLiters = 0;
        let salesRepCost = 0;
        let installerLiters = 0;
        let installerCost = 0;

        for (const log of monthLogs) {
            const cost = calcLogCost(log, fuelPrices);
            totalLiters += log.liters;
            totalCost += cost;
            if (log.fuelingType === 'internal') internalCount++;
            else externalCount++;

            if (log.type === 'sales_rep') {
                salesRepLiters += log.liters;
                salesRepCost += cost;
            } else {
                installerLiters += log.liters;
                installerCost += cost;
            }
        }

        return {
            totalLiters, totalCost,
            internalCount, externalCount, totalCount: monthLogs.length,
            salesRepLiters, salesRepCost,
            installerLiters, installerCost
        };
    }, [monthLogs, fuelPrices]);

    // ── Per-User / Per-Vehicle Stats ──
    const userStats = useMemo(() => {
        const map = new Map<string, {
            key: string;
            name: string;
            isVehicle: boolean;
            type: string;
            liters: number;
            cost: number;
            count: number;
            vehicles: Set<string>;
        }>();

        for (const log of monthLogs) {
            const userName = log.userName && log.userName !== 'Nieznany' ? log.userName : null;
            const key = userName || log.vehiclePlate || 'unknown';
            const isVehicle = !userName;

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    name: userName || log.vehiclePlate || 'Brak danych',
                    isVehicle,
                    type: log.type,
                    liters: 0,
                    cost: 0,
                    count: 0,
                    vehicles: new Set<string>()
                });
            }

            const entry = map.get(key)!;
            const cost = calcLogCost(log, fuelPrices);
            entry.liters += log.liters;
            entry.cost += cost;
            entry.count += 1;
            if (log.vehiclePlate) entry.vehicles.add(log.vehiclePlate);
        }

        return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    }, [monthLogs, fuelPrices]);

    // ── Per-Vehicle Stats ──
    const vehicleStats = useMemo(() => {
        const map = new Map<string, {
            plate: string;
            liters: number;
            cost: number;
            count: number;
            users: Set<string>;
        }>();

        for (const log of monthLogs) {
            const plate = log.vehiclePlate || 'Brak tablicy';
            if (!map.has(plate)) {
                map.set(plate, { plate, liters: 0, cost: 0, count: 0, users: new Set() });
            }
            const entry = map.get(plate)!;
            const cost = calcLogCost(log, fuelPrices);
            entry.liters += log.liters;
            entry.cost += cost;
            entry.count += 1;
            if (log.userName && log.userName !== 'Nieznany') entry.users.add(log.userName);
        }

        return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    }, [monthLogs, fuelPrices]);

    const handleDelete = async (logId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;
        try {
            const { error } = await supabase
                .from('fuel_logs')
                .delete()
                .eq('id', logId);
            if (error) throw error;
            toast.success('Wpis usunięty');
            const data = await DatabaseService.getFuelLogs();
            setLogs(data);
        } catch (error) {
            console.error('Error deleting log:', error);
            toast.error('Błąd usuwania wpisu');
        }
    };

    const handleStartEdit = (log: FuelLog) => {
        setEditingLogId(log.id);
        setEditLiters(log.liters);
    };

    const handleSaveLiters = async (logId: string) => {
        if (editLiters <= 0) { toast.error('Litry muszą być większe od 0'); return; }
        try {
            const { error } = await supabase
                .from('fuel_logs')
                .update({ liters: editLiters })
                .eq('id', logId);
            if (error) throw error;
            toast.success('Litry zaktualizowane');
            setEditingLogId(null);
            const data = await DatabaseService.getFuelLogs();
            setLogs(data);
        } catch (error) {
            console.error('Error updating liters:', error);
            toast.error('Błąd aktualizacji');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    // Currency display helper
    const formatCost = (cost: number, currency?: string) => {
        const sym = currency === 'EUR' ? '€' : 'zł';
        return `${cost.toFixed(2)} ${sym}`;
    };

    return (
        <div className="space-y-6 p-6">
            {/* ── Header ── */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">⛽ Rejestr Paliwowy</h1>
                    <p className="text-slate-500 text-sm">Przegląd zużycia paliwa przez pracowników</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Dodaj Tankowanie
                    </button>
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
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Wszyscy</option>
                        <option value="installer">Montażyści</option>
                        <option value="sales_rep">Sprzedawcy</option>
                    </select>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                {([
                    { id: 'stats' as TabId, label: '📊 Statystyki', icon: '' },
                    { id: 'logs' as TabId, label: '📋 Lista wpisów', icon: '' },
                    { id: 'history' as TabId, label: '🕐 Historia tankowania', icon: '' },
                ]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white shadow-sm text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ━━━ TAB: STATS ━━━ */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    {/* Month Selector */}
                    <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 w-fit">
                        <button
                            onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-lg font-bold text-slate-800 min-w-[160px] text-center capitalize">
                            {format(selectedMonth, 'LLLL yyyy', { locale: pl })}
                        </span>
                        <button
                            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <button
                            onClick={() => setSelectedMonth(new Date())}
                            className="ml-2 px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                        >
                            Dziś
                        </button>
                    </div>

                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-5 text-white">
                            <div className="text-xs font-bold uppercase opacity-70">Łącznie</div>
                            <div className="text-2xl font-black mt-1">{monthlyStats.totalLiters.toFixed(1)} L</div>
                            <div className="text-lg font-bold opacity-90">{monthlyStats.totalCost.toFixed(2)} zł</div>
                            <div className="text-xs opacity-60 mt-2">{monthlyStats.totalCount} tankowań</div>
                        </div>
                        {/* Sales Reps */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                            <div className="text-xs font-bold uppercase opacity-70">🧑‍💼 Przedstawiciele</div>
                            <div className="text-2xl font-black mt-1">{monthlyStats.salesRepLiters.toFixed(1)} L</div>
                            <div className="text-lg font-bold opacity-90">{monthlyStats.salesRepCost.toFixed(2)} zł</div>
                            <div className="text-xs opacity-60 mt-2">
                                {userStats.filter(u => u.type === 'sales_rep').length} os.
                            </div>
                        </div>
                        {/* Installers */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                            <div className="text-xs font-bold uppercase opacity-70">🔧 Montażyści</div>
                            <div className="text-2xl font-black mt-1">{monthlyStats.installerLiters.toFixed(1)} L</div>
                            <div className="text-lg font-bold opacity-90">{monthlyStats.installerCost.toFixed(2)} zł</div>
                            <div className="text-xs opacity-60 mt-2">
                                {userStats.filter(u => u.type === 'installer').length} os.
                            </div>
                        </div>
                        {/* Internal vs External */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold uppercase text-slate-400">Typ tankowania</div>
                            <div className="flex items-end gap-3 mt-2">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">💳 Wewnętrzne</div>
                                    <div className="text-lg font-black text-slate-800">{monthlyStats.internalCount}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">🧾 Zewnętrzne</div>
                                    <div className="text-lg font-black text-slate-800">{monthlyStats.externalCount}</div>
                                </div>
                            </div>
                            {monthlyStats.totalCost > 0 && (
                                <div className="mt-3 pt-2 border-t border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Śr. koszt/tankowanie</div>
                                    <div className="text-sm font-bold text-slate-700">
                                        {monthlyStats.totalCount > 0 ? (monthlyStats.totalCost / monthlyStats.totalCount).toFixed(2) : '0.00'} zł
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Per-User Breakdown ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* By Person */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                👤 Statystyki wg Pracowników
                            </h3>
                            {userStats.length === 0 ? (
                                <div className="text-center text-slate-400 text-sm py-8 italic">Brak danych w tym miesiącu</div>
                            ) : (
                                <div className="space-y-2">
                                    {userStats.map(stat => {
                                        const pct = monthlyStats.totalCost > 0 ? (stat.cost / monthlyStats.totalCost) * 100 : 0;
                                        return (
                                            <div key={stat.key} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-2">
                                                        {stat.isVehicle ? (
                                                            <span className="w-7 h-7 flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">🚗</span>
                                                        ) : (
                                                            <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${stat.type === 'sales_rep' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                {stat.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-800">
                                                                {stat.name}
                                                                {stat.isVehicle && <span className="text-[10px] text-amber-600 ml-1">(tablica rej.)</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stat.type === 'sales_rep' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                                    }`}>
                                                                    {stat.type === 'sales_rep' ? 'Sprzedawca' : 'Montażysta'}
                                                                </span>
                                                                {stat.vehicles.size > 0 && !stat.isVehicle && (
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {Array.from(stat.vehicles).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm text-slate-800">{stat.cost.toFixed(2)} zł</div>
                                                        <div className="text-[10px] text-slate-400">{stat.liters.toFixed(1)} L · {stat.count} tank.</div>
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${stat.type === 'sales_rep' ? 'bg-blue-500' : 'bg-purple-500'}`}
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 text-right">{pct.toFixed(1)}% budżetu</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* By Vehicle */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                🚗 Statystyki wg Pojazdów
                            </h3>
                            {vehicleStats.length === 0 ? (
                                <div className="text-center text-slate-400 text-sm py-8 italic">Brak danych w tym miesiącu</div>
                            ) : (
                                <div className="space-y-2">
                                    {vehicleStats.map(stat => {
                                        const pct = monthlyStats.totalLiters > 0 ? (stat.liters / monthlyStats.totalLiters) * 100 : 0;
                                        return (
                                            <div key={stat.plate} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg text-xs">🚗</span>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-800 font-mono tracking-wide">{stat.plate}</div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {stat.users.size > 0
                                                                    ? Array.from(stat.users).join(', ')
                                                                    : 'Brak przypisanego użytkownika'
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm text-slate-800">{stat.liters.toFixed(1)} L</div>
                                                        <div className="text-[10px] text-slate-400">{stat.cost.toFixed(2)} zł · {stat.count} tank.</div>
                                                    </div>
                                                </div>
                                                <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-amber-500 transition-all"
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 text-right">{pct.toFixed(1)}% zużycia</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Day-by-Day Breakdown (mini calendar) ── */}
                    {monthLogs.length > 0 && (() => {
                        const dayMap = new Map<string, { liters: number; cost: number; count: number }>();
                        for (const log of monthLogs) {
                            const day = log.logDate.slice(0, 10);
                            if (!dayMap.has(day)) dayMap.set(day, { liters: 0, cost: 0, count: 0 });
                            const entry = dayMap.get(day)!;
                            entry.liters += log.liters;
                            entry.cost += calcLogCost(log, fuelPrices);
                            entry.count += 1;
                        }
                        const sorted = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                        return (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                    📅 Rozkład dzienny
                                </h3>
                                <div className="overflow-x-auto">
                                    <div className="flex gap-1.5 min-w-fit pb-2">
                                        {sorted.map(([day, data]) => {
                                            const maxCost = Math.max(...sorted.map(([, d]) => d.cost));
                                            const heightPct = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
                                            return (
                                                <div key={day} className="flex flex-col items-center group cursor-pointer" title={`${day}: ${data.liters.toFixed(1)}L, ${data.cost.toFixed(2)} zł, ${data.count} tank.`}>
                                                    <div className="relative w-8 h-20 bg-slate-50 rounded-md overflow-hidden border border-slate-100">
                                                        <div
                                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-b-md transition-all"
                                                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 mt-1 font-bold">
                                                        {day.slice(8)}
                                                    </div>
                                                    {/* Tooltip on hover */}
                                                    <div className="hidden group-hover:block absolute -mt-24 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                                                        {data.liters.toFixed(1)} L · {data.cost.toFixed(0)} zł
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ━━━ TAB: LOGS ━━━ */}
            {activeTab === 'logs' && (
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
                                            <span className={`px-2 py-1 rounded-full text-xs ${log.fuelingType === 'internal'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {log.fuelingType === 'internal' ? '💳 Wewnętrzne' : '🧾 Zewnętrzne'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{log.vehiclePlate || '-'}</td>
                                        <td className="px-4 py-3 font-mono">{log.odometerReading ? `${log.odometerReading} km` : '-'}</td>
                                        <td className="px-4 py-3">
                                            {editingLogId === log.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editLiters}
                                                        onChange={(e) => setEditLiters(parseFloat(e.target.value) || 0)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLiters(log.id); if (e.key === 'Escape') setEditingLogId(null); }}
                                                        className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveLiters(log.id)} className="text-green-600 hover:text-green-800" title="Zapisz">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button onClick={() => setEditingLogId(null)} className="text-slate-400 hover:text-slate-600" title="Anuluj">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => handleStartEdit(log)}
                                                    className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-2 py-1 rounded transition-colors"
                                                    title="Kliknij aby edytować"
                                                >
                                                    {log.liters} L ✏️
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-emerald-600">
                                            {(() => {
                                                const cost = calcLogCost(log, fuelPrices);
                                                if (cost > 0) {
                                                    const sym = log.currency === 'PLN' ? 'zł' : '€';
                                                    return `${cost.toFixed(2)} ${sym}`;
                                                }
                                                return '-';
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {log.odometerPhotoUrl && (
                                                    <a href={log.odometerPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs underline">
                                                        Licznik
                                                    </a>
                                                )}
                                                {log.odometerPhotoUrl && log.receiptPhotoUrl && <span className="text-slate-300">|</span>}
                                                {log.receiptPhotoUrl && (
                                                    <a href={log.receiptPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs underline">
                                                        Paragon
                                                    </a>
                                                )}
                                                {!log.odometerPhotoUrl && !log.receiptPhotoUrl && '-'}
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
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center py-8 text-slate-400 text-sm italic">
                                            Brak wpisów paliwowych
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ━━━ TAB: HISTORY (TIMELINE) ━━━ */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* Month Selector */}
                    <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 w-fit">
                        <button
                            onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-lg font-bold text-slate-800 min-w-[160px] text-center capitalize">
                            {format(selectedMonth, 'LLLL yyyy', { locale: pl })}
                        </span>
                        <button
                            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <button
                            onClick={() => setSelectedMonth(new Date())}
                            className="ml-2 px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                        >
                            Dziś
                        </button>
                    </div>

                    {/* Timeline view */}
                    {(() => {
                        // Group by date
                        const grouped = new Map<string, FuelLog[]>();
                        const sorted = [...monthLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        for (const log of sorted) {
                            const dateKey = log.logDate.slice(0, 10);
                            if (!grouped.has(dateKey)) grouped.set(dateKey, []);
                            grouped.get(dateKey)!.push(log);
                        }

                        if (grouped.size === 0) {
                            return (
                                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                                    <div className="text-4xl mb-3">⛽</div>
                                    <div className="text-slate-400 font-medium">Brak tankowań w tym miesiącu</div>
                                </div>
                            );
                        }

                        return Array.from(grouped.entries()).map(([dateKey, dayLogs]) => (
                            <div key={dateKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Day header */}
                                <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-black text-sm">
                                            {dateKey.slice(8)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">
                                                {format(new Date(dateKey), 'EEEE', { locale: pl })}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {format(new Date(dateKey), 'dd MMMM yyyy', { locale: pl })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400 font-bold uppercase">Łącznie</div>
                                        <div className="font-bold text-slate-700 text-sm">
                                            {dayLogs.reduce((sum, l) => sum + l.liters, 0).toFixed(1)} L
                                            <span className="text-slate-400 mx-1">·</span>
                                            {dayLogs.length} tank.
                                        </div>
                                    </div>
                                </div>

                                {/* Entries for this day */}
                                <div className="divide-y divide-slate-50">
                                    {dayLogs.map((log) => {
                                        const time = format(new Date(log.createdAt), 'HH:mm');
                                        const cost = calcLogCost(log, fuelPrices);
                                        return (
                                            <div key={log.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    {/* Time */}
                                                    <div className="flex flex-col items-center min-w-[50px]">
                                                        <div className="text-lg font-black text-slate-800 font-mono">{time}</div>
                                                    </div>

                                                    {/* Dot connector */}
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-3 h-3 rounded-full border-2 ${
                                                            log.type === 'sales_rep'
                                                                ? 'bg-blue-500 border-blue-300'
                                                                : 'bg-purple-500 border-purple-300'
                                                        }`} />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-slate-800">
                                                                {log.userName || 'Nieznany'}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                log.type === 'sales_rep'
                                                                    ? 'bg-blue-50 text-blue-600'
                                                                    : 'bg-purple-50 text-purple-600'
                                                            }`}>
                                                                {log.type === 'sales_rep' ? 'Sprzedawca' : 'Montażysta'}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                log.fuelingType === 'internal'
                                                                    ? 'bg-green-50 text-green-600'
                                                                    : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                                {log.fuelingType === 'internal' ? '💳 Wew.' : '🧾 Zew.'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                            {log.vehiclePlate && (
                                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                                                                    🚗 {log.vehiclePlate}
                                                                </span>
                                                            )}
                                                            {log.stationName && (
                                                                <span>📍 {log.stationName}</span>
                                                            )}
                                                            {log.odometerReading && (
                                                                <span className="font-mono">{log.odometerReading} km</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Amounts */}
                                                    <div className="text-right flex-shrink-0">
                                                        <div className="font-bold text-slate-800">{log.liters} L</div>
                                                        {cost > 0 && (
                                                            <div className="text-sm font-medium text-emerald-600">
                                                                {formatCost(cost, log.currency)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Photos */}
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        {log.odometerPhotoUrl && (
                                                            <a href={log.odometerPhotoUrl} target="_blank" rel="noopener noreferrer"
                                                               className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs hover:bg-blue-100 transition-colors"
                                                               title="Zdjęcie licznika">
                                                                📷
                                                            </a>
                                                        )}
                                                        {log.receiptPhotoUrl && (
                                                            <a href={log.receiptPhotoUrl} target="_blank" rel="noopener noreferrer"
                                                               className="w-7 h-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-xs hover:bg-amber-100 transition-colors"
                                                               title="Zdjęcie paragonu">
                                                                🧾
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
            {/* ━━━ ADD FUEL MODAL ━━━ */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) resetAddModal(); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    ⛽ Nowe Tankowanie
                                </h2>
                                <button onClick={resetAddModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Internal / External Toggle */}
                            <div className="mt-4 flex bg-slate-100 rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => setAddFuelingType('internal')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        addFuelingType === 'internal'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    💳 Wewnętrzne
                                    <span className="text-[10px] opacity-80">(QR/karta)</span>
                                </button>
                                <button
                                    onClick={() => setAddFuelingType('external')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        addFuelingType === 'external'
                                            ? 'bg-amber-600 text-white shadow-md'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    🧾 Zewnętrzne
                                    <span className="text-[10px] opacity-80">(gotówka/karta pryw.)</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Info banner */}
                            <div className={`px-4 py-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                                addFuelingType === 'internal'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {addFuelingType === 'internal'
                                    ? 'Tankowanie wewnętrzne — wpisz tylko litry. Koszt zostanie obliczony automatycznie na podstawie aktualnej ceny paliwa firmowego.'
                                    : 'Tankowanie zewnętrzne — wpisz litry, kwotę i walutę. Możesz dodać zdjęcie paragonu — AI spróbuje odczytać dane automatycznie.'
                                }
                            </div>

                            {/* Sales Rep Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">👤 Przedstawiciel handlowy *</label>
                                <select
                                    value={addUserId}
                                    onChange={(e) => setAddUserId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium"
                                >
                                    <option value="">— Wybierz —</option>
                                    {salesReps.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.firstName} {rep.lastName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date + Vehicle Plate */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Data</label>
                                    <input
                                        type="date"
                                        value={addLogDate}
                                        onChange={(e) => setAddLogDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🚗 Tablica rej. <span className="text-slate-300">(opcjonalnie)</span></label>
                                    <input
                                        type="text"
                                        value={addVehiclePlate}
                                        onChange={(e) => setAddVehiclePlate(e.target.value.toUpperCase())}
                                        placeholder="np. DW 12345"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* Liters */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">⛽ Ilość litrów *</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={addLiters}
                                        onChange={(e) => setAddLiters(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="np. 45.5"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg font-mono font-bold"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">L</span>
                                </div>
                            </div>

                            {/* External-only: Cost + Currency */}
                            {addFuelingType === 'external' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">💰 Kwota *</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={addCost}
                                                onChange={(e) => setAddCost(e.target.value ? Number(e.target.value) : '')}
                                                placeholder="np. 285.50"
                                                step="0.01"
                                                min="0"
                                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all text-lg font-mono font-bold"
                                            />
                                        </div>
                                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setAddCurrency('PLN')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                    addCurrency === 'PLN'
                                                        ? 'bg-white shadow-md text-slate-800'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                🇵🇱 PLN
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAddCurrency('EUR')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                    addCurrency === 'EUR'
                                                        ? 'bg-white shadow-md text-slate-800'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                🇪🇺 EUR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* External-only: Receipt Photo + AI */}
                            {addFuelingType === 'external' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📸 Paragon / Faktura</label>

                                    {receiptPreview ? (
                                        <div className="relative">
                                            <img
                                                src={receiptPreview}
                                                alt="Podgląd paragonu"
                                                className="w-full max-h-48 object-contain rounded-xl border-2 border-slate-200 bg-slate-50"
                                            />
                                            <button
                                                onClick={() => { setReceiptFile(null); setReceiptPreview(null); setAiResult(null); }}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            {/* AI Analysis Status */}
                                            {aiAnalyzing && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                                        <span className="text-sm font-bold text-blue-700">🤖 AI analizuje paragon...</span>
                                                    </div>
                                                </div>
                                            )}
                                            {aiResult && (
                                                <div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                                                    <span className="text-base">🤖</span>
                                                    <span>
                                                        AI odczytało: {aiResult.liters && <strong>{aiResult.liters}L</strong>}
                                                        {aiResult.cost && <> · <strong>{aiResult.cost} {aiResult.currency || 'PLN'}</strong></>}
                                                        {aiResult.stationName && <> · {aiResult.stationName}</>}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* File picker */}
                                            <button
                                                type="button"
                                                onClick={() => receiptInputRef.current?.click()}
                                                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">Wybierz zdjęcie</span>
                                            </button>
                                            <input
                                                ref={receiptInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => { if (e.target.files?.[0]) handleReceiptFile(e.target.files[0]); }}
                                            />

                                            {/* Camera capture */}
                                            <button
                                                type="button"
                                                onClick={() => cameraInputRef.current?.click()}
                                                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">📷 Zrób zdjęcie</span>
                                            </button>
                                            <input
                                                ref={cameraInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => { if (e.target.files?.[0]) handleReceiptFile(e.target.files[0]); }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                            <div className="flex gap-3">
                                <button
                                    onClick={resetAddModal}
                                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleSubmitFuel}
                                    disabled={addSubmitting}
                                    className={`flex-[2] px-4 py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                                        addFuelingType === 'internal'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-amber-600 hover:bg-amber-700'
                                    }`}
                                >
                                    {addSubmitting ? (
                                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Zapisywanie...</>
                                    ) : (
                                        <>{addFuelingType === 'internal' ? '💳 Zapisz wewnętrzne' : '🧾 Zapisz zewnętrzne'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Helper: file to base64 ──
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
            const base64 = result.split(',')[1] || result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
