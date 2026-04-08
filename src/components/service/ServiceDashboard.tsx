import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ServiceService } from '../../services/database/service.service';
import type { ServiceTicket, ServiceTicketStatus } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AddServiceTicketModal } from './AddServiceTicketModal';
import { useAuth } from '../../contexts/AuthContext';

// ── Status config ──
const STATUS_CONFIG: Record<ServiceTicketStatus | string, { label: string; color: string; bg: string; dotColor: string }> = {
    new: { label: 'Nowe', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dotColor: 'bg-blue-500' },
    open: { label: 'Przyjęte', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', dotColor: 'bg-yellow-500' },
    scheduled: { label: 'Zaplanowane', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dotColor: 'bg-purple-500' },
    in_progress: { label: 'W realizacji', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', dotColor: 'bg-indigo-500' },
    resolved: { label: 'Rozwiązane', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dotColor: 'bg-emerald-500' },
    closed: { label: 'Zamknięte', color: 'text-slate-200', bg: 'bg-slate-800 border-slate-700', dotColor: 'bg-slate-400' },
    rejected: { label: 'Odrzucone', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dotColor: 'bg-red-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    low: { label: 'Niski', icon: '🟢', color: 'text-green-600' },
    medium: { label: 'Średni', icon: '🟡', color: 'text-yellow-600' },
    high: { label: 'Wysoki', icon: '🟠', color: 'text-orange-600' },
    critical: { label: 'Krytyczny', icon: '🔴', color: 'text-red-600' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
    leak: { label: 'Przeciek', icon: '💧' },
    electrical: { label: 'Elektryka', icon: '⚡' },
    mechanical: { label: 'Mechanika', icon: '⚙️' },
    visual: { label: 'Wizualne', icon: '👁️' },
    other: { label: 'Inne', icon: '📋' },
};

const ALL_STATUSES: ServiceTicketStatus[] = ['new', 'open', 'scheduled', 'in_progress', 'resolved', 'closed', 'rejected'];

// ── Helper: parse client name from description ──
function extractClientName(ticket: ServiceTicket): string {
    if (ticket.client) {
        const name = `${ticket.client.firstName || ''} ${ticket.client.lastName || ''}`.trim();
        if (name && name !== '') return name;
    }
    // Parse from description: "Klient: Lutz Vollmer\nAdres: ..."
    const match = ticket.description?.match(/Klient:\s*(.+?)(?:\n|Adres:|Telefon:|$)/i);
    if (match?.[1]) return match[1].trim();
    return 'Brak danych';
}

function extractClientCity(ticket: ServiceTicket): string {
    if (ticket.client?.city) return ticket.client.city;
    const match = ticket.description?.match(/Adres:\s*(.+?)(?:\n|Telefon:|$)/i);
    if (match?.[1]) {
        // Try to extract city from address string (usually last word before postal code)
        const parts = match[1].trim().split(/\s+/);
        if (parts.length >= 2) return parts[parts.length - 1];
        return match[1].trim();
    }
    return '';
}

function cleanDescription(desc: string): string {
    // Remove parsed client data prefix from description
    return desc
        .replace(/^Klient:\s*.+?\n?/i, '')
        .replace(/^Adres:\s*.+?\n?/i, '')
        .replace(/^Telefon:\s*.+?\n?/i, '')
        .trim() || desc;
}

// ── Quick Status Dropdown ──
const QuickStatusDropdown: React.FC<{
    ticket: ServiceTicket;
    onUpdate: (id: string, status: ServiceTicketStatus) => void;
}> = ({ ticket, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1.5`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                {cfg.label}
                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]">
                    {ALL_STATUSES.map(s => {
                        const sc = STATUS_CONFIG[s];
                        const isActive = ticket.status === s;
                        return (
                            <button
                                key={s}
                                onClick={() => { onUpdate(ticket.id, s); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${isActive ? 'font-bold bg-slate-50' : ''}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${sc.dotColor}`} />
                                {sc.label}
                                {isActive && <span className="ml-auto text-blue-500">✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════
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

    const handleQuickStatusUpdate = async (ticketId: string, newStatus: ServiceTicketStatus) => {
        try {
            await ServiceService.updateTicketWithHistory(ticketId, { status: newStatus });
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
            toast.success(`Status zmieniony na: ${STATUS_CONFIG[newStatus]?.label || newStatus}`, { duration: 1500 });
        } catch {
            toast.error('Błąd zmiany statusu');
        }
    };

    const filteredTickets = tickets.filter(t =>
        statusFilter === 'all' ? true : t.status === statusFilter
    );

    // ── KPI Counts ──
    const counts = {
        new: tickets.filter(t => t.status === 'new').length,
        open: tickets.filter(t => t.status === 'open').length,
        scheduled: tickets.filter(t => t.status === 'scheduled').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        critical: tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length,
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Zgłoszenia Serwisowe
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Zarządzanie reklamacjami i naprawami</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTickets}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Odśwież
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-sm font-medium flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
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

            {/* KPI Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
                {[
                    { key: 'new', label: 'Nowe', count: counts.new, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
                    { key: 'open', label: 'Przyjęte', count: counts.open, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500' },
                    { key: 'scheduled', label: 'Zaplanowane', count: counts.scheduled, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
                    { key: 'in_progress', label: 'W realizacji', count: counts.in_progress, color: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
                    { key: 'resolved', label: 'Rozwiązane', count: counts.resolved, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                    { key: 'critical', label: 'Pilne', count: counts.critical, color: counts.critical > 0 ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200', text: counts.critical > 0 ? 'text-red-700' : 'text-slate-500', dot: counts.critical > 0 ? 'bg-red-500' : 'bg-slate-400' },
                ].map(kpi => (
                    <button
                        key={kpi.key}
                        onClick={() => setStatusFilter(kpi.key === 'critical' ? 'all' : kpi.key as any)}
                        className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${kpi.color} ${statusFilter === kpi.key ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2 h-2 rounded-full ${kpi.dot}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${kpi.text} opacity-70`}>{kpi.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${kpi.text}`}>{kpi.count}</p>
                    </button>
                ))}
            </div>

            {/* Filter */}
            <div className="bg-white p-3 rounded-xl shadow-sm mb-4 flex gap-3 items-center border border-slate-100">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border-gray-200 rounded-lg shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                >
                    <option value="all">Wszystkie statusy</option>
                    {ALL_STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                </select>
                <span className="text-xs text-slate-400 ml-auto">{filteredTickets.length} zgłoszeń</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <svg className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Ładowanie...
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Brak zgłoszeń dla wybranego filtra
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nr</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Klient</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Typ</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priorytet</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {filteredTickets.map((ticket) => {
                                const clientName = extractClientName(ticket);
                                const clientCity = extractClientCity(ticket);
                                const typeInfo = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
                                const priorityInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                                const desc = cleanDescription(ticket.description || '');

                                return (
                                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="font-mono font-bold text-sm text-slate-700">{ticket.ticketNumber}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-slate-800">{clientName}</div>
                                            {clientCity && <div className="text-[11px] text-slate-400">{clientCity}</div>}
                                            {ticket.contract?.contractNumber && (
                                                <div className="text-[10px] text-blue-500 font-mono">{ticket.contract.contractNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-base">{typeInfo.icon}</span>
                                                <span className="text-xs font-medium text-slate-600">{typeInfo.label}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={desc}>
                                                {desc}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-xs font-medium ${priorityInfo.color}`}>
                                                {priorityInfo.icon} {priorityInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <QuickStatusDropdown
                                                ticket={ticket}
                                                onUpdate={handleQuickStatusUpdate}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                            {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: pl })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/service/${ticket.id}`)}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Szczegóły →
                                                </button>
                                                {isAdmin() && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket); }}
                                                        className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
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
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
