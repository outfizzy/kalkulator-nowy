import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import toast from 'react-hot-toast';

interface BalanceExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    eurBalance: number;
    plnBalance: number;
}

export const BalanceExchangeModal: React.FC<BalanceExchangeModalProps> = ({
    isOpen, onClose, onSuccess, eurBalance, plnBalance
}) => {
    const [fromCurrency, setFromCurrency] = useState<'EUR' | 'PLN'>('EUR');
    const [amount, setAmount] = useState<string>('');
    const [rate, setRate] = useState<string>('4.28');
    const [loading, setLoading] = useState(false);
    const [fetchingRate, setFetchingRate] = useState(false);

    const toCurrency = fromCurrency === 'EUR' ? 'PLN' : 'EUR';
    const availableBalance = fromCurrency === 'EUR' ? eurBalance : plnBalance;
    const parsedAmount = parseFloat(amount) || 0;
    const parsedRate = parseFloat(rate) || 0;
    const convertedAmount = fromCurrency === 'EUR'
        ? parsedAmount * parsedRate
        : parsedAmount / parsedRate;

    // Fetch NBP rate
    const fetchNBPRate = useCallback(async () => {
        setFetchingRate(true);
        try {
            const res = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json');
            const data = await res.json();
            const nbpRate = data.rates?.[0]?.mid;
            if (nbpRate) {
                setRate(nbpRate.toFixed(4));
                toast.success(`Kurs NBP: ${nbpRate.toFixed(4)} PLN/EUR`);
            }
        } catch {
            toast.error('Nie udało się pobrać kursu NBP');
        } finally {
            setFetchingRate(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNBPRate();
            setAmount('');
        }
    }, [isOpen, fetchNBPRate]);

    const handleSwap = () => {
        setFromCurrency(prev => prev === 'EUR' ? 'PLN' : 'EUR');
        setAmount('');
    };

    const handleSubmit = async () => {
        if (parsedAmount <= 0) { toast.error('Podaj kwotę'); return; }
        if (parsedRate <= 0) { toast.error('Podaj kurs'); return; }
        if (parsedAmount > availableBalance) { toast.error('Niewystarczające saldo!'); return; }

        setLoading(true);
        try {
            const actualRate = fromCurrency === 'EUR' ? parsedRate : (1 / parsedRate);

            await DatabaseService.balanceExchange({
                fromCurrency,
                toCurrency,
                amount: parsedAmount,
                exchangeRate: fromCurrency === 'EUR' ? parsedRate : (1 / parsedRate),
            });

            toast.success(`Wymieniono ${parsedAmount.toFixed(2)} ${fromCurrency} → ${convertedAmount.toFixed(2)} ${toCurrency}`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error('Błąd wymiany: ' + (err.message || 'Nieznany'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Kantor</h2>
                                <p className="text-sm text-white/70">Wymiana walut z salda</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* From */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Sprzedajesz</span>
                            <span className="text-xs text-slate-400">
                                Saldo: <span className="font-bold text-slate-600">{availableBalance.toFixed(2)} {fromCurrency}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="flex-1 text-2xl font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                            />
                            <span className="text-lg font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                {fromCurrency === 'EUR' ? '€' : 'zł'} {fromCurrency}
                            </span>
                        </div>
                        {parsedAmount > availableBalance && (
                            <p className="text-red-500 text-xs mt-2 font-medium">⚠️ Przekracza dostępne saldo!</p>
                        )}
                        <button
                            onClick={() => setAmount(availableBalance.toFixed(2))}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1"
                        >
                            Wymień całe saldo
                        </button>
                    </div>

                    {/* Swap button + Rate */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSwap}
                            className="w-10 h-10 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center transition-all hover:rotate-180 duration-300 mx-auto"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </button>
                        <div className="flex-1 flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                            <span className="text-xs font-bold text-amber-700 whitespace-nowrap">Kurs:</span>
                            <input
                                type="number"
                                step="0.0001"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className="flex-1 text-sm font-bold text-amber-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                            />
                            <span className="text-xs text-amber-600 whitespace-nowrap">PLN/EUR</span>
                            <button
                                onClick={fetchNBPRate}
                                disabled={fetchingRate}
                                className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 px-2 py-1 rounded-md font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                                {fetchingRate ? '...' : 'NBP'}
                            </button>
                        </div>
                    </div>

                    {/* To */}
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-500 uppercase">Kupujesz</span>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="flex-1 text-2xl font-bold text-emerald-700">
                                {parsedAmount > 0 ? convertedAmount.toFixed(2) : '0.00'}
                            </span>
                            <span className="text-lg font-bold text-emerald-600 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                                {toCurrency === 'EUR' ? '€' : 'zł'} {toCurrency}
                            </span>
                        </div>
                    </div>

                    {/* Summary */}
                    {parsedAmount > 0 && parsedRate > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-500 space-y-1">
                            <div className="flex justify-between">
                                <span>Kurs wymiany:</span>
                                <span className="font-bold text-slate-700">1 EUR = {parsedRate} PLN</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Transakcje:</span>
                                <span className="font-bold text-slate-700">
                                    -{parsedAmount.toFixed(2)} {fromCurrency} / +{convertedAmount.toFixed(2)} {toCurrency}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || parsedAmount <= 0 || parsedRate <= 0 || parsedAmount > availableBalance}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 text-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                Wymieniam...
                            </span>
                        ) : (
                            `Wymień ${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'} ${fromCurrency} → ${parsedAmount > 0 ? convertedAmount.toFixed(2) : '0.00'} ${toCurrency}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
