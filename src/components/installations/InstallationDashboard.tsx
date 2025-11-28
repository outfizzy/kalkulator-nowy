import React, { useEffect, useState } from 'react';
import { getInstallations, getTeams, updateInstallation } from '../../utils/storage';
import { geocodeAddress } from '../../utils/geocoding';
import { InstallationMap } from './InstallationMap';
import { InstallationDetailsModal } from './InstallationDetailsModal';
import { OfferSearchModal } from './OfferSearchModal';
import { InstallationCalendar } from './InstallationCalendar';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';

export const InstallationDashboard: React.FC = () => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [view, setView] = useState<'list' | 'calendar'>('list');

    // Modal State
    const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const loadData = () => {
        setInstallations(getInstallations());
        setTeams(getTeams());
    };

    useEffect(() => {
        loadData();
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
                const updated = {
                    ...inst,
                    client: { ...inst.client, coordinates: coords }
                };
                updateInstallation(updated);
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

    const handleAssignTeam = (teamId: string, date: string) => {
        if (selectedIds.length === 0) return;

        selectedIds.forEach(id => {
            const inst = installations.find(i => i.id === id);
            if (inst) {
                updateInstallation({
                    ...inst,
                    teamId,
                    scheduledDate: date,
                    status: 'scheduled'
                });
            }
        });

        toast.success(`Przypisano ${selectedIds.length} montaży do ekipy`);
        setSelectedIds([]);
        loadData();
    };

    const handleEdit = (installation: Installation) => {
        setEditingInstallation(installation);
        setIsModalOpen(true);
    };

    const handleModalUpdate = () => {
        loadData();
    };

    const filteredInstallations = installations.filter(inst => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'unassigned') return !inst.teamId;
        return inst.status === filterStatus;
    });

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
                            <div className="p-4 border-b border-slate-100">
                                <div className="flex gap-2 mb-4">
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
                                {filteredInstallations.map(inst => (
                                    <div
                                        key={inst.id}
                                        onClick={() => handleSelect(inst.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedIds.includes(inst.id)
                                            ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-slate-800">{inst.client.city}</h3>
                                            {inst.teamId && (
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: teams.find(t => t.id === inst.teamId)?.color }}
                                                    title={teams.find(t => t.id === inst.teamId)?.name}
                                                />
                                            )}

                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-sm text-slate-600">{inst.client.firstName} {inst.client.lastName}</p>
                                                <p className="text-xs text-slate-400 mt-1">{inst.productSummary}</p>
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
                                            <span className="text-[10px] text-red-500 font-bold">Brak GPS</span>
                                        )}
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
                ) : (
                    <div className="w-full h-full">
                        <InstallationCalendar
                            installations={installations}
                            teams={teams}
                            onEdit={handleEdit}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Panel: Assignment */}
            {selectedIds.length > 0 && (
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-slide-up">
                    <div className="flex items-center gap-4">
                        <span className="font-bold">Wybrano: {selectedIds.length}</span>
                        <div className="h-8 w-px bg-slate-600" />
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-300">Data:</label>
                            <input
                                type="date"
                                id="assign-date"
                                className="bg-slate-700 border-none rounded px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-300">Ekipa:</label>
                            <select
                                id="assign-team"
                                className="bg-slate-700 border-none rounded px-2 py-1 text-sm"
                            >
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const date = (document.getElementById('assign-date') as HTMLInputElement).value;
                            const team = (document.getElementById('assign-team') as HTMLSelectElement).value;
                            if (!date) return toast.error('Wybierz datę');
                            handleAssignTeam(team, date);
                        }}
                        className="bg-accent hover:bg-blue-600 px-6 py-2 rounded-lg font-bold transition-colors"
                    >
                        Przypisz do Ekipy
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
                />
            )}

            <OfferSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onInstallationCreated={handleModalUpdate}
            />
        </div>
    );
};
