import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ServiceService } from '../../services/database/service.service';
import type { ServiceTicket, ServiceTicketStatus } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AddServiceTicketModal } from './AddServiceTicketModal';
import { useAuth } from '../../contexts/AuthContext';

export const ServiceDashboard = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [tickets, setTickets] = useState<ServiceTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ServiceTicketStatus | 'all'>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleDeleteTicket = async (ticket: ServiceTicket) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć zgłoszenie ${ticket.ticketNumber}?`)) return;
        const { error } = await ServiceService.deleteTicket(ticket.id);
        if (error) {
            toast.error('Błąd usuwania zgłoszenia');
        } else {
            toast.success('Zgłoszenie usunięte');
            fetchTickets();
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await ServiceService.getTickets();
            setTickets(data);
        } catch (error) {
            console.error(error);
            toast.error('Błąd pobierania zgłoszeń');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const filteredTickets = tickets.filter(t =>
        statusFilter === 'all' ? true : t.status === statusFilter
    );

    const getStatusBadge = (status: ServiceTicketStatus) => {
        switch (status) {
            case 'new': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Nowe</span>;
            case 'open': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Otwarte</span>;
            case 'scheduled': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Zaplanowane</span>;
            case 'resolved': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Rozwiązane</span>;
            case 'rejected': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Odrzucone</span>;
            default: return status;
        }
    };

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            leak: 'Przeciek',
            electrical: 'Elektryka',
            mechanical: 'Mechanika',
            visual: 'Wizualne',
            other: 'Inne'
        };
        return types[type] || type;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Zgłoszenia Serwisowe</h1>
                    <p className="text-gray-500">Zarządzanie reklamacjami i naprawami</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTickets}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Odśwież
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                    >
                        Dodaj Zgłoszenie
                    </button>
                </div>
            </div>

            <AddServiceTicketModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchTickets();
                }}
            />

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                    <option value="all">Wszystkie statusy</option>
                    <option value="new">Nowe</option>
                    <option value="open">W trakcie</option>
                    <option value="scheduled">Zaplanowane</option>
                    <option value="resolved">Zakończone</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Ładowanie...</div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Brak zgłoszeń</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nr Zgłoszenia</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klient / Kontrakt</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ / Opis</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium font-mono text-gray-900">
                                        {ticket.ticketNumber}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : 'Guest'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {ticket.contract?.contractNumber || 'Brak kontraktu'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 font-medium">
                                            {getTypeLabel(ticket.type)}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs" title={ticket.description}>
                                            {ticket.description}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(ticket.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: pl })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => navigate(`/service/${ticket.id}`)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Szczegóły
                                            </button>
                                            {isAdmin() && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket); }}
                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                    title="Usuń zgłoszenie"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div >
    );
};
