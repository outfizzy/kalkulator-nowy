import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfferService } from '../services/database/offer.service';
import { LeadService } from '../services/database/lead.service';
import type { Offer } from '../types';
import { generateOfferPDF } from '../utils/pdfGenerator';
import { toast } from 'react-hot-toast';
import { TrustSection } from '../components/public-offer/TrustSection';
import { UpsellSection } from '../components/public-offer/UpsellSection';
import { TimelineSection } from '../components/public-offer/TimelineSection';
import { OfferHero } from '../components/public-offer/OfferHero';
import { OfferSpecification } from '../components/public-offer/OfferSpecification';
import { CreatorProfileSection } from '../components/public-offer/CreatorProfileSection';
import { MeasurementRequestModal } from '../components/public-offer/MeasurementRequestModal';

import { FAQSection } from '../components/public-offer/FAQSection';

export const PublicOfferPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [messageSent, setMessageSent] = useState(false);
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);

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
                // Track message interaction
                if (offer?.id) {
                    OfferService.trackInteraction(offer.id, 'message_sent', { messagePreview: newMessage.substring(0, 100) });
                }
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

    const handleDownloadPDF = async () => {
        if (!token) return;
        // Track offer acceptance - this links to the lead for CRM visibility
        if (offer?.id) {
            OfferService.trackInteraction(offer.id, 'offer_accept', {
                action: 'pdf_download',
                timestamp: new Date().toISOString()
            }).catch(err => console.error('Failed to track offer acceptance', err));
        }
        // Open the beautiful HTML Print View
        window.open(`/print/offer/${token}`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!offer) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Angebot nicht gefunden</h1>
                    <p className="text-slate-600">Der Link ist möglicherweise ungültig oder abgelaufen.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24 lg:pb-0">
            {/* Dark Premium Header */}
            <header className="bg-slate-900 shadow-lg sticky top-0 z-40 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo */}
                        <img
                            src="/polendach-logo.png"
                            alt="PolenDach24"
                            className="h-8 md:h-10 w-auto object-contain"
                        />
                    </div>

                    {/* Desktop CTA */}
                    <button
                        onClick={handleDownloadPDF}
                        className="hidden md:flex px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors items-center gap-2 font-bold shadow-md shadow-blue-900/50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        PDF Herunterladen
                    </button>

                    {/* Mobile Menu Icon (Placeholder for now, keeping it simple) */}
                    <button className="md:hidden text-white" onClick={handleDownloadPDF}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">

                {/* Hero Section */}
                <OfferHero
                    product={offer.product}
                    customerName={offer.customer.firstName}
                    offerNumber={offer.offerNumber}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Trust Badges */}
                        <TrustSection />

                        {/* Full Specification */}
                        <div id="details">
                            <OfferSpecification product={offer.product} />
                        </div>

                        {/* FAQ Section */}
                        <FAQSection />

                        {/* Upselling */}
                        <UpsellSection offer={offer} />

                    </div>

                    {/* RIGHT COLUMN: Sidebar (Sticky) */}
                    <div className="space-y-6">
                        <div className="lg:sticky lg:top-24 space-y-6">

                            {/* Creator Profile (if available) */}
                            {offer.creator && (
                                <CreatorProfileSection creator={offer.creator} />
                            )}

                            {/* Price & Action Card */}
                            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-6 -mt-6"></div>

                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 relative z-10">Zusammenfassung</h3>

                                <div className="space-y-3 mb-8 relative z-10">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-500">Nettopreis</span>
                                        <span className="font-semibold text-lg">{offer.pricing.sellingPriceNet.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pb-4 border-b border-slate-100">
                                        <span className="text-slate-500">MwSt. (19%)</span>
                                        <span className="font-semibold text-slate-600">{(offer.pricing.sellingPriceGross - offer.pricing.sellingPriceNet).toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-2">
                                        <span className="text-xl font-bold text-slate-800">Gesamtpreis</span>
                                        <span className="text-4xl font-bold text-blue-600">{offer.pricing.sellingPriceGross.toFixed(2)} €</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 hover:from-yellow-400 hover:to-yellow-500 transition-all transform hover:-translate-y-0.5 mb-4"
                                >
                                    Angebot Akzeptieren
                                </button>

                                <button
                                    onClick={() => setIsMeasurementModalOpen(true)}
                                    className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all mb-4 flex items-center justify-center gap-2"
                                >
                                    📏 Aufmaß vereinbaren
                                </button>

                                <p className="text-xs text-center text-slate-400">
                                    Mit Klick auf den Button laden Sie das PDF herunter.<br />Bitte unterschrieben zurücksenden.
                                </p>
                            </div>

                            {/* Timeline */}
                            <TimelineSection />

                            {/* Contact Box */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Fragen zum Angebot?</h3>

                                {messageSent ? (
                                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
                                        <p className="font-bold">Nachricht gesendet!</p>
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
                                            className="w-full py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            {sending ? 'Senden...' : 'Nachricht senden'}
                                        </button>
                                    </form>
                                )}

                                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                        📞
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Rufen Sie uns an</p>
                                        <p className="font-bold text-slate-800 text-lg">03561 501 9981</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] flex items-center gap-3">
                <div className="flex-1">
                    <p className="text-xs text-slate-500">Gesamtpreis</p>
                    <p className="text-lg font-bold text-slate-800">{offer.pricing.sellingPriceGross.toFixed(0)} €</p>
                </div>
                <button
                    onClick={() => setIsMeasurementModalOpen(true)}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600"
                >
                    📏
                </button>
                <button
                    onClick={handleDownloadPDF}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
                >
                    Akzeptieren
                </button>
            </div>

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
