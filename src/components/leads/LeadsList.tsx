import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Lead, LeadStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { LeadsKanban } from './LeadsKanban';
import { LeadsFunnelChart } from './LeadsFunnelChart';
import { LeadsStats } from './LeadsStats';

export const LeadsList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [showStats, setShowStats] = useState(false);
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [groupByRegion, setGroupByRegion] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const loadLeads = async () => {
        setLoading(true);
        try {
            const leadsData = await DatabaseService.getLeads();
            setLeads(leadsData);
        } catch (error) {
            console.error('Error loading leads:', error);
            toast.error('Nie udało się załadować listy leadów');
        } finally {
            setLoading(false);
        }
    };


    const handleLeadUpdate = () => {
        loadLeads(); // Refresh data after kanban drop
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const filteredLeads = leads.filter(lead => {
        // Standard status filter
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

    // Grouping Logic
    const groupedLeads = groupByRegion ? filteredLeads.reduce((acc, lead) => {
        // Germany PLZ is 5 digits. Use first 2 for region, or 1 if it's short?
        // Let's take first 2 digits of postalCode if available, else "Brak kodu"
        const plz = lead.customerData.postalCode?.replace(/\D/g, '') || '';
        const region = plz.length >= 2 ? `PLZ ${plz.substring(0, 2)}xxx` : 'Inne / Brak kodu';

        if (!acc[region]) acc[region] = [];
        acc[region].push(lead);
        return acc;
    }, {} as Record<string, typeof leads>) : { 'Wszystkie': filteredLeads };

    // Sort regions numeric if they are PLZ
    const sortedRegions = Object.keys(groupedLeads).sort((a, b) => {
        if (a.startsWith('PLZ') && b.startsWith('PLZ')) return a.localeCompare(b);
        if (a === 'Inne / Brak kodu') return 1;
        if (b === 'Inne / Brak kodu') return -1;
        return a.localeCompare(b);
    });

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie leadów...</div>;
    }

    const LeadsTable = ({ items }: { items: Lead[] }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Klient</th>
                        <th className="px-6 py-3">Lokalizacja</th>
                        <th className="px-6 py-3">Kontakt</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Przypisany</th>
                        <th className="px-6 py-3 text-right">Dodano</th>
                        <th className="px-6 py-3 text-right">Akcje</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div
                                    className="font-medium text-slate-900 cursor-pointer hover:text-accent"
                                    onClick={() => navigate(`/leads/${lead.id}`)}
                                >
                                    {lead.customerData.firstName} {lead.customerData.lastName}
                                </div>
                                {lead.customerData.companyName && (
                                    <div className="text-xs text-slate-500">{lead.customerData.companyName}</div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {(lead.customerData.city || lead.customerData.postalCode || lead.customerData.address) ? (
                                    <div className="text-slate-700 text-sm flex flex-col">
                                        <div>
                                            {lead.customerData.postalCode && <span className="font-mono text-xs bg-slate-100 px-1 rounded mr-1">{lead.customerData.postalCode}</span>}
                                            {lead.customerData.city}
                                        </div>
                                        {lead.customerData.address && (
                                            <div className="text-xs text-slate-500 mt-0.5">{lead.customerData.address}</div>
                                        )}
                                    </div>
                                ) : <span className="text-slate-400">-</span>}
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
                                {lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName} ` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500">
                                {new Date(lead.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            navigate('/new-offer', {
                                                state: {
                                                    customer: lead.customerData,
                                                    leadId: lead.id
                                                }
                                            });
                                        }}
                                        className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 bg-green-50 px-2 py-1 rounded"
                                    >
                                        + Oferta
                                    </button>
                                    <button
                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                        className="text-accent hover:text-accent-dark font-medium cursor-pointer"
                                    >
                                        Szczegóły
                                    </button>
                                    {isAdmin() && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Czy na pewno chcesz usunąć tego leada? Operacja jest nieodwracalna.')) {
                                                    try {
                                                        await DatabaseService.deleteLead(lead.id);
                                                        toast.success('Lead został usunięty');
                                                        loadLeads();
                                                    } catch (error) {
                                                        console.error('Failed to delete lead:', error);
                                                        toast.error('Błąd usuwania leada');
                                                    }
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 ml-2 p-1 hover:bg-red-50 rounded"
                                            title="Usuń (Admin)"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Leady</h1>
                    <p className="text-slate-500 mt-1">Zarządzaj potencjalnymi klientami</p>
                </div>
                <div className="flex gap-4">
                    {/* View Toggle */}
                    <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center">
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`p-2 rounded-md transition-all ${showStats ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Pokaż Statystyki"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Lista"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Tablica Kanban"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
                            </svg>
                        </button>
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
            </div>

            {/* Stats Section */}
            {showStats && (
                <div className="space-y-6">
                    <LeadsStats leads={filteredLeads} />
                    <LeadsFunnelChart leads={filteredLeads} />
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4">
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
                    {viewMode === 'list' && (
                        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={groupByRegion}
                                    onChange={(e) => setGroupByRegion(e.target.checked)}
                                    className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-slate-600">Grupuj wg Regionu (PLZ)</span>
                            </label>
                        </div>
                    )}
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

            {viewMode === 'kanban' ? (
                <LeadsKanban leads={filteredLeads} onLeadUpdate={handleLeadUpdate} />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {filteredLeads.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <p>Brak leadów spełniających kryteria.</p>
                        </div>
                    ) : (
                        groupByRegion ? (
                            <div className="divide-y divide-slate-100">
                                {sortedRegions.map(region => (
                                    <div key={region}>
                                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700">{region}</h3>
                                            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full text-xs font-medium text-slate-500">
                                                {groupedLeads[region].length}
                                            </span>
                                        </div>
                                        <LeadsTable items={groupedLeads[region]} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <LeadsTable items={filteredLeads} />
                        )
                    )}
                </div>
            )}
        </div>
    );
};
