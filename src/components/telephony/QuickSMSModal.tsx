import React, { useState, useEffect } from 'react';
import { TelephonyService } from '../../services/database/telephony.service';
import toast from 'react-hot-toast';

interface QuickSMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    phoneNumber: string;
    contactName?: string;
}

const SMS_TEMPLATES = [
    { label: '👋 Powitanie', text: 'Guten Tag, hier ist Polendach24. Vielen Dank für Ihr Interesse! Wir melden uns in Kürze bei Ihnen.' },
    { label: '📞 Oddzwonię', text: 'Guten Tag, wir haben Ihren Anruf erhalten und werden Sie in Kürze zurückrufen. Mit freundlichen Grüßen, Polendach24.' },
    { label: '📄 Offerte gesendet', text: 'Guten Tag, wir haben Ihnen soeben ein Angebot per E-Mail zugesendet. Bei Fragen stehen wir Ihnen gerne zur Verfügung. Polendach24.' },
    { label: '📅 Termin', text: 'Guten Tag, hiermit bestätigen wir Ihren Termin. Bei Änderungswünschen erreichen Sie uns unter +4915888649130. Polendach24.' },
];

export const QuickSMSModal: React.FC<QuickSMSModalProps> = ({ isOpen, onClose, phoneNumber, contactName }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [fromNumberId, setFromNumberId] = useState<string>('');
    const [fromNumber, setFromNumber] = useState<string>('');

    useEffect(() => {
        // Auto-fetch the first SMS-capable phone number
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
        if (!message.trim()) {
            toast.error('Wpisz wiadomość');
            return;
        }
        if (!fromNumberId) {
            toast.error('Brak numeru do wysyłki SMS');
            return;
        }

        setSending(true);
        try {
            await TelephonyService.sendSMS(phoneNumber, message.trim(), fromNumberId);
            toast.success(`SMS wysłany do ${contactName || phoneNumber}`);
            setMessage('');
            onClose();
        } catch (error: any) {
            console.error('SMS send error:', error);
            toast.error('Błąd wysyłania SMS: ' + (error.message || 'Nieznany błąd'));
        } finally {
            setSending(false);
        }
    };

    const charCount = message.length;
    const smsCount = Math.ceil(charCount / 160) || 1;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-lg">
                                💬
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Wyślij SMS</h3>
                                <p className="text-white/80 text-xs">
                                    Do: {contactName && <span className="font-medium">{contactName} • </span>}{phoneNumber}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* From number */}
                {fromNumber && (
                    <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                        Od: <span className="font-mono font-medium text-slate-700">{fromNumber}</span>
                    </div>
                )}

                {/* Templates */}
                <div className="px-5 pt-4 pb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Szablony</p>
                    <div className="flex flex-wrap gap-1.5">
                        {SMS_TEMPLATES.map((tpl, i) => (
                            <button
                                key={i}
                                onClick={() => setMessage(tpl.text)}
                                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg transition-colors border border-slate-200 hover:border-emerald-200"
                            >
                                {tpl.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message input */}
                <div className="px-5 py-3">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Wpisz wiadomość SMS..."
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        rows={4}
                        autoFocus
                    />
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">
                            {charCount} znaków • {smsCount} SMS{smsCount > 1 ? '-ów' : ''}
                        </span>
                        {charCount > 160 && (
                            <span className="text-[10px] text-amber-500 font-medium">
                                ⚠️ Dłuższy SMS = wyższy koszt
                            </span>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Wysyłanie...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Wyślij SMS
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
