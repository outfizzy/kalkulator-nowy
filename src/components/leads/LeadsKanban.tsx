import React, { useState, useMemo, useEffect } from 'react';
import { normalizePhone } from '../../utils/phone';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable
} from '@dnd-kit/core';
import type {
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Lead, LeadStatus } from '../../types';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { LostLeadModal } from './LostLeadModal';
import { WonLeadModal } from './WonLeadModal';
import { MeasurementModal } from '../measurements/MeasurementModal';
import type { Measurement } from '../../types';
import { ConfiguratorService } from '../../services/database/configurator.service';
import { LeadAutoAssignService } from '../../services/database/lead-auto-assign.service';
import { OfferService } from '../../services/database/offer.service';
import { supabase } from '../../lib/supabase';
import { BulkWelcomeEmailModal } from './BulkWelcomeEmailModal';

interface LeadsKanbanProps {
    leads: Lead[];
    onLeadUpdate: () => void;
}

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
    { id: 'new', title: 'Nowe', color: 'bg-blue-50 border-blue-100 text-blue-700' },
    { id: 'formularz', title: 'Formularz', color: 'bg-teal-50 border-teal-100 text-teal-700' },
    { id: 'contacted', title: 'Skontaktowano', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
    { id: 'offer_sent', title: 'Wysłano Ofertę', color: 'bg-yellow-50 border-yellow-100 text-yellow-700' },
    { id: 'measurement_scheduled', title: 'Umówiony na pomiar', color: 'bg-cyan-50 border-cyan-100 text-cyan-700' },
    { id: 'measurement_completed', title: 'Pomiar odbył się', color: 'bg-purple-50 border-purple-100 text-purple-700' },
    { id: 'negotiation', title: 'Negocjacje', color: 'bg-orange-50 border-orange-100 text-orange-700' },
    { id: 'won', title: 'Wygrane', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    { id: 'lost', title: 'Utracone', color: 'bg-red-50 border-red-100 text-red-700' },
    { id: 'fair', title: 'Targi (Hub)', color: 'bg-purple-50 border-purple-100 text-purple-700' },
];

const COLUMN_ICONS: Record<LeadStatus, React.ReactNode> = {
    new: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    formularz: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    contacted: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
    offer_sent: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    measurement_scheduled: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    measurement_completed: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    negotiation: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    won: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    lost: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    fair: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
};


// Stage-specific stale thresholds (days without contact)
const STALE_THRESHOLDS: Record<string, number> = {
    new: 1, formularz: 2, contacted: 3,
    measurement_scheduled: 2, measurement_completed: 3,
    offer_sent: 5, negotiation: 7
};

const isLeadStale = (lead: Lead) => {
    if (lead.status === 'won' || lead.status === 'lost' || lead.status === 'fair') return false;
    const threshold = STALE_THRESHOLDS[lead.status] || 3;
    const lastDate = lead.lastContactDate ? new Date(lead.lastContactDate) : new Date(lead.createdAt);
    return differenceInDays(new Date(), lastDate) > threshold;
};

// SLA Timer: applies to ALL active pipeline stages
const getSlaInfo = (lead: Lead): { level: 'green' | 'yellow' | 'red' | 'dead'; label: string; pulse: boolean } => {
    if (['won', 'lost', 'fair'].includes(lead.status)) return { level: 'green', label: '', pulse: false };
    const lastDate = lead.lastContactDate ? new Date(lead.lastContactDate) : new Date(lead.createdAt);
    const now = new Date();
    const hoursElapsed = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    const threshold = (STALE_THRESHOLDS[lead.status] || 3) * 24;
    const ratio = hoursElapsed / threshold;
    if (hoursElapsed < 2) return { level: 'green', label: `${Math.round(hoursElapsed * 60)}min`, pulse: false };
    const label = hoursElapsed < 24 ? `${Math.round(hoursElapsed)}h` : `${Math.floor(hoursElapsed / 24)}d`;
    if (ratio < 0.5) return { level: 'green', label, pulse: false };
    if (ratio < 0.8) return { level: 'yellow', label, pulse: false };
    if (ratio < 1.0) return { level: 'red', label, pulse: true };
    return { level: 'dead', label, pulse: true };
};

// Lead Priority Scoring: 0-5 stars
const getLeadPriority = (lead: Lead, formCompleted?: boolean): number => {
    let score = 0;
    if (formCompleted) score += 1;
    if (lead.aiScore && lead.aiScore > 70) score += 1;
    if (lead.aiScore && lead.aiScore > 50) score += 1;
    // Check customer data for extras hints
    const notes = (lead.notes || '').toLowerCase();
    if (notes.includes('heizung') || notes.includes('grzejnik') || notes.includes('led') || notes.includes('heater')) score += 1;
    // Fast response bonus
    if (lead.lastContactDate && lead.createdAt) {
        const responseHours = (new Date(lead.lastContactDate).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
        if (responseHours < 2 && responseHours > 0) score += 1;
    }
    return Math.min(score, 5);
};

type OfferCardInfo = {
    viewed: boolean;
    viewCount: number;
    lastViewedAt?: Date;
    measurementRequested?: boolean;
    messageSent?: boolean;
    offerAccepted?: boolean;
    messageText?: string;
    interactionCount: number;
};

const KanbanCard = ({ lead, onClick, onUpdate, onSchedule, onDelete, isAdmin, formCompleted, offerViewInfo }: { lead: Lead; onClick: (id: string) => void; onUpdate: () => void; onSchedule: (lead: Lead) => void; onDelete: (id: string) => void; isAdmin: boolean; formCompleted?: boolean; offerViewInfo?: OfferCardInfo }) => {
    const navigate = useNavigate();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: lead.id,
        data: {
            type: 'Lead',
            lead
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isStale = isLeadStale(lead);

    const handleQuickContact = async (e: React.MouseEvent) => {
        e.stopPropagation();
        // Open phone dialer with customer's number
        const phone = lead.customerData?.phone || (lead.customerData as any)?.telefon;
        if (phone) {
            window.open(`tel:${normalizePhone(phone)}`, '_self');
        }
        try {
            await DatabaseService.updateLead(lead.id, { status: 'contacted', lastContactDate: new Date() });
            toast.success('📞 Oznaczono jako skontaktowano');
            onUpdate();
        } catch (error) {
            console.error('Error updating lead:', error);
            toast.error('Błąd aktualizacji');
        }
    };

    const handleQuickEmail = async (e: React.MouseEvent) => {
        e.stopPropagation();
        // Navigate to lead details where user can compose real email
        navigate(`/leads/${lead.id}`);
    };

    const sla = getSlaInfo(lead);

    const handleScheduleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSchedule(lead);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(lead.id);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(lead.id)}
            className={`p-3.5 rounded-xl shadow-sm border hover:shadow-lg transition-all duration-200 cursor-pointer group relative ${formCompleted
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 ring-2 ring-emerald-200/50 shadow-emerald-100'
                : lead.status === 'formularz'
                    ? 'bg-gradient-to-br from-teal-50/80 to-cyan-50/30 border-teal-200'
                    : isStale
                        ? 'bg-white border-red-200 ring-1 ring-red-50'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="pr-6">
                    <h4 className="font-bold text-slate-800 text-sm">
                        {lead.customerData.firstName} {lead.customerData.lastName}
                    </h4>
                    {lead.customerData.companyName && (
                        <div className="text-xs text-slate-500 font-medium">{lead.customerData.companyName}</div>
                    )}
                </div>

                <div className="absolute top-2 right-2 flex gap-1">
                    {lead.status === 'new' && (
                        <button
                            onClick={handleQuickContact}
                            className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title="Oznacz jako skontaktowano"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={handleScheduleClick}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Umów pomiar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleDeleteClick}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Usuń Lead"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>

                {isStale && (
                    <div className="absolute top-2 right-16 flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Brak kontaktu > 3 dni">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>!</span>
                    </div>
                )}
            </div>

            <div className="text-xs text-slate-600 space-y-1 mb-3">
                {(lead.customerData.address || (lead.customerData as any).street) && (
                    <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{lead.customerData.address || (lead.customerData as any).street}</span>
                    </div>
                )}
                {(lead.customerData.city || lead.customerData.postalCode) && (
                    <div className="flex items-center gap-1.5 pl-5">
                        <span className="text-slate-500">{lead.customerData.postalCode}</span>
                        <span>{lead.customerData.city}</span>
                    </div>
                )}
            </div>

            {/* AI Score + Priority Stars */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
                {lead.aiScore !== undefined ? (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border ${lead.aiScore > 70 ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200' : lead.aiScore < 30 ? 'bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`} title={lead.aiSummary}>
                        {lead.aiScore > 70 ? (
                            <svg className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                        ) : lead.aiScore < 30 ? (
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        ) : (
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <span>{lead.aiScore}</span>
                    </div>
                ) : (
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            try {
                                const toastId = toast.loading('AI Analizuje...');
                                await DatabaseService.scoreLead(lead.id);
                                toast.dismiss(toastId);
                                toast.success('Analiza gotowa!');
                                onUpdate();
                            } catch {
                                toast.error('Błąd AI');
                            }
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 rounded-md text-[10px] font-bold border border-violet-100 hover:bg-violet-100 transition-colors"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI OCENA
                    </button>
                )}
                {(() => {
                    const stars = getLeadPriority(lead, formCompleted);
                    return stars > 0 ? (
                        <span className="flex items-center gap-px" title={`Priorytet: ${stars}/5`}>
                            {Array.from({ length: stars }, (_, i) => (
                                <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                        </span>
                    ) : null;
                })()}
            </div>

            {/* Formularz Completion Badge — visible on ALL statuses */}
            {formCompleted && lead.status !== 'formularz' && (
                <div className="mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <span>Formularz wypełniony</span>
                </div>
            )}
            {lead.status === 'formularz' && (
                <div className={`mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold ${formCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-teal-100 text-teal-700 border border-teal-200'
                    }`}>
                    {formCompleted ? (
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-4 h-4 text-teal-500 animate-spin" style={{animationDuration: '3s'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    <span>{formCompleted ? 'Formularz wypełniony!' : 'Czeka na formularz...'}</span>
                </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    {lead.assignee ? (
                        <>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-[9px] font-bold text-blue-700 border-2 border-white shadow-sm">
                                {lead.assignee.firstName[0]}{lead.assignee.lastName[0]}
                            </div>
                            <span className="text-slate-600 font-medium truncate max-w-[100px]">
                                {lead.assignee.firstName} {lead.assignee.lastName}
                            </span>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 italic">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <span>Brak opiekuna</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {/* SLA Timer Badge — inline next to date */}
                    {sla.label && (
                        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            sla.level === 'green' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            sla.level === 'yellow' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            sla.level === 'red' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-red-100 text-red-700 border-red-300'
                        } ${sla.pulse ? 'animate-pulse' : ''}`} title={`Czas od utworzenia leada: ${sla.label}`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${sla.level === 'green' ? 'bg-emerald-500' : sla.level === 'yellow' ? 'bg-amber-500' : sla.level === 'red' ? 'bg-red-500' : 'bg-red-700'}`} />
                            {sla.label}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                        {format(new Date(lead.createdAt), 'dd.MM', { locale: pl })}
                    </span>
                </div>
            </div>

            {/* Customer Interaction Badges — show on all stages */}
            {(() => {
                const hasOfferInfo = offerViewInfo && offerViewInfo.interactionCount > 0;
                const hasCustomerEvents = lead.customerData?.offerViewedAt || lead.customerData?.measurementRequestedAt || lead.customerData?.offerAcceptedAt;
                if (!hasOfferInfo && !hasCustomerEvents) return null;
                return (
                    <div className="mb-2 flex flex-wrap gap-1">
                        {(offerViewInfo?.viewed || lead.customerData?.offerViewedAt) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold"
                                title={offerViewInfo?.lastViewedAt ? `Ostatnio: ${new Date(offerViewInfo.lastViewedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${new Date(offerViewInfo.lastViewedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : lead.customerData?.offerViewedAt ? `Otwarto: ${new Date(lead.customerData.offerViewedAt).toLocaleString()}` : ''}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Otwarta {offerViewInfo?.viewCount ? `${offerViewInfo.viewCount}×` : lead.customerData?.offerViewCount ? `${lead.customerData.offerViewCount}×` : ''}
                            </span>
                        )}
                        {(offerViewInfo?.offerAccepted || lead.customerData?.offerAcceptedAt) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold animate-pulse">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Zaakceptowana!
                            </span>
                        )}
                        {(offerViewInfo?.measurementRequested || lead.customerData?.measurementRequestedAt) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded text-[9px] font-bold">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                                Pomiar proszony
                            </span>
                        )}
                        {offerViewInfo?.messageSent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold"
                                title={offerViewInfo.messageText || ''}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                Wiadomość
                            </span>
                        )}
                    </div>
                );
            })()}

            {/* One-Click Pipeline Actions — stage-specific */}
            {!['won', 'lost', 'fair'].includes(lead.status) && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex gap-1">
                    {/* Early stages: Dzwonię + Mail + Pomiar */}
                    {['new', 'formularz', 'contacted'].includes(lead.status) && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (lead.customerData?.phone) {
                                        window.dispatchEvent(new CustomEvent('softphone-dial', { detail: { number: normalizePhone(lead.customerData.phone), name: `${lead.customerData.firstName || ''} ${lead.customerData.lastName || ''}`.trim(), leadId: lead.id } }));
                                    }
                                    handleQuickContact(e as any);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                title={lead.customerData?.phone || 'Brak numeru'}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                Dzwonię
                            </button>
                            <button
                                onClick={handleQuickEmail}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all hover:shadow-sm"
                                title="Wysłałem mail"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Mail
                            </button>
                            <button
                                onClick={handleScheduleClick}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold border border-violet-200 transition-all hover:shadow-sm"
                                title="Umów pomiar"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Pomiar
                            </button>
                        </>
                    )}
                    {/* Measurement stages: Dzwonię + Nowa Oferta */}
                    {['measurement_scheduled', 'measurement_completed'].includes(lead.status) && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (lead.customerData?.phone) {
                                        window.dispatchEvent(new CustomEvent('softphone-dial', { detail: { number: normalizePhone(lead.customerData.phone), name: `${lead.customerData.firstName || ''} ${lead.customerData.lastName || ''}`.trim(), leadId: lead.id } }));
                                    }
                                    handleQuickContact(e as any);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                title={lead.customerData?.phone || 'Brak numeru'}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                Dzwonię
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/new-offer', { state: {
                                        customer: lead.customerData,
                                        leadId: lead.id,
                                        leadNotes: lead.notes,
                                        leadCustomerData: lead.customerData
                                    }});
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 transition-all hover:shadow-sm"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Nowa Oferta
                            </button>
                        </>
                    )}
                    {/* Offer sent: View status + Zadzwoń + Przypomnij */}
                    {lead.status === 'offer_sent' && (
                        <>
                            {/* Offer view status badge */}
                            {offerViewInfo && (
                                <div className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold border ${offerViewInfo.viewed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                                    title={offerViewInfo.viewed ? `Otwarta ${offerViewInfo.viewCount}× ${offerViewInfo.lastViewedAt ? '| Ostatnio: ' + new Date(offerViewInfo.lastViewedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(offerViewInfo.lastViewedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}` : 'Klient nie otworzył oferty'}
                                >
                                    {offerViewInfo.viewed ? (
                                        <><svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> Otwarta {offerViewInfo.viewCount}×</>
                                    ) : (
                                        <><svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> Nieotwarta</>
                                    )}
                                </div>
                            )}
                            {lead.customerData?.phone && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('softphone-dial', { detail: { number: normalizePhone(lead.customerData!.phone), name: `${lead.customerData!.firstName || ''} ${lead.customerData!.lastName || ''}`.trim(), leadId: lead.id } }));
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    Zadzwoń
                                </button>
                            )}
                            <button
                                onClick={handleQuickEmail}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all hover:shadow-sm"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Przypomnij
                            </button>
                        </>
                    )}
                    {/* Negotiation: Dzwonię + Nowa Oferta + Wygrane */}
                    {lead.status === 'negotiation' && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (lead.customerData?.phone) {
                                        window.dispatchEvent(new CustomEvent('softphone-dial', { detail: { number: normalizePhone(lead.customerData.phone), name: `${lead.customerData.firstName || ''} ${lead.customerData.lastName || ''}`.trim(), leadId: lead.id } }));
                                    }
                                    handleQuickContact(e as any);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                title={lead.customerData?.phone || 'Brak numeru'}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                Dzwonię
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/new-offer', { state: {
                                        customer: lead.customerData,
                                        leadId: lead.id,
                                        leadNotes: lead.notes,
                                        leadCustomerData: lead.customerData
                                    }});
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 transition-all hover:shadow-sm"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Oferta
                            </button>
                        </>
                    )}
                </div>
            )}
        </div >
    );
};

// Extracted Column Component with useDroppable
const KanbanColumn = ({ column, leads, onNavigate, onUpdate, onSchedule, onDelete, isAdmin, completedFormLeadIds, onAutoAssign, onBulkEmail, offerViewMap }: { column: typeof COLUMNS[0], leads: Lead[], onNavigate: (id: string) => void, onUpdate: () => void, onSchedule: (lead: Lead) => void; onDelete: (id: string) => void; isAdmin: boolean; completedFormLeadIds: Set<string>; onAutoAssign?: () => void; onBulkEmail?: () => void; offerViewMap: Record<string, OfferCardInfo> }) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    const unassignedCount = leads.filter(l => !l.assignedTo).length;

    // Sort: completed forms first, then by most recently updated
    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            // Completed forms always first in formularz column
            if (column.id === 'formularz' && completedFormLeadIds.size > 0) {
                const aCompleted = completedFormLeadIds.has(a.id);
                const bCompleted = completedFormLeadIds.has(b.id);
                if (aCompleted && !bCompleted) return -1;
                if (!aCompleted && bCompleted) return 1;
            }
            // Secondary: most recently updated first
            const aDate = new Date(a.updatedAt || a.createdAt).getTime();
            const bDate = new Date(b.updatedAt || b.createdAt).getTime();
            return bDate - aDate;
        });
    }, [leads, column.id, completedFormLeadIds]);

    return (
        <div ref={setNodeRef} className="flex-shrink-0 w-72 flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200/50">
            {/* Column Header */}
            <div className={`p-3 border-b border-slate-100 rounded-t-xl ${column.color.replace('text-', 'bg-').replace('50', '50/50')}`}>
                <div className="flex justify-between items-center">
                    <h3 className={`font-semibold text-sm flex items-center gap-1.5 ${column.color.split(' ')[2]}`}>
                        {COLUMN_ICONS[column.id]}
                        {column.title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {unassignedCount > 0 && ['new', 'formularz', 'contacted'].includes(column.id) && (
                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold" title={`${unassignedCount} bez opiekuna`}>
                                {unassignedCount} ⚠️
                            </span>
                        )}
                        <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                            {leads.length}
                        </span>
                    </div>
                </div>
                {/* Auto-assign button */}
                {isAdmin && unassignedCount > 0 && ['new', 'formularz', 'contacted'].includes(column.id) && onAutoAssign && (
                    <button
                        onClick={onAutoAssign}
                        className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 transition-colors"
                    >
                        🤖 Przydziel automatycznie ({unassignedCount})
                    </button>
                )}
                {/* Bulk welcome email button — only for 'new' column */}
                {column.id === 'new' && leads.length > 0 && onBulkEmail && (
                    <button
                        onClick={onBulkEmail}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all hover:shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        📨 Wyślij powitalne ({leads.length})
                    </button>
                )}
            </div>

            {/* Column Content */}
            <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[100px]">
                <SortableContext
                    id={column.id}
                    items={sortedLeads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2 min-h-[50px]">
                        {sortedLeads.map(lead => (
                            <KanbanCard
                                key={lead.id}
                                lead={lead}
                                onClick={onNavigate}
                                onUpdate={onUpdate}
                                onSchedule={onSchedule}
                                onDelete={onDelete}
                                isAdmin={isAdmin}
                                formCompleted={completedFormLeadIds.has(lead.id)}
                                offerViewInfo={offerViewMap[lead.id]}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({ leads, onLeadUpdate }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeId, setActiveId] = useState<string | null>(null);

    // Modal State
    const [wonModalOpen, setWonModalOpen] = useState(false);
    const [pendingWonLeadId, setPendingWonLeadId] = useState<string | null>(null);
    const [lostModalOpen, setLostModalOpen] = useState(false);
    const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
    const [pendingLostLeadId, setPendingLostLeadId] = useState<string | null>(null);
    const [measurementLead, setMeasurementLead] = useState<Lead | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const columns = useMemo(() => {
        const cols: Record<LeadStatus, Lead[]> = {
            new: [],
            contacted: [],
            formularz: [],
            measurement_scheduled: [],
            measurement_completed: [],
            offer_sent: [],
            negotiation: [],
            won: [],
            lost: [],
            fair: []
        };
        leads.forEach(lead => {
            if (cols[lead.status]) {
                cols[lead.status].push(lead);
            }
        });
        return cols;
    }, [leads]);

    // Track which leads have completed configurator forms (check ALL leads, not just formularz)
    const [completedFormLeadIds, setCompletedFormLeadIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (leads.length === 0) { setCompletedFormLeadIds(new Set()); return; }

        const checkForms = async () => {
            // BATCH: single query for all leads instead of N+1
            const leadIds = leads.map(l => l.id);
            const { data } = await supabase
                .from('lead_configurations')
                .select('lead_id')
                .in('lead_id', leadIds)
                .eq('status', 'completed');

            const completed = new Set<string>(
                (data || []).map((r: any) => r.lead_id).filter(Boolean)
            );
            setCompletedFormLeadIds(completed);
        };
        checkForms();
    }, [leads]);

    // Track offer view status + customer interactions for offer_sent/negotiation leads
    const [offerViewMap, setOfferViewMap] = useState<Record<string, OfferCardInfo>>({});
    useEffect(() => {
        const relevantLeads = leads.filter(l => ['offer_sent', 'negotiation'].includes(l.status));
        if (relevantLeads.length === 0) { setOfferViewMap({}); return; }

        const fetchOfferViews = async () => {
            const viewMap: Record<string, OfferCardInfo> = {};

            // BATCH: fetch all offers for all relevant leads in one query
            const leadIds = relevantLeads.map(l => l.id);
            const { data: allOffers } = await supabase
                .from('offers')
                .select('id, lead_id, view_count, last_viewed_at')
                .in('lead_id', leadIds)
                .order('created_at', { ascending: false });

            // BATCH: fetch all interactions for all relevant leads in one query
            const { data: allInteractions } = await supabase
                .from('lead_interactions')
                .select('lead_id, event_type, event_data')
                .in('lead_id', leadIds);

            // Group by lead
            const offersByLead = new Map<string, any[]>();
            (allOffers || []).forEach((o: any) => {
                const list = offersByLead.get(o.lead_id) || [];
                list.push(o);
                offersByLead.set(o.lead_id, list);
            });

            const interactionsByLead = new Map<string, any[]>();
            (allInteractions || []).forEach((i: any) => {
                const list = interactionsByLead.get(i.lead_id) || [];
                list.push(i);
                interactionsByLead.set(i.lead_id, list);
            });

            for (const lead of relevantLeads) {
                const offers = offersByLead.get(lead.id) || [];
                const latest = offers[0] || null;
                const interactions = interactionsByLead.get(lead.id) || [];

                const measurementRequested = interactions.some((i: any) => i.event_type === 'measurement_request');
                const offerAccepted = interactions.some((i: any) => i.event_type === 'offer_accept');
                const messageSent = interactions.some((i: any) => i.event_type === 'message_sent');
                const lastMessage = interactions.find((i: any) => i.event_type === 'message_sent');

                viewMap[lead.id] = {
                    viewed: latest ? (latest.view_count || 0) > 0 : false,
                    viewCount: latest?.view_count || 0,
                    lastViewedAt: latest?.last_viewed_at,
                    measurementRequested,
                    offerAccepted,
                    messageSent,
                    messageText: lastMessage?.event_data?.message || lastMessage?.event_data?.text || undefined,
                    interactionCount: interactions.length + ((latest?.view_count || 0) > 0 ? 1 : 0)
                };
            }
            setOfferViewMap(viewMap);
        };
        fetchOfferViews();
    }, [leads]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        let newStatus: LeadStatus | undefined;

        // Check if dropped directly on a column container
        if (COLUMNS.find(c => c.id === overId)) {
            newStatus = overId as LeadStatus;
        } else {
            // Dropped on another card? Find that card's status
            const overLead = leads.find(l => l.id === overId);
            if (overLead) {
                newStatus = overLead.status;
            }
        }

        if (newStatus) {
            const lead = leads.find(l => l.id === activeId);
            if (lead && lead.status !== newStatus) {

                // Special handling for 'won' status -> Open WonLeadModal
                if (newStatus === 'won') {
                    setPendingWonLeadId(activeId);
                    setWonModalOpen(true);
                    return;
                }

                // Special handling for 'lost' status -> Open Modal
                if (newStatus === 'lost') {
                    setPendingLostLeadId(activeId);
                    setLostModalOpen(true);
                    return; // Stop default Update, wait for modal confirm
                }

                await updateLeadStatus(activeId, newStatus);
            }
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus, extraUpdates: Partial<Lead> = {}) => {
        const lead = leads.find(l => l.id === leadId);
        const updates: Partial<Lead> = { status, ...extraUpdates };

        // Auto-assign only if lead has NO current owner and going to non-'new' status
        if (currentUser && status !== 'new' && !lead?.assignedTo) {
            updates.assignedTo = currentUser.id;
            toast.success('Przejąłeś opiekę nad tym leadem');
        } else if (lead?.assignedTo) {
        }

        try {
            await DatabaseService.updateLead(leadId, updates);
            onLeadUpdate();
            // Find custom Polish title manually if needed, or just standard toast
            const statusTitle = COLUMNS.find(c => c.id === status)?.title;
            if (status !== 'lost') {
                toast.success(`Status zmieniony na ${statusTitle}`);
            }
        } catch (error) {
            console.error('Failed to update lead status:', error);
            toast.error('Błąd aktualizacji statusu');
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tego leada? Ta operacja jest nieodwracalna.')) return;

        try {
            await DatabaseService.deleteLead(leadId);
            toast.success('Lead usunięty');
            onLeadUpdate();
        } catch (error: any) {
            console.error('Error deleting lead:', error);
            toast.error(error.message || 'Błąd usuwania leada');
        }
    };

    const handleLostConfirm = async (reason: string, notes: string) => {
        if (!pendingLostLeadId) return;

        const updateData: any = {
            lostReason: reason,
            lostBy: currentUser?.id || null,
            lostAt: new Date(),
            notes: notes ? (leads.find(l => l.id === pendingLostLeadId)?.notes + '\n\n[Utrata]: ' + notes) : undefined
        };

        await updateLeadStatus(pendingLostLeadId, 'lost', updateData);

        toast.success('Oznaczono jako utracone');
        setPendingLostLeadId(null);
    };

    const handleWonConfirm = async (reason: string, value: string, notes: string) => {
        if (!pendingWonLeadId) return;

        const updateData: any = {
            wonReason: reason,
            wonValue: value ? parseFloat(value) : undefined,
            wonAt: new Date(),
            notes: notes ? ((leads.find(l => l.id === pendingWonLeadId)?.notes || '') + '\n\n[Wygrana]: ' + notes) : undefined
        };

        await updateLeadStatus(pendingWonLeadId, 'won', updateData);

        toast.success('🏆 Gratulacje! Lead wygrany!');
        setPendingWonLeadId(null);
    };

    const handleSaveMeasurement = async (data: Partial<Measurement>) => {
        if (!measurementLead || !currentUser) return;
        try {
            await DatabaseService.createMeasurement({
                scheduledDate: data.scheduledDate!,
                salesRepId: measurementLead.assignedTo || currentUser.id, // Use assignee or current user
                customerName: data.customerName!,
                customerAddress: data.customerAddress!,
                customerPhone: data.customerPhone,
                leadId: measurementLead.id,
                notes: data.notes,
                estimatedDuration: data.estimatedDuration,
                locationLat: data.locationLat,
                locationLng: data.locationLng
            });
            toast.success('Pomiar umówiony!');
            setMeasurementLead(null);
        } catch (error) {
            console.error('Error creating measurement:', error);
            toast.error('Błąd umawiania pomiaru');
        }
    };

    // === MINI-DASHBOARD ===
    const pipelineStats = useMemo(() => {
        // New leads = early funnel only
        const newLeads = leads.filter(l => ['new', 'formularz', 'contacted'].includes(l.status));
        // Advanced = past the contact stage
        const advancedLeads = leads.filter(l => ['offer_sent', 'measurement_scheduled', 'measurement_completed', 'negotiation'].includes(l.status));
        const wonLeads = leads.filter(l => l.status === 'won');
        const lostLeads = leads.filter(l => l.status === 'lost');

        // Win Rate: won / (won + lost) — only closed deals
        const totalClosed = wonLeads.length + lostLeads.length;
        const winRate = totalClosed > 0 ? Math.round((wonLeads.length / totalClosed) * 100) : 0;

        // Offer conversion: leads that got at least to offer_sent / total non-fair leads
        const allReal = leads.filter(l => l.status !== 'fair');
        const pastOffer = leads.filter(l => ['offer_sent', 'negotiation', 'measurement_scheduled', 'measurement_completed', 'won', 'lost'].includes(l.status));
        const offerRate = allReal.length > 0 ? Math.round((pastOffer.length / allReal.length) * 100) : 0;

        // Average pipeline time for won leads
        let avgDays = 0;
        if (wonLeads.length > 0) {
            const totalDays = wonLeads.reduce((sum, l) => {
                const endDate = l.wonAt ? new Date(l.wonAt) : new Date(l.updatedAt);
                return sum + differenceInDays(endDate, new Date(l.createdAt));
            }, 0);
            avgDays = Math.round(totalDays / wonLeads.length);
        }

        // Total won value this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthWonValue = wonLeads
            .filter(l => new Date(l.wonAt || l.updatedAt) >= monthStart)
            .reduce((sum, l) => sum + ((l as any).wonValue || 0), 0);

        return {
            newCount: newLeads.length,
            advancedCount: advancedLeads.length,
            wonCount: wonLeads.length,
            winRate,
            offerRate,
            avgDays,
            monthWonValue
        };
    }, [leads]);

    return (
        <>
            {/* Pipeline Mini-Dashboard */}
            <div className="mb-4 px-2">
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur border border-blue-200 rounded-lg px-3 py-2">
                        <span className="text-lg">📥</span>
                        <div>
                            <div className="text-[10px] text-blue-500 font-medium">Nowe leady</div>
                            <div className="text-sm font-bold text-blue-700">{pipelineStats.newCount}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur border border-amber-200 rounded-lg px-3 py-2">
                        <span className="text-lg">🔥</span>
                        <div>
                            <div className="text-[10px] text-amber-600 font-medium">W procesie</div>
                            <div className="text-sm font-bold text-amber-700">{pipelineStats.advancedCount}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 rounded-lg px-3 py-2">
                        <span className="text-lg">🎯</span>
                        <div>
                            <div className="text-[10px] text-slate-500 font-medium">Oferta %</div>
                            <div className="text-sm font-bold text-slate-800">{pipelineStats.offerRate}%</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur border border-emerald-200 rounded-lg px-3 py-2">
                        <span className="text-lg">🏆</span>
                        <div>
                            <div className="text-[10px] text-emerald-600 font-medium">Win Rate</div>
                            <div className="text-sm font-bold text-emerald-700">{pipelineStats.winRate}%</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 rounded-lg px-3 py-2">
                        <span className="text-lg">⏱️</span>
                        <div>
                            <div className="text-[10px] text-slate-500 font-medium">Śr. pipeline</div>
                            <div className="text-sm font-bold text-slate-800">{pipelineStats.avgDays}d</div>
                        </div>
                    </div>
                    {pipelineStats.monthWonValue > 0 && (
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur border border-emerald-200 rounded-lg px-3 py-2">
                            <span className="text-lg">💰</span>
                            <div>
                                <div className="text-[10px] text-emerald-600 font-medium">Wygrane (mies.)</div>
                                <div className="text-sm font-bold text-emerald-700">€{pipelineStats.monthWonValue.toLocaleString()}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full overflow-x-auto pb-4 gap-4 px-2">
                    {COLUMNS.map(column => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            leads={columns[column.id]}
                            onNavigate={(id) => navigate(`/leads/${id}`)}
                            onUpdate={onLeadUpdate}
                            onSchedule={setMeasurementLead}
                            onDelete={handleDeleteLead}
                            isAdmin={isAdmin()}
                            completedFormLeadIds={completedFormLeadIds}
                            offerViewMap={offerViewMap}
                            onBulkEmail={column.id === 'new' ? () => setBulkEmailOpen(true) : undefined}
                            onAutoAssign={['new', 'formularz', 'contacted'].includes(column.id) ? async () => {
                                const toastId = toast.loading('🤖 Przydzielam leady...');
                                try {
                                    const result = await LeadAutoAssignService.autoAssignUnassignedLeads();
                                    toast.dismiss(toastId);
                                    if (result.assigned > 0) {
                                        toast.success(`✅ Przydzielono ${result.assigned} leadów automatycznie`);
                                    } else {
                                        toast.success('Wszystkie leady mają już opiekuna');
                                    }
                                    onLeadUpdate();
                                } catch {
                                    toast.dismiss(toastId);
                                    toast.error('Błąd automatycznego przydzielania');
                                }
                            } : undefined}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        (() => {
                            const lead = leads.find(l => l.id === activeId);
                            return lead ? (
                                <div className="opacity-90 rotate-3 cursor-grabbing transform scale-105">
                                    <KanbanCard
                                        lead={lead}
                                        onClick={() => { }}
                                        onUpdate={() => { }}
                                        onSchedule={() => { }}
                                        onDelete={() => { }}
                                        isAdmin={false}
                                        formCompleted={false}
                                    />
                                </div>
                            ) : null;
                        })()
                    ) : null}
                </DragOverlay>
            </DndContext>

            <LostLeadModal
                isOpen={lostModalOpen}
                onClose={() => { setLostModalOpen(false); setPendingLostLeadId(null); }}
                onConfirm={handleLostConfirm}
            />

            <WonLeadModal
                isOpen={wonModalOpen}
                onClose={() => { setWonModalOpen(false); setPendingWonLeadId(null); }}
                onConfirm={handleWonConfirm}
            />

            {measurementLead && (
                <MeasurementModal
                    measurement={null}
                    initialData={{
                        leadId: measurementLead.id,
                        customerName: `${measurementLead.customerData.firstName} ${measurementLead.customerData.lastName}`,
                        customerAddress: `${measurementLead.customerData.address}, ${measurementLead.customerData.postalCode} ${measurementLead.customerData.city}`,
                        customerPhone: undefined, // Phone not directly in flat structure? check customerData
                        notes: `Lead: ${measurementLead.source}` + (measurementLead.notes ? `\n\n${measurementLead.notes}` : '')
                    }}
                    onSave={handleSaveMeasurement}
                    onClose={() => setMeasurementLead(null)}
                />
            )}

            <BulkWelcomeEmailModal
                isOpen={bulkEmailOpen}
                onClose={() => setBulkEmailOpen(false)}
                onComplete={onLeadUpdate}
                leads={columns['new'] || []}
            />
        </>
    );
};
