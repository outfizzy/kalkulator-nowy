import { useState, useEffect, useCallback } from 'react';
import { InstallationService } from '../../../services/database/installation.service';
import { InstallationTeamService } from '../../../services/database/installation-team.service';
import { DatabaseService } from '../../../services/database';
import type { Installation, InstallationTeam, Contract } from '../../../types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

type ViewMode = 'day' | 'week' | 'month';

export const useCalendarState = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);

    const getDateRange = useCallback(() => {
        if (viewMode === 'day') {
            return {
                start: startOfDay(currentDate),
                end: endOfDay(currentDate)
            };
        } else if (viewMode === 'week') {
            return {
                start: startOfWeek(currentDate, { weekStartsOn: 1 }),
                end: endOfWeek(currentDate, { weekStartsOn: 1 })
            };
        } else {
            return {
                start: startOfMonth(currentDate),
                end: endOfMonth(currentDate)
            };
        }
    }, [currentDate, viewMode]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange();

            const [installationsData, teamsData, contractsData] = await Promise.all([
                InstallationService.getInstallationsByDateRange(
                    start.toISOString().split('T')[0],
                    end.toISOString().split('T')[0]
                ),
                InstallationTeamService.getTeams(),
                DatabaseService.getContracts() // Get all contracts for backlog
            ]);

            setInstallations(installationsData);
            setTeams(teamsData.filter(t => t.isActive));

            // Filter contracts that don't have installations yet
            const scheduledContractIds = new Set(
                installationsData
                    .filter(i => i.contractNumber)
                    .map(i => i.contractNumber)
            );

            const unscheduledContracts = contractsData.filter(
                c => c.status === 'signed' && !scheduledContractIds.has(c.contractNumber)
            );

            setContracts(unscheduledContracts);
        } catch (error) {
            console.error('Error loading calendar data:', error);
        } finally {
            setLoading(false);
        }
    }, [getDateRange]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refreshData = useCallback(() => {
        loadData();
    }, [loadData]);

    return {
        currentDate,
        viewMode,
        installations,
        contracts,
        teams,
        loading,
        setCurrentDate,
        setViewMode,
        refreshData
    };
};
