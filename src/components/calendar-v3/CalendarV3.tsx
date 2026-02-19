import React, { useState } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { CalendarSidebar } from './CalendarSidebar';
import { TeamPanel } from './TeamPanel';
import { useCalendarState } from './hooks/useCalendarState';
import { InstallationDetailsModal } from '../installations/InstallationDetailsModal';
import { DatabaseService } from '../../services/database';
import type { Installation } from '../../types';

export const CalendarV3: React.FC = () => {
    const {
        currentDate,
        viewMode,
        installations,
        teams,
        unavailability,
        backlog,
        loading,
        setCurrentDate,
        setViewMode,
        handleDrop,
        handleScheduleFromSidebar,
        refreshData
    } = useCalendarState();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [teamPanelOpen, setTeamPanelOpen] = useState(true);
    const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEditInstallation = (installation: Installation) => {
        setEditingInstallation(installation);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingInstallation(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Ładowanie kalendarza...</p>
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
                        contracts={backlog.contracts}
                        serviceTickets={backlog.serviceTickets}
                        pendingInstallations={backlog.pendingInstallations}
                        onSchedule={handleScheduleFromSidebar}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto min-w-0">
                    <CalendarGrid
                        currentDate={currentDate}
                        viewMode={viewMode}
                        installations={installations}
                        teams={teams}
                        unavailability={unavailability}
                        onDrop={handleDrop}
                        onEditInstallation={handleEditInstallation}
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

            {/* Full Installation Details Modal */}
            {editingInstallation && (
                <InstallationDetailsModal
                    installation={editingInstallation}
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onUpdate={refreshData}
                    onSave={async (updated) => {
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                />
            )}
        </div>
    );
};
