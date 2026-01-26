/**
 * B2B Partner Dashboard
 * Main dashboard for B2B partners with KPIs, quick actions, and activity feed
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { B2BService, B2BDashboardStats, B2BOffer, B2BOrder, B2BPromotion, B2BCreditApplication } from '../../services/database/b2b.service';
import { formatDistanceToNow, format } from 'date-fns';
import { de, pl, enUS } from 'date-fns/locale';
import { useTranslation } from '../../contexts/TranslationContext';

const STATUS_STYLES: Record<string, { color: string; icon: string }> = {
    draft: { color: 'bg-gray-100 text-gray-700', icon: '📝' },
    saved: { color: 'bg-blue-100 text-blue-700', icon: '💾' },
    accepted: { color: 'bg-green-100 text-green-700', icon: '✅' },
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    approved: { color: 'bg-blue-100 text-blue-800', icon: '✅' },
    awaiting_payment: { color: 'bg-orange-100 text-orange-800', icon: '💳' },
    in_production: { color: 'bg-purple-100 text-purple-800', icon: '🏭' },
    shipped: { color: 'bg-indigo-100 text-indigo-800', icon: '🚚' },
    delivered: { color: 'bg-green-100 text-green-800', icon: '📦' },
    rejected: { color: 'bg-red-100 text-red-800', icon: '❌' },
    cancelled: { color: 'bg-gray-100 text-gray-600', icon: '🚫' }
};

export function B2BDashboard() {
    const { t, language } = useTranslation();
    const [stats, setStats] = useState<B2BDashboardStats | null>(null);
    const [recentOffers, setRecentOffers] = useState<B2BOffer[]>([]);
    const [recentOrders, setRecentOrders] = useState<B2BOrder[]>([]);
    const [promotions, setPromotions] = useState<B2BPromotion[]>([]);
    const [creditApp, setCreditApp] = useState<B2BCreditApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [partnerName, setPartnerName] = useState('');

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setLoading(true);
        try {
            const partner = await B2BService.getCurrentPartner();
            if (partner) {
                setPartnerName(partner.company_name);
                const [statsData, offers, orders, activePromos, creditApps] = await Promise.all([
                    B2BService.getDashboardStats(partner.id),
                    B2BService.getOffers(partner.id),
                    B2BService.getOrders(partner.id),
                    B2BService.getActivePromotions(),
                    B2BService.getCreditApplications(partner.id)
                ]);
                setStats(statsData);
                setRecentOffers(offers.slice(0, 5));
                setRecentOrders(orders.slice(0, 5));
                setPromotions(activePromos);
                setCreditApp(creditApps.length > 0 ? creditApps[0] : null);
            }
        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Promotions Banner */}
            {promotions.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-1 shadow-lg text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm animate-pulse">
                                🔥 Nur für kurze Zeit!
                            </div>
                            <h2 className="text-2xl font-bold mb-2">
                                {promotions[0].title}
                            </h2>
                            <p className="text-indigo-100 max-w-2xl text-lg">
                                {promotions[0].description}
                            </p>
                            {promotions[0].discount_value > 0 && (
                                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg font-bold border border-white/20">
                                    <span className="text-3xl">-{promotions[0].discount_value}{promotions[0].discount_type === 'percent' ? '%' : '€'}</span>
                                    <span className="text-xs uppercase opacity-80">Rabatt</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            <Link
                                to={`/b2b/promotions`}
                                className="px-8 py-4 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold shadow-xl transition-all transform hover:scale-105 inline-flex items-center gap-2"
                            >
                                Jetzt Profitieren ➡️
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {t('dashboard.welcome')}, {partnerName} 👋
                </h1>
                <p className="text-gray-500 mt-1">{t('b2b.portalTitle')}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                            📋
                        </div>
                        <span className="text-sm text-gray-500">Active</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats?.activeOffers || 0}</div>
                    <div className="text-sm text-gray-500 mt-1">{t('b2b.myOffers')}</div>
                </div>

                <div className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                            🏭
                        </div>
                        <span className="text-sm text-gray-500">In Progress</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {(stats?.pendingOrders || 0) + (stats?.inProductionOrders || 0)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{t('b2b.orders')}</div>
                </div>

                <div className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                            💰
                        </div>
                        <span className="text-sm text-gray-500">Open</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">
                        €{(stats?.unpaidInvoicesAmount || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        {stats?.unpaidInvoicesCount || 0} {t('b2b.invoices')}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                            📈
                        </div>
                        <span className="text-sm text-gray-500">Month</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                        €{(stats?.monthlyRevenue || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Revenue</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
                <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Link
                        to="/b2b/calculator"
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        ➕ {t('b2b.newOffer')}
                    </Link>
                    <Link
                        to="/b2b/offers"
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        📋 {t('b2b.myOffers')}
                    </Link>
                    <Link
                        to="/b2b/credit"
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        💳 {t('b2b.credit')} {creditApp ? `(${creditApp.status})` : ''}
                    </Link>
                    <Link
                        to="/b2b/orders"
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        🛒 {t('b2b.orders')}
                    </Link>
                    <Link
                        to="/b2b/invoices"
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        📄 {t('b2b.invoices')}
                    </Link>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Recent Offers */}
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">📋 Aktuelle Angebote</h3>
                        <Link to="/b2b/offers" className="text-sm text-blue-600 hover:text-blue-700">
                            Alle anzeigen →
                        </Link>
                    </div>
                    <div className="divide-y">
                        {recentOffers.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <div className="text-4xl mb-2">📭</div>
                                <p>Keine Angebote vorhanden</p>
                                <Link to="/b2b/calculator" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                                    Erstes Angebot erstellen →
                                </Link>
                            </div>
                        ) : (
                            recentOffers.map(offer => (
                                <div key={offer.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <span className="font-medium text-gray-900">
                                                {offer.reference_number || `Entwurf`}
                                            </span>
                                            {offer.customer_name && (
                                                <span className="ml-2 text-gray-500 text-sm">
                                                    • {offer.customer_name}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[offer.status]?.color || 'bg-gray-100'}`}>
                                            {STATUS_STYLES[offer.status]?.icon} {t(`statuses.${offer.status}`)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">
                                            {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: de })}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            €{offer.partner_total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">🛒 Aktuelle Bestellungen</h3>
                        <Link to="/b2b/orders" className="text-sm text-blue-600 hover:text-blue-700">
                            Alle anzeigen →
                        </Link>
                    </div>
                    <div className="divide-y">
                        {recentOrders.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <div className="text-4xl mb-2">📦</div>
                                <p>Keine Bestellungen vorhanden</p>
                            </div>
                        ) : (
                            recentOrders.map(order => (
                                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900">{order.order_number}</span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[order.status]?.color || 'bg-gray-100'}`}>
                                            {STATUS_STYLES[order.status]?.icon} {t(`statuses.${order.status}`)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">
                                            {format(new Date(order.created_at), 'dd.MM.yyyy')}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            €{order.total_amount.toLocaleString()}
                                        </span>
                                    </div>
                                    {order.estimated_delivery && (
                                        <div className="mt-1 text-xs text-blue-600">
                                            📅 Lieferung: {format(new Date(order.estimated_delivery), 'dd.MM.yyyy')}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Nearest Delivery Alert */}
            {stats?.nearestDelivery && (
                <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center gap-4">
                        <div className="text-4xl">🚚</div>
                        <div>
                            <h3 className="font-semibold text-green-800">Nächste Lieferung</h3>
                            <p className="text-green-700">
                                Voraussichtlich am <b>{format(new Date(stats.nearestDelivery), 'dd. MMMM yyyy', { locale: de })}</b>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BDashboard;
