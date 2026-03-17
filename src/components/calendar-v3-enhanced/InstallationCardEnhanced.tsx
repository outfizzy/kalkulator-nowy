import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Installation, InstallationTeam } from '../../types';
import type { DailyForecast } from '../../services/weather.service';

interface InstallationCardEnhancedProps {
    installation: Installation;
    team: InstallationTeam;
    onEdit?: (installation: Installation) => void;
    onReportClick?: (installation: Installation) => void;
    weather?: DailyForecast;
}

export const InstallationCardEnhanced: React.FC<InstallationCardEnhancedProps> = ({
    installation,
    team,
    onEdit,
    onReportClick,
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

    const isService = installation.sourceType === 'service';
    const isFollowUp = installation.sourceType === 'followup';
    const needsReport = (installation.status === 'completed' || installation.status === 'verification') && !installation.completionReport;

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-500';
            case 'in_progress': return 'bg-amber-500';
            case 'verification': return 'bg-purple-500';
            case 'completed': return 'bg-emerald-500';
            default: return 'bg-slate-400';
        }
    };

    const clientName = installation.client?.name
        || `${installation.client?.firstName || ''} ${installation.client?.lastName || ''}`.trim()
        || 'Brak klienta';

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                borderLeftColor: team.color || '#6366f1'
            }}
            {...attributes}
            {...listeners}
            onClick={() => onEdit?.(installation)}
            className={`rounded-md border-l-[3px] bg-white shadow-sm cursor-pointer transition-all w-full overflow-hidden
                ${isDragging
                    ? 'opacity-30 scale-95'
                    : 'hover:shadow-md'
                }`}
        >
            {/* Badges row */}
            <div className="px-1.5 pt-1 flex items-center gap-0.5 flex-wrap">
                {isService && (
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded">🔧 Serwis</span>
                )}
                {isFollowUp && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">🔄 Dokończ.</span>
                )}
                {needsReport && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onReportClick?.(installation); }}
                        className="text-[9px] font-bold text-orange-700 bg-orange-100 px-1 rounded animate-pulse hover:bg-orange-200"
                    >
                        📋 Raport
                    </button>
                )}
                {installation.completionReport && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">✅</span>
                )}
                {weather && (
                    <span className={`ml-auto text-[9px] font-semibold px-1 rounded
                        ${weather.info.severity === 'bad' ? 'text-red-500 bg-red-50'
                            : weather.info.severity === 'moderate' ? 'text-amber-500 bg-amber-50'
                                : 'text-sky-500 bg-sky-50'}`}
                        title={weather.info.label}
                    >
                        {weather.info.icon} {weather.tempMax}°
                    </span>
                )}
            </div>

            {/* Client name */}
            <div className="px-1.5 py-0.5">
                <div className="font-bold text-[11px] text-slate-900 truncate leading-tight">
                    {clientName}
                </div>
                {installation.client?.city && (
                    <div className="text-[9px] text-slate-400 truncate leading-tight">
                        📍 {installation.client.city}
                    </div>
                )}
            </div>

            {/* Contract / product */}
            <div className="px-1.5 pb-0.5">
                {installation.contractNumber && (
                    <div className="text-[9px] text-slate-500 font-mono truncate">
                        {installation.contractNumber}
                    </div>
                )}
                {installation.productSummary && !isFollowUp && (
                    <div className="text-[9px] text-slate-500 truncate">
                        {installation.productSummary}
                    </div>
                )}
                {(isService || isFollowUp) && installation.notes && (
                    <div className="text-[9px] text-orange-700 truncate">
                        {installation.notes}
                    </div>
                )}
            </div>

            {/* Phone */}
            {installation.client?.phone && (
                <div className="px-1.5 pb-0.5">
                    <a
                        href={`tel:${installation.client.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] text-indigo-500 hover:underline"
                    >
                        📞 {installation.client.phone}
                    </a>
                </div>
            )}

            {/* Cost info (admin) */}
            {(() => {
                const totalCost = (installation.hotelCost || 0) + (installation.consumablesCost || 0) + (installation.additionalCosts || 0);
                return totalCost > 0 ? (
                    <div className="px-1.5 pb-0.5 flex items-center gap-1 flex-wrap">
                        {(installation.additionalCosts || 0) > 0 && <span className="text-[8px] text-blue-600 bg-blue-50 px-1 rounded">👷 {installation.additionalCosts?.toFixed(0)}€</span>}
                        {(installation.consumablesCost || 0) > 0 && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded">⛽ {installation.consumablesCost?.toFixed(0)}€</span>}
                        {(installation.hotelCost || 0) > 0 && <span className="text-[8px] text-purple-600 bg-purple-50 px-1 rounded">🏨 {installation.hotelCost?.toFixed(0)}€</span>}
                        <span className="text-[8px] font-bold text-red-600 ml-auto">Σ {totalCost.toFixed(0)}€</span>
                    </div>
                ) : null;
            })()}

            {/* Duration + parts */}
            {((installation.expectedDuration || 1) > 1 || installation.partsStatus) && (
                <div className="px-1.5 pb-0.5 flex items-center gap-1">
                    {(installation.expectedDuration || 1) > 1 && <span className="text-[8px] text-slate-500">{installation.expectedDuration} dni</span>}
                    {installation.partsStatus && (
                        <span className={`text-[8px] ml-auto font-bold px-1 rounded ${
                            installation.partsStatus === 'all_delivered' ? 'text-emerald-600 bg-emerald-50' :
                            installation.partsStatus === 'partial' ? 'text-amber-600 bg-amber-50' :
                            'text-red-500 bg-red-50'
                        }`}>
                            {installation.partsStatus === 'all_delivered' ? '📦✓' : installation.partsStatus === 'partial' ? '📦…' : '📦✗'}
                        </span>
                    )}
                </div>
            )}

            {/* Footer: team + status */}
            <div className="px-1.5 pb-1 pt-0.5 flex items-center justify-between border-t border-slate-50">
                <div className="flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                    <span className="text-[9px] text-slate-400 truncate">{team.name}</span>
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(installation.status)}`}
                    title={installation.status}
                />
            </div>
        </div>
    );
};
