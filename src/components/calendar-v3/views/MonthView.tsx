import React, { useMemo } from 'react';
import type { Installation, InstallationTeam, TeamUnavailability } from '../../../types';

interface MonthViewProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability?: TeamUnavailability[];
    onRefresh: () => void;
    onEditInstallation?: (installation: Installation) => void;
    onDrop?: (itemId: string, itemType: string, targetDate: string, targetTeamId: string) => void;
}

// Helper: Get all days for a month grid (including padding days from prev/next month)
const getMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday of first week
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // End on Sunday of last week
    const endDate = new Date(lastDay);
    const endDayOfWeek = endDate.getDay();
    if (endDayOfWeek !== 0) {
        endDate.setDate(endDate.getDate() + (7 - endDayOfWeek));
    }

    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
};

const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

const statusDot: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-teal-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-red-500',
    verification: 'bg-purple-500',
};

const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

export const MonthView: React.FC<MonthViewProps> = ({
    currentDate,
    installations,
    teams,
    unavailability = [],
    onRefresh,
    onEditInstallation,
    onDrop
}) => {
    const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
    const today = toDateStr(new Date());
    const currentMonth = currentDate.getMonth();

    // Group into weeks
    const weeks = useMemo(() => {
        const w: Date[][] = [];
        for (let i = 0; i < monthDays.length; i += 7) {
            w.push(monthDays.slice(i, i + 7));
        }
        return w;
    }, [monthDays]);

    // Index installations by date
    const installationsByDate = useMemo(() => {
        const map = new Map<string, Installation[]>();
        installations.forEach(inst => {
            if (!inst.scheduledDate) return;
            const key = inst.scheduledDate;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(inst);
        });
        return map;
    }, [installations]);

    // Count unavailability per day
    const unavailByDate = useMemo(() => {
        const map = new Map<string, number>();
        unavailability.forEach(u => {
            const start = new Date(u.startDate);
            const end = new Date(u.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = toDateStr(d);
                map.set(key, (map.get(key) || 0) + 1);
            }
        });
        return map;
    }, [unavailability]);

    // Drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dateStr: string) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            const defaultTeamId = teams[0]?.id || '';
            onDrop?.(data.id, data.type, dateStr, defaultTeamId);
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Month Title */}
            <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg font-bold text-slate-800">
                    📅 {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    {installations.length} montaży zaplanowanych w tym miesiącu
                </p>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {dayNames.map((day, i) => (
                    <div
                        key={day}
                        className={`py-2 text-center text-xs font-semibold uppercase tracking-wider ${i >= 5 ? 'text-slate-400' : 'text-slate-600'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto">
                {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-100" style={{ minHeight: 110 }}>
                        {week.map((day) => {
                            const dateStr = toDateStr(day);
                            const isToday = dateStr === today;
                            const isCurrentMonth = day.getMonth() === currentMonth;
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const dayInsts = installationsByDate.get(dateStr) || [];
                            const unavailCount = unavailByDate.get(dateStr) || 0;

                            return (
                                <div
                                    key={dateStr}
                                    className={`p-1.5 border-r border-slate-100 transition-colors relative group ${!isCurrentMonth ? 'bg-slate-50/60 text-slate-400' :
                                            isToday ? 'bg-indigo-50/60' :
                                                isWeekend ? 'bg-slate-50/40' :
                                                    'hover:bg-blue-50/40'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, dateStr)}
                                >
                                    {/* Day number header */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-semibold leading-none ${isToday
                                                ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                                                : !isCurrentMonth
                                                    ? 'text-slate-400'
                                                    : 'text-slate-700'
                                            }`}>
                                            {day.getDate()}
                                        </span>

                                        {/* Day stats */}
                                        <div className="flex items-center gap-1">
                                            {dayInsts.length > 0 && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                                                    {dayInsts.length}
                                                </span>
                                            )}
                                            {unavailCount > 0 && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded-full" title={`${unavailCount} ekip niedostępnych`}>
                                                    🚫
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Installations list */}
                                    <div className="space-y-0.5">
                                        {dayInsts.slice(0, 4).map(inst => {
                                            const team = teams.find(t => t.id === inst.teamId);
                                            const name = [inst.client?.firstName, inst.client?.lastName].filter(Boolean).join(' ') || inst.title || 'Montaż';
                                            const dot = statusDot[inst.status] || 'bg-slate-300';

                                            return (
                                                <div
                                                    key={inst.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('application/json', JSON.stringify({ id: inst.id, type: 'installation' }));
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onClick={() => onEditInstallation?.(inst)}
                                                    className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] cursor-pointer hover:shadow-sm transition-all group/item"
                                                    style={{
                                                        backgroundColor: team?.color ? `${team.color}15` : '#f8fafc',
                                                        borderLeft: `3px solid ${team?.color || '#94a3b8'}`
                                                    }}
                                                    title={`${name} — ${inst.client?.city || ''}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                                                    <span className="truncate text-slate-700 font-medium">
                                                        {inst.client?.city || name.split(' ')[0]}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {dayInsts.length > 4 && (
                                            <div className="text-[10px] text-indigo-500 px-1.5 font-medium cursor-pointer hover:text-indigo-700">
                                                +{dayInsts.length - 4} więcej
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Team Legend */}
            <div className="p-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs bg-slate-50/70">
                <span className="text-slate-500 font-medium">Ekipy:</span>
                {teams.filter(t => t.isActive !== false).map(team => (
                    <div key={team.id} className="flex items-center gap-1">
                        <span
                            className="w-3 h-3 rounded-sm shadow-sm"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                        />
                        <span className="text-slate-600">{team.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
