import React from 'react';
import { Link } from 'react-router-dom';
import { SalesTeamStats } from './SalesTeamStats';
import { PartnerOffersList } from './PartnerOffersList';
import { DatabaseService } from '../../services/database';
import { WalletWidget } from './WalletWidget';
import { RingostatWidget } from '../widgets/RingostatWidget';


export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = React.useState({
        totalRevenue: 0,
        activeUsers: 0,
        pendingOffers: 0,
        completedInstallations: 0
    });
    const [activeTab, setActiveTab] = React.useState<'sales' | 'partners'>('sales');

    React.useEffect(() => {
        DatabaseService.getSystemStats().then(setStats).catch(console.error);
    }, []);

    const actionGroups = {
        sales: {
            title: 'Sprzedaż i Oferty',
            actions: [
                {
                    title: 'Nowa Oferta',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    ),
                    path: '/new-offer',
                    color: 'bg-blue-50 text-blue-600',
                    description: 'Utwórz nową ofertę'
                },
                {
                    title: 'Baza Ofert',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    ),
                    path: '/offers',
                    color: 'bg-indigo-50 text-indigo-600',
                    description: 'Przeglądaj wszystkie oferty'
                },
                {
                    title: 'Raporty',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    ),
                    path: '/reports',
                    color: 'bg-emerald-50 text-emerald-600',
                    description: 'Statystyki sprzedaży'
                }
            ]
        },
        team: {
            title: 'Zarządzanie Zespołem',
            actions: [
                {
                    title: 'Użytkownicy',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ),
                    path: '/admin/users',
                    color: 'bg-violet-50 text-violet-600',
                    description: 'Pracownicy i role'
                },
                {
                    title: 'Montażyści',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    path: '/admin/installers',
                    color: 'bg-fuchsia-50 text-fuchsia-600',
                    description: 'Lista montażystów'
                },
                {
                    title: 'Ekipy',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    ),
                    path: '/admin/teams',
                    color: 'bg-pink-50 text-pink-600',
                    description: 'Zespoły montażowe'
                }
            ]
        },
        operations: {
            title: 'Operacyjne',
            actions: [
                {
                    title: 'Kalendarz Pomiarów',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    ),
                    path: '/measurements',
                    color: 'bg-orange-50 text-orange-600',
                    description: 'Planowanie pomiarów'
                },
                {
                    title: 'Kalendarz Montaży',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    ),
                    path: '/installations',
                    color: 'bg-rose-50 text-rose-600',
                    description: 'Harmonogram prac'
                },
                {
                    title: 'Zapotrzebowania',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    ),
                    path: '/admin/requests',
                    color: 'bg-cyan-50 text-cyan-600',
                    description: 'Logistyka i zakupy'
                },
                {
                    title: 'Rejestr Paliwowy',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    ),
                    path: '/admin/fuel-logs',
                    color: 'bg-slate-50 text-slate-600',
                    description: 'Koszty floty'
                }
            ]
        }
    };

    return (
        <div className="space-y-8 pb-12 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Panel Administratora</h1>
                    <p className="text-slate-500 mt-1">Przegląd wyników i zarządzanie systemem</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                        {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Przychód Całkowity</p>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {Number(stats.totalRevenue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Aktywni Użytkownicy</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.activeUsers}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Oczekujące Oferty</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.pendingOffers}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Zakończone Montaże</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.completedInstallations}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Widgets Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-full">
                    <WalletWidget />
                </div>
                <div className="lg:col-span-2 h-full">
                    <RingostatWidget />
                </div>
            </div>

            {/* Quick Actions Groups */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Object.values(actionGroups).map((group, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            {group.title}
                        </h3>
                        <div className="space-y-3">
                            {group.actions.map((action, actionIdx) => (
                                <Link
                                    key={actionIdx}
                                    to={action.path}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100"
                                >
                                    <div className={`p-3 rounded-lg ${action.color}`}>
                                        {action.icon}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-700 group-hover:text-slate-900">
                                            {action.title}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {action.description}
                                        </div>
                                    </div>
                                    <div className="ml-auto text-slate-300 group-hover:text-slate-400">
                                        →
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Statistics Section - Tabbed View */}
            <section>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Tabs Header */}
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors relative ${activeTab === 'sales'
                                ? 'text-blue-600 bg-blue-50/50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className={`w-5 h-5 ${activeTab === 'sales' ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Zespół Sprzedażowy</span>
                            </div>
                            {activeTab === 'sales' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('partners')}
                            className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors relative ${activeTab === 'partners'
                                ? 'text-emerald-600 bg-emerald-50/50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className={`w-5 h-5 ${activeTab === 'partners' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Partnerzy B2B</span>
                            </div>
                            {activeTab === 'partners' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'sales' ? (
                            <SalesTeamStats viewMode="reps" title="Wyniki Sprzedawców" />
                        ) : (
                            <SalesTeamStats viewMode="partners" title="Wyniki Partnerów" />
                        )}
                    </div>
                </div>
            </section>

            {/* Recent Partner Offers */}
            <section>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Ostatnie Oferty Partnerów</h2>
                        </div>
                    </div>
                    <PartnerOffersList />
                </div>
            </section>
        </div>
    );
};
