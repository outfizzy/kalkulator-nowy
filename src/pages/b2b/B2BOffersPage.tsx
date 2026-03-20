/**
 * B2B Offers Page — Polish version with PDF generation
 * Partner page for managing offers with filtering, actions, detail view, and PDF export
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BOffer, B2BPartner } from '../../services/database/b2b.service';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { color: string; icon: string; label: string }> = {
    draft: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: '📝', label: 'Szkic' },
    saved: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '💾', label: 'Zapisana' },
    accepted: { color: 'bg-green-100 text-green-700 border-green-300', icon: '✅', label: 'Zaakceptowana' },
    expired: { color: 'bg-red-100 text-red-700 border-red-300', icon: '⏰', label: 'Wygasła' },
    cancelled: { color: 'bg-gray-100 text-gray-500 border-gray-300', icon: '🚫', label: 'Anulowana' }
};

type FilterType = 'all' | 'draft' | 'saved' | 'accepted';

// === PDF GENERATION ===
const PDF_LABELS = {
    de: {
        title: 'ANGEBOT', nr: 'Nr', date: 'Datum', validUntil: 'Gültig bis',
        customer: 'Kundendaten', pos: 'Pos.', product: 'Produkt', qty: 'Menge',
        price: 'Netto-Preis', total: 'Gesamt netto', notes: 'Anmerkungen',
        footer1: 'Angebot erstellt über das B2B-Portal',
        footer2: 'Alle Preise netto, zzgl. MwSt.',
        docTitle: 'Angebot'
    },
    pl: {
        title: 'OFERTA', nr: 'Nr', date: 'Data', validUntil: 'Ważna do',
        customer: 'Dane klienta', pos: 'Lp.', product: 'Produkt', qty: 'Ilość',
        price: 'Cena netto', total: 'Razem netto', notes: 'Uwagi',
        footer1: 'Oferta wygenerowana z portalu B2B',
        footer2: 'Ceny netto, nie zawierają podatku VAT',
        docTitle: 'Oferta'
    }
};

async function generateOfferPDF(offer: B2BOffer, partner: B2BPartner, lang: 'de' | 'pl' = 'de') {
    const L = PDF_LABELS[lang];
    // Build print-ready HTML with partner logo
    const logoHtml = partner.logo_url
        ? `<img src="${partner.logo_url}" alt="Logo" style="max-height:60px;max-width:200px;object-fit:contain;" crossorigin="anonymous" />`
        : '';

    const itemsHtml = (offer.items || []).map((item, idx) => `
        <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">${idx + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;">
                <strong style="font-size:13px;">${item.product_name || ''}</strong>
                ${item.variant ? `<br/><span style="font-size:11px;color:#666;">${item.variant}</span>` : ''}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.quantity || 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;">€${(item.partner_price || item.base_price || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');

    const customerHtml = offer.customer_name ? `
        <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <h3 style="margin:0 0 8px 0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${L.customer}</h3>
            <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${offer.customer_name}</p>
            ${offer.customer_contact?.email ? `<p style="margin:4px 0 0;font-size:12px;color:#475569;">📧 ${offer.customer_contact.email}</p>` : ''}
            ${offer.customer_contact?.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#475569;">📞 ${offer.customer_contact.phone}</p>` : ''}
            ${offer.customer_contact?.address ? `<p style="margin:2px 0 0;font-size:12px;color:#475569;">📍 ${offer.customer_contact.address}</p>` : ''}
        </div>
    ` : '';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${L.docTitle} ${offer.reference_number || ''}</title>
        <style>
            @page { margin: 20mm 15mm; size: A4; }
            body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1e293b; margin: 0; padding: 0; }
            * { box-sizing: border-box; }
        </style>
    </head>
    <body>
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;">
            <div>
                ${logoHtml}
                <h2 style="margin:8px 0 0;font-size:14px;color:#475569;">${partner.company_name}</h2>
                ${partner.address?.street ? `<p style="margin:2px 0;font-size:11px;color:#94a3b8;">${partner.address.street}, ${partner.address.zip || ''} ${partner.address.city || ''}</p>` : ''}
                ${partner.contact_email ? `<p style="margin:2px 0;font-size:11px;color:#94a3b8;">${partner.contact_email}</p>` : ''}
                ${partner.contact_phone ? `<p style="margin:2px 0;font-size:11px;color:#94a3b8;">${partner.contact_phone}</p>` : ''}
            </div>
            <div style="text-align:right;">
                <h1 style="margin:0;font-size:24px;color:#1e40af;">${L.title}</h1>
                <p style="margin:4px 0;font-size:12px;color:#64748b;">${L.nr}: <strong>${offer.reference_number || '—'}</strong></p>
                <p style="margin:2px 0;font-size:12px;color:#64748b;">${L.date}: ${format(new Date(offer.created_at), 'dd.MM.yyyy')}</p>
                ${offer.valid_until ? `<p style="margin:2px 0;font-size:12px;color:#64748b;">${L.validUntil}: ${format(new Date(offer.valid_until), 'dd.MM.yyyy')}</p>` : ''}
            </div>
        </div>

        ${customerHtml}

        <!-- Products Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;width:40px;">${L.pos}</th>
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;">${L.product}</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;width:60px;">${L.qty}</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;width:100px;">${L.price}</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <!-- Total -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
            <div style="background:#1e40af;color:white;padding:16px 24px;border-radius:10px;text-align:right;min-width:200px;">
                <div style="font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${L.total}</div>
                <div style="font-size:24px;font-weight:700;">€${offer.partner_total.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div>
            </div>
        </div>

        ${offer.notes ? `
        <div style="margin-bottom:24px;padding:14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
            <h3 style="margin:0 0 6px 0;font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:1px;">${L.notes}</h3>
            <p style="margin:0;font-size:13px;color:#78350f;">${offer.notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
            <p style="margin:0;">${L.footer1} • ${partner.company_name}</p>
            <p style="margin:4px 0 0;">${L.footer2}</p>
        </div>
    </body>
    </html>`;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        toast.error('Zezwól na wyskakujące okna aby pobrać PDF');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for images and then print
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

export function B2BOffersPage() {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<B2BOffer[]>([]);
    const [partner, setPartner] = useState<B2BPartner | null>(null);
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
            const p = await B2BService.getCurrentPartner();
            setPartner(p);
            if (p) {
                const data = await B2BService.getOffers(p.id);
                setOffers(data);
            }
        } catch (err) {
            console.error('Error loading offers:', err);
            toast.error('Błąd ładowania ofert');
        }
        setLoading(false);
    }

    async function handleAcceptOffer(offerId: string) {
        if (!confirm('Zaakceptować ofertę i złożyć zamówienie?')) return;

        setProcessing(true);
        try {
            await B2BService.acceptOffer(offerId);
            toast.success('Zamówienie złożone pomyślnie!');
            await loadOffers();
            navigate('/b2b/orders');
        } catch (err: any) {
            console.error('Error accepting offer:', err);
            toast.error(err.message || 'Błąd składania zamówienia');
        }
        setProcessing(false);
    }

    async function handleDeleteOffer(offerId: string) {
        if (!confirm('Na pewno usunąć tę ofertę?')) return;

        try {
            await B2BService.deleteOffer(offerId);
            toast.success('Oferta usunięta');
            await loadOffers();
            setSelectedOffer(null);
        } catch (err) {
            console.error('Error deleting offer:', err);
            toast.error('Błąd usuwania');
        }
    }

    async function handleDuplicate(offer: B2BOffer) {
        try {
            if (!partner) return;

            await B2BService.createOffer({
                partner_id: partner.id,
                created_by: null,
                reference_number: null,
                customer_name: offer.customer_name ? `${offer.customer_name} (kopia)` : null,
                customer_contact: offer.customer_contact,
                items: offer.items,
                notes: offer.notes,
                base_total: offer.base_total,
                partner_total: offer.partner_total,
                currency: offer.currency,
                status: 'draft',
                valid_until: null
            });

            toast.success('Oferta zduplikowana');
            await loadOffers();
        } catch (err) {
            console.error('Error duplicating offer:', err);
            toast.error('Błąd duplikowania');
        }
    }

    function handleDownloadPDF(offer: B2BOffer, lang: 'de' | 'pl' = 'de') {
        if (!partner) {
            toast.error('Nie znaleziono danych partnera');
            return;
        }
        generateOfferPDF(offer, partner, lang);
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

    const FILTER_LABELS: Record<FilterType, string> = {
        all: 'Wszystkie',
        draft: 'Szkice',
        saved: 'Zapisane',
        accepted: 'Zaakceptowane'
    };

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        📋 Moje oferty
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage, przeglądaj i pobieraj oferty</p>
                </div>
                <Link
                    to="/b2b/calculator"
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm shadow-sm"
                >
                    ➕ Nowa oferta
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                            {FILTER_LABELS[f]} ({counts[f]})
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="🔍 Szukaj po nazwie klienta lub numerze..."
                        className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
                    Ładowanie ofert...
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Offers List */}
                    <div className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-800 text-sm">
                                {filteredOffers.length} {filteredOffers.length === 1 ? 'oferta' : 'ofert'}
                            </h2>
                        </div>
                        <div className="divide-y max-h-[700px] overflow-y-auto">
                            {filteredOffers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>Brak ofert</p>
                                    <Link to="/b2b/calculator" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                                        Utwórz pierwszą ofertę →
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
                                                <span className="font-semibold text-gray-900 text-sm">
                                                    {offer.reference_number || 'Szkic'}
                                                </span>
                                                {offer.customer_name && (
                                                    <p className="text-xs text-gray-500">{offer.customer_name}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${STATUS_STYLES[offer.status]?.color}`}>
                                                {STATUS_STYLES[offer.status]?.icon} {STATUS_STYLES[offer.status]?.label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">
                                                {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: pl })}
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                €{offer.partner_total.toLocaleString()}
                                            </span>
                                        </div>
                                        {offer.items?.length > 0 && (
                                            <div className="mt-1.5 text-xs text-gray-400">
                                                {offer.items.length} {offer.items.length === 1 ? 'pozycja' : 'pozycji'}
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
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {selectedOffer.reference_number || 'Szkic'}
                                        </h2>
                                        {selectedOffer.customer_name && (
                                            <p className="text-gray-500 text-sm">{selectedOffer.customer_name}</p>
                                        )}
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[selectedOffer.status]?.color}`}>
                                            {STATUS_STYLES[selectedOffer.status]?.icon} {STATUS_STYLES[selectedOffer.status]?.label}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900">
                                            €{selectedOffer.partner_total.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {format(new Date(selectedOffer.created_at), 'dd.MM.yyyy HH:mm')}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                {['saved', 'draft'].includes(selectedOffer.status) && (
                                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-blue-800 text-sm">✅ Oferta gotowa do zamówienia</h3>
                                            <p className="text-xs text-blue-600 mt-0.5">Zaakceptuj ofertę aby złożyć zamówienie</p>
                                        </div>
                                        <button
                                            onClick={() => handleAcceptOffer(selectedOffer.id)}
                                            disabled={processing}
                                            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                                        >
                                            🛒 Zamów
                                        </button>
                                    </div>
                                )}

                                {/* Products */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-gray-700 text-sm mb-3">📦 Pozycje oferty</h4>
                                    {selectedOffer.items?.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedOffer.items.map((item, idx) => (
                                                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-medium text-gray-900 text-sm">
                                                                {item.product_name}
                                                            </span>
                                                            {item.variant && (
                                                                <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-gray-900 text-sm">
                                                                €{(item.partner_price || item.base_price || 0).toLocaleString()}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Ilość: {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm">Brak pozycji</p>
                                    )}
                                </div>

                                {/* Customer Contact */}
                                {selectedOffer.customer_contact && Object.keys(selectedOffer.customer_contact).length > 0 && (
                                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-700 text-sm mb-2">👤 Dane klienta</h4>
                                        {selectedOffer.customer_contact.email && (
                                            <p className="text-xs text-gray-600">📧 {selectedOffer.customer_contact.email}</p>
                                        )}
                                        {selectedOffer.customer_contact.phone && (
                                            <p className="text-xs text-gray-600">📞 {selectedOffer.customer_contact.phone}</p>
                                        )}
                                        {selectedOffer.customer_contact.address && (
                                            <p className="text-xs text-gray-600">📍 {selectedOffer.customer_contact.address}</p>
                                        )}
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedOffer.notes && (
                                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <h4 className="font-medium text-yellow-800 text-xs mb-1">📝 Uwagi</h4>
                                        <p className="text-yellow-700 text-sm">{selectedOffer.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 pt-4 border-t">
                                    <button
                                        onClick={() => handleDownloadPDF(selectedOffer, 'de')}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-1.5"
                                    >
                                        📄 PDF (DE)
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPDF(selectedOffer, 'pl')}
                                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium flex items-center gap-1.5"
                                    >
                                        📄 PDF (PL)
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(selectedOffer)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                                    >
                                        📋 Duplikuj
                                    </button>
                                    {selectedOffer.status === 'draft' && (
                                        <Link
                                            to={`/b2b/calculator?edit=${selectedOffer.id}`}
                                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                        >
                                            ✏️ Edytuj
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => handleDeleteOffer(selectedOffer.id)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                                    >
                                        🗑️ Usuń
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                                <div className="text-6xl mb-6 opacity-20">👈</div>
                                <h3 className="text-lg font-medium text-gray-600 mb-1">Wybierz ofertę</h3>
                                <p className="text-sm">Kliknij ofertę z listy aby zobaczyć szczegóły</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BOffersPage;
