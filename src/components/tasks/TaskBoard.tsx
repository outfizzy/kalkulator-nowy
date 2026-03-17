import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { UserService } from '../../services/database/user.service';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import type { Task, User, TaskStatus } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export const TaskBoard: React.FC = () => {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filtering — available to ALL users
    const [filterAssignee, setFilterAssignee] = useState<string>('mine');
    const [users, setUsers] = useState<User[]>([]);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getTasks({
                allUsers: filterAssignee === 'all' || (filterAssignee !== 'mine' && filterAssignee !== 'all'),
                userId: filterAssignee !== 'all' && filterAssignee !== 'mine' ? filterAssignee : undefined,
            });
            setTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Błąd pobierania zadań');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        // All users can see other users for assignment
        UserService.getAllUsers().then(u => setUsers(u.filter(u => u.status !== 'blocked' && ['sales_rep', 'manager', 'admin'].includes(u.role || '')))).catch(console.error);
    }, [filterAssignee]);

    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            await DatabaseService.updateTask(taskId, { status: newStatus });
            toast.success('Status zaktualizowany');
        } catch (error) {
            console.error('Error updating task status:', error);
            toast.error('Błąd aktualizacji statusu');
            fetchTasks(); // Revert
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć to zadanie?')) return;
        try {
            await DatabaseService.deleteTask(taskId);
            toast.success('Zadanie usunięte');
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Błąd usuwania zadania');
        }
    };

    const handleQuickComplete = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            await DatabaseService.updateTask(taskId, { status: newStatus });
            toast.success(newStatus === 'completed' ? '✅ Zadanie zakończone' : 'Zadanie przywrócone');
        } catch {
            fetchTasks();
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filterAssignee === 'mine') return task.userId === currentUser?.id;
        if (filterAssignee === 'all') return true;
        return task.userId === filterAssignee;
    });

    // Stats
    const myPending = tasks.filter(t => t.userId === currentUser?.id && t.status === 'pending').length;
    const myOverdue = tasks.filter(t => t.userId === currentUser?.id && t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;

    const columns: { id: TaskStatus; title: string; color: string; icon: string }[] = [
        { id: 'pending', title: 'Do zrobienia', color: 'border-t-4 border-t-amber-400', icon: '📋' },
        { id: 'in_progress', title: 'W trakcie', color: 'border-t-4 border-t-blue-500', icon: '⚡' },
        { id: 'completed', title: 'Zakończone', color: 'border-t-4 border-t-green-500', icon: '✅' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-400 text-sm">Ładowanie zadań...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header / Filter Toolbar */}
            <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Zadania</h1>
                            <p className="text-xs text-slate-400">
                                {myPending > 0 && <span className="text-amber-600 font-semibold">{myPending} do zrobienia</span>}
                                {myOverdue > 0 && <span className="text-red-500 font-semibold ml-2">• {myOverdue} po terminie!</span>}
                                {myPending === 0 && myOverdue === 0 && <span className="text-green-600">Wszystko na bieżąco ✨</span>}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => { setSelectedTask(undefined); setIsModalOpen(true); }}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowe Zadanie
                    </button>
                </div>

                {/* Filter Bar — visible to ALL users */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterAssignee('mine')}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${filterAssignee === 'mine' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        👤 Moje
                    </button>
                    <button
                        onClick={() => setFilterAssignee('all')}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${filterAssignee === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        👥 Wszystkie
                    </button>
                    <div className="h-4 w-px bg-slate-200" />
                    {users.filter(u => u.id !== currentUser?.id).slice(0, 6).map(u => (
                        <button
                            key={u.id}
                            onClick={() => setFilterAssignee(u.id)}
                            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterAssignee === u.id ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'}`}
                        >
                            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white text-[8px] flex items-center justify-center font-bold">
                                {(u.firstName?.[0] || '')}{(u.lastName?.[0] || '')}
                            </span>
                            {u.firstName}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-[900px]">
                    {columns.map(col => (
                        <div
                            key={col.id}
                            className={`flex-1 flex flex-col bg-slate-50/80 rounded-xl min-w-[280px] h-full shadow-inner border border-slate-200/60 ${col.color}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className="p-3 border-b border-slate-200/50 flex justify-between items-center bg-white/50 rounded-t-xl">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{col.icon}</span>
                                    <h3 className="font-bold text-sm text-slate-700">{col.title}</h3>
                                </div>
                                <span className="bg-slate-200 text-slate-600 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                                    {filteredTasks.filter(t => t.status === col.id).length}
                                </span>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                                {filteredTasks
                                    .filter(t => t.status === col.id)
                                    .map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            currentUserId={currentUser?.id || ''}
                                            onEdit={(t) => { setSelectedTask(t); setIsModalOpen(true); }}
                                            onDragStart={handleDragStart}
                                            onDelete={handleDeleteTask}
                                            onQuickComplete={handleQuickComplete}
                                        />
                                    ))
                                }

                                {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <p className="text-xs">Brak zadań</p>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setSelectedTask(undefined); setIsModalOpen(true); }}
                                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 group"
                                >
                                    <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Dodaj
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                onSuccess={() => {
                    fetchTasks();
                }}
            />
        </div>
    );
};
