import React, { useEffect, useState } from 'react';
import { normalizePhone, formatPhoneDisplay } from '../../utils/phone';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { LeadForm } from './LeadForm';
import type { Lead, Communication, Offer } from '../../types';
import { TelephonyService, type CallLog, type SMSLog } from '../../services/database/telephony.service';
import { CommunicationTimeline } from '../crm/CommunicationTimeline';
import { UnifiedTimeline, calculateEngagementScore } from '../crm/UnifiedTimeline';
import { OffersList } from '../OffersList';
import { SendEmailModal } from './SendEmailModal';
import { TasksList } from '../tasks/TasksList';
import { TaskModal } from '../tasks/TaskModal';
import { NotesList } from '../common/NotesList';
import { AssigneeSelector } from '../common/AssigneeSelector';
import { CustomerActivityTimeline } from '../common/CustomerActivityTimeline';
import { EmailHistoryWidget } from '../common/EmailHistoryWidget';
import { ScheduleMeasurementModal } from './ScheduleMeasurementModal';
import { SnowZoneEmailModal } from './SnowZoneEmailModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConfiguratorService, type LeadConfiguration } from '../../services/database/configurator.service';
import { QuickSMSModal } from '../telephony/QuickSMSModal';
import { ManualContractModal } from '../contracts/ManualContractModal';

import { useAuth } from '../../contexts/AuthContext';

