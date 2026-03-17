import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallationService } from '../../services/database/installation.service';
import { InstallerSessionService, WorkSession } from '../../services/database/installer-session.service';
import { DatabaseService } from '../../services/database';
import type { InstallationTeam, Installation, Contract } from '../../types';

type Period = '7d' | '30d' | '90d' | 'month' | 'all';

const periodLabel: Record<Period, string> = {
    '7d': 'Ostatnie 7 dni',
    '30d': 'Ostatnie 30 dni',
    '90d': 'Ostatnie 90 dni',
    'month': 'Ten miesiąc',
    'all': 'Wszystko',
};

const fmt = (n: number) => n.toFixed(2);
const fmtH = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

export const TeamsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [sessions, setSessions] = useState<WorkSession[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [period, setPeriod] = useState<Period>('30d');
    const [loading, setLoading] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    // Date range from period
    const dateRange = useMemo(() => {
        const now = new Date();
        let start: Date;
        switch (period) {
            case '7d': start = new Date(now.getTime() - 7 * 86400000); break;
            case '30d': start = new Date(now.getTime() - 30 * 86400000); break;
            case '90d': start = new Date(now.getTime() - 90 * 86400000); break;
            case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'all': start = new Date(2020, 0, 1); break;
        }
        return {
            start: start.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0],
        };
    }, [period]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [t, s, i, c] = await Promise.all([
                    InstallationService.getTeams(),
                    InstallerSessionService.getAllSessions(dateRange.start, dateRange.end),
                    InstallationService.getInstallations(),
                    DatabaseService.getContracts(),
                ]);
                setTeams(t);
                setSessions(s);
                setInstallations(i);
                setContracts(c);
            } catch (e) {
                console.error('TeamsDashboard load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [dateRange]);

    // Per-team aggregates
    const teamStats = useMemo(() => {
        return teams.map(team => {
            const teamSessions = sessions.filter(s => s.teamId === team.id);
            const completedSessions = teamSessions.filter(s => s.status === 'completed');
            const teamInstallations = installations.filter(i => i.teamId === team.id);

            // Date-filtered installations
            const filteredInstallations = teamInstallations.filter(i => {
                const d = i.scheduledDate || (i.createdAt && new Date(i.createdAt).toISOString().split('T')[0]);
                return d && d >= dateRange.start && d <= dateRange.end;
            });

            const completedInstallations = filteredInstallations.filter(i => i.status === 'completed' || i.status === 'verification');
            const withProtocol = completedInstallations.filter(i => (i as any).completionReport);
            const withoutProtocol = completedInstallations.filter(i => !(i as any).completionReport);
            const pendingInstallations = filteredInstallations.filter(i => i.status === 'scheduled' || i.status === 'confirmed' || i.status === 'pending');

            const totalMinutes = completedSessions.reduce((s, x) => s + (x.totalWorkMinutes || 0), 0);
            const totalLabor = completedSessions.reduce((s, x) => s + x.laborCost, 0);
            const totalFuel = completedSessions.reduce((s, x) => s + x.fuelCost, 0);
            const totalHotel = completedSessions.reduce((s, x) => s + x.hotelCost, 0);
            const totalCost = completedSessions.reduce((s, x) => s + x.totalCost, 0);

            // Per-member breakdown
            const memberStats = team.members.map(member => {
                // Sessions where this member was in the crew
                const memberSessions = completedSessions.filter(s =>
                    s.crewMembers.some((cm: any) => cm.id === member.id)
                );
                const memberMinutes = memberSessions.reduce((sum, s) => sum + (s.totalWorkMinutes || 0), 0);
                const memberLaborCost = memberSessions.reduce((sum, s) => {
                    const rate = s.crewRates.find((r: any) => r.id === member.id);
                    const hours = (s.totalWorkMinutes || 0) / 60;
                    return sum + (hours * (rate?.hourlyRate || member.hourlyRate || 0));
                }, 0);

                return {
                    ...member,
                    name: `${member.firstName} ${member.lastName}`,
                    sessionsCount: memberSessions.length,
                    totalMinutes: memberMinutes,
                    laborCost: memberLaborCost,
                };
            });

            return {
                team,
                sessionsCount: completedSessions.length,
                totalMinutes,
                totalLabor,
                totalFuel,
                totalHotel,
                totalCost,
                completedInstallations: completedInstallations.length,
                pendingInstallations: pendingInstallations.length,
                withProtocol: withProtocol.length,
                withoutProtocol: withoutProtocol.length,
                memberStats,
                // Keep raw for protocol detail
                protocolDetails: completedInstallations.map(i => {
                    const linkedContract = contracts.find(c => c.offerId === i.offerId);
                    return {
                    id: i.id,
                    contractId: linkedContract?.id,
                    client: `${i.client.firstName} ${i.client.lastName}`,
                    city: i.client.city,
                    product: i.productSummary,
                    date: i.scheduledDate,
                    hasProtocol: !!(i as any).completionReport,
                    protocol: (i as any).completionReport,
                };}),

            };
        }).sort((a, b) => b.totalMinutes - a.totalMinutes);
    }, [teams, sessions, installations, contracts, dateRange]);

    // Global totals
    const globalStats = useMemo(() => {
        return teamStats.reduce((acc, ts) => ({
            sessions: acc.sessions + ts.sessionsCount,
            minutes: acc.minutes + ts.totalMinutes,
            labor: acc.labor + ts.totalLabor,
            fuel: acc.fuel + ts.totalFuel,
            hotel: acc.hotel + ts.totalHotel,
            cost: acc.cost + ts.totalCost,
            completed: acc.completed + ts.completedInstallations,
            pending: acc.pending + ts.pendingInstallations,
            withProtocol: acc.withProtocol + ts.withProtocol,
            withoutProtocol: acc.withoutProtocol + ts.withoutProtocol,
        }), { sessions: 0, minutes: 0, labor: 0, fuel: 0, hotel: 0, cost: 0, completed: 0, pending: 0, withProtocol: 0, withoutProtocol: 0 });
    }, [teamStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-slate-500 text-sm">Ładowanie danych ekip...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-3xl">👷</span> Dashboard Ekip Montażowych
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Czas pracy, montaże, protokoły odbioru</p>
                </div>
                {/* Period selector */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    {(Object.keys(periodLabel) as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {periodLabel[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Global Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                <StatCard icon="⏱" label="Czas pracy" value={fmtH(globalStats.minutes)} color="blue" />
                <StatCard icon="🔧" label="Sesje robocze" value={`${globalStats.sessions}`} color="purple" />
                <StatCard icon="✅" label="Ukończone montaże" value={`${globalStats.completed}`} color="green" />
                <StatCard icon="📋" label="Z protokołem" value={`${globalStats.withProtocol} / ${globalStats.completed}`} color="emerald" />
                <StatCard icon="⚠️" label="Brak protokołu" value={`${globalStats.withoutProtocol}`} color="amber" />
                <StatCard icon="💰" label="Łączne koszty" value={`${fmt(globalStats.cost)} €`} color="red" />
            </div>

            {/* Cost breakdown bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Rozkład kosztów</h3>
                <div className="flex gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        <span className="text-sm text-slate-600">Robocizna: <strong className="text-slate-800">{fmt(globalStats.labor)} €</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-500"></div>
                        <span className="text-sm text-slate-600">Paliwo: <strong className="text-slate-800">{fmt(globalStats.fuel)} €</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                        <span className="text-sm text-slate-600">Hotel: <strong className="text-slate-800">{fmt(globalStats.hotel)} €</strong></span>
                    </div>
                </div>
                {/* Visual bar */}
                {globalStats.cost > 0 && (
                    <div className="mt-3 h-4 rounded-full overflow-hidden bg-slate-100 flex">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${(globalStats.labor / globalStats.cost) * 100}%` }} title={`Robocizna: ${fmt(globalStats.labor)} €`}></div>
                        <div className="bg-amber-500 h-full transition-all" style={{ width: `${(globalStats.fuel / globalStats.cost) * 100}%` }} title={`Paliwo: ${fmt(globalStats.fuel)} €`}></div>
                        <div className="bg-purple-500 h-full transition-all" style={{ width: `${(globalStats.hotel / globalStats.cost) * 100}%` }} title={`Hotel: ${fmt(globalStats.hotel)} €`}></div>
                    </div>
                )}
            </div>

            {/* Team Cards */}
            {teamStats.length === 0 ? (
                <div className="text-center text-slate-400 py-16 bg-white rounded-xl border border-slate-200">
                    <p className="text-lg mb-2">Brak ekip montażowych</p>
                    <p className="text-sm">Utwórz ekipę w sekcji zarządzania ekipami</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {teamStats.map(ts => {
                        const isExpanded = expandedTeam === ts.team.id;
                        return (
                            <div key={ts.team.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Team Header */}
                                <button
                                    onClick={() => setExpandedTeam(isExpanded ? null : ts.team.id)}
                                    className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="w-4 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: ts.team.color || '#6366f1' }}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800">{ts.team.name}</span>
                                            {!ts.team.isActive && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Nieaktywna</span>}
                                            <span className="text-[10px] text-slate-400 font-medium">{ts.team.members.length} osób</span>
                                            {ts.team.vehicle && <span className="text-[10px] text-slate-400">• 🚐 {ts.team.vehicle}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span>⏱ <strong className="text-slate-700">{fmtH(ts.totalMinutes)}</strong></span>
                                            <span>🔧 <strong className="text-slate-700">{ts.sessionsCount}</strong> sesji</span>
                                            <span>✅ <strong className="text-green-600">{ts.completedInstallations}</strong> montaży</span>
                                            <span>📋 <strong className={ts.withoutProtocol > 0 ? 'text-amber-600' : 'text-emerald-600'}>{ts.withProtocol}/{ts.completedInstallations}</strong> protokołów</span>
                                            <span>💰 <strong className="text-red-600">{fmt(ts.totalCost)} €</strong></span>
                                        </div>
                                    </div>
                                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100">
                                        {/* Members Table */}
                                        <div className="p-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">👤 Członkowie ekipy</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 border-b border-slate-100">
                                                        <tr>
                                                            <th className="text-left p-2.5 text-[10px] font-bold text-slate-400 uppercase">Osoba</th>
                                                            <th className="text-center p-2.5 text-[10px] font-bold text-slate-400 uppercase">Rola</th>
                                                            <th className="text-center p-2.5 text-[10px] font-bold text-slate-400 uppercase">Stawka/h</th>
                                                            <th className="text-center p-2.5 text-[10px] font-bold text-slate-400 uppercase">Sesje</th>
                                                            <th className="text-center p-2.5 text-[10px] font-bold text-slate-400 uppercase">Czas pracy</th>
                                                            <th className="text-right p-2.5 text-[10px] font-bold text-slate-400 uppercase">Koszt robocizny</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {ts.memberStats.map(m => (
                                                            <tr key={m.id} className="hover:bg-slate-50">
                                                                <td className="p-2.5">
                                                                    <div className="font-medium text-slate-800">{m.name}</div>
                                                                    <div className="text-[10px] text-slate-400">{m.type === 'virtual' ? '🏷️ Bez konta' : '🔑 Z kontem'}</div>
                                                                </td>
                                                                <td className="p-2.5 text-center text-slate-600">{m.role || 'Montażysta'}</td>
                                                                <td className="p-2.5 text-center font-bold text-slate-700">{(m.hourlyRate || 0).toFixed(0)} €/h</td>
                                                                <td className="p-2.5 text-center font-bold text-slate-700">{m.sessionsCount}</td>
                                                                <td className="p-2.5 text-center font-medium text-blue-600">{fmtH(m.totalMinutes)}</td>
                                                                <td className="p-2.5 text-right font-bold text-red-600">{fmt(m.laborCost)} €</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                                                        <tr>
                                                            <td className="p-2.5 text-slate-700 text-xs uppercase" colSpan={3}>Razem</td>
                                                            <td className="p-2.5 text-center text-slate-700">{ts.sessionsCount}</td>
                                                            <td className="p-2.5 text-center text-blue-700">{fmtH(ts.totalMinutes)}</td>
                                                            <td className="p-2.5 text-right text-red-700">{fmt(ts.totalLabor)} €</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Cost Summary */}
                                        <div className="px-4 pb-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">💰 Koszty łączne</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <div className="bg-blue-50 p-3 rounded-lg">
                                                    <div className="text-[10px] text-blue-500 font-bold uppercase">Robocizna</div>
                                                    <div className="text-lg font-bold text-blue-700">{fmt(ts.totalLabor)} €</div>
                                                </div>
                                                <div className="bg-amber-50 p-3 rounded-lg">
                                                    <div className="text-[10px] text-amber-500 font-bold uppercase">Paliwo</div>
                                                    <div className="text-lg font-bold text-amber-700">{fmt(ts.totalFuel)} €</div>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-lg">
                                                    <div className="text-[10px] text-purple-500 font-bold uppercase">Hotel</div>
                                                    <div className="text-lg font-bold text-purple-700">{fmt(ts.totalHotel)} €</div>
                                                </div>
                                                <div className="bg-red-50 p-3 rounded-lg">
                                                    <div className="text-[10px] text-red-500 font-bold uppercase">Razem</div>
                                                    <div className="text-lg font-bold text-red-700">{fmt(ts.totalCost)} €</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Installations & Protocols */}
                                        <div className="px-4 pb-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">📋 Montaże i Protokoły ({ts.completedInstallations} ukończonych)</h4>
                                            {ts.protocolDetails.length > 0 ? (
                                                <div className="space-y-2">
                                                    {ts.protocolDetails.map(pd => (
                                                        <div
                                                            key={pd.id}
                                                            onClick={() => pd.contractId && navigate(`/contracts/${pd.contractId}`)}
                                                            className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${pd.contractId ? 'cursor-pointer hover:shadow-md' : ''} ${pd.hasProtocol ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}
                                                        >
                                                            <span className="text-lg flex-shrink-0">{pd.hasProtocol ? '✅' : '⚠️'}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm text-slate-800 truncate">{pd.client}</div>
                                                                <div className="text-xs text-slate-500">{pd.city} • {pd.product}</div>
                                                            </div>
                                                            <div className="flex-shrink-0 text-right">
                                                                <div className="text-xs text-slate-500">{pd.date ? new Date(pd.date).toLocaleDateString('pl-PL') : '—'}</div>
                                                                <div className={`text-[10px] font-bold ${pd.hasProtocol ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                    {pd.hasProtocol ? 'Protokół ✓' : 'Brak protokołu'}
                                                                </div>
                                                                {pd.hasProtocol && pd.protocol?.submittedAt && (
                                                                    <div className="text-[10px] text-slate-400">
                                                                        {new Date(pd.protocol.submittedAt).toLocaleDateString('pl-PL')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-slate-400 text-sm py-6 bg-slate-50 rounded-lg border border-slate-100">
                                                    Brak ukończonych montaży w wybranym okresie
                                                </div>
                                            )}
                                            {ts.pendingInstallations > 0 && (
                                                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                                    <span>📅</span> {ts.pendingInstallations} montaży w kolejce / zaplanowanych
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Stat card component
const StatCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        red: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
        <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-lg font-bold leading-tight">{value}</div>
            <div className="text-[10px] font-bold uppercase opacity-60 mt-0.5">{label}</div>
        </div>
    );
};
