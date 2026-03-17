import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import type { InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';

// ============================================================================
// INSTALLER STATS PAGE — Comprehensive team & installer performance dashboard
// ============================================================================

interface TeamStats {
    team: InstallationTeam;
    totalInstallations: number;
    completedInstallations: number;
    scheduledInstallations: number;
    totalWorkHours: number;
    totalLaborCost: number;
    totalFuelCost: number;
    totalHotelCost: number;
    totalCost: number;
    averageSessionHours: number;
    sessionsCount: number;
}

interface WorkerStats {
    id: string;
    name: string;
    teamName: string;
    teamColor: string;
    totalHours: number;
    totalLaborCost: number;
    sessionsCount: number;
    avgHoursPerSession: number;
}

export const InstallerStatsPage: React.FC = () => {
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [installations, setInstallations] = useState<any[]>([]);
    const [workSessions, setWorkSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [y, m] = selectedMonth.split('-').map(Number);
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;

            const [teamsData, instData, sessData] = await Promise.all([
                InstallationTeamService.getTeams(),
                supabase
                    .from('installations')
                    .select('id, team_id, status, scheduled_date, hotel_cost, consumables_cost, additional_costs, expected_duration')
                    .gte('scheduled_date', startDate)
                    .lte('scheduled_date', endDate + 'T23:59:59'),
                supabase
                    .from('work_sessions')
                    .select('id, team_id, status, total_work_minutes, labor_cost, fuel_cost, hotel_cost, total_cost, crew_members, session_date')
                    .gte('session_date', startDate)
                    .lte('session_date', endDate)
                    .eq('status', 'completed'),
            ]);

            setTeams(teamsData);
            setInstallations(instData.data || []);
            setWorkSessions(sessData.data || []);
        } catch (err) {
            console.error('Error loading stats:', err);
            toast.error('Błąd ładowania statystyk');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => { loadData(); }, [loadData]);

    // ---- Team-level stats ----
    const teamStats: TeamStats[] = useMemo(() => {
        return teams.map(team => {
            const teamInstalls = installations.filter(i => i.team_id === team.id);
            const teamSessions = workSessions.filter(s => s.team_id === team.id);

            const totalWorkMinutes = teamSessions.reduce((s, ws) => s + (Number(ws.total_work_minutes) || 0), 0);
            const totalLaborCost = teamSessions.reduce((s, ws) => s + (Number(ws.labor_cost) || 0), 0);
            const totalFuelCost = teamSessions.reduce((s, ws) => s + (Number(ws.fuel_cost) || 0), 0);
            const totalHotelCost = teamSessions.reduce((s, ws) => s + (Number(ws.hotel_cost) || 0), 0);
            const installHotelCost = teamInstalls.reduce((s, i) => s + (Number(i.hotel_cost) || 0), 0);
            const totalCost = teamSessions.reduce((s, ws) => s + (Number(ws.total_cost) || 0), 0) +
                teamInstalls.reduce((s, i) => s + (Number(i.consumables_cost) || 0) + (Number(i.additional_costs) || 0), 0);

            return {
                team,
                totalInstallations: teamInstalls.length,
                completedInstallations: teamInstalls.filter(i => i.status === 'completed').length,
                scheduledInstallations: teamInstalls.filter(i => i.status === 'scheduled' || i.status === 'pending').length,
                totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
                totalLaborCost: Math.round(totalLaborCost * 100) / 100,
                totalFuelCost: Math.round(totalFuelCost * 100) / 100,
                totalHotelCost: Math.round((totalHotelCost + installHotelCost) * 100) / 100,
                totalCost: Math.round(totalCost * 100) / 100,
                averageSessionHours: teamSessions.length > 0 ? Math.round(totalWorkMinutes / teamSessions.length / 60 * 10) / 10 : 0,
                sessionsCount: teamSessions.length,
            };
        }).sort((a, b) => b.totalInstallations - a.totalInstallations);
    }, [teams, installations, workSessions]);

    // ---- Per-worker stats ----
    const workerStats: WorkerStats[] = useMemo(() => {
        const workerMap: Record<string, WorkerStats> = {};
        for (const ws of workSessions) {
            const team = teams.find(t => t.id === ws.team_id);
            const crew = ws.crew_members || [];
            const crewCount = Math.max(crew.length, 1);
            const perPersonHours = ((Number(ws.total_work_minutes) || 0) / 60) / crewCount;
            const perPersonLabor = (Number(ws.labor_cost) || 0) / crewCount;

            if (crew.length > 0) {
                for (const cm of crew) {
                    const key = `${cm.firstName || cm.first_name}-${cm.lastName || cm.last_name}`;
                    const name = `${cm.firstName || cm.first_name || ''} ${cm.lastName || cm.last_name || ''}`.trim();
                    if (!workerMap[key]) {
                        workerMap[key] = {
                            id: key,
                            name: name || '?',
                            teamName: team?.name || '—',
                            teamColor: team?.color || '#94a3b8',
                            totalHours: 0,
                            totalLaborCost: 0,
                            sessionsCount: 0,
                            avgHoursPerSession: 0,
                        };
                    }
                    workerMap[key].totalHours += perPersonHours;
                    workerMap[key].totalLaborCost += perPersonLabor;
                    workerMap[key].sessionsCount += 1;
                }
            }
        }
        return Object.values(workerMap)
            .map(w => ({
                ...w,
                totalHours: Math.round(w.totalHours * 10) / 10,
                totalLaborCost: Math.round(w.totalLaborCost * 100) / 100,
                avgHoursPerSession: w.sessionsCount > 0 ? Math.round(w.totalHours / w.sessionsCount * 10) / 10 : 0,
            }))
            .sort((a, b) => b.totalHours - a.totalHours);
    }, [workSessions, teams]);

    // ---- Global KPIs ----
    const kpis = useMemo(() => {
        const totalInstalls = installations.length;
        const completed = installations.filter(i => i.status === 'completed').length;
        const totalHours = teamStats.reduce((s, t) => s + t.totalWorkHours, 0);
        const totalCost = teamStats.reduce((s, t) => s + t.totalCost, 0);
        const totalSessions = workSessions.length;
        return { totalInstalls, completed, totalHours, totalCost, totalSessions };
    }, [installations, teamStats, workSessions]);

    // ---- Month options (last 12 months) ----
    const monthOptions = useMemo(() => {
        const opts: { value: string; label: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const l = d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
            opts.push({ value: v, label: l.charAt(0).toUpperCase() + l.slice(1) });
        }
        return opts;
    }, []);

    const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-slate-500">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ładowanie statystyk...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Month Picker ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800">📊 Statystyki montażowe</h2>
                <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                >
                    {monthOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* ── KPI Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <KpiCard label="Montaże" value={kpis.totalInstalls} icon="📋" color="bg-indigo-50 text-indigo-700" />
                <KpiCard label="Ukończone" value={kpis.completed} icon="✅" color="bg-emerald-50 text-emerald-700" />
                <KpiCard label="Przepracowane godz." value={`${Math.round(kpis.totalHours)}h`} icon="⏱️" color="bg-blue-50 text-blue-700" />
                <KpiCard label="Sesje pracy" value={kpis.totalSessions} icon="🔧" color="bg-amber-50 text-amber-700" />
                <KpiCard label="Koszty łącznie" value={`${fmt(kpis.totalCost)} €`} icon="💰" color="bg-red-50 text-red-700" />
            </div>

            {/* ── Team Performance ── */}
            <div>
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Wydajność ekip</h3>
                {teamStats.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                        Brak danych dla wybranego miesiąca
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teamStats.map(ts => {
                            const isExpanded = expandedTeam === ts.team.id;
                            const teamWorkers = workerStats.filter(w => w.teamName === ts.team.name);

                            return (
                                <div key={ts.team.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setExpandedTeam(isExpanded ? null : ts.team.id)}
                                        className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: ts.team.color }}
                                                />
                                                <div>
                                                    <div className="font-bold text-slate-800">{ts.team.name}</div>
                                                    {ts.team.vehicle && (
                                                        <div className="text-xs text-slate-400">🚗 {ts.team.vehicle}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 md:gap-6">
                                                <StatPill label="Montaże" value={ts.totalInstallations} color="text-slate-700" />
                                                <StatPill label="Ukończone" value={ts.completedInstallations} color="text-emerald-600" />
                                                <StatPill label="Godziny" value={`${ts.totalWorkHours}h`} color="text-blue-600" />
                                                <StatPill label="Sesje" value={ts.sessionsCount} color="text-amber-600" />
                                                <StatPill label="Koszty" value={`${fmt(ts.totalCost)} €`} color="text-red-600" />

                                                <svg
                                                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                                            {/* Cost breakdown */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <CostCard label="Robocizna" value={ts.totalLaborCost} icon="👷" />
                                                <CostCard label="Paliwo" value={ts.totalFuelCost} icon="⛽" />
                                                <CostCard label="Hotel" value={ts.totalHotelCost} icon="🏨" />
                                                <CostCard label="Śr. godz./sesję" value={ts.averageSessionHours} icon="⏱️" suffix="h" />
                                            </div>

                                            {/* Workers in this team */}
                                            {teamWorkers.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Pracownicy w tym miesiącu</h4>
                                                    <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                                        <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                            <div>Imię i nazwisko</div>
                                                            <div className="text-right">Godziny</div>
                                                            <div className="text-right">Sesje</div>
                                                            <div className="text-right">Śr. h/sesję</div>
                                                            <div className="text-right">Koszt robocizny</div>
                                                        </div>
                                                        {teamWorkers.map(w => (
                                                            <div key={w.id} className="grid grid-cols-5 gap-2 px-3 py-2.5 text-sm">
                                                                <div className="font-medium text-slate-700">{w.name}</div>
                                                                <div className="text-right text-blue-600 font-semibold">{w.totalHours}h</div>
                                                                <div className="text-right text-slate-600">{w.sessionsCount}</div>
                                                                <div className="text-right text-slate-500">{w.avgHoursPerSession}h</div>
                                                                <div className="text-right text-red-600 font-semibold">{fmt(w.totalLaborCost)} €</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── All Workers Ranking ── */}
            {workerStats.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Ranking pracowników</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-6 gap-2 px-4 py-2.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <div className="col-span-2">Pracownik</div>
                            <div className="text-right">Godziny</div>
                            <div className="text-right">Sesje</div>
                            <div className="text-right">Śr. h/sesję</div>
                            <div className="text-right">Robocizna</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {workerStats.map((w, idx) => (
                                <div key={w.id} className="grid grid-cols-6 gap-2 px-4 py-3 items-center text-sm hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2 col-span-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${idx < 3 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="font-medium text-slate-800">{w.name}</div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: w.teamColor }} />
                                                {w.teamName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right font-semibold text-blue-600">{w.totalHours}h</div>
                                    <div className="text-right text-slate-600">{w.sessionsCount}</div>
                                    <div className="text-right text-slate-500">{w.avgHoursPerSession}h</div>
                                    <div className="text-right font-semibold text-red-600">{fmt(w.totalLaborCost)} €</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---- Helper components ----

const KpiCard: React.FC<{ label: string; value: string | number; icon: string; color: string }> = ({ label, value, icon, color }) => (
    <div className={`${color} rounded-xl p-4 border border-slate-100`}>
        <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
        </div>
        <div className="text-xl font-bold">{value}</div>
    </div>
);

const StatPill: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div className="text-center">
        <div className="text-[10px] text-slate-400 uppercase font-semibold">{label}</div>
        <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
);

const CostCard: React.FC<{ label: string; value: number; icon: string; suffix?: string }> = ({ label, value, icon, suffix }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{icon}</span>
            <span className="text-[11px] text-slate-500 font-semibold uppercase">{label}</span>
        </div>
        <div className="text-lg font-bold text-slate-800">
            {suffix ? `${value}${suffix}` : `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
        </div>
    </div>
);
