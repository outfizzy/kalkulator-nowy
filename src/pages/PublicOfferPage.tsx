import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OfferService } from '../services/database/offer.service';
import { LeadService } from '../services/database/lead.service';
import type { Offer } from '../types';
import { toast } from 'react-hot-toast';
import { TrustSection } from '../components/public-offer/TrustSection';

import { TimelineSection } from '../components/public-offer/TimelineSection';
import { OfferHero } from '../components/public-offer/OfferHero';
import { OfferSpecification } from '../components/public-offer/OfferSpecification';
import { CreatorProfileSection } from '../components/public-offer/CreatorProfileSection';
import { MeasurementRequestModal } from '../components/public-offer/MeasurementRequestModal';
import { FAQSection } from '../components/public-offer/FAQSection';
import { ModelAdvantagesSection } from '../components/public-offer/ModelAdvantagesSection';
import { UpsellSection } from '../components/public-offer/UpsellSection';
import { AttachmentLightbox } from '../components/public-offer/AttachmentLightbox';
import { getModelDisplayName } from '../config/modelImages';

// Translate internal color keys to German display names
function translateColorForDisplay(color: string): string {
    const map: Record<string, string> = {
        'anthracite': 'Anthrazit (RAL 7016)', 'white': 'Weiß (RAL 9016)',
        'ral7016': 'Anthrazit (RAL 7016)', 'ral9016': 'Weiß (RAL 9016)',
        'ral 7016': 'Anthrazit (RAL 7016)', 'ral 9016': 'Weiß (RAL 9016)',
        'silberr': 'Silber (RAL 9006)', 'sepia': 'Sepiabraun (RAL 8014)',
        'RAL 7016': 'Anthrazit (RAL 7016)', 'RAL 9016': 'Weiß (RAL 9016)',
        'RAL 9006': 'Silber (RAL 9006)', 'RAL 8014': 'Sepiabraun (RAL 8014)',
    };
    return map[color] || map[color?.toLowerCase()] || color;
}

// Types for sibling offers
interface SiblingOffer {
    id: string;
    offerNumber: string;
    product: any;
    pricing: any;
    publicToken: string;
    createdAt: Date;
}

const COMPANY_PHONE = '03561 501 9981';
const COMPANY_PHONE_HREF = '+4935615019981';
const COMPANY_EMAIL = 'buero@polendach24.de';

