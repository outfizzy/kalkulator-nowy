import React, { useMemo, useState } from 'react';
import type { Installation, InstallationTeam } from '../../../types';

interface InstallationReportsProps {
    installations: Installation[];
    teams: InstallationTeam[];
}

export const InstallationReports: React.FC<InstallationReportsProps> = ({ installations, teams }) => {
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

    const stats = useMemo(() => {
        const now = new Date();
        const info = {
            totalCompleted: 0,
            onTimeRate: 0,
            avgDuration: 0,
            teamPerformance: [] as { teamId: string; name: string; count: number; onTime: number }[]
        };

        // Filter by period
        const filtered = installations.filter(inst => {
            if (inst.status !== 'completed' || !inst.scheduledDate) return false;
            const date = new Date(inst.scheduledDate);
            if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            if (period === 'year') return date.getFullYear() === now.getFullYear();
            return true;
        });

        info.totalCompleted = filtered.length;

        // Calculate metrics
        let onTimeCount = 0;
        let totalDuration = 0; // Days

        // Team buckets
        const teamMap = new Map<string, { count: number; onTime: number }>();
        teams.forEach(t => teamMap.set(t.id, { count: 0, onTime: 0 }));

        filtered.forEach(inst => {
            // duration
            const duration = inst.expectedDuration || 1;
            totalDuration += duration;

            // on time? 
            // Assuming scheduledDate is when it was supposed to happen. 
            // If acceptance date exists, compare? Or just assume completed means done.
            // Let's compare acceptedAt vs scheduledDate + duration
            let isOnTime = true;
            if (inst.acceptance?.acceptedAt && inst.scheduledDate) {
                const scheduledEnd = new Date(inst.scheduledDate);
                scheduledEnd.setDate(scheduledEnd.getDate() + duration);
                const accepted = new Date(inst.acceptance.acceptedAt);
                // Allow 1 day buffer
                if (accepted.getTime() > scheduledEnd.getTime() + 86400000) isOnTime = false;
            }
            if (isOnTime) onTimeCount++;

            // Team stats
            if (inst.teamId && teamMap.has(inst.teamId)) {
                const t = teamMap.get(inst.teamId)!;
                t.count++;
                if (isOnTime) t.onTime++;
            }
        });

        info.onTimeRate = filtered.length > 0 ? (onTimeCount / filtered.length) * 100 : 0;
        info.avgDuration = filtered.length > 0 ? totalDuration / filtered.length : 0;

        info.teamPerformance = Array.from(teamMap.entries()).map(([id, data]) => ({
            teamId: id,
            name: teams.find(t => t.id === id)?.name || 'Nieznany',
            count: data.count,
            onTime: data.count > 0 ? (data.onTime / data.count) * 100 : 0
        })).sort((a, b) => b.count - a.count);

        return info;
    }, [installations, teams, period]);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Filter */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Raport Wydajności
                </h2>
                <div className="bg-white p-1 rounded-lg border border-slate-200 flex text-sm">
                    {(['month', 'year'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 rounded-md transition-all ${period === p ? 'bg-accent text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {p === 'month' ? 'Ten Miesiąc' : 'Ten Rok'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500">Ukończone Montaże</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats.totalCompleted}</p>
                    <p className="text-xs text-slate-400 mt-1">W wybranym okresie</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500">Terminowość</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats.onTimeRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400 mt-1">Zakończone w planowanym czasie</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500">Śr. Czas Trwania</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats.avgDuration.toFixed(1)} <span className="text-lg text-slate-500 font-normal">dni</span></p>
                    <p className="text-xs text-slate-400 mt-1">Średnia długość montażu</p>
                </div>
            </div>

            {/* Team Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-semibold text-slate-800">
                    Ranking Ekip
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3">Ekipa</th>
                                <th className="px-4 py-3">Liczba Montaży</th>
                                <th className="px-4 py-3">Terminowość</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.teamPerformance.map((t, idx) => (
                                <tr key={t.teamId} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                                {idx + 1}
                                            </span>
                                            {t.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{t.count}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${t.onTime >= 90 ? 'bg-green-500' : t.onTime >= 70 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                    style={{ width: `${t.onTime}%` }}
                                                />
                                            </div>
                                            <span>{t.onTime.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {t.count > 0 && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.onTime >= 90 ? 'bg-green-100 text-green-700' :
                                                    t.onTime >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {t.onTime >= 90 ? 'Eksperci' : t.onTime >= 75 ? 'Dobry Wynik' : 'Do poprawy'}
                                            </span>
                                        )}
                                        {t.count === 0 && <span className="text-slate-400 italic">Brak danych</span>}
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
