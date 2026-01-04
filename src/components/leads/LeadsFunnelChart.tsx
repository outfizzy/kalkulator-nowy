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
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        offer_sent: leads.filter(l => l.status === 'offer_sent').length,
        negotiation: leads.filter(l => l.status === 'negotiation').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost').length,
    };

    // 2. Prepare Funnel Stages
    // Funnel Logic: "Contacted" effectively includes "Offer Sent", "Negotiation", "Won" etc. for a true funnel?
    // Or just distribution? A classic sales funnel usually implies count of opportunities that reached AT LEAST that stage.
    // Let's stick to Distribution first, it's easier to verify. Or specialized Funnel Calculation.

    // Simple Distribution visualization
    const data = [
        { name: 'Nowe', count: stats.new, color: '#93c5fd' }, // blue-300
        { name: 'Kontakt', count: stats.contacted, color: '#fcd34d' }, // yellow-300
        { name: 'Oferta', count: stats.offer_sent, color: '#a5b4fc' }, // indigo-300
        { name: 'Negocjacje', count: stats.negotiation, color: '#fdba74' }, // orange-300
        { name: 'Wygrane', count: stats.won, color: '#86efac' }, // green-300
        { name: 'Utracone', count: stats.lost, color: '#fca5a5' }, // red-300
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
                    <span className="font-bold text-lg text-green-600">{stats.won}</span>
                    <span className="text-xs">Wygrane</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-slate-800">
                        {stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-xs">Konwersja</span>
                </div>
            </div>
        </div>
    );
};
