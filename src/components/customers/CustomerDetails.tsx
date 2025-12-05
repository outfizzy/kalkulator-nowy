import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Customer, Offer } from '../../types';

interface CustomerDetailsProps {
    customer: Customer & { id?: string };
    onEdit: () => void;
    onBack: () => void;
}

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer, onEdit, onBack }) => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);

    useEffect(() => {
        const loadOffers = async () => {
            if (!customer.id) return;
            try {
                const data = await DatabaseService.getCustomerOffers(customer.id);
                setOffers(data);
            } catch (error) {
                console.error('Error loading offers:', error);
                toast.error('Błąd ładowania historii ofert');
            } finally {
                setLoadingOffers(false);
            }
        };
        loadOffers();
    }, [customer.id]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        {customer.firstName} {customer.lastName}
                    </h1>
                    <p className="text-slate-500 mt-1">Karta klienta</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Wróć
                    </button>
                    <button
                        onClick={onEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edytuj
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-1 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Dane kontaktowe</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Telefon</label>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg text-slate-800">{customer.phone}</span>
                                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-2 py-1 rounded">
                                    Zadzwoń
                                </a>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                            <div className="mt-1">
                                {customer.email ? (
                                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                                        {customer.email}
                                    </a>
                                ) : (
                                    <span className="text-slate-400 italic">Brak adresu email</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Adres</label>
                            <div className="mt-1 text-slate-700">
                                <p>{customer.street} {customer.houseNumber}</p>
                                <p>{customer.postalCode} {customer.city}</p>
                                <p className="text-sm text-slate-500">{customer.country}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - History */}
                <div className="md:col-span-2 space-y-6">
                    {/* Offers Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">Historia Ofert</h2>
                            <Link
                                to={`/new-offer?customerId=${customer.id}`}
                                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                                <span>+</span> Nowa oferta
                            </Link>
                        </div>

                        {loadingOffers ? (
                            <div className="p-8 text-center text-slate-400">Ładowanie ofert...</div>
                        ) : offers.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {offers.map(offer => (
                                    <div key={offer.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-800">{offer.offerNumber}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${offer.status === 'won' ? 'bg-green-100 text-green-700' :
                                                        offer.status === 'lost' ? 'bg-red-100 text-red-700' :
                                                            'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {offer.status === 'draft' ? 'Szkic' :
                                                        offer.status === 'sent' ? 'Wysłana' :
                                                            offer.status === 'won' ? 'Przyjęta' :
                                                                offer.status === 'lost' ? 'Odrzucona' : offer.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {offer.product?.type === 'pergola' ? 'Pergola' : 'Materiały'} • {offer.createdAt.toLocaleDateString('pl-PL')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="font-bold text-slate-800">
                                                    {offer.pricing.finalPriceNet?.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                                                </div>
                                                <div className="text-[10px] text-slate-400">Netto</div>
                                            </div>
                                            <Link
                                                to={`/offer/${offer.id}`} // Assuming route for offer view exists
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Otwórz →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                                <p>Brak ofert dla tego klienta</p>
                            </div>
                        )}
                    </div>

                    {/* Placeholder for future sections like Call History, Notes etc. */}
                </div>
            </div>
        </div>
    );
};
