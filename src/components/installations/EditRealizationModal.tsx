import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, MapPin, Camera, Loader2, Trash2, Star } from 'lucide-react';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import { GeocodingService } from '../../services/geocoding.service';
import { toast } from 'react-hot-toast';
import type { Realization, RealizationPhoto } from '../../services/database/realization.service';
import { supabase } from '../../services/database/base.service';

interface EditRealizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    realization: Realization;
    onSuccess: () => void;
}

const PRODUCT_TYPES = [
    'Terrassenüberdachung',
    'Carport',
    'Pergola',
    'Lamellendach',
    'Zaun',
    'Tor',
    'Vordach',
    'Wintergarten',
    'Sonstiges',
];

export const EditRealizationModal: React.FC<EditRealizationModalProps> = ({ isOpen, onClose, realization, onSuccess }) => {
    const [form, setForm] = useState({
        title: realization.title,
        product_type: realization.product_type,
        address: realization.address || '',
        city: realization.city || '',
        postal_code: realization.postal_code || '',
        description: realization.description || '',
        client_name: realization.client_name || '',
        completion_date: realization.completion_date || '',
    });

    const [existingPhotos, setExistingPhotos] = useState<RealizationPhoto[]>(realization.photos || []);
    const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
    const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeResult, setGeocodeResult] = useState<{ lat: number; lng: number } | null>(
        realization.latitude && realization.longitude ? { lat: realization.latitude, lng: realization.longitude } : null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cityManuallyEdited = useRef(false);

    // Sync state when realization changes
    useEffect(() => {
        setForm({
            title: realization.title,
            product_type: realization.product_type,
            address: realization.address || '',
            city: realization.city || '',
            postal_code: realization.postal_code || '',
            description: realization.description || '',
            client_name: realization.client_name || '',
            completion_date: realization.completion_date || '',
        });
        setExistingPhotos(realization.photos || []);
        setGeocodeResult(realization.latitude && realization.longitude ? { lat: realization.latitude, lng: realization.longitude } : null);
        setNewPhotoFiles([]);
        setNewPhotoPreviews([]);
        cityManuallyEdited.current = false;
    }, [realization]);

    // Auto-fill city from postal code via Google Geocoding
    useEffect(() => {
        const plz = (form.postal_code || '').trim();
        if (!plz || cityManuallyEdited.current) return;

        const country = GeocodingService.detectCountryFromPLZ(plz);
        GeocodingService.lookupCity(plz, country, 'realizationEditModal').then(result => {
            if (result?.city && !cityManuallyEdited.current) {
                setForm(prev => ({ ...prev, city: result.city }));
            }
        });
    }, [form.postal_code]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Reset geocode when address changes
        if (['address', 'city', 'postal_code'].includes(name)) {
            setGeocodeResult(null);
        }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const totalPhotos = existingPhotos.length + newPhotoFiles.length + files.length;
        if (totalPhotos > 15) {
            toast.error('Maksymalnie 15 zdjęć');
            return;
        }

        setNewPhotoFiles(prev => [...prev, ...files]);

        // Generate previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setNewPhotoPreviews(prev => [...prev, ev.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeExistingPhoto = (index: number) => {
        const removed = existingPhotos[index];
        setExistingPhotos(prev => {
            const updated = prev.filter((_, i) => i !== index);
            // If we deleted the cover photo, set the first remaining photo as cover
            if (removed.is_cover && updated.length > 0) {
                updated[0].is_cover = true;
            }
            return updated;
        });
    };

    const removeNewPhoto = (index: number) => {
        setNewPhotoFiles(prev => prev.filter((_, i) => i !== index));
        setNewPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const setAsCover = (index: number, isNew: boolean) => {
        if (isNew) {
            toast.info('Zapisz zmiany najpierw, aby ustawić nowe zdjęcie jako okładkę.');
            return;
        }

        setExistingPhotos(prev =>
            prev.map((photo, idx) => ({
                ...photo,
                is_cover: idx === index,
            }))
        );
        toast.success('Ustawiono jako zdjęcie główne (okładkę)');
    };

    const handleGeocode = async () => {
        if (!form.address && !form.city && !form.postal_code) {
            toast.error('Wprowadź adres, miasto lub kod pocztowy');
            return;
        }

        setIsGeocoding(true);
        try {
            const fullAddress = [form.address, form.postal_code, form.city].filter(Boolean).join(', ');
            const coords = await geocodeAddress(fullAddress);
            if (coords) {
                setGeocodeResult(coords);
                toast.success(`Znaleziono: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
            } else {
                toast.error('Lokalizacja nie została znaleziona');
            }
        } catch {
            toast.error('Błąd geokodowania');
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            toast.error('Tytuł jest wymagany');
            return;
        }

        if (!geocodeResult && (form.address || form.city)) {
            // Auto-geocode before saving
            await handleGeocode();
        }

        setIsSubmitting(true);
        try {
            // 1. Upload new photos if any
            const uploadedPhotos: RealizationPhoto[] = [];
            for (let i = 0; i < newPhotoFiles.length; i++) {
                const file = newPhotoFiles[i];
                const ext = file.name.split('.').pop() || 'jpg';
                const filePath = `${realization.id}/${Date.now()}_new_${i}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from('realizations')
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });

                if (uploadError) {
                    console.error('Photo upload error:', uploadError);
                    continue;
                }

                const { data: urlData } = supabase.storage
                    .from('realizations')
                    .getPublicUrl(filePath);

                uploadedPhotos.push({
                    url: urlData.publicUrl,
                    caption: file.name.replace(/\.[^.]+$/, ''),
                    is_cover: false
                });
            }

            // 2. Merge existing and newly uploaded photos
            let finalPhotos = [...existingPhotos, ...uploadedPhotos];
            
            // If no photo is set as cover and we have photos, make the first one cover
            if (finalPhotos.length > 0 && !finalPhotos.some(p => p.is_cover)) {
                finalPhotos[0].is_cover = true;
            }

            // 3. Update database
            await DatabaseService.updateRealization(realization.id, {
                title: form.title,
                product_type: form.product_type,
                address: form.address || undefined,
                city: form.city || undefined,
                postal_code: form.postal_code || undefined,
                description: form.description || undefined,
                client_name: form.client_name || undefined,
                completion_date: form.completion_date || undefined,
                latitude: geocodeResult?.lat || null,
                longitude: geocodeResult?.lng || null,
                photos: finalPhotos
            } as any);

            toast.success('Zmiany zostały zapisane!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating realization:', error);
            toast.error('Błąd zapisu realizacji');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-blue-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Edytuj realizację</h2>
                        <p className="text-sm text-slate-500">Modyfikuj dane referencji i zdjęcia</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-5">
                    {/* Title & Product Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tytuł *</label>
                            <input
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="np. TGA Classic 6x4m"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Typ produktu *</label>
                            <select
                                name="product_type"
                                value={form.product_type}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {PRODUCT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Opis</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Dodatkowy opis realizacji..."
                            rows={2}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Address */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            Lokalizacja
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <input
                                    type="text"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Ulica i numer"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    name="postal_code"
                                    value={form.postal_code}
                                    onChange={e => {
                                        cityManuallyEdited.current = false;
                                        handleChange(e);
                                    }}
                                    placeholder="Kod pocztowy"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={e => {
                                        cityManuallyEdited.current = true;
                                        handleChange(e);
                                    }}
                                    placeholder="Miejscowość"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <button
                                onClick={handleGeocode}
                                disabled={isGeocoding}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                Zlokalizuj
                            </button>
                        </div>
                        {geocodeResult && (
                            <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                ✅ Współrzędne GPS: {geocodeResult.lat.toFixed(4)}, {geocodeResult.lng.toFixed(4)}
                            </div>
                        )}
                    </div>

                    {/* Client & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nazwa klienta (opcjonalnie)</label>
                            <input
                                type="text"
                                name="client_name"
                                value={form.client_name}
                                onChange={handleChange}
                                placeholder="Imię i nazwisko klienta"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data zakończenia</label>
                            <input
                                type="date"
                                name="completion_date"
                                value={form.completion_date}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Photo Management */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Camera className="w-4 h-4 text-blue-500" />
                                Zdjęcia realizacji ({existingPhotos.length + newPhotoFiles.length})
                            </label>
                        </div>

                        {/* Existing photos grid */}
                        {existingPhotos.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Obecne zdjęcia (kliknij gwiazdkę ⭐️ aby ustawić okładkę)</span>
                                <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                                    {existingPhotos.map((photo, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square border border-slate-200">
                                            <img
                                                src={photo.url}
                                                alt={`Photo ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Cover star */}
                                            <button
                                                onClick={() => setAsCover(idx, false)}
                                                className={`absolute top-1 left-1 rounded-full p-1 transition-all ${
                                                    photo.is_cover 
                                                        ? 'bg-yellow-500 text-white opacity-100 shadow-sm' 
                                                        : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/70'
                                                }`}
                                                title="Ustaw jako okładkę"
                                            >
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                            
                                            {/* Delete button */}
                                            <button
                                                onClick={() => removeExistingPhoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Usuń"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                            {photo.is_cover && (
                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                                                    Główne
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New photo previews */}
                        {newPhotoPreviews.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Nowe zdjęcia do dodania</span>
                                <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                                    {newPhotoPreviews.map((preview, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square border border-slate-200">
                                            <img
                                                src={preview}
                                                alt={`New Preview ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => removeNewPhoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                        >
                            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                            <p className="text-xs text-slate-600 font-medium">Dodaj więcej zdjęć</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG, WebP • max 15 plików łącznie</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !form.title.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Zapisywanie...
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4" />
                                Zapisz zmiany
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
