import React, { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek, isSameDay, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Installation, InstallationTeam, TeamUnavailability } from '../../../types';
import { InstallationCard } from '../InstallationCard';

interface WeekViewProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability?: TeamUnavailability[];
    onDrop?: (itemId: string, itemType: 'contract' | 'service' | 'installation', targetDate: string, targetTeamId: string) => void;
    onEditInstallation?: (installation: Installation) => void;
    onRefresh: () => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
    currentDate,
    installations,
    teams,
    unavailability = [],
    onDrop,
    onEditInstallation,
    onRefresh
}) => {
    const [showWeekend, setShowWeekend] = useState(false);
    const [dragOverCell, setDragOverCell] = useState<string | null>(null);

    // Get week days (Monday to Sunday)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekDays = showWeekend ? allDays : allDays.slice(0, 5);

    // Helper: format date to YYYY-MM-DD
    const toDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

    // Group installations by teamId × date
    const installationGrid = useMemo(() => {
        const grid: Record<string, Record<string, Installation[]>> = {};

        // Add unassigned row
        grid['__unassigned'] = {};

        teams.forEach(team => {
            grid[team.id] = {};
        });

        installations.forEach(inst => {
            const dateKey = inst.scheduledDate?.split('T')[0];
            if (!dateKey) return;

            const teamId = inst.teamId || '__unassigned';
            if (!grid[teamId]) grid[teamId] = {};
            if (!grid[teamId][dateKey]) grid[teamId][dateKey] = [];
            grid[teamId][dateKey].push(inst);
        });

        return grid;
    }, [installations, teams]);

    // Unavailability lookup
    const unavailabilityLookup = useMemo(() => {
        const lookup = new Set<string>();
        unavailability.forEach(u => {
            const start = new Date(u.startDate);
            const end = new Date(u.endDate);
            const current = new Date(start);
            while (current <= end) {
                lookup.add(`${u.teamId}-${toDateKey(current)}`);
                current.setDate(current.getDate() + 1);
            }
        });
        return lookup;
    }, [unavailability]);

    // Count weekend installations
    const weekendInstallations = allDays.slice(5).reduce((count, day) => {
        const dateKey = toDateKey(day);
        return count + installations.filter(i => i.scheduledDate?.split('T')[0] === dateKey).length;
    }, 0);

    // Native drag-drop handlers
    const handleDragOver = useCallback((e: React.DragEvent, cellKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCell(cellKey);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverCell(null);
    }, []);

    const handleDropEvent = useCallback((e: React.DragEvent, dateKey: string, teamId: string) => {
        e.preventDefault();
        setDragOverCell(null);

        try {
            const json = e.dataTransfer.getData('application/json');
            if (json) {
                const { id, type } = JSON.parse(json);
                onDrop?.(id, type, dateKey, teamId);
                return;
            }
        } catch { /* ignore */ }
    }, [onDrop]);

    // Get team name and color
    const getTeamInfo = (teamId: string) => {
        if (teamId === '__unassigned') {
            return { name: 'Bez ekipy', color: '#94a3b8' };
        }
        const team = teams.find(t => t.id === teamId);
        return {
            name: team?.name || 'Nieznany',
            color: team?.color || '#6366f1'
        };
    };

    // Multi-day spanning helpers
    const getInstallationSpan = (inst: Installation) => {
        return inst.expectedDuration || 1;
    };

    const teamOrder = [...teams.map(t => t.id)];
    // Add unassigned row only if there are unassigned installations
    const hasUnassigned = Object.keys(installationGrid['__unassigned'] || {}).length > 0;
    if (hasUnassigned) teamOrder.push('__unassigned');

    return (
        <div className="h-full flex flex-col">
            {/* Column headers (days) */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                {/* Team column label */}
                <div className="w-44 flex-shrink-0 px-3 py-3 border-r border-slate-200 font-semibold text-sm text-slate-500 flex items-center">
                    Ekipa
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const isWeekendDay = isWeekend(day);
                    const dateKey = toDateKey(day);
                    const dayCount = installations.filter(i => i.scheduledDate?.split('T')[0] === dateKey).length;

                    return (
                        <div
                            key={dateKey}
                            className={`flex-1 px-3 py-3 text-center border-r border-slate-200 last:border-r-0 min-w-[140px] ${isToday ? 'bg-amber-50' : isWeekendDay ? 'bg-slate-100' : ''
                                }`}
                        >
                            <div className={`text-sm font-medium ${isToday ? 'text-amber-600' : 'text-slate-600'}`}>
                                {format(day, 'EEEE', { locale: pl })}
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className={`text-2xl font-bold ${isToday ? 'text-amber-600' : isWeekendDay ? 'text-slate-400' : 'text-slate-900'
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                                {dayCount > 0 && (
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                                        {dayCount}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                {format(day, 'MMM yyyy', { locale: pl })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Weekend toggle */}
            {!showWeekend && (
                <button
                    onClick={() => setShowWeekend(true)}
                    className="text-xs text-slate-400 hover:text-slate-600 py-1 px-4 text-right transition-colors"
                >
                    + Pokaż weekend {weekendInstallations > 0 && (
                        <span className="text-amber-500 font-semibold">({weekendInstallations} montaży)</span>
                    )}
                </button>
            )}
            {showWeekend && (
                <button
                    onClick={() => setShowWeekend(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 py-1 px-4 text-right transition-colors"
                >
                    − Ukryj weekend
                </button>
            )}

            {/* Team rows × Day columns grid */}
            <div className="flex-1 overflow-auto">
                {teamOrder.map((teamId) => {
                    const teamInfo = getTeamInfo(teamId);

                    return (
                        <div key={teamId} className="flex border-b border-slate-200 min-h-[100px]">
                            {/* Team label */}
                            <div className="w-44 flex-shrink-0 px-3 py-3 border-r border-slate-200 bg-slate-50 sticky left-0 z-10">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: teamInfo.color }}
                                    />
                                    <span className="font-semibold text-sm text-slate-700 truncate">
                                        {teamInfo.name}
                                    </span>
                                </div>

                                {/* Team members */}
                                {teamId !== '__unassigned' && (() => {
                                    const team = teams.find(t => t.id === teamId);
                                    if (team?.members && team.members.length > 0) {
                                        return (
                                            <p className="text-[10px] text-slate-400 mt-1 truncate">
                                                {team.members.join(', ')}
                                            </p>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            {/* Day cells */}
                            {weekDays.map((day) => {
                                const dateKey = toDateKey(day);
                                const cellKey = `${teamId}-${dateKey}`;
                                const cellInstallations = installationGrid[teamId]?.[dateKey] || [];
                                const isUnavailable = unavailabilityLookup.has(cellKey);
                                const isWeekendDay = isWeekend(day);
                                const isToday = isSameDay(day, new Date());
                                const isDragOver = dragOverCell === cellKey;

                                return (
                                    <div
                                        key={cellKey}
                                        className={`flex-1 min-w-[140px] p-1.5 border-r border-slate-200 last:border-r-0 transition-colors ${isDragOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' :
                                                isUnavailable ? 'bg-red-50/50' :
                                                    isToday ? 'bg-amber-50/30' :
                                                        isWeekendDay ? 'bg-slate-50' : ''
                                            }`}
                                        onDragOver={(e) => handleDragOver(e, cellKey)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDropEvent(e, dateKey, teamId)}
                                    >
                                        {/* Unavailability marker */}
                                        {isUnavailable && (
                                            <div className="text-[10px] text-red-500 bg-red-100 px-2 py-0.5 rounded text-center mb-1">
                                                ⛔ Niedostępni
                                            </div>
                                        )}

                                        {/* Installation cards */}
                                        {cellInstallations.map((inst) => {
                                            const span = getInstallationSpan(inst);
                                            const isMultiDay = span > 1;
                                            const isStartDay = inst.scheduledDate?.split('T')[0] === dateKey;

                                            return (
                                                <div
                                                    key={inst.id}
                                                    className="mb-1"
                                                    onClick={() => onEditInstallation?.(inst)}
                                                >
                                                    <InstallationCard
                                                        installation={inst}
                                                        teams={teams}
                                                        compact
                                                    />
                                                    {isMultiDay && isStartDay && (
                                                        <div className="text-[9px] text-indigo-500 font-medium mt-0.5 text-center">
                                                            ↔ {span} dni
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Empty cell hint */}
                                        {cellInstallations.length === 0 && !isUnavailable && (
                                            <div className="h-full min-h-[60px] flex items-center justify-center">
                                                {isDragOver ? (
                                                    <span className="text-xs text-indigo-400 font-medium">
                                                        ↓ Upuść tutaj
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300 opacity-0 hover:opacity-100 transition-opacity">
                                                        Przeciągnij z backlogu
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {/* No teams message */}
                {teamOrder.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <p className="text-4xl mb-3">👷</p>
                        <p className="font-medium text-lg">Brak aktywnych zespołów</p>
                        <p className="text-sm mt-1">Dodaj zespoły montażowe, aby korzystać z widoku tygodniowego</p>
                    </div>
                )}
            </div>
        </div>
    );
};
