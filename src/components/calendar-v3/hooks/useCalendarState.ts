import { useState, useEffect, useCallback } from 'react';
import { InstallationService } from '../../../services/database/installation.service';
import { InstallationTeamService } from '../../../services/database/installation-team.service';
import type { Installation, InstallationTeam, Contract, ServiceTicket, TeamUnavailability } from '../../../types';
import toast from 'react-hot-toast';

type ViewMode = 'day' | 'week' | 'month' | 'timeline' | 'map';

export const useCalendarState = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [unavailability, setUnavailability] = useState<TeamUnavailability[]>([]);
    const [backlog, setBacklog] = useState<{
        contracts: Contract[];
        serviceTickets: ServiceTicket[];
        pendingInstallations: Installation[];
    }>({ contracts: [], serviceTickets: [], pendingInstallations: [] });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

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
            setTeams(teamsRes.filter(t => t.isActive));
            setUnavailability(unavailRes);
        } catch (error) {
            console.error('Error loading calendar data:', error);
            toast.error('Błąd ładowania kalendarza');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Drop handler: move/create installation on calendar
    const handleDrop = useCallback(async (
        itemId: string,
        itemType: 'contract' | 'service' | 'installation',
        targetDate: string,
        targetTeamId: string
    ) => {
        const toastId = toast.loading('Planowanie...');
        try {
            if (itemType === 'installation') {
                await InstallationService.updateInstallation(itemId, {
                    scheduledDate: targetDate,
                    teamId: targetTeamId,
                    status: 'scheduled'
                });
            } else if (itemType === 'contract') {
                const created = await InstallationService.bulkCreateInstallations([itemId]);
                if (created.length > 0) {
                    await InstallationService.updateInstallation(created[0].id, {
                        scheduledDate: targetDate,
                        teamId: targetTeamId,
                        status: 'scheduled'
                    });
                }
            } else if (itemType === 'service') {
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
    }, [backlog.serviceTickets, loadData]);

    // Quick schedule from sidebar
    const handleScheduleFromSidebar = useCallback(async (id: string, type: 'contract' | 'service') => {
        try {
            if (type === 'contract') {
                const created = await InstallationService.bulkCreateInstallations([id]);
                if (created.length > 0) {
                    toast.success('Utworzono zlecenie montażu');
                }
            }
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Błąd tworzenia zlecenia');
        }
    }, [loadData]);

    return {
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
        refreshData: loadData
    };
};
