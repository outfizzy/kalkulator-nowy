import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { WalletTransaction, WalletStats } from '../../types';
import { AddTransactionModal } from './AddTransactionModal';
import { ExchangeRateModal } from './ExchangeRateModal';
import { DeleteTransactionModal } from './DeleteTransactionModal';
import { BalanceExchangeModal } from './BalanceExchangeModal';
import { CashFlowChart } from './CashFlowChart';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths } from 'date-fns';

type DateRangePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'custom';

export const WalletPage: React.FC = () => {
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('income');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    // Date filtering
    const [datePreset, setDatePreset] = useState<DateRangePreset>('thisMonth');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);

    // Exchange Modal State
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [exchangeTransactionId, setExchangeTransactionId] = useState<string | null>(null);
    const [exchangeAmount, setExchangeAmount] = useState<number>(0);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTransaction, setDeleteTransaction] = useState<WalletTransaction | null>(null);

    // Deleted transactions view
    const [showDeleted, setShowDeleted] = useState(false);
    const [deletedTransactions, setDeletedTransactions] = useState<any[]>([]);

    // Kantor Modal State
    const [showKantorModal, setShowKantorModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const txs = await DatabaseService.getWalletTransactions();
            setAllTransactions(txs);
            const statsData = await DatabaseService.getWalletStats();
            setStats(statsData);
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

    const handleDelete = async (reason: string) => {
        if (!deleteTransaction) return;
        await DatabaseService.deleteWalletTransaction(deleteTransaction.id, reason);
        await loadData(); // Reload data
        setDeleteTransaction(null);
        setShowDeleteModal(false);
    };

    const openDeleteModal = (transaction: WalletTransaction) => {
        setDeleteTransaction(transaction);
        setShowDeleteModal(true);
    };

    const loadDeletedTransactions = async () => {
        try {
            const deleted = await DatabaseService.getDeletedWalletTransactions();
            setDeletedTransactions(deleted);
        } catch (error) {
            console.error('Error loading deleted transactions:', error);
        }
    };

    useEffect(() => {
        if (showDeleted) {
            loadDeletedTransactions();
        }
    }, [showDeleted]);

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

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
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
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => setShowKantorModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Kantor
                    </button>
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-2">Aktualne Saldo</p>
                    <div className="space-y-1">
                        <h3 className={`text-2xl font-bold ${stats && stats.pln.currentBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            {stats ? formatCurrency(stats.pln.currentBalance, 'PLN') : '0,00 zł'}
                        </h3>
                        <h3 className={`text-xl font-semibold ${stats && stats.eur.currentBalance >= 0 ? 'text-slate-600' : 'text-red-500'}`}>
                            {stats ? formatCurrency(stats.eur.currentBalance, 'EUR') : '0,00 €'}
                        </h3>
                    </div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-emerald-600 text-sm font-medium mb-2">Wpływy (Miesiąc)</p>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-emerald-700">
                            +{stats ? formatCurrency(stats.pln.monthlyIncome, 'PLN') : '0,00 zł'}
                        </h3>
                        <h3 className="text-xl font-semibold text-emerald-600/80">
                            +{stats ? formatCurrency(stats.eur.monthlyIncome, 'EUR') : '0,00 €'}
                        </h3>
                    </div>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                    <p className="text-red-600 text-sm font-medium mb-2">Wydatki (Miesiąc)</p>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-red-700">
                            -{stats ? formatCurrency(stats.pln.monthlyExpense, 'PLN') : '0,00 zł'}
                        </h3>
                        <h3 className="text-xl font-semibold text-red-600/80">
                            -{stats ? formatCurrency(stats.eur.monthlyExpense, 'EUR') : '0,00 €'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Cash Flow Chart */}
            <CashFlowChart transactions={allTransactions} months={6} />

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
                    {/* Tab Switcher */}
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => setShowDeleted(false)}
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${!showDeleted
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Aktywne Transakcje ({transactions.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setShowDeleted(true)}
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${showDeleted
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Usunięte Transakcje ({deletedTransactions.length})
                            </div>
                        </button>
                    </div>

                    {!showDeleted && (
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
                    )}
                </div>

                <div className="overflow-x-auto">
                    {!showDeleted ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Typ / Kategoria</th>
                                    <th className="px-6 py-4">Opis / Klient</th>
                                    <th className="px-6 py-4">Wprowadził</th>
                                    <th className="px-6 py-4 text-right">Kwota</th>
                                    <th className="px-6 py-4 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            Ładowanie transakcji...
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
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
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{tx.processedByName || '—'}</p>
                                                    <p className="text-xs text-slate-400">{formatTime(tx.createdAt)}</p>
                                                </div>
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
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openDeleteModal(tx)}
                                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title="Usuń transakcję"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-red-50 text-red-900 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Usunięto</th>
                                    <th className="px-6 py-4">Powód usunięcia</th>
                                    <th className="px-6 py-4">Oryginalna Data</th>
                                    <th className="px-6 py-4">Typ / Kategoria</th>
                                    <th className="px-6 py-4">Opis / Klient</th>
                                    <th className="px-6 py-4">Wprowadził</th>
                                    <th className="px-6 py-4 text-right">Kwota</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-100 bg-red-50/30">
                                {deletedTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                            Brak usuniętych transakcji
                                        </td>
                                    </tr>
                                ) : (
                                    deletedTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-red-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                <div className="font-medium text-slate-800">{formatDate(tx.deletedAt)}</div>
                                                <div className="text-xs text-slate-500">przez {tx.deletedByName || 'Nieznany'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-red-600 font-medium">
                                                {tx.deletionReason}
                                            </td>
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
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-slate-700">{tx.processedByName || '—'}</p>
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
                    )}
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

            <DeleteTransactionModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onDelete={handleDelete}
                transaction={deleteTransaction}
            />

            <BalanceExchangeModal
                isOpen={showKantorModal}
                onClose={() => setShowKantorModal(false)}
                onSuccess={loadData}
                eurBalance={stats?.eur.currentBalance || 0}
                plnBalance={stats?.pln.currentBalance || 0}
            />
        </div>
    );
};
