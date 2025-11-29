import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { Offer } from '../../types';
import { toast } from 'react-hot-toast';

interface PartnerOffer extends Offer {
    companyName?: string;
    createdByName?: string;
}

export const PartnerOffersList: React.FC = () => {
    const [offers, setOffers] = useState<PartnerOffer[]>([]);
    const [filteredOffers, setFilteredOffers] = useState<PartnerOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        loadOffers();
    }, []);



    const loadOffers = async () => {
        try {
            setLoading(true);
            const data = await DatabaseService.getPartnerOffers();
            setOffers(data as PartnerOffer[]);
        } catch (error) {
            console.error('Error loading partner offers:', error);
            toast.error('Błąd ładowania ofert partnerów');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = React.useCallback(() => {
        let filtered = [...offers];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(offer => offer.status === statusFilter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(offer => {
                const offerNumber = offer.offerNumber?.toLowerCase() || '';
                const companyName = offer.companyName?.toLowerCase() || '';
                const customerName = `${offer.customer.firstName} ${offer.customer.lastName}`.toLowerCase();
                return offerNumber.includes(query) ||
                    companyName.includes(query) ||
                    customerName.includes(query);
            });
        }

        setFilteredOffers(filtered);
    }, [offers, searchQuery, statusFilter]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const getStatusBadge = (status: string) => {
        const badges = {
            draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
            sent: 'bg-accent/20 text-accent border-accent/30',
            sold: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            rejected: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
        const labels = {
            draft: 'Szkic',
            sent: 'Wysłana',
            sold: 'Sprzedana',
            rejected: 'Odrzucona'
        };
        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${badges[status as keyof typeof badges] || badges.draft}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // Calculate statistics
    const stats = {
        totalOffers: filteredOffers.length,
        totalRevenue: filteredOffers.reduce((sum, offer) => sum + (offer.pricing.sellingPriceNet || 0), 0),
        avgMargin: filteredOffers.length > 0
            ? (filteredOffers.reduce((sum, offer) => sum + (offer.pricing.marginPercentage || 0), 0) / filteredOffers.length)
            : 0,
        pendingCount: filteredOffers.filter(offer => offer.status === 'draft').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-green-400 transition-all duration-300 hover:shadow-lg hover:shadow-green-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Łączna liczba ofert</span>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalOffers}</p>
                </div>

                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Łączny przychód</span>
                        <div className="p-2 bg-accent-soft rounded-lg">
                            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-accent">
                        {formatCurrency(stats.totalRevenue)}
                    </p>
                </div>

                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:shadow-orange-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Średnia marża</span>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">
                        {(stats.avgMargin * 100).toFixed(1)}%
                    </p>
                </div>

                <div className="group relative bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-yellow-400 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-100/50 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm font-medium">Oferty w szkicach</span>
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.pendingCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Wyszukaj
                        </label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Numer oferty, firma, klient..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="all">Wszystkie</option>
                            <option value="draft">Szkice</option>
                            <option value="sent">Wysłane</option>
                            <option value="sold">Sprzedane</option>
                            <option value="rejected">Odrzucone</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={loadOffers}
                            className="w-full px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Odświeź
                        </button>
                    </div>
                </div>
            </div>

            {/* Offers Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Numer oferty
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Firma partnera
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Klient
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Data
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Wartość netto
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Marża
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Akcje
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                            {filteredOffers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                                        {searchQuery || statusFilter !== 'all'
                                            ? 'Brak ofert spełniających kryteria wyszukiwania'
                                            : 'Brak ofert od partnerów'}
                                    </td>
                                </tr>
                            ) : (
                                filteredOffers.map((offer) => (
                                    <tr key={offer.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                            {offer.offerNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {offer.companyName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {offer.customer.firstName} {offer.customer.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                            {formatDate(offer.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                                            {formatCurrency(offer.pricing.sellingPriceNet)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {(offer.pricing.marginPercentage * 100).toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {getStatusBadge(offer.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                            <button className="inline-flex items-center px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-medium rounded-lg transition-colors">
                                                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Szczegóły
                                            </button>
                                            <button className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                                                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Eksportuj
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
