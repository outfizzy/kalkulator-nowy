import React, { useState, useEffect } from 'react';
import { TelephonyService } from '../../services/database/telephony.service';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface QuickSMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    phoneNumber: string;
    contactName?: string;
}

const SMS_TEMPLATES = [
    { emoji: '👋', label: 'Begrüßung', text: 'Guten Tag, hier ist Polendach24. Vielen Dank für Ihr Interesse! Wir melden uns in Kürze bei Ihnen.' },
    { emoji: '📞', label: 'Rückruf', text: 'Guten Tag, wir haben Ihren Anruf erhalten und werden Sie in Kürze zurückrufen. Mit freundlichen Grüßen, Polendach24.' },
    { emoji: '📄', label: 'Angebot', text: 'Guten Tag, wir haben Ihnen soeben ein Angebot per E-Mail zugesendet. Bei Fragen stehen wir Ihnen gerne zur Verfügung. Polendach24.' },
    { emoji: '📅', label: 'Termin', text: 'Guten Tag, hiermit bestätigen wir Ihren Termin. Bei Änderungswünschen erreichen Sie uns unter +4915888649130. Polendach24.' },
    { emoji: '🏠', label: 'Nachfass', text: 'Guten Tag, wir möchten uns erkundigen, ob Sie noch Interesse an unserer Terrassenüberdachung haben. Gerne beraten wir Sie erneut. Polendach24.' },
];

export const QuickSMSModal: React.FC<QuickSMSModalProps> = ({ isOpen, onClose, phoneNumber, contactName }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [fromNumberId, setFromNumberId] = useState<string>('');
    const [fromNumber, setFromNumber] = useState<string>('');
    const { currentUser } = useAuth();

    useEffect(() => {
        TelephonyService.getPhoneNumbers().then(numbers => {
            const smsNumber = numbers.find(n => n.capabilities?.sms && n.is_active);
            if (smsNumber) {
                setFromNumberId(smsNumber.id);
                setFromNumber(smsNumber.phone_number);
            }
        }).catch(console.error);
    }, []);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!message.trim()) { toast.error('Bitte Nachricht eingeben'); return; }
        if (!fromNumberId) { toast.error('Keine SMS-Nummer verfügbar'); return; }

        setSending(true);
        try {
            await TelephonyService.sendSMS(phoneNumber, message.trim(), fromNumberId);
            toast.success(`SMS gesendet an ${contactName || phoneNumber}`);
            setMessage('');
            onClose();
        } catch (error: any) {
            console.error('SMS send error:', error);
            toast.error('SMS-Fehler: ' + (error.message || 'Unbekannter Fehler'));
        } finally {
            setSending(false);
        }
    };

    const handleAiTranslate = async () => {
        if (!message.trim()) { toast.error('Bitte zuerst einen Text eingeben'); return; }

        setTranslating(true);
        try {
            // Use Supabase edge function (server-side API key) instead of user-level OpenAI key
            const { supabase } = await import('../../lib/supabase');
            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: {
                    messages: [
                        {
                            role: 'system',
                            content: `Du bist ein professioneller Übersetzer und Texter für ein deutsches Terrassenüberdachungs-Unternehmen (Polendach24).
Deine Aufgabe: Übersetze und/oder verbessere den folgenden Text ins professionelle, höfliche Deutsch.
- Wenn der Text auf Polnisch, Englisch oder einer anderen Sprache ist → übersetze ihn ins Deutsche.
- Wenn er bereits auf Deutsch ist → korrigiere Grammatik, Stil und mache ihn professioneller.
- Halte den Text kurz und SMS-tauglich (max 160 Zeichen wenn möglich).
- Beende mit "Polendach24" als Absender wenn nicht vorhanden.
Gib NUR den verbesserten Text zurück, keine Erklärungen.`
                        },
                        { role: 'user', content: message }
                    ]
                }
            });

            if (error) throw error;
            const result = data?.content || data?.choices?.[0]?.message?.content || data?.reply;
            if (result) {
                setMessage(result.trim());
                toast.success('Text übersetzt & verbessert');
            } else {
                toast.error('Keine Antwort vom AI-Service');
            }
        } catch (error: any) {
            console.error('AI translate error:', error);
            toast.error('Übersetzungsfehler: ' + (error.message || 'Unbekannter Fehler'));
        } finally {
            setTranslating(false);
        }
    };

    const charCount = message.length;
    const smsCount = Math.ceil(charCount / 160) || 1;
    const charProgress = Math.min((charCount % 160) / 160 * 100, 100);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">SMS senden</h3>
                            <p className="text-[11px] text-slate-500">
                                An: <span className="font-medium text-slate-700">{contactName || phoneNumber}</span>
                                {contactName && <span className="text-slate-400"> · {phoneNumber}</span>}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* From number badge */}
                {fromNumber && (
                    <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Von</span>
                        <span className="text-xs font-mono font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">{fromNumber}</span>
                    </div>
                )}

                {/* Templates */}
                <div className="px-5 pt-3 pb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Vorlagen</p>
                    <div className="flex flex-wrap gap-1.5">
                        {SMS_TEMPLATES.map((tpl, i) => (
                            <button
                                key={i}
                                onClick={() => setMessage(tpl.text)}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all border ${
                                    message === tpl.text
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                <span className="mr-1">{tpl.emoji}</span>{tpl.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message input */}
                <div className="px-5 py-2">
                    <div className="relative">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Nachricht eingeben..."
                            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all bg-white placeholder:text-slate-400"
                            rows={4}
                            autoFocus
                        />
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium ${charCount > 160 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {charCount}/160 · {smsCount} SMS
                            </span>
                            {/* Mini progress bar */}
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${charCount > 160 ? 'bg-amber-400' : charCount > 120 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${charProgress}%` }}
                                />
                            </div>
                        </div>
                        {charCount > 160 && (
                            <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                Mehr-SMS-Kosten
                            </span>
                        )}
                    </div>
                </div>

                {/* AI Translate bar */}
                <div className="px-5 pb-3">
                    <button
                        onClick={handleAiTranslate}
                        disabled={translating || !message.trim()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-200/60 rounded-lg transition-all group"
                    >
                        {translating ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-medium text-indigo-600">Wird übersetzt...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">KI: Übersetzen & auf Deutsch verbessern</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Wird gesendet...
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                SMS senden
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
