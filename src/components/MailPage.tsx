import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { LeadForm } from './leads/LeadForm';
import type { Lead } from '../types';

// Mock Email Data
// Mock Email Data Removed for Production


type MailTab = 'inbox' | 'sent' | 'compose';

// Email Details Interface
interface EmailDetails {
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    text: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        contentType: string;
        size: number;
        contentId?: string;
        content: string; // Base64
    }>;
}

interface AttachmentFile {
    file: File;
    base64: string;
}

export const MailPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<MailTab>('inbox');
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

    // Lead Integration
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadInitialData, setLeadInitialData] = useState<Partial<Lead>>({});

    // Compose Options
    const [useSignature, setUseSignature] = useState(true);
    const [scheduleDate, setScheduleDate] = useState('');
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [aiPrompt, setAiPrompt] = useState(''); // New AI Prompt State
    const [showAiPresets, setShowAiPresets] = useState(false);

    const AI_PRESETS = [
        { label: 'Popraw błędy', value: 'Popraw błędy interpunkcyjne, ortograficzne i stylistyczne.' },
        { label: 'Bardziej oficjalnie', value: 'Zmień ton na bardziej oficjalny i profesjonalny.' },
        { label: 'Bardziej luźno', value: 'Zmień ton na bardziej przyjacielski i bezpośredni.' },
        { label: 'Skróć wiadomość', value: 'Skróć wiadomość zachowując najważniejsze informacje. Bądź konkretny.' },
        { label: 'Rozwiń myśl', value: 'Rozwiń treść wiadomości, dodając uprzejme zwroty i więcej szczegółów.' },
        { label: 'Tłumacz na Angielski', value: 'Przetłumacz wiadomość na język angielski (Business English).' },
        { label: 'Tłumacz na Niemiecki', value: 'Przetłumacz wiadomość na język niemiecki (Profesjonalny).' },
    ];

    // Helper for AI Rewrite
    const handleRewrite = async () => {
        if (!composeData.body) return toast.error('Wpisz najpierw treść wiadomości');

        const toastId = toast.loading('AI pracuje nad Twoją wiadomością...');

        try {
            const res = await fetch('/api/ai-rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: composeData.body,
                    prompt: aiPrompt,
                    apiKey: currentUser?.emailConfig?.openaiKey
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'AI Error');
            }

            const data = await res.json();
            if (data.rewritten) {
                setComposeData(prev => ({ ...prev, body: data.rewritten }));
                toast.success('Wiadomość przeredagowana!', { id: toastId });
            }
        } catch (e: any) {
            console.error(e);
            toast.error(`Błąd AI: ${e.message}`, { id: toastId });
        }
    };

    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // to force refresh

    const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Check if email is configured
    const isConfigured = !!currentUser?.emailConfig?.smtpHost;
    const boxName = activeTab === 'sent' ? 'Sent' : 'INBOX';
    const CACHE_KEY = `cached_emails_${currentUser?.id}_${boxName}`;

    // Fetch Emails Effect
    React.useEffect(() => {
        const fetchEmails = async () => {
            if (!currentUser?.emailConfig?.imapHost || (activeTab !== 'inbox' && activeTab !== 'sent')) return;

            setLoading(true);
            try {
                const response = await fetch('/api/fetch-emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config: currentUser.emailConfig,
                        box: boxName
                    })
                });

                if (!response.ok) {
                    const errInfo = await response.json();
                    if (errInfo.details && errInfo.details.includes('authentication failed')) {
                        toast.error('Błąd logowania IMAP. Sprawdź hasło.');
                    }
                    throw new Error(errInfo.error || 'Fetch failed');
                }

                const data = await response.json();
                const newEmails = data.messages || [];
                setEmails(newEmails);
                localStorage.setItem(CACHE_KEY, JSON.stringify(newEmails));
            } catch (error) {
                console.error('Error fetching emails:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isConfigured && (activeTab === 'inbox' || activeTab === 'sent')) {
            // Load from cache first for instant render
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    setEmails(JSON.parse(cached));
                } catch (e) {
                    console.error('Cache parse error', e);
                }
            } else {
                // Clear emails if no cache mismatch to avoid showing inbox in sent
                setEmails([]);
            }
            fetchEmails();
        }
    }, [currentUser, activeTab, isConfigured, refreshTrigger, boxName]);

    const handleSelectEmail = async (uid: number) => {
        setLoadingDetails(true);
        setSelectedEmail(null); // Clear previous selection while loading
        setShowLeadForm(false); // Reset lead form
        try {
            const response = await fetch('/api/fetch-email-body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: currentUser?.emailConfig,
                    uid: uid
                })
            });

            if (!response.ok) throw new Error('Failed to fetch email body');

            const data = await response.json();
            setSelectedEmail(data);
        } catch (error) {
            console.error('Error loading email details:', error);
            toast.error('Nie udało się pobrać treści wiadomości');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleCreateLead = () => {
        if (!selectedEmail) return;

        // Parse "From" field. Expected formats: "Name <email>" or "email"
        let name = '';
        let email = '';

        const from = selectedEmail.from;
        if (from.includes('<')) {
            const parts = from.split('<');
            name = parts[0].trim().replace(/^"|"$/g, '');
            email = parts[1].replace('>', '').trim();
        } else {
            email = from.trim();
        }

        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        setLeadInitialData({
            customerData: {
                firstName: firstName || '',
                lastName: lastName || '',
                email: email,
                companyName: '',
                phone: '',
            },
            source: 'email',
            emailMessageId: selectedEmail.id,
            notes: `Utworzono z wiadomości e-mail: "${selectedEmail.subject}" z dnia ${new Date(selectedEmail.date).toLocaleDateString()}`
        });
        setShowLeadForm(true);
    };

    const handleBackToList = () => {
        setSelectedEmail(null);
        setShowLeadForm(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newAttachments: AttachmentFile[] = [];

            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit check
                    toast.error(`Plik ${file.name} jest za duży (max 5MB)`);
                    continue;
                }
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                });
                reader.readAsDataURL(file);
                const base64 = await base64Promise;
                newAttachments.push({ file, base64 });
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const insertLink = () => {
        const url = prompt('Podaj adres URL:');
        if (!url) return;
        const text = prompt('Podaj tekst linku (opcjonalnie):') || url;
        const linkHtml = `<a href="${url}" target="_blank" class="text-blue-600 underline">${text}</a>`;
        setComposeData(prev => ({ ...prev, body: prev.body + (prev.body ? '\n' : '') + linkHtml }));
    };

    const downloadAttachment = (att: { filename: string, content: string, contentType: string }) => {
        const byteCharacters = atob(att.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: att.contentType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = att.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!composeData.to || !composeData.subject || !composeData.body) {
            toast.error('Wypełnij wszystkie pola');
            return;
        }

        if (!isConfigured) {
            toast.error('Skonfiguruj SMTP aby wysyłać wiadomości.');
            return;
        }

        const toastId = toast.loading(scheduleDate ? 'Planowanie wysyłki...' : 'Wysyłanie wiadomości...');

        try {
            // Append signature if enabled
            let finalBody = composeData.body;
            if (useSignature && currentUser?.emailConfig?.signature) {
                // Convert newlines in signature to BR for HTML email
                const sigHtml = `<br><br>--<br>${currentUser.emailConfig.signature.replace(/\n/g, '<br>')}`;
                finalBody += sigHtml;
            }
            // Simple newline to BR conversion for the main body if it looks like plain text
            if (!finalBody.includes('<') && !finalBody.includes('>')) {
                finalBody = finalBody.replace(/\n/g, '<br>');
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: composeData.to,
                    subject: composeData.subject,
                    body: finalBody,
                    config: currentUser?.emailConfig,
                    scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : null,
                    userId: currentUser?.id,
                    attachments: attachments.map(a => ({
                        filename: a.file.name,
                        contentType: a.file.type,
                        content: a.base64
                    }))
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || 'Send failed');
            }

            toast.success(scheduleDate ? 'Wiadomość zaplanowana' : `Wysłano do: ${composeData.to}`, { id: toastId });

            // Reset form
            setComposeData({ to: '', subject: '', body: '' });
            setAttachments([]);
            setScheduleDate('');
            if (!scheduleDate) setActiveTab('sent');

        } catch (error: any) {
            console.error('Send error:', error);
            toast.error(`Błąd: ${error.message}`, { id: toastId });
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex flex-col gap-2">
                <button
                    onClick={() => { setActiveTab('compose'); setSelectedEmail(null); }}
                    className={`p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm ${activeTab === 'compose'
                        ? 'bg-accent text-white shadow-accent/30'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowa Wiadomość
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-4 overflow-hidden">
                    <button
                        onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }}
                        className={`w-full p-4 flex items-center justify-between text-left transition-colors ${activeTab === 'inbox' ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <span>Odebrane</span>
                        </div>
                        {/* Optional: Add unread count if we fetch it */}
                    </button>
                    <button
                        onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }}
                        className={`w-full p-4 flex items-center justify-between text-left transition-colors ${activeTab === 'sent' ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            <span>Wysłane</span>
                        </div>
                    </button>
                </div>

                {!isConfigured && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
                        <p className="font-bold mb-1">Konfiguracja Wymagana</p>
                        <p className="mb-2">Aby w pełni korzystać z poczty, skonfiguruj ustawienia SMTP/IMAP w swoim profilu.</p>
                        <Link to="/settings" className="text-orange-900 underline font-bold text-xs">
                            Przejdź do ustawień →
                        </Link>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                {/* Inbox and Sent View (Shared List) */}
                {(activeTab === 'inbox' || activeTab === 'sent') && (
                    <div className="flex-1 flex flex-col h-full">
                        {selectedEmail || loadingDetails ? (
                            // Detail View
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                                    <button
                                        onClick={handleBackToList}
                                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                                        title="Wróć do listy"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </button>
                                    <h2 className="text-lg font-bold text-slate-800 truncate flex-1">
                                        {loadingDetails ? 'Ładowanie...' : selectedEmail?.subject}
                                    </h2>
                                    {!loadingDetails && selectedEmail && (
                                        <button
                                            onClick={handleCreateLead}
                                            className="px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                            title="Utwórz Lead z tej wiadomości"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                            <span className="hidden sm:inline">Utwórz Lead</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Email Content Column */}
                                    <div className={`flex-1 overflow-y-auto p-6 bg-white ${showLeadForm ? 'w-1/2 border-r border-slate-200' : 'w-full'}`}>
                                        {loadingDetails ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                                <svg className="w-10 h-10 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <p>Pobieranie treści wiadomości...</p>
                                            </div>
                                        ) : selectedEmail && (
                                            <div className="max-w-4xl mx-auto">
                                                <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                                                    <div>
                                                        <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedEmail.subject}</h1>
                                                        <p className="text-slate-600"><strong>Od:</strong> {selectedEmail.from}</p>
                                                        <p className="text-slate-600"><strong>Do:</strong> {selectedEmail.to || 'Ja'}</p>
                                                    </div>
                                                    <div className="text-right text-sm text-slate-400">
                                                        {new Date(selectedEmail.date).toLocaleString('pl-PL')}
                                                    </div>
                                                </div>

                                                {/* Attachments Section */}
                                                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            Załączniki ({selectedEmail.attachments.length})
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedEmail.attachments.map((att, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => downloadAttachment(att)}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md hover:border-accent hover:text-accent transition-colors shadow-sm text-sm"
                                                                >
                                                                    <span className="truncate max-w-[200px]">{att.filename || 'Bez nazwy'}</span>
                                                                    <span className="text-xs text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                                                                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="email-content prose prose-slate max-w-none">
                                                    {/* AI Reply Actions */}
                                                    <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                        <h3 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                            Szybka odpowiedź AI
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { label: '👍 Potwierdź', intent: 'Potwierdź termin / zgodę / odbiór. Bądź konkretny.' },
                                                                { label: '👎 Odmów', intent: 'Odmów grzecznie, podając ogólny powód (brak czasu/możliwości).' },
                                                                { label: '❓ Dopytaj', intent: 'Podziękuj i dopytaj o szczegóły, których brakuje.' },
                                                                { label: '🤝 Oferta', intent: 'Podziękuj za zapytanie i napisz, że przygotujemy ofertę wkrótce.' },
                                                                { label: 'Kontakt telefoniczny', intent: 'Poproś o rozmowę telefoniczną w celu ustalenia szczegółów.' },
                                                            ].map((action) => (
                                                                <button
                                                                    key={action.label}
                                                                    onClick={async () => {
                                                                        const toastId = toast.loading('Generowanie odpowiedzi...');
                                                                        try {
                                                                            const res = await fetch('/api/ai-reply', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    originalText: selectedEmail.text || 'Brak treści', // Fallback
                                                                                    intent: action.intent,
                                                                                    apiKey: currentUser?.emailConfig?.openaiKey
                                                                                })
                                                                            });

                                                                            if (!res.ok) throw new Error('Błąd generowania');

                                                                            const data = await res.json();

                                                                            // Switch to Compose
                                                                            setComposeData({
                                                                                to: selectedEmail.from,
                                                                                subject: `Re: ${selectedEmail.subject}`,
                                                                                body: data.reply
                                                                            });
                                                                            setActiveTab('compose');
                                                                            toast.success('Wygenerowano odpowiedź!', { id: toastId });
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            toast.error('Nie udało się wygenerować odpowiedzi', { id: toastId });
                                                                        }
                                                                    }}
                                                                    className="px-3 py-2 bg-white text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                                                >
                                                                    {action.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {selectedEmail.html ? (
                                                        <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                                                    ) : (
                                                        <pre className="whitespace-pre-wrap font-sans text-slate-700">{selectedEmail.text}</pre>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {showLeadForm && (
                                        <div className="w-[400px] bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto flex-shrink-0">
                                            <LeadForm
                                                initialData={leadInitialData}
                                                embedded={true}
                                                onSuccess={() => {
                                                    setShowLeadForm(false);
                                                }}
                                                onCancel={() => setShowLeadForm(false)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {activeTab === 'inbox' ? 'Skrzynka Odbiorcza' : 'Wysłane'}
                                    </h2>
                                    <button onClick={() => setRefreshTrigger(prev => prev + 1)} className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Odśwież">
                                        <svg className={`w-5 h-5 ${loading ? 'animate-spin text-accent' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {emails.length > 0 ? (
                                        <div className="divide-y divide-slate-100">
                                            {emails.map((mail, idx) => {
                                                // Display logic based on box
                                                const displayPerson = activeTab === 'inbox' ? mail.from : mail.to;
                                                const displayLabel = activeTab === 'inbox' ? '' : 'Do: ';

                                                return (
                                                    <div
                                                        key={mail.id || idx}
                                                        onClick={() => handleSelectEmail(mail.id)}
                                                        className="p-4 hover:bg-slate-50 cursor-pointer flex gap-4 transition-colors"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold overflow-hidden">
                                                            {displayPerson ? (typeof displayPerson === 'string' ? displayPerson.replace(/<.*>/, '').trim()[0]?.toUpperCase() : '?') : '?'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-medium truncate text-slate-900">
                                                                    {displayLabel}{typeof displayPerson === 'string' ? displayPerson.replace(/<.*>/, '') : 'Unknown'}
                                                                </span>
                                                                <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                                    {new Date(mail.date).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm truncate text-slate-800 font-medium">{mail.subject}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Footer Info */}
                                            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                                                Pokazuję ostatnie 50 wiadomości.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-slate-400">
                                            {loading ? 'Ładowanie wiadomości...' : isConfigured ? 'Brak wiadomości' : 'Skonfiguruj IMAP aby pobrać pocztę'}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}


                {/* Compose View */}
                {activeTab === 'compose' && (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Nowa Wiadomość</h2>
                        </div>
                        <form onSubmit={handleSend} className="flex-1 flex flex-col p-6 gap-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Do:"
                                    className="w-full text-sm font-medium p-2 border-b border-slate-200 focus:border-accent outline-none transition-colors"
                                    value={composeData.to}
                                    onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Temat:"
                                    className="w-full text-lg font-bold p-2 border-b border-slate-200 focus:border-accent outline-none transition-colors"
                                    value={composeData.subject}
                                    onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                                />
                            </div>

                            {/* Toolbar - AI Button Removed */}
                            <div className="flex items-center gap-4 py-2 border-b border-slate-100">
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-100 px-2 py-1 rounded transition-colors relative">
                                    <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    Dołącz plik
                                </label>
                                <button type="button" onClick={insertLink} className="flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-100 px-2 py-1 rounded transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    Wstaw link
                                </button>

                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                                    <input type="checkbox" checked={useSignature} onChange={(e) => setUseSignature(e.target.checked)} className="rounded text-accent focus:ring-accent" />
                                    Podpis
                                </label>
                            </div>

                            {/* Attachments Preview */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map((att, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm">
                                            <span className="truncate max-w-[150px]">{att.file.name}</span>
                                            <button type="button" onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex-1">
                                <textarea
                                    className="w-full h-full p-4 resize-none outline-none text-slate-700 font-sans"
                                    placeholder="Treść wiadomości..."
                                    value={composeData.body}
                                    onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                                />
                            </div>

                            {useSignature && currentUser?.emailConfig?.signature && (
                                <div className="text-sm text-slate-500 border-t pt-4 mt-2 italic opacity-75">
                                    <pre className="font-sans whitespace-pre-wrap">{currentUser.emailConfig.signature}</pre>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row justify-between items-end pt-4 border-t border-slate-100 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 ml-1 mb-1">Wyślij później (opcjonalnie):</label>
                                    <input
                                        type="datetime-local"
                                        className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                    {/* AI Controls */}
                                    <div className="flex items-center bg-purple-50 rounded-xl p-1 border border-purple-100 hover:border-purple-300 transition-colors flex-1 md:flex-none relative">

                                        {/* Presets Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowAiPresets(!showAiPresets)}
                                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                            title="Gotowe polecenia"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                        </button>

                                        {/* Presets Dropdown */}
                                        {showAiPresets && (
                                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                                                <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sugerowane polecenia</div>
                                                {AI_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.label}
                                                        type="button"
                                                        onClick={() => {
                                                            setAiPrompt(preset.value);
                                                            setShowAiPresets(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center justify-between group"
                                                    >
                                                        <span>{preset.label}</span>
                                                        <span className="opacity-0 group-hover:opacity-100 text-purple-400">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <input
                                            type="text"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder="Instrukcja (np. oficjalny)..."
                                            className="bg-transparent border-none outline-none text-sm text-purple-900 placeholder-purple-400 px-3 w-full md:w-48"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleRewrite();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRewrite}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1 whitespace-nowrap"
                                            title="Wykonaj"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        className={`${scheduleDate ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-accent hover:bg-accent-dark shadow-accent/20'} text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap`}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        {scheduleDate ? 'Zaplanuj' : 'Wyślij'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )
                }
            </div >
        </div >
    );
};
