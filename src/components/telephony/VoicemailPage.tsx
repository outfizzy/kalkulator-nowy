import React, { useEffect, useState } from 'react';
import { TelephonyService, type Voicemail } from '../../services/database/telephony.service';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export const VoicemailPage: React.FC = () => {
    const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [playing, setPlaying] = useState<string | null>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        loadVoicemails();
    }, [showAll]);

    const loadVoicemails = async () => {
        setLoading(true);
        try {
            const data = await TelephonyService.getVoicemails(!showAll);
            setVoicemails(data);
        } catch {
            toast.error('Błąd ładowania poczty głosowej');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkListened = async (id: string) => {
        if (!currentUser?.id) return;
        try {
            await TelephonyService.markVoicemailListened(id, currentUser.id);
            toast.success('Oznaczono jako odsłuchane');
            loadVoicemails();
        } catch {
            toast.error('Błąd');
        }
    };

    const unlistenedCount = voicemails.filter(v => !v.is_listened).length;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Poczta Głosowa
                        {unlistenedCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-sm rounded-full">{unlistenedCount} nowe</span>
                        )}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Nagrania z poczty głosowej</p>
                </div>
                <button
                    onClick={() => setShowAll(!showAll)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showAll ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                >
                    {showAll ? 'Wszystkie' : 'Tylko nowe'}
                </button>
            </div>

            {loading ? (
                <div className="text-center p-12 text-slate-400">Ładowanie...</div>
            ) : voicemails.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <p className="text-slate-400">{showAll ? 'Brak nagrań' : 'Brak nowych nagrań'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {voicemails.map(vm => (
                        <div key={vm.id} className={`bg-white rounded-xl border ${vm.is_listened ? 'border-slate-200' : 'border-blue-200 bg-blue-50/20'} p-4`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${vm.is_listened ? 'bg-slate-100' : 'bg-blue-100'}`}>
                                        <svg className={`w-5 h-5 ${vm.is_listened ? 'text-slate-500' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 font-mono">
                                            {(vm.call_log as any)?.from_number || 'Nieznany'}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(vm.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}{', '}
                                            {new Date(vm.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            {' · '}{vm.duration_seconds}s
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!vm.is_listened && (
                                        <button
                                            onClick={() => handleMarkListened(vm.id)}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-semibold hover:bg-blue-200"
                                        >
                                            Odsłuchano ✓
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Audio player */}
                            {vm.recording_url && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <audio
                                        controls
                                        src={vm.recording_url}
                                        className="w-full h-10"
                                        onPlay={() => setPlaying(vm.id)}
                                        onEnded={() => setPlaying(null)}
                                    />
                                </div>
                            )}

                            {/* Transcription */}
                            {vm.transcription && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">
                                    "{vm.transcription}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
