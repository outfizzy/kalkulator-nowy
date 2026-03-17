import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LeadService } from '../../services/database/lead.service';
import { GeocodingService } from '../../services/geocoding.service';
import { StructuralZonesService } from '../../services/structural-zones.service';
import { StructuralZoneBadge } from '../common/StructuralZoneBadge';
import type { Lead, LeadStatus, LeadSource } from '../../types';

interface LeadFormProps {
    initialData?: Partial<Lead>;
    onSuccess?: () => void;
    onCancel?: () => void;
    embedded?: boolean; // If true, rendering inside another component (e.g. Mail)
    isEditMode?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ initialData, onSuccess, onCancel, embedded, isEditMode = false }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const cityManuallyEdited = useRef(false);
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const [dupChecking, setDupChecking] = useState(false);
    const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        firstName: initialData?.customerData?.firstName || '',
        lastName: initialData?.customerData?.lastName || '',
        companyName: initialData?.customerData?.companyName || '',
        email: initialData?.customerData?.email || '',
        phone: initialData?.customerData?.phone || '',
        address: initialData?.customerData?.address || '',
        postalCode: initialData?.customerData?.postalCode || '',
        city: initialData?.customerData?.city || '',
        status: initialData?.status || 'new' as LeadStatus,
        source: initialData?.source || 'manual' as LeadSource,
        notes: initialData?.notes || '',
        clientWillContactAt: initialData?.clientWillContactAt ? new Date(initialData.clientWillContactAt).toISOString().slice(0, 16) : '',
    });

    // Auto-fill city from postal code via Google Geocoding
    useEffect(() => {
        const plz = formData.postalCode.trim();
        if (!plz || cityManuallyEdited.current) return;

        const country = GeocodingService.detectCountryFromPLZ(plz);
        setGeoLoading(true);

        GeocodingService.lookupCity(plz, country, 'leadForm').then(result => {
            setGeoLoading(false);
            if (result?.city && !cityManuallyEdited.current) {
                setFormData(prev => ({ ...prev, city: result.city }));
            }
        });
    }, [formData.postalCode]);

    // Duplicate detection (debounced)
    useEffect(() => {
        if (isEditMode) return; // Only check in create mode

        if (dupTimerRef.current) clearTimeout(dupTimerRef.current);

        const { email, phone, lastName, city } = formData;
        const hasEmail = email && email.includes('@') && email.length > 3;
        const hasPhone = phone && phone.replace(/[\s\-()]/g, '').length > 5;
        const hasNameCity = lastName && lastName.length > 1 && city && city.length > 1;

        if (!hasEmail && !hasPhone && !hasNameCity) {
            setDuplicates([]);
            return;
        }

        dupTimerRef.current = setTimeout(async () => {
            setDupChecking(true);
            try {
                const results = await LeadService.checkDuplicates({
                    email: hasEmail ? email : undefined,
                    phone: hasPhone ? phone : undefined,
                    lastName: hasNameCity ? lastName : undefined,
                    city: hasNameCity ? city : undefined,
                });
                setDuplicates(results);
            } catch (err) {
                console.warn('[DuplicateCheck] Error:', err);
                setDuplicates([]);
            } finally {
                setDupChecking(false);
            }
        }, 500);

        return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current); };
    }, [formData.email, formData.phone, formData.lastName, formData.city, isEditMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode && initialData?.id) {
                await LeadService.updateLead(initialData.id, {
                    status: formData.status,
                    source: formData.source,
                    customerData: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        companyName: formData.companyName,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        city: formData.city,
                        postalCode: formData.postalCode,
                        ...(formData.postalCode ? (() => {
                            const zones = StructuralZonesService.getZones(formData.postalCode);
                            if (!zones) return {};
                            return {
                                windZone: `WZ${zones.wind.zone}`,
                                snowZone: `SLZ${zones.snow.zone}`,
                                structuralRecommendation: zones.recommendation,
                                windSpeedKmh: zones.wind.speedKmh,
                                snowLoadKn: zones.snow.loadKn,
                            };
                        })() : {}),
                    },
                    notes: formData.notes,
                    clientWillContactAt: formData.clientWillContactAt ? new Date(formData.clientWillContactAt) : undefined,
                });
                toast.success('Lead erfolgreich aktualisiert!');
            } else {
                await LeadService.createLead({
                    status: formData.status,
                    source: formData.source,
                    customerData: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        companyName: formData.companyName,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        city: formData.city,
                        postalCode: formData.postalCode,
                        ...(formData.postalCode ? (() => {
                            const zones = StructuralZonesService.getZones(formData.postalCode);
                            if (!zones) return {};
                            return {
                                windZone: `WZ${zones.wind.zone}`,
                                snowZone: `SLZ${zones.snow.zone}`,
                                structuralRecommendation: zones.recommendation,
                                windSpeedKmh: zones.wind.speedKmh,
                                snowLoadKn: zones.snow.loadKn,
                            };
                        })() : {}),
                    },
                    notes: formData.notes,
                    emailMessageId: initialData?.emailMessageId,
                    lastContactDate: new Date(),
                    clientWillContactAt: formData.clientWillContactAt ? new Date(formData.clientWillContactAt) : undefined,
                    attachments: initialData?.attachments || []
                });
                toast.success('Lead erfolgreich erstellt!');
            }

            if (onSuccess) {
                onSuccess();
            } else if (!embedded) {
                navigate('/leads');
            }
        } catch (error) {
            console.error('Error creating lead:', error);
            toast.error('Fehler beim Speichern des Leads');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl ${embedded ? '' : 'shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto'}`}>
            {!embedded && <h2 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Lead bearbeiten' : 'Neuer Lead'}</h2>}

            {/* AI Estimated Price Badge */}
            {(initialData as any)?.estimatedPrice && (
                <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">💰</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">AI-Kostenschätzung</p>
                        <p className="text-lg font-bold text-emerald-700">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((initialData as any).estimatedPrice)}
                            <span className="text-xs font-normal text-emerald-600 ml-2">UPE netto (ca.)</span>
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
                        <input
                            type="text"
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.firstName}
                            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
                        <input
                            type="text"
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.lastName}
                            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Firma (optional)</label>
                    <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                        value={formData.companyName}
                        onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                </div>

                {/* Address Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Adresse (Straße & Nr.)</label>
                        <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.address}
                            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">PLZ</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="z.B. 14974"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent pr-8"
                                value={formData.postalCode}
                                onChange={e => {
                                    cityManuallyEdited.current = false;
                                    setFormData(prev => ({ ...prev, postalCode: e.target.value }));
                                }}
                            />
                            {geoLoading && (
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Ort
                            {formData.city && !cityManuallyEdited.current && formData.postalCode && (
                                <span className="ml-1.5 text-xs text-emerald-500 font-normal">✓ auto</span>
                            )}
                        </label>
                        <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.city}
                            onChange={e => {
                                cityManuallyEdited.current = true;
                                setFormData(prev => ({ ...prev, city: e.target.value }));
                            }}
                        />
                    </div>
                </div>

                {/* Structural Zone Badges — DIN EN 1991 */}
                {formData.postalCode && formData.postalCode.replace(/\s/g, '').length === 5 && (
                    <StructuralZoneBadge zones={StructuralZonesService.getZones(formData.postalCode)} compact />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                        <input
                            type="email"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.email}
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                        <input
                            type="tel"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    </div>
                </div>

                {/* ===== DUPLICATE WARNING BANNER ===== */}
                {!isEditMode && duplicates.length > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-800 mb-2">
                                    ⚠️ Mögliche Duplikate gefunden ({duplicates.length})
                                </p>
                                <div className="space-y-2">
                                    {duplicates.map((dup, i) => (
                                        <div key={`${dup.type}-${dup.id}-${i}`} className="bg-white/70 rounded-lg border border-amber-200 p-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Type badge */}
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                    dup.type === 'lead' 
                                                        ? 'bg-blue-100 text-blue-700' 
                                                        : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                    {dup.type === 'lead' ? 'Lead' : 'Kunde'}
                                                </span>
                                                {/* Match type */}
                                                <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                                                    {dup.matchOn === 'email' ? '📧 E-Mail' : dup.matchOn === 'phone' ? '📞 Telefon' : '👤 Name+Ort'}
                                                </span>
                                                {/* Status */}
                                                {dup.status && (
                                                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                        {dup.status}
                                                    </span>
                                                )}
                                                {/* Assignee */}
                                                {dup.assigneeName && (
                                                    <span className="text-[10px] text-slate-500">→ {dup.assigneeName}</span>
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex items-center gap-3">
                                                <a
                                                    href={dup.type === 'lead' ? `/leads/${dup.id}` : `/customers/${dup.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-semibold text-amber-900 hover:text-blue-700 hover:underline transition-colors"
                                                >
                                                    {dup.name}
                                                </a>
                                                {dup.email && (
                                                    <span className="text-xs text-slate-500 font-mono truncate">{dup.email}</span>
                                                )}
                                                {dup.phone && (
                                                    <span className="text-xs text-slate-500 font-mono">{dup.phone}</span>
                                                )}
                                            </div>
                                            {dup.createdAt && (
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Erstellt: {new Date(dup.createdAt).toLocaleDateString('de-DE')}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-amber-600 mt-2 italic">
                                    Sie können trotzdem speichern — dies ist nur eine Warnung.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {!isEditMode && dupChecking && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        Prüfe auf Duplikate...
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent bg-white"
                            value={formData.status}
                            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                        >
                            <option value="new">Neu</option>
                            <option value="contacted">Kontaktiert</option>
                            <option value="offer_sent">Angebot gesendet</option>
                            <option value="negotiation">Verhandlung</option>
                            <option value="won">Gewonnen</option>
                            <option value="lost">Verloren</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quelle</label>
                        <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent bg-white"
                            value={formData.source}
                            onChange={e => setFormData(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                        >
                            <option value="manual">Manuelle Eingabe</option>
                            <option value="email">E-Mail</option>
                            <option value="phone">Telefon</option>
                            <option value="website">Webseite</option>
                            <option value="other">Sonstiges</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kunde meldet sich (Datum)</label>
                    <input
                        type="datetime-local"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                        value={formData.clientWillContactAt}
                        onChange={e => setFormData(prev => ({ ...prev, clientWillContactAt: e.target.value }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">Bei Angabe eines Datums wird automatisch eine Aufgabe "Kundenkontakt" erstellt.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notizen</label>
                    <textarea
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent min-h-[100px]"
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Zusätzliche Informationen..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 items-center">
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={() => {
                                // Navigate to new offer with customer data pre-filled
                                navigate('/new-offer', {
                                    state: {
                                        firstName: formData.firstName,
                                        lastName: formData.lastName,
                                        email: formData.email,
                                        phone: formData.phone,
                                        companyName: formData.companyName,
                                    }
                                });
                            }}
                            className="mr-auto px-4 py-2 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            In Angebot umwandeln
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onCancel || (() => navigate('/leads'))}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        disabled={loading}
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                        disabled={loading}
                    >
                        {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".3" /><path fill="currentColor" d="M20 12a8 8 0 0 0-8-8V2a10 10 0 0 1 10 10Z" /></svg>}
                        {isEditMode ? 'Änderungen speichern' : 'Lead speichern'}
                    </button>
                </div>
            </form>
        </div>
    );
};
