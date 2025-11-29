import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <div className="relative z-10 w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="flex justify-center mb-8">
                        <img
                            src="/logo.png"
                            alt="PolenDach 24"
                            className="h-24 w-auto"
                        />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Platforma Ofertowa
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Profesjonalne narzędzia do konfiguracji i wyceny zadaszeń aluminiowych
                    </p>
                </div>

                {/* Cards Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">

                    {/* Sales Rep Card */}
                    <div
                        onClick={() => navigate('/login')}
                        className="group relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 hover:border-accent/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-accent/10 hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-accent-soft rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-3">
                                Panel Przedstawiciela
                            </h2>
                            <p className="text-slate-400 mb-6">
                                Dla pracowników działu handlowego. Twórz oferty, zarządzaj klientami i śledź swoje wyniki sprzedaży.
                            </p>

                            <div className="flex items-center text-accent font-medium group-hover:translate-x-2 transition-transform">
                                Przejdź do logowania
                                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Partner Card */}
                    <div
                        onClick={() => navigate('/partner/login')}
                        className="group relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-3">
                                Strefa Partnera B2B
                            </h2>
                            <p className="text-slate-400 mb-6">
                                Dla firm współpracujących i hurtowni. Dostęp do cen hurtowych, uproszczony kalkulator i wsparcie techniczne.
                            </p>

                            <div className="flex items-center text-emerald-400 font-medium group-hover:translate-x-2 transition-transform">
                                Zaloguj lub Zarejestruj
                                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="mt-16 text-center">
                    <p className="text-slate-500 text-sm">
                        © 2024 PolenDach 24. Wszelkie prawa zastrzeżone.
                    </p>
                </div>
            </div>
        </div>
    );
};
