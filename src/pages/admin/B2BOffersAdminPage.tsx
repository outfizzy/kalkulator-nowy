/**
 * B2B Offers Admin Page
 * Full view of all partner offers with financial details
 * Shows: Partner Margin, Company Margin, Product Config
 */

import React, { useState, useEffect, useMemo } from 'react';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BOffer, B2BPartner } from '../../services/database/b2b.service';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: 'Szkic', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '📝' },
    saved: { label: 'Zapisana', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '💾' },
    accepted: { label: 'Zaakceptowana', color: 'bg-green-100 text-green-700 border-green-300', icon: '✅' },
    expired: { label: 'Wygasła', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '⏰' },
    cancelled: { label: 'Anulowana', color: 'bg-red-100 text-red-700 border-red-300', icon: '❌' },
};

export function B2BOffersAdminPage() {
    const [offers, setOffers] = useState<B2BOffer[]>([]);
    const [partners, setPartners] = useState<B2BPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOffer, setSelectedOffer] = useState<B2BOffer | null>(null);

    // Filters
    const [filterPartner, setFilterPartner] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [offersData, partnersData] = await Promise.all([
                B2BService.getAllOffers(), // We'll add this method
                B2BService.getPartners()
            ]);
            setOffers(offersData);
            setPartners(partnersData);
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    }

    // Calculate financials
    const calculateMargins = (offer: B2BOffer) => {
        const baseTotal = offer.base_total || 0; // UPE Price (our cost)
        const partnerTotal = offer.partner_total || 0; // What partner pays us

        // Company margin = what partner pays us - our cost
        const companyMarginValue = partnerTotal - baseTotal;
        const companyMarginPercent = baseTotal > 0 ? (companyMarginValue / baseTotal) * 100 : 0;

        // Partner margin (calculated from items if available)
        let retailTotal = 0;
        if (offer.items) {
            offer.items.forEach(item => {
                // If options contain retail_price, use it
                const retailPrice = item.options?.retail_price || item.partner_price * 1.3; // Fallback 30% markup
                retailTotal += retailPrice * item.quantity;
            });
        }
        const partnerMarginValue = retailTotal - partnerTotal;
        const partnerMarginPercent = partnerTotal > 0 ? (partnerMarginValue / partnerTotal) * 100 : 0;

        return {
            baseTotal,
            partnerTotal,
            retailTotal,
            companyMarginValue,
            companyMarginPercent,
            partnerMarginValue,
            partnerMarginPercent
        };
    };

    // Filtered offers
    const filteredOffers = useMemo(() => {
        return offers.filter(offer => {
            if (filterPartner !== 'all' && offer.partner_id !== filterPartner) return false;
            if (filterStatus !== 'all' && offer.status !== filterStatus) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const customerName = offer.customer_name?.toLowerCase() || '';
                const refNumber = offer.reference_number?.toLowerCase() || '';
                if (!customerName.includes(query) && !refNumber.includes(query)) return false;
            }
            return true;
        });
    }, [offers, filterPartner, filterStatus, searchQuery]);

    // Aggregated stats
    const stats = useMemo(() => {
        let totalCompanyMargin = 0;
        let totalVolume = 0;
        filteredOffers.forEach(o => {
            const m = calculateMargins(o);
            totalCompanyMargin += m.companyMarginValue;
            totalVolume += m.partnerTotal;
        });
        return {
            count: filteredOffers.length,
            totalVolume,
            totalCompanyMargin,
            avgMarginPercent: totalVolume > 0 ? (totalCompanyMargin / (totalVolume - totalCompanyMargin)) * 100 : 0
        };
    }, [filteredOffers]);

    // Get partner name helper
    const getPartnerName = (partnerId: string) => {
        const partner = partners.find(p => p.id === partnerId);
        return partner?.company_name || 'Nieznany';
    };

    return (
        <div className="p-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    📊 Rejestr Ofert B2B
                </h1>
                <p className="text-gray-500 mt-1">Pełny podgląd wszystkich kalkulacji partnerów z analizą finansową</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">📋 Liczba ofert</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.count}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">💰 Wolumen (cena partnera)</div>
                    <div className="text-3xl font-bold text-blue-600">€{stats.totalVolume.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">💵 Nasza marża (suma)</div>
                    <div className="text-3xl font-bold text-green-600">€{stats.totalCompanyMargin.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">📈 Średnia marża %</div>
                    <div className="text-3xl font-bold text-purple-600">{stats.avgMarginPercent.toFixed(1)}%</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border shadow-sm mb-6 flex gap-4 items-center flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="🔍 Szukaj (klient, numer ref.)"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={filterPartner}
                    onChange={e => setFilterPartner(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Wszyscy partnerzy</option>
                    {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.company_name}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Wszystkie statusy</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.icon} {config.label}</option>
                    ))}
                </select>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                    🔄 Odśwież
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Ładowanie ofert...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Offers Table */}
                    <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Partner</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Klient / Ref</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produkt</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cena Partnera</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nasza marża</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredOffers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                                <div className="text-4xl mb-2">📭</div>
                                                <p>Brak ofert spełniających kryteria</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOffers.map(offer => {
                                            const margins = calculateMargins(offer);
                                            const productSummary = offer.items?.[0]?.product_name || '-';
                                            const dimensions = offer.items?.[0]?.dimensions;

                                            return (
                                                <tr
                                                    key={offer.id}
                                                    onClick={() => setSelectedOffer(offer)}
                                                    className={`cursor-pointer transition-colors ${selectedOffer?.id === offer.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-gray-900">{getPartnerName(offer.partner_id)}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-gray-900">{offer.customer_name || '-'}</div>
                                                        {offer.reference_number && (
                                                            <div className="text-xs text-gray-500">{offer.reference_number}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-gray-900">{productSummary}</div>
                                                        {dimensions && (
                                                            <div className="text-xs text-gray-500">
                                                                {dimensions.width}x{dimensions.projection}mm
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="font-semibold text-gray-900">
                                                            €{margins.partnerTotal.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className={`font-semibold ${margins.companyMarginValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            €{margins.companyMarginValue.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {margins.companyMarginPercent.toFixed(1)}%
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium border ${STATUS_CONFIG[offer.status]?.color || 'bg-gray-100'}`}>
                                                            {STATUS_CONFIG[offer.status]?.icon} {STATUS_CONFIG[offer.status]?.label || offer.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                                                        {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: pl })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detail Panel */}
                    <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border min-h-[500px]">
                        {selectedOffer ? (
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {selectedOffer.customer_name || 'Oferta'}
                                        </h3>
                                        <p className="text-sm text-gray-500">{getPartnerName(selectedOffer.partner_id)}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium border ${STATUS_CONFIG[selectedOffer.status]?.color}`}>
                                        {STATUS_CONFIG[selectedOffer.status]?.icon} {STATUS_CONFIG[selectedOffer.status]?.label}
                                    </span>
                                </div>

                                {/* Financial Breakdown */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold text-gray-700 mb-3">💰 Analiza finansowa</h4>
                                    {(() => {
                                        const m = calculateMargins(selectedOffer);
                                        return (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Cena UPE (nasz koszt)</span>
                                                    <span className="font-medium">€{m.baseTotal.toLocaleString('de-DE')}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Cena Partnera (płaci nam)</span>
                                                    <span className="font-medium">€{m.partnerTotal.toLocaleString('de-DE')}</span>
                                                </div>
                                                <div className="border-t pt-2 flex justify-between font-semibold">
                                                    <span className="text-green-700">🏢 Nasza marża</span>
                                                    <span className="text-green-600">
                                                        €{m.companyMarginValue.toLocaleString('de-DE')} ({m.companyMarginPercent.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                {m.retailTotal > 0 && (
                                                    <>
                                                        <div className="border-t pt-2 flex justify-between">
                                                            <span className="text-gray-600">Cena dla klienta (szac.)</span>
                                                            <span className="font-medium">€{m.retailTotal.toLocaleString('de-DE')}</span>
                                                        </div>
                                                        <div className="flex justify-between font-semibold">
                                                            <span className="text-purple-700">👤 Marża partnera</span>
                                                            <span className="text-purple-600">
                                                                €{m.partnerMarginValue.toLocaleString('de-DE')} ({m.partnerMarginPercent.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Products */}
                                <div className="mb-4">
                                    <h4 className="font-semibold text-gray-700 mb-2">📦 Produkty</h4>
                                    {selectedOffer.items?.length ? (
                                        <div className="space-y-2">
                                            {selectedOffer.items.map((item, idx) => (
                                                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                                    <div className="font-medium text-gray-900">{item.product_name}</div>
                                                    {item.variant && <div className="text-sm text-gray-500">{item.variant}</div>}
                                                    {item.dimensions && (
                                                        <div className="text-sm text-gray-500">
                                                            {item.dimensions.width} x {item.dimensions.projection} mm
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between mt-1 text-sm">
                                                        <span>Cena partnera:</span>
                                                        <span className="font-medium">€{item.partner_price?.toLocaleString('de-DE')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm">Brak szczegółów produktów</p>
                                    )}
                                </div>

                                {/* Customer Contact */}
                                {selectedOffer.customer_contact && (
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-gray-700 mb-2">👤 Kontakt z klientem</h4>
                                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                            {selectedOffer.customer_contact.email && (
                                                <div>📧 {selectedOffer.customer_contact.email}</div>
                                            )}
                                            {selectedOffer.customer_contact.phone && (
                                                <div>📞 {selectedOffer.customer_contact.phone}</div>
                                            )}
                                            {selectedOffer.customer_contact.address && (
                                                <div>📍 {selectedOffer.customer_contact.address}</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedOffer.notes && (
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-gray-700 mb-2">📝 Notatki</h4>
                                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedOffer.notes}</p>
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="text-xs text-gray-400 mt-4 pt-4 border-t">
                                    <div>Utworzono: {format(new Date(selectedOffer.created_at), 'dd.MM.yyyy HH:mm')}</div>
                                    {selectedOffer.reference_number && <div>Ref: {selectedOffer.reference_number}</div>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-24">
                                <div className="text-6xl mb-4 opacity-20">👆</div>
                                <h3 className="text-lg font-medium text-gray-600 mb-1">Wybierz ofertę</h3>
                                <p className="text-sm">Kliknij w wiersz tabeli aby zobaczyć szczegóły</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BOffersAdminPage;
