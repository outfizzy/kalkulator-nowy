import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { UserService } from '../../services/database/user.service';
import type { Task, TaskPriority, TaskStatus, TaskType, User, Customer } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerSelector } from '../customers/CustomerSelector'; // Re-using existing selector

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task; // If provided, edit mode
    initialData?: {
        leadId?: string;
        customerId?: string;
    };
    onSuccess?: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, initialData, onSuccess }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<User[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [type, setType] = useState<TaskType>('task');
    const [status, setStatus] = useState<TaskStatus>('pending');
    const [assigneeId, setAssigneeId] = useState('');

    // Customer Selection State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
    const [isSelectingCustomer, setIsSelectingCustomer] = useState(false);

    const canAssign = true; // Anyone can assign now

    useEffect(() => {
        if (isOpen) {
            UserService.getAllUsers().then(users => {
                const activeUsers = users.filter(u => u.status !== 'blocked');
                setAssignableUsers(activeUsers);
            }).catch(err => console.error('Error fetching users:', err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (task) {
                // Edit Mode
                setTitle(task.title);
                setDescription(task.description || '');
                if (task.dueDate) {
                    const dateObj = new Date(task.dueDate);
                    setDueDate(dateObj.toISOString().slice(0, 10)); // YYYY-MM-DD
                    setDueTime(dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
                } else {
                    setDueDate('');
                    setDueTime('');
                }
                setPriority(task.priority);
                setType(task.type);
                setStatus(task.status);
                setAssigneeId(task.userId);
                // Ideally load customer data if task.customerId is present but we usually don't fetch relation here
                // For now, if initialData.customerId is passed, we use that context
            } else {
                // Create Mode - Reset
                setTitle('');
                setDescription('');
                setDueDate(new Date().toISOString().slice(0, 10)); // Default today
                setDueTime('12:00');
                setPriority('medium');
                setType('task');
                setStatus('pending');
                setAssigneeId(currentUser?.id || '');
                setSelectedCustomer(undefined);
            }
        }
    }, [isOpen, task, currentUser]);

    // Handle initial customer context
    useEffect(() => {
        if (initialData?.customerId && isOpen && !task) {
            // If checking in simple context, we assume customer is known/passed or handled by ID
            // We can fetch customer details if needed for display, but for now ID is enough for submit
        }
    }, [initialData, isOpen, task]);

    if (!isOpen) return null;

    if (isSelectingCustomer) {
        return (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[600px] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold">Wybierz Klienta</h3>
                        <button onClick={() => setIsSelectingCustomer(false)}>✕</button>
                    </div>
                    <div className="flex-1 overflow-hidden p-4">
                        <CustomerSelector
                            onSelect={(c) => {
                                setSelectedCustomer(c);
                                setIsSelectingCustomer(false);
                            }}
                            onCancel={() => setIsSelectingCustomer(false)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Tytuł jest wymagany');
            return;
        }

        if (!assigneeId) {
            toast.error('Musisz przypisać zadanie do użytkownika');
            return;
        }

        setLoading(true);
        try {
            // Combine Date and Time
            let dueDateTime: string | undefined = undefined;
            if (dueDate) {
                const dateTimeStr = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T12:00:00`;
                dueDateTime = new Date(dateTimeStr).toISOString();
            }

            const taskData = {
                title,
                description,
                dueDate: dueDateTime,
                priority,
                type,
                status,
                userId: assigneeId || currentUser?.id || '',
                leadId: task?.leadId || initialData?.leadId,
                customerId: task?.customerId || initialData?.customerId || selectedCustomer?.id
            };

            if (task) {
                await DatabaseService.updateTask(task.id, taskData);
                toast.success('Zadanie zaktualizowane');
            } else {
                await DatabaseService.createTask(taskData);
                toast.success('Zadanie utworzone');
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            const msg = error instanceof Error ? error.message : 'Nieznany błąd';
            toast.error('Błąd zapisywania zadania: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">{task ? 'Edytuj Zadanie' : 'Nowe Zadanie'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tytuł</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none"
                            placeholder="Np. Telefon do klienta"
                            autoFocus
                        />
                    </div>

                    {/* Customer Link (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Klient</label>
                        {initialData?.customerId ? (
                            <div className="text-sm text-slate-500 italic bg-slate-50 p-2 rounded border">
                                (Przypisane do kontekstu klienta)
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="flex-1 p-2 bg-slate-50 border rounded text-sm text-slate-700 truncate">
                                    {selectedCustomer
                                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.city})`
                                        : task?.customerId ? '(Klient przypisany)' : 'Brak przypisanego klienta'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSelectingCustomer(true)}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-50"
                                >
                                    {selectedCustomer ? 'Zmień' : 'Wybierz'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Assignee Selection - Unrestricted */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Przypisz do <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none bg-white"
                            required
                        >
                            <option value="" disabled>Wybierz użytkownika...</option>
                            <option value={currentUser?.id}>Ja ({currentUser?.firstName} {currentUser?.lastName})</option>
                            {assignableUsers.filter(u => u.id !== currentUser?.id).map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName} ({user.role === 'sales_rep' ? 'Handlowiec' : user.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Type & Priority Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Typ</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as TaskType)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none bg-white"
                            >
                                <option value="task">Zadanie</option>
                                <option value="call">Telefon</option>
                                <option value="email">Email</option>
                                <option value="meeting">Spotkanie</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priorytet</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none bg-white"
                            >
                                <option value="low">Niski</option>
                                <option value="medium">Średni</option>
                                <option value="high">Wysoki</option>
                            </select>
                        </div>
                    </div>

                    {/* Due Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Godzina</label>
                            <input
                                type="time"
                                value={dueTime}
                                onChange={(e) => setDueTime(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Opis</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none min-h-[100px] resize-none"
                            placeholder="Szczegóły zadania..."
                        />
                    </div>

                    {/* Status (Always visible now, or just edit?) - Let's allow setting status on create too if needed, but usually pending */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none bg-white"
                        >
                            <option value="pending">Do zrobienia</option>
                            <option value="in_progress">W trakcie</option>
                            <option value="completed">Zakończone</option>
                            <option value="cancelled">Anulowane</option>
                        </select>
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        {loading ? 'Zapisywanie...' : (task ? 'Zapisz zmiany' : 'Utwórz zadanie')}
                    </button>
                </div>
            </div>
        </div>
    );
};
