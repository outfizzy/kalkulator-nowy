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

interface SalesRepRow {
    name: string;
    userId: string;
    role: string;
    monthlySalary: number;
    dailyCost: number; // monthlySalary / workdays
    currency: string;
}

// Gauge component – simplified circular progress
const CostGauge: React.FC<{ value: number; max: number; label: string; color: string }> = ({ value, max, label, color }) => {
    const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r={radius} stroke="#e2e8f0" strokeWidth="6" fill="none" />
                    <circle
                        cx="44" cy="44" r={radius}
                        stroke={color}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">{value.toFixed(0)}</span>
                    <span className="text-[9px] text-slate-400 font-medium">EUR</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">{label}</p>
        </div>
    );
};

// Live elapsed time component for reps
const LiveElapsed: React.FC = () => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const iv = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(iv);
    }, []);

    // 8:00 start, current time
    const start = new Date(now);
    start.setHours(8, 0, 0, 0);
    const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 1000 / 60 / 60);
    const capped = Math.min(elapsed, 8); // max 8h
    const h = Math.floor(capped);
    const m = Math.round((capped - h) * 60);

    const isWorkTime = now.getHours() >= 8 && now.getHours() < 16;

    return (
        <div className="flex items-center gap-1.5">
            {isWorkTime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span className={`text-xs font-mono font-bold ${isWorkTime ? 'text-emerald-600' : 'text-slate-400'}`}>
                {h}h {m.toString().padStart(2, '0')}m / 8h
            </span>
        </div>
    );
};

