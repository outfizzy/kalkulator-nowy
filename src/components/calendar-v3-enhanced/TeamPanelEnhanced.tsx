import React, { useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { InstallationTeam, Installation, TeamUnavailability } from '../../types';

interface TeamPanelEnhancedProps {
    teams: InstallationTeam[];
    installations: Installation[];
    unavailability: TeamUnavailability[];
    currentDate: Date;
    onClose: () => void;
}

export const TeamPanelEnhanced: React.FC<TeamPanelEnhancedProps> = ({
    teams,
    installations,
    unavailability,
    currentDate,
    onClose
}) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

    // Calculate team workload for current week
    const teamWorkload = useMemo(() => {
        const workload: Record<string, { hours: number; count: number; unavailableDays: number }> = {};

        teams.forEach(team => {
            const teamInstallations = installations.filter(
                i => i.teamId === team.id &&
                    i.scheduledDate &&
                    new Date(i.scheduledDate) >= weekStart &&
                    new Date(i.scheduledDate) <= weekEnd
            );

            const totalHours = teamInstallations.reduce((sum, inst) => {
                return sum + (inst.estimatedDuration || 8);
            }, 0);

            // Count unavailable days
            const teamUnavail = unavailability.filter(
                u => u.teamId === team.id &&
                    new Date(u.date) >= weekStart &&
                    new Date(u.date) <= weekEnd
            );

            workload[team.id] = {
                hours: totalHours,
                count: teamInstallations.length,
                unavailableDays: teamUnavail.length
            };
        });

        return workload;
    }, [teams, installations, unavailability, weekStart, weekEnd]);

    const maxWeeklyHours = 40;

    return (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900">
                        Ekipy
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-xs text-slate-500">
                    Tydzień: {format(weekStart, 'd MMM', { locale: pl })} - {format(weekEnd, 'd MMM', { locale: pl })}
                </p>
            </div>

            {/* Teams List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {teams.filter(t => t.isActive).map(team => {
                    const load = teamWorkload[team.id] || { hours: 0, count: 0, unavailableDays: 0 };
                    const availableHours = maxWeeklyHours - (load.unavailableDays * 8);
                    const utilization = availableHours > 0
                        ? Math.min((load.hours / availableHours) * 100, 100)
                        : 0;

                    const getStatusColor = () => {
                        if (load.unavailableDays > 0) return 'bg-gray-100 text-gray-700';
                        if (utilization >= 90) return 'bg-red-100 text-red-700';
                        if (utilization >= 70) return 'bg-yellow-100 text-yellow-700';
                        return 'bg-green-100 text-green-700';
                    };

                    const getStatusLabel = () => {
                        if (load.unavailableDays > 0) return 'Niedostępna';
                        if (utilization >= 90) return 'Przeciążona';
                        if (utilization >= 70) return 'Zajęta';
                        return 'Dostępna';
                    };

                    return (
                        <div
                            key={team.id}
                            className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                        >
                            {/* Team Header */}
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: team.color }}
                                />
                                <h3 className="font-semibold text-slate-900 text-sm flex-1">
                                    {team.name}
                                </h3>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor()}`}>
                                    {getStatusLabel()}
                                </span>
                            </div>

                            {/* Team Members */}
                            {team.members && team.members.length > 0 && (
                                <div className="mb-2">
                                    <p className="text-xs text-slate-500 mb-1">Członkowie:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {team.members.map((member, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded"
                                            >
                                                {member}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Unavailability Warning */}
                            {load.unavailableDays > 0 && (
                                <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                                    <div className="flex items-center gap-1 text-gray-700">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span className="font-medium">
                                            Niedostępna {load.unavailableDays} {load.unavailableDays === 1 ? 'dzień' : 'dni'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Workload Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="bg-slate-50 rounded p-2">
                                    <p className="text-xs text-slate-500">Montaże</p>
                                    <p className="text-lg font-bold text-slate-900">{load.count}</p>
                                </div>
                                <div className="bg-slate-50 rounded p-2">
                                    <p className="text-xs text-slate-500">Godziny</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        {load.hours}h
                                    </p>
                                </div>
                            </div>

                            {/* Capacity Bar */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500">Obciążenie</span>
                                    <span className="text-xs font-semibold text-slate-700">
                                        {utilization.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${utilization >= 90
                                                ? 'bg-red-500'
                                                : utilization >= 70
                                                    ? 'bg-yellow-500'
                                                    : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {load.hours}h / {availableHours}h dostępnych
                                </p>
                            </div>
                        </div>
                    );
                })}

                {teams.filter(t => t.isActive).length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="font-medium">Brak aktywnych ekip</p>
                        <p className="text-sm mt-1">Dodaj ekipy w ustawieniach</p>
                    </div>
                )}
            </div>
        </div>
    );
};
