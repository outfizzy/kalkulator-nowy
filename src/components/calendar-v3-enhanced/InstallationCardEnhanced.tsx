import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Installation, InstallationTeam } from '../../types';
import type { DailyForecast } from '../../services/weather.service';

interface InstallationCardEnhancedProps {
    installation: Installation;
    team: InstallationTeam;
    onEdit?: (installation: Installation) => void;
    weather?: DailyForecast;
}

export const InstallationCardEnhanced: React.FC<InstallationCardEnhancedProps> = ({
    installation,
    team,
    onEdit,
    weather
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled':
                return { label: 'Zaplanowany', bg: 'bg-blue-500', text: 'text-white' };
            case 'in_progress':
                return { label: 'W trakcie', bg: 'bg-yellow-500', text: 'text-white' };
            case 'verification':
                return { label: 'Weryfikacja', bg: 'bg-purple-500', text: 'text-white' };
            case 'completed':
                return { label: 'Zakończony', bg: 'bg-green-500', text: 'text-white' };
            default:
                return { label: status, bg: 'bg-slate-400', text: 'text-white' };
        }
    };

    const getPartsStatusBadge = (partsStatus?: string, partsReady?: boolean) => {
        if (partsReady) return { label: '✅ Części OK', color: 'text-green-700 bg-green-50' };
        switch (partsStatus) {
            case 'all_delivered':
                return { label: '✅ Części OK', color: 'text-green-700 bg-green-50' };
            case 'partial':
                return { label: '⚠️ Częściowo', color: 'text-amber-700 bg-amber-50' };
            case 'pending':
                return { label: '⏳ Oczekuje', color: 'text-orange-700 bg-orange-50' };
            case 'none':
                return { label: '❌ Brak', color: 'text-red-700 bg-red-50' };
            default:
                return null;
        }
    };

    const statusBadge = getStatusBadge(installation.status);
    const partsBadge = getPartsStatusBadge(installation.partsStatus, installation.partsReady);

    // Border color based on weather severity
    const weatherBorderClass = weather
        ? weather.info.severity === 'bad'
            ? 'border-l-4 border-l-red-400'
            : weather.info.severity === 'moderate'
                ? 'border-l-4 border-l-amber-400'
                : 'border-l-4 border-l-sky-400'
        : 'border-l-4 border-l-slate-200';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white rounded-lg shadow-sm border border-slate-200 cursor-move transition-all ${weatherBorderClass} ${isDragging
                ? 'opacity-50 scale-95 shadow-2xl z-50'
                : 'hover:shadow-md hover:border-slate-300'
                }`}
        >
            {/* Header: Client Name + Weather */}
            <div className="px-3 pt-2.5 pb-1.5 flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[13px] text-slate-900 truncate leading-tight">
                        {installation.client?.name || `${installation.client?.firstName || ''} ${installation.client?.lastName || ''}`}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                        📍 {installation.client?.city}{installation.client?.address ? `, ${installation.client.address}` : ''}
                    </p>
                </div>
                {/* Weather Badge */}
                {weather && (
                    <div
                        className={`flex-shrink-0 flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-xs font-semibold ${weather.info.severity === 'bad' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                                weather.info.severity === 'moderate' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
                                    'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                            }`}
                        title={`${weather.info.label} — ${weather.tempMin}°/${weather.tempMax}°C`}
                    >
                        <span className="text-base leading-none">{weather.info.icon}</span>
                        <span className="text-[11px] font-bold">{weather.tempMax}°</span>
                    </div>
                )}
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(installation);
                        }}
                        className="flex-shrink-0 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Contract & Product */}
            <div className="px-3 pb-1.5">
                {installation.contractNumber && (
                    <div className="text-[11px] text-slate-500 font-mono">
                        📝 {installation.contractNumber}
                    </div>
                )}
                {installation.productSummary && (
                    <div className="text-[11px] text-slate-700 font-medium line-clamp-1 mt-0.5">
                        📦 {installation.productSummary}
                    </div>
                )}
            </div>

            {/* Phone */}
            {installation.client?.phone && (
                <div className="px-3 pb-1">
                    <a
                        href={`tel:${installation.client.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        📞 {installation.client.phone}
                    </a>
                </div>
            )}

            {/* Footer: Team + Status + Parts */}
            <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-1 flex-wrap border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                    <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                    />
                    <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[80px]">
                        {team.name}
                    </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                    {partsBadge && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${partsBadge.color}`}>
                            {partsBadge.label}
                        </span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                    </span>
                </div>
            </div>
        </div>
    );
};
