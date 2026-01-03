import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ServiceService } from '../../services/database/service.service';
import { InstallationService } from '../../services/database/installation.service';
import type { ServiceTicket, InstallationTeam, ServiceTicketTask, ServiceTicketHistory, ServiceTicketStatus } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { generateServiceProtocol } from './ServiceProtocolPDF';

export const ServiceTicketDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [ticket, setTicket] = useState<ServiceTicket | null>(null);
    const [history, setHistory] = useState<ServiceTicketHistory[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [newTaskLabel, setNewTaskLabel] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    const loadData = useCallback(async (ticketId: string) => {
        setLoading(true);
        try {
            const [ticketData, historyData, teamsData] = await Promise.all([
                ServiceService.getTicketById(ticketId),
                ServiceService.getTicketHistory(ticketId),
                InstallationService.getInstallationTeams()
            ]);

            if (!ticketData) {
                toast.error('Nie znaleziono zgłoszenia');
                navigate('/service');
                return;
            }

            setTicket(ticketData);
            setHistory(historyData);
            setTeams(teamsData);

            // Init form state
            setSelectedTeam(ticketData.assignedTeamId || '');
            setSelectedDate(ticketData.scheduledDate ? ticketData.scheduledDate.split('T')[0] : '');
        } catch (error) {
            console.error(error);
            toast.error('Błąd pobierania danych');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!id) return;
        loadData(id);
    }, [id, loadData]);

    const handleUpdateStatus = async (newStatus: ServiceTicketStatus) => {
        if (!ticket) return;
        try {
            await ServiceService.updateTicketWithHistory(ticket.id, { status: newStatus });
            toast.success('Status zaktualizowany');
            loadData(ticket.id);
        } catch (e: unknown) {
            toast.error('Błąd aktualizacji');
            console.error(e);
        }
    };

    const handleAssignTeam = async () => {
        if (!ticket) return;
        try {
            await ServiceService.updateTicketWithHistory(ticket.id, {
                assignedTeamId: selectedTeam,
                scheduledDate: selectedDate || undefined,
                status: 'scheduled' // Auto-update status
            });
            toast.success('Zaplanowano serwis');
            setIsAssignModalOpen(false);
            loadData(ticket.id);
        } catch (e: unknown) {
            toast.error('Błąd planowania');
            console.error(e);
        }
    };

    const handleAddTask = async () => {
        if (!ticket || !newTaskLabel.trim()) return;
        const newTask: ServiceTicketTask = {
            id: Math.random().toString(36).substr(2, 9),
            label: newTaskLabel,
            completed: false
        };
        const updatedTasks = [...(ticket.tasks || []), newTask];
        await ServiceService.updateTasks(ticket.id, updatedTasks);
        setNewTaskLabel('');
        // Optimistic update
        setTicket({ ...ticket, tasks: updatedTasks });
        // Background refresh to get history if we tracked it
    };

    const handleToggleTask = async (taskId: string, completed: boolean) => {
        if (!ticket) return;
        const updatedTasks = (ticket.tasks || []).map(t =>
            t.id === taskId ? { ...t, completed } : t
        );
        await ServiceService.updateTasks(ticket.id, updatedTasks);
        setTicket({ ...ticket, tasks: updatedTasks });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            new: 'bg-blue-100 text-blue-800',
            open: 'bg-yellow-100 text-yellow-800',
            scheduled: 'bg-purple-100 text-purple-800',
            in_progress: 'bg-indigo-100 text-indigo-800',
            resolved: 'bg-green-100 text-green-800',
            closed: 'bg-gray-800 text-white',
            rejected: 'bg-red-100 text-red-800'
        };
        const labels: Record<string, string> = {
            new: 'Nowe',
            open: 'Otwarta',
            scheduled: 'Zaplanowane',
            in_progress: 'W Realizacji',
            resolved: 'Rozwiązane',
            closed: 'Zamknięte',
            rejected: 'Odrzucone'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Ładowanie...</div>;
    if (!ticket) return null;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <button onClick={() => navigate('/service')} className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1 text-sm">
                        ← Powrót
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        {ticket.ticketNumber}
                        {getStatusBadge(ticket.status)}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => generateServiceProtocol(ticket)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                        </svg>
                        Pobierz Protokół
                    </button>
                    <select
                        value={ticket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as ServiceTicketStatus)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 border-none cursor-pointer font-medium"
                    >
                        <option className="text-gray-900 bg-white" value="new">Nowe</option>
                        <option className="text-gray-900 bg-white" value="open">Przyjęte</option>
                        <option className="text-gray-900 bg-white" value="scheduled">Zaplanowane</option>
                        <option className="text-gray-900 bg-white" value="in_progress">W Realizacji</option>
                        <option className="text-gray-900 bg-white" value="resolved">Rozwiązane</option>
                        <option className="text-gray-900 bg-white" value="closed">Zamknięte</option>
                        <option className="text-gray-900 bg-white" value="rejected">Odrzucone</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Informacje</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400">Klient</label>
                                <div className="font-medium text-gray-900">
                                    {ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : 'Guest'}
                                </div>
                                <div className="text-sm text-gray-500">{ticket.client?.phone}</div>
                                <div className="text-sm text-gray-500">{ticket.client?.street} {ticket.client?.houseNumber}, {ticket.client?.city}</div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400">Dotyczy</label>
                                <div className="text-sm text-gray-900 font-medium">{ticket.type}</div>
                                <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                                    {ticket.description}
                                </div>
                            </div>

                            {ticket.installation && (
                                <div>
                                    <label className="text-xs text-gray-400">Montaż Źródłowy</label>
                                    <div className="text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/installations/${ticket.installationId}`)}>
                                        Przejdź do montażu
                                    </div>
                                    <div className="text-xs text-gray-500">{ticket.installation.productSummary}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Photos Preview */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Zdjęcia</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {ticket.photos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded overflow-hidden border hover:opacity-75">
                                    <img src={url} className="w-full h-full object-cover" />
                                </a>
                            ))}
                            {ticket.photos.length === 0 && <span className="text-sm text-gray-400 col-span-3">Brak zdjęć</span>}
                        </div>
                    </div>
                </div>

                {/* Middle Column: Tasks & Execution */}
                <div className="space-y-6">

                    {/* Scheduling Card */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Planowanie</h3>
                            <button onClick={() => setIsAssignModalOpen(true)} className="text-sm text-blue-600 font-medium hover:text-blue-800">
                                {ticket.assignedTeam ? 'Zmień' : 'Przypisz'}
                            </button>
                        </div>

                        {ticket.assignedTeam ? (
                            <div className="bg-blue-50 rounded p-4 border border-blue-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                                        {ticket.assignedTeam.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-medium text-blue-900">{ticket.assignedTeam.name}</div>
                                        <div className="text-xs text-blue-700">Zespół Serwisowy</div>
                                    </div>
                                </div>
                                <div className="text-sm text-blue-800 flex items-center gap-2 mt-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    {ticket.scheduledDate ? format(new Date(ticket.scheduledDate), 'EEEE, d MMMM yyyy', { locale: pl }) : 'Nieustalona data'}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
                                <div className="text-gray-400 mb-2">Brak przypisanego zespołu</div>
                                <button onClick={() => setIsAssignModalOpen(true)} className="px-4 py-2 bg-white text-gray-700 text-sm border shadow-sm rounded hover:bg-gray-50">
                                    Przypisz Termin
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Checklist */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lista Czynności</h3>

                        <div className="space-y-2 mb-4">
                            {(ticket.tasks || []).map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {task.label}
                                    </span>
                                </div>
                            ))}
                            {(ticket.tasks || []).length === 0 && <div className="text-sm text-gray-400 italic text-center py-2">Brak zadań</div>}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTaskLabel}
                                onChange={(e) => setNewTaskLabel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                placeholder="Dodaj zadanie..."
                                className="flex-1 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={handleAddTask}
                                disabled={!newTaskLabel.trim()}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Resolution Section from old file re-incorporated */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notatki z Naprawy</h3>
                        <textarea
                            className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                            placeholder="Wpisz przebieg naprawy..."
                            defaultValue={ticket.resolutionNotes || ''}
                            onBlur={async (e) => {
                                if (e.target.value !== ticket.resolutionNotes) {
                                    await ServiceService.updateTicketWithHistory(ticket.id, { resolutionNotes: e.target.value }, "Zaktualizowano notatki z naprawy");
                                    toast.success('Zapisano');
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Right Column: Timeline */}
                <div className="bg-white rounded-lg shadow p-6 h-fit">
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Historia Zgłoszenia</h3>
                    <div className="relative border-l border-gray-200 ml-2 space-y-6">
                        {/* Current Status Node */}
                        <div className="mb-6 ml-4">
                            <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[6.5px] mt-1.5 border border-white"></div>
                            <span className="text-sm font-bold text-gray-900">Teraz</span>
                        </div>

                        {history.map((entry) => (
                            <div key={entry.id} className="ml-4 relative">
                                <div className="absolute w-3 h-3 bg-gray-200 rounded-full -left-[6.5px] mt-1.5 border border-white"></div>
                                <div className="text-xs text-gray-500 mb-0.5">
                                    {format(entry.createdAt, 'dd.MM HH:mm')} • {entry.user?.firstName}
                                </div>
                                <div className="text-sm text-gray-900">
                                    {entry.changeType === 'status' && (
                                        <span>Zmiana statusu: <span className="font-medium">{entry.oldValue}</span> → <span className="font-medium">{entry.newValue}</span></span>
                                    )}
                                    {entry.changeType === 'assignment' && (
                                        <span>Przypisanie: {entry.newValue}</span>
                                    )}
                                    {entry.changeType === 'note' && (
                                        <span className="italic">"{entry.newValue}"</span>
                                    )}
                                    {entry.changeType === 'info' && (
                                        <span>{entry.changeType}: {entry.oldValue} → {entry.newValue}</span>
                                    )}
                                    {/* Task changes not yet fully logged but handled if present */}
                                </div>
                            </div>
                        ))}

                        {/* Creation Node */}
                        <div className="ml-4">
                            <div className="absolute w-3 h-3 bg-gray-200 rounded-full -left-[6.5px] mt-1.5 border border-white"></div>
                            <div className="text-xs text-gray-500 mb-0.5">
                                {format(ticket.createdAt, 'dd.MM.yyyy HH:mm')}
                            </div>
                            <div className="text-sm text-gray-900">Utworzenie zgłoszenia</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Zaplanuj Serwis</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Zespół</label>
                                <select
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Wybierz zespół...</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleAssignTeam}
                                disabled={!selectedTeam || !selectedDate}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Zapisz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
