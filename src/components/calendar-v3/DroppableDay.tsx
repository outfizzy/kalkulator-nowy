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
            className={`border-r border-slate-200 last:border-r-0 p-2 min-h-[200px] ${isWeekend ? 'bg-slate-50' : 'bg-white'
                } ${isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
        >
            <SortableContext
                items={installations.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                {installations.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
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
    );
};
