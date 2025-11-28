import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getOffersForUser, createInstallationFromOffer, getInstallationByOfferId } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import type { Offer } from '../../types';

interface OfferSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInstallationCreated: () => void;
}

export const OfferSearchModal: React.FC<OfferSearchModalProps> = ({ isOpen, onClose, onInstallationCreated }) => {
    const { currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Offer[]>([]);
    const [allSoldOffers, setAllSoldOffers] = useState<Offer[]>([]);

    useEffect(() => {
        if (isOpen && currentUser) {
            // Load all sold offers for the user
            const offers = getOffersForUser(currentUser.id, currentUser.role);
            const soldOffers = offers.filter(o => o.status === 'sold');
            setAllSoldOffers(soldOffers);
            setResults([]);
            setSearchTerm('');
        }
    }, [isOpen, currentUser]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = allSoldOffers.filter(offer => {
            // Check if installation already exists
            if (getInstallationByOfferId(offer.id)) return false;

            const fullName = `${offer.customer.firstName} ${offer.customer.lastName}`.toLowerCase();
            return fullName.includes(term) ||
                offer.customer.lastName.toLowerCase().includes(term) ||
                offer.customer.city.toLowerCase().includes(term);
        });

        setResults(filtered);
    }, [searchTerm, allSoldOffers]);

    const handleCreate = (offer: Offer) => {
        createInstallationFromOffer(offer);
        toast.success('Utworzono zlecenie montażu');
        onInstallationCreated();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-scale-in">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Znajdź Ofertę</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Wpisz imię, nazwisko lub miasto..."
                            className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            autoFocus
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2">
                        {searchTerm && results.length === 0 && (
                            <div className="text-center text-slate-500 py-4">
                                Nie znaleziono ofert (lub już mają montaż).
                            </div>
                        )}

                        {results.map(offer => (
                            <div key={offer.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center transition-colors">
                                <div>
                                    <div className="font-bold text-slate-800">
                                        {offer.customer.firstName} {offer.customer.lastName}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {offer.customer.city} • {new Date(offer.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs font-medium text-slate-600 mt-1">
                                        {offer.product.modelId} • {offer.pricing.finalPriceNet?.toFixed(2) ?? offer.pricing.sellingPriceGross.toFixed(2)} PLN
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCreate(offer)}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-200 transition-colors"
                                >
                                    Dodaj
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
