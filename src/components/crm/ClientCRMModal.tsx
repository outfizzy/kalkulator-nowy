import React, { useState, useEffect } from 'react';
import type { Customer, Offer, Contract, Installation } from '../../types';
import { DatabaseService } from '../../services/database';

interface ClientCRMModalProps {
    customer: Customer;
    onClose: () => void;
}

type Tab = 'overview' | 'offers' | 'contracts' | 'installations';

export const ClientCRMModal: React.FC<ClientCRMModalProps> = ({ customer, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [clientOffers, setClientOffers] = useState<Offer[]>([]);
    const [clientContracts, setClientContracts] = useState<Contract[]>([]);
    const [clientInstallations, setClientInstallations] = useState<Installation[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [allOffers, allContracts, allInstallations] = await Promise.all([
                    DatabaseService.getOffers(),
                    DatabaseService.getContracts(),
                    DatabaseService.getInstallations()
                ]);

                // Filter logic: Match by Email OR (FirstName + LastName + City)
                const normalize = (str: string) => str.toLowerCase().trim();
                const customerKey = customer.email
                    ? normalize(customer.email)
                    : `${normalize(customer.firstName)}_${normalize(customer.lastName)}_${normalize(customer.city)}`;

                const isMatch = (c: Partial<Customer> & { firstName: string; lastName: string; city?: string; email?: string }) => {
                    if (customer.email && c.email) {
                        return normalize(c.email) === normalize(customer.email);
                    }
                    const key = `${normalize(c.firstName)}_${normalize(c.lastName)}_${normalize(c.city || '')}`;
                    return key === customerKey;
                };

                const offers = allOffers
                    .filter(o => isMatch(o.customer))
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                setClientOffers(offers);

                const offerIds = new Set(offers.map(o => o.id));
                const contracts = allContracts.filter(c => offerIds.has(c.offerId) || isMatch(c.client));
                setClientContracts(contracts);

                const installations = allInstallations.filter(i => offerIds.has(i.offerId) || isMatch(i.client));
                setClientInstallations(installations);
            } catch (error) {
                console.error('Error loading CRM data:', error);
            }
        };

        loadData();
    }, [customer]);

    // Stats
    const totalRevenue = clientOffers
        .filter(o => o.status === 'sold')
        .reduce((sum, o) => sum + (o.pricing.finalPriceNet || o.pricing.sellingPriceNet), 0);

    const soldCount = clientOffers.filter(o => o.status === 'sold').length;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start shrink-0">
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-2xl font-bold">
                            {customer.firstName[0]}{customer.lastName[0]}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h2>
                            <div className="flex gap-4 text-slate-300 text-sm mt-1">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {customer.postalCode} {customer.city}, {customer.street} {customer.houseNumber}
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {customer.email}
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    {customer.phone}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Navigation */}
                <div className="border-b border-slate-200 bg-slate-50 px-6 shrink-0">
                    <div className="flex gap-8">
                        {[
                            { id: 'overview', label: 'Przegląd' },
                            { id: 'offers', label: `Oferty (${clientOffers.length})` },
                            { id: 'contracts', label: `Umowy (${clientContracts.length})` },
                            { id: 'installations', label: `Montaże (${clientInstallations.length})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-slate-100">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Łączna wartość sprzedaży (Netto)</h3>
                                <p className="text-3xl font-bold text-slate-800">
                                    {totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Zrealizowane zamówienia</h3>
                                <p className="text-3xl font-bold text-slate-800">{soldCount}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Aktywne oferty</h3>
                                <p className="text-3xl font-bold text-accent">
                                    {clientOffers.filter(o => ['draft', 'sent'].includes(o.status)).length}
                                </p>
                            </div>

                            {/* Recent Activity */}
                            <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 font-semibold text-slate-800">Ostatnia aktywność</div>
                                <div className="divide-y divide-slate-100">
                                    {clientOffers.slice(0, 5).map(offer => (
                                        <div key={offer.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-slate-800">Oferta #{offer.id}</div>
                                                <div className="text-sm text-slate-500">{offer.product.modelId} - {offer.createdAt.toLocaleDateString()}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${offer.status === 'sold' ? 'bg-green-100 text-green-700' :
                                                offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-accent-soft text-accent-dark'
                                                }`}>
                                                {offer.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'offers' && (
                        <div className="space-y-4">
                            {clientOffers.map(offer => (
                                <div key={offer.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">#{offer.id}</span>
                                            <span className="text-sm text-slate-500">{offer.createdAt.toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 mt-1">
                                            {offer.product.modelId}, {offer.product.width}x{offer.product.projection}mm
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-800">
                                            {offer.pricing.sellingPriceGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        </div>
                                        <div className={`text-xs font-medium uppercase mt-1 ${offer.status === 'sold' ? 'text-green-600' : 'text-accent-dark'
                                            }`}>
                                            {offer.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="space-y-4">
                            {clientContracts.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">Brak umów dla tego klienta</div>
                            ) : (
                                clientContracts.map(contract => (
                                    <div key={contract.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{contract.contractNumber}</h4>
                                                <p className="text-sm text-slate-500">Z dnia: {contract.createdAt.toLocaleDateString()}</p>
                                            </div>
                                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                                                {contract.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            Oferta źródłowa: #{contract.offerId}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'installations' && (
                        <div className="space-y-4">
                            {clientInstallations.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">Brak zleceń montażu</div>
                            ) : (
                                clientInstallations.map(inst => (
                                    <div key={inst.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-800">Montaż: {inst.productSummary}</h4>
                                                <p className="text-sm text-slate-500">Adres: {inst.client.address}, {inst.client.city}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inst.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                inst.status === 'scheduled' ? 'bg-accent-soft text-accent-dark' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {inst.status}
                                            </span>
                                        </div>
                                        {inst.scheduledDate && (
                                            <div className="text-sm font-medium text-slate-700 mt-2">
                                                Planowana data: {new Date(inst.scheduledDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
