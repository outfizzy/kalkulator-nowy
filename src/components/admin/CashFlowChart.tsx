import React, { useMemo, useState } from 'react';
import type { WalletTransaction } from '../../types';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CashFlowChartProps {
    transactions: WalletTransaction[];
    months?: number;
}

interface MonthData {
    label: string;
    income: number;
    expense: number;
    net: number;
}

type CurrencyFilter = 'PLN' | 'EUR' | 'all';

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions, months = 6 }) => {
    const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');

    const monthData = useMemo(() => {
        const now = new Date();
        const data: MonthData[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);

            let income = 0;
            let expense = 0;

            transactions.forEach(tx => {
                const txDate = new Date(tx.date);
                if (txDate >= mStart && txDate <= mEnd) {
                    // Filter by currency
                    if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return;

                    const amount = tx.amount;
                    if (tx.type === 'income') income += amount;
                    else expense += amount;
                }
            });

            data.push({
                label: format(monthDate, 'LLL', { locale: pl }),
                income,
                expense,
                net: income - expense,
            });
        }
        return data;
    }, [transactions, months, currencyFilter]);

    const maxValue = useMemo(() => {
        let max = 0;
        monthData.forEach(m => {
            max = Math.max(max, m.income, m.expense);
        });
        return max || 1;
    }, [monthData]);

    const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthData.reduce((s, m) => s + m.expense, 0);
    const totalNet = totalIncome - totalExpense;

    const currencySymbol = currencyFilter === 'EUR' ? '€' : currencyFilter === 'PLN' ? 'zł' : '';
    const formatVal = (v: number) => {
        if (currencyFilter === 'EUR') return `${v.toFixed(0)} €`;
        if (currencyFilter === 'PLN') return `${v.toFixed(0)} zł`;
        return v.toFixed(0);
    };

    const barHeight = 140;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Cash Flow</h3>
                    <p className="text-xs text-slate-400">Ostatnie {months} miesięcy</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Currency Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {([
                            { id: 'all' as CurrencyFilter, label: 'Razem' },
                            { id: 'PLN' as CurrencyFilter, label: 'PLN 🇵🇱' },
                            { id: 'EUR' as CurrencyFilter, label: 'EUR 🇪🇺' },
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setCurrencyFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    currencyFilter === tab.id
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                            <span className="text-slate-500 font-medium">Wpływy</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-red-400"></div>
                            <span className="text-slate-500 font-medium">Wydatki</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-bold uppercase text-emerald-500">Suma wpływów</div>
                    <div className="text-lg font-black text-emerald-700">{formatVal(totalIncome)}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-bold uppercase text-red-400">Suma wydatków</div>
                    <div className="text-lg font-black text-red-600">{formatVal(totalExpense)}</div>
                </div>
                <div className={`rounded-xl p-3 text-center ${totalNet >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
                    <div className={`text-[10px] font-bold uppercase ${totalNet >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>Bilans netto</div>
                    <div className={`text-lg font-black ${totalNet >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                        {totalNet >= 0 ? '+' : ''}{formatVal(totalNet)}
                    </div>
                </div>
            </div>

            {currencyFilter === 'all' && (
                <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                    ⚠️ Widok "Razem" sumuje PLN + EUR bez przeliczenia. Wybierz konkretną walutę dla dokładnych danych.
                </div>
            )}

            {/* Bar Chart */}
            <div className="flex items-end gap-2 justify-between" style={{ height: barHeight + 40 }}>
                {monthData.map((month, idx) => {
                    const incomeH = (month.income / maxValue) * barHeight;
                    const expenseH = (month.expense / maxValue) * barHeight;

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                <div className="bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg shadow-lg whitespace-nowrap -translate-y-full">
                                    <div className="font-bold mb-1 capitalize">{month.label}</div>
                                    <div className="text-emerald-300">▲ {formatVal(month.income)}</div>
                                    <div className="text-red-300">▼ {formatVal(month.expense)}</div>
                                    <div className={`mt-1 pt-1 border-t border-slate-600 font-bold ${month.net >= 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                                        Netto: {month.net >= 0 ? '+' : ''}{formatVal(month.net)}
                                    </div>
                                </div>
                            </div>

                            {/* Bars */}
                            <div className="flex items-end gap-1 w-full justify-center" style={{ height: barHeight }}>
                                <div className="relative flex-1 max-w-[24px]">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all duration-500 ease-out hover:from-emerald-600 hover:to-emerald-500"
                                        style={{ height: `${Math.max(incomeH, 2)}px` }}
                                    />
                                </div>
                                <div className="relative flex-1 max-w-[24px]">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-400 to-red-300 rounded-t-md transition-all duration-500 ease-out hover:from-red-500 hover:to-red-400"
                                        style={{ height: `${Math.max(expenseH, 2)}px` }}
                                    />
                                </div>
                            </div>

                            {/* Label */}
                            <div className="text-[11px] font-bold text-slate-400 mt-2 capitalize">{month.label}</div>

                            {/* Net indicator */}
                            <div className={`text-[9px] font-bold ${month.net >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {month.net >= 0 ? '+' : ''}{formatVal(month.net)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Baseline */}
            <div className="mt-1 border-t border-slate-200"></div>
        </div>
    );
};
