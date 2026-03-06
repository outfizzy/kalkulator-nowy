import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import type { Installation } from '../../types';
import { FeedbackService } from '../../services/database/feedback.service';
import { supabase } from '../../lib/supabase';
import { wrapInBrandTemplate } from '../../utils/emailBrandKit';

interface FeedbackRequestWidgetProps {
    installations: Installation[];
}

/**
 * Widget shown in InstallationDashboard — lists yesterday's completed installations 
 * (and any recent ones without feedback sent yet) so the manager can send feedback emails.
 * Nothing is sent automatically — manager decides manually for each one.
 * Manager can also skip/dismiss individual installations.
 */
export const FeedbackRequestWidget: React.FC<FeedbackRequestWidgetProps> = ({ installations }) => {
    const [expanded, setExpanded] = useState(false);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const [skippedIds, setSkippedIds] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem('feedback_skipped_ids');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch { return new Set(); }
    });
    const [sending, setSending] = useState<string | null>(null);
    const [existingFeedback, setExistingFeedback] = useState<Set<string>>(new Set());

    // Persist skipped IDs to localStorage
    useEffect(() => {
        localStorage.setItem('feedback_skipped_ids', JSON.stringify([...skippedIds]));
    }, [skippedIds]);

    // Get installations completed in last 7 days
    const recentCompleted = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return installations.filter(inst => {
            if (inst.status !== 'completed' && inst.status !== 'verification') return false;
            if (!inst.scheduledDate) return false;
            const schedDate = new Date(inst.scheduledDate);
            return schedDate >= sevenDaysAgo && schedDate <= now;
        }).sort((a, b) => new Date(b.scheduledDate!).getTime() - new Date(a.scheduledDate!).getTime());
    }, [installations]);

    // Check which installations already have feedback requests
    useEffect(() => {
        if (recentCompleted.length === 0) return;
        const checkExisting = async () => {
            try {
                const instIds = recentCompleted.map(i => i.id);
                const { data } = await supabase
                    .from('customer_feedback')
                    .select('installation_id')
                    .in('installation_id', instIds);
                if (data) {
                    setExistingFeedback(new Set(data.map((d: any) => d.installation_id)));
                }
            } catch (e) {
                console.error('Error checking existing feedback:', e);
            }
        };
        void checkExisting();
    }, [recentCompleted]);

    // Visible items = not sent, not skipped, not already having feedback
    const visibleItems = recentCompleted.filter(
        i => !existingFeedback.has(i.id) && !sentIds.has(i.id) && !skippedIds.has(i.id)
    );
    const sentCount = recentCompleted.filter(i => existingFeedback.has(i.id) || sentIds.has(i.id)).length;
    const skippedCount = recentCompleted.filter(i => skippedIds.has(i.id)).length;

    /**
     * Resolves customer email from multiple sources:
     * 1. offers.customer_data.email (via offer_id)
     * 2. customers.email (via offers.customer_id)
     * 3. contracts.customer_data.email (via source_id for contract-sourced installations)
     */
    const resolveCustomerEmail = async (inst: Installation): Promise<{ email: string; name: string } | null> => {
        const customerName = `${inst.client.firstName} ${inst.client.lastName}`;

        if (inst.offerId) {
            const { data: offer } = await supabase
                .from('offers')
                .select('customer_data, customer_id')
                .eq('id', inst.offerId)
                .maybeSingle();

            if (offer) {
                const offerEmail = offer.customer_data?.email;
                if (offerEmail && offerEmail.includes('@')) {
                    return { email: offerEmail, name: customerName };
                }
                if (offer.customer_id) {
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('email')
                        .eq('id', offer.customer_id)
                        .maybeSingle();
                    if (customer?.email && customer.email.includes('@')) {
                        return { email: customer.email, name: customerName };
                    }
                }
            }
        }

        if (inst.sourceId && inst.sourceType === 'contract') {
            const { data: contract } = await supabase
                .from('contracts')
                .select('customer_data, customer_id')
                .eq('id', inst.sourceId)
                .maybeSingle();

            if (contract) {
                const contractEmail = contract.customer_data?.email;
                if (contractEmail && contractEmail.includes('@')) {
                    return { email: contractEmail, name: customerName };
                }
                if (contract.customer_id) {
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('email')
                        .eq('id', contract.customer_id)
                        .maybeSingle();
                    if (customer?.email && customer.email.includes('@')) {
                        return { email: customer.email, name: customerName };
                    }
                }
            }
        }

        return null;
    };

    /**
     * Builds a fully responsive HTML email (table-based for email clients).
     */
    const buildFeedbackEmail = (customerName: string, feedbackUrl: string, contractNumber?: string): string => {
        const firstName = customerName.split(' ')[0];
        // Table-based responsive email for maximum client compatibility
        const emailBody = `
<!--[if mso]><table role="presentation" width="100%"><tr><td style="padding:0"><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;">
    <tr><td style="text-align:center;padding:24px 16px 16px;">
        <div style="display:inline-block;width:56px;height:56px;background-color:#f0fdf4;border-radius:50%;line-height:56px;font-size:26px;">🏠</div>
    </td></tr>
    <tr><td style="padding:0 16px 8px;font-size:16px;color:#1e293b;">
        Sehr geehrte/r <strong>${customerName}</strong>,
    </td></tr>
    <tr><td style="padding:0 16px 20px;font-size:15px;color:#475569;line-height:1.7;">
        wir bedanken uns herzlich für Ihr Vertrauen und die Zusammenarbeit! 
        Es war uns eine große Freude, Ihr Projekt${contractNumber ? ` <strong style="color:#1e40af;">${contractNumber}</strong>` : ''} erfolgreich abzuschließen.
    </td></tr>
    <tr><td style="padding:0 16px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bbf7d0;border-radius:12px;">
            <tr><td style="padding:20px 16px;text-align:center;">
                <div style="font-size:22px;margin:0 0 6px;">⭐⭐⭐⭐⭐</div>
                <div style="font-size:15px;color:#166534;font-weight:700;margin:0 0 6px;">Ihre Meinung ist uns wichtig!</div>
                <div style="font-size:13px;color:#4b5563;line-height:1.6;">
                    Wir würden uns sehr freuen, wenn Sie sich <strong>2 Minuten</strong> Zeit nehmen, um uns Ihr ehrliches Feedback zu geben.
                </div>
            </td></tr>
        </table>
    </td></tr>
    <tr><td style="padding:0 16px 20px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${feedbackUrl}" style="height:48px;width:240px;" arcsize="17%" fillcolor="#2563eb"><w:anchorlock/><center style="color:#ffffff;font-weight:bold;font-size:16px;">⭐ Jetzt bewerten</center></v:roundrect><![endif]-->
        <!--[if !mso]><!-->
        <a href="${feedbackUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;mso-hide:all;" target="_blank">⭐ Jetzt bewerten</a>
        <!--<![endif]-->
    </td></tr>
    <tr><td style="padding:0 16px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:8px;">
            <tr><td style="padding:14px 16px;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                <strong>Was erwartet Sie?</strong><br>
                ✓ 4 kurze Bewertungskategorien<br>
                ✓ Optionale Kommentare<br>
                ✓ Dauert nur 2 Minuten
            </td></tr>
        </table>
    </td></tr>
    <tr><td style="padding:0 16px 20px;font-size:11px;color:#94a3b8;text-align:center;word-break:break-all;">
        Falls der Button nicht funktioniert:<br>
        <a href="${feedbackUrl}" style="color:#3b82f6;font-size:11px;">${feedbackUrl}</a>
    </td></tr>
    <tr><td style="padding:0 16px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
    <tr><td style="padding:16px;font-size:14px;color:#1e293b;">
        Mit herzlichem Dank und besten Grüßen,<br><strong>Ihr Polendach24 Team</strong>
    </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->`;

        return wrapInBrandTemplate(emailBody);
    };

    const handleSendFeedback = async (inst: Installation) => {
        setSending(inst.id);
        try {
            const resolved = await resolveCustomerEmail(inst);
            if (!resolved) {
                toast.error(`Brak e-mail klienta: ${inst.client.firstName} ${inst.client.lastName}. Sprawdź dane w ofercie.`);
                setSending(null);
                return;
            }

            const { email: customerEmail, name: customerName } = resolved;

            const { token } = await FeedbackService.createFeedbackRequest({
                contractId: inst.sourceId || undefined,
                installationId: inst.id,
                customerName,
                customerEmail,
            });

            const feedbackUrl = `https://polendach24.app/feedback/${token}`;
            const firstName = customerName.split(' ')[0];
            const html = buildFeedbackEmail(customerName, feedbackUrl, inst.contractNumber);

            const { error: sendError } = await supabase.functions.invoke('send-email', {
                body: {
                    to: customerEmail,
                    subject: `${firstName}, wie war Ihre Erfahrung mit Polendach24? ⭐`,
                    html,
                }
            });

            if (sendError) throw sendError;

            setSentIds(prev => new Set([...prev, inst.id]));
            setExistingFeedback(prev => new Set([...prev, inst.id]));
            toast.success(`📧 Feedback-Anfrage an ${firstName} gesendet!`);
        } catch (err) {
            console.error('Error sending feedback:', err);
            toast.error('Fehler beim Senden der Feedback-Anfrage');
        } finally {
            setSending(null);
        }
    };

    const handleSkip = (instId: string) => {
        setSkippedIds(prev => new Set([...prev, instId]));
        toast('Klient pominięty', { icon: '🚫' });
    };

    if (recentCompleted.length === 0) return null;

    const formatDate = (d: string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

    const isYesterday = (d: string) => {
        const date = new Date(d);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.toDateString() === yesterday.toDateString();
    };

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden">
            {/* Collapsed header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-amber-100/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">⭐</span>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-800 text-sm">Feedback anfordern</h3>
                        <p className="text-xs text-slate-500">
                            {visibleItems.length > 0
                                ? `${visibleItems.length} do wysłania`
                                : 'Wszystkie obsłużone ✓'}
                            {sentCount > 0 && ` · ${sentCount} wysłano`}
                            {skippedCount > 0 && ` · ${skippedCount} pominięto`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {visibleItems.length > 0 && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {visibleItems.length}
                        </span>
                    )}
                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Expanded list */}
            {expanded && (
                <div className="border-t border-amber-200 divide-y divide-amber-100">
                    {visibleItems.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">
                            ✅ Wszystkie montaże obsłużone — brak oczekujących
                        </div>
                    )}
                    {visibleItems.map(inst => {
                        const isSending = sending === inst.id;

                        return (
                            <div key={inst.id} className="px-4 py-3 flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-slate-800 text-sm truncate">
                                            {inst.client.firstName} {inst.client.lastName}
                                        </p>
                                        {isYesterday(inst.scheduledDate!) && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">WCZORAJ</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        {inst.client.city} · {inst.productSummary} · {formatDate(inst.scheduledDate!)}
                                        {inst.contractNumber && ` · ${inst.contractNumber}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {/* Skip button */}
                                    <button
                                        onClick={() => handleSkip(inst.id)}
                                        disabled={isSending}
                                        className="px-2 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs rounded-lg transition-colors disabled:opacity-50"
                                        title="Nie wysyłaj — pomiń tego klienta"
                                    >
                                        🚫
                                    </button>
                                    {/* Send button */}
                                    <button
                                        onClick={() => handleSendFeedback(inst)}
                                        disabled={isSending}
                                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        {isSending ? (
                                            <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                            '📧'
                                        )}
                                        {isSending ? 'Wysyłam...' : 'Wyślij'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
