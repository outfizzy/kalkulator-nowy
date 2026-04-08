import React, { useState, useEffect } from 'react';
import type { Installation, InstallationTeam, ServiceTicket } from '../../types';
import { getWeatherForInstallations, type LocationForecast } from '../../services/weather.service';

interface InstallationCalendarProps {
    installations: Installation[];
    serviceTickets?: ServiceTicket[];
    teams: InstallationTeam[];
    onEdit: (installation: Installation) => void;
    onEditService?: (ticket: ServiceTicket) => void;
    onDragDrop?: (id: string, newDate: string, teamId: string, type: 'installation' | 'service' | 'contract') => Promise<void>;
    unavailability?: import('../../types').TeamUnavailability[];
}

export const InstallationCalendar: React.FC<InstallationCalendarProps> = ({
    installations,
    serviceTickets = [],
    teams,
    onEdit,
    onEditService,
    onDragDrop,
    unavailability = []
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'installation' | 'service' } | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{ date: string, teamId: string } | null>(null);
    const [weatherData, setWeatherData] = useState<Map<string, LocationForecast>>(new Map());
    const [weatherLoading, setWeatherLoading] = useState(false);

    // Fetch weather when week or installations change
    useEffect(() => {
        const locations = installations
            .filter(i => i.client?.city)
            .map(i => ({
                id: i.id,
                city: i.client.city,
                coordinates: i.client.coordinates,
            }));
        if (locations.length === 0) return;

        let cancelled = false;
        setWeatherLoading(true);
        getWeatherForInstallations(locations)
            .then(data => { if (!cancelled) setWeatherData(data); })
            .catch(err => console.error('Weather fetch error:', err))
            .finally(() => { if (!cancelled) setWeatherLoading(false); });
        return () => { cancelled = true; };
    }, [currentDate, installations.length]);

    const getWeatherForCell = (city: string | undefined, date: Date) => {
        if (!city) return null;
        const cityKey = city.trim().toLowerCase();
        const forecast = weatherData.get(cityKey);
        if (!forecast) return null;
        const dateStr = date.toISOString().split('T')[0];
        return forecast.forecasts[dateStr] || null;
    };

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    const startOfWeek = getStartOfWeek(currentDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handleDragStart = (e: React.DragEvent, id: string, type: 'installation' | 'service') => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
        setDraggedItem({ id, type });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: Date, teamId: string) => {
        e.preventDefault();
        const dateStr = date.toISOString().split('T')[0];
        if (dragOverCell?.date !== dateStr || dragOverCell?.teamId !== teamId) {
            setDragOverCell({ date: dateStr, teamId });
        }
    };

    const handleDrop = async (e: React.DragEvent, date: Date, teamId: string) => {
        e.preventDefault();
        setDragOverCell(null);
        setDraggedItem(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const { id, type } = data;

            if (id && onDragDrop && (type === 'installation' || type === 'service' || type === 'contract')) {
                const dateStr = date.toISOString().split('T')[0];
                await onDragDrop(id, dateStr, teamId, type as any);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const getEventsForCell = (teamId: string | null, date: Date, hasTeams: boolean) => {
        const cellDate = new Date(date);
        cellDate.setHours(0, 0, 0, 0);

        // 1. Installations
        const daysInstallations = installations.filter(i => {
            const instDateStr = i.scheduledDate ? i.scheduledDate.slice(0, 10) : '';
            if (!instDateStr) return false;

            const instStartDate = new Date(instDateStr);
            instStartDate.setHours(0, 0, 0, 0);

            const duration = i.expectedDuration || 1;
            const diffDays = Math.round((cellDate.getTime() - instStartDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < 0 || diffDays >= duration) return false;

            if (!hasTeams) return true;
            return i.teamId === teamId;
        }).map(i => ({ type: 'installation' as const, data: i }));

        // 2. Service Tickets
        const daysServices = serviceTickets.filter(s => {
            const srvDateStr = s.scheduledDate ? s.scheduledDate.slice(0, 10) : '';
            if (!srvDateStr) return false;

            // Simple 1-day duration for now
            if (srvDateStr !== date.toISOString().split('T')[0]) return false;

            if (!hasTeams) return true;
            return s.assignedTeamId === teamId;
        }).map(s => ({ type: 'service' as const, data: s }));

        return [...daysInstallations, ...daysServices];
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevWeek} className="p-1 hover:bg-slate-200 rounded">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="font-bold text-slate-700 text-lg capitalize">
                        {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextWeek} className="p-1 hover:bg-slate-200 rounded">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <div className="text-sm text-slate-500">
                    Widok Tygodniowy
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                    <thead>
                        <tr>
                            <th className="p-3 border-b border-r border-slate-200 bg-slate-50 w-48 sticky left-0 z-10 text-left text-xs font-bold text-slate-500 uppercase">
                                Ekipa
                            </th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className={`p-3 border-b border-r border-slate-200 bg-slate-50 text-center min-w-[140px] ${date.toDateString() === new Date().toDateString() ? 'bg-accent-soft' : ''
                                    }`}>
                                    <div className="text-xs font-bold text-slate-700 capitalize">
                                        {date.toLocaleDateString('pl-PL', { weekday: 'long' })}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' })}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(teams.length > 0 ? teams : [{
                            id: 'no-team',
                            name: 'Montaże',
                            color: '#0f172a',
                            members: [] as InstallationTeam['members']
                        } as InstallationTeam]).map(team => (
                            <tr key={team.id}>
                                <td className="p-3 border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-10 font-medium text-slate-700 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                                        {team.name}
                                    </div>
                                    {teams.length > 0 && (
                                        <div className="text-[10px] text-slate-400 mt-1 pl-5">
                                            {team.members.map(m => `${m.firstName} ${m.lastName}`.trim()).filter(Boolean).join(', ')}
                                        </div>
                                    )}
                                </td>
                                {weekDates.map(date => {
                                    const events = getEventsForCell(
                                        teams.length > 0 ? team.id : null,
                                        date,
                                        teams.length > 0
                                    );

                                    const isWorkDay = isWorkingDay(date, team);
                                    const absenceReason = getUnavailabilityReason(date, team.id, unavailability);
                                    const isUnavailable = !isWorkDay || !!absenceReason;

                                    return (
                                        <td
                                            key={date.toISOString()}
                                            className={`p-2 border-b border-r border-slate-200 align-top h-32 transition-colors relative ${isUnavailable ? 'bg-slate-100' : ''
                                                } ${dragOverCell?.date === date.toISOString().split('T')[0] && dragOverCell?.teamId === team.id
                                                    ? 'bg-purple-50 ring-2 ring-inset ring-purple-300'
                                                    : isUnavailable ? '' : 'hover:bg-slate-50'
                                                }`}
                                            onDragOver={(e) => !isUnavailable && handleDragOver(e, date, team.id)}
                                            onDragLeave={() => setDragOverCell(null)}
                                            onDrop={(e) => !isUnavailable && handleDrop(e, date, team.id)}
                                        >
                                            {/* Unavailability Overlay/Label */}
                                            {isUnavailable && (
                                                <div className="absolute inset-0 flex items-center justify-center p-2 opacity-50 pointer-events-none">
                                                    <span className="text-xs font-bold text-slate-400 rotate-[-15deg] text-center">
                                                        {absenceReason || 'Wolne'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Capacity Indicator */}
                                            {events.length > 0 && (
                                                <div className="flex justify-end mb-1 relative z-10">
                                                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${events.length >= 3 ? 'bg-red-100 text-red-600' :
                                                        events.length === 2 ? 'bg-yellow-100 text-yellow-600' :
                                                            'bg-green-100 text-green-600'
                                                        }`}>
                                                        {events.length}/3
                                                    </span>
                                                </div>
                                            )}
                                            <div className="space-y-2 relative z-10">
                                                {events.map((eventItem) => {
                                                    const isService = eventItem.type === 'service';
                                                    if (isService) {
                                                        const s = eventItem.data as ServiceTicket;
                                                        const typeLabels: Record<string, { label: string; icon: string }> = {
                                                            leak: { label: 'Nieszczelność', icon: '💧' },
                                                            electrical: { label: 'Elektryka', icon: '⚡' },
                                                            visual: { label: 'Wizualne', icon: '👁️' },
                                                            mechanical: { label: 'Mechaniczne', icon: '🔧' },
                                                            repair: { label: 'Naprawa', icon: '🔨' },
                                                            other: { label: 'Inne', icon: '📋' },
                                                        };
                                                        const priorityColors: Record<string, string> = {
                                                            critical: 'bg-red-500',
                                                            high: 'bg-orange-400',
                                                            medium: 'bg-yellow-400',
                                                            low: 'bg-slate-300',
                                                        };
                                                        const typeInfo = typeLabels[s.type] || typeLabels.other;
                                                        const clientName = s.client ? `${s.client.firstName || ''} ${s.client.lastName || ''}`.trim() : '';
                                                        const clientCity = s.client?.city || '';
                                                        return (
                                                            <div
                                                                key={s.id}
                                                                draggable={!!onDragDrop && !isUnavailable}
                                                                onDragStart={(e) => handleDragStart(e, s.id, 'service')}
                                                                onClick={() => onEditService && onEditService(s)}
                                                                className={`p-2 rounded border shadow-sm cursor-pointer transition-all text-xs border-amber-200 bg-amber-50 hover:ring-2 hover:ring-amber-300 relative ${draggedItem?.id === s.id ? 'opacity-50' : ''}`}
                                                            >
                                                                {/* Priority dot */}
                                                                <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white ${priorityColors[s.priority] || 'bg-yellow-400'}`}
                                                                    title={`Priorytet: ${s.priority}`} />
                                                                {/* Header: Type + badge */}
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    <span className="text-[10px]">{typeInfo.icon}</span>
                                                                    <span className="font-bold text-amber-800 text-[11px] truncate pr-3">
                                                                        {clientName || s.ticketNumber}
                                                                    </span>
                                                                </div>
                                                                {/* City + type tag */}
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    {clientCity && (
                                                                        <span className="text-[10px] text-amber-700 truncate">{clientCity}</span>
                                                                    )}
                                                                    <span className="ml-auto text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold leading-none whitespace-nowrap">
                                                                        {typeInfo.label}
                                                                    </span>
                                                                </div>
                                                                {/* Description snippet */}
                                                                {s.description && (
                                                                    <div className="text-[10px] text-amber-600 truncate mt-0.5 italic">
                                                                        {s.description.replace(/Klient:.*\n?|Adres:.*\n?|Telefon:.*\n?/gi, '').trim().slice(0, 40)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    } else {
                                                        const inst = eventItem.data as Installation;
                                                        return (
                                                            <div
                                                                key={inst.id}
                                                                draggable={!!onDragDrop && !isUnavailable}
                                                                onDragStart={(e) => handleDragStart(e, inst.id, 'installation')}
                                                                onClick={() => onEdit(inst)}
                                                                className={`p-2 rounded border shadow-sm cursor-pointer transition-all text-xs ${
                                                                    // Conflict check: if unavailable day has installation -> Red
                                                                    isUnavailable
                                                                        ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
                                                                        : inst.status === 'confirmed'
                                                                            ? 'bg-green-50 border-green-300 ring-1 ring-green-200 hover:ring-green-400'
                                                                            : 'bg-white border-slate-200 hover:ring-2 hover:ring-accent hover:border-accent'
                                                                    } ${draggedItem?.id === inst.id ? 'opacity-50' : ''}`}
                                                            >
                                                                <div className="font-bold truncate text-xs mb-0.5 pr-2">
                                                                    {inst.contractNumber ? inst.contractNumber : inst.client.city}
                                                                    {inst.contractNumber && inst.client.city && <span className="font-normal text-slate-500"> - {inst.client.city}</span>}
                                                                </div>
                                                                {inst.partsStatus && inst.partsStatus !== 'none' && (
                                                                    <div
                                                                        className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white ${inst.partsStatus === 'all_delivered' ? 'bg-green-500' :
                                                                            inst.partsStatus === 'partial' ? 'bg-yellow-400' : 'bg-red-500'
                                                                            }`}
                                                                        title={`Status dostaw: ${inst.partsStatus === 'all_delivered' ? 'Komplet (Gotowe)' :
                                                                            inst.partsStatus === 'partial' ? 'Częściowo' : 'Brak materiałów'
                                                                            }`}
                                                                    />
                                                                )}
                                                                <div className="text-[10px] text-slate-600 mb-0.5">
                                                                    {inst.client.firstName} {inst.client.lastName}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500 truncate">
                                                                    {inst.client.postalCode ? `${inst.client.postalCode} ` : ''}{inst.client.city}
                                                                </div>
                                                                <div className="flex items-center justify-between mt-1 gap-1">
                                                                    <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${inst.status === 'completed' ? 'bg-slate-200 text-slate-700' :
                                                                        inst.status === 'confirmed' ? 'bg-green-100 text-green-700 font-bold border border-green-200' :
                                                                            inst.status === 'issue' ? 'bg-red-100 text-red-700' :
                                                                                'bg-blue-50 text-blue-700'
                                                                        }`}>
                                                                        {inst.status === 'completed' ? 'Zakończony' :
                                                                            inst.status === 'confirmed' ? 'Potwierdzony' :
                                                                                inst.status === 'issue' ? 'Problem' : 'Zaplanowany'}
                                                                        {(inst.expectedDuration || 1) > 1 && (
                                                                            <span className="ml-1 font-bold text-xs" title={`Czas trwania: ${inst.expectedDuration} dni`}>
                                                                                ({Math.round((new Date(date.setHours(0, 0, 0, 0)).getTime() - new Date(inst.scheduledDate!.slice(0, 10)).getTime()) / (1000 * 60 * 60 * 24)) + 1}/{inst.expectedDuration})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {(() => {
                                                                        const w = getWeatherForCell(inst.client.city, date);
                                                                        if (!w) return null;
                                                                        return (
                                                                            <div
                                                                                className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${w.info.severity === 'bad' ? 'bg-red-50 text-red-700' :
                                                                                        w.info.severity === 'moderate' ? 'bg-amber-50 text-amber-700' :
                                                                                            'bg-sky-50 text-sky-700'
                                                                                    }`}
                                                                                title={`${w.info.label} — ${w.tempMin}°/${w.tempMax}°C`}
                                                                            >
                                                                                <span className="text-sm leading-none">{w.info.icon}</span>
                                                                                <span>{w.tempMax}°</span>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                })}
                                                {/* Visual Conflict Warning */}
                                                {isUnavailable && (
                                                    <div className="mt-1 text-[10px] font-bold text-red-600 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        KONFLIKT: {absenceReason || 'Dzień wolny'}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );
};

function isWorkingDay(date: Date, team: InstallationTeam): boolean {
    const day = date.getDay() || 7; // ISO 1-7
    const workingDays = team.workingDays || [1, 2, 3, 4, 5];
    return workingDays.includes(day);
}

function getUnavailabilityReason(date: Date, teamId: string, unavailability: import('../../types').TeamUnavailability[]): string | null {
    const dateStr = date.toISOString().split('T')[0];
    const record = unavailability.find(u =>
        u.teamId === teamId &&
        dateStr >= u.startDate &&
        dateStr <= u.endDate
    );
    return record ? (record.reason || 'Niedostępność') : null;
}
