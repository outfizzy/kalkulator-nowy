import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Customer, Offer, Contract, Installation, Lead, Communication } from '../types';
import { DatabaseService } from '../services/database';
import { CustomerEditForm } from '../components/crm/CustomerEditForm';
import { CommunicationTimeline } from '../components/crm/CommunicationTimeline';
import { VoiceConfirmationButton } from '../components/voice/VoiceConfirmationButton';
import { CustomerDashboard } from '../components/crm/CustomerDashboard';
import { EmailHistoryWidget } from '../components/common/EmailHistoryWidget';
import { supabase } from '../lib/supabase';
import { getModelDisplayName } from '../config/modelImages';


import { TasksList } from '../components/tasks/TasksList';
import { TaskModal } from '../components/tasks/TaskModal';
import { ManualContractModal } from '../components/contracts/ManualContractModal';

type Tab = 'overview' | 'leads' | 'offers' | 'contracts' | 'installations' | 'communications' | 'edit' | 'gallery' | 'tasks';

export const CustomerDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const [clientLeads, setClientLeads] = useState<Lead[]>([]);
    const [clientOffers, setClientOffers] = useState<Offer[]>([]);
    const [clientContracts, setClientContracts] = useState<Contract[]>([]);
    const [clientInstallations, setClientInstallations] = useState<Installation[]>([]);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);
    const [isManualContractModalOpen, setIsManualContractModalOpen] = useState(false);

    const fetchData = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const customerData = await DatabaseService.getCustomer(id);
            if (!customerData) {
                console.error('Customer not found');
                setLoading(false);
                return;
            }
            setCustomer(customerData);

            // Load related entities
            const [allLeads, allOffers, allContracts, allInstallations, comms] = await Promise.all([
                DatabaseService.getLeads(),
                DatabaseService.getOffers(),
                DatabaseService.getContracts(),
                DatabaseService.getInstallations(),
                DatabaseService.getCommunications(id)
            ]);

            // Filter logic
            const normalize = (str: string | undefined | null) =>
                (str || '').toString().toLowerCase().trim();
            const customerKey = customerData.email
                ? normalize(customerData.email)
                : `${normalize(customerData.firstName)}_${normalize(customerData.lastName)}_${normalize(customerData.city)}`;

            const isMatch = (c: Partial<Customer> & { firstName?: string; lastName?: string; city?: string; email?: string }) => {
                const nameKey = `${normalize(c.firstName)}_${normalize(c.lastName)}_${normalize(c.city)}`;

                const matchesEmail = Boolean(customerData.email && c.email && normalize(c.email) === normalize(customerData.email));
                const matchesName = nameKey === customerKey;

                return matchesEmail || matchesName;
            };

            const leads = allLeads.filter(l =>
                (l.customerId && l.customerId === id) ||
                isMatch(l.customerData)
            ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setClientLeads(leads);

            const offers = allOffers
                .filter(o =>
                    (o.customer.id && o.customer.id === id) ||
                    isMatch(o.customer)
                )
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setClientOffers(offers);

            const offerIds = new Set(offers.map(o => o.id));
            const contracts = allContracts.filter(c => offerIds.has(c.offerId) || isMatch(c.client));
            setClientContracts(contracts);

            const installations = allInstallations.filter(i => (i.offerId && offerIds.has(i.offerId)) || isMatch(i.client));
            setClientInstallations(installations);

            setCommunications(comms);

        } catch (error) {
            console.error('Error loading customer data:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();

        // Subscription setup
        const channel = supabase
            .channel('customer-details-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'customer_communications',
                    filter: `customer_id=eq.${id}`
                },
                (payload) => {
                    // Refresh communications only for speed
                    DatabaseService.getCommunications(id!).then(setCommunications);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'installations'
                },
                (payload) => {
                    // Refresh entire data to ensure status update propagates
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, fetchData]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Ładowanie danych klienta...</div>;
    }

    if (!customer) {
        return <div className="flex items-center justify-center h-screen">Klient nie znaleziony.</div>;
    }

    // Stats Calculation
    const totalContractValue = clientContracts.reduce((sum, c) => {
        // Need to find the linked offer to get the price
        const offer = clientOffers.find(o => o.id === c.offerId);
        if (offer && offer.pricing) {
            const finalNet = typeof offer.pricing.finalPriceNet === 'number' ? offer.pricing.finalPriceNet : undefined;
            const baseNet = typeof offer.pricing.sellingPriceNet === 'number' ? offer.pricing.sellingPriceNet : 0;
            return sum + (finalNet ?? baseNet);
        }
        return sum;
    }, 0);




    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* Sticky Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-xl font-bold text-white">
                                {(customer.firstName || '')[0]}{(customer.lastName || '')[0]}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {customer.firstName} {customer.lastName}
                                    {customer.companyName && <span className="text-slate-400 font-normal text-lg ml-2">({customer.companyName})</span>}
                                </h1>
                                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                                    {customer.street && (
                                        <span>{customer.street} {customer.houseNumber}</span>
                                    )}
                                    {customer.street && customer.city && <span>•</span>}
                                    {(customer.postalCode || customer.city) && (
                                        <span>{customer.postalCode} {customer.city}</span>
                                    )}
                                    {(customer.city || customer.street) && customer.phone && <span>•</span>}
                                    {customer.phone && <span>📞 {customer.phone}</span>}
                                    {customer.email && <><span>•</span><span>✉️ {customer.email}</span></>}
                                </div>
                            </div>
                        </div>

                        {/* Key Metric: Contract Value (Requested Feature) */}
                        <div className="flex flex-col items-end px-6 border-r border-slate-100">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wartość Umów (Netto)</span>
                            <span className="text-3xl font-bold text-emerald-600">
                                {totalContractValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        // Log the call
                                        await DatabaseService.addCommunication({
                                            customerId: customer.id,
                                            type: 'call',
                                            direction: 'outbound',
                                            date: new Date().toISOString(),
                                            content: 'Zainicjowano połączenie telefoniczne z aplikacji',
                                            subject: 'Połączenie wychodzące'
                                        });
                                        // Trigger call
                                        window.location.href = `tel:${customer.phone}`;
                                        // Refresh communications if tab is active
                                        if (activeTab === 'communications') {
                                            DatabaseService.getCommunications(customer.id!).then(setCommunications);
                                        }
                                    } catch (error) {
                                        console.error('Error logging call:', error);
                                        // Still trigger call even if logging fails
                                        window.location.href = `tel:${customer.phone}`;
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Zadzwoń
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await DatabaseService.addCommunication({
                                            customerId: customer.id,
                                            type: 'email',
                                            direction: 'outbound',
                                            date: new Date().toISOString(),
                                            content: 'Kliknięto przycisk wyślij email',
                                            subject: 'Email wychodzący'
                                        });
                                        window.location.href = `mailto:${customer.email}`;
                                        if (activeTab === 'communications') {
                                            DatabaseService.getCommunications(customer.id!).then(setCommunications);
                                        }
                                    } catch (error) {
                                        console.error('Error logging email:', error);
                                        window.location.href = `mailto:${customer.email}`;
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
                    <nav className="p-4 space-y-1">
                        {[
                            {
                                id: 'overview', label: 'Przegląd', icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                )
                            },
                            {
                                id: 'communications', label: 'Komunikacja', icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                )
                            },
                            {
                                id: 'leads', label: `Leady (${clientLeads.length})`, icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                )
                            },
                            {
                                id: 'offers', label: `Oferty (${clientOffers.length})`, icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                )
                            },
                            {
                                id: 'tasks', label: 'Zadania', icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                )
                            },
                            {
                                id: 'contracts', label: `Umowy (${clientContracts.length})`, icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                )
                            },
                            {
                                id: 'installations', label: `Montaże (${clientInstallations.length})`, icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                )
                            },
                            {
                                id: 'gallery', label: 'Galeria Zdjęć', icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )
                            },
                            {
                                id: 'edit', label: 'Dane Klienta', icon: (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                )
                            }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                                    ? 'bg-accent/10 text-accent'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto bg-slate-50 p-8">
                    <div className="max-w-6xl mx-auto">
                        {activeTab === 'edit' && (
                            <div className="space-y-6">
                                {/* Read-only Customer Info Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Informacje o kliencie
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zwrot</label>
                                            <p className="text-slate-800 font-medium mt-0.5">{customer.salutation || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Firma</label>
                                            <p className="text-slate-800 font-medium mt-0.5">{customer.companyName || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Imię</label>
                                            <p className="text-slate-800 font-medium mt-0.5">{customer.firstName || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nazwisko</label>
                                            <p className="text-slate-800 font-medium mt-0.5">{customer.lastName || '—'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adres</label>
                                            <p className="text-slate-800 font-medium mt-0.5">
                                                {(() => {
                                                    const streetPart = [customer.street, customer.houseNumber].filter(Boolean).join(' ');
                                                    const cityPart = [customer.postalCode, customer.city].filter(Boolean).join(' ');
                                                    const countryPart = customer.country && customer.country !== 'Deutschland' ? customer.country : '';
                                                    const parts = [streetPart, cityPart, countryPart].filter(Boolean);
                                                    return parts.length > 0 ? parts.join(', ') : '—';
                                                })()}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefon</label>
                                            <p className="text-slate-800 font-medium mt-0.5">
                                                {customer.phone ? <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a> : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                                            <p className="text-slate-800 font-medium mt-0.5">
                                                {customer.email ? <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a> : '—'}
                                            </p>
                                        </div>
                                        {customer.representative && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Przedstawiciel</label>
                                                <p className="text-slate-800 font-medium mt-0.5">{customer.representative.firstName} {customer.representative.lastName}</p>
                                            </div>
                                        )}
                                        {customer.contractSigner && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Podpisujący umowę</label>
                                                <p className="text-slate-800 font-medium mt-0.5">{customer.contractSigner.firstName} {customer.contractSigner.lastName}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <p className="text-2xl font-bold text-blue-600">{clientLeads.length}</p>
                                            <p className="text-xs text-slate-500 mt-1">Leady</p>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <p className="text-2xl font-bold text-purple-600">{clientOffers.length}</p>
                                            <p className="text-xs text-slate-500 mt-1">Oferty</p>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <p className="text-2xl font-bold text-emerald-600">{clientContracts.length}</p>
                                            <p className="text-xs text-slate-500 mt-1">Umowy</p>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <p className="text-2xl font-bold text-orange-600">{clientInstallations.length}</p>
                                            <p className="text-xs text-slate-500 mt-1">Montaże</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Edit Form */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Edytuj dane
                                    </h2>
                                    <CustomerEditForm
                                        customer={customer}
                                        onSave={() => { fetchData(); }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {clientInstallations.flatMap(inst =>
                                    (inst.photoUrls || []).map((url) => ({
                                        url,
                                        title: `Montaż - ${inst.scheduledDate ? new Date(inst.scheduledDate).toLocaleDateString() : 'Brak daty'}`,
                                        subtitle: `Obiekt #${inst.id.slice(0, 6)}`,
                                        type: 'Installation'
                                    }))
                                ).map((photo, index) => (
                                    <div key={index} className="group relative aspect-square bg-slate-200 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                        <img
                                            src={photo.url}
                                            alt={photo.title}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                            <p className="text-white font-bold text-sm">{photo.title}</p>
                                            <p className="text-white/80 text-xs">{photo.subtitle}</p>
                                        </div>
                                        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                            {photo.type}
                                        </div>
                                    </div>
                                ))}

                                {clientInstallations.flatMap(i => i.photoUrls || []).length === 0 && (
                                    <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                                        <div className="text-slate-400 mb-2">
                                            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <p className="text-slate-500 font-medium">Brak zdjęć w galerii</p>
                                        <p className="text-slate-400 text-sm">Zdjęcia pojawią się tutaj po dodaniu ich do montaży</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'communications' && (
                            <div className="space-y-6">
                                {/* Live Email History from Mailboxes */}
                                {customer.email && (
                                    <EmailHistoryWidget customerEmail={customer.email} maxItems={20} />
                                )}

                                {/* Existing CRM Communication Timeline */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col" style={{ maxHeight: 'calc(100vh - 20rem)' }}>
                                    <CommunicationTimeline
                                        communications={communications}
                                        customerId={customer.id!}
                                        onAdd={() => {
                                            // Simple refresh
                                            if (customer.id) DatabaseService.getCommunications(customer.id).then(setCommunications);
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'overview' && (
                            <CustomerDashboard
                                customer={customer}
                                installations={clientInstallations}
                                communications={communications}
                                leads={clientLeads}
                                offers={clientOffers}
                                contracts={clientContracts}
                                onRefresh={fetchData}
                            />
                        )}

                        {activeTab === 'leads' && (
                            <div className="space-y-4">
                                {clientLeads.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed text-slate-500">Brak leadów dla tego klienta</div>
                                ) : (
                                    clientLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            onClick={() => navigate(`/leads?leadId=${lead.id}`)}
                                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                                                            lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                                                                lead.status === 'offer_sent' ? 'bg-purple-100 text-purple-700' :
                                                                    lead.status === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                                                                        lead.status === 'lost' ? 'bg-red-100 text-red-700' :
                                                                            'bg-slate-100 text-slate-700'
                                                        }`}>{lead.status}</span>
                                                    <span className="text-sm text-slate-500">{new Date(lead.createdAt).toLocaleDateString('pl-PL')}</span>
                                                </div>
                                                {lead.source && (
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        Źródło: <span className="font-medium">{lead.source}</span>
                                                    </div>
                                                )}
                                                {lead.notes && (
                                                    <div className="text-sm text-slate-500 mt-2 bg-slate-50 p-2 rounded line-clamp-2">
                                                        {lead.notes}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-sm text-slate-500">
                                                        {lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}` : '-'}
                                                    </div>
                                                </div>
                                                <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'offers' && (
                            <div className="space-y-4">
                                {clientOffers.map(offer => (
                                    <div key={offer.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">#{offer.id}</span>
                                                    <span className="text-sm text-slate-500">{offer.createdAt.toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-sm text-slate-600 mt-1">
                                                    {getModelDisplayName(offer.product.modelId)}, {offer.product.width}x{offer.product.projection}mm
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-800">
                                                    {(offer.pricing?.sellingPriceGross ?? 0).toLocaleString('de-DE', {
                                                        style: 'currency',
                                                        currency: 'EUR'
                                                    })}
                                                </div>
                                                <div className={`text-xs font-medium uppercase mt-1 ${offer.status === 'sold' ? 'text-green-600' : 'text-accent-dark'
                                                    }`}>
                                                    {offer.status}
                                                </div>
                                                {offer.status === 'sold' && !clientContracts.some(c => c.offerId === offer.id) && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            // Basic confirmation
                                                            if (confirm('Utworzyć nową umowę na podstawie tej oferty?')) {
                                                                try {
                                                                    await DatabaseService.createContract({
                                                                        status: 'draft',
                                                                        client: customer!,
                                                                        product: offer.product,
                                                                        pricing: offer.pricing!,
                                                                        offerId: offer.id,
                                                                        commission: offer.commission || 0,
                                                                        requirements: {
                                                                            constructionProject: false,
                                                                            powerSupply: false,
                                                                            foundation: false
                                                                        },
                                                                        comments: [],
                                                                        attachments: [],
                                                                        orderedItems: []
                                                                    });
                                                                    // Refresh to show the new contract
                                                                    window.location.reload();
                                                                } catch (error) {
                                                                    console.error('Failed to create contract:', error);
                                                                    alert('Wystąpił błąd podczas tworzenia umowy.');
                                                                }
                                                            }
                                                        }}
                                                        className="mt-2 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Utwórz Umowę
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial Summary (Only for Admin/Manager or special permissions? For now visible to all allowed to see offers) */}
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-slate-700">Podsumowanie Kosztów</span>
                                                <button
                                                    onClick={async () => {
                                                        const newCost = prompt('Wprowadź dodatkowe koszty zamówienia (EUR):', offer.pricing?.orderCosts?.toString() || '0');
                                                        if (newCost !== null) {
                                                            const cost = parseFloat(newCost);
                                                            if (!isNaN(cost)) {
                                                                await DatabaseService.calculateOrderCosts(offer.id, cost);
                                                                // Trigger refresh - ideally we'd update local state but for now this works via full reload or we can rely on parent refresh
                                                                window.location.reload();
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    Edytuj koszty zamówienia
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <span className="text-slate-500 block">Cena Netto</span>
                                                    <span className="font-medium">
                                                        {(offer.pricing?.sellingPriceNet || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Prowizja ({((offer.pricing?.sellingPriceNet || 0) * 0.05).toFixed(2)})</span>
                                                    <span className="font-medium text-red-600">
                                                        -{((offer.pricing?.sellingPriceNet || 0) * 0.05).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Koszty Pomiarów</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-medium text-red-600">
                                                            -{(offer.pricing?.measurementCost || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                                        </span>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm('Przeliczyć koszty pomiarów na podstawie raportów?')) {
                                                                    await DatabaseService.calculateOrderCosts(offer.id);
                                                                    window.location.reload();
                                                                }
                                                            }}
                                                            title="Przelicz z raportów"
                                                            className="text-slate-400 hover:text-blue-600"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.292a1 1 0 01-2 0V13a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Koszty Zamówienia</span>
                                                    <span className="font-medium text-red-600">
                                                        -{(offer.pricing?.orderCosts || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                                                <span className="font-semibold text-slate-700">Wynik (Marża Końcowa)</span>
                                                <span className={`font-bold ${((offer.pricing?.sellingPriceNet || 0) - ((offer.pricing?.sellingPriceNet || 0) * 0.05) - (offer.pricing?.measurementCost || 0) - (offer.pricing?.orderCosts || 0)) > 0
                                                    ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {((offer.pricing?.sellingPriceNet || 0) - ((offer.pricing?.sellingPriceNet || 0) * 0.05) - (offer.pricing?.measurementCost || 0) - (offer.pricing?.orderCosts || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'contracts' && (
                            <div className="space-y-4">
                                {/* Add Contract Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setIsManualContractModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors font-medium"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Dodaj Umowę
                                    </button>
                                </div>

                                {clientContracts.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed text-slate-500">Brak umów dla tego klienta</div>
                                ) : (
                                    clientContracts.map(contract => (
                                        <div key={contract.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{contract.contractNumber}</h4>
                                                    <p className="text-sm text-slate-500">Z dnia: {contract.createdAt.toLocaleDateString()}</p>
                                                </div>
                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                                                    {contract.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 mb-3">
                                                Oferta źródłowa: #{contract.offerId}
                                            </div>

                                            {/* Attachments Section (Protocols) */}
                                            {contract.attachments && contract.attachments.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Załączniki (Protokoły)</h5>
                                                    <div className="space-y-2">
                                                        {contract.attachments.map((att, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <span className="truncate text-slate-700 font-medium" title={att.name}>{att.name}</span>
                                                                </div>
                                                                <a
                                                                    href={att.url}
                                                                    download={att.name}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                                                >
                                                                    Pobierz
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'installations' && (
                            <div className="space-y-4">
                                {clientInstallations.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed text-slate-500">Brak zleceń montażu</div>
                                ) : (
                                    clientInstallations.map(inst => (
                                        <div key={inst.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                            {/* Installation Header */}
                                            <div className="p-4 flex justify-between items-start border-b border-slate-100">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">Montaż: {inst.productSummary}</h4>
                                                    <p className="text-sm text-slate-500">Adres: {inst.client.address}, {inst.client.city}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${inst.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    inst.status === 'scheduled' ? 'bg-accent-soft text-accent-dark' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {inst.status === 'completed' ? 'Zakończony' :
                                                        inst.status === 'scheduled' ? 'Zaplanowany' :
                                                            inst.status === 'pending' ? 'Oczekujący' : inst.status}
                                                </span>
                                                {inst.status === 'scheduled' && inst.scheduledDate && (
                                                    <div className="ml-2">
                                                        <VoiceConfirmationButton
                                                            leadId={clientLeads.find(l => l.customerId === customer.id)?.id} // Best effort lead match
                                                            customerName={`${customer.firstName} ${customer.lastName}`}
                                                            phoneNumber={customer.phone}
                                                            installationDate={inst.scheduledDate}
                                                            installationId={inst.id}
                                                            customerId={customer.id!}
                                                            onSuccess={() => {
                                                                // Refresh communications regardless of tab (to fetch the new 'queued' log)
                                                                DatabaseService.getCommunications(customer.id!).then(setCommunications);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Installation Details */}
                                            <div className="p-4 bg-slate-50">
                                                {inst.scheduledDate && (
                                                    <div className="flex items-center gap-2 text-sm mb-2">
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="font-medium text-slate-700">
                                                            Planowana data: {new Date(inst.scheduledDate).toLocaleDateString('pl-PL')}
                                                        </span>
                                                    </div>
                                                )}
                                                {inst.team && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        <span className="text-slate-600">Ekipa: {inst.team.name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Acceptance Section */}
                                            {inst.acceptance && (
                                                <div className="p-4 border-t border-slate-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <h5 className="font-bold text-slate-800">Odbiór Montażu</h5>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-1">Data odbioru:</p>
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {new Date(inst.acceptance.acceptedAt).toLocaleDateString('pl-PL', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-1">Odbiór przez:</p>
                                                            <p className="text-sm font-medium text-slate-800">{inst.acceptance.clientName}</p>
                                                        </div>
                                                    </div>

                                                    {inst.acceptance.notes && (
                                                        <div className="mb-4">
                                                            <p className="text-xs text-slate-500 mb-1">Uwagi:</p>
                                                            <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">{inst.acceptance.notes}</p>
                                                        </div>
                                                    )}

                                                    {inst.acceptance.signature && (
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-2">Podpis klienta:</p>
                                                            <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                                                                <img
                                                                    src={inst.acceptance.signature}
                                                                    alt="Podpis klienta"
                                                                    className="w-full h-32 object-contain"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Zadania</h2>
                                    <button
                                        onClick={() => setIsTaskModalOpen(true)}
                                        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                        Nowe Zadanie
                                    </button>
                                </div>
                                <TasksList customerId={customer.id} refreshTrigger={tasksRefreshTrigger} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                initialData={{ customerId: customer.id }}
                onSuccess={() => setTasksRefreshTrigger(prev => prev + 1)}
            />

            <ManualContractModal
                isOpen={isManualContractModalOpen}
                onClose={() => setIsManualContractModalOpen(false)}
                onSuccess={() => {
                    setIsManualContractModalOpen(false);
                    fetchData(); // Refresh to show new contract
                }}
                preselectedCustomer={customer}
            />
        </div>
    );
};