type Tab = 'overview' | 'communications' | 'offers' | 'form' | 'fair';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    new: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    contacted: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    measurement_scheduled: { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500' },
    measurement_completed: { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
    offer_sent: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    negotiation: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
    configuration_received: { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500' },
    won: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    lost: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    fair: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    formularz: { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
};

const STATUS_LABELS: Record<string, string> = {
    new: 'Neu', contacted: 'Kontaktiert', measurement_scheduled: 'Aufmaß geplant',
    measurement_completed: 'Aufmaß erledigt', offer_sent: 'Angebot gesendet',
    negotiation: 'Verhandlung', configuration_received: 'Konfiguration erhalten',
    won: 'Gewonnen', lost: 'Verloren', fair: 'Messe', formularz: 'Formularz',
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
    email: <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    phone: <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
    website: <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    targi: <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>,
    manual: <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    other: <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
};

function timeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    const months = Math.floor(days / 30);
    return `vor ${months} Monat${months !== 1 ? 'en' : ''}`;
}

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
    const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string; type?: string } | null>(null);
    const [isSnowZoneModalOpen, setIsSnowZoneModalOpen] = useState(false);
    const [configurations, setConfigurations] = useState<LeadConfiguration[]>([]);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [callsLoading, setCallsLoading] = useState(false);
    const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
    const [showTranscription, setShowTranscription] = useState<string | null>(null);
    const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
    const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);

    useEffect(() => {
        const fetchLead = async () => {
            if (!id) return;
            try {
                const data = await DatabaseService.getLead(id);
                setLead(data);

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

    // Load configurations for this lead
    useEffect(() => {
        if (id) {
            ConfiguratorService.getByLeadId(id).then(setConfigurations).catch(console.error);
        }
    }, [id]);

    // Load call logs + SMS/WA logs for this lead
    useEffect(() => {
        if (!id || !lead) return;
        setCallsLoading(true);
        const fetchCalls = async () => {
            try {
                // First try by lead_id
                let calls = await TelephonyService.getCallLogsByLeadId(id!);
                // Also try by phone number if the lead has one
                if (lead?.customerData?.phone) {
                    const phoneCalls = await TelephonyService.getCallLogsByPhone(lead.customerData.phone);
                    // Merge unique calls
                    const existingIds = new Set(calls.map(c => c.id));
                    for (const c of phoneCalls) {
                        if (!existingIds.has(c.id)) calls.push(c);
                    }
                    // Sort by date desc
                    calls.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
                }
                setCallLogs(calls);
            } catch (e) {
                console.warn('Calls not loaded for lead', e);
            } finally {
                setCallsLoading(false);
            }
        };
        fetchCalls();

        // Fetch SMS/WhatsApp messages
        const fetchMessages = async () => {
            try {
                if (lead?.customerData?.phone) {
                    const msgs = await TelephonyService.getAllMessagesByPhone(lead.customerData.phone);
                    setSmsLogs(msgs);
                }
            } catch (e) {
                console.warn('SMS logs not loaded for lead', e);
            }
        };
        fetchMessages();
    }, [id, lead?.customerData?.phone]);

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
                leadId: lead.id,
                leadNotes: lead.notes || '',
                leadSource: lead.source || '',
                leadCustomerData: lead.customerData, // full customer data incl. config fields
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

    return (<>
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* Header Row 1: Identity + Quick Info */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm shrink-0">
                <div className="px-4 sm:px-6 lg:px-8 py-3">
                    {/* Top: Back + Name + Status */}
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                            {lead.customerData.firstName?.[0]}{lead.customerData.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                                {lead.customerData.firstName} {lead.customerData.lastName}
                                {lead.customerData.companyName && (
                                    <span className="text-sm font-normal text-slate-400 ml-2 hidden sm:inline">({lead.customerData.companyName})</span>
                                )}
                            </h1>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 flex-wrap">
                                {(() => {
                                    const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
                                    return (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                            {STATUS_LABELS[lead.status] || lead.status}
                                        </span>
                                    );
                                })()}
                                <span className="text-slate-300 hidden sm:inline">•</span>
                                <span className="hidden sm:inline flex items-center gap-1" title={lead.source}>{SOURCE_ICONS[lead.source] || <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} {lead.source}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400" title={lead.createdAt.toLocaleString()}>{timeAgo(lead.createdAt)}</span>
                                {lead.assignee && (
                                    <>
                                        <span className="text-slate-300 hidden sm:inline">•</span>
                                        <span className="hidden sm:inline flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> {lead.assignee.firstName} {lead.assignee.lastName}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Primary Action - always visible */}
                        <button
                            onClick={handleConvert}
                            className="px-3 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm shadow-sm shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Neue Offerte</span>
                        </button>
                    </div>

                    {/* Action Bar — wraps on mobile */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {lead.status === 'new' && (
                            <button
                                onClick={async () => {
                                    try {
                                        const updates: Partial<Lead> = { status: 'contacted' };
                                        let msg = 'Jako skontaktowano';
                                        if (currentUser && !lead.assignedTo) {
                                            updates.assignedTo = currentUser.id;
                                            msg += ' + opiekun';
                                        }
                                        await DatabaseService.updateLead(lead.id, updates);
                                        setLead(prev => prev ? { ...prev, status: 'contacted', assignedTo: currentUser?.id || prev.assignedTo } : null);
                                        toast.success(msg);
                                    } catch (e) { console.error(e); toast.error('Błąd'); }
                                }}
                                className="px-2.5 py-1.5 border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-xs"
                            ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> Kontaktiert</button>
                        )}
                        {lead.customerData?.phone && (
                            <a
                                href={`https://wa.me/${normalizePhone(lead.customerData.phone).replace('+', '')}`}
                                target="_blank" rel="noreferrer"
                                className="px-2.5 py-1.5 border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-xs"
                            ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> WhatsApp</a>
                        )}
                        {lead.customerData?.phone && (
                            <a href={`tel:${normalizePhone(lead.customerData.phone)}`}
                                className="px-2.5 py-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                            ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> Anrufen</a>
                        )}
                        {lead.customerData?.phone && (
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('softphone-dial', {
                                        detail: { number: normalizePhone(lead.customerData.phone), name: `${lead.customerData.firstName} ${lead.customerData.lastName}` }
                                    }));
                                }}
                                className="px-2.5 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                            ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> Zadzwoń</button>
                        )}
                        {lead.customerData?.phone && (
                            <button
                                onClick={() => setIsSMSModalOpen(true)}
                                className="px-2.5 py-1.5 border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                            ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> SMS</button>
                        )}
                        <button onClick={() => setIsEmailModalOpen(true)}
                            className="px-2.5 py-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                        ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> E-Mail</button>
                        <button onClick={() => setIsSnowZoneModalOpen(true)}
                            className="px-2.5 py-1.5 border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                        ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Mail powitalny</button>
                        <button onClick={() => setIsMeasurementModalOpen(true)}
                            className="px-2.5 py-1.5 border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                        ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Ustal termin</button>
                        <button
                                onClick={() => setIsContractModalOpen(true)}
                                className="px-2.5 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors flex items-center gap-1 text-xs"
                            ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Utwórz umowę</button>
                        <div className="flex-1 hidden sm:block" />
                        <button onClick={() => setIsEditMode(true)}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg font-medium transition-colors text-xs flex items-center gap-1"
                        ><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Bearbeiten</button>
                    </div>
                </div>

                {/* Tab Bar — replaces old sidebar */}
                <div className="px-4 sm:px-6 lg:px-8 flex gap-0 border-t border-slate-100 bg-slate-50/50 overflow-x-auto scrollbar-hide">
                    {[
                        { key: 'overview' as Tab, label: 'Übersicht', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
                        { key: 'offers' as Tab, label: 'Angebote', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, count: offers.length },
                        { key: 'form' as Tab, label: 'Formularz', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, count: configurations.filter(c => c.status === 'completed').length },
                        { key: 'communications' as Tab, label: 'Kommunikation', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
                        ...((lead.source === 'targi' || lead.fairId) ? [{ key: 'fair' as Tab, label: 'Messe', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg> }] : []),
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key
                                ? 'border-accent text-accent bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="bg-slate-200 text-slate-700 py-0 px-1.5 rounded-full text-[10px] font-bold">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content — full width, no sidebar */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {activeTab === 'overview' && (<>

                        {/* ═══ 2. CONTACT + LEAD META (side-by-side) ═══ */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Contact Card — 2 cols */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    Kontaktdaten
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                    {/* Name */}
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-400 uppercase">Name</label>
                                        <div className="text-slate-900 font-semibold text-lg">
                                            {lead.customerData.firstName} {lead.customerData.lastName}
                                        </div>
                                    </div>
                                    {/* Company */}
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-400 uppercase">Firma</label>
                                        <div className="text-slate-900">{lead.customerData.companyName || '—'}</div>
                                    </div>
                                    {/* Phone */}
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-400 uppercase">Telefon</label>
                                        <div className="text-slate-900">
                                            {lead.customerData.phone ? (
                                                <a href={`tel:${normalizePhone(lead.customerData.phone)}`} className="text-accent hover:underline font-mono font-medium">
                                                    {formatPhoneDisplay(lead.customerData.phone)}
                                                </a>
                                            ) : <span className="text-slate-300">—</span>}
                                        </div>
                                    </div>
                                    {/* Email */}
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-400 uppercase">E-Mail</label>
                                        <div className="text-slate-900">
                                            {lead.customerData.email ? (
                                                <a href={`mailto:${lead.customerData.email}`} className="text-accent hover:underline">
                                                    {lead.customerData.email}
                                                </a>
                                            ) : <span className="text-slate-300">—</span>}
                                        </div>
                                    </div>
                                    {/* Address */}
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase">Adresse</label>
                                        <div className="text-slate-900">
                                            {(lead.customerData.address || (lead.customerData as any).street || lead.customerData.postalCode || lead.customerData.city) ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([lead.customerData.address || (lead.customerData as any).street, lead.customerData.postalCode, lead.customerData.city].filter(Boolean).join(', '))}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="hover:text-accent transition-colors inline-flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {[lead.customerData.address || (lead.customerData as any).street, lead.customerData.postalCode, lead.customerData.city].filter(Boolean).join(', ')}
                                                </a>
                                            ) : <span className="text-slate-300">—</span>}
                                        </div>
                                    </div>
                                    {/* Snow Zone */}
                                    {lead.customerData.snowZone && (
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg> Schneelastzone</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-sm">Zone {lead.customerData.snowZone}</span>
                                                {lead.customerData.snowLoad && <span className="text-slate-600 text-sm font-medium">{lead.customerData.snowLoad} kN/m²</span>}
                                                {lead.customerData.snowZonePostalCode && <span className="text-slate-400 text-xs">(PLZ {lead.customerData.snowZonePostalCode})</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lead Meta Card — 1 col */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    Lead-Info
                                </h3>
                                <div className="space-y-3">
                                    {/* Engagement Score */}
                                    {(() => {
                                        const scoreEntries = [
                                            ...communications.map(c => ({
                                                channel: c.metadata?.source === 'ringostat_sync' ? 'ringostat' : c.type === 'email' ? 'email' : c.type === 'call' ? 'call' : 'note',
                                                direction: c.direction || 'outbound', date: c.date, status: c.metadata?.disposition,
                                            })),
                                            ...callLogs.map(c => ({ channel: 'call', direction: c.direction, date: c.started_at, status: c.status })),
                                            ...smsLogs.map(m => ({ channel: m.channel || 'sms', direction: m.direction, date: m.created_at })),
                                        ];
                                        const score = calculateEngagementScore(scoreEntries);
                                        const cfg = score >= 80 ? { label: 'Hot', dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700' }
                                            : score >= 40 ? { label: 'Warm', dot: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700' }
                                                : score >= 15 ? { label: 'Cool', dot: 'bg-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-700' }
                                                    : { label: 'Cold', dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500' };
                                        return (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-500">Engagement</span>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} inline-flex items-center gap-1.5`}>
                                                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                                    {cfg.label} ({score})
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    {/* Lead Quality */}
                                    {(() => {
                                        let score = 0;
                                        if (lead.customerData.firstName && lead.customerData.lastName) score += 20;
                                        if (lead.customerData.phone) score += 30;
                                        if (lead.customerData.email) score += 20;
                                        if (lead.customerData.companyName) score += 10;
                                        if (lead.customerData.address) score += 10;
                                        if (lead.source) score += 10;
                                        return (
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-slate-500">Qualität</span>
                                                    <span className={`text-sm font-bold ${score > 70 ? 'text-emerald-600' : score > 40 ? 'text-amber-500' : 'text-red-500'}`}>{score}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full transition-all ${score > 70 ? 'bg-emerald-500' : score > 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="border-t border-slate-100 pt-2 space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">Quelle</span><span className="font-medium text-slate-800 capitalize">{lead.source}</span></div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Betreuer</span>
                                            <span className="font-medium text-slate-800 flex items-center gap-1">
                                                {lead.assignee ? `${lead.assignee.firstName} ${lead.assignee.lastName}` : '—'}
                                                {!isAssigning && (currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                                    <button onClick={() => setIsAssigning(true)} className="text-slate-400 hover:text-accent" title="Ändern">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                            </span>
                                        </div>
                                        {isAssigning && (
                                            <AssigneeSelector
                                                currentAssigneeId={lead.assignedTo}
                                                onCancel={() => setIsAssigning(false)}
                                                onAssign={async (newId) => {
                                                    try {
                                                        await DatabaseService.updateLead(lead.id, { assignedTo: newId });
                                                        const updatedLead = await DatabaseService.getLead(lead.id);
                                                        setLead(updatedLead);
                                                        setIsAssigning(false);
                                                        toast.success('Betreuer geändert');
                                                    } catch (e) { toast.error('Fehler'); }
                                                }}
                                            />
                                        )}
                                        {lead.lastContactDate && (
                                            <div className="flex justify-between"><span className="text-slate-500">Letzter Kontakt</span><span className="text-slate-800">{timeAgo(new Date(lead.lastContactDate))}</span></div>
                                        )}
                                        {lead.clientWillContactAt && (
                                            <div className="flex justify-between"><span className="text-slate-500">Rückmeldung</span><span className="text-orange-600 font-medium">{new Date(lead.clientWillContactAt).toLocaleString()}</span></div>
                                        )}
                                        {lead.customerId && (
                                            <button onClick={() => navigate(`/customers/${lead.customerId}`)} className="w-full mt-1 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors inline-flex items-center justify-center gap-1.5">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                Kundenprofil öffnen
                                            </button>
                                        )}
                                    </div>
                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {offers.length > 0 && (
                                            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-[10px] font-bold inline-flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>{offers.length} Angebot{offers.length !== 1 ? 'e' : ''}</span>
                                        )}
                                        {configurations.length > 0 && (
                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>{configurations.filter(c => c.status === 'completed').length}/{configurations.length} Konfig.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ═══ 3. PIPELINE TRACKER ═══ */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <div className="flex items-center justify-between">
                                {(() => {
                                    const steps = [
                                        { key: 'new', label: 'Neu', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> },
                                        { key: 'contacted', label: 'Kontaktiert', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> },
                                        { key: 'measurement_scheduled,measurement_completed', label: 'Aufmaß', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> },
                                        { key: 'offer_sent', label: 'Angebot', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                                        { key: 'negotiation', label: 'Verhandlung', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg> },
                                        { key: 'won', label: 'Gewonnen', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                    ];
                                    const statusOrder = ['new', 'contacted', 'configuration_received', 'measurement_scheduled', 'measurement_completed', 'offer_sent', 'negotiation', 'won'];
                                    const currentIdx = statusOrder.indexOf(lead.status);
                                    const isLost = lead.status === 'lost';
                                    return steps.map((step, i) => {
                                        const stepKeys = step.key.split(',');
                                        const stepMaxIdx = Math.max(...stepKeys.map(k => statusOrder.indexOf(k)));
                                        const isActive = stepKeys.includes(lead.status);
                                        const isPast = !isLost && currentIdx > stepMaxIdx;
                                        const isFuture = !isActive && !isPast;
                                        return (
                                            <React.Fragment key={step.key}>
                                                {i > 0 && <div className={`flex-1 h-0.5 mx-1 rounded ${isPast || isActive ? 'bg-accent' : 'bg-slate-200'}`} />}
                                                <div className={`flex flex-col items-center gap-1 ${isActive ? 'scale-110' : ''} transition-transform`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-colors ${isActive ? 'border-accent bg-accent text-white shadow-md' :
                                                        isPast ? 'border-accent bg-accent/10 text-accent' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                                        {isPast ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : step.icon}
                                                    </div>
                                                    <span className={`text-[10px] font-medium ${isActive ? 'text-accent font-bold' : isFuture ? 'text-slate-400' : 'text-slate-600'}`}>{step.label}</span>
                                                </div>
                                            </React.Fragment>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* Lost Reason */}
                        {lead.status === 'lost' && lead.lostReason && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div>
                                    <div className="font-bold text-red-800 text-sm">Verloren</div>
                                    <div className="text-red-700 text-sm mt-0.5">{lead.lostReason}</div>
                                    {lead.lostByName && <div className="text-red-400 text-xs mt-1">von {lead.lostByName} {lead.lostAt ? `• ${new Date(lead.lostAt).toLocaleDateString()}` : ''}</div>}
                                </div>
                            </div>
                        )}

                        {/* ═══ 4. MAIN 2-COLUMN LAYOUT ═══ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* ── LEFT COLUMN: Tasks + Calls + Activity ── */}
                            <div className="space-y-6">
                                {/* Tasks */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                            Aufgaben</h3>
                                        <button onClick={() => setIsTaskModalOpen(true)} className="text-xs font-semibold text-accent hover:text-accent-dark bg-accent/10 hover:bg-accent/20 px-2 py-1 rounded transition-colors">+ Neu</button>
                                    </div>
                                    <TasksList leadId={lead.id} refreshTrigger={tasksRefreshTrigger} />
                                </div>

                                {/* Call History */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        Anrufe {callLogs.length > 0 && <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{callLogs.length}</span>}
                                    </h3>
                                    {callsLoading ? (
                                        <p className="text-slate-400 text-sm">Laden...</p>
                                    ) : callLogs.length === 0 ? (
                                        <p className="text-slate-400 text-sm">Keine Anrufe.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {callLogs.map(call => {
                                                const isExpanded = expandedCallId === call.id;
                                                const dirIcon = call.direction === 'inbound'
                                                    ? <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    : <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3h5m0 0v5m0-5l-6 6M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" /></svg>;
                                                const statusColors: Record<string, string> = {
                                                    completed: 'bg-green-100 text-green-700', 'no-answer': 'bg-red-100 text-red-700',
                                                    missed: 'bg-red-100 text-red-700', initiated: 'bg-yellow-100 text-yellow-700',
                                                    ringing: 'bg-blue-100 text-blue-700', 'in-progress': 'bg-blue-100 text-blue-700',
                                                    busy: 'bg-orange-100 text-orange-700', failed: 'bg-red-100 text-red-700',
                                                };
                                                const sentimentIcons: Record<string, React.ReactNode> = {
                                                    positive: <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px]">+</span>,
                                                    neutral: <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">=</span>,
                                                    negative: <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px]">−</span>
                                                };
                                                const SUPABASE_URL_VAL = import.meta.env.VITE_SUPABASE_URL || 'https://whgjsppyuvglhbdgdark.supabase.co';
                                                const getProxyUrl = (url: string) => {
                                                    if (!url || !url.includes('twilio.com')) return url;
                                                    return `${SUPABASE_URL_VAL}/functions/v1/recording-proxy?url=${encodeURIComponent(url)}`;
                                                };
                                                return (
                                                    <div key={call.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                                        <button onClick={() => setExpandedCallId(isExpanded ? null : call.id)} className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors text-left">
                                                            <span className="shrink-0">{dirIcon}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-medium text-xs text-slate-800">{call.direction === 'inbound' ? call.from_number : call.to_number}</span>
                                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${statusColors[call.status] || 'bg-slate-100 text-slate-600'}`}>{call.status}</span>
                                                                    {call.sentiment && sentimentIcons[call.sentiment] && <span className="inline-flex">{sentimentIcons[call.sentiment]}</span>}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                    {new Date(call.started_at).toLocaleString()}
                                                                    {call.duration_seconds > 0 && ` • ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`}
                                                                </div>
                                                            </div>
                                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                        {isExpanded && (
                                                            <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50">
                                                                {call.recording_url && (
                                                                    <div className="bg-white rounded-lg border border-slate-200 p-2">
                                                                        <p className="text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> Aufnahme</p>
                                                                        <audio controls src={getProxyUrl(call.recording_url)} className="w-full h-8" />
                                                                    </div>
                                                                )}
                                                                {call.summary && (
                                                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 p-2">
                                                                        <span className="text-[10px] font-bold text-indigo-800 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> AI</span>
                                                                        <p className="text-xs text-slate-700 mt-0.5">{call.summary}</p>
                                                                    </div>
                                                                )}
                                                                {call.transcription && (
                                                                    <div className="bg-white rounded-lg border border-slate-200 p-2">
                                                                        <button onClick={() => setShowTranscription(showTranscription === call.id ? null : call.id)} className="text-[10px] font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                            Transkription {showTranscription === call.id ? '▲' : '▼'}
                                                                        </button>
                                                                        {showTranscription === call.id && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap max-h-32 overflow-auto">{call.transcription}</p>}
                                                                    </div>
                                                                )}
                                                                {call.notes && (
                                                                    <div className="bg-amber-50 rounded-lg border border-amber-100 p-2">
                                                                        <p className="text-[10px] font-bold text-amber-700 mb-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Notizen</p>
                                                                        <p className="text-xs text-amber-900">{call.notes}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Customer Activity */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        Aktivität
                                    </h3>
                                    <CustomerActivityTimeline leadId={lead.id} />
                                </div>
                            </div>

                            {/* ── RIGHT COLUMN: AI + Configs + Notes + Email + Attachments ── */}
                            <div className="space-y-6">
                                {/* AI Insights (compact) */}
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 shadow-sm p-4">
                                    <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                        AI-Analyse
                                    </h3>
                                    {lead.aiSummary && (
                                        <div className="text-sm text-slate-700 leading-relaxed mb-2 bg-white/70 rounded-lg p-3 border border-indigo-100">
                                            {lead.aiSummary}
                                        </div>
                                    )}
                                    <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                                        <span className="text-[10px] font-bold text-indigo-800 uppercase">Empfohlene Aktion:</span>
                                        {(() => {
                                            const daysSinceCreated = (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24);
                                            const hasPhone = !!lead.customerData.phone;
                                            const hasEmail = !!lead.customerData.email;
                                            if (lead.status === 'new' && daysSinceCreated < 1) return <div className="text-sm font-medium text-slate-800 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> Neuer Lead! Anrufen oder Begrüßung senden.</div>;
                                            if (lead.status === 'new' && daysSinceCreated >= 1) return <div className="text-sm font-medium text-red-600 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" /> Lead wartet über 24h. Dringend kontaktieren!</div>;
                                            if (lead.status === 'offer_sent') return <div className="text-sm font-medium text-slate-800 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" /> Angebot gesendet. Nachfassen!</div>;
                                            if (!hasPhone && hasEmail) return <div className="text-sm font-medium text-slate-800 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> Kein Telefon. Nummer per E-Mail anfragen.</div>;
                                            if (lead.status === 'contacted') return <div className="text-sm font-medium text-slate-800 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" /> Kontaktiert. Angebot vorbereiten.</div>;
                                            return <div className="text-sm font-medium text-slate-600 mt-1">Status überwachen.</div>;
                                        })()}
                                    </div>
                                </div>

                                {/* Configurations */}
                                {/* Configurations — compact summary, full details in Formularz tab */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            Konfigurationen
                                        </h3>
                                        <button onClick={() => setActiveTab('form')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors">Alle anzeigen →</button>
                                    </div>
                                    {configurations.length === 0 ? (
                                        <p className="text-slate-400 text-xs mt-2">Keine Konfigurationen vorhanden.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {configurations.map(cfg => (
                                                <span key={cfg.id} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    cfg.status === 'viewed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {cfg.status === 'completed' ? <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : cfg.status === 'viewed' ? <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                    {cfg.status === 'completed' && cfg.modelDisplayName ? ` ${cfg.modelDisplayName}` : ` Konfig. #${configurations.indexOf(cfg) + 1}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Notizen
                                    </h3>
                                    {lead.notes && (
                                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg mb-3 text-sm text-slate-700">
                                            <div className="text-[10px] font-bold text-amber-700 uppercase mb-1">Hauptnotiz</div>
                                            <div className="prose prose-sm prose-amber max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lead.notes}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    <NotesList
                                        entityType="lead"
                                        entityId={lead.id}
                                        extraItems={communications.filter(c => c.userId === 'client').map(c => ({
                                            id: c.id, content: c.content || '', createdAt: new Date(c.createdAt), type: 'client_message', user: { firstName: 'Klient' }
                                        }))}
                                    />
                                </div>

                                {/* Email History */}
                                {lead.customerData.email && (
                                    <EmailHistoryWidget customerEmail={lead.customerData.email} maxItems={10} />
                                )}

                                {/* Email Origin */}
                                {lead.emailMessageId && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
                                        <span className="text-blue-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </span>
                                        <div>
                                            <h4 className="text-blue-900 font-semibold text-xs">Lead aus E-Mail</h4>
                                            <p className="text-blue-700 text-[10px] mt-0.5">ID: {lead.emailMessageId}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Attachments */}
                                {lead.attachments && lead.attachments.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                            Anhänge ({lead.attachments.length})
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {lead.attachments.map((att, idx) => {
                                                const ext = att.name.split('.').pop()?.toLowerCase() || '';
                                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || att.type?.startsWith('image/');
                                                const isPdf = ext === 'pdf' || att.type === 'application/pdf';
                                                const canPreview = isImage || isPdf;
                                                const sizeLabel = att.size > 1024 * 1024 ? `${(att.size / 1024 / 1024).toFixed(1)} MB` : `${(att.size / 1024).toFixed(1)} KB`;
                                                return (
                                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm transition-all group">
                                                        {isImage ? (
                                                            <img src={att.url} alt={att.name} className="w-10 h-10 rounded object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setPreviewAttachment({ url: att.url, name: att.name, type: 'image' })} />
                                                        ) : (
                                                            <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {isPdf ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> : ext}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-xs text-slate-900 truncate">{att.name}</div>
                                                            <div className="text-[10px] text-slate-400">{sizeLabel}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {canPreview && (
                                                                <button onClick={() => setPreviewAttachment({ url: att.url, name: att.name, type: isImage ? 'image' : 'pdf' })} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Vorschau">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                </button>
                                                            )}
                                                            <a href={att.url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-green-600 rounded transition-colors" title="Download">
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                            </a>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ═══ 5. FAIR DATA — compact indicator, full details in Fair tab ═══ */}
                        {(lead.source === 'targi' || lead.fairId) && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                                    </div>
                                    <div>
                                        <span className="font-bold text-purple-900 text-sm">Lead targowy</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {lead.fairProducts && lead.fairProducts.length > 0 && (
                                                <span className="text-xs text-purple-700">{lead.fairProducts.length} produkt{lead.fairProducts.length !== 1 ? 'y/ów' : ''}</span>
                                            )}
                                            {lead.fairPhotos && lead.fairPhotos.length > 0 && (
                                                <span className="text-xs text-purple-700">• {lead.fairPhotos.length} zdjęć</span>
                                            )}
                                            {lead.fairPrize && (
                                                <span className="text-xs font-bold text-amber-700 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> {lead.fairPrize.label}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setActiveTab('fair')} className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors">Szczegóły targowe →</button>
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

                    {/* FORMULARZ TAB */}
                    {activeTab === 'form' && (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> Konfigurator-Formulare</h2>
                                    <p className="text-sm text-slate-500 mt-1">Vom Kunden auszufüllende Konfigurationsformulare</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!id) return;
                                        setGeneratingLink(true);
                                        try {
                                            const result = await ConfiguratorService.createLink(id);
                                            await navigator.clipboard.writeText(result.url);
                                            toast.success('Neuer Link erstellt & kopiert!');
                                            const cfgs = await ConfiguratorService.getByLeadId(id);
                                            setConfigurations(cfgs);
                                        } catch (e: any) {
                                            toast.error('Fehler: ' + e.message);
                                        } finally {
                                            setGeneratingLink(false);
                                        }
                                    }}
                                    disabled={generatingLink}
                                    className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50"
                                >
                                    {generatingLink ? '...' : '+ Neuen Link erstellen'}
                                </button>
                            </div>

                            {configurations.length === 0 ? (
                                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3"><svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
                                    <p className="text-slate-500 font-medium">Noch keine Formulare</p>
                                    <p className="text-sm text-slate-400 mt-1">Senden Sie die Schneelast-E-Mail oder erstellen Sie einen neuen Link.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {configurations.map((cfg, idx) => {
                                        const isCompleted = cfg.status === 'completed';
                                        const isViewed = cfg.status === 'viewed';
                                        const isPending = cfg.status === 'pending';
                                        const statusConfig = isCompleted
                                            ? { icon: <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Ausgefüllt', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400' }
                                            : isViewed
                                                ? { icon: <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>, label: 'Geöffnet', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-400' }
                                                : { icon: <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Wartet', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', ring: 'ring-slate-300' };
                                        const cfgUrl = `${window.location.origin}/p/konfigurator/${cfg.token}`;

                                        return (
                                            <div key={cfg.id || idx} className={`rounded-xl border-2 ${statusConfig.border} ${statusConfig.bg} overflow-hidden transition-all ${isCompleted ? 'ring-2 ' + statusConfig.ring : ''}`}>
                                                {/* Status Bar */}
                                                <div className={`px-5 py-3 flex items-center justify-between ${isCompleted ? 'bg-emerald-100' : isViewed ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{statusConfig.icon}</span>
                                                        <span className={`font-bold text-sm ${statusConfig.text}`}>{statusConfig.label}</span>
                                                        <span className="text-xs text-slate-400">• Formular #{configurations.length - idx}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(cfgUrl); toast.success('Link kopiert!'); }}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1"
                                                        ><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Link kopieren</button>
                                                        <a href={cfgUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">↗ Öffnen</a>
                                                    </div>
                                                </div>

                                                {/* Content — full data display */}
                                                <div className="p-5">
                                                    {isCompleted && cfg.model ? (
                                                        <div className="space-y-5">
                                                            {/* ── Customer Data ── */}
                                                            {cfg.customerData && Object.values(cfg.customerData).some(v => v) && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                                        Kundendaten
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 bg-white rounded-lg border border-slate-100 p-3">
                                                                        {cfg.customerData.firstName && <div><span className="text-[10px] text-slate-400 uppercase block">Vorname</span><span className="text-sm font-medium text-slate-800">{cfg.customerData.firstName}</span></div>}
                                                                        {cfg.customerData.lastName && <div><span className="text-[10px] text-slate-400 uppercase block">Nachname</span><span className="text-sm font-medium text-slate-800">{cfg.customerData.lastName}</span></div>}
                                                                        {cfg.customerData.companyName && <div><span className="text-[10px] text-slate-400 uppercase block">Firma</span><span className="text-sm font-medium text-slate-800">{cfg.customerData.companyName}</span></div>}
                                                                        {cfg.customerData.email && <div><span className="text-[10px] text-slate-400 uppercase block">E-Mail</span><span className="text-sm font-medium text-accent">{cfg.customerData.email}</span></div>}
                                                                        {cfg.customerData.phone && <div><span className="text-[10px] text-slate-400 uppercase block">Telefon</span><span className="text-sm font-medium text-slate-800 font-mono">{cfg.customerData.phone}</span></div>}
                                                                        {cfg.customerData.street && <div><span className="text-[10px] text-slate-400 uppercase block">Straße</span><span className="text-sm font-medium text-slate-800">{cfg.customerData.street}</span></div>}
                                                                        {cfg.customerData.postalCode && <div><span className="text-[10px] text-slate-400 uppercase block">PLZ</span><span className="text-sm font-medium text-slate-800">{cfg.customerData.postalCode}</span></div>}
                                                                        {cfg.customerData.city && <div><span className="text-[10px] text-slate-400 uppercase block">Stadt</span><span className="text-sm font-medium text-slate-800">{cfg.customerData.city}</span></div>}
                                                                        {(cfg.customerData as any).snowZone && <div><span className="text-[10px] text-slate-400 uppercase block">Schneezone</span><span className="text-sm font-medium text-blue-700">{(cfg.customerData as any).snowZone}</span></div>}
                                                                        {(cfg.customerData as any).snowLoad && <div><span className="text-[10px] text-slate-400 uppercase block">Schneelast</span><span className="text-sm font-medium text-blue-700">{(cfg.customerData as any).snowLoad} kN/m²</span></div>}
                                                                        {(cfg.customerData as any).snowZonePostalCode && <div><span className="text-[10px] text-slate-400 uppercase block">PLZ (Schneezone)</span><span className="text-sm font-medium text-slate-800 font-mono">{(cfg.customerData as any).snowZonePostalCode}</span></div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Product / Model ── */}
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                    Produkt & Maße
                                                                </h4>
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 bg-white rounded-lg border border-slate-100 p-3">
                                                                    <div className="sm:col-span-3"><span className="text-[10px] text-slate-400 uppercase block">Modell</span><span className="text-sm font-bold text-slate-900">{cfg.modelDisplayName || cfg.model}</span></div>
                                                                    <div><span className="text-[10px] text-slate-400 uppercase block">Breite</span><span className="text-sm font-medium text-slate-800">{cfg.width} mm</span></div>
                                                                    <div><span className="text-[10px] text-slate-400 uppercase block">Tiefe</span><span className="text-sm font-medium text-slate-800">{cfg.projection} mm</span></div>
                                                                    <div><span className="text-[10px] text-slate-400 uppercase block">Fläche</span><span className="text-sm font-medium text-slate-800">{((cfg.width! / 1000) * (cfg.projection! / 1000)).toFixed(1)} m²</span></div>
                                                                </div>
                                                            </div>

                                                            {/* ── Model Comparison (selectedModels) ── */}
                                                            {(cfg.customerData as any).selectedModels && (cfg.customerData as any).selectedModels.length > 1 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                                        Modellvergleich — Kunde möchte vergleichen
                                                                    </h4>
                                                                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {((cfg.customerData as any).selectedModels as string[]).map((modelId: string) => (
                                                                                <span key={modelId} className="px-3 py-1.5 bg-white text-blue-800 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                                                                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                                    {modelId}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                        <p className="text-xs text-blue-600 mt-2 font-medium">Kunde erwartet Vergleichsangebot für alle ausgewählten Modelle</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Standalone Products (Einzelkomponenten) ── */}
                                                            {(cfg.customerData as any).standaloneProducts && (cfg.customerData as any).standaloneProducts.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                                                                        Einzelkomponenten
                                                                    </h4>
                                                                    <div className="bg-purple-50 rounded-lg border border-purple-200 p-3">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {((cfg.customerData as any).standaloneProducts as string[]).map((prod: string) => {
                                                                                const labels: Record<string, string> = { 'zip': 'ZIP Screen / Senkrechtmarkise', 'markise-aufdach': 'Aufdachmarkise', 'markise-unterdach': 'Unterdachmarkise', 'seitenwand': 'Seitenwand (Glas)', 'frontwand': 'Frontwand (Glas)', 'panorama-schiebewand': 'Panoramaschiebewand', 'schiebetuer-rahmen': 'Schiebetüren mit Rahmen' };
                                                                                return (
                                                                                    <span key={prod} className="px-3 py-1.5 bg-white text-purple-800 rounded-lg text-xs font-bold border border-purple-200 flex items-center gap-1.5">
                                                                                        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                                        {labels[prod] || prod}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Installation & Mounting ── */}
                                                            {(cfg.mountingType || cfg.installType) && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                        Montage & Installation
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-white rounded-lg border border-slate-100 p-3">
                                                                        {cfg.mountingType && <div><span className="text-[10px] text-slate-400 uppercase block">Untergrund</span><span className="text-sm font-medium text-slate-800 capitalize">{cfg.mountingType === 'fundament' ? 'Betonfundament' : cfg.mountingType === 'pflaster' ? 'Pflaster / Platten' : cfg.mountingType === 'erde' ? 'Erde / Rasen' : cfg.mountingType}</span></div>}
                                                                        {cfg.installType && <div><span className="text-[10px] text-slate-400 uppercase block">Installationsart</span><span className="text-sm font-medium text-slate-800 capitalize">{cfg.installType}</span></div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Roof Covering & Variant ── */}
                                                            {(cfg.roofCovering || cfg.roofVariant) && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                                        Dacheindeckung
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-white rounded-lg border border-slate-100 p-3">
                                                                        {cfg.roofCovering && <div><span className="text-[10px] text-slate-400 uppercase block">Eindeckung</span><span className="text-sm font-medium text-slate-800">{cfg.roofCovering}</span></div>}
                                                                        {cfg.roofVariant && <div><span className="text-[10px] text-slate-400 uppercase block">Variante</span><span className="text-sm font-medium text-slate-800">{cfg.roofVariant}</span></div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Color ── */}
                                                            {cfg.color && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                                                        Farbe
                                                                    </h4>
                                                                    <div className="bg-white rounded-lg border border-slate-100 p-3">
                                                                        <span className="text-sm font-medium text-slate-800">{cfg.color}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Glazing Sides ── */}
                                                            {cfg.glazingSides && Object.entries(cfg.glazingSides).filter(([, type]) => type && String(type).trim()).length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
                                                                        Verglasung
                                                                    </h4>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        {Object.entries(cfg.glazingSides).filter(([, type]) => type && String(type).trim()).map(([side, type]) => (
                                                                            <div key={side} className="bg-white rounded-lg border border-slate-100 p-3 text-center">
                                                                                <span className="text-[10px] text-slate-400 uppercase block">{side === 'left' ? 'Links' : side === 'right' ? 'Rechts' : 'Vorne'}</span>
                                                                                <span className="text-sm font-medium text-slate-800">{String(type)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── ZIP Screen ── */}
                                                            {cfg.zipScreen && (cfg.zipScreen.enabled || (cfg.zipScreen.sides && cfg.zipScreen.sides.length > 0)) && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                                                                        ZIP Screen
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-white rounded-lg border border-slate-100 p-3">
                                                                        {cfg.zipScreen.sides && cfg.zipScreen.sides.length > 0 && <div><span className="text-[10px] text-slate-400 uppercase block">Seiten</span><span className="text-sm font-medium text-slate-800">{cfg.zipScreen.sides.map((s: string) => s === 'left' ? 'Links' : s === 'right' ? 'Rechts' : 'Vorne').join(', ')}</span></div>}
                                                                        {cfg.zipScreen.type && <div><span className="text-[10px] text-slate-400 uppercase block">Typ</span><span className="text-sm font-medium text-slate-800 capitalize">{cfg.zipScreen.type === 'aufdach' ? 'Aufdach' : 'Unterdach'}</span></div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Senkrechtmarkise ── */}
                                                            {cfg.senkrechtmarkise && cfg.senkrechtmarkise.sides && cfg.senkrechtmarkise.sides.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                                                        Senkrechtmarkise
                                                                    </h4>
                                                                    <div className="bg-white rounded-lg border border-slate-100 p-3">
                                                                        <span className="text-[10px] text-slate-400 uppercase block">Seiten</span>
                                                                        <span className="text-sm font-medium text-slate-800">{cfg.senkrechtmarkise.sides.map((s: string) => s === 'left' ? 'Links' : s === 'right' ? 'Rechts' : 'Vorne').join(', ')}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Markise ── */}
                                                            {cfg.markise && cfg.markise.sides && cfg.markise.sides.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                                                                        Markise
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-white rounded-lg border border-slate-100 p-3">
                                                                        <div><span className="text-[10px] text-slate-400 uppercase block">Seiten</span><span className="text-sm font-medium text-slate-800">{cfg.markise.sides.map((s: string) => s === 'left' ? 'Links' : s === 'right' ? 'Rechts' : 'Vorne').join(', ')}</span></div>
                                                                        {cfg.markise.type && <div><span className="text-[10px] text-slate-400 uppercase block">Typ</span><span className="text-sm font-medium text-slate-800">{cfg.markise.type}</span></div>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Extras (Heater, LED, Flooring) ── */}
                                                            {(cfg.heater || cfg.led || cfg.flooring) && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                                                        Extras & Zubehör
                                                                    </h4>
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        {cfg.heater && <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-100 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg> Heizstrahler</span>}
                                                                        {cfg.led && <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold border border-yellow-100 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> LED-Beleuchtung</span>}
                                                                        {cfg.flooring && <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg> Boden: {cfg.flooring}</span>}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Notes (parsed) ── */}
                                                            {cfg.notes && (() => {
                                                                // Strip structured tags from notes, show only free-text
                                                                const cleanNotes = cfg.notes
                                                                    .replace(/\[MODELLVERGLEICH\][^\n]*/g, '')
                                                                    .replace(/\[EINZELKOMPONENTEN\][^\n]*/g, '')
                                                                    .trim();
                                                                return cleanNotes ? (
                                                                    <div>
                                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                            Kundennotizen
                                                                        </h4>
                                                                        <div className="bg-amber-50 rounded-lg border border-amber-100 p-3">
                                                                            <p className="text-sm text-amber-900 whitespace-pre-wrap">{cleanNotes}</p>
                                                                        </div>
                                                                    </div>
                                                                ) : null;
                                                            })()}

                                                            {/* ── Photos ── */}
                                                            {cfg.photos && cfg.photos.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                        Fotos ({cfg.photos.length})
                                                                    </h4>
                                                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                                        {cfg.photos.map((url: string, pi: number) => (
                                                                            <a key={pi} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg border border-slate-200 overflow-hidden hover:ring-2 hover:ring-accent transition-all">
                                                                                <img src={url} alt={`Foto ${pi + 1}`} className="w-full h-full object-cover" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ── Timestamp ── */}
                                                            {cfg.completedAt && (
                                                                <div className="pt-2 border-t border-slate-100">
                                                                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        Ausgefüllt am {new Date(cfg.completedAt).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">{isPending ? <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}</div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">
                                                                    {isPending ? 'Warte auf Kundenangaben...' : 'Kunde hat Formular geöffnet'}
                                                                </p>
                                                                <p className="text-xs text-slate-400">Erstellt: {new Date(cfg.createdAt).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'communications' && (
                        <div className="space-y-6">
                            <UnifiedTimeline
                                communications={communications}
                                callLogs={callLogs}
                                smsLogs={smsLogs}
                                onRefresh={async () => {
                                    if (!id) return;
                                    try {
                                        const comms = await DatabaseService.getLeadCommunications(id);
                                        setCommunications(comms);
                                        if (lead?.customerData?.phone) {
                                            const msgs = await TelephonyService.getAllMessagesByPhone(lead.customerData.phone);
                                            setSmsLogs(msgs);
                                            let calls = await TelephonyService.getCallLogsByLeadId(id);
                                            if (lead.customerData.phone) {
                                                const phoneCalls = await TelephonyService.getCallLogsByPhone(lead.customerData.phone);
                                                const existingIds = new Set(calls.map(c => c.id));
                                                for (const c of phoneCalls) {
                                                    if (!existingIds.has(c.id)) calls.push(c);
                                                }
                                            }
                                            setCallLogs(calls);
                                        }
                                    } catch (e) {
                                        console.error('Refresh failed', e);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'fair' && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-500">
                            {/* TRADE FAIR CARD - Special Module View */}
                            <div className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg></div>
                                        <div>
                                            <h3 className="font-bold text-lg">Lead Targowy</h3>
                                            {lead.fairId && <p className="text-xs opacity-70 font-mono">ID: {lead.fairId}</p>}
                                        </div>
                                    </div>
                                    {lead.fairPrize && (
                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                            <span className="font-bold text-sm flex items-center gap-1"><svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> {lead.fairPrize.label}</span>
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
            </div >
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
            <SnowZoneEmailModal
                isOpen={isSnowZoneModalOpen}
                onClose={() => setIsSnowZoneModalOpen(false)}
                onSent={async () => {
                    setActiveTab('form');
                    if (id) {
                        const cfgs = await ConfiguratorService.getByLeadId(id);
                        setConfigurations(cfgs);
                    }
                }}
                to={lead.customerData.email || ''}
                leadData={{
                    firstName: lead.customerData.firstName,
                    lastName: lead.customerData.lastName,
                    postalCode: lead.customerData.postalCode,
                    city: lead.customerData.city
                }}
                leadId={lead.id}
                customerId={lead.customerId}
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

            {/* Attachment Preview Lightbox */}
            {
                previewAttachment && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setPreviewAttachment(null)}
                    >
                        {/* Header Bar */}
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
                            <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-medium truncate max-w-[60%]">
                                <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> {previewAttachment.name}
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewAttachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Pobierz
                                </a>
                                <button
                                    onClick={() => setPreviewAttachment(null)}
                                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {previewAttachment.type === 'image' ? (
                                <img
                                    src={previewAttachment.url}
                                    alt={previewAttachment.name}
                                    className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
                                />
                            ) : previewAttachment.type === 'pdf' ? (
                                <iframe
                                    src={previewAttachment.url}
                                    title={previewAttachment.name}
                                    className="w-[85vw] h-[85vh] rounded-xl shadow-2xl bg-white"
                                />
                            ) : null}
                        </div>
                    </div>
                )
            }
        </div >

        {/* Quick SMS Modal */}
        {
            lead?.customerData?.phone && (
                <QuickSMSModal
                    isOpen={isSMSModalOpen}
                    onClose={() => setIsSMSModalOpen(false)}
                    phoneNumber={lead.customerData.phone}
                    contactName={`${lead.customerData.firstName} ${lead.customerData.lastName}`}
                />
            )
        }

        {/* Manual Contract Modal — pre-filled with lead data */}
        <ManualContractModal
            isOpen={isContractModalOpen}
            onClose={() => setIsContractModalOpen(false)}
            onSuccess={() => {
                setIsContractModalOpen(false);
                navigate('/contracts');
            }}
            preselectedCustomer={{
                id: lead?.customerId || '',
                firstName: lead?.customerData?.firstName || '',
                lastName: lead?.customerData?.lastName || '',
                email: lead?.customerData?.email || '',
                phone: lead?.customerData?.phone || '',
                city: lead?.customerData?.city || '',
                postalCode: lead?.customerData?.postalCode || '',
                street: lead?.customerData?.address || (lead?.customerData as any)?.street || '',
                companyName: lead?.customerData?.companyName || '',
            } as any}
        />
    </>
    );
};
