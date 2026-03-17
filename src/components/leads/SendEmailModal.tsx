
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import type { Offer } from '../../types';
import { getOfferEmailHtml } from '../../utils/emailTemplates';
import { generateOfferPDFData } from '../../utils/pdfGenerator';
import { OfferService } from '../../services/database/offer.service';
import { SALES_TEMPLATES, type EmailTemplate } from '../../data/emailTemplates';
import { supabase } from '../../lib/supabase';
import { TelephonyService } from '../../services/database/telephony.service';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    to: string; // Pre-filled recipient
    subject?: string; // Optional pre-filled subject
    leadData?: { firstName?: string; lastName?: string; notes?: string; companyName?: string; }; // Data for generation
    leadId?: string; // New: For logging
    customerId?: string; // New: For logging
    offer?: Offer;
    availableOffers?: Offer[];
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({ isOpen, onClose, to, subject = '', leadData, leadId, customerId, offer, availableOffers }) => {
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
    const [selectedMailboxIdx, setSelectedMailboxIdx] = useState(0); // Index into currentUser.mailboxes

    // New: Template State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Effect to Update Local Offer State
    useEffect(() => {
        setSelectedOffer(offer);
    }, [offer]);

    // Effect to auto-enable template if offer is present (either prop or selected)
    useEffect(() => {
        if (isOpen && subject === '' && selectedOffer) {
            // Pre-fill subject if offer is present (will be updated with offerIndex on send)
            setEmailSubject(`Ihr Angebot #${selectedOffer.offerNumber || selectedOffer.id.substring(0, 8)} — PolenDach24`);
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

    const applyTemplate = (templateId: string) => {
        const template = SALES_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        let filledBody = template.body;
        let filledSubject = template.subject;

        // Placeholders Replacement
        const replacements: Record<string, string> = {
            '{{firstName}}': leadData?.firstName || '',
            '{{lastName}}': leadData?.lastName || 'Kliencie',
            '{{companyName}}': leadData?.companyName || '',
            '{{signature}}': currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}\nPolenDach24` : 'PolenDach24 Team'
        };

        Object.entries(replacements).forEach(([key, value]) => {
            filledBody = filledBody.replaceAll(key, value);
            filledSubject = filledSubject.replaceAll(key, value);
        });

        // Don't auto-add signature if placeholder was already replaced
        if (filledBody.includes(replacements['{{signature}}'])) {
            // If signature placeholder was present, disable auto-signature to avoid double sig
            setUseSignature(false);
        }

        setBody(filledBody);
        setEmailSubject(filledSubject);
        setSelectedTemplateId(templateId);
        toast.success(`Zastosowano szablon: ${template.name}`);
    };

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
            const mailboxes = currentUser?.mailboxes || [];
            const activeMailbox = mailboxes[selectedMailboxIdx];
            const sendConfig = activeMailbox || currentUser?.emailConfig;

            if (!sendConfig?.smtpHost) {
                toast.error('Brak skonfigurowanej skrzynki pocztowej');
                return;
            }

            let finalBody = body;
            let finalSubject = emailSubject;
            let attachments: any[] = [];

            if (useOfferTemplate && selectedOffer) {
                // 1. Generate PDF
                toast.loading('Generowanie PDF oferty...', { id: 'pdf-gen' });
                try {
                    const pdfBase64 = await generateOfferPDFData(selectedOffer);

                    // 2. Attach PDF
                    attachments.push({
                        filename: `Angebot_${selectedOffer.offerNumber || selectedOffer.id.substring(0, 8)}.pdf`,
                        content: pdfBase64,
                        contentType: 'application/pdf'
                    });
                } catch (err: any) {
                    console.error('PDF Gen Error', err);
                    toast.dismiss('pdf-gen');
                    const msg = err instanceof Error ? err.message : (err?.message || JSON.stringify(err));
                    toast.error(`Błąd generowania PDF: ${msg}`);
                    setLoading(false);
                    return;
                }

                // 3. Generate HTML Body
                try {
                    // Generate Public Token for the link
                    const token = await OfferService.ensurePublicToken(selectedOffer.id);
                    const link = `${window.location.origin}/p/offer/${token}`;

                    const customerFullName = [leadData?.firstName, leadData?.lastName].filter(Boolean).join(' ') || undefined;
                    const repInfo = {
                        name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : '',
                        phone: currentUser?.phone || '',
                        email: currentUser?.email || '',
                        clientPhone: (currentUser as any)?.clientPhone || '',
                        clientEmail: (currentUser as any)?.clientEmail || ''
                    };

                    // Count how many offers have already been sent for this lead
                    let offerIndex = 1;
                    if (leadId) {
                        try {
                            const { count } = await supabase
                                .from('offers')
                                .select('id', { count: 'exact', head: true })
                                .eq('lead_id', leadId);
                            offerIndex = (count || 1);
                        } catch (err) {
                            console.warn('Could not count lead offers:', err);
                        }
                    }

                    // Adapt email subject based on offer index
                    const offerNum = selectedOffer.offerNumber || selectedOffer.id.substring(0, 8);
                    if (offerIndex > 1) {
                        finalSubject = `Ihr aktualisiertes Angebot #${offerNum} — PolenDach24`;
                        setEmailSubject(finalSubject);
                    }

                    finalBody = getOfferEmailHtml([{ number: offerNum, url: link }], customerFullName, repInfo, offerIndex);
                    toast.dismiss('pdf-gen');
                } catch (err: any) {
                    console.error('Token Gen Error', err);
                    toast.dismiss('pdf-gen');
                    const msg = err instanceof Error ? err.message : (err?.message || JSON.stringify(err));
                    toast.error(`Błąd generowania linku: ${msg}`);
                    setLoading(false);
                    return;
                }
            } else {
                // Standard Body with Signature
                finalBody = body.replace(/\n/g, '<br>');
                if (useSignature && sendConfig.signature) {
                    const rawSig = sendConfig.signature;
                    const sigHtml = (rawSig.includes('<') && rawSig.includes('>'))
                        ? rawSig
                        : rawSig.replace(/\n/g, '<br>');
                    finalBody += `<br><br>--<br>${sigHtml}`;
                }
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    to,
                    subject: finalSubject,
                    body: finalBody,
                    config: sendConfig,
                    leadId,     // Pass for logging
                    customerId, // Pass for logging
                    attachments // Pass attachments
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // New: Auto-Update Lead Status if Offer was sent
            if (useOfferTemplate && leadId) {
                try {
                    await supabase.from('leads').update({ status: 'offer_sent' }).eq('id', leadId);
                    toast.success('Status leada zmieniony na "Oferta Wysłana"');
                } catch (err) {
                    console.error('Failed to update lead status', err);
                }

                // Auto-SMS to client after offer email
                // Get the lead's phone from DB
                try {
                    const { data: leadRecord } = await supabase
                        .from('leads')
                        .select('customer_data')
                        .eq('id', leadId)
                        .single();

                    const customerPhone = leadRecord?.customer_data?.phone;
                    if (customerPhone) {
                        const repName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'PolenDach24';
                        const repClientPhone = (currentUser as any)?.clientPhone || currentUser?.phone || '';
                        const customerFirstName = leadData?.firstName || leadRecord?.customer_data?.firstName || '';

                        // Count offers for context-aware SMS
                        let smsOfferIndex = 1;
                        try {
                            const { count } = await supabase
                                .from('offers')
                                .select('id', { count: 'exact', head: true })
                                .eq('lead_id', leadId);
                            smsOfferIndex = (count || 1);
                        } catch { /* ignore */ }

                        let smsBody = '';
                        if (smsOfferIndex <= 1) {
                            // First offer
                            smsBody = `Hallo${customerFirstName ? ' ' + customerFirstName : ''} 👋, hier ist ${repName} von PolenDach24. Ich habe Ihnen gerade ein Angebot per E-Mail geschickt 📩 Schauen Sie gerne rein! Bei Fragen bin ich jederzeit für Sie da. Herzliche Grüße, ${repName}${repClientPhone ? ' 📞 ' + repClientPhone : ''}`;
                        } else if (smsOfferIndex === 2) {
                            // Second offer — updated
                            smsBody = `Hallo${customerFirstName ? ' ' + customerFirstName : ''} 😊, hier ist ${repName} von PolenDach24. Ich habe Ihr Angebot wie besprochen angepasst und Ihnen die aktualisierte Version per E-Mail geschickt 📩 Schauen Sie gerne rein! Ich freue mich auf Ihre Rückmeldung. Herzliche Grüße, ${repName}${repClientPhone ? ' 📞 ' + repClientPhone : ''}`;
                        } else {
                            // Third+ offer — follow-up
                            smsBody = `Hallo${customerFirstName ? ' ' + customerFirstName : ''} 👋, ${repName} hier von PolenDach24. Ihre neue Angebotsversion ist soeben per E-Mail raus 📩 Ich hoffe, diese Variante trifft es genau! Melden Sie sich gerne jederzeit. Beste Grüße, ${repName}${repClientPhone ? ' 📞 ' + repClientPhone : ''}`;
                        }

                        // Get first active phone number for sending
                        const { data: phoneNumbers } = await supabase
                            .from('phone_numbers')
                            .select('id')
                            .eq('is_active', true)
                            .limit(1);

                        const fromNumberId = phoneNumbers?.[0]?.id;
                        if (fromNumberId) {
                            await TelephonyService.sendSMS(customerPhone, smsBody, fromNumberId);
                            toast.success('📱 SMS wysłany do klienta');
                        } else {
                            console.warn('No active phone number for SMS');
                        }
                    }
                } catch (smsErr) {
                    console.error('Auto-SMS failed:', smsErr);
                    // Don't block the flow if SMS fails
                }
            }

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
                        {/* TEMPLATES DROPDOWN */}
                        <div className="relative group">
                            <button className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-2 text-sm font-medium">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                Szablony
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 hidden group-hover:block z-10">
                                <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-1">Szybkie Strzały</div>
                                {SALES_TEMPLATES.map(tmpl => (
                                    <button
                                        key={tmpl.id}
                                        onClick={() => applyTemplate(tmpl.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-slate-700 rounded-lg transition-colors flex flex-col"
                                    >
                                        <span className="font-medium text-amber-900">{tmpl.name}</span>
                                        <span className="text-xs text-slate-500 truncate">{tmpl.subject}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

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
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{to}</span>
                        </div>
                    </div>

                    {/* Sender / Mailbox Selection */}
                    {currentUser?.mailboxes && currentUser.mailboxes.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nadawca:</label>
                            <div className="flex flex-wrap gap-2">
                                {currentUser.mailboxes.map((mb: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedMailboxIdx(idx)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${selectedMailboxIdx === idx
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mb.color || '#3b82f6' }} />
                                            <span className="font-bold">{mb.name}</span>
                                        </div>
                                        <div className={`text-xs mt-0.5 font-mono ${selectedMailboxIdx === idx ? 'text-blue-200' : 'text-slate-400'}`}>
                                            {mb.smtpUser}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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
