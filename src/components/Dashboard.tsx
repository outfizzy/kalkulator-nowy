import React, { useEffect, useState } from 'react';
import { getCommissionStats } from '../utils/storage';
import { VOLUME_TIERS } from '../utils/commission';
import type { CommissionStats } from '../types';

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<CommissionStats | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = () => {
        setStats(getCommissionStats());
    };

    if (!stats) return <div>Ładowanie...</div>;

    const currentTier = VOLUME_TIERS.find(
        tier => stats.soldOffers >= tier.min && stats.soldOffers <= tier.max
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">Przegląd wyników sprzedażowych</p>
            </div>

            {/* Kafelki statystyk */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Całkowita liczba ofert */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Wszystkie oferty</p>
                            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalOffers}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                        {stats.draftOffers} utworzonych / {stats.sentOffers} wysłanych
                    </div>
                </div>

                {/* Sprzedane oferty */}
                <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Sprzedane</p>
                            <p className="text-3xl font-bold text-green-700 mt-2">{stats.soldOffers}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-green-600 font-medium">
                        {currentTier?.label || 'Brak bonusu'}
                    </div>
                </div>

                {/* Przychód */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Przychód (brutto)</p>
                            <p className="text-3xl font-bold text-slate-900 mt-2">
                                {stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                        Ze sprzedanych ofert
                    </div>
                </div>

                {/* Prowizja */}
                <div className="bg-gradient-to-br from-accent to-sky-600 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/80 font-medium">Twoja Prowizja</p>
                            <p className="text-3xl font-bold text-white mt-2">
                                {stats.totalCommission.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-white/90 font-medium">
                        Gotowe do wypłaty
                    </div>
                </div>
            </div>

            {/* Prognozy */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Prognoza</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Potencjalny przychód</p>
                        <p className="text-2xl font-bold text-slate-700">
                            {stats.projectedRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Z {stats.draftOffers + stats.sentOffers} ofert (utworzone + wysłane)
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Potencjalna prowizja</p>
                        <p className="text-2xl font-bold text-accent">
                            {stats.projectedCommission.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Jeśli wszystkie zostaną sprzedane
                        </p>
                    </div>
                </div>
            </div>

            {/* System prowizji */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">System Prowizji</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-accent"></div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Prowizja bazowa: 5% marży</p>
                            <p className="text-xs text-slate-500">Minimalna stawka dla każdej oferty</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-green-500"></div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Bonus za marżę: do +2%</p>
                            <p className="text-xs text-slate-500">60% marży = 6% prowizji, 70% marży = 7% prowizji</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-purple-500"></div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Bonus za wolumen: do +1.5%</p>
                            <div className="mt-2 space-y-1">
                                {VOLUME_TIERS.map((tier, idx) => (
                                    <p key={idx} className={`text-xs ${stats.soldOffers >= tier.min && stats.soldOffers <= tier.max ? 'text-purple-700 font-bold' : 'text-slate-400'}`}>
                                        • {tier.label}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
