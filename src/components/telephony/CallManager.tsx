import React, { useEffect, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export const CallManager: React.FC = () => {
    const deviceRef = React.useRef<Device | null>(null);
    const [call, setCall] = useState<Call | null>(null);
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    // Fetch Token on Mount
    useEffect(() => {
        const initializeDevice = (accessToken: string) => {
            const newDevice = new Device(accessToken, {
                codecPreferences: ['opus', 'pcmu'] as any,
            });

            newDevice.on('ready', () => {
            });

            newDevice.on('error', (error) => {
                console.error('Twilio Device Error:', error);
            });

            newDevice.on('incoming', (conn) => {
                setIncomingCall(conn);
                toast('Połączenie przychodzące!', { icon: '📞', duration: 5000 });

                conn.on('disconnect', () => {
                    setIncomingCall(null);
                    setCall(null);
                });

                conn.on('reject', () => {
                    setIncomingCall(null);
                });
            });

            newDevice.register();
            deviceRef.current = newDevice;
        };

        const fetchToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data, error } = await supabase.functions.invoke('voice-token', {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`
                    }
                });

                if (error || !data?.token) {
                    // Silently skip - Twilio not configured on this project
                    return;
                }

                initializeDevice(data.token);
            } catch {
                // Silently fail if not configured (missing Twilio secrets)
            }
        };

        fetchToken();

        return () => {
            if (deviceRef.current) {
                deviceRef.current.destroy();
            }
        };
    }, []);

    const handleAnswer = async () => {
        if (incomingCall) {
            await incomingCall.accept();
            setCall(incomingCall);
            setIncomingCall(null);
        }
    };

    const handleReject = () => {
        if (incomingCall) {
            incomingCall.reject();
            setIncomingCall(null);
        }
    };

    const handleHangup = () => {
        if (call) {
            call.disconnect();
            setCall(null);
        }
    };

    const handleTransferToAI = async () => {
        if (!call) return;

        // Logic to transfer the active call to Vapi
        // We need a backend function for this: voice-action specifically `updateCall`
        // Simplified for MVP: Just hangup effectively? No, transfer.
        // TwiML redirect or Conference.

        toast.loading('Przełączanie do Leo (AI)...');

        // This part requires `voice-action` backend which updates the live call
        // For now, we simulate by just notifying user (Backend part TBD in next step)

        /* 
        await supabase.functions.invoke('voice-action', { 
            body: { action: 'transfer', callSid: call.parameters.CallSid } 
        });
        */
        toast.error('Funkcja transferu wymaga backendu (voice-action)');
    };

    const toggleMute = () => {
        if (call) {
            const newState = !isMuted;
            call.mute(newState);
            setIsMuted(newState);
        }
    };

    // UI RENDER
    if (!incomingCall && !call) return null; // Hidden when idle

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white shadow-2xl rounded-xl p-4 border border-slate-200 w-80 animate-slide-in-right">
            {/* INCOMING STATE */}
            {incomingCall && !call && (
                <div className="text-center">
                    <div className="animate-pulse bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Połączenie Przychodzące</h3>
                    <p className="text-sm text-slate-500 mb-4">{incomingCall.parameters.From || 'Nieznany numer'}</p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleReject}
                            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.28 2.06A1 1 0 007.28 1H4z" /></svg>
                        </button>
                        <button
                            onClick={handleAnswer}
                            className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors shadow-lg shadow-green-200"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ACTIVE CALL STATE */}
            {call && (
                <div className="text-center">
                    <div className="bg-green-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <h3 className="text-md font-semibold text-slate-800 mb-4">W trakcie rozmowy...</h3>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <button
                            onClick={toggleMute}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg ${isMuted ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-600'}`}
                        >
                            {isMuted ? (
                                <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                            ) : (
                                <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            )}
                            <span className="text-xs">{isMuted ? 'Odmutuj' : 'Wycisz'}</span>
                        </button>

                        <button
                            onClick={handleTransferToAI}
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        >
                            <div className="font-bold text-lg mb-0 text-indigo-500">AI</div>
                            <span className="text-xs">Przełącz</span>
                        </button>

                        <button
                            onClick={handleHangup}
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.28 2.06A1 1 0 007.28 1H4z" /></svg>
                            <span className="text-xs">Rozłącz</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
