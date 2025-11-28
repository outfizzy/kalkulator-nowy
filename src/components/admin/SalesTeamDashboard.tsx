import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DateRange = 'thisMonth' | 'lastMonth' | 'thisYear';

interface SalesRepStat {
    userId: string;
    userName: string;
    totalOffers: number;
    soldOffers: number;
    totalValue: number;
    totalMarginValue: number;
    totalDistance: number;
    avgMarginPercent: number;
    conversionRate: number;
}

export const SalesTeamDashboard: React.FC = () => {
    const [stats, setStats] = useState<SalesRepStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>('thisMonth');

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

    const totalStats = stats.reduce(
        (acc, stat) => ({
            offers: acc.offers + stat.totalOffers,
            soldOffers: acc.soldOffers + stat.soldOffers,
            value: acc.value + stat.totalValue,
            margin: acc.margin + stat.totalMarginValue,
            distance: acc.distance + stat.totalDistance,
        }),
        { offers: 0, soldOffers: 0, value: 0, margin: 0, distance: 0 }
    );

    const avgMargin = stats.length > 0
        ? stats.reduce((sum, s) => sum + s.avgMarginPercent, 0) / stats.length
        : 0;

    // Prepare chart data
    const chartData = stats.map(s => ({
        name: s.userName,
        'Oferty': s.totalOffers,
        'Sprzedane': s.soldOffers,
        'Marża (%)': parseFloat(s.avgMarginPercent.toFixed(1)),
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Statystyki Zespołu</h1>
                <div className="flex gap-2">
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
                <div className="bg-surface p-6 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-sm mb-1">Wszystkie oferty</div>
                    <div className="text-3xl font-bold text-white">{totalStats.offers}</div>
                    <div className="text-xs text-slate-500 mt-1">
                        Sprzedane: {totalStats.soldOffers}
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-sm mb-1">Wartość sprzedaży</div>
                    <div className="text-3xl font-bold text-green-400">
                        {(totalStats.value / 1000).toFixed(1)}k PLN
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Conversion: {totalStats.offers > 0 ? ((totalStats.soldOffers / totalStats.offers) * 100).toFixed(1) : 0}%
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-sm mb-1">Marża razem</div>
                    <div className="text-3xl font-bold text-accent">
                        {(totalStats.margin / 1000).toFixed(1)}k PLN
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Średnio: {avgMargin.toFixed(1)}%
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-sm mb-1">Kilometry</div>
                    <div className="text-3xl font-bold text-blue-400">
                        {totalStats.distance.toLocaleString()} km
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Na ofertę: {totalStats.offers > 0 ? (totalStats.distance / totalStats.offers).toFixed(0) : 0} km
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-sm mb-1">Przedstawiciele</div>
                    <div className="text-3xl font-bold text-white">{stats.length}</div>
                    <div className="text-xs text-slate-500 mt-1">
                        Aktywnych
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-surface p-6 rounded-xl border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-4">Porównanie przedstawicieli</h2>
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
                                    Przedstawiciel
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
                            {stats.map((stat) => (
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
