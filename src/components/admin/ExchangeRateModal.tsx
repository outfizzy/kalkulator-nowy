import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ExchangeRateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExchange: (exchangeRate: number) => Promise<void>;
    currentAmount: number;
}

export const ExchangeRateModal: React.FC<ExchangeRateModalProps> = ({ isOpen, onClose, onExchange, currentAmount }) => {
    const [exchangeRate, setExchangeRate] = useState('');
    const [loading, setLoading] = useState(false);

    const convertedAmount = exchangeRate ? (currentAmount * parseFloat(exchangeRate)).toFixed(2) : '0.00';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const rate = parseFloat(exchangeRate);
        if (!rate || rate <= 0) {
            toast.error('Podaj poprawny kurs wymiany');
            return;
        }

        try {
            setLoading(true);
            await onExchange(rate);
            toast.success('Waluta wymieniona pomyślnie');
            onClose();
            setExchangeRate('');
        } catch (error) {
            console.error('Error exchanging currency:', error);
            toast.error('Błąd podczas wymiany waluty');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Wymiana EUR → PLN</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-sm text-slate-600 mb-1">Kwota w EUR</p>
                        <p className="text-2xl font-bold text-slate-800">€{currentAmount.toFixed(2)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Kurs wymiany (1 EUR = ? PLN)
                        </label>
                        <input
                            type="number"
                            step="0.0001"
                            required
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg"
                            placeholder="np. 4.35"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Aktualny kurs sprawdź na: <a href="https://www.nbp.pl/home.aspx?f=/kursy/kursy.htm" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">NBP</a>
                        </p>
                    </div>

                    {exchangeRate && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <p className="text-sm text-emerald-600 mb-1">Kwota po wymianie</p>
                            <p className="text-2xl font-bold text-emerald-700">{convertedAmount} zł</p>
                            <p className="text-xs text-emerald-600 mt-1">
                                Kurs: 1 EUR = {parseFloat(exchangeRate).toFixed(4)} PLN
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !exchangeRate}
                            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Wymieniam...' : 'Wymień walutę'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
