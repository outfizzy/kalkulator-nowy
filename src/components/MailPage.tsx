import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { LeadForm } from './leads/LeadForm';
import { RefreshCw } from 'lucide-react';

import type { Lead, Offer, EmailConfig } from '../types';

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
    const [selectedAccount, setSelectedAccount] = useState<'personal' | 'buero'>('personal');
    const [bueroConfig, setBueroConfig] = useState<EmailConfig | null>(null);

    // Load shared config
    React.useEffect(() => {
        const loadSharedConfig = async () => {
            try {
                const { SettingsService } = await import('../services/database/settings.service');
                const config = await SettingsService.getBueroEmailConfig();
                if (config) setBueroConfig(config);
            } catch (e) {
                console.error('Failed to load shared email config', e);
            }
        };
        loadSharedConfig();
    }, []);

    const [activeTab, setActiveTab] = useState<MailTab>('inbox');
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [convertedMessageIds, setConvertedMessageIds] = useState<Set<string>>(new Set());
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // New State for Scan Logic
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState<{ processed: number, remaining: number | null }>({ processed: 0, remaining: null });
    const [scanRange, setScanRange] = useState<number>(0); // 0 = New/Unseen Only

    // Selection state
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<number>>(new Set());


    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);

    // Fetch Converted Lead IDs
    React.useEffect(() => {
        const fetchConvertedIds = async () => {
            try {
                // Ensure session exists
                await import('../lib/supabase').then(m => m.supabase.auth.getSession());

                // We fetch specific columns using Rest API client for simplicity if available, or just use supabase-js
                const { data } = await import('../lib/supabase').then(m => m.supabase
                    .from('leads')
                    .select('email_message_id')
                    .not('email_message_id', 'is', null)
                );

                if (data) {
                    const ids = new Set(data.map(d => d.email_message_id).filter(Boolean) as string[]);
                    setConvertedMessageIds(ids);
                }
            } catch (e) {
                console.error('Failed to fetch converted IDs', e);
            }
        };
        fetchConvertedIds();
    }, [refreshTrigger]); // Refresh when trigger changes (e.g. after scan)

    // Lead Integration
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadInitialData, setLeadInitialData] = useState<Partial<Lead>>({});

    // Compose Options
    const [useSignature, setUseSignature] = useState(true);
    const [scheduleDate, setScheduleDate] = useState('');
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [aiPrompt, setAiPrompt] = useState(''); // New AI Prompt State
    const [showAiPresets, setShowAiPresets] = useState(false);
    const [showOfferSelector, setShowOfferSelector] = useState(false);
    const [recentOffers, setRecentOffers] = useState<Offer[]>([]);

    const toggleOfferSelector = async () => {
        if (!showOfferSelector) {
            try {
                // Fetch basic info of recent offers (lightweight if possible, or just all)
                // Since we don't have a specialized 'recent' method in Service yet that returns lightweight, 
                // we'll assume fetching all and slicing is okay or use getOffers with limit if available.
                // Assuming DatabaseService or just fetching directly via supabase in Service.
                // OfferService.getOffers() returns all. Let's try to grab from DB directly or add getRecent to Service.
                // Simplest approach: reuse existing getOffers but valid logic.
                // Actually, OfferService.getSystemStats uses supabase. 
                // Let's just fetch directly here for simplicity or use OfferService.
                const { OfferService } = await import('../services/database/offer.service');
                const offersData = await OfferService.getOffers();
                // Checking OfferService: it has `getOffers`.
                setRecentOffers((offersData || []).slice(0, 5));
            } catch (e) {
                console.error(e);
            }
        }
        setShowOfferSelector(!showOfferSelector);
    };

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleInsertOfferLink = async (offer: Offer) => {
        try {
            const { OfferService } = await import('../services/database/offer.service');
            const token = await OfferService.ensurePublicToken(offer.id);
            const link = `${window.location.origin}/p/offer/${token}`;

            // German Template requested by user
            const template = `Exklusiv für Sie vorbereitet:\n📄 Angebot ${offer.offerNumber}: ${link}\n\nBitte öffnen Sie die beigefügte PDF-Datei.\nDas detaillierte Angebot finden Sie im Anhang dieser E-Mail.\n`;

            if (textareaRef.current) {
                const start = textareaRef.current.selectionStart;
                const end = textareaRef.current.selectionEnd;
                const text = composeData.body;
                const newText = text.substring(0, start) + template + text.substring(end);

                setComposeData(prev => ({ ...prev, body: newText }));

                // Restore cursor position after insert (optional, but nice)
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + template.length;
                        textareaRef.current.focus();
                    }
                }, 0);
            } else {
                // Fallback if ref missing (shouldn't happen)
                setComposeData(prev => ({ ...prev, body: prev.body + (prev.body ? '\n\n' : '') + template }));
            }

            setShowOfferSelector(false);
        } catch (error) {
            console.error(error);
            toast.error('Błąd generowania linku');
        }
    };

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



    // Determine active config based on selection
    const activeConfig = selectedAccount === 'personal' ? currentUser?.emailConfig : bueroConfig;
    const isConfigured = !!activeConfig?.smtpHost;

    const boxName = activeTab === 'sent' ? 'Sent' : 'INBOX';
    const CACHE_KEY = `cached_emails_${selectedAccount}_${currentUser?.id}_${boxName}`;

    // Fetch Emails Effect
    React.useEffect(() => {
        const fetchEmails = async () => {
            // Skip if no active config or logic
            if (!activeConfig?.imapHost || (activeTab !== 'inbox' && activeTab !== 'sent')) return;

            setLoading(true);
            try {
                const response = await fetch('/api/fetch-emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config: activeConfig,
                        limit: 100, // Increased from default
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
    }, [activeConfig, activeTab, isConfigured, refreshTrigger, boxName, CACHE_KEY]);

    const handleSelectEmail = async (uid: number | string) => {
        const emailIdAsNumber = Number(uid);

        // Selection Mode Logic
        if (selectedEmailIds.size > 0) {
            const newSet = new Set(selectedEmailIds);
            if (newSet.has(emailIdAsNumber)) newSet.delete(emailIdAsNumber);
            else newSet.add(emailIdAsNumber);
            setSelectedEmailIds(newSet);
            return;
        }

        setSelectedEmail(null); // Clear previous selection while loading
        setShowLeadForm(false); // Reset lead form
        try {
            const response = await fetch('/api/fetch-email-body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: activeConfig,
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
                    config: activeConfig,
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



    const handleEmailAction = async (action: 'mark_read' | 'mark_unread' | 'delete') => {
        if (selectedEmailIds.size === 0) return;
        const ids = Array.from(selectedEmailIds);

        // Optimistic UI Update
        const updatedEmails = emails.map(e => {
            if (ids.includes(e.id)) {
                let newFlags = e.flags || [];
                if (action === 'mark_read') {
                    if (!newFlags.includes('\\Seen')) newFlags = [...newFlags, '\\Seen'];
                } else if (action === 'mark_unread') {
                    newFlags = newFlags.filter((f: string) => f !== '\\Seen');
                } else if (action === 'delete') {
                    return null; // Remove from list
                }
                return { ...e, flags: newFlags };
            }
            return e;
        }).filter(Boolean);

        setEmails(updatedEmails);
        setSelectedEmailIds(new Set());

        try {
            const { supabase } = await import('../lib/supabase');
            await supabase.functions.invoke('manage-emails', {
                body: {
                    uids: ids,
                    action,
                    box: activeTab === 'inbox' ? 'INBOX' : 'Sent',
                    config: activeConfig // Pass the active email configuration
                }
            });
            toast.success(`Zaktualizowano ${ids.length} wiadomości`);
        } catch (err) {
            console.error(err);
            toast.error('Błąd aktualizacji');
            setRefreshTrigger(p => p + 1); // Revert by refresh
        }
    };
    // Manual Analysis Handler
    const handleAnalyzeSelected = async () => {
        if (selectedEmailIds.size === 0) return;
        const ids = Array.from(selectedEmailIds);
        setIsScanning(true);
        const toastId = toast.loading(`Analizuję ${ids.length} wiadomości...`);

        try {
            const { supabase } = await import('../lib/supabase');
            const targetEmail = activeConfig?.imapUser || activeConfig?.smtpUser || currentUser?.email;

            const { data, error } = await supabase.functions.invoke('scan-emails', {
                body: {
                    targetIds: ids,
                    userEmail: targetEmail,
                    config: activeConfig // Use active config (personal or shared) directly
                }
            });

            if (error) throw new Error(error.message || 'Analysis failed');

            const results = data.results || [];
            const created = results.filter((r: any) => r.status.includes('created')).length;
            const errors = results.filter((r: any) => r.status.includes('error')).length;
            const skipped = results.filter((r: any) => r.status.includes('skipped')).length;

            if (created > 0) {
                toast.success(`Sukces: Utworzono ${created}, Pominięto: ${skipped}`, { id: toastId });
            } else if (errors > 0) {
                toast.error(`Błąd: ${results[0].message || 'Wystąpił błąd'}`, { id: toastId });
            } else {
                if (skipped > 0) {
                    toast(`Pominięto (np. duplikaty): ${skipped}`, { icon: 'ℹ️', id: toastId });
                } else {
                    toast('Brak wyników.', { icon: '🤷', id: toastId });
                }
            }
            setSelectedEmailIds(new Set()); // Clear selection

            // Refresh leads list? Maybe trigger a refetch if needed.
            // For now, user can check Leads tab.

        } catch (err: any) {
            console.error("Manual Analysis Error:", err);
            toast.error(`Błąd: ${err.message}`, { id: toastId });
        } finally {
            setIsScanning(false);
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
                    apiKey: activeConfig?.openaiKey
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
            }
        } catch (e: any) {
            console.error(e);
            toast.error(`Błąd AI: ${e.message}`, { id: toastId });
        }
    };

    // Manual Scan Trigger


    // Recursive Batch Scanning
    const runBatchScan = async (processedSoFar = 0): Promise<void> => {
        try {
            setIsScanning(true);
            setScanProgress({ processed: processedSoFar, remaining: null });

            const { supabase } = await import('../lib/supabase');
            // Identify target email to prevent scanning everyone's mailbox
            const targetEmail = activeConfig?.imapUser || activeConfig?.smtpUser || currentUser?.email;

            const { data, error } = await supabase.functions.invoke('scan-emails', {
                body: {
                    batchSize: 5,
                    days: scanRange, // Pass the selected range
                    offset: processedSoFar, // Pass offset for pagination
                    userEmail: targetEmail // Filter by user
                }
            });

            if (error) {
                console.error("Supabase Invoke Error:", error);
                throw new Error(error.message || 'Error invoking scan function');
            }

            const currentProcessed = data.processedCount || 0;
            const remaining = data.remaining || 0;
            const total = processedSoFar + currentProcessed;

            if (remaining > 0) {
                setScanProgress({ processed: total, remaining: remaining });
                await runBatchScan(total);
            } else {
                setScanProgress({ processed: 0, remaining: null });
                toast.success(`Zakończono skanowanie. Przeanalizowano łącznie ${total} wiadomości.`);
                setRefreshTrigger(prev => prev + 1);
            }

        } catch (error: any) {
            console.error('Scan error:', error);
            toast.error("Błąd skanowania: " + error.message);
            setScanProgress({ processed: 0, remaining: null });
        } finally {
            setIsScanning(false);
        }
    };

    const handleScanEmails = async () => {
        setIsScanning(true);
        try {
            await runBatchScan(0);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4">
            {/* 1. Sidebar (Navigation) - Fixed width */}
            <div className="w-full md:w-48 flex flex-col gap-2 flex-shrink-0">
                <div className="mb-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setSelectedAccount('personal')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${selectedAccount === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Osobista
                        </button>
                        <button
                            onClick={() => setSelectedAccount('buero')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${selectedAccount === 'buero' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Biuro
                        </button>
                    </div>
                </div>

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
                        onClick={() => { setActiveTab('inbox'); setSelectedEmailIds(new Set()); }}
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
                        onClick={() => { setActiveTab('sent'); setSelectedEmailIds(new Set()); }}
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
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 min-h-[60px]">
                            {selectedEmailIds.size > 0 ? (
                                <div className="flex items-center justify-between w-full animate-fade-in-up">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-700 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">
                                            {selectedEmailIds.size}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleAnalyzeSelected}
                                                disabled={isScanning}
                                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 flex items-center gap-1"
                                                title="Analizuj zaznaczone (AI)"
                                            >
                                                {isScanning ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                )}
                                                <span className="text-xs font-semibold hidden md:inline">Analizuj</span>
                                            </button>
                                            <div className="w-px h-6 bg-slate-300 mx-1" />

                                            <button
                                                onClick={() => handleEmailAction('mark_read')}
                                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Oznacz jako przeczytane">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleEmailAction('mark_unread')}
                                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Oznacz jako nieprzeczytane">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleEmailAction('delete')}
                                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Usuń">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEmailIds(new Set())}
                                        className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                                        Anuluj
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {activeTab === 'inbox' ? 'Skrzynka Odbiorcza' : 'Wysłane'}
                                    </h2>
                                    <div className="flex gap-2">
                                        {activeTab === 'inbox' && (
                                            <button
                                                onClick={() => setRefreshTrigger(prev => prev + 1)} className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Odśwież">
                                                <svg className={`w-5 h-5 ${loading ? 'animate-spin text-accent' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* AI Sacnner Toolbar */}
                        {activeTab === 'inbox' && (
                            <div className="bg-purple-50 border-b border-purple-100 p-3">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            AI Skaner Leadów
                                        </span>
                                        {isScanning && (
                                            <span className="text-xs text-purple-600 font-medium animate-pulse">
                                                Przetworzono: {scanProgress.processed}
                                                {scanProgress.remaining ? ` / ~${scanProgress.processed + scanProgress.remaining}` : ''}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {[
                                            { label: 'Nowe', val: 0 },
                                            { label: '24h', val: 1 },
                                            { label: '3 dni', val: 3 },
                                            { label: '7 dni', val: 7 },
                                            { label: '14 dni', val: 14 },
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                disabled={isScanning}
                                                onClick={() => {
                                                    setScanRange(opt.val);
                                                    if (!isScanning) {
                                                        // Update state but don't auto-run unless desired. 
                                                        // User wants "choice", so let's select then run? 
                                                        // Or instant run? Pattern "Select Range" -> Click Scan.
                                                    }
                                                }}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                                                    ${scanRange === opt.val
                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                                                    }
                                                `}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}

                                        <div className="w-px h-6 bg-purple-200 mx-1"></div>

                                        <button
                                            onClick={handleScanEmails}
                                            disabled={isScanning}
                                            className={`
                                                flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all shadow-sm whitespace-nowrap
                                                ${isScanning
                                                    ? 'bg-slate-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                                }
                                            `}
                                        >
                                            {isScanning ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            )}
                                            {isScanning ? 'Skanuję...' : 'Uruchom'}
                                        </button>
                                    </div>

                                    {/* Progress Bar Visual */}
                                    {isScanning && (
                                        <div className="w-full h-1 bg-purple-200 rounded-full overflow-hidden mt-1">
                                            <div
                                                className="h-full bg-purple-600 animate-progress-indeterminate"
                                                style={{ width: '100%' }} // Could be actual percentage if we knew total upfront
                                            ></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
                                        className={`p-3 border-b border-slate-50 transition-colors ${selectedEmail?.id === email.messageId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                            } ${!email.flags?.includes('\\Seen') ? 'font-semibold bg-white' : 'text-slate-600 bg-slate-50/50'} relative group`}
                                    >
                                        <div className="absolute left-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedEmailIds.has(email.id)}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedEmailIds);
                                                    if (e.target.checked) newSet.add(email.id);
                                                    else newSet.delete(email.id);
                                                    setSelectedEmailIds(newSet);
                                                }}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                            />
                                        </div>
                                        <div
                                            className="pl-6 cursor-pointer" // Space for checkbox (even when hidden)
                                            onClick={(e) => {
                                                // Prevent click if clicking checkbox (handled by input above) but just in case
                                                handleSelectEmail(email.id);
                                            }}
                                        >
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="truncate text-sm font-medium text-slate-900 max-w-[70%] flex items-center gap-1">
                                                    {selectedEmailIds.has(email.id) && (
                                                        <span className="text-blue-600 scale-75 transform -ml-1">✓</span>
                                                    )}
                                                    {convertedMessageIds.has(String(email.id)) && (
                                                        <span title="Utworzono Lead" className="text-emerald-500">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    {email.from.replace(/<.*>/, '').trim()}
                                                </span>
                                                <span className="text-xs text-slate-400 flex-shrink-0">
                                                    {new Date(email.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <h3 className="text-sm text-slate-800 truncate mb-1">{email.subject}</h3>
                                        </div>
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
                                            ref={textareaRef}
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
                                                <div className="relative">
                                                    <button
                                                        onClick={toggleOfferSelector}
                                                        type="button"
                                                        className={`p-2 rounded-lg transition-colors ${showOfferSelector ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                                                        title="Wstaw Ofertę"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                    {showOfferSelector && (
                                                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                                                            <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">
                                                                Ostatnie Oferty
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {recentOffers.length === 0 ? (
                                                                    <div className="p-4 text-center text-xs text-slate-400">Brak ofert</div>
                                                                ) : (
                                                                    recentOffers.map(offer => (
                                                                        <button
                                                                            key={offer.id}
                                                                            type="button"
                                                                            onClick={() => handleInsertOfferLink(offer)}
                                                                            className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 text-sm transition-colors"
                                                                        >
                                                                            <div className="font-medium text-slate-800">{offer.offerNumber}</div>
                                                                            <div className="text-xs text-slate-500">{offer.customer.firstName} {offer.customer.lastName}</div>
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
                                                            ```
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Utwórz Lead (AI)</span>
                                                    </button>
                                                    <button
                                                        onClick={handleScanEmails}
                                                        disabled={loading || isScanning}
                                                        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg ${loading || isScanning ? 'opacity-70 cursor-wait' : ''}`}
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${(loading || isScanning) ? 'animate-spin' : ''}`} />
                                                        <span className="hidden sm:inline">
                                                            {(loading || isScanning) ?
                                                                `Skanowanie... (${scanProgress.processed})`
                                                                : 'Skanuj Leady (AI)'}
                                                        </span>
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





export default MailPage;
