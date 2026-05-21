/**
 * QuickTeamEditor — Slide-over panel for fast team editing from /installations
 * Allows: viewing teams, changing leader, modifying members, saving per-week overrides
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { InstallationTeam } from '../../types';
import { InstallationTeamService } from '../../services/database/installation-team.service';

interface QuickTeamEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onTeamsUpdated?: () => void;
}

interface WorkerRow {
    id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number;
    team_id: string | null;
    status: string;
    profile_id: string | null;
}

// Get Monday of the current week
const getMonday = (d: Date = new Date()): string => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
};

// Format date as "DD.MM"
const fmtDate = (d: string) => {
    const [y, m, dd] = d.split('-');
    return `${dd}.${m}`;
};

// Get week end (Sunday) from Monday
const getWeekEnd = (monday: string): string => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
};

export const QuickTeamEditor: React.FC<QuickTeamEditorProps> = ({ isOpen, onClose, onTeamsUpdated }) => {
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [workers, setWorkers] = useState<WorkerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState(getMonday());
    const [weekOverrides, setWeekOverrides] = useState<Record<string, any>>({});

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [teamsData, { data: workersData }, { data: overridesData }] = await Promise.all([
                InstallationTeamService.getTeams(),
                supabase.from('installer_workers').select('id, first_name, last_name, hourly_rate, team_id, status, profile_id').eq('status', 'available'),
                supabase.from('team_schedule_overrides').select('*').eq('week_start', selectedWeek)
            ]);
            setTeams(teamsData);
            setWorkers(workersData || []);
            // Map overrides by team_id
            const ovMap: Record<string, any> = {};
            (overridesData || []).forEach((ov: any) => { ovMap[ov.team_id] = ov; });
            setWeekOverrides(ovMap);
        } catch (err) {
            console.error('Error loading teams:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadOverridesForWeek = async (week: string) => {
        const { data } = await supabase.from('team_schedule_overrides').select('*').eq('week_start', week);
        const ovMap: Record<string, any> = {};
        (data || []).forEach((ov: any) => { ovMap[ov.team_id] = ov; });
        setWeekOverrides(ovMap);
    };

    const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Input type=week returns YYYY-Www, we need Monday date
        const val = e.target.value;
        if (!val) return;
        const [year, weekStr] = val.split('-W');
        const jan4 = new Date(parseInt(year), 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const monday = new Date(jan4);
        monday.setDate(jan4.getDate() - dayOfWeek + 1 + (parseInt(weekStr) - 1) * 7);
        const iso = monday.toISOString().split('T')[0];
        setSelectedWeek(iso);
        loadOverridesForWeek(iso);
    };

    const setLeader = async (teamId: string, memberId: string) => {
        setSaving(true);
        try {
            await InstallationTeamService.updateTeam(teamId, { leaderId: memberId });
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, leaderId: memberId } : t));
            toast.success('Lider ustawiony');
            onTeamsUpdated?.();
        } catch { toast.error('Błąd'); }
        finally { setSaving(false); }
    };

    const removeMember = async (teamId: string, memberId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        const newMembers = team.members.filter(m => m.id !== memberId);
        setSaving(true);
        try {
            await InstallationTeamService.updateTeam(teamId, { members: newMembers });
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: newMembers } : t));
            toast.success('Usunięto z zespołu');
            onTeamsUpdated?.();
        } catch { toast.error('Błąd'); }
        finally { setSaving(false); }
    };

    const addMember = async (teamId: string, worker: WorkerRow) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        if (team.members.some(m => m.id === worker.profile_id || m.id === worker.id)) {
            toast.error('Już w zespole');
            return;
        }
        const newMember = {
            id: worker.profile_id || worker.id,
            firstName: worker.first_name,
            lastName: worker.last_name,
            role: 'member' as const,
            hourlyRate: worker.hourly_rate,
            type: worker.profile_id ? 'user' as const : 'virtual' as const,
        };
        const newMembers = [...team.members, newMember];
        setSaving(true);
        try {
            await InstallationTeamService.updateTeam(teamId, { members: newMembers });
            // Also update worker's team_id
            await supabase.from('installer_workers').update({ team_id: teamId }).eq('id', worker.id);
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: newMembers } : t));
            toast.success(`Dodano ${worker.first_name}`);
            onTeamsUpdated?.();
        } catch { toast.error('Błąd'); }
        finally { setSaving(false); }
    };

    const saveWeekOverride = async (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        setSaving(true);
        try {
            await supabase.from('team_schedule_overrides').upsert({
                team_id: teamId,
                week_start: selectedWeek,
                members: team.members,
                leader_id: team.leaderId || null,
                confirmed: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'team_id,week_start' });
            setWeekOverrides(prev => ({ ...prev, [teamId]: { confirmed: true } }));
            toast.success(`Skład na tydzień ${fmtDate(selectedWeek)} zapisany`);
        } catch { toast.error('Błąd zapisu'); }
        finally { setSaving(false); }
    };

    // Available workers not in any team
    const getAvailableWorkers = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return workers;
        const memberIds = new Set(team.members.map(m => m.id));
        return workers.filter(w => !memberIds.has(w.profile_id || w.id) && !memberIds.has(w.id));
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="text-xl">⚡</span> Grupy Montażowe
                        </h2>
                        <p className="text-xs text-slate-500">Szybka edycja składów i liderów</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Week selector */}
                <div className="px-4 py-2.5 border-b bg-amber-50/50 flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-800">📅 Tydzień:</span>
                    <input
                        type="date"
                        value={selectedWeek}
                        onChange={e => { setSelectedWeek(e.target.value); loadOverridesForWeek(e.target.value); }}
                        className="text-sm border border-amber-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-amber-300 outline-none"
                    />
                    <span className="text-[10px] text-amber-600">
                        {fmtDate(selectedWeek)} – {fmtDate(getWeekEnd(selectedWeek))}
                    </span>
                </div>

                {/* Teams list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                        </div>
                    ) : teams.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">Brak zespołów</div>
                    ) : teams.map(team => {
                        const isExpanded = expandedTeam === team.id;
                        const hasOverride = !!weekOverrides[team.id];
                        const isConfirmed = weekOverrides[team.id]?.confirmed;

                        return (
                            <div key={team.id}
                                className={`bg-white rounded-xl border overflow-hidden transition-all ${isExpanded ? 'shadow-lg ring-2 ring-blue-100 border-blue-300' : 'shadow-sm border-slate-200 hover:shadow-md'}`}
                            >
                                {/* Team header */}
                                <div
                                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                                >
                                    <div className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-800 truncate">{team.name}</span>
                                            {hasOverride && (
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {isConfirmed ? '✓ POTWIERDZONY' : 'OVERRIDE'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {team.members.map(m => (
                                                <span key={m.id} className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.id === team.leaderId ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                                                    {m.id === team.leaderId && '👑 '}{m.firstName} {m.lastName?.[0]}.
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>

                                {/* Expanded panel */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 px-3 py-3 space-y-3 bg-slate-50/50">
                                        {/* Members with leader toggle */}
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Członkowie ({team.members.length})</p>
                                            <div className="space-y-1">
                                                {team.members.map(m => (
                                                    <div key={m.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-100">
                                                        {/* Leader toggle */}
                                                        <button
                                                            onClick={() => setLeader(team.id, m.id)}
                                                            disabled={saving}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all shrink-0 ${
                                                                m.id === team.leaderId
                                                                    ? 'bg-amber-400 text-white shadow-sm'
                                                                    : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'
                                                            }`}
                                                            title={m.id === team.leaderId ? 'Lider' : 'Ustaw jako lidera'}
                                                        >
                                                            👑
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-slate-800">{m.firstName} {m.lastName}</span>
                                                            {m.hourlyRate && <span className="text-[10px] text-slate-400 ml-1.5">{m.hourlyRate} PLN/h</span>}
                                                        </div>
                                                        <button
                                                            onClick={() => removeMember(team.id, m.id)}
                                                            disabled={saving}
                                                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Add member */}
                                        {getAvailableWorkers(team.id).length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dodaj pracownika</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {getAvailableWorkers(team.id).slice(0, 10).map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => addMember(team.id, w)}
                                                            disabled={saving}
                                                            className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors"
                                                        >
                                                            + {w.first_name} {w.last_name?.[0]}.
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Save buttons */}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => saveWeekOverride(team.id)}
                                                disabled={saving}
                                                className="flex-1 py-2 px-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                                            >
                                                📅 Zapisz na tydzień {fmtDate(selectedWeek)}
                                            </button>
                                        </div>

                                        {team.vehicle && (
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">🚗 {team.vehicle}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{teams.length} zespołów • {workers.length} pracowników</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                    >
                        Zamknij
                    </button>
                </div>
            </div>
        </>
    );
};
