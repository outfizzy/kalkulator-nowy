import React from 'react';
import { WeekView } from './views/WeekView';
import { MonthView } from './views/MonthView';
import { DayView } from './views/DayView';
import { CalendarTimeline } from './views/CalendarTimeline';
import { CalendarMapView } from './views/CalendarMapView';
import type { Installation, InstallationTeam, TeamUnavailability } from '../../types';

type ViewMode = 'day' | 'week' | 'month' | 'timeline' | 'map';

interface CalendarGridProps {
    currentDate: Date;
    viewMode: ViewMode;
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability: TeamUnavailability[];
    onDrop: (itemId: string, itemType: 'contract' | 'service' | 'installation', targetDate: string, targetTeamId: string) => void;
    onEditInstallation?: (installation: Installation) => void;
    onRefresh: () => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
    currentDate,
    viewMode,
    installations,
    teams,
    unavailability,
    onDrop,
    onEditInstallation,
    onRefresh
}) => {
    return (
        <div className="h-full bg-white">
            {viewMode === 'week' && (
                <WeekView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    unavailability={unavailability}
                    onDrop={onDrop}
                    onEditInstallation={onEditInstallation}
                    onRefresh={onRefresh}
                />
            )}
            {viewMode === 'month' && (
                <MonthView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    unavailability={unavailability}
                    onRefresh={onRefresh}
                    onEditInstallation={onEditInstallation}
                    onDrop={onDrop}
                />
            )}
            {viewMode === 'day' && (
                <DayView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    unavailability={unavailability}
                    onRefresh={onRefresh}
                    onEditInstallation={onEditInstallation}
                    onDrop={onDrop}
                />
            )}
            {viewMode === 'timeline' && (
                <CalendarTimeline
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    onEditInstallation={onEditInstallation}
                />
            )}
            {viewMode === 'map' && (
                <CalendarMapView
                    installations={installations}
                    teams={teams}
                    onEditInstallation={onEditInstallation}
                />
            )}
        </div>
    );
};
