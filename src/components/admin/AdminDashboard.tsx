import React from 'react';
import { Link } from 'react-router-dom';
import { SalesTeamStats } from './SalesTeamStats';
import { PartnerOffersList } from './PartnerOffersList';


export const AdminDashboard: React.FC = () => {
    const quickActions = [
        {
            title: 'Nowa Oferta',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            path: '/kreator',
            color: 'bg-accent',
            textColor: 'text-white'
        },
        {
            title: 'Użytkownicy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            path: '/users',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200'
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
            border: 'border-slate-200'
        },
        {
            title: 'Baza Ofert',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            path: '/admin/offers', // Assuming this route exists or will exist, otherwise maybe just scroll to list?
            // Actually let's point to dashboard for now or maybe we should add a route for full list?
            // For now let's keep it simple.
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200'
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
                <div className="text-sm text-slate-400">
                    {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Quick Actions */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div className={`p-3 rounded-lg ${action.color === 'bg-accent' ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-accent/10 group-hover:text-accent transition-colors'}`}>
                                {action.icon}
                            </div>
                            <span className="font-bold text-lg">{action.title}</span>
                        </div>
                        {/* Decorative circle */}
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${action.color === 'bg-accent' ? 'bg-white' : 'bg-accent'}`} />
                    </Link>
                ))}
            </section>

            {/* Statistics Section - Dual View */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Sales Reps Stats */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Zespół Sprzedażowy</h2>
                    </div>
                    <SalesTeamStats viewMode="reps" title="Wyniki Sprzedawców" />
                </div>

                {/* Partners Stats */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Partnerzy B2B</h2>
                    </div>
                    <SalesTeamStats viewMode="partners" title="Wyniki Partnerów" />
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
