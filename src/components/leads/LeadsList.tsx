import React, { useState, useEffect, useCallback } from 'react';
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
import { BarChart3, List, LayoutGrid, MapPin, Search, Trash2, Flame, ClipboardCheck, Building2, Globe, Calendar, Clock, User as UserIcon, Plus, ArrowDownUp, CheckCircle2, FileText, X, Loader2, UserPlus, Users, Trophy } from 'lucide-react';


export const LeadsList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [fairs, setFairs] = useState<Fair[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    const { isAdmin, currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'map'>('kanban');
    const [showStats, setShowStats] = useState(false);
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    // ── Market switcher: pl = zadaszto.pl, de = polendach24.de ──
    const isPLOnly = currentUser?.role === 'sales_rep_pl';
    const isDEOnly = currentUser?.role === 'sales_rep'; // DE rep sees only DE
    const canSwitchMarket = isAdmin() || currentUser?.role === 'manager';
    const [marketFilter, setMarketFilter] = useState<'de' | 'pl'>(isPLOnly ? 'pl' : 'de');
    const [filterFair, setFilterFair] = useState<string>(isPLOnly ? 'website_pl' : 'all'); // 'all' | 'website' | 'website_pl' | 'fair_all' | specific_fair_id
    const [groupByRegion, setGroupByRegion] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [leadActivity, setLeadActivity] = useState<Map<string, { count: number; lastActivity: Date | null; isHot: boolean }>>(new Map());
    const [completedFormLeadIds, setCompletedFormLeadIds] = useState<Set<string>>(new Set());
    const [showClosedLeads, setShowClosedLeads] = useState(false);
    const [loadingClosed, setLoadingClosed] = useState(false);
    // Bulk actions
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<string>('');
    const [bulkAssignee, setBulkAssignee] = useState<string>('');
    const [bulkStatus, setBulkStatus] = useState<string>('');
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // Phase 1: Load active pipeline leads (excludes won/lost for fast initial render)
            const [leadsData, fairsData, usersData, measurementsData] = await Promise.all([
                DatabaseService.getLeads({ excludeStatuses: ['won', 'lost'] }),
                FairService.getAllFairs(),
                DatabaseService.getAllUsers(),
                MeasurementService.getMeasurements()
            ]);
            setLeads(leadsData);
            setFairs(fairsData);
            setUsers(usersData);
            setMeasurements(measurementsData);

            // Fetch activity for pipeline leads
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

    // Phase 2: Load won/lost leads when user toggles them on
    const loadClosedLeads = async () => {
        if (loadingClosed) return;
        setLoadingClosed(true);
        try {
            const closedLeads = await DatabaseService.getLeads({
                excludeStatuses: ['new', 'formularz', 'contacted', 'offer_sent', 'measurement_scheduled', 'measurement_completed', 'negotiation', 'fair']
            });
            setLeads(prev => {
                const existingIds = new Set(prev.map(l => l.id));
                const newLeads = closedLeads.filter(l => !existingIds.has(l.id));
                return [...prev, ...newLeads];
            });
        } catch (error) {
            console.error('Error loading closed leads:', error);
        } finally {
            setLoadingClosed(false);
        }
    };

    const handleLeadUpdate = () => {
        loadData(); // Refresh data after kanban drop
    };

    useEffect(() => {
        loadData();
    }, []);

    // Track which leads have completed configurator forms — derived from already-loaded data (zero queries)
    useEffect(() => {
        const completed = new Set<string>();
        for (const lead of leads) {
            if ((lead.customerData as any)?.configurationCompletedAt) {
                completed.add(lead.id);
            }
        }
        setCompletedFormLeadIds(completed);
    }, [leads]);

    const filteredLeads = leads.filter(lead => {
        // Hide won/lost unless explicitly toggled or filtering by that status
        if (!showClosedLeads && (lead.status === 'won' || lead.status === 'lost')) {
            if (filterStatus !== 'won' && filterStatus !== 'lost' && filterStatus !== 'all') return false;
            if (filterStatus === 'all') return false;
        }

        // Status filter
        if (filterStatus !== 'all' && lead.status !== filterStatus) return false;

        // ── Market filter (PL vs DE) ──
        if (marketFilter === 'pl') {
            if (lead.source !== 'website_pl') return false;
        } else if (marketFilter === 'de') {
            if (lead.source === 'website_pl') return false;
        }

        // Fair / Source filter (within selected market)
        if (filterFair !== 'all') {
            if (filterFair === 'website') {
                if (lead.source === 'targi' || lead.source === 'website_pl') return false;
            } else if (filterFair === 'website_pl') {
                if (lead.source !== 'website_pl') return false;
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

            // Normalize search digits for phone matching
            const queryDigits = searchQuery.replace(/\D/g, '');

            // Basic Fields
            const matchesBasic = (
                (customer.firstName || '').toLowerCase().includes(query) ||
                (customer.lastName || '').toLowerCase().includes(query) ||
                (customer.companyName || '').toLowerCase().includes(query) ||
                (customer.city || '').toLowerCase().includes(query) ||
                (customer.email || '').toLowerCase().includes(query)
            );

            if (matchesBasic) return true;

            // Phone number matching (normalized — strips all formatting)
            if (queryDigits.length >= 3) {
                const phoneDigits = (customer.phone || '').replace(/\D/g, '');
                if (phoneDigits.includes(queryDigits)) return true;
            }

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

    // Bulk actions
    const toggleLead = (id: string) => {
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedLeads.size === filteredLeads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const executeBulkAction = async () => {
        if (selectedLeads.size === 0) return;
        setBulkProcessing(true);
        try {
            const ids = Array.from(selectedLeads);
            if (bulkAction === 'assign' && bulkAssignee) {
                const assignTo = bulkAssignee === 'unassign' ? null : bulkAssignee;
                for (const id of ids) {
                    await DatabaseService.updateLead(id, { assignedTo: assignTo } as any);
                }
                toast.success(`Zmieniono opiekuna ${ids.length} leadów`);
            } else if (bulkAction === 'status' && bulkStatus) {
                for (const id of ids) {
                    await DatabaseService.updateLead(id, { status: bulkStatus as any });
                }
                toast.success(`Zmieniono status ${ids.length} leadów`);
            } else if (bulkAction === 'delete') {
                if (!window.confirm(`Czy na pewno chcesz usunąć ${ids.length} leadów? Ta operacja jest nieodwracalna.`)) {
                    setBulkProcessing(false);
                    return;
                }
                let deleted = 0;
                for (const id of ids) {
                    try {
                        await DatabaseService.deleteLead(id);
                        deleted++;
                    } catch (err: any) {
                        console.warn(`Failed to delete lead ${id}:`, err.message);
                    }
                }
                toast.success(`Usunięto ${deleted}/${ids.length} leadów`);
            }
            setSelectedLeads(new Set());
            setBulkAction('');
            setBulkAssignee('');
            setBulkStatus('');
            await loadData();
        } catch (err: any) {
            toast.error(err.message || 'Błąd masowej operacji');
        } finally {
            setBulkProcessing(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie leadów...</div>;
    }

    const LeadsTable = ({ items }: { items: Lead[] }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        {isAdmin() && (
                            <th className="px-3 py-3 w-10">
                                <input type="checkbox" checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 text-accent cursor-pointer" />
                            </th>
                        )}
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
                            <tr key={lead.id} className={`hover:bg-slate-50 transition-colors ${leadActivity.get(lead.id)?.isHot ? 'bg-orange-50/50' : ''} ${selectedLeads.has(lead.id) ? 'bg-accent/5' : ''}`}>
                                {isAdmin() && (
                                    <td className="px-3 py-4">
                                        <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleLead(lead.id)} className="w-4 h-4 rounded border-slate-300 text-accent cursor-pointer" />
                                    </td>
                                )}
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
                                                <Flame className="w-3 h-3" />
                                                HOT
                                            </span>
                                        )}
                                        {completedFormLeadIds.has(lead.id) && (
                                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-0.5" title="Formularz konfiguracji wypełniony">
                                                <ClipboardCheck className="w-3 h-3" />
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
                                                <Building2 className="w-3 h-3" />
                                                {fair?.name || 'Targi'}
                                            </span>
                                        ) : lead.source === 'website' ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                <Globe className="w-3 h-3" />
                                                Strona WWW
                                            </span>
                                        ) : lead.source === 'website_pl' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200 self-start">
                                                <span className="text-sm">🇵🇱</span>
                                                zadaszto.pl
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
                                            <div className="text-[10px] mt-1 px-2 py-1.5 bg-red-50 rounded-md border border-red-100">
                                                {lead.lostReason && <div className="text-red-600 font-medium max-w-[250px]" title={lead.lostReason}>{lead.lostReason}</div>}
                                                {lead.lostByName && <div className="text-red-400 mt-0.5 flex items-center gap-0.5"><UserIcon className="w-2.5 h-2.5" /> {lead.lostByName}</div>}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {scheduledMeasurement ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                <Calendar className="w-3 h-3" />
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
                                                <Clock className="w-3 h-3" />
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
    );

    // ── Compute quick KPIs for always-visible strip ──
    const quickKpis = React.useMemo(() => {
        const total = filteredLeads.length;
        const newLeads = filteredLeads.filter(l => ['new', 'formularz'].includes(l.status)).length;
        const inProcess = filteredLeads.filter(l => ['contacted', 'measurement_scheduled', 'measurement_completed', 'offer_sent', 'negotiation'].includes(l.status)).length;
        const won = filteredLeads.filter(l => l.status === 'won').length;
        const lost = filteredLeads.filter(l => l.status === 'lost').length;
        const offerSent = filteredLeads.filter(l => ['offer_sent', 'negotiation'].includes(l.status)).length;
        const offerRate = total > 0 ? ((offerSent / total) * 100).toFixed(0) : '0';
        const totalClosed = won + lost;
        const winRate = totalClosed > 0 ? ((won / totalClosed) * 100).toFixed(0) : '—';
        // Avg pipeline age
        const now = new Date();
        const activeLeads = filteredLeads.filter(l => !['won', 'lost'].includes(l.status));
        const totalDays = activeLeads.reduce((sum, l) => {
            const days = Math.floor((now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);
        const avgDays = activeLeads.length > 0 ? Math.round(totalDays / activeLeads.length) : 0;
        return { total, newLeads, inProcess, offerRate, winRate, avgDays };
    }, [filteredLeads]);

    return (
        <div className="space-y-4">
            {/* ═══════════ ROW 1: Title Bar ═══════════ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Title + Market */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leady</h1>
                        <p className="text-xs text-slate-400 mt-0.5">Zarządzaj potencjalnymi klientami</p>
                    </div>

                    {/* Market Switcher */}
                    {(canSwitchMarket || isPLOnly || isDEOnly) && (
                        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 ml-1">
                            {(canSwitchMarket || isDEOnly) && (
                                <button
                                    onClick={() => { setMarketFilter('de'); setFilterFair('all'); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                        marketFilter === 'de'
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <span className="text-sm">🇩🇪</span> DE
                                </button>
                            )}
                            {(canSwitchMarket || isPLOnly) && (
                                <button
                                    onClick={() => { setMarketFilter('pl'); setFilterFair('all'); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                        marketFilter === 'pl'
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <span className="text-sm">🇵🇱</span> PL
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: View Toggles + CTA */}
                <div className="flex items-center gap-2">
                    <div className="bg-white p-0.5 rounded-lg border border-slate-200 flex items-center">
                        <button onClick={() => setShowStats(!showStats)} className={`p-1.5 rounded-md transition-colors ${showStats ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Statystyki">
                            <BarChart3 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-0.5" />
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Lista">
                            <List className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban">
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('map')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'map' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Mapa">
                            <MapPin className="w-4 h-4" />
                        </button>
                    </div>
                    <Link to="/leads/new" className="bg-accent hover:bg-accent-dark text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm shadow-accent/20 transition-all hover:shadow-md hover:shadow-accent/30">
                        <Plus className="w-3.5 h-3.5" /> Dodaj Leada
                    </Link>
                </div>
            </div>

            {/* ═══════════ ROW 2: KPI Strip (always visible) ═══════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                    { label: 'Wszystkie', value: quickKpis.total, icon: <Users className="w-3.5 h-3.5" />, accent: 'text-slate-700', iconColor: 'text-slate-400', bg: 'bg-slate-50' },
                    { label: 'Nowe leady', value: quickKpis.newLeads, icon: <UserPlus className="w-3.5 h-3.5" />, accent: 'text-blue-700', iconColor: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'W procesie', value: quickKpis.inProcess, icon: <Clock className="w-3.5 h-3.5" />, accent: 'text-indigo-700', iconColor: 'text-indigo-500', bg: 'bg-indigo-50' },
                    { label: 'Oferta %', value: `${quickKpis.offerRate}%`, icon: <FileText className="w-3.5 h-3.5" />, accent: 'text-amber-700', iconColor: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Win rate', value: quickKpis.winRate === '—' ? '—' : `${quickKpis.winRate}%`, icon: <Trophy className="w-3.5 h-3.5" />, accent: 'text-emerald-700', iconColor: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Śr. pipeline', value: `${quickKpis.avgDays}d`, icon: <Calendar className="w-3.5 h-3.5" />, accent: quickKpis.avgDays > 14 ? 'text-red-600' : 'text-slate-700', iconColor: quickKpis.avgDays > 14 ? 'text-red-400' : 'text-slate-400', bg: quickKpis.avgDays > 14 ? 'bg-red-50' : 'bg-slate-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-lg border border-slate-200/80 px-3 py-2.5 flex items-center gap-2.5 hover:border-slate-300 transition-colors group">
                        <div className={`w-7 h-7 rounded-md ${kpi.bg} flex items-center justify-center ${kpi.iconColor} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                            {kpi.icon}
                        </div>
                        <div className="min-w-0">
                            <div className={`text-lg font-bold leading-none ${kpi.accent}`}>{kpi.value}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5 truncate">{kpi.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ═══════════ ROW 2b: Detailed Stats (toggled) ═══════════ */}
            {showStats && (
                <div className="space-y-4">
                    <LeadsStats leads={filteredLeads} fairs={fairs} />
                    <LeadsFunnelChart leads={filteredLeads} />
                </div>
            )}

            {/* ═══════════ ROW 3: Filter Toolbar ═══════════ */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="px-3 py-2.5 flex flex-wrap gap-2.5 items-center">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Szukaj..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs outline-none w-48 focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-slate-400"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-[7px]" />
                    </div>

                    <div className="w-px h-6 bg-slate-200" />

                    {/* Status */}
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none text-slate-700 font-medium">
                        <option value="all">Status: Wszystkie</option>
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

                    {/* Source */}
                    {marketFilter === 'de' && currentUser?.role !== 'sales_rep_pl' && (
                        <select value={filterFair} onChange={(e) => setFilterFair(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none text-slate-700 font-medium min-w-[120px]">
                            <option value="all">Źródło: Wszystkie</option>
                            <option value="website">Strona WWW (DE)</option>
                            <option value="website_pl">🇵🇱 zadaszto.pl</option>
                            <option value="fair_all">Targi (Wszystkie)</option>
                            {fairs.map(fair => (
                                <option key={fair.id} value={fair.id}>⬡ {fair.name} {fair.is_active ? '(Aktywne)' : ''}</option>
                            ))}
                        </select>
                    )}

                    {/* Assignee */}
                    <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none text-slate-700 font-medium min-w-[120px]">
                        <option value="all">Opiekun: Wszyscy</option>
                        <option value="unassigned">Nieprzypisany</option>
                        <optgroup label="Handlowcy">
                            {users.filter(u => u.role === 'sales_rep' || u.role === 'sales_rep_pl').map(user => (
                                <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Administracja">
                            {users.filter(u => u.role === 'admin' || u.role === 'manager').map(user => (
                                <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                            ))}
                        </optgroup>
                    </select>

                    {viewMode === 'list' && (
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 font-medium border-l pl-2.5 border-slate-200">
                            <input type="checkbox" checked={groupByRegion} onChange={(e) => setGroupByRegion(e.target.checked)} className="w-3.5 h-3.5 text-accent border-slate-300 rounded" />
                            Regiony
                        </label>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Sort + Won/Lost */}
                    <button onClick={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')} className="text-xs bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md flex items-center gap-1 text-slate-600 hover:bg-slate-100 transition-colors font-medium">
                        <ArrowDownUp className="w-3 h-3" />
                        {sortOrder === 'desc' ? 'Najnowsze' : 'Najstarsze'}
                    </button>
                    <button
                        onClick={() => {
                            if (!showClosedLeads) { setShowClosedLeads(true); loadClosedLeads(); } else { setShowClosedLeads(false); }
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors font-medium flex items-center gap-1 ${
                            showClosedLeads ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        {loadingClosed ? <><Loader2 className="w-3 h-3 animate-spin" />Ładuję...</> : showClosedLeads ? <><CheckCircle2 className="w-3 h-3" />Won/Lost</> : <><FileText className="w-3 h-3" />+Won/Lost</>}
                    </button>
                </div>
            </div>

            {viewMode === 'map' ? (
                <LeadsMap leads={filteredLeads} />
            ) : viewMode === 'kanban' ? (
                <LeadsKanban leads={filteredLeads} onLeadUpdate={handleLeadUpdate} />
            ) : (
                <>
                {/* Bulk actions toolbar */}
                {isAdmin() && selectedLeads.size > 0 && (
                    <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-sm font-bold text-accent">{selectedLeads.size} zaznaczon{selectedLeads.size === 1 ? 'y' : 'ych'}</span>
                        <div className="h-5 w-px bg-accent/30" />
                        <select value={bulkAction} onChange={e => { setBulkAction(e.target.value); setBulkAssignee(''); setBulkStatus(''); }} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none">
                            <option value="">Wybierz akcję...</option>
                            <option value="assign">Zmień opiekuna</option>
                            <option value="status">Zmień status</option>
                            <option value="delete">Usuń zaznaczone</option>
                        </select>

                        {bulkAction === 'assign' && (
                            <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none min-w-[160px]">
                                <option value="">Kogo przypisać...</option>
                                <option value="unassign">— Brak opiekuna —</option>
                                <optgroup label="Handlowcy">
                                    {users.filter(u => u.role === 'sales_rep' || u.role === 'sales_rep_pl').map(u => (
                                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Administracja">
                                    {users.filter(u => u.role === 'admin' || u.role === 'manager').map(u => (
                                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                    ))}
                                </optgroup>
                            </select>
                        )}

                        {bulkAction === 'status' && (
                            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none">
                                <option value="">Jaki status...</option>
                                <option value="new">Nowy</option>
                                <option value="formularz">Nowy (Form.)</option>
                                <option value="contacted">Skontaktowano</option>
                                <option value="offer_sent">Oferta Wysłana</option>
                                <option value="measurement_scheduled">Umówiony na pomiar</option>
                                <option value="measurement_completed">Pomiar odbył się</option>
                                <option value="negotiation">Negocjacje</option>
                                <option value="won">Wygrany</option>
                                <option value="lost">Utracony</option>
                            </select>
                        )}

                        <button
                            onClick={executeBulkAction}
                            disabled={bulkProcessing || (!bulkAction || (bulkAction === 'assign' && !bulkAssignee) || (bulkAction === 'status' && !bulkStatus))}
                            className="text-sm px-4 py-1.5 rounded-lg font-bold text-white bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {bulkProcessing ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />Przetwarzam...</> : 'Wykonaj'}
                        </button>
                        <button onClick={() => { setSelectedLeads(new Set()); setBulkAction(''); }} className="text-sm text-slate-500 hover:text-slate-700 ml-auto flex items-center gap-1"><X className="w-3.5 h-3.5" /> Anuluj</button>
                    </div>
                )}
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
                </>
            )}
        </div>
    );
};
