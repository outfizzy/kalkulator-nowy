/**
 * UpcomingSchedule — compact calendars for installations & measurements
 * Shows upcoming 7-day view with items grouped by date
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface ScheduleItem {
    id: string;
    date: string;
    title: string;
    subtitle?: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    teamName?: string;
    repName?: string;
}

const INST_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Oczekujący', color: 'bg-slate-100 text-slate-600' },
    scheduled: { label: 'Zaplanowany', color: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Potwierdzony', color: 'bg-indigo-100 text-indigo-700' },
    completed: { label: 'Wykonany', color: 'bg-green-100 text-green-700' },
    issue: { label: 'Problem', color: 'bg-red-100 text-red-700' },
    verification: { label: 'Weryfikacja', color: 'bg-amber-100 text-amber-700' },
};

const MEAS_STATUS: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Zaplanowany', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Wykonany', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Anulowany', color: 'bg-red-100 text-red-700' },
    pending: { label: 'Oczekujący', color: 'bg-slate-100 text-slate-600' },
};

export const UpcomingSchedule: React.FC = () => {
    const [installations, setInstallations] = useState<ScheduleItem[]>([]);
    const [measurements, setMeasurements] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'installations' | 'measurements'>('installations');

    useEffect(() => { loadSchedule(); }, []);

    const loadSchedule = async () => {
        setLoading(true);
        try {
            // Date range: today → +14 days (and also -3 days for recent ones)
            const today = new Date();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(today.getDate() - 3);
            const twoWeeksOut = new Date();
            twoWeeksOut.setDate(today.getDate() + 14);

            const fromDate = threeDaysAgo.toISOString().split('T')[0];
            const toDate = twoWeeksOut.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];

            // Profiles for names
            const { data: profiles } = await supabase.from('profiles').select('id, full_name');
            const nameMap = new Map(profiles?.map(p => [p.id, p.full_name || '']) || []);

            // Teams
            const { data: teams } = await supabase.from('installation_teams').select('id, name');
            const teamMap = new Map(teams?.map(t => [t.id, t.name || '']) || []);

            // Installations
            const { data: instData } = await supabase
                .from('installations')
                .select('id, status, scheduled_date, installation_data, team_id, offer_id')
                .gte('scheduled_date', fromDate)
                .lte('scheduled_date', toDate)
                .neq('status', 'cancelled')
                .order('scheduled_date', { ascending: true });

            const instItems: ScheduleItem[] = (instData || []).map(inst => {
                const data = inst.installation_data as any || {};
                const client = data.client || {};
                const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Klient';
                const city = client.city || '';
                const statusInfo = INST_STATUS[inst.status] || INST_STATUS.pending;
                return {
                    id: inst.id,
                    date: inst.scheduled_date || todayStr,
                    title: clientName,
                    subtitle: city || `#${inst.offer_id?.slice(0, 8) || '?'}`,
                    status: inst.status,
                    statusLabel: statusInfo.label,
                    statusColor: statusInfo.color,
                    teamName: inst.team_id ? teamMap.get(inst.team_id) : undefined,
                };
            });

            // Measurements
            const { data: measData } = await supabase
                .from('measurements')
                .select('id, status, scheduled_date, customer_name, customer_address, sales_rep_id')
                .gte('scheduled_date', fromDate)
                .lte('scheduled_date', toDate)
                .neq('status', 'cancelled')
                .order('scheduled_date', { ascending: true });

            const measItems: ScheduleItem[] = (measData || []).map(m => {
                const schedDate = typeof m.scheduled_date === 'string' ? m.scheduled_date.split('T')[0] : todayStr;
                const statusInfo = MEAS_STATUS[m.status] || MEAS_STATUS.pending;
                return {
                    id: m.id,
                    date: schedDate,
                    title: m.customer_name || 'Klient',
                    subtitle: m.customer_address || '',
                    status: m.status,
                    statusLabel: statusInfo.label,
                    statusColor: statusInfo.color,
                    repName: m.sales_rep_id ? nameMap.get(m.sales_rep_id) : undefined,
                };
            });

            setInstallations(instItems);
            setMeasurements(measItems);
        } catch (err) {
            console.error('UpcomingSchedule load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const items = activeView === 'installations' ? installations : measurements;

    // Group items by date
    const today = new Date().toISOString().split('T')[0];
    const grouped = items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();

    const formatDateLabel = (dateStr: string): string => {
        if (dateStr === today) return '📌 Dziś';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (dateStr === tomorrow.toISOString().split('T')[0]) return '⏭️ Jutro';

        const d = new Date(dateStr + 'T00:00:00');
        const dayName = d.toLocaleDateString('pl-PL', { weekday: 'short' });
        const dayMonth = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
        return `${dayName}, ${dayMonth}`;
    };

    const isToday = (dateStr: string) => dateStr === today;
    const isPast = (dateStr: string) => dateStr < today;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header with tab toggle */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveView('installations')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors relative
                        ${activeView === 'installations' ? 'text-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span>🔧</span>
                        <span>Kalendarz Montaży</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                            {installations.length}
                        </span>
                    </div>
                    {activeView === 'installations' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
                </button>
                <button
                    onClick={() => setActiveView('measurements')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors relative
                        ${activeView === 'measurements' ? 'text-orange-600 bg-orange-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span>📏</span>
                        <span>Kalendarz Pomiarów</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                            {measurements.length}
                        </span>
                    </div>
                    {activeView === 'measurements' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
                </button>
            </div>

            {/* Calendar content */}
            <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center text-slate-400 py-12 text-sm">
                        Brak zaplanowanych {activeView === 'installations' ? 'montaży' : 'pomiarów'}
                    </div>
                ) : (
                    <div>
                        {sortedDates.map(dateStr => (
                            <div key={dateStr}>
                                {/* Date header */}
                                <div className={`sticky top-0 z-10 px-4 py-1.5 border-b border-slate-100 flex items-center justify-between
                                    ${isToday(dateStr) ? 'bg-blue-50' : isPast(dateStr) ? 'bg-slate-50' : 'bg-white'}`}>
                                    <span className={`text-xs font-bold uppercase tracking-wide 
                                        ${isToday(dateStr) ? 'text-blue-600' : isPast(dateStr) ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {formatDateLabel(dateStr)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">{grouped[dateStr].length} szt.</span>
                                </div>

                                {/* Items for this date */}
                                {grouped[dateStr].map(item => (
                                    <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors
                                        ${isPast(dateStr) ? 'opacity-60' : ''}`}>
                                        {/* Left indicator dot */}
                                        <div className={`w-2 h-2 rounded-full shrink-0
                                            ${item.status === 'completed' ? 'bg-green-500' :
                                                item.status === 'confirmed' ? 'bg-indigo-500' :
                                                    item.status === 'scheduled' ? 'bg-blue-500' :
                                                        item.status === 'issue' ? 'bg-red-500' : 'bg-slate-300'}`} />

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-800 truncate">{item.title}</span>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${item.statusColor}`}>
                                                    {item.statusLabel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                                {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                                                {(item.teamName || item.repName) && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-medium text-slate-500 truncate">{item.teamName || item.repName}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer with link to full calendar */}
            <div className="p-3 border-t border-slate-100 flex justify-center">
                <Link
                    to={activeView === 'installations' ? '/installations' : '/measurements'}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                >
                    Otwórz pełny kalendarz
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>
            </div>
        </div>
    );
};
