/**
 * Product Images Admin Page — with Upload to Supabase Storage
 * Allows admin to upload/replace model images and gallery photos
 * Supports adding custom models beyond the default list
 * Fully responsive (mobile-first)
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MODEL_IMAGES, MODEL_GALLERY, getModelDisplayName } from '../../config/modelImages';

// Default models from the calculator
const DEFAULT_MODELS = [
    { id: 'Orangeline', name: 'Orangestyle' },
    { id: 'Orangeline+', name: 'Orangestyle+' },
    { id: 'Trendline', name: 'Trendstyle' },
    { id: 'Trendline+', name: 'Trendstyle+' },
    { id: 'Topline', name: 'Topstyle' },
    { id: 'Topline XL', name: 'Topstyle XL' },
    { id: 'Designline', name: 'Designstyle' },
    { id: 'Ultraline', name: 'Ultrastyle' },
    { id: 'Skyline', name: 'Skystyle' },
    { id: 'Carport', name: 'Carport' },
    { id: 'TR10', name: 'Teranda TR10' },
    { id: 'TR15', name: 'Teranda TR15' },
    { id: 'TR20', name: 'Teranda TR20' },
    { id: 'Pergola', name: 'Pergola' },
    { id: 'Pergola Deluxe', name: 'Pergola Deluxe' },
    { id: 'Pergola Luxe', name: 'Pergola Luxe (Manuell)' },
    { id: 'Pergola Luxe Electric', name: 'Pergola Luxe (Elektrisch)' },
];

const STORAGE_BUCKET = 'product-images';
const SETTINGS_KEY = 'model_image_overrides';
const CUSTOM_MODELS_KEY = 'custom_product_models';

interface ImageOverrides {
    [modelId: string]: {
        hero?: string;
        gallery?: string[];
    };
}

interface ModelEntry {
    id: string;
    name: string;
    isCustom?: boolean;
}

export function ProductImagesPage() {
    const [overrides, setOverrides] = useState<ImageOverrides>({});
    const [customModels, setCustomModels] = useState<ModelEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [editingModel, setEditingModel] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newModelId, setNewModelId] = useState('');
    const [newModelName, setNewModelName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Combine default + custom models
    const allModels: ModelEntry[] = [
        ...DEFAULT_MODELS,
        ...customModels.map(m => ({ ...m, isCustom: true })),
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load image overrides
            const { data: ovData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', SETTINGS_KEY)
                .single();
            if (ovData?.value) {
                setOverrides(typeof ovData.value === 'string' ? JSON.parse(ovData.value) : ovData.value);
            }

            // Load custom models
            const { data: cmData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', CUSTOM_MODELS_KEY)
                .single();
            if (cmData?.value) {
                const parsed = typeof cmData.value === 'string' ? JSON.parse(cmData.value) : cmData.value;
                if (Array.isArray(parsed)) setCustomModels(parsed);
            }
        } catch {
            console.log('No overrides/custom models found');
        } finally {
            setLoading(false);
        }
    };

    const saveOverrides = async (newOverrides: ImageOverrides) => {
        try {
            await supabase.from('app_settings').upsert({
                key: SETTINGS_KEY,
                value: newOverrides,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });
            setOverrides(newOverrides);
        } catch (err: any) {
            toast.error('Błąd zapisu');
        }
    };

    const saveCustomModels = async (models: ModelEntry[]) => {
        try {
            await supabase.from('app_settings').upsert({
                key: CUSTOM_MODELS_KEY,
                value: models,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });
            setCustomModels(models);
        } catch (err: any) {
            toast.error('Błąd zapisu modeli');
        }
    };

    const ensureBucket = async () => {
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            if (!buckets?.find(b => b.name === STORAGE_BUCKET)) {
                await supabase.storage.createBucket(STORAGE_BUCKET, {
                    public: true,
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    fileSizeLimit: 5 * 1024 * 1024,
                });
            }
        } catch { /* bucket exists */ }
    };

    const uploadFile = async (file: File, modelId: string, type: 'hero' | 'gallery'): Promise<string | null> => {
        await ensureBucket();
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeName = modelId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const ts = Date.now();
        const filePath = `models/${safeName}/${type}_${ts}.${ext}`;

        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: true });
        if (error) { toast.error(`Upload: ${error.message}`); return null; }

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
        return urlData.publicUrl;
    };

    const handleHeroUpload = async (modelId: string, file: File) => {
        setUploading(modelId);
        const tid = toast.loading('Wysyłanie...');
        try {
            const url = await uploadFile(file, modelId, 'hero');
            if (url) {
                await saveOverrides({ ...overrides, [modelId]: { ...overrides[modelId], hero: url } });
                toast.success('Zdjęcie zmienione!', { id: tid });
            } else toast.error('Błąd', { id: tid });
        } catch { toast.error('Błąd', { id: tid }); }
        finally { setUploading(null); }
    };

    const handleGalleryUpload = async (modelId: string, files: FileList) => {
        setUploading(modelId);
        const tid = toast.loading(`Wysyłanie ${files.length} zdjęć...`);
        try {
            const urls: string[] = [];
            for (const file of Array.from(files)) {
                const url = await uploadFile(file, modelId, 'gallery');
                if (url) urls.push(url);
            }
            if (urls.length > 0) {
                const existing = overrides[modelId]?.gallery || [];
                await saveOverrides({ ...overrides, [modelId]: { ...overrides[modelId], gallery: [...existing, ...urls] } });
                toast.success(`Dodano ${urls.length} zdjęć!`, { id: tid });
            }
        } catch { toast.error('Błąd', { id: tid }); }
        finally { setUploading(null); }
    };

    const removeGalleryImage = async (modelId: string, imageUrl: string) => {
        const existing = overrides[modelId]?.gallery || [];
        await saveOverrides({ ...overrides, [modelId]: { ...overrides[modelId], gallery: existing.filter(u => u !== imageUrl) } });
        toast.success('Usunięto');
    };

    const removeHeroOverride = async (modelId: string) => {
        const nw = { ...overrides };
        if (nw[modelId]) { delete nw[modelId].hero; if (!nw[modelId].gallery?.length) delete nw[modelId]; }
        await saveOverrides(nw);
        toast.success('Przywrócono domyślne');
    };

    const handleAddModel = async () => {
        if (!newModelId.trim() || !newModelName.trim()) {
            toast.error('Podaj ID i nazwę modelu');
            return;
        }
        if (allModels.some(m => m.id.toLowerCase() === newModelId.trim().toLowerCase())) {
            toast.error('Model o tym ID już istnieje');
            return;
        }
        const entry: ModelEntry = { id: newModelId.trim(), name: newModelName.trim() };
        await saveCustomModels([...customModels, entry]);
        setNewModelId('');
        setNewModelName('');
        setShowAddForm(false);
        toast.success(`Dodano model: ${entry.name}`);
    };

    const handleRemoveModel = async (modelId: string) => {
        if (!confirm(`Usunąć model "${modelId}"?`)) return;
        await saveCustomModels(customModels.filter(m => m.id !== modelId));
        // Also remove overrides for this model
        const nw = { ...overrides };
        delete nw[modelId];
        await saveOverrides(nw);
        if (editingModel === modelId) setEditingModel(null);
        toast.success('Model usunięty');
    };

    const getEffectiveImage = (modelId: string): string | undefined => overrides[modelId]?.hero || MODEL_IMAGES[modelId];
    const getEffectiveGallery = (modelId: string): string[] => {
        const og = overrides[modelId]?.gallery;
        if (og && og.length > 0) return og;
        return MODEL_GALLERY[modelId] || [];
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header — responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Zdjęcia Produktów
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Kliknij na model aby zmienić zdjęcie
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        {allModels.length} modeli
                    </span>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Dodaj model
                    </button>
                </div>
            </div>

            {/* Add Model Form */}
            {showAddForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-in slide-in-from-top duration-200">
                    <h3 className="font-bold text-blue-800 text-sm mb-3">Dodaj nowy model</h3>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">ID modelu (wewnętrzne)</label>
                            <input
                                value={newModelId}
                                onChange={e => setNewModelId(e.target.value)}
                                placeholder="np. Bosco400"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Nazwa wyświetlana</label>
                            <input
                                value={newModelName}
                                onChange={e => setNewModelName(e.target.value)}
                                placeholder="np. Bosco Terrassenüberdachung"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 sm:items-end">
                            <button
                                onClick={handleAddModel}
                                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                                Dodaj
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setNewModelId(''); setNewModelName(''); }}
                                className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Models Grid — responsive: 1 col mobile, 2 tablet, 3-4 desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {allModels.map(model => {
                    const heroUrl = getEffectiveImage(model.id);
                    const hasOverride = !!overrides[model.id]?.hero;
                    const gallery = getEffectiveGallery(model.id);
                    const isEditing = editingModel === model.id;
                    const isUploading = uploading === model.id;

                    return (
                        <div
                            key={model.id}
                            className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-all ${
                                isEditing
                                    ? 'border-blue-400 ring-2 ring-blue-100 shadow-lg col-span-2 sm:col-span-1'
                                    : 'border-slate-200 hover:shadow-md active:shadow-md'
                            }`}
                        >
                            {/* Image */}
                            <div
                                className="relative aspect-[4/3] bg-slate-100 cursor-pointer group"
                                onClick={() => setEditingModel(isEditing ? null : model.id)}
                            >
                                {heroUrl ? (
                                    <img src={heroUrl} alt={model.name} className="w-full h-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                        <svg className="w-8 h-8 sm:w-10 sm:h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-[10px] font-medium">Brak zdjęcia</span>
                                    </div>
                                )}

                                {/* Badges */}
                                <div className="absolute top-1.5 right-1.5 flex gap-1">
                                    {model.isCustom && (
                                        <span className="bg-purple-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">WŁASNY</span>
                                    )}
                                    {hasOverride && (
                                        <span className="bg-green-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">CUSTOM</span>
                                    )}
                                    {gallery.length > 0 && (
                                        <span className="bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">{gallery.length}</span>
                                    )}
                                </div>

                                {/* Upload spinner */}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                                    </div>
                                )}

                                {/* Tap hint on mobile */}
                                {!isEditing && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/20 transition-colors flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 group-active:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="px-2.5 py-2 sm:px-3 sm:py-2.5 border-t">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">{model.name}</h3>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">{model.id}</p>

                                {/* Edit Panel */}
                                {isEditing && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-2.5 px-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Zmień zdjęcie główne
                                        </button>

                                        <button
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="w-full py-2.5 px-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 active:bg-indigo-200 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>
                                            Dodaj do galerii
                                        </button>

                                        {hasOverride && (
                                            <button onClick={() => removeHeroOverride(model.id)}
                                                className="w-full py-1.5 text-red-500 text-[10px] font-medium hover:bg-red-50 rounded-lg transition-colors">
                                                Przywróć domyślne
                                            </button>
                                        )}

                                        {model.isCustom && (
                                            <button onClick={() => handleRemoveModel(model.id)}
                                                className="w-full py-1.5 text-red-600 text-[10px] font-bold hover:bg-red-50 rounded-lg transition-colors border border-red-200">
                                                🗑 Usuń model
                                            </button>
                                        )}

                                        {/* Gallery thumbnails */}
                                        {gallery.length > 0 && (
                                            <div className="pt-1.5">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Galeria ({gallery.length})</p>
                                                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                                                    {gallery.map((url, idx) => (
                                                        <div key={idx} className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 group/thumb">
                                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                                            {overrides[model.id]?.gallery?.includes(url) && (
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); removeGalleryImage(model.id, url); }}
                                                                    className="absolute inset-0 bg-red-500/60 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 active:opacity-100 transition-opacity"
                                                                >
                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Hidden file inputs */}
                            {isEditing && (
                                <>
                                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(model.id, f); e.target.value = ''; }} />
                                    <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                                        onChange={e => { const fs = e.target.files; if (fs?.length) handleGalleryUpload(model.id, fs); e.target.value = ''; }} />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
