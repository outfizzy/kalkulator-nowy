import React, { useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { InstallationCardEnhanced } from '../InstallationCardEnhanced';
import type { Installation, InstallationTeam, TeamUnavailability } from '../../../types';
import type { LocationForecast } from '../../../services/weather.service';

interface WeekViewEnhancedProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability: TeamUnavailability[];
    onEditInstallation?: (installation: Installation) => void;
    onReportClick?: (installation: Installation) => void;
    weatherData?: Map<string, LocationForecast>;
}

interface DroppableDayProps {
    date: Date;
    teamId: string;
    installations: Installation[];
    team: InstallationTeam;
    isUnavailable: boolean;
    onEditInstallation?: (installation: Installation) => void;
    onReportClick?: (installation: Installation) => void;
    weatherData?: Map<string, LocationForecast>;
}

const DroppableDay: React.FC<DroppableDayProps> = ({
    date,
    teamId,
    installations,
    team,
    isUnavailable,
    onEditInstallation,
    onReportClick,
    weatherData
}) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
        id: `${teamId}-${dateStr}`,
        data: { date: dateStr, teamId }
    });

    const dayInstallations = installations.filter(
        i => i.teamId === teamId && i.scheduledDate && isSameDay(new Date(i.scheduledDate), date)
    );

    const isWeekendDay = isWeekend(date);

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[120px] border-r border-b border-slate-100 p-1 transition-colors overflow-hidden
                ${isOver
                    ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300'
                    : isUnavailable
                        ? 'bg-slate-50'
                        : isWeekendDay
                            ? 'bg-gray-50/50'
                            : 'bg-white hover:bg-slate-50/30'
                }`}
        >
            <SortableContext
                items={dayInstallations.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-1">
                    {isUnavailable && dayInstallations.length === 0 && (
                        <div className="text-[10px] text-slate-400 text-center py-2">
                            ⛔ Niedostępna
                        </div>
                    )}
                    {dayInstallations.map(installation => {
                        const cityKey = installation.client?.city?.trim().toLowerCase();
                        const forecast = cityKey && weatherData?.get(cityKey);
                        const dayWeather = forecast ? forecast.forecasts[dateStr] : undefined;
                        return (
                            <InstallationCardEnhanced
                                key={installation.id}
                                installation={installation}
                                team={team}
                                onEdit={onEditInstallation}
                                onReportClick={onReportClick}
                                weather={dayWeather}
                            />
                        );
                    })}
                </div>
            </SortableContext>
        </div>
    );
};

export const WeekViewEnhanced: React.FC<WeekViewEnhancedProps> = ({
    currentDate,
    installations,
    teams,
    unavailability,
    onEditInstallation,
    onReportClick,
    weatherData
}) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const activeTeams = teams.filter(t => t.isActive);

    // Count installations per day
    const dayCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        weekDays.forEach(day => {
            const ds = format(day, 'yyyy-MM-dd');
            counts[ds] = installations.filter(i => i.scheduledDate && isSameDay(new Date(i.scheduledDate), day)).length;
        });
        return counts;
    }, [installations, weekDays]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div
                className="grid border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-10"
                style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}
            >
                <div className="px-2 py-2 border-r border-slate-200 flex items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ekipa</span>
                </div>
                {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date());
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isWeekendDay = isWeekend(day);
                    const count = dayCounts[dateStr] || 0;
                    return (
                        <div
                            key={day.toISOString()}
                            className={`py-1.5 px-1 border-r border-slate-200 text-center
                                ${isToday
                                    ? 'bg-indigo-600 text-white'
                                    : isWeekendDay
                                        ? 'text-slate-400'
                                        : 'text-slate-600'
                                }`}
                        >
                            <div className="text-[10px] uppercase font-semibold tracking-wide">
                                {format(day, 'EEEEEE', { locale: pl })}
                            </div>
                            <div className="text-base font-bold leading-tight">
                                {format(day, 'd')}
                            </div>
                            {count > 0 && (
                                <span className={`inline-block text-[9px] font-bold px-1.5 rounded-full
                                    ${isToday ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {count}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {activeTeams.map(team => (
                    <div
                        key={team.id}
                        className="grid border-b border-slate-100"
                        style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}
                    >
                        {/* Team name */}
                        <div className="px-2 py-2 border-r border-slate-200 bg-white sticky left-0 z-5 flex items-start gap-1.5">
                            <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: team.color }}
                            />
                            <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-[11px] truncate leading-tight">
                                    {team.name}
                                </div>
                                {team.members && team.members.length > 0 && (
                                    <div className="text-[9px] text-slate-400 truncate">
                                        {team.members.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Day cells */}
                        {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isUnavailable = unavailability.some(
                                u => u.teamId === team.id && u.date === dateStr
                            );
                            return (
                                <DroppableDay
                                    key={`${team.id}-${dateStr}`}
                                    date={day}
                                    teamId={team.id}
                                    installations={installations}
                                    team={team}
                                    isUnavailable={isUnavailable}
                                    onEditInstallation={onEditInstallation}
                                    onReportClick={onReportClick}
                                    weatherData={weatherData}
                                />
                            );
                        })}
                    </div>
                ))}

                {activeTeams.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <p className="text-base font-semibold mb-1">Brak aktywnych ekip</p>
                        <p className="text-sm">Dodaj ekipy w ustawieniach</p>
                    </div>
                )}
            </div>
        </div>
    );
};
