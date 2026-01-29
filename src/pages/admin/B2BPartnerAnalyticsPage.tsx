/**
 * B2B Partner Analytics Admin Page
 * Admin page for viewing partner activity, logins, and usage statistics
 */

import React, { useState, useEffect } from 'react';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BPartner, B2BPartnerActivity } from '../../services/database/b2b.service';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface PartnerAnalytics {
    partner_id: string;
    company_name: string;
    total_logins: number;
    last_login: string | null;
    offers_created: number;
    orders_placed: number;
    total_revenue: number;
}

interface DetailedAnalytics {
    totalLogins: number;
    uniqueLoginDays: number;
    lastLogin: string | null;
    offersCreated: number;
    ordersPlaced: number;
    topProducts: { product_name: string; count: number }[];
    topPages: { page: string; views: number }[];
    activityByDay: { date: string; logins: number; offers: number; orders: number }[];
}

const ACTIVITY_LABELS: Record<string, { label: string; icon: string }> = {
    login: { label: 'Anmeldung', icon: '🔑' },
    logout: { label: 'Abmeldung', icon: '👋' },
    view_page: { label: 'Seitenaufruf', icon: '👁️' },
    create_offer: { label: 'Angebot erstellt', icon: '📋' },
    edit_offer: { label: 'Angebot bearbeitet', icon: '✏️' },
    delete_offer: { label: 'Angebot gelöscht', icon: '🗑️' },
    accept_offer: { label: 'Angebot akzeptiert', icon: '✅' },
    view_order: { label: 'Bestellung angesehen', icon: '📦' },
    download_material: { label: 'Material heruntergeladen', icon: '📥' },
    view_promotion: { label: 'Aktion angesehen', icon: '🔥' },
    submit_credit_application: { label: 'Kreditantrag gestellt', icon: '💳' },
    view_training: { label: 'Schulung angesehen', icon: '📚' },
    complete_training: { label: 'Schulung abgeschlossen', icon: '🎓' },
    search: { label: 'Suche', icon: '🔍' },
    other: { label: 'Sonstiges', icon: '📌' }
};

