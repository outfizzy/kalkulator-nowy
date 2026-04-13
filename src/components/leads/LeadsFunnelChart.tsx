import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import type { Lead } from '../../types';

interface LeadsFunnelChartProps {
    leads: Lead[];
}

export const LeadsFunnelChart: React.FC<LeadsFunnelChartProps> = ({ leads }) => {
    // 1. Aggregate Data
    const stats = {
        total: leads.length,
        newAll: leads.filter(l => ['new', 'formularz'].includes(l.status)).length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        measurement: leads.filter(l => ['measurement_scheduled', 'measurement_completed'].includes(l.status)).length,
        offer_sent: leads.filter(l => l.status === 'offer_sent').length,
        negotiation: leads.filter(l => l.status === 'negotiation').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost').length,
    };

    const totalClosed = stats.won + stats.lost;
    const winRate = totalClosed > 0 ? ((stats.won / totalClosed) * 100).toFixed(1) : '—';

    // Simple Distribution visualization
    const data = [
        { name: 'Nowe', count: stats.newAll, color: '#93c5fd' },
        { name: 'Kontakt', count: stats.contacted, color: '#a5b4fc' },
        { name: 'Pomiar', count: stats.measurement, color: '#67e8f9' },
        { name: 'Oferta', count: stats.offer_sent, color: '#fcd34d' },
        { name: 'Negocjacje', count: stats.negotiation, color: '#fdba74' },
        { name: 'Wygrane', count: stats.won, color: '#86efac' },
        { name: 'Utracone', count: stats.lost, color: '#fca5a5' },
    ];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Lejek Sprzedażowy (Rozkład)
            </h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600">
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-slate-800">{stats.total}</span>
                    <span className="text-xs">Wszystkie</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-blue-600">{stats.newAll}</span>
                    <span className="text-xs">Nowe</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-green-600">{stats.won}</span>
                    <span className="text-xs">Wygrane</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-red-500">{stats.lost}</span>
                    <span className="text-xs">Utracone</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-emerald-700">
                        {winRate === '—' ? '—' : `${winRate}%`}
                    </span>
                    <span className="text-xs">Win Rate</span>
                </div>
            </div>
        </div>
    );
};
