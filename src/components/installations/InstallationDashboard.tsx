import React, { useEffect, useState } from 'react';
import { geocodeAddress } from '../../utils/geocoding';
import { InstallationMap } from './InstallationMap';
import { InstallationDetailsModal } from './InstallationDetailsModal';
import { ManualInstallationModal } from './ManualInstallationModal';
import { UnifiedInstallationCalendar } from './UnifiedInstallationCalendar';
import { InstallationCalendarV2 } from '../calendar-v2';
import { CalendarV3Enhanced } from '../calendar-v3-enhanced';
import { InstallationReports } from './reports/InstallationReports';
import { ContractBulkSelectionPanel } from './ContractBulkSelectionPanel';
import { GroupingControls } from './GroupingControls';
import { groupInstallations, sortInstallations, getStatusLabel, getStatusColor, getTeamAvailability } from '../../utils/installationUtils';
import type { Installation, InstallationTeam, Contract, ServiceTicket, TeamUnavailability } from '../../types';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { InstallationService } from '../../services/database/installation.service';


export const InstallationDashboard: React.FC = () => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
    const [unavailability, setUnavailability] = useState<TeamUnavailability[]>([]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [view, setView] = useState<'list' | 'calendar' | 'calendarV2' | 'calendarV3' | 'contracts' | 'reports'>('calendarV3');

    // Modal State
    const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // Filters & Grouping
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [groupBy, setGroupBy] = useState<'none' | 'region' | 'status' | 'team'>('none');
    const [sortBy, setSortBy] = useState<'date' | 'city' | 'status'>('city');
    const [assignDate, setAssignDate] = useState('');
    const [assignTargetId, setAssignTargetId] = useState('');

    const [installers, setInstallers] = useState<import('../../types').User[]>([]);
    const [salesReps, setSalesReps] = useState<import('../../types').User[]>([]);

    const loadData = async () => {
        try {
            const results = await Promise.allSettled([
                DatabaseService.getInstallations(),
                DatabaseService.getTeams(),
                InstallationService.getAllTeamUnavailability(),
                DatabaseService.getInstallers(),
                DatabaseService.getSalesReps(),
                InstallationService.getBacklogItems()
            ]);

            const [
                installationsResult,
                teamsResult,
                unavailabilityResult,
                installersResult,
                salesRepsResult,
                backlogResult
            ] = results;

            // Log any errors
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const services = ['Installations', 'Teams', 'Unavailability', 'Installers', 'SalesReps', 'Backlog'];
                    console.error(`Error loading ${services[index]}:`, result.reason);
                }
            });

            if (installationsResult.status === 'fulfilled') setInstallations(installationsResult.value);
            if (teamsResult.status === 'fulfilled') setTeams(teamsResult.value);
            if (unavailabilityResult.status === 'fulfilled') setUnavailability(unavailabilityResult.value);
            if (installersResult.status === 'fulfilled') setInstallers(installersResult.value);
            if (salesRepsResult.status === 'fulfilled') setSalesReps(salesRepsResult.value);
            if (backlogResult.status === 'fulfilled') {
                setContracts(backlogResult.value.contracts);
                setServiceTickets(backlogResult.value.serviceTickets);
            }

            // If critical data failed (Installations or Teams), show error toast
            if (installationsResult.status === 'rejected' || teamsResult.status === 'rejected') {
                const failedServices = [];
                if (installationsResult.status === 'rejected') failedServices.push('Montaże');
                if (teamsResult.status === 'rejected') failedServices.push('Ekipy');

                // Show specific error in toast
                toast.error(`Błąd wczytywania: ${failedServices.join(', ')}`);
                console.error('Critical data failed to load');
            }
        } catch (error) {
            console.error('Error loading installations dashboard data:', error);
            toast.error('Wystąpił nieoczekiwany błąd podczas ładowania danych');
        }
    };

    useEffect(() => {
        const init = async () => {
            // Auto-complete past installations
            try {
                const count = await DatabaseService.checkAndAutoCompleteInstallations();
                if (count > 0) {
                    toast.success(`Przesunięto ${count} montaży do weryfikacji`);
                }
            } catch (e) {
                console.error('Auto-complete error:', e);
            }
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

        // Check if teamId is actually an installer ID or Sales Rep ID (user ID)
        const isInstaller = installers.some(u => u.id === teamId);
        const isSalesRep = salesReps.some(u => u.id === teamId);
        const isUser = isInstaller || isSalesRep;

        for (const id of selectedIds) {
            const inst = installations.find(i => i.id === id);
            if (inst) {
                // Update basic info
                await DatabaseService.updateInstallation(inst.id, {
                    teamId: isUser ? undefined : teamId, // Clear teamId if assigning to specific installer (legacy logic?)
                    // Actually, for Sales Reps we WANT to set teamId to their ID so they show up in the calendar lane.
                    // For Installers, we used assignInstaller.
                    // Let's refine:
                    // If it's a Team -> teamId = teamId
                    // If it's a Sales Rep -> teamId = teamId (Rep ID)
                    // If it's an Installer -> teamId = undefined (assigned via assignInstaller)

                    // Wait, if we set teamId to Rep ID, it works for calendar.
                    // If we set teamId to undefined for Installer, they WON'T show in calendar unless we have a lane for them?
                    // But currently Installers are NOT in the calendar lanes unless they are in a Team?
                    // No, wait. Installers are fetched separately.
                    // Let's check if Installers are added to 'teams' prop in original code?
                    // Original code passed 'teams' (InstallationTeam[]).
                    // It did NOT pass installers as teams.
                    // So Installers were NOT visible in the calendar lanes unless they were members of a team!

                    // So for Sales Reps, we MUST set teamId = Rep ID.
                    ...(isSalesRep ? { teamId: teamId } : {}),
                    ...(isInstaller ? { teamId: undefined } : {}), // Clear teamId for installers as they are assigned differently?
                    // Actually, if we want Sales Reps to see it, we must set teamId.

                    scheduledDate: date,
                    status: 'scheduled'
                });

                // If it's a Sales Rep, we just set teamId (above).
                // If it's an Installer, we use assignInstaller.
                if (isInstaller) {
                    await DatabaseService.assignInstaller(inst.id, teamId);
                }
                // If it's a Sales Rep, we might want to assign them too?
                // But we don't have assignSalesRep.
                // Using teamId field for Sales Rep ID is the hack we are using for Calendar visibility.
                if (isSalesRep) {
                    // Ensure teamId is set (done in updateInstallation)
                }
            }
        }

        toast.success(`Przypisano ${selectedIds.length} montaży`);
        setSelectedIds([]);
        setAssignTargetId('');
        await loadData();
    };

    const handleEdit = (installation: Installation) => {
        setEditingInstallation(installation);
        setIsModalOpen(true);
    };

    const handleModalUpdate = () => {
        void loadData();
    };



    const filteredInstallations = installations.filter(inst => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'unassigned') return !inst.teamId;
        if (filterStatus === 'ready_unscheduled') return inst.partsReady && !inst.scheduledDate;
        return inst.status === filterStatus;
    });

    const sortedInstallations = sortInstallations(filteredInstallations, sortBy);
    const groupedInstallations = groupInstallations(sortedInstallations, groupBy, teams);

    const stats = {
        total: installations.length,
        scheduled: installations.filter(i => i.status === 'scheduled').length,
        completed: installations.filter(i => i.status === 'completed').length,
        unassigned: installations.filter(i => !i.teamId).length
    };



    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                <div>
                    <h1 className="text-3xl font-bold text-white">Planowanie Montaży</h1>
                    <p className="text-slate-400 mt-1">Zarządzaj harmonogramem i zespołami montażowymi</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="px-4 py-2 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Dodaj Ręcznie
                    </button>

                    <a
                        href={`/reports/new?date=${new Date().toISOString().split('T')[0]}`}
                        className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generuj Raport
                    </a>

                    <button
                        onClick={handleGeocodeMissing}
                        disabled={isGeocoding}
                        className={`px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2 ${isGeocoding ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isGeocoding ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        )}
                        {isGeocoding ? 'Geokodowanie...' : 'Uzupełnij Mapę'}
                    </button>
                </div>
            </div>

            {/* View Tabs */}
            <div className="bg-slate-100 p-1 rounded-full flex gap-1 self-start">
                {[
                    { id: 'calendarV3', label: '🗓️ Kalendarz' },
                    { id: 'list', label: '📍 Mapa/Lista' },
                    { id: 'reports', label: '📈 Raporty' },
                    { id: 'contracts', label: '📝 Umowy' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id as typeof view)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${view === tab.id
                            ? 'bg-white shadow text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Wszystkie', value: stats.total, tone: 'slate' },
                    { label: 'Zaplanowane', value: stats.scheduled, tone: 'blue' },
                    { label: 'Zakończone', value: stats.completed, tone: 'green' },
                    { label: 'Nieprzypisane', value: stats.unassigned, tone: 'amber' }
                ].map(card => (
                    <div
                        key={card.label}
                        className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-1`}
                    >
                        <span className="text-xs uppercase tracking-wide text-slate-500">{card.label}</span>
                        <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                        <div className={`h-1 rounded-full ${card.tone === 'blue'
                            ? 'bg-blue-200'
                            : card.tone === 'green'
                                ? 'bg-green-200'
                                : card.tone === 'amber'
                                    ? 'bg-amber-200'
                                    : 'bg-slate-200'
                            }`} />
                    </div>
                ))}
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {view === 'calendarV3' ? (
                    <div className="w-full h-[calc(100vh-300px)] bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                        <CalendarV3Enhanced
                            installations={installations}
                            teams={teams}
                            contracts={contracts}
                            serviceTickets={serviceTickets}
                            unavailability={unavailability}
                            onRefresh={loadData}
                            onEditInstallation={handleEdit}
                        />
                    </div>
                ) : view === 'calendarV2' ? (
                    <div className="w-full h-[calc(100vh-300px)] bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                        <InstallationCalendarV2
                            onEditInstallation={handleEdit}
                        />
                    </div>
                ) : view === 'calendar' ? (
                    <div className="w-full h-full bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                        <UnifiedInstallationCalendar
                            onEdit={handleEdit}
                            onCreateManual={() => setIsManualModalOpen(true)}
                        />
                    </div>
                ) : view === 'list' ? (
                    <>
                        {/* Left Panel: List */}
                        <div className="w-full lg:w-1/3 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm">
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
                                        <option value="ready_unscheduled">Gotowe do zaplanowania</option>
                                        <option value="pending">Oczekujące</option>
                                        <option value="unassigned">Nieprzypisane</option>
                                        <option value="scheduled">Zaplanowane</option>
                                        <option value="verification">Do weryfikacji</option>
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
                                                                style={{ backgroundColor: teams.find(t => t.id === inst.teamId)?.color || (salesReps.find(r => r.id === inst.teamId) ? '#8b5cf6' : '#cbd5e1') }}
                                                                title={teams.find(t => t.id === inst.teamId)?.name || salesReps.find(r => r.id === inst.teamId)?.firstName}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end mt-2">
                                                        <div>
                                                            <p className="text-sm text-slate-600">{inst.client.firstName} {inst.client.lastName}</p>
                                                            <p className="text-xs text-slate-400 mt-1">{inst.productSummary}</p>
                                                            {inst.scheduledDate && (
                                                                <p className="text-xs font-medium text-blue-600 mt-1">
                                                                    📅 {new Date(inst.scheduledDate).toLocaleDateString('pl-PL', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    })}
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
                        <div className="hidden lg:block flex-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                            <InstallationMap
                                installations={filteredInstallations}
                                allInstallations={installations}
                                teams={teams}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onEdit={handleEdit}
                                previewRoute={assignDate && assignTargetId ? { date: assignDate, teamId: assignTargetId } : undefined}
                            />
                        </div>
                    </>
                ) : view === 'reports' ? (
                    <div className="w-full h-full overflow-y-auto bg-white rounded-xl shadow border border-slate-200 p-6">
                        <InstallationReports installations={installations} teams={teams} />
                    </div>
                ) : view === 'contracts' ? (
                    <div className="w-full h-full">
                        <ContractBulkSelectionPanel onInstallationsCreated={loadData} />
                    </div>
                ) : (
                    <div className="w-full h-full">
                        {/* Default or empty state if needed, or redirect */}
                        <div className="p-8 text-center text-slate-400">Wybierz widok</div>
                    </div>
                )}
            </div>

            {/* Bottom Panel: Assignment */}
            {
                selectedIds.length > 0 && (
                    <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-slide-up sticky bottom-4 z-20 mx-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-bold">Wybrano: {selectedIds.length}</span>
                            <div className="hidden md:block h-8 w-px bg-slate-600" />
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
                                <label className="text-sm text-slate-300">Ekipa/Monter:</label>
                                <select
                                    value={assignTargetId}
                                    onChange={(e) => setAssignTargetId(e.target.value)}
                                    className="bg-slate-700 border-none rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-accent min-w-[220px]"
                                >
                                    <option value="">Wybierz...</option>
                                    <optgroup label="Ekipy">
                                        {teams.map(t => {
                                            const availability = assignDate ? getTeamAvailability(t.id, assignDate, installations) : null;
                                            let label = t.name;
                                            if (availability) {
                                                label += ` (${availability.count})`;
                                                if (availability.status === 'busy') label += ' ⚠️';
                                            }
                                            return (
                                                <option key={t.id} value={t.id}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </optgroup>
                                    <optgroup label="Przedstawiciele">
                                        {salesReps.map(r => (
                                            <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                                        ))}
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
                                if (!assignDate) {
                                    toast.error('Wybierz datę');
                                    return;
                                }
                                if (!assignTargetId) {
                                    toast.error('Wybierz ekipę lub montera');
                                    return;
                                }
                                void handleAssignTeam(assignTargetId, assignDate);
                            }}
                            className="bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg font-bold transition-colors"
                        >
                            Przypisz
                        </button>
                    </div>
                )
            }
            {/* Details Modal */}
            {
                editingInstallation && (
                    <InstallationDetailsModal
                        installation={editingInstallation}
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onUpdate={handleModalUpdate}
                        onSave={async (updated) => {
                            await DatabaseService.updateInstallation(updated.id, updated);
                        }}
                    />
                )
            }

            <ManualInstallationModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onInstallationCreated={loadData}
            />
        </div >
    );
};
