import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Installation, InstallationTeam } from '../../types';

// ============================================================================
// CALENDAR MONTH VIEW - Monthly Overview (Fixed timezone handling)
// ============================================================================

interface CalendarMonthViewProps {
    installations: Installation[];
    teams: InstallationTeam[];
    currentDate: Date;
    onDrop: (itemId: string, itemType: 'contract' | 'service' | 'installation', targetDate: string, targetTeamId: string) => void;
    onEditInstallation?: (installation: Installation) => void;
}

// LOCAL date string (no UTC shift)
const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getStatusDot = (status: string): string => {
    switch (status) {
        case 'scheduled': return 'bg-blue-500';
        case 'confirmed': return 'bg-green-500';
        case 'in_progress': return 'bg-amber-500';
        case 'verification': return 'bg-purple-500';
        case 'completed': return 'bg-emerald-500';
        case 'cancelled': return 'bg-red-400';
        default: return 'bg-slate-300';
    }
};

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
    installations,
    teams,
    currentDate,
    onDrop,
    onEditInstallation
}) => {
    // Build the full calendar grid (6 weeks max)
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days: Date[] = [];
        let d = gridStart;
        while (d <= gridEnd) {
            days.push(d);
            d = addDays(d, 1);
        }
        return days;
    }, [currentDate]);

    // Group by weeks
    const weeks = useMemo(() => {
        const result: Date[][] = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            result.push(calendarDays.slice(i, i + 7));
        }
        return result;
    }, [calendarDays]);

    // Index installations by date for fast lookup
    const installationsByDate = useMemo(() => {
        const map: Record<string, Installation[]> = {};
        installations.forEach(inst => {
            if (inst.scheduledDate) {
                // scheduledDate is already YYYY-MM-DD string
                const key = inst.scheduledDate.substring(0, 10);
                if (!map[key]) map[key] = [];
                map[key].push(inst);
            }
        });
        return map;
    }, [installations]);

    const today = toLocalDateString(new Date());

    // Handle drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, date: string) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            const defaultTeamId = teams[0]?.id || '';
            onDrop(data.id, data.type, date, defaultTeamId);
        } catch (err) {
            console.error('Drop parse error:', err);
        }
    };

    const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-slate-50">
                {dayNames.map((day, i) => (
                    <div
                        key={day}
                        className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider border-r border-slate-100
                            ${i >= 5 ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid overflow-y-auto" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-slate-100 min-h-[90px]">
                        {week.map((day) => {
                            const dateStr = toLocalDateString(day);
                            const isToday = dateStr === today;
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const dayInstallations = installationsByDate[dateStr] || [];
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                                <div
                                    key={dateStr}
                                    className={`border-r border-slate-100 p-1 transition-colors overflow-hidden
                                        ${!isCurrentMonth
                                            ? 'bg-slate-50/60'
                                            : isToday
                                                ? 'bg-indigo-50/50'
                                                : isWeekend
                                                    ? 'bg-gray-50/30'
                                                    : 'hover:bg-slate-50/50'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, dateStr)}
                                >
                                    {/* Day Number */}
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-xs font-bold leading-none
                                            ${isToday
                                                ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                                                : !isCurrentMonth
                                                    ? 'text-slate-300'
                                                    : 'text-slate-600'
                                            }`}
                                        >
                                            {day.getDate()}
                                        </span>
                                        {dayInstallations.length > 0 && !isToday && (
                                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1 rounded-full">
                                                {dayInstallations.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Installation items */}
                                    <div className="space-y-0.5">
                                        {dayInstallations.slice(0, 3).map((inst) => {
                                            const team = teams.find(t => t.id === inst.teamId);
                                            const clientName = inst.client?.name
                                                || `${inst.client?.firstName || ''} ${inst.client?.lastName || ''}`.trim()
                                                || inst.client?.city
                                                || 'Montaż';

                                            return (
                                                <div
                                                    key={inst.id}
                                                    onClick={() => onEditInstallation?.(inst)}
                                                    className="flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer hover:shadow-sm transition-all truncate"
                                                    style={{
                                                        backgroundColor: team?.color ? `${team.color}15` : '#f1f5f9',
                                                        borderLeft: `2px solid ${team?.color || '#94a3b8'}`
                                                    }}
                                                    title={`${clientName} • ${inst.client?.city || ''} • ${inst.contractNumber || ''}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(inst.status)}`} />
                                                    <span className={`truncate text-[10px] font-medium ${!isCurrentMonth ? 'text-slate-400' : 'text-slate-700'}`}>
                                                        {clientName}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {dayInstallations.length > 3 && (
                                            <div className="text-[9px] text-indigo-500 font-semibold px-1 cursor-pointer hover:underline">
                                                +{dayInstallations.length - 3} więcej
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="px-3 py-1.5 border-t border-slate-200 bg-slate-50 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ekipy:</span>
                {teams.filter(t => t.isActive).slice(0, 8).map(team => (
                    <div key={team.id} className="flex items-center gap-1">
                        <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                        />
                        <span className="text-[10px] text-slate-600">{team.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
