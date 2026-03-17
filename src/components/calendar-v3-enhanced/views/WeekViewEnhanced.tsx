import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { startOfWeek, addDays, format, isSameDay, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { InstallationCardEnhanced } from '../InstallationCardEnhanced';
import { GoogleCalendarService } from '../../../services/google-calendar.service';
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
    showGoogleEvents?: boolean;
    onGCalEventClick?: (event: GCalEvent) => void;
}

interface GCalEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { date?: string; dateTime?: string };
    end: { date?: string; dateTime?: string };
    colorId?: string;
    htmlLink?: string;
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

    const dayInstallations = installations.filter(i => {
        if (i.teamId !== teamId || !i.scheduledDate) return false;
        const start = new Date(i.scheduledDate);
        const duration = i.expectedDuration || 1;
        if (duration <= 1) return isSameDay(start, date);
        // Multi-day: span across business days (skip weekends)
        let businessDaysCounted = 0;
        let calendarDay = 0;
        while (businessDaysCounted < duration && calendarDay < duration + 10) {
            const checkDate = addDays(start, calendarDay);
            if (!isWeekend(checkDate)) {
                businessDaysCounted++;
                if (isSameDay(checkDate, date)) return true;
            }
            calendarDay++;
        }
        return false;
    });

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

// Google Calendar color mapping (matching Google's default palette)
const GCAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    '1': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    '2': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    '3': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    '4': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    '5': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    '6': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    '7': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
    '8': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    '9': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    '10': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    '11': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    default: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
};

const getGCalColor = (colorId?: string) => GCAL_COLORS[colorId || 'default'] || GCAL_COLORS.default;

// Draggable GCal event component
const DraggableGCalEvent: React.FC<{
    event: GCalEvent;
    onClick?: (event: GCalEvent) => void;
}> = ({ event, onClick }) => {
    const color = getGCalColor(event.colorId);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `gcal-${event.id}`,
        data: {
            type: 'gcal_event',
            itemId: event.id,
            gcalEvent: event
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : undefined
    } : undefined;

    // Extract time from dateTime
    const timeStr = event.start?.dateTime
        ? new Date(event.start.dateTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                // Only fire click if not dragging
                if (!isDragging) {
                    e.stopPropagation();
                    onClick?.(event);
                }
            }}
            className={`block w-full text-left rounded-md px-1.5 py-1 border text-[10px] font-semibold leading-tight cursor-grab active:cursor-grabbing transition-all
                ${isDragging ? 'opacity-50 shadow-xl scale-105 ring-2 ring-sky-400' : 'hover:shadow-md hover:scale-[1.02]'}
                ${color.bg} ${color.text} ${color.border}`}
            title={[event.summary, event.location, event.description].filter(Boolean).join('\n')}
        >
            <div className="flex items-center gap-1">
                {timeStr && (
                    <span className="text-[8px] font-mono opacity-60">{timeStr}</span>
                )}
                <span className="truncate font-bold">
                    {event.summary || '(bez tytułu)'}
                </span>
            </div>
            {event.location && (
                <div className="truncate text-[9px] opacity-70">
                    📍 {event.location}
                </div>
            )}
        </div>
    );
};

const getEventDate = (event: GCalEvent): string | null => {
    const raw = event.start?.date || event.start?.dateTime;
    if (!raw) return null;
    return raw.slice(0, 10);
};

const getEventEndDate = (event: GCalEvent): string | null => {
    const raw = event.end?.date || event.end?.dateTime;
    if (!raw) return null;
    if (event.start?.date && !event.start?.dateTime) {
        const d = new Date(raw);
        d.setDate(d.getDate() - 1);
        return format(d, 'yyyy-MM-dd');
    }
    return raw.slice(0, 10);
};

