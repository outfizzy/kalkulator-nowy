import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { generateLeadSalesEmailHtml, getSnowZoneByPostalCode } from './leadSalesEmailTemplate';
import { supabase } from '../../lib/supabase';
import { ConfiguratorService } from '../../services/database/configurator.service';
import type { Lead } from '../../types';

interface BulkWelcomeEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete?: () => void;
    leads: Lead[];
}

type LeadEmailStatus = 'pending' | 'sending' | 'success' | 'error' | 'skipped';

interface LeadEmailEntry {
    lead: Lead;
    status: LeadEmailStatus;
    error?: string;
    email?: string;
}

const BUERO_EMAIL = 'buero@polendach24.de';
const DELAY_BETWEEN_EMAILS_MS = 1500; // 1.5s between sends to avoid rate limits

export const BulkWelcomeEmailModal: React.FC<BulkWelcomeEmailModalProps> = ({
    isOpen, onClose, onComplete, leads
}) => {
    const { currentUser } = useAuth();
    const [entries, setEntries] = useState<LeadEmailEntry[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const abortRef = useRef(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Build entries from leads — filter out those already sent or without email
    useEffect(() => {
        if (!isOpen) return;
        abortRef.current = false;
        setIsComplete(false);
        setIsSending(false);

        const buildEntries = async () => {
            // Check which leads already got the welcome email
            const leadIds = leads.map(l => l.id);
            const { data: leadsData } = await supabase
                .from('leads')
                .select('id, customer_data')
                .in('id', leadIds);

            const newEntries: LeadEmailEntry[] = [];
            for (const lead of leads) {
                const dbLead = leadsData?.find(d => d.id === lead.id);
                const customerData = dbLead?.customer_data || lead.customerData || {};
                const email = customerData.email || (customerData as any).e_mail || '';
                const alreadySent = !!customerData.formEmailSentAt;

                if (alreadySent) {
                    newEntries.push({ lead, status: 'skipped', email, error: 'Już wysłano' });
                } else if (!email) {
                    newEntries.push({ lead, status: 'skipped', email: '', error: 'Brak e-mail' });
                } else {
                    newEntries.push({ lead, status: 'pending', email });
                }
            }
            setEntries(newEntries);
        };
        buildEntries();
    }, [isOpen, leads]);

    const pendingCount = entries.filter(e => e.status === 'pending').length;
    const successCount = entries.filter(e => e.status === 'success').length;
    const errorCount = entries.filter(e => e.status === 'error').length;
    const skippedCount = entries.filter(e => e.status === 'skipped').length;
    const totalToSend = pendingCount + successCount + errorCount;
    const progress = totalToSend > 0 ? Math.round(((successCount + errorCount) / totalToSend) * 100) : 0;

    const updateEntry = useCallback((leadId: string, update: Partial<LeadEmailEntry>) => {
        setEntries(prev => prev.map(e => e.lead.id === leadId ? { ...e, ...update } : e));
    }, []);

    const handleSendAll = async () => {
        setIsSending(true);
        abortRef.current = false;

        // Find buero mailbox config
        const mailboxes = currentUser?.mailboxes || [];
        const bueroMailbox = mailboxes.find((mb: any) =>
            (mb.smtpUser || mb.email || '').toLowerCase() === BUERO_EMAIL
        );
        const bueroConfig = bueroMailbox || (
            (currentUser?.emailConfig?.smtpUser || '').toLowerCase() === BUERO_EMAIL
                ? currentUser?.emailConfig
                : null
        );

        const pendingEntries = entries.filter(e => e.status === 'pending');

        for (let i = 0; i < pendingEntries.length; i++) {
            if (abortRef.current) break;

            const entry = pendingEntries[i];
            const lead = entry.lead;

            updateEntry(lead.id, { status: 'sending' });

            // Scroll current item into view
            setTimeout(() => {
                const el = document.getElementById(`bulk-email-${lead.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);

            try {
                // 1. Detect snow zone
                const postalCode = lead.customerData?.postalCode || '';
                const snowZone = postalCode ? getSnowZoneByPostalCode(postalCode) : null;
                const customerName = [lead.customerData?.firstName, lead.customerData?.lastName]
                    .filter(Boolean).join(' ') || 'Kunde';

                // 2. Generate configurator link
                let configuratorUrl = '';
                try {
                    const linkResult = await ConfiguratorService.createLink(lead.id);
                    configuratorUrl = linkResult.url;
                } catch (linkErr) {
                    console.warn(`[Bulk Email] Could not generate configurator link for ${lead.id}:`, linkErr);
                }

                // 3. Generate email HTML
                const html = generateLeadSalesEmailHtml({
                    customerName,
                    postalCode,
                    snowZone: snowZone?.zone,
                    snowLoad: snowZone?.load,
                    configuratorUrl,
                });

                // 4. Send email
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser?.id,
                        to: entry.email,
                        subject: 'Polendach24 - erster Kontakt',
                        body: html,
                        ...(bueroConfig?.smtpHost
                            ? { config: bueroConfig }
                            : { useSharedConfig: true }),
                        saveToSent: true,
                        leadId: lead.id,
                        customerId: lead.customerId,
                    }),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Błąd wysyłki');

                // 5. Update lead tracking in DB
                try {
                    const { data: currentLead } = await supabase
                        .from('leads')
                        .select('customer_data')
                        .eq('id', lead.id)
                        .single();

                    if (currentLead) {
                        const updatedData = {
                            ...(currentLead.customer_data || {}),
                            ...(snowZone ? {
                                snowZone: snowZone.zone,
                                snowLoad: snowZone.load,
                                snowZonePostalCode: postalCode,
                            } : {}),
                            formEmailSentAt: new Date().toISOString(),
                            formEmailSentFrom: BUERO_EMAIL,
                            formEmailSentTo: entry.email,
                            configuratorUrl: configuratorUrl || undefined,
                        };
                        await supabase.from('leads').update({
                            customer_data: updatedData,
                            status: 'formularz'
                        }).eq('id', lead.id);
                    }
                } catch (dbErr) {
                    console.error(`[Bulk Email] Failed to save tracking for ${lead.id}:`, dbErr);
                }

                updateEntry(lead.id, { status: 'success' });

            } catch (error: any) {
                console.error(`[Bulk Email] Failed for lead ${lead.id}:`, error);
                updateEntry(lead.id, { status: 'error', error: error.message || 'Nieznany błąd' });
            }

            // Wait between sends to avoid rate limits
            if (i < pendingEntries.length - 1 && !abortRef.current) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));
            }
        }

        setIsSending(false);
        setIsComplete(true);
        onComplete?.();
    };

    const handleAbort = () => {
        abortRef.current = true;
    };

    const handleClose = () => {
        if (isSending) {
            if (!window.confirm('Wysyłka w toku. Czy na pewno chcesz przerwać?')) return;
            abortRef.current = true;
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">📨</div>
                        <div>
                            <h3 className="text-xl font-bold">Masowa wysyłka maili powitalnych</h3>
                            <p className="text-blue-200 text-sm mt-1">
                                Automatyczna wysyłka z formularzem do nowych leadów
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
                            <span className="text-blue-500 font-bold text-lg">{pendingCount}</span>
                            <span className="text-xs text-blue-600 font-medium">Do wysłania</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                            <span className="text-emerald-500 font-bold text-lg">{successCount}</span>
                            <span className="text-xs text-emerald-600 font-medium">Wysłano</span>
                        </div>
                        {errorCount > 0 && (
                            <div className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-2">
                                <span className="text-red-500 font-bold text-lg">{errorCount}</span>
                                <span className="text-xs text-red-600 font-medium">Błędów</span>
                            </div>
                        )}
                        {skippedCount > 0 && (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <span className="text-slate-500 font-bold text-lg">{skippedCount}</span>
                                <span className="text-xs text-slate-600 font-medium">Pominiętych</span>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {(isSending || isComplete) && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Postęp wysyłki</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Lead List */}
                <div ref={listRef} className="p-4 flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
                    {entries.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p>Ładowanie listy leadów...</p>
                        </div>
                    ) : (
                        entries.map(entry => (
                            <div
                                key={entry.lead.id}
                                id={`bulk-email-${entry.lead.id}`}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                    entry.status === 'sending'
                                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                                        : entry.status === 'success'
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : entry.status === 'error'
                                                ? 'bg-red-50 border-red-200'
                                                : entry.status === 'skipped'
                                                    ? 'bg-slate-50 border-slate-200 opacity-60'
                                                    : 'bg-white border-slate-200'
                                }`}
                            >
                                {/* Status Icon */}
                                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full">
                                    {entry.status === 'pending' && (
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
                                    )}
                                    {entry.status === 'sending' && (
                                        <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    )}
                                    {entry.status === 'success' && (
                                        <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {entry.status === 'error' && (
                                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                    {entry.status === 'skipped' && (
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                        </svg>
                                    )}
                                </div>

                                {/* Lead Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-slate-800 truncate">
                                        {entry.lead.customerData?.firstName} {entry.lead.customerData?.lastName}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">
                                        {entry.email || 'Brak e-mail'}
                                        {entry.lead.customerData?.postalCode && (
                                            <span className="ml-2 text-slate-400">
                                                PLZ: {entry.lead.customerData.postalCode}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status Text */}
                                <div className="text-right flex-shrink-0">
                                    {entry.status === 'pending' && (
                                        <span className="text-xs text-slate-400 font-medium">Oczekuje</span>
                                    )}
                                    {entry.status === 'sending' && (
                                        <span className="text-xs text-blue-600 font-bold animate-pulse">Wysyłanie...</span>
                                    )}
                                    {entry.status === 'success' && (
                                        <span className="text-xs text-emerald-600 font-bold">✓ Wysłano</span>
                                    )}
                                    {entry.status === 'error' && (
                                        <span className="text-xs text-red-600 font-bold" title={entry.error}>Błąd</span>
                                    )}
                                    {entry.status === 'skipped' && (
                                        <span className="text-xs text-slate-400 font-medium">{entry.error}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Info Box */}
                {!isSending && !isComplete && pendingCount > 0 && (
                    <div className="px-4 pb-2 shrink-0">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs text-blue-700">
                                <strong>ℹ️ Co się stanie:</strong> Każdy lead otrzyma e-mail powitalny z
                                formularzem konfiguratora i informacją o strefie śniegowej.
                                Status leada zmieni się na "Formularz".
                                Wysyłka odbywa się sekwencyjnie z odstępem {DELAY_BETWEEN_EMAILS_MS / 1000}s.
                            </p>
                        </div>
                    </div>
                )}

                {/* Complete Summary */}
                {isComplete && (
                    <div className="px-4 pb-2 shrink-0">
                        <div className={`rounded-xl p-4 border ${errorCount > 0
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-emerald-50 border-emerald-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{errorCount > 0 ? '⚠️' : '🎉'}</span>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">
                                        {errorCount > 0
                                            ? `Wysyłka zakończona z ${errorCount} błędami`
                                            : 'Wszystkie maile wysłane pomyślnie!'
                                        }
                                    </p>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Wysłano: {successCount} | Błędy: {errorCount} | Pominięte: {skippedCount}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
                    {!isSending && !isComplete && (
                        <>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSendAll}
                                disabled={pendingCount === 0}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Wyślij do {pendingCount} leadów
                            </button>
                        </>
                    )}
                    {isSending && (
                        <button
                            onClick={handleAbort}
                            className="flex-1 py-3 px-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            Przerwij wysyłkę
                        </button>
                    )}
                    {isComplete && (
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Zamknij
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
