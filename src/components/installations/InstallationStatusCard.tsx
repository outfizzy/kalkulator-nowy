import React from 'react';
import { Link } from 'react-router-dom';
import type { Installation, InstallationTeam } from '../../types';

interface InstallationStatusCardProps {
    installation: Installation;
    team?: InstallationTeam;
    variant?: 'compact' | 'full';
    onEdit?: () => void;
    showCalendarLink?: boolean;
}

export const InstallationStatusCard: React.FC<InstallationStatusCardProps> = ({
    installation,
    team,
    variant = 'full',
    onEdit,
    showCalendarLink = true
}) => {
    const getStatusColor = (status: Installation['status']) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in_progress': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusLabel = (status: Installation['status']) => {
        switch (status) {
            case 'completed': return 'Zakończono';
            case 'scheduled': return 'Zaplanowano';
            case 'in_progress': return 'W trakcie';
            case 'cancelled': return 'Anulowano';
            default: return 'Oczekuje';
        }
    };

    const formatDate = (date: string | Date) => {
        const d = new Date(date);
        return d.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getDaysUntil = (date: string | Date) => {
        const now = new Date();
        const target = new Date(date);
        const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return `${Math.abs(diff)} dni temu`;
        if (diff === 0) return 'Dzisiaj';
        if (diff === 1) return 'Jutro';
        return `Za ${diff} dni`;
    };

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                {/* Date Badge */}
                <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold leading-none ${installation.scheduledDate
                        ? 'bg-blue-50 border border-blue-100 text-blue-600'
                        : 'bg-amber-50 border border-amber-100 text-amber-600'
                    }`}>
                    {installation.scheduledDate ? (
                        <>
                            <span className="text-lg">{new Date(installation.scheduledDate).getDate()}</span>
                            <span className="text-[9px] uppercase">{new Date(installation.scheduledDate).toLocaleString('pl-PL', { month: 'short' })}</span>
                        </>
                    ) : (
                        <span className="text-[10px] text-center">DO<br />USTAL.</span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{installation.productSummary}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {team && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                                <span className="text-xs text-slate-500">{team.name}</span>
                            </div>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${getStatusColor(installation.status)}`}>
                            {getStatusLabel(installation.status)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edytuj montaż"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    // Full variant
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${installation.status === 'completed' ? 'bg-green-100 text-green-600' :
                                installation.status === 'scheduled' ? 'bg-blue-100 text-blue-600' :
                                    installation.status === 'in_progress' ? 'bg-orange-100 text-orange-600' :
                                        'bg-slate-100 text-slate-500'
                            }`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Montaż</h3>
                            <div className="text-xs text-slate-500">{installation.productSummary}</div>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(installation.status)}`}>
                        {getStatusLabel(installation.status)}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Date Row */}
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold leading-none shadow-sm ${installation.scheduledDate
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                        }`}>
                        {installation.scheduledDate ? (
                            <>
                                <span className="text-2xl">{new Date(installation.scheduledDate).getDate()}</span>
                                <span className="text-[10px] uppercase opacity-80">{new Date(installation.scheduledDate).toLocaleString('pl-PL', { month: 'short' })}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[9px] uppercase">Ustal</span>
                            </>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">
                            {installation.scheduledDate
                                ? formatDate(installation.scheduledDate)
                                : 'Data do ustalenia'
                            }
                        </div>
                        {installation.scheduledDate && (
                            <div className="text-xs text-slate-500 mt-0.5">
                                {getDaysUntil(installation.scheduledDate)}
                            </div>
                        )}
                        {installation.expectedDuration && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Szacowany czas: {installation.expectedDuration} {installation.expectedDuration === 1 ? 'dzień' : 'dni'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Row */}
                {team ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-slate-700">{team.name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {team.members?.slice(0, 3).map((member, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                        {typeof member === 'string' ? member : `${member.firstName} ${member.lastName}`}
                                    </span>
                                ))}
                                {team.members && team.members.length > 3 && (
                                    <span className="text-[10px] text-slate-400">+{team.members.length - 3} więcej</span>
                                )}
                            </div>
                        </div>
                        {team.vehicle && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                {team.vehicle}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-700">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium">Brak przypisanej ekipy</span>
                    </div>
                )}

                {/* Notes */}
                {installation.notes && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-medium text-slate-600">Uwagi:</span> {installation.notes}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                {showCalendarLink && (
                    <Link
                        to="/installations/calendar"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Zobacz w kalendarzu
                    </Link>
                )}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edytuj Montaż
                    </button>
                )}
            </div>
        </div>
    );
};
