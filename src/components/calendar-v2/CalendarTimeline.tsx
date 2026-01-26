import React, { useMemo } from 'react';
import type { Installation, InstallationTeam } from '../../types';

// ============================================================================
// CALENDAR TIMELINE - Gantt-style View
// Shows installations as horizontal bars across a timeline
// ============================================================================

interface CalendarTimelineProps {
    installations: Installation[];
    teams: InstallationTeam[];
    currentDate: Date;
    onEditInstallation?: (installation: Installation) => void;
}

// Helper: Get week dates
const getTimelineRange = (date: Date, weeks: number = 4): Date[] => {
    const days: Date[] = [];
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Start from Monday

    for (let i = 0; i < weeks * 7; i++) {
        days.push(new Date(start));
        start.setDate(start.getDate() + 1);
    }
    return days;
};

// Helper: Format date
const toISODateString = (date: Date): string => date.toISOString().split('T')[0];
const formatShortDate = (date: Date): string => `${date.getDate()}.${date.getMonth() + 1}`;

// Status colors for bars
const getStatusBarColor = (status: Installation['status']): string => {
    switch (status) {
        case 'scheduled': return 'bg-blue-500';
        case 'confirmed': return 'bg-green-500';
        case 'in_progress': return 'bg-amber-500';
        case 'completed': return 'bg-slate-400';
        case 'cancelled': return 'bg-red-400';
        default: return 'bg-slate-300';
    }
};

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
    installations,
    teams,
    currentDate,
    onEditInstallation
}) => {
    const timelineDays = useMemo(() => getTimelineRange(currentDate, 4), [currentDate]);
    const today = toISODateString(new Date());

    // Map date to column index
    const dateToIndex = useMemo(() => {
        const map = new Map<string, number>();
        timelineDays.forEach((d, i) => map.set(toISODateString(d), i));
        return map;
    }, [timelineDays]);

    // Get installations for team
    const getTeamInstallations = (teamId: string): Installation[] => {
        return installations.filter(inst =>
            inst.teamId === teamId &&
            inst.scheduledDate &&
            dateToIndex.has(inst.scheduledDate)
        );
    };

    // Calculate bar position
    const getBarStyle = (inst: Installation): React.CSSProperties => {
        const startIdx = dateToIndex.get(inst.scheduledDate || '') || 0;
        const duration = inst.expectedDuration || 1;
        const cellWidth = 100 / timelineDays.length;

        return {
            left: `${startIdx * cellWidth}%`,
            width: `${Math.min(duration, timelineDays.length - startIdx) * cellWidth}%`,
        };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* Header - Days */}
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
                <div className="w-40 flex-shrink-0 p-2 border-r border-slate-200 font-medium text-slate-600 text-sm">
                    Ekipa
                </div>
                <div className="flex-1 flex">
                    {timelineDays.map((day, idx) => {
                        const dateStr = toISODateString(day);
                        const isToday = dateStr === today;
                        const isMonday = day.getDay() === 1;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                            <div
                                key={dateStr}
                                className={`flex-1 min-w-[40px] text-center text-xs p-1 border-r border-slate-100 ${isToday ? 'bg-indigo-100 text-indigo-700 font-bold' :
                                        isMonday ? 'bg-slate-100 font-medium' :
                                            isWeekend ? 'bg-slate-50 text-slate-400' :
                                                'text-slate-600'
                                    }`}
                            >
                                <div>{['N', 'P', 'W', 'Ś', 'C', 'P', 'S'][day.getDay()]}</div>
                                <div className="text-[10px]">{formatShortDate(day)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Team Rows with Bars */}
            <div className="flex-1 overflow-y-auto">
                {teams.map((team) => {
                    const teamInstallations = getTeamInstallations(team.id);

                    return (
                        <div key={team.id} className="flex border-b border-slate-100 min-h-[60px]">
                            {/* Team Name */}
                            <div
                                className="w-40 flex-shrink-0 p-2 border-r border-slate-200 flex items-center gap-2"
                                style={{ backgroundColor: `${team.color}10` }}
                            >
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: team.color || '#6366f1' }}
                                />
                                <span className="text-sm font-medium text-slate-700 truncate">
                                    {team.name}
                                </span>
                            </div>

                            {/* Timeline Area */}
                            <div className="flex-1 relative">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex">
                                    {timelineDays.map((day) => {
                                        const dateStr = toISODateString(day);
                                        const isToday = dateStr === today;
                                        return (
                                            <div
                                                key={dateStr}
                                                className={`flex-1 border-r border-slate-100 ${isToday ? 'bg-indigo-50' : ''
                                                    }`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Installation Bars */}
                                <div className="absolute inset-0 p-1">
                                    {teamInstallations.map((inst, idx) => (
                                        <div
                                            key={inst.id}
                                            onClick={() => onEditInstallation?.(inst)}
                                            className={`absolute h-6 rounded cursor-pointer hover:shadow-md transition-shadow flex items-center px-2 text-white text-xs truncate ${getStatusBarColor(inst.status)}`}
                                            style={{
                                                ...getBarStyle(inst),
                                                top: `${idx * 28 + 4}px`,
                                            }}
                                            title={`${inst.title || inst.client?.city} (${inst.expectedDuration || 1} dni)`}
                                        >
                                            {inst.client?.city || inst.title?.slice(0, 20) || 'Montaż'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {teams.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-400">
                        Brak ekip montażowych
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="p-2 border-t border-slate-200 flex flex-wrap gap-4 text-xs">
                <span className="text-slate-500">Status:</span>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded bg-blue-500" />
                    <span>Zaplanowane</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded bg-green-500" />
                    <span>Potwierdzone</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded bg-amber-500" />
                    <span>W trakcie</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded bg-slate-400" />
                    <span>Zakończone</span>
                </div>
            </div>
        </div>
    );
};
