import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import { WalletWidget } from './WalletWidget';
import { TasksList } from '../tasks/TasksList';
import { TaskModal } from '../tasks/TaskModal';
import { ActivityFeed } from './ActivityFeed';
import { LiveActivityFeed } from '../notifications/LiveActivityFeed';
import { CompanyOverview } from './CompanyOverview';
import { UpcomingSchedule } from './UpcomingSchedule';
import { RingostatWidget } from '../widgets/RingostatWidget';
import { MiniTelephonyWidget } from '../widgets/MiniTelephonyWidget';
import { MorningCoffeeAI } from './MorningCoffeeAI';
import { LiveCostWidget } from './LiveCostWidget';
import { ServiceTicketsWidget } from './ServiceTicketsWidget';
import { OfferActivityWidget } from './OfferActivityWidget';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    Euro, FileText, Flame, Wrench, Ruler, Fuel,
    ClipboardCheck, Plus, ChevronRight, ChevronDown,
    TrendingUp, Phone, PhoneIncoming, PhoneMissed,
    Users, Calendar, Mail, Package, Settings, AlertTriangle,
    Flag, Eye, Calculator, Briefcase, Zap, BarChart3,
    PenLine, Archive, UserPlus, Warehouse, Truck
} from 'lucide-react';

// Icons are now provided by lucide-react (imported above)

// ─── Greeting helper ────────────────────────────────────────
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'Dobrej nocy';
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Dzień dobry';
    return 'Dobry wieczór';
}

function getGreetingEmoji(): string {
    const hour = new Date().getHours();
    if (hour < 6) return '🌙';
    if (hour < 12) return '☀️';
    if (hour < 18) return '🌤️';
    return '🌆';
}