export const LiveCostWidget: React.FC = () => {
    const [teamRows, setTeamRows] = useState<TeamCostRow[]>([]);
    const [salesReps, setSalesReps] = useState<SalesRepRow[]>([]);
    const [monthlyInstallerCost, setMonthlyInstallerCost] = useState(0);
    const [monthlySalesRepCost, setMonthlySalesRepCost] = useState(0);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const [collapsed, setCollapsed] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => setNow(new Date()), 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const loadData = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

            const teams = await InstallationTeamService.getTeams();

            // Today's sessions
            const allTodaySessions: WorkSession[] = [];
            for (const team of teams) {
                try {
                    const sessions = await InstallerSessionService.getWeekSessions(team.id, today, today);
                    allTodaySessions.push(...sessions);
                } catch { /* skip */ }
            }

            // Build team cost rows
            const rows: TeamCostRow[] = [];
            for (const session of allTodaySessions) {
                const team = teams.find(t => t.id === session.teamId);
                const crewCount = session.crewMembers?.length || 1;
                const rates = session.crewRates || [];
                const avgRate = rates.length > 0
                    ? rates.reduce((s, r) => s + (r.hourlyRate || 0), 0) / rates.length : 0;

                let hoursWorked = 0;
                let estimatedCost = session.laborCost || 0;

                if (session.status === 'started' && session.startedAt) {
                    const startTime = new Date(session.startedAt).getTime();
                    const elapsed = (now.getTime() - startTime) / 1000 / 60;
                    const netMinutes = Math.max(0, elapsed - (session.breakMinutes || 0));
                    hoursWorked = netMinutes / 60;
                    estimatedCost = rates.reduce((s, r) => s + (r.hourlyRate || 0) * hoursWorked, 0);
                    if (estimatedCost === 0 && avgRate > 0) estimatedCost = avgRate * crewCount * hoursWorked;
                } else if (session.status === 'completed') {
                    hoursWorked = (session.totalWorkMinutes || 0) / 60;
                    estimatedCost = session.laborCost || 0;
                }

                rows.push({
                    teamName: team?.name || `Ekipa ${session.teamId.slice(0, 6)}`,
                    teamId: session.teamId,
                    crewCount, status: session.status === 'started' ? 'active' : session.status === 'completed' ? 'completed' : 'pending',
                    hoursWorked, estimatedCost, avgRate,
                });
            }

            rows.sort((a, b) => {
                const order = { active: 0, completed: 1, pending: 2 };
                return order[a.status] - order[b.status];
            });
            setTeamRows(rows);

            // Monthly installer cost
            const monthSessions = await InstallerSessionService.getAllSessions(monthStart, today);
            const monthTotal = monthSessions.reduce((s, sess) => {
                if (sess.status === 'completed') return s + (sess.laborCost || 0);
                if (sess.status === 'started' && sess.startedAt) {
                    const startTime = new Date(sess.startedAt).getTime();
                    const elapsed = (now.getTime() - startTime) / 1000 / 60;
                    const netMinutes = Math.max(0, elapsed - (sess.breakMinutes || 0));
                    const hours = netMinutes / 60;
                    const rates = sess.crewRates || [];
                    return s + rates.reduce((sum, r) => sum + (r.hourlyRate || 0) * hours, 0);
                }
                return s;
            }, 0);
            setMonthlyInstallerCost(monthTotal);

            // Sales reps with base salaries
            const { data: repsData, error: repsError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, role, base_salary, base_salary_currency, status')
                .in('role', ['sales_rep', 'manager', 'admin'])
                .eq('status', 'active');
            
            console.log('[LiveCostWidget] Sales reps query:', { repsData, repsError, count: repsData?.length });

            // Count total workdays in current month
            const monthStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const monthEndDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            let totalWorkdaysInMonth = 0;
            const dc = new Date(monthStartDate);
            while (dc <= monthEndDate) {
                const dow = dc.getDay();
                if (dow !== 0 && dow !== 6) totalWorkdaysInMonth++;
                dc.setDate(dc.getDate() + 1);
            }

            // Count elapsed workdays this month
            const todayDate = new Date();
            let elapsedWorkdays = 0;
            const d = new Date(monthStartDate);
            while (d <= todayDate) {
                const dow = d.getDay();
                if (dow !== 0 && dow !== 6) elapsedWorkdays++;
                d.setDate(d.getDate() + 1);
            }

            if (repsData) {
                const reps: SalesRepRow[] = repsData.map((r: any) => {
                    const salary = Number(r.base_salary) || 0;
                    return {
                        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez nazwy',
                        userId: r.id,
                        role: r.role,
                        monthlySalary: salary,
                        dailyCost: totalWorkdaysInMonth > 0 ? salary / totalWorkdaysInMonth : 0,
                        currency: r.base_salary_currency || 'PLN',
                    };
                });
                setSalesReps(reps);

                // Monthly cost so far = sum of (salary / total_workdays * elapsed_workdays)
                const totalRepMonthly = reps.reduce((s, r) => s + (r.dailyCost * elapsedWorkdays), 0);
                setMonthlySalesRepCost(totalRepMonthly);
            }
        } catch (err) {
            console.error('LiveCostWidget error:', err);
        } finally {
            setLoading(false);
        }
    }, [now]);

    useEffect(() => { loadData(); }, [loadData]);

    const activeCount = teamRows.filter(r => r.status === 'active').length;
    const todayInstallerTotal = teamRows.reduce((s, r) => s + r.estimatedCost, 0);

    // Sales reps today cost based on elapsed work hours (8-16) prorated from daily
    const nowHour = now.getHours() + now.getMinutes() / 60;
    const elapsedWorkHours = Math.max(0, Math.min(nowHour - 8, 8));
    const todaySalesRepTotal = nowHour >= 8 ? salesReps.reduce((s, r) => s + (r.dailyCost * elapsedWorkHours / 8), 0) : 0;

    const todayGrandTotal = todayInstallerTotal + todaySalesRepTotal;
    const monthlyGrandTotal = monthlyInstallerCost + monthlySalesRepCost;
    const currentMonthName = new Date().toLocaleString('pl-PL', { month: 'long' });

    // Estimated monthly budget target (simple: 30 workdays × avg daily)
    const estimatedMonthlyBudget = Math.max(monthlyGrandTotal * 1.3, 5000);

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
            {/* Header — clickable to collapse */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 text-white text-left flex items-center justify-between hover:from-violet-700 hover:to-purple-700 transition-all"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                        <h3 className="font-bold text-lg">Koszty robocizny — LIVE</h3>
                        <p className="text-white/60 text-xs">
                            Montażyści + Przedstawiciele
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeCount > 0 && (
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-3 py-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-bold">{activeCount} aktywn{activeCount === 1 ? 'a' : 'e'}</span>
                        </div>
                    )}
                    <span className="text-lg font-bold">{todayGrandTotal.toFixed(0)} €</span>
                    <svg className={`w-5 h-5 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {!collapsed && (
                <>
                    {/* Gauges Row */}
                    <div className="grid grid-cols-3 gap-4 p-5 border-b border-slate-100">
                        <CostGauge
                            value={todayInstallerTotal}
                            max={2000}
                            label="Montażyści dziś"
                            color="#8b5cf6"
                        />
                        <CostGauge
                            value={todaySalesRepTotal}
                            max={1000}
                            label="Handlowcy dziś"
                            color="#3b82f6"
                        />
                        <CostGauge
                            value={monthlyGrandTotal}
                            max={estimatedMonthlyBudget}
                            label={currentMonthName}
                            color="#10b981"
                        />
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-2">
                        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-3 border border-violet-200">
                            <p className="text-[10px] text-violet-600 font-bold uppercase tracking-wider">🔧 Montażyści / miesiąc</p>
                            <p className="text-xl font-bold text-violet-800 mt-1">
                                {monthlyInstallerCost.toFixed(0)} <span className="text-xs font-medium">EUR</span>
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">💼 Handlowcy / miesiąc</p>
                            <p className="text-xl font-bold text-blue-800 mt-1">
                                {monthlySalesRepCost.toFixed(0)} <span className="text-xs font-medium">EUR</span>
                            </p>
                        </div>
                    </div>

                    {/* Installer Teams Table */}
                    {teamRows.length > 0 && (
                        <div className="px-4 pb-2 pt-2">
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
                                                    <span className="text-[10px] text-slate-400">{row.hoursWorked.toFixed(1)}h</span>
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

                    {/* Sales Reps Table */}
                    {salesReps.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                💼 Przedstawiciele handlowi (8:00 – 16:00)
                            </h4>
                            <div className="space-y-1.5">
                                {salesReps.map((rep, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border bg-blue-50/30 border-blue-100">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                                {rep.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{rep.name}</p>
                                                <LiveElapsed />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-blue-700">
                                                {(rep.dailyCost * elapsedWorkHours / 8).toFixed(0)} {rep.currency === 'EUR' ? '€' : 'zł'}
                                            </p>
                                            {rep.monthlySalary > 0 ? (
                                                <p className="text-[10px] text-slate-400">{rep.monthlySalary.toFixed(0)} {rep.currency === 'EUR' ? '€' : 'zł'}/mies. → {rep.dailyCost.toFixed(0)} {rep.currency === 'EUR' ? '€' : 'zł'}/d</p>
                                            ) : (
                                                <p className="text-[10px] text-amber-500">brak podstawy</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                </>
            )}
        </div>
    );
};
