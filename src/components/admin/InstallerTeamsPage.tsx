import React, { useState, useEffect } from 'react';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { DatabaseService } from '../../services/database';
import type { InstallationTeam, User } from '../../types';
import { toast } from 'react-hot-toast';

export const InstallerTeamsPage: React.FC = () => {
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Partial<InstallationTeam>>({});
    const [installers, setInstallers] = useState<User[]>([]);

    // Form state
    const [newMemberType, setNewMemberType] = useState<'user' | 'virtual'>('user');
    const [selectedInstallerId, setSelectedInstallerId] = useState('');
    const [virtualMemberName, setVirtualMemberName] = useState('');
    const [memberRate, setMemberRate] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [teamsData, installersData] = await Promise.all([
                InstallationTeamService.getTeams(),
                DatabaseService.getInstallers()
            ]);
            setTeams(teamsData);
            setInstallers(installersData);
        } catch (error) {
            console.error('Error loading teams:', error);
            toast.error('Błąd ładowania ekip');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!editingTeam.name) {
                toast.error('Nazwa ekipy jest wymagana');
                return;
            }

            if (editingTeam.id) {
                await InstallationTeamService.updateTeam(editingTeam.id, editingTeam);
                toast.success('Ekipa zaktualizowana');
            } else {
                await InstallationTeamService.createTeam({
                    name: editingTeam.name!,
                    color: editingTeam.color || '#3b82f6',
                    vehicle: editingTeam.vehicle,
                    members: editingTeam.members || [],
                    fuelConsumption: editingTeam.fuelConsumption,
                    vehicleMaintenanceRate: editingTeam.vehicleMaintenanceRate
                } as any);
                toast.success('Ekipa utworzona');
            }
            setIsEditing(false);
            setEditingTeam({});
            loadData();
        } catch (error) {
            console.error('Error saving team:', error);
            toast.error('Błąd zapisu ekipy');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę ekipę?')) return;
        try {
            await InstallationTeamService.deleteTeam(id);
            toast.success('Ekipa usunięta');
            loadData();
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error('Błąd usuwania ekipy');
        }
    };

    const addMember = () => {
        const currentMembers = editingTeam.members || [];
        const rate = parseFloat(memberRate) || 0;

        if (newMemberType === 'user') {
            const installer = installers.find(i => i.id === selectedInstallerId);
            if (!installer) return;

            // Check duplicates
            if (currentMembers.some(m => m.id === installer.id)) {
                toast.error('Ten montażysta jest już w ekipie');
                return;
            }

            setEditingTeam({
                ...editingTeam,
                members: [...currentMembers, {
                    id: installer.id,
                    firstName: installer.firstName,
                    lastName: installer.lastName,
                    hourlyRate: rate || installer.hourlyRate, // Use override or default
                    type: 'user'
                }]
            });
            setSelectedInstallerId('');
        } else {
            if (!virtualMemberName.trim()) return;

            setEditingTeam({
                ...editingTeam,
                members: [...currentMembers, {
                    id: `virtual-${Date.now()}`,
                    firstName: virtualMemberName,
                    lastName: '(Virtual)',
                    hourlyRate: rate,
                    type: 'virtual'
                }]
            });
            setVirtualMemberName('');
        }
        setMemberRate('');
    };

    const removeMember = (memberId: string) => {
        setEditingTeam({
            ...editingTeam,
            members: (editingTeam.members || []).filter(m => m.id !== memberId)
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Ładowanie ekip...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Grupy Montażowe (Brygady)</h2>
                <button
                    onClick={() => {
                        setEditingTeam({ color: '#3b82f6', members: [] });
                        setIsEditing(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowa Brygada
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                    <div key={team.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: team.color }}
                                />
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{team.name}</h3>
                                    {team.vehicle && (
                                        <div className="text-sm text-slate-500 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            {team.vehicle}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingTeam(team);
                                        setIsEditing(true);
                                    }}
                                    className="text-slate-400 hover:text-blue-600"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(team.id)}
                                    className="text-slate-400 hover:text-red-600"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Skład ({team.members.length})</h4>
                            <div className="space-y-2">
                                {team.members.map(member => (
                                    <div key={member.id} className="flex justify-between items-center text-sm text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${member.type === 'virtual' || member.lastName === '(Virtual)' ? 'bg-orange-400' : 'bg-green-500'}`} />
                                            <span>{member.firstName} {member.lastName}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono">
                                            {member.hourlyRate ? `${member.hourlyRate} PLN/h` : '-'}
                                        </div>
                                    </div>
                                ))}
                                {team.members.length === 0 && (
                                    <div className="text-sm text-slate-400 italic">Brak członków</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingTeam.id ? 'Edytuj Brygadę' : 'Nowa Brygada'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa ekipy</label>
                                    <input
                                        type="text"
                                        value={editingTeam.name || ''}
                                        onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="np. Ekipa 1 (Północ)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kolor</label>
                                        <input
                                            type="color"
                                            value={editingTeam.color || '#3b82f6'}
                                            onChange={e => setEditingTeam({ ...editingTeam, color: e.target.value })}
                                            className="w-full h-10 p-1 border border-slate-300 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Pojazd (opcjonalnie)</label>
                                        <input
                                            type="text"
                                            value={editingTeam.vehicle || ''}
                                            onChange={e => setEditingTeam({ ...editingTeam, vehicle: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="np. Ford Transit"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Members Section */}
                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="font-semibold text-slate-800 mb-4">Członkowie Zespołu</h4>

                                {/* Add Member Form */}
                                <div className="bg-slate-50 p-4 rounded-lg mb-4 space-y-3">
                                    <div className="flex gap-4 text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={newMemberType === 'user'}
                                                onChange={() => setNewMemberType('user')}
                                            />
                                            Zarejestrowany Montażysta
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={newMemberType === 'virtual'}
                                                onChange={() => setNewMemberType('virtual')}
                                            />
                                            Osoba Wirtualna (Bez konta)
                                        </label>
                                    </div>

                                    <div className="flex gap-2">
                                        {newMemberType === 'user' ? (
                                            <select
                                                value={selectedInstallerId}
                                                onChange={e => setSelectedInstallerId(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            >
                                                <option value="">Wybierz montażystę...</option>
                                                {installers.map(inst => (
                                                    <option key={inst.id} value={inst.id}>
                                                        {inst.firstName} {inst.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={virtualMemberName}
                                                onChange={e => setVirtualMemberName(e.target.value)}
                                                placeholder="Imię i nazwisko"
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            />
                                        )}
                                        <div className="w-24 relative">
                                            <input
                                                type="number"
                                                value={memberRate}
                                                onChange={e => setMemberRate(e.target.value)}
                                                placeholder="Stawka"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            />
                                            <span className="absolute right-2 top-2 text-xs text-slate-400">PLN/h</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={addMember}
                                        disabled={newMemberType === 'user' ? !selectedInstallerId : !virtualMemberName}
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                                    >
                                        Dodaj Członka
                                    </button>
                                </div>

                                {/* Members List */}
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {(editingTeam.members || []).map((member, idx) => (
                                        <div key={member.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${member.type === 'virtual' || member.lastName === '(Virtual)' ? 'bg-orange-400' : 'bg-green-500'}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{member.firstName} {member.lastName}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {member.hourlyRate ? `${member.hourlyRate} PLN/h` : 'Stawka domyślna'}
                                                        {member.type === 'virtual' && ' (Wirtualny)'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    {(editingTeam.members || []).length === 0 && (
                                        <div className="text-center text-sm text-slate-400 py-2">Brak dodanych członków</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 font-medium transition-all transform active:scale-95"
                            >
                                Zapisz Brygadę
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
