import React from 'react';
import type { Installation, InstallationTeam } from '../../../types';

interface MonthViewProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    onRefresh: () => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
    currentDate,
    installations,
    teams,
    onRefresh
}) => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Widok Miesiąca</h3>
                <p className="text-slate-600">Wkrótce dostępny</p>
            </div>
        </div>
    );
};
