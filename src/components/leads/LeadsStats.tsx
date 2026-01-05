import React, { useMemo } from 'react';
import type { Lead } from '../../types';

interface LeadsStatsProps {
    leads: Lead[];
}

export const LeadsStats: React.FC<LeadsStatsProps> = ({ leads }) => {

    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === 'won').length;
        const lost = leads.filter(l => l.status === 'lost').length;
        const active = total - won - lost;

        const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

        // Full Detailed Calculation (Group by assignee)
        interface RepStats {
            id: string;
            name: string;
            total: number;
            active: number;
            won: number;
            lost: number;
            conversion: string;
        }

        const assigneeStats: Record<string, RepStats> = {};

        leads.forEach(lead => {
            const assigneeId = lead.assignedTo || 'unassigned';
            const name = lead.assignee
                ? `${lead.assignee.firstName} ${lead.assignee.lastName}`.trim()
                : (lead.assignedTo ? 'Nieznany' : 'Nieprzypisane');

            if (!assigneeStats[assigneeId]) {
                assigneeStats[assigneeId] = {
                    id: assigneeId,
                    name,
                    total: 0,
                    active: 0,
                    won: 0,
                    lost: 0,
                    conversion: '0.0'
                };
            }

            const rep = assigneeStats[assigneeId];
            rep.total++;

            if (lead.status === 'won') rep.won++;
            else if (lead.status === 'lost') rep.lost++;
            else rep.active++;
        });

        // Calculate Conversion and Sort
        const sortedAssignees = Object.values(assigneeStats).map(rep => {
            return {
                ...rep,
                conversion: rep.total > 0 ? ((rep.won / rep.total) * 100).toFixed(1) : '0.0'
            };
        }).sort((a, b) => b.total - a.total);

        const topPerformer = sortedAssignees.length > 0 ? sortedAssignees.sort((a, b) => b.won - a.won)[0] : null;

        // Re-sort by Total for the table display (usually expected)
        const tableData = [...sortedAssignees].sort((a, b) => b.total - a.total);

        return {
            total,
            won,
            lost,
            active,
            conversionRate,
            topPerformer, // Best by WON count
            uniqueAssignees: Object.keys(assigneeStats).length,
            detailedStats: tableData
        };
    }, [leads]);

    if (leads.length === 0) return null;

    return (
        <div className="space-y-8 mb-6">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Leads Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-16 h-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-500">Wszystkie Leady</h3>
                        <div className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</div>
                    </div>
                    {stats.topPerformer && stats.uniqueAssignees > 1 && (
                        <div className="text-xs text-slate-400 mt-2">
                            Lider Sprzedaży: <span className="font-semibold text-slate-600">{stats.topPerformer.name}</span> ({stats.topPerformer.won})
                        </div>
                    )}
                </div>

                {/* Active Leads Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-500">W Toku (Aktywne)</h3>
                        <div className="text-3xl font-bold text-blue-600 mt-2">{stats.active}</div>
                    </div>
                    <div className="text-xs text-blue-400 mt-2 bg-blue-50 px-2 py-1 rounded inline-block self-start">
                        Wymagają działania
                    </div>
                </div>

                {/* Conversion Rate Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-500">Skuteczność (Konwersja)</h3>
                        <div className="text-3xl font-bold text-green-600 mt-2">{stats.conversionRate}%</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                        Globalna średnia dla widoku
                    </div>
                </div>

                {/* Status Breakdown Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-32 relative overflow-hidden">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Rozkład Statusów</h3>
                    <div className="flex-1 flex flex-col justify-center space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span> Nowe/Kontakt
                            </span>
                            <span className="font-semibold">{leads.filter(l => ['new', 'contacted'].includes(l.status)).length}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span> Oferta/Nego
                            </span>
                            <span className="font-semibold">{leads.filter(l => ['offer_sent', 'negotiation'].includes(l.status)).length}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Realizacja
                            </span>
                            <span className="font-semibold text-green-600">{stats.won}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Team Performance Table */}
            {stats.detailedStats.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-slate-800">Efektywność Zespołu</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Szczegółowa analiza wyników dla każdego handlowca</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">Przedstawiciel</th>
                                    <th className="px-6 py-3 text-right">Przypisane (Razem)</th>
                                    <th className="px-6 py-3 text-right text-blue-600">W Toku</th>
                                    <th className="px-6 py-3 text-right text-green-600">Wygrane</th>
                                    <th className="px-6 py-3 text-right text-red-500">Utracone</th>
                                    <th className="px-6 py-3 text-right">Skuteczność</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.detailedStats.map((rep, index) => (
                                    <tr key={rep.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                {index === 0 && rep.won > 0 && (
                                                    <span className="text-yellow-400" title="Najlepszy wynik (Wygrane)">★</span>
                                                )}
                                                {rep.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-semibold">{rep.total}</td>
                                        <td className="px-6 py-3 text-right text-blue-600">{rep.active}</td>
                                        <td className="px-6 py-3 text-right text-green-600 font-bold">{rep.won}</td>
                                        <td className="px-6 py-3 text-right text-red-400">{rep.lost}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span>{rep.conversion}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${Math.min(parseFloat(rep.conversion), 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
