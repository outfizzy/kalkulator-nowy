import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { DatabaseService } from '../services/database';
import { SettingsService } from '../services/database/settings.service';
import { ContractService } from '../services/database/contract.service';
import { calculateCommissionStats, calculateSalesRepStats } from '../utils/statistics';
import type { SalesRepStats } from '../utils/statistics';
import { useAuth } from '../contexts/AuthContext';
import type { CommissionStats, Offer, SalesProfile, Lead, Contract } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { RingostatWidget } from './widgets/RingostatWidget';
import { MiniTelephonyWidget } from './widgets/MiniTelephonyWidget';
import { TasksList } from './tasks/TasksList';
import { TaskModal } from './tasks/TaskModal';
import { StaleLeadsWidget } from './widgets/StaleLeadsWidget';
import { InstallationService } from '../services/database/installation.service';
import { InstallationSettlementModal } from './installations/InstallationSettlementModal';
import { supabase } from '../lib/supabase';
import type { Installation } from '../types';
import { ServiceTicketsWidget } from './admin/ServiceTicketsWidget';
import { LiveActivityFeed } from './notifications/LiveActivityFeed';

export const SalesDashboard: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const [stats, setStats] = useState<CommissionStats | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [staleLeads, setStaleLeads] = useState<Lead[]>([]);
    const [profile, setProfile] = useState<SalesProfile | null>(null);
    const [teamStats, setTeamStats] = useState<SalesRepStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);
    const [eurRate, setEurRate] = useState<number>(4.35);
    const navigate = useNavigate();

    // === PLN detection for Polish reps ===
    const isPL = currentUser?.role === 'sales_rep_pl';
    const fmtCurrency = (value: number, opts?: { maximumFractionDigits?: number }) => {
        const v = isPL ? value * eurRate : value;
        return Number(v || 0).toLocaleString(isPL ? 'pl-PL' : 'de-DE', {
            style: 'currency',
            currency: isPL ? 'PLN' : 'EUR',
            ...opts,
        });
    };
    const currencyLabel = isPL ? 'PLN' : 'EUR';

    // Telephony Presence (persisted to DB)
    const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'offline'>('available');

    useEffect(() => {
        // Load from DB
        if (currentUser?.id) {
            supabase.from('profiles').select('availability_status').eq('id', currentUser.id).single()
                .then(({ data }) => {
                    if (data?.availability_status) setAvailabilityStatus(data.availability_status);
                });
        }
    }, [currentUser?.id]);

    const cycleAvailability = async () => {
        const order: ('available' | 'busy' | 'offline')[] = ['available', 'busy', 'offline'];
        const nextIdx = (order.indexOf(availabilityStatus) + 1) % order.length;
        const next = order[nextIdx];
        setAvailabilityStatus(next);
        if (currentUser?.id) {
            await supabase.from('profiles').update({ availability_status: next }).eq('id', currentUser.id);
        }
    };

    // Settlement State
    const [unsettledInstallations, setUnsettledInstallations] = useState<Installation[]>([]);
    const [settlementInstallation, setSettlementInstallation] = useState<Installation | null>(null);

    // Month Selection State
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Fetch EUR rate for PL reps
    useEffect(() => {
        if (isPL) {
            SettingsService.getEurRate().then(rate => { if (rate) setEurRate(rate); });
        }
    }, [isPL]);

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;
            setLoading(true);

            try {
                // 1. Fetch Offers & Contracts in parallel
                const [allOffers, allContracts, allLeads, fetchedStaleLeads] = await Promise.all([
                    DatabaseService.getOffers(),
                    ContractService.getContracts(),
                    DatabaseService.getLeads(),
                    DatabaseService.getStaleLeads(3)
                ]);

                let userOffers: Offer[] = [];
                let userContracts: Contract[] = [];
                if (isAdmin()) {
                    userOffers = allOffers;
                    userContracts = allContracts;
                } else {
                    userOffers = allOffers.filter(o => o.createdBy === currentUser.id);
                    userContracts = allContracts.filter(c => c.salesRepId === currentUser.id);
                }
                setOffers(userOffers);
                setContracts(userContracts);
                setLeads(allLeads);
                setStaleLeads(fetchedStaleLeads);

                // 2.5 Fetch Unsettled Installations (Admin/Manager only)
                if (isAdmin() || currentUser.role === 'manager') {
                    try {
                        await InstallationService.checkAndAutoCompleteInstallations();
                        const updateTrigger = await InstallationService.getInstallations();
                        setUnsettledInstallations(updateTrigger.filter(i => i.status === 'verification'));
                    } catch (err) {
                        console.error("Error fetching unsettled installations", err);
                    }
                }

                // 3. Calculate Stats (offers for pipeline stats)
                const computedStats = calculateCommissionStats(userOffers);
                setStats(computedStats);

                setProfile({
                    userId: currentUser.id,
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    email: currentUser.email,
                    phone: '',
                    monthlyTarget: 100000
                });

                // 4. Admin: Team Stats
                if (isAdmin()) {
                    const reps = await DatabaseService.getSalesReps();
                    const teamStatistics = calculateSalesRepStats(allOffers, reps);
                    setTeamStats(teamStatistics);
                }

            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentUser, isAdmin]);

    if (loading || !stats || !offers) {
        return <div className="p-12 text-center text-slate-400">Ładowanie danych...</div>;
    }

    // ── Revenue & Transactions: CONTRACTS are the source of truth ──
    const getContractNet = (c: Contract) => {
        const p = c.pricing || ({} as any);
        return Math.max(Number(p.finalPriceNet) || 0, Number(p.sellingPriceNet) || 0);
    };

    const monthlyContracts = contracts.filter(c => {
        if (c.status === 'cancelled') return false;
        const date = new Date(c.createdAt);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    const monthlyRevenue = monthlyContracts.reduce((sum, c) => sum + getContractNet(c), 0);
    const monthlyCommission = monthlyContracts.reduce((sum, c) => sum + (c.commission || 0), 0);

    // Monthly Revenue Data for Chart (Last 6 months) — from contracts
    const rate = isPL ? eurRate : 1;
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('pl-PL', { month: 'short' });
        const year = d.getFullYear();

        const monthContracts = contracts.filter(c => {
            if (c.status === 'cancelled') return false;
            const cd = new Date(c.createdAt);
            return cd.getMonth() === d.getMonth() && cd.getFullYear() === year;
        });

        const rev = monthContracts.reduce((sum, c) => sum + getContractNet(c), 0) * rate;
        const comm = monthContracts.reduce((sum, c) => sum + (c.commission || 0), 0) * rate;

        monthlyData.push({ name: `${monthName}`, revenue: rev, commission: comm });
    }

    // Status Distribution (Global) — offers for pipeline stats
    const statusData = [
        { name: 'Wysłane', value: stats.sentOffers, color: '#3b82f6' },
        { name: 'Umowy', value: contracts.filter(c => c.status !== 'cancelled').length, color: '#22c55e' },
        { name: 'Odrzucone', value: stats.rejectedOffers, color: '#ef4444' },
        { name: 'Draft', value: stats.draftOffers, color: '#94a3b8' },
    ];

    // Progress to Target (Monthly)
    const target = profile?.monthlyTarget || 50000;
    const progressPercent = Math.min(100, (monthlyRevenue / target) * 100);

    const months = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];

    const years = [2024, 2025, 2026];

    // Leads Stats

    const newLeads = leads.filter(l => l.status === 'new').length;
    const inProgressLeads = leads.filter(l => ['contacted', 'offer_sent', 'negotiation'].includes(l.status)).length;

    return (
        <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
                        Witaj, {profile?.firstName || 'Handlowcu'}! 👋
                    </h2>
                    <p className="text-slate-500 mt-1">Oto Twoje wyniki sprzedaży.</p>
                    {isPL && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
                            <span className="text-sm">🇵🇱</span>
                            <span className="text-xs font-semibold text-rose-700">Rynek PL</span>
                            <span className="text-xs text-rose-500">• Kurs EUR/PLN: {eurRate.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="p-2 bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="p-2 bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Telephony Presence Bar ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Availability Toggle */}
                <button
                    onClick={cycleAvailability}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                        availabilityStatus === 'available'
                            ? 'bg-green-100 text-green-700 ring-2 ring-green-300 shadow-sm'
                            : availabilityStatus === 'busy'
                            ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300 shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                    <div className={`w-3 h-3 rounded-full transition-all ${
                        availabilityStatus === 'available' ? 'bg-green-500 animate-pulse'
                        : availabilityStatus === 'busy' ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`} />
                    {availabilityStatus === 'available' ? '📞 Dostępny' : availabilityStatus === 'busy' ? '🔴 Zajęty' : '📵 Niedostępny'}
                </button>

                <div className="w-px h-8 bg-slate-200 hidden sm:block" />

                {/* Quick channel links */}
                <Link to="/telephony/whatsapp" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                    💬 WhatsApp
                </Link>
                <Link to="/telephony/whatsapp/campaigns" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                    📢 Kampanie WA
                </Link>
                <Link to="/telephony/sms" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                    📱 SMS
                </Link>
                <Link to="/telephony/calls" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                    📞 Historia połączeń
                </Link>
                <Link to="/telephony/voicemail" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                    📬 Poczta głosowa
                </Link>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                <Link
                    to="/new-offer"
                    className="group bg-gradient-to-br from-accent to-orange-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Nowa Oferta</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Utwórz nową ofertę dla klienta</p>
                    </div>
                </Link>

                <Link
                    to="/fairs"
                    className="group bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Targi</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Tryb obsługi na targach</p>
                    </div>
                </Link>

                <Link
                    to="/leads"
                    className="group bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-2 border-slate-200 hover:border-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-yellow-500/20 transition-colors">
                            <svg className="w-7 h-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Leady</h3>
                        <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Zarządzaj potencjalnymi klientami</p>
                        {newLeads > 0 && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                                {newLeads} nowych
                            </div>
                        )}
                    </div>
                </Link>

                <Link
                    to="/mail"
                    className="group bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-2 border-slate-200 hover:border-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-purple-500/20 transition-colors">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Poczta</h3>
                        <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Skrzynka odbiorcza</p>
                    </div>
                </Link>

                <Link
                    to="/offers"
                    className="group bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-2 border-slate-200 hover:border-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-accent/20 transition-colors">
                            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Oferty</h3>
                        <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Zobacz i edytuj wszystkie oferty</p>
                        {stats.totalOffers > 0 && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-bold">
                                {stats.totalOffers} ofert
                            </div>
                        )}
                    </div>
                </Link>

                <Link
                    to="/reports"
                    className="group bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-2 border-slate-200 hover:border-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-accent/20 transition-colors">
                            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Raporty</h3>
                        <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Dodawaj i przeglądaj raporty</p>
                    </div>
                </Link>

                <Link
                    to="/visualizer"
                    className="group bg-gradient-to-br from-cyan-500 to-teal-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Wizualizator 3D</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Konfiguruj dachy i ogrodzenia</p>
                    </div>
                </Link>

                <Link
                    to="/measurements"
                    className="group bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Pomiary</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Planuj pomiary dla klientów</p>
                    </div>
                </Link>

                <Link
                    to="/installations"
                    className="group bg-gradient-to-br from-purple-500 to-purple-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Montaże</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Zobacz harmonogram montaży</p>
                    </div>
                </Link>

                {/* WhatsApp */}
                <Link
                    to="/telephony/whatsapp"
                    className="group bg-gradient-to-br from-green-500 to-green-700 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <span className="text-2xl">💬</span>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">WhatsApp</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Wiadomości i kampanie</p>
                    </div>
                </Link>

                {/* Telefonia */}
                <Link
                    to="/telephony/calls"
                    className="group bg-gradient-to-br from-orange-500 to-red-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <span className="text-2xl">📞</span>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Telefonia</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Połączenia i nagrania</p>
                    </div>
                </Link>

                {/* Tankowanie */}
                <Link
                    to="/my-fuel"
                    className="group bg-gradient-to-br from-amber-500 to-yellow-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-white/30 transition-colors">
                            <span className="text-2xl">⛽</span>
                        </div>
                        <h3 className="text-sm sm:text-xl font-bold mb-1 sm:mb-2">Tankowanie</h3>
                        <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Rejestruj pobrane paliwo</p>
                    </div>
                </Link>
            </div>

            {/* Tasks, Stale Leads & Ringostat Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col min-h-[400px]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Moje Zadania
                            </h3>
                            <button
                                onClick={() => setIsTaskModalOpen(true)}
                                className="text-xs font-semibold text-accent hover:text-accent-dark bg-accent/10 hover:bg-accent/20 px-2 py-1 rounded transition-colors"
                            >
                                + Dodaj
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
                            <TasksList refreshTrigger={tasksRefreshTrigger} />
                        </div>
                    </div>
                </div>

                {/* Unsettled Install Widget */}
                {unsettledInstallations.length > 0 && (
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col min-h-[400px]">
                            <div className="p-4 border-b border-slate-100 bg-amber-50 flex justify-between items-center shrink-0 rounded-t-xl">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Do Rozliczenia
                                </h3>
                                <div className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                                    {unsettledInstallations.length}
                                </div>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto space-y-3">
                                {unsettledInstallations.map(inst => (
                                    <div key={inst.id} className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-slate-800">{inst.client.lastName}</div>
                                            <div className="text-xs text-slate-500">{inst.scheduledDate}</div>
                                        </div>
                                        <div className="text-xs text-slate-600 mb-3 line-clamp-2">{inst.productSummary}</div>
                                        <button
                                            onClick={() => setSettlementInstallation(inst)}
                                            className="w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded transition-colors text-center"
                                        >
                                            Rozlicz
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {staleLeads.length > 0 && (
                    <div className="lg:col-span-1">
                        <StaleLeadsWidget leads={staleLeads} />
                    </div>
                )}

                {/* Live Activity Feed */}
                <div className="lg:col-span-1">
                    <div style={{ maxHeight: '480px' }} className="overflow-hidden rounded-xl">
                        <LiveActivityFeed maxItems={10} />
                    </div>
                </div>

            </div>

            {/* Mini Telephony Widget — missed incoming calls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <MiniTelephonyWidget />
                </div>
            </div>

            {/* Service Tickets Widget */}
            <ServiceTicketsWidget />

            {/* Centrum Połączeń — full-width Ringostat section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">📞 Centrum Połączeń</h3>
                        <p className="text-xs text-slate-400">Połączenia przychodzące, wychodzące, nieodebrane i oddzwonienia</p>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <RingostatWidget />
                </div>
            </div>

            {/* Modals */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSuccess={() => setTasksRefreshTrigger(prev => prev + 1)}
            />

            {settlementInstallation && (
                <InstallationSettlementModal
                    isOpen={!!settlementInstallation}
                    installation={settlementInstallation}
                    onClose={() => setSettlementInstallation(null)}
                    onSuccess={() => {
                        setSettlementInstallation(null);
                        // Refresh data (should ideally trigger effect)
                        InstallationService.getInstallations().then(res => {
                            setUnsettledInstallations(res.filter(i => i.status === 'verification'));
                        });
                    }}
                />
            )}

            {/* Monthly Settlement Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-slate-300">Rozliczenie: {months[selectedMonth]} {selectedYear}</h3>
                        <div className="text-2xl sm:text-4xl font-bold mt-2 text-white">
                            {fmtCurrency(monthlyCommission)}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">Twoja Prowizja w tym miesiącu</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Przychód Netto</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                            {fmtCurrency(monthlyRevenue)}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-slate-300">
                            Realizacja Celu ({isPL ? (target * eurRate).toLocaleString('pl-PL', { maximumFractionDigits: 0 }) : Number(target || 0).toLocaleString()} {currencyLabel})
                        </span>
                        <span className="font-bold text-emerald-400">{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid (Global Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Całkowity Przychód (YTD)</div>
                    <div className="text-xl sm:text-3xl font-bold text-slate-900">
                        {fmtCurrency(stats.totalRevenue)}
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Całkowita Prowizja (YTD)</div>
                    <div className="text-xl sm:text-3xl font-bold text-green-600">
                        {fmtCurrency(stats.totalCommission)}
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Skuteczność (Win Rate)</div>
                    <div className="text-xl sm:text-3xl font-bold text-accent">
                        {stats.totalOffers > 0 ? ((stats.soldOffers / stats.totalOffers) * 100).toFixed(1) : 0}%
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Lejek (Otwarte)</div>
                    <div className="text-xl sm:text-3xl font-bold text-orange-500">
                        {fmtCurrency(stats.projectedCommission)}
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Leady (Nowe/W toku)</div>
                    <div className="text-xl sm:text-3xl font-bold text-yellow-600">
                        {newLeads} / {inProgressLeads}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Revenue Chart */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6">Przychód i Prowizja (6 msc)</h3>
                    <div className="h-64">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number) => fmtCurrency(value)}
                                    />
                                    <Bar dataKey="revenue" fill="#3b82f6" name="Przychód" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="commission" fill="#22c55e" name="Prowizja" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                Brak danych sprzedażowych
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6">Status Ofert</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                        {statusData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Monthly Transactions Table — from Contracts */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">Transakcje: {months[selectedMonth]} {selectedYear}</h3>
                    <Link to="/contracts" className="text-sm text-accent hover:underline">Zarządzaj umowami</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Klient</th>
                                <th className="px-6 py-3">Nr umowy</th>
                                <th className="px-6 py-3 text-right">Kwota Netto</th>
                                <th className="px-6 py-3 text-right">Prowizja</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthlyContracts.length > 0 ? (
                                monthlyContracts.map(contract => {
                                    const net = getContractNet(contract);
                                    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
                                        signed: { label: 'Podpisana', bg: 'bg-green-100', text: 'text-green-700' },
                                        draft: { label: 'Szkic', bg: 'bg-slate-100', text: 'text-slate-600' },
                                        cancelled: { label: 'Anulowana', bg: 'bg-red-100', text: 'text-red-700' },
                                        completed: { label: 'Zakończona', bg: 'bg-blue-100', text: 'text-blue-700' },
                                    };
                                    const st = statusMap[contract.status] || { label: contract.status, bg: 'bg-slate-100', text: 'text-slate-600' };
                                    return (
                                        <tr key={contract.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/contracts/${contract.id}`)}>
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(contract.createdAt).toLocaleDateString('pl-PL')}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {contract.client?.firstName} {contract.client?.lastName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                                {contract.contractNumber}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">
                                                {fmtCurrency(net)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600">
                                                +{fmtCurrency(contract.commission || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`${st.bg} ${st.text} px-2 py-1 rounded-full text-xs font-bold`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        Brak umów w wybranym miesiącu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Admin: Team Performance Section — from Contracts */}
            {isAdmin() && contracts.length > 0 && (() => {
                // Build per-rep stats from contracts
                const repMap = new Map<string, { name: string; contracts: number; revenue: number; commission: number }>();
                contracts.filter(c => c.status !== 'cancelled').forEach(c => {
                    const repId = c.salesRepId || 'unknown';
                    const repName = c.salesRep ? `${c.salesRep.firstName} ${c.salesRep.lastName}`.trim() : repId.substring(0, 8);
                    const existing = repMap.get(repId) || { name: repName, contracts: 0, revenue: 0, commission: 0 };
                    existing.contracts += 1;
                    existing.revenue += getContractNet(c);
                    existing.commission += (c.commission || 0);
                    repMap.set(repId, existing);
                });
                const repStats = Array.from(repMap.entries())
                    .map(([id, s]) => ({ id, ...s, avg: s.contracts > 0 ? s.revenue / s.contracts : 0 }))
                    .sort((a, b) => b.revenue - a.revenue);

                return (
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Wydajność Zespołu Sprzedaży</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {repStats.map(stat => (
                            <div key={stat.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-lg">
                                        {stat.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{stat.name}</h3>
                                        <p className="text-xs text-slate-500">{stat.contracts} umów</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Obrót netto:</span>
                                        <span className="font-bold text-slate-900">
                                            {fmtCurrency(stat.revenue, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Prowizja:</span>
                                        <span className="font-bold text-green-600">
                                            {fmtCurrency(stat.commission)}
                                        </span>
                                    </div>
                                    <div className="border-t pt-3 mt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Śr. wartość umowy:</span>
                                            <span className="font-bold text-slate-900">
                                                {fmtCurrency(stat.avg, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                );
            })()}
        </div>
    );
};
