import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── Types ──
interface MissedCall {
    id: string;
    from_number: string;
    to_number: string;
    created_at: string;
    status: string;
}

interface MiniCustomer {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
}

// ── Icons ──
const PhoneIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);
const PhoneIncoming = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-6 6m0 0V4m0 5h5M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);
const PhoneMissed = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);
const ArrowRight = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

// ── Helpers ──
const normalizePhone = (phone: string | undefined | null): string => {
    if (!phone) return '';
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('00')) p = p.substring(2);
    if ((p.startsWith('48') || p.startsWith('49')) && p.length > 9) p = p.substring(2);
    if (p.startsWith('0')) p = p.substring(1);
    return p;
};

const formatPhone = (num: string) => {
    if (!num) return 'Nieznany';
    const clean = num.replace(/^\+/, '');
    if (clean.length >= 11) return `+${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
    if (clean.length >= 9) return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    return num;
};

const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
};

// ── Component ──
export const MiniTelephonyWidget: React.FC = () => {
    const [callStats, setCallStats] = useState({ total: 0, answered: 0, missed: 0 });
    const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
    const [customers, setCustomers] = useState<MiniCustomer[]>([]);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [statsRes, missedRes, custRes] = await Promise.all([
                supabase
                    .from('call_logs')
                    .select('status, direction')
                    .gte('created_at', today.toISOString()),
                supabase
                    .from('call_logs')
                    .select('id, from_number, to_number, created_at, status')
                    .eq('direction', 'inbound')
                    .in('status', ['no-answer', 'busy', 'failed'])
                    .gte('created_at', today.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(20),
                supabase
                    .from('customers')
                    .select('id, first_name, last_name, phone')
                    .not('phone', 'is', null)
            ]);

            if (!statsRes.error && statsRes.data) {
                setCallStats({
                    total: statsRes.data.length,
                    answered: statsRes.data.filter(c => c.status === 'completed').length,
                    missed: statsRes.data.filter(c =>
                        ['no-answer', 'busy', 'failed'].includes(c.status) && c.direction === 'inbound'
                    ).length,
                });
            }
            if (!missedRes.error && missedRes.data) setMissedCalls(missedRes.data);
            if (!custRes.error && custRes.data) setCustomers(custRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const getCustomerName = (phoneNumber: string): string | null => {
        const n = normalizePhone(phoneNumber);
        if (n.length < 7) return null;
        const match = customers.find(c => {
            const s = normalizePhone(c.phone);
            return s.length >= 7 && (n === s || n.endsWith(s) || s.endsWith(n));
        });
        if (match) return `${match.first_name || ''} ${match.last_name || ''}`.trim() || null;
        return null;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">{PhoneIcon}</div>
                    <h3 className="text-lg font-bold text-slate-800">Telefonia</h3>
                </div>
                <Link to="/telephony/calls" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                    Otwórz {ArrowRight}
                </Link>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
                </div>
            ) : (
                <div className="flex-1 space-y-3">
                    <div className="text-center py-2">
                        <div className="text-3xl font-bold text-slate-800">{callStats.total}</div>
                        <div className="text-xs text-slate-500 mt-0.5">połączeń dzisiaj</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="text-emerald-600">{PhoneIncoming}</span>
                            </div>
                            <div className="text-lg font-bold text-emerald-700">{callStats.answered}</div>
                            <div className="text-[10px] text-emerald-600 font-medium">ODEBRANE</div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="text-red-500">{PhoneMissed}</span>
                            </div>
                            <div className="text-lg font-bold text-red-600">{callStats.missed}</div>
                            <div className="text-[10px] text-red-500 font-medium">NIEODEBRANE</div>
                        </div>
                    </div>

                    {/* Missed Incoming Calls List */}
                    {missedCalls.length > 0 && (
                        <div className="mt-2">
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Nieodebrane przychodzące ({missedCalls.length})
                            </div>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                                {missedCalls.map(call => {
                                    const customerName = getCustomerName(call.from_number);
                                    return (
                                        <div key={call.id} className="flex items-center justify-between px-2.5 py-1.5 bg-red-50/60 rounded-lg border border-red-100 text-xs hover:bg-red-50 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-red-400 shrink-0">📞</span>
                                                <div className="min-w-0">
                                                    {customerName ? (
                                                        <>
                                                            <div className="font-bold text-slate-800 truncate">{customerName}</div>
                                                            <div className="font-mono text-[10px] text-slate-400 truncate">{formatPhone(call.from_number)}</div>
                                                        </>
                                                    ) : (
                                                        <div className="font-mono font-bold text-slate-800 truncate">{formatPhone(call.from_number)}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-red-500 font-medium whitespace-nowrap ml-2">{formatTime(call.created_at)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link to="/telephony/whatsapp" className="flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 py-2 rounded-lg hover:bg-green-100 transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                    WhatsApp
                </Link>
                <Link to="/telephony/sms" className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    SMS
                </Link>
            </div>
        </div>
    );
};
