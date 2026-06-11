import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════
// Przedstawiciele DE — widocznosc na polendach24.de
// ═══════════════════════════════════════════════

interface RepProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
    client_phone: string | null;
    client_email: string | null;
    avatar_url: string | null;
    // Website DE fields
    website_de_visible: boolean;
    website_de_available: boolean;
    website_de_title: string | null;
    website_de_region: string | null;
}

const TITLE_PRESETS = [
    'Kundenberater',
    'Ihr persoenlicher Kundenberater',
    'Fachberater Terrassenuebersdachungen',
    'Vertriebsleiter Deutschland',
    'Technischer Berater',
];

const REGION_PRESETS = [
    'NRW & Hessen',
    'Bayern & Baden-Wuerttemberg',
    'Berlin & Brandenburg',
    'Norddeutschland',
    'Sachsen & Thueringen',
    'Deutschlandweit',
];

export const RepresentativesDEPage: React.FC = () => {
    const [profiles, setProfiles] = useState<RepProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<RepProfile>>({});

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch ALL sales reps + admins + managers (they could be advisors)
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, phone, role, client_phone, client_email, avatar_url, website_de_visible, website_de_available, website_de_title, website_de_region')
                .in('role', ['admin', 'manager', 'sales_rep'])
                .order('first_name', { ascending: true });
            if (error) throw error;
            setProfiles((data || []).map((p: any) => ({
                ...p,
                website_de_visible: p.website_de_visible ?? false,
                website_de_available: p.website_de_available ?? true,
                website_de_title: p.website_de_title ?? null,
                website_de_region: p.website_de_region ?? null,
            })));
        } catch (err: any) {
            toast.error('Blad ladowania: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadProfiles(); }, [loadProfiles]);

    const toggleVisibility = async (id: string, current: boolean) => {
        setSaving(id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ website_de_visible: !current } as any)
                .eq('id', id);
            if (error) throw error;
            toast.success(current ? 'Ukryty na stronie' : 'Widoczny na stronie');
            await loadProfiles();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    const toggleAvailability = async (id: string, current: boolean) => {
        setSaving(id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ website_de_available: !current } as any)
                .eq('id', id);
            if (error) throw error;
            toast.success(!current ? 'Oznaczony jako dostepny' : 'Oznaczony jako niedostepny');
            await loadProfiles();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    const startEdit = (p: RepProfile) => {
        setEditingId(p.id);
        setEditForm({
            website_de_title: p.website_de_title,
            website_de_region: p.website_de_region,
            client_phone: p.client_phone,
            client_email: p.client_email,
        });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        setSaving(editingId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    website_de_title: editForm.website_de_title || null,
                    website_de_region: editForm.website_de_region || null,
                    client_phone: editForm.client_phone || null,
                    client_email: editForm.client_email || null,
                } as any)
                .eq('id', editingId);
            if (error) throw error;
            toast.success('Zapisano');
            setEditingId(null);
            await loadProfiles();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    const visibleCount = profiles.filter(p => p.website_de_visible).length;
    const availableCount = profiles.filter(p => p.website_de_visible && p.website_de_available).length;

    if (loading) {
        return (
            <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                <p className="text-slate-400 mt-4">Ladowanie profili...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <span className="text-2xl">DE</span>
                    Przedstawiciele — polendach24.de
                </h1>
                <p className="text-slate-500 mt-1">Zarzadzaj kto jest widoczny jako doradca na stronie /kontakt</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{profiles.length}</p>
                    <p className="text-xs text-slate-500 font-medium">Wszyscy handlowcy</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{visibleCount}</p>
                    <p className="text-xs text-green-600 font-medium">Widoczni na stronie</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{availableCount}</p>
                    <p className="text-xs text-blue-600 font-medium">Dostepni dzisiaj</p>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-bold mb-1">Jak to dziala:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li><strong>Widocznosc</strong> — czy osoba pojawia sie na stronie /kontakt</li>
                    <li><strong>Dostepnosc</strong> — zielona/szara kropka "Heute erreichbar"</li>
                    <li><strong>Tytul</strong> — wyswietlany pod imieniem (np. "Kundenberater")</li>
                    <li><strong>Region</strong> — opcjonalny region (np. "NRW & Hessen")</li>
                    <li><strong>Telefon/Email klienta</strong> — numer widoczny na stronie (moze byc inny niz wewnetrzny)</li>
                </ul>
            </div>

            {/* Profiles list */}
            <div className="space-y-3">
                {profiles.map(p => {
                    const isEditing = editingId === p.id;
                    const isSaving = saving === p.id;

                    return (
                        <div key={p.id} className={`bg-white rounded-xl border ${p.website_de_visible ? 'border-green-200' : 'border-slate-200'} p-5 transition-all`}>
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                {p.avatar_url ? (
                                    <img src={p.avatar_url} alt={`${p.first_name} ${p.last_name}`} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white text-lg font-bold">
                                        {(p.first_name?.[0] || '')}{(p.last_name?.[0] || '')}
                                    </div>
                                )}

                                {/* Name & role */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 text-lg">{p.first_name} {p.last_name}</p>
                                    <p className="text-sm text-slate-500">{p.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{p.role}</span>
                                        {p.website_de_visible && (
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Widoczny DE</span>
                                        )}
                                        {p.website_de_visible && p.website_de_available && (
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">Dostepny</span>
                                        )}
                                    </div>
                                </div>

                                {/* Quick actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => toggleVisibility(p.id, p.website_de_visible)}
                                        disabled={isSaving}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                                            p.website_de_visible
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {p.website_de_visible ? 'Widoczny' : 'Ukryty'}
                                    </button>

                                    {p.website_de_visible && (
                                        <button
                                            onClick={() => toggleAvailability(p.id, p.website_de_available)}
                                            disabled={isSaving}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                                                p.website_de_available
                                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            }`}
                                        >
                                            {p.website_de_available ? 'Dostepny' : 'Niedostepny'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => isEditing ? setEditingId(null) : startEdit(p)}
                                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                                    >
                                        {isEditing ? 'Zamknij' : 'Edytuj'}
                                    </button>
                                </div>
                            </div>

                            {/* Edit form */}
                            {isEditing && (
                                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Title */}
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tytul na stronie</label>
                                        <input type="text" placeholder="np. Kundenberater" value={editForm.website_de_title || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, website_de_title: e.target.value }))}
                                            className="w-full mt-1 text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {TITLE_PRESETS.map(t => (
                                                <button key={t} type="button" onClick={() => setEditForm(prev => ({ ...prev, website_de_title: t }))}
                                                    className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Region */}
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Region (opcjonalnie)</label>
                                        <input type="text" placeholder="np. NRW & Hessen" value={editForm.website_de_region || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, website_de_region: e.target.value }))}
                                            className="w-full mt-1 text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {REGION_PRESETS.map(r => (
                                                <button key={r} type="button" onClick={() => setEditForm(prev => ({ ...prev, website_de_region: r }))}
                                                    className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Client phone */}
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Telefon klienta (widoczny na stronie)</label>
                                        <input type="tel" placeholder={p.phone || 'Numer telefonu'} value={editForm.client_phone || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, client_phone: e.target.value }))}
                                            className="w-full mt-1 text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                                        <p className="text-[10px] text-slate-400 mt-0.5">Jesli pusty — uzyje glownego numeru profilu</p>
                                    </div>

                                    {/* Client email */}
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Email klienta (widoczny na stronie)</label>
                                        <input type="email" placeholder={p.email || 'Email'} value={editForm.client_email || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, client_email: e.target.value }))}
                                            className="w-full mt-1 text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                                        <p className="text-[10px] text-slate-400 mt-0.5">Jesli pusty — uzyje glownego emaila profilu</p>
                                    </div>

                                    {/* Save */}
                                    <div className="md:col-span-2 flex justify-end">
                                        <button onClick={saveEdit} disabled={isSaving}
                                            className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50">
                                            {isSaving ? 'Zapisuje...' : 'Zapisz zmiany'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RepresentativesDEPage;
