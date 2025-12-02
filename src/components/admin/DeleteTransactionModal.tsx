import React, { useState } from 'react';
import type { WalletTransaction } from '../../types';

interface DeleteTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: (reason: string) => Promise<void>;
    transaction: WalletTransaction | null;
}

export const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({
    isOpen,
    onClose,
    onDelete,
    transaction
}) => {
    const [reason, setReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Powód usunięcia jest wymagany');
            return;
        }

        setIsDeleting(true);
        setError('');

        try {
            await onDelete(reason);
            setReason('');
            onClose();
        } catch (err) {
            setError('Błąd podczas usuwania transakcji');
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatCurrency = (amount: number, currency: 'EUR' | 'PLN') => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Usuń Transakcję</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Transaction Summary */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <div className="text-sm text-slate-600 mb-2">Usuwana transakcja:</div>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-800">{transaction.category}</div>
                            {transaction.customerName && (
                                <div className="text-sm text-slate-600">{transaction.customerName}</div>
                            )}
                            <div className="text-xs text-slate-500">
                                {new Date(transaction.date).toLocaleDateString('pl-PL')}
                            </div>
                        </div>
                        <div className={`text-xl font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Powód usunięcia <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="np. Błędne wprowadzenie, duplikat, anulowana transakcja..."
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            rows={4}
                            disabled={isDeleting}
                        />
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={isDeleting}
                            className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Usuwanie...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Usuń Transakcję
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex gap-2">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-yellow-800">
                            Usunięta transakcja zostanie przeniesiona do historii usuniętych transakcji i będzie można ją przeglądać.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
