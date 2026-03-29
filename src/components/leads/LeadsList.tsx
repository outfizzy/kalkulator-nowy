import React, { useState, useEffect } from 'react';
import { formatPhoneDisplay } from '../../utils/phone';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { OfferService } from '../../services/database/offer.service';
import { FairService, type Fair } from '../../services/database/fair.service';
import { MeasurementService } from '../../services/database/measurement.service';
import type { Lead, LeadStatus, User, Measurement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { LeadsKanban } from './LeadsKanban';
import { LeadsFunnelChart } from './LeadsFunnelChart';
import { LeadsStats } from './LeadsStats';
import { LeadsMap } from './LeadsMap';
import { ConfiguratorService } from '../../services/database/configurator.service';

export const LeadsList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [fairs, setFairs] = useState<Fair[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'map'>('kanban');
    const [showStats, setShowStats] = useState(false);
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [filterFair, setFilterFair] = useState<string>('all'); // 'all' | 'website' | 'fair_all' | specific_fair_id
    const [groupByRegion, setGroupByRegion] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [leadActivity, setLeadActivity] = useState<Map<string, { count: number; lastActivity: Date | null; isHot: boolean }>>(new Map());
    const [completedFormLeadIds, setCompletedFormLeadIds] = useState<Set<string>>(new Set());

    const loadData = async () => {
        setLoading(true);
        try {
            const [leadsData, fairsData, usersData, measurementsData] = await Promise.all([
                DatabaseService.getLeads(),
                FairService.getAllFairs(),
                DatabaseService.getAllUsers(),
                MeasurementService.getMeasurements()
            ]);
            setLeads(leadsData);
            setFairs(fairsData);
            setUsers(usersData);
            setMeasurements(measurementsData);

            // Fetch activity for leads
            const leadIds = leadsData.map(l => l.id);
            const activity = await OfferService.getRecentLeadActivity(leadIds);
            setLeadActivity(activity);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Nie udało się załadować danych');
        } finally {
            setLoading(false);
        }
    };

    const handleLeadUpdate = () => {
        loadData(); // Refresh data after kanban drop
    };

    useEffect(() => {
        loadData();
    }, []);

    // Track which leads have completed configurator forms
    useEffect(() => {
        if (leads.length === 0) { setCompletedFormLeadIds(new Set()); return; }
        const checkForms = async () => {
            const completed = new Set<string>();
            for (const lead of leads) {
                try {
                    const cfgs = await ConfiguratorService.getByLeadId(lead.id);
                    if (cfgs.some(c => c.status === 'completed')) {
                        completed.add(lead.id);
                    }
                } catch { /* ignore */ }
            }
            setCompletedFormLeadIds(completed);
        };
        checkForms();
    }, [leads]);

    const filteredLeads = leads.filter(lead => {
        // Status filter
        if (filterStatus !== 'all' && lead.status !== filterStatus) return false;

        // Fair / Source filter
        if (filterFair !== 'all') {
            if (filterFair === 'website') {
                if (lead.source === 'targi') return false;
            } else if (filterFair === 'fair_all') {
                if (lead.source !== 'targi') return false;
            } else {
                // Specific fair ID
                if (lead.fairId !== filterFair) return false;
            }
        }

        // Assignee Filter
        if (filterAssignee !== 'all') {
            if (filterAssignee === 'unassigned') {
                if (lead.assignedTo) return false;
            } else {
                if (lead.assignedTo !== filterAssignee) return false;
            }
        }

        // Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const customer = lead.customerData;

            // Basic Fields
            const matchesBasic = (
                (customer.firstName || '').toLowerCase().includes(query) ||
                (customer.lastName || '').toLowerCase().includes(query) ||
                (customer.companyName || '').toLowerCase().includes(query) ||
                (customer.city || '').toLowerCase().includes(query) ||
                (customer.phone || '').includes(query) ||
                (customer.email || '').toLowerCase().includes(query)
            );

            if (matchesBasic) return true;

            // Fair Name lookup
            if (lead.source === 'targi' && lead.fairId) {
                const fair = fairs.find(f => f.id === lead.fairId);
                if (fair && fair.name.toLowerCase().includes(query)) return true;
                if (!fair && 'targi'.includes(query)) return true; // generic match
            }

            return false;
        }

        return true;
    }).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const getStatusBadge = (status: LeadStatus) => {
        const styles: Record<string, string> = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            formularz: 'bg-teal-100 text-teal-800',
            measurement_scheduled: 'bg-cyan-100 text-cyan-800',
            measurement_completed: 'bg-purple-100 text-purple-800',
            offer_sent: 'bg-indigo-100 text-indigo-800',
            negotiation: 'bg-purple-100 text-purple-800',
            won: 'bg-green-100 text-green-800',
            lost: 'bg-red-100 text-red-800',
            fair: 'bg-pink-100 text-pink-800'
        };
        const labels: Record<string, string> = {
            new: 'Nowy',
            contacted: 'Skontaktowano',
            formularz: 'Nowy (Form.)',
            measurement_scheduled: 'Umówiony na pomiar',
            measurement_completed: 'Pomiar odbył się',
            offer_sent: 'Oferta Wysłana',
            negotiation: 'Negocjacje',
            won: 'Wygrany',
            lost: 'Utracony',
            fair: 'Targi (Nowy)'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    // Grouping Logic
    const groupedLeads = groupByRegion ? filteredLeads.reduce((acc, lead) => {
        const plz = lead.customerData.postalCode?.replace(/\D/g, '') || '';
        const region = plz.length >= 2 ? `PLZ ${plz.substring(0, 2)}xxx` : 'Inne / Brak kodu';

        if (!acc[region]) acc[region] = [];
        acc[region].push(lead);
        return acc;
    }, {} as Record<string, typeof leads>) : { 'Wszystkie': filteredLeads };

    const sortedRegions = Object.keys(groupedLeads).sort();

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie leadów...</div>;
    }

    const LeadsTable = ({ items }: { items: Lead[] }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Klient</th>
                        <th className="px-6 py-3">Źródło / Lokalizacja</th>
                        <th className="px-6 py-3">Kontakt</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Umówiony na pomiar</th>
                        <th className="px-6 py-3">Po pomiarze</th>
                        <th className="px-6 py-3">Przypisany</th>
                        <th className="px-6 py-3 text-right">Dodano</th>
                        <th className="px-6 py-3 text-right">Akcje</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.map((lead) => {
                        const fair = lead.fairId ? fairs.find(f => f.id === lead.fairId) : null;
                        const leadMeasurements = measurements.filter(m => m.leadId === lead.id);
                        const scheduledMeasurement = leadMeasurements.find(m => m.status === 'scheduled');
                        const completedMeasurement = leadMeasurements.find(m => m.status === 'completed');

                        return (
                            <tr key={lead.id} className={`hover:bg-slate-50 transition-colors ${leadActivity.get(lead.id)?.isHot ? 'bg-orange-50/50' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="font-medium text-slate-900 cursor-pointer hover:text-accent"
                                            onClick={() => navigate(`/leads/${lead.id}`)}
                                        >
                                            {lead.customerData.firstName} {lead.customerData.lastName}
                                        </div>
                                        {leadActivity.get(lead.id)?.isHot && (
                                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 animate-pulse flex items-center gap-1" title="Aktywność w ciągu 24h">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                                                HOT
                                            </span>
                                        )}
                                        {completedFormLeadIds.has(lead.id) && (
                                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-0.5" title="Formularz konfiguracji wypełniony">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                            </span>
                                        )}
                                    </div>
                                    {lead.customerData.companyName && (
                                        <div className="text-xs text-slate-500">{lead.customerData.companyName}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-700 text-sm flex flex-col gap-1">
                                        {/* Source Badge */}
                                        {lead.source === 'targi' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 self-start">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                {fair?.name || 'Targi'}
                                            </span>
                                        ) : lead.source === 'website' ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                Strona WWW
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">{lead.source || 'Inne'}</span>
                                        )}

                                        {/* Location */}
                                        {(lead.customerData.city || lead.customerData.postalCode) && (
                                            <div className="flex items-center text-slate-600 mt-0.5">
                                                {lead.customerData.postalCode && <span className="font-mono text-xs bg-slate-100 px-1 rounded mr-1">{lead.customerData.postalCode}</span>}
                                                {lead.customerData.city}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {lead.customerData.phone && (
                                        <div className="text-slate-700">{formatPhoneDisplay(lead.customerData.phone)}</div>
                                    )}
                                    {lead.customerData.email && (
                                        <div className="text-xs text-slate-500">{lead.customerData.email}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {getStatusBadge(lead.status)}
                                        {lead.status === 'lost' && (lead.lostByName || lead.lostReason) && (
                                            <div className="text-[10px] text-red-500 mt-0.5">
                                                {lead.lostByName && <span className="font-medium inline-flex items-center gap-0.5"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg> {lead.lostByName}</span>}
                                                {lead.lostReason && <div className="text-slate-400 truncate max-w-[120px]" title={lead.lostReason}>{lead.lostReason}</div>}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {scheduledMeasurement ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                {new Date(scheduledMeasurement.scheduledDate).toLocaleDateString('pl-PL')}
                                            </span>
                                            {scheduledMeasurement.salesRepName && (
                                                <span className="text-xs text-slate-500">{scheduledMeasurement.salesRepName}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {completedMeasurement && !lead.status.includes('won') ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Zastanawia się
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                Pomiar: {new Date(completedMeasurement.scheduledDate).toLocaleDateString('pl-PL')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                    )}
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
                                            onClick={() => navigate(`/new-offer`, { state: { customer: lead.customerData, leadId: lead.id } })}
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
                                                    if (window.confirm('Czy na pewno chcesz usunąć tego leada? Ta operacja jest nieodwracalna.')) {
                                                        try {
                                                            await DatabaseService.deleteLead(lead.id);
                                                            toast.success('Lead został usunięty');
                                                            loadData();
                                                        } catch (err: any) {
                                                            console.error('Failed to delete lead:', err);
                                                            toast.error(err.message || 'Nie udało się usunąć leada');
                                                        }
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700 ml-2 p-1 hover:bg-red-50 rounded"
                                                title="Usuń Lead"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Leady</h1>
                    <p className="text-slate-500 mt-1">Zarządzaj potencjalnymi klientami</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center">
                        <button onClick={() => setShowStats(!showStats)} className={`p-2 rounded-md ${showStats ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg>
                        </button>
                        <button onClick={() => setViewMode('map')} className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`} title="Mapa">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>

                    <Link to="/leads/new" className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                        + Dodaj Leada
                    </Link>
                </div>
            </div>

            {showStats && (
                <div className="space-y-6">
                    <LeadsStats leads={filteredLeads} fairs={fairs} />
                    <LeadsFunnelChart leads={filteredLeads} />
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 flex-wrap flex-1">
                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Szukaj (Klient, Miasto, Targi...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-1.5 text-sm outline-none w-64 focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="w-px h-8 bg-slate-100 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Status:</span>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none">
                            <option value="all">Wszystkie</option>
                            <option value="new">Nowy</option>
                            <option value="fair">Targi (Nowy)</option>
                            <option value="contacted">Skontaktowano</option>
                            <option value="formularz">Nowy (Formularz)</option>
                            <option value="measurement_scheduled">Umówiony na pomiar</option>
                            <option value="measurement_completed">Pomiar odbył się</option>
                            <option value="offer_sent">Oferta</option>
                            <option value="negotiation">Negocjacje</option>
                            <option value="won">Wygrany</option>
                            <option value="lost">Utracony</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Źródło:</span>
                        <select
                            value={filterFair}
                            onChange={(e) => setFilterFair(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none min-w-[150px]"
                        >
                            <option value="all">Wszystkie Źródła</option>
                            <option value="website">Strona WWW / Inne</option>
                            <option value="fair_all">Targi (Wszystkie)</option>
                            {fairs.map(fair => (
                                <option key={fair.id} value={fair.id}>
                                    ⬡ {fair.name} {fair.is_active ? '(Aktywne)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Opiekun:</span>
                        <select
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none min-w-[150px]"
                        >
                            <option value="all">Wszyscy</option>
                            <option value="unassigned">Nieprzypisany</option>
                            {users.filter(u => u.role === 'sales_rep' || u.role === 'admin' || u.role === 'manager').map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {viewMode === 'list' && (
                        <label className="flex items-center gap-2 cursor-pointer border-l pl-4 border-slate-200">
                            <input type="checkbox" checked={groupByRegion} onChange={(e) => setGroupByRegion(e.target.checked)} className="w-4 h-4 text-accent border-slate-300 rounded" />
                            <span className="text-sm font-medium text-slate-600">Grupuj wg Regionu</span>
                        </label>
                    )}
                </div>

                <button onClick={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')} className="text-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    {sortOrder === 'desc' ? 'Najnowsze' : 'Najstarsze'}
                </button>
            </div>

            {viewMode === 'map' ? (
                <LeadsMap leads={filteredLeads} />
            ) : viewMode === 'kanban' ? (
                <LeadsKanban leads={filteredLeads} onLeadUpdate={handleLeadUpdate} />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {filteredLeads.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Brak leadów.</div>
                    ) : groupByRegion ? (
                        <div className="divide-y divide-slate-100">
                            {sortedRegions.map(region => (
                                <div key={region}>
                                    <div className="bg-slate-50 px-6 py-3 border-b flex justify-between">
                                        <h3 className="font-bold text-slate-700">{region}</h3>
                                        <span className="text-xs bg-white border px-2 rounded-full">{groupedLeads[region].length}</span>
                                    </div>
                                    <LeadsTable items={groupedLeads[region]} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <LeadsTable items={filteredLeads} />
                    )}
                </div>
            )}
        </div>
    );
};
