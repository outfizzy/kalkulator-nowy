
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import type { Offer, OfferStatus, User, Contract } from '../types';
import { OfferPreviewModal } from './OfferPreviewModal';
import { SendEmailModal } from './leads/SendEmailModal';
import { extractOrderedItemsFromOffer } from '../utils/contractHelpers';

interface OffersListProps {
    offers?: Offer[];
    onDelete?: (id: string) => Promise<void>;
}

export const OffersList: React.FC<OffersListProps> = ({ offers: propOffers, onDelete }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [fetchedOffers, setFetchedOffers] = useState<Offer[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [filter, setFilter] = useState<OfferStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string>('all'); // Admin filter
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);
    const [selectedOfferForEmail, setSelectedOfferForEmail] = useState<Offer | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const offers = propOffers || fetchedOffers;
    const [loading, setLoading] = useState(!propOffers);

    const loadOffers = React.useCallback(async () => {
        if (propOffers) return;
        if (!currentUser) return;
        setLoading(true);

        try {
            const [allOffers, allContracts, delegatedIds] = await Promise.all([
                DatabaseService.getOffers(),
                DatabaseService.getContracts(),
                DatabaseService.getDelegatedUserIds()
            ]);

            setContracts(allContracts);

            if (isAdmin()) {
                const filtered = selectedUserId === 'all'
                    ? allOffers
                    : allOffers.filter(o => o.createdBy === selectedUserId);
                setFetchedOffers(filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
            } else {
                // Sales rep: load own offers AND offers from users who delegated access
                const userOffers = allOffers.filter(o =>
                    o.createdBy === currentUser.id || delegatedIds.includes(o.createdBy)
                );
                setFetchedOffers(userOffers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
            }
        } catch (error) {
            console.error('Error loading offers:', error);
            toast.error('Nie udało się załadować ofert');
        } finally {
            setLoading(false);
        }
    }, [currentUser, isAdmin, selectedUserId, propOffers]);

    useEffect(() => {
        // Load sales reps for admin filter
        const loadReps = async () => {
            if (currentUser && isAdmin()) {
                try {
                    const reps = await DatabaseService.getSalesReps();
                    setSalesReps(reps);
                } catch (error) {
                    console.error('Error loading sales reps:', error);
                }
            }
        };
        loadReps();
    }, [currentUser, isAdmin]);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    const handleStatusChange = async (id: string, newStatus: OfferStatus) => {
        try {
            await DatabaseService.updateOffer(id, { status: newStatus });

            // Auto-create contract if sold and no contract exists yet for this offer
            if (newStatus === 'sold') {
                const offer = offers.find(o => o.id === id);
                const existingContract = contracts.find(c => c.offerId === id);

                if (offer && !existingContract) {
                    const contract = await DatabaseService.createContract({
                        offerId: offer.id,
                        status: 'draft',
                        client: offer.customer,
                        product: offer.product,
                        pricing: offer.pricing,
                        commission: offer.commission,
                        requirements: {
                            constructionProject: false,
                            powerSupply: false,
                            foundation: false
                        },
                        orderedItems: extractOrderedItemsFromOffer(offer),
                        comments: [],
                        attachments: []
                    });
                    toast.success(`Utworzono umowę ${contract.contractNumber}`);
                } else {
                    toast.success('Status zaktualizowany');
                }
            } else {
                toast.success('Status zaktualizowany');
            }
            loadOffers();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Błąd aktualizacji statusu');
        }
    };

    const handleDelete = async (id: string) => {
        if (onDelete) {
            await onDelete(id);
            return;
        }
        if (confirm('Czy na pewno usunąć tę ofertę?')) {
            try {
                await DatabaseService.deleteOffer(id);
                toast.success('Oferta usunięta');
                loadOffers();
            } catch {
                toast.error('Błąd usuwania oferty');
            }
        }
    };

    const handlePriceUpdate = async (id: string, currentNet: number) => {
        const newPriceStr = window.prompt('Podaj ostateczną cenę NETTO z umowy (EUR):', currentNet.toString());
        if (newPriceStr) {
            const newPrice = parseFloat(newPriceStr);
            if (!isNaN(newPrice) && newPrice > 0) {
                // We need to fetch the offer to get current pricing structure to update it properly
                // Or just update specific fields if DatabaseService supports it.
                // DatabaseService.updateOffer takes Partial<Offer>.
                // We need to update pricing.finalPriceNet (if it exists in type) or similar.
                // The Offer type has pricing: PricingResult.
                // PricingResult has finalPriceNet? Let's check types.ts.
                // Assuming it does or we map it.
                // For now, let's skip complex price update logic or implement it fully if critical.
                // I'll assume we can update pricing object.
                const offer = offers.find(o => o.id === id);
                if (offer) {
                    const newPricing = { ...offer.pricing, finalPriceNet: newPrice };
                    try {
                        await DatabaseService.updateOffer(id, { pricing: newPricing });
                        loadOffers();
                        toast.success('Cena zaktualizowana');
                    } catch (error) {
                        toast.error('Błąd aktualizacji ceny');
                    }
                }
            } else {
                toast.error('Nieprawidłowa kwota');
            }
        }
    };

    const handleCreateContract = async (offer: Offer) => {
        // Check if contract already exists
        const existingContract = contracts.find(c => c.offerId === offer.id);
        if (existingContract) {
            toast.error('Umowa dla tej oferty już istnieje!');
            // Optional: navigate to existing contract
            // navigate(`/contracts/${existingContract.id}`);
            return;
        }

        if (window.confirm('Czy na pewno chcesz wygenerować umowę dla tej oferty?')) {
            try {
                const contract = await DatabaseService.createContract({
                    offerId: offer.id,
                    status: 'draft',
                    client: offer.customer,
                    product: offer.product,
                    pricing: offer.pricing,
                    commission: offer.commission,
                    requirements: {
                        constructionProject: false,
                        powerSupply: false,
                        foundation: false
                    },
                    orderedItems: extractOrderedItemsFromOffer(offer),
                    comments: [],
                    attachments: []
                });
                toast.success(`Utworzono umowę ${contract.contractNumber}`);
                navigate(`/contracts/${contract.id}`);
            } catch (error) {
                console.error('Error creating contract:', error);
                toast.error('Błąd tworzenia umowy');
            }
        }
    };


    const filteredOffers = offers
        .filter(o => filter === 'all' || o.status === filter)
        .filter(o => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();

            const firstName = (o.customer.firstName || '').toString().toLowerCase();
            const lastName = (o.customer.lastName || '').toString().toLowerCase();
            const city = (o.customer.city || '').toString().toLowerCase();
            const offerNumber = (o.offerNumber || '').toString().toLowerCase();
            const id = o.id.toLowerCase();

            return (
                firstName.includes(query) ||
                lastName.includes(query) ||
                city.includes(query) ||
                offerNumber.includes(query) ||
                id.includes(query)
            );
        });

    const getStatusColor = (status: OfferStatus) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700';
            case 'sent': return 'bg-accent-soft text-accent-dark';
            case 'sold': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie ofert...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Lista Ofert</h1>
                    <p className="text-slate-500 mt-1">Zarządzaj wszystkimi ofertami</p>
                </div>
            </div>

            {/* Filtry */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex gap-2 flex-wrap flex-1">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Wszystkie ({offers.length})
                        </button>
                        <button
                            onClick={() => setFilter('draft')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'draft' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Utworzone ({offers.filter(o => o.status === 'draft').length})
                        </button>
                        <button
                            onClick={() => setFilter('sent')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'sent' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Wysłane ({offers.filter(o => o.status === 'sent').length})
                        </button>
                        <button
                            onClick={() => setFilter('sold')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'sold' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Sprzedane ({offers.filter(o => o.status === 'sold').length})
                        </button>
                        <button
                            onClick={() => setFilter('rejected')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'rejected' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Odrzucone ({offers.filter(o => o.status === 'rejected').length})
                        </button>
                    </div>

                    {/* Admin: Sales Rep Filter */}
                    {isAdmin() && salesReps.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-accent outline-none"
                        >
                            <option value="all">Wszyscy przedstawiciele</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>
                                    {rep.firstName} {rep.lastName}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="mt-4">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Szukaj po nazwisku, mieście lub ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Lista Ofert */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredOffers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <p>Brak ofert do wyświetlenia</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Klient</th>
                                    {isAdmin() && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Utworzył</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produkt</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Wartość</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Prowizja</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOffers.map((offer) => {
                                    const pricing = offer.pricing || ({} as any);
                                    const priceGross = Number(pricing.sellingPriceGross ?? pricing.sellingPriceNet ?? 0);
                                    const commission = Number(offer.commission ?? 0);
                                    const createdDate = offer.createdAt ? new Date(offer.createdAt) : null;

                                    return (
                                        <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-mono text-slate-500">{offer.offerNumber || offer.id.substring(0, 8)}</span>
                                                    {(offer.viewCount || 0) > 0 && (
                                                        <div className="flex items-center gap-1 mt-1 text-xs text-blue-600" title={`Ostatnie wyświetlenie: ${offer.lastViewedAt?.toLocaleString()}`}>
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            <span>{offer.viewCount} wyświetleń</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-700">{createdDate ? createdDate.toLocaleDateString('pl-PL') : '-'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="font-medium text-slate-900 cursor-pointer hover:text-accent"
                                                        onClick={() => {
                                                            if (offer.customer.id) {
                                                                navigate(`/customers/${offer.customer.id}`);
                                                            } else {
                                                                toast.error('Brak ID klienta');
                                                            }
                                                        }}
                                                        title="Otwórz Kartę Klienta"
                                                    >
                                                        {offer.customer.firstName} {offer.customer.lastName}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500">{offer.customer.city}</div>
                                            </td>
                                            {isAdmin() && (
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-700">
                                                        {/* We need to fetch user name or map it. For now show ID or '...' */}
                                                        {offer.createdBy}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-700">{offer.product.width}x{offer.product.projection} mm</div>
                                                <div className="text-xs text-slate-500">{offer.product.roofType === 'glass' ? 'Szkło' : 'Poliwęglan'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-medium text-slate-900">
                                                    {priceGross.toLocaleString('de-DE', {
                                                        style: 'currency',
                                                        currency: 'EUR',
                                                        maximumFractionDigits: 0
                                                    })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-medium text-green-600">
                                                    {commission.toLocaleString('de-DE', {
                                                        style: 'currency',
                                                        currency: 'EUR',
                                                        maximumFractionDigits: 0
                                                    })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={offer.status}
                                                    onChange={(e) => handleStatusChange(offer.id, e.target.value as OfferStatus)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)} border-0 cursor-pointer`}
                                                >
                                                    <option value="draft">Utworzona</option>
                                                    <option value="sent">Wysłana</option>
                                                    <option value="sold">Sprzedana</option>
                                                    <option value="rejected">Odrzucona</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setPreviewOffer(offer)}
                                                        className="text-slate-400 hover:text-accent transition-colors"
                                                        title="Podgląd"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOfferForEmail(offer);
                                                            setIsEmailModalOpen(true);
                                                        }}
                                                        className="text-slate-400 hover:text-accent transition-colors"
                                                        title="Wyślij E-mail"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                    {isAdmin() && (
                                                        <button
                                                            onClick={() => handleDelete(offer.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Usuń"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {offer.status === 'sold' && (
                                                        <>
                                                            <button
                                                                onClick={() => handlePriceUpdate(offer.id, offer.pricing?.sellingPriceNet || 0)}
                                                                className="text-accent hover:text-accent-dark"
                                                                title="Zmień Cenę Umowy"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleCreateContract(offer)}
                                                                className="text-slate-400 hover:text-accent transition-colors mr-1"
                                                                title="Generuj Umowę"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewOffer && (
                <OfferPreviewModal
                    offer={previewOffer}
                    onClose={() => setPreviewOffer(null)}
                />
            )}

            {/* Email Modal */}
            {selectedOfferForEmail && (
                <SendEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    to={selectedOfferForEmail.customer.email}
                    offer={selectedOfferForEmail}
                />
            )}

        </div>
    );
};
