import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { InstallerSessionService, type WorkSession } from '../../services/database/installer-session.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';

interface TeamCostRow {
    teamName: string;
    teamId: string;
    crewCount: number;
    status: 'active' | 'completed' | 'pending';
    hoursWorked: number;
    estimatedCost: number;
    avgRate: number;
}

interface SalesRepCostRow {
    name: string;
    userId: string;
    role: string;
    monthlySalary?: number;
}

export const LiveCostWidget: React.FC = () => {
    const [teamRows, setTeamRows] = useState<TeamCostRow[]>([]);
    const [salesReps, setSalesReps] = useState<SalesRepCostRow[]>([]);
    const [monthlyInstallerCost, setMonthlyInstallerCost] = useState(0);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Live clock tick every 30s for running sessions
    useEffect(() => {
        intervalRef.current = setInterval(() => setNow(new Date()), 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const loadData = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

            // Fetch all teams
            const teams = await InstallationTeamService.getTeams();

            // Fetch today's sessions for all teams
            const allTodaySessions: WorkSession[] = [];
            for (const team of teams) {
                try {
                    const sessions = await InstallerSessionService.getWeekSessions(team.id, today, today);
                    allTodaySessions.push(...sessions);
                } catch { /* skip */ }
            }

            // Build team cost rows for today
            const rows: TeamCostRow[] = [];
            for (const session of allTodaySessions) {
                const team = teams.find(t => t.id === session.teamId);
                const crewCount = session.crewMembers?.length || 1;
                const rates = session.crewRates || [];
                const avgRate = rates.length > 0
                    ? rates.reduce((s, r) => s + (r.hourlyRate || 0), 0) / rates.length
                    : 0;

                let hoursWorked = 0;
                let estimatedCost = session.laborCost || 0;

                if (session.status === 'started' && session.startedAt) {
                    // Live calculation
                    const startTime = new Date(session.startedAt).getTime();
                    const elapsed = (now.getTime() - startTime) / 1000 / 60; // minutes
                    const netMinutes = Math.max(0, elapsed - (session.breakMinutes || 0));
                    hoursWorked = netMinutes / 60;
                    // Sum all crew rates × hours
                    estimatedCost = rates.reduce((s, r) => s + (r.hourlyRate || 0) * hoursWorked, 0);
                    if (estimatedCost === 0 && avgRate > 0) {
                        estimatedCost = avgRate * crewCount * hoursWorked;
                    }
                } else if (session.status === 'completed') {
                    hoursWorked = (session.totalWorkMinutes || 0) / 60;
                    estimatedCost = session.laborCost || 0;
                }

                rows.push({
                    teamName: team?.name || `Ekipa ${session.teamId.slice(0, 6)}`,
                    teamId: session.teamId,
                    crewCount,
                    status: session.status === 'started' ? 'active' : session.status === 'completed' ? 'completed' : 'pending',
                    hoursWorked,
                    estimatedCost,
                    avgRate,
                });
            }

            // Sort: active first, then completed, then pending
            rows.sort((a, b) => {
                const order = { active: 0, completed: 1, pending: 2 };
                return order[a.status] - order[b.status];
            });

            setTeamRows(rows);

            // Monthly total installer cost
            const monthSessions = await InstallerSessionService.getAllSessions(monthStart, today);
            const monthTotal = monthSessions.reduce((s, sess) => {
                if (sess.status === 'completed') return s + (sess.laborCost || 0);
                // For currently active sessions add live estimate
                if (sess.status === 'started' && sess.startedAt) {
                    const startTime = new Date(sess.startedAt).getTime();
                    const elapsed = (now.getTime() - startTime) / 1000 / 60;
                    const netMinutes = Math.max(0, elapsed - (sess.breakMinutes || 0));
                    const hours = netMinutes / 60;
                    const rates = sess.crewRates || [];
                    const liveCost = rates.reduce((sum, r) => sum + (r.hourlyRate || 0) * hours, 0);
                    return s + liveCost;
                }
                return s;
            }, 0);
            setMonthlyInstallerCost(monthTotal);

            // Load sales reps (profiles with role = sales_rep)
            const { data: repsData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, role')
                .in('role', ['sales_rep', 'manager']);

            if (repsData) {
                setSalesReps(repsData.map((r: any) => ({
                    name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez nazwy',
                    userId: r.id,
                    role: r.role,
                })));
            }
        } catch (err) {
            console.error('LiveCostWidget error:', err);
        } finally {
            setLoading(false);
        }
    }, [now]);

    useEffect(() => { loadData(); }, [loadData]);

    const activeCount = teamRows.filter(r => r.status === 'active').length;
    const todayTotal = teamRows.reduce((s, r) => s + r.estimatedCost, 0);
    const currentMonthName = new Date().toLocaleString('pl-PL', { month: 'long' });

    const statusBadge = (status: TeamCostRow['status']) => {
        const styles = {
            active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            completed: 'bg-slate-100 text-slate-600 border-slate-200',
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
        };
        const labels = { active: '● Pracuje', completed: '✓ Zakończ.', pending: '○ Oczekuje' };
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl">
                        <span className="text-xl">💰</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Koszty robocizny — LIVE</h3>
                        <p className="text-xs text-slate-400">Ładowanie danych...</p>
                    </div>
                </div>
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <div>
                            <h3 className="font-bold text-lg">Koszty robocizny — LIVE</h3>
                            <p className="text-white/60 text-xs">
                                Bieżący szacunek kosztów pracowników
                            </p>
                        </div>
                    </div>
                    {activeCount > 0 && (
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-3 py-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-bold">{activeCount} aktywn{activeCount === 1 ? 'a' : 'e'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 p-4">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Dziś</p>
                    <p className="text-xl font-bold text-emerald-800 mt-1">
                        {todayTotal.toFixed(0)} <span className="text-xs font-medium">EUR</span>
                    </p>
                    <p className="text-[10px] text-emerald-500">{teamRows.length} sesj{teamRows.length === 1 ? 'a' : 'e'}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-3 border border-violet-200">
                    <p className="text-[10px] text-violet-600 font-bold uppercase tracking-wider">
                        {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}
                    </p>
                    <p className="text-xl font-bold text-violet-800 mt-1">
                        {monthlyInstallerCost.toFixed(0)} <span className="text-xs font-medium">EUR</span>
                    </p>
                    <p className="text-[10px] text-violet-500">montażyści</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Zespół</p>
                    <p className="text-xl font-bold text-blue-800 mt-1">{salesReps.length + teamRows.length}</p>
                    <p className="text-[10px] text-blue-500">osób aktywnych</p>
                </div>
            </div>

            {/* Installer Teams Table */}
            {teamRows.length > 0 && (
                <div className="px-4 pb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        🔧 Ekipy montażowe — dziś
                    </h4>
                    <div className="space-y-1.5">
                        {teamRows.map((row, i) => (
                            <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                                row.status === 'active'
                                    ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                                    : 'bg-slate-50/50 border-slate-100'
                            }`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                        row.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                        {row.crewCount}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{row.teamName}</p>
                                        <div className="flex items-center gap-2">
                                            {statusBadge(row.status)}
                                            <span className="text-[10px] text-slate-400">
                                                {row.hoursWorked.toFixed(1)}h
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-sm ${row.status === 'active' ? 'text-emerald-700' : 'text-slate-700'}`}>
                                        {row.estimatedCost.toFixed(0)} €
                                    </p>
                                    {row.avgRate > 0 && (
                                        <p className="text-[10px] text-slate-400">~{row.avgRate.toFixed(0)} €/h</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sales Reps Teaser */}
            {salesReps.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        💼 Przedstawiciele handlowi
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {salesReps.slice(0, 6).map((rep, i) => (
                            <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                                <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                    {rep.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <span className="text-xs font-medium text-blue-800">{rep.name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                        💡 Uzupełnij stawki przedstawicieli, aby widzieć tu koszty w czasie rzeczywistym
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                    Aktualizacja co 30s • Ostatnia: {now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <Link to="/admin/teams-dashboard" className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                    Dashboard ekip →
                </Link>
            </div>
        </div>
    );
};
