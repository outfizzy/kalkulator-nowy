import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { updateInstallation, getTeams } from '../../utils/storage';
import { geocodeAddress } from '../../utils/geocoding';
import { generateInstallationProtocolPDF } from '../../utils/installationProtocolPDF';
import { PhotoGallery } from '../PhotoGallery';
import { getOfferPhotos, addOfferPhoto, removeOfferPhoto } from '../../utils/offerPhotos';
import type { Installation, InstallationTeam, InstallationStatus } from '../../types';

interface InstallationDetailsModalProps {
    installation: Installation;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const InstallationDetailsModal: React.FC<InstallationDetailsModalProps> = ({ installation, isOpen, onClose, onUpdate }) => {
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [formData, setFormData] = useState<Partial<Installation>>({});
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTeams(getTeams());
            setFormData({
                ...installation,
                client: { ...installation.client } // Deep copy client to avoid mutation issues
            });
            setPhotos(getOfferPhotos(installation.offerId));
        }
    }, [isOpen, installation]);

    if (!isOpen) return null;

    const handleChange = (field: keyof Installation, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleClientChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            client: {
                ...prev.client!,
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!formData.id) return;

        // Check if address changed, if so, re-geocode
        if (
            formData.client?.address !== installation.client.address ||
            formData.client?.city !== installation.client.city
        ) {
            setIsGeocoding(true);
            const coords = await geocodeAddress(formData.client!.address, formData.client!.city);
            if (coords) {
                setFormData(prev => ({
                    ...prev,
                    client: {
                        ...prev.client!,
                        coordinates: coords
                    }
                }));
                toast.success('Zaktualizowano współrzędne GPS');
            } else {
                toast.error('Nie udało się znaleźć współrzędnych dla nowego adresu');
            }
            setIsGeocoding(false);
        }

        updateInstallation(formData as Installation);
        toast.success('Zapisano zmiany');
        onUpdate();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Szczegóły Montażu</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status & Assignment */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value as InstallationStatus)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            >
                                <option value="pending">Oczekujący</option>
                                <option value="scheduled">Zaplanowany</option>
                                <option value="completed">Zakończony</option>
                                <option value="issue">Problem</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ekipa</label>
                            <select
                                value={formData.teamId || ''}
                                onChange={(e) => handleChange('teamId', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            >
                                <option value="">-- Nieprzypisana --</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input
                                type="date"
                                value={formData.scheduledDate || ''}
                                onChange={(e) => handleChange('scheduledDate', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Client Details */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3">Dane Klienta i Lokalizacja</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Imię i Nazwisko</label>
                                <div className="font-medium">{formData.client?.firstName} {formData.client?.lastName}</div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Telefon</label>
                                <div className="font-medium">{formData.client?.phone}</div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Ulica i Numer</label>
                                <input
                                    type="text"
                                    value={formData.client?.address || ''}
                                    onChange={(e) => handleClientChange('address', e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Miasto</label>
                                <input
                                    type="text"
                                    value={formData.client?.city || ''}
                                    onChange={(e) => handleClientChange('city', e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded text-sm"
                                />
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                            <span>GPS: {formData.client?.coordinates ? `${formData.client.coordinates.lat.toFixed(4)}, ${formData.client.coordinates.lng.toFixed(4)}` : 'Brak'}</span>
                            {isGeocoding && <span className="text-blue-500">Aktualizowanie...</span>}
                        </div>
                    </div>

                    {/* Product Summary */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Produkt</label>
                        <div className="p-3 bg-slate-100 rounded-lg text-slate-700 text-sm">
                            {formData.productSummary}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notatki dla Ekipy</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Np. kod do bramy, uwaga na psa, specyficzne warunki montażu..."
                            className="w-full p-3 border border-slate-300 rounded-lg h-32 focus:ring-2 focus:ring-accent outline-none resize-none"
                        />
                    </div>

                    {/* Photos Section */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Zdjęcia Montażu</label>

                        {/* Upload Button */}
                        <div className="mb-4">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    files.forEach(file => {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const imageData = event.target?.result as string;
                                            addOfferPhoto(installation.offerId, imageData);
                                            setPhotos(getOfferPhotos(installation.offerId));
                                        };
                                        reader.readAsDataURL(file);
                                    });
                                    e.target.value = ''; // Reset input
                                }}
                                className="hidden"
                                id="photo-upload"
                            />
                            <label
                                htmlFor="photo-upload"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg cursor-pointer transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Dodaj Zdjęcia
                            </label>
                            <span className="ml-3 text-sm text-slate-500">
                                {photos.length} {photos.length === 1 ? 'zdjęcie' : 'zdjęć'}
                            </span>
                        </div>

                        {/* Photo Gallery */}
                        <PhotoGallery
                            photos={photos}
                            onDelete={(index) => {
                                removeOfferPhoto(installation.offerId, index);
                                setPhotos(getOfferPhotos(installation.offerId));
                                toast.success('Usunięto zdjęcie');
                            }}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                    {/* Download Protocol PDF Button */}
                    <button
                        onClick={() => {
                            const offerPhotos = getOfferPhotos(installation.offerId);
                            if (offerPhotos && offerPhotos.length > 0) {
                                generateInstallationProtocolPDF(formData as Installation);
                                toast.success('Generowanie protokołu PDF...');
                            } else {
                                toast.error('Dodaj zdjęcia przed wygenerowaniem protokołu');
                            }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Pobierz Protokół PDF
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isGeocoding}
                            className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50"
                        >
                            {isGeocoding ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
