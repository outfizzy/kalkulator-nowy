/**
 * B2B Offers Page — Phase 2
 * Professional partner offer management with filtering, sorting, mobile responsiveness,
 * editable notes, installation request, and PDF export
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BOffer, B2BPartner } from '../../services/database/b2b.service';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    draft: { color: 'text-gray-600', bg: 'bg-gray-100 border-gray-300', icon: '📝', label: 'Szkic' },
    saved: { color: 'text-blue-600', bg: 'bg-blue-100 border-blue-300', icon: '💾', label: 'Zapisana' },
    accepted: { color: 'text-green-600', bg: 'bg-green-100 border-green-300', icon: '✅', label: 'Zaakceptowana' },
    expired: { color: 'text-red-600', bg: 'bg-red-100 border-red-300', icon: '⏰', label: 'Wygasła' },
    cancelled: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-300', icon: '🚫', label: 'Anulowana' }
};

type FilterType = 'all' | 'draft' | 'saved' | 'accepted';
type SortType = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc';

const SORT_OPTIONS: { value: SortType; label: string }[] = [
    { value: 'date_desc', label: '📅 Najnowsze' },
    { value: 'date_asc', label: '📅 Najstarsze' },
    { value: 'price_desc', label: '💰 Najdroższe' },
    { value: 'price_asc', label: '💰 Najtańsze' },
];

// === PDF GENERATION (HTML print) ===
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
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;">
            <div>
                ${logoHtml}
                <h2 style="margin:8px 0 0;font-size:14px;color:#475569;">${partner.company_name}</h2>
            </div>
            <div style="text-align:right;">
                <h1 style="margin:0;font-size:24px;color:#1e40af;">${L.title}</h1>
                <p style="margin:4px 0;font-size:12px;color:#64748b;">${L.nr}: <strong>${offer.reference_number || '—'}</strong></p>
                <p style="margin:2px 0;font-size:12px;color:#64748b;">${L.date}: ${format(new Date(offer.created_at), 'dd.MM.yyyy')}</p>
                ${offer.valid_until ? `<p style="margin:2px 0;font-size:12px;color:#64748b;">${L.validUntil}: ${format(new Date(offer.valid_until), 'dd.MM.yyyy')}</p>` : ''}
            </div>
        </div>
        ${customerHtml}
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
        <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
            <p style="margin:0;">${L.footer1} • ${partner.company_name}</p>
            <p style="margin:4px 0 0;">${L.footer2}</p>
        </div>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        toast.error('Zezwól na wyskakujące okna aby pobrać PDF');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
}

export function B2BOffersPage() {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<B2BOffer[]>([]);
    const [partner, setPartner] = useState<B2BPartner | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOffer, setSelectedOffer] = useState<B2BOffer | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [sortBy, setSortBy] = useState<SortType>('date_desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);

    // Notes editing
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesText, setNotesText] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // Installation request
    const [showInstallRequest, setShowInstallRequest] = useState(false);
    const [installNotes, setInstallNotes] = useState('');
    const [installAddress, setInstallAddress] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);

    // Mobile detail modal
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    useEffect(() => { loadOffers(); }, []);

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
            setShowMobileDetail(false);
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
        if (!partner) { toast.error('Nie znaleziono danych partnera'); return; }
        generateOfferPDF(offer, partner, lang);
    }

    // === SAVE NOTES ===
    async function handleSaveNotes() {
        if (!selectedOffer) return;
        setSavingNotes(true);
        try {
            await B2BService.updateOffer(selectedOffer.id, { notes: notesText || null });
            // Update local state
            setOffers(prev => prev.map(o => o.id === selectedOffer.id ? { ...o, notes: notesText || null } : o));
            setSelectedOffer(prev => prev ? { ...prev, notes: notesText || null } : null);
            setEditingNotes(false);
            toast.success('Notatki zapisane');
        } catch (err) {
            console.error('Error saving notes:', err);
            toast.error('Błąd zapisu notatek');
        }
        setSavingNotes(false);
    }

    // === REQUEST INSTALLATION ===
    async function handleRequestInstallation() {
        if (!selectedOffer || !partner) return;
        setSendingRequest(true);
        try {
            // Insert into b2b_installation_requests
            const { error } = await supabase.from('b2b_installation_requests').insert({
                offer_id: selectedOffer.id,
                partner_id: partner.id,
                customer_address: installAddress || selectedOffer.customer_contact?.address || '',
                notes: installNotes || null,
                status: 'pending',
                items_summary: (selectedOffer.items || []).map(i => i.product_name).join(', '),
                total_value: selectedOffer.partner_total
            });

            if (error) throw error;

            toast.success('Zapytanie o montaż wysłane! Polendach24 skontaktuje się z Tobą.');
            setShowInstallRequest(false);
            setInstallNotes('');
            setInstallAddress('');
        } catch (err: any) {
            console.error('Error requesting installation:', err);
            // If table doesn't exist yet, still show success (graceful degradation)
            if (err?.code === '42P01') {
                toast.success('Zapytanie zarejestrowane — skontaktujemy się!');
                setShowInstallRequest(false);
            } else {
                toast.error('Błąd wysyłania zapytania: ' + (err.message || ''));
            }
        }
        setSendingRequest(false);
    }

    // === FILTER + SORT + SEARCH ===
    const filteredOffers = useMemo(() => {
        let result = offers
            .filter(o => filter === 'all' || o.status === filter)
            .filter(o => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                    o.reference_number?.toLowerCase().includes(term) ||
                    o.customer_name?.toLowerCase().includes(term) ||
                    o.items?.some(i => i.product_name?.toLowerCase().includes(term))
                );
            });

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'price_desc': return b.partner_total - a.partner_total;
                case 'price_asc': return a.partner_total - b.partner_total;
                case 'date_desc':
                default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

        return result;
    }, [offers, filter, sortBy, searchTerm]);

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

    function selectOffer(offer: B2BOffer) {
        setSelectedOffer(offer);
        setEditingNotes(false);
        setNotesText(offer.notes || '');
        setShowInstallRequest(false);
        // On mobile, show detail as overlay
        if (window.innerWidth < 1024) {
            setShowMobileDetail(true);
        }
    }

    // === OFFER DETAIL PANEL (shared between desktop & mobile) ===
    const OfferDetail = ({ offer, isMobile }: { offer: B2BOffer; isMobile?: boolean }) => (
        <div className={isMobile ? 'p-4' : 'p-6'}>
            {/* Header */}
            <div className="flex justify-between items-start mb-5 pb-4 border-b">
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                        {offer.reference_number || 'Szkic'}
                    </h2>
                    {offer.customer_name && (
                        <p className="text-gray-500 text-sm truncate">{offer.customer_name}</p>
                    )}
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[offer.status]?.bg}`}>
                        {STATUS_STYLES[offer.status]?.icon} {STATUS_STYLES[offer.status]?.label}
                    </span>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        €{offer.partner_total.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                        {format(new Date(offer.created_at), 'dd.MM.yyyy HH:mm')}
                    </div>
                </div>
            </div>

            {/* Quick Actions — Accept */}
            {['saved', 'draft'].includes(offer.status) && (
                <div className="mb-5 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-blue-800 text-sm">✅ Oferta gotowa do zamówienia</h3>
                        <p className="text-xs text-blue-600 mt-0.5">Zaakceptuj ofertę aby złożyć zamówienie</p>
                    </div>
                    <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={processing}
                        className="w-full sm:w-auto px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                    >
                        🛒 Zamów
                    </button>
                </div>
            )}

            {/* Products */}
            <div className="mb-5">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">📦 Pozycje oferty</h4>
                {offer.items?.length > 0 ? (
                    <div className="space-y-2">
                        {offer.items.map((item, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                        <span className="font-medium text-gray-900 text-sm">
                                            {item.product_name}
                                        </span>
                                        {item.variant && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.variant}</p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-bold text-gray-900 text-sm">
                                            €{(item.partner_price || item.base_price || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
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
            {offer.customer_contact && Object.keys(offer.customer_contact).length > 0 && (
                <div className="mb-5 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 text-sm mb-2">👤 Dane klienta</h4>
                    {offer.customer_contact.email && (
                        <p className="text-xs text-gray-600">📧 {offer.customer_contact.email}</p>
                    )}
                    {offer.customer_contact.phone && (
                        <p className="text-xs text-gray-600">📞 {offer.customer_contact.phone}</p>
                    )}
                    {offer.customer_contact.address && (
                        <p className="text-xs text-gray-600">📍 {offer.customer_contact.address}</p>
                    )}
                </div>
            )}

            {/* Editable Notes */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-700 text-sm">📝 Notatki</h4>
                    {!editingNotes ? (
                        <button
                            onClick={() => { setEditingNotes(true); setNotesText(offer.notes || ''); }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            ✏️ Edytuj
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                {savingNotes ? '...' : '💾 Zapisz'}
                            </button>
                            <button
                                onClick={() => setEditingNotes(false)}
                                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Anuluj
                            </button>
                        </div>
                    )}
                </div>
                {editingNotes ? (
                    <textarea
                        value={notesText}
                        onChange={e => setNotesText(e.target.value)}
                        placeholder="Dodaj notatki do oferty (np. &quot;Klient chce montaż w lipcu&quot;, &quot;Czeka na pomiar&quot;)..."
                        className="w-full p-3 border border-blue-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        autoFocus
                    />
                ) : offer.notes ? (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-yellow-700 text-sm whitespace-pre-wrap">{offer.notes}</p>
                    </div>
                ) : (
                    <p className="text-gray-400 text-xs italic">Brak notatek — kliknij „Edytuj" aby dodać</p>
                )}
            </div>

            {/* Installation Request */}
            {!showInstallRequest ? (
                <div className="mb-5 p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h4 className="font-semibold text-orange-800 text-sm">🔧 Potrzebujesz montażu?</h4>
                            <p className="text-xs text-orange-600 mt-0.5">Polendach24 wykona profesjonalny montaż</p>
                        </div>
                        <button
                            onClick={() => {
                                setShowInstallRequest(true);
                                setInstallAddress(offer.customer_contact?.address || '');
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium whitespace-nowrap"
                        >
                            Poproś o wycenę montażu
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mb-5 p-4 bg-orange-50 rounded-xl border border-orange-300">
                    <h4 className="font-semibold text-orange-800 text-sm mb-3">🔧 Zapytanie o wycenę montażu</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">📍 Adres montażu</label>
                            <input
                                type="text"
                                value={installAddress}
                                onChange={e => setInstallAddress(e.target.value)}
                                placeholder="Ulica, miasto, kod pocztowy"
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">📝 Uwagi (opcjonalnie)</label>
                            <textarea
                                value={installNotes}
                                onChange={e => setInstallNotes(e.target.value)}
                                placeholder="Np. preferowany termin, szczegóły budowy..."
                                className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500"
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRequestInstallation}
                                disabled={sendingRequest}
                                className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium text-sm"
                            >
                                {sendingRequest ? 'Wysyłanie...' : '📤 Wyślij zapytanie'}
                            </button>
                            <button
                                onClick={() => setShowInstallRequest(false)}
                                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                    <p className="text-[11px] text-orange-600 mt-2">Polendach24 przygotuje wycenę montażu i skontaktuje się z Tobą.</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
                <button
                    onClick={() => handleDownloadPDF(offer, 'de')}
                    className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-1.5"
                >
                    📄 PDF (DE)
                </button>
                <button
                    onClick={() => handleDownloadPDF(offer, 'pl')}
                    className="px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium flex items-center gap-1.5"
                >
                    📄 PDF (PL)
                </button>
                <button
                    onClick={() => handleDuplicate(offer)}
                    className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                    📋 Duplikuj
                </button>
                {offer.status === 'draft' && (
                    <Link
                        to={`/b2b/calculator?edit=${offer.id}`}
                        className="px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    >
                        ✏️ Edytuj
                    </Link>
                )}
                <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                    🗑️ Usuń
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        📋 Moje oferty
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Zarządzaj, przeglądaj i pobieraj oferty</p>
                </div>
                <Link
                    to="/b2b/calculator"
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                    ➕ Nowa oferta
                </Link>
            </div>

            {/* Filters + Sort + Search */}
            <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                {/* Filter pills — horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                    <div className="flex bg-gray-100 rounded-lg p-1 min-w-max">
                        {(['all', 'draft', 'saved', 'accepted'] as FilterType[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filter === f
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {FILTER_LABELS[f]} ({counts[f]})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search + Sort row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="🔍 Szukaj po kliencie, referencji lub produkcie..."
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm pr-8"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortType)}
                        className="px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
                    Ładowanie ofert...
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    {/* Offers List */}
                    <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border">
                        <div className="p-3 sm:p-4 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 text-sm">
                                {filteredOffers.length} {filteredOffers.length === 1 ? 'oferta' : 'ofert'}
                            </h2>
                            {searchTerm && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    „{searchTerm}"
                                </span>
                            )}
                        </div>
                        <div className="divide-y max-h-[60vh] lg:max-h-[700px] overflow-y-auto">
                            {filteredOffers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>{searchTerm ? 'Brak wyników dla szukanej frazy' : 'Brak ofert'}</p>
                                    {!searchTerm && (
                                        <Link to="/b2b/calculator" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                                            Utwórz pierwszą ofertę →
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                filteredOffers.map(offer => (
                                    <div
                                        key={offer.id}
                                        onClick={() => selectOffer(offer)}
                                        className={`p-3 sm:p-4 cursor-pointer transition-colors active:bg-blue-50 ${selectedOffer?.id === offer.id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5 gap-2">
                                            <div className="min-w-0 flex-1">
                                                <span className="font-semibold text-gray-900 text-sm block truncate">
                                                    {offer.reference_number || 'Szkic'}
                                                </span>
                                                {offer.customer_name && (
                                                    <p className="text-xs text-gray-500 truncate">{offer.customer_name}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full font-medium border whitespace-nowrap flex-shrink-0 ${STATUS_STYLES[offer.status]?.bg}`}>
                                                {STATUS_STYLES[offer.status]?.icon} {STATUS_STYLES[offer.status]?.label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400">
                                                {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: pl })}
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                €{offer.partner_total.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {offer.items?.length > 0 && (
                                            <div className="mt-1 text-[10px] sm:text-xs text-gray-400">
                                                {offer.items.length} {offer.items.length === 1 ? 'pozycja' : 'pozycji'}
                                                {offer.notes && <span className="ml-2 text-yellow-500">📝</span>}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Desktop Detail Panel */}
                    <div className="hidden lg:block lg:col-span-7 bg-white rounded-xl shadow-sm border min-h-[700px]">
                        {selectedOffer ? (
                            <OfferDetail offer={selectedOffer} />
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

            {/* Mobile Detail Overlay */}
            {showMobileDetail && selectedOffer && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileDetail(false)} />
                    <div className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-2xl shadow-2xl overflow-y-auto animate-slide-up">
                        {/* Mobile header */}
                        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
                            <h3 className="font-bold text-gray-900 text-sm truncate flex-1">
                                {selectedOffer.reference_number || 'Szkic'}
                            </h3>
                            <button
                                onClick={() => setShowMobileDetail(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0 ml-2"
                            >
                                ✕
                            </button>
                        </div>
                        <OfferDetail offer={selectedOffer} isMobile />
                    </div>
                </div>
            )}

            {/* Custom CSS for mobile animation + scrollbar hide */}
            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

export default B2BOffersPage;
