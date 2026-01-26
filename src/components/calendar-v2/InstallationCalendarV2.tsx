import React, { useState, useEffect, useCallback } from 'react';
import { CalendarSidebar } from './CalendarSidebar';
import { CalendarGrid } from './CalendarGrid';
import { CalendarMap } from './CalendarMap';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarTimeline } from './CalendarTimeline';
import { InstallationService } from '../../services/database/installation.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import type { Installation, Contract, ServiceTicket, InstallationTeam, TeamUnavailability } from '../../types';
import toast from 'react-hot-toast';

// ============================================================================
// INSTALLATION CALENDAR V2 - Main Component
// For Polendach24 internal use (admin panel)
// ============================================================================

interface CalendarV2Props {
    onEditInstallation?: (installation: Installation) => void;
}

type ViewMode = 'week' | 'month' | 'timeline' | 'map';

export const InstallationCalendarV2: React.FC<CalendarV2Props> = ({ onEditInstallation }) => {
    // === STATE ===
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Data
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [unavailability, setUnavailability] = useState<TeamUnavailability[]>([]);
    const [backlog, setBacklog] = useState<{
        contracts: Contract[];
        serviceTickets: ServiceTicket[];
        pendingInstallations: Installation[];
    }>({ contracts: [], serviceTickets: [], pendingInstallations: [] });

    // Calendar navigation
    const [currentDate, setCurrentDate] = useState(new Date());

    // === DATA LOADING ===
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);

            const [backlogRes, installationsRes, teamsRes, unavailRes] = await Promise.all([
                InstallationService.getBacklogItems().catch(e => {
                    console.error('Backlog load error:', e);
                    return { contracts: [], serviceTickets: [], pendingInstallations: [] };
                }),
                InstallationService.getInstallations().catch(e => {
                    console.error('Installations load error:', e);
                    return [];
                }),
                InstallationTeamService.getTeams().catch(e => {
                    console.error('Teams load error:', e);
                    return [];
                }),
                InstallationService.getAllTeamUnavailability().catch(e => {
                    console.error('Unavailability load error:', e);
                    return [];
                })
            ]);

            setBacklog(backlogRes);
            setInstallations(installationsRes);
            setTeams(teamsRes);
            setUnavailability(unavailRes);

        } catch (error) {
            console.error('Error loading calendar data:', error);
            toast.error('Błąd ładowania kalendarza');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // === HANDLERS ===
    const handleDrop = async (
        itemId: string,
        itemType: 'contract' | 'service' | 'installation',
        targetDate: string,
        targetTeamId: string
    ) => {
        const toastId = toast.loading('Planowanie...');
        try {
            if (itemType === 'installation') {
                // Move existing installation
                await InstallationService.updateInstallation(itemId, {
                    scheduledDate: targetDate,
                    teamId: targetTeamId,
                    status: 'scheduled'
                });
            } else if (itemType === 'contract') {
                // Create installation from contract
                const created = await InstallationService.bulkCreateInstallations([itemId]);
                if (created.length > 0) {
                    await InstallationService.updateInstallation(created[0].id, {
                        scheduledDate: targetDate,
                        teamId: targetTeamId,
                        status: 'scheduled'
                    });
                }
            } else if (itemType === 'service') {
                // Create installation from service ticket
                const ticket = backlog.serviceTickets.find(t => t.id === itemId);
                if (ticket) {
                    await InstallationService.createManualInstallation({
                        title: `Serwis: ${ticket.ticketNumber || 'Zgłoszenie'}`,
                        client: {
                            firstName: ticket.client?.firstName || 'Klient',
                            lastName: ticket.client?.lastName || 'Serwisowy',
                            city: ticket.client?.city || '',
                            address: ticket.client && 'address' in ticket.client ? (ticket.client.address as string) : '',
                            phone: ticket.client?.phone || ''
                        },
                        description: ticket.description,
                        teamId: targetTeamId,
                        scheduledDate: targetDate,
                        expectedDuration: 1,
                        sourceType: 'service',
                        sourceId: ticket.id
                    });
                }
            }

            toast.success('Zaplanowano!', { id: toastId });
            await loadData();
        } catch (error) {
            console.error('Drop error:', error);
            toast.error('Błąd planowania', { id: toastId });
        }
    };

    const handleScheduleFromSidebar = async (id: string, type: 'contract' | 'service') => {
        try {
            if (type === 'contract') {
                const created = await InstallationService.bulkCreateInstallations([id]);
                if (created.length > 0) {
                    toast.success('Utworzono zlecenie montażu');
                    if (onEditInstallation) onEditInstallation(created[0]);
                }
            }
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Błąd tworzenia zlecenia');
        }
    };

    // === NAVIGATION ===
    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // === RENDER ===
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-100">
            {/* Header Toolbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    {/* Sidebar Toggle */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        title={isSidebarOpen ? 'Ukryj panel' : 'Pokaż panel'}
                    >
                        <svg className={`w-5 h-5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h1 className="text-xl font-bold text-slate-800">📅 Kalendarz Montaży V2</h1>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                    <button onClick={goToPreviousWeek} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button onClick={goToToday} className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-medium text-sm hover:bg-indigo-200">
                        Dziś
                    </button>
                    <button onClick={goToNextWeek} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* View Mode Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {(['week', 'month', 'timeline', 'map'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === mode
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {mode === 'week' && '📋 Tydzień'}
                            {mode === 'month' && '📅 Miesiąc'}
                            {mode === 'timeline' && '📊 Gantt'}
                            {mode === 'map' && '🗺️ Mapa'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {isSidebarOpen && (
                    <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-hidden">
                        <CalendarSidebar
                            contracts={backlog.contracts}
                            serviceTickets={backlog.serviceTickets}
                            pendingInstallations={backlog.pendingInstallations}
                            onSchedule={handleScheduleFromSidebar}
                        />
                    </div>
                )}

                {/* Calendar / Map View */}
                <div className="flex-1 overflow-hidden p-4">
                    {viewMode === 'week' && (
                        <CalendarGrid
                            installations={installations}
                            teams={teams}
                            unavailability={unavailability}
                            currentDate={currentDate}
                            onDrop={handleDrop}
                            onEditInstallation={onEditInstallation}
                        />
                    )}
                    {viewMode === 'map' && (
                        <CalendarMap
                            installations={installations}
                            teams={teams}
                            onEditInstallation={onEditInstallation}
                        />
                    )}
                    {viewMode === 'month' && (
                        <CalendarMonthView
                            installations={installations}
                            teams={teams}
                            currentDate={currentDate}
                            onDrop={handleDrop}
                            onEditInstallation={onEditInstallation}
                        />
                    )}
                    {viewMode === 'timeline' && (
                        <CalendarTimeline
                            installations={installations}
                            teams={teams}
                            currentDate={currentDate}
                            onEditInstallation={onEditInstallation}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
