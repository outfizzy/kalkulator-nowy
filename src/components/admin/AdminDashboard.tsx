import React from 'react';
import { SalesTeamStats } from './SalesTeamStats';
import { PartnerOffersList } from './PartnerOffersList';

export const AdminDashboard: React.FC = () => {
    return (
        <div className="space-y-8">
            <section>
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Panel Administratora</h1>
                    <p className="text-slate-600">Przegląd wyników sprzedaży i aktywności partnerów</p>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Zespół Sprzedażowy
                    </h2>
                    <SalesTeamStats />
                </div>
            </section>

            <section>
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Partnerzy B2B
                    </h2>
                    <PartnerOffersList />
                </div>
            </section>
        </div>
    );
};
