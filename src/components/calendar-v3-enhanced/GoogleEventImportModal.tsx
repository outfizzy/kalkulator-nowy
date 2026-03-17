import React, { useState } from 'react';
import type { GoogleCalendarEvent } from './GoogleCalendarImportPanel';
import { DatabaseService } from '../../services/database';
import { InstallationService } from '../../services/database/installation.service';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import toast from 'react-hot-toast';

interface GoogleEventImportModalProps {
    event: GoogleCalendarEvent;
    onClose: () => void;
    onImported: () => void;
}

export const GoogleEventImportModal: React.FC<GoogleEventImportModalProps> = ({
    event,
    onClose,
    onImported,
}) => {
    const hasMatch = !!event.match;
    const p = event.parsedData;

    // Form state — pre-filled from AI parsing
    const [form, setForm] = useState({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        city: p.city || '',
        address: p.address || '',
        postalCode: p.postalCode || '',
        phone: p.phone || '',
        email: p.email || '',
        contractNumber: p.contractNumber || '',
        productSummary: p.productSummary || '',
        eventType: p.eventType || 'montaz',
        notes: p.notes || '',
        durationDays: p.durationDays || 1,
    });

    const [saving, setSaving] = useState(false);
    const [createContract, setCreateContract] = useState(!hasMatch);

    const eventDate = event.googleEvent.start?.date || event.googleEvent.start?.dateTime?.split('T')[0] || '';

    const handleChange = (field: string, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleImport = async () => {
        setSaving(true);
        const toastId = toast.loading('Importowanie...');

        try {
            let customerId = event.match?.customerId;
            let contractId = event.match?.contractId;

            // Step 1: Create customer if no match
            if (!customerId) {
                if (!form.lastName) {
                    toast.error('Podaj przynajmniej nazwisko klienta', { id: toastId });
                    setSaving(false);
                    return;
                }

                const sb = DatabaseService.getClient();
                const { data: newCustomer, error: custErr } = await sb
                    .from('customers')
                    .insert({
                        first_name: form.firstName,
                        last_name: form.lastName,
                        city: form.city,
                        address: form.address,
                        postal_code: form.postalCode,
                        phone: form.phone,
                        email: form.email,
                        source: 'google_calendar',
                    })
                    .select('id')
                    .single();

                if (custErr || !newCustomer) {
                    console.error('Customer creation error:', custErr);
                    toast.error('Błąd tworzenia klienta', { id: toastId });
                    setSaving(false);
                    return;
                }

                customerId = newCustomer.id;
            }

            // Step 2: Create contract if requested
            if (createContract && !contractId) {
                const sb = DatabaseService.getClient();

                // Auto-generate contract number if not provided
                const contractNumber = form.contractNumber ||
                    `GC/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

                const { data: newContract, error: contractErr } = await sb
                    .from('contracts')
                    .insert({
                        customer_id: customerId,
                        contract_number: contractNumber,
                        contract_date: eventDate || new Date().toISOString().split('T')[0],
                        product_summary: form.productSummary || event.googleEvent.summary || 'Import z Google Calendar',
                        status: 'active',
                        notes: `Import z Google Calendar: ${event.googleEvent.summary}\n${form.notes || ''}`.trim(),
                    })
                    .select('id')
                    .single();

                if (contractErr || !newContract) {
                    console.error('Contract creation error:', contractErr);
                    toast.error('Błąd tworzenia umowy (klient został utworzony)', { id: toastId });
                    setSaving(false);
                    return;
                }

                contractId = newContract.id;
            }

            // Step 3: Create installation
            const sourceType = form.eventType === 'serwis' ? 'service'
                : form.eventType === 'dokończenie' ? 'followup'
                : 'contract';

            const installationData = {
                customerId: customerId,
                contractNumber: form.contractNumber || undefined,
                sourceType: sourceType as 'contract' | 'service' | 'manual' | 'followup',
                sourceId: contractId || undefined,
                client: {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    city: form.city,
                    address: form.address,
                    postalCode: form.postalCode,
                    phone: form.phone,
                    email: form.email,
                },
                productSummary: form.productSummary || event.googleEvent.summary || 'Import z Google Calendar',
                scheduledDate: eventDate,
                expectedDuration: form.durationDays,
                notes: form.notes || `Import z Google Calendar: ${event.googleEvent.summary}`,
                status: 'scheduled' as const,
                google_event_id: event.googleEvent.id,
            };

            await InstallationService.createManualInstallation(installationData);

            // Step 4: Update Google Calendar event with CRM link
            // This is fire-and-forget — we mark it so it won't show up in next import
            try {
                const sb = DatabaseService.getClient();
                const { data: inst } = await sb
                    .from('installations')
                    .select('id')
                    .eq('google_event_id', event.googleEvent.id)
                    .single();

                if (inst) {
                    await GoogleCalendarService.syncInstallation(
                        { ...installationData, id: inst.id, createdAt: new Date() } as any,
                        event.googleEvent.id,
                    );
                }
            } catch {
                // Non-blocking
            }

            toast.success(
                hasMatch
                    ? 'Event połączony z istniejącym klientem! ✅'
                    : 'Klient, umowa i montaż utworzone! 🎉',
                { id: toastId }
            );

            onImported();
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(`Błąd importu: ${err.message}`, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between ${
                    hasMatch ? 'bg-green-600' : 'bg-amber-500'
                } text-white`}>
                    <div>
                        <h3 className="font-bold text-lg">
                            {hasMatch ? '🔗 Połącz z klientem' : '🆕 Dodaj do systemu'}
                        </h3>
                        <p className="text-sm opacity-80">{event.googleEvent.summary}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
                    >✕</button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Google Event Info */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Google Calendar Event</p>
                        <p className="text-sm font-bold text-slate-800">{event.googleEvent.summary}</p>
                        {event.googleEvent.location && (
                            <p className="text-xs text-slate-500 mt-0.5">📍 {event.googleEvent.location}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">📅 {eventDate}</p>
                    </div>

                    {/* Match info */}
                    {hasMatch && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-green-700">✅ Znaleziono w bazie:</p>
                            <p className="text-sm text-green-800 font-medium">{event.match!.customerName}</p>
                            {event.match!.contractNumber && (
                                <p className="text-xs text-green-600">Umowa: {event.match!.contractNumber}</p>
                            )}
                        </div>
                    )}

                    {/* Customer Data */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">👤 Dane klienta</p>
                        <div className="grid grid-cols-2 gap-3">
                            <InputField label="Imię" value={form.firstName} onChange={v => handleChange('firstName', v)} disabled={hasMatch} />
                            <InputField label="Nazwisko *" value={form.lastName} onChange={v => handleChange('lastName', v)} disabled={hasMatch} />
                            <InputField label="Miasto" value={form.city} onChange={v => handleChange('city', v)} disabled={hasMatch} />
                            <InputField label="Kod pocztowy" value={form.postalCode} onChange={v => handleChange('postalCode', v)} disabled={hasMatch} />
                            <InputField label="Adres" value={form.address} onChange={v => handleChange('address', v)} className="col-span-2" disabled={hasMatch} />
                            <InputField label="Telefon" value={form.phone} onChange={v => handleChange('phone', v)} disabled={hasMatch} />
                            <InputField label="Email" value={form.email} onChange={v => handleChange('email', v)} disabled={hasMatch} />
                        </div>
                    </div>

                    {/* Contract & Product */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">📄 Umowa & Produkt</p>

                        {!hasMatch && (
                            <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={createContract}
                                    onChange={e => setCreateContract(e.target.checked)}
                                    className="rounded text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-slate-700">Utwórz umowę</span>
                            </label>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <InputField
                                label="Nr umowy"
                                value={form.contractNumber}
                                onChange={v => handleChange('contractNumber', v)}
                                placeholder="np. UM/2025/03/001"
                                disabled={!!event.match?.contractNumber}
                            />
                            <InputField
                                label="Produkt"
                                value={form.productSummary}
                                onChange={v => handleChange('productSummary', v)}
                                placeholder="np. Trendstyle 4000x3000"
                            />
                        </div>
                    </div>

                    {/* Installation Details */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">🏗️ Montaż</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] text-slate-500 font-medium block mb-1">Typ</label>
                                <select
                                    value={form.eventType}
                                    onChange={e => handleChange('eventType', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="montaz">🏗️ Montaż</option>
                                    <option value="serwis">🔧 Serwis</option>
                                    <option value="dokończenie">🔄 Dokończenie</option>
                                </select>
                            </div>
                            <InputField
                                label="Data"
                                value={eventDate}
                                onChange={() => {}}
                                disabled
                            />
                            <InputField
                                label="Dni"
                                value={String(form.durationDays)}
                                onChange={v => handleChange('durationDays', parseInt(v) || 1)}
                                type="number"
                            />
                        </div>
                        <div className="mt-3">
                            <InputField
                                label="Notatki"
                                value={form.notes}
                                onChange={v => handleChange('notes', v)}
                                multiline
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={saving}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg ${
                            hasMatch
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-amber-500 hover:bg-amber-600'
                        } disabled:opacity-50`}
                    >
                        {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {saving ? 'Importowanie...' : hasMatch ? '🔗 Połącz i utwórz montaż' : '🆕 Utwórz klienta + umowę + montaż'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Reusable Input Field ---

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    type?: string;
    multiline?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder, disabled, className, type, multiline }) => (
    <div className={className}>
        <label className="text-[10px] text-slate-500 font-medium block mb-1">{label}</label>
        {multiline ? (
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-slate-100 disabled:text-slate-400 resize-none"
            />
        ) : (
            <input
                type={type || 'text'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
        )}
    </div>
);
