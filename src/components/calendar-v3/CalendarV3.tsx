import React, { useState } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { CalendarSidebar } from './CalendarSidebar';
import { TeamPanel } from './TeamPanel';
import { useCalendarState } from './hooks/useCalendarState';

export const CalendarV3: React.FC = () => {
    const {
        currentDate,
        viewMode,
        installations,
        contracts,
        teams,
        loading,
        setCurrentDate,
        setViewMode,
        refreshData
    } = useCalendarState();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [teamPanelOpen, setTeamPanelOpen] = useState(true);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-slate-600">Ładowanie kalendarza...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <CalendarHeader
                currentDate={currentDate}
                viewMode={viewMode}
                onDateChange={setCurrentDate}
                onViewModeChange={setViewMode}
                onRefresh={refreshData}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onToggleTeamPanel={() => setTeamPanelOpen(!teamPanelOpen)}
                sidebarOpen={sidebarOpen}
                teamPanelOpen={teamPanelOpen}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Backlog Sidebar */}
                {sidebarOpen && (
                    <CalendarSidebar
                        contracts={contracts}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto">
                    <CalendarGrid
                        currentDate={currentDate}
                        viewMode={viewMode}
                        installations={installations}
                        teams={teams}
                        onRefresh={refreshData}
                    />
                </div>

                {/* Team Panel */}
                {teamPanelOpen && (
                    <TeamPanel
                        teams={teams}
                        installations={installations}
                        onClose={() => setTeamPanelOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};
