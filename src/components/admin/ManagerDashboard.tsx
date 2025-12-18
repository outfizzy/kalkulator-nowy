import React from 'react';
import { Link } from 'react-router-dom';
import { OrderTasksDashboard } from './OrderTasksDashboard';

export const ManagerDashboard: React.FC = () => {

    const quickActions = [
        {
            title: 'Zapotrzebowania',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            path: '/admin/requests',
            color: 'bg-gradient-to-br from-blue-500 to-blue-600',
            textColor: 'text-white',
            description: 'Zarządzaj zapotrzebowaniami montażystów'
        },
        {
            title: 'Rejestr Paliwowy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            path: '/admin/fuel-logs',
            color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            textColor: 'text-white',
            description: 'Przeglądaj zużycie paliwa'
        },
        {
            title: 'Awarie',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            path: '/admin/failures',
            color: 'bg-gradient-to-br from-red-500 to-red-600',
            textColor: 'text-white',
            description: 'Zgłoszenia awarii sprzętu'
        },
        {
            title: 'Kalendarz Pomiarowy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            ),
            path: '/measurements',
            color: 'bg-gradient-to-br from-purple-500 to-purple-600',
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
            color: 'bg-gradient-to-br from-orange-500 to-orange-600',
            textColor: 'text-white',
            description: 'Zarządzaj montażami i ekipami'
        },
        {
            title: 'Baza Ofert',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            path: '/offers',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Wszystkie oferty i umowy'
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
            description: 'Zarządzaj zespołem'
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
            description: 'Przeglądaj raporty'
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Panel Managera</h1>
                    <p className="text-slate-500 mt-1">Zarządzaj operacjami i monitoruj zespół</p>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                    {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Quick Actions Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                    <Link
                        key={index}
                        to={action.path}
                        className={`
                            group relative overflow-hidden rounded-xl p-6 transition-all duration-300
                            ${action.color} ${action.textColor} ${action.border ? `border-2 ${action.border}` : 'shadow-lg'}
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

            <section>
                <OrderTasksDashboard />
            </section>
        </div>
    );
};
