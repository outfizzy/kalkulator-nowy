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

    const quickActions = [
        {
            title: 'Nowa Oferta',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            path: '/new-offer',
            color: 'bg-gradient-to-br from-accent to-accent-dark',
            textColor: 'text-white',
            description: 'Utwórz nową ofertę dla klienta'
        },
        {
            title: 'Użytkownicy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            path: '/admin/users',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Zarządzaj zespołem i rolami'
        },
        {
            title: 'Montażyści',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            path: '/admin/installers',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Podgląd montażystów i zleceń'
        },
        {
            title: 'Zarządzanie Ekipami',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            path: '/admin/teams',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Twórz i edytuj zespoły'
        },
        {
            title: 'Raporty',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            path: '/reports',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Przeglądaj raporty sprzedażowe'
        },
        {
            title: 'Baza Ofert',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            path: '/offers',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Wszystkie oferty w systemie'
        },
        {
            title: 'Kalendarz Pomiarowy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            ),
            path: '/measurements',
            color: 'bg-gradient-to-br from-blue-500 to-blue-600',
            textColor: 'text-white',
            description: 'Planuj pomiary dla klientów'
        },
        {
            title: 'Kalendarz Montażowy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            path: '/installations',
            color: 'bg-gradient-to-br from-purple-500 to-purple-600',
            textColor: 'text-white',
            description: 'Zarządzaj montażami i ekipami'
        },
        {
            title: 'Zapotrzebowania',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            path: '/admin/requests',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Zarządzaj zapotrzebowaniami'
        },
        {
            title: 'Rejestr Paliwowy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            path: '/admin/fuel-logs',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Przeglądaj zużycie paliwa'
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Panel Administratora</h1>
                    <p className="text-slate-500 mt-1">Przegląd wyników i zarządzanie systemem</p>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                    {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* System Overview Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Wallet Widget - Takes prominence */}
                <div className="lg:col-span-1 h-full">
                    <WalletWidget />
                </div>

                {/* Revenue & Active Users */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <p className="text-blue-100 text-sm font-medium mb-1">Całkowity Przychód</p>
                            <h3 className="text-3xl font-bold">{Number(stats.totalRevenue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</h3>
                            <div className="mt-4 flex items-center gap-2 text-xs text-blue-100 bg-blue-600/30 w-fit px-2 py-1 rounded-lg">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span>Aktualizacja na żywo</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="text-emerald-600 font-bold text-xl">{stats.activeUsers}</span>
                            </div>
                            <p className="text-slate-500 text-sm">Aktywni Użytkownicy</p>
                        </div>
                    </div>
                </div>

                {/* Pending & Completed */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <span className="text-amber-600 font-bold text-xl">{stats.pendingOffers}</span>
                            </div>
                            <p className="text-slate-500 text-sm">Oczekujące Oferty</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-purple-600 font-bold text-xl">{stats.completedInstallations}</span>
                            </div>
                            <p className="text-slate-500 text-sm">Zakończone Montaże</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                    <Link
                        key={index}
                        to={action.path}
                        className={`
                            group relative overflow-hidden rounded-xl p-6 transition-all duration-300
                            ${action.color} ${action.textColor} ${action.border ? `border-2 ${action.border}` : 'shadow-lg shadow-accent/20'}
                            hover:-translate-y-1 hover:shadow-xl
                        `}
                    >
                        <div className="relative z-10 flex flex-col items-start gap-3">
                            <div className={`p-3 rounded-lg ${action.color.includes('gradient') ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-accent/10 group-hover:text-accent transition-colors'}`}>
                                {action.icon}
                            </div>
                            <div>
                                <span className="font-bold text-lg block">{action.title}</span>
                                <span className={`text-xs ${action.color.includes('gradient') ? 'text-white/80' : 'text-slate-400'}`}>{action.description}</span>
                            </div>
                        </div>
                        {/* Decorative circle */}
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${action.color.includes('gradient') ? 'bg-white' : 'bg-accent'}`} />
                    </Link>
                ))}
            </section>

            {/* Ringostat Calls Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RingostatWidget />
                </div>
                <div>
                    <WalletWidget />
                </div>
            </section>

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
