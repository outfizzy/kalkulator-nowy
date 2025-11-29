import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SalesRepStat } from '../../types';

type DateRange = 'thisMonth' | 'lastMonth' | 'thisYear';

export const SalesTeamStats: React.FC = () => {
    const [stats, setStats] = useState<SalesRepStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
    const [showPartners, setShowPartners] = useState(false);

    const getDateRange = useCallback((): { start: Date; end: Date } => {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        switch (dateRange) {
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastMonth':
                start.setMonth(now.getMonth() - 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(now.getMonth());
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisYear':
                start.setMonth(0);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
        }

        return { start, end };
    }, [dateRange]);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const data = await DatabaseService.getSalesRepStats(start, end);
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, [getDateRange]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const filteredStats = stats.filter(stat => {
        if (showPartners) {
            return stat.role === 'partner';
        }
        return stat.role !== 'partner';
    });

    const totalStats = filteredStats.reduce(
        (acc, stat) => ({
            offers: acc.offers + stat.totalOffers,
            soldOffers: acc.soldOffers + stat.soldOffers,
            value: acc.value + stat.totalValue,
            margin: acc.margin + stat.totalMarginValue,
            distance: acc.distance + stat.totalDistance,
        }),
        { offers: 0, soldOffers: 0, value: 0, margin: 0, distance: 0 }
    );

    const avgMargin = filteredStats.length > 0
        ? filteredStats.reduce((sum, s) => sum + s.avgMarginPercent, 0) / filteredStats.length
        : 0;

    // Prepare chart data
    const chartData = filteredStats.map(s => ({
        name: s.userName,
        'Oferty': s.totalOffers,
        'Sprzedane': s.soldOffers,
        'Marża (%)': parseFloat(s.avgMarginPercent.toFixed(1)),
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex justify-end items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPartners(!showPartners)}
                        className={`px-4 py-2 rounded-lg transition-colors border border-slate-700 ${showPartners
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-surface text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {showPartners ? 'Pokaż Pracowników' : 'Pokaż Partnerów B2B'}
                    </button>
                    <div className="w-px h-8 bg-slate-700 mx-2"></div>
                    <button
                        onClick={() => setDateRange('thisMonth')}
                        className={`px-4 py-2 rounded-lg transition-colors ${dateRange === 'thisMonth'
                            ? 'bg-accent text-white'
                            : 'bg-surface text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Ten miesiąc
                    </button>
                    <button
                        onClick={() => setDateRange('lastMonth')}
                        className={`px-4 py-2 rounded-lg transition-colors ${dateRange === 'lastMonth'
                            ? 'bg-accent text-white'
                            : 'bg-surface text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Poprzedni miesiąc
                    </button>
                    <button
                        onClick={() => setDateRange('thisYear')}
                        className={`px-4 py-2 rounded-lg transition-colors ${dateRange === 'thisYear'
                            ? 'bg-accent text-white'
                            : 'bg-surface text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Ten rok
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="group relative bg-white p-6 rounded-xl border-2 border-slate-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-slate-600 text-sm font-medium">Wszystkie oferty</div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{totalStats.offers}</div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Sprzedane:</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{totalStats.soldOffers}</span>
                    </div>
                </div>

                <div className="group relative bg-white p-6 rounded-xl border-2 border-slate-200 hover:border-green-400 transition-all duration-300 hover:shadow-lg hover:shadow-green-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-slate-600 text-sm font-medium">Wartość sprzedaży</div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                        {(totalStats.value / 1000).toFixed(1)}k PLN
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Conversion:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {totalStats.offers > 0 ? ((totalStats.soldOffers / totalStats.offers) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>

                <div className="group relative bg-white p-6 rounded-xl border-2 border-slate-200 hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:shadow-orange-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-slate-600 text-sm font-medium">Marża razem</div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                        {(totalStats.margin / 1000).toFixed(1)}k PLN
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Średnio:</span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">{avgMargin.toFixed(1)}%</span>
                    </div>
                </div>

                <div className="group relative bg-white p-6 rounded-xl border-2 border-slate-200 hover:border-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-slate-600 text-sm font-medium">Kilometry</div>
                        <div className="p-2 bg-cyan-50 rounded-lg">
                            <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-cyan-600 mb-2">
                        {totalStats.distance.toLocaleString()} km
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Na ofertę:</span>
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                            {totalStats.offers > 0 ? (totalStats.distance / totalStats.offers).toFixed(0) : 0} km
                        </span>
                    </div>
                </div>

                <div className="group relative bg-white p-6 rounded-xl border-2 border-slate-200 hover:border-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-slate-600 text-sm font-medium">
                            {showPartners ? 'Partnerzy' : 'Przedstawiciele'}
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{filteredStats.length}</div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Aktywnych</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-surface p-6 rounded-xl border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-4">
                    Porównanie {showPartners ? 'partnerów' : 'przedstawicieli'}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                            labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Legend />
                        <Bar dataKey="Oferty" fill="#3b82f6" />
                        <Bar dataKey="Sprzedane" fill="#10b981" />
                        <Bar dataKey="Marża (%)" fill="#f59e0b" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="bg-surface rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {showPartners ? 'Partner' : 'Przedstawiciel'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Oferty
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Sprzedane
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Conversion
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Wartość
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Marża
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Średnia marża %
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Kilometry
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredStats.map((stat) => (
                                <tr key={stat.userId} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{stat.userName}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-300">{stat.totalOffers}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-green-400">{stat.soldOffers}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-300">
                                            {stat.conversionRate.toFixed(1)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-300">
                                            {(stat.totalValue / 1000).toFixed(1)}k PLN
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-accent">
                                            {(stat.totalMarginValue / 1000).toFixed(1)}k PLN
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div
                                                className="h-2 bg-accent rounded-full mr-2"
                                                style={{ width: `${Math.min(stat.avgMarginPercent, 100)}px` }}
                                            ></div>
                                            <span className="text-sm text-slate-300">
                                                {stat.avgMarginPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-blue-400">
                                            {stat.totalDistance.toLocaleString()} km
                                        </div>
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
