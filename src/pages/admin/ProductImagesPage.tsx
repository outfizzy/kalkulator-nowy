/**
 * Product Images Admin Page — with Upload to Supabase Storage
 * Allows admin to upload/replace model images and gallery photos
 * Images are stored in Supabase Storage bucket "product-images"
 * and URLs are saved to app_settings table for persistence
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MODEL_IMAGES, MODEL_GALLERY, getModelDisplayName } from '../../config/modelImages';

// All models from the calculator
const ALL_MODELS = [
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
    { id: 'TR10', name: 'Orangestyle 10' },
    { id: 'TR15', name: 'Trendstyle 15' },
    { id: 'TR20', name: 'Topstyle 20' },
    { id: 'Pergola Luxe', name: 'Pergola Luxe (Manuell)' },
    { id: 'Pergola Luxe Electric', name: 'Pergola Luxe (Elektrisch)' },
];

const STORAGE_BUCKET = 'product-images';
const SETTINGS_KEY = 'model_image_overrides';

// Type for stored image overrides
interface ImageOverrides {
    [modelId: string]: {
        hero?: string;       // Primary image URL
        gallery?: string[];  // Gallery image URLs
    };
}

export function ProductImagesPage() {
    const [overrides, setOverrides] = useState<ImageOverrides>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null); // modelId being uploaded
    const [editingModel, setEditingModel] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Load overrides from app_settings
    useEffect(() => {
        loadOverrides();
    }, []);

    const loadOverrides = async () => {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', SETTINGS_KEY)
                .single();

            if (data?.value) {
                setOverrides(typeof data.value === 'string' ? JSON.parse(data.value) : data.value);
            }
        } catch (err) {
            // Table or key might not exist yet — that's OK
            console.log('No image overrides found, using defaults');
        } finally {
            setLoading(false);
        }
    };

    const saveOverrides = async (newOverrides: ImageOverrides) => {
        try {
            // Try upsert
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: SETTINGS_KEY,
                    value: newOverrides,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'key' });

            if (error) throw error;
            setOverrides(newOverrides);
        } catch (err: any) {
            console.error('Save overrides error:', err);
            toast.error('Błąd zapisu ustawień');
        }
    };

    // Ensure storage bucket exists
    const ensureBucket = async () => {
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            if (!buckets?.find(b => b.name === STORAGE_BUCKET)) {
                await supabase.storage.createBucket(STORAGE_BUCKET, {
                    public: true,
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    fileSizeLimit: 5 * 1024 * 1024, // 5MB
                });
            }
        } catch (err) {
            // Bucket likely already exists
        }
    };

    const uploadFile = async (file: File, modelId: string, type: 'hero' | 'gallery'): Promise<string | null> => {
        await ensureBucket();

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeName = modelId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const timestamp = Date.now();
        const filePath = type === 'hero'
            ? `models/${safeName}/hero_${timestamp}.${ext}`
            : `models/${safeName}/gallery_${timestamp}.${ext}`;

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (error) {
            console.error('Upload error:', error);
            toast.error(`Błąd uploadu: ${error.message}`);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    };

    const handleHeroUpload = async (modelId: string, file: File) => {
        setUploading(modelId);
        const toastId = toast.loading('Wysyłanie zdjęcia...');

        try {
            const url = await uploadFile(file, modelId, 'hero');
            if (url) {
                const newOverrides = {
                    ...overrides,
                    [modelId]: {
                        ...overrides[modelId],
                        hero: url,
                    }
                };
                await saveOverrides(newOverrides);
                toast.success('Zdjęcie główne zaktualizowane!', { id: toastId });
            } else {
                toast.error('Nie udało się przesłać', { id: toastId });
            }
        } catch (err) {
            toast.error('Błąd uploadu', { id: toastId });
        } finally {
            setUploading(null);
        }
    };

    const handleGalleryUpload = async (modelId: string, files: FileList) => {
        setUploading(modelId);
        const toastId = toast.loading(`Wysyłanie ${files.length} zdjęć...`);

        try {
            const urls: string[] = [];
            for (const file of Array.from(files)) {
                const url = await uploadFile(file, modelId, 'gallery');
                if (url) urls.push(url);
            }

            if (urls.length > 0) {
                const existing = overrides[modelId]?.gallery || [];
                const newOverrides = {
                    ...overrides,
                    [modelId]: {
                        ...overrides[modelId],
                        gallery: [...existing, ...urls],
                    }
                };
                await saveOverrides(newOverrides);
                toast.success(`Dodano ${urls.length} zdjęć do galerii!`, { id: toastId });
            }
        } catch (err) {
            toast.error('Błąd uploadu galerii', { id: toastId });
        } finally {
            setUploading(null);
        }
    };

    const removeGalleryImage = async (modelId: string, imageUrl: string) => {
        const existing = overrides[modelId]?.gallery || [];
        const newGallery = existing.filter(u => u !== imageUrl);
        const newOverrides = {
            ...overrides,
            [modelId]: {
                ...overrides[modelId],
                gallery: newGallery,
            }
        };
        await saveOverrides(newOverrides);
        toast.success('Zdjęcie usunięte z galerii');
    };

    const removeHeroOverride = async (modelId: string) => {
        const newOverrides = { ...overrides };
        if (newOverrides[modelId]) {
            delete newOverrides[modelId].hero;
            if (!newOverrides[modelId].gallery?.length) {
                delete newOverrides[modelId];
            }
        }
        await saveOverrides(newOverrides);
        toast.success('Przywrócono domyślne zdjęcie');
    };

    // Get effective image for a model (override > static config)
    const getEffectiveImage = (modelId: string): string | undefined => {
        return overrides[modelId]?.hero || MODEL_IMAGES[modelId];
    };

    const getEffectiveGallery = (modelId: string): string[] => {
        const overrideGallery = overrides[modelId]?.gallery;
        if (overrideGallery && overrideGallery.length > 0) return overrideGallery;
        return MODEL_GALLERY[modelId] || [];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Zdjęcia Produktów
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Kliknij na model, aby zmienić zdjęcie główne lub dodać zdjęcia do galerii oferty
                    </p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                    {ALL_MODELS.length} modeli • {Object.keys(overrides).length} z własnymi zdjęciami
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Jak to działa:</p>
                    <ul className="space-y-0.5 text-blue-700">
                        <li>• <strong>Zdjęcie główne</strong> — wyświetla się w kalkulatorze (wybór modelu) i w ofercie interaktywnej</li>
                        <li>• <strong>Galeria</strong> — dodatkowe zdjęcia w interaktywnej ofercie (slider na górze)</li>
                        <li>• Zdjęcia uploadowane zastępują domyślne</li>
                    </ul>
                </div>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {ALL_MODELS.map(model => {
                    const heroUrl = getEffectiveImage(model.id);
                    const hasOverride = !!overrides[model.id]?.hero;
                    const gallery = getEffectiveGallery(model.id);
                    const isEditing = editingModel === model.id;
                    const isUploading = uploading === model.id;

                    return (
                        <div
                            key={model.id}
                            className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-all ${isEditing ? 'border-blue-400 ring-2 ring-blue-100 shadow-lg' : 'border-slate-200 hover:shadow-md hover:border-slate-300'}`}
                        >
                            {/* Image Area */}
                            <div className="relative aspect-[4/3] bg-slate-100 group cursor-pointer"
                                onClick={() => {
                                    if (!isEditing) {
                                        setEditingModel(model.id);
                                    } else {
                                        fileInputRef.current?.click();
                                    }
                                }}
                            >
                                {heroUrl ? (
                                    <img
                                        src={heroUrl}
                                        alt={model.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs font-medium">Brak zdjęcia</span>
                                    </div>
                                )}

                                {/* Upload overlay */}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-8 h-8 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <span className="text-white text-xs font-bold">Zmień zdjęcie</span>
                                    </div>
                                )}

                                {/* Status badges */}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {hasOverride && (
                                        <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">WŁASNE</span>
                                    )}
                                    {gallery.length > 0 && (
                                        <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{gallery.length} zdjęć</span>
                                    )}
                                </div>

                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                                    </div>
                                )}
                            </div>

                            {/* Model Name & Actions */}
                            <div className="p-3 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">{model.name}</h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{model.id}</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingModel(isEditing ? null : model.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Expanded Edit Panel */}
                                {isEditing && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                        {/* Upload hero */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Zmień zdjęcie główne
                                        </button>

                                        {/* Upload gallery */}
                                        <button
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="w-full py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>
                                            Dodaj do galerii oferty
                                        </button>

                                        {/* Reset */}
                                        {hasOverride && (
                                            <button
                                                onClick={() => removeHeroOverride(model.id)}
                                                className="w-full py-1.5 px-3 text-red-600 rounded-lg text-[10px] font-medium hover:bg-red-50 transition-colors"
                                            >
                                                Przywróć domyślne
                                            </button>
                                        )}

                                        {/* Gallery preview */}
                                        {gallery.length > 0 && (
                                            <div className="pt-2">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Galeria ({gallery.length})</p>
                                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                    {gallery.map((url, idx) => (
                                                        <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 group/thumb">
                                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                                            {overrides[model.id]?.gallery?.includes(url) && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); removeGalleryImage(model.id, url); }}
                                                                    className="absolute inset-0 bg-red-500/60 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
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

                            {/* Hidden file inputs — per model */}
                            {isEditing && (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleHeroUpload(model.id, file);
                                            e.target.value = '';
                                        }}
                                    />
                                    <input
                                        ref={galleryInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const files = e.target.files;
                                            if (files && files.length > 0) handleGalleryUpload(model.id, files);
                                            e.target.value = '';
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
