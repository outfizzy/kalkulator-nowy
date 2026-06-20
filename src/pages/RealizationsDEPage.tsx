import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RealizationService } from '../services/database/realization.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════
// Realizacje DE — Zarządzanie galeria polendach24.de
// ═══════════════════════════════════════════════

interface Realization {
    id: string;
    title: string;
    description: string | null;
    product_type: string | null;
    city: string | null;
    model: string | null;
    photos: string[];
    is_visible: boolean;
    created_at: string;
    updated_at: string;
    installation_id: string | null;
    seo_title: string | null;
    meta_description: string | null;
    facts: { label: string; value: string }[] | null;
}

const PRODUCT_TYPES = [
    { value: '', label: '-- Wybierz --' },
    { value: 'Terrassenueberdachung', label: 'Terrassenueberdachung' },
    { value: 'Pergola', label: 'Pergola' },
    { value: 'Carport', label: 'Carport' },
    { value: 'Wintergarten', label: 'Wintergarten' },
];

export const RealizationsDEPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [items, setItems] = useState<Realization[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<Realization> | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'editor'>('grid');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiTips, setAiTips] = useState<string[]>([]);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('realizations')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setItems(data || []);
        } catch (err: any) {
            toast.error('Blad ladowania realizacji: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadItems(); }, [loadItems]);

    const handleNew = () => {
        setEditing({
            title: '', description: '', product_type: '', city: '', model: '',
            photos: [], is_visible: false, seo_title: '', meta_description: '', facts: [],
        });
        setAiTips([]);
        setViewMode('editor');
    };

    const handleEdit = (item: Realization) => {
        setEditing({ ...item });
        setAiTips([]);
        setViewMode('editor');
    };

    const handleGenerateAI = async () => {
        if (!editing) return;
        setAiLoading(true);
        try {
            const copy = await RealizationService.generateCopy({
                productType: editing.product_type || 'Terrassenüberdachung',
                city: editing.city || undefined,
                title: editing.title || undefined,
                draftDescription: editing.description || undefined,
                photoCount: (editing.photos || []).length,
            });
            setEditing(prev => prev ? {
                ...prev,
                title: copy.title || prev.title,
                description: copy.description || prev.description,
                seo_title: copy.seoTitle || prev.seo_title,
                meta_description: copy.metaDescription || prev.meta_description,
                facts: (copy.facts && copy.facts.length) ? copy.facts : prev.facts,
            } : prev);
            setAiTips(copy.tips || []);
            toast.success('Teksty AI gotowe — sprawdź i zapisz.');
        } catch (err: any) {
            toast.error(err.message || 'Blad AI');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editing?.title?.trim()) { toast.error('Tytul jest wymagany'); return; }
        setSaving(true);
        try {
            const payload = {
                title: editing.title,
                description: editing.description || null,
                product_type: editing.product_type || null,
                city: editing.city || null,
                model: editing.model || null,
                photos: editing.photos || [],
                is_visible: editing.is_visible ?? false,
                seo_title: editing.seo_title || null,
                meta_description: editing.meta_description || null,
                facts: editing.facts || [],
            };

            if (editing.id) {
                const { error } = await supabase.from('realizations').update(payload).eq('id', editing.id);
                if (error) throw error;
                toast.success('Realizacja zaktualizowana');
            } else {
                const { data, error } = await supabase.from('realizations').insert(payload).select().single();
                if (error) throw error;
                setEditing(data);
                toast.success('Realizacja utworzona');
            }
            await loadItems();
        } catch (err: any) {
            toast.error(err.message || 'Blad zapisu');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Usunac realizacje? Tej operacji nie mozna cofnac.')) return;
        try {
            const { error } = await supabase.from('realizations').delete().eq('id', id);
            if (error) throw error;
            toast.success('Realizacja usunieta');
            if (editing?.id === id) { setEditing(null); setViewMode('grid'); }
            await loadItems();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleToggleVisibility = async (id: string, current: boolean) => {
        try {
            const { error } = await supabase.from('realizations').update({ is_visible: !current }).eq('id', id);
            if (error) throw error;
            toast.success(current ? 'Realizacja ukryta' : 'Realizacja widoczna');
            await loadItems();
        } catch (err: any) { toast.error(err.message); }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const newPhotos: string[] = [];

        try {
            for (const file of Array.from(files)) {
                const ext = file.name.split('.').pop() || 'jpg';
                const path = `realizations/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

                const { error: uploadError } = await supabase.storage.from('realizations').upload(path, file, {
                    contentType: file.type,
                    upsert: false,
                });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('realizations').getPublicUrl(path);
                newPhotos.push(urlData.publicUrl);
            }

            setEditing(prev => prev ? { ...prev, photos: [...(prev.photos || []), ...newPhotos] } : prev);
            toast.success(`${newPhotos.length} zdjec przeslanych`);
        } catch (err: any) {
            toast.error('Blad przesylania: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removePhoto = (index: number) => {
        setEditing(prev => prev ? { ...prev, photos: (prev.photos || []).filter((_, i) => i !== index) } : prev);
    };

    const movePhoto = (index: number, direction: -1 | 1) => {
        setEditing(prev => {
            if (!prev?.photos) return prev;
            const photos = [...prev.photos];
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= photos.length) return prev;
            [photos[index], photos[newIndex]] = [photos[newIndex], photos[index]];
            return { ...prev, photos };
        });
    };

    // ═══ Filtered Items ═══
    const filtered = items.filter(item => {
        if (filter === 'visible') return item.is_visible;
        if (filter === 'hidden') return !item.is_visible;
        return true;
    });

    if (loading) {
        return (
            <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                <p className="text-slate-400 mt-4">Ladowanie realizacji...</p>
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // GRID VIEW
    // ═══════════════════════════════════════════════
    if (viewMode === 'grid') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="text-2xl">DE</span>
                            Realizacje — polendach24.de
                        </h1>
                        <p className="text-slate-500 mt-1">Galeria projektow widoczna na stronie polendach24.de/galerie</p>
                    </div>
                    <button onClick={handleNew} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
                        + Nowa realizacja
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className="text-2xl font-bold text-slate-900">{items.length}</p>
                        <p className="text-xs text-slate-500 font-medium">Wszystkie</p>
                    </div>
                    <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{items.filter(i => i.is_visible).length}</p>
                        <p className="text-xs text-green-600 font-medium">Widoczne</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className="text-2xl font-bold text-slate-400">{items.filter(i => !i.is_visible).length}</p>
                        <p className="text-xs text-slate-400 font-medium">Ukryte</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                    {(['all', 'visible', 'hidden'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            {f === 'all' ? 'Wszystkie' : f === 'visible' ? 'Widoczne' : 'Ukryte'}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                        <h3 className="text-xl font-bold text-slate-700">Brak realizacji</h3>
                        <p className="text-slate-500 mt-2">Dodaj pierwsza realizacje klikajac przycisk powyzej.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(item => (
                            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                {/* Photos */}
                                <div className="h-48 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => handleEdit(item)}>
                                    {item.photos.length > 0 ? (
                                        <div className="flex h-full gap-0.5">
                                            {item.photos.slice(0, 3).map((photo, i) => (
                                                <div key={i} className="relative flex-1 min-w-0">
                                                    <img src={photo} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    {i === 2 && item.photos.length > 3 && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <span className="text-white font-semibold text-lg">+{item.photos.length - 3}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                                            <span className="text-slate-400 text-sm">Brak zdjec</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${item.is_visible ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.is_visible ? 'Widoczna' : 'Ukryta'}
                                        </span>
                                        {item.product_type && <span className="text-xs text-blue-500 font-medium">{item.product_type}</span>}
                                        {item.city && <span className="text-xs text-slate-400">{item.city}</span>}
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleEdit(item)}>
                                        {item.title}
                                    </h3>

                                    {item.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.description}</p>}

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-400">{item.photos.length} zdjec</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleToggleVisibility(item.id, item.is_visible)}
                                                className={`p-1.5 rounded-lg transition-all text-xs font-bold ${item.is_visible ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                                title={item.is_visible ? 'Ukryj' : 'Pokaz'}>
                                                {item.is_visible ? 'Ukryj' : 'Pokaz'}
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Usun">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // EDITOR VIEW
    // ═══════════════════════════════════════════════
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={() => { setViewMode('grid'); setEditing(null); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Powrot do listy
                </button>
                <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-sm hover:bg-slate-700 transition-all disabled:opacity-50 text-sm">
                        {saving ? 'Zapisuje...' : 'Zapisz'}
                    </button>
                    {editing?.id && (
                        <button onClick={() => handleToggleVisibility(editing.id!, editing.is_visible ?? false)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${editing.is_visible ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                            {editing.is_visible ? 'Ukryj na stronie' : 'Pokaz na stronie'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main - 2 cols */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Title */}
                    <input type="text" placeholder="Tytul realizacji (np. Terrassenueberdachung in Berlin)..."
                        value={editing?.title || ''} onChange={e => setEditing(prev => prev ? { ...prev, title: e.target.value } : prev)}
                        className="w-full text-2xl font-bold text-slate-900 border-0 border-b-2 border-slate-200 focus:border-blue-500 outline-none pb-3 bg-transparent placeholder-slate-300" />

                    {/* Description + KI */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Opis projektu</h3>
                            <button onClick={handleGenerateAI} disabled={aiLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                                {aiLoading ? 'AI pisze…' : '✨ AI: opis + SEO'}
                            </button>
                        </div>
                        <textarea placeholder="Szczegolowy opis realizacji (widoczny na stronie)… lub wygeneruj przez AI (po niemiecku)."
                            value={editing?.description || ''} onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : prev)}
                            rows={5} className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
                        <p className="text-[11px] text-violet-700/80 mt-1.5">AI pisze opis + SEO‑Titel + Meta‑opis (po niemiecku, pod SEO) i podpowiada, co dodać. Wpisz najpierw produkt/miasto. Wszystko edytowalne.</p>
                        {aiTips.length > 0 && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                                <p className="text-xs font-bold text-amber-800 mb-1.5">Podpowiedzi AI — jak ulepszyć tę realizację:</p>
                                <ul className="space-y-1">
                                    {aiTips.map((t, i) => (
                                        <li key={i} className="text-[11px] text-amber-900/90 flex gap-1.5"><span className="text-amber-500">●</span><span>{t}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Dane projektu (specyfikacja) — wyciągnięte przez AI, widoczne na stronie */}
                    {(editing?.facts || []).length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Dane projektu (specyfikacja)</h3>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                {(editing?.facts || []).map((f, i) => (
                                    <div key={i} className="flex justify-between gap-3 text-sm border-b border-slate-100 pb-1.5">
                                        <dt className="text-slate-500">{f.label}</dt>
                                        <dd className="font-medium text-slate-800 text-right">{f.value}</dd>
                                    </div>
                                ))}
                            </dl>
                            <p className="text-[11px] text-slate-400 mt-2">Wyciągnięte przez AI z notatek — pojawi się na stronie jako tabela. Aby zmienić: popraw notatki i wygeneruj ponownie.</p>
                        </div>
                    )}

                    {/* Photos */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Zdjecia ({(editing?.photos || []).length})</h3>
                            <label className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                                {uploading ? 'Przesylanie...' : '+ Dodaj zdjecia'}
                                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                            </label>
                        </div>

                        {(editing?.photos || []).length === 0 ? (
                            <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                                    <p className="text-slate-500">Przeciagnij lub kliknij aby dodac zdjecia projektu</p>
                                    <p className="text-xs text-slate-400 mt-1">Pierwsze zdjecie bedzie okladka</p>
                                </div>
                                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                            </label>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {(editing?.photos || []).map((photo, i) => (
                                    <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
                                        <img src={photo} alt={`Zdjecie ${i + 1}`} className="w-full h-full object-cover" />
                                        {i === 0 && (
                                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">Okladka</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                            {i > 0 && <button onClick={() => movePhoto(i, -1)} className="p-1.5 bg-white rounded-full text-slate-700 hover:bg-slate-100" title="W lewo">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                            </button>}
                                            {i < (editing?.photos || []).length - 1 && <button onClick={() => movePhoto(i, 1)} className="p-1.5 bg-white rounded-full text-slate-700 hover:bg-slate-100" title="W prawo">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>}
                                            <button onClick={() => removePhoto(i)} className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600" title="Usun">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Status</h3>
                        <div className={`px-3 py-2 rounded-lg text-sm font-bold text-center ${editing?.is_visible ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {editing?.is_visible ? 'Widoczna na stronie' : 'Ukryta'}
                        </div>
                    </div>

                    {/* Product Type */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Typ produktu</h3>
                        <select value={editing?.product_type || ''} onChange={e => setEditing(prev => prev ? { ...prev, product_type: e.target.value || null } : prev)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100">
                            {PRODUCT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* City */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Miasto</h3>
                        <input type="text" placeholder="np. Berlin, Hamburg..." value={editing?.city || ''}
                            onChange={e => setEditing(prev => prev ? { ...prev, city: e.target.value } : prev)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>

                    {/* Model */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Model</h3>
                        <input type="text" placeholder="np. Trendstyle, Ultrastyle..." value={editing?.model || ''}
                            onChange={e => setEditing(prev => prev ? { ...prev, model: e.target.value } : prev)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>

                    {/* SEO */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">SEO</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 font-medium">SEO Title</label>
                                <input type="text" placeholder="Tytul dla Google..." value={editing?.seo_title || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, seo_title: e.target.value } : prev)}
                                    className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-blue-100" maxLength={60} />
                                <div className={`text-[10px] mt-0.5 ${(editing?.seo_title?.length || 0) > 55 ? 'text-red-500' : 'text-slate-400'}`}>{editing?.seo_title?.length || 0}/60</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">SEO Description</label>
                                <textarea placeholder="Opis dla Google..." value={editing?.meta_description || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, meta_description: e.target.value } : prev)}
                                    rows={2} className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-blue-100 resize-none" maxLength={155} />
                                <div className={`text-[10px] mt-0.5 ${(editing?.meta_description?.length || 0) > 150 ? 'text-red-500' : 'text-slate-400'}`}>{editing?.meta_description?.length || 0}/155</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealizationsDEPage;
