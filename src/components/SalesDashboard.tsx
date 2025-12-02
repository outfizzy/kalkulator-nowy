import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { DatabaseService } from '../services/database';
import { calculateCommissionStats, calculateSalesRepStats } from '../utils/statistics';
import type { SalesRepStats } from '../utils/statistics';
import { useAuth } from '../contexts/AuthContext';
import type { CommissionStats, Offer, SalesProfile } from '../types';
import { Link } from 'react-router-dom';

export const SalesDashboard: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const [stats, setStats] = useState<CommissionStats | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [profile, setProfile] = useState<SalesProfile | null>(null);
    const [teamStats, setTeamStats] = useState<SalesRepStats[]>([]);
    const [loading, setLoading] = useState(true);

    // Month Selection State
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;
            setLoading(true);

            try {
                // 1. Fetch Offers
                const allOffers = await DatabaseService.getOffers();

                let userOffers: Offer[] = [];
                if (isAdmin()) {
                    userOffers = allOffers;
                } else {
                    userOffers = allOffers.filter(o => o.createdBy === currentUser.id);
                }
                setOffers(userOffers);

                // 2. Calculate Stats
                const computedStats = calculateCommissionStats(userOffers);
                setStats(computedStats);

                // 3. Set Profile (Mock for now, or fetch from DB if we store targets)
                setProfile({
                    userId: currentUser.id,
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    email: currentUser.email,
                    phone: '',
                    monthlyTarget: 50000 // Default target
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

    // Filter offers for the selected month/year
    const soldOffers = offers.filter(o => o.status === 'sold');

    const monthlySoldOffers = soldOffers.filter(o => {
        const date = new Date(o.createdAt);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    // Calculate stats for the selected month
    const monthlyRevenue = monthlySoldOffers.reduce((sum, o) => {
        const pricing = o.pricing || ({} as any);
        const finalNet = typeof pricing.finalPriceNet === 'number' ? pricing.finalPriceNet : undefined;
        const baseNet = typeof pricing.sellingPriceNet === 'number' ? pricing.sellingPriceNet : 0;
        return sum + (finalNet ?? baseNet);
    }, 0); // Use Net for settlement

    const monthlyCommission = monthlySoldOffers.reduce((sum, o) => sum + (o.commission || 0), 0);

    // Monthly Revenue Data for Chart (Last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('pl-PL', { month: 'short' });
        const year = d.getFullYear();

        const monthOffers = soldOffers.filter(o => {
            const od = new Date(o.createdAt);
            return od.getMonth() === d.getMonth() && od.getFullYear() === year;
        });

        const rev = monthOffers.reduce((sum, o) => {
            const pricing = o.pricing || ({} as any);
            const finalNet = typeof pricing.finalPriceNet === 'number' ? pricing.finalPriceNet : undefined;
            const baseNet = typeof pricing.sellingPriceNet === 'number' ? pricing.sellingPriceNet : 0;
            return sum + (finalNet ?? baseNet);
        }, 0);

        const comm = monthOffers.reduce((sum, o) => sum + (o.commission || 0), 0);

        monthlyData.push({ name: `${monthName}`, revenue: rev, commission: comm });
    }

    // Status Distribution (Global)
    const statusData = [
        { name: 'Wysłane', value: stats.sentOffers, color: '#3b82f6' },
        { name: 'Sprzedane', value: stats.soldOffers, color: '#22c55e' },
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

    return (
        <div className="space-y-8">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">
                        Witaj, {profile?.firstName || 'Handlowcu'}! 👋
                    </h2>
                    <p className="text-slate-500 mt-1">Oto Twoje wyniki sprzedaży.</p>
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

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <Link
                    to="/new-offer"
                    className="group bg-gradient-to-br from-accent to-orange-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Nowa Oferta</h3>
                        <p className="text-white/80 text-sm">Utwórz nową ofertę dla klienta</p>
                    </div>
                </Link>

                <Link
                    to="/offers"
                    className="group bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Zarządzaj Ofertami</h3>
                        <p className="text-slate-600 text-sm">Zobacz i edytuj wszystkie oferty</p>
                        {stats.totalOffers > 0 && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-bold">
                                {stats.totalOffers} ofert
                            </div>
                        )}
                    </div>
                </Link>

                <Link
                    to="/reports"
                    className="group bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Raporty</h3>
                        <p className="text-slate-600 text-sm">Dodawaj i przeglądaj raporty</p>
                    </div>
                </Link>

                <Link
                    to="/measurements"
                    className="group bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Kalendarz Pomiarowy</h3>
                        <p className="text-white/80 text-sm">Planuj pomiary dla klientów</p>
                    </div>
                </Link>

                <Link
                    to="/installations"
                    className="group bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-white overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Kalendarz Montażowy</h3>
                        <p className="text-white/80 text-sm">Zobacz harmonogram montaży</p>
                    </div>
                </Link>
            </div>

            {/* Monthly Settlement Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-slate-300">Rozliczenie: {months[selectedMonth]} {selectedYear}</h3>
                        <div className="text-4xl font-bold mt-2 text-white">
                            {Number(monthlyCommission || 0).toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                            })}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">Twoja Prowizja w tym miesiącu</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Przychód Netto</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {Number(monthlyRevenue || 0).toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                            })}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-slate-300">
                            Realizacja Celu ({Number(target || 0).toLocaleString()} EUR)
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Całkowity Przychód (YTD)</div>
                    <div className="text-3xl font-bold text-slate-900">
                        {Number(stats.totalRevenue || 0).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Całkowita Prowizja (YTD)</div>
                    <div className="text-3xl font-bold text-green-600">
                        {Number(stats.totalCommission || 0).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Skuteczność (Win Rate)</div>
                    <div className="text-3xl font-bold text-accent">
                        {stats.totalOffers > 0 ? ((stats.soldOffers / stats.totalOffers) * 100).toFixed(1) : 0}%
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Lejek (Otwarte)</div>
                    <div className="text-3xl font-bold text-orange-500">
                        {Number(stats.projectedCommission || 0).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                        })}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Przychód i Prowizja (Ostatnie 6 msc)</h3>
                    <div className="h-64">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number) =>
                                            Number(value || 0).toLocaleString('de-DE', {
                                                style: 'currency',
                                                currency: 'EUR'
                                            })
                                        }
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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Status Ofert</h3>
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
                    <div className="flex justify-center gap-4 mt-4">
                        {statusData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Monthly Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Transakcje: {months[selectedMonth]} {selectedYear}</h3>
                    <Link to="/offers" className="text-sm text-accent hover:underline">Zarządzaj ofertami</Link>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Klient</th>
                            <th className="px-6 py-3 text-right">Kwota Netto</th>
                            <th className="px-6 py-3 text-right">Prowizja</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {monthlySoldOffers.length > 0 ? (
                            monthlySoldOffers.map(offer => (
                                <tr key={offer.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-600">
                                        {new Date(offer.createdAt).toLocaleDateString('pl-PL')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {offer.customer.firstName} {offer.customer.lastName}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        {Number(
                                            offer.pricing?.finalPriceNet ??
                                            offer.pricing?.sellingPriceNet ??
                                            0
                                        ).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        {offer.pricing?.finalPriceNet && <span className="ml-2 text-xs text-blue-500 font-bold">(Umowa)</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">
                                        +{Number(offer.commission || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                                            Sprzedane
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                    Brak transakcji w wybranym miesiącu.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Admin: Team Performance Section */}
            {isAdmin() && teamStats.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Wydajność Zespołu Sprzedaży</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teamStats.map(stat => (
                            <div key={stat.user.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-lg">
                                        {stat.user.firstName[0]}{stat.user.lastName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{stat.user.firstName} {stat.user.lastName}</h3>
                                        <p className="text-xs text-slate-500">{stat.user.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Oferty razem:</span>
                                        <span className="font-bold text-slate-900">{stat.offersCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Sprzedane:</span>
                                        <span className="font-bold text-green-600">{stat.soldCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Wysłane/Draft:</span>
                                        <span className="font-bold text-accent-dark">{stat.sentCount} / {stat.draftCount}</span>
                                    </div>
                                    <div className="border-t pt-3 mt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Przychód:</span>
                                            <span className="font-bold text-slate-900">
                                                {Number(stat.revenue || 0).toLocaleString('de-DE', {
                                                    style: 'currency',
                                                    currency: 'EUR'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-sm text-slate-600">Prowizja:</span>
                                            <span className="font-bold text-green-600">
                                                {Number(stat.commission || 0).toLocaleString('de-DE', {
                                                    style: 'currency',
                                                    currency: 'EUR'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="border-t pt-3 mt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Raporty:</span>
                                            <span className="font-bold text-slate-900">{stat.reportsCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
