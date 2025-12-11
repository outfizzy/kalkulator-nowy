import React, { useState, useEffect } from 'react';
import { BacklogSidebar } from './BacklogSidebar';
import { TeamTimeline } from './TeamTimeline';
import { DatabaseService } from '../../../services/database';
import { SchedulerService } from '../../../services/SchedulerService';
import { InstallationDetailsModal } from '../InstallationDetailsModal';
import type { Installation, InstallationTeam, InstallationStatus } from '../../../types';
import toast from 'react-hot-toast';

export const InstallationPlanner: React.FC = () => {
    // Data State
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [startDate, setStartDate] = useState(new Date());
    const [daysToShow] = useState(14); // 2 weeks view by default

    // Modal State
    const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);

    // Derived State
    const dates = React.useMemo(() => {
        return Array.from({ length: daysToShow }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            return d;
        });
    }, [startDate, daysToShow]);

    // Load Data
    const loadData = async () => {
        setLoading(true);
        try {
            const [instData, teamsData] = await Promise.all([
                DatabaseService.getInstallations(),
                DatabaseService.getTeams()
            ]);
            setInstallations(instData);
            setTeams(teamsData);
        } catch (error) {
            console.error('Error loading planner data:', error);
            toast.error('Błąd ładowania danych');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (date: Date, teamId: string, installationId: string) => {
        try {
            const dateStr = date.toISOString().split('T')[0];

            // Find installation to update status if needed
            const inst = installations.find(i => i.id === installationId);
            const status = inst?.status === 'pending' ? 'scheduled' : inst?.status || 'scheduled';

            // Optimistic update
            const updated = installations.map(i =>
                i.id === installationId
                    ? { ...i, scheduledDate: dateStr, teamId, status: status as InstallationStatus }
                    : i
            );
            setInstallations(updated);

            await DatabaseService.updateInstallation(installationId, {
                scheduledDate: dateStr,
                teamId,
                status: status as InstallationStatus
            });

            toast.success('Zaplanowano montaż');
        } catch (error) {
            console.error('Drop error:', error);
            toast.error('Błąd zapisu');
            loadData(); // Revert
        }
    };

    const handleAutoSchedule = async (selectedIds: string[]) => {
        const toastId = toast.loading('Planowanie automatyczne...');
        try {
            const toSchedule = installations.filter(i => selectedIds.includes(i.id));
            const existing = installations.filter(i => !selectedIds.includes(i.id) && i.status === 'scheduled');

            const result = SchedulerService.scheduleBatch(
                toSchedule,
                existing,
                teams,
                startDate, // Start looking from current view start
                30 // Look 30 days ahead
            );

            if (result.updates.length > 0) {
                // Bulk update (simulated for now, ideally one big query)
                await Promise.all(result.updates.map(u =>
                    DatabaseService.updateInstallation(u.id, {
                        scheduledDate: u.scheduledDate,
                        teamId: u.teamId,
                        status: 'scheduled'
                    })
                ));

                await loadData();
                toast.success(`Zaplanowano ${result.updates.length} zleceń`, { id: toastId });

                if (result.failedIds.length > 0) {
                    toast.error(`Nie udało się zaplanować ${result.failedIds.length} zleceń (brak terminów/części)`, { duration: 5000 });
                }
            } else {
                toast.error('Nie znaleziono terminów dla wybranych zleceń', { id: toastId });
            }

        } catch (error) {
            console.error('Auto schedule error:', error);
            toast.error('Błąd automatu', { id: toastId });
        }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center text-slate-500">Ładowanie planera...</div>;
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
            {/* Sidebar */}
            <BacklogSidebar
                installations={installations.filter(i =>
                    !i.scheduledDate ||
                    i.status === 'pending' ||
                    i.status === 'verification'
                )}
                onDragStart={handleDragStart}
                onAutoSchedule={handleAutoSchedule}
                onItemClick={(inst) => setEditingInstallation(inst)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-slate-800">Plan Montaży</h2>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                            <button
                                onClick={() => {
                                    const d = new Date(startDate);
                                    d.setDate(d.getDate() - 7);
                                    setStartDate(d);
                                }}
                                className="p-1 hover:bg-white rounded shadow-sm text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center select-none">
                                {startDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                                {' - '}
                                {new Date(startDate.getTime() + (daysToShow - 1) * 86400000).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                            </span>
                            <button
                                onClick={() => {
                                    const d = new Date(startDate);
                                    d.setDate(d.getDate() + 7);
                                    setStartDate(d);
                                }}
                                className="p-1 hover:bg-white rounded shadow-sm text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => setStartDate(new Date())}
                            className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded"
                        >
                            Dzisiaj
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Legend */}
                        <div className="flex gap-3 text-xs text-slate-500 mr-4">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Zaplanowane
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                Wstępne
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Grid */}
                <TeamTimeline
                    teams={teams}
                    dates={dates}
                    installations={installations}
                    onDrop={handleDrop}
                    onEdit={(inst) => setEditingInstallation(inst)}
                />
            </div>

            {/* Edit Modal */}
            {editingInstallation && (
                <InstallationDetailsModal
                    installation={editingInstallation}
                    isOpen={true}
                    onClose={() => setEditingInstallation(null)}
                    onUpdate={() => {
                        loadData();
                        setEditingInstallation(null);
                    }}
                    onSave={async (updated) => {
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                />
            )}
        </div>
    );
};
