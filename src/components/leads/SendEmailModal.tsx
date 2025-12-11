
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import type { Offer } from '../../types';
import { getOfferEmailHtml } from '../../utils/emailTemplates';
import { generateOfferPDFData } from '../../utils/pdfGenerator';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    to: string; // Pre-filled recipient
    subject?: string; // Optional pre-filled subject
    leadData?: { firstName?: string; lastName?: string; notes?: string; }; // Data for generation
    offer?: Offer;
    availableOffers?: Offer[];
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({ isOpen, onClose, to, subject = '', leadData, offer, availableOffers }) => {
    // ... we need 'offer' in scope for useEffect above, so I need to rewrite the component signature line and the Effect properly. 
    // Wait, multi_replace cannot access variables I define in ReplacementChunks easily if I split them wrong.
    // I will replace the component definition line. 

    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [emailSubject, setEmailSubject] = useState(subject);
    const [body, setBody] = useState('');

    // AI & Signature State
    const [aiMode, setAiMode] = useState<'rewrite' | 'generate'>('rewrite'); // New Mode Switch
    const [aiPrompt, setAiPrompt] = useState('');
    const [showAiPresets, setShowAiPresets] = useState(false);
    const [useSignature, setUseSignature] = useState(true);
    const [useOfferTemplate, setUseOfferTemplate] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<Offer | undefined>(offer); // Local state for offer

    // Effect to Update Local Offer State
    useEffect(() => {
        setSelectedOffer(offer);
    }, [offer]);

    // Effect to auto-enable template if offer is present (either prop or selected)
    useEffect(() => {
        if (isOpen && subject === '' && selectedOffer) {
            // Pre-fill subject if offer is present
            setEmailSubject(`Ihr Angebot #${selectedOffer.offerNumber || selectedOffer.id.substring(0, 8)} - PolenDach24`);
            setUseOfferTemplate(true);
        }
    }, [isOpen, subject, selectedOffer]);

    const AI_REWRITE_PRESETS = [
        { label: 'Popraw błędy', value: 'Popraw błędy interpunkcyjne, ortograficzne i stylistyczne.' },
        { label: 'Bardziej oficjalnie', value: 'Zmień ton na bardziej oficjalny i profesjonalny.' },
        { label: 'Bardziej luźno', value: 'Zmień ton na bardziej przyjacielski i bezpośredni.' },
        { label: 'Skróć wiadomość', value: 'Skróć wiadomość zachowując najważniejsze informacje. Bądź konkretny.' },
        { label: 'Rozwiń myśl', value: 'Rozwiń treść wiadomości, dodając uprzejme zwroty i więcej szczegółów.' },
        { label: 'Tłumacz na Angielski', value: 'Przetłumacz wiadomość na język angielski (Business English).' },
        { label: 'Tłumacz na Niemiecki', value: 'Przetłumacz wiadomość na język niemiecki (Profesjonalny).' },
    ];

    const AI_GENERATE_PRESETS = [
        { label: 'Powitanie / Zapytanie', value: 'Napisz wiadomość powitalną do nowego potencjalnego klienta. Zapytaj o potrzeby.' },
        { label: 'Wysłanie Oferty', value: 'Napisz wiadomość z załączeniem oferty. Podziękuj za zainteresowanie.' },
        { label: 'Przypomnienie (Follow-up)', value: 'Zapytaj o decyzję / status po wysłaniu oferty.' },
        { label: 'Prośba o spotkanie', value: 'Zaproponuj spotkanie lub rozmowę telefoniczną w celu omówienia szczegółów.' },
    ];

    if (!isOpen) return null;

    const handleRewrite = async () => {
        if (!body) return toast.error('Wpisz najpierw treść wiadomości');
        const toastId = toast.loading('AI poprawia Twoją wiadomość...');

        try {
            const res = await fetch('/api/ai-rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: body,
                    prompt: aiPrompt,
                    apiKey: currentUser?.emailConfig?.openaiKey
                })
            });

            if (!res.ok) throw new Error('AI Error');
            const data = await res.json();
            if (data.rewritten) {
                setBody(data.rewritten);
                toast.success('Gotowe!', { id: toastId });
                setShowAiPresets(false);
            }
        } catch (e: any) {
            toast.error('Błąd AI', { id: toastId });
        }
    };

    const handleGenerate = async () => {
        const toastId = toast.loading('AI generuje szkic wiadomości...');
        try {
            const res = await fetch('/api/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadData: leadData || {},
                    type: aiPrompt || 'Ogólny kontakt',
                    tone: 'Profesjonalny',
                    apiKey: currentUser?.emailConfig?.openaiKey
                })
            });

            if (!res.ok) throw new Error('AI Error');
            const data = await res.json();
            if (data.generatedText) {
                setBody(prev => prev ? prev + '\n\n' + data.generatedText : data.generatedText);
                toast.success('Wygenerowano!', { id: toastId });
                setShowAiPresets(false);
            }
        } catch (e: any) {
            toast.error('Błąd AI', { id: toastId });
        }
    };

    const handleAiAction = () => {
        if (aiMode === 'rewrite') handleRewrite();
        else handleGenerate();
    };

    const handleSend = async () => {
        if (!emailSubject || (!body && !useOfferTemplate)) {
            toast.error('Uzupełnij temat i treść');
            return;
        }

        setLoading(true);
        try {
            if (!currentUser?.emailConfig?.smtpHost) {
                toast.error('Skonfiguruj najpierw skrzynkę pocztową w Ustawieniach');
                return;
            }

            let finalBody = body;
            let attachments: any[] = [];

            if (useOfferTemplate && selectedOffer) {
                // 1. Generate PDF
                const toastPdf = toast.loading('Generowanie PDF oferty...');
                try {
                    const pdfBase64 = await generateOfferPDFData(selectedOffer);

                    // 2. Attach PDF
                    attachments.push({
                        filename: `Angebot_${selectedOffer.offerNumber || selectedOffer.id.substring(0, 8)}.pdf`,
                        content: pdfBase64,
                        contentType: 'application/pdf'
                    });

                    // 3. Generate HTML Body
                    // We pass '#' as url to indicate it's an attachment
                    finalBody = getOfferEmailHtml([{ number: selectedOffer.offerNumber || selectedOffer.id.substring(0, 8), url: '#' }]);

                    toast.dismiss(toastPdf);
                } catch (err) {
                    console.error('PDF Gen Error', err);
                    toast.dismiss(toastPdf);
                    toast.error('Błąd generowania PDF: ' + (err instanceof Error ? err.message : String(err)));
                    setLoading(false);
                    return;
                }
            } else {
                // Standard Body with Signature
                finalBody = body.replace(/\n/g, '<br>');
                if (useSignature && currentUser.emailConfig.signature) {
                    const rawSig = currentUser.emailConfig.signature;
                    const sigHtml = (rawSig.includes('<') && rawSig.includes('>'))
                        ? rawSig
                        : rawSig.replace(/\n/g, '<br>');
                    finalBody += `< br > <br>--<br>${sigHtml}`;
                }
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    to,
                    subject: emailSubject,
                    body: finalBody,
                    config: currentUser.emailConfig,
                    attachments // Pass attachments
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success('Wiadomość wysłana!');
            onClose();
            setBody('');
            setEmailSubject('');
        } catch (error: any) {
            console.error('Send email error:', error);
            toast.error('Błąd wysyłania: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Wyślij wiadomość</h3>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowAiPresets(!showAiPresets)}
                            className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Asystent
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Do:</label>
                        <input
                            type="text"
                            disabled
                            value={to}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Temat:</label>
                        <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none"
                            placeholder="Wpisz temat wiadomości..."
                        />
                    </div>

                    {/* Offer Selection (if not pre-selected but available) */}
                    {!offer && availableOffers && availableOffers.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Załącz Ofertę (Opcjonalnie):</label>
                            <select
                                value={selectedOffer?.id || ''}
                                onChange={(e) => {
                                    const found = availableOffers.find(o => o.id === e.target.value);
                                    setSelectedOffer(found);
                                    if (found) {
                                        setUseOfferTemplate(true);
                                        setEmailSubject(`Ihr Angebot #${found.offerNumber || found.id.substring(0, 8)} - PolenDach24`);
                                    } else {
                                        setUseOfferTemplate(false);
                                    }
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                            >
                                <option value="">-- Wybierz Ofertę --</option>
                                {availableOffers.map(o => (
                                    <option key={o.id} value={o.id}>
                                        Oferta #{o.offerNumber || o.id.substring(0, 8)} ({new Date(o.createdAt).toLocaleDateString()}) - {o.pricing?.sellingPriceGross} EUR
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Offer Template Toggle */}
                    {selectedOffer && (
                        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-blue-900 text-sm">Wysyłka Oferty PDF</h4>
                                    <p className="text-xs text-blue-700">Użyj szablonu HTML i załącz PDF</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useOfferTemplate}
                                    onChange={(e) => setUseOfferTemplate(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    )}

                    {/* AI Presets UI - Hide if using template */}
                    {(showAiPresets && !useOfferTemplate) && (
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-fade-in">
                            <div className="flex gap-4 mb-3 border-b border-purple-200 pb-2">
                                <button
                                    onClick={() => { setAiMode('rewrite'); setAiPrompt(''); }}
                                    className={`text-sm font-bold pb-1 ${aiMode === 'rewrite' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'}`}
                                >
                                    ✍️ Popraw treść
                                </button>
                                <button
                                    onClick={() => { setAiMode('generate'); setAiPrompt(''); }}
                                    className={`text-sm font-bold pb-1 ${aiMode === 'generate' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'}`}
                                >
                                    ✨ Generuj od zera
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {(aiMode === 'rewrite' ? AI_REWRITE_PRESETS : AI_GENERATE_PRESETS).map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setAiPrompt(preset.value)}
                                        className={`text-left p-2 rounded-lg border text-xs transition-all ${aiPrompt === preset.value
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="font-bold">{preset.label}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder={aiMode === 'rewrite' ? "Instrukcja (np. 'bardziej oficjalnie')" : "O czym ma być mail?"}
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:border-purple-400"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiAction()}
                                />
                                <button
                                    onClick={handleAiAction}
                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                                >
                                    Wykonaj
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-h-[200px] relative">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Treść:</label>
                        {useOfferTemplate ? (
                            <div className="absolute inset-0 top-7 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-500 z-10">
                                <svg className="w-12 h-12 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="font-medium">Zostanie użyty szablon HTML oferty</p>
                                <p className="text-sm">PDF zostanie dodany jako załącznik</p>
                            </div>
                        ) : null}
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={useOfferTemplate}
                            className="w-full h-full min-h-[200px] border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none resize-none font-sans"
                            placeholder="Wpisz treść wiadomości..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="useSignature"
                            checked={useSignature}
                            onChange={(e) => setUseSignature(e.target.checked)}
                            className="rounded text-accent focus:ring-accent"
                        />
                        <label htmlFor="useSignature" className="text-sm text-slate-600">
                            Dołącz podpis
                        </label>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={loading}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        {loading ? 'Wysyłanie...' : 'Wyślij Wiadomość'}
                        {!loading && (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
