import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../services/database';
import type { Task } from '../../types';
import { TaskModal } from './TaskModal';
import { toast } from 'react-hot-toast';

interface TasksListProps {
    leadId?: string;
    customerId?: string;
    refreshTrigger?: number; // External trigger to reload
}

export const TasksList: React.FC<TasksListProps> = ({ leadId, customerId, refreshTrigger }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const checkUserRole = async () => {
        const { data: { user } } = await DatabaseService.supabase.auth.getUser();
        if (user) {
            const { data } = await DatabaseService.supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (data?.role === 'admin') {
                setIsAdmin(true);
            }
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getTasks({ leadId, customerId });
            // Client-side sort: pending first, then by date needed? 
            // DB already sorts by due_date. 
            // Let's sort completed to bottom.
            const sorted = data.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                return 0; // Keep DB sort (due date)
            });
            setTasks(sorted);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUserRole();
        fetchTasks();
    }, [leadId, customerId, refreshTrigger]);

    const handleToggleStatus = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            // Optimistic update
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

            await DatabaseService.updateTask(task.id, { status: newStatus });
            toast.success(newStatus === 'completed' ? 'Zadanie zakończone' : 'Zadanie przywrócone');
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Błąd aktualizacji');
            fetchTasks(); // Revert on error
        }
    };

    const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation(); // Prevent opening modal
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-50 border-red-100';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="space-y-3">
            {loading ? (
                <div className="text-center py-4 text-slate-400 text-sm">Ładowanie zadań...</div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                    <p className="text-slate-500 text-sm">Brak zaplanowanych zadań</p>
                    <button
                        onClick={() => { setSelectedTask(undefined); setIsModalOpen(true); }}
                        className="text-accent text-sm font-medium hover:underline mt-1"
                    >
                        + Dodaj pierwsze zadanie
                    </button>
                </div>
            ) : (
                tasks.map(task => (
                    <div
                        key={task.id}
                        className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${task.status === 'completed' ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-200 hover:border-accent/30 shadow-sm'}`}
                    >
                        <button
                            onClick={() => handleToggleStatus(task)}
                            className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-accent text-transparent'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>

                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}>
                            <div className="flex justify-between items-start gap-2">
                                <h4 className={`text-sm font-medium truncate ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-accent'}`}>
                                    {task.title}
                                </h4>
                                <div className="flex items-center gap-1">
                                    {task.dueDate && (
                                        <span className={`text-xs whitespace-nowrap px-1.5 py-0.5 rounded border ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                                            {new Date(task.dueDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => handleDeleteTask(e, task.id)}
                                            className="ml-2 w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Usuń zadanie"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                                    {task.priority === 'medium' ? 'Średni' : task.priority === 'high' ? 'Wysoki' : 'Niski'}
                                </span>
                                <span className="text-xs text-slate-400 capitalize">{task.type === 'task' ? 'Zadanie' : task.type === 'call' ? 'Telefon' : task.type === 'email' ? 'Email' : 'Spotkanie'}</span>
                            </div>
                        </div>
                    </div>
                ))
            )}

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                initialData={{ leadId, customerId }}
                onSuccess={() => {
                    fetchTasks();
                }}
            />
        </div>
    );
};
