import React, { useState } from 'react';
import type { Installation, InstallationTeam, ServiceTicket } from '../../types';

interface MonthlyCalendarViewProps {
    installations: Installation[];
    serviceTickets?: ServiceTicket[];
    teams: InstallationTeam[];
    onEdit: (installation: Installation) => void;
    onDragDrop?: (id: string, newDate: string, teamId: string, type: 'installation' | 'service' | 'contract') => Promise<void>;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
    installations,
    serviceTickets = [],
    teams,
    onEdit,
    onDragDrop
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dragOverCell, setDragOverCell] = useState<{ date: string } | null>(null);

    // Get first day of month and calculate calendar grid
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Start from Monday
    let startDay = firstDayOfMonth.getDay() || 7; // Convert Sunday (0) to 7
    startDay = startDay - 1; // Adjust for Monday start

    const daysInMonth = lastDayOfMonth.getDate();
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;

    const calendarDays: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
        if (i < startDay || i >= startDay + daysInMonth) {
            calendarDays.push(null);
        } else {
            calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i - startDay + 1));
        }
    }

    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    const getEventsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];

        return installations.filter(inst => {
            if (!inst.scheduledDate) return false;
            const instDate = inst.scheduledDate.slice(0, 10);

            // Check if this date falls within the installation duration
            const startDate = new Date(inst.scheduledDate);
            const duration = inst.expectedDuration || 1;
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + duration - 1);

            return date >= startDate && date <= endDate;
        });
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        const dateStr = date.toISOString().split('T')[0];
        setDragOverCell({ date: dateStr });
    };

    const handleDrop = async (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        setDragOverCell(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const { id, type } = data;

            if (id && onDragDrop) {
                const dateStr = date.toISOString().split('T')[0];
                // Use first team as default for monthly view drop
                const defaultTeamId = teams.length > 0 ? teams[0].id : '';
                await onDragDrop(id, dateStr, defaultTeamId, type);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const getStatusColor = (status: Installation['status']) => {
        switch (status) {
            case 'completed': return 'bg-slate-200 border-slate-300';
            case 'confirmed': return 'bg-green-100 border-green-300';
            case 'scheduled': return 'bg-blue-100 border-blue-300';
            case 'in_progress': return 'bg-orange-100 border-orange-300';
            default: return 'bg-slate-100 border-slate-200';
        }
    };

    const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="font-bold text-slate-700 text-lg capitalize min-w-[180px] text-center">
                        {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Dziś
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {dayNames.map(day => (
                                <th key={day} className="p-2 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map((week, weekIdx) => (
                            <tr key={weekIdx}>
                                {week.map((date, dayIdx) => {
                                    if (!date) {
                                        return <td key={dayIdx} className="border border-slate-100 bg-slate-50 h-24"></td>;
                                    }

                                    const events = getEventsForDate(date);
                                    const isToday = date.getTime() === today.getTime();
                                    const isWeekend = dayIdx >= 5;
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isDragOver = dragOverCell?.date === dateStr;

                                    return (
                                        <td
                                            key={dayIdx}
                                            className={`border border-slate-200 h-24 align-top p-1 transition-colors ${isToday ? 'bg-blue-50' : isWeekend ? 'bg-slate-50' : 'bg-white'
                                                } ${isDragOver ? 'ring-2 ring-inset ring-purple-400 bg-purple-50' : ''}`}
                                            onDragOver={(e) => handleDragOver(e, date)}
                                            onDragLeave={() => setDragOverCell(null)}
                                            onDrop={(e) => handleDrop(e, date)}
                                        >
                                            <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                                                {date.getDate()}
                                            </div>
                                            <div className="space-y-0.5 overflow-hidden max-h-[70px]">
                                                {events.slice(0, 3).map(inst => {
                                                    const team = teams.find(t => t.id === inst.teamId);
                                                    return (
                                                        <div
                                                            key={inst.id}
                                                            onClick={() => onEdit(inst)}
                                                            className={`text-[10px] px-1 py-0.5 rounded border cursor-pointer truncate hover:ring-1 hover:ring-blue-400 ${getStatusColor(inst.status)}`}
                                                            title={`${inst.client.firstName} ${inst.client.lastName} - ${inst.client.city}`}
                                                        >
                                                            <span
                                                                className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                                                                style={{ backgroundColor: team?.color || '#94a3b8' }}
                                                            />
                                                            {inst.contractNumber || inst.client.city}
                                                        </div>
                                                    );
                                                })}
                                                {events.length > 3 && (
                                                    <div className="text-[10px] text-slate-500 font-medium">
                                                        +{events.length - 3} więcej
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
        </div>
    );
};
