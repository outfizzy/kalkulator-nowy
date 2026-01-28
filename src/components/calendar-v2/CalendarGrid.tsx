import React from 'react';
import type { Installation, InstallationTeam, TeamUnavailability } from '../../types';

// ============================================================================
// CALENDAR GRID - Weekly View with Teams
// ============================================================================

interface CalendarGridProps {
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability: TeamUnavailability[];
    currentDate: Date;
    onDrop: (itemId: string, itemType: 'contract' | 'service' | 'installation', targetDate: string, targetTeamId: string) => void;
    onEditInstallation?: (installation: Installation) => void;
}

// Helper: Get week days starting from Monday
const getWeekDays = (date: Date): Date[] => {
    const days: Date[] = [];
    const current = new Date(date);
    const dayOfWeek = current.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1
    current.setDate(current.getDate() + diff);

    for (let i = 0; i < 7; i++) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
};

// Helper: Format date for display
const formatDay = (date: Date): string => {
    const days = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    return `${days[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`;
};

// Helper: Format date for comparison (YYYY-MM-DD)
const toISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Status colors
const getStatusColor = (status: Installation['status']): string => {
    switch (status) {
        case 'scheduled': return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'confirmed': return 'bg-green-100 border-green-300 text-green-800';
        case 'in_progress': return 'bg-amber-100 border-amber-300 text-amber-800';
        case 'completed': return 'bg-slate-100 border-slate-300 text-slate-600';
        case 'cancelled': return 'bg-red-100 border-red-300 text-red-600';
        default: return 'bg-slate-100 border-slate-300 text-slate-800';
    }
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({
    installations,
    teams,
    unavailability,
    currentDate,
    onDrop,
    onEditInstallation
}) => {
    const weekDays = getWeekDays(currentDate);
    const today = toISODateString(new Date());

    // Handle drop event
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, date: string, teamId: string) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            onDrop(data.id, data.type, date, teamId);
        } catch (err) {
            console.error('Drop parse error:', err);
        }
    };

    // Get installations for a specific day and team
    const getInstallationsForCell = (date: string, teamId: string): Installation[] => {
        return installations.filter((inst) => {
            if (inst.teamId !== teamId) return false;
            if (!inst.scheduledDate) return false;

            const startDate = new Date(inst.scheduledDate);
            const cellDate = new Date(date);
            const duration = inst.expectedDuration || 1;
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + duration - 1);

            // Check if cell date falls within installation range
            return cellDate >= startDate && cellDate <= endDate;
        });
    };

    // Get installation position for visual styling (start/middle/end/single)
    const getInstallationPosition = (inst: Installation, date: string): 'start' | 'middle' | 'end' | 'single' => {
        if (!inst.scheduledDate) return 'single';

        const startDate = toISODateString(new Date(inst.scheduledDate));
        const duration = inst.expectedDuration || 1;

        if (duration === 1) return 'single';

        const endDate = new Date(inst.scheduledDate);
        endDate.setDate(endDate.getDate() + duration - 1);
        const endDateStr = toISODateString(endDate);

        if (date === startDate) return 'start';
        if (date === endDateStr) return 'end';
        return 'middle';
    };

    // Check if team is unavailable on a day
    const isTeamUnavailable = (teamId: string, date: string): boolean => {
        return unavailability.some(
            (u) => u.teamId === teamId && u.date === date
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* Header Row - Days */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
                <div className="p-3 font-medium text-slate-600 border-r border-slate-200">Ekipa</div>
                {weekDays.map((day) => {
                    const dateStr = toISODateString(day);
                    const isToday = dateStr === today;
                    return (
                        <div
                            key={dateStr}
                            className={`p-3 text-center font-medium ${isToday ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'
                                } ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-100' : ''}`}
                        >
                            {formatDay(day)}
                        </div>
                    );
                })}
            </div>

            {/* Team Rows */}
            <div className="flex-1 overflow-y-auto">
                {teams.map((team) => (
                    <div key={team.id} className="grid grid-cols-8 border-b border-slate-100 min-h-[100px]">
                        {/* Team Name */}
                        <div
                            className="p-2 border-r border-slate-200 flex items-start"
                            style={{ backgroundColor: `${team.color}15` }}
                        >
                            <div
                                className="w-3 h-3 rounded-full mr-2 mt-1 flex-shrink-0"
                                style={{ backgroundColor: team.color || '#6366f1' }}
                            />
                            <span className="font-medium text-slate-700 text-sm">{team.name}</span>
                        </div>

                        {/* Day Cells */}
                        {weekDays.map((day) => {
                            const dateStr = toISODateString(day);
                            const cellInstallations = getInstallationsForCell(dateStr, team.id);
                            const unavailable = isTeamUnavailable(team.id, dateStr);
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                                <div
                                    key={dateStr}
                                    className={`p-1 border-r border-slate-100 min-h-[100px] transition-colors ${unavailable
                                        ? 'bg-red-50'
                                        : isWeekend
                                            ? 'bg-slate-50'
                                            : 'hover:bg-indigo-50'
                                        }`}
                                    onDragOver={!unavailable ? handleDragOver : undefined}
                                    onDrop={!unavailable ? (e) => handleDrop(e, dateStr, team.id) : undefined}
                                >
                                    {unavailable && (
                                        <div className="text-xs text-red-500 text-center py-1">❌ Niedostępne</div>
                                    )}

                                    {/* Installation Cards */}
                                    {cellInstallations.map((inst) => {
                                        const position = getInstallationPosition(inst, dateStr);
                                        const isMultiDay = (inst.expectedDuration || 1) > 1;

                                        return (
                                            <div
                                                key={inst.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                                        id: inst.id,
                                                        type: 'installation'
                                                    }));
                                                }}
                                                onClick={() => onEditInstallation?.(inst)}
                                                className={`p-1.5 mb-1 border cursor-pointer text-xs ${getStatusColor(inst.status)} hover:shadow-md transition-all ${position === 'start' ? 'rounded-l' :
                                                        position === 'end' ? 'rounded-r' :
                                                            position === 'middle' ? '' :
                                                                'rounded'
                                                    } ${isMultiDay ? 'border-l-4' : ''}`}
                                            >
                                                {/* Show full details on start day, abbreviated on middle/end */}
                                                {position === 'start' || position === 'single' ? (
                                                    <>
                                                        {/* Contract Number */}
                                                        {inst.contractNumber && (
                                                            <p className="font-bold text-[10px] opacity-70 truncate">
                                                                📋 {inst.contractNumber}
                                                            </p>
                                                        )}
                                                        {/* Client Name */}
                                                        <p className="font-semibold truncate">
                                                            {inst.client?.firstName} {inst.client?.lastName}
                                                        </p>
                                                        {/* City */}
                                                        <p className="truncate opacity-75">
                                                            📍 {inst.client?.city || 'Brak miasta'}
                                                        </p>
                                                        {/* Duration if multi-day */}
                                                        {inst.expectedDuration && inst.expectedDuration > 1 && (
                                                            <p className="text-[10px] font-medium mt-0.5">
                                                                ⏱️ {inst.expectedDuration} dni
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Abbreviated view for middle/end days */}
                                                        <p className="font-semibold truncate text-center">
                                                            {position === 'middle' ? '━━━' : '━━▶'}
                                                        </p>
                                                        <p className="text-[10px] truncate text-center opacity-75">
                                                            {inst.client?.lastName}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Empty State */}
                {teams.length === 0 && (
                    <div className="flex items-center justify-center h-full text-slate-400 py-12">
                        <div className="text-center">
                            <p className="text-4xl mb-2">👷</p>
                            <p>Brak ekip montażowych</p>
                            <p className="text-sm">Dodaj ekipy w panelu zarządzania</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
