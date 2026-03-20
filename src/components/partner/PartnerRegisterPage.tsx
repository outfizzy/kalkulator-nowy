import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { UserRole } from '../../types';
import { LegalDocumentModal } from '../legal/LegalDocumentModal';
import {
  MANDATORY_CONSENTS,
  MARKETING_CONSENTS,
  RODO_CLAUSE,
  LEGAL_DOCS,
  type LegalDocType,
} from '../legal/LegalDocuments';
import {
  saveRegistrationConsents,
  getClientIP,
  type ConsentRecord,
} from '../../services/database/consent.service';

declare global {
  interface Window {
    grecaptcha?: {
      enterprise: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}
const RECAPTCHA_SITE_KEY = '6LeUWpAsAAAAAOy47DBuWpMAY1sAo3VO7O5D5KNl';

export const PartnerRegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
        phone: '', companyName: '', nip: '', role: 'b2b_partner' as UserRole,
    });
    const [loading, setLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const [mandatoryConsents, setMandatoryConsents] = useState<Record<string, boolean>>(
        Object.fromEntries(MANDATORY_CONSENTS.map(c => [c.id, false]))
    );
    const [marketingConsents, setMarketingConsents] = useState<Record<string, boolean>>(
        Object.fromEntries(MARKETING_CONSENTS.map(c => [c.id, false]))
    );
    const [openDoc, setOpenDoc] = useState<LegalDocType | null>(null);
    const [showMarketing, setShowMarketing] = useState(false);
    const allMandatoryChecked = MANDATORY_CONSENTS.every(c => mandatoryConsents[c.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { toast.error('Hasła nie są identyczne'); return; }
        if (formData.password.length < 8) { toast.error('Hasło musi mieć minimum 8 znaków'); return; }
        if (!allMandatoryChecked) { toast.error('Zaznacz wszystkie wymagane zgody.'); return; }

        setLoading(true);
        try {
            if (window.grecaptcha?.enterprise) {
                const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action: 'register_b2b' });
                if (!token) { toast.error('Weryfikacja reCAPTCHA nie powiodła się.'); setLoading(false); return; }
            }
            const ipAddress = await getClientIP();
            const { error, user } = await register({ ...formData }) as any;
            if (error) throw error;

            if (user?.id) {
                const consents: ConsentRecord[] = [
                    ...MANDATORY_CONSENTS.map(c => ({
                        consent_type: c.id, consent_given: true, consent_text: c.fullText,
                        document_version: c.docKey ? LEGAL_DOCS[c.docKey].version : '1.0',
                    })),
                    ...MARKETING_CONSENTS.map(c => ({
                        consent_type: c.id, consent_given: marketingConsents[c.id] || false,
                        consent_text: c.fullText, document_version: '1.0',
                    })),
                ];
                await saveRegistrationConsents(user.id, consents, ipAddress);
            }
            setShowSuccessMessage(true);
            setTimeout(() => navigate('/login'), 8000);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Błąd rejestracji.';
            toast.error(message);
        } finally { setLoading(false); }
    };

    const inputCls = "w-full px-3.5 py-2.5 bg-black/30 border border-emerald-500/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/20 transition-all text-sm";

    if (showSuccessMessage) {
        return (
            <div className="min-h-screen bg-[#080d16] flex items-center justify-center p-4 relative">
                <div className="absolute top-[-200px] left-[10%] w-[700px] h-[700px] bg-emerald-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-500/10 p-8">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/15 mb-4">
                                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Wniosek przyjęty!</h2>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mt-6">
                                <p className="text-emerald-300 text-sm leading-relaxed">
                                    Dziękujemy za rejestrację w Strefie Partnera B2B.
                                    Twoje konto oczekuje na weryfikację (do <strong className="text-emerald-200">24h</strong>).
                                </p>
                            </div>
                            <p className="text-slate-500 mt-6 text-sm">Przekierowanie do logowania...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080d16] flex flex-col items-center justify-start py-6 px-4 relative overflow-y-auto">
            {/* Ambient effects */}
            <div className="absolute top-[-200px] left-[10%] w-[700px] h-[700px] bg-emerald-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-100px] right-[15%] w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
            }} />

            {/* Logo */}
            <div className="relative z-10 mb-5">
                <img src="/logo.png" alt="PolenDach 24" className="h-10 w-auto brightness-0 invert opacity-90" />
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.02] backdrop-blur-xl rounded-2xl border border-emerald-500/10 p-6 shadow-2xl shadow-black/20">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/10">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Rejestracja Partnera B2B</h2>
                            <p className="text-xs text-slate-500">Utwórz konto firmowe w systemie hurtowym</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Company */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Dane Firmy</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Nazwa Firmy *</label>
                                    <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        required className={inputCls} placeholder="Firma Sp. z o.o." disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">NIP</label>
                                    <input type="text" value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                        className={inputCls} placeholder="1234567890" disabled={loading} />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="pt-2 border-t border-emerald-500/[0.06] space-y-2">
                            <label className="block text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Osoba kontaktowa</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Imię *</label>
                                    <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required className={inputCls} placeholder="Jan" disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Nazwisko *</label>
                                    <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required className={inputCls} placeholder="Kowalski" disabled={loading} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Adres email *</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required className={inputCls} placeholder="biuro@twojafirma.pl" disabled={loading} autoComplete="email" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Telefon *</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required className={inputCls} placeholder="+48 123 456 789" disabled={loading} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Hasło *</label>
                                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required minLength={8} className={inputCls} placeholder="••••••••" disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Potwierdź hasło *</label>
                                    <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required className={inputCls} placeholder="••••••••" disabled={loading} />
                                </div>
                            </div>
                        </div>

                        {/* Mandatory Consents */}
                        <div className="pt-2 border-t border-emerald-500/[0.06] space-y-1.5">
                            <label className="block text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Zgody obowiązkowe</label>
                            {MANDATORY_CONSENTS.map(consent => (
                                <label key={consent.id}
                                    className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs border ${
                                        mandatoryConsents[consent.id]
                                            ? 'bg-emerald-500/[0.06] border-emerald-500/15 text-slate-300'
                                            : 'bg-black/20 border-transparent hover:border-emerald-500/10 text-slate-400'
                                    }`}
                                >
                                    <input type="checkbox" checked={mandatoryConsents[consent.id] || false}
                                        onChange={() => setMandatoryConsents(prev => ({ ...prev, [consent.id]: !prev[consent.id] }))}
                                        className="w-3.5 h-3.5 mt-0.5 text-emerald-500 bg-black/30 border-slate-600 rounded focus:ring-emerald-500/30 cursor-pointer flex-shrink-0" />
                                    <span className="leading-snug">
                                        {consent.linkText ? (
                                            <>
                                                {consent.label}{' '}
                                                <button type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenDoc(consent.docKey!); }}
                                                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium transition-colors">
                                                    {consent.linkText}
                                                </button>
                                                {consent.id === 'regulamin' && ' i akceptuję jego treść.'}
                                                {consent.id === 'privacy_policy' && '.'}
                                            </>
                                        ) : consent.label}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Marketing Consents — collapsible */}
                        <div className="space-y-1.5">
                            <button type="button" onClick={() => setShowMarketing(!showMarketing)}
                                className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500/60 uppercase tracking-wider hover:text-slate-400 transition-colors">
                                <svg className={`w-3 h-3 transition-transform ${showMarketing ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                Zgody marketingowe (dobrowolne)
                            </button>
                            {showMarketing && (
                                <div className="space-y-1.5">
                                    {MARKETING_CONSENTS.map(consent => (
                                        <label key={consent.id}
                                            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] border ${
                                                marketingConsents[consent.id]
                                                    ? 'bg-blue-500/5 border-blue-500/15 text-slate-400'
                                                    : 'bg-black/10 border-transparent hover:border-white/[0.06] text-slate-500'
                                            }`}
                                        >
                                            <input type="checkbox" checked={marketingConsents[consent.id] || false}
                                                onChange={() => setMarketingConsents(prev => ({ ...prev, [consent.id]: !prev[consent.id] }))}
                                                className="w-3.5 h-3.5 mt-0.5 text-blue-500 bg-black/30 border-slate-700 rounded focus:ring-blue-500/30 cursor-pointer flex-shrink-0" />
                                            <span className="leading-snug">{consent.label}</span>
                                        </label>
                                    ))}
                                    <p className="text-[10px] text-slate-600/50 px-3">Zgody marketingowe mogą zostać wycofane w każdym czasie.</p>
                                </div>
                            )}
                        </div>

                        {/* RODO clause */}
                        <div className="px-3 py-2 bg-black/20 rounded-lg border border-white/[0.03]">
                            <p className="text-[9px] text-slate-600/50 leading-relaxed">{RODO_CLAUSE}</p>
                        </div>

                        {/* reCAPTCHA */}
                        <div className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-emerald-500/10">
                            <svg className="w-4 h-4 text-emerald-400/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <span className="text-[11px] text-slate-500">Chronione przez reCAPTCHA Enterprise</span>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading || !allMandatoryChecked}
                            className="w-full text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/15 text-sm active:scale-[0.98]">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    Przetwarzanie...
                                </span>
                            ) : 'Zarejestruj Firmę'}
                        </button>

                        {!allMandatoryChecked && (
                            <p className="text-[11px] text-amber-400/50 text-center">Zaznacz wszystkie wymagane zgody, aby kontynuować.</p>
                        )}
                    </form>

                    {/* Login link */}
                    <div className="mt-4 pt-3 border-t border-emerald-500/10 text-center">
                        <button onClick={() => navigate('/login')}
                            className="text-emerald-400/80 hover:text-emerald-400 text-sm font-medium transition-colors">
                            Masz już konto? <span className="underline underline-offset-2">Zaloguj się</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 mt-4 text-center">
                <p className="text-slate-600 text-xs">© 2026 Polendach24 s.c. · <a href="mailto:buero@polendach24.de" className="text-slate-500 hover:text-emerald-400 transition-colors">buero@polendach24.de</a></p>
            </div>

            {openDoc && <LegalDocumentModal docKey={openDoc} onClose={() => setOpenDoc(null)} />}
        </div>
    );
};

export default PartnerRegisterPage;
