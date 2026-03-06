import React from 'react';
import { Link } from 'react-router-dom';
import { PartnerOffersList } from './PartnerOffersList';
import { DatabaseService } from '../../services/database';
import { WalletWidget } from './WalletWidget';
import { RingostatWidget } from '../widgets/RingostatWidget';
import { TasksList } from '../tasks/TasksList';
import { TaskModal } from '../tasks/TaskModal';
import { ActivityFeed } from './ActivityFeed';
import { CompanyOverview } from './CompanyOverview';
import { UpcomingSchedule } from './UpcomingSchedule';
import { supabase } from '../../lib/supabase';


export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = React.useState({
        totalRevenue: 0,
        activeUsers: 0,
        pendingOffers: 0,
        completedInstallations: 0
    });
    const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
    const [tasksRefreshTrigger, setTasksRefreshTrigger] = React.useState(0);
    const [actionsExpanded, setActionsExpanded] = React.useState(false);
    const [extraStats, setExtraStats] = React.useState({ leads: 0, scheduledMeasurements: 0, activeInstallations: 0 });

    React.useEffect(() => {
        DatabaseService.getSystemStats().then(setStats).catch(console.error);

        // Extra stats
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
    }, []);

    const statCards = [
        {
            label: 'Przychód',
            value: Number(stats.totalRevenue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-blue-500 to-blue-600',
            bgIcon: 'bg-blue-400/20'
        },
        {
            label: 'Użytkownicy',
            value: stats.activeUsers,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'from-emerald-500 to-emerald-600',
            bgIcon: 'bg-emerald-400/20'
        },
        {
            label: 'Oczekujące',
            value: stats.pendingOffers,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            color: 'from-amber-500 to-amber-600',
            bgIcon: 'bg-amber-400/20'
        },
        {
            label: 'Montaże',
            value: stats.completedInstallations,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-purple-500 to-purple-600',
            bgIcon: 'bg-purple-400/20'
        },
        {
            label: 'Nowe Leady',
            value: extraStats.leads,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
            ),
            color: 'from-rose-500 to-rose-600',
            bgIcon: 'bg-rose-400/20'
        },
        {
            label: 'Pomiary',
            value: extraStats.scheduledMeasurements,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            ),
            color: 'from-orange-500 to-orange-600',
            bgIcon: 'bg-orange-400/20'
        }
    ];

    const quickActions = [
        { title: 'Nowa Oferta', path: '/new-offer', icon: '📝', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        { title: 'Wizualizator 3D', path: '/visualizer', icon: '🧊', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        { title: 'Baza Ofert', path: '/offers', icon: '📋', color: 'bg-slate-50 text-slate-700 border-slate-100' },
        { title: 'Leady', path: '/leads', icon: '🎯', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
        { title: 'Poczta', path: '/mail', icon: '📧', color: 'bg-purple-50 text-purple-700 border-purple-100' },
        { title: 'Targi', path: '/fairs', icon: '🏢', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        { title: 'Zarządzanie Targami', path: '/admin/fairs', icon: '📅', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        { title: 'Użytkownicy', path: '/admin/users', icon: '👥', color: 'bg-violet-50 text-violet-700 border-violet-100' },
        { title: 'Montażyści', path: '/admin/installers', icon: '🔧', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' },
        { title: 'Ekipy', path: '/admin/teams', icon: '👷', color: 'bg-pink-50 text-pink-700 border-pink-100' },
        { title: 'Partnerzy B2B', path: '/admin/b2b/partners', icon: '🤝', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        { title: 'Pomiary', path: '/measurements', icon: '📏', color: 'bg-orange-50 text-orange-700 border-orange-100' },
        { title: 'Montaże', path: '/installations', icon: '📆', color: 'bg-rose-50 text-rose-700 border-rose-100' },
        { title: 'Logistyka', path: '/procurement', icon: '📦', color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
        { title: 'Paliwo', path: '/admin/fuel-logs', icon: '⛽', color: 'bg-slate-50 text-slate-700 border-slate-100' },
        { title: 'Serwis', path: '/admin/failures', icon: '🛠️', color: 'bg-red-50 text-red-700 border-red-100' },
        { title: 'Feedback', path: '/admin/feedback', icon: '⭐', color: 'bg-amber-50 text-amber-700 border-amber-100' }
    ];

    const visibleActions = actionsExpanded ? quickActions : quickActions.slice(0, 8);

    return (
        <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Panel Administratora</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Przegląd wyników i zarządzanie systemem</p>
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-slate-200 self-start sm:self-auto">
                    {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Stat Cards — gradient style */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {statCards.map((card, idx) => (
                    <div key={idx} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 sm:p-5 text-white shadow-sm relative overflow-hidden`}>
                        <div className={`absolute top-3 right-3 ${card.bgIcon} rounded-lg p-2`}>
                            {card.icon}
                        </div>
                        <p className="text-white/80 text-[11px] sm:text-xs font-medium uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-lg sm:text-2xl font-bold mt-1 truncate pr-8">{card.value}</h3>
                    </div>
                ))}
            </div>

            {/* Upcoming Schedule — calendars */}
            <UpcomingSchedule />

            {/* Quick Actions — flat grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Szybki dostęp</h3>
                    {quickActions.length > 8 && (
                        <button
                            onClick={() => setActionsExpanded(!actionsExpanded)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                            {actionsExpanded ? 'Zwiń' : `Pokaż wszystkie (${quickActions.length})`}
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {visibleActions.map((action, idx) => (
                        <Link
                            key={idx}
                            to={action.path}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${action.color} hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all text-left`}
                        >
                            <span className="text-lg shrink-0">{action.icon}</span>
                            <span className="text-xs sm:text-sm font-semibold truncate">{action.title}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Widgets Section — Wallet + Ringostat side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-5">
                <div className="xl:col-span-2">
                    <WalletWidget />
                </div>
                <div className="xl:col-span-3">
                    <RingostatWidget />
                </div>
            </div>

            {/* Tasks Section */}
            <section>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col" style={{ maxHeight: '500px' }}>
                    <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg text-blue-600">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <h3 className="text-base sm:text-xl font-bold text-slate-800">Moje Zadania</h3>
                        </div>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Dodaj Zadanie</span>
                            <span className="sm:hidden">Dodaj</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <TasksList refreshTrigger={tasksRefreshTrigger} />
                    </div>
                </div>
            </section>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSuccess={() => setTasksRefreshTrigger(prev => prev + 1)}
            />

            {/* Activity Feed */}
            <section>
                <ActivityFeed />
            </section>

            {/* Company Overview — comprehensive data */}
            <section>
                <CompanyOverview />
            </section>

            {/* Recent Partner Offers */}
            <section>
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg text-purple-600">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h2 className="text-base sm:text-xl font-bold text-slate-800">Ostatnie Oferty Partnerów</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[600px] px-4 sm:px-0">
                            <PartnerOffersList />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
