import React, { useMemo } from 'react';
import type { Contract } from '../../types';

interface ContractStatsProps {
    contracts: Contract[];
}

interface RepStats {
    repId: string;
    repName: string;
    count: number;
    totalValueNet: number;
    totalCommission: number;
    totalProfit: number;
}

export const ContractStats: React.FC<ContractStatsProps> = ({ contracts }) => {
    const stats = useMemo(() => {
        const repMap = new Map<string, RepStats>();

        contracts.forEach(contract => {
            // Use salesRep as primary owner, fallback to 'Unknown'
            const repId = contract.salesRepId || 'unknown';
            const repName = contract.salesRep
                ? `${contract.salesRep.firstName} ${contract.salesRep.lastName}`
                : 'Brak przypisania';

            if (!repMap.has(repId)) {
                repMap.set(repId, {
                    repId,
                    repName,
                    count: 0,
                    totalValueNet: 0,
                    totalCommission: 0,
                    totalProfit: 0
                });
            }

            const current = repMap.get(repId)!;
            current.count += 1;
            // Ensure numbers are numbers
            current.totalValueNet += Number(contract.pricing?.sellingPriceNet || 0);
            current.totalCommission += Number(contract.commission || 0);
            current.totalProfit += Number(contract.pricing?.marginValue || 0);
        });

        // Convert to array and sort by Total Profit desc
        return Array.from(repMap.values()).sort((a, b) => b.totalProfit - a.totalProfit);
    }, [contracts]);

    const totals = useMemo(() => {
        return stats.reduce((acc, curr) => ({
            count: acc.count + curr.count,
            totalValueNet: acc.totalValueNet + curr.totalValueNet,
            totalCommission: acc.totalCommission + curr.totalCommission,
            totalProfit: acc.totalProfit + curr.totalProfit
        }), { count: 0, totalValueNet: 0, totalCommission: 0, totalProfit: 0 });
    }, [stats]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Statystyki Sprzedaży (wg Przedstawiciela)
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">Przedstawiciel</th>
                            <th className="px-4 py-3 text-right">Liczba Umów</th>
                            <th className="px-4 py-3 text-right">Wartość Netto</th>
                            <th className="px-4 py-3 text-right">Prowizja</th>
                            <th className="px-4 py-3 text-right rounded-r-lg">Zysk Potencjalny</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stats.map((stat) => (
                            <tr key={stat.repId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {stat.repName}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    {stat.count}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-700">
                                    {formatCurrency(stat.totalValueNet)}
                                </td>
                                <td className="px-4 py-3 text-right text-indigo-600 font-medium">
                                    {formatCurrency(stat.totalCommission)}
                                </td>
                                <td className="px-4 py-3 text-right text-green-600 font-bold">
                                    {formatCurrency(stat.totalProfit)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-800">
                        <tr>
                            <td className="px-4 py-3 rounded-l-lg">RAZEM</td>
                            <td className="px-4 py-3 text-right">{totals.count}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(totals.totalValueNet)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(totals.totalCommission)}</td>
                            <td className="px-4 py-3 text-right rounded-r-lg">{formatCurrency(totals.totalProfit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
