import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { LeadForm } from './LeadForm';
import type { Lead, Communication, Offer } from '../../types';
import { CommunicationTimeline } from '../crm/CommunicationTimeline';
import { OffersList } from '../OffersList';
import { SendEmailModal } from './SendEmailModal';
import { TasksList } from '../tasks/TasksList';
import { TaskModal } from '../tasks/TaskModal';
import { NotesList } from '../common/NotesList';
import { AssigneeSelector } from '../common/AssigneeSelector';
import { CustomerActivityTimeline } from '../common/CustomerActivityTimeline';
import { ScheduleMeasurementModal } from './ScheduleMeasurementModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useAuth } from '../../contexts/AuthContext';

type Tab = 'overview' | 'communications' | 'offers' | 'fair';

export const LeadDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);

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

                // Fetch communications
                try {
                    const comms = await DatabaseService.getLeadCommunications(id);
                    setCommunications(comms);
                } catch (e) {
                    console.warn('Communications not loaded for lead', e);
                }

                // Fetch Offers - Improved: Fetch by Customer ID if available to see ALL offers for this client
                try {
                    let leadOffers: Offer[] = [];
                    // We need to check the fresh 'data' object here, not the state 'lead' which is not set yet
                    if (data?.customerId) {
                        leadOffers = await DatabaseService.getCustomerOffers(data.customerId);
                    } else {
                        leadOffers = await DatabaseService.getLeadOffers(id);
                    }
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

        // Parse address to split street and house number
        const fullAddress = lead.customerData.address || '';
        let street = fullAddress;
        let houseNumber = '';

        // Try to split street and house number (e.g. "Hauptstr. 12")
        const match = fullAddress.match(/^(.+)\s+(\d+[a-zA-Z-\/]*)$/);
        if (match) {
            street = match[1];
            houseNumber = match[2];
        }

        navigate('/new-offer', {
            state: {
                customer: {
                    firstName: lead.customerData.firstName,
                    lastName: lead.customerData.lastName,
                    email: lead.customerData.email,
                    phone: lead.customerData.phone,
                    companyName: lead.customerData.companyName,
                    postalCode: lead.customerData.postalCode,
                    city: lead.customerData.city,
                    street: street,
                    houseNumber: houseNumber,
                },
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

                        {lead.status === 'new' && (
                            <button
                                onClick={async () => {
                                    try {
                                        const updates: Partial<Lead> = { status: 'contacted' };
                                        let successMessage = 'Oznaczono jako skontaktowano';

                                        if (currentUser && lead.assignedTo !== currentUser.id) {
                                            updates.assignedTo = currentUser.id;
                                            successMessage += ' i przypisano opiekuna';
                                        }

                                        await DatabaseService.updateLead(lead.id, updates);
                                        setLead(prev => prev ? { ...prev, status: 'contacted', assignedTo: currentUser?.id || prev.assignedTo } : null);
                                        toast.success(successMessage);
                                    } catch (e) {
                                        console.error(e);
                                        toast.error('Błąd zmiany statusu');
                                    }
                                }}
                                className="px-4 py-2 border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Oznacz jako skontaktowano
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Wyślij E-mail
                            </button>
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                            >
                                Edytuj
                            </button>
                            <button
                                onClick={() => setIsMeasurementModalOpen(true)}
                                className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Umów Pomiar
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

                        {(lead.source === 'targi' || lead.fairId) && (
                            <button
                                onClick={() => setActiveTab('fair')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'fair' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <span className="text-xl">🎡</span>
                                Targi
                            </button>
                        )}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto bg-slate-50 p-8">
                    <div className="max-w-5xl mx-auto">
                        {activeTab === 'overview' && (<>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Info & AI Insights */}
                                <div className="space-y-6">
                                    {/* TRADE FAIR CARD - MOVED TO TAB */}


                                    {/* AI Insights Widget */}
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 shadow-sm p-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" /></svg>
                                        </div>

                                        {/* Next Best Action & AI Summary */}
                                        <div className="mb-6 relative z-10">
                                            <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Analiza AI
                                            </h3>
                                            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100 shadow-sm space-y-3">
                                                {/* AI Summary Text if available */}
                                                {lead.aiSummary && (
                                                    <div className="mb-3 text-sm text-slate-700 leading-relaxed border-b border-indigo-50 pb-3">
                                                        <span className="font-semibold text-indigo-900 block mb-1">Podsumowanie:</span>
                                                        {lead.aiSummary}
                                                    </div>
                                                )}

                                                {/* Suggested Action */}
                                                <div>
                                                    <span className="text-xs font-bold text-indigo-800 uppercase block mb-1">Sugerowane Działanie:</span>
                                                    {(() => {
                                                        // Simple Rule-Based "AI" Logic
                                                        const daysSinceCreated = (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24);
                                                        const hasPhone = !!lead.customerData.phone;
                                                        const hasEmail = !!lead.customerData.email;

                                                        if (lead.status === 'new' && daysSinceCreated < 1) return (
                                                            <div className="text-sm font-medium text-slate-800">🚀 Nowy lead! Zadzwoń lub wyślij powitanie.</div>
                                                        );
                                                        if (lead.status === 'new' && daysSinceCreated >= 1) return (
                                                            <div className="text-sm font-medium text-red-600">⚠️ Lead czeka ponad 24h. Skontaktuj się pilnie!</div>
                                                        );
                                                        if (lead.status === 'offer_sent') return (
                                                            <div className="text-sm font-medium text-slate-800">📞 Oferta wysłana. Zadzwoń zapytać o decyzję.</div>
                                                        );
                                                        if (!hasPhone && hasEmail) return (
                                                            <div className="text-sm font-medium text-slate-800">📧 Brak telefonu. Wyślij prośbę o numer.</div>
                                                        );
                                                        if (lead.status === 'contacted') return (
                                                            <div className="text-sm font-medium text-slate-800">📝 Po rozmowie? Przygotuj ofertę.</div>
                                                        );

                                                        return <div className="text-sm font-medium text-slate-600">Monitoruj status leadu.</div>;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lead Score */}
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-end mb-1">
                                                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Jakość Leada</h3>
                                                {(() => {
                                                    let score = 0;
                                                    if (lead.customerData.firstName && lead.customerData.lastName) score += 20;
                                                    if (lead.customerData.phone) score += 30;
                                                    if (lead.customerData.email) score += 20;
                                                    if (lead.customerData.companyName) score += 10;
                                                    if (lead.customerData.address) score += 10;
                                                    if (lead.source) score += 10;
                                                    return (
                                                        <span className={`text-lg font-bold ${score > 70 ? 'text-emerald-600' : score > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                                            {score}%
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="w-full bg-white/50 rounded-full h-2">
                                                {(() => {
                                                    let score = 0;
                                                    if (lead.customerData.firstName && lead.customerData.lastName) score += 20;
                                                    if (lead.customerData.phone) score += 30;
                                                    if (lead.customerData.email) score += 20;
                                                    if (lead.customerData.companyName) score += 10;
                                                    if (lead.customerData.address) score += 10;
                                                    if (lead.source) score += 10;
                                                    return (
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-500 ${score > 70 ? 'bg-emerald-500' : score > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

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
                                                <label className="text-xs font-medium text-slate-500 uppercase">Adres</label>
                                                <div className="text-slate-900">
                                                    {(lead.customerData.address || lead.customerData.street || lead.customerData.postalCode || lead.customerData.city) ? (
                                                        <div>
                                                            <div>{lead.customerData.address || lead.customerData.street}</div>
                                                            <div className="text-slate-500 text-sm">
                                                                {[lead.customerData.postalCode, lead.customerData.city].filter(Boolean).join(' ')}
                                                            </div>
                                                        </div>
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
                                                <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                                                    Opiekun
                                                    {!isAssigning && (currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                                        <button
                                                            onClick={() => setIsAssigning(true)}
                                                            className="text-slate-400 hover:text-accent transition-colors"
                                                            title="Zmień opiekuna"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </label>
                                                <div className="text-slate-900 mt-1 min-h-[24px]">
                                                    {isAssigning ? (
                                                        <AssigneeSelector
                                                            currentAssigneeId={lead.assignedTo}
                                                            onCancel={() => setIsAssigning(false)}
                                                            onAssign={async (newId) => {
                                                                try {
                                                                    await DatabaseService.updateLead(lead.id, { assignedTo: newId });

                                                                    // Update local state
                                                                    const updatedLead = await DatabaseService.getLead(lead.id);
                                                                    setLead(updatedLead);
                                                                    setIsAssigning(false);
                                                                    toast.success('Zmieniono opiekuna');
                                                                } catch (e) {
                                                                    console.error('Failed to assign', e);
                                                                    toast.error('Błąd przypisywania');
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}` : '-'
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Klient skontaktuje się</label>
                                                <div className="text-slate-900">
                                                    {lead.clientWillContactAt ? (
                                                        <span className="text-orange-600 font-medium">
                                                            {new Date(lead.clientWillContactAt).toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Notes & Email */}
                                <div className="space-y-6">
                                    {/* Tasks Section */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                </svg>
                                                Zadania
                                            </h3>
                                            <button
                                                onClick={() => setIsTaskModalOpen(true)}
                                                className="text-xs font-semibold text-accent hover:text-accent-dark bg-accent/10 hover:bg-accent/20 px-2 py-1 rounded transition-colors"
                                            >
                                                + Dodaj
                                            </button>
                                        </div>
                                        <TasksList leadId={lead.id} refreshTrigger={tasksRefreshTrigger} />
                                    </div>

                                    {/* Customer Activity Section */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            Aktywność Klienta
                                        </h3>
                                        <CustomerActivityTimeline leadId={lead.id} />
                                    </div>

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

                                    {/* Attachments Section */}
                                    {lead.attachments && lead.attachments.length > 0 && (
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                Załączniki ({lead.attachments.length})
                                            </h3>
                                            <div className="space-y-3">
                                                {lead.attachments.map((att, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase shrink-0">
                                                            {att.name.split('.').pop()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-900 truncate" title={att.name}>{att.name}</div>
                                                            <div className="text-xs text-slate-500">{(att.size / 1024).toFixed(1)} KB</div>
                                                        </div>
                                                        <div className="text-slate-400">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Email & Communication Widget (Expanded) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            Historia E-mail i Komunikacja
                                        </h3>
                                        <div className="space-y-4">
                                            {(() => {
                                                const emails = communications.filter(c => c.type === 'email' || c.userId === 'client');
                                                if (emails.length === 0) return <div className="text-sm text-slate-400 italic">Brak wiadomości e-mail.</div>;

                                                return emails.slice(0, 5).map((comm) => (
                                                    <div key={comm.id} className={`flex gap-3 items-start p-3 rounded-lg border ${comm.direction === 'inbound' || comm.userId === 'client' ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                                                        <div className="mt-1">
                                                            {comm.direction === 'inbound' || comm.userId === 'client' ? (
                                                                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                                                                    {(comm.direction === 'inbound' || comm.userId === 'client') ? 'Otrzymana' : 'Wysłana'}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {new Date(comm.createdAt).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-semibold text-slate-800 truncate">
                                                                {comm.subject || '(Bez tematu)'}
                                                            </div>
                                                            <div className="text-sm text-slate-600 line-clamp-2">
                                                                {comm.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        {communications.some(c => c.type === 'email' || c.userId === 'client') && (
                                            <button
                                                onClick={() => setActiveTab('communications')}
                                                className="w-full text-center text-sm text-purple-600 font-medium hover:underline mt-4"
                                            >
                                                Pokaż wszystkie wiadomości
                                            </button>
                                        )}
                                    </div>

                                    {/* Notes Section with new NotesList */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Notatki
                                        </h2>

                                        {/* Main Lead Note (from Form) */}
                                        {lead.notes && (
                                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg mb-6 text-slate-700">
                                                <div className="text-xs font-bold text-amber-700 uppercase mb-2">Opis / Główna Notatka</div>
                                                <div className="prose prose-sm prose-amber max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {lead.notes}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}

                                        <NotesList
                                            entityType="lead"
                                            entityId={lead.id}
                                            extraItems={communications.filter(c => c.userId === 'client').map(c => ({
                                                id: c.id,
                                                content: c.content || '',
                                                createdAt: new Date(c.createdAt),
                                                type: 'client_message',
                                                user: { firstName: 'Klient' }
                                            }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FAIR DATA SECTION (INLINED) */}
                            {(lead.source === 'targi' || lead.fairId) && (
                                <div className="mt-8 animate-in slide-in-from-bottom duration-500">
                                    <div className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🎡</span>
                                                <div>
                                                    <h3 className="font-bold text-lg">Lead Targowy - Szczegóły Konfiguracji</h3>
                                                    {lead.fairId && <p className="text-xs opacity-70 font-mono">ID: {lead.fairId}</p>}
                                                </div>
                                            </div>
                                            {lead.fairPrize && (
                                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                                    <span className="font-bold text-sm">🏆 {lead.fairPrize.label}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 space-y-8">
                                            {/* PRODUCTS LIST */}
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                    Skonfigurowane Produkty ({lead.fairProducts?.length || 0})
                                                </h4>

                                                {!lead.fairProducts || lead.fairProducts.length === 0 ? (
                                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                                        <p className="text-slate-400 italic">Brak skonfigurowanych produktów w systemie.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                        {lead.fairProducts.map((p, idx) => (
                                                            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-purple-200 transition-colors shadow-sm">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-purple-600 shadow-sm shrink-0 text-lg border border-purple-100">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="font-bold text-slate-800 capitalize text-lg">
                                                                                {p.type === 'roof' ? 'Zadaszenie' : p.type === 'pergola' ? 'Pergola' : p.type === 'carport' ? 'Carport' : p.type}
                                                                            </span>
                                                                            <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-sm shadow-sm">
                                                                                {p.width} x {p.projection} mm
                                                                            </span>
                                                                        </div>

                                                                        {/* Details Tags */}
                                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                                            {p.wallTypes && p.wallTypes.length > 0 && !p.wallTypes.includes('none') && (
                                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200">Ściany</span>
                                                                            )}
                                                                            {p.zipEnabled && (
                                                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold border border-amber-200">ZIP ({p.zipSidesCount || 0})</span>
                                                                            )}
                                                                            {p.ledType && p.ledType !== 'none' && (
                                                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold border border-yellow-200">LED</span>
                                                                            )}
                                                                        </div>

                                                                        {p.notes ? (
                                                                            <div className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-600 italic relative">
                                                                                <span className="absolute top-2 left-2 text-slate-200 text-4xl leading-none -z-10">"</span>
                                                                                {p.notes}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-slate-400 italic">Brak uwag</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* PHOTOS */}
                                            {lead.fairPhotos && lead.fairPhotos.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        Zdjęcia / Szkice ({lead.fairPhotos.length})
                                                    </h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                        {lead.fairPhotos.map((ph, i) => (
                                                            <a key={i} href={ph.url} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                                <img src={ph.url} alt="miniatura" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                    <div className="bg-white p-2 rounded-full shadow-lg">
                                                                        <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                                    </div>
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>)}

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
                            <div className="space-y-6">
                                <CommunicationTimeline
                                    items={communications}
                                    onItemClick={() => { }}
                                />
                            </div>
                        )}

                        {activeTab === 'fair' && (
                            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                                {/* TRADE FAIR CARD - Special Module View */}
                                <div className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🎡</span>
                                            <div>
                                                <h3 className="font-bold text-lg">Lead Targowy</h3>
                                                {lead.fairId && <p className="text-xs opacity-70 font-mono">ID: {lead.fairId}</p>}
                                            </div>
                                        </div>
                                        {lead.fairPrize && (
                                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                                <span className="font-bold text-sm">🏆 {lead.fairPrize.label}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 space-y-8">
                                        {/* PRODUCTS LIST */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                Skonfigurowane Produkty ({lead.fairProducts?.length || 0})
                                            </h4>

                                            {!lead.fairProducts || lead.fairProducts.length === 0 ? (
                                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                                    <p className="text-slate-400 italic">Brak skonfigurowanych produktów w systemie.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {lead.fairProducts.map((p, idx) => (
                                                        <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-purple-200 transition-colors shadow-sm">
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-purple-600 shadow-sm shrink-0 text-lg border border-purple-100">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="font-bold text-slate-800 capitalize text-lg">
                                                                            {p.type === 'roof' ? 'Zadaszenie' : p.type === 'pergola' ? 'Pergola' : p.type === 'carport' ? 'Carport' : p.type}
                                                                        </span>
                                                                        <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-sm shadow-sm">
                                                                            {p.width} x {p.projection} mm
                                                                        </span>
                                                                    </div>

                                                                    {/* Details Tags */}
                                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                                        {p.wallTypes && p.wallTypes.length > 0 && !p.wallTypes.includes('none') && (
                                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200">Ściany</span>
                                                                        )}
                                                                        {p.zipEnabled && (
                                                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold border border-amber-200">ZIP ({p.zipSidesCount || 0})</span>
                                                                        )}
                                                                        {p.ledType && p.ledType !== 'none' && (
                                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold border border-yellow-200">LED</span>
                                                                        )}
                                                                    </div>

                                                                    {p.notes ? (
                                                                        <div className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-600 italic relative">
                                                                            <span className="absolute top-2 left-2 text-slate-200 text-4xl leading-none -z-10">"</span>
                                                                            {p.notes}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-400 italic">Brak uwag</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* PHOTOS */}
                                        {lead.fairPhotos && lead.fairPhotos.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    Zdjęcia / Szkice ({lead.fairPhotos.length})
                                                </h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                    {lead.fairPhotos.map((ph, i) => (
                                                        <a key={i} href={ph.url} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                            <img src={ph.url} alt="miniatura" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <div className="bg-white p-2 rounded-full shadow-lg">
                                                                    <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                to={lead.customerData.email || ''}
                subject={`Pytanie dot. oferty - ${lead.customerData.firstName} ${lead.customerData.lastName}`}
                leadData={{
                    ...lead.customerData,
                    notes: lead.notes
                }}
                leadId={lead.id}
                customerId={lead.customerId}
                availableOffers={offers}
            />
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                initialData={{ leadId: lead.id }}
                onSuccess={() => setTasksRefreshTrigger(prev => prev + 1)}
            />
            <ScheduleMeasurementModal
                isOpen={isMeasurementModalOpen}
                onClose={() => setIsMeasurementModalOpen(false)}
                onSuccess={() => {
                    // Refresh lead to show updated status
                    DatabaseService.getLead(id!).then(setLead);
                }}
                leadData={{
                    leadId: lead.id,
                    firstName: lead.customerData.firstName,
                    lastName: lead.customerData.lastName,
                    phone: lead.customerData.phone,
                    address: lead.customerData.address,
                    postalCode: lead.customerData.postalCode,
                    city: lead.customerData.city
                }}
            />
        </div >
    );
};
