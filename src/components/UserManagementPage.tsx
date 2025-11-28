import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';
import { toast } from 'react-hot-toast';
import type { User } from '../types';

export const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

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
            sales_rep: 'Przedstawiciel Handlowy'
        };
        return roleMap[role as keyof typeof roleMap] || role;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Ładowanie...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Zarządzanie Użytkownikami</h1>
                <div className="text-sm text-slate-400">
                    Łącznie użytkowników: {users.length}
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-900 border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Użytkownik
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Rola
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Telefon
                            </th>
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
                    <tbody className="divide-y divide-slate-800">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-white">
                                                {user.firstName} {user.lastName}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                ID: {user.id.slice(0, 8)}...
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-white">{getRoleName(user.role)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-400">{user.phone || '-'}</div>
                                </td>
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
                                            className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                        >
                                            Zaakceptuj
                                        </button>
                                    )}
                                    {user.status === 'active' && (
                                        <button
                                            onClick={() => handleBlock(user.id)}
                                            className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                        >
                                            Zablokuj
                                        </button>
                                    )}
                                    {user.status === 'blocked' && (
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            Odblokuj
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && (
                    <div className="px-6 py-12 text-center text-slate-400">
                        Brak użytkowników do wyświetlenia
                    </div>
                )}
            </div>
        </div>
    );
};
