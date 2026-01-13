import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { TasksList } from './TasksList';
import type { TaskStatus, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/database/user.service';

interface TaskSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all'); // specific user filter
    const [loadingUsers, setLoadingUsers] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    // Fetch users for admin filter
    useEffect(() => {
        if (isAdmin && isOpen) {
            setLoadingUsers(true);
            UserService.getAllUsers()
                .then(data => setUsers(data.filter(u => u.status !== 'blocked')))
                .catch(err => console.error(err))
                .finally(() => setLoadingUsers(false));
        }
    }, [isAdmin, isOpen]);

    // Derived filters to pass to TasksList
    // Note: TasksList needs to be updated or we perform filtering inside it?
    // Actually TasksList handles data fetching. 
    // We need to upgrade TasksList to accept `userId` or `allUsers` prop. 
    // Wait, TasksList uses getTasks too.
    // Let's modify TasksList to accept these new props.

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-[40]"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[50] transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h2 className="font-bold text-slate-800 text-lg">Zadania</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs / Filters */}
                <div className="p-4 space-y-4 border-b border-slate-100">
                    {/* Mode Switch (Admin only) */}
                    {isAdmin && (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('my')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Moje Zadania
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Wszystkie
                            </button>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="all">Wszystkie statusy</option>
                            <option value="pending">Do zrobienia</option>
                            <option value="in_progress">W trakcie</option>
                            <option value="completed">Zakończone</option>
                        </select>

                        {isAdmin && activeTab === 'all' && (
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="all">Wszyscy pracownicy</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <TasksList
                        // Props need to be updated in TasksList definition first?
                        // Since I am inside a plan to modify files, I can assume TasksList will be updated or I can use existing props if flexible enough.
                        // I need to add filter props to TasksList.
                        filterUserId={activeTab === 'my' ? currentUser?.id : (selectedUserId === 'all' ? undefined : selectedUserId)}
                        filterAllUsers={activeTab === 'all' && selectedUserId === 'all'}
                        filterStatus={statusFilter === 'all' ? undefined : statusFilter}
                        refreshTrigger={isOpen ? Date.now() : 0} // Refresh when opened
                    />
                </div>
            </div>
        </>
    );
};
