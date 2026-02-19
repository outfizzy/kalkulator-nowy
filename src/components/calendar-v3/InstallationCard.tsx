import React from 'react';
import type { Installation, InstallationTeam } from '../../types';

interface InstallationCardProps {
    installation: Installation;
    teams: InstallationTeam[];
    isDragging?: boolean;
    compact?: boolean;
    onClick?: () => void;
}

export const InstallationCard: React.FC<InstallationCardProps> = ({
    installation,
    teams,
    isDragging = false,
    compact = false,
    onClick
}) => {
    const team = teams.find(t => t.id === installation.teamId);
    const teamColor = team?.color || '#94a3b8';

    // Build display name from firstName + lastName
    const clientName = [
        installation.client?.firstName,
        installation.client?.lastName
    ].filter(Boolean).join(' ') || installation.title || 'Brak nazwy';

    // Status config
    const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
        completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Ukończono' },
        in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'W trakcie' },
        scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Zaplanowano' },
        confirmed: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', label: 'Potwierdzone' },
        pending: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Oczekuje' },
        verification: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Weryfikacja' },
        cancelled: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500', label: 'Anulowane' },
    };
    const status = statusConfig[installation.status] || statusConfig.pending;

    // Address
    const address = [installation.client?.address, installation.client?.city]
        .filter(Boolean).join(', ');

    // Duration
    const duration = installation.expectedDuration || 1;

    // Compact mode for grid cells
    if (compact) {
        return (
            <div
                className={`rounded-md shadow-sm cursor-pointer hover:shadow-md transition-all border border-slate-200 overflow-hidden ${isDragging ? 'opacity-50 rotate-1' : ''
                    }`}
                onClick={onClick}
            >
                <div className="flex">
                    <div className="w-1 shrink-0" style={{ backgroundColor: teamColor }} />
                    <div className="flex-1 p-1.5 min-w-0">
                        {/* Name + status dot */}
                        <div className="flex items-center gap-1 mb-0.5">
                            <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: status.dot }}
                            />
                            <span className="font-semibold text-[11px] text-slate-800 truncate">
                                {clientName}
                            </span>
                        </div>

                        {/* City + Contract Number */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            {installation.client?.city && (
                                <span className="truncate">📍 {installation.client.city}</span>
                            )}
                            {installation.contractNumber && (
                                <span className="font-mono bg-slate-100 px-1 rounded flex-shrink-0">
                                    {installation.contractNumber}
                                </span>
                            )}
                        </div>

                        {/* Product summary (compact) */}
                        {installation.productSummary && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {installation.productSummary}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Full card mode
    return (
        <div
            className={`group rounded-lg shadow-sm mb-2 cursor-pointer hover:shadow-md transition-all border border-slate-200 overflow-hidden ${isDragging ? 'opacity-50 rotate-2' : ''
                }`}
            onClick={onClick}
        >
            <div className="flex">
                {/* Team color bar */}
                <div className="w-1.5 shrink-0" style={{ backgroundColor: teamColor }} />

                <div className="flex-1 p-2 min-w-0">
                    {/* Row 1: Customer name + status */}
                    <div className="flex items-start gap-1.5 mb-1">
                        <div
                            className="w-2 h-2 rounded-full mt-1 shrink-0"
                            style={{ backgroundColor: status.dot }}
                            title={status.label}
                        />
                        <div className="font-semibold text-[13px] leading-tight text-slate-900 break-words min-w-0 flex-1">
                            {clientName}
                        </div>
                    </div>

                    {/* Row 2: Contract + duration + status */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {installation.contractNumber && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {installation.contractNumber}
                            </span>
                        )}
                        {duration > 1 && (
                            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {duration}d
                            </span>
                        )}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Row 3: Product summary */}
                    {installation.productSummary && (
                        <div className="text-[11px] text-slate-600 leading-snug mb-1 line-clamp-2">
                            📦 {installation.productSummary}
                        </div>
                    )}

                    {/* Row 4: Address */}
                    {address && (
                        <div className="text-[11px] text-slate-400 leading-snug truncate" title={address}>
                            📍 {address}
                        </div>
                    )}

                    {/* Row 5: Team name */}
                    {team && (
                        <div className="flex items-center gap-1 mt-1">
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: teamColor }}
                            />
                            <span className="text-[11px] font-medium text-slate-600 truncate">
                                {team.name}
                            </span>
                        </div>
                    )}

                    {/* No team assigned */}
                    {!team && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-500 italic">
                            ⚠️ Brak ekipy
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