// ─── Quick Action Groups ────────────────────────────────────
const actionGroups = [
    {
        title: 'CRM & Sprzedaż',
        items: [
            { title: 'Nowa oferta', path: '/new-offer', icon: <PenLine className="w-4 h-4" /> },
            { title: 'Lista ofert', path: '/offers', icon: <Archive className="w-4 h-4" /> },
            { title: 'Leady', path: '/leads', icon: <Flame className="w-4 h-4" /> },
            { title: 'Umowy', path: '/contracts', icon: <FileText className="w-4 h-4" /> },
            { title: 'Baza klientów', path: '/customers', icon: <UserPlus className="w-4 h-4" /> },
            { title: 'Skrzynka e-mail', path: '/mail', icon: <Mail className="w-4 h-4" /> },
        ]
    },
    {
        title: 'Realizacja & Logistyka',
        items: [
            { title: 'Kalendarz montaży', path: '/installations', icon: <Calendar className="w-4 h-4" /> },
            { title: 'Protokoły pomiarowe', path: '/reports/measurements', icon: <Ruler className="w-4 h-4" /> },
            { title: 'Magazyn', path: '/admin/inventory', icon: <Warehouse className="w-4 h-4" /> },
            { title: 'Zamówienia materiałów', path: '/procurement', icon: <Package className="w-4 h-4" />, badgeKey: 'pendingOrders' },
            { title: 'Logistyka', path: '/logistics', icon: <Truck className="w-4 h-4" /> },
            { title: 'Zgłoszenia serwisowe', path: '/service', icon: <Settings className="w-4 h-4" /> },
            { title: 'Zgłoszenia usterek', path: '/admin/failures', icon: <AlertTriangle className="w-4 h-4" /> },
        ]
    },
    {
        title: 'Narzędzia & Marketing',
        items: [
            { title: 'Narzędzia', path: '/tools', icon: <Zap className="w-4 h-4" /> },
            { title: 'Kampanie e-mail', path: '/campaigns', icon: <Mail className="w-4 h-4" /> },
            { title: 'Targi i eventy', path: '/admin/fairs', icon: <Flag className="w-4 h-4" /> },
            { title: 'Wizualizator 3D', path: '/visualizer', icon: <Eye className="w-4 h-4" /> },
            { title: 'Kalkulator dachowy', path: '/dachrechner', icon: <Calculator className="w-4 h-4" /> },
        ]
    },
    {
        title: 'Zarządzanie',
        items: [
            { title: 'Zespół i uprawnienia', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
            { title: 'Ekipy montażowe', path: '/admin/installers', icon: <Wrench className="w-4 h-4" /> },
            { title: 'Przegląd ekip', path: '/admin/teams-dashboard', icon: <BarChart3 className="w-4 h-4" /> },
            { title: 'Partnerzy handlowi', path: '/admin/b2b/partners', icon: <Briefcase className="w-4 h-4" /> },
            { title: 'Dziennik paliwa', path: '/admin/fuel-logs', icon: <Fuel className="w-4 h-4" /> },
        ]
    }
];

// MiniTelephonyWidget imported from '../widgets/MiniTelephonyWidget'



// ═══════════════════════════════════════════════════════════
// LEADS PIPELINE WIDGET
// ═══════════════════════════════════════════════════════════
const PIPELINE_STAGES = [
    { id: 'new', label: 'Nowe', color: '#3B82F6' },
    { id: 'formularz', label: 'Nowe (Form.)', color: '#14B8A6' },
    { id: 'contacted', label: 'Kontakt', color: '#6366F1' },
    { id: 'offer_sent', label: 'Oferta', color: '#F59E0B' },
    { id: 'measurement_scheduled', label: 'Pomiar', color: '#06B6D4' },
    { id: 'measurement_completed', label: 'Po pomiarze', color: '#A855F7' },
    { id: 'negotiation', label: 'Negocjacje', color: '#F97316' },
];

const LeadsPipelineWidget: React.FC = () => {
    const [pipelineData, setPipelineData] = useState<{ id: string; label: string; color: string; count: number }[]>([]);
    const [recentLeads, setRecentLeads] = useState<{ id: string; name: string; status: string; created: string; city?: string }[]>([]);
    const [totals, setTotals] = useState({ total: 0, won: 0, lost: 0, stale: 0, thisWeek: 0 });

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('id, status, customer_data, created_at, last_contact_date')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const leads = data || [];

                // Pipeline counts
                const counts = PIPELINE_STAGES.map(s => ({
                    ...s,
                    count: leads.filter(l => l.status === s.id).length,
                }));
                setPipelineData(counts);

                // Totals
                const won = leads.filter(l => l.status === 'won').length;
                const lost = leads.filter(l => l.status === 'lost').length;
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const thisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;

                // Stale leads (active but no contact in threshold days)
                const staleThresholds: Record<string, number> = { new: 1, formularz: 2, contacted: 3, measurement_scheduled: 2, measurement_completed: 3, offer_sent: 5, negotiation: 7 };
                const stale = leads.filter(l => {
                    if (['won', 'lost', 'fair'].includes(l.status)) return false;
                    const threshold = staleThresholds[l.status] || 3;
                    const lastDate = l.last_contact_date ? new Date(l.last_contact_date) : new Date(l.created_at);
                    return (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24) > threshold;
                }).length;

                setTotals({ total: leads.length, won, lost, stale, thisWeek });

                // Recent 5
                const recent = leads.slice(0, 5).map(l => {
                    const cd = l.customer_data as any;
                    return {
                        id: l.id,
                        name: `${cd?.firstName || ''} ${cd?.lastName || ''}`.trim() || 'Nieznany',
                        status: l.status,
                        created: new Date(l.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                        city: cd?.city,
                    };
                });
                setRecentLeads(recent);
            } catch (e) {
                console.error('LeadsPipelineWidget error:', e);
            }
        };
        fetchLeads();
    }, []);

    const pipelineTotal = pipelineData.reduce((a, b) => a + b.count, 0);
    const conversionRate = totals.total > 0 ? ((totals.won / totals.total) * 100).toFixed(1) : '0.0';
    const STATUS_COLORS_MAP: Record<string, string> = {
        new: 'bg-blue-100 text-blue-700', formularz: 'bg-teal-100 text-teal-700',
        contacted: 'bg-indigo-100 text-indigo-700', offer_sent: 'bg-yellow-100 text-yellow-700',
        measurement_scheduled: 'bg-cyan-100 text-cyan-700', measurement_completed: 'bg-purple-100 text-purple-700',
        negotiation: 'bg-orange-100 text-orange-700', won: 'bg-emerald-100 text-emerald-700',
        lost: 'bg-red-100 text-red-700', fair: 'bg-pink-100 text-pink-700',
    };
    const STATUS_LABELS_MAP: Record<string, string> = {
        new: 'Nowy', formularz: 'Form.', contacted: 'Kontakt', offer_sent: 'Oferta',
        measurement_scheduled: 'Pomiar', measurement_completed: 'Po pom.', negotiation: 'Negocj.',
        won: 'Wygrany', lost: 'Utracony', fair: 'Targi',
    };

    return (
        <div>
            <div className="p-4 sm:p-5">
                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Wszystkie</p>
                        <p className="text-xl font-black text-slate-800">{totals.total}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-blue-400 uppercase">Ten tydzień</p>
                        <p className="text-xl font-black text-blue-700">+{totals.thisWeek}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-emerald-400 uppercase">Konwersja</p>
                        <p className="text-xl font-black text-emerald-700">{conversionRate}%</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-amber-400 uppercase">Wygrane</p>
                        <p className="text-xl font-black text-amber-700">{totals.won}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${totals.stale > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className={`text-[9px] font-bold uppercase ${totals.stale > 0 ? 'text-red-400' : 'text-slate-400'}`}>Zagrożone</p>
                        <p className={`text-xl font-black ${totals.stale > 0 ? 'text-red-600' : 'text-slate-600'}`}>{totals.stale}</p>
                    </div>
                </div>

                {/* Pipeline Bar */}
                {pipelineTotal > 0 && (
                    <div className="mb-4">
                        <div className="flex rounded-full overflow-hidden h-5 bg-slate-100">
                            {pipelineData.filter(s => s.count > 0).map(s => (
                                <div key={s.id} className="h-full transition-all duration-500 relative group"
                                    style={{ width: `${(s.count / pipelineTotal) * 100}%`, backgroundColor: s.color, minWidth: '16px' }}
                                    title={`${s.label}: ${s.count}`}>
                                    {(s.count / pipelineTotal) > 0.08 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">{s.count}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {pipelineData.filter(s => s.count > 0).map(s => (
                                <div key={s.id} className="flex items-center gap-1 text-[10px] text-slate-600">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                    <span className="font-medium">{s.label}</span>
                                    <span className="text-slate-400">({s.count})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Leads */}
                {recentLeads.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ostatnio dodane</h4>
                        <div className="divide-y divide-slate-50">
                            {recentLeads.map(l => (
                                <Link to={`/leads/${l.id}`} key={l.id} className="flex items-center justify-between py-1.5 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS_MAP[l.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {STATUS_LABELS_MAP[l.status] || l.status}
                                        </span>
                                        <span className="font-medium text-sm text-slate-800 truncate">{l.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {l.city && <span className="text-[10px] text-slate-400">{l.city}</span>}
                                        <span className="text-[10px] text-slate-400 font-mono">{l.created}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// TEAM PHONE STATUS WIDGET
// ═══════════════════════════════════════════════════════════
const TeamPhoneStatus: React.FC = () => {
    const { currentUser } = useAuth();
    const [agents, setAgents] = useState<{ id: string; full_name: string; availability_status: string }[]>([]);

    const fetchAgents = async () => {
        try {
            // Get users with voice access from phone_number_users (managed at /telephony/numbers)
            const { data: voiceUsers } = await supabase
                .from('phone_number_users')
                .select('user_id')
                .eq('can_voice', true);
            const voiceUserIds = (voiceUsers || []).map(u => u.user_id);
            if (voiceUserIds.length === 0) { setAgents([]); return; }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, availability_status')
                .in('id', voiceUserIds)
                .order('full_name');
            if (error) { console.error('TeamPhoneStatus query error:', error); return; }
            setAgents(data || []);
        } catch (e) {
            console.error('TeamPhoneStatus error:', e);
        }
    };

    useEffect(() => {
        fetchAgents();
        // Realtime subscription — instant updates when any agent changes availability
        const channel = supabase
            .channel('team-phone-status')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
            }, () => {
                fetchAgents(); // Re-fetch when any profile changes
            })
            .subscribe();
        // Fallback polling every 10s for reliability
        const interval = setInterval(fetchAgents, 10000);
        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    // Toggle own availability
    const cycleMyStatus = async () => {
        if (!currentUser?.id) return;
        const me = agents.find(a => a.id === currentUser.id);
        const current = me?.availability_status || 'offline';
        const order: string[] = ['available', 'busy', 'offline'];
        const next = order[(order.indexOf(current) + 1) % order.length];
        // Optimistic update
        setAgents(prev => prev.map(a => a.id === currentUser.id ? { ...a, availability_status: next } : a));
        await supabase.from('profiles').update({ availability_status: next }).eq('id', currentUser.id);
    };

    const available = agents.filter(a => a.availability_status === 'available');
    const busy = agents.filter(a => a.availability_status === 'busy');
    const offline = agents.filter(a => !a.availability_status || a.availability_status === 'offline');

    const myStatus = agents.find(a => a.id === currentUser?.id)?.availability_status || 'offline';
    const isPhoneAgent = agents.some(a => a.id === currentUser?.id);

    const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
        available: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Dostępny' },
        busy: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Zajęty' },
        offline: { dot: 'bg-slate-400', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', label: 'Offline' },
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <Phone className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Zespół — Telefonia</h3>
                        <p className="text-[10px] text-slate-400">Status dostępności agentów do połączeń • na żywo</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Admin's own toggle button */}
                    {isPhoneAgent && (
                        <button
                            onClick={cycleMyStatus}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                myStatus === 'available'
                                    ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                                    : myStatus === 'busy'
                                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Kliknij aby zmienić swój status"
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${
                                myStatus === 'available' ? 'bg-green-500 animate-pulse'
                                : myStatus === 'busy' ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`} />
                            {myStatus === 'available' ? '📞 Dostępny' : myStatus === 'busy' ? '🔴 Zajęty' : '📵 Offline'}
                        </button>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {available.length}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {busy.length}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        {offline.length}
                    </span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 px-4 pb-4">
                {[...available, ...busy, ...offline].map(agent => {
                    const status = statusConfig[agent.availability_status] || statusConfig.offline;
                    const isMe = agent.id === currentUser?.id;
                    return (
                        <div
                            key={agent.id}
                            onClick={isMe ? cycleMyStatus : undefined}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${status.bg} transition-all ${isMe ? 'cursor-pointer ring-1 ring-blue-200 hover:ring-blue-400' : ''}`}
                            title={`${agent.full_name} — ${status.label}${isMe ? ' (kliknij aby zmienić)' : ''}`}
                        >
                            <div className="relative">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${status.text} ${agent.availability_status === 'available' ? 'bg-green-100' : agent.availability_status === 'busy' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                    {getInitials(agent.full_name || '??')}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${status.dot} ${agent.availability_status === 'available' ? 'animate-pulse' : ''}`} />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-xs font-semibold ${status.text} truncate`}>
                                    {(agent.full_name || '').split(' ')[0]}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const AdminDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState({
        totalRevenue: 0, activeUsers: 0, pendingOffers: 0, completedInstallations: 0
    });
    const [monthlyNetTurnover, setMonthlyNetTurnover] = useState(0);
    const [monthlyContracts, setMonthlyContracts] = useState(0);
    const [monthlyFuelLiters, setMonthlyFuelLiters] = useState(0);
    const [monthlyInstallations, setMonthlyInstallations] = useState(0);
    const [monthlyMeasurements, setMonthlyMeasurements] = useState(0);
    const [extraStats, setExtraStats] = useState({ leads: 0, scheduledMeasurements: 0, activeInstallations: 0 });
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);
    const [pipelineCollapsed, setPipelineCollapsed] = useState(true);
    const [serviceCollapsed, setServiceCollapsed] = useState(true);
    const [pendingOrders, setPendingOrders] = useState(0);
    const [liveTime, setLiveTime] = useState(new Date());

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setLiveTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        DatabaseService.getSystemStats().then(setStats).catch(console.error);
        Promise.all([
            supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
            supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
            supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'confirmed']),
        ]).then(([leadsRes, measRes, instRes]) => {
            setExtraStats({
                leads: leadsRes.count || 0,
                scheduledMeasurements: measRes.count || 0,
                activeInstallations: instRes.count || 0,
            });
        }).catch(console.error);

        // Fetch monthly net turnover from contracts
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        supabase
            .from('contracts')
            .select('contract_data, status, created_at')
            .in('status', ['signed', 'completed'])
            .gte('created_at', firstDay)
            .lte('created_at', lastDay)
            .then(({ data, error }) => {
                if (error) { console.error('Turnover query error:', error); return; }
                const contracts = data || [];
                setMonthlyContracts(contracts.length);
                const total = contracts.reduce((sum, c) => {
                    const p = (c.contract_data as any)?.pricing;
                    return sum + (p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0);
                }, 0);
                setMonthlyNetTurnover(total);
            }).catch(console.error);

        // Fetch monthly fuel consumption from fuel_logs
        supabase
            .from('fuel_logs')
            .select('liters')
            .gte('log_date', firstDay.split('T')[0])
            .lte('log_date', lastDay.split('T')[0])
            .then(({ data, error }) => {
                if (error) { console.error('Fuel query error:', error); return; }
                const totalLiters = (data || []).reduce((sum, row) => sum + (Number(row.liters) || 0), 0);
                setMonthlyFuelLiters(totalLiters);
            }).catch(console.error);

        // Fetch monthly installations count (unique clients/offers)
        supabase
            .from('installations')
            .select('offer_id, scheduled_date')
            .gte('scheduled_date', firstDay.split('T')[0])
            .lte('scheduled_date', lastDay.split('T')[0])
            .then(({ data, error }) => {
                if (error) { console.error('Installations query error:', error); return; }
                // Count unique offer_ids (= unique clients)
                const uniqueOffers = new Set((data || []).map(r => r.offer_id).filter(Boolean));
                setMonthlyInstallations(uniqueOffers.size || (data || []).length);
            }).catch(console.error);

        // Fetch monthly measurements count from calendar
        supabase
            .from('measurements')
            .select('id', { count: 'exact', head: true })
            .gte('scheduled_date', firstDay)
            .lte('scheduled_date', lastDay)
            .then(({ count, error }) => {
                if (error) { console.error('Measurements query error:', error); return; }
                setMonthlyMeasurements(count || 0);
            }).catch(console.error);

        // Fetch pending orders count (installation_order_items with status 'ordered' or 'pending')
        supabase
            .from('installation_order_items')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'ordered', 'to_order'])
            .then(({ count, error }) => {
                if (error) { console.error('Pending orders query error:', error); return; }
                setPendingOrders(count || 0);
            }).catch(console.error);
    }, []);

    const firstName = currentUser?.firstName || currentUser?.email?.split('@')[0] || 'Admin';

    const currentMonthName = new Date().toLocaleString('pl-PL', { month: 'long' });

    const monthLabel = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

    const statCards = [
        { label: 'Obrót netto', value: Number(monthlyNetTurnover || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), icon: <Euro className="w-5 h-5" />, iconColor: 'text-blue-600 bg-blue-50', link: '/contracts', sub: monthLabel },
        { label: 'Umowy', value: monthlyContracts, icon: <FileText className="w-5 h-5" />, iconColor: 'text-emerald-600 bg-emerald-50', link: '/contracts', sub: monthLabel },
        { label: 'Nowe Leady', value: extraStats.leads, icon: <Flame className="w-5 h-5" />, iconColor: 'text-rose-600 bg-rose-50', link: '/leads', sub: 'oczekujące' },
        { label: 'Montaże', value: monthlyInstallations, icon: <Wrench className="w-5 h-5" />, iconColor: 'text-purple-600 bg-purple-50', link: '/installations', sub: monthLabel },
        { label: 'Pomiary', value: monthlyMeasurements, icon: <Ruler className="w-5 h-5" />, iconColor: 'text-orange-600 bg-orange-50', link: '/measurements', sub: monthLabel },
        { label: 'Paliwo', value: `${Math.round(monthlyFuelLiters)} L`, icon: <Fuel className="w-5 h-5" />, iconColor: 'text-amber-600 bg-amber-50', link: '/admin/fuel-logs', sub: monthLabel },
    ];

    return (
        <div className="space-y-5 pb-12 max-w-[1600px] mx-auto">

            {/* ═══ ZONE 1: Header ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-xl border border-slate-200">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                        {getGreeting()}, {firstName}!
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">Przegląd firmy w jednym miejscu</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{liveTime.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono font-medium">{liveTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* ═══ ZONE 2: Stat Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statCards.map((card, idx) => (
                    <Link
                        key={idx}
                        to={card.link}
                        className="bg-white rounded-xl p-4 border border-slate-200 group hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{card.label}</p>
                            <div className={`p-1.5 rounded-lg ${card.iconColor}`}>{card.icon}</div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{card.value}</h3>
                        {card.sub && <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>}
                    </Link>
                ))}
            </div>

            {/* ═══ PORANNA KAWA Z AI ═══ */}
            <MorningCoffeeAI />

            {/* ═══ TEAM PHONE STATUS ═══ */}
            <TeamPhoneStatus />

            {/* ═══ LEADS PIPELINE MINI WIDGET (Collapsible) ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                    onClick={() => setPipelineCollapsed(p => !p)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold text-slate-800">Pipeline Leadów</h3>
                            <p className="text-xs text-slate-400">Przegląd aktywnych procesów sprzedażowych</p>
                        </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${pipelineCollapsed ? '' : 'rotate-180'}`} />
                </button>
                {!pipelineCollapsed && <LeadsPipelineWidget />}
            </div>

            {/* ═══ SERVICE TICKETS WIDGET (Collapsible) ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                    onClick={() => setServiceCollapsed(p => !p)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold text-slate-800">Zgłoszenia Serwisowe</h3>
                            <p className="text-xs text-slate-400">Aktywne i oczekujące zgłoszenia</p>
                        </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${serviceCollapsed ? '' : 'rotate-180'}`} />
                </button>
                {!serviceCollapsed && <ServiceTicketsWidget />}
            </div>

            {/* ═══ LIVE COST WIDGET ═══ */}
            <LiveCostWidget />

            {/* ═══ ZONE 3: Three Column — Calendar + Wallet + Telephony ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                    <UpcomingSchedule />
                </div>
                <div className="lg:col-span-1">
                    <WalletWidget />
                </div>
                <div className="lg:col-span-1">
                    <MiniTelephonyWidget />
                </div>
            </div>

            {/* ═══ OFFER ACTIVITY WIDGET ═══ */}
            <OfferActivityWidget />

            {/* ═══ ZONE 4: Tasks + Activity — Two Columns ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Tasks */}
                <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ maxHeight: '480px' }}>
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><ClipboardCheck className="w-5 h-5" /></div>
                            <h3 className="text-sm font-semibold text-slate-800">Moje Zadania</h3>
                        </div>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Dodaj</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                        <TasksList refreshTrigger={tasksRefreshTrigger} />
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="overflow-hidden rounded-2xl" style={{ maxHeight: '480px' }}>
                    <LiveActivityFeed maxItems={15} />
                </div>
            </div>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSuccess={() => setTasksRefreshTrigger(prev => prev + 1)}
            />

            {/* ═══ CENTRUM POŁĄCZEŃ (Ringostat) ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <Phone className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Centrum połączeń</h3>
                        <p className="text-xs text-slate-400">Połączenia przychodzące, wychodzące, nieodebrane</p>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <RingostatWidget />
                </div>
            </div>

            {/* ═══ ZONE 5: Quick Actions — Grouped ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Szybki dostęp</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {actionGroups.map((group, gi) => (
                        <div key={gi}>
                            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{group.title}</h4>
                            <div className="space-y-1">
                                {group.items.map((action: any, ai: number) => {
                                    const badgeCount = action.badgeKey === 'pendingOrders' ? pendingOrders : 0;
                                    return (
                                        <Link
                                            key={ai}
                                            to={action.path}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left group"
                                        >
                                            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">{action.icon}</span>
                                            <span className="text-sm font-medium">{action.title}</span>
                                            {badgeCount > 0 && (
                                                <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
                                                    {badgeCount > 99 ? '99+' : badgeCount}
                                                </span>
                                            )}
                                            <ChevronRight className={`w-3.5 h-3.5 text-slate-300 ${badgeCount > 0 ? '' : 'ml-auto'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ ZONE 6: Company Overview (Analytics) ═══ */}
            <CompanyOverview />
        </div>
    );
};
