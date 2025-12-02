import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { Offer } from '../../types';

interface AddMeasurementFromOfferProps {
    onSelect: (offer: Offer) => void;
    onClose: () => void;
}

export const AddMeasurementFromOffer: React.FC<AddMeasurementFromOfferProps> = ({ onSelect, onClose }) => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadOffers();
    }, []);

    const loadOffers = async () => {
        try {
            const data = await DatabaseService.getOffersForMeasurement();
            setOffers(data);
        } catch (error) {
            console.error('Error loading offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOffers = offers.filter(offer => {
        const searchLower = search.toLowerCase();
        return (
            offer.offerNumber.toLowerCase().includes(searchLower) ||
            offer.customer.lastName.toLowerCase().includes(searchLower) ||
            offer.customer.city.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Wybierz ofertę</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 border-b border-slate-700">
                    <input
                        type="text"
                        placeholder="Szukaj po numerze, nazwisku lub mieście..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-accent focus:outline-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center text-slate-400 py-8">Ładowanie ofert...</div>
                    ) : filteredOffers.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">Brak ofert spełniających kryteria</div>
                    ) : (
                        filteredOffers.map(offer => (
                            <div
                                key={offer.id}
                                onClick={() => onSelect(offer)}
                                className="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl cursor-pointer transition-colors group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-white group-hover:text-accent transition-colors">
                                            {offer.offerNumber}
                                        </div>
                                        <div className="text-sm text-slate-300 mt-1">
                                            {offer.customer.firstName} {offer.customer.lastName}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {offer.customer.street} {offer.customer.houseNumber}, {offer.customer.postalCode} {offer.customer.city}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-slate-300">
                                            {new Date(offer.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded mt-2 inline-block
                                            ${offer.status === 'sent' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-500/20 text-gray-300'}
                                        `}>
                                            {offer.status === 'sent' ? 'Wysłana' : 'Szkic'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
