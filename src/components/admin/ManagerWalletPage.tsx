import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { WalletTransaction } from '../../types';
import { AddTransactionModal } from './AddTransactionModal';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths } from 'date-fns';

type DateRangePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'custom';

/**
 * ManagerWalletPage - Limited wallet view for managers
 * Features:
 * - Can add/view transactions
 * - CANNOT see current balance or monthly stats
 * - Read-only view of transaction history
 */
export const ManagerWalletPage: React.FC = () => {
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('income');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    // Date filtering
    const [datePreset, setDatePreset] = useState<DateRangePreset>('thisMonth');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const txs = await DatabaseService.getWalletTransactions();
            setAllTransactions(txs);
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Apply date filtering
    useEffect(() => {
        const now = new Date();
        let start: Date, end: Date;

        switch (datePreset) {
            case 'thisMonth':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'lastMonth': {
                const lastMonth = subMonths(now, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            }
            case 'thisQuarter':
                start = startOfQuarter(now);
                end = endOfQuarter(now);
                break;
            case 'custom':
                start = customStartDate ? new Date(customStartDate) : startOfMonth(now);
                end = customEndDate ? new Date(customEndDate) : endOfMonth(now);
                break;
        }

        const filtered = allTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= start && txDate <= end;
        });
        setTransactions(filtered);
    }, [allTransactions, datePreset, customStartDate, customEndDate]);

    const filteredTransactions = transactions.filter(t => {
        if (filterType === 'all') return true;
        return t.type === filterType;
    });

    const formatCurrency = (amount: number, currency: 'EUR' | 'PLN' = 'EUR') => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Portfel - Transakcje</h1>
                    <p className="text-slate-500 mt-1">Dodawanie wpłat i wypłat</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setModalType('expense');
                            setShowAddModal(true);
                        }}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        Dodaj Wydatek
                    </button>
                    <button
                        onClick={() => {
                            setModalType('income');
                            setShowAddModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Dodaj Wpłatę
                    </button>
                </div>
            </div>

            {/* Info Banner - No Balance Visible */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <div className="text-amber-500 text-2xl">ℹ️</div>
                <div>
                    <p className="font-medium text-amber-800">Widok Managera</p>
                    <p className="text-sm text-amber-600">Możesz dodawać wpłaty i wypłaty. Saldo nie jest widoczne w tym widoku.</p>
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Zakres Dat</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        onClick={() => setDatePreset('thisMonth')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${datePreset === 'thisMonth'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Ten Miesiąc
                    </button>
                    <button
                        onClick={() => setDatePreset('lastMonth')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${datePreset === 'lastMonth'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Poprzedni Miesiąc
                    </button>
                    <button
                        onClick={() => setDatePreset('thisQuarter')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${datePreset === 'thisQuarter'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Ten Kwartał
                    </button>
                    <button
                        onClick={() => setDatePreset('custom')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${datePreset === 'custom'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Własny Zakres
                    </button>
                </div>
                {datePreset === 'custom' && (
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Od</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Do</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Historia Transakcji</h2>

                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Wszystkie
                            </button>
                            <button
                                onClick={() => setFilterType('income')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Wpływy
                            </button>
                            <button
                                onClick={() => setFilterType('expense')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Wydatki
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Typ / Kategoria</th>
                                <th className="px-6 py-4">Opis / Klient</th>
                                <th className="px-6 py-4 text-right">Kwota</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Ładowanie transakcji...
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Brak transakcji w historii
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {formatDate(tx.date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    {tx.type === 'income' ? (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{tx.category}</p>
                                                    <p className="text-xs text-slate-400 uppercase">{tx.type === 'income' ? 'Wpływ' : 'Wydatek'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {tx.type === 'income' && tx.customerName ? (
                                                <div>
                                                    <p className="font-medium text-slate-800">{tx.customerName}</p>
                                                    {tx.description && <p className="text-sm text-slate-500">{tx.description}</p>}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-600">{tx.description || '-'}</p>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddTransactionModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={loadData}
                initialType={modalType}
            />
        </div>
    );
};
