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

    // Creator's client-facing contact info (fallback to company defaults)
    const creatorPhone = offer?.creator?.clientPhone || offer?.creator?.phone || COMPANY_PHONE;
    const creatorPhoneHref = creatorPhone.replace(/\s/g, '').replace(/^0/, '+49');
    const creatorEmail = offer?.creator?.clientEmail || offer?.creator?.email || COMPANY_EMAIL;
    const creatorName = offer?.creator ? `${offer.creator.firstName} ${offer.creator.lastName}` : 'Polendach24';

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
                timestamp: new Date().toISOString()
            }).catch(err => console.error('Failed to track PDF download', err));
        }
        window.open(`/print/offer/${token}`, '_blank');
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
                        📞 {COMPANY_PHONE}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans text-slate-800 pb-28 lg:pb-0">

            {/* ═══════ MULTI-OFFER SWITCHER ═══════ */}
            {siblingOffers.length > 1 && (
                <div className="bg-white border-b border-slate-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center gap-2 py-3 overflow-x-auto">
                            <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-1">Ihre Angebote:</span>
                            {siblingOffers.map((sibling) => {
                                const isActive = sibling.publicToken === token;
                                const modelName = sibling.product?.modelId
                                    ? getModelDisplayName(sibling.product.modelId)
                                    : 'Angebot';
                                const price = sibling.pricing?.sellingPriceGross || sibling.pricing?.selling_price_gross || 0;
                                return (
                                    <button
                                        key={sibling.id}
                                        onClick={() => handleSwitchOffer(sibling.publicToken)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                                            }`}
                                    >
                                        <span className="font-bold">{sibling.offerNumber}</span>
                                        <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {modelName} • {price > 0 ? `${price.toFixed(0)} €` : ''}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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
                            <span>{creatorPhone}</span>
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

            <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">

                {/* ═══════ URGENCY BANNER ═══════ */}
                {daysRemaining <= 10 && daysRemaining > 0 && (
                    <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl shrink-0">⏰</div>
                        <div>
                            <p className="font-bold text-amber-800 text-sm">Nur noch {daysRemaining} Tage gültig</p>
                            <p className="text-amber-700 text-xs mt-0.5">Dieses Angebot ist zeitlich begrenzt. Sichern Sie sich jetzt Ihren Preis!</p>
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
                            <OfferSpecification product={{
                                ...offer.product,
                                numberOfPosts: offer.pricing?.numberOfPosts,
                                numberOfFields: offer.pricing?.numberOfFields
                            }} />
                        </div>

                        {/* Model-specific Advantages (Vorteile) — sells the value */}
                        <ModelAdvantagesSection modelId={offer.product.modelId} />

                        {/* Inline CTA — immediately after specification while interest is high */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 md:p-8 text-white text-center shadow-xl shadow-blue-200">
                            <h3 className="text-xl md:text-2xl font-bold mb-2">Gefällt Ihnen diese Konfiguration?</h3>
                            <p className="text-blue-100 mb-6 text-sm md:text-base">Wir stehen Ihnen für alle Fragen zur Verfügung und begleiten Sie von der Beratung bis zur fertigen Montage.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button
                                    onClick={handleAcceptOffer}
                                    disabled={accepting}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-white text-blue-700 rounded-xl font-bold shadow-lg hover:bg-blue-50 transition-all text-sm disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    {accepting ? 'Wird bestätigt...' : 'Angebot annehmen'}
                                </button>
                                <button
                                    onClick={handleScheduleMeasurement}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-white/15 text-white border border-white/30 rounded-xl font-bold hover:bg-white/25 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0l2-2M5 21l-2-2m7-9h4" /></svg>
                                    Kostenloses Aufmaß vereinbaren
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
                                <div className="p-6 pb-0">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Zusammenfassung</h3>

                                    {/* Mini product summary */}
                                    <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="font-bold text-slate-800 text-sm">{getModelDisplayName(offer.product.modelId)} Edition</p>
                                        {offer.product.width > 0 && offer.product.projection > 0 && (
                                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3H3v18" /><path strokeLinecap="round" d="M21 3l-8 8" /></svg>{offer.product.width} × {offer.product.projection} mm</p>
                                        )}
                                        {offer.product.color && (
                                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={2} /><circle cx="12" cy="8" r="1.5" fill="currentColor" opacity={0.4} /></svg>{translateColorForDisplay(offer.product.color)}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2.5 mb-6">
                                        {/* Discount visualization — strikethrough original price */}
                                        {offer.pricing.discountValue && offer.pricing.discountValue > 0 ? (
                                            <>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-slate-500 text-sm">Listenpreis (netto)</span>
                                                    <span className="font-semibold text-base text-slate-400 line-through">{(offer.pricing.sellingPriceNet + offer.pricing.discountValue).toFixed(2)} €</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                                                    <span className="text-green-700 text-sm font-bold flex items-center gap-1.5">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                                                        {offer.pricing.discountPercentage
                                                            ? `−${offer.pricing.discountPercentage}% Sonderrabatt`
                                                            : `−${offer.pricing.discountValue.toFixed(2)} € Sonderrabatt`
                                                        }
                                                    </span>
                                                    <span className="font-bold text-green-700 text-sm">−{offer.pricing.discountValue.toFixed(2)} €</span>
                                                </div>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-slate-700 text-sm font-semibold">Ihr Preis (netto)</span>
                                                    <span className="font-bold text-lg text-slate-800">{offer.pricing.sellingPriceNet.toFixed(2)} €</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-slate-500 text-sm">Nettopreis</span>
                                                <span className="font-semibold text-base">{offer.pricing.sellingPriceNet.toFixed(2)} €</span>
                                            </div>
                                        )}

                                        {/* Installation as a visible position */}
                                        {offer.pricing.installationCosts?.totalInstallation > 0 && (
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-slate-500 text-sm flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5" /></svg>
                                                    Fachmontage & Logistik
                                                    {offer.pricing.installationCosts.installationDays && (
                                                        <span className="text-[10px] text-slate-400 ml-0.5">({offer.pricing.installationCosts.installationDays} Tag{(offer.pricing.installationCosts as any).installationDays > 1 ? 'e' : ''})</span>
                                                    )}
                                                </span>
                                                <span className="font-semibold text-base">{offer.pricing.installationCosts.totalInstallation.toFixed(2)} €</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-baseline pb-4 border-b border-slate-100">
                                            <span className="text-slate-500 text-sm">MwSt. (19%)</span>
                                            <span className="font-semibold text-slate-600">{(offer.pricing.sellingPriceGross - offer.pricing.sellingPriceNet).toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-2">
                                            <span className="text-lg font-bold text-slate-800">Gesamtpreis</span>
                                            <span className="text-3xl font-extrabold text-blue-600">{offer.pricing.sellingPriceGross.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CTAs */}
                                <div className="px-6 pb-6 space-y-3">
                                    <button
                                        onClick={handleAcceptOffer}
                                        disabled={accepting}
                                        className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-base shadow-lg shadow-green-500/30 hover:from-green-400 hover:to-green-500 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
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
                                        className="w-full py-3.5 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-bold hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0l2-2M5 21l-2-2m7-9h4" /></svg>
                                        Kostenloses Aufmaß vereinbaren
                                    </button>

                                    <button
                                        onClick={handleDownloadPDF}
                                        className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        PDF herunterladen
                                    </button>
                                </div>

                                {/* Validity */}
                                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                                    <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1.5">
                                        {daysRemaining > 0 ? (
                                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>Angebot gültig noch {daysRemaining} Tage</>
                                        ) : (
                                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Angebot abgelaufen — kontaktieren Sie uns</>
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
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Fragen zum Angebot?</h3>

                                {messageSent ? (
                                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
                                        <p className="font-bold flex items-center justify-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Nachricht gesendet!</p>
                                        <p className="text-sm mt-1">Ihr Berater meldet sich in Kürze.</p>
                                        <button onClick={() => setMessageSent(false)} className="text-xs underline mt-2">Neue Nachricht</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage}>
                                        <textarea
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Ihre Nachricht an den Berater..."
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm"
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !newMessage.trim()}
                                            className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
                                        >
                                            {sending ? 'Senden...' : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Nachricht senden</>)}
                                        </button>
                                    </form>
                                )}

                                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></div>
                                    <div>
                                        <p className="text-xs text-slate-500">{creatorName} direkt anrufen</p>
                                        <a href={`tel:${creatorPhoneHref}`} className="font-bold text-slate-800 text-lg hover:text-blue-600 transition-colors">{creatorPhone}</a>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            {/* ═══════ MOBILE STICKY ACTION BAR ═══════ */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.12)]">
                <div className="flex items-center gap-3 p-3 max-w-md mx-auto">
                    <div className="flex-shrink-0">
                        <p className="text-[10px] text-slate-400 leading-none">Gesamtpreis</p>
                        <p className="text-lg font-extrabold text-slate-800 leading-tight">{offer.pricing.sellingPriceGross.toFixed(0)} €</p>
                    </div>
                    <button
                        onClick={handleScheduleMeasurement}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 shrink-0 hover:bg-slate-50"
                        title="Aufmaß vereinbaren"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0l2-2M5 21l-2-2m7-9h4" /></svg>
                    </button>
                    <button
                        onClick={handleAcceptOffer}
                        disabled={accepting}
                        className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {accepting ? 'Bestätigen...' : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Annehmen
                            </>
                        )}
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
                                        <a href={`tel:${creatorPhoneHref}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors">{creatorPhone}</a>
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
