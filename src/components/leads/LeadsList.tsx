import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Lead, LeadStatus } from '../../types';
// import { useAuth } from '../../contexts/AuthContext';

export const LeadsList: React.FC = () => {
    // const { currentUser } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const loadLeads = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getLeads();
            setLeads(data);
        } catch (error) {
            console.error('Error loading leads:', error);
            toast.error('Nie udało się załadować listy leadów');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const filteredLeads = leads.filter(lead => {
        if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
        return true;
    }).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const getStatusBadge = (status: LeadStatus) => {
        const styles: Record<LeadStatus, string> = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            offer_sent: 'bg-indigo-100 text-indigo-800',
            negotiation: 'bg-purple-100 text-purple-800',
            won: 'bg-green-100 text-green-800',
            lost: 'bg-red-100 text-red-800'
        };
        const labels: Record<LeadStatus, string> = {
            new: 'Nowy',
            contacted: 'Skontaktowano',
            offer_sent: 'Oferta Wysłana',
            negotiation: 'Negocjacje',
            won: 'Wygrany',
            lost: 'Utracony'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie leadów...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Leady</h1>
                    <p className="text-slate-500 mt-1">Zarządzaj potencjalnymi klientami</p>
                </div>
                <Link
                    to="/leads/new"
                    className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 justify-center"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Dodaj Leada
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Status:</span>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none"
                    >
                        <option value="all">Wszystkie</option>
                        <option value="new">Nowy</option>
                        <option value="contacted">Skontaktowano</option>
                        <option value="offer_sent">Oferta Wysłana</option>
                        <option value="negotiation">Negocjacje</option>
                        <option value="won">Wygrany</option>
                        <option value="lost">Utracony</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Sortuj:</span>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-1 text-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                    >
                        Data dodania
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredLeads.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <p>Brak leadów spełniających kryteria.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Klient</th>
                                    <th className="px-6 py-3">Kontakt</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Przypisany</th>
                                    <th className="px-6 py-3 text-right">Dodano</th>
                                    <th className="px-6 py-3 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {lead.customerData.firstName} {lead.customerData.lastName}
                                            </div>
                                            {lead.customerData.companyName && (
                                                <div className="text-xs text-slate-500">{lead.customerData.companyName}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.customerData.phone && (
                                                <div className="text-slate-700">{lead.customerData.phone}</div>
                                            )}
                                            {lead.customerData.email && (
                                                <div className="text-xs text-slate-500">{lead.customerData.email}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-500">
                                            {new Date(lead.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Future: Add Details/Edit Link */}
                                            <Link
                                                to={`/leads/${lead.id}`}
                                                className="text-accent hover:text-accent-dark font-medium"
                                            >
                                                Szczegóły
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
