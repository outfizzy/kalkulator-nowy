/**
 * B2B Offers Page
 * Partner page for managing offers with filtering, actions, and detail view
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BOffer } from '../../services/database/b2b.service';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { color: string; icon: string }> = {
    draft: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: '📝' },
    saved: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '💾' },
    accepted: { color: 'bg-green-100 text-green-700 border-green-300', icon: '✅' },
    expired: { color: 'bg-red-100 text-red-700 border-red-300', icon: '⏰' },
    cancelled: { color: 'bg-gray-100 text-gray-500 border-gray-300', icon: '🚫' }
};

type FilterType = 'all' | 'draft' | 'saved' | 'accepted';

import { useTranslation } from '../../contexts/TranslationContext';

export function B2BOffersPage() {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const [offers, setOffers] = useState<B2BOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOffer, setSelectedOffer] = useState<B2BOffer | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadOffers();
    }, []);

    async function loadOffers() {
        setLoading(true);
        try {
            const partner = await B2BService.getCurrentPartner();
            if (partner) {
                const data = await B2BService.getOffers(partner.id);
                setOffers(data);
            }
        } catch (err) {
            console.error('Error loading offers:', err);
            toast.error('Fehler beim Laden der Angebote');
        }
        setLoading(false);
    }

    async function handleAcceptOffer(offerId: string) {
        if (!confirm('Angebot akzeptieren und Bestellung aufgeben?')) return;

        setProcessing(true);
        try {
            await B2BService.acceptOffer(offerId);
            toast.success('Bestellung erfolgreich erstellt!');
            await loadOffers();
            navigate('/b2b/orders');
        } catch (err: any) {
            console.error('Error accepting offer:', err);
            toast.error(err.message || 'Fehler beim Erstellen der Bestellung');
        }
        setProcessing(false);
    }

    async function handleDeleteOffer(offerId: string) {
        if (!confirm('Angebot wirklich löschen?')) return;

        try {
            await B2BService.deleteOffer(offerId);
            toast.success('Angebot gelöscht');
            await loadOffers();
            setSelectedOffer(null);
        } catch (err) {
            console.error('Error deleting offer:', err);
            toast.error('Fehler beim Löschen');
        }
    }

    async function handleDuplicate(offer: B2BOffer) {
        try {
            const partner = await B2BService.getCurrentPartner();
            if (!partner) return;

            const newOffer = await B2BService.createOffer({
                partner_id: partner.id,
                created_by: null,
                reference_number: null,
                customer_name: offer.customer_name ? `${offer.customer_name} (Kopie)` : null,
                customer_contact: offer.customer_contact,
                items: offer.items,
                notes: offer.notes,
                base_total: offer.base_total,
                partner_total: offer.partner_total,
                currency: offer.currency,
                status: 'draft',
                valid_until: null
            });

            toast.success('Angebot dupliziert');
            await loadOffers();
        } catch (err) {
            console.error('Error duplicating offer:', err);
            toast.error('Fehler beim Duplizieren');
        }
    }

    // Filter and search
    const filteredOffers = offers
        .filter(o => filter === 'all' || o.status === filter)
        .filter(o =>
            !searchTerm ||
            o.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const counts = {
        all: offers.length,
        draft: offers.filter(o => o.status === 'draft').length,
        saved: offers.filter(o => o.status === 'saved').length,
        accepted: offers.filter(o => o.status === 'accepted').length
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        📋 {t('b2b.offers.title')}
                    </h1>
                    <p className="text-gray-500 mt-1">{t('b2b.offers.subtitle')}</p>
                </div>
                <Link
                    to="/b2b/calculator"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    ➕ {t('b2b.offers.createFirst')}
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['all', 'draft', 'saved', 'accepted'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {f === 'all' && `Alle (${counts.all})`}
                            {f === 'draft' && `Entwürfe (${counts.draft})`}
                            {f === 'saved' && `Gespeichert (${counts.saved})`}
                            {f === 'accepted' && `Akzeptiert (${counts.accepted})`}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`🔍 ${t('b2b.offers.searchPlaceholder')}`}
                        className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Lade Angebote...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Offers List */}
                    <div className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-800">
                                {filteredOffers.length} Angebote
                            </h2>
                        </div>
                        <div className="divide-y max-h-[700px] overflow-y-auto">
                            {filteredOffers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>{t('b2b.offers.noOffers')}</p>
                                    <Link to="/b2b/calculator" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                                        {t('b2b.offers.createFirst')} →
                                    </Link>
                                </div>
                            ) : (
                                filteredOffers.map(offer => (
                                    <div
                                        key={offer.id}
                                        onClick={() => setSelectedOffer(offer)}
                                        className={`p-4 cursor-pointer transition-colors ${selectedOffer?.id === offer.id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-semibold text-gray-900">
                                                    {offer.reference_number || 'Entwurf'}
                                                </span>
                                                {offer.customer_name && (
                                                    <p className="text-sm text-gray-500">{offer.customer_name}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium border ${STATUS_STYLES[offer.status]?.color}`}>
                                                {STATUS_STYLES[offer.status]?.icon} {t(`statuses.${offer.status}`)}
                                            </span>
                                            {(offer.status === 'draft' || offer.status === 'saved') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAcceptOffer(offer.id);
                                                    }}
                                                    className="ml-2 p-1 text-green-600 hover:bg-green-100 rounded-full"
                                                    title={t('b2b.offers.orderNow')}
                                                >
                                                    🛒
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">
                                                {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: de })}
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                €{offer.partner_total.toLocaleString()}
                                            </span>
                                        </div>
                                        {offer.items?.length > 0 && (
                                            <div className="mt-2 text-xs text-gray-400">
                                                {offer.items.length} Position(en)
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Offer Detail */}
                    <div className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-sm border min-h-[700px]">
                        {selectedOffer ? (
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6 pb-4 border-b">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {selectedOffer.reference_number || 'Entwurf'}
                                        </h2>
                                        {selectedOffer.customer_name && (
                                            <p className="text-gray-500">{selectedOffer.customer_name}</p>
                                        )}
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLES[selectedOffer.status]?.color}`}>
                                            {STATUS_STYLES[selectedOffer.status]?.icon} {t(`statuses.${selectedOffer.status}`)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-gray-900">
                                            €{selectedOffer.partner_total.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {format(new Date(selectedOffer.created_at), 'dd.MM.yyyy HH:mm')}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {['saved', 'draft'].includes(selectedOffer.status) && (
                                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                        <h3 className="font-semibold text-blue-800 mb-3">✅ {t('b2b.offers.readyToOrder')}</h3>
                                        <button
                                            onClick={() => handleAcceptOffer(selectedOffer.id)}
                                            disabled={processing}
                                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2"
                                        >
                                            🛒 {t('b2b.offers.orderNow')}
                                        </button>
                                    </div>
                                )}

                                {/* Products */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-gray-700 mb-3">📦 {t('b2b.offers.positions')}</h4>
                                    {selectedOffer.items?.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedOffer.items.map((item, idx) => (
                                                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-medium text-gray-900">
                                                                {item.product_name}
                                                            </span>
                                                            {item.variant && (
                                                                <span className="ml-2 text-gray-500">({item.variant})</span>
                                                            )}
                                                            {item.dimensions && (
                                                                <p className="text-sm text-gray-500 mt-1">
                                                                    {item.dimensions.width}mm × {item.dimensions.projection}mm
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-gray-900">
                                                                €{item.partner_price?.toLocaleString()}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Menge: {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400">Keine Positionen</p>
                                    )}
                                </div>

                                {/* Customer Contact */}
                                {selectedOffer.customer_contact && Object.keys(selectedOffer.customer_contact).length > 0 && (
                                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-2">👤 {t('b2b.offers.customerContact')}</h4>
                                        {selectedOffer.customer_contact.email && (
                                            <p className="text-sm text-gray-600">📧 {selectedOffer.customer_contact.email}</p>
                                        )}
                                        {selectedOffer.customer_contact.phone && (
                                            <p className="text-sm text-gray-600">📞 {selectedOffer.customer_contact.phone}</p>
                                        )}
                                        {selectedOffer.customer_contact.address && (
                                            <p className="text-sm text-gray-600">📍 {selectedOffer.customer_contact.address}</p>
                                        )}
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedOffer.notes && (
                                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <h4 className="font-medium text-yellow-800 mb-1">📝 {t('b2b.offers.notes')}</h4>
                                        <p className="text-yellow-700 text-sm">{selectedOffer.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t">
                                    <button
                                        onClick={() => handleDuplicate(selectedOffer)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                                    >
                                        📋 Duplizieren
                                    </button>
                                    {selectedOffer.status === 'draft' && (
                                        <Link
                                            to={`/b2b/calculator?edit=${selectedOffer.id}`}
                                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                        >
                                            ✏️ Bearbeiten
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => handleDeleteOffer(selectedOffer.id)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                                    >
                                        🗑️ Löschen
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                                <div className="text-6xl mb-6 opacity-20">👈</div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">{t('b2b.offers.selectOffer')}</h3>
                                <p>{t('b2b.offers.selectOfferDesc')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BOffersPage;
