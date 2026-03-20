/**
 * B2B Partner Profile / Ustawienia
 * Edycja danych firmy, upload logo, zmiana hasła, warunki handlowe
 */

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BPartner } from '../../services/database/b2b.service';
import { useAuth } from '../../contexts/AuthContext';

const MAX_LOGO_SIZE = 400;

function resizeImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target?.result as string; };
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
                if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
                else { width = Math.round((width * maxSize) / height); height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); }, 'image/png', 0.9);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

export function B2BProfilePage() {
    const { currentUser } = useAuth();
    const [partner, setPartner] = useState<B2BPartner | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [activeTab, setActiveTab] = useState<'company' | 'account' | 'conditions'>('company');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editable form state
    const [form, setForm] = useState({
        company_name: '',
        contact_email: '',
        contact_phone: '',
        tax_id: '',
        street: '',
        zip: '',
        city: '',
        country: '',
    });

    // Password form
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

    useEffect(() => { loadPartner(); }, []);

    async function loadPartner() {
        setLoading(true);
        try {
            const p = await B2BService.getCurrentPartner();
            setPartner(p);
            if (p) {
                setForm({
                    company_name: p.company_name || '',
                    contact_email: p.contact_email || '',
                    contact_phone: p.contact_phone || '',
                    tax_id: p.tax_id || '',
                    street: p.address?.street || '',
                    zip: p.address?.zip || '',
                    city: p.address?.city || '',
                    country: p.address?.country || '',
                });
            }
        } catch (err) { console.error('Error loading partner:', err); }
        setLoading(false);
    }

    async function handleSaveProfile() {
        if (!partner) return;
        setSaving(true);
        try {
            await B2BService.updatePartner(partner.id, {
                company_name: form.company_name,
                contact_email: form.contact_email,
                contact_phone: form.contact_phone,
                tax_id: form.tax_id,
                address: {
                    street: form.street,
                    zip: form.zip,
                    city: form.city,
                    country: form.country,
                },
            });
            toast.success('Dane firmy zostały zapisane!');
            setEditMode(false);
            await loadPartner();
        } catch (err) {
            console.error('Error saving profile:', err);
            toast.error('Błąd podczas zapisywania danych');
        }
        setSaving(false);
    }

    async function handleChangePassword() {
        if (passwordForm.newPassword.length < 6) {
            toast.error('Hasło musi mieć min. 6 znaków');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Hasła nie są identyczne');
            return;
        }
        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
            if (error) throw error;
            toast.success('Hasło zmienione pomyślnie!');
            setPasswordForm({ newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err.message || 'Błąd zmiany hasła');
        }
        setChangingPassword(false);
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !partner) return;
        if (!file.type.startsWith('image/')) { toast.error('Proszę wybrać plik graficzny (PNG, JPG, SVG)'); return; }
        setUploading(true);
        try {
            const resizedBlob = await resizeImage(file, MAX_LOGO_SIZE);
            const fileName = `${partner.id}/logo_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage.from('partner-logos').upload(fileName, resizedBlob, { contentType: 'image/png', upsert: true });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('partner-logos').getPublicUrl(fileName);
            const logoUrl = urlData.publicUrl;
            await B2BService.updatePartner(partner.id, { logo_url: logoUrl } as any);
            setPartner(prev => prev ? { ...prev, logo_url: logoUrl } : prev);
            toast.success('Logo zostało przesłane!');
        } catch (err) { console.error('Error uploading logo:', err); toast.error('Błąd podczas przesyłania logo'); }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleRemoveLogo() {
        if (!partner || !confirm('Na pewno usunąć logo?')) return;
        try {
            await B2BService.updatePartner(partner.id, { logo_url: null } as any);
            setPartner(prev => prev ? { ...prev, logo_url: null } : prev);
            toast.success('Logo usunięte');
        } catch { toast.error('Błąd podczas usuwania'); }
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Ładowanie ustawień...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'company' as const, label: 'Firma', icon: '🏢' },
        { id: 'account' as const, label: 'Konto', icon: '👤' },
        { id: 'conditions' as const, label: 'Warunki handlowe', icon: '💰' },
    ];

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[960px] mx-auto">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">⚙️ Ustawienia</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Zarządzaj profilem firmy, kontem i warunkami</p>
                </div>
                {partner?.logo_url && (
                    <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white p-1.5 flex items-center justify-center">
                        <img src={partner.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                )}
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══ TAB: FIRMA ═══ */}
            {activeTab === 'company' && (
                <div className="space-y-6">
                    {/* LOGO */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                    🖼️ Logo firmy
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Widoczne na ofertach i w portalu • auto-skalowanie do {MAX_LOGO_SIZE}px
                                </p>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex items-start gap-6">
                                <div className="flex-shrink-0">
                                    {partner?.logo_url ? (
                                        <div className="relative group">
                                            <div className="w-28 h-28 rounded-xl border-2 border-slate-200 bg-white p-2 flex items-center justify-center overflow-hidden shadow-sm">
                                                <img src={partner.logo_url} alt="Logo firmy" className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600" title="Usuń logo">✕</button>
                                        </div>
                                    ) : (
                                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                                            <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6A1.5 1.5 0 0020.25 4.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" /></svg>
                                            <span className="text-[10px]">Brak logo</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                                        {uploading ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Przesyłanie…</>) : (
                                            <>📤 {partner?.logo_url ? 'Zmień logo' : 'Prześlij logo'}</>
                                        )}
                                    </button>
                                    <p className="text-xs text-slate-400">PNG, JPG, WebP, SVG • najlepiej kwadratowe z przezroczystym tłem</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DANE FIRMY */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                    🏢 Dane firmy
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {editMode ? 'Edytuj i zapisz zmiany' : 'Kliknij „Edytuj" aby zmienić dane'}
                                </p>
                            </div>
                            {!editMode ? (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    ✏️ Edytuj
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditMode(false); loadPartner(); }}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                                    >
                                        {saving ? (<><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" /> Zapisywanie...</>) : '💾 Zapisz'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-5">
                            {editMode ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <EditField label="Nazwa firmy" value={form.company_name} onChange={v => setForm(f => ({ ...f, company_name: v }))} required />
                                    <EditField label="NIP / USt-ID" value={form.tax_id} onChange={v => setForm(f => ({ ...f, tax_id: v }))} placeholder="np. DE123456789" />
                                    <EditField label="E-mail kontaktowy" value={form.contact_email} onChange={v => setForm(f => ({ ...f, contact_email: v }))} type="email" />
                                    <EditField label="Telefon" value={form.contact_phone} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} placeholder="+49 ..." />
                                    <div className="md:col-span-2">
                                        <EditField label="Ulica i numer" value={form.street} onChange={v => setForm(f => ({ ...f, street: v }))} />
                                    </div>
                                    <EditField label="Kod pocztowy" value={form.zip} onChange={v => setForm(f => ({ ...f, zip: v }))} placeholder="12-345" />
                                    <EditField label="Miasto" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
                                    <EditField label="Kraj" value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} placeholder="np. Niemcy" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoField label="Nazwa firmy" value={partner?.company_name} />
                                    <InfoField label="NIP / USt-ID" value={partner?.tax_id} />
                                    <InfoField label="E-mail kontaktowy" value={partner?.contact_email} />
                                    <InfoField label="Telefon" value={partner?.contact_phone} />
                                    <InfoField label="Adres" value={partner?.address ? `${partner.address.street || ''}` : null} />
                                    <InfoField label="Miasto" value={partner?.address ? `${partner.address.zip || ''} ${partner.address.city || ''}`.trim() : null} />
                                    <InfoField label="Kraj" value={partner?.address?.country} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ TAB: KONTO ═══ */}
            {activeTab === 'account' && (
                <div className="space-y-6">
                    {/* INFO KONTOWE */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                👤 Dane konta
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Informacje o Twoim koncie użytkownika</p>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Imię i nazwisko" value={currentUser?.full_name} />
                            <InfoField label="E-mail logowania" value={currentUser?.email} />
                            <InfoField label="Rola" value={currentUser?.role === 'b2b_partner' ? 'Partner B2B' : currentUser?.role} />
                            <InfoField label="Status partnera" value={
                                partner?.status === 'active' ? '✅ Aktywny' :
                                partner?.status === 'suspended' ? '⏸️ Zawieszony' : '❌ Nieaktywny'
                            } />
                        </div>
                    </div>

                    {/* ZMIANA HASŁA */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                🔒 Zmiana hasła
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Zmień hasło dostępu do portalu</p>
                        </div>
                        <div className="p-5 space-y-4 max-w-md">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nowe hasło</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    placeholder="Min. 6 znaków"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Powtórz hasło</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    placeholder="Wpisz ponownie"
                                />
                                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">⚠️ Hasła nie są identyczne</p>
                                )}
                            </div>
                            <button
                                onClick={handleChangePassword}
                                disabled={changingPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {changingPassword ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Zmieniam...</>
                                ) : '🔑 Zmień hasło'}
                            </button>
                        </div>
                    </div>

                    {/* OPIEKUN KONTA */}
                    {partner?.account_manager && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                    📞 Twój opiekun
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">W razie pytań skontaktuj się z opiekunem konta</p>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                        {partner.account_manager.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{partner.account_manager.full_name}</p>
                                        <a href={`mailto:${partner.account_manager.email}`} className="text-sm text-blue-600 hover:underline">{partner.account_manager.email}</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB: WARUNKI HANDLOWE ═══ */}
            {activeTab === 'conditions' && partner && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                💰 Warunki handlowe
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Twoje indywidualne warunki współpracy</p>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-5 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-3xl font-bold text-slate-800">{partner.payment_terms_days}</div>
                                    <div className="text-xs text-slate-500 mt-1 font-medium">Termin płatności (dni)</div>
                                </div>
                                <div className="text-center p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="text-3xl font-bold text-emerald-700">€{partner.credit_limit.toLocaleString()}</div>
                                    <div className="text-xs text-emerald-600 mt-1 font-medium">Limit kredytowy</div>
                                </div>
                                <div className="text-center p-5 bg-orange-50 rounded-xl border border-orange-100">
                                    <div className="text-3xl font-bold text-orange-700">€{partner.credit_used.toLocaleString()}</div>
                                    <div className="text-xs text-orange-600 mt-1 font-medium">Wykorzystany kredyt</div>
                                </div>
                            </div>

                            {/* Credit bar */}
                            {partner.credit_limit > 0 && (
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                        <span>Wykorzystanie limitu</span>
                                        <span className="font-medium">{Math.round((partner.credit_used / partner.credit_limit) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${
                                                (partner.credit_used / partner.credit_limit) > 0.8 ? 'bg-red-500' :
                                                (partner.credit_used / partner.credit_limit) > 0.5 ? 'bg-orange-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min((partner.credit_used / partner.credit_limit) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        Dostępny kredyt: <b className="text-slate-600">€{(partner.credit_limit - partner.credit_used).toLocaleString()}</b>
                                    </p>
                                </div>
                            )}

                            {partner.prepayment_required && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">Wymagana zaliczka</p>
                                        <p className="text-xs text-amber-700 mt-0.5"><b>{partner.prepayment_percent}%</b> wartości zamówienia musi być wpłacone przed realizacją</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500">
                                    💡 <b>Informacja:</b> Warunki handlowe są ustalane indywidualnie przez opiekuna konta.
                                    W sprawie zmiany warunków skontaktuj się z nami bezpośrednio.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="py-2">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">{label}</div>
            <div className="text-sm text-slate-800 font-medium">{value || <span className="text-slate-300">—</span>}</div>
        </div>
    );
}

function EditField({ label, value, onChange, placeholder, type = 'text', required }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
    return (
        <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors bg-white placeholder:text-slate-300"
            />
        </div>
    );
}

export default B2BProfilePage;
