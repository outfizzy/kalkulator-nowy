import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ActivityItem {
    id: string;
    type: 'offer' | 'contract' | 'lead' | 'installation' | 'measurement' | 'cost' | 'order';
    action: string;
    description: string;
    userName: string;
    timestamp: Date;
    meta?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    offer: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>), color: 'text-blue-700', bgColor: 'bg-blue-50' },
    contract: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>), color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
    lead: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>), color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
    installation: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>), color: 'text-purple-700', bgColor: 'bg-purple-50' },
    measurement: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>), color: 'text-orange-700', bgColor: 'bg-orange-50' },
    cost: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), color: 'text-red-700', bgColor: 'bg-red-50' },
    order: { icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>), color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
};

export const ActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [daysBack, setDaysBack] = useState(7);

    useEffect(() => {
        loadActivities();
    }, [daysBack]);

    const loadActivities = async () => {
        setLoading(true);
        try {
            const since = new Date();
            since.setDate(since.getDate() - daysBack);
            const sinceISO = since.toISOString();

            // Fetch user name map
            const { data: profiles } = await supabase.from('profiles').select('id, full_name');
            const nameMap = new Map<string, string>();
            profiles?.forEach(p => nameMap.set(p.id, p.full_name || 'Nieznany'));

            const items: ActivityItem[] = [];

            // 1. Offers — created/updated
            const { data: offers } = await supabase
                .from('offers')
                .select('id, status, created_at, updated_at, user_id, pricing, customer_name')
                .gte('created_at', sinceISO)
                .order('created_at', { ascending: false })
                .limit(50);

            offers?.forEach(o => {
                const statusLabel: Record<string, string> = {
                    new: 'Nowa oferta',
                    draft: 'Szkic oferty',
                    pending: 'Oferta oczekująca',
                    accepted: 'Oferta zaakceptowana ✅',
                    sent: 'Oferta wysłana',
                    completed: 'Oferta zrealizowana',
                    rejected: 'Oferta odrzucona'
                };
                items.push({
                    id: `offer-${o.id}`,
                    type: 'offer',
                    action: statusLabel[o.status] || `Oferta (${o.status})`,
                    description: o.customer_name || 'Klient',
                    userName: nameMap.get((o as any).user_id) || 'System',
                    timestamp: new Date(o.created_at),
                    meta: o.pricing?.totalCost ? `${Number(o.pricing.totalCost).toLocaleString('de-DE')} €` : undefined
                });
            });

            // 2. Contracts
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id, status, created_at, contract_data')
                .gte('created_at', sinceISO)
                .order('created_at', { ascending: false })
                .limit(50);

            contracts?.forEach(c => {
                const cd = c.contract_data as any;
                const clientName = cd?.client ? `${cd.client.firstName || ''} ${cd.client.lastName || ''}`.trim() : 'Klient';
                const contractNum = cd?.contractNumber || '';
                items.push({
                    id: `contract-${c.id}`,
                    type: 'contract',
                    action: c.status === 'signed' ? 'Umowa podpisana ✅' : c.status === 'draft' ? 'Nowa umowa (szkic)' : `Umowa (${c.status})`,
                    description: `${contractNum} — ${clientName}`,
                    userName: nameMap.get(cd?.createdBy) || 'System',
                    timestamp: new Date(c.created_at),
                    meta: cd?.pricing?.netPrice ? `${Number(cd.pricing.netPrice).toLocaleString('de-DE')} € netto` : undefined
                });
            });

            // 3. Leads
            const { data: leads } = await supabase
                .from('leads')
                .select('id, status, created_at, name, source, assigned_to')
                .gte('created_at', sinceISO)
                .order('created_at', { ascending: false })
                .limit(50);

            leads?.forEach(l => {
                items.push({
                    id: `lead-${l.id}`,
                    type: 'lead',
                    action: 'Nowy lead',
                    description: l.name || 'Nieznany',
                    userName: nameMap.get(l.assigned_to) || 'Nieprzypisany',
                    timestamp: new Date(l.created_at),
                    meta: l.source || undefined
                });
            });

            // 4. Installations — status changes
            const { data: installations } = await supabase
                .from('installations')
                .select('id, status, created_at, updated_at, offer_id')
                .gte('updated_at', sinceISO)
                .order('updated_at', { ascending: false })
                .limit(30);

            installations?.forEach(inst => {
                const statusLabel: Record<string, string> = {
                    scheduled: 'Montaż zaplanowany',
                    confirmed: 'Montaż potwierdzony',
                    completed: 'Montaż zakończony ✅',
                    issue: 'Problem z montażem ⚠️',
                    cancelled: 'Montaż anulowany'
                };
                if (inst.status === 'pending') return;
                items.push({
                    id: `inst-${inst.id}`,
                    type: 'installation',
                    action: statusLabel[inst.status] || `Montaż (${inst.status})`,
                    description: `Zlecenie #${inst.offer_id?.slice(0, 8) || '?'}`,
                    userName: 'System',
                    timestamp: new Date(inst.updated_at)
                });
            });

            // 5. Measurements scheduled
            const { data: measurements } = await supabase
                .from('measurements')
                .select('id, customer_name, scheduled_date, sales_rep_id, status')
                .gte('created_at', sinceISO)
                .order('created_at', { ascending: false })
                .limit(30);

            measurements?.forEach(m => {
                items.push({
                    id: `meas-${m.id}`,
                    type: 'measurement',
                    action: m.status === 'completed' ? 'Pomiar wykonany ✅' : 'Pomiar zaplanowany',
                    description: m.customer_name || 'Klient',
                    userName: nameMap.get(m.sales_rep_id) || 'Nieprzypisany',
                    timestamp: new Date(m.scheduled_date),
                    meta: new Date(m.scheduled_date).toLocaleDateString('pl-PL')
                });
            });

            // 6. Customer costs added
            const { data: costs } = await supabase
                .from('customer_costs')
                .select('id, type, amount, description, created_at, customer_id')
                .gte('created_at', sinceISO)
                .order('created_at', { ascending: false })
                .limit(20);

            costs?.forEach(c => {
                items.push({
                    id: `cost-${c.id}`,
                    type: 'cost',
                    action: 'Koszt dodany',
                    description: c.description || c.type || 'Koszt',
                    userName: 'System',
                    timestamp: new Date(c.created_at),
                    meta: `${Number(c.amount).toFixed(2)} €`
                });
            });

            // Sort all by timestamp descending
            items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setActivities(items);
        } catch (err) {
            console.error('Activity feed error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Group by date
    const groupedByDate = activities.reduce<Record<string, ActivityItem[]>>((groups, item) => {
        const dateKey = item.timestamp.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
        return groups;
    }, {});

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-xl font-bold text-slate-800">Dziennik Aktywności</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Kto co zrobił — przegląd z ostatnich {daysBack} dni</p>
                    </div>
                </div>
                <select
                    value={daysBack}
                    onChange={(e) => setDaysBack(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value={1}>Dziś</option>
                    <option value={3}>3 dni</option>
                    <option value={7}>7 dni</option>
                    <option value={14}>14 dni</option>
                    <option value={30}>30 dni</option>
                </select>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center text-slate-400 py-12 text-sm">
                        Brak aktywności w wybranym okresie
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {Object.entries(groupedByDate).map(([dateLabel, items]) => (
                            <div key={dateLabel}>
                                <div className="sticky top-0 bg-slate-50 px-4 sm:px-6 py-2 border-b border-slate-100 z-10">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{dateLabel}</span>
                                    <span className="ml-2 text-xs text-slate-400">({items.length} akcji)</span>
                                </div>
                                {items.map((item) => {
                                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.offer;
                                    return (
                                        <div key={item.id} className="flex items-start gap-3 px-4 sm:px-6 py-3 hover:bg-slate-50/50 transition-colors">
                                            <div className={`shrink-0 w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center text-sm mt-0.5`}>
                                                {config.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-semibold ${config.color} px-1.5 py-0.5 rounded ${config.bgColor}`}>
                                                        {item.action}
                                                    </span>
                                                    {item.meta && (
                                                        <span className="text-xs text-slate-400 font-medium">{item.meta}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-700 mt-0.5 truncate">{item.description}</p>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                                    <span className="font-medium">{item.userName}</span>
                                                    <span>•</span>
                                                    <span>{item.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
