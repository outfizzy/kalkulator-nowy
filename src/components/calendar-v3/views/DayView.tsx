import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Installation, InstallationTeam, TeamUnavailability } from '../../../types';

interface DayViewProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability?: TeamUnavailability[];
    onRefresh: () => void;
    onEditInstallation?: (installation: Installation) => void;
    onDrop?: (itemId: string, itemType: string, targetDate: string, targetTeamId: string) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 6); // 6:00 – 17:00
const DAY_HEIGHT = 60; // px per hour row

const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    completed: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', label: 'Ukończono' },
    in_progress: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', label: 'W trakcie' },
    scheduled: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800', label: 'Zaplanowano' },
    confirmed: { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-800', label: 'Potwierdzone' },
    pending: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', label: 'Oczekuje' },
    verification: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-800', label: 'Weryfikacja' },
    cancelled: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'Anulowane' },
};

export const DayView: React.FC<DayViewProps> = ({
    currentDate,
    installations,
    teams,
    unavailability = [],
    onRefresh,
    onEditInstallation,
    onDrop
}) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const activeTeams = useMemo(() => teams.filter(t => t.isActive !== false), [teams]);

    // Day installations grouped by team
    const dayInstallations = useMemo(() => {
        return installations.filter(i => i.scheduledDate === dateStr);
    }, [installations, dateStr]);

    const installationsByTeam = useMemo(() => {
        const map = new Map<string, Installation[]>();
        activeTeams.forEach(t => map.set(t.id, []));
        map.set('unassigned', []);

        dayInstallations.forEach(inst => {
            const key = inst.teamId && map.has(inst.teamId) ? inst.teamId : 'unassigned';
            map.get(key)!.push(inst);
        });
        return map;
    }, [dayInstallations, activeTeams]);

    // Check unavailability per team
    const unavailTeamIds = useMemo(() => {
        const set = new Set<string>();
        unavailability.forEach(u => {
            const start = new Date(u.startDate).toISOString().split('T')[0];
            const end = new Date(u.endDate).toISOString().split('T')[0];
            if (dateStr >= start && dateStr <= end) {
                set.add(u.teamId);
            }
        });
        return set;
    }, [unavailability, dateStr]);

    // Drag handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnTeam = (e: React.DragEvent, teamId: string) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            onDrop?.(data.id, data.type, dateStr, teamId);
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    // Summary stats
    const totalInstallations = dayInstallations.length;
    const totalHours = dayInstallations.reduce((sum, i) => sum + (i.expectedDuration || 1) * 8, 0);

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Day Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            📅 {format(currentDate, 'EEEE, d MMMM yyyy', { locale: pl })}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {totalInstallations} montaży · ~{totalHours}h pracy
                            {isToday && <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Dziś</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Team columns layout */}
            <div className="flex-1 overflow-auto">
                <div className="min-w-fit">
                    {/* Team headers */}
                    <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                        <div className="w-16 flex-shrink-0 p-2 text-[10px] font-medium text-slate-500 uppercase">
                            Godz.
                        </div>
                        {activeTeams.map(team => {
                            const teamInsts = installationsByTeam.get(team.id) || [];
                            const isUnavail = unavailTeamIds.has(team.id);
                            return (
                                <div
                                    key={team.id}
                                    className={`flex-1 min-w-[180px] p-2 border-l border-slate-200 ${isUnavail ? 'bg-red-50/50' : ''
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropOnTeam(e, team.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-sm flex-shrink-0"
                                            style={{ backgroundColor: team.color || '#6366f1' }}
                                        />
                                        <span className="text-sm font-bold text-slate-700 truncate">{team.name}</span>
                                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full ml-auto">
                                            {teamInsts.length}
                                        </span>
                                    </div>
                                    {isUnavail && (
                                        <div className="text-[10px] text-red-500 mt-0.5 font-medium">🚫 Niedostępna</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Hours grid */}
                    {HOURS.map(hour => (
                        <div key={hour} className="flex border-b border-slate-100" style={{ minHeight: DAY_HEIGHT }}>
                            {/* Hour label */}
                            <div className="w-16 flex-shrink-0 p-1 text-right pr-2 border-r border-slate-200">
                                <span className="text-[11px] font-medium text-slate-400">{hour}:00</span>
                            </div>

                            {/* Team cells */}
                            {activeTeams.map(team => {
                                const isUnavail = unavailTeamIds.has(team.id);
                                return (
                                    <div
                                        key={team.id}
                                        className={`flex-1 min-w-[180px] border-l border-slate-100 p-1 ${isUnavail ? 'bg-red-50/30' : 'hover:bg-blue-50/30'
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropOnTeam(e, team.id)}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Day Installation Cards — overlaid below the time grid */}
            <div className="border-t border-slate-200 bg-slate-50/50 overflow-y-auto" style={{ maxHeight: 300 }}>
                <div className="p-3">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Wszystkie montaże na {format(currentDate, 'd MMM', { locale: pl })}
                    </h3>
                    {activeTeams.map(team => {
                        const teamInsts = installationsByTeam.get(team.id) || [];
                        if (teamInsts.length === 0) return null;

                        return (
                            <div key={team.id} className="mb-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: team.color || '#6366f1' }} />
                                    <span className="text-xs font-bold text-slate-700">{team.name}</span>
                                    <span className="text-[10px] text-slate-400">({teamInsts.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {teamInsts.map(inst => {
                                        const clientName = [inst.client?.firstName, inst.client?.lastName].filter(Boolean).join(' ') || inst.title || 'Montaż';
                                        const s = statusConfig[inst.status] || statusConfig.pending;
                                        const address = [inst.client?.address, inst.client?.city].filter(Boolean).join(', ');

                                        return (
                                            <div
                                                key={inst.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('application/json', JSON.stringify({ id: inst.id, type: 'installation' }));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onClick={() => onEditInstallation?.(inst)}
                                                className={`p-2.5 rounded-lg border-l-4 ${s.border} ${s.bg} cursor-pointer hover:shadow-md transition-all`}
                                            >
                                                <div className="flex items-start justify-between gap-1 mb-1">
                                                    <span className={`font-bold text-sm ${s.text}`}>{clientName}</span>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border} whitespace-nowrap`}>
                                                        {s.label}
                                                    </span>
                                                </div>
                                                {inst.contractNumber && (
                                                    <p className="text-[11px] font-mono text-slate-500 mb-0.5">{inst.contractNumber}</p>
                                                )}
                                                {address && (
                                                    <p className="text-[11px] text-slate-500 truncate">📍 {address}</p>
                                                )}
                                                {inst.productSummary && (
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">📦 {inst.productSummary}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                                                    <span>⏱️ {inst.expectedDuration || 1}d</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Unassigned */}
                    {(installationsByTeam.get('unassigned') || []).length > 0 && (
                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px]">⚠️</span>
                                <span className="text-xs font-bold text-orange-600">Bez przypisanej ekipy</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(installationsByTeam.get('unassigned') || []).map(inst => {
                                    const clientName = [inst.client?.firstName, inst.client?.lastName].filter(Boolean).join(' ') || 'Montaż';
                                    return (
                                        <div
                                            key={inst.id}
                                            onClick={() => onEditInstallation?.(inst)}
                                            className="p-2.5 rounded-lg border-l-4 border-orange-300 bg-orange-50 cursor-pointer hover:shadow-md transition-all"
                                        >
                                            <span className="font-bold text-sm text-orange-800">{clientName}</span>
                                            {inst.client?.city && (
                                                <p className="text-[11px] text-orange-600">📍 {inst.client.city}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {dayInstallations.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-sm font-medium">Brak montaży na ten dzień</p>
                            <p className="text-xs mt-1">Przeciągnij umowę z panelu bocznego aby zaplanować</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
