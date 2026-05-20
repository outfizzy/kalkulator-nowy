import React, { useState, useEffect } from 'react';
import type { WalletTransaction } from '../../types';

interface DepositToBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeposit: (amount: number) => Promise<void>;
    transaction: WalletTransaction | null;
}

export const DepositToBankModal: React.FC<DepositToBankModalProps> = ({
    isOpen,
    onClose,
    onDeposit,
    transaction
}) => {
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const alreadyDeposited = transaction?.depositedAmount || 0;
    const remaining = transaction ? transaction.amount - alreadyDeposited : 0;

    useEffect(() => {
        if (isOpen && transaction) {
            // Pre-fill with remaining amount
            setAmount(remaining.toFixed(2));
            setError(null);
        }
    }, [isOpen, transaction]);

    if (!isOpen || !transaction) return null;

    const formatCurrency = (val: number, currency: 'EUR' | 'PLN' = 'EUR') => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: currency
        }).format(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            setError('Podaj prawidłową kwotę');
            return;
        }
        if (depositAmount > remaining) {
            setError(`Kwota nie może przekraczać ${formatCurrency(remaining, transaction.currency)}`);
            return;
        }

        setLoading(true);
        try {
            await onDeposit(depositAmount);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Wystąpił błąd');
        } finally {
            setLoading(false);
        }
    };

    const depositAll = () => {
        setAmount(remaining.toFixed(2));
    };

    const percentageDeposited = transaction.amount > 0
        ? ((alreadyDeposited / transaction.amount) * 100)
        : 0;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Wpłata na konto</h3>
                            <p className="text-blue-100 text-sm">Wpłać gotówkę na konto bankowe</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Transaction Info */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Transakcja</span>
                            <span className="text-sm font-medium text-slate-800">
                                {transaction.customerName || transaction.category}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Kwota transakcji</span>
                            <span className="text-sm font-bold text-slate-800">
                                {formatCurrency(transaction.amount, transaction.currency)}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-slate-500">Wpłacono na konto</span>
                                <span className="text-xs font-medium text-blue-600">
                                    {formatCurrency(alreadyDeposited, transaction.currency)} ({percentageDeposited.toFixed(0)}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(percentageDeposited, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-sm font-medium text-slate-600">Pozostało w gotówce</span>
                            <span className="text-sm font-bold text-amber-600">
                                {formatCurrency(remaining, transaction.currency)}
                            </span>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Kwota do wpłaty na konto
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={remaining}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                {transaction.currency}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={depositAll}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Wpłać całość ({formatCurrency(remaining, transaction.currency)})
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                            disabled={loading}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            )}
                            Wpłać na konto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
