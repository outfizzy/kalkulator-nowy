import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { generateLeadSalesEmailHtml, getSnowZoneByPostalCode } from './leadSalesEmailTemplate';
import { supabase } from '../../lib/supabase';
import { ConfiguratorService } from '../../services/database/configurator.service';

interface SnowZoneEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSent?: () => void;
    to: string;
    leadData: {
        firstName?: string;
        lastName?: string;
        postalCode?: string;
        city?: string;
    };
    leadId?: string;
    customerId?: string;
}

export const SnowZoneEmailModal: React.FC<SnowZoneEmailModalProps> = ({
    isOpen, onClose, onSent, to, leadData, leadId, customerId
}) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [snowZone, setSnowZone] = useState<{ zone: string; load: string } | null>(null);
    const [postalCode, setPostalCode] = useState(leadData.postalCode || '');
    const [previewHtml, setPreviewHtml] = useState('');
    const [showPreview, setShowPreview] = useState(false);


    // Auto-detect snow zone when postal code changes
    useEffect(() => {
        if (postalCode && postalCode.length >= 2) {
            const result = getSnowZoneByPostalCode(postalCode);
            setSnowZone(result);
        } else {
            setSnowZone(null);
        }
    }, [postalCode]);

    // Pre-fill postal code from lead data
    useEffect(() => {
        if (isOpen && leadData.postalCode) {
            setPostalCode(leadData.postalCode);
        }
    }, [isOpen, leadData.postalCode]);

    if (!isOpen) return null;

    const customerName = [leadData.firstName, leadData.lastName].filter(Boolean).join(' ') || 'Kunde';
    const BUERO_EMAIL = 'buero@polendach24.de';

    // Find buero mailbox from user's mailboxes or emailConfig
    const mailboxes = currentUser?.mailboxes || [];
    const bueroMailbox = mailboxes.find((mb: any) =>
        (mb.smtpUser || mb.email || '').toLowerCase() === BUERO_EMAIL
    );
    const bueroConfig = bueroMailbox || (
        (currentUser?.emailConfig?.smtpUser || '').toLowerCase() === BUERO_EMAIL
            ? currentUser?.emailConfig
            : null
    );

    const generatePreview = () => {
        const html = generateLeadSalesEmailHtml({
            customerName,
            postalCode,
            snowZone: snowZone?.zone,
            snowLoad: snowZone?.load
        });
        setPreviewHtml(html);
        setShowPreview(true);
    };

    const handleSend = async () => {
        if (!to) {
            toast.error('Brak adresu e-mail klienta');
            return;
        }

        setLoading(true);
        try {
            // Generate configurator link if we have a lead ID
            let configuratorUrl = '';
            if (leadId) {
                try {
                    const linkResult = await ConfiguratorService.createLink(leadId);
                    configuratorUrl = linkResult.url;
                } catch (linkErr) {
                    console.warn('Could not generate configurator link:', linkErr);
                }
            }

            const html = generateLeadSalesEmailHtml({
                customerName,
                postalCode,
                snowZone: snowZone?.zone,
                snowLoad: snowZone?.load,
                configuratorUrl,
            });

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser?.id,
                    to,
                    subject: 'Polendach24 - erster Kontakt',
                    body: html,
                    // Use buero config if found in user's mailboxes, otherwise shared
                    ...(bueroConfig?.smtpHost
                        ? { config: bueroConfig }
                        : { useSharedConfig: true }),
                    saveToSent: true,
                    leadId,
                    customerId,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Save snow zone + email sent tracking to lead's customer_data
            if (leadId) {
                try {
                    const { data: currentLead } = await supabase
                        .from('leads')
                        .select('customer_data')
                        .eq('id', leadId)
                        .single();

                    if (currentLead) {
                        const updatedData = {
                            ...(currentLead.customer_data || {}),
                            ...(snowZone ? {
                                snowZone: snowZone.zone,
                                snowLoad: snowZone.load,
                                snowZonePostalCode: postalCode,
                            } : {}),
                            // Email tracking
                            formEmailSentAt: new Date().toISOString(),
                            formEmailSentFrom: BUERO_EMAIL,
                            formEmailSentTo: to,
                            configuratorUrl: configuratorUrl || undefined,
                        };
                        await supabase.from('leads').update({
                            customer_data: updatedData,
                            status: 'formularz'
                        }).eq('id', leadId);
                    }
                } catch (err) {
                    console.error('Failed to save email tracking to lead:', err);
                }
            }

            toast.success(
                `Formularz wysłany z ${BUERO_EMAIL} do ${to}`,
                { duration: 5000 }
            );
            onClose();
            onSent?.();
        } catch (error: any) {
            console.error('Send email error:', error);
            toast.error('Fehler: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">❄️</div>
                        <div>
                            <h3 className="text-xl font-bold">Schneelast-Projektbestätigung</h3>
                            <p className="text-blue-200 text-sm mt-1">Automatische Zonenerkennung & E-Mail</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Empfänger</label>
                            <p className="text-slate-900 font-medium">{customerName}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">E-Mail</label>
                            <p className="text-slate-900 font-medium truncate">{to || '—'}</p>
                        </div>
                    </div>

                    {/* Postal Code Input */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Postleitzahl (PLZ)</label>
                        <input
                            type="text"
                            value={postalCode}
                            onChange={e => setPostalCode(e.target.value.replace(/\D/g, '').substring(0, 5))}
                            placeholder="z.B. 01234"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-mono tracking-wider"
                        />
                    </div>

                    {/* Snow Zone Result */}
                    {snowZone && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Schneelastzone</p>
                                    <p className="text-3xl font-bold text-blue-900 mt-1">Zone {snowZone.zone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Schneelast</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{snowZone.load} <span className="text-sm font-normal">kN/m²</span></p>
                                </div>
                            </div>
                            <p className="text-blue-700 text-xs mt-3">PLZ {postalCode} • gem. DIN EN 1991-1-3/NA</p>
                        </div>
                    )}

                    {/* Sender — always buero@polendach24.de */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Absender (Von)</label>
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-mono font-semibold text-blue-700">
                                {BUERO_EMAIL}
                            </span>
                            <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold">FIXED</span>
                        </div>
                    </div>

                    {/* What will be sent */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Inhalt der E-Mail</p>
                        <ul className="space-y-2 text-sm text-slate-700">
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span> Dank für die Anfrage
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span> Schneelastzone {snowZone ? `${snowZone.zone} (${snowZone.load} kN/m²)` : '...'}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span> Statische Berechnung wird erstellt
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500 font-bold">★</span> <strong>Konfigurator-Link</strong> zum Ausfüllen durch den Kunden
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span> Bitte um Konfiguration (Modell, Maße, Extras)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">✓</span> Team-Kontaktdaten (Oliwia, Mike, Hubert)
                            </li>
                        </ul>
                    </div>

                    {/* Preview (collapsible) */}
                    {showPreview && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between bg-slate-100 px-4 py-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Vorschau</span>
                                <button onClick={() => setShowPreview(false)} className="text-xs text-slate-400 hover:text-slate-600">Schließen</button>
                            </div>
                            <iframe
                                srcDoc={previewHtml}
                                title="E-Mail Vorschau"
                                className="w-full border-0"
                                style={{ height: '400px' }}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
                    <button
                        onClick={generatePreview}
                        className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Vorschau
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={loading || !to || !snowZone}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                        {loading ? 'Senden...' : 'E-Mail senden'}
                    </button>
                </div>
            </div>
        </div>
    );
};
