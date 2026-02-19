import React, { useMemo } from 'react';
import { format, addDays, startOfWeek, differenceInDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Installation, InstallationTeam } from '../../../types';

interface CalendarTimelineProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    onEditInstallation?: (installation: Installation) => void;
}

const STATUS_COLORS: Record<string, string> = {
    scheduled: '#3b82f6',
    in_progress: '#f59e0b',
    completed: '#10b981',
    cancelled: '#ef4444',
    pending: '#94a3b8',
    verification: '#8b5cf6'
};

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
    currentDate,
    installations,
    teams,
    onEditInstallation
}) => {
    // 4 weeks timeline
    const weeks = 4;
    const timelineStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const totalDays = weeks * 7;
    const timelineDays = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));

    // Group by team
    const teamInstallations = useMemo(() => {
        const map: Record<string, Installation[]> = {};
        map['__unassigned'] = [];

        teams.forEach(t => { map[t.id] = []; });

        installations.forEach(inst => {
            const teamId = inst.teamId || '__unassigned';
            if (!map[teamId]) map[teamId] = [];
            map[teamId].push(inst);
        });

        return map;
    }, [installations, teams]);

    // Get bar position and width
    const getBarStyle = (inst: Installation): React.CSSProperties => {
        const scheduledDate = inst.scheduledDate ? new Date(inst.scheduledDate) : null;
        if (!scheduledDate) return { display: 'none' };

        const offsetDays = differenceInDays(scheduledDate, timelineStart);
        const duration = inst.expectedDuration || 1;

        if (offsetDays + duration < 0 || offsetDays >= totalDays) return { display: 'none' };

        const left = Math.max(0, (offsetDays / totalDays) * 100);
        const width = Math.min(((duration / totalDays) * 100), ((totalDays - offsetDays) / totalDays) * 100);

        return {
            left: `${left}%`,
            width: `${Math.max(width, 2)}%`,
            backgroundColor: STATUS_COLORS[inst.status] || '#6366f1'
        };
    };

    const getTeamInfo = (teamId: string) => {
        if (teamId === '__unassigned') return { name: 'Bez ekipy', color: '#94a3b8' };
        const team = teams.find(t => t.id === teamId);
        return { name: team?.name || 'Nieznany', color: team?.color || '#6366f1' };
    };

    const getClientName = (inst: Installation): string => {
        if (inst.client?.firstName || inst.client?.lastName) {
            return `${inst.client.firstName || ''} ${inst.client.lastName || ''}`.trim();
        }
        return inst.title || 'Montaż';
    };

    return (
        <div className="h-full flex flex-col">
            {/* Timeline Header */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                <div className="w-44 flex-shrink-0 px-3 py-2 border-r border-slate-200 font-semibold text-sm text-slate-500">
                    Ekipa
                </div>
                <div className="flex-1 flex relative">
                    {timelineDays.map((day, i) => {
                        const isToday = isSameDay(day, new Date());
                        const isMonday = day.getDay() === 1;

                        return (
                            <div
                                key={i}
                                className={`flex-1 text-center py-2 border-r border-slate-100 ${isToday ? 'bg-amber-50' :
                                        day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-100/50' : ''
                                    }`}
                                style={{ minWidth: '30px' }}
                            >
                                {isMonday && (
                                    <div className="text-[9px] font-bold text-slate-500">
                                        T{format(day, 'w')}
                                    </div>
                                )}
                                <div className={`text-[10px] ${isToday ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Team Rows */}
            <div className="flex-1 overflow-auto">
                {Object.entries(teamInstallations).map(([teamId, instList]) => {
                    if (instList.length === 0 && teamId === '__unassigned') return null;

                    const teamInfo = getTeamInfo(teamId);

                    return (
                        <div key={teamId} className="flex border-b border-slate-200 min-h-[48px]">
                            {/* Team label */}
                            <div className="w-44 flex-shrink-0 px-3 py-2 border-r border-slate-200 bg-slate-50 sticky left-0 z-10 flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: teamInfo.color }}
                                />
                                <span className="text-sm font-medium text-slate-700 truncate">
                                    {teamInfo.name}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-auto">
                                    {instList.length}
                                </span>
                            </div>

                            {/* Timeline bars */}
                            <div className="flex-1 relative py-1">
                                {instList.map(inst => {
                                    const barStyle = getBarStyle(inst);
                                    if (barStyle.display === 'none') return null;

                                    return (
                                        <div
                                            key={inst.id}
                                            className="absolute h-7 rounded-md px-2 flex items-center cursor-pointer hover:brightness-110 hover:shadow-md transition-all text-white text-[10px] font-medium truncate"
                                            style={{ ...barStyle, top: '4px' }}
                                            onClick={() => onEditInstallation?.(inst)}
                                            title={`${getClientName(inst)} — ${inst.expectedDuration || 1} dni`}
                                        >
                                            {getClientName(inst)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4 text-xs text-slate-500">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                        <span>{
                            status === 'scheduled' ? 'Zaplanowane' :
                                status === 'in_progress' ? 'W trakcie' :
                                    status === 'completed' ? 'Ukończone' :
                                        status === 'cancelled' ? 'Anulowane' :
                                            status === 'pending' ? 'Oczekujące' :
                                                status === 'verification' ? 'Weryfikacja' : status
                        }</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
