
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getOffersForUser, updateOfferStatus, deleteOffer, updateOfferFinalPrice, getSalesReps, getUserById, getAllOffers, createInstallationFromOffer, getInstallationByOfferId, createContractFromOffer, getContractByOfferId, getReportsForOffer } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import type { Offer, OfferStatus, User } from '../types';
import { ClientCRMModal } from './crm/ClientCRMModal';
import { OfferPreviewModal } from './OfferPreviewModal';

export const OffersList: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [filter, setFilter] = useState<OfferStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string>('all'); // Admin filter
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);

    const loadOffers = React.useCallback(() => {
        if (!currentUser) return;

        // Admin: load all or filter by selected user
        if (isAdmin()) {
            const allOffers = getAllOffers();
            const filtered = selectedUserId === 'all'
                ? allOffers
                : allOffers.filter(o => o.createdBy === selectedUserId);
            setOffers(filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        } else {
            // Sales rep: load only own offers
            const userOffers = getOffersForUser(currentUser.id, currentUser.role);
            setOffers(userOffers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        }
    }, [currentUser, isAdmin, selectedUserId]);

    useEffect(() => {
        // Load sales reps for admin filter
        if (currentUser && isAdmin()) {
            setSalesReps(getSalesReps());
        }
    }, [currentUser, isAdmin]);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    const handleStatusChange = (id: string, newStatus: OfferStatus) => {
        updateOfferStatus(id, newStatus);

        // Auto-create contract if sold
        if (newStatus === 'sold') {
            const offer = offers.find(o => o.id === id);
            if (offer && !getContractByOfferId(id)) {
                const contract = createContractFromOffer(offer);
                toast.success(`Oferta sprzedana. Utworzono umowę ${contract.contractNumber}`);
            } else {
                toast.success('Status zaktualizowany');
            }
        } else {
            toast.success('Status zaktualizowany');
        }

        loadOffers();
    };

    const handleDelete = (id: string) => {
        if (confirm('Czy na pewno usunąć tę ofertę?')) {
            deleteOffer(id);
            toast.success('Oferta usunięta');
            loadOffers();
        }
    };

    const handlePriceUpdate = (id: string, currentNet: number) => {
        const newPriceStr = window.prompt('Podaj ostateczną cenę NETTO z umowy (EUR):', currentNet.toString());
        if (newPriceStr) {
            const newPrice = parseFloat(newPriceStr);
            if (!isNaN(newPrice) && newPrice > 0) {
                updateOfferFinalPrice(id, newPrice);
                loadOffers(); // Reload filtered offers
                toast.success('Cena i prowizja zaktualizowane');
            } else {
                toast.error('Nieprawidłowa kwota');
            }
        }
    };

    const handleCreateContract = (offer: Offer) => {
        if (window.confirm('Czy na pewno chcesz wygenerować umowę dla tej oferty?')) {
            const contract = createContractFromOffer(offer);
            toast.success(`Utworzono umowę ${contract.contractNumber} `);
            navigate(`/ contracts / ${contract.id} `);
        }
    };

    const handleCreateInstallation = (offer: Offer) => {
        createInstallationFromOffer(offer);
        toast.success('Utworzono zlecenie montażu');
        navigate('/installations');
    };

    // CRM Modal State
    const [selectedCustomer, setSelectedCustomer] = useState<import('../types').Customer | null>(null);
    const [showCRMModal, setShowCRMModal] = useState(false);

    const handleOpenCRM = (customer: import('../types').Customer) => {
        setSelectedCustomer(customer);
        setShowCRMModal(true);
    };

    const handleViewInstallation = () => {
        navigate('/installations');
    };

    const filteredOffers = offers
        .filter(o => filter === 'all' || o.status === filter)
        .filter(o => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                o.customer.firstName.toLowerCase().includes(query) ||
                o.customer.lastName.toLowerCase().includes(query) ||
                o.customer.city.toLowerCase().includes(query) ||
                o.id.toLowerCase().includes(query)
            );
        });

    const getStatusColor = (status: OfferStatus) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700';
            case 'sent': return 'bg-blue-100 text-blue-700';
            case 'sold': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
        }
    };

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
                            className={`px - 4 py - 2 rounded - lg font - medium transition - colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} `}
                        >
                            Wszystkie ({offers.length})
                        </button>
                        <button
                            onClick={() => setFilter('draft')}
                            className={`px - 4 py - 2 rounded - lg font - medium transition - colors ${filter === 'draft' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} `}
                        >
                            Utworzone ({offers.filter(o => o.status === 'draft').length})
                        </button>
                        <button
                            onClick={() => setFilter('sent')}
                            className={`px - 4 py - 2 rounded - lg font - medium transition - colors ${filter === 'sent' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} `}
                        >
                            Wysłane ({offers.filter(o => o.status === 'sent').length})
                        </button>
                        <button
                            onClick={() => setFilter('sold')}
                            className={`px - 4 py - 2 rounded - lg font - medium transition - colors ${filter === 'sold' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} `}
                        >
                            Sprzedane ({offers.filter(o => o.status === 'sold').length})
                        </button>
                        <button
                            onClick={() => setFilter('rejected')}
                            className={`px - 4 py - 2 rounded - lg font - medium transition - colors ${filter === 'rejected' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} `}
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pomiar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Montaż</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOffers.map((offer) => (
                                    <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-mono text-slate-500">#{offer.id}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-700">{offer.createdAt.toLocaleDateString('pl-PL')}</span>
                                        </td>
                                        // ... inside component ...

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-slate-900">{offer.customer.firstName} {offer.customer.lastName}</div>
                                                <button
                                                    onClick={() => handleOpenCRM(offer.customer)}
                                                    className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 transition-colors"
                                                    title="Otwórz Kartę Klienta"
                                                >
                                                    CRM
                                                </button>
                                            </div>
                                            <div className="text-xs text-slate-500">{offer.customer.city}</div>
                                        </td>
                                        {isAdmin() && (
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-700">
                                                    {getUserById(offer.createdBy)?.firstName} {getUserById(offer.createdBy)?.lastName || 'Nieznany'}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">{offer.product.width}x{offer.product.projection} mm</div>
                                            <div className="text-xs text-slate-500">{offer.product.roofType === 'glass' ? 'Szkło' : 'Poliwęglan'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-slate-900">
                                                {offer.pricing.sellingPriceGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-green-600">
                                                {offer.commission.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
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
                                            {(() => {
                                                const reports = getReportsForOffer(offer.id);
                                                if (reports.length === 0) return <span className="text-xs text-slate-400">Brak</span>;

                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        {reports.map(report => (
                                                            <span
                                                                key={report.id}
                                                                className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200"
                                                                title={`Raport z dnia ${report.date}`}
                                                                onClick={() => navigate('/reports')}
                                                            >
                                                                {report.date}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const installation = getInstallationByOfferId(offer.id);
                                                if (!installation) return <span className="text-xs text-slate-400">Brak</span>;

                                                const statusColors = {
                                                    pending: 'bg-yellow-100 text-yellow-800',
                                                    scheduled: 'bg-blue-100 text-blue-800',
                                                    completed: 'bg-green-100 text-green-800',
                                                    issue: 'bg-red-100 text-red-800'
                                                };

                                                const statusLabels = {
                                                    pending: 'Oczekujący',
                                                    scheduled: 'Zaplanowany',
                                                    completed: 'Zakończony',
                                                    issue: 'Problem'
                                                };

                                                return (
                                                    <span className={`px - 2 py - 1 rounded - full text - xs font - medium ${statusColors[installation.status]} `}>
                                                        {statusLabels[installation.status]}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setPreviewOffer(offer)}
                                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Podgląd"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(offer.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Usuń"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                                {offer.status === 'sold' && (
                                                    <button
                                                        onClick={() => handlePriceUpdate(offer.id, offer.pricing.finalPriceNet || offer.pricing.sellingPriceNet)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Zmień Cenę Umowy"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {offer.status === 'sold' && (
                                                    getContractByOfferId(offer.id) ? (
                                                        <button
                                                            onClick={() => navigate(`/contracts/${getContractByOfferId(offer.id)?.id}`)}
                                                            className="text-green-600 hover:text-green-900 mr-1"
                                                            title="Pokaż Umowę"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCreateContract(offer)}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors mr-1"
                                                            title="Generuj Umowę"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                    )
                                                )}
                                                {offer.status === 'sold' && (
                                                    getInstallationByOfferId(offer.id) ? (
                                                        <button
                                                            onClick={handleViewInstallation}
                                                            className="text-slate-600 hover:text-slate-900"
                                                            title="Pokaż Montaż"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCreateInstallation(offer)}
                                                            className="text-purple-600 hover:text-purple-900"
                                                            title="Utwórz Montaż"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
                }
            </div >


            // ... inside render ...




            // ... at the end ...

            {/* Preview Modal */}
            {
                previewOffer && (
                    <OfferPreviewModal
                        offer={previewOffer}
                        onClose={() => setPreviewOffer(null)}
                    />
                )
            }

            {/* CRM Modal */}
            {
                showCRMModal && selectedCustomer && (
                    <ClientCRMModal
                        customer={selectedCustomer}
                        onClose={() => setShowCRMModal(false)}
                    />
                )
            }
        </div >
    );
};
