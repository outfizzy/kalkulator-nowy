import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';
import { toast } from 'react-hot-toast';
import type { User } from '../types';

export const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'internal' | 'partners'>('internal');

    const loadUsers = async () => {
        try {
            setLoading(true);
            const allUsers = await DatabaseService.getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Błąd wczytywania użytkowników');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);

            // For partners, ask for B2B margin on approval
            if (user?.role === 'partner') {
                const defaultMargin = user.partnerMargin ? Math.round(user.partnerMargin * 100) : 25;
                const input = window.prompt('Podaj marżę B2B w % (np. 25):', defaultMargin.toString());
                if (input === null) return; // Cancelled
                const normalized = input.replace(',', '.');
                const value = parseFloat(normalized);
                if (isNaN(value) || value <= 0 || value > 100) {
                    toast.error('Nieprawidłowa marża. Podaj wartość od 1 do 100.');
                    return;
                }
                await DatabaseService.updatePartnerMargin(userId, value / 100);
            }

            await DatabaseService.updateUserStatus(userId, 'active');
            toast.success('Użytkownik zaakceptowany');
            await loadUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            toast.error('Błąd akceptacji użytkownika');
        }
    };

    const handleBlock = async (userId: string) => {
        try {
            await DatabaseService.updateUserStatus(userId, 'blocked');
            toast.success('Użytkownik zablokowany');
            await loadUsers();
        } catch (error) {
            console.error('Error blocking user:', error);
            toast.error('Błąd blokowania użytkownika');
        }
    };

    const handleDelete = async (user: User) => {
        const confirmed = window.confirm(`Czy na pewno chcesz trwale usunąć użytkownika ${user.firstName} ${user.lastName}?`);
        if (!confirmed) return;

        try {
            await DatabaseService.deleteUser(user.id);
            toast.success('Użytkownik został usunięty');
            await loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Błąd usuwania użytkownika');
        }
    };

    const handleSetInstallerRole = async (user: User) => {
        try {
            await DatabaseService.updateUserRole(user.id, 'installer');
            toast.success(`Ustawiono rolę MONTER dla ${user.firstName} ${user.lastName}`);
            await loadUsers();
        } catch (error) {
            console.error('Error updating user role:', error);
            toast.error('Błąd zmiany roli użytkownika');
        }
    };

    const handleChangeRole = async (userId: string, newRole: User['role']) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const oldRole = user.role;
        const oldRoleName = getRoleName(oldRole);
        const newRoleName = getRoleName(newRole);

        // Special warning for critical roles
        if (newRole === 'admin' || newRole === 'manager' || oldRole === 'admin' || oldRole === 'manager') {
            const confirmed = window.confirm(
                `⚠️ UWAGA: Zmiana krytycznej roli!\n\n` +
                `Użytkownik: ${user.firstName} ${user.lastName}\n` +
                `Zmiana: ${oldRoleName} → ${newRoleName}\n\n` +
                `Czy na pewno chcesz kontynuować?`
            );
            if (!confirmed) {
                // Reset the select to the old value
                await loadUsers();
                return;
            }
        } else {
            // Regular confirmation for other role changes
            const confirmed = window.confirm(
                `Zmienić rolę użytkownika?\n\n` +
                `${user.firstName} ${user.lastName}\n` +
                `${oldRoleName} → ${newRoleName}`
            );
            if (!confirmed) {
                await loadUsers();
                return;
            }
        }

        try {
            await DatabaseService.updateUserRole(userId, newRole);
            toast.success('Rola użytkownika została zmieniona');
            await loadUsers();
        } catch (error) {
            console.error('Error changing user role:', error);
            toast.error('Błąd zmiany roli użytkownika');
            await loadUsers();
        }
    };

    const handleSetPartnerMargin = async (user: User) => {
        try {
            const defaultMargin = user.partnerMargin ? Math.round(user.partnerMargin * 100) : 25;
            const input = window.prompt(`Marża B2B dla ${user.companyName || user.firstName}:`, defaultMargin.toString());
            if (input === null) return;
            const normalized = input.replace(',', '.');
            const value = parseFloat(normalized);
            if (isNaN(value) || value <= 0 || value > 100) {
                toast.error('Nieprawidłowa marża. Podaj wartość od 1 do 100.');
                return;
            }
            await DatabaseService.updatePartnerMargin(user.id, value / 100);
            toast.success('Zaktualizowano marżę partnera');
            await loadUsers();
        } catch (error) {
            console.error('Error updating partner margin:', error);
            toast.error('Błąd aktualizacji marży partnera');
        }
    };

    const getStatusBadge = (status?: string) => {
        const statusMap = {
            pending: { label: 'Oczekuje', color: 'bg-yellow-500' },
            active: { label: 'Aktywny', color: 'bg-green-500' },
            blocked: { label: 'Zablokowany', color: 'bg-red-500' }
        };

        const info = statusMap[status as keyof typeof statusMap] || { label: 'Nieznany', color: 'bg-gray-500' };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${info.color}`}>
                {info.label}
            </span>
        );
    };

    const getRoleName = (role: string) => {
        const roleMap = {
            admin: 'Administrator',
            manager: 'Manager',
            sales_rep: 'Przedstawiciel Handlowy',
            partner: 'Partner B2B',
            installer: 'Monter'
        };
        return roleMap[role as keyof typeof roleMap] || role;
    };

    const filteredUsers = users.filter(user => {
        if (activeTab === 'partners') {
            return user.role === 'partner';
        }
        return user.role !== 'partner';
    });

    // Calculate statistics
    const stats = {
        total: users.length,
        pending: users.filter(u => u.status === 'pending').length,
        active: users.filter(u => u.status === 'active').length,
        blocked: users.filter(u => u.status === 'blocked').length,
        partners: users.filter(u => u.role === 'partner').length,
        internal: users.filter(u => u.role !== 'partner').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-700 mb-2">Zarządzanie Użytkownikami</h1>
                <p className="text-slate-500">Zatwierdzaj, blokuj i zarządzaj kontami użytkowników</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Wszyscy użytkownicy</span>
                        <div className="p-2 bg-accent-soft rounded-lg">
                            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-500 mt-1">Pracowników: {stats.internal} | Partnerów: {stats.partners}</p>
                </div>

                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-yellow-400 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Oczekujący</span>
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
                    {stats.pending > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">Wymaga zatwierdzenia</p>
                    )}
                </div>

                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-green-400 transition-all duration-300 hover:shadow-lg hover:shadow-green-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Aktywni</span>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
                </div>

                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-red-400 transition-all duration-300 hover:shadow-lg hover:shadow-red-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Zablokowani</span>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.blocked}</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Szukaj po nazwisku, emailu..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                            />
                        </div>
                    </div>
                    <button className="px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Odśwież
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('internal')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'internal'
                        ? 'bg-accent text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                >
                    Pracownicy
                </button>
                <button
                    onClick={() => setActiveTab('partners')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'partners'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                >
                    Partnerzy B2B
                    {users.filter(u => u.role === 'partner' && u.status === 'pending').length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {users.filter(u => u.role === 'partner' && u.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Użytkownik
                                </th>
                                {activeTab === 'partners' && (
                                    <>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Firma
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            NIP
                                        </th>
                                    </>
                                )}
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Rola
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Telefon
                                </th>
                                {activeTab === 'partners' && (
                                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Marża B2B
                                    </th>
                                )}
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Data rejestracji
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Akcje
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.role === 'partner' ? 'bg-emerald-600' : 'bg-accent'}`}>
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-white">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {activeTab === 'partners' && (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                {user.companyName || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                {user.nip || '-'}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleChangeRole(user.id, e.target.value as User['role'])}
                                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent hover:bg-slate-600 transition-colors cursor-pointer"
                                        >
                                            <option value="admin">Administrator</option>
                                            <option value="manager">Manager</option>
                                            <option value="sales_rep">Przedstawiciel Handlowy</option>
                                            <option value="partner">Partner B2B</option>
                                            <option value="installer">Monter</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {user.phone || '-'}
                                    </td>
                                    {activeTab === 'partners' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            <button
                                                onClick={() => handleSetPartnerMargin(user)}
                                                className="hover:text-accent transition-colors flex items-center gap-1"
                                                title="Kliknij aby zmienić"
                                            >
                                                {user.partnerMargin ? `${Math.round(user.partnerMargin * 100)}%` : '25%'}
                                                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(user.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {user.status === 'pending' && (
                                            <button
                                                onClick={() => handleApprove(user.id)}
                                                className="text-green-400 hover:text-green-300 transition-colors"
                                                title="Zatwierdź"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        {activeTab === 'internal' && user.role !== 'installer' && (
                                            <button
                                                onClick={() => handleSetInstallerRole(user)}
                                                className="text-accent hover:text-accent/80 transition-colors"
                                                title="Ustaw jako montera"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        {user.status !== 'blocked' ? (
                                            <button
                                                onClick={() => handleBlock(user.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="Zablokuj"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleApprove(user.id)}
                                                className="text-green-400 hover:text-green-300 transition-colors"
                                                title="Odblokuj"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(user)}
                                            className="text-red-500 hover:text-red-300 transition-colors"
                                            title="Usuń użytkownika"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {filteredUsers.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-400">
                    Brak użytkowników w tej kategorii
                </div>
            )}
        </div>
    );
};
