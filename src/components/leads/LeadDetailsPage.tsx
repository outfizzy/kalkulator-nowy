import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { LeadForm } from './LeadForm';
import type { Lead, Communication, Offer } from '../../types';
import { CommunicationTimeline } from '../crm/CommunicationTimeline';
import { OffersList } from '../OffersList';

type Tab = 'overview' | 'communications' | 'offers';

export const LeadDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);

    useEffect(() => {
        const fetchLead = async () => {
            if (!id) return;
            try {
                const data = await DatabaseService.getLead(id);
                setLead(data);

                // Auto-redirect if promoted
                if (data?.customerId) {
                    navigate(`/customers/${data.customerId}`, { replace: true });
                    return;
                }

                // If linked to email, try to fetch minimal email info (or just use ID link)
                // if (data?.emailMessageId) { ... }

                // Fetch communications
                // Note: We need a method to get communications by Lead ID, or filter generically.
                // Assuming getCommunications can take a leadId or we filter.
                // For now, let's assume we can fetch by CustomerID (which lead doesn't have yet) or Generic ID.
                // Actually, Communication table has `lead_id`. We need `getCommunications` to support leads.
                // Let's try to fetch and filter for now, or assume getCommunications handles it if we pass ID?
                // The current implementation of getCommunications takes `customerId`.
                // We need `getLeadCommunications`.
                // For now, let's skip fetching specific communications until backend supports it fully,
                // OR use a new service method if added.
                // As a fallback, we pass empty array or try fetching if supported.

                // Fetch communications
                try {
                    const comms = await DatabaseService.getLeadCommunications(id);
                    setCommunications(comms);
                } catch (e) {
                    console.warn('Communications not loaded for lead', e);
                }

                // Fetch Offers
                try {
                    const leadOffers = await DatabaseService.getLeadOffers(id);
                    setOffers(leadOffers);
                } catch (e) {
                    console.warn('Offers not loaded for lead', e);
                }
            } catch (error) {
                console.error('Error fetching lead:', error);
                toast.error('Nie udało się pobrać szczegółów leada');
                navigate('/leads');
            } finally {
                setLoading(false);
            }
        };

        fetchLead();
    }, [id, navigate]);

    const handleConvert = () => {
        if (!lead) return;
        navigate('/new-offer', {
            state: {
                firstName: lead.customerData.firstName,
                lastName: lead.customerData.lastName,
                email: lead.customerData.email,
                phone: lead.customerData.phone,
                companyName: lead.customerData.companyName,
                leadId: lead.id
            }
        });
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie...</div>;
    }

    if (!lead) {
        return <div className="p-12 text-center text-slate-400">Lead nie znaleziony.</div>;
    }

    if (isEditMode) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Edycja Leada</h1>
                    <button onClick={() => setIsEditMode(false)} className="text-slate-500 hover:text-slate-700">Anuluj</button>
                </div>
                <LeadForm
                    initialData={lead}
                    isEditMode={true}
                    onSuccess={() => {
                        toast.success('Zapisano zmiany');
                        setIsEditMode(false);
                        DatabaseService.getLead(id!).then(setLead);
                    }}
                    onCancel={() => setIsEditMode(false)}
                />
            </div>
        );
    }

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
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                                {lead.customerData.firstName?.[0]}{lead.customerData.lastName?.[0]}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {lead.customerData.firstName} {lead.customerData.lastName}
                                </h1>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 uppercase`}>LEAD</span>
                                    <span>•</span>
                                    <span>{lead.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                            >
                                Edytuj
                            </button>
                            <button
                                onClick={handleConvert}
                                className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Utwórz Ofertę
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
                    <nav className="p-4 space-y-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            Przegląd
                        </button>
                        <button
                            onClick={() => setActiveTab('offers')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'offers' ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Oferty
                            {offers.length > 0 && (
                                <span className="ml-auto bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-xs font-bold">{offers.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('communications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'communications' ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            Komunikacja
                        </button>
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto bg-slate-50 p-8">
                    <div className="max-w-5xl mx-auto">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Info */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Dane Kontaktowe
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Email</label>
                                                <div className="text-slate-900">
                                                    {lead.customerData.email ? (
                                                        <a href={`mailto:${lead.customerData.email}`} className="text-accent hover:underline flex items-center gap-2">
                                                            {lead.customerData.email}
                                                        </a>
                                                    ) : '-'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Telefon</label>
                                                <div className="text-slate-900">
                                                    {lead.customerData.phone ? (
                                                        <a href={`tel:${lead.customerData.phone}`} className="text-accent hover:underline flex items-center gap-2">
                                                            {lead.customerData.phone}
                                                        </a>
                                                    ) : '-'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Firma</label>
                                                <div className="text-slate-900">{lead.customerData.companyName || '-'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Źródło</label>
                                                <div className="text-slate-900 capitalize">{lead.source}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Opiekun</label>
                                                <div className="text-slate-900">{lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}` : '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Notes & Email */}
                                <div className="space-y-6">
                                    {lead.emailMessageId && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4">
                                            <div className="p-2 bg-white rounded-lg border border-blue-100 text-blue-600">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="text-blue-900 font-semibold text-sm">Lead z wiadomości e-mail</h4>
                                                <p className="text-blue-700 text-sm mt-1">Utworzony z wiadomości ID: {lead.emailMessageId}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Główne Notatki
                                        </h3>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 whitespace-pre-wrap min-h-[100px]">
                                            {lead.notes || 'Brak notatek.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'offers' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-slate-800">Oferty dla tego Leada</h2>
                                        <button
                                            onClick={handleConvert}
                                            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            Nowa Oferta
                                        </button>
                                    </div>
                                    <OffersList
                                        offers={offers}
                                        onDelete={async (id) => {
                                            if (confirm('Czy na pewno chcesz usunąć tę ofertę?')) {
                                                await DatabaseService.deleteOffer(id);
                                                setOffers(offers.filter(o => o.id !== id));
                                                toast.success('Oferta usunięta');
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'communications' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100vh-12rem)] flex flex-col">
                                <CommunicationTimeline
                                    communications={communications}
                                    customerId={''} // No customer ID for pure leads yet
                                    leadId={lead.id}
                                    onAdd={() => {
                                        if (lead?.id) {
                                            DatabaseService.getLeadCommunications(lead.id).then(setCommunications);
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
