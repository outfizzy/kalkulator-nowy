import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { InstallationTeam, User } from '../../types';
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
        memberIds: [] as string[]
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

    const handleOpenModal = (team?: InstallationTeam) => {
        if (team) {
            setEditingTeam(team);
            setFormData({
                name: team.name,
                color: team.color,
                memberIds: team.members.map(m => m.id)
            });
        } else {
            setEditingTeam(null);
            setFormData({
                name: '',
                color: '#3b82f6',
                memberIds: []
            });
        }
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
                    formData.memberIds
                );
                toast.success('Zaktualizowano zespół');
            } else {
                await DatabaseService.createTeam(
                    formData.name,
                    formData.color,
                    formData.memberIds
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
                    <div key={team.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-2" style={{ backgroundColor: team.color }} />
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
                                    {team.members.map(member => (
                                        <span key={member.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                            {member.firstName} {member.lastName}
                                        </span>
                                    ))}
                                    {team.members.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Brak członków</span>
                                    )}
                                </div>
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingTeam ? 'Edytuj Ekipę' : 'Nowa Ekipa'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
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
                                <label className="block text-sm font-medium text-slate-700 mb-2">Kolor w kalendarzu</label>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: c.value })}
                                            className={`w-8 h-8 rounded-full transition-transform ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>

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

                            <div className="flex justify-end gap-3 pt-4">
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
            )}
        </div>
    );
};
