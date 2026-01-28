import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Installation, InstallationTeam } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface InstallationCardProps {
    installation: Installation;
    teams: InstallationTeam[];
    isDragging?: boolean;
}

export const InstallationCard: React.FC<InstallationCardProps> = ({
    installation,
    teams,
    isDragging = false
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: installation.id,
        data: { type: 'installation', installation }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const team = teams.find(t => t.id === installation.teamId);
    const teamColor = team?.color || '#6366f1';

    // Calculate duration in days
    const startDate = new Date(installation.startDate);
    const endDate = new Date(installation.endDate);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, borderLeftColor: teamColor }}
            {...attributes}
            {...listeners}
            className="bg-white border-l-4 rounded-lg shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        >
            {/* Customer Name */}
            <div className="font-semibold text-sm text-slate-900 mb-1 truncate">
                {installation.client?.name || 'Brak nazwy'}
            </div>

            {/* Contract Number */}
            {installation.contractNumber && (
                <div className="text-xs text-slate-500 mb-2">
                    #{installation.contractNumber}
                </div>
            )}

            {/* Product Summary */}
            {installation.productSummary && (
                <div className="text-xs text-slate-600 mb-2 line-clamp-2">
                    {installation.productSummary}
                </div>
            )}

            {/* Team Badge */}
            {team && (
                <div className="flex items-center gap-1.5 mb-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: teamColor }}
                    />
                    <span className="text-xs font-medium text-slate-700">
                        {team.name}
                    </span>
                </div>
            )}

            {/* Duration & Status */}
            <div className="flex items-center justify-between text-xs">
                {durationDays > 1 && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                        {durationDays} dni
                    </span>
                )}

                <span className={`px-2 py-0.5 rounded font-medium ${installation.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : installation.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                    {installation.status === 'completed' ? 'Ukończono' :
                        installation.status === 'in_progress' ? 'W trakcie' : 'Zaplanowano'}
                </span>
            </div>
        </div>
    );
};
