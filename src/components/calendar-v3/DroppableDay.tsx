import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Installation, InstallationTeam } from '../../types';
import { InstallationCard } from './InstallationCard';

interface DroppableDayProps {
    date: Date;
    dateKey: string;
    installations: Installation[];
    teams: InstallationTeam[];
    isWeekend: boolean;
    onRefresh: () => void;
}

export const DroppableDay: React.FC<DroppableDayProps> = ({
    date,
    dateKey,
    installations,
    teams,
    isWeekend,
    onRefresh
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: dateKey,
        data: { type: 'day', date: dateKey }
    });

    return (
        <div
            ref={setNodeRef}
            className={`border-r border-slate-200 last:border-r-0 min-h-[250px] flex flex-col ${isWeekend ? 'bg-slate-50/70' : 'bg-white'
                } ${isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''}`}
        >
            {/* Installation count badge */}
            {installations.length > 0 && (
                <div className="px-2 pt-1.5 pb-0.5 flex items-center justify-end">
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {installations.length} {installations.length === 1 ? 'montaż' : installations.length < 5 ? 'montaże' : 'montaży'}
                    </span>
                </div>
            )}

            {/* Cards area */}
            <div className="flex-1 p-1.5 overflow-y-auto">
                <SortableContext
                    items={installations.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {installations.length === 0 ? (
                        <div className="flex items-center justify-center h-full min-h-[120px] text-slate-300 text-xs italic">
                            Brak montaży
                        </div>
                    ) : (
                        installations.map(installation => (
                            <InstallationCard
                                key={installation.id}
                                installation={installation}
                                teams={teams}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    );
};