export const WeekViewEnhanced: React.FC<WeekViewEnhancedProps> = ({
    currentDate,
    installations,
    teams,
    unavailability,
    onEditInstallation,
    onReportClick,
    weatherData,
    showGoogleEvents = false,
    onGCalEventClick
}) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const activeTeams = teams.filter(t => t.isActive);

    // Google Calendar events state
    const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
    const [gcalLoading, setGcalLoading] = useState(false);

    const weekStartStr = weekStart.toISOString();

    const fetchGcalEvents = useCallback(async () => {
        if (!showGoogleEvents) return;
        setGcalLoading(true);
        try {
            const timeMin = weekDays[0].toISOString();
            const lastDay = addDays(weekDays[6], 1);
            const timeMax = lastDay.toISOString();
            const events = await GoogleCalendarService.getEventsForRange(timeMin, timeMax);
            setGcalEvents(events);
        } catch (err) {
            console.warn('[GCal] Failed to fetch events:', err);
            setGcalEvents([]);
        } finally {
            setGcalLoading(false);
        }
    }, [showGoogleEvents, weekStartStr]);

    useEffect(() => {
        fetchGcalEvents();
    }, [fetchGcalEvents]);

    // Count installations per day
    const dayCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        weekDays.forEach(day => {
            const ds = format(day, 'yyyy-MM-dd');
            counts[ds] = installations.filter(i => {
                if (!i.scheduledDate) return false;
                const start = new Date(i.scheduledDate);
                const duration = i.expectedDuration || 1;
                if (duration <= 1) return isSameDay(start, day);
                let businessDaysCounted = 0;
                let calendarDay = 0;
                while (businessDaysCounted < duration && calendarDay < duration + 10) {
                    const checkDate = addDays(start, calendarDay);
                    if (!isWeekend(checkDate)) {
                        businessDaysCounted++;
                        if (isSameDay(checkDate, day)) return true;
                    }
                    calendarDay++;
                }
                return false;
            }).length;
        });
        return counts;
    }, [installations, weekDays]);

    // Group GCal events by date
    const gcalEventsByDate = useMemo(() => {
        const map: Record<string, GCalEvent[]> = {};
        gcalEvents.forEach(event => {
            const startDate = getEventDate(event);
            const endDate = getEventEndDate(event);
            if (!startDate) return;
            weekDays.forEach(day => {
                const ds = format(day, 'yyyy-MM-dd');
                if (ds >= startDate && ds <= (endDate || startDate)) {
                    if (!map[ds]) map[ds] = [];
                    map[ds].push(event);
                }
            });
        });
        return map;
    }, [gcalEvents, weekDays]);

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
                {/* ── GOOGLE CALENDAR ROW ── */}
                {showGoogleEvents && (
                    <div
                        className="grid border-b-2 border-sky-200 bg-sky-50/30"
                        style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}
                    >
                        <div className="px-2 py-2 border-r border-sky-200 bg-white sticky left-0 z-5 flex items-start gap-1.5">
                            <span className="text-sm">📅</span>
                            <div className="min-w-0">
                                <div className="font-bold text-sky-700 text-[11px] truncate leading-tight">
                                    Google
                                </div>
                                <div className="text-[9px] text-sky-400">
                                    {gcalLoading ? '⏳...' : `${gcalEvents.length} ev.`}
                                </div>
                            </div>
                        </div>

                        {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEvents = gcalEventsByDate[dateStr] || [];
                            return (
                                <div
                                    key={`gcal-${dateStr}`}
                                    className="min-h-[60px] border-r border-sky-100 p-1 overflow-hidden"
                                >
                                    <div className="space-y-1">
                                        {dayEvents.map(event => (
                                            <DraggableGCalEvent
                                                key={event.id}
                                                event={event}
                                                onClick={onGCalEventClick}
                                            />
                                        ))}
                                        {dayEvents.length === 0 && !gcalLoading && (
                                            <div className="text-[9px] text-sky-300 text-center py-1">—</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── TEAM ROWS ── */}
                {activeTeams.map(team => (
                    <div
                        key={team.id}
                        className="grid border-b border-slate-100"
                        style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}
                    >
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
