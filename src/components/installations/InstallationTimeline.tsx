import React, { useState } from 'react';
import { format, addDays, isSameDay, getDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Installation, InstallationTeam, ServiceTicket } from '../../types';

interface InstallationTimelineProps {
    installations: Installation[];
    serviceTickets?: ServiceTicket[];
    teams: InstallationTeam[];
    onEdit: (installation: Installation) => void;
    onEditService?: (ticket: ServiceTicket) => void;
    onDragDrop?: (id: string, newDate: string, teamId: string, type: 'installation' | 'service' | 'contract') => Promise<void>;
    unavailability?: import('../../types').TeamUnavailability[];
}

export const InstallationTimeline: React.FC<InstallationTimelineProps> = ({
    installations,
    teams,
    onEdit,
    onDragDrop
}) => {
    // START DATE: Always start from "Today" - 2 days (to see immediate context)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return d;
    });

    // VIEW RANGE: 30 days
    const DAYS_TO_SHOW = 30;
    const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i));

    // Drag State
    const [dragOverCell, setDragOverCell] = useState<{ date: string, teamId: string } | null>(null);

    // --- RENDER HELPERS ---

    const getDayLabel = (date: Date) => {
        return format(date, 'EEE', { locale: pl });
    };

    const getDayNumber = (date: Date) => {
        return format(date, 'd');
    };

    const isWeekend = (date: Date) => {
        const day = getDay(date);
        return day === 0 || day === 6;
    };

    const isToday = (date: Date) => {
        return isSameDay(date, new Date());
    };

    // --- DRAG & DROP HANDLERS ---

    const handleDragOver = (e: React.DragEvent, date: Date, teamId: string) => {
        e.preventDefault();
        const dateStr = format(date, 'yyyy-MM-dd');
        if (dragOverCell?.date !== dateStr || dragOverCell?.teamId !== teamId) {
            setDragOverCell({ date: dateStr, teamId });
        }
    };

    const handleDrop = async (e: React.DragEvent, date: Date, teamId: string) => {
        e.preventDefault();
        setDragOverCell(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const { id, type } = data;
            const dateStr = format(date, 'yyyy-MM-dd');

            if (id && onDragDrop && (type === 'installation' || type === 'service' || type === 'contract')) {
                await onDragDrop(id, dateStr, teamId, type as any);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    // --- TASK PLACEMENT LOGIC ---

    const getTasksForTeam = (teamId: string) => {
        return installations.filter(i => {
            if (i.teamId !== teamId || !i.scheduledDate) return false;
            // Check if task falls within visible range
            const start = new Date(i.scheduledDate);
            const endOfRange = addDays(startDate, DAYS_TO_SHOW);
            return start >= startDate && start < endOfRange;
        });
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden select-none">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-2">
                    <button
                        onClick={() => setStartDate(addDays(startDate, -7))}
                        className="p-1 hover:bg-slate-200 rounded"
                    >
                        ◀
                    </button>
                    <button
                        onClick={() => setStartDate(new Date())}
                        className="px-3 py-1 text-xs font-bold bg-white border border-slate-300 rounded hover:bg-slate-100"
                    >
                        Dzisiaj
                    </button>
                    <button
                        onClick={() => setStartDate(addDays(startDate, 7))}
                        className="p-1 hover:bg-slate-200 rounded"
                    >
                        ▶
                    </button>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Widok 30 dni: {format(startDate, 'd MMM')} - {format(addDays(startDate, DAYS_TO_SHOW - 1), 'd MMM yyyy', { locale: pl })}
                </div>
            </div>

            {/* TIMELINE CONTAINER */}
            <div className="flex flex-1 overflow-x-auto overflow-y-auto relative no-scrollbar">

                {/* 1. LEFT COLUMN: TEAMS (Sticky Left) */}
                <div className="sticky left-0 z-20 bg-white border-r border-slate-200 shadow-sm min-w-[180px] w-[180px]">
                    {/* Header Placeholder */}
                    <div className="h-[60px] border-b border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-500 text-xs">
                        EKIPY
                    </div>
                    {/* Team Rows */}
                    {teams.map(team => (
                        <div key={team.id} className="h-[80px] border-b border-slate-100 flex items-center px-4 group">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: team.color || '#cbd5e1' }} />
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{team.name}</div>
                                    <div className="text-[10px] text-slate-500">{team.members?.length || 0} os.</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. MAIN GRID */}
                <div className="flex-1 min-w-max">
                    {/* Header Row: Dates */}
                    <div className="flex h-[60px] border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                        {days.map((day, i) => (
                            <div
                                key={i}
                                className={`w-[120px] min-w-[120px] border-r border-slate-200 flex flex-col items-center justify-center
                                    ${isWeekend(day) ? 'bg-slate-100/50' : 'bg-slate-50'}
                                    ${isToday(day) ? 'bg-blue-50/50' : ''}
                                `}
                            >
                                <span className={`text-[10px] uppercase font-bold ${isToday(day) ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {getDayLabel(day)}
                                </span>
                                <span className={`text-lg font-bold ${isToday(day) ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {getDayNumber(day)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Team Rows Logic */}
                    {teams.map(team => {
                        const teamTasks = getTasksForTeam(team.id);

                        return (
                            <div key={team.id} className="flex h-[80px] border-b border-slate-100 relative">
                                {/* Render Cells for Drop Targets */}
                                {days.map((day, i) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const isDragOver = dragOverCell?.date === dateStr && dragOverCell?.teamId === team.id;

                                    return (
                                        <div
                                            key={i}
                                            onDragOver={(e) => handleDragOver(e, day, team.id)}
                                            onDrop={(e) => handleDrop(e, day, team.id)}
                                            className={`w-[120px] min-w-[120px] border-r border-slate-100 transition-colors
                                                ${isWeekend(day) ? 'bg-slate-50/50' : 'bg-white'}
                                                ${isDragOver ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}
                                            `}
                                        />
                                    );
                                })}

                                {/* Render TASKS on top of the grid using absolute positioning */}
                                {teamTasks.map(task => {
                                    if (!task.scheduledDate) return null;
                                    const taskStart = new Date(task.scheduledDate);

                                    // Calculate Offset (Days from timeline start)
                                    const diffDays = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                                    // Determine width (Duration)
                                    const duration = task.expectedDuration || 1;

                                    // Style
                                    const left = diffDays * 120; // 120px per day column
                                    const width = (duration * 120) - 8; // -8px for margin

                                    // Skip if completely out of left view (though filter handled most)
                                    if (left + width < 0) return null;

                                    // Status Colors
                                    const statusColors: Record<import('../../types').InstallationStatus, string> = {
                                        scheduled: 'bg-blue-100 border-blue-200 text-blue-700',
                                        confirmed: 'bg-green-100 border-green-200 text-green-700',
                                        completed: 'bg-slate-100 border-slate-200 text-slate-700',
                                        cancelled: 'bg-red-50 border-red-100 text-red-400 opacity-60',
                                        verification: 'bg-orange-100 border-orange-200 text-orange-700',
                                        pending: 'bg-yellow-50 border-yellow-100 text-yellow-600',
                                        issue: 'bg-red-100 border-red-200 text-red-700 font-bold'
                                    };

                                    const colorClass = statusColors[task.status] || statusColors.scheduled;

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => onEdit(task)}
                                            className={`absolute top-2 bottom-2 rounded-lg border shadow-sm px-2 py-1 text-xs cursor-pointer hover:shadow-md transition-shadow overflow-hidden whitespace-nowrap z-10 ${colorClass}`}
                                            style={{
                                                left: `${left + 4}px`, // +4px margin left
                                                width: `${width}px`
                                            }}
                                            title={`${task.client.lastName} - ${task.productSummary}`}
                                        >
                                            <div className="font-bold truncate">{task.client.lastName}</div>
                                            <div className="truncate opacity-75 text-[10px]">{task.client.city}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
