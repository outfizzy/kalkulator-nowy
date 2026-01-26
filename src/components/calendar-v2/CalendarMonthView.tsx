import React from 'react';
import type { Installation, InstallationTeam } from '../../types';

// ============================================================================
// CALENDAR MONTH VIEW - Monthly Overview
// ============================================================================

interface CalendarMonthViewProps {
    installations: Installation[];
    teams: InstallationTeam[];
    currentDate: Date;
    onDrop: (itemId: string, itemType: 'contract' | 'service' | 'installation', targetDate: string, targetTeamId: string) => void;
    onEditInstallation?: (installation: Installation) => void;
}

// Helper: Get all days in month
const getMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
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

// Helper: Format date for comparison (YYYY-MM-DD)
const toISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Status colors
const getStatusDot = (status: Installation['status']): string => {
    switch (status) {
        case 'scheduled': return 'bg-blue-500';
        case 'confirmed': return 'bg-green-500';
        case 'in_progress': return 'bg-amber-500';
        case 'completed': return 'bg-slate-400';
        case 'cancelled': return 'bg-red-500';
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
    const monthDays = getMonthDays(currentDate);
    const today = toISODateString(new Date());
    const currentMonth = currentDate.getMonth();

    // Group by weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        weeks.push(monthDays.slice(i, i + 7));
    }

    // Get installations for a specific day
    const getInstallationsForDay = (date: string): Installation[] => {
        return installations.filter(inst => inst.scheduledDate === date);
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, date: string) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            // Use first team as default for month view drops
            const defaultTeamId = teams[0]?.id || '';
            onDrop(data.id, data.type, date, defaultTeamId);
        } catch (err) {
            console.error('Drop parse error:', err);
        }
    };

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* Month Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-slate-600">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-slate-100">
                        {week.map((day) => {
                            const dateStr = toISODateString(day);
                            const isToday = dateStr === today;
                            const isCurrentMonth = day.getMonth() === currentMonth;
                            const dayInstallations = getInstallationsForDay(dateStr);
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                                <div
                                    key={dateStr}
                                    className={`min-h-[100px] p-1 border-r border-slate-100 transition-colors ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' :
                                            isToday ? 'bg-indigo-50' :
                                                isWeekend ? 'bg-slate-50' :
                                                    'hover:bg-slate-50'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, dateStr)}
                                >
                                    {/* Day Number */}
                                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' :
                                            !isCurrentMonth ? 'text-slate-400' :
                                                'text-slate-700'
                                        }`}>
                                        {day.getDate()}
                                    </div>

                                    {/* Installations */}
                                    <div className="space-y-0.5">
                                        {dayInstallations.slice(0, 3).map((inst) => {
                                            const team = teams.find(t => t.id === inst.teamId);
                                            return (
                                                <div
                                                    key={inst.id}
                                                    onClick={() => onEditInstallation?.(inst)}
                                                    className="flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer hover:bg-white hover:shadow-sm transition-all truncate"
                                                    style={{
                                                        backgroundColor: team?.color ? `${team.color}20` : '#f1f5f9',
                                                        borderLeft: `2px solid ${team?.color || '#94a3b8'}`
                                                    }}
                                                    title={inst.title || `${inst.client?.firstName} ${inst.client?.lastName}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(inst.status)}`} />
                                                    <span className="truncate text-slate-700">
                                                        {inst.client?.city || inst.title?.slice(0, 15) || 'Montaż'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {dayInstallations.length > 3 && (
                                            <div className="text-xs text-slate-500 px-1">
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
            <div className="p-2 border-t border-slate-200 flex flex-wrap gap-3 text-xs">
                <span className="text-slate-500">Ekipy:</span>
                {teams.slice(0, 6).map(team => (
                    <div key={team.id} className="flex items-center gap-1">
                        <span
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                        />
                        <span className="text-slate-600">{team.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
