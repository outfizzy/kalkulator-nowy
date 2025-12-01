import React, { useEffect, useState } from 'react';
import { getTeams } from '../../utils/storage';
import { geocodeAddress } from '../../utils/geocoding';
import { InstallationMap } from './InstallationMap';
import { InstallationDetailsModal } from './InstallationDetailsModal';
import { OfferSearchModal } from './OfferSearchModal';
import { InstallationCalendar } from './InstallationCalendar';
import { ContractBulkSelectionPanel } from './ContractBulkSelectionPanel';
import { GroupingControls } from './GroupingControls';
import { groupInstallations, sortInstallations, getStatusLabel, getStatusColor, getTeamAvailability } from '../../utils/installationUtils';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';

export const InstallationDashboard: React.FC = () => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [view, setView] = useState<'list' | 'calendar' | 'contracts'>('list');

    // Modal State
    const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    // Filters & Grouping
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [groupBy, setGroupBy] = useState<'none' | 'region' | 'status' | 'team'>('none');
    const [sortBy, setSortBy] = useState<'date' | 'city' | 'status'>('city');
    const [assignDate, setAssignDate] = useState('');

    const [installers, setInstallers] = useState<import('../../types').User[]>([]);

    const loadData = async () => {
        try {
            const [dbInstallations, localTeams, dbInstallers] = await Promise.all([
                DatabaseService.getInstallations(),
                Promise.resolve(getTeams()),
                DatabaseService.getInstallers()
            ]);
            setInstallations(dbInstallations);
            setTeams(localTeams);
            setInstallers(dbInstallers);
        } catch (error) {
            console.error('Error loading installations:', error);
            toast.error('Błąd ładowania montaży');
        }
    };

    useEffect(() => {
        const init = async () => {
            await loadData();
        };
        void init();
    }, []);

    const handleGeocodeMissing = async () => {
        setIsGeocoding(true);
        const missingCoords = installations.filter(i => !i.client.coordinates);
        let updatedCount = 0;

        for (const inst of missingCoords) {
            // Rate limit: 1 request per second
            await new Promise(resolve => setTimeout(resolve, 1000));

            const coords = await geocodeAddress(inst.client.address, inst.client.city);
            if (coords) {
                const updated: Installation = {
                    ...inst,
                    client: { ...inst.client, coordinates: coords }
                };
                await DatabaseService.updateInstallation(inst.id, updated);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            toast.success(`Zaktualizowano współrzędne dla ${updatedCount} montaży`);
            loadData();
        } else {
            toast('Nie udało się znaleźć nowych współrzędnych');
        }
        setIsGeocoding(false);
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAssignTeam = async (teamId: string, date: string) => {
        if (selectedIds.length === 0 || !date) return;

        // Check if teamId is actually an installer ID (user ID)
        const isInstaller = installers.some(u => u.id === teamId);

        for (const id of selectedIds) {
            const inst = installations.find(i => i.id === id);
            if (inst) {
                // Update basic info
                await DatabaseService.updateInstallation(inst.id, {
                    teamId: isInstaller ? undefined : teamId, // Clear teamId if assigning to specific installer, or keep it? 
                    // Let's say teamId is for "Teams" and we also have assignments.
                    // For now, if it's an installer, we assign via assignInstaller.
                    scheduledDate: date,
                    status: 'scheduled'
                });

                if (isInstaller) {
                    await DatabaseService.assignInstaller(inst.id, teamId);
                }
            }
        }

        toast.success(`Przypisano ${selectedIds.length} montaży`);
        setSelectedIds([]);
        await loadData();
    };

    const handleEdit = (installation: Installation) => {
        setEditingInstallation(installation);
        setIsModalOpen(true);
    };

    const handleModalUpdate = () => {
        void loadData();
    };

    const handleDragDrop = async (installationId: string, newDate: string, teamId: string) => {
        try {
            const installation = installations.find(i => i.id === installationId);
            if (!installation) return;

            // Optimistic update
            // We can't easily update the state directly because it's fetched from DB
            // But we can show a toast

            await DatabaseService.updateInstallation(installationId, {
                scheduledDate: newDate,
                teamId,
                status: 'scheduled'
            });

            toast.success('Przeniesiono montaż');
            loadData(); // Refresh data
        } catch (error) {
            console.error('Error moving installation:', error);
            toast.error('Błąd podczas przenoszenia montażu');
        }
    };

    const filteredInstallations = installations.filter(inst => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'unassigned') return !inst.teamId;
        return inst.status === filterStatus;
    });

    const sortedInstallations = sortInstallations(filteredInstallations, sortBy);
    const groupedInstallations = groupInstallations(sortedInstallations, groupBy, teams);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Planowanie Montaży</h1>
                    <p className="text-slate-500 text-sm">Zarządzaj logistyką i ekipami montażowymi</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mr-2">
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Mapa i Lista
                        </button>
                        <button
                            onClick={() => setView('calendar')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Kalendarz
                        </button>
                        <button
                            onClick={() => setView('contracts')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'contracts' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Umowy
                        </button>
                    </div>

                    <button
                        onClick={() => setIsSearchModalOpen(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Dodaj z Oferty
                    </button>

                    <button
                        onClick={handleGeocodeMissing}
                        disabled={isGeocoding}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                        {isGeocoding ? 'Pobieranie współrzędnych...' : 'Pobierz Współrzędne GPS'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {view === 'list' ? (
                    <>
                        {/* Left Panel: List */}
                        <div className="w-1/3 bg-white rounded-xl border border-slate-200 flex flex-col">
                            <div className="p-4 border-b border-slate-100 space-y-3">
                                <GroupingControls
                                    groupBy={groupBy}
                                    onGroupByChange={setGroupBy}
                                    sortBy={sortBy}
                                    onSortByChange={setSortBy}
                                />

                                <div className="flex gap-2">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    >
                                        <option value="all">Wszystkie</option>
                                        <option value="pending">Oczekujące</option>
                                        <option value="unassigned">Nieprzypisane</option>
                                        <option value="scheduled">Zaplanowane</option>
                                        <option value="completed">Zakończone</option>
                                    </select>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Zaznaczono: {selectedIds.length}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {Object.entries(groupedInstallations).map(([groupName, groupItems]) => (
                                    <div key={groupName} className="mb-4">
                                        {groupBy !== 'none' && (
                                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg mb-2 sticky top-0 z-10 border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={groupItems.every(i => selectedIds.includes(i.id))}
                                                        onChange={(e) => {
                                                            const ids = groupItems.map(i => i.id);
                                                            if (e.target.checked) {
                                                                setSelectedIds(prev => [...new Set([...prev, ...ids])]);
                                                            } else {
                                                                setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                                                            }
                                                        }}
                                                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                                                    />
                                                    <h3 className="font-bold text-slate-700 text-sm">{groupName}</h3>
                                                </div>
                                                <span className="text-xs font-medium bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                                    {groupItems.length}
                                                </span>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            {groupItems.map(inst => (
                                                <div
                                                    key={inst.id}
                                                    onClick={() => handleSelect(inst.id)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedIds.includes(inst.id)
                                                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-slate-800">{inst.client.city}</h3>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(inst.status)}`}>
                                                                {getStatusLabel(inst.status)}
                                                            </span>
                                                        </div>
                                                        {inst.teamId && (
                                                            <span
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: teams.find(t => t.id === inst.teamId)?.color }}
                                                                title={teams.find(t => t.id === inst.teamId)?.name}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end mt-2">
                                                        <div>
                                                            <p className="text-sm text-slate-600">{inst.client.firstName} {inst.client.lastName}</p>
                                                            <p className="text-xs text-slate-400 mt-1">{inst.productSummary}</p>
                                                            {inst.scheduledDate && (
                                                                <p className="text-xs font-medium text-blue-600 mt-1">
                                                                    📅 {new Date(inst.scheduledDate).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEdit(inst);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-accent transition-colors"
                                                            title="Edytuj szczegóły"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    {!inst.client.coordinates && (
                                                        <div className="mt-2 flex items-center gap-1 text-red-500">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold">Brak GPS</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {filteredInstallations.length === 0 && (
                                    <div className="text-center p-8 text-slate-400 text-sm">
                                        Brak montaży spełniających kryteria.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel: Map */}
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-1">
                            <InstallationMap
                                installations={filteredInstallations}
                                teams={teams}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onEdit={handleEdit}
                            />
                        </div>
                    </>
                ) : view === 'calendar' ? (
                    <div className="w-full h-full">
                        <InstallationCalendar
                            installations={filteredInstallations}
                            teams={teams}
                            onEdit={handleEdit}
                            onDragDrop={handleDragDrop}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full">
                        <ContractBulkSelectionPanel onInstallationsCreated={loadData} />
                    </div>
                )}
            </div>

            {/* Bottom Panel: Assignment */}
            {selectedIds.length > 0 && (
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-slide-up sticky bottom-4 z-20 mx-4">
                    <div className="flex items-center gap-4">
                        <span className="font-bold">Wybrano: {selectedIds.length}</span>
                        <div className="h-8 w-px bg-slate-600" />
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-300">Data:</label>
                            <input
                                type="date"
                                value={assignDate}
                                onChange={(e) => setAssignDate(e.target.value)}
                                className="bg-slate-700 border-none rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-accent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-300">Ekipa:</label>
                            <select
                                id="assign-team"
                                className="bg-slate-700 border-none rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-accent min-w-[200px]"
                            >
                                <option value="">Wybierz ekipę...</option>
                                <optgroup label="Ekipy">
                                    {teams.map(t => {
                                        const availability = assignDate ? getTeamAvailability(t.id, assignDate, installations) : null;
                                        let label = t.name;
                                        if (availability) {
                                            label += ` (${availability.count} montaży)`;
                                            if (availability.status === 'busy') label += ' ⚠️';
                                        }
                                        return (
                                            <option key={t.id} value={t.id}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </optgroup>
                                <optgroup label="Monterzy">
                                    {installers.map(i => (
                                        <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const team = (document.getElementById('assign-team') as HTMLSelectElement).value;
                            if (!assignDate) {
                                toast.error('Wybierz datę');
                                return;
                            }
                            if (!team) {
                                toast.error('Wybierz ekipę');
                                return;
                            }
                            void handleAssignTeam(team, assignDate);
                        }}
                        className="bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg font-bold transition-colors"
                    >
                        Przypisz
                    </button>
                </div>
            )}
            {/* Details Modal */}
            {editingInstallation && (
                <InstallationDetailsModal
                    installation={editingInstallation}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={handleModalUpdate}
                    onSave={async (updated) => {
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                />
            )}

            <OfferSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onInstallationCreated={loadData}
            />
        </div>
    );
};
