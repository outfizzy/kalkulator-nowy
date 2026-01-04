import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { GeocodingService } from '../../services/GeocodingService';
import { MapPin } from 'lucide-react';
import type { Measurement, Offer } from '../../types';

interface MeasurementModalProps {
    measurement: Measurement | null;
    initialData?: Partial<Measurement>;
    onSave: (data: Partial<Measurement>) => void;
    onDelete?: () => void;
    onClose: () => void;
    availableOffers?: Offer[];
}

export const MeasurementModal: React.FC<MeasurementModalProps> = ({ measurement, initialData, onSave, onDelete, onClose, availableOffers = [] }) => {
    const [formData, setFormData] = useState({
        scheduledDate: measurement?.scheduledDate ? new Date(measurement.scheduledDate).toISOString().split('T')[0] : (initialData?.scheduledDate ? new Date(initialData.scheduledDate!).toISOString().split('T')[0] : ''),
        scheduledTime: measurement?.scheduledDate ? new Date(measurement.scheduledDate).toTimeString().slice(0, 5) : '10:00',
        customerName: measurement?.customerName || initialData?.customerName || '',
        customerAddress: measurement?.customerAddress || initialData?.customerAddress || '',
        customerPhone: measurement?.customerPhone || initialData?.customerPhone || '',
        status: measurement?.status || 'scheduled',
        notes: measurement?.notes || initialData?.notes || '',
        locationLat: measurement?.locationLat || initialData?.locationLat || undefined,
        locationLng: measurement?.locationLng || initialData?.locationLng || undefined
    });

    const handleGeocode = async () => {
        if (!formData.customerAddress) {
            toast.error('Wpisz adres');
            return;
        }
        const coords = await GeocodingService.search(formData.customerAddress);
        if (coords) {
            setFormData(prev => ({
                ...prev,
                locationLat: coords.lat,
                locationLng: coords.lng
            }));
            toast.success('Znaleziono lokalizację!');
        } else {
            toast.error('Nie udało się znaleźć lokalizacji');
        }
    };

    const [linkedOffer, setLinkedOffer] = useState<Offer | null>(null);

    useEffect(() => {
        const offerId = measurement?.offerId || initialData?.offerId;
        if (offerId) {
            DatabaseService.getOfferById(offerId).then(setLinkedOffer).catch(console.error);
        } else if (linkedOffer !== null) {
            // Use timeout to avoid synchronous setState warning
            const timer = setTimeout(() => setLinkedOffer(null), 0);
            return () => clearTimeout(timer);
        }
    }, [measurement?.offerId, initialData?.offerId, linkedOffer]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const scheduledDate = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

        onSave({
            scheduledDate,
            customerName: formData.customerName,
            customerAddress: formData.customerAddress,
            customerPhone: formData.customerPhone || undefined,
            status: formData.status as Measurement['status'],
            notes: formData.notes || undefined,
            offerId: initialData?.offerId || measurement?.offerId,
            leadId: initialData?.leadId || measurement?.leadId,
            locationLat: formData.locationLat,
            locationLng: formData.locationLng
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {measurement ? 'Edytuj Pomiar' : 'Nowy Pomiar'}
                    </h2>
                    {linkedOffer && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-sm text-slate-500">Powiązana oferta:</div>
                            <div className="font-medium text-slate-800 flex justify-between items-center">
                                <span>{linkedOffer.offerNumber}</span>
                                <span className="text-accent">{linkedOffer.pricing.totalCost.toLocaleString('pl-PL', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                {linkedOffer.product.modelId} {linkedOffer.product.width}x{linkedOffer.product.projection}mm
                            </div>
                        </div>
                    )}

                    {/* Offer Selection for existing customer */}
                    {!measurement && !linkedOffer && availableOffers.length > 0 && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <label className="block text-sm font-medium text-blue-700 mb-2">
                                Wybierz ofertę klienta (opcjonalnie)
                            </label>
                            <select
                                onChange={(e) => {
                                    const offer = availableOffers.find(o => o.id === e.target.value);
                                    if (offer) {
                                        setLinkedOffer(offer);
                                        setFormData(prev => ({
                                            ...prev,
                                            notes: (prev.notes ? prev.notes + '\n' : '') + `Oferta: ${offer.offerNumber}\nProdukt: ${offer.product.modelId}`
                                        }));
                                    }
                                }}
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none"
                            >
                                <option value="">-- Wybierz ofertę --</option>
                                {availableOffers.map(offer => (
                                    <option key={offer.id} value={offer.id}>
                                        {offer.offerNumber} - {offer.product.modelId} ({offer.pricing.totalCost} €)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                            <input
                                type="date"
                                value={formData.scheduledDate}
                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Godzina</label>
                            <input
                                type="time"
                                value={formData.scheduledTime}
                                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Imię i Nazwisko Klienta</label>
                        <input
                            type="text"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none"
                            placeholder="Imię i nazwisko"
                            required
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Adres</label>
                        <input
                            type="text"
                            value={formData.customerAddress}
                            onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none pr-10"
                            placeholder="Ulica, miasto"
                            required
                        />
                        <button
                            type="button"
                            onClick={handleGeocode}
                            className="absolute right-2 top-8 text-slate-400 hover:text-accent p-1"
                            title="Pobierz lokalizację"
                        >
                            <MapPin className="w-5 h-5" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Telefon</label>
                        <input
                            type="tel"
                            value={formData.customerPhone}
                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none"
                            placeholder="+48 123 456 789"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as Measurement['status'] })}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none"
                        >
                            <option value="scheduled">Zaplanowano</option>
                            <option value="completed">Zrealizowano</option>
                            <option value="cancelled">Anulowano</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Notatki</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-accent focus:outline-none h-24"
                            placeholder="Dodatkowe informacje..."
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 flex justify-between">
                    {onDelete ? (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Usuń
                        </button>
                    ) : <div />}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors font-medium"
                        >
                            Zapisz
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