export const PublicOfferPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [messageSent, setMessageSent] = useState(false);
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
    const [siblingOffers, setSiblingOffers] = useState<SiblingOffer[]>([]);
    const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
    const [accepting, setAccepting] = useState(false);
    // Embedded variants (from single offer)
    const [activeVariantIdx, setActiveVariantIdx] = useState(0);
    const [viewingAttachment, setViewingAttachment] = useState<any>(null);
    const embeddedVariants: any[] = (offer as any)?.variants || (offer as any)?.product?.variants || [];
    const hasEmbeddedVariants = embeddedVariants.length > 0;

    // Creator's client-facing contact info (fallback to company defaults)
    const creatorPhone = offer?.creator?.clientPhone || offer?.creator?.phone || COMPANY_PHONE;
    const creatorPhoneHref = creatorPhone.replace(/\s/g, '').replace(/^0/, '+49');
    const creatorEmail = offer?.creator?.clientEmail || offer?.creator?.email || COMPANY_EMAIL;
    const creatorName = offer?.creator ? `${offer.creator.firstName} ${offer.creator.lastName}` : 'Polendach24';

    // Format phone for display (e.g. "609410745" → "609 410 745", "03561 501 9981" stays)
    const formatPhoneDisplay = (phone: string): string => {
        const clean = phone.replace(/\s/g, '');
        if (clean.startsWith('+49')) {
            const local = clean.slice(3);
            return `+49 ${local.replace(/(\d{3})(\d{3})(\d{3,4})/, '$1 $2 $3')}`;
        }
        if (clean.length >= 9 && !clean.includes(' ')) {
            return clean.replace(/(\d{3})(\d{3})(\d{3,4})/, '$1 $2 $3');
        }
        return phone;
    };
    const creatorPhoneDisplay = formatPhoneDisplay(creatorPhone);

    useEffect(() => {
        const fetchOffer = async () => {
            if (!token) return;
            try {
                const data = await OfferService.getOfferByToken(token);
                setOffer(data);
                // Mark as viewed and notify sales rep
                OfferService.markAsViewed(token).catch(err => console.error('Failed to mark view', err));
                // Track interaction
                if (data?.id) {
                    OfferService.trackInteraction(data.id, 'offer_view').catch(err => console.error('Failed to track view', err));
                    // Notify sales rep (RPC handles 24h dedup)
                    OfferService.notifyOfferAction(token, 'offer_viewed').catch(err => console.error('Failed to notify view', err));
                }
                // Fetch sibling offers for multi-offer comparison
                OfferService.getSiblingOffers(token).then(siblings => {
                    if (siblings.length > 1) {
                        setSiblingOffers(siblings);
                    }
                }).catch(err => console.error('Failed to get siblings', err));
            } catch (error) {
                console.error('Error loading offer:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOffer();
    }, [token]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !newMessage.trim()) return;

        setSending(true);
        try {
            const success = await LeadService.sendClientMessage(token, newMessage);
            if (success) {
                setMessageSent(true);
                setNewMessage('');
                toast.success('Nachricht gesendet!');
                // Notify sales rep
                OfferService.notifyOfferAction(token, 'message_sent', { messagePreview: newMessage.substring(0, 100) }).catch(() => { });
            } else {
                toast.error('Nachricht konnte nicht gesendet werden.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Ein Fehler ist aufgetreten.');
        } finally {
            setSending(false);
        }
    };

    const handleAcceptOffer = async () => {
        if (!token) return;
        setAccepting(true);
        try {
            // This RPC updates offer status, lead status, creates notification for sales rep
            const success = await OfferService.notifyOfferAction(token, 'offer_accepted', {
                offerNumber: offer?.offerNumber,
                timestamp: new Date().toISOString()
            });
            // Also track in offer_interactions directly
            if (offer?.id) {
                OfferService.trackInteraction(offer.id, 'offer_accept', {
                    timestamp: new Date().toISOString()
                }).catch(() => { });
            }
            if (success) {
                setShowAcceptConfirm(true);
            } else {
                // Fallback — still show confirmation but log warning
                console.warn('notify_offer_action returned false');
                setShowAcceptConfirm(true);
            }
        } catch (err) {
            console.error('Failed to process offer acceptance', err);
            setShowAcceptConfirm(true); // Still show confirmation even if backend fails
        } finally {
            setAccepting(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!token) return;
        if (offer?.id) {
            OfferService.trackInteraction(offer.id, 'pdf_download', {
                action: 'pdf_download',
                variant: hasEmbeddedVariants ? activeVariantIdx : undefined,
                timestamp: new Date().toISOString()
            }).catch(err => console.error('Failed to track PDF download', err));
        }
        const variantParam = hasEmbeddedVariants ? `?variant=${activeVariantIdx}` : '';
        window.open(`/print/offer/${token}${variantParam}`, '_blank');
    };

    const handleScheduleMeasurement = () => {
        if (offer?.id) {
            OfferService.trackInteraction(offer.id, 'measurement_request').catch(() => { });
        }
        setIsMeasurementModalOpen(true);
    };

    const handleSwitchOffer = (targetToken: string) => {
        if (targetToken !== token) {
            navigate(`/p/offer/${targetToken}`);
            window.location.reload(); // Reload to fetch new offer data
        }
    };

    // Calculate validity days remaining (30 days from creation)
    const daysRemaining = useMemo(() => {
        if (!offer?.createdAt) return 30;
        const created = new Date(offer.createdAt);
        const expiresAt = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diff = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    }, [offer?.createdAt]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-100 border-t-blue-600"></div>
                </div>
                <p className="mt-6 text-slate-500 font-medium text-sm animate-pulse">Ihr Angebot wird geladen...</p>
            </div>
        );
    }

    if (!offer) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="text-center max-w-md px-8">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Angebot nicht gefunden</h1>
                    <p className="text-slate-500">Der Link ist möglicherweise ungültig oder abgelaufen. Bitte kontaktieren Sie uns.</p>
                    <a href={`tel:${COMPANY_PHONE_HREF}`} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                        {COMPANY_PHONE}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans text-slate-800 pb-28 lg:pb-0">

            {/* ═══════ HEADER ═══════ */}
            <header className="bg-slate-900 shadow-xl sticky top-0 z-40 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src="/polendach-logo.png"
                            alt="Polendach24"
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <a href={`tel:${creatorPhoneHref}`} className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span>{creatorPhoneDisplay}</span>
                        </a>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-semibold border border-white/10"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            PDF
                        </button>
                        <button
                            onClick={handleAcceptOffer}
                            disabled={accepting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-bold shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {accepting ? 'Wird bestätigt...' : 'Angebot annehmen'}
                        </button>
                    </div>

                    {/* Mobile: PDF Icon */}
                    <button className="md:hidden text-white p-2" onClick={handleDownloadPDF}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                </div>
            </header>

            {/* ═══════ EMBEDDED VARIANT SWITCHER — Premium Card Design ═══════ */}
            {hasEmbeddedVariants && (
                <div className="bg-gradient-to-b from-slate-50 via-blue-50/40 to-white border-b border-slate-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 py-5 md:py-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Wählen Sie Ihre Variante</h2>
                                    <p className="text-[11px] text-slate-400">Vergleichen Sie {embeddedVariants.length} Konfigurationen und wählen Sie die beste für Sie</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full hidden sm:inline-block">
                                {embeddedVariants.length} Varianten
                            </span>
                        </div>

                        {/* Variant Cards */}
                        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
                            {embeddedVariants.slice(0, 5).map((variant: any, idx: number) => {
                                const isActive = idx === activeVariantIdx;
                                const price = variant.pricing?.sellingPriceGross || 0;
                                const priceNet = variant.pricing?.sellingPriceNet || 0;
                                const currency = variant.pricing?.currency === 'PLN' ? 'zł' : '€';
                                const itemCount = (variant.items?.length || 0) + (variant.customItems?.length || 0);
                                const colorDotStyle = variant.color ? {
                                    background: variant.color === 'RAL 7016' ? '#383E42' : variant.color === 'RAL 9016' ? '#F1F0EA' : variant.color === 'RAL 9001' ? '#E9E0D2' : variant.color === 'RAL 9006' ? '#A6A9AD' : variant.color === 'DB 703' ? '#695C4F' : '#888'
                                } : null;

                                return (
                                    <button
                                        key={variant.id || idx}
                                        onClick={() => setActiveVariantIdx(idx)}
                                        className={`relative flex-shrink-0 snap-start min-w-[180px] md:flex-1 max-w-[280px] rounded-xl text-left transition-all duration-200 overflow-hidden ${isActive
                                            ? 'bg-white shadow-xl shadow-blue-200/60 border-2 border-blue-500 ring-4 ring-blue-100/60 scale-[1.02]'
                                            : 'bg-white/70 border border-slate-200 hover:bg-white hover:shadow-lg hover:border-blue-300 hover:scale-[1.01]'
                                            }`}
                                    >
                                        {/* Active indicator top bar */}
                                        {isActive && (
                                            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600 w-full" />
                                        )}

                                        <div className={`p-4 ${!isActive ? 'pt-[calc(1rem+1px)]' : ''}`}>
                                            {/* Header with number and label */}
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className={`font-bold text-sm truncate ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {variant.label || `Variante ${idx + 1}`}
                                                </span>
                                                {isActive && (
                                                    <svg className="w-4 h-4 text-blue-500 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Specs */}
                                            <div className="space-y-1 mb-3">
                                                {variant.modelName && (
                                                    <div className="flex items-center gap-1.5">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3 text-slate-400 shrink-0">
                                                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                        </svg>
                                                        <span className="text-[11px] text-slate-500 truncate">{variant.modelName}</span>
                                                    </div>
                                                )}
                                                {variant.width > 0 && variant.projection > 0 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3 text-slate-400 shrink-0">
                                                            <path d="M21 3H3v18" /><path d="M21 3l-8 8" />
                                                        </svg>
                                                        <span className="text-[11px] text-slate-500">{variant.width.toLocaleString('de-DE')} × {variant.projection.toLocaleString('de-DE')} mm</span>
                                                    </div>
                                                )}
                                                {variant.color && (
                                                    <div className="flex items-center gap-1.5">
                                                        {colorDotStyle ? (
                                                            <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={colorDotStyle} />
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3 text-slate-400 shrink-0">
                                                                <circle cx="12" cy="12" r="9" />
                                                            </svg>
                                                        )}
                                                        <span className="text-[11px] text-slate-500 truncate">{translateColorForDisplay(variant.color)}</span>
                                                    </div>
                                                )}
                                                {itemCount > 0 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3 text-slate-400 shrink-0">
                                                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                                            <rect x="9" y="3" width="6" height="4" rx="1" />
                                                        </svg>
                                                        <span className="text-[11px] text-slate-500">{itemCount} Positionen</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price */}
                                            {price > 0 && (
                                                <div className={`rounded-lg p-2.5 -mx-1 ${isActive ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
                                                    {priceNet > 0 && (
                                                        <p className="text-[10px] text-slate-400 mb-0.5 tabular-nums">
                                                            netto {priceNet.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                                        </p>
                                                    )}
                                                    <p className={`text-lg font-black tabular-nums tracking-tight ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                                                        {price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">inkl. MwSt.</p>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ LEGACY SIBLING OFFER SWITCHER ═══════ */}
            {!hasEmbeddedVariants && siblingOffers.length > 1 && (
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 py-3">
                        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
                            {siblingOffers.slice(0, 5).map((sibling, idx) => {
                                const isActive = sibling.publicToken === token;
                                const modelName = sibling.product?.modelId
                                    ? getModelDisplayName(sibling.product.modelId)
                                    : 'Angebot';
                                const price = sibling.pricing?.sellingPriceGross || sibling.pricing?.selling_price_gross || 0;
                                return (
                                    <button
                                        key={sibling.id}
                                        onClick={() => handleSwitchOffer(sibling.publicToken)}
                                        className={`relative flex-shrink-0 snap-start min-w-[140px] md:flex-1 max-w-[220px] p-3 rounded-xl text-left transition-all ${isActive
                                            ? 'bg-white shadow-lg shadow-blue-200/50 border-2 border-blue-500'
                                            : 'bg-white/60 border border-slate-200 hover:bg-white hover:shadow-md hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className={`font-bold text-sm truncate ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {modelName}
                                            </span>
                                        </div>
                                        {price > 0 && (
                                            <p className={`text-base font-black mt-1 ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                                                {price.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">

                {/* ═══════ URGENCY BANNER ═══════ */}
                {daysRemaining <= 10 && daysRemaining > 0 && (
                    <div className="mb-6 bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-amber-800 text-sm">Nur noch {daysRemaining} Tage gültig</p>
                            <p className="text-amber-700/80 text-xs mt-0.5">Sichern Sie sich jetzt Ihren Angebotspreis.</p>
                        </div>
                    </div>
                )}

                {/* Hero Section */}
                <OfferHero
                    product={offer.product}
                    customerName={offer.customer.firstName}
                    offerNumber={offer.offerNumber}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* ═══════ LEFT COLUMN: Main Content ═══════ */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Full Specification — FIRST: customer wants to see what they're getting */}
                        <div id="details">
                            {/* Active variant banner */}
                            {hasEmbeddedVariants && embeddedVariants[activeVariantIdx] && (() => {
                                const v = embeddedVariants[activeVariantIdx];
                                const vPrice = v.pricing?.sellingPriceGross || 0;
                                return (
                                    <div className="bg-slate-800 text-white rounded-xl px-5 py-4 mb-6 border border-slate-700">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs font-black text-blue-300">{activeVariantIdx + 1}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{v.label}</p>
                                                    <p className="text-slate-400 text-xs mt-0.5">{v.modelName}{v.width ? ` · ${v.width}×${v.projection} mm` : ''}</p>
                                                </div>
                                            </div>
                                            {vPrice > 0 && (
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Brutto</p>
                                                    <p className="text-xl md:text-2xl font-black tabular-nums">{vPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            <OfferSpecification product={{
                                ...offer.product,
                                numberOfPosts: offer.pricing?.numberOfPosts,
                                numberOfFields: offer.pricing?.numberOfFields
                            }} pricing={offer.pricing} />
                        </div>

                        {((offer as any).attachments?.length > 0) && (
                                <>
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6">
                                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-base">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-blue-600">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                                <path d="M14 2v6h6" />
                                            </svg>
                                            Ihre Unterlagen
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {((offer as any).attachments as any[]).map((att: any) => {
                                                const isImage = /\.(png|jpg|jpeg|webp)$/i.test(att.name || att.url || '');
                                                const isPdf = /\.pdf$/i.test(att.name || att.url || '');
                                                const label = att.type === 'visualization' ? '3D-Visualisierung' : 'Technische Zeichnung';
                                                return (
                                                    <button
                                                        key={att.id}
                                                        onClick={() => {
                                                            setViewingAttachment(att);
                                                            if (offer?.id) {
                                                                OfferService.trackInteraction(offer.id, 'pdf_click', { attachment_type: att.type, name: att.name });
                                                            }
                                                        }}
                                                        className="group flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer text-left w-full"
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isImage ? 'bg-purple-50' : 'bg-red-50'}`}>
                                                            {isPdf ? (
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-red-500">
                                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                                                    <path d="M14 2v6h6" />
                                                                    <path d="M10 12h4M10 16h2" />
                                                                </svg>
                                                            ) : (
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-purple-500">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">{label}</p>
                                                            <p className="text-[11px] text-slate-400 truncate">{att.name}</p>
                                                        </div>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ═══════ ATTACHMENT VIEWER LIGHTBOX ═══════ */}
                                    {viewingAttachment && (
                                        <AttachmentLightbox
                                            attachment={viewingAttachment}
                                            allAttachments={(offer as any)?.attachments || []}
                                            onClose={() => setViewingAttachment(null)}
                                            onNavigate={(att) => setViewingAttachment(att)}
                                        />
                                    )}
                                </>
                        )}

                        {/* Model-specific Advantages (Vorteile) — sells the value */}
                        <ModelAdvantagesSection modelId={offer.product.modelId} />

                        {/* Inline CTA — immediately after specification while interest is high */}
                        <div className="bg-slate-800 rounded-xl p-6 md:p-8 text-white text-center">
                            <h3 className="text-lg md:text-xl font-bold mb-2">Interesse an dieser Konfiguration?</h3>
                            <p className="text-slate-300 mb-6 text-sm max-w-lg mx-auto">Von der Beratung bis zur fertigen Montage — wir begleiten Sie persönlich.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button
                                    onClick={handleAcceptOffer}
                                    disabled={accepting}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-800 rounded-lg font-bold hover:bg-slate-100 transition-all text-sm disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    {accepting ? 'Wird bestätigt...' : 'Angebot annehmen'}
                                </button>
                                <button
                                    onClick={handleScheduleMeasurement}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-white/10 text-white border border-white/20 rounded-lg font-bold hover:bg-white/20 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Kostenloses Aufmaß
                                </button>
                            </div>
                        </div>

                        {/* Trust Badges — reinforcement after CTA */}
                        <TrustSection />

                        {/* Upsell Section — upgrades the customer hasn't chosen yet */}
                        <UpsellSection offer={offer} />

                        {/* FAQ Section — addresses remaining concerns */}
                        <FAQSection />

                    </div>

                    {/* ═══════ RIGHT COLUMN: Sidebar (Sticky) ═══════ */}
                    <div className="space-y-6">
                        <div className="lg:sticky lg:top-20 space-y-6">

                            {/* ═══════ PRICE & ACTION CARD (Zusammenfassung) ═══════ */}
                            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                                {/* Price header */}
                                <div className="p-5 md:p-6">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        Zusammenfassung
                                    </h3>

                                    {/* Mini product summary */}
                                    <div className="mb-5 p-3.5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-100">
                                        <p className="font-bold text-slate-800 text-sm">{getModelDisplayName(offer.product.modelId)}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                            {offer.product.width > 0 && offer.product.projection > 0 && (
                                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3H3v18" /><path strokeLinecap="round" d="M21 3l-8 8" /></svg>
                                                    {offer.product.width.toLocaleString('de-DE')} × {offer.product.projection.toLocaleString('de-DE')} mm
                                                </p>
                                            )}
                                            {offer.product.color && (
                                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                                                    {translateColorForDisplay(offer.product.color)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {(() => {
                                        // NOTE: sellingPriceNet already includes installation costs (montage)
                                        const installNet = offer.pricing.installationCosts?.totalInstallation || 0;
                                        const totalNet = offer.pricing.sellingPriceNet;
                                        const totalGross = offer.pricing.sellingPriceGross;
                                        const totalVat = totalGross - totalNet;
                                        const productOnlyNet = totalNet - installNet;
                                        // FIX: Use boolean, not number — {0 && <JSX>} renders "0" in React!
                                        const hasDiscount = Boolean(offer.pricing.discountValue && offer.pricing.discountValue > 0);
                                        const discountGross = hasDiscount ? offer.pricing.discountValue * 1.19 : 0;
                                        const originalGross = hasDiscount ? totalGross + discountGross : 0;

                                        const fmtPrice = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                                        return (
                                        <div className="space-y-2.5">
                                            {/* Product price breakdown — only when there IS montage */}
                                            {installNet > 0 && (
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-slate-500 text-xs sm:text-sm">Terrassenüberdachung</span>
                                                    <span className="font-semibold text-sm text-slate-700 tabular-nums">{fmtPrice(productOnlyNet)} €</span>
                                                </div>
                                            )}

                                            {/* Installation */}
                                            {installNet > 0 && (
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-slate-500 text-xs sm:text-sm">Montage & Lieferung</span>
                                                    <span className="font-semibold text-sm text-slate-700 tabular-nums">{fmtPrice(installNet)} €</span>
                                                </div>
                                            )}

                                            {/* Netto subtotal — prominent */}
                                            <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                                                <span className="text-slate-700 text-sm font-bold">Summe netto</span>
                                                <span className="font-extrabold text-lg md:text-xl text-slate-800 tabular-nums">{fmtPrice(totalNet)} €</span>
                                            </div>

                                            {/* VAT */}
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-slate-400 text-xs">zzgl. 19% MwSt.</span>
                                                <span className="text-xs text-slate-400 tabular-nums">{fmtPrice(totalVat)} €</span>
                                            </div>

                                            {/* Discount badge */}
                                            {hasDiscount && (
                                                <>
                                                    <div className="flex justify-between items-baseline pt-1">
                                                        <span className="text-slate-400 text-xs">Regulärer Bruttopreis</span>
                                                        <span className="text-xs text-slate-400 line-through tabular-nums">{fmtPrice(originalGross)} €</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                                                        <span className="text-green-700 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                                                            {offer.pricing.discountPercentage
                                                                ? `−${offer.pricing.discountPercentage}%`
                                                                : 'Rabatt'
                                                            }
                                                        </span>
                                                        <span className="font-bold text-green-700 text-sm tabular-nums">−{fmtPrice(discountGross)} €</span>
                                                    </div>
                                                </>
                                            )}

                                            {/* Grand total brutto */}
                                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mt-2 flex justify-between items-center">
                                                <div>
                                                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Gesamtpreis</span>
                                                    <span className="text-xs text-slate-400">inkl. MwSt.{installNet > 0 ? ' & Montage' : ''}</span>
                                                </div>
                                                <span className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tight">{fmtPrice(totalGross)} €</span>
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>

                                {/* CTAs */}
                                <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-2.5">
                                    <button
                                        onClick={handleAcceptOffer}
                                        disabled={accepting}
                                        className="w-full py-3.5 md:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-sm md:text-base shadow-lg shadow-green-500/30 hover:from-green-400 hover:to-green-500 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {accepting ? (
                                            <span>Wird bestätigt...</span>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                Angebot annehmen
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleScheduleMeasurement}
                                        className="w-full py-3 md:py-3.5 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-bold text-sm hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0l2-2M5 21l-2-2m7-9h4" /></svg>
                                        Kostenloses Aufmaß
                                    </button>

                                    <button
                                        onClick={handleDownloadPDF}
                                        className="w-full py-2.5 md:py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-xs md:text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        {hasEmbeddedVariants && embeddedVariants[activeVariantIdx]
                                            ? `PDF — ${embeddedVariants[activeVariantIdx].label}`
                                            : 'PDF herunterladen'
                                        }
                                    </button>
                                </div>

                                {/* Validity */}
                                <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100">
                                    <p className="text-[10px] md:text-xs text-center text-slate-400 flex items-center justify-center gap-1.5">
                                        {daysRemaining > 0 ? (
                                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>Gültig noch {daysRemaining} Tage</>
                                        ) : (
                                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Abgelaufen — kontaktieren Sie uns</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Creator Profile (Ihr Ansprechpartner) */}
                            {offer.creator && (
                                <CreatorProfileSection creator={offer.creator} />
                            )}

                            {/* Timeline */}
                            <TimelineSection />

                            {/* ═══════ CONTACT / MESSAGE BOX ═══════ */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-5 pt-5 pb-4 md:px-6 md:pt-6">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-slate-400">
                                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        Fragen zum Angebot?
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5 ml-6">Ihre Nachricht wird direkt an Ihren Berater weitergeleitet.</p>
                                </div>

                                <div className="px-5 pb-5 md:px-6 md:pb-6">
                                    {messageSent ? (
                                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg text-center">
                                            <p className="font-bold text-sm flex items-center justify-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                Nachricht gesendet
                                            </p>
                                            <p className="text-xs mt-1">Ihr Berater meldet sich in Kürze.</p>
                                            <button onClick={() => setMessageSent(false)} className="text-[11px] underline mt-2 text-emerald-600 hover:text-emerald-800">Neue Nachricht schreiben</button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSendMessage}>
                                            <textarea
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                                placeholder="Schreiben Sie hier Ihre Frage..."
                                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none h-24 resize-none text-sm text-slate-700 placeholder:text-slate-300"
                                            />
                                            <button
                                                type="submit"
                                                disabled={sending || !newMessage.trim()}
                                                className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 text-sm flex items-center justify-center gap-2"
                                            >
                                                {sending ? 'Wird gesendet...' : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        Nachricht senden
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>

                                <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 md:px-6 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400">{creatorName} direkt anrufen</p>
                                        <a href={`tel:${creatorPhoneHref}`} className="font-bold text-slate-800 text-sm hover:text-blue-600 transition-colors">{creatorPhoneDisplay}</a>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            {/* ═══════ MOBILE STICKY ACTION BAR ═══════ */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2.5 p-3 max-w-md mx-auto">
                    <div className="flex-shrink-0">
                        {(() => {
                            const totalNet = offer.pricing.sellingPriceNet;
                            const totalGross = offer.pricing.sellingPriceGross;
                            return (
                                <>
                                    <p className="text-[9px] text-slate-400 leading-none tabular-nums">netto <span className="font-semibold text-slate-500">{totalNet.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</span></p>
                                    <p className="text-base font-extrabold text-slate-800 leading-tight tabular-nums">{totalGross.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € <span className="text-[9px] font-normal text-slate-400">brutto</span></p>
                                </>
                            );
                        })()}
                    </div>
                    <a
                        href={`tel:${creatorPhoneHref}`}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 shrink-0 hover:bg-slate-50"
                        title="Anrufen"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </a>
                    <button
                        onClick={handleAcceptOffer}
                        disabled={accepting}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {accepting ? 'Wird bestätigt...' : 'Angebot annehmen'}
                    </button>
                </div>
            </div>

            {/* ═══════ ACCEPT CONFIRMATION OVERLAY ═══════ */}
            {showAcceptConfirm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAcceptConfirm(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold">Vielen Dank!</h3>
                            <p className="text-green-100 text-sm mt-2">Angebot Nr. {offer.offerNumber}</p>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-700 text-base mb-2 text-center font-semibold">
                                Wir haben Ihre Bestätigung erhalten.
                            </p>
                            <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed">
                                Unser Berater wird sich in Kürze bei Ihnen melden, um die nächsten Schritte zu besprechen und alles Weitere für Sie zu organisieren.
                            </p>

                            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></div>
                                    <div>
                                        <p className="text-xs text-slate-400">{creatorName} anrufen</p>
                                        <a href={`tel:${creatorPhoneHref}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors">{creatorPhoneDisplay}</a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                                    <div>
                                        <p className="text-xs text-slate-400">Per E-Mail</p>
                                        <a href={`mailto:${creatorEmail}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors">{creatorEmail}</a>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAcceptConfirm(false)}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                            >
                                Zurück zum Angebot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {isMeasurementModalOpen && token && (
                <MeasurementRequestModal
                    offerToken={token}
                    offerId={offer?.id}
                    onClose={() => setIsMeasurementModalOpen(false)}
                />
            )}
        </div>
    );
};
