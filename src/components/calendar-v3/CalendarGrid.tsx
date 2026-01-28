import React from 'react';
import { WeekView } from './views/WeekView';
import { MonthView } from './views/MonthView';
import { DayView } from './views/DayView';
import type { Installation, InstallationTeam } from '../../types';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarGridProps {
    currentDate: Date;
    viewMode: ViewMode;
    installations: Installation[];
    teams: InstallationTeam[];
    onRefresh: () => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
    currentDate,
    viewMode,
    installations,
    teams,
    onRefresh
}) => {
    return (
        <div className="h-full bg-white">
            {viewMode === 'week' && (
                <WeekView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    onRefresh={onRefresh}
                />
            )}
            {viewMode === 'month' && (
                <MonthView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    onRefresh={onRefresh}
                />
            )}
            {viewMode === 'day' && (
                <DayView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    onRefresh={onRefresh}
                />
            )}
        </div>
    );
};
