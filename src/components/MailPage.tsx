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
        setSelectedEmail(null); // Clear previous selection while loading
        setShowLeadForm(false); // Reset lead form
        try {
            const response = await fetch('/api/fetch-email-body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: currentUser?.emailConfig,
                    uid: uid,
                    box: boxName
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.details || err.error || 'Failed to fetch email body');
            }

            const data = await response.json();
            setSelectedEmail(data);
        } catch (error: any) {
            console.error('Error loading email details:', error);
            toast.error(`Błąd: ${error.message}`);
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
            // 1. Process Message Body (Convert newlines to BR if it looks like plain text)
            let processedBody = composeData.body;
            if (!processedBody.includes('<') || !processedBody.includes('>')) {
                processedBody = processedBody.replace(/\n/g, '<br>');
            }

            // 2. Process Signature
            let processedSignature = '';
            if (useSignature && currentUser?.emailConfig?.signature) {
                const rawSig = currentUser.emailConfig.signature;
                // Check if signature contains HTML tags
                if (rawSig.includes('<') && rawSig.includes('>')) {
                    // Treat as HTML - don't escape newlines, just append
                    processedSignature = `<br><br>--<br>${rawSig}`;
                } else {
                    // Treat as Plain Text - convert newlines
                    processedSignature = `<br><br>--<br>${rawSig.replace(/\n/g, '<br>')}`;
                }
            }

            const finalBody = processedBody + processedSignature;

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

    // AI Extraction Handler
    const handleAiExtract = async () => {
        if (!selectedEmail) return;

        const toastId = toast.loading('AI analizuje wiadomość...');

        try {
            // Combine subject and body for analysis
            const fullText = `Temat: ${selectedEmail.subject}\nOd: ${selectedEmail.from}\n\n${selectedEmail.text || ''}`;

            const res = await fetch('/api/extract-lead-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: fullText,
                    apiKey: currentUser?.emailConfig?.openaiKey
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'AI Error');
            }

            const data = await res.json();
            const extracted = data.leadData;

            if (extracted) {
                setLeadInitialData({
                    customerData: {
                        firstName: extracted.firstName || '',
                        lastName: extracted.lastName || '',
                        companyName: extracted.companyName || '',
                        phone: extracted.phone || '',
                        email: extracted.email || '', // extract email from body if found
                        address: extracted.address || '',
                        postalCode: extracted.postalCode || '',
                        city: extracted.city || '',
                    },
                    source: 'email',
                    emailMessageId: selectedEmail.id,
                    notes: extracted.notes || `Utworzono z wiadomości e-mail: "${selectedEmail.subject}"`
                });
                setShowLeadForm(true);
                toast.success('Dane wyodrębnione!', { id: toastId });
            }
        } catch (e: any) {
            console.error(e);
            toast.error(`Błąd AI: ${e.message}`, { id: toastId });
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4">
            {/* 1. Sidebar (Navigation) - Fixed width */}
            <div className="w-full md:w-48 flex flex-col gap-2 flex-shrink-0">
                <button
                    onClick={() => { setActiveTab('compose'); setSelectedEmail(null); }}
                    className={`p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm text-sm ${activeTab === 'compose'
                        ? 'bg-accent text-white shadow-accent/30'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowa
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-2 overflow-hidden">
                    <button
                        onClick={() => { setActiveTab('inbox'); }}
                        className={`w-full p-3 flex items-center justify-between text-left transition-colors text-sm ${activeTab === 'inbox' ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <span>Odebrane</span>
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('sent'); }}
                        className={`w-full p-3 flex items-center justify-between text-left transition-colors text-sm ${activeTab === 'sent' ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            {/* 2. List & Detail Container */}
            <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-140px)]">

                {/* Email List Column (Visible unless in Compose mode) */}
                {activeTab !== 'compose' && (
                    <div className={`flex-col border-r border-slate-200 overflow-y-auto transition-all duration-300 ${selectedEmail ? 'w-80 hidden lg:flex' : 'w-full'}`}>
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
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">
                                <svg className="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-sm">Odświeżanie...</p>
                            </div>
                        ) : !isConfigured ? (
                            <div className="p-8 text-center text-slate-400">
                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-sm font-medium text-slate-600">Poczta nieskonfigurowana</p>
                                <p className="text-xs text-slate-500 mt-1 mb-3">Uzupełnij dane SMTP/IMAP w ustawieniach.</p>
                                <Link to="/settings" className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-dark transition-colors">
                                    Przejdź do Ustawień
                                </Link>
                            </div>
                        ) : emails.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <p className="text-sm">Brak wiadomości</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {emails.map(email => (
                                    <div
                                        key={email.id}
                                        onClick={() => handleSelectEmail(email.id)}
                                        className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedEmail?.id === email.messageId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                            } ${!email.flags?.includes('\\Seen') ? 'font-semibold bg-white' : 'text-slate-600 bg-slate-50/50'}`}
                                    >
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="truncate text-sm font-medium text-slate-900 max-w-[70%]">
                                                {email.from.replace(/<.*>/, '').trim()}
                                            </span>
                                            <span className="text-xs text-slate-400 flex-shrink-0">
                                                {new Date(email.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <h3 className="text-sm text-slate-800 truncate mb-1">{email.subject}</h3>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Reading Pane (Middle) */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {activeTab === 'compose' ? (
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            <form onSubmit={handleSend} className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                {/* Compose UI Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Nowa Wiadomość</h2>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAiPresets(!showAiPresets)}
                                            className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm font-medium"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            AI Asystent
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Wyślij
                                        </button>
                                    </div>
                                </div>
                                {/* Compose Form Inputs */}
                                <div className="space-y-4">
                                    <div>
                                        <input
                                            type="email"
                                            placeholder="Do:"
                                            value={composeData.to}
                                            onChange={e => setComposeData({ ...composeData, to: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Temat:"
                                            value={composeData.subject}
                                            onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all font-medium"
                                        />
                                    </div>
                                    {/* AI Presets */}
                                    {showAiPresets && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-purple-50 rounded-xl animate-fade-in border border-purple-100">
                                            {AI_PRESETS.map((preset, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setAiPrompt(preset.value)}
                                                    className={`text-left p-3 rounded-lg border text-sm transition-all ${aiPrompt === preset.value
                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-[1.02]'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className="font-medium mb-1">{preset.label}</div>
                                                    <div className={`text-xs ${aiPrompt === preset.value ? 'text-purple-100' : 'text-slate-500'}`}>
                                                        {preset.value}
                                                    </div>
                                                </button>
                                            ))}
                                            <div className="col-span-2 md:col-span-3 mt-2 flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Własna instrukcja dla AI..."
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleRewrite();
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:border-purple-400 text-sm"
                                                />
                                                <button
                                                    onClick={handleRewrite}
                                                    type="button"
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors shadow-sm"
                                                >
                                                    ✨ Przeredaguj
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <textarea
                                            placeholder="Treść wiadomości..."
                                            value={composeData.body}
                                            onChange={e => setComposeData({ ...composeData, body: e.target.value })}
                                            className="w-full h-[400px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-none font-sans text-slate-700 leading-relaxed"
                                        />
                                        {/* Schedule & Attachments Toolbar */}
                                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                <label className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors" title="Dodaj załącznik">
                                                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                </label>
                                                <button onClick={insertLink} type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="Dodaj link">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={useSignature}
                                                        onChange={e => setUseSignature(e.target.checked)}
                                                        className="rounded text-accent focus:ring-accent"
                                                    />
                                                    Podpis
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={scheduleDate}
                                                    onChange={e => setScheduleDate(e.target.value)}
                                                    className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Attachments List */}
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map((att, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                                                    <span className="truncate max-w-[150px]">{att.file.name}</span>
                                                    <span className="text-slate-400">({Math.round(att.file.size / 1024)}KB)</span>
                                                    <button onClick={() => removeAttachment(i)} type="button" className="text-slate-400 hover:text-red-500">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                            {/* Email Reading Pane */}
                            {selectedEmail ? (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-800 truncate flex-1 pr-4">
                                            {selectedEmail.subject}
                                        </h2>
                                        <div className="flex gap-2 flex-shrink-0">
                                            {!showLeadForm && (
                                                <>
                                                    <button
                                                        onClick={handleAiExtract}
                                                        className="px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                        title="Automatycznie wyciągnij dane z treści"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Utwórz Lead (AI)</span>
                                                    </button>
                                                    <button
                                                        onClick={handleCreateLead}
                                                        className="px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Utwórz Lead</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex overflow-hidden relative">
                                        {/* Email Body & Details */}
                                        <div className={`flex-1 overflow-y-auto p-6 bg-white transition-all duration-300 ${showLeadForm ? 'w-1/2 border-r border-slate-200 hidden lg:block' : 'w-full'}`}>

                                            {/* Header Info */}
                                            <div className="mb-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                                        {selectedEmail.from.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{selectedEmail.from}</p>
                                                        <p className="text-xs text-slate-500">{new Date(selectedEmail.date).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="prose max-w-none text-slate-700">
                                                {selectedEmail.html ? (
                                                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                                                ) : (
                                                    <pre className="whitespace-pre-wrap font-sans text-slate-700">{selectedEmail.text}</pre>
                                                )}
                                            </div>

                                            {/* Attachments */}
                                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                                <div className="mt-8 pt-6 border-t border-slate-100">
                                                    <h3 className="text-sm font-medium text-slate-900 mb-3">Załączniki</h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {selectedEmail.attachments.map((att, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => downloadAttachment(att)}
                                                                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                                                            >
                                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
                                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className="text-sm font-medium text-slate-700 truncate" title={att.filename}>{att.filename}</p>
                                                                    <p className="text-xs text-slate-500">{Math.round(att.size / 1024)} KB</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 4. Lead Form Pane (Right) */}
                                        {showLeadForm && (
                                            <div className="w-full lg:w-[450px] bg-slate-50 flex flex-col h-full border-l border-slate-200 shadow-xl z-20 absolute right-0 top-0 bottom-0 lg:static">
                                                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                                                    <h3 className="font-bold text-slate-800">Nowy Lead</h3>
                                                    <button
                                                        onClick={() => setShowLeadForm(false)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4">
                                                    <LeadForm
                                                        initialData={leadInitialData}
                                                        embedded={true}
                                                        onSuccess={() => {
                                                            setShowLeadForm(false);
                                                            toast.success('Lead utworzony pomyślnie!');
                                                        }}
                                                        onCancel={() => setShowLeadForm(false)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-lg font-medium text-slate-600 mb-2">Wybierz wiadomość z listy</p>
                                    <p className="text-sm">lub</p>
                                    <button
                                        onClick={() => {
                                            setLeadInitialData({});
                                            setShowLeadForm(true);
                                        }}
                                        className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
                                    >
                                        Dodaj Leada Ręcznie
                                    </button>
                                    {showLeadForm && (
                                        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setShowLeadForm(false)}></div>
                                    )}
                                    {showLeadForm && (
                                        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
                                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                                <h3 className="font-bold text-slate-800">Nowy Lead</h3>
                                                <button onClick={() => setShowLeadForm(false)} className="p-2 text-slate-400 hover:text-slate-600">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4">
                                                <LeadForm
                                                    initialData={{}}
                                                    embedded={true}
                                                    onSuccess={() => setShowLeadForm(false)}
                                                    onCancel={() => setShowLeadForm(false)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
