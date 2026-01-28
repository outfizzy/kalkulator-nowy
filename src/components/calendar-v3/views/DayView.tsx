import React from 'react';
import type { Installation, InstallationTeam } from '../../../types';

interface DayViewProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    onRefresh: () => void;
}

export const DayView: React.FC<DayViewProps> = ({
    currentDate,
    installations,
    teams,
    onRefresh
}) => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Widok Dnia</h3>
                <p className="text-slate-600">Wkrótce dostępny</p>
            </div>
        </div>
    );
};
