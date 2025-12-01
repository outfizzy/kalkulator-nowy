import React, { useState, useEffect } from 'react';
import type { Installation, InstallationTeam } from '../../types';

interface InstallationCalendarProps {
    installations: Installation[];
    teams: InstallationTeam[];
    onEdit: (installation: Installation) => void;
    onDragDrop?: (installationId: string, newDate: string, teamId: string) => Promise<void>;
}

export const InstallationCalendar: React.FC<InstallationCalendarProps> = ({ installations, teams, onEdit, onDragDrop }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{ date: string, teamId: string } | null>(null);

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    useEffect(() => {
        const start = getStartOfWeek(currentDate);
        const dates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
        setWeekDates(dates);
    }, [currentDate]);

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

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
        setDraggedId(id);
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
        setDraggedId(null);
        const id = e.dataTransfer.getData('text/plain');

        if (id && onDragDrop) {
            const dateStr = date.toISOString().split('T')[0];
            await onDragDrop(id, dateStr, teamId);
        }
    };

    const getInstallationsForCell = (teamId: string | null, date: Date, hasTeams: boolean) => {
        const dateStr = date.toISOString().split('T')[0];
        return installations.filter(i => {
            const instDate = i.scheduledDate ? i.scheduledDate.slice(0, 10) : '';
            if (!instDate || instDate !== dateStr) return false;

            if (!hasTeams) {
                // Widok bez ekip (np. monter) – pokazujemy wszystkie montaże w danym dniu
                return true;
            }

            return i.teamId === teamId;
        });
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
                                    const cellInstallations = getInstallationsForCell(
                                        teams.length > 0 ? team.id : null,
                                        date,
                                        teams.length > 0
                                    );
                                    return (
                                        <td
                                            key={date.toISOString()}
                                            className={`p-2 border-b border-r border-slate-200 align-top h-32 transition-colors ${dragOverCell?.date === date.toISOString().split('T')[0] && dragOverCell?.teamId === team.id
                                                ? 'bg-purple-50 ring-2 ring-inset ring-purple-300'
                                                : 'hover:bg-slate-50'
                                                }`}
                                            onDragOver={(e) => handleDragOver(e, date, team.id)}
                                            onDragLeave={() => setDragOverCell(null)}
                                            onDrop={(e) => handleDrop(e, date, team.id)}
                                        >
                                            {/* Capacity Indicator */}
                                            {cellInstallations.length > 0 && (
                                                <div className="flex justify-end mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${cellInstallations.length >= 3 ? 'bg-red-100 text-red-600' :
                                                            cellInstallations.length === 2 ? 'bg-yellow-100 text-yellow-600' :
                                                                'bg-green-100 text-green-600'
                                                        }`}>
                                                        {cellInstallations.length}/3
                                                    </span>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {cellInstallations.map(inst => (
                                                    <div
                                                        key={inst.id}
                                                        draggable={!!onDragDrop}
                                                        onDragStart={(e) => handleDragStart(e, inst.id)}
                                                        onClick={() => onEdit(inst)}
                                                        className={`p-2 rounded border border-slate-200 bg-white shadow-sm cursor-pointer hover:ring-2 hover:ring-accent hover:border-accent transition-all text-xs ${draggedId === inst.id ? 'opacity-50' : ''
                                                            }`}
                                                        style={{ borderLeft: `3px solid ${team.color}` }}
                                                    >
                                                        <div className="font-bold truncate">{inst.client.city}</div>
                                                        <div className="truncate text-slate-600">{inst.client.lastName}</div>
                                                        <div className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${inst.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            inst.status === 'issue' ? 'bg-red-100 text-red-700' :
                                                                'bg-accent-soft text-accent-dark'
                                                            }`}>
                                                            {inst.status === 'completed' ? 'Zakończony' :
                                                                inst.status === 'issue' ? 'Problem' : 'Zaplanowany'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
