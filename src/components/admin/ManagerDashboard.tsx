import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import type { WalletTransaction } from '../../types';
import { ServiceTicketsWidget } from './ServiceTicketsWidget';
import { supabase } from '../../lib/supabase';
import {
    Warehouse, Truck, Package, Wrench, Zap, Fuel,
    AlertTriangle, Calendar, FileText, Users, Settings
} from 'lucide-react';


export const ManagerDashboard: React.FC = () => {
    // Wallet mini-stats (no balance for manager)
    const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
    const [walletLoading, setWalletLoading] = useState(true);
    const [pendingOrders, setPendingOrders] = useState(0);

    useEffect(() => {
        loadWalletData();
        // Fetch pending orders count
        supabase
            .from('installation_order_items')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'ordered', 'to_order'])
            .then(({ count }) => setPendingOrders(count || 0))
            .catch(console.error);
    }, []);

    const loadWalletData = async () => {
        try {
            const txs = await DatabaseService.getWalletTransactions();
            setRecentTransactions(txs.slice(0, 5));
        } catch (err) {
            console.error('Error loading wallet:', err);
        } finally {
            setWalletLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: 'EUR' | 'PLN' = 'EUR') => {
        return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);
    };

    const quickActions = [
        {
            title: 'Zapotrzebowania',
            icon: <Package className="w-6 h-6" />,
            path: '/procurement',
            color: 'bg-gradient-to-br from-blue-500 to-blue-600',
            textColor: 'text-white',
            description: 'Zarządzaj zapotrzebowaniami montażystów',
            badge: pendingOrders
        },
        {
            title: 'Magazyn',
            icon: <Warehouse className="w-6 h-6" />,
            path: '/admin/inventory',
            color: 'bg-gradient-to-br from-amber-500 to-orange-600',
            textColor: 'text-white',
            description: 'Stan magazynowy i wydania'
        },
        {
            title: 'Logistyka',
            icon: <Truck className="w-6 h-6" />,
            path: '/logistics',
            color: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
            textColor: 'text-white',
            description: 'Kalendarz logistyczny i dostawy'
        },
        {
            title: 'Narzędzia',
            icon: <Zap className="w-6 h-6" />,
            path: '/tools',
            color: 'bg-gradient-to-br from-violet-500 to-purple-600',
            textColor: 'text-white',
            description: 'Narzędzia i kalkulatory'
        },
        {
            title: 'Portfel Gotówkowy',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
            path: '/admin/wallet',
            color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
            textColor: 'text-white',
            description: 'Wpłaty i wydatki gotówkowe'
        },
        {
            title: 'Rejestr Paliwowy',
            icon: <Fuel className="w-6 h-6" />,
            path: '/admin/fuel-logs',
            color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            textColor: 'text-white',
            description: 'Przeglądaj zużycie paliwa'
        },
        {
            title: 'Awarie',
            icon: <AlertTriangle className="w-6 h-6" />,
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
            icon: <Calendar className="w-6 h-6" />,
            path: '/installations',
            color: 'bg-gradient-to-br from-orange-500 to-orange-600',
            textColor: 'text-white',
            description: 'Zarządzaj montażami i ekipami'
        },
        {
            title: 'Baza Ofert',
            icon: <FileText className="w-6 h-6" />,
            path: '/offers',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Wszystkie oferty i umowy'
        },
        {
            title: 'Użytkownicy',
            icon: <Users className="w-6 h-6" />,
            path: '/admin/users',
            color: 'bg-white',
            textColor: 'text-slate-700',
            border: 'border-slate-200',
            description: 'Zarządzaj zespołem'
        },
        {
            title: 'Zgłoszenia serwisowe',
            icon: <Settings className="w-6 h-6" />,
            path: '/service',
            color: 'bg-gradient-to-br from-amber-500 to-amber-600',
            textColor: 'text-white',
            description: 'Reklamacje i naprawy'
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

            {/* Wallet Widget for Manager — no balance, just recent activity */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Portfel — ostatnie transakcje</h2>
                            <p className="text-xs text-slate-400">5 najnowszych wpisów</p>
                        </div>
                    </div>
                    <Link
                        to="/admin/wallet"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        Zobacz wszystkie &rarr;
                    </Link>
                </div>
                <div>
                    {walletLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                        </div>
                    ) : recentTransactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <p>Brak transakcji</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {recentTransactions.map(tx => (
                                <div key={tx.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {tx.type === 'income' ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{tx.description || tx.category}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(tx.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                            {tx.processedByName && <span> · {tx.processedByName}</span>}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action: any, index: number) => (
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
                                <span className="font-bold text-lg block">
                                    {action.title}
                                    {action.badge > 0 && (
                                        <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 bg-white/30 text-white text-[11px] font-bold rounded-full">
                                            {action.badge > 99 ? '99+' : action.badge}
                                        </span>
                                    )}
                                </span>
                                <span className={`text-xs ${action.color.includes('gradient') ? 'text-white/80' : 'text-slate-400'}`}>{action.description}</span>
                            </div>
                        </div>
                        {/* Decorative circle */}
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${action.color.includes('gradient') ? 'bg-white' : 'bg-accent'}`} />
                    </Link>
                ))}
            </section>

            {/* Service Tickets Widget */}
            <ServiceTicketsWidget />

        </div>
    );
};
