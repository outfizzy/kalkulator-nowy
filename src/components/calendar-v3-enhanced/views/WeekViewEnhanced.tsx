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
    weatherData?: Map<string, LocationForecast>;
}

interface DroppableDayProps {
    date: Date;
    teamId: string;
    installations: Installation[];
    team: InstallationTeam;
    isUnavailable: boolean;
    onEditInstallation?: (installation: Installation) => void;
    weatherData?: Map<string, LocationForecast>;
}

const DroppableDay: React.FC<DroppableDayProps> = ({
    date,
    teamId,
    installations,
    team,
    isUnavailable,
    onEditInstallation,
    weatherData
}) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
        id: `${teamId}-${dateStr}`,
        data: {
            date: dateStr,
            teamId: teamId
        }
    });

    const dayInstallations = installations.filter(
        i => i.teamId === teamId && i.scheduledDate && isSameDay(new Date(i.scheduledDate), date)
    );

    const totalHours = dayInstallations.reduce((sum, inst) => sum + (inst.expectedDuration || 8), 0);
    const isOverloaded = totalHours > 8;
    const isWeekendDay = isWeekend(date);

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[160px] border-r border-b border-slate-200 p-2 transition-colors ${isOver
                ? 'bg-accent/10 ring-2 ring-accent ring-inset'
                : isUnavailable
                    ? 'bg-gray-100'
                    : isWeekendDay
                        ? 'bg-slate-50'
                        : 'bg-white hover:bg-slate-50'
                }`}
        >
            <SortableContext
                items={dayInstallations.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-1">
                    {isUnavailable && (
                        <div className="text-xs text-gray-600 font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Niedostępna
                        </div>
                    )}
                    {dayInstallations.map(installation => {
                        // Get weather for this installation's city
                        const cityKey = installation.client?.city?.trim().toLowerCase();
                        const forecast = cityKey && weatherData?.get(cityKey);
                        const dayWeather = forecast ? forecast.forecasts[dateStr] : undefined;
                        return (
                            <InstallationCardEnhanced
                                key={installation.id}
                                installation={installation}
                                team={team}
                                onEdit={onEditInstallation}
                                weather={dayWeather}
                            />
                        );
                    })}
                    {isOverloaded && (
                        <div className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {totalHours}h (przeciążenie)
                        </div>
                    )}
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
    weatherData
}) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const activeTeams = teams.filter(t => t.isActive);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b border-slate-300 bg-slate-100 sticky top-0 z-10">
                <div className="p-3 border-r border-slate-300 font-semibold text-slate-700">
                    Ekipa
                </div>
                {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date());
                    const isWeekendDay = isWeekend(day);
                    return (
                        <div
                            key={day.toISOString()}
                            className={`p-3 border-r border-slate-300 text-center ${isToday
                                ? 'bg-accent text-white font-bold'
                                : isWeekendDay
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'text-slate-700'
                                }`}
                        >
                            <div className="text-xs uppercase">
                                {format(day, 'EEE', { locale: pl })}
                            </div>
                            <div className="text-lg font-bold">
                                {format(day, 'd')}
                            </div>
                            <div className="text-xs">
                                {format(day, 'MMM', { locale: pl })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Team Rows */}
            <div className="flex-1 overflow-y-auto">
                {activeTeams.map(team => (
                    <div key={team.id} className="grid grid-cols-8 border-b border-slate-200">
                        {/* Team Name Cell */}
                        <div className="p-3 border-r border-slate-300 bg-slate-50 flex items-center gap-2 sticky left-0 z-5">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: team.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 text-sm truncate">
                                    {team.name}
                                </div>
                                {team.members && team.members.length > 0 && (
                                    <div className="text-xs text-slate-500 truncate">
                                        {team.members.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Day Cells */}
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
                                    weatherData={weatherData}
                                />
                            );
                        })}
                    </div>
                ))}

                {activeTeams.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-lg font-semibold mb-2">Brak aktywnych ekip</p>
                        <p className="text-sm">Dodaj ekipy w ustawieniach, aby rozpocząć planowanie</p>
                    </div>
                )}
            </div>
        </div>
    );
};
