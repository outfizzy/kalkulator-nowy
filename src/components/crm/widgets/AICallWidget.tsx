import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

interface AICallWidgetProps {
    phoneNumber: string;
    customerName: string;
    installationId?: string;
    customerId: string;
    leadId?: string;
}

const TEMPLATES = [
    { label: "📍 Dojazd", text: "Zapytaj klienta o utrudnienia w dojeździe dla dużej ciężarówki (błoto, wąska brama, linie energetyczne)." },
    { label: "🏗️ Gotowość", text: "Upewnij się, że fundamenty są wylane i gotowe do montażu. Zapytaj czy jest prąd na działce." },
    { label: "🕒 Przełożenie", text: "Zaproponuj przełożenie montażu na tydzień później z powodu pogody. Zapytaj czy to pasuje." },
    { label: "📷 Zdjęcia", text: "Poproś klienta o przesłanie zdjęć miejsca montażu na SMS/MMS." }
];

export const AICallWidget: React.FC<AICallWidgetProps> = ({
    phoneNumber,
    customerName,
    installationId,
    customerId,
    leadId
}) => {
    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCall = async () => {
        if (!instructions.trim()) {
            toast.error('Wpisz instrukcje dla bota');
            return;
        }

        if (!phoneNumber) {
            toast.error('Brak numeru telefonu klienta');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Konfigurowanie asystenta AI...');

        try {
            const { data, error } = await supabase.functions.invoke('vapi-make-call', {
                body: {
                    phoneNumber,
                    customerName,
                    // Use standard date/time if available, or current
                    installationDate: new Date().toISOString(),
                    leadId,
                    installationId,
                    customerId,
                    customInstructions: instructions
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            toast.success('Leo rozpoczął rozmowę! 🤖', { id: toastId });
            setInstructions('');
        } catch (error: any) {
            console.error('AI Call Error:', error);
            toast.error('Błąd połączenia: ' + error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-5">
            <div className="flex items-center gap-2 mb-3">
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">Zleć Zadanie (AI)</h3>
                    <p className="text-xs text-slate-500">Bot zadzwoni i wykona Twoje instrukcje</p>
                </div>
            </div>

            <div className="mb-3">
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Np. Zapytaj czy klient będzie w domu o 14:00..."
                    className="w-full text-sm p-3 rounded-lg border border-indigo-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none bg-white min-h-[80px] resize-none"
                />
            </div>

            <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Szybkie Szablony</p>
                <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => setInstructions(t.text)}
                            className="text-xs bg-white border border-indigo-100 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleCall}
                disabled={loading || !instructions.trim()}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Nawiązywanie połączenia...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        Wykonaj Telefon
                    </>
                )}
            </button>
        </div>
    );
};
