import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Installation, InstallationTeam } from '../../types';

interface InstallationCardEnhancedProps {
    installation: Installation;
    team: InstallationTeam;
    onEdit?: (installation: Installation) => void;
}

export const InstallationCardEnhanced: React.FC<InstallationCardEnhancedProps> = ({
    installation,
    team,
    onEdit
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: installation.id,
        data: {
            type: 'installation',
            itemId: installation.id
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'verification':
                return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-300';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'Zaplanowany';
            case 'in_progress':
                return 'W trakcie';
            case 'verification':
                return 'Weryfikacja';
            case 'completed':
                return 'Zakończony';
            default:
                return status;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`p-2 bg-white border rounded-lg cursor-move transition-all ${isDragging
                    ? 'opacity-50 scale-95 shadow-2xl z-50'
                    : 'hover:shadow-md hover:border-accent'
                } ${getStatusColor(installation.status)}`}
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                        {installation.client?.name || `${installation.client?.firstName} ${installation.client?.lastName}`}
                    </h4>
                    <p className="text-xs text-slate-600 truncate">
                        {installation.client?.city}
                    </p>
                </div>
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(installation);
                        }}
                        className="p-1 hover:bg-white/50 rounded"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>

            {installation.contractNumber && (
                <p className="text-xs text-slate-500 mb-1">
                    #{installation.contractNumber}
                </p>
            )}

            {installation.productSummary && (
                <p className="text-xs text-slate-600 line-clamp-1 mb-1">
                    {installation.productSummary}
                </p>
            )}

            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: team.color }}
                    />
                    <span className="text-xs font-medium text-slate-700">
                        {team.name}
                    </span>
                </div>
                {installation.estimatedDuration && (
                    <span className="text-xs text-slate-500">
                        {installation.estimatedDuration}h
                    </span>
                )}
            </div>

            {installation.partsReady && (
                <div className="mt-1 flex items-center gap-1 text-green-600">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-medium">Części gotowe</span>
                </div>
            )}
        </div>
    );
};