export function B2BPartnerAnalyticsPage() {
    const [partners, setPartners] = useState<B2BPartner[]>([]);
    const [analytics, setAnalytics] = useState<PartnerAnalytics[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<B2BPartner | null>(null);
    const [partnerDetail, setPartnerDetail] = useState<DetailedAnalytics | null>(null);
    const [recentActivity, setRecentActivity] = useState<B2BPartnerActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [dateRange, setDateRange] = useState<30 | 7 | 90>(30);
    const [sortBy, setSortBy] = useState<'logins' | 'revenue' | 'offers'>('revenue');

    useEffect(() => {
        loadData();
    }, [dateRange]);

    async function loadData() {
        setLoading(true);
        try {
            const [partnersData, analyticsData] = await Promise.all([
                B2BService.getPartners(),
                B2BService.getAllPartnersAnalytics(dateRange)
            ]);
            setPartners(partnersData);
            setAnalytics(analyticsData);
        } catch (err) {
            console.error('Error loading analytics:', err);
        }
        setLoading(false);
    }

    async function loadPartnerDetail(partner: B2BPartner) {
        setSelectedPartner(partner);
        setLoadingDetail(true);
        try {
            const [detailData, activityData] = await Promise.all([
                B2BService.getPartnerAnalytics(partner.id, dateRange),
                B2BService.getPartnerActivity(partner.id, { limit: 50 })
            ]);
            setPartnerDetail(detailData);
            setRecentActivity(activityData);
        } catch (err) {
            console.error('Error loading partner detail:', err);
        }
        setLoadingDetail(false);
    }

    const sortedAnalytics = [...analytics].sort((a, b) => {
        if (sortBy === 'logins') return b.total_logins - a.total_logins;
        if (sortBy === 'revenue') return b.total_revenue - a.total_revenue;
        if (sortBy === 'offers') return b.offers_created - a.offers_created;
        return 0;
    });

    // Aggregate stats
    const totalLogins = analytics.reduce((sum, p) => sum + p.total_logins, 0);
    const totalRevenue = analytics.reduce((sum, p) => sum + p.total_revenue, 0);
    const activePartners = analytics.filter(p => p.total_logins > 0).length;

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        📊 Partner-Analytik
                    </h1>
                    <p className="text-gray-500 mt-1">Aktivität und Nutzungsstatistiken der B2B Partner</p>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2">
                    {([7, 30, 90] as const).map(days => (
                        <button
                            key={days}
                            onClick={() => setDateRange(days)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dateRange === days
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {days} Tage
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <div className="text-4xl font-black">{totalLogins}</div>
                    <div className="text-blue-100 text-sm">Anmeldungen gesamt</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                    <div className="text-4xl font-black">€{totalRevenue.toLocaleString()}</div>
                    <div className="text-green-100 text-sm">Umsatz ({dateRange} Tage)</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                    <div className="text-4xl font-black">{activePartners}</div>
                    <div className="text-purple-100 text-sm">Aktive Partner</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                    <div className="text-4xl font-black">{partners.length}</div>
                    <div className="text-orange-100 text-sm">Partner gesamt</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Partners List */}
                <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800">Partner-Übersicht</h2>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="text-sm border rounded-lg px-2 py-1"
                        >
                            <option value="revenue">Nach Umsatz</option>
                            <option value="logins">Nach Logins</option>
                            <option value="offers">Nach Angeboten</option>
                        </select>
                    </div>

                    <div className="divide-y max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Lade...</div>
                        ) : sortedAnalytics.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                Keine Daten vorhanden
                            </div>
                        ) : (
                            sortedAnalytics.map(item => {
                                const partner = partners.find(p => p.id === item.partner_id);
                                if (!partner) return null;

                                return (
                                    <div
                                        key={item.partner_id}
                                        onClick={() => loadPartnerDetail(partner)}
                                        className={`p-4 cursor-pointer transition-colors ${selectedPartner?.id === item.partner_id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-medium text-gray-900">{item.company_name}</div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600">
                                                    €{item.total_revenue.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-sm text-gray-500">
                                            <span>🔑 {item.total_logins} Logins</span>
                                            <span>📋 {item.offers_created} Angebote</span>
                                            <span>📦 {item.orders_placed} Bestellungen</span>
                                        </div>
                                        {item.last_login && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Letzter Login: {formatDistanceToNow(new Date(item.last_login), { addSuffix: true, locale: de })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Partner Detail */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border shadow-sm">
                    {selectedPartner && partnerDetail ? (
                        <div className="p-6">
                            {loadingDetail ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <>
                                    {/* Partner Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{selectedPartner.company_name}</h2>
                                            <p className="text-gray-500">{selectedPartner.contact_email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedPartner.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {selectedPartner.status === 'active' ? '🟢 Aktiv' : '⚪ Inaktiv'}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-4 gap-3 mb-6">
                                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-blue-700">{partnerDetail.totalLogins}</div>
                                            <div className="text-xs text-blue-600">Logins</div>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-purple-700">{partnerDetail.uniqueLoginDays}</div>
                                            <div className="text-xs text-purple-600">Aktive Tage</div>
                                        </div>
                                        <div className="p-4 bg-green-50 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-green-700">{partnerDetail.offersCreated}</div>
                                            <div className="text-xs text-green-600">Angebote</div>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-orange-700">{partnerDetail.ordersPlaced}</div>
                                            <div className="text-xs text-orange-600">Bestellungen</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        {/* Top Products */}
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <h3 className="font-semibold text-gray-800 mb-3">🏆 Top Produkte</h3>
                                            {partnerDetail.topProducts.length > 0 ? (
                                                <div className="space-y-2">
                                                    {partnerDetail.topProducts.map((p, idx) => (
                                                        <div key={idx} className="flex justify-between items-center">
                                                            <span className="text-gray-600">{p.product_name}</span>
                                                            <span className="font-medium">{p.count}x</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-400 text-sm">Keine Daten</p>
                                            )}
                                        </div>

                                        {/* Top Pages */}
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <h3 className="font-semibold text-gray-800 mb-3">📄 Meistbesuchte Seiten</h3>
                                            {partnerDetail.topPages.length > 0 ? (
                                                <div className="space-y-2">
                                                    {partnerDetail.topPages.slice(0, 5).map((p, idx) => (
                                                        <div key={idx} className="flex justify-between items-center">
                                                            <span className="text-gray-600 text-sm truncate max-w-[150px]" title={p.page}>
                                                                {p.page.replace('/b2b/', '')}
                                                            </span>
                                                            <span className="font-medium">{p.views}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-400 text-sm">Keine Daten</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-3">📋 Letzte Aktivitäten</h3>
                                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                                            {recentActivity.length > 0 ? (
                                                recentActivity.map(activity => (
                                                    <div
                                                        key={activity.id}
                                                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm"
                                                    >
                                                        <span className="text-lg">
                                                            {ACTIVITY_LABELS[activity.activity_type]?.icon || '📌'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <span className="font-medium">
                                                                {ACTIVITY_LABELS[activity.activity_type]?.label || activity.activity_type}
                                                            </span>
                                                            {activity.page_path && (
                                                                <span className="text-gray-500 ml-2">
                                                                    {activity.page_path}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-gray-400 text-xs">
                                                            {format(new Date(activity.created_at), 'dd.MM. HH:mm')}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-400 text-center py-8">Keine Aktivitäten</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                            <div className="text-6xl mb-6 opacity-20">👈</div>
                            <h3 className="text-xl font-medium text-gray-600 mb-2">Partner auswählen</h3>
                            <p>Klicken Sie auf einen Partner, um Statistiken anzuzeigen</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default B2BPartnerAnalyticsPage;
