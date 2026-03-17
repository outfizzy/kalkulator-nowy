import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, MapPin, Camera, Loader2, Trash2 } from 'lucide-react';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import { GeocodingService } from '../../services/geocoding.service';
import { toast } from 'react-hot-toast';
import type { CreateRealizationInput } from '../../services/database/realization.service';

interface AddRealizationModalProps {
    isOpen: boolean;
    onClose: () => void;
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

export const AddRealizationModal: React.FC<AddRealizationModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [form, setForm] = useState<CreateRealizationInput>({
        title: '',
        product_type: 'Terrassenüberdachung',
        address: '',
        city: '',
        postal_code: '',
        description: '',
        client_name: '',
        completion_date: '',
    });

    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeResult, setGeocodeResult] = useState<{ lat: number; lng: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cityManuallyEdited = useRef(false);

    // Auto-fill city from postal code via Google Geocoding
    useEffect(() => {
        const plz = (form.postal_code || '').trim();
        if (!plz || cityManuallyEdited.current) return;

        const country = GeocodingService.detectCountryFromPLZ(plz);
        GeocodingService.lookupCity(plz, country, 'realizationModal').then(result => {
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
        if (photoFiles.length + files.length > 10) {
            toast.error('Maximal 10 Fotos');
            return;
        }

        const newFiles = [...photoFiles, ...files];
        setPhotoFiles(newFiles);

        // Generate previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (index: number) => {
        setPhotoFiles(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleGeocode = async () => {
        if (!form.address && !form.city && !form.postal_code) {
            toast.error('Adresse, Ort oder PLZ eingeben');
            return;
        }

        setIsGeocoding(true);
        try {
            const fullAddress = [form.address, form.postal_code, form.city].filter(Boolean).join(', ');
            const coords = await geocodeAddress(fullAddress);
            if (coords) {
                setGeocodeResult(coords);
                toast.success(`Gefunden: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
            } else {
                toast.error('Standort nicht gefunden — versuchen Sie eine genauere Adresse');
            }
        } catch {
            toast.error('Geocoding-Fehler');
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            toast.error('Titel ist erforderlich');
            return;
        }

        if (!geocodeResult && (form.address || form.city)) {
            // Auto-geocode before saving
            await handleGeocode();
        }

        setIsSubmitting(true);
        try {
            await DatabaseService.createRealization(
                {
                    ...form,
                    latitude: geocodeResult?.lat,
                    longitude: geocodeResult?.lng,
                    source: 'manual',
                },
                photoFiles
            );

            toast.success('Referenz hinzugefügt!');
            onSuccess();
            onClose();

            // Reset form
            setForm({
                title: '',
                product_type: 'Terrassenüberdachung',
                address: '',
                city: '',
                postal_code: '',
                description: '',
                client_name: '',
                completion_date: '',
            });
            setPhotoFiles([]);
            setPhotoPreviews([]);
            setGeocodeResult(null);
        } catch (error) {
            console.error('Error creating realization:', error);
            toast.error('Fehler beim Erstellen der Referenz');
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
                        <h2 className="text-lg font-bold text-slate-800">Referenz hinzufügen</h2>
                        <p className="text-sm text-slate-500">Fotos und Daten einer neuen Referenz auf der Karte hinzufügen</p>
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
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titel *</label>
                            <input
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="np. TGA Classic 6x4m, RAL 7016"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Produkttyp *</label>
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
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Beschreibung</label>
                        <textarea
                            name="description"
                            value={form.description || ''}
                            onChange={handleChange}
                            placeholder="Optionale Beschreibung der Referenz..."
                            rows={2}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Address */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            Standort
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <input
                                    type="text"
                                    name="address"
                                    value={form.address || ''}
                                    onChange={handleChange}
                                    placeholder="Straße und Nummer"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    name="postal_code"
                                    value={form.postal_code || ''}
                                    onChange={e => {
                                        cityManuallyEdited.current = false;
                                        handleChange(e);
                                    }}
                                    placeholder="PLZ"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    name="city"
                                    value={form.city || ''}
                                    onChange={e => {
                                        cityManuallyEdited.current = true;
                                        handleChange(e);
                                    }}
                                    placeholder="Ort"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <button
                                onClick={handleGeocode}
                                disabled={isGeocoding}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                Lokalisieren
                            </button>
                        </div>
                        {geocodeResult && (
                            <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                ✅ Gefunden: {geocodeResult.lat.toFixed(4)}, {geocodeResult.lng.toFixed(4)}
                            </div>
                        )}
                    </div>

                    {/* Client & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kunde (optional)</label>
                            <input
                                type="text"
                                name="client_name"
                                value={form.client_name || ''}
                                onChange={handleChange}
                                placeholder="Vor- und Nachname des Kunden"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fertigstellungsdatum</label>
                            <input
                                type="date"
                                name="completion_date"
                                value={form.completion_date || ''}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Camera className="w-4 h-4 text-blue-500" />
                                Referenzfotos
                            </label>
                            <span className="text-xs text-slate-400">{photoFiles.length}/10</span>
                        </div>

                        {/* Upload area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                        >
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 font-medium">Klicken Sie, um Fotos hinzuzufügen</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP • max. 10 Dateien</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />

                        {/* Photo previews */}
                        {photoPreviews.length > 0 && (
                            <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                                {photoPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square">
                                        <img
                                            src={preview}
                                            alt={`Preview ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {idx === 0 && (
                                            <div className="absolute top-1 left-1 bg-yellow-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                                COVER
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !form.title.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Wird gespeichert...
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4" />
                                Referenz hinzufügen
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
