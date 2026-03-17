import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { supabase } from '../../lib/supabase';
import { TelephonyService } from '../../services/database/telephony.service';
import toast from 'react-hot-toast';

type SoftphoneState = 'idle' | 'dialing' | 'ringing' | 'incoming' | 'active' | 'post-call';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ContactInfo {
    type: 'lead' | 'customer' | null;
    id: string | null;
    name: string | null;
    leadStatus?: string | null;
    assignedToName?: string | null;
}

interface QueuedCall {
    call: Call;
    from: string;
    contact: ContactInfo;
    timestamp: Date;
}

export const SoftphoneWidget: React.FC = () => {
    const deviceRef = useRef<Device | null>(null);
    const tokenRefreshRef = useRef<NodeJS.Timeout | null>(null);
    const [state, setState] = useState<SoftphoneState>('idle');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [dialNumber, setDialNumber] = useState('');
    const [callerInfo, setCallerInfo] = useState<ContactInfo>({ type: null, id: null, name: null });
    const [callDuration, setCallDuration] = useState(0);
    const [isMinimized, setIsMinimized] = useState(true);
    const [postCallNotes, setPostCallNotes] = useState('');
    const [lastCallId, setLastCallId] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ─── CALL QUEUE for multiple simultaneous incoming calls ───
    const [callQueue, setCallQueue] = useState<QueuedCall[]>([]);
    const [showQueue, setShowQueue] = useState(false);

    // Get primary incoming call (first in queue)
    const primaryIncoming = callQueue.length > 0 ? callQueue[0] : null;

    // ─── ACTIVATE / DEACTIVATE ───

    const activate = useCallback(async () => {
        if (deviceRef.current) {
            try {
                deviceRef.current.register();
                return;
            } catch {
                // If re-register fails, create a new device
            }
        }

        setConnectionStatus('connecting');
        setConnectionError(null);

        try {
            const { token } = await TelephonyService.getTwilioToken();

            const device = new Device(token, {
                codecPreferences: ['opus', 'pcmu'] as any,
                logLevel: 1,
                // Allow multiple incoming calls
                allowIncomingWhileBusy: true,
            });

            device.on('registered', () => {
                console.log('☎️ Twilio Device registered');
                setConnectionStatus('connected');
                setConnectionError(null);
                toast.success('Telefon aktywny — gotowy do odbierania', { duration: 3000, icon: '☎️' });
            });

            device.on('unregistered', () => {
                console.log('☎️ Twilio Device unregistered');
                setConnectionStatus('disconnected');
            });

            device.on('error', (error) => {
                console.error('☎️ Twilio error:', error);
                const errMsg = (error as any)?.message || 'Nieznany błąd';
                setConnectionStatus('error');
                setConnectionError(errMsg);
                toast.error(`Twilio: ${errMsg}`, { duration: 6000 });
            });

            device.on('incoming', (call: Call) => {
                const from = call.parameters.From || 'Nieznany';
                console.log('☎️ Incoming call:', from);

                // Look up contact info
                TelephonyService.lookupContact(from).then(info => {
                    const queueEntry: QueuedCall = {
                        call,
                        from,
                        contact: info,
                        timestamp: new Date(),
                    };

                    setCallQueue(prev => {
                        const isFirst = prev.length === 0 && state !== 'active';
                        if (isFirst) {
                            // First call — show full incoming UI with ringtone
                            setState('incoming');
                            setIsMinimized(false);
                            setCallerInfo(info);
                            toast(
                                info.name ? `📞 ${info.name}` : `📞 ${from}`,
                                { duration: 8000, icon: '📱' }
                            );
                        } else {
                            // 2nd+ call — mute ringtone, show in queue silently
                            try {
                                // Mute the incoming call's ringtone on the device
                                // The Twilio SDK plays audio automatically; we just show a subtle toast
                            } catch { }
                            toast(
                                `📋 W kolejce: ${info.name || from}`,
                                { duration: 4000, icon: '📞' }
                            );
                        }
                        return [...prev, queueEntry];
                    });

                    // Handle call lifecycle
                    call.on('disconnect', () => {
                        setCallQueue(prev => prev.filter(q => q.call !== call));
                    });
                    call.on('reject', () => {
                        setCallQueue(prev => prev.filter(q => q.call !== call));
                    });
                    call.on('cancel', () => {
                        setCallQueue(prev => {
                            const updated = prev.filter(q => q.call !== call);
                            if (prev[0]?.call === call && updated.length === 0) {
                                // Primary call was cancelled and no more in queue
                                toast('Połączenie nieodebrane', { icon: '📵' });
                                setState(s => s === 'incoming' ? 'idle' : s);
                            } else if (prev[0]?.call === call && updated.length > 0) {
                                // Primary cancelled but queue has more — promote next
                                setCallerInfo(updated[0].contact);
                                toast('Połączenie nieodebrane — następne w kolejce', { icon: '📵' });
                            }
                            return updated;
                        });
                    });
                }).catch(() => {
                    // Fallback if lookup fails
                    const queueEntry: QueuedCall = {
                        call,
                        from,
                        contact: { type: null, id: null, name: null },
                        timestamp: new Date(),
                    };
                    setCallQueue(prev => [...prev, queueEntry]);
                });
            });

            device.register();
            deviceRef.current = device;

            // Refresh token every 50 minutes
            if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
            tokenRefreshRef.current = setInterval(async () => {
                try {
                    const { token: newToken } = await TelephonyService.getTwilioToken();
                    device.updateToken(newToken);
                    console.log('☎️ Token refreshed');
                } catch (e) {
                    console.warn('Token refresh failed:', e);
                }
            }, 50 * 60 * 1000);

        } catch (err: any) {
            console.error('☎️ Activation failed:', err);
            setConnectionStatus('error');
            setConnectionError(err?.message || 'Nie udało się połączyć z Twilio');
            toast.error('Nie udało się aktywować telefonu');
        }
    }, [state]);

    const deactivate = useCallback(() => {
        if (deviceRef.current) {
            deviceRef.current.unregister();
            deviceRef.current.destroy();
            deviceRef.current = null;
        }
        if (tokenRefreshRef.current) {
            clearInterval(tokenRefreshRef.current);
            tokenRefreshRef.current = null;
        }
        setConnectionStatus('disconnected');
        setConnectionError(null);
        setState('idle');
        setCallQueue([]);
        toast('Telefon wyłączony', { icon: '📴', duration: 2000 });
    }, []);

    // Clean up on unmount
    useEffect(() => {
        const handleClickToCall = (e: Event) => {
            const { number, name, leadId } = (e as CustomEvent).detail;
            if (number) {
                setDialNumber(number);
                setIsMinimized(false);
                if (name) {
                    setCallerInfo({ type: leadId ? 'lead' : null, id: leadId || null, name });
                }
                // Store leadId for auto-linking the call log
                (window as any).__softphone_leadId = leadId || null;
                if (connectionStatus !== 'connected') {
                    activate().then(() => {
                        setTimeout(() => handleDial(), 1000);
                    });
                } else {
                    setTimeout(() => handleDial(), 500);
                }
            }
        };
        window.addEventListener('softphone-dial', handleClickToCall);

        return () => {
            if (deviceRef.current) {
                deviceRef.current.destroy();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
            window.removeEventListener('softphone-dial', handleClickToCall);
        };
    }, []);

    // Call timer
    useEffect(() => {
        if (state === 'active') {
            setCallDuration(0);
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [state]);

    const handleCallEnd = useCallback(() => {
        setActiveCall(null);
        setIsMuted(false);

        // Check if there are queued calls → show next one
        setCallQueue(prev => {
            if (prev.length > 0) {
                const next = prev[0];
                setCallerInfo(next.contact);
                setState('incoming');
                setIsMinimized(false);
                toast(`📞 Następne połączenie: ${next.contact.name || next.from}`, { icon: '📱' });
            } else {
                setState('post-call');
            }
            return prev;
        });
    }, []);

    // ─── ACTIONS ───

    const handleDial = async () => {
        if (!deviceRef.current || !dialNumber.trim()) return;

        try {
            setState('dialing');
            setIsMinimized(false);

            const info = await TelephonyService.lookupContact(dialNumber);
            setCallerInfo(info);

            const call = await deviceRef.current.connect({
                params: { To: dialNumber }
            });

            setActiveCall(call);

            call.on('accept', () => setState('active'));
            call.on('disconnect', () => handleCallEnd());
            call.on('reject', () => {
                setState('idle');
                toast.error('Połączenie odrzucone');
            });
            call.on('error', (err) => {
                console.error('Call error:', err);
                setState('idle');
                toast.error('Błąd połączenia');
            });

            const { data: { user } } = await supabase.auth.getUser();
            const pendingLeadId = (window as any).__softphone_leadId || null;
            const logEntry = {
                direction: 'outbound' as const,
                from_number: 'app',
                to_number: dialNumber,
                status: 'initiated' as const,
                user_id: user?.id || null,
                lead_id: pendingLeadId || (info.type === 'lead' ? info.id : null),
                customer_id: info.type === 'customer' ? info.id : null,
                started_at: new Date().toISOString(),
            };
            // Clear after use
            (window as any).__softphone_leadId = null;

            const { data: callLog } = await supabase
                .from('call_logs')
                .insert(logEntry)
                .select()
                .single();

            if (callLog) setLastCallId(callLog.id);

        } catch (err) {
            console.error('Dial error:', err);
            setState('idle');
            toast.error('Nie udało się połączyć');
        }
    };

    const handleAnswer = (queuedCall?: QueuedCall) => {
        const callToAnswer = queuedCall || primaryIncoming;
        if (!callToAnswer) return;

        callToAnswer.call.accept();
        setActiveCall(callToAnswer.call);
        setCallerInfo(callToAnswer.contact);
        // Remove from queue
        setCallQueue(prev => prev.filter(q => q.call !== callToAnswer.call));
        setState('active');
    };

    const handleReject = (queuedCall?: QueuedCall) => {
        const callToReject = queuedCall || primaryIncoming;
        if (!callToReject) return;

        callToReject.call.reject();
        setCallQueue(prev => {
            const updated = prev.filter(q => q.call !== callToReject.call);
            if (updated.length === 0 && state === 'incoming') {
                setState('idle');
            } else if (updated.length > 0 && state === 'incoming') {
                // Promote next call
                setCallerInfo(updated[0].contact);
            }
            return updated;
        });
    };

    const handleHangup = () => {
        if (activeCall) {
            activeCall.disconnect();
        }
        handleCallEnd();
    };

    const toggleMute = () => {
        if (activeCall) {
            const newState = !isMuted;
            activeCall.mute(newState);
            setIsMuted(newState);
        }
    };

    const handleSavePostCall = async () => {
        if (lastCallId && postCallNotes.trim()) {
            await TelephonyService.addCallNotes(lastCallId, postCallNotes);
            toast.success('Notatka zapisana');
        }
        setPostCallNotes('');
        setLastCallId(null);
        setCallerInfo({ type: null, id: null, name: null });
        setState('idle');
    };

    const handleSkipPostCall = () => {
        setPostCallNotes('');
        setLastCallId(null);
        setCallerInfo({ type: null, id: null, name: null });

        // If there are queued calls, show the next one
        if (callQueue.length > 0) {
            const next = callQueue[0];
            setCallerInfo(next.contact);
            setState('incoming');
            setIsMinimized(false);
        } else {
            setState('idle');
        }
    };

    const handleDialPadKey = (key: string) => {
        setDialNumber(prev => prev + key);
        if (activeCall && state === 'active') {
            activeCall.sendDigits(key);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Lead status label map
    const LEAD_STATUS_LABELS: Record<string, { label: string; color: string }> = {
        new: { label: 'Nowy', color: 'bg-blue-100 text-blue-700' },
        formularz: { label: 'Formularz', color: 'bg-teal-100 text-teal-700' },
        contacted: { label: 'Skontaktowano', color: 'bg-indigo-100 text-indigo-700' },
        offer_sent: { label: 'Oferta wysłana', color: 'bg-yellow-100 text-yellow-800' },
        measurement_scheduled: { label: 'Pomiar umówiony', color: 'bg-cyan-100 text-cyan-700' },
        measurement_completed: { label: 'Pomiar odbył się', color: 'bg-purple-100 text-purple-700' },
        negotiation: { label: 'Negocjacje', color: 'bg-orange-100 text-orange-700' },
        won: { label: 'Wygrane', color: 'bg-green-100 text-green-700' },
        lost: { label: 'Przegrane', color: 'bg-red-100 text-red-700' },
    };

    const LeadContextBadge = ({ info }: { info: ContactInfo }) => {
        if (!info.leadStatus) return null;
        const statusInfo = LEAD_STATUS_LABELS[info.leadStatus] || { label: info.leadStatus, color: 'bg-slate-100 text-slate-600' };
        return (
            <div className="mt-2 flex flex-col items-center gap-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                </span>
                {info.assignedToName && (
                    <span className="text-[10px] text-slate-400">Opiekun: {info.assignedToName}</span>
                )}
            </div>
        );
    };

    const OpenLeadButton = ({ info }: { info: ContactInfo }) => {
        if (info.type !== 'lead' || !info.id) return null;
        return (
            <button
                onClick={() => window.location.href = `/leads/${info.id}`}
                className="mt-2 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Otwórz Lead
            </button>
        );
    };

    // ─── STATUS COLORS & LABELS ───
    const statusConfig = {
        disconnected: { color: 'bg-slate-400', ring: '', label: 'Nieaktywny', textColor: 'text-slate-400' },
        connecting: { color: 'bg-yellow-400', ring: 'animate-pulse', label: 'Łączenie...', textColor: 'text-yellow-500' },
        connected: { color: 'bg-green-400', ring: 'animate-pulse', label: 'Aktywny', textColor: 'text-green-500' },
        error: { color: 'bg-red-400', ring: '', label: 'Błąd', textColor: 'text-red-500' },
    };
    const status = statusConfig[connectionStatus];

    // ─── QUEUE BADGE (floating above minimized widget) ───
    const QueueBadge = () => {
        if (callQueue.length === 0) return null;
        return (
            <div className="absolute -top-2 -left-2 min-w-[22px] h-[22px] bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse z-10">
                {callQueue.length}
            </div>
        );
    };

    // ─── QUEUE LIST PANEL ───
    const QueuePanel = () => {
        if (callQueue.length <= 1 && state !== 'active') return null;

        const waitingCalls = state === 'active' ? callQueue : callQueue.slice(1);
        if (waitingCalls.length === 0) return null;

        return (
            <div className="border-t border-slate-200 bg-amber-50/60">
                <button
                    onClick={() => setShowQueue(!showQueue)}
                    className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-amber-800 hover:bg-amber-100/50 transition-colors"
                >
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                        W kolejce: {waitingCalls.length}
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${showQueue ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showQueue && (
                    <div className="px-3 pb-2 space-y-1.5 max-h-40 overflow-y-auto">
                        {waitingCalls.map((q, i) => {
                            const waitSec = Math.floor((Date.now() - q.timestamp.getTime()) / 1000);
                            return (
                                <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-amber-100">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">
                                            {q.contact.name || q.from}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono">
                                            {q.from} · {waitSec > 60 ? `${Math.floor(waitSec / 60)}m` : `${waitSec}s`} czeka
                                        </p>
                                        {q.contact.type && (
                                            <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[9px] font-bold ${q.contact.type === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {q.contact.type === 'lead' ? 'Lead' : 'Klient'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleAnswer(q)}
                                            className="w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                                            title="Odbierz"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleReject(q)}
                                            className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"
                                            title="Odrzuć"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // ─── MINIMIZED STATE ───
    if (isMinimized && state === 'idle') {
        return (
            <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
                {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
                    <button
                        onClick={() => { activate(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Jestem aktywny
                        {connectionError && (
                            <span className="text-[10px] opacity-75">({connectionError.slice(0, 20)}...)</span>
                        )}
                    </button>
                ) : connectionStatus === 'connecting' ? (
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white text-sm font-bold rounded-full shadow-xl animate-pulse cursor-wait"
                    >
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Łączenie...
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={deactivate}
                            className="px-3 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-full hover:bg-red-200 transition-colors shadow-md"
                            title="Wyłącz telefon"
                        >
                            📴 Wyłącz
                        </button>
                        <button
                            onClick={() => setIsMinimized(false)}
                            className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center hover:scale-105 relative"
                            title="Otwórz telefon"
                        >
                            <QueueBadge />
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-300 rounded-full animate-pulse" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const DIAL_PAD = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#'],
    ];

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status.color} ${status.ring}`} />
                    <span className="text-white text-sm font-semibold">Telefon</span>
                    <span className={`text-[10px] font-medium ${connectionStatus === 'connected' ? 'text-green-300' : connectionStatus === 'error' ? 'text-red-300' : 'text-slate-400'}`}>
                        {status.label}
                    </span>
                    {/* Queue badge in header */}
                    {callQueue.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                            {callQueue.length} w kolejce
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {connectionStatus === 'connected' && (
                        <button
                            onClick={deactivate}
                            className="text-red-400 hover:text-red-300 p-1 transition-colors text-xs font-medium"
                            title="Wyłącz telefon"
                        >
                            📴
                        </button>
                    )}
                    {state === 'idle' && (
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="text-white/60 hover:text-white p-1 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ── NOT CONNECTED: Activation prompt ── */}
            {connectionStatus !== 'connected' && state === 'idle' && (
                <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        {connectionStatus === 'connecting' ? (
                            <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
                        ) : connectionStatus === 'error' ? (
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        ) : (
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        )}
                    </div>

                    {connectionError && (
                        <p className="text-xs text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">{connectionError}</p>
                    )}

                    <p className="text-sm text-slate-500 mb-4">
                        {connectionStatus === 'connecting' ? 'Łączenie z centralą...' : 'Kliknij aby włączyć odbiór połączeń'}
                    </p>

                    {connectionStatus !== 'connecting' && (
                        <button
                            onClick={activate}
                            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Jestem aktywny
                        </button>
                    )}
                </div>
            )}

            {/* ── IDLE: Dial Pad (only when connected) ── */}
            {state === 'idle' && connectionStatus === 'connected' && (
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="tel"
                            value={dialNumber}
                            onChange={e => setDialNumber(e.target.value)}
                            placeholder="+49..."
                            className="flex-1 text-center text-lg font-mono tracking-wider px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
                            onKeyDown={e => e.key === 'Enter' && handleDial()}
                        />
                        {dialNumber && (
                            <button
                                onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                                className="text-slate-400 hover:text-slate-600 p-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {DIAL_PAD.flat().map(key => (
                            <button
                                key={key}
                                onClick={() => handleDialPadKey(key)}
                                className="py-3 text-lg font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors active:bg-slate-200"
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleDial}
                        disabled={!dialNumber.trim()}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Zadzwoń
                    </button>
                </div>
            )}

            {/* ── DIALING ── */}
            {state === 'dialing' && (
                <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Łączenie...</p>
                    <p className="text-lg font-bold text-slate-800 mt-1 font-mono">{callerInfo.name || dialNumber}</p>
                    <button
                        onClick={handleHangup}
                        className="mt-4 w-full py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                    >
                        Anuluj
                    </button>
                </div>
            )}

            {/* ── INCOMING ── */}
            {state === 'incoming' && primaryIncoming && (
                <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center animate-bounce">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Połączenie przychodzące</p>
                    <p className="text-lg font-bold text-slate-800 mt-1">
                        {primaryIncoming.contact.name || primaryIncoming.from || 'Nieznany numer'}
                    </p>
                    {primaryIncoming.contact.type && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${primaryIncoming.contact.type === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {primaryIncoming.contact.type === 'lead' ? 'Lead' : 'Klient'}
                        </span>
                    )}
                    <LeadContextBadge info={primaryIncoming.contact} />

                    <div className="flex gap-3 justify-center mt-5">
                        <button
                            onClick={() => handleReject()}
                            className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.28 2.06A1 1 0 007.28 1H4z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleAnswer()}
                            className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors shadow-lg shadow-green-200 animate-pulse"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── ACTIVE CALL ── */}
            {state === 'active' && (
                <div className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-lg font-bold text-slate-800">
                        {callerInfo.name || dialNumber || 'Rozmowa'}
                    </p>
                    <p className="text-2xl font-mono text-slate-600 mt-1">{formatTime(callDuration)}</p>
                    <LeadContextBadge info={callerInfo} />
                    <OpenLeadButton info={callerInfo} />

                    <div className="grid grid-cols-3 gap-2 mt-5">
                        <button
                            onClick={toggleMute}
                            className={`flex flex-col items-center p-3 rounded-xl transition-colors ${isMuted ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                            <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="text-[10px] font-semibold">{isMuted ? 'Unmute' : 'Mute'}</span>
                        </button>

                        <button
                            onClick={() => { /* DTMF toggle */ }}
                            className="flex flex-col items-center p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <span className="text-lg font-bold mb-0.5">#</span>
                            <span className="text-[10px] font-semibold">DTMF</span>
                        </button>

                        <button
                            onClick={handleHangup}
                            className="flex flex-col items-center p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                            <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.28 2.06A1 1 0 007.28 1H4z" />
                            </svg>
                            <span className="text-[10px] font-semibold">Rozłącz</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ── POST-CALL ── */}
            {state === 'post-call' && (
                <div className="p-4">
                    <div className="text-center mb-3">
                        <p className="text-sm text-slate-500">Rozmowa zakończona</p>
                        <p className="text-lg font-bold text-slate-800">{callerInfo.name || dialNumber || '—'}</p>
                        <p className="text-sm font-mono text-slate-400">{formatTime(callDuration)}</p>
                        <LeadContextBadge info={callerInfo} />
                        <OpenLeadButton info={callerInfo} />
                    </div>

                    <textarea
                        value={postCallNotes}
                        onChange={e => setPostCallNotes(e.target.value)}
                        placeholder="Notatka z rozmowy..."
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:ring-2 focus:ring-indigo-400 outline-none"
                    />

                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleSkipPostCall}
                            className="flex-1 py-2 text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            {callQueue.length > 0 ? `Następne (${callQueue.length})` : 'Pomiń'}
                        </button>
                        <button
                            onClick={handleSavePostCall}
                            className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                        >
                            Zapisz
                        </button>
                    </div>
                </div>
            )}

            {/* ── CALL QUEUE PANEL ── */}
            <QueuePanel />
        </div>
    );
};
