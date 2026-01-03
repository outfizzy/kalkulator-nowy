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

    // Filtering
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    const [users, setUsers] = useState<User[]>([]);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getTasks();
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
        if (isAdmin) {
            UserService.getAllUsers().then(setUsers);
        }
    }, [isAdmin]);

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

    const filteredTasks = tasks.filter(task => {
        if (filterAssignee === 'all') {
            // If not admin, user sees their own or created by them (handled by RLS/fetch usually, but let's be safe visually)
            // But getTasks returns all allowed.
            // Admin usually wants to see "mine" or "all".
            // Let's assume 'all' means "Everyone" (Admins view) or just "My tasks" (User view).
            // Actually, let's make it simpler:
            if (!isAdmin) return task.userId === currentUser?.id; // Standard user sees assigned
            return true; // Admin sees all
        }
        if (filterAssignee === 'mine') return task.userId === currentUser?.id;
        return task.userId === filterAssignee;
    });

    const columns: { id: TaskStatus; title: string; color: string }[] = [
        { id: 'pending', title: 'Do zrobienia', color: 'border-t-4 border-t-amber-400' },
        { id: 'in_progress', title: 'W trakcie', color: 'border-t-4 border-t-blue-500' },
        { id: 'completed', title: 'Zakończone', color: 'border-t-4 border-t-green-500' }
    ];

    if (loading) {
        return <div className="flex items-center justify-center h-96 text-slate-400">Ładowanie zadań...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header / Filter Toolbar */}
            <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Moje Zadania</h1>

                    {isAdmin && (
                        <select
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-accent"
                        >
                            <option value="all">Wszystkie zadania</option>
                            <option value="mine">Moje zadania</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <button
                    onClick={() => { setSelectedTask(undefined); setIsModalOpen(true); }}
                    className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowe Zadanie
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-6 h-full min-w-[1000px]">
                    {columns.map(col => (
                        <div
                            key={col.id}
                            className={`flex-1 flex flex-col bg-slate-50 rounded-xl min-w-[300px] h-full shadow-inner border border-slate-200/60 ${col.color}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 rounded-t-xl">
                                <h3 className="font-bold text-slate-700">{col.title}</h3>
                                <div className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                                    {filteredTasks.filter(t => t.status === col.id).length}
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {filteredTasks
                                    .filter(t => t.status === col.id)
                                    .map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onEdit={(t) => { setSelectedTask(t); setIsModalOpen(true); }}
                                            onDragStart={handleDragStart}
                                        />
                                    ))
                                }

                                <button
                                    onClick={() => {
                                        // Pre-set status for new task based on column?
                                        // Could add initialData prop to modal for status default
                                        setSelectedTask(undefined);
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-accent hover:text-accent transition-colors text-sm font-medium flex items-center justify-center gap-2 group"
                                >
                                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Dodaj kartę
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
