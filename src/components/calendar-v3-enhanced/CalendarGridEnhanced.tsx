import React from 'react';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { WeekViewEnhanced } from './views/WeekViewEnhanced';
import { CalendarMonthView } from '../calendar-v2/CalendarMonthView';
import { CalendarTimeline } from '../calendar-v2/CalendarTimeline';
import { CalendarMap } from '../calendar-v2/CalendarMap';
import { InstallationService } from '../../services/database/installation.service';
import type { Installation, InstallationTeam, TeamUnavailability, ServiceTicket, Contract } from '../../types';
import type { LocationForecast } from '../../services/weather.service';
import toast from 'react-hot-toast';

interface CalendarGridEnhancedProps {
    currentDate: Date;
    viewMode: 'week' | 'month' | 'timeline' | 'map';
    installations: Installation[];
    teams: InstallationTeam[];
    unavailability: TeamUnavailability[];
    onRefresh: () => void;
    onEditInstallation?: (installation: Installation) => void;
    onReportClick?: (installation: Installation) => void;
    weatherData?: Map<string, LocationForecast>;
    showGoogleEvents?: boolean;
    onGCalEventClick?: (event: any) => void;
    serviceTickets?: ServiceTicket[];
    contracts?: Contract[];
    followUps?: Installation[];
}

export const CalendarGridEnhanced: React.FC<CalendarGridEnhancedProps> = ({
    currentDate,
    viewMode,
    installations,
    teams,
    unavailability,
    onRefresh,
    onEditInstallation,
    onReportClick,
    weatherData,
    showGoogleEvents,
    onGCalEventClick,
    serviceTickets,
    contracts,
    followUps
}) => {
    return (
        <div className="h-full bg-white">
            {viewMode === 'week' && (
                <WeekViewEnhanced
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    unavailability={unavailability}
                    onEditInstallation={onEditInstallation}
                    onReportClick={onReportClick}
                    weatherData={weatherData}
                    showGoogleEvents={showGoogleEvents}
                    onGCalEventClick={onGCalEventClick}
                />
            )}
            {viewMode === 'month' && (
                <CalendarMonthView
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    onDrop={async (itemId, itemType, date, teamId) => {
                        // For now HTML5 Dnd from V2 Month View might not work with V3 items
                        // TODO: Upgrade MonthView to DndKit or use bridge
                    }}
                    onEditInstallation={onEditInstallation}
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
                <CalendarMap
                    currentDate={currentDate}
                    installations={installations}
                    teams={teams}
                    serviceTickets={serviceTickets}
                    contracts={contracts}
                    followUps={followUps}
                    onEditInstallation={onEditInstallation}
                />
            )}
        </div>
    );
};
