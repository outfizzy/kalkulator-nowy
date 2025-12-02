import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { WalletTransaction, WalletStats } from '../../types';
import { AddTransactionModal } from './AddTransactionModal';
import { ExchangeRateModal } from './ExchangeRateModal';

export const WalletPage: React.FC = () => {
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('income');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    // Exchange Modal State
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [exchangeTransactionId, setExchangeTransactionId] = useState<string | null>(null);
    const [exchangeAmount, setExchangeAmount] = useState<number>(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txs, statsData] = await Promise.all([
                DatabaseService.getWalletTransactions(),
                DatabaseService.getWalletStats()
            ]);
            setTransactions(txs);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExchange = async (rate: number) => {
        if (!exchangeTransactionId) return;
        try {
            await DatabaseService.exchangeWalletTransaction(exchangeTransactionId, rate);
            await loadData(); // Reload data to reflect changes
            setShowExchangeModal(false);
            setExchangeTransactionId(null);
        } catch (error) {
            console.error('Error exchanging currency:', error);
            throw error; // Re-throw to be handled by the modal
        }
    };

    const openExchangeModal = (transaction: WalletTransaction) => {
        setExchangeTransactionId(transaction.id);
        setExchangeAmount(transaction.amount);
        setShowExchangeModal(true);
    };

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
                    <h1 className="text-3xl font-bold text-slate-800">Wirtualny Portfel</h1>
                    <p className="text-slate-500 mt-1">Zarządzanie finansami i przepływem gotówki</p>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-2">Aktualne Saldo</p>
                    <h3 className={`text-3xl font-bold ${stats && stats.currentBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                        {stats ? formatCurrency(stats.currentBalance) : '0,00 zł'}
                    </h3>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-emerald-600 text-sm font-medium mb-2">Wpływy (Miesiąc)</p>
                    <h3 className="text-3xl font-bold text-emerald-700">
                        +{stats ? formatCurrency(stats.monthlyIncome) : '0,00 zł'}
                    </h3>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                    <p className="text-red-600 text-sm font-medium mb-2">Wydatki (Miesiąc)</p>
                    <h3 className="text-3xl font-bold text-red-700">
                        -{stats ? formatCurrency(stats.monthlyExpense) : '0,00 zł'}
                    </h3>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
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

                                            {tx.currency === 'EUR' && tx.type === 'income' && (
                                                <button
                                                    onClick={() => openExchangeModal(tx)}
                                                    className="ml-3 text-xs font-normal text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                                                >
                                                    Wymień na PLN
                                                </button>
                                            )}

                                            {tx.originalCurrency && (
                                                <div className="text-xs font-normal text-slate-400 mt-1">
                                                    z {formatCurrency(tx.originalAmount || 0, tx.originalCurrency)}
                                                    <span className="ml-1">(kurs: {tx.exchangeRate})</span>
                                                </div>
                                            )}
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

            <ExchangeRateModal
                isOpen={showExchangeModal}
                onClose={() => setShowExchangeModal(false)}
                onExchange={handleExchange}
                currentAmount={exchangeAmount}
            />
        </div>
    );
};
