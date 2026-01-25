import React, { useState, useEffect } from 'react';
import { UnifiedBacklogSidebar } from './UnifiedBacklogSidebar';
import { InstallationCalendar } from './InstallationCalendar';
import { InstallationTimeline } from './InstallationTimeline';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { InstallationService } from '../../services/database/installation.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { UserService } from '../../services/database/user.service';
import type { Installation, Contract, ServiceTicket, InstallationTeam, TeamUnavailability, User } from '../../types';
import toast from 'react-hot-toast';

interface UnifiedInstallationCalendarProps {
    onEdit?: (installation: Installation) => void;
    onCreateManual?: () => void;
}

export const UnifiedInstallationCalendar: React.FC<UnifiedInstallationCalendarProps> = ({ onEdit, onCreateManual }) => {
    // State
    const [backlog, setBacklog] = useState<{
        contracts: Contract[];
        serviceTickets: ServiceTicket[];
        pendingInstallations: Installation[];
    }>({ contracts: [], serviceTickets: [], pendingInstallations: [] });

    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [unavailability, setUnavailability] = useState<TeamUnavailability[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [salesReps, setSalesReps] = useState<User[]>([]);

    // Filters
    const [showCompleted, setShowCompleted] = useState(false);
    const [selectedSalesRep, setSelectedSalesRep] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'timeline'>('weekly');

    // Fetch Data
    const loadData = async () => {
        try {
            setIsLoading(true);

            // Execute in parallel but handle errors individually
            const [backlogRes, installationsRes, teamsRes] = await Promise.all([
                InstallationService.getBacklogItems().catch(e => {
                    console.error('Backlog load error:', e);
                    toast.error('Błąd ładowania listy do zaplanowania: ' + (e.message || 'Nieznany błąd'));
                    return { contracts: [], serviceTickets: [], pendingInstallations: [] };
                }),
                InstallationService.getInstallations().catch(e => {
                    console.error('Installations load error:', e);
                    toast.error('Błąd ładowania montaży: ' + (e.message || 'Nieznany błąd'));
                    return [];
                }),
                InstallationTeamService.getTeams().catch(e => {
                    console.error('Teams load error:', e);
                    toast.error('Błąd ładowania ekip: ' + (e.message || 'Nieznany błąd'));
                    return [];
                })
            ]);

            setBacklog(backlogRes);
            setInstallations(installationsRes);
            setTeams(teamsRes);

        } catch (error) {
            console.error('Error loading calendar data:', error);
            toast.error('Błąd ogólny kalendarza');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Load sales reps for filter
        UserService.getSalesReps().then(setSalesReps).catch(console.error);
    }, []);

    // Filter installations
    const filteredInstallations = installations.filter(inst => {
        // Status filter
        if (!showCompleted && inst.status === 'completed') return false;
        if (selectedStatus && inst.status !== selectedStatus) return false;

        // Sales rep filter (check if installation has salesRepId from contract)
        if (selectedSalesRep && inst.salesRepId !== selectedSalesRep) return false;

        return true;
    });

    // Drag & Drop Handler
    const handleDragStart = (e: React.DragEvent, id: string, type: 'contract' | 'service' | 'installation') => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleUnifiedDrop = async (id: string, date: string, teamId: string, type: 'installation' | 'service' | 'contract') => {
        const toastId = toast.loading('Planowanie...');
        try {
            if (type === 'installation') {
                await InstallationService.updateInstallation(id, {
                    scheduledDate: date,
                    teamId,
                    status: 'scheduled'
                });
            } else if (type === 'contract') {
                // Auto-create installation from contract
                const created = await InstallationService.bulkCreateInstallations([id]);
                if (created.length > 0) {
                    await InstallationService.updateInstallation(created[0].id, {
                        scheduledDate: date,
                        teamId,
                        status: 'scheduled'
                    });
                }
            } else if (type === 'service') {
                // Handle Service Ticket
                const ticket = backlog.serviceTickets.find(t => t.id === id);
                if (ticket) {
                    // Create manual installation linked to service
                    // Note: Ideally we'd have a specific method for this, abusing createManual for now or we need to add source fields to createManual
                    // We'll Create Manual and then Update source fields to be clean if createManual doesn't support it yet
                    // Actually I added createManualInstallation but it sets source_type='manual'.
                    // I should manually insert or update after creation.
                    // For now, let's just use createManualInstallation and treating it as manual task for the team
                    // linked to the ticket via description.
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
                        teamId,
                        scheduledDate: date,
                        expectedDuration: 1,
                        sourceType: 'service',
                        sourceId: ticket.id
                    });

                    // Update ticket status?
                    // await ServiceTicketService.updateStatus(id, 'scheduled');
                    // We assume InstallationService handles DB logic, here we just trigger.
                }
            }

            toast.success('Zaplanowano pomyślnie!', { id: toastId });
            await loadData(); // Refresh all
        } catch (error) {
            console.error('Drop error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
            toast.error(`Błąd planowania: ${errorMessage}`, { id: toastId });
        }
    };

    // Manual Creation from Sidebar
    const handleScheduleItem = async (id: string, type: 'contract' | 'service') => {
        try {
            if (type === 'contract') {
                const created = await InstallationService.bulkCreateInstallations([id]);
                if (created.length > 0) {
                    toast.success('Utworzono zlecenie montażu');
                    if (onEdit) onEdit(created[0]);
                }
            } else if (type === 'service') {
                const ticket = backlog.serviceTickets.find(t => t.id === id);
                if (ticket) {
                    const newInst = await InstallationService.createManualInstallation({
                        title: `Serwis: ${ticket.ticketNumber || 'Zgłoszenie'}`,
                        client: {
                            firstName: ticket.client?.firstName || 'Klient',
                            lastName: ticket.client?.lastName || 'Serwisowy',
                            city: ticket.client?.city || '',
                            address: ticket.client && 'address' in ticket.client ? (ticket.client.address as string) : '',
                            phone: ticket.client?.phone || ''
                        },
                        description: ticket.description,
                        teamId: ticket.assignedTeamId,
                        expectedDuration: 1,
                        sourceType: 'service',
                        sourceId: ticket.id
                    });
                    toast.success('Utworzono zlecenie serwisowe');
                    if (onEdit) onEdit(newInst);
                }
            }
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Błąd tworzenia zlecenia');
        }
    };

    const handleCreateManual = async () => {
        // If a parent handler is provided (e.g. for a full Modal), use it.
        if (onCreateManual) {
            onCreateManual();
            return;
        }

        // Fallback or legacy interactive creation
        // Simple prompt for now or open modal
        // For MVP/Verification, we'll auto-create a test task
        const title = prompt('Nazwa zadania ręcznego:');
        if (!title) return;

        try {
            await InstallationService.createManualInstallation({
                title,
                client: { firstName: '', lastName: 'Zadanie', city: '', address: '', phone: '' },
                description: 'Ręczne zadanie z kalendarza',
                scheduledDate: undefined // Goes to backlog
            });
            toast.success('Dodano do backlogu');
            loadData();
        } catch (e) {
            toast.error('Błąd tworzenia');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-2"></div>
                Ładowanie kalendarza...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-100">
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {isSidebarOpen && (
                    <div className="w-80 flex-shrink-0 transition-all border-r border-slate-200 bg-white">
                        <UnifiedBacklogSidebar
                            contracts={backlog.contracts}
                            serviceTickets={backlog.serviceTickets}
                            pendingInstallations={backlog.pendingInstallations}
                            onDragStart={handleDragStart}
                            onSchedule={handleScheduleItem}
                            onCreateManual={handleCreateManual}
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-100">

                    {/* Header Toolbar */}
                    <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm z-10 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            {/* Toggler */}
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                                title={isSidebarOpen ? "Ukryj panel" : "Pokaż panel"}
                            >
                                <svg className={`w-5 h-5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">
                                {viewMode === 'month' ? 'Kalendarz Montaży' : 'Oś Czasu (Gantt)'}
                            </h2>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Show Completed */}
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                                <input
                                    type="checkbox"
                                    checked={showCompleted}
                                    onChange={(e) => setShowCompleted(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>Pokaż zakończone</span>
                            </label>

                            {/* Sales Rep Filter */}
                            <select
                                value={selectedSalesRep}
                                onChange={(e) => setSelectedSalesRep(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Wszyscy handlowcy</option>
                                {salesReps.map(rep => (
                                    <option key={rep.id} value={rep.id}>
                                        {rep.firstName} {rep.lastName}
                                    </option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Wszystkie statusy</option>
                                <option value="pending">Oczekujące</option>
                                <option value="scheduled">Zaplanowane</option>
                                <option value="confirmed">Potwierdzone</option>
                                <option value="in_progress">W trakcie</option>
                                <option value="completed">Zakończone</option>
                                <option value="cancelled">Anulowane</option>
                            </select>

                            {/* Legend */}
                            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-3">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Zaplan.</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Potwierdz.</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Zakończ.</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Serwis</span>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'weekly'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span>📋</span> Tydzień
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'monthly'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span>📅</span> Miesiąc
                            </button>
                            <button
                                onClick={() => setViewMode('timeline')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'timeline'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span>📊</span> Gantt
                            </button>
                        </div>
                    </div>

                    {/* Calendar / Timeline Area */}
                    <div className="flex-1 overflow-hidden p-4">
                        {viewMode === 'weekly' && (
                            <InstallationCalendar
                                installations={filteredInstallations}
                                serviceTickets={[]}
                                teams={teams}
                                onEdit={(inst) => {
                                    if (onEdit) onEdit(inst);
                                }}
                                onDragDrop={handleUnifiedDrop}
                                unavailability={unavailability}
                            />
                        )}
                        {viewMode === 'monthly' && (
                            <MonthlyCalendarView
                                installations={filteredInstallations}
                                teams={teams}
                                onEdit={(inst) => {
                                    if (onEdit) onEdit(inst);
                                }}
                                onDragDrop={handleUnifiedDrop}
                            />
                        )}
                        {viewMode === 'timeline' && (
                            <InstallationTimeline
                                installations={filteredInstallations}
                                serviceTickets={[]}
                                teams={teams}
                                onEdit={(inst) => {
                                    if (onEdit) onEdit(inst);
                                }}
                                onDragDrop={handleUnifiedDrop}
                                unavailability={unavailability}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
