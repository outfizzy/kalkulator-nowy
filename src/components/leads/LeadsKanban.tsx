import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Sparkles, ClipboardCheck, Phone, Mail, CalendarDays, CheckCircle2,
    MessageCircle, Trophy, XCircle, Building2, Check, CalendarPlus,
    Trash2, AlertTriangle, MapPin, Package, Info, User, Flame, Moon,
    MoreHorizontal, Zap, Star, RefreshCw, Euro, Eye, EyeOff, FileText,
    Inbox, TrendingUp, Target, Timer, Wallet, Send, Hourglass,
    Ruler, Palette, Wrench, MessageSquare, Users
} from 'lucide-react';
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
import { OfferService } from '../../services/database/offer.service';
import { supabase } from '../../lib/supabase';
import { BulkWelcomeEmailModal } from './BulkWelcomeEmailModal';
import { AutoAssignModal } from './AutoAssignModal';

interface LeadsKanbanProps {
    leads: Lead[];
    onLeadUpdate: () => void;
}

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
    { id: 'new', title: 'Nowe', color: 'bg-blue-50 border-blue-100 text-blue-700' },
    { id: 'formularz_sent', title: 'Formularz wysłany', color: 'bg-sky-50 border-sky-100 text-sky-700' },
    { id: 'formularz', title: 'Formularz wypełniony', color: 'bg-teal-50 border-teal-100 text-teal-700' },
    { id: 'contacted', title: 'Skontaktowano', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
    { id: 'offer_sent', title: 'Wysłano Ofertę', color: 'bg-yellow-50 border-yellow-100 text-yellow-700' },
    { id: 'contact_after_offer', title: 'Kontakt po ofercie', color: 'bg-amber-50 border-amber-100 text-amber-700' },
    { id: 'measurement_scheduled', title: 'Umówiony na pomiar', color: 'bg-cyan-50 border-cyan-100 text-cyan-700' },
    { id: 'measurement_completed', title: 'Pomiar odbył się', color: 'bg-purple-50 border-purple-100 text-purple-700' },
    { id: 'negotiation', title: 'Negocjacje', color: 'bg-orange-50 border-orange-100 text-orange-700' },
    { id: 'won', title: 'Wygrane', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    { id: 'lost', title: 'Utracone', color: 'bg-red-50 border-red-100 text-red-700' },
    { id: 'fair', title: 'Targi (Hub)', color: 'bg-purple-50 border-purple-100 text-purple-700' },
];

const COLUMN_ICONS: Record<LeadStatus, React.ReactNode> = {
    new: <Sparkles className="w-4 h-4" />,
    formularz_sent: <Send className="w-4 h-4" />,
    formularz: <ClipboardCheck className="w-4 h-4" />,
    contacted: <Phone className="w-4 h-4" />,
    offer_sent: <Mail className="w-4 h-4" />,
    contact_after_offer: <MessageSquare className="w-4 h-4" />,
    measurement_scheduled: <CalendarDays className="w-4 h-4" />,
    measurement_completed: <CheckCircle2 className="w-4 h-4" />,
    negotiation: <MessageCircle className="w-4 h-4" />,
    won: <Trophy className="w-4 h-4" />,
    lost: <XCircle className="w-4 h-4" />,
    fair: <Building2 className="w-4 h-4" />,
};


// Stage-specific stale thresholds (days without contact)
const STALE_THRESHOLDS: Record<string, number> = {
    new: 1, formularz_sent: 3, formularz: 2, contacted: 3,
    measurement_scheduled: 2, measurement_completed: 3,
    offer_sent: 5, contact_after_offer: 4, negotiation: 7
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

const KanbanCard = React.memo(({ lead, onClick, onUpdate, onSchedule, onDelete, isAdmin, formCompleted, offerViewInfo, offerValue }: { lead: Lead; onClick: (id: string) => void; onUpdate: () => void; onSchedule: (lead: Lead) => void; onDelete: (id: string) => void; isAdmin: boolean; formCompleted?: boolean; offerViewInfo?: OfferCardInfo; offerValue?: { total: number; count: number; lastNet: number; lastSentAt?: string } }) => {
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
            // For formularz_sent: only update lastContactDate (follow-up), don't change status
            // The lead should stay in formularz_sent until the customer fills the form
            if (lead.status === 'formularz_sent') {
                await DatabaseService.updateLead(lead.id, { lastContactDate: new Date() });
                toast.success('📞 Follow-up — czekamy na formularz');
            } else {
                await DatabaseService.updateLead(lead.id, { status: 'contacted', lastContactDate: new Date() });
                toast.success('📞 Oznaczono jako skontaktowano');
            }
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
            className={`p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative overflow-hidden min-w-0 ${formCompleted
                ? 'bg-emerald-50/50 border border-emerald-200 ring-1 ring-emerald-100'
                : lead.status === 'formularz'
                    ? 'bg-teal-50/30 border border-teal-200'
                    : lead.status === 'won'
                        ? 'bg-amber-50/20 border border-amber-200'
                    : lead.status === 'lost'
                        ? 'bg-white opacity-75 hover:opacity-100 border border-red-200'
                    : isStale
                        ? 'bg-white border border-red-200 ring-1 ring-red-50'
                        : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="pr-6">
                    <h4 className="font-semibold text-slate-900 text-[13px] leading-tight">
                        {lead.customerData.firstName} {lead.customerData.lastName}
                    </h4>
                    {lead.customerData.companyName && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.customerData.companyName}</span>
                        </div>
                    )}
                </div>

                <div className="absolute top-2 right-2 flex gap-1">
                    {lead.status === 'new' && (
                        <button
                            onClick={handleQuickContact}
                            className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title="Oznacz jako skontaktowano"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={handleScheduleClick}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Umów pomiar"
                    >
                        <CalendarPlus className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleDeleteClick}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Usuń Lead"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {isStale && (
                <div className="mb-2 flex items-center gap-1 w-fit bg-red-500 text-white px-2 py-0.5 rounded-md text-[9px] font-bold shadow-sm" title="Brak kontaktu > 3 dni">
                    <AlertTriangle className="w-3 h-3" />
                    ZALEGŁY
                </div>
            )}

            <div className="text-[11px] text-slate-500 space-y-0.5 mb-2.5">
                {(lead.customerData.address || (lead.customerData as any).street) && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.customerData.address || (lead.customerData as any).street}</span>
                    </div>
                )}
                {(lead.customerData.city || lead.customerData.postalCode) && (
                    <div className="flex items-center gap-1.5 pl-[18px]">
                        <span className="text-slate-400 font-mono text-[10px]">{lead.customerData.postalCode}</span>
                        <span>{lead.customerData.city}</span>
                    </div>
                )}
            </div>

            {/* Notes / Configuration Preview — compact card snippet */}
            {lead.notes && (() => {
                const raw = lead.notes;
                // Extract key lines from zadaszto.pl configurator notes
                const modelMatch = raw.match(/Model:\s*(.+)/i);
                const wymiarMatch = raw.match(/Wymiary:\s*(.+)/i);
                const kolorMatch = raw.match(/Kolor:\s*(.+)/i);
                const montazMatch = raw.match(/Monta[żz]:\s*(.+)/i);
                const hasCfg = modelMatch || wymiarMatch;
                // For quick contact, show first non-tag line
                const isQuickContact = raw.includes('[Szybki kontakt]');
                const isConfig = raw.includes('[Konfiguracja');

                if (hasCfg || isQuickContact || isConfig) {
                    return (
                        <div className="mb-2 px-2.5 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-800 space-y-0.5">
                            {modelMatch && (
                                <div className="font-bold truncate flex items-center gap-1">
                                    <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                                    {modelMatch[1].trim()}
                                </div>
                            )}
                            {wymiarMatch && (
                                <div className="text-indigo-600 truncate pl-4 flex items-center gap-1"><Ruler className="w-3 h-3 shrink-0" /> {wymiarMatch[1].trim()}</div>
                            )}
                            {kolorMatch && (
                                <div className="text-indigo-600 truncate pl-4 flex items-center gap-1"><Palette className="w-3 h-3 shrink-0" /> {kolorMatch[1].trim()}</div>
                            )}
                            {montazMatch && (
                                <div className="text-indigo-600 truncate pl-4 flex items-center gap-1"><Wrench className="w-3 h-3 shrink-0" /> {montazMatch[1].trim()}</div>
                            )}
                            {!hasCfg && isQuickContact && (
                                <div className="text-indigo-600 truncate italic flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3 shrink-0" /> {raw.replace('[Szybki kontakt] ', '').substring(0, 80)}{raw.length > 80 ? '…' : ''}
                                </div>
                            )}
                        </div>
                    );
                }
                return null;
            })()}

            {/* Lost Reason — visible directly on card */}
            {lead.status === 'lost' && (lead.lostReason || lead.lostByName || lead.lostAt) && (
                <div className="mb-2 px-2.5 py-2 rounded-lg bg-red-50 border border-red-100">
                    {lead.lostReason && (
                        <div className="flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700 font-medium leading-relaxed">{lead.lostReason}</p>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-red-400">
                        {lead.lostByName && (
                            <span className="flex items-center gap-0.5 font-semibold">
                                <User className="w-2.5 h-2.5" />
                                {lead.lostByName}
                            </span>
                        )}
                        {lead.lostAt && (
                            <span>{new Date(lead.lostAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        )}
                    </div>
                </div>
            )}

            {/* AI Score + Priority Stars */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
                {lead.aiScore !== undefined ? (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border ${lead.aiScore > 70 ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200' : lead.aiScore < 30 ? 'bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`} title={lead.aiSummary}>
                        {lead.aiScore > 70 ? (
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                        ) : lead.aiScore < 30 ? (
                            <Moon className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
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
                        <Zap className="w-3 h-3" />
                        AI OCENA
                    </button>
                )}
                {(() => {
                    const stars = getLeadPriority(lead, formCompleted);
                    return stars > 0 ? (
                        <span className="flex items-center gap-px" title={`Priorytet: ${stars}/5`}>
                            {Array.from({ length: stars }, (_, i) => (
                                <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                            ))}
                        </span>
                    ) : null;
                })()}
            </div>

            {/* Formularz Completion Badge — visible on ALL statuses */}
            {formCompleted && lead.status !== 'formularz' && (
                <div className="mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    <span>Formularz wypełniony</span>
                </div>
            )}
            {lead.status === 'formularz' && (
                <div className={`mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold ${formCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-teal-100 text-teal-700 border border-teal-200'
                    }`}>
                    {formCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                        <RefreshCw className="w-4 h-4 text-teal-500 animate-spin" style={{animationDuration: '3s'}} />
                    )}
                    <span>{formCompleted ? 'Formularz wypełniony!' : 'Czeka na formularz...'}</span>
                </div>
            )}

            {/* Offer value badge — for leads in offer_sent/contact_after_offer/negotiation */}
            {['offer_sent', 'contact_after_offer', 'negotiation'].includes(lead.status) && (offerValue || (lead as any).wonValue) && (() => {
                const val = offerValue?.lastNet || offerValue?.total || (lead as any).wonValue || 0;
                const count = offerValue?.count || 0;
                if (val <= 0) return null;
                return (
                    <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <Euro className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-emerald-700">€{val.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        {count > 1 && <span className="text-[9px] text-emerald-500">(ost. z {count})</span>}
                        {count === 0 && <span className="text-[9px] text-emerald-400">(ręczna)</span>}
                    </div>
                );
            })()}

            {/* Offer sent date tile */}
            {offerValue?.lastSentAt && (
                <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                    <Send className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-indigo-600">Oferta wysłana: {new Date(offerValue.lastSentAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                </div>
            )}

            <div className="pt-2 mt-1 border-t border-slate-100/80 flex items-center justify-between text-xs min-w-0 gap-2">
                <div className="flex items-center gap-2">
                    {lead.assignee ? (
                        <>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                {lead.assignee.firstName[0]}{lead.assignee.lastName[0]}
                            </div>
                            <span className="text-slate-600 font-medium truncate max-w-[90px] text-[11px]">
                                {lead.assignee.firstName} {lead.assignee.lastName[0]}.
                            </span>
                            {(lead.additionalAssigneesProfiles?.length || 0) > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full" title={(lead.additionalAssigneesProfiles || []).map(p => `${p.firstName} ${p.lastName}`).join(', ')}>+{lead.additionalAssigneesProfiles!.length}</span>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                                <User className="w-3 h-3 text-slate-400" />
                            </div>
                            <span className="text-[11px] italic">Nieprzydzielony</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {/* SLA Timer Badge — inline next to date */}
                    {sla.label && (
                        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                            sla.level === 'green' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            sla.level === 'yellow' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            sla.level === 'red' ? 'bg-red-50 text-red-600 border border-red-200' :
                            'bg-red-100 text-red-700 border border-red-300'
                        } ${sla.pulse ? 'animate-pulse' : ''}`} title={`Czas od utworzenia leada: ${sla.label}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${sla.level === 'green' ? 'bg-emerald-500' : sla.level === 'yellow' ? 'bg-amber-500' : sla.level === 'red' ? 'bg-red-500' : 'bg-red-700'}`} />
                            {sla.label}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
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
                                <Eye className="w-3 h-3" />
                                Otwarta {offerViewInfo?.viewCount ? `${offerViewInfo.viewCount}×` : lead.customerData?.offerViewCount ? `${lead.customerData.offerViewCount}×` : ''}
                            </span>
                        )}
                        {(offerViewInfo?.offerAccepted || lead.customerData?.offerAcceptedAt) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold animate-pulse">
                                <CheckCircle2 className="w-3 h-3" />
                                Zaakceptowana!
                            </span>
                        )}
                        {(offerViewInfo?.measurementRequested || lead.customerData?.measurementRequestedAt) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded text-[9px] font-bold">
                                <Ruler className="w-3 h-3" />
                                Pomiar proszony
                            </span>
                        )}
                        {offerViewInfo?.messageSent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold"
                                title={offerViewInfo.messageText || ''}
                            >
                                <MessageCircle className="w-3 h-3" />
                                Wiadomość
                            </span>
                        )}
                    </div>
                );
            })()}

            {/* One-Click Pipeline Actions — stage-specific */}
            {!['won', 'lost', 'fair'].includes(lead.status) && (
                <div className="mt-2 pt-2 border-t border-slate-100/80 flex flex-wrap gap-1.5">
                    {/* Early stages: Dzwonię + Mail + Pomiar */}
                    {['new', 'formularz_sent', 'formularz', 'contacted'].includes(lead.status) && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (lead.customerData?.phone) {
                                        window.dispatchEvent(new CustomEvent('softphone-dial', { detail: { number: normalizePhone(lead.customerData.phone), name: `${lead.customerData.firstName || ''} ${lead.customerData.lastName || ''}`.trim(), leadId: lead.id } }));
                                    }
                                    handleQuickContact(e as any);
                                }}
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                title={lead.customerData?.phone || 'Brak numeru'}
                            >
                                <Phone className="w-3 h-3" />
                                Dzwonię
                            </button>
                            <button
                                onClick={handleQuickEmail}
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all hover:shadow-sm"
                                title="Wysłałem mail"
                            >
                                <Mail className="w-3 h-3" />
                                Mail
                            </button>
                            <button
                                onClick={handleScheduleClick}
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold border border-violet-200 transition-all hover:shadow-sm"
                                title="Umów pomiar"
                            >
                                <CalendarPlus className="w-3 h-3" />
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
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                title={lead.customerData?.phone || 'Brak numeru'}
                            >
                                <Phone className="w-3 h-3" />
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
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 transition-all hover:shadow-sm"
                            >
                                <FileText className="w-3 h-3" />
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
                                        <><Eye className="w-3 h-3 inline" /> Otwarta {offerViewInfo.viewCount}×</>
                                    ) : (
                                        <><EyeOff className="w-3 h-3 inline" /> Nieotwarta</>
                                    )}
                                </div>
                            )}
                            {lead.customerData?.phone && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('softphone-dial', { detail: { number: normalizePhone(lead.customerData!.phone), name: `${lead.customerData!.firstName || ''} ${lead.customerData!.lastName || ''}`.trim(), leadId: lead.id } }));
                                    }}
                                    className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                >
                                    <Phone className="w-3 h-3" />
                                    Zadzwoń
                                </button>
                            )}
                            <button
                                onClick={handleQuickEmail}
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all hover:shadow-sm"
                            >
                                <Mail className="w-3 h-3" />
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
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all hover:shadow-sm"
                                title={lead.customerData?.phone || 'Brak numeru'}
                            >
                                <Phone className="w-3 h-3" />
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
                                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 transition-all hover:shadow-sm"
                            >
                                <FileText className="w-3 h-3" />
                                Oferta
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

// Extracted Column Component with useDroppable
interface KanbanColumnProps {
    column: typeof COLUMNS[0];
    leads: Lead[];
    onNavigate: (id: string) => void;
    onUpdate: () => void;
    onSchedule: (lead: Lead) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
    completedFormLeadIds: Set<string>;
    onAutoAssign?: () => void;
    onBulkEmail?: () => void;
    offerViewMap: Record<string, OfferCardInfo>;
    leadOfferValues: Record<string, { total: number; count: number; lastNet: number; lastSentAt?: string }>;
}

const INITIAL_VISIBLE = 15;
const LOAD_MORE_STEP = 15;

const KanbanColumn = React.memo(({ column, leads, onNavigate, onUpdate, onSchedule, onDelete, isAdmin, completedFormLeadIds, onAutoAssign, onBulkEmail, offerViewMap, leadOfferValues }: KanbanColumnProps) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

    // Reset visible count when leads change (e.g. filter applied)
    useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [leads.length]);

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

    const visibleLeads = useMemo(() => sortedLeads.slice(0, visibleCount), [sortedLeads, visibleCount]);
    const hasMore = sortedLeads.length > visibleCount;
    const remainingCount = sortedLeads.length - visibleCount;

    return (
        <div ref={setNodeRef} className="flex-shrink-0 w-[260px] sm:w-[280px] flex flex-col h-full rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            {/* Column Header */}
            <div className={`px-3.5 py-3 border-b border-slate-200/50 rounded-t-2xl bg-white/60 backdrop-blur-sm`}>
                <div className="flex justify-between items-center">
                    <h3 className={`font-semibold text-sm flex items-center gap-1.5 ${column.color.split(' ')[2]}`}>
                        {COLUMN_ICONS[column.id]}
                        {column.title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {/* Pipeline value for offer stages */}
                        {['offer_sent', 'contact_after_offer', 'negotiation'].includes(column.id) && (() => {
                            const totalVal = leads.reduce((sum, l) => {
                                const val = leadOfferValues[l.id]?.lastNet || (l as any).wonValue || 0;
                                return sum + val;
                            }, 0);
                            return totalVal > 0 ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200" title={`Łączna wartość ofert: €${totalVal.toLocaleString()}`}>
                                    €{totalVal >= 1000 ? `${(totalVal / 1000).toFixed(0)}k` : totalVal.toLocaleString()}
                                </span>
                            ) : null;
                        })()}
                        {/* Completed forms count badge — Formularz column only */}
                        {column.id === 'formularz' && completedFormLeadIds.size > 0 && (() => {
                            const completedCount = leads.filter(l => completedFormLeadIds.has(l.id)).length;
                            return completedCount > 0 ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse border border-emerald-200" title={`${completedCount} formularzy wypełnionych!`}>
                                    <CheckCircle2 className="w-3 h-3 inline" /> {completedCount}
                                </span>
                            ) : null;
                        })()}
                        {unassignedCount > 0 && ['new', 'formularz', 'contacted'].includes(column.id) && (
                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold" title={`${unassignedCount} bez opiekuna`}>
                                {unassignedCount} <AlertTriangle className="w-3 h-3 inline" />
                            </span>
                        )}
                        <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-200">
                            {leads.length}
                        </span>
                    </div>
                </div>
                {/* Auto-assign button */}
                {isAdmin && unassignedCount > 0 && ['new', 'formularz', 'contacted'].includes(column.id) && onAutoAssign && (
                    <button
                        onClick={onAutoAssign}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 transition-colors"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Przydziel automatycznie ({unassignedCount})
                    </button>
                )}
                {/* Bulk welcome email button — only for 'new' column */}
                {column.id === 'new' && leads.length > 0 && onBulkEmail && (
                    <button
                        onClick={onBulkEmail}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all hover:shadow-sm"
                    >
                        <Send className="w-3.5 h-3.5" />
                        Wyślij powitalne ({leads.length})
                    </button>
                )}
            </div>

            {/* Column Content */}
            <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[100px]">
                <SortableContext
                    id={column.id}
                    items={visibleLeads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2 min-h-[50px]">
                        {visibleLeads.map((lead, idx) => {
                            const isCompleted = completedFormLeadIds.has(lead.id);
                            const prevCompleted = idx > 0 ? completedFormLeadIds.has(visibleLeads[idx - 1].id) : false;
                            const showSeparator = column.id === 'formularz' && !isCompleted && (idx === 0 || prevCompleted);
                            
                            return (
                                <React.Fragment key={lead.id}>
                                    {showSeparator && completedFormLeadIds.size > 0 && (
                                        <div className="flex items-center gap-2 py-1.5 px-1">
                                            <div className="h-px flex-1 bg-slate-200" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                                <Hourglass className="w-3 h-3 inline mr-0.5" /> Czekają ({sortedLeads.length - idx})
                                            </span>
                                            <div className="h-px flex-1 bg-slate-200" />
                                        </div>
                                    )}
                                    <KanbanCard
                                        lead={lead}
                                        onClick={onNavigate}
                                        onUpdate={onUpdate}
                                        onSchedule={onSchedule}
                                        onDelete={onDelete}
                                        isAdmin={isAdmin}
                                        formCompleted={isCompleted}
                                        offerViewInfo={offerViewMap[lead.id]}
                                        offerValue={leadOfferValues[lead.id]}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </div>
                </SortableContext>
                {hasMore && (
                    <button
                        onClick={() => setVisibleCount(prev => prev + LOAD_MORE_STEP)}
                        className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:text-accent bg-white/80 hover:bg-accent/5 rounded-lg border border-dashed border-slate-300 hover:border-accent/40 transition-all flex items-center justify-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        Załaduj dalej ({remainingCount})
                    </button>
                )}
                {!hasMore && sortedLeads.length > INITIAL_VISIBLE && (
                    <button
                        onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                        className="w-full mt-1.5 py-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        Zwiń
                    </button>
                )}
            </div>
        </div>
    );
});

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({ leads, onLeadUpdate }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeId, setActiveId] = useState<string | null>(null);

    // Modal State
    const [wonModalOpen, setWonModalOpen] = useState(false);
    const [pendingWonLeadId, setPendingWonLeadId] = useState<string | null>(null);
    const [lostModalOpen, setLostModalOpen] = useState(false);
    const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
    const [autoAssignOpen, setAutoAssignOpen] = useState(false);
    const [autoAssignLeads, setAutoAssignLeads] = useState<Lead[]>([]);
    const [pendingLostLeadId, setPendingLostLeadId] = useState<string | null>(null);
    const [measurementLead, setMeasurementLead] = useState<Lead | null>(null);

    // Offer Value modal (for manual entry when moving to offer_sent+)
    const [offerValueModalOpen, setOfferValueModalOpen] = useState(false);
    const [pendingOfferValueLeadId, setPendingOfferValueLeadId] = useState<string | null>(null);
    const [pendingOfferValueStatus, setPendingOfferValueStatus] = useState<LeadStatus>('offer_sent');
    const [offerValueInput, setOfferValueInput] = useState('');

    // Cache of lead -> total offer values from system
    const [leadOfferValues, setLeadOfferValues] = useState<Record<string, { total: number; count: number; lastNet: number; lastSentAt?: string }>>({});
    useEffect(() => {
        const relevantLeads = leads.filter(l => ['offer_sent', 'contact_after_offer', 'negotiation', 'measurement_scheduled', 'measurement_completed'].includes(l.status));
        if (relevantLeads.length === 0) return;
        const fetchValues = async () => {
            const ids = relevantLeads.map(l => l.id);
            const { data } = await supabase
                .from('offers')
                .select('lead_id, pricing, created_at')
                .in('lead_id', ids)
                .order('created_at', { ascending: false });
            if (!data) return;
            const map: Record<string, { total: number; count: number; lastNet: number; lastSentAt?: string }> = {};
            for (const o of data) {
                const net = (o.pricing as any)?.sellingPriceNet || 0;
                if (!map[o.lead_id]) {
                    // First result = latest offer (ordered by created_at desc)
                    map[o.lead_id] = { total: net, count: 1, lastNet: net, lastSentAt: o.created_at };
                } else {
                    // Only count, don't add to total — we show last offer only
                    map[o.lead_id].count += 1;
                }
            }
            // Also include wonValue from leads that have it manually set
            for (const l of relevantLeads) {
                if ((l as any).wonValue && !map[l.id]) {
                    map[l.id] = { total: (l as any).wonValue, count: 0, lastNet: (l as any).wonValue };
                }
            }
            setLeadOfferValues(map);
        };
        fetchValues();
    }, [leads]);

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
            formularz_sent: [],
            formularz: [],
            measurement_scheduled: [],
            measurement_completed: [],
            offer_sent: [],
            contact_after_offer: [],
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
    // HYBRID: instant zero-query from customerData + background DB fallback for missed syncs
    const instantFormIds = useMemo(() => {
        const completed = new Set<string>();
        for (const lead of leads) {
            if ((lead.customerData as any)?.configurationCompletedAt) {
                completed.add(lead.id);
            }
        }
        return completed;
    }, [leads]);

    const [dbFormIds, setDbFormIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        // Check both formularz AND formularz_sent leads for completed forms
        const formLeads = leads.filter(l =>
            (l.status === 'formularz' || l.status === 'formularz_sent') &&
            !instantFormIds.has(l.id)
        );
        if (formLeads.length === 0) return;

        const checkMissedSyncs = async () => {
            const leadIds = formLeads.map(l => l.id);
            const { data } = await supabase
                .from('lead_configurations')
                .select('lead_id')
                .in('lead_id', leadIds)
                .eq('status', 'completed');

            if (data && data.length > 0) {
                setDbFormIds(new Set(data.map((r: any) => r.lead_id).filter(Boolean)));
            }
        };
        checkMissedSyncs();
    }, [leads, instantFormIds]);

    const completedFormLeadIds = useMemo(() => {
        const merged = new Set(instantFormIds);
        dbFormIds.forEach(id => merged.add(id));
        return merged;
    }, [instantFormIds, dbFormIds]);

    // AUTO-MOVE: leads in 'formularz_sent' with completed form → move to 'formularz'
    // REVERSE: leads in 'formularz' without completed form → move back to 'formularz_sent'
    const autoMoveRunningRef = useRef(false);
    useEffect(() => {
        if (autoMoveRunningRef.current) return; // Prevent concurrent runs

        // Forward: formularz_sent → formularz (form completed)
        const forwardIds = leads
            .filter(l => l.status === 'formularz_sent' && completedFormLeadIds.has(l.id))
            .map(l => l.id);

        // Reverse: formularz → formularz_sent (form NOT completed)
        const backIds = leads
            .filter(l => l.status === 'formularz' && !completedFormLeadIds.has(l.id))
            .map(l => l.id);

        if (forwardIds.length === 0 && backIds.length === 0) return;

        autoMoveRunningRef.current = true;

        const bulkMove = async () => {
            let changed = false;

            // Bulk forward move: formularz_sent → formularz
            if (forwardIds.length > 0) {
                console.log(`[AutoMove] Moving ${forwardIds.length} leads: formularz_sent → formularz`);
                const { error } = await supabase
                    .from('leads')
                    .update({ status: 'formularz', updated_at: new Date().toISOString() })
                    .in('id', forwardIds);

                if (error) {
                    console.error('[AutoMove] Bulk forward failed:', error);
                } else {
                    toast.success(`📋 ${forwardIds.length} lead${forwardIds.length > 1 ? 'ów' : ''} przeniesion${forwardIds.length > 1 ? 'ych' : 'y'} do "Formularz wypełniony"`);
                    changed = true;
                }
            }

            // Bulk reverse move: formularz → formularz_sent
            if (backIds.length > 0) {
                console.log(`[AutoMove] Moving ${backIds.length} leads: formularz → formularz_sent`);
                const { error } = await supabase
                    .from('leads')
                    .update({ status: 'formularz_sent', updated_at: new Date().toISOString() })
                    .in('id', backIds);

                if (error) {
                    console.error('[AutoMove] Bulk reverse failed:', error);
                } else {
                    toast.success(`📤 ${backIds.length} lead${backIds.length > 1 ? 'ów' : ''} cofnięt${backIds.length > 1 ? 'ych' : 'y'} do "Formularz wysłany"`);
                    changed = true;
                }
            }

            autoMoveRunningRef.current = false;
            if (changed) {
                onLeadUpdate();
            }
        };
        bulkMove();
    }, [completedFormLeadIds, leads]);

    // Track offer view status + customer interactions for offer_sent/negotiation leads
    const [offerViewMap, setOfferViewMap] = useState<Record<string, OfferCardInfo>>({});
    useEffect(() => {
        const relevantLeads = leads.filter(l => ['offer_sent', 'contact_after_offer', 'negotiation'].includes(l.status));
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

                // Moving to offer_sent or negotiation -> auto-fill offer value or ask
                const offerStages: LeadStatus[] = ['offer_sent', 'contact_after_offer', 'negotiation'];
                if (offerStages.includes(newStatus) && !offerStages.includes(lead.status)) {
                    // Check if lead already has system offers
                    const { data: offers } = await supabase
                        .from('offers')
                        .select('pricing')
                        .eq('lead_id', activeId)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (offers && offers.length > 0) {
                        const lastNet = (offers[0].pricing as any)?.sellingPriceNet || 0;
                        if (lastNet > 0) {
                            // Auto-fill from system offer
                            await updateLeadStatus(activeId, newStatus, { wonValue: lastNet } as any);
                            toast.success(`Kwota oferty: €${lastNet.toLocaleString('de-DE', { minimumFractionDigits: 2 })} (z kalkulatora)`);
                            return;
                        }
                    }

                    // No system offer — ask for manual value
                    setPendingOfferValueLeadId(activeId);
                    setPendingOfferValueStatus(newStatus);
                    setOfferValueInput('');
                    setOfferValueModalOpen(true);
                    return;
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
            notes: notes ? ((leads.find(l => l.id === pendingLostLeadId)?.notes || '') + '\n\n[Utrata]: ' + notes) : undefined
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
        const newLeads = leads.filter(l => ['new', 'formularz_sent', 'formularz', 'contacted'].includes(l.status));
        // Advanced = past the contact stage
        const advancedLeads = leads.filter(l => ['offer_sent', 'contact_after_offer', 'measurement_scheduled', 'measurement_completed', 'negotiation'].includes(l.status));
        const wonLeads = leads.filter(l => l.status === 'won');
        const lostLeads = leads.filter(l => l.status === 'lost');

        // Win Rate: won / (won + lost) — only closed deals
        const totalClosed = wonLeads.length + lostLeads.length;
        const winRate = totalClosed > 0 ? Math.round((wonLeads.length / totalClosed) * 100) : 0;

        // Offer conversion: leads that got at least to offer_sent / total non-fair leads
        const allReal = leads.filter(l => l.status !== 'fair');
        const pastOffer = leads.filter(l => ['offer_sent', 'contact_after_offer', 'negotiation', 'measurement_scheduled', 'measurement_completed', 'won', 'lost'].includes(l.status));
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
            <div className="mb-5 px-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    <div className="relative bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Inbox className="w-[18px] h-[18px] text-blue-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Nowe leady</div>
                        <div className="text-xl font-bold text-slate-800 mt-0.5">{pipelineStats.newCount}</div>
                        <div className="text-[10px] text-blue-500 mt-0.5">oczekujące</div>
                    </div>
                    <div className="relative bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                            <TrendingUp className="w-[18px] h-[18px] text-amber-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">W procesie</div>
                        <div className="text-xl font-bold text-slate-800 mt-0.5">{pipelineStats.advancedCount}</div>
                    </div>
                    <div className="relative bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Target className="w-[18px] h-[18px] text-slate-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Oferta %</div>
                        <div className="text-xl font-bold text-slate-800 mt-0.5">{pipelineStats.offerRate}%</div>
                    </div>
                    <div className="relative bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Trophy className="w-[18px] h-[18px] text-emerald-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Win Rate</div>
                        <div className="text-xl font-bold text-slate-800 mt-0.5">{pipelineStats.winRate}%</div>
                    </div>
                    <div className="relative bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Timer className="w-[18px] h-[18px] text-slate-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Śr. pipeline</div>
                        <div className="text-xl font-bold text-slate-800 mt-0.5">{pipelineStats.avgDays}d</div>
                    </div>
                    {pipelineStats.monthWonValue > 0 && (
                        <div className="relative bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                            <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <Wallet className="w-[18px] h-[18px] text-emerald-500" />
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Wygrane</div>
                            <div className="text-xl font-bold text-emerald-700 mt-0.5">€{pipelineStats.monthWonValue.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">ten miesiąc</div>
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
                <div className="flex h-full overflow-x-auto pb-4 gap-3 sm:gap-4 px-1 sm:px-2 snap-x snap-mandatory">
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
                            leadOfferValues={leadOfferValues}
                            onBulkEmail={column.id === 'new' ? () => setBulkEmailOpen(true) : undefined}
                            onAutoAssign={['new', 'formularz_sent', 'formularz', 'contacted'].includes(column.id) ? () => {
                                const columnLeads = columns[column.id] || [];
                                const unassigned = columnLeads.filter(l => !l.assignedTo);
                                setAutoAssignLeads(unassigned);
                                setAutoAssignOpen(true);
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

            <AutoAssignModal
                isOpen={autoAssignOpen}
                onClose={() => setAutoAssignOpen(false)}
                onComplete={onLeadUpdate}
                unassignedLeads={autoAssignLeads}
            />

            {/* Offer Value Modal — when moving to offer_sent without system offer */}
            {offerValueModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-amber-100">
                            <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                                <Euro className="w-5 h-5" />
                                Kwota oferty netto
                            </h3>
                            <p className="text-sm text-amber-600 mt-1">Brak ofert w systemie — podaj kwotę netto oferty (EUR)</p>
                        </div>
                        <div className="px-6 py-5">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                                <input
                                    type="number"
                                    value={offerValueInput}
                                    onChange={e => setOfferValueInput(e.target.value)}
                                    placeholder="np. 12500"
                                    className="w-full pl-8 pr-4 py-3 border-2 border-amber-200 rounded-xl text-lg font-bold text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && offerValueInput) {
                                            const val = parseFloat(offerValueInput);
                                            if (val > 0 && pendingOfferValueLeadId) {
                                                updateLeadStatus(pendingOfferValueLeadId, pendingOfferValueStatus, { wonValue: val } as any);
                                                toast.success(`Kwota oferty: €${val.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`);
                                                setOfferValueModalOpen(false);
                                                setPendingOfferValueLeadId(null);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    // Allow skip — just move without value
                                    if (pendingOfferValueLeadId) {
                                        updateLeadStatus(pendingOfferValueLeadId, pendingOfferValueStatus);
                                    }
                                    setOfferValueModalOpen(false);
                                    setPendingOfferValueLeadId(null);
                                }}
                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
                            >Pomiń</button>
                            <button
                                onClick={() => {
                                    const val = parseFloat(offerValueInput);
                                    if (val > 0 && pendingOfferValueLeadId) {
                                        updateLeadStatus(pendingOfferValueLeadId, pendingOfferValueStatus, { wonValue: val } as any);
                                        toast.success(`Kwota oferty: €${val.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`);
                                    }
                                    setOfferValueModalOpen(false);
                                    setPendingOfferValueLeadId(null);
                                }}
                                disabled={!offerValueInput || parseFloat(offerValueInput) <= 0}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >Zapisz kwotę</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
