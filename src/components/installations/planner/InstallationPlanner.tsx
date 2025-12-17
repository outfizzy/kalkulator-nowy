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
                await Promise.all(result.updates.map(u => {
                    const original = installations.find(i => i.id === u.id);
                    const oldNotes = original?.notes || '';
                    const newNote = `[Auto: ${u.reason}]`;

                    return DatabaseService.updateInstallation(u.id, {
                        scheduledDate: u.scheduledDate,
                        teamId: u.teamId,
                        status: 'scheduled',
                        notes: oldNotes ? `${oldNotes}\n${newNote}` : newNote
                    });
                }));

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

    // Layout State
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) {
        return <div className="h-full flex items-center justify-center text-slate-500">Ładowanie planera...</div>;
    }

    return (
        <div className="flex h-[85vh] overflow-hidden bg-slate-100 relative">
            {/* Mobile Overlay */}
            {isSidebarOpen && window.innerWidth <= 768 && (
                <div
                    className="absolute inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                absolute md:relative z-30 h-full bg-white transition-all duration-300 ease-in-out shadow-xl md:shadow-none
                ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}
            `}>
                <div className="h-full w-80">
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
                </div>
            </div>

            {/* Toggle Button (Mobile/Desktop) */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`
                    absolute bottom-6 left-6 z-40 bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-all
                    md:hidden
                `}
            >
                {isSidebarOpen ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                )}
            </button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 transition-all">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden md:flex p-2 hover:bg-slate-100 rounded text-slate-600"
                            title={isSidebarOpen ? "Zwiń panel" : "Rozwiń panel"}
                        >
                            <svg className={`w-5 h-5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        </button>
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
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <TeamTimeline
                        teams={teams}
                        dates={dates}
                        installations={installations}
                        onDrop={handleDrop}
                        onEdit={(inst) => setEditingInstallation(inst)}
                    />
                </div>
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
