import React, { useEffect, useState } from 'react';
import { TelephonyService, type CallLog } from '../../services/database/telephony.service';
import { TaskService } from '../../services/database/task.service';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://whgjsppyuvglhbdgdark.supabase.co';

const getRecordingProxyUrl = (recordingUrl: string) => {
    if (!recordingUrl || !recordingUrl.includes('twilio.com')) return recordingUrl;
    return `${SUPABASE_URL}/functions/v1/recording-proxy?url=${encodeURIComponent(recordingUrl)}`;
};
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QuickSMSModal } from './QuickSMSModal';

interface ExtractedContact {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    company: string;
    address: string;
    notes: string;
}

export const CallHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [calls, setCalls] = useState<CallLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound' | 'missed'>('all');
    const [page, setPage] = useState(0);
    const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [showTranscription, setShowTranscription] = useState<string | null>(null);
    const [extracting, setExtracting] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<Record<string, ExtractedContact>>({});
    const [creatingFor, setCreatingFor] = useState<{ callId: string; mode: 'customer' | 'lead+customer' } | null>(null);
    const [smsTarget, setSmsTarget] = useState<{ phone: string; name: string } | null>(null);
    const [addedActionItems, setAddedActionItems] = useState<Set<string>>(new Set());
    const LIMIT = 25;

    // ─── ADD ACTION ITEM TO TASKS ───
    const getCallerContext = (call: CallLog) => {
        const phone = call.direction === 'inbound' ? call.from_number : call.to_number;
        const name = call.lead?.name
            || (call.customer ? `${call.customer.firstName} ${call.customer.lastName}`.trim() : null)
            || phone;
        return { phone, name };
    };

    const handleAddActionItemToTask = async (call: CallLog, actionItem: string, index: number) => {
        const key = `${call.id}:${index}`;
        if (addedActionItems.has(key)) return;

        const { phone, name } = getCallerContext(call);
        const isLinked = !!call.lead_id || !!call.customer_id;
        const titlePrefix = !isLinked ? `[${phone}] ` : '';
        const callDate = new Date(call.started_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const callTime = new Date(call.started_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        const description = [
            `📞 Kontakt: ${name}`,
            `📱 Numer: ${phone}`,
            `📅 Połączenie: ${callDate}, ${callTime}`,
            call.lead_id && call.lead ? `🔗 Lead: ${call.lead.name}` : null,
            call.customer_id && call.customer ? `🏠 Klient: ${call.customer.firstName} ${call.customer.lastName}` : null,
            call.summary ? `\n🤖 AI podsumowanie:\n${call.summary}` : null,
        ].filter(Boolean).join('\n');

        try {
            await TaskService.createTask({
                title: `${titlePrefix}${actionItem}`,
                description,
                type: 'call',
                priority: 'medium',
                status: 'pending',
                userId: '', // will default to current user
                leadId: call.lead_id || undefined,
                customerId: call.customer_id || undefined,
            });
            setAddedActionItems(prev => new Set(prev).add(key));
            toast.success(`✅ Dodano zadanie: ${actionItem.substring(0, 40)}...`);
        } catch (err: any) {
            toast.error(`Błąd: ${err.message}`);
        }
    };

    const handleAddAllActionItems = async (call: CallLog) => {
        const items = call.metadata?.action_items as string[] | undefined;
        if (!items || items.length === 0) return;

        const toastId = toast.loading(`Dodaję ${items.length} zadań...`);
        let added = 0;
        for (let i = 0; i < items.length; i++) {
            const key = `${call.id}:${i}`;
            if (addedActionItems.has(key)) continue;
            try {
                await handleAddActionItemToTask(call, items[i], i);
                added++;
            } catch { /* individual errors handled inside */ }
        }
        toast.dismiss(toastId);
        toast.success(`Dodano ${added} zadań z połączenia`);
    };

    useEffect(() => {
        loadCalls();
        TelephonyService.getCallStats().then(setStats).catch(() => { });
    }, [filter, page]);

    const loadCalls = async () => {
        setLoading(true);
        try {
            const direction = filter === 'all' || filter === 'missed' ? undefined : filter as 'inbound' | 'outbound';
            const status = filter === 'missed' ? 'missed' : undefined;
            const { data, count } = await TelephonyService.getCallLogs({
                direction,
                status,
                limit: LIMIT,
                offset: page * LIMIT,
            });
            setCalls(data);
            setTotal(count);
        } catch (e) {
            toast.error('Błąd ładowania historii');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (s: number) => {
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}m ${sec}s`;
    };

    const statusConfig: Record<string, { label: string; color: string }> = {
        'completed': { label: 'Zakończona', color: 'bg-green-100 text-green-700' },
        'missed': { label: 'Nieodebrane', color: 'bg-red-100 text-red-700' },
        'no-answer': { label: 'Brak odpowiedzi', color: 'bg-orange-100 text-orange-700' },
        'busy': { label: 'Zajęta', color: 'bg-yellow-100 text-yellow-700' },
        'failed': { label: 'Błąd', color: 'bg-red-100 text-red-700' },
        'in-progress': { label: 'W trakcie', color: 'bg-blue-100 text-blue-700' },
        'voicemail': { label: 'Poczta głosowa', color: 'bg-purple-100 text-purple-700' },
        'initiated': { label: 'Inicjowana', color: 'bg-slate-100 text-slate-600' },
        'ringing': { label: 'Dzwoni', color: 'bg-blue-100 text-blue-600' },
    };

    const sentimentConfig: Record<string, { label: string; icon: string; color: string }> = {
        'positive': { label: 'Pozytywny', icon: '😊', color: 'bg-green-50 text-green-700 border-green-200' },
        'neutral': { label: 'Neutralny', icon: '😐', color: 'bg-slate-50 text-slate-600 border-slate-200' },
        'negative': { label: 'Negatywny', icon: '😟', color: 'bg-red-50 text-red-700 border-red-200' },
    };

    // ─── AI EXTRACT DATA FROM TRANSCRIPTION ───
    const handleExtractData = async (call: CallLog) => {
        if (!call.transcription) return;
        setExtracting(call.id);

        try {
            const phoneNumber = call.direction === 'inbound' ? call.from_number : call.to_number;

            // Use OpenAI to extract contact info from transcription via edge function
            const { data, error } = await supabase.functions.invoke('analyze-call-recording', {
                body: {
                    extractContact: true,
                    transcription: call.transcription,
                    phoneNumber,
                },
            });

            if (error) throw error;

            const contact: ExtractedContact = {
                firstName: data?.contact?.firstName || '',
                lastName: data?.contact?.lastName || '',
                phone: phoneNumber || '',
                email: data?.contact?.email || '',
                company: data?.contact?.company || '',
                address: data?.contact?.address || '',
                notes: call.summary || call.transcription?.substring(0, 200) || '',
            };

            setExtractedData(prev => ({ ...prev, [call.id]: contact }));
        } catch (err) {
            // Fallback — basic extraction from phone number
            const phoneNumber = call.direction === 'inbound' ? call.from_number : call.to_number;
            setExtractedData(prev => ({
                ...prev,
                [call.id]: {
                    firstName: '',
                    lastName: '',
                    phone: phoneNumber,
                    email: '',
                    company: '',
                    address: '',
                    notes: call.summary || '',
                },
            }));
            toast('Wpisz dane ręcznie — AI nie mógł wyciągnąć kontaktu', { icon: '✏️' });
        } finally {
            setExtracting(null);
        }
    };

    // ─── CREATE CUSTOMER / LEAD ───
    const handleCreateFromCall = async (callId: string, mode: 'customer' | 'lead+customer') => {
        const contact = extractedData[callId];
        if (!contact) return;

        try {
            // Create customer
            const { data: customer, error: custErr } = await supabase
                .from('customers')
                .insert({
                    first_name: contact.firstName,
                    last_name: contact.lastName,
                    phone: contact.phone,
                    email: contact.email || null,
                    company: contact.company || null,
                    address: contact.address || null,
                })
                .select()
                .single();

            if (custErr) throw custErr;

            // Link call to customer
            await TelephonyService.linkCallToCustomer(callId, customer.id);

            if (mode === 'lead+customer') {
                // Also create lead
                const { data: lead, error: leadErr } = await supabase
                    .from('leads')
                    .insert({
                        customer_data: {
                            firstName: contact.firstName,
                            lastName: contact.lastName,
                            phone: contact.phone,
                            email: contact.email,
                            company: contact.company,
                        },
                        source: 'phone',
                        status: 'new',
                        notes: `Połączenie telefoniczne: ${contact.notes}`,
                        customer_id: customer.id,
                    })
                    .select()
                    .single();

                if (leadErr) throw leadErr;
                await TelephonyService.linkCallToLead(callId, lead.id);
                toast.success(`Utworzono klienta + lead: ${contact.firstName} ${contact.lastName}`);
            } else {
                toast.success(`Utworzono klienta: ${contact.firstName} ${contact.lastName}`);
            }

            setCreatingFor(null);
            setExtractedData(prev => {
                const copy = { ...prev };
                delete copy[callId];
                return copy;
            });
            loadCalls(); // Refresh to show links
        } catch (err: any) {
            toast.error(`Błąd: ${err.message}`);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (<>
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Historia Połączeń</h1>
                <p className="text-slate-500 text-sm mt-1">Wszystkie połączenia przychodzące i wychodzące z transkrypcjami AI</p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-2xl font-bold text-slate-800">{stats.totalCalls}</p>
                        <p className="text-xs text-slate-500">Wszystkie</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-2xl font-bold text-blue-600">{stats.inbound}</p>
                        <p className="text-xs text-slate-500">Przychodzące</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-2xl font-bold text-green-600">{stats.outbound}</p>
                        <p className="text-xs text-slate-500">Wychodzące</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-2xl font-bold text-red-600">{stats.missed}</p>
                        <p className="text-xs text-slate-500">Nieodebrane</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4">
                {(['all', 'inbound', 'outbound', 'missed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => { setFilter(f); setPage(0); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        {f === 'all' ? 'Wszystkie' : f === 'inbound' ? '📥 Przychodzące' : f === 'outbound' ? '📤 Wychodzące' : '📵 Nieodebrane'}
                    </button>
                ))}
            </div>

            {/* Call list */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">Ładowanie...</div>
                ) : calls.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">Brak połączeń</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {calls.map(call => (
                            <div
                                key={call.id}
                                className="hover:bg-slate-50 transition-colors"
                            >
                                {/* Main row */}
                                <div
                                    onClick={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                                    className="px-4 py-3 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Direction icon */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${call.direction === 'inbound'
                                                ? call.status === 'missed' || call.status === 'no-answer' ? 'bg-red-100' : 'bg-blue-100'
                                                : 'bg-green-100'
                                                }`}>
                                                {call.direction === 'inbound' ? (
                                                    <svg className={`w-4 h-4 ${call.status === 'missed' || call.status === 'no-answer' ? 'text-red-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-800 text-sm">
                                                        {call.direction === 'inbound'
                                                            ? (call.lead ? call.lead.name : call.customer ? `${call.customer.firstName} ${call.customer.lastName}` : call.from_number)
                                                            : (call.lead ? call.lead.name : call.customer ? `${call.customer.firstName} ${call.customer.lastName}` : call.to_number)
                                                        }
                                                    </p>
                                                    {/* CRM link badges */}
                                                    {call.lead_id && call.lead && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/leads/${call.lead_id}`); }}
                                                            className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded hover:bg-blue-200 transition-colors"
                                                        >
                                                            Lead →
                                                        </button>
                                                    )}
                                                    {call.customer_id && call.customer && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${call.customer_id}`); }}
                                                            className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded hover:bg-purple-200 transition-colors"
                                                        >
                                                            Klient →
                                                        </button>
                                                    )}
                                                    {/* Sentiment badge */}
                                                    {call.sentiment && sentimentConfig[call.sentiment] && (
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${sentimentConfig[call.sentiment].color}`}>
                                                            {sentimentConfig[call.sentiment].icon}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 font-mono">
                                                    {call.direction === 'inbound' ? call.from_number : call.to_number}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right flex items-center gap-3">
                                            {/* Indicators */}
                                            <div className="flex items-center gap-1">
                                                {call.transcription && (
                                                    <span className="w-5 h-5 flex items-center justify-center text-[10px]" title="Transkrypcja">📝</span>
                                                )}
                                                {call.recording_url && (
                                                    <span className="w-5 h-5 flex items-center justify-center text-[10px]" title="Nagranie">🎙️</span>
                                                )}
                                                {call.summary && (
                                                    <span className="w-5 h-5 flex items-center justify-center text-[10px]" title="Podsumowanie AI">🤖</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[call.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                    {statusConfig[call.status]?.label || call.status}
                                                </span>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(call.started_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}{', '}
                                                    {new Date(call.started_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                {call.duration_seconds > 0 && (
                                                    <p className="text-xs text-slate-500 font-mono">{formatDuration(call.duration_seconds)}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── EXPANDED DETAILS ── */}
                                {selectedCall?.id === call.id && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100 bg-slate-50/50">

                                        {/* Agent info */}
                                        {call.user && (
                                            <p className="text-sm text-slate-500 pt-3">
                                                <span className="font-medium">Handlowiec:</span> {call.user.fullName}
                                            </p>
                                        )}

                                        {/* CRM Links — prominent */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {call.lead_id && call.lead ? (
                                                <button
                                                    onClick={() => navigate(`/leads/${call.lead_id}`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Lead: {call.lead.name} →
                                                </button>
                                            ) : null}
                                            {call.customer_id && call.customer ? (
                                                <button
                                                    onClick={() => navigate(`/customers/${call.customer_id}`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-100 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    Klient: {call.customer.firstName} {call.customer.lastName} →
                                                </button>
                                            ) : null}
                                        </div>

                                        {/* AI Summary */}
                                        {call.summary && (
                                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-3">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className="text-sm">🤖</span>
                                                    <span className="text-xs font-bold text-indigo-700">Podsumowanie AI</span>
                                                    {call.sentiment && sentimentConfig[call.sentiment] && (
                                                        <span className={`ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full border ${sentimentConfig[call.sentiment].color}`}>
                                                            {sentimentConfig[call.sentiment].icon} {sentimentConfig[call.sentiment].label}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed">{call.summary}</p>

                                                {/* Action items from metadata — with Add to Tasks */}
                                                {call.metadata?.action_items && call.metadata.action_items.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-indigo-100">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <p className="text-[10px] font-bold text-indigo-600">📋 Do zrobienia:</p>
                                                            <button
                                                                onClick={() => handleAddAllActionItems(call)}
                                                                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors"
                                                            >
                                                                ➕ Dodaj wszystkie do zadań
                                                            </button>
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {call.metadata.action_items.map((item: string, i: number) => {
                                                                const key = `${call.id}:${i}`;
                                                                const isAdded = addedActionItems.has(key);
                                                                return (
                                                                    <li key={i} className={`text-xs flex items-start gap-1.5 group/item ${isAdded ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleAddActionItemToTask(call, item, i); }}
                                                                            disabled={isAdded}
                                                                            className={`mt-0.5 w-4 h-4 flex-shrink-0 flex items-center justify-center rounded transition-colors ${
                                                                                isAdded
                                                                                    ? 'bg-green-100 text-green-600 cursor-default'
                                                                                    : 'bg-white border border-indigo-300 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer'
                                                                            }`}
                                                                            title={isAdded ? 'Dodano do zadań ✓' : 'Dodaj do zadań'}
                                                                        >
                                                                            {isAdded ? (
                                                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                            ) : (
                                                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                                            )}
                                                                        </button>
                                                                        <span>{item}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>

                                                        {/* Context preview — who this call was with */}
                                                        {(() => {
                                                            const { phone, name } = getCallerContext(call);
                                                            const isLinked = !!call.lead_id || !!call.customer_id;
                                                            return (
                                                                <div className={`mt-2 px-2 py-1 rounded text-[10px] flex items-center gap-1.5 ${
                                                                    isLinked ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                }`}>
                                                                    <span>{isLinked ? '🔗' : '⚠️'}</span>
                                                                    <span>
                                                                        Zadania zostaną powiązane z: <strong>{name}</strong>
                                                                        {!isLinked && <span className="ml-1">(brak w CRM — nr telefonu w tytule)</span>}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Recording */}
                                        {call.recording_url && (
                                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                <p className="text-xs font-bold text-slate-600 mb-2">🎙️ Nagranie</p>
                                                <audio controls src={getRecordingProxyUrl(call.recording_url!)} className="w-full h-8" />
                                            </div>
                                        )}

                                        {/* Quick SMS Button */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSmsTarget({
                                                    phone: call.direction === 'inbound' ? call.from_number : call.to_number,
                                                    name: call.direction === 'inbound'
                                                        ? (call.lead ? call.lead.name : call.customer ? `${call.customer.firstName} ${call.customer.lastName}` : call.from_number)
                                                        : (call.lead ? call.lead.name : call.customer ? `${call.customer.firstName} ${call.customer.lastName}` : call.to_number),
                                                })}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 rounded-lg font-medium transition-colors text-xs"
                                            >
                                                💬 Wyślij SMS
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const number = call.direction === 'inbound' ? call.from_number : call.to_number;
                                                    window.dispatchEvent(new CustomEvent('softphone-dial', {
                                                        detail: { number, name: call.lead?.name || `${call.customer?.firstName || ''} ${call.customer?.lastName || ''}`.trim() || number }
                                                    }));
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors text-xs"
                                            >
                                                📱 Oddzwoń
                                            </button>
                                        </div>

                                        {/* Transcription */}
                                        {call.transcription && (
                                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-bold text-slate-600">📝 Transkrypcja</p>
                                                    <button
                                                        onClick={() => setShowTranscription(showTranscription === call.id ? null : call.id)}
                                                        className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors"
                                                    >
                                                        {showTranscription === call.id ? 'Ukryj' : 'Pokaż pełną'}
                                                    </button>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    {showTranscription === call.id
                                                        ? call.transcription
                                                        : call.transcription.length > 200
                                                            ? call.transcription.substring(0, 200) + '...'
                                                            : call.transcription
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {call.notes && (
                                            <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 p-2 rounded-lg">📝 {call.notes}</p>
                                        )}

                                        {/* Tags */}
                                        {call.tags && call.tags.length > 0 && (
                                            <div className="flex gap-1">
                                                {call.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* ── NO LEAD/CUSTOMER — Extract & Create ── */}
                                        {!call.lead_id && !call.customer_id && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                <p className="text-xs font-bold text-amber-800 mb-2">⚠️ Brak powiązania z klientem/leadem</p>

                                                {!extractedData[call.id] ? (
                                                    <div className="flex gap-2">
                                                        {call.transcription && (
                                                            <button
                                                                onClick={() => handleExtractData(call)}
                                                                disabled={extracting === call.id}
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {extracting === call.id ? (
                                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <span>🤖</span>
                                                                )}
                                                                {extracting === call.id ? 'Analizuję...' : 'Wyciągnij dane z AI'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const phone = call.direction === 'inbound' ? call.from_number : call.to_number;
                                                                setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { firstName: '', lastName: '', phone, email: '', company: '', address: '', notes: call.summary || '' },
                                                                }));
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                                        >
                                                            ✏️ Wpisz ręcznie
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {/* Extracted form */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                className="px-2 py-1.5 border border-slate-200 rounded text-xs"
                                                                placeholder="Imię"
                                                                value={extractedData[call.id].firstName}
                                                                onChange={e => setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { ...prev[call.id], firstName: e.target.value }
                                                                }))}
                                                            />
                                                            <input
                                                                className="px-2 py-1.5 border border-slate-200 rounded text-xs"
                                                                placeholder="Nazwisko"
                                                                value={extractedData[call.id].lastName}
                                                                onChange={e => setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { ...prev[call.id], lastName: e.target.value }
                                                                }))}
                                                            />
                                                            <input
                                                                className="px-2 py-1.5 border border-slate-200 rounded text-xs"
                                                                placeholder="Telefon"
                                                                value={extractedData[call.id].phone}
                                                                onChange={e => setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { ...prev[call.id], phone: e.target.value }
                                                                }))}
                                                            />
                                                            <input
                                                                className="px-2 py-1.5 border border-slate-200 rounded text-xs"
                                                                placeholder="Email"
                                                                value={extractedData[call.id].email}
                                                                onChange={e => setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { ...prev[call.id], email: e.target.value }
                                                                }))}
                                                            />
                                                            <input
                                                                className="px-2 py-1.5 border border-slate-200 rounded text-xs col-span-2"
                                                                placeholder="Firma"
                                                                value={extractedData[call.id].company}
                                                                onChange={e => setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { ...prev[call.id], company: e.target.value }
                                                                }))}
                                                            />
                                                            <input
                                                                className="px-2 py-1.5 border border-slate-200 rounded text-xs col-span-2"
                                                                placeholder="Adres"
                                                                value={extractedData[call.id].address}
                                                                onChange={e => setExtractedData(prev => ({
                                                                    ...prev,
                                                                    [call.id]: { ...prev[call.id], address: e.target.value }
                                                                }))}
                                                            />
                                                        </div>

                                                        {/* Create buttons */}
                                                        <div className="flex gap-2 pt-1">
                                                            <button
                                                                onClick={() => handleCreateFromCall(call.id, 'customer')}
                                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors"
                                                            >
                                                                👤 Utwórz klienta
                                                            </button>
                                                            <button
                                                                onClick={() => handleCreateFromCall(call.id, 'lead+customer')}
                                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                                                            >
                                                                👤+ Klient + Lead
                                                            </button>
                                                            <button
                                                                onClick={() => setExtractedData(prev => {
                                                                    const copy = { ...prev };
                                                                    delete copy[call.id];
                                                                    return copy;
                                                                })}
                                                                className="px-2 py-2 bg-slate-100 text-slate-500 text-xs rounded-lg hover:bg-slate-200 transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                        ←
                    </button>
                    <span className="px-3 py-2 text-sm text-slate-600">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                        →
                    </button>
                </div>
            )}
        </div>

        {/* Quick SMS Modal */}
        {
            smsTarget && (
                <QuickSMSModal
                    isOpen={!!smsTarget}
                    onClose={() => setSmsTarget(null)}
                    phoneNumber={smsTarget.phone}
                    contactName={smsTarget.name}
                />
            )
        }
    </>);
};
