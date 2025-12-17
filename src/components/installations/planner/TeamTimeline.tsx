import React from 'react';
import type { Installation, InstallationTeam } from '../../../types';

interface TeamTimelineProps {
    teams: InstallationTeam[];
    dates: Date[];
    installations: Installation[];
    onDrop: (date: Date, teamId: string, installationId: string) => void;
    onEdit: (installation: Installation) => void;
}

export const TeamTimeline: React.FC<TeamTimelineProps> = ({
    teams,
    dates,
    installations,
    onDrop,
    onEdit
}) => {
    const [dragOverCell, setDragOverCell] = React.useState<{ date: string; teamId: string } | null>(null);

    const handleDragOver = (e: React.DragEvent, date: Date, teamId: string) => {
        e.preventDefault();
        const dateStr = date.toISOString().split('T')[0];
        if (dragOverCell?.date !== dateStr || dragOverCell?.teamId !== teamId) {
            setDragOverCell({ date: dateStr, teamId });
        }
    };

    const handleDrop = (e: React.DragEvent, date: Date, teamId: string) => {
        e.preventDefault();
        setDragOverCell(null);
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            onDrop(date, teamId, id);
        }
    };

    const getInstallationsForCell = (teamId: string, date: Date) => {
        return installations.filter(i => {
            if (i.teamId !== teamId || !i.scheduledDate || i.status === 'cancelled') return false;

            const instDate = new Date(i.scheduledDate);
            const instDateStr = instDate.toISOString().split('T')[0];
            const cellDateStr = date.toISOString().split('T')[0];

            // Check if this date falls within the duration
            if (instDateStr === cellDateStr) return true; // Start date matches

            const duration = i.expectedDuration || 1;
            if (duration > 1) {
                const diffTime = date.getTime() - instDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays < duration;
            }

            return false;
        });
    };

    return (
        <div className="overflow-auto flex-1 w-full h-full bg-white relative" style={{ contain: 'paint' }}>
            <div className="min-w-max relative">
                {/* Header Row */}
                <div className="flex border-b border-slate-200 sticky top-0 z-20 bg-white shadow-sm">
                    <div className="w-48 p-4 shrink-0 bg-slate-50 border-r border-slate-200 font-bold text-slate-500 text-xs uppercase sticky left-0 z-30">
                        Ekipa
                    </div>
                    {dates.map(date => {
                        const isToday = new Date().toDateString() === date.toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        return (
                            <div
                                key={date.toISOString()}
                                className={`w-32 shrink-0 p-3 text-center border-r border-slate-200 
                                    ${isToday ? 'bg-indigo-50 border-b-2 border-b-indigo-500' : 'bg-slate-50'}
                                    ${isWeekend ? 'bg-slate-100/50' : ''}
                                `}
                            >
                                <div className={`text-xs font-bold uppercase ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                                    {date.toLocaleDateString('pl-PL', { weekday: 'short' })}
                                </div>
                                <div className={`text-sm font-bold ${isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Team Rows */}
                {teams.map(team => (
                    <div key={team.id} className="flex border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                        {/* Team Info Sticky */}
                        <div className="w-48 shrink-0 p-4 border-r border-slate-200 bg-white sticky left-0 z-10 flex flex-col justify-center sticky-cell-shadow">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                                <span className="font-bold text-slate-800 text-sm">{team.name}</span>
                            </div>
                            <div className="text-xs text-slate-500 pl-5">
                                {team.members.length} montażystów
                            </div>
                        </div>

                        {/* Cells */}
                        {dates.map(date => {
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const cellInstallations = getInstallationsForCell(team.id, date);
                            const isDragOver = dragOverCell?.date === date.toISOString().split('T')[0] && dragOverCell?.teamId === team.id;

                            return (
                                <div
                                    key={date.toISOString()}
                                    className={`
                                        w-32 shrink-0 h-28 border-r border-slate-200 relative transition-all
                                        ${isWeekend ? 'bg-slate-50/50' : ''}
                                        ${isDragOver ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}
                                    `}
                                    onDragOver={(e) => handleDragOver(e, date, team.id)}
                                    // onDragLeave={() => setDragOverCell(null)} // Can be flaky, relying on drop reset
                                    onDrop={(e) => handleDrop(e, date, team.id)}
                                >
                                    <div className="p-1 h-full w-full space-y-1 overflow-y-auto custom-scrollbar">
                                        {cellInstallations.map(inst => {
                                            // Calculate day index for multi-day
                                            let dayLabel = '';
                                            if ((inst.expectedDuration || 1) > 1) {
                                                const start = new Date(inst.scheduledDate!);
                                                const diff = Math.round((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                dayLabel = `(${diff}/${inst.expectedDuration})`;
                                            }

                                            return (
                                                <div
                                                    key={inst.id}
                                                    onClick={() => onEdit(inst)}
                                                    className={`
                                                        text-[10px] p-1.5 rounded border shadow-sm cursor-pointer hover:scale-[1.02] transition-transform
                                                        bg-white border-l-4
                                                    `}
                                                    style={{ borderLeftColor: team.color }}
                                                    title={`${inst.client.firstName} ${inst.client.lastName} - ${inst.productSummary}`}
                                                >
                                                    <div className="font-bold truncate">{inst.client.city}</div>
                                                    <div className="truncate text-slate-500">{inst.client.lastName}</div>
                                                    {dayLabel && (
                                                        <div className="text-[9px] font-bold text-indigo-600 mt-0.5">{dayLabel}</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <style>{`
                .sticky-cell-shadow {
                    box-shadow: 4px 0 6px -4px rgba(0,0,0,0.1);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
};
