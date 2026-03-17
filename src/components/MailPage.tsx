import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { LeadForm } from './leads/LeadForm';
import { RefreshCw } from 'lucide-react';
import { MailboxManager } from './admin/MailboxManager';

import type { Lead, Offer, EmailConfig, MailboxConfig } from '../types';

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
    const { currentUser, refreshUser } = useAuth();
    // Initialize from saved primary mailbox preference
    const savedPrimaryIdx = (currentUser?.emailConfig as any)?.__primaryMailboxIndex;
    const [selectedMailboxIdx, setSelectedMailboxIdx] = useState<number>(typeof savedPrimaryIdx === 'number' ? savedPrimaryIdx : 0);

    const [activeTab, setActiveTab] = useState<MailTab>('inbox');
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [convertedMessageIds, setConvertedMessageIds] = useState<Set<string>>(new Set());
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // Scanning removed per user request

    // Selection state
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<number>>(new Set());


    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);

    // Feature 1: Search
    const [searchQuery, setSearchQuery] = useState('');

    // Feature 2: Auto-polling
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastEmailCountRef = useRef<number>(0);

    // Feature 3: Smart Reply
    const [smartReplies, setSmartReplies] = useState<string[]>([]);
    const [smartReplyLoading, setSmartReplyLoading] = useState(false);

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
    const [showMailboxAdmin, setShowMailboxAdmin] = useState(false);

    // Template State (Moved to top to fix React #310)
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);

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

            // Context for template
            const context: Record<string, string> = {
                user_name: `${currentUser?.firstName} ${currentUser?.lastName}`,
                company_name: currentUser?.emailConfig?.companyName || 'Polendach',
                client_name: leadInitialData.customerData?.firstName || '', // Best effort if lead loaded
            };

            // Fetch Default Template ("Domyślna Oferta")
            // If exists, use it. Else fallback.
            let templateBody = `Exklusiv für Sie vorbereitet:\n📄 Angebot ${offer.offerNumber}: ${link}\n\nBitte öffnen Sie die beigefügte PDF-Datei.\nDas detaillierte Angebot finden Sie im Anhang dieser E-Mail.\n`; // Fallback

            try {
                const { supabase } = await import('../lib/supabase');
                const { data: tmpl } = await supabase.from('email_templates').select('body').eq('name', 'Domyślna Oferta').maybeSingle();
                if (tmpl && tmpl.body) {
                    // Check if it's HTML or Text. If template body contains HTML tags, we might want to respect that.
                    // But we are inserting into a textarea (likely plaintext currently in logic?). 
                    // Wait, composeData.body is used in handleSend. 
                    // handleSend checks for HTML tags. 
                    // IMPORTANT: 'parseTemplate' is needed to replace {{offer_number}} and {{offer_link}}.

                    const { EmailTemplateService } = await import('../services/database/email-template.service');
                    templateBody = EmailTemplateService.parseTemplate(tmpl.body, {
                        offer_number: offer.offerNumber,
                        offer_link: link,
                        ...context
                    });
                }
            } catch (e) {
                console.error('Error fetching default offer template', e);
            }

            const template = templateBody;

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



    // Determine active config based on selection — dynamic from mailboxes
    const userMailboxes: MailboxConfig[] = currentUser?.mailboxes || [];
    const activeConfig: EmailConfig | null | undefined = userMailboxes[selectedMailboxIdx] || currentUser?.emailConfig;
    const isConfigured = !!activeConfig?.smtpHost || !!activeConfig?.imapHost;

    // Auto-select first mailbox
    React.useEffect(() => {
        if (selectedMailboxIdx >= userMailboxes.length && userMailboxes.length > 0) {
            setSelectedMailboxIdx(0);
        }
    }, [userMailboxes.length]);

    const boxName = activeTab === 'sent' ? 'Sent' : 'INBOX';
    const CACHE_KEY = `cached_emails_${selectedMailboxIdx}_${currentUser?.id}_${boxName}`;

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

    // ── Auto-Polling (every 30s, silent background fetch) ──
    const silentFetchRef = useRef<() => Promise<void>>();
    silentFetchRef.current = async () => {
        if (!activeConfig?.imapHost || activeTab === 'compose') return;
        try {
            const response = await fetch('/api/fetch-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: activeConfig, limit: 100, box: boxName })
            });
            if (!response.ok) return;
            const data = await response.json();
            const newEmails = data.messages || [];

            // Detect new emails
            if (lastEmailCountRef.current > 0 && newEmails.length > lastEmailCountRef.current) {
                const diff = newEmails.length - lastEmailCountRef.current;
                toast(`📬 ${diff} ${diff === 1 ? 'nowa wiadomość' : 'nowe wiadomości'}`, { icon: '✉️', duration: 4000 });
            }
            lastEmailCountRef.current = newEmails.length;
            setEmails(newEmails);
            localStorage.setItem(CACHE_KEY, JSON.stringify(newEmails));
        } catch { /* silent fail */ }
    };

    useEffect(() => {
        // Track initial count
        lastEmailCountRef.current = emails.length;
    }, [activeConfig, activeTab]);

    useEffect(() => {
        if (!isConfigured || activeTab === 'compose') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            return;
        }
        pollingRef.current = setInterval(() => silentFetchRef.current?.(), 30000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [isConfigured, activeTab, activeConfig, boxName]);

    // ── Smart Reply Handler ──
    const handleSmartReply = useCallback(async () => {
        if (!selectedEmail) return;
        setSmartReplyLoading(true);
        setSmartReplies([]);

        try {
            const emailContext = `From: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.text || ''}`;
            const userOpenaiKey = currentUser?.emailConfig?.openaiKey;

            const { supabase } = await import('../lib/supabase');
            const { data, error } = await supabase.functions.invoke('extract-lead-info', {
                body: {
                    text: `Wygeneruj dokładnie 3 krótkie propozycje odpowiedzi na poniższą wiadomość e-mail. Odpowiedzi powinny być po niemiecku, profesjonalne i zwięzłe (max 2 zdania każda). Zwróć TYLKO JSON array z 3 stringami, bez żadnego innego tekstu.\n\nFormat: ["reply1", "reply2", "reply3"]\n\nWiadomość:\n${emailContext}`,
                    apiKey: userOpenaiKey,
                    mode: 'smart_reply'
                }
            });

            if (error) throw error;

            // Parse the response — the edge function returns leadData but we hijacked it for smart reply
            const raw = data?.leadData || data?.raw || data;
            let replies: string[] = [];

            if (typeof raw === 'string') {
                const match = raw.match(/\[.*\]/s);
                if (match) replies = JSON.parse(match[0]);
            } else if (Array.isArray(raw)) {
                replies = raw;
            } else if (raw?.replies) {
                replies = raw.replies;
            }

            if (replies.length === 0) {
                // Fallback: generate simple replies
                replies = [
                    'Vielen Dank für Ihre Nachricht. Ich melde mich zeitnah bei Ihnen.',
                    'Danke für Ihre Anfrage. Könnten Sie mir bitte weitere Details mitteilen?',
                    'Vielen Dank! Ich werde das intern prüfen und mich bei Ihnen zurückmelden.'
                ];
            }

            setSmartReplies(replies.slice(0, 3));
        } catch (err) {
            console.error('Smart Reply Error:', err);
            // Fallback replies
            setSmartReplies([
                'Vielen Dank für Ihre Nachricht. Ich melde mich zeitnah bei Ihnen.',
                'Danke für Ihre Anfrage. Könnten Sie mir bitte weitere Details mitteilen?',
                'Vielen Dank! Ich werde das intern prüfen und mich bei Ihnen zurückmelden.'
            ]);
        } finally {
            setSmartReplyLoading(false);
        }
    }, [selectedEmail, currentUser]);

    const useSmartReply = (reply: string) => {
        setActiveTab('compose');
        const replyTo = selectedEmail?.from.includes('<') ? selectedEmail?.from.match(/<(.+?)>/)?.[1] || selectedEmail?.from : selectedEmail?.from || '';
        setComposeData({
            to: replyTo,
            subject: selectedEmail?.subject?.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail?.subject || ''}`,
            body: reply
        });
        setSmartReplies([]);
    };

    // Filtered emails for search
    const filteredEmails = searchQuery.trim()
        ? emails.filter(e => {
            const q = searchQuery.toLowerCase();
            return (
                (e.from || '').toLowerCase().includes(q) ||
                (e.subject || '').toLowerCase().includes(q) ||
                (e.text || '').toLowerCase().includes(q)
            );
        })
        : emails;

    // Unread count for badge
    const unreadCount = emails.filter(e => !e.flags?.includes('\\Seen')).length;

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

    const uploadAttachments = async (email: EmailDetails): Promise<any[]> => {
        if (!email.attachments || email.attachments.length === 0) return [];

        const uploaded: any[] = [];
        const toastId = toast.loading(`Wysyłanie ${email.attachments.length} załączników...`);

        try {
            const { supabase } = await import('../lib/supabase');

            for (const att of email.attachments) {
                // Decode Base64 to Blob
                const byteCharacters = atob(att.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: att.contentType });

                // Upload
                // Path: lead-attachments/{email_id}/{filename}
                const path = `${email.id}/${att.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

                const { data, error } = await supabase.storage
                    .from('lead-attachments')
                    .upload(path, blob, {
                        contentType: att.contentType,
                        upsert: true
                    });

                if (error) {
                    console.error(`Failed to upload ${att.filename}`, error);
                    continue;
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('lead-attachments')
                    .getPublicUrl(path);

                uploaded.push({
                    name: att.filename,
                    url: publicUrl,
                    type: att.contentType,
                    size: att.size || blob.size
                });
            }

            toast.success(`Przesłano ${uploaded.length} z ${email.attachments.length}`, { id: toastId });
            return uploaded;
        } catch (e) {
            console.error('Upload Error:', e);
            toast.error('Błąd wysyłania załączników', { id: toastId });
            return [];
        }
    };

    const handleCreateLead = async () => {
        if (!selectedEmail) return;

        // Upload attachments first
        const uploadedAttachments = await uploadAttachments(selectedEmail);

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

        // --- Smart Body Parsing for common contact form patterns ---
        const body = selectedEmail.text || '';
        let parsedFirstName = firstName || '';
        let parsedLastName = lastName || '';
        let parsedEmail = email || '';
        let parsedPhone = '';
        let parsedPostalCode = '';
        let parsedCity = '';
        let parsedAddress = '';
        let parsedCompany = '';

        // Pattern: "Name und Vorname: Weinberger, Kevin" or "Name: Kevin Weinberger"
        const nameMatch = body.match(/(?:Name\s*(?:und\s*Vorname)?|Imię\s*i\s*nazwisko|Vor-?\s*und\s*Nachname)\s*:\s*(.+)/i);
        if (nameMatch) {
            const raw = nameMatch[1].trim();
            if (raw.includes(',')) {
                // "Weinberger, Kevin" → lastName, firstName
                const [last, first] = raw.split(',').map(s => s.trim());
                parsedLastName = last;
                parsedFirstName = first;
            } else {
                const parts = raw.split(/\s+/);
                parsedFirstName = parts[0] || '';
                parsedLastName = parts.slice(1).join(' ');
            }
        }

        // Pattern: "Email: xxx@xxx.xx" or "E-Mail: xxx"
        const emailMatch = body.match(/(?:E-?Mail|Email)\s*:\s*([^\s,\n]+@[^\s,\n]+)/i);
        if (emailMatch) {
            parsedEmail = emailMatch[1].trim();
        }

        // Pattern: "Mobil: 015222875965" or "Telefon: ..." or "Tel: ..."  
        const phoneMatch = body.match(/(?:Mobil|Telefon|Tel|Phone|Handy)\s*:\s*([+\d\s/-]+)/i);
        if (phoneMatch) {
            parsedPhone = phoneMatch[1].trim();
        }

        // Pattern: "Postleitzahl: 04895" or "PLZ: 04895" or "Kod pocztowy: 00-000"
        const plzMatch = body.match(/(?:Postleitzahl|PLZ|Kod\s*pocztowy)\s*:\s*([0-9\s-]+)/i);
        if (plzMatch) {
            parsedPostalCode = plzMatch[1].trim();
        }

        // Pattern: "Ort: München" or "Stadt: ..." or "Miasto: ..."
        const cityMatch = body.match(/(?:Ort|Stadt|Miasto|City)\s*:\s*(.+)/i);
        if (cityMatch) {
            parsedCity = cityMatch[1].trim();
        }

        // Pattern: "Straße: ..." or "Adresse: ..." or "Adres: ..."
        const addressMatch = body.match(/(?:Straße|Strasse|Adresse|Adres|Address)\s*:\s*(.+)/i);
        if (addressMatch) {
            parsedAddress = addressMatch[1].trim();
        }

        // Pattern: "Firma: ..." or "Unternehmen: ..." or "Company: ..."
        const companyMatch = body.match(/(?:Firma|Unternehmen|Company)\s*:\s*(.+)/i);
        if (companyMatch) {
            parsedCompany = companyMatch[1].trim();
        }

        setLeadInitialData({
            customerData: {
                firstName: parsedFirstName,
                lastName: parsedLastName,
                email: parsedEmail,
                phone: parsedPhone,
                companyName: parsedCompany,
                postalCode: parsedPostalCode,
                city: parsedCity,
                address: parsedAddress,
            },
            source: 'email',
            emailMessageId: selectedEmail.id,
            notes: `Utworzono z wiadomości e-mail: "${selectedEmail.subject}" z dnia ${new Date(selectedEmail.date).toLocaleDateString()}\n\n--- Pełna treść wiadomości ---\nOd: ${selectedEmail.from}\nTemat: ${selectedEmail.subject}\nData: ${new Date(selectedEmail.date).toLocaleString()}\n\n${selectedEmail.text || '(brak treści tekstowej)'}`,
            attachments: uploadedAttachments
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
        setLoading(true);
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
            setLoading(false);
        }
    };

    // AI Extraction Handler (with Price Estimation)
    const handleAiExtract = async () => {
        if (!selectedEmail) return;

        const toastId = toast.loading('AI analizuje wiadomość...');

        try {
            // --- Regex-based body parsing (always runs as fallback) ---
            const body = selectedEmail.text || '';
            const from = selectedEmail.from;
            let regexFirstName = '';
            let regexLastName = '';
            let regexEmail = '';
            let regexPhone = '';
            let regexPostalCode = '';
            let regexCity = '';
            let regexAddress = '';
            let regexCompany = '';

            // Parse "From" field
            if (from.includes('<')) {
                const parts = from.split('<');
                const fromName = parts[0].trim().replace(/^"|"$/g, '');
                regexEmail = parts[1].replace('>', '').trim();
                const [fn, ...lnParts] = fromName.split(' ');
                regexFirstName = fn || '';
                regexLastName = lnParts.join(' ');
            } else {
                regexEmail = from.trim();
            }

            // Pattern: "Name und Vorname: Weinberger, Kevin" or "Name: Kevin Weinberger"
            const nameMatch = body.match(/(?:Name\s*(?:und\s*Vorname)?|Imię\s*i\s*nazwisko|Vor-?\s*und\s*Nachname)\s*:\s*(.+)/i);
            if (nameMatch) {
                const raw = nameMatch[1].trim();
                if (raw.includes(',')) {
                    const [last, first] = raw.split(',').map(s => s.trim());
                    regexLastName = last;
                    regexFirstName = first;
                } else {
                    const parts = raw.split(/\s+/);
                    regexFirstName = parts[0] || '';
                    regexLastName = parts.slice(1).join(' ');
                }
            }

            const emailMatch = body.match(/(?:E-?Mail|Email)\s*:\s*([^\s,\n]+@[^\s,\n]+)/i);
            if (emailMatch) regexEmail = emailMatch[1].trim();

            const phoneMatch = body.match(/(?:Mobil|Telefon|Tel|Phone|Handy)\s*:\s*([+\d\s/-]+)/i);
            if (phoneMatch) regexPhone = phoneMatch[1].trim();

            const plzMatch = body.match(/(?:Postleitzahl|PLZ|Kod\s*pocztowy)\s*:\s*([0-9\s-]+)/i);
            if (plzMatch) regexPostalCode = plzMatch[1].trim();

            const cityMatch = body.match(/(?:Ort|Stadt|Miasto|City)\s*:\s*(.+)/i);
            if (cityMatch) regexCity = cityMatch[1].trim();

            const addressMatch = body.match(/(?:Straße|Strasse|Adresse|Adres|Address)\s*:\s*(.+)/i);
            if (addressMatch) regexAddress = addressMatch[1].trim();

            const companyMatch = body.match(/(?:Firma|Unternehmen|Company)\s*:\s*(.+)/i);
            if (companyMatch) regexCompany = companyMatch[1].trim();

            console.log('[AI Lead] Regex fallback parsed:', { regexFirstName, regexLastName, regexEmail, regexPhone, regexPostalCode, regexCity });

            // --- AI extraction (may enhance or override regex) ---
            let extracted: any = null;
            const fullText = `Temat: ${selectedEmail.subject}\nOd: ${selectedEmail.from}\n\n${body}`;
            // Use user-level openaiKey (not per-mailbox config which doesn't store it)
            const userOpenaiKey = currentUser?.emailConfig?.openaiKey;

            try {
                const { supabase } = await import('../lib/supabase');
                const { data, error } = await supabase.functions.invoke('extract-lead-info', {
                    body: {
                        text: fullText,
                        apiKey: userOpenaiKey
                    }
                });

                if (error) {
                    console.error("Supabase Invoke Error:", error);
                    // Don't throw — we still have regex results
                } else {
                    extracted = data?.leadData;
                    console.log('AI Extracted Data:', extracted);
                }
            } catch (aiErr) {
                console.error('[AI Lead] AI extraction failed, using regex fallback:', aiErr);
            }

            // Merge: AI takes priority over regex, but regex fills in any gaps
            const finalFirstName = extracted?.firstName || regexFirstName;
            const finalLastName = extracted?.lastName || regexLastName;
            const finalEmail = extracted?.email || regexEmail;
            const finalPhone = extracted?.phone || regexPhone;
            const finalPostalCode = extracted?.postalCode || regexPostalCode;
            const finalCity = extracted?.city || regexCity;
            const finalAddress = extracted?.address || regexAddress;
            const finalCompany = extracted?.companyName || regexCompany;

            console.log('[AI Lead] Final merged data:', { finalFirstName, finalLastName, finalEmail, finalPhone, finalPostalCode, finalCity });

            // Upload attachments from the email
            const uploadedAttachments = await uploadAttachments(selectedEmail);
            console.log('[AI Lead] Email attachments count:', selectedEmail.attachments?.length || 0);
            console.log('[AI Lead] Uploaded attachments count:', uploadedAttachments.length);

            // --- AI Price Estimation ---
            let priceEstimateNote = '';
            let estimatedPrice: number | undefined;

            if (extracted?.suggestedModel || extracted?.suggestedWidth || extracted?.suggestedDepth) {
                try {
                    const { PricingService } = await import('../services/pricing.service');

                    const modelCode = (extracted.suggestedModel || 'trendstyle').toLowerCase().replace(/\s+/g, '_');
                    const width = extracted.suggestedWidth || 4000;
                    const depth = extracted.suggestedDepth || 3000;
                    const coverType = extracted.suggestedRoofType === 'glass' ? 'glass_clear' : 'poly_clear';
                    const constructionType: 'wall' | 'free' = extracted.suggestedInstallationType === 'freestanding' || extracted.suggestedInstallationType === 'free' ? 'free' : 'wall';

                    console.log('[AI Price] Looking up:', { modelCode, width, depth, coverType, constructionType });

                    const priceResult = await PricingService.findBasePrice({
                        modelFamily: modelCode,
                        constructionType,
                        coverType,
                        zone: 1,
                        width,
                        depth
                    });

                    if (priceResult && priceResult.price > 0) {
                        estimatedPrice = priceResult.price;
                        const formattedPrice = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(priceResult.price);
                        const modelDisplay = extracted.suggestedModel || modelCode;
                        const constructionLabel = constructionType === 'free' ? 'wolnostojące' : 'ścienne';
                        const coverLabel = extracted.suggestedRoofType === 'glass' ? 'szkło' : 'poliwęglan';

                        priceEstimateNote = `\n\n--- 💰 Wstępna wycena AI ---\nModel: ${modelDisplay}\nWymiary: ${width} x ${depth} mm (${(width / 1000).toFixed(1)} x ${(depth / 1000).toFixed(1)} m)\nTyp: ${constructionLabel}, ${coverLabel}\nCena UPE netto: ${formattedPrice}\n(cena orientacyjna — strefa 1, bez marży, bez dodatków)`;
                    } else {
                        priceEstimateNote = `\n\n--- 💰 Wstępna wycena AI ---\nModel: ${extracted.suggestedModel || '(nieznany)'}\nWymiary: ${width} x ${depth} mm\n⚠️ Nie znaleziono ceny w bazie dla tego modelu/wymiarów.`;
                    }
                } catch (priceErr) {
                    console.error('[AI Price] Error during price lookup:', priceErr);
                    priceEstimateNote = '\n\n--- 💰 Wstępna wycena AI ---\n⚠️ Błąd podczas wyceny — sprawdź ręcznie w konfiguratorze.';
                }
            }

            const fullNotes = `${extracted?.notes || ''}${priceEstimateNote}\n\n--- Pełna treść wiadomości ---\nOd: ${selectedEmail.from}\nTemat: ${selectedEmail.subject}\nData: ${new Date(selectedEmail.date).toLocaleString()}\n\n${selectedEmail.text || '(brak treści tekstowej)'}`;

            setLeadInitialData({
                customerData: {
                    firstName: finalFirstName,
                    lastName: finalLastName,
                    companyName: finalCompany,
                    phone: finalPhone,
                    email: finalEmail,
                    address: finalAddress,
                    postalCode: finalPostalCode,
                    city: finalCity,
                },
                source: 'email',
                emailMessageId: selectedEmail.id,
                notes: fullNotes,
                attachments: uploadedAttachments,
                estimatedPrice
            } as any);
            setShowLeadForm(true);

            // Dismiss loading toast with success message
            const attMsg = uploadedAttachments.length > 0
                ? ` + ${uploadedAttachments.length} załącznik(ów)`
                : '';
            const priceMsg = estimatedPrice
                ? ` + wycena ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(estimatedPrice)}`
                : '';
            const aiMsg = extracted ? 'AI wypełniło formularz' : 'Formularz wypełniony z treści maila';
            toast.success(`${aiMsg}${attMsg}${priceMsg}`, { id: toastId });
        } catch (e: any) {
            console.error(e);
            toast.error(`Błąd AI: ${e.message}`, { id: toastId });
        }
    };

    // Scan Leads functionality removed per user request

    // Reply handler
    const handleReply = () => {
        if (!selectedEmail) return;
        setActiveTab('compose');
        setComposeData({
            to: selectedEmail.from.includes('<') ? selectedEmail.from.match(/<(.+?)>/)?.[1] || selectedEmail.from : selectedEmail.from,
            subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
            body: `\n\n--- Oryginalna wiadomość ---\nOd: ${selectedEmail.from}\nData: ${new Date(selectedEmail.date).toLocaleString()}\nTemat: ${selectedEmail.subject}\n\n${selectedEmail.text || ''}`
        });
    };

    // Forward handler
    const handleForward = () => {
        if (!selectedEmail) return;
        setActiveTab('compose');
        setComposeData({
            to: '',
            subject: selectedEmail.subject.startsWith('Fwd:') ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`,
            body: `\n\n--- Przekazana wiadomość ---\nOd: ${selectedEmail.from}\nData: ${new Date(selectedEmail.date).toLocaleString()}\nTemat: ${selectedEmail.subject}\n\n${selectedEmail.text || ''}`
        });
    };

    // Template Logic - Moved to top
    // const [showTemplateSelector, setShowTemplateSelector] = React.useState(false);
    // const [templates, setTemplates] = React.useState<any[]>([]);

    const handleLoadTemplates = async () => {
        try {
            const { EmailTemplateService } = await import('../services/database/email-template.service');
            const data = await EmailTemplateService.getTemplates(true);
            setTemplates(data);
            setShowTemplateSelector(true);
        } catch (e) {
            console.error(e);
            toast.error('Błąd ładowania szablonów');
        }
    };

    const handleSelectTemplate = async (template: any) => {
        // Prepare Context
        const context: Record<string, string> = {
            user_name: `${currentUser?.firstName} ${currentUser?.lastName}`,
            company_name: currentUser?.emailConfig?.companyName || 'Polendach',
            // If leadInitialData is present, use it, otherwise empty or prompt
            client_name: leadInitialData.customerData?.firstName || '',
            client_lastname: leadInitialData.customerData?.lastName || '',
        };

        // If context missing, we could prompt user or just leave empty variables
        // Let's at least ensure user_name is there.
        // For 'offer_link', we can't easily guess unless we selected an offer.
        // The user can use "Insert Offer" after loading template.

        try {
            const { EmailTemplateService } = await import('../services/database/email-template.service');
            const parsedBody = EmailTemplateService.parseTemplate(template.body, context);

            setComposeData(prev => ({
                ...prev,
                subject: prev.subject || template.subject, // Don't overwrite if user typed something? Or overwrite? Usually overwrite if template selected.
                body: parsedBody
            }));

            setShowTemplateSelector(false);
            toast.success('Szablon załadowany');
        } catch (e) {
            console.error(e);
        }
    };


    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4">
            {/* Template Selector Modal */}
            {showTemplateSelector && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800">Wybierz Szablon</h3>
                            <button onClick={() => setShowTemplateSelector(false)}>✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {templates.length === 0 ? (
                                <p className="text-center p-4 text-slate-500">Brak aktywnych szablonów.</p>
                            ) : (
                                <div className="space-y-2">
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleSelectTemplate(t)}
                                            className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors group"
                                        >
                                            <div className="font-medium text-slate-800">{t.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{t.subject}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* 1. Sidebar (Navigation) - Fixed width */}
            <div className="w-full md:w-48 flex flex-col gap-2 flex-shrink-0">
                <div className="mb-2 space-y-1">
                    {/* Dynamic Mailbox Selector */}
                    {userMailboxes.map((mb, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedMailboxIdx(idx)}
                            className={`w-full py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${selectedMailboxIdx === idx
                                ? 'bg-white shadow-sm border'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            style={selectedMailboxIdx === idx ? { borderColor: mb.color || '#3b82f6', color: mb.color || '#3b82f6' } : {}}
                        >
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mb.color || '#3b82f6' }} />
                            <span className="truncate">{mb.name}</span>
                        </button>
                    ))}
                    {/* Admin: Manage Mailboxes */}
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => setShowMailboxAdmin(true)}
                            className="w-full py-1.5 px-2 text-[11px] font-medium rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 mt-1 border border-dashed border-slate-200"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Zarządzaj skrzynkami
                        </button>
                    )}
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
                        {/* Search Bar */}
                        <div className="px-3 py-2 border-b border-slate-100 bg-white">
                            <div className="relative">
                                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Szukaj w wiadomościach..."
                                    className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                            {searchQuery && <p className="text-[10px] text-slate-400 mt-1 px-1">Znaleziono: {filteredEmails.length} z {emails.length}</p>}
                        </div>
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
                                                disabled={loading}
                                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 flex items-center gap-1"
                                                title="Analizuj zaznaczone (AI)"
                                            >
                                                {loading ? (
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
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        {activeTab === 'inbox' ? 'Skrzynka Odbiorcza' : 'Wysłane'}
                                        {activeTab === 'inbox' && unreadCount > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full animate-pulse">{unreadCount}</span>
                                        )}
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

                        {/* Scanner toolbar removed */}
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
                                {filteredEmails.map(email => (
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
                                                        onClick={handleReply}
                                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                        title="Odpowiedz"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Odpowiedz</span>
                                                    </button>
                                                    <button
                                                        onClick={handleForward}
                                                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                        title="Przekaż dalej"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Przekaż</span>
                                                    </button>
                                                    <button
                                                        onClick={handleSmartReply}
                                                        disabled={smartReplyLoading}
                                                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                        title="AI zaproponuje 3 szybkie odpowiedzi"
                                                    >
                                                        {smartReplyLoading ? (
                                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                            </svg>
                                                        )}
                                                        <span className="hidden sm:inline">Smart Reply</span>
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

                                            {/* Smart Reply Suggestions */}
                                            {smartReplies.length > 0 && (
                                                <div className="mt-6 pt-4 border-t border-slate-100">
                                                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                        </svg>
                                                        AI Smart Reply — kliknij aby użyć
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {smartReplies.map((reply, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => useSmartReply(reply)}
                                                                className="w-full text-left p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm text-slate-700 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] group"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-emerald-500 font-bold text-xs mt-0.5">{i + 1}</span>
                                                                    <span className="flex-1">{reply}</span>
                                                                    <svg className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                                    </svg>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => setSmartReplies([])}
                                                        className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        Zamknij sugestie
                                                    </button>
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
                                                        key={JSON.stringify(leadInitialData)}
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
                                                    key="empty-lead"
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

            {/* Mailbox Admin Modal */}
            {showMailboxAdmin && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Zarządzanie skrzynkami pocztowymi</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Dodaj, edytuj skrzynki i przypisuj użytkowników</p>
                            </div>
                            <button
                                onClick={() => setShowMailboxAdmin(false)}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <MailboxManager onChange={refreshUser} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};





export default MailPage;
