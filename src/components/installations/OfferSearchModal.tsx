import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import type { Offer, Contract, Installation } from '../../types';

interface OfferSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInstallationCreated: () => void;
}

export const OfferSearchModal: React.FC<OfferSearchModalProps> = ({ isOpen, onClose, onInstallationCreated }) => {
    const { currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Offer[]>([]);
    const [eligibleOffers, setEligibleOffers] = useState<Offer[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);

    useEffect(() => {
        if (!isOpen || !currentUser) return;

        const loadData = async () => {
            try {
                const [offers, allContracts, installations] = await Promise.all([
                    DatabaseService.getOffers(),
                    DatabaseService.getContracts(),
                    DatabaseService.getInstallations()
                ]);

                // widoczne oferty dla zalogowanego
                let visibleOffers = offers;
                if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
                    visibleOffers = offers.filter(o => o.createdBy === currentUser.id);
                }

                // umowy dostępne do montaży – wszystkie oprócz anulowanych
                const signedContracts = allContracts.filter(
                    c => c.status !== 'cancelled'
                );
                setContracts(signedContracts);

                const signedOfferIds = new Set(signedContracts.map(c => c.offerId));
                const installedOfferIds = new Set(installations.map(i => i.offerId));

                // oferty, które mają podpisaną/zakończoną umowę i jeszcze nie mają montażu
                const eligible = visibleOffers.filter(
                    o => signedOfferIds.has(o.id) && !installedOfferIds.has(o.id)
                );

                setEligibleOffers(eligible);
                setResults([]);
                setSearchTerm('');
            } catch (error) {
                console.error('Error loading offers/contracts for installations:', error);
                toast.error('Błąd ładowania danych do planowania montażu');
            }
        };

        loadData();
    }, [isOpen, currentUser]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            // Bez filtra pokaż wszystkie oferty z umowami
            setResults(eligibleOffers);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = eligibleOffers.filter(offer => {
            const firstName = (offer.customer.firstName || '').toString().toLowerCase();
            const lastName = (offer.customer.lastName || '').toString().toLowerCase();
            const city = (offer.customer.city || '').toString().toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const offerNumber = (offer.offerNumber || '').toString().toLowerCase();

            return (
                fullName.includes(term) ||
                lastName.includes(term) ||
                city.includes(term) ||
                offerNumber.includes(term)
            );
        });

        setResults(filtered);
    }, [searchTerm, eligibleOffers]);

    const handleCreate = async (offer: Offer) => {
        try {
            const contract = contracts.find(c => c.offerId === offer.id);
            const client = contract?.client || offer.customer;
            const product = contract?.product || offer.product;

            await DatabaseService.createInstallation({
                offerId: offer.id,
                status: 'pending',
                client: {
                    firstName: client.firstName,
                    lastName: client.lastName,
                    city: client.city,
                    address: `${client.street} ${client.houseNumber}, ${client.postalCode} ${client.city}`,
                    phone: client.phone
                },
                productSummary: `${product.modelId} ${product.width}x${product.projection} mm, ${product.roofType}`
            } as Omit<Installation, 'id' | 'createdAt'>);

            toast.success('Utworzono zlecenie montażu z umowy');
            onInstallationCreated();
            onClose();
        } catch (error) {
            console.error('Error creating installation from contract:', error);
            toast.error('Błąd tworzenia montażu');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-xl shadow-xl overflow-y-auto animate-scale-in flex flex-col md:block max-w-lg">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Znajdź klienta z podpisaną umową</h2>
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
                            placeholder="Imię, nazwisko, miasto lub numer oferty..."
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
                                Nie znaleziono klientów z podpisanymi umowami (lub już mają montaż).
                            </div>
                        )}

                        {results.map(offer => {
                            const contract = contracts.find(c => c.offerId === offer.id);
                            return (
                                <div
                                    key={offer.id}
                                    className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center transition-colors"
                                >
                                    <div>
                                        <div className="font-bold text-slate-800">
                                            {offer.customer.firstName} {offer.customer.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {offer.customer.city} • {offer.offerNumber} • {offer.createdAt.toLocaleDateString()}
                                        </div>
                                        {contract && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Umowa: {contract.contractNumber} ({contract.status})
                                            </div>
                                        )}
                                        <div className="text-xs font-medium text-slate-600 mt-1">
                                            {offer.product.modelId} • {(
                                                offer.pricing?.finalPriceNet ??
                                                offer.pricing?.sellingPriceNet ??
                                                0
                                            ).toFixed(2)} €
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCreate(offer)}
                                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-200 transition-colors"
                                    >
                                        Dodaj
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
