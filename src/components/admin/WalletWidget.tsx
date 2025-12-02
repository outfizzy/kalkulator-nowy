import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import type { WalletStats } from '../../types';

export const WalletWidget: React.FC = () => {
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await DatabaseService.getWalletStats();
            setStats(data);
        } catch (error) {
            console.error('Error loading wallet stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-100 rounded w-2/3 mb-4"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(amount);
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

            <div className="relative z-10 flex-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Wirtualny Portfel</h2>
                    </div>
                    <Link
                        to="/admin/wallet"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Zobacz szczegóły &rarr;
                    </Link>
                </div>

                <div className="mb-6">
                    <p className="text-slate-500 text-sm mb-1">Aktualne Saldo</p>
                    <h3 className={`text-3xl font-bold ${stats && stats.currentBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                        {stats ? formatCurrency(stats.currentBalance) : '0,00 zł'}
                    </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-emerald-600 text-xs font-medium mb-1">Wpływy (Miesiąc)</p>
                        <p className="text-emerald-700 font-bold">
                            +{stats ? formatCurrency(stats.monthlyIncome) : '0,00 zł'}
                        </p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                        <p className="text-red-600 text-xs font-medium mb-1">Wydatki (Miesiąc)</p>
                        <p className="text-red-700 font-bold">
                            -{stats ? formatCurrency(stats.monthlyExpense) : '0,00 zł'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-6 pt-6 border-t border-slate-100">
                <Link
                    to="/admin/wallet"
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl hover:bg-slate-700 transition-colors font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Dodaj Transakcję
                </Link>
            </div>
        </div>
    );
};
