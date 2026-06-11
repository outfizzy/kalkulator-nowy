import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OfferService } from '../services/database/offer.service';
import { supabase } from '../lib/supabase';
import { LeadService } from '../services/database/lead.service';
import type { Offer } from '../types';
import { toast } from 'react-hot-toast';
import { TrustSection } from '../components/public-offer/TrustSection';

import { TimelineSection } from '../components/public-offer/TimelineSection';
import { OfferHero } from '../components/public-offer/OfferHero';
import { OfferSpecification } from '../components/public-offer/OfferSpecification';
import { CreatorProfileSection } from '../components/public-offer/CreatorProfileSection';
import { SalesTeamSection } from '../components/public-offer/SalesTeamSection';
import { TeamSection } from '../components/public-offer/TeamSection';
import { MeasurementRequestModal } from '../components/public-offer/MeasurementRequestModal';
import { FAQSection } from '../components/public-offer/FAQSection';
import { ModelAdvantagesSection } from '../components/public-offer/ModelAdvantagesSection';
import { UpsellSection } from '../components/public-offer/UpsellSection';
import { AttachmentLightbox } from '../components/public-offer/AttachmentLightbox';
import { TierComparisonSection, type TierVariant } from '../components/public-offer/TierComparisonSection';
import { BotOfferView } from '../components/public-offer/BotOfferView';
import { getModelDisplayName } from '../config/modelImages';
import { toCustomerLabel } from '../utils/productLabel';

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
    const [sendError, setSendError] = useState(false);
    // Minimum message length before the customer can send (microcopy reason shown).
    const MIN_MESSAGE_LENGTH = 10;
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
    const [siblingOffers, setSiblingOffers] = useState<SiblingOffer[]>([]);
    const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
    const [accepting, setAccepting] = useState(false);
    // Embedded variants (from single offer)
    const [activeVariantIdx, setActiveVariantIdx] = useState(0);
    const [viewingAttachment, setViewingAttachment] = useState<any>(null);
    const [selectedTier, setSelectedTier] = useState<TierVariant | null>(null);
    // Ref to the "Fragen zum Angebot?" textarea — focused when an extra is requested.
    const messageRef = useRef<HTMLTextAreaElement>(null);
    // Wątek wiadomości (klient ↔ Berater) — przez RPC get_offer_messages (po tokenie)
    const [offerThread, setOfferThread] = useState<{ id: string; content: string; sender_type: string; created_at: string }[]>([]);

    const fetchOfferThread = async () => {
        if (!token) return;
        try {
            const { data } = await supabase.rpc('get_offer_messages', { token_input: token });
            if (Array.isArray(data)) setOfferThread(data);
        } catch { /* wątek jest opcjonalny */ }
    };
    const embeddedVariants: any[] = (offer as any)?.variants || (offer as any)?.product?.variants || [];
    const hasEmbeddedVariants = embeddedVariants.length > 0;
    // Agent-generated offers have variants with 'tier' field
    const isAgentOffer = embeddedVariants.length > 0 && embeddedVariants.some((v: any) => v.tier);

    // ── Sales team pool for agent-generated offers ──
    const AGENT_TEAM = useMemo(() => [
        { firstName: 'Mike', lastName: 'Ledwin', phone: '+4915257487430', phoneDisplay: '0152 5748 7430', email: 'm.ledwin@polendach24.de', whatsapp: '4915257487430' },
        { firstName: 'Hubert', lastName: 'Kosciow', phone: '+49152223634823', phoneDisplay: '0152 2363 4823', email: 'h.kosciow@polendach24.de', whatsapp: '49152223634823' },
        { firstName: 'Oliwia', lastName: 'Duz', phone: '+491626692445', phoneDisplay: '0162 6692 445', email: 'o.duz@polendach24.de', whatsapp: '491626692445' },
    ], []);
    // Pick one random rep for the header (stable per page-load)
    const randomRep = useMemo(() => AGENT_TEAM[Math.floor(Math.random() * AGENT_TEAM.length)], [AGENT_TEAM]);

    // Creator's client-facing contact info (fallback to company defaults)
    // For agent offers without a creator: use a random team member
    const isAgentOfferCheck = embeddedVariants.length > 0 && embeddedVariants.some((v: any) => v.tier);
    const creatorPhone = offer?.creator?.clientPhone || offer?.creator?.phone || (isAgentOfferCheck ? randomRep.phone : COMPANY_PHONE);
    const creatorPhoneHref = creatorPhone.replace(/\s/g, '').replace(/^0/, '+49');
    const creatorEmail = offer?.creator?.clientEmail || offer?.creator?.email || (isAgentOfferCheck ? randomRep.email : COMPANY_EMAIL);
    const creatorName = offer?.creator ? `${offer.creator.firstName} ${offer.creator.lastName}` : (isAgentOfferCheck ? `${randomRep.firstName} ${randomRep.lastName}` : 'Polendach24');
    // Short "Berater" label for send microcopy ("Sende an {Berater} …").
    const beraterName = offer?.creator?.firstName || (isAgentOfferCheck ? randomRep.firstName : 'Ihren Berater');
    // WhatsApp number for header
    const whatsappNumber = offer?.creator ? creatorPhoneHref.replace('+', '') : (isAgentOfferCheck ? randomRep.whatsapp : COMPANY_PHONE_HREF.replace('+', ''));

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
    const creatorPhoneDisplay = isAgentOfferCheck && !offer?.creator ? randomRep.phoneDisplay : formatPhoneDisplay(creatorPhone);

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
        fetchOfferThread();
    }, [token]);

    // ── Auto-refresh while the live pricing worker is still calculating ──
    // trigger-offer-agent creates the offer as 'pricing_pending'; the worker on
    // Hetzner PATCHes it to 'sent' when the live configurator prices are in.
    // Poll lightly (no view-tracking) so the customer lands on the finished
    // offer without reloading.
    useEffect(() => {
        if (!token || offer?.status !== 'pricing_pending') return;
        const interval = setInterval(async () => {
            try {
                const fresh = await OfferService.getOfferByToken(token);
                if (fresh) setOffer(fresh);
            } catch { /* keep polling */ }
        }, 20000);
        return () => clearInterval(interval);
    }, [token, offer?.status]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || newMessage.trim().length < MIN_MESSAGE_LENGTH) return;

        setSending(true);
        setSendError(false);
        try {
            const success = await LeadService.sendClientMessage(token, newMessage);
            if (success) {
                setMessageSent(true);
                setNewMessage('');
                toast.success('Nachricht gesendet!');
                fetchOfferThread();
                // Notify sales rep
                OfferService.notifyOfferAction(token, 'message_sent', { messagePreview: newMessage.substring(0, 100) }).catch(() => { });
            } else {
                setSendError(true);
                toast.error('Verbindung unterbrochen. Bitte später erneut senden.');
            }
        } catch (error) {
            console.error(error);
            setSendError(true);
            toast.error('Verbindung unterbrochen. Bitte später erneut senden.');
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
        // Agent offers: print the SELECTED package (fallback: recommended), not always variants[0]
        const selectedIdx = isAgentOffer
            ? Math.max(0, selectedTier
                ? embeddedVariants.findIndex((v: any) => v.id === selectedTier.id)
                : embeddedVariants.findIndex((v: any) => v.tier === 'recommended'))
            : activeVariantIdx;
        if (offer?.id) {
            OfferService.trackInteraction(offer.id, 'pdf_download', {
                action: 'pdf_download',
                variant: hasEmbeddedVariants ? selectedIdx : undefined,
                timestamp: new Date().toISOString()
            }).catch(err => console.error('Failed to track PDF download', err));
        }
        const variantParam = hasEmbeddedVariants ? `?variant=${selectedIdx}` : '';
        window.open(`/print/offer/${token}${variantParam}`, '_blank');
    };

    const handleScheduleMeasurement = () => {
        if (offer?.id) {
            OfferService.trackInteraction(offer.id, 'measurement_request').catch(() => { });
        }
        setIsMeasurementModalOpen(true);
    };

    // "Anfragen" on an optional extra → scroll to the contact form, prefill it.
    const handleRequestExtra = (extraName: string) => {
        const prefill = `Ich interessiere mich für: ${extraName}`;
        setMessageSent(false);   // make sure the form (not the success state) is shown
        setSendError(false);
        setNewMessage(prefill);
        if (offer?.id) {
            OfferService.trackInteraction(offer.id, 'extra_request', { extra: extraName }).catch(() => { });
        }
        // Defer scroll/focus until the form is rendered (in case it was in sent-state).
        requestAnimationFrame(() => {
            const el = document.getElementById('contact-form');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Focus + place cursor at end shortly after the scroll starts.
            setTimeout(() => {
                const ta = messageRef.current;
                if (ta) {
                    ta.focus({ preventScroll: true });
                    ta.setSelectionRange(ta.value.length, ta.value.length);
                }
            }, 350);
        });
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
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F8FA' }}>
                <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#DCEAFD] border-t-[#1E6FD9]"></div>
                </div>
                <p className="mt-6 text-slate-500 font-medium text-sm animate-pulse">Ihr Angebot wird geladen...</p>
            </div>
        );
    }

    if (!offer) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FA' }}>
                <div className="text-center max-w-md px-8">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Angebot nicht gefunden</h1>
                    <p className="text-slate-500">Der Link ist möglicherweise ungültig oder abgelaufen. Bitte kontaktieren Sie uns.</p>
                    <a href={`tel:${COMPANY_PHONE_HREF}`} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#1E6FD9] text-white rounded-full font-semibold shadow-cta hover:bg-[#195FC0] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                        {COMPANY_PHONE}
                    </a>
                </div>
            </div>
        );
    }

    // ── Live pricing still running → waiting screen (never NaN-prices) ──
    // Placeholder variants exist from the moment the agent starts, but they
    // carry no prices until the worker's Supabase callback arrives.
    const variantsHavePrices = embeddedVariants.some((v: any) => (v.totalGrossEUR || 0) > 0);
    const isPricingPending = offer.status === 'pricing_pending';
    // Failed/anomalous: worker reported an error, or an agent offer was released
    // without any prices — show the "we'll calculate personally" screen instead
    // of package cards with 0 €.
    const isPricingFailed = offer.status === 'pricing_failed' || offer.status === 'pricing_error'
        || (isAgentOffer && !variantsHavePrices && !isPricingPending);

    if (isPricingFailed) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FA' }}>
                <div className="text-center max-w-md px-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[#1E6FD9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Wir erstellen Ihr Angebot persönlich</h1>
                    <p className="text-slate-500 leading-relaxed">
                        Ihre Anfrage{offer.offerNumber ? ` (${offer.offerNumber})` : ''} wird gerade von unserem Team
                        individuell kalkuliert. Sie erhalten Ihr Angebot in Kürze per E-Mail —
                        oder rufen Sie uns direkt an.
                    </p>
                    <a href={`tel:${COMPANY_PHONE_HREF}`} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#1E6FD9] text-white rounded-full font-semibold shadow-cta hover:bg-[#195FC0] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                        {COMPANY_PHONE}
                    </a>
                </div>
            </div>
        );
    }

    if (isPricingPending) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-8" style={{ background: '#F7F8FA' }}>
                <div className="text-center max-w-md">
                    <div className="relative mx-auto w-14 h-14">
                        <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#DCEAFD] border-t-[#1E6FD9]"></div>
                    </div>
                    <h1 className="mt-8 text-2xl font-bold text-slate-800">Ihr persönliches Angebot wird erstellt</h1>
                    <p className="mt-3 text-slate-500 font-medium animate-pulse">Ihr Preis wird mit aktuellen Werten berechnet …</p>
                    <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                        Wir kalkulieren Ihre Überdachung mit tagesaktuellen Hersteller-Preisen.
                        Das dauert in der Regel nur wenige Minuten — diese Seite aktualisiert sich automatisch.
                    </p>
                    {offer.offerNumber && (
                        <p className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Angebot {offer.offerNumber}
                        </p>
                    )}
                    <div className="mt-8">
                        <a href={`tel:${COMPANY_PHONE_HREF}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold hover:border-[#1E6FD9] hover:text-[#1E6FD9] transition-all">
                            Fragen? {COMPANY_PHONE}
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Price formatter
    const fmtPrice = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtPriceShort = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Pricing calculations (moved from inline for reuse)
    const installNet = offer.pricing.installationCosts?.totalInstallation || 0;
    const totalNet = isAgentOffer && selectedTier ? selectedTier.totalNetEUR : offer.pricing.sellingPriceNet;
    const totalGross = isAgentOffer && selectedTier ? selectedTier.totalGrossEUR : offer.pricing.sellingPriceGross;
    const totalVat = totalGross - totalNet;
    const productOnlyNet = totalNet - installNet;
    const hasDiscount = Boolean(!isAgentOffer && offer.pricing.discountValue && offer.pricing.discountValue > 0);
    const discountGross = hasDiscount ? offer.pricing.discountValue * 1.19 : 0;
    const originalGross = hasDiscount ? totalGross + discountGross : 0;
    const displayName = getModelDisplayName(offer.product.modelId);

    return (
        <div className="min-h-screen font-sans text-slate-800" style={{ background: '#F7F8FA' }}>

            {/* ═══════ HEADER — professional sticky nav ═══════ */}
            <header className="bg-brand-gradient sticky top-0 z-40 transition-shadow duration-300"
                    style={{ boxShadow: '0 1px 3px rgba(10,22,40,0.08)' }}>
                {/* Top bar: Logo + Contact */}
                <div className={`${isAgentOffer ? 'max-w-[1280px]' : 'max-w-3xl'} mx-auto px-4 sm:px-6 flex items-center justify-between`}>
                    <div className="flex items-center gap-3 py-3">
                        <img
                            src="/polendach-logo.png"
                            alt="Polendach24"
                            className="h-8 sm:h-9 md:h-10 w-auto object-contain"
                        />
                        {offer.offerNumber && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.06] text-[10px] font-bold text-white/50 uppercase tracking-wider">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
                                </svg>
                                {offer.offerNumber}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* WhatsApp */}
                        <a
                            href={`https://wa.me/${whatsappNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 text-[#25D366] hover:text-[#25D366] hover:bg-white/10 transition-colors text-sm font-medium rounded-lg"
                            title="WhatsApp"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <span className="hidden sm:inline text-white/70 text-xs">WhatsApp</span>
                        </a>
                        {/* Phone */}
                        <a
                            href={`tel:${creatorPhoneHref}`}
                            className="flex items-center gap-1.5 px-3 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-white/10"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span className="hidden sm:inline">{creatorPhoneDisplay}</span>
                        </a>
                    </div>
                </div>

                {/* Section nav pills — scrollable on mobile */}
                {isAgentOffer && (
                    <nav className={`${isAgentOffer ? 'max-w-[1280px]' : 'max-w-3xl'} mx-auto px-4 sm:px-6 border-t border-white/[0.06]`}>
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 -mx-1">
                            {[
                                { label: 'Übersicht', anchor: 'offer-section-hero' },
                                { label: 'Pakete', anchor: 'offer-section-pakete' },
                                { label: 'Vergleich', anchor: 'offer-section-vergleich' },
                                { label: 'Technik', anchor: 'offer-section-technik' },
                                { label: 'Extras', anchor: 'offer-section-extras' },
                                { label: 'Kontakt', anchor: 'contact-form' },
                            ].map(item => (
                                <a
                                    key={item.anchor}
                                    href={`#${item.anchor}`}
                                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 whitespace-nowrap"
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    </nav>
                )}
            </header>

            {/* ═══════ MAIN CONTENT — single column, card-based ═══════ */}
            <main className={`${isAgentOffer ? 'max-w-[1280px]' : 'max-w-3xl'} mx-auto px-4 sm:px-6 py-6 md:py-10 pb-36 lg:pb-10 space-y-6`}>

                {/* ── CARD 1: Hero — only for non-agent offers (agent offers have built-in hero in BotOfferView) ── */}
                {isAgentOffer ? null : (
                    <OfferHero
                        product={offer.product}
                        customerName={offer.customer.firstName}
                        offerNumber={offer.offerNumber}
                    />
                )}

                {/* ── URGENCY BANNER ── */}
                {daysRemaining <= 10 && daysRemaining > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-amber-800 text-base">Noch {daysRemaining} Tage gültig</p>
                            <p className="text-amber-700/80 text-sm mt-0.5">Sichern Sie sich jetzt Ihren Angebotspreis.</p>
                        </div>
                    </div>
                )}

                {/* ── EMBEDDED VARIANT SWITCHER ── only when there is more than one variant to compare ── */}
                {hasEmbeddedVariants && !isAgentOffer && embeddedVariants.length > 1 && (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Wählen Sie Ihre Variante</h2>
                            <p className="text-sm text-slate-400 mt-0.5">Vergleichen Sie {embeddedVariants.length} Konfigurationen</p>
                        </div>
                        <div className="p-4 flex gap-3 overflow-x-auto snap-x snap-mandatory">
                            {embeddedVariants.slice(0, 5).map((variant: any, idx: number) => {
                                const isActive = idx === activeVariantIdx;
                                const price = variant.pricing?.sellingPriceGross || 0;
                                const priceNet = variant.pricing?.sellingPriceNet || 0;
                                const currency = variant.pricing?.currency === 'PLN' ? 'zł' : '€';
                                return (
                                    <button
                                        key={variant.id || idx}
                                        onClick={() => setActiveVariantIdx(idx)}
                                        className={`relative flex-shrink-0 snap-start min-w-[200px] md:flex-1 rounded-xl text-left transition-all p-5 ${isActive
                                            ? 'bg-brand-gradient text-white shadow-xl'
                                            : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold text-base truncate">
                                                {toCustomerLabel(variant.label) || `Variante ${idx + 1}`}
                                            </span>
                                        </div>
                                        {variant.modelName && (
                                            <p className={`text-sm mb-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{toCustomerLabel(variant.modelName)}</p>
                                        )}
                                        {variant.width > 0 && variant.projection > 0 && (
                                            <p className={`text-sm ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{variant.width.toLocaleString('de-DE')} × {variant.projection.toLocaleString('de-DE')} mm</p>
                                        )}
                                        {price > 0 && (
                                            <div className="mt-3 pt-3 border-t border-slate-200/20">
                                                {priceNet > 0 && (
                                                    <p className={`text-xs tabular-nums ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>netto {priceNet.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {currency}</p>
                                                )}
                                                <p className={`text-xl font-black tabular-nums ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                                    {price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {currency}
                                                </p>
                                            </div>
                                        )}
                                        {isActive && (
                                            <div className="absolute top-3 right-3">
                                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── LEGACY SIBLING OFFER SWITCHER ── */}
                {!hasEmbeddedVariants && siblingOffers.length > 1 && (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-3">Weitere Angebote für Sie</h3>
                        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory">
                            {siblingOffers.slice(0, 5).map((sibling, idx) => {
                                const isActive = sibling.publicToken === token;
                                const modelName = sibling.product?.modelId ? getModelDisplayName(sibling.product.modelId) : 'Angebot';
                                const price = sibling.pricing?.sellingPriceGross || sibling.pricing?.selling_price_gross || 0;
                                return (
                                    <button
                                        key={sibling.id}
                                        onClick={() => handleSwitchOffer(sibling.publicToken)}
                                        className={`flex-shrink-0 snap-start min-w-[160px] md:flex-1 p-4 rounded-xl text-left transition-all ${isActive
                                            ? 'bg-brand-gradient text-white shadow-lg'
                                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span className="font-bold text-base">{modelName}</span>
                                        {price > 0 && (
                                            <p className={`text-lg font-black mt-1 tabular-nums ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                                {fmtPriceShort(price)} €
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── AGENT OFFER: PREMIUM BOT OFFER VIEW ── */}
                {isAgentOffer && (
                    <BotOfferView
                        variants={embeddedVariants as TierVariant[]}
                        crossSell={(offer as any)?.cross_sell || []}
                        customerName={offer.customer.firstName}
                        productName={displayName}
                        dimensions={offer.product.width && offer.product.projection
                            ? `${offer.product.width.toLocaleString('de-DE')} × ${offer.product.projection.toLocaleString('de-DE')} mm`
                            : undefined
                        }
                        color={offer.product.color ? translateColorForDisplay(offer.product.color) : undefined}
                        offerNumber={offer.offerNumber}
                        creatorPhoneHref={creatorPhoneHref}
                        creatorPhoneDisplay={creatorPhoneDisplay}
                        selectedTier={selectedTier}
                        onSelectTier={(tier) => {
                            setSelectedTier(tier);
                            if (offer?.id) {
                                OfferService.trackInteraction(offer.id, 'tier_selected', {
                                    tier: tier.tier, label: tier.label, totalGross: tier.totalGrossEUR,
                                }).catch(() => {});
                            }
                        }}
                        onRequestMeasurement={handleScheduleMeasurement}
                        onAcceptOffer={handleAcceptOffer}
                        onRequestExtra={handleRequestExtra}
                        onDownloadPDF={handleDownloadPDF}
                    />
                )}

                {/* ── Post-packages sections: 2-column on desktop for agent offers ── */}
                {isAgentOffer ? (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left column — wider */}
                        <div className="lg:col-span-3 space-y-6">
                            <TimelineSection />
                            <FAQSection />
                        </div>
                        {/* Right column — sticky sidebar */}
                        <div className="lg:col-span-2">
                            <div className="lg:sticky lg:top-24 space-y-6">
                                <TeamSection />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Timeline ── */}
                        <TimelineSection />

                        {/* ── FAQ ── */}
                        <FAQSection />
                    </>
                )}
                {!isAgentOffer && (
                <div id="price-section" className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden">
                    <div className="px-6 py-5 md:px-8 md:py-6">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            Zusammenfassung
                        </h2>

                        {/* Product info */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                            <p className="font-bold text-slate-800 text-lg">{displayName}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                {offer.product.width > 0 && offer.product.projection > 0 && (
                                    <p className="text-sm text-slate-500">{offer.product.width.toLocaleString('de-DE')} × {offer.product.projection.toLocaleString('de-DE')} mm</p>
                                )}
                                {offer.product.color && (
                                    <p className="text-sm text-slate-500">{translateColorForDisplay(offer.product.color)}</p>
                                )}
                            </div>
                        </div>

                        {/* Price breakdown */}
                        <div className="space-y-3">
                            {/* Agent offer tier badge */}
                            {isAgentOffer && selectedTier && (
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold ${
                                    selectedTier.tier === 'recommended' ? 'bg-[#EAF2FE] text-[#195FC0] border-[#BFD9FB]'
                                    : selectedTier.tier === 'premium' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2H22l-6 4.5 2.3 7.3L12 16.5 5.7 21l2.3-7.3-6-4.5h7.6z" /></svg>
                                    {toCustomerLabel(selectedTier.label)}
                                    <span className="text-xs opacity-70 ml-auto font-normal">{toCustomerLabel(selectedTier.tagline)}</span>
                                </div>
                            )}

                            {/* Agent offer range (no tier selected) */}
                            {isAgentOffer && !selectedTier && embeddedVariants.length > 0 && (() => {
                                const sorted = [...embeddedVariants].sort((a: any, b: any) => a.totalGrossEUR - b.totalGrossEUR);
                                return (
                                    <div className="bg-[#EAF2FE] border border-[#BFD9FB] rounded-xl p-5 text-center">
                                        <p className="text-xs text-[#1E6FD9] uppercase font-bold tracking-wider mb-1">Preisspanne</p>
                                        <p className="text-2xl font-black text-[#195FC0] tabular-nums">
                                            {fmtPrice(sorted[0].totalGrossEUR)} — {fmtPrice(sorted[sorted.length - 1].totalGrossEUR)} €
                                        </p>
                                        <p className="text-sm text-[#1E6FD9] mt-1">Wählen Sie oben Ihr Paket</p>
                                    </div>
                                );
                            })()}

                            {/* Product + Installation breakdown */}
                            {!isAgentOffer && installNet > 0 && (
                                <>
                                    <div className="flex justify-between items-baseline py-1">
                                        <span className="text-slate-500 text-base">Terrassenüberdachung</span>
                                        <span className="font-semibold text-base text-slate-700 tabular-nums">{fmtPrice(productOnlyNet)} €</span>
                                    </div>
                                    <div className="flex justify-between items-baseline py-1">
                                        <span className="text-slate-500 text-base">Montage & Lieferung</span>
                                        <span className="font-semibold text-base text-slate-700 tabular-nums">{fmtPrice(installNet)} €</span>
                                    </div>
                                </>
                            )}

                            {isAgentOffer && selectedTier && (
                                <>
                                    <div className="flex justify-between items-baseline py-1">
                                        <span className="text-slate-500 text-base">{displayName}</span>
                                        <span className="font-semibold text-base text-slate-700 tabular-nums">{fmtPrice(selectedTier.priceNetEUR)} €</span>
                                    </div>
                                    {selectedTier.installationCostEUR > 0 && (
                                        <div className="flex justify-between items-baseline py-1">
                                            <span className="text-slate-500 text-base">Montage (1 Tag)</span>
                                            <span className="font-semibold text-base text-slate-700 tabular-nums">{fmtPrice(selectedTier.installationCostEUR)} €</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Netto total */}
                            <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200">
                                <span className="text-slate-700 text-base font-bold">Summe netto</span>
                                <span className="font-black text-xl text-slate-800 tabular-nums">{fmtPrice(totalNet)} €</span>
                            </div>

                            {/* VAT */}
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-400 text-sm">zzgl. 19% MwSt.</span>
                                <span className="text-sm text-slate-400 tabular-nums">{fmtPrice(totalVat)} €</span>
                            </div>

                            {/* Discount */}
                            {hasDiscount && (
                                <>
                                    <div className="flex justify-between items-baseline pt-1">
                                        <span className="text-slate-400 text-sm">Regulärer Bruttopreis</span>
                                        <span className="text-sm text-slate-400 line-through tabular-nums">{fmtPrice(originalGross)} €</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-3 border border-green-100">
                                        <span className="text-green-700 text-sm font-bold flex items-center gap-2">
                                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                                            {offer.pricing.discountPercentage ? `−${offer.pricing.discountPercentage}%` : 'Rabatt'}
                                        </span>
                                        <span className="font-bold text-green-700 tabular-nums">−{fmtPrice(discountGross)} €</span>
                                    </div>
                                </>
                            )}

                            {/* Grand total */}
                            <div className="bg-brand-gradient rounded-2xl p-5 mt-3 flex justify-between items-center">
                                <div>
                                    <span className="block text-xs text-slate-400 uppercase tracking-wider font-bold">Gesamtpreis</span>
                                    <span className="text-sm text-slate-400">inkl. MwSt.{installNet > 0 || (isAgentOffer && selectedTier?.installationCostEUR) ? ' & Montage' : ''}</span>
                                </div>
                                <span className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tight">{fmtPrice(totalGross)} €</span>
                            </div>
                        </div>

                        {/* Validity */}
                        <p className="text-center text-sm text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                            {daysRemaining > 0 ? (
                                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>Gültig noch {daysRemaining} Tage</>
                            ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Abgelaufen — kontaktieren Sie uns</>
                            )}
                        </p>
                    </div>

                    {/* CTA buttons */}
                    <div className="px-6 pb-6 md:px-8 space-y-3">
                        <button
                            onClick={handleAcceptOffer}
                            disabled={accepting}
                            className="w-full py-4 bg-[#1E6FD9] text-white rounded-full font-semibold text-lg shadow-cta hover:bg-[#195FC0] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {accepting ? 'Wird bestätigt...' : 'Angebot annehmen'}
                        </button>
                        <button
                            onClick={handleScheduleMeasurement}
                            className="w-full py-3.5 bg-white border-2 border-[#E5E7EB] text-slate-700 rounded-full font-semibold text-base hover:border-[#1E6FD9]/40 hover:text-[#195FC0] transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Kostenloses Aufmaß vereinbaren
                        </button>
                    </div>
                </div>
                )}

                {/* ── CARD 3: Specification — only for non-agent offers ── */}
                {!isAgentOffer && (
                <div id="details">
                    {hasEmbeddedVariants && embeddedVariants[activeVariantIdx] && (() => {
                        const v = embeddedVariants[activeVariantIdx];
                        return (
                            <div className="bg-brand-gradient text-white rounded-2xl px-6 py-5 mb-6 flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black">{activeVariantIdx + 1}</span>
                                    <div>
                                        <p className="font-bold text-base">{toCustomerLabel(v.label)}</p>
                                        <p className="text-slate-400 text-sm mt-0.5">{toCustomerLabel(v.modelName)}{v.width ? ` · ${v.width}×${v.projection} mm` : ''}</p>
                                    </div>
                                </div>
                                {(v.pricing?.sellingPriceGross || 0) > 0 && (
                                    <p className="text-2xl font-black tabular-nums">{fmtPrice(v.pricing.sellingPriceGross)} €</p>
                                )}
                            </div>
                        );
                    })()}

                    <OfferSpecification product={{
                        ...offer.product,
                        numberOfPosts: offer.pricing?.numberOfPosts,
                        numberOfFields: offer.pricing?.numberOfFields
                    }} pricing={offer.pricing} />
                </div>
                )}

                {/* ── CARD 4: Attachments ── */}
                {((offer as any).attachments?.length > 0) && (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card p-6 md:p-8">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2.5 text-lg">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-400">
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
                                            if (offer?.id) OfferService.trackInteraction(offer.id, 'pdf_click', { attachment_type: att.type, name: att.name });
                                        }}
                                        className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left w-full"
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isImage ? 'bg-purple-50' : 'bg-red-50'}`}>
                                            {isPdf ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-red-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-purple-500"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-base text-slate-800 group-hover:text-slate-900">{label}</p>
                                            <p className="text-sm text-slate-400 truncate">{att.name}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewingAttachment && (
                    <AttachmentLightbox
                        attachment={viewingAttachment}
                        allAttachments={(offer as any)?.attachments || []}
                        onClose={() => setViewingAttachment(null)}
                        onNavigate={(att) => setViewingAttachment(att)}
                    />
                )}

                {/* ── Model Advantages — only for non-agent offers ── */}
                {!isAgentOffer && <ModelAdvantagesSection modelId={offer.product.modelId} />}

                {/* ── Trust Badges — only for non-agent offers (BotOfferView has its own) ── */}
                {!isAgentOffer && <TrustSection />}

                {/* ── Upsell Section — only for non-agent offers ── */}
                {!isAgentOffer && <UpsellSection offer={offer} />}

                {/* ── CARD 5: Your Advisor — shown for non-agent; agent gets it earlier ── */}
                {!isAgentOffer && (
                    offer.creator 
                        ? <CreatorProfileSection creator={offer.creator} />
                        : <SalesTeamSection />
                )}

                {/* ── Timeline & FAQ — only standalone for non-agent (agent gets them in 2-col grid above) ── */}
                {!isAgentOffer && <TimelineSection />}
                {!isAgentOffer && <FAQSection />}

                {/* ── CARD 6: Contact Form ── */}
                <div id="contact-form" className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card overflow-hidden scroll-mt-20">
                    <div className="px-6 py-4 md:px-8 border-b border-slate-100 flex items-center gap-2.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-[#1E6FD9]">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-800">Fragen zum Angebot?</h3>
                            <p className="text-[11px] text-slate-400">Ihre Nachricht wird direkt an Ihren Berater weitergeleitet</p>
                        </div>
                    </div>

                    {/* Wątek rozmowy — klient widzi też odpowiedzi Beratera */}
                    {offerThread.length > 0 && (
                        <div className="px-6 pt-5 md:px-8 space-y-2.5 max-h-72 overflow-y-auto">
                            {offerThread.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                                        msg.sender_type === 'client'
                                            ? 'bg-[#1E6FD9] text-white rounded-br-md'
                                            : 'bg-slate-100 text-slate-700 rounded-bl-md'
                                    }`}>
                                        <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${msg.sender_type === 'client' ? 'text-white/60' : 'text-slate-400'}`}>
                                            {msg.sender_type === 'client' ? 'Sie' : 'Ihr Berater'}
                                        </p>
                                        {msg.content}
                                        <p className={`text-[9px] mt-1 ${msg.sender_type === 'client' ? 'text-white/50' : 'text-slate-400'}`}>
                                            {new Date(msg.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="px-6 py-5 md:px-8">
                        {messageSent ? (
                            <div className="bg-emerald-50 text-emerald-700 p-5 rounded-xl text-center">
                                <p className="font-bold text-base flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    Nachricht gesendet
                                </p>
                                <p className="text-sm mt-1">{beraterName} meldet sich in Kürze bei Ihnen.</p>
                                <button onClick={() => setMessageSent(false)} className="text-sm underline mt-3 text-emerald-600 hover:text-emerald-800">Neue Nachricht schreiben</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendMessage}>
                                <textarea
                                    ref={messageRef}
                                    value={newMessage}
                                    onChange={e => { setNewMessage(e.target.value); if (sendError) setSendError(false); }}
                                    placeholder="Schreiben Sie hier Ihre Frage..."
                                    className="w-full p-4 bg-slate-50 border border-[#E5E7EB] rounded-xl mb-3 focus:ring-2 focus:ring-[#1E6FD9]/40 focus:border-[#1E6FD9] outline-none h-24 resize-none text-[14px] text-slate-700 placeholder:text-slate-300 transition-colors"
                                />
                                {/* Error microcopy (connection lost) */}
                                {sendError && (
                                    <p className="text-sm text-red-500 mb-2 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Verbindung unterbrochen. Bitte später erneut senden.
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={sending || newMessage.trim().length < MIN_MESSAGE_LENGTH}
                                    className="w-full py-3 bg-[#0A1628] text-white font-semibold rounded-xl hover:bg-[#1B2B44] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100 text-[14px] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-2"
                                >
                                    {sending ? `Sende an ${beraterName} …` : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Nachricht senden
                                        </>
                                    )}
                                </button>
                                {/* Disabled reason microcopy */}
                                {!sending && newMessage.trim().length < MIN_MESSAGE_LENGTH && (
                                    <p className="text-xs text-slate-400 text-center mt-2">Bitte mind. {MIN_MESSAGE_LENGTH} Zeichen eingeben</p>
                                )}
                            </form>
                        )}
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 md:px-8 flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#EAF2FE] rounded-full flex items-center justify-center text-[#1E6FD9] shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">{creatorName} direkt anrufen</p>
                            <a href={`tel:${creatorPhoneHref}`} className="font-bold text-slate-800 text-base hover:text-[#1E6FD9] transition-colors">{creatorPhoneDisplay}</a>
                        </div>
                    </div>
                </div>

            </main>

            {/* ═══════ FOOTER — Professional company info ═══════ */}
            <footer className="bg-brand-gradient border-t border-white/[0.06]">
                <div className={`${isAgentOffer ? 'max-w-[1280px]' : 'max-w-3xl'} mx-auto px-5 py-10 md:py-12`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Logo + Info */}
                        <div>
                            <img src="/polendach-logo.png" alt="Polendach24" className="h-8 w-auto object-contain mb-4 opacity-80" />
                            <p className="text-[12px] text-white/40 leading-relaxed max-w-sm">
                                Ihr Spezialist für Premium-Terrassenüberdachungen aus Aluminium — mit über 500 realisierten Projekten in ganz Deutschland.
                            </p>
                            <div className="flex items-center gap-4 mt-4">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/35">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-emerald-500/70"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                                    10 Jahre Garantie
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/35">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-amber-400/70"><path d="M12 2l2.4 7.2H22l-6 4.5 2.3 7.3L12 16.5 5.7 21l2.3-7.3-6-4.5h7.6z" fill="currentColor" opacity=".3" /><path d="M12 2l2.4 7.2H22l-6 4.5 2.3 7.3L12 16.5 5.7 21l2.3-7.3-6-4.5h7.6z" /></svg>
                                    4,9 ★ Google
                                </span>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-3">Kontakt</p>
                            <div className="space-y-2">
                                <a href="tel:+4935615019981" className="flex items-center gap-2 text-[12px] text-white/50 hover:text-white/80 transition-colors">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    03561 501 9981 / 82
                                </a>
                                <a href={`mailto:${creatorEmail}`} className="flex items-center gap-2 text-[12px] text-white/50 hover:text-white/80 transition-colors">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    buero@polendach24.de
                                </a>
                                <a href="https://wa.me/4935615019981" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[12px] text-[#25D366]/60 hover:text-[#25D366] transition-colors">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    WhatsApp
                                </a>
                                <p className="text-[11px] text-white/25 pt-1">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-white/20"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Kolonia Wałowice, 66-620 Gubin
                                </p>
                            </div>
                        </div>

                        {/* Company + Bank */}
                        <div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-3">Firmendaten</p>
                            <div className="space-y-1.5 text-[12px] text-white/40">
                                <p className="font-semibold text-white/55">Polendach24 s.c.</p>
                                <p>Geschäftsführung: Tomasz Fijołek, Mariusz Duź</p>
                                <p>Steuernummer: PL 926 169 5520</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/[0.06]">
                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Bankverbindung</p>
                                <div className="space-y-1 text-[12px] text-white/40">
                                    <p><span className="text-white/55 font-medium">Bank:</span> Sparkasse Spree-Neiße</p>
                                    <p><span className="text-white/55 font-medium">IBAN:</span> <span className="font-mono text-[11px]">DE79 1805 0000 0190 1228 89</span></p>
                                    <p><span className="text-white/55 font-medium">BIC:</span> <span className="font-mono text-[11px]">WELADED1CBN</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-[11px] text-white/30">
                            © {new Date().getFullYear()} Polendach24 s.c. · Alle Preise inkl. gesetzl. MwSt.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://polendach24.de/impressum" target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/30 hover:text-white/50 transition-colors">Impressum</a>
                            <a href="https://polendach24.de/datenschutz" target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/30 hover:text-white/50 transition-colors">Datenschutz</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ═══════ MOBILE STICKY CTA BAR — hidden for agent offers (BotOfferView has its own) ═══════ */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] ${isAgentOffer ? 'hidden' : ''}`}>
                <div className="flex items-center gap-3 p-3.5 max-w-md mx-auto">
                    <div className="flex-shrink-0 min-w-0">
                        {(() => {
                            if (isAgentOffer && selectedTier) {
                                return (
                                    <>
                                        <p className="text-[10px] text-[#1E6FD9] leading-none font-semibold truncate">{selectedTier.label}</p>
                                        <p className="text-lg font-black text-slate-800 leading-tight tabular-nums">{fmtPriceShort(selectedTier.totalGrossEUR)} € <span className="text-[10px] font-normal text-slate-400">brutto</span></p>
                                    </>
                                );
                            }
                            if (isAgentOffer && embeddedVariants.length > 0) {
                                const sorted = [...embeddedVariants].sort((a: any, b: any) => a.totalGrossEUR - b.totalGrossEUR);
                                return (
                                    <>
                                        <p className="text-[10px] text-[#1E6FD9] leading-none font-semibold">3 Pakete</p>
                                        <p className="text-base font-black text-slate-800 leading-tight tabular-nums">ab {fmtPriceShort(sorted[0].totalGrossEUR)} €</p>
                                    </>
                                );
                            }
                            return (
                                <>
                                    <p className="text-[10px] text-slate-400 leading-none tabular-nums">netto <span className="font-semibold text-slate-500">{fmtPriceShort(offer.pricing.sellingPriceNet)} €</span></p>
                                    <p className="text-lg font-black text-slate-800 leading-tight tabular-nums">{fmtPriceShort(offer.pricing.sellingPriceGross)} € <span className="text-[10px] font-normal text-slate-400">brutto</span></p>
                                </>
                            );
                        })()}
                    </div>
                    <a
                        href={`tel:${creatorPhoneHref}`}
                        className="p-2.5 bg-white border border-[#E5E7EB] rounded-full text-slate-500 shrink-0 hover:bg-slate-50 hover:text-[#1E6FD9] transition-colors"
                        title="Anrufen"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </a>
                    <button
                        onClick={handleAcceptOffer}
                        disabled={accepting}
                        className="flex-1 py-3 bg-[#1E6FD9] text-white rounded-full font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 shadow-cta hover:bg-[#195FC0] transition-all duration-300 active:scale-[0.98]"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {accepting ? 'Bestätigen...' : 'Annehmen'}
                    </button>
                </div>
            </div>

            {/* ═══════ ACCEPT CONFIRMATION OVERLAY ═══════ */}
            {showAcceptConfirm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAcceptConfirm(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#10B981] p-8 text-white text-center">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold">Vielen Dank!</h3>
                            <p className="text-green-100 text-sm mt-2">Angebot Nr. {offer.offerNumber}</p>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-700 text-lg mb-2 text-center font-semibold">
                                Wir haben Ihre Bestätigung erhalten.
                            </p>
                            <p className="text-slate-500 text-base mb-6 text-center leading-relaxed">
                                Unser Berater wird sich in Kürze bei Ihnen melden, um die nächsten Schritte zu besprechen.
                            </p>

                            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#EAF2FE] rounded-full flex items-center justify-center text-[#1E6FD9] shrink-0"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></div>
                                    <div>
                                        <p className="text-sm text-slate-400">{creatorName} anrufen</p>
                                        <a href={`tel:${creatorPhoneHref}`} className="font-bold text-slate-800 hover:text-[#1E6FD9]">{creatorPhoneDisplay}</a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                                    <div>
                                        <p className="text-sm text-slate-400">Per E-Mail</p>
                                        <a href={`mailto:${creatorEmail}`} className="font-bold text-slate-800 hover:text-[#1E6FD9]">{creatorEmail}</a>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAcceptConfirm(false)}
                                className="w-full py-3.5 bg-[#0A1628] text-white rounded-full font-semibold hover:bg-[#1B2B44] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-base"
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

