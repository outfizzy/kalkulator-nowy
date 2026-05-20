import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ServiceService } from '../../services/database/service.service';
import type { ServiceTicket, ServiceTicketStatus } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AddServiceTicketModal } from './AddServiceTicketModal';
import { useAuth } from '../../contexts/AuthContext';
import {
    Wrench, Plus, RefreshCw, Search, Trash2, ChevronRight,
    ChevronDown, AlertTriangle, Clock, CheckCircle2, XCircle,
    CalendarCheck, Play, Inbox, ArrowRight
} from 'lucide-react';

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
                <ChevronDown className="w-3 h-3 opacity-50" />
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
    const [searchQuery, setSearchQuery] = useState('');
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

    // ── Filtered + Searched tickets ──
    const filteredTickets = tickets.filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const clientName = extractClientName(t).toLowerCase();
            const city = extractClientCity(t).toLowerCase();
            const desc = (t.description || '').toLowerCase();
            const num = (t.ticketNumber || '').toLowerCase();
            const contractNum = (t.contract?.contractNumber || '').toLowerCase();
            return clientName.includes(q) || city.includes(q) || desc.includes(q) || num.includes(q) || contractNum.includes(q);
        }
        return true;
    });

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
        <div className="space-y-5 pb-20 max-w-[1600px] mx-auto">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Zgłoszenia Serwisowe</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Zarządzanie reklamacjami i naprawami &middot; {tickets.length} zgłoszeń</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTickets}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                        title="Odśwież"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm text-sm"
                    >
                        <Plus className="w-4 h-4" />
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

            {/* ═══ KPI Cards ═══ */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                    { key: 'new', label: 'Nowe', count: counts.new, icon: <Inbox className="w-4 h-4" />, gradient: 'from-blue-500 to-blue-600' },
                    { key: 'open', label: 'Przyjęte', count: counts.open, icon: <Clock className="w-4 h-4" />, gradient: 'from-amber-500 to-amber-600' },
                    { key: 'scheduled', label: 'Zaplanowane', count: counts.scheduled, icon: <CalendarCheck className="w-4 h-4" />, gradient: 'from-purple-500 to-purple-600' },
                    { key: 'in_progress', label: 'W realizacji', count: counts.in_progress, icon: <Play className="w-4 h-4" />, gradient: 'from-indigo-500 to-indigo-600' },
                    { key: 'resolved', label: 'Rozwiązane', count: counts.resolved, icon: <CheckCircle2 className="w-4 h-4" />, gradient: 'from-emerald-500 to-emerald-600' },
                    { key: 'critical', label: 'Pilne', count: counts.critical, icon: <AlertTriangle className="w-4 h-4" />, gradient: counts.critical > 0 ? 'from-red-500 to-red-600' : 'from-slate-400 to-slate-500' },
                ].map(kpi => (
                    <button
                        key={kpi.key}
                        onClick={() => setStatusFilter(kpi.key === 'critical' ? 'all' : kpi.key as ServiceTicketStatus)}
                        className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-3 sm:p-4 text-white shadow-sm relative overflow-hidden text-left transition-all hover:shadow-md ${statusFilter === kpi.key ? 'ring-2 ring-offset-2 ring-indigo-400' : ''}`}
                    >
                        <div className="absolute top-2 right-2 bg-white/10 rounded-lg p-1.5">{kpi.icon}</div>
                        <p className="text-white/80 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">{kpi.label}</p>
                        <h3 className="text-2xl sm:text-3xl font-bold mt-0.5">{kpi.count}</h3>
                    </button>
                ))}
            </div>

            {/* ═══ Search + Filter ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Szukaj po nr zgłoszenia, kliencie, opisie..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ServiceTicketStatus | 'all')}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="all">Wszystkie statusy</option>
                            {ALL_STATUSES.map(s => (
                                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredTickets.length} zgłoszeń</span>
                    </div>
                </div>
            </div>

            {/* ═══ Mobile Cards ═══ */}
            <div className="lg:hidden space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-400 text-sm">{searchQuery ? `Brak wyników dla "${searchQuery}"` : 'Brak zgłoszeń dla wybranego filtra'}</p>
                    </div>
                ) : filteredTickets.map((ticket) => {
                    const clientName = extractClientName(ticket);
                    const clientCity = extractClientCity(ticket);
                    const typeInfo = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
                    const priorityInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                    const desc = cleanDescription(ticket.description || '');

                    return (
                        <div key={ticket.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                            {/* Top: Ticket # + Status */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-slate-700">{ticket.ticketNumber}</span>
                                    <span className={`text-xs font-medium ${priorityInfo.color}`}>
                                        {priorityInfo.icon}
                                    </span>
                                </div>
                                <QuickStatusDropdown ticket={ticket} onUpdate={handleQuickStatusUpdate} />
                            </div>

                            {/* Client info */}
                            <div className="mb-3">
                                <div className="font-semibold text-slate-900 text-sm">{clientName}</div>
                                {clientCity && <div className="text-xs text-slate-400">{clientCity}</div>}
                                {ticket.contract?.contractNumber && (
                                    <div className="text-[10px] text-indigo-500 font-mono mt-0.5">{ticket.contract.contractNumber}</div>
                                )}
                            </div>

                            {/* Type + Description */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div className="text-slate-500">Typ:</div>
                                <div className="text-right">
                                    <span className="text-base mr-1">{typeInfo.icon}</span>
                                    <span className="font-medium text-slate-700">{typeInfo.label}</span>
                                </div>
                                <div className="text-slate-500">Priorytet:</div>
                                <div className={`text-right font-medium ${priorityInfo.color}`}>{priorityInfo.icon} {priorityInfo.label}</div>
                                <div className="text-slate-500">Data:</div>
                                <div className="text-right text-slate-600">{format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: pl })}</div>
                            </div>

                            {desc && (
                                <p className="text-xs text-slate-500 line-clamp-2 mb-3 bg-slate-50 rounded-lg p-2">{desc}</p>
                            )}

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => navigate(`/service/${ticket.id}`)}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    Szczegóły <ArrowRight className="w-3 h-3" />
                                </button>
                                {isAdmin() && (
                                    <button
                                        onClick={() => handleDeleteTicket(ticket)}
                                        className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                        title="Usuń zgłoszenie"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ Desktop Table ═══ */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-400 text-sm">{searchQuery ? `Brak wyników dla "${searchQuery}"` : 'Brak zgłoszeń dla wybranego filtra'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nr</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Klient</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Typ</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Priorytet</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Data</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => {
                                    const clientName = extractClientName(ticket);
                                    const clientCity = extractClientCity(ticket);
                                    const typeInfo = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
                                    const priorityInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                                    const desc = cleanDescription(ticket.description || '');

                                    return (
                                        <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="font-mono font-bold text-sm text-slate-700">{ticket.ticketNumber}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="text-sm font-semibold text-slate-800">{clientName}</div>
                                                {clientCity && <div className="text-[11px] text-slate-400">{clientCity}</div>}
                                                {ticket.contract?.contractNumber && (
                                                    <div className="text-[10px] text-indigo-500 font-mono">{ticket.contract.contractNumber}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-base">{typeInfo.icon}</span>
                                                    <span className="text-xs font-medium text-slate-600">{typeInfo.label}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={desc}>
                                                    {desc}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`text-xs font-medium ${priorityInfo.color}`}>
                                                    {priorityInfo.icon} {priorityInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <QuickStatusDropdown
                                                    ticket={ticket}
                                                    onUpdate={handleQuickStatusUpdate}
                                                />
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                                                {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: pl })}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => navigate(`/service/${ticket.id}`)}
                                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        Szczegóły <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                    {isAdmin() && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket); }}
                                                            className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Usuń zgłoszenie"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
