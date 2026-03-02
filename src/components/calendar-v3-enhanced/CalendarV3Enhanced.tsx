import React, { useState, useEffect } from 'react';
import { DndContext, type DragEndEvent, type DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import toast from 'react-hot-toast';
import { CalendarHeader } from './CalendarHeader';
import { SmartSidebar } from './SmartSidebar';
import { TeamPanelEnhanced } from './TeamPanelEnhanced';
import { CalendarGridEnhanced } from './CalendarGridEnhanced';
import { InstallationService } from '../../services/database/installation.service';
import type { Installation, Contract, ServiceTicket, InstallationTeam, TeamUnavailability } from '../../types';
import { getWeatherForInstallations, type LocationForecast } from '../../services/weather.service';

interface CalendarV3EnhancedProps {
    installations: Installation[];
    teams: InstallationTeam[];
    contracts: Contract[];
    serviceTickets: ServiceTicket[];
    unavailability: TeamUnavailability[];
    onRefresh: () => void;
    onEditInstallation?: (installation: Installation) => void;
}

type ViewMode = 'week' | 'month' | 'timeline' | 'map';

export const CalendarV3Enhanced: React.FC<CalendarV3EnhancedProps> = ({
    installations,
    teams,
    contracts,
    serviceTickets,
    unavailability,
    onRefresh,
    onEditInstallation
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [teamPanelOpen, setTeamPanelOpen] = useState(false); // Mobile optimized default
    const [activeDragItem, setActiveDragItem] = useState<any>(null);
    const [weatherData, setWeatherData] = useState<Map<string, LocationForecast>>(new Map());

    // Fetch weather when week or installations change
    useEffect(() => {
        const locations = installations
            .filter(i => i.client?.city)
            .map(i => ({
                id: i.id,
                city: i.client.city,
                coordinates: i.client.coordinates,
            }));
        if (locations.length === 0) return;

        let cancelled = false;
        getWeatherForInstallations(locations)
            .then(data => { if (!cancelled) setWeatherData(data); })
            .catch(err => console.error('Weather fetch error:', err));
        return () => { cancelled = true; };
    }, [currentDate, installations.length]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current) {
            setActiveDragItem(event.active.data.current);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const dragData = active.data.current;
        const dropData = over.data.current;

        if (!dragData || !dropData) return;

        const { type: itemType, itemId } = dragData;
        const { date: targetDate, teamId: targetTeamId } = dropData;

        const toastId = toast.loading('Planowanie...');

        try {
            if (itemType === 'installation') {
                // Move existing installation
                await InstallationService.updateInstallation(itemId, {
                    scheduledDate: targetDate,
                    teamId: targetTeamId,
                    status: 'scheduled'
                });
                toast.success('Montaż przeniesiony', { id: toastId });
            } else if (itemType === 'contract') {
                // Create installation from contract
                await InstallationService.createInstallationFromContract(
                    itemId,
                    targetDate,
                    targetTeamId
                );
                toast.success('Montaż zaplanowany', { id: toastId });
            } else if (itemType === 'service') {
                // Create installation from service ticket
                await InstallationService.createInstallationFromServiceTicket(
                    itemId,
                    targetDate,
                    targetTeamId
                );
                toast.success('Serwis zaplanowany', { id: toastId });
            }

            onRefresh();
        } catch (error) {
            console.error('Error handling drop:', error);
            toast.error('Błąd podczas planowania', { id: toastId });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
                {/* Header */}
                <CalendarHeader
                    currentDate={currentDate}
                    viewMode={viewMode}
                    onDateChange={setCurrentDate}
                    onViewModeChange={setViewMode}
                    onRefresh={onRefresh}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    onToggleTeamPanel={() => setTeamPanelOpen(!teamPanelOpen)}
                    sidebarOpen={sidebarOpen}
                    teamPanelOpen={teamPanelOpen}
                />

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Smart Sidebar */}
                    {/* Mobile: Absolute Overlay, Desktop: Static Flex Item */}
                    <div
                        className={`
                            fixed inset-y-0 left-0 z-30 w-80 md:w-64 lg:w-72 xl:w-80 bg-white transform transition-transform duration-300 shadow-xl
                            md:relative md:transform-none md:shadow-none md:z-auto
                            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
                        `}
                    >
                        <SmartSidebar
                            contracts={contracts}
                            serviceTickets={serviceTickets}
                            pendingInstallations={installations.filter(i => !i.scheduledDate)}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </div>

                    {/* Mobile Backdrop for Sidebar */}
                    {sidebarOpen && (
                        <div
                            className="absolute inset-0 z-20 bg-black/50 md:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Calendar Grid */}
                    <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                        <CalendarGridEnhanced
                            currentDate={currentDate}
                            viewMode={viewMode}
                            installations={installations}
                            teams={teams}
                            unavailability={unavailability}
                            onRefresh={onRefresh}
                            onEditInstallation={onEditInstallation}
                            weatherData={weatherData}
                        />
                    </div>

                    {/* Team Panel */}
                    {teamPanelOpen && (
                        <div className="hidden lg:block h-full border-l border-slate-200 bg-white shadow-lg z-10 w-80 flex-shrink-0">
                            <TeamPanelEnhanced
                                teams={teams}
                                installations={installations}
                                unavailability={unavailability}
                                currentDate={currentDate}
                                onClose={() => setTeamPanelOpen(false)}
                            />
                        </div>
                    )}
                </div>

                <DragOverlay>
                    {activeDragItem ? (
                        <div className="bg-white p-3 rounded-lg shadow-xl border-2 border-accent/50 w-64 backdrop-blur-sm bg-white/90 cursor-grabbing pointer-events-none">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-bold rounded uppercase">
                                    {activeDragItem.type === 'contract' ? 'Umowa' : activeDragItem.type === 'service' ? 'Serwis' : 'Montaż'}
                                </span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm truncate">
                                {activeDragItem.title || 'Element'}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                                {activeDragItem.subtitle || 'Przeciąganie...'}
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};
