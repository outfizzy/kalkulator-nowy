import React, { useMemo } from 'react';
import type { InstallationTeam, Installation } from '../../types';

interface TeamPanelProps {
    teams: InstallationTeam[];
    installations: Installation[];
    onClose: () => void;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({
    teams,
    installations,
    onClose
}) => {
    // Calculate team workload
    const teamWorkload = useMemo(() => {
        const workload: Record<string, { hours: number; count: number }> = {};

        teams.forEach(team => {
            workload[team.id] = { hours: 0, count: 0 };
        });

        installations.forEach(installation => {
            if (installation.teamId && workload[installation.teamId]) {
                // Estimate 8 hours per day
                const startDate = new Date(installation.startDate);
                const endDate = new Date(installation.endDate);
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const hours = days * 8;

                workload[installation.teamId].hours += hours;
                workload[installation.teamId].count += 1;
            }
        });

        return workload;
    }, [teams, installations]);

    return (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Zespoły</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-100 rounded"
                >
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Teams List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {teams.map(team => {
                    const load = teamWorkload[team.id] || { hours: 0, count: 0 };
                    const maxWeeklyHours = 40; // Standard work week
                    const utilization = Math.min((load.hours / maxWeeklyHours) * 100, 100);

                    return (
                        <div
                            key={team.id}
                            className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                        >
                            {/* Team Name & Color */}
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: team.color || '#6366f1' }}
                                />
                                <span className="font-semibold text-slate-900">
                                    {team.name}
                                </span>
                            </div>

                            {/* Team Members */}
                            {team.members && team.members.length > 0 && (
                                <div className="text-xs text-slate-600 mb-3">
                                    {team.members.join(', ')}
                                </div>
                            )}

                            {/* Workload Stats */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">Montaże w tym tygodniu:</span>
                                    <span className="font-semibold text-slate-900">{load.count}</span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">Godziny:</span>
                                    <span className="font-semibold text-slate-900">
                                        {load.hours}h / {maxWeeklyHours}h
                                    </span>
                                </div>

                                {/* Capacity Bar */}
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-slate-600">Obciążenie:</span>
                                        <span className={`font-semibold ${utilization > 90 ? 'text-red-600' :
                                                utilization > 70 ? 'text-yellow-600' :
                                                    'text-green-600'
                                            }`}>
                                            {utilization.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${utilization > 90 ? 'bg-red-500' :
                                                    utilization > 70 ? 'bg-yellow-500' :
                                                        'bg-green-500'
                                                }`}
                                            style={{ width: `${utilization}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${team.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {team.isActive ? '✓ Aktywny' : 'Nieaktywny'}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {teams.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="font-medium">Brak zespołów</p>
                        <p className="text-sm mt-1">Dodaj zespoły montażowe</p>
                    </div>
                )}
            </div>
        </div>
    );
};
