/**
 * B2B Partner Dashboard — Polish, Beginner-Friendly
 * Premium dashboard z KPI, kredytem, szybkimi akcjami i aktywnością
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BDashboardStats, B2BOffer, B2BOrder, B2BPromotion, B2BPartner } from '../../services/database/b2b.service';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { StructuralZonesService } from '../../services/structural-zones.service';
import type { StructuralZoneResult } from '../../services/structural-zones.service';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    draft: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
    saved: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    approved: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    awaiting_payment: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
    in_production: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
    shipped: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
    cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Szkic', saved: 'Zapisane', accepted: 'Zaakceptowane', pending: 'W trakcie',
    approved: 'Zatwierdzone', awaiting_payment: 'Oczekuje na płatność', in_production: 'W produkcji',
    shipped: 'Wysłane', delivered: 'Dostarczone', rejected: 'Odrzucone', cancelled: 'Anulowane',
};

export function B2BDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<B2BDashboardStats | null>(null);
    const [partner, setPartner] = useState<B2BPartner | null>(null);
    const [recentOffers, setRecentOffers] = useState<B2BOffer[]>([]);
    const [recentOrders, setRecentOrders] = useState<B2BOrder[]>([]);
    const [promotions, setPromotions] = useState<B2BPromotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [plzInput, setPlzInput] = useState('');
    const [zoneResult, setZoneResult] = useState<StructuralZoneResult | null>(null);
    const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('b2b_welcome_seen'));

    useEffect(() => { loadDashboard(); }, []);

    async function loadDashboard() {
        setLoading(true);
        try {
            const p = await B2BService.getCurrentPartner();
            if (p) {
                setPartner(p);
                const [statsData, offers, orders, activePromos] = await Promise.all([
                    B2BService.getDashboardStats(p.id),
                    B2BService.getOffers(p.id),
                    B2BService.getOrders(p.id),
                    B2BService.getActivePromotions(),
                ]);
                setStats(statsData);
                setRecentOffers(offers.slice(0, 5));
                setRecentOrders(orders.slice(0, 5));
                setPromotions(activePromos);
            }
        } catch (err) { console.error('Error loading dashboard:', err); }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                    <span className="text-sm text-slate-400">Ładowanie panelu…</span>
                </div>
            </div>
        );
    }

    const creditUsedPercent = partner ? Math.min(100, (partner.credit_used / Math.max(partner.credit_limit, 1)) * 100) : 0;
    const creditRemaining = partner ? Math.max(0, partner.credit_limit - partner.credit_used) : 0;
    const isNewPartner = (recentOffers.length === 0 && recentOrders.length === 0);

    function dismissWelcome() {
        localStorage.setItem('b2b_welcome_seen', '1');
        setShowWelcome(false);
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

            {/* ═══ WELCOME MODAL ═══ */}
            {showWelcome && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={dismissWelcome}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                    {/* Modal */}
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-black/20" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="sticky top-0 z-10 rounded-t-2xl p-6 pb-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px]" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>B2B</div>
                                        <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Polendach24</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white">Witamy w panelu B2B!</h2>
                                    <p className="text-slate-400 text-sm mt-1">Dziękujemy za rejestrację i cieszymy się, że możemy współpracować.</p>
                                </div>
                                <button onClick={dismissWelcome} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all flex-shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="bg-white p-6 space-y-5 text-sm text-slate-600 leading-relaxed">

                            {/* Section: O nas */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <p>Tworzymy rozwiązania w zakresie <strong className="text-slate-800">zadaszeń aluminiowych, carportów oraz systemów dodatkowych</strong>, które realnie wspierają sprzedaż i realizację inwestycji u naszych partnerów.</p>
                            </div>

                            {/* Section: Doświadczenie */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                                </div>
                                <p>Dysponujemy szeroką ofertą modeli, konfiguracji i dodatków. Dzięki doświadczeniu zdobytemu przy wielu realizacjach — <strong className="text-slate-800">zarówno w Polsce, jak i w Niemczech</strong> — chętnie dzielimy się wiedzą, praktyką i sprawdzonymi rozwiązaniami.</p>
                            </div>

                            {/* Highlight box: Zarabiaj więcej */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    <span className="font-bold text-blue-900">Zarabiaj więcej z nami</span>
                                </div>
                                <p className="text-blue-800 text-sm">Wspieramy naszych partnerów w zwiększaniu sprzedaży poprzez konkurencyjne ceny, sprawdzone rozwiązania oraz narzędzia, które ułatwiają przygotowanie ofert i domykanie transakcji.</p>
                            </div>

                            {/* Section: Kalkulator */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4.5 h-4.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <p><strong className="text-slate-800">Kalkulator ofert</strong> pozwala szybko sprawdzić ceny, porównać konfiguracje oraz przygotować ofertę dla klienta.</p>
                                    <p className="mt-1.5 text-slate-500">W kalkulatorze znajdują się ceny konstrukcji wraz z możliwością wykonania wyliczeń statycznych, które są niezbędne przy realizacji zleceń i zapewniają bezpieczeństwo inwestycji.</p>
                                </div>
                            </div>

                            {/* Section: Rozwój */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4.5 h-4.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                                <p>Program będziemy <strong className="text-slate-800">stale rozwijać</strong> i rozbudowywać o kolejne produkty oraz funkcjonalności — tak, aby jak najlepiej odpowiadać na potrzeby naszych partnerów i&nbsp;ich klientów.</p>
                            </div>

                            {/* Section: Opiekun */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4.5 h-4.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                                <p>Każdemu partnerowi zostanie przydzielony <strong className="text-slate-800">dedykowany opiekun</strong>, do którego będzie można kierować pytania bezpośrednio w aplikacji — tak, aby zapewnić szybkie wsparcie i sprawną realizację tematów.</p>
                            </div>

                            {/* Section: Dodatkowe rozwiązania */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4.5 h-4.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p>W naszym portfolio posiadamy również rozwiązania, które nie są jeszcze dostępne w systemie — między innymi <strong className="text-slate-800">zadaszenia poliwęglanowe</strong>, które w wielu przypadkach stanowią bardziej ekonomiczną alternatywę.</p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-slate-500 text-sm mb-3">Jeżeli masz pytania, potrzebujesz wsparcia przy ofercie lub chcesz omówić konkretną realizację — <strong className="text-slate-700">zapraszamy do kontaktu</strong>. Stawiamy na partnerskie relacje i szybkie działanie.</p>
                            </div>

                            {/* Contact Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <a href="tel:+48603074034" className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">MD</div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">Mariusz Duź</div>
                                        <div className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            603 074 034
                                        </div>
                                    </div>
                                </a>
                                <a href="tel:+48609410745" className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TF</div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">Tomasz Fijołek</div>
                                        <div className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            609 410 745
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 rounded-b-2xl p-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400">Ta wiadomość wyświetla się jednorazowo</span>
                            <button
                                onClick={dismissWelcome}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Zaczynamy! →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ HERO HEADER ═══ */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/[0.07] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/[0.05] rounded-full blur-[80px] translate-y-1/2 pointer-events-none" />
                <div className="relative z-10 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {partner?.logo_url && (
                                <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur p-1.5 flex items-center justify-center border border-white/10 flex-shrink-0">
                                    <img src={partner.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs text-emerald-400/80 font-medium uppercase tracking-wider">Portal Partnera B2B</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white">
                                    Witaj, {partner?.company_name || 'Partnerze'}! 👋
                                </h1>
                                <p className="text-slate-400 mt-1 text-sm">
                                    {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: pl })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/b2b/calculator')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 self-start"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Utwórz nową ofertę
                        </button>
                    </div>
                </div>
            </div>


            {/* ═══ PROMOCJA ═══ */}
            {promotions.length > 0 && (
                <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-[1px] shadow-lg">
                    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-lg flex-shrink-0">🔥</div>
                            <div>
                                <h3 className="font-bold text-slate-900">{promotions[0].title}</h3>
                                <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">{promotions[0].description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {promotions[0].discount_value > 0 && (
                                <span className="text-2xl font-black text-orange-600">-{promotions[0].discount_value}{promotions[0].discount_type === 'percent' ? '%' : '€'}</span>
                            )}
                            <Link to="/b2b/promotions" className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all">Szczegóły →</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ KPI CARDS ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/b2b/offers" className="group bg-white rounded-xl p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-0.5">{stats?.activeOffers || 0}</div>
                    <div className="text-xs text-slate-500 font-medium">Aktywne oferty</div>
                </Link>

                <Link to="/b2b/orders" className="group bg-white rounded-xl p-5 border border-slate-200/80 hover:border-violet-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-0.5">{(stats?.pendingOrders || 0) + (stats?.inProductionOrders || 0)}</div>
                    <div className="text-xs text-slate-500 font-medium">Zamówienia w toku</div>
                </Link>

                <Link to="/b2b/invoices" className="group bg-white rounded-xl p-5 border border-slate-200/80 hover:border-orange-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-0.5">€{(stats?.unpaidInvoicesAmount || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 font-medium">{stats?.unpaidInvoicesCount || 0} nieopłaconych faktur</div>
                </Link>

                <div className="bg-white rounded-xl p-5 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Miesiąc</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mb-0.5">€{(stats?.monthlyRevenue || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 font-medium">Obrót</div>
                </div>
            </div>

            {/* ═══ KREDYT + SZYBKI DOSTĘP ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Link to="/b2b/credit" className="bg-white rounded-xl p-5 border border-slate-200/80 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                            Limit kredytowy
                        </h3>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Dostępne</span>
                            <span className="font-bold text-emerald-600">€{creditRemaining.toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${creditUsedPercent > 80 ? 'bg-red-500' : creditUsedPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${creditUsedPercent}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>€{(partner?.credit_used || 0).toLocaleString()} wykorzystane</span>
                            <span>€{(partner?.credit_limit || 0).toLocaleString()} łącznie</span>
                        </div>
                    </div>
                </Link>

                <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                        Szybki dostęp
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        {[
                            { to: '/b2b/calculator', label: 'Nowa oferta', iconColor: 'text-blue-600', iconBg: 'bg-blue-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> },
                            { to: '/b2b/offers', label: 'Moje oferty', iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                            { to: '/b2b/orders', label: 'Zamówienia', iconColor: 'text-violet-600', iconBg: 'bg-violet-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                            { to: '/b2b/invoices', label: 'Faktury', iconColor: 'text-amber-600', iconBg: 'bg-amber-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                            { to: '/b2b/promotions', label: 'Promocje', iconColor: 'text-rose-600', iconBg: 'bg-rose-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg> },
                            { to: '/b2b/materials', label: 'Materiały', iconColor: 'text-teal-600', iconBg: 'bg-teal-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
                            { to: '/b2b/credit', label: 'Kredyt', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
                            { to: '/b2b/profile', label: 'Ustawienia', iconColor: 'text-slate-600', iconBg: 'bg-slate-100',
                              icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                        ].map(action => (
                            <Link key={action.to} to={action.to}
                                className="group bg-slate-50/60 hover:bg-white rounded-xl p-3 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${action.iconBg} ${action.iconColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ OSTATNIE OFERTY + ZAMÓWIENIA ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            Ostatnie oferty
                        </h3>
                        <Link to="/b2b/offers" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Wszystkie →</Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {recentOffers.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 mx-auto flex items-center justify-center mb-3">📝</div>
                                <p className="text-slate-400 text-sm mb-2">Nie masz jeszcze ofert</p>
                                <Link to="/b2b/calculator" className="text-blue-600 text-sm font-medium hover:underline">Stwórz pierwszą ofertę →</Link>
                            </div>
                        ) : (
                            recentOffers.map(offer => {
                                const s = STATUS_STYLES[offer.status] || STATUS_STYLES.draft;
                                return (
                                    <div key={offer.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/b2b/offers')}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-semibold text-slate-900 text-sm truncate">{offer.reference_number || 'Szkic'}</span>
                                                {offer.customer_name && (<span className="text-slate-400 text-xs truncate">• {offer.customer_name}</span>)}
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                {STATUS_LABELS[offer.status] || offer.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">{formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: pl })}</span>
                                            <span className="font-semibold text-slate-700">€{offer.partner_total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                            Ostatnie zamówienia
                        </h3>
                        <Link to="/b2b/orders" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Wszystkie →</Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {recentOrders.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 mx-auto flex items-center justify-center mb-3">📦</div>
                                <p className="text-slate-400 text-sm">Brak zamówień</p>
                            </div>
                        ) : (
                            recentOrders.map(order => {
                                const s = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                                return (
                                    <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/b2b/orders')}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-semibold text-slate-900 text-sm">{order.order_number}</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                {STATUS_LABELS[order.status] || order.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">{format(new Date(order.created_at), 'dd.MM.yyyy')}</span>
                                            <span className="font-semibold text-slate-700">€{order.total_amount.toLocaleString()}</span>
                                        </div>
                                        {order.estimated_delivery && (
                                            <div className="mt-1.5 text-[11px] text-blue-600 flex items-center gap-1">🚚 Dostawa: {format(new Date(order.estimated_delivery), 'dd.MM.yyyy')}</div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ DOSTAWA ═══ */}
            {stats?.nearestDelivery && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200/80 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">🚚</div>
                    <div>
                        <h3 className="font-semibold text-emerald-800 text-sm">Najbliższa dostawa</h3>
                        <p className="text-emerald-700 text-sm mt-0.5">
                            Przewidywana na <b>{format(new Date(stats.nearestDelivery), 'dd MMMM yyyy', { locale: pl })}</b>
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ SCHNEELASTZONE CHECKER ═══ */}
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm">Strefa obciążenia</h3>
                                <p className="text-[11px] text-slate-400">DIN EN 1991 · Wpisz PLZ</p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-1 sm:max-w-xs sm:ml-auto">
                            <div className="relative flex-1">
                                <input type="text" value={plzInput}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                        setPlzInput(val);
                                        if (val.length === 5) setZoneResult(StructuralZonesService.getZones(val));
                                        else setZoneResult(null);
                                    }}
                                    placeholder="np. 80331" maxLength={5}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-base tracking-widest" />
                                <svg className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <button onClick={() => { if (plzInput.length === 5) setZoneResult(StructuralZonesService.getZones(plzInput)); }}
                                disabled={plzInput.length !== 5}
                                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                Sprawdź
                            </button>
                        </div>
                    </div>

                    {zoneResult && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100/80">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Schneelastzone</span>
                                    </div>
                                    <div className="text-2xl font-black text-blue-900 mb-0.5">Strefa {zoneResult.snow.zone.toUpperCase()}</div>
                                    <div className="text-sm text-blue-700 font-semibold">{zoneResult.snow.loadKn.toFixed(2)} kN/m²</div>
                                    <div className="text-[11px] text-blue-400 mt-1">{zoneResult.snow.label}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-slate-200/70 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Windlastzone</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900 mb-0.5">Strefa {zoneResult.wind.zone}</div>
                                    <div className="text-sm text-slate-700 font-semibold">{zoneResult.wind.speedKmh} km/h · {zoneResult.wind.pressureKn.toFixed(2)} kN/m²</div>
                                    <div className="text-[11px] text-slate-400 mt-1">{zoneResult.wind.label}</div>
                                </div>
                            </div>
                            <div className={`p-3 rounded-xl flex items-center gap-3 ${
                                zoneResult.recommendation === 'heavy-duty' ? 'bg-red-50 border border-red-100' :
                                zoneResult.recommendation === 'reinforced' ? 'bg-amber-50 border border-amber-100' :
                                'bg-emerald-50 border border-emerald-100'
                            }`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    zoneResult.recommendation === 'heavy-duty' ? 'bg-red-100' :
                                    zoneResult.recommendation === 'reinforced' ? 'bg-amber-100' : 'bg-emerald-100'
                                }`}>
                                    {zoneResult.recommendation === 'heavy-duty' ? (
                                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    ) : zoneResult.recommendation === 'reinforced' ? (
                                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </div>
                                <div>
                                    <span className={`text-xs font-bold ${
                                        zoneResult.recommendation === 'heavy-duty' ? 'text-red-700' :
                                        zoneResult.recommendation === 'reinforced' ? 'text-amber-700' : 'text-emerald-700'
                                    }`}>
                                        {zoneResult.recommendation === 'heavy-duty' ? 'Zalecana ciężka konstrukcja' :
                                         zoneResult.recommendation === 'reinforced' ? 'Zalecana wzmocniona konstrukcja' :
                                         'Standardowa konstrukcja wystarczy'}
                                    </span>
                                    {zoneResult.warningMessage && (<p className="text-xs text-slate-500 mt-0.5">{zoneResult.warningMessage}</p>)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer — NO margin info visible to partner */}
            {partner && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>Partner: {partner.company_name}</span>
                    <span>Termin płatności: {partner.payment_terms_days} dni</span>
                </div>
            )}
        </div>
    );
}

export default B2BDashboard;
