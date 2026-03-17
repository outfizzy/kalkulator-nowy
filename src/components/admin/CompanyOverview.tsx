import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type OverviewTab = 'summary' | 'sales' | 'installations' | 'contracts' | 'leads';

interface DailySummary {
    date: string;
    offers: number;
    contracts: number;
    installations: number;
    leads: number;
    measurements: number;
    emails: number;
}

const TAB_CONFIG: Record<OverviewTab, { label: string; icon: React.ReactNode; color: string; activeColor: string }> = {
    summary: { label: 'Podsumowanie', icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>), color: 'text-blue-600 bg-blue-50/50', activeColor: 'bg-blue-600' },
    sales: { label: 'Sprzedaż', icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), color: 'text-emerald-600 bg-emerald-50/50', activeColor: 'bg-emerald-600' },
    installations: { label: 'Montaże', icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>), color: 'text-purple-600 bg-purple-50/50', activeColor: 'bg-purple-600' },
    contracts: { label: 'Umowy', icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>), color: 'text-orange-600 bg-orange-50/50', activeColor: 'bg-orange-600' },
    leads: { label: 'Leady', icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>), color: 'text-yellow-600 bg-yellow-50/50', activeColor: 'bg-yellow-600' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

/** Convert a UTC ISO date string to local (CET/CEST) YYYY-MM-DD */
const toLocalDateStr = (isoStr: string): string => {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const CompanyOverview: React.FC = () => {
    const [activeTab, setActiveTab] = useState<OverviewTab>('summary');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        dailySummary: DailySummary[];
        offersByStatus: { name: string; value: number }[];
        contractsByStatus: { name: string; value: number }[];
        installationsByStatus: { name: string; value: number }[];
        leadsBySource: { name: string; value: number }[];
        leadsByStatus: { name: string; value: number }[];
        recentContracts: any[];
        recentInstallations: any[];
        topSalesReps: { name: string; offers: number; sold: number; value: number }[];
    }>({
        dailySummary: [],
        offersByStatus: [],
        contractsByStatus: [],
        installationsByStatus: [],
        leadsBySource: [],
        leadsByStatus: [],
        recentContracts: [],
        recentInstallations: [],
        topSalesReps: [],
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const sinceISO = thirtyDaysAgo.toISOString();

            // 14 days ago for daily chart
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            const since14ISO = fourteenDaysAgo.toISOString();

            // Parallel queries — ALL data for status charts, 30-day for activity
            const [
                offersRes, contractsRes, installationsRes, leadsRes, profilesRes,
                measurementsRes, emailsRes
            ] = await Promise.all([
                supabase.from('offers').select('id, status, created_at, user_id, pricing'),
                supabase.from('contracts').select('id, status, created_at, contract_data'),
                supabase.from('installations').select('id, status, scheduled_date, updated_at, created_at, offer_id'),
                supabase.from('leads').select('id, status, source, created_at, assigned_to'),
                supabase.from('profiles').select('id, full_name'),
                supabase.from('measurements').select('id, status, scheduled_date, created_at, sales_rep_id'),
                supabase.from('customer_communications').select('id, created_at, type').gte('created_at', since14ISO).limit(500),
            ]);

            const offers = offersRes.data || [];
            const contracts = contractsRes.data || [];
            const installations = installationsRes.data || [];
            const leads = leadsRes.data || [];
            const profiles = profilesRes.data || [];
            const measurements = measurementsRes.data || [];
            const emails = emailsRes.data || [];
            const nameMap = new Map(profiles.map(p => [p.id, p.full_name || 'Nieznany']));

            // Build local-date lookup for daily summary (last 14 days)
            const dailySummary: DailySummary[] = [];
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayLabel = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

                dailySummary.push({
                    date: dayLabel,
                    offers: offers.filter(o => o.created_at && toLocalDateStr(o.created_at) === localDateStr).length,
                    contracts: contracts.filter(c => c.created_at && toLocalDateStr(c.created_at) === localDateStr).length,
                    installations: installations.filter(inst => {
                        // Match by scheduled_date (YYYY-MM-DD) or created_at
                        if (inst.scheduled_date === localDateStr) return true;
                        if (inst.created_at && toLocalDateStr(inst.created_at) === localDateStr) return true;
                        return false;
                    }).length,
                    leads: leads.filter(l => l.created_at && toLocalDateStr(l.created_at) === localDateStr).length,
                    measurements: measurements.filter(m => {
                        // Match by scheduled_date (could be Date or string YYYY-MM-DD)
                        const schedStr = typeof m.scheduled_date === 'string' ? m.scheduled_date.split('T')[0] : '';
                        if (schedStr === localDateStr) return true;
                        if (m.created_at && toLocalDateStr(m.created_at) === localDateStr) return true;
                        return false;
                    }).length,
                    emails: emails.filter(e => e.created_at && toLocalDateStr(e.created_at) === localDateStr).length,
                });
            }

            // Offers by status (ALL offers, not just 30 days)
            const statusLabels: Record<string, string> = {
                new: 'Nowe', draft: 'Szkice', pending: 'Oczekujące', sent: 'Wysłane',
                accepted: 'Zaakceptowane', sold: 'Sprzedane', rejected: 'Odrzucone', completed: 'Zrealizowane'
            };
            const offerStatusMap = new Map<string, number>();
            offers.forEach(o => {
                const label = statusLabels[o.status] || o.status;
                offerStatusMap.set(label, (offerStatusMap.get(label) || 0) + 1);
            });
            const offersByStatus = Array.from(offerStatusMap.entries()).map(([name, value]) => ({ name, value }));

            // Contracts by status (ALL contracts)
            const contractStatusLabels: Record<string, string> = {
                draft: 'Szkic', signed: 'Podpisana', active: 'Aktywna', completed: 'Zakończona', cancelled: 'Anulowana'
            };
            const contractStatusMap = new Map<string, number>();
            contracts.forEach(c => {
                const label = contractStatusLabels[c.status] || c.status;
                contractStatusMap.set(label, (contractStatusMap.get(label) || 0) + 1);
            });
            const contractsByStatus = Array.from(contractStatusMap.entries()).map(([name, value]) => ({ name, value }));

            // Installations by status (ALL)
            const instLabels: Record<string, string> = {
                pending: 'Oczekujące', scheduled: 'Zaplanowane', confirmed: 'Potwierdzone',
                completed: 'Zakończone', issue: 'Problem', cancelled: 'Anulowane', verification: 'Weryfikacja'
            };
            const instStatusMap = new Map<string, number>();
            installations.forEach(inst => {
                const label = instLabels[inst.status] || inst.status;
                instStatusMap.set(label, (instStatusMap.get(label) || 0) + 1);
            });
            const installationsByStatus = Array.from(instStatusMap.entries()).map(([name, value]) => ({ name, value }));

            // Leads by source (ALL leads)
            const leadSourceMap = new Map<string, number>();
            leads.forEach(l => {
                const src = l.source || 'Nieznane';
                leadSourceMap.set(src, (leadSourceMap.get(src) || 0) + 1);
            });
            const leadsBySource = Array.from(leadSourceMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

            // Leads by status (ALL leads)
            const leadStatusLabels: Record<string, string> = {
                new: 'Nowe', contacted: 'Skontaktowano', offer_sent: 'Oferta wysłana',
                negotiation: 'Negocjacje', won: 'Wygrane', lost: 'Przegrane', archived: 'Archiwalne'
            };
            const leadStatusMap = new Map<string, number>();
            leads.forEach(l => {
                const label = leadStatusLabels[l.status] || l.status;
                leadStatusMap.set(label, (leadStatusMap.get(label) || 0) + 1);
            });
            const leadsByStatus = Array.from(leadStatusMap.entries()).map(([name, value]) => ({ name, value }));

            // Recent contracts (sorted by date, last 10)
            const recentContracts = contracts
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 10)
                .map(c => {
                    const cd = c.contract_data as any;
                    return {
                        id: c.id,
                        number: cd?.contractNumber || cd?.contract_number || '-',
                        client: cd?.client ? `${cd.client.firstName || cd.client.first_name || ''} ${cd.client.lastName || cd.client.last_name || ''}`.trim() : '-',
                        status: c.status,
                        date: new Date(c.created_at).toLocaleDateString('pl-PL'),
                        value: cd?.pricing?.netPrice || cd?.pricing?.net_price || cd?.totalPrice || 0,
                    };
                });

            // Recent installations (last 10, with client info from linked offer)
            const recentInstallations = installations
                .filter(i => i.status !== 'cancelled')
                .sort((a, b) => {
                    const dateA = a.scheduled_date || a.created_at || '';
                    const dateB = b.scheduled_date || b.created_at || '';
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                })
                .slice(0, 10)
                .map(inst => ({
                    id: inst.id,
                    offerId: inst.offer_id?.slice(0, 8) || '-',
                    status: inst.status,
                    statusLabel: instLabels[inst.status] || inst.status,
                    date: inst.scheduled_date || '-',
                }));

            // Top sales reps (from ALL offers)
            const repStats = new Map<string, { name: string; offers: number; sold: number; value: number }>();
            offers.forEach(o => {
                const repId = (o as any).user_id;
                if (!repId) return;
                const existing = repStats.get(repId) || { name: nameMap.get(repId) || 'Nieznany', offers: 0, sold: 0, value: 0 };
                existing.offers++;
                if (o.status === 'sold' || o.status === 'accepted' || o.status === 'completed') {
                    existing.sold++;
                    const pricing = o.pricing as any;
                    existing.value += pricing?.totalCost || pricing?.total_cost || pricing?.sellingPriceNet || pricing?.selling_price_net || 0;
                }
                repStats.set(repId, existing);
            });
            const topSalesReps = Array.from(repStats.values()).sort((a, b) => b.value - a.value).slice(0, 8);

            setData({
                dailySummary,
                offersByStatus,
                contractsByStatus,
                installationsByStatus,
                leadsBySource,
                leadsByStatus,
                recentContracts,
                recentInstallations,
                topSalesReps,
            });
        } catch (err) {
            console.error('CompanyOverview load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                {(Object.keys(TAB_CONFIG) as OverviewTab[]).map(tab => {
                    const cfg = TAB_CONFIG[tab];
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-shrink-0 flex-1 py-3 px-3 sm:px-5 text-xs sm:text-sm font-medium text-center transition-colors relative
                                ${isActive ? cfg.color : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <span className="shrink-0">{cfg.icon}</span>
                                <span className="hidden sm:inline">{cfg.label}</span>
                            </div>
                            {isActive && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${cfg.activeColor}`} />}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
                {activeTab === 'summary' && <SummaryTab data={data} />}
                {activeTab === 'sales' && <SalesTab data={data} />}
                {activeTab === 'installations' && <InstallationsTab data={data} />}
                {activeTab === 'contracts' && <ContractsTab data={data} />}
                {activeTab === 'leads' && <LeadsTab data={data} />}
            </div>
        </div>
    );
};

// ====== TAB COMPONENTS ======

const SummaryTab: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800">Aktywność firmy — ostatnie 14 dni</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.dailySummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    />
                    <Legend />
                    <Bar dataKey="offers" name="Oferty" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="contracts" name="Umowy" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="installations" name="Montaże" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="leads" name="Leady" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="measurements" name="Pomiary" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="emails" name="Emaile" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
                { label: 'Oferty razem', value: data.offersByStatus.reduce((s: number, i: any) => s + i.value, 0), color: 'text-blue-600' },
                { label: 'Umowy razem', value: data.contractsByStatus.reduce((s: number, i: any) => s + i.value, 0), color: 'text-emerald-600' },
                { label: 'Montaże', value: data.installationsByStatus.reduce((s: number, i: any) => s + i.value, 0), color: 'text-purple-600' },
                { label: 'Leady razem', value: data.leadsByStatus.reduce((s: number, i: any) => s + i.value, 0), color: 'text-yellow-600' },
                { label: 'Pomiary (14d)', value: data.dailySummary.reduce((s: number, d: any) => s + d.measurements, 0), color: 'text-red-600' },
                { label: 'Emaile (14d)', value: data.dailySummary.reduce((s: number, d: any) => s + d.emails, 0), color: 'text-cyan-600' },
            ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
            ))}
        </div>
    </div>
);

const SalesTab: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Offers pie chart */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Status ofert (30 dni)</h4>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={data.offersByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                                {data.offersByStatus.map((_: any, i: number) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top reps table */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Najlepsi handlowcy (30 dni)</h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Handlowiec</th>
                                <th className="px-4 py-2 text-center text-xs text-slate-500 font-medium">Oferty</th>
                                <th className="px-4 py-2 text-center text-xs text-slate-500 font-medium">Sprzedane</th>
                                <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Wartość</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.topSalesReps.map((rep: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{rep.name}</td>
                                    <td className="px-4 py-2.5 text-center text-slate-600">{rep.offers}</td>
                                    <td className="px-4 py-2.5 text-center font-medium text-green-600">{rep.sold}</td>
                                    <td className="px-4 py-2.5 text-right font-medium text-slate-800">{(rep.value / 1000).toFixed(1)}k €</td>
                                </tr>
                            ))}
                            {data.topSalesReps.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Brak danych</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);

const InstallationsTab: React.FC<{ data: any }> = ({ data }) => {
    const statusColors: Record<string, string> = {
        'Oczekujące': 'bg-slate-100 text-slate-600',
        'Zaplanowane': 'bg-blue-100 text-blue-700',
        'Potwierdzone': 'bg-indigo-100 text-indigo-700',
        'Zakończone': 'bg-green-100 text-green-700',
        'Problem': 'bg-red-100 text-red-700',
        'Weryfikacja': 'bg-amber-100 text-amber-700',
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status distribution */}
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Status montaży</h4>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={data.installationsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                                    {data.installationsByStatus.map((_: any, i: number) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent installations */}
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Ostatnie montaże</h4>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Zlecenie</th>
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Data</th>
                                    <th className="px-4 py-2 text-center text-xs text-slate-500 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.recentInstallations.map((inst: any) => (
                                    <tr key={inst.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">#{inst.offerId}</td>
                                        <td className="px-4 py-2.5 text-slate-600">{inst.date}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[inst.statusLabel] || 'bg-slate-100 text-slate-600'}`}>
                                                {inst.statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.recentInstallations.length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Brak montaży</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContractsTab: React.FC<{ data: any }> = ({ data }) => {
    const statusColors: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-600',
        signed: 'bg-green-100 text-green-700',
        active: 'bg-blue-100 text-blue-700',
        completed: 'bg-emerald-100 text-emerald-700',
        cancelled: 'bg-red-100 text-red-700',
    };
    const statusLabels: Record<string, string> = {
        draft: 'Szkic', signed: 'Podpisana', active: 'Aktywna', completed: 'Zakończona', cancelled: 'Anulowana'
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contract status pie */}
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Status umów</h4>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={data.contractsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                                    {data.contractsByStatus.map((_: any, i: number) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent contracts table */}
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Ostatnie umowy</h4>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Nr umowy</th>
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Klient</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Wartość</th>
                                    <th className="px-4 py-2 text-center text-xs text-slate-500 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.recentContracts.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-700">{c.number}</td>
                                        <td className="px-4 py-2.5 text-slate-700">{c.client}</td>
                                        <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                                            {c.value > 0 ? `${(c.value / 1000).toFixed(1)}k €` : '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                                                {statusLabels[c.status] || c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.recentContracts.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Brak umów</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeadsTab: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leads by status */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Leady wg statusu</h4>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.leadsByStatus} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="value" name="Ilość" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Leads by source */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Leady wg źródła</h4>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={data.leadsBySource.slice(0, 6)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                                {data.leadsBySource.slice(0, 6).map((_: any, i: number) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
);
