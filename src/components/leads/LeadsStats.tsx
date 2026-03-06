import React, { useMemo } from 'react';
import type { Lead } from '../../types';
import type { Fair } from '../../services/database/fair.service';

interface LeadsStatsProps {
    leads: Lead[];
    fairs?: Fair[];
}

export const LeadsStats: React.FC<LeadsStatsProps> = ({ leads, fairs = [] }) => {

    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === 'won').length;
        const lost = leads.filter(l => l.status === 'lost').length;
        const active = total - won - lost;

        const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

        // --- Source / Fair Stats ---
        interface SourceStatItem {
            id: string; // fairId or 'website' etc.
            name: string;
            count: number;
            won: number;
            conversion: string;
            isFair: boolean;
        }

        const sourceMap: Record<string, SourceStatItem> = {};

        leads.forEach(lead => {
            let key: string = lead.source;
            let name = lead.source === 'targi' ? 'Targi (Nieznane)' : (lead.source || 'Inne');
            let isFair = false;

            if (lead.source === 'targi') {
                isFair = true;
                if (lead.fairId) {
                    key = lead.fairId;
                    const fair = fairs.find(f => f.id === lead.fairId);
                    name = fair ? `🎡 ${fair.name}` : `🎡 ${lead.fairId}`;
                } else {
                    key = 'targi_unknown';
                }
            } else if (lead.source === 'website' || lead.source === 'manual') {
                name = lead.source === 'website' ? '🌐 Strona WWW' : '👤 Ręczne';
            }

            if (!sourceMap[key]) {
                sourceMap[key] = {
                    id: key,
                    name,
                    count: 0,
                    won: 0,
                    conversion: '0.0',
                    isFair
                };
            }

            sourceMap[key].count++;
            if (lead.status === 'won') sourceMap[key].won++;
        });

        const sourceStats = Object.values(sourceMap).map(item => ({
            ...item,
            conversion: item.count > 0 ? ((item.won / item.count) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.count - a.count);

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

        // --- Lost Reason Stats ---
        const lostLeads = leads.filter(l => l.status === 'lost');
        const lostReasonMap: Record<string, number> = {};
        lostLeads.forEach(lead => {
            const reason = lead.lostReason || 'Nie podano powodu';
            lostReasonMap[reason] = (lostReasonMap[reason] || 0) + 1;
        });
        const lostReasonStats = Object.entries(lostReasonMap)
            .map(([reason, count]) => ({
                reason,
                count,
                percentage: lostLeads.length > 0 ? ((count / lostLeads.length) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.count - a.count);

        // --- Lost By Stats (who marked leads as lost) ---
        const lostByMap: Record<string, { name: string; count: number }> = {};
        lostLeads.forEach(lead => {
            const userId = lead.lostBy || lead.assignedTo || 'unknown';
            const name = lead.lostByName
                || (lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}`.trim() : '')
                || 'Nieznany';
            if (!lostByMap[userId]) {
                lostByMap[userId] = { name, count: 0 };
            }
            lostByMap[userId].count++;
        });
        const lostByStats = Object.entries(lostByMap)
            .map(([id, { name, count }]) => ({
                id,
                name,
                count,
                percentage: lostLeads.length > 0 ? ((count / lostLeads.length) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.count - a.count);

        return {
            total,
            won,
            lost,
            active,
            conversionRate,
            topPerformer, // Best by WON count
            uniqueAssignees: Object.keys(assigneeStats).length,
            detailedStats: tableData,
            sourceStats, // New
            lostReasonStats, // Lost reasons breakdown
            lostByStats // Who marked leads as lost
        };
    }, [leads, fairs]);

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Detailed Team Performance Table */}
                {stats.detailedStats.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Efektywność Zespołu</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Analiza wyników handlowców</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Przedstawiciel</th>
                                        <th className="px-6 py-3 text-right">Razem</th>
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
                                            <td className="px-6 py-3 text-right text-green-600 font-bold">{rep.won}</td>
                                            <td className="px-6 py-3 text-right text-red-500 font-semibold">{rep.lost}</td>
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

                {/* Sources Breakdown Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-slate-800">Źródła Leadów</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Analiza źródeł i targów</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">Źródło / Targi</th>
                                    <th className="px-6 py-3 text-right">Ilość</th>
                                    <th className="px-6 py-3 text-right text-green-600">Wygrane</th>
                                    <th className="px-6 py-3 text-right">Skuteczność</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.sourceStats.map((source) => (
                                    <tr key={source.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {source.isFair ? (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-purple-500">🎡</span> {source.name.replace('🎡 ', '')}
                                                </span>
                                            ) : (
                                                source.name
                                            )}

                                        </td>
                                        <td className="px-6 py-3 text-right font-semibold">{source.count}</td>
                                        <td className="px-6 py-3 text-right text-green-600 font-bold">{source.won}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span>{source.conversion}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full" // Blue for sources
                                                        style={{ width: `${Math.min(parseFloat(source.conversion), 100)}%` }}
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
            </div>

            {/* Lost Reasons Breakdown */}
            {stats.lostReasonStats.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lost Summary Card */}
                    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                            <h3 className="font-bold text-red-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Utracone Szanse
                            </h3>
                            <p className="text-xs text-red-600 mt-0.5">Analiza powodów utraty</p>
                        </div>
                        <div className="p-6 flex flex-col items-center justify-center">
                            <div className="text-5xl font-bold text-red-600">{stats.lost}</div>
                            <div className="text-sm text-slate-500 mt-2">utraconych leadów</div>
                            <div className="text-xs text-slate-400 mt-1">
                                ({stats.total > 0 ? ((stats.lost / stats.total) * 100).toFixed(1) : '0.0'}% wszystkich)
                            </div>
                        </div>
                    </div>

                    {/* Lost Reasons Table */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-red-800">Powody Utraty</h3>
                                <p className="text-xs text-red-600 mt-0.5">Dlaczego tracimy klientów?</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 font-medium bg-red-50/50 border-b border-red-100">
                                    <tr>
                                        <th className="px-6 py-3">Powód</th>
                                        <th className="px-6 py-3 text-right">Ilość</th>
                                        <th className="px-6 py-3 text-right">Udział</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.lostReasonStats.map((item) => (
                                        <tr key={item.reason} className="hover:bg-red-50/30">
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                    {item.reason}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-red-600">{item.count}</td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>{item.percentage}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-500 rounded-full"
                                                            style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }}
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
                </div>
            )}

            {/* Who Marked Leads as Lost */}
            {stats.lostByStats.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Kto tracił leady?
                        </h3>
                        <p className="text-xs text-amber-600 mt-0.5">Który przedstawiciel oznaczył leady jako utracone</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 font-medium bg-amber-50/50 border-b border-amber-100">
                                <tr>
                                    <th className="px-6 py-3">Przedstawiciel</th>
                                    <th className="px-6 py-3 text-right">Utracone</th>
                                    <th className="px-6 py-3 text-right">Udział</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.lostByStats.map((item) => (
                                    <tr key={item.id} className="hover:bg-amber-50/30">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 border border-amber-200">
                                                    {item.name[0]}
                                                </div>
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-amber-600">{item.count}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span>{item.percentage}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-500 rounded-full"
                                                        style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }}
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

