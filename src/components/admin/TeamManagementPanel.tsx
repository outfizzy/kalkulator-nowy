import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { InstallationTeam, User, TeamUnavailability } from '../../types';
import toast from 'react-hot-toast';

export const TeamManagementPanel: React.FC = () => {
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [installers, setInstallers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<InstallationTeam | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        color: '#3b82f6',
        memberIds: [] as string[],
        tags: [] as string[],
        notes: '',
        is_active: true,
        workingDays: [1, 2, 3, 4, 5] as number[],
        fuelConsumption: 12,
        vehicleMaintenanceRate: 0
    });

    const COLORS = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Yellow', value: '#eab308' },
        { name: 'Purple', value: '#a855f7' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Orange', value: '#f97316' },
        { name: 'Cyan', value: '#06b6d4' },
    ];

    // Skill tags presets
    const PRESET_TAGS = ['Elektryka', 'Hydraulika', 'Pergole', 'Szkło', 'Markizy', 'VIP'];

    const [unavailabilities, setUnavailabilities] = useState<TeamUnavailability[]>([]);
    const [newUnavailability, setNewUnavailability] = useState({
        startDate: '',
        endDate: '',
        reason: ''
    });
    const [addingUnavailability, setAddingUnavailability] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [teamsData, installersData] = await Promise.all([
                DatabaseService.getTeams(),
                DatabaseService.getInstallers()
            ]);
            setTeams(teamsData);
            setInstallers(installersData);
        } catch (error) {
            console.error('Error loading teams:', error);
            toast.error('Błąd ładowania danych');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async (team?: InstallationTeam) => {
        if (team) {
            setEditingTeam(team);
            setFormData({
                name: team.name,
                color: team.color,
                memberIds: team.members.map(m => m.id),
                tags: team.tags || [],
                notes: team.notes || '',
                is_active: team.isActive ?? true,
                workingDays: team.workingDays || [1, 2, 3, 4, 5],
                fuelConsumption: team.fuelConsumption !== undefined ? team.fuelConsumption : 12,
                vehicleMaintenanceRate: team.vehicleMaintenanceRate !== undefined ? team.vehicleMaintenanceRate : 0
            });

            // Load unavailability
            try {
                const ua = await DatabaseService.getTeamUnavailability(team.id);
                setUnavailabilities(ua);
            } catch (err) {
                console.error('Error loading unavailability', err);
                toast.error('Błąd ładowania urlopów');
            }

        } else {
            setEditingTeam(null);
            setFormData({
                name: '',
                color: '#3b82f6',
                memberIds: [],
                tags: [],
                notes: '',
                is_active: true,
                workingDays: [1, 2, 3, 4, 5],
                fuelConsumption: 12,
                vehicleMaintenanceRate: 0
            });
            setUnavailabilities([]);
        }
        setNewUnavailability({ startDate: '', endDate: '', reason: '' });
        setAddingUnavailability(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Nazwa jest wymagana');
            return;
        }

        try {
            if (editingTeam) {
                await DatabaseService.updateTeam(
                    editingTeam.id,
                    formData.name,
                    formData.color,
                    formData.memberIds,
                    formData.tags,
                    formData.notes,
                    formData.is_active,
                    formData.workingDays,
                    Number(formData.fuelConsumption),
                    Number(formData.vehicleMaintenanceRate)
                );
                toast.success('Zaktualizowano zespół');
            } else {
                await DatabaseService.createTeam(
                    formData.name,
                    formData.color,
                    formData.memberIds,
                    formData.tags,
                    formData.notes,
                    formData.is_active,
                    formData.workingDays,
                    Number(formData.fuelConsumption),
                    Number(formData.vehicleMaintenanceRate)
                );
                toast.success('Utworzono zespół');
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving team:', error);
            toast.error('Błąd zapisu');
        }
    };

    const handleAddUnavailability = async () => {
        if (!editingTeam) return;
        if (!newUnavailability.startDate || !newUnavailability.endDate) {
            toast.error('Podaj daty początkową i końcową');
            return;
        }

        try {
            const added = await DatabaseService.addTeamUnavailability({
                teamId: editingTeam.id,
                startDate: newUnavailability.startDate,
                endDate: newUnavailability.endDate,
                reason: newUnavailability.reason || 'Urlop'
            });
            setUnavailabilities([...unavailabilities, added]);
            setNewUnavailability({ startDate: '', endDate: '', reason: '' });
            setAddingUnavailability(false);
            toast.success('Dodano niedostępność');
        } catch (err) {
            console.error(err);
            toast.error('Błąd dodawania niedostępności');
        }
    };

    const handleDeleteUnavailability = async (id: string) => {
        if (!confirm('Czy usunąć ten okres niedostępności?')) return;
        try {
            await DatabaseService.deleteTeamUnavailability(id);
            setUnavailabilities(unavailabilities.filter(u => u.id !== id));
            toast.success('Usunięto');
        } catch (err) {
            console.error(err);
            toast.error('Błąd usuwania');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten zespół?')) return;

        try {
            await DatabaseService.deleteTeam(id);
            toast.success('Usunięto zespół');
            loadData();
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error('Błąd usuwania');
        }
    };

    const toggleMember = (userId: string) => {
        setFormData(prev => {
            const exists = prev.memberIds.includes(userId);
            if (exists) {
                return { ...prev, memberIds: prev.memberIds.filter(id => id !== userId) };
            } else {
                return { ...prev, memberIds: [...prev.memberIds, userId] };
            }
        });
    };

    const toggleWorkingDay = (dayIndex: number) => { // 1=Mon, 7=Sun
        setFormData(prev => {
            const exists = prev.workingDays.includes(dayIndex);
            if (exists) {
                return { ...prev, workingDays: prev.workingDays.filter(d => d !== dayIndex) };
            } else {
                return { ...prev, workingDays: [...prev.workingDays, dayIndex].sort() };
            }
        });
    };

    const WEEKDAYS = [
        { id: 1, label: 'Pon' },
        { id: 2, label: 'Wt' },
        { id: 3, label: 'Śr' },
        { id: 4, label: 'Czw' },
        { id: 5, label: 'Pt' },
        { id: 6, label: 'Sob' },
        { id: 7, label: 'Nd' },
    ];

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Ładowanie...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Zarządzanie Ekipami</h1>
                    <p className="text-slate-500 mt-1">Twórz i edytuj zespoły montażowe</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowa Ekipa
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                    <div key={team.id} className={`bg-white rounded-xl shadow-sm border ${team.isActive === false ? 'border-red-200 bg-red-50/50' : 'border-slate-200'} overflow-hidden hover:shadow-md transition-shadow`}>
                        <div className={`h-2 ${team.isActive === false ? 'bg-slate-300' : ''}`} style={{ backgroundColor: team.isActive === false ? undefined : team.color }} />
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-slate-800">{team.name}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(team)}
                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(team.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>{team.members.length} członków</span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {team.members.map((member) => (
                                        <span key={member.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                            {member.firstName} {member.lastName}
                                        </span>
                                    ))}
                                    {team.members.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Brak członków</span>
                                    )}
                                </div>
                                {team.tags && team.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {team.tags.map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {team.isActive === false && (
                                    <div className="mt-2 text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        Nieaktywna
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Card Placeholder */}
                <button
                    onClick={() => handleOpenModal()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-accent hover:text-accent transition-colors min-h-[200px]"
                >
                    <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium">Dodaj nową ekipę</span>
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingTeam ? 'Edytuj Ekipę' : 'Nowa Ekipa'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa Ekipy</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                            placeholder="np. Ekipa 1 (Północ)"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Kolor</label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, color: c.value })}
                                                    className={`w-6 h-6 rounded-full transition-transform ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                                                    style={{ backgroundColor: c.value }}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-5 h-5 text-accent border-slate-300 rounded focus:ring-accent"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Ekipa Aktywna</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Working Days */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Dni Robocze</label>
                                    <div className="flex gap-2">
                                        {WEEKDAYS.map(day => (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleWorkingDay(day.id)}
                                                className={`w-10 h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${formData.workingDays?.includes(day.id)
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Zaznacz dni, w które ekipa standardowo pracuje.</p>
                                </div>

                                {/* Financial Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Spalanie (L/100km)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={formData.fuelConsumption}
                                            onChange={e => setFormData({ ...formData, fuelConsumption: parseFloat(e.target.value) })}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Amortyzacja (PLN/km)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.vehicleMaintenanceRate}
                                            onChange={e => setFormData({ ...formData, vehicleMaintenanceRate: parseFloat(e.target.value) })}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                        />
                                    </div>
                                </div>

                                {/* Unavailability / Vacations - Only in edit mode */}
                                {editingTeam && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Niedostępności / Urlopy</label>

                                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                            {addingUnavailability ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs text-slate-500">Początek</label>
                                                            <input
                                                                type="date"
                                                                value={newUnavailability.startDate}
                                                                onChange={e => setNewUnavailability({ ...newUnavailability, startDate: e.target.value })}
                                                                className="w-full p-1.5 text-sm border rounded"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500">Koniec</label>
                                                            <input
                                                                type="date"
                                                                value={newUnavailability.endDate}
                                                                onChange={e => setNewUnavailability({ ...newUnavailability, endDate: e.target.value })}
                                                                className="w-full p-1.5 text-sm border rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Powód (np. Urlop, L4)"
                                                        value={newUnavailability.reason}
                                                        onChange={e => setNewUnavailability({ ...newUnavailability, reason: e.target.value })}
                                                        className="w-full p-1.5 text-sm border rounded"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAddingUnavailability(false)}
                                                            className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
                                                        >
                                                            Anuluj
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleAddUnavailability}
                                                            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                        >
                                                            Dodaj
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingUnavailability(true)}
                                                    className="w-full py-2 border border-dashed border-slate-300 rounded text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Dodaj niedostępność
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {unavailabilities.map(u => (
                                                <div key={u.id} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded text-sm relative group">
                                                    <div>
                                                        <span className="font-medium text-slate-700">{u.reason || 'Niedostępność'}</span>
                                                        <span className="text-slate-500 mx-2">|</span>
                                                        <span className="text-slate-500">{u.startDate} - {u.endDate}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUnavailability(u.id)}
                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {unavailabilities.length === 0 && !addingUnavailability && (
                                                <p className="text-xs text-center text-slate-400 py-2">Brak zaplanowanych urlopów</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Members */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Członkowie</label>
                                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                        {installers.map(installer => (
                                            <label key={installer.id} className="flex items-center p-3 hover:bg-slate-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.memberIds.includes(installer.id)}
                                                    onChange={() => toggleMember(installer.id)}
                                                    className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                                                />
                                                <span className="ml-3 text-sm text-slate-700">
                                                    {installer.firstName} {installer.lastName}
                                                </span>
                                            </label>
                                        ))}
                                        {installers.length === 0 && (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                Brak dostępnych montażystów
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tags and Notes omitted for brevity/layout, keeping them if I can fit or putting below? 
                                    I will keep them, but I need to make sure I didn't delete them. 
                                    Wait, I replaced lines 37-394, essentially the whole component logic and render.
                                    I need to put Tags and Notes back if I want them.
                                    The previous code had them. My replacement content omitted them to save space in the prompt?
                                    NO, I should include them.
                                 */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Specjalizacje (Tagi)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {PRESET_TAGS.map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    const tags = formData.tags.includes(tag)
                                                        ? formData.tags.filter(t => t !== tag)
                                                        : [...formData.tags, tag];
                                                    setFormData({ ...formData, tags });
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${formData.tags.includes(tag)
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Dodaj własny tag (wpisz i wciśnij Enter)"
                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.currentTarget.value.trim();
                                                if (val && !formData.tags.includes(val)) {
                                                    setFormData({ ...formData, tags: [...formData.tags, val] });
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notatki Wewnętrzne</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg h-20 text-sm"
                                        placeholder="Np. Preferują montaże na południu, mają drabinę 10m..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors"
                                    >
                                        Zapisz
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
