import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { MailboxConfig, EmailConfig } from '../../types';
import { SettingsService } from '../../services/database/settings.service';

interface EmailAttachment {
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
    content: string; // base64
}

interface EmailItem {
    id: number;
    subject: string;
    from: string;
    to: string;
    date: string;
    flags: string[];
    box: 'inbox' | 'sent';
    mailboxName?: string;
    hasAttachment?: boolean;
}

interface EmailDetail {
    id: number;
    subject: string;
    from: string;
    to: string;
    date: string;
    text: string;
    html?: string;
    attachments?: EmailAttachment[];
}

interface Props {
    customerEmail: string;
    maxItems?: number;
    compact?: boolean;
}

export const EmailHistoryWidget: React.FC<Props> = ({ customerEmail, maxItems = 20, compact = false }) => {
    const { currentUser } = useAuth();
    const [emails, setEmails] = useState<EmailItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [bueroConfig, setBueroConfig] = useState<EmailConfig | null>(null);
    const [previewAtt, setPreviewAtt] = useState<{ dataUrl: string; filename: string; type: 'image' | 'pdf' } | null>(null);

    // Load buero config
    useEffect(() => {
        SettingsService.getBueroEmailConfig().then(c => { if (c) setBueroConfig(c); }).catch(console.error);
    }, []);

    const fetchEmailsForConfig = useCallback(async (config: EmailConfig | MailboxConfig, mailboxName: string) => {
        const results: EmailItem[] = [];

        // Fetch from INBOX
        try {
            const res = await fetch('/api/fetch-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, limit: maxItems, box: 'INBOX', searchEmail: customerEmail })
            });
            if (res.ok) {
                const data = await res.json();
                (data.messages || []).forEach((m: any) => results.push({ ...m, box: 'inbox' as const, mailboxName }));
            }
        } catch (e) { console.warn('INBOX fetch failed for', mailboxName, e); }

        // Fetch from Sent
        try {
            const res = await fetch('/api/fetch-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, limit: maxItems, box: 'Sent', searchEmail: customerEmail })
            });
            if (res.ok) {
                const data = await res.json();
                (data.messages || []).forEach((m: any) => results.push({ ...m, box: 'sent' as const, mailboxName }));
            }
        } catch (e) { console.warn('Sent fetch failed for', mailboxName, e); }

        return results;
    }, [customerEmail, maxItems]);

    const loadEmails = useCallback(async () => {
        if (!customerEmail) return;
        setLoading(true);

        const allEmails: EmailItem[] = [];

        // User mailboxes
        const mailboxes: MailboxConfig[] = currentUser?.mailboxes || [];
        const promises = mailboxes
            .filter(mb => mb.imapHost && mb.imapUser && mb.imapPassword)
            .map(mb => fetchEmailsForConfig(mb, mb.name));

        // Buero config
        if (bueroConfig?.imapHost) {
            promises.push(fetchEmailsForConfig(bueroConfig, 'Biuro'));
        }

        const results = await Promise.allSettled(promises);
        results.forEach(r => {
            if (r.status === 'fulfilled') allEmails.push(...r.value);
        });

        // Sort by date descending, deduplicate by subject+date
        const seen = new Set<string>();
        const unique = allEmails
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .filter(e => {
                const key = `${e.subject}_${e.date}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, maxItems);

        setEmails(unique);
        setLoading(false);
    }, [customerEmail, currentUser?.mailboxes, bueroConfig, fetchEmailsForConfig, maxItems]);

    useEffect(() => {
        loadEmails();
    }, [loadEmails]);

    const handleOpenEmail = async (email: EmailItem) => {
        setLoadingDetail(true);
        setSelectedEmail(null);

        // Determine which config to use
        const mailboxes: MailboxConfig[] = currentUser?.mailboxes || [];
        let config: EmailConfig | MailboxConfig | null = null;

        if (email.mailboxName === 'Biuro') {
            config = bueroConfig;
        } else {
            config = mailboxes.find(mb => mb.name === email.mailboxName) || mailboxes[0] || null;
        }

        if (!config) {
            setLoadingDetail(false);
            return;
        }

        try {
            const res = await fetch('/api/fetch-email-body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config,
                    uid: email.id,
                    box: email.box === 'sent' ? 'Sent' : 'INBOX'
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Ensure attachments array
                if (!data.attachments) data.attachments = [];
                setSelectedEmail(data);
            }
        } catch (e) {
            console.error('Failed to load email body:', e);
        } finally {
            setLoadingDetail(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffH = diffMs / (1000 * 60 * 60);

        if (diffH < 1) return `${Math.round(diffMs / 60000)} min temu`;
        if (diffH < 24) return `${Math.round(diffH)}h temu`;
        if (diffH < 48) return 'Wczoraj';
        return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (!customerEmail) return null;

    return (
        <>
            <div className={compact ? '' : 'bg-white rounded-xl border border-slate-200 shadow-sm p-5'}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold text-slate-900 flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Poczta E-mail
                        {emails.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{emails.length}</span>
                        )}
                    </h3>
                    <button
                        onClick={loadEmails}
                        disabled={loading}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Odśwież"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {loading && emails.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Przeszukuję skrzynki pocztowe...</span>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm italic">
                        Brak wiadomości e-mail dla {customerEmail}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {emails.map((email) => (
                            <button
                                key={`${email.box}-${email.id}-${email.mailboxName}`}
                                onClick={() => handleOpenEmail(email)}
                                className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group flex gap-3 items-start"
                            >
                                {/* Direction icon */}
                                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${email.box === 'inbox' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {email.box === 'inbox' ? (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${email.box === 'inbox' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                            {email.box === 'inbox' ? 'Otrzymano' : 'Wysłano'}
                                        </span>
                                        <span className="text-[11px] text-slate-400 shrink-0">{formatDate(email.date)}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 flex items-center gap-1.5">
                                        {email.subject || '(Bez tematu)'}
                                        {email.hasAttachment && (
                                            <span className="text-slate-400 shrink-0" title="Zawiera załączniki">📎</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {email.box === 'inbox' ? email.from : email.to}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mt-2 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Email Detail Modal */}
            {(selectedEmail || loadingDetail) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedEmail(null); setLoadingDetail(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 shrink-0">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-bold text-slate-800 truncate">
                                    {selectedEmail?.subject || 'Ładowanie...'}
                                </h2>
                                {selectedEmail && (
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                        <span>Od: <strong className="text-slate-700">{selectedEmail.from}</strong></span>
                                        <span>•</span>
                                        <span>{new Date(selectedEmail.date).toLocaleString('pl-PL')}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { setSelectedEmail(null); setLoadingDetail(false); }}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors shrink-0 ml-4"
                            >
                                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto">
                            {loadingDetail ? (
                                <div className="flex items-center justify-center py-16 text-slate-400">
                                    <svg className="w-6 h-6 animate-spin mr-3" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Ładowanie treści...
                                </div>
                            ) : selectedEmail?.html ? (
                                <iframe
                                    srcDoc={selectedEmail.html}
                                    className="w-full border-0"
                                    style={{ minHeight: '400px', height: '60vh' }}
                                    sandbox="allow-same-origin"
                                    title="email-body"
                                />
                            ) : (
                                <div className="p-6 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                                    {selectedEmail?.text || 'Brak treści'}
                                </div>
                            )}

                            {/* Attachments Section */}
                            {selectedEmail?.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="border-t border-slate-200 p-5 bg-slate-50">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        📎 Załączniki ({selectedEmail.attachments.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedEmail.attachments.map((att, idx) => {
                                            const isImage = att.contentType?.startsWith('image/');
                                            const isPdf = att.contentType === 'application/pdf';
                                            const canPreview = isImage || isPdf;
                                            const sizeKB = Math.round((att.size || 0) / 1024);
                                            const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

                                            const getDataUrl = () => {
                                                const byteChars = atob(att.content);
                                                const byteNumbers = new Array(byteChars.length);
                                                for (let i = 0; i < byteChars.length; i++) {
                                                    byteNumbers[i] = byteChars.charCodeAt(i);
                                                }
                                                const byteArray = new Uint8Array(byteNumbers);
                                                const blob = new Blob([byteArray], { type: att.contentType });
                                                return URL.createObjectURL(blob);
                                            };

                                            const handleDownload = () => {
                                                const url = getDataUrl();
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = att.filename || `attachment_${idx}`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            };

                                            const handlePreview = () => {
                                                if (isImage) {
                                                    setPreviewAtt({ dataUrl: `data:${att.contentType};base64,${att.content}`, filename: att.filename || `attachment_${idx}`, type: 'image' });
                                                } else if (isPdf) {
                                                    setPreviewAtt({ dataUrl: getDataUrl(), filename: att.filename || `attachment_${idx}`, type: 'pdf' });
                                                }
                                            };

                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group">
                                                    {/* Icon / Preview */}
                                                    {isImage ? (
                                                        <img
                                                            src={`data:${att.contentType};base64,${att.content}`}
                                                            alt={att.filename}
                                                            className="w-10 h-10 rounded object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                                            onClick={handlePreview}
                                                        />
                                                    ) : (
                                                        <div
                                                            className={`w-10 h-10 rounded flex items-center justify-center text-lg shrink-0 ${isPdf ? 'bg-red-100 text-red-600 cursor-pointer hover:ring-2 hover:ring-red-300' : 'bg-blue-100 text-blue-600'} transition-all`}
                                                            onClick={canPreview ? handlePreview : undefined}
                                                        >
                                                            {isPdf ? '📄' : '📁'}
                                                        </div>
                                                    )}

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{att.filename || `Plik ${idx + 1}`}</p>
                                                        <p className="text-[10px] text-slate-400">{sizeLabel} • {att.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {canPreview && (
                                                            <button
                                                                onClick={handlePreview}
                                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Podgląd"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={handleDownload}
                                                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Pobierz"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Attachment Preview Lightbox */}
            {previewAtt && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => { setPreviewAtt(null); }}
                >
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
                        <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-medium truncate max-w-[60%]">
                            📎 {previewAtt.filename}
                        </div>
                        <button
                            onClick={() => setPreviewAtt(null)}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {previewAtt.type === 'image' ? (
                            <img
                                src={previewAtt.dataUrl}
                                alt={previewAtt.filename}
                                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
                            />
                        ) : previewAtt.type === 'pdf' ? (
                            <iframe
                                src={previewAtt.dataUrl}
                                title={previewAtt.filename}
                                className="w-[85vw] h-[85vh] rounded-xl shadow-2xl bg-white"
                            />
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
};
