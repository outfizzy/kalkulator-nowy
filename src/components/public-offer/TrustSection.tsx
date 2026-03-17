import React from 'react';

// Professional SVG Icons
const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
);

const IconTeam = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconRuler = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M21 3H3v18h18V3zM3 9h6M3 15h6M9 3v6M15 3v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12h3M3 6h3M6 3v3M12 3v3" strokeLinecap="round" opacity={0.5} />
    </svg>
);

const IconStar = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const TRUST_BADGES = [
    {
        Icon: IconShield,
        title: '5 Jahre Garantie',
        desc: 'Auf Konstruktion & Montage',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        borderColor: 'border-emerald-100',
    },
    {
        Icon: IconTeam,
        title: 'Profi-Montage',
        desc: 'Durch eigene Montageteams',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-100',
    },
    {
        Icon: IconRuler,
        title: 'Statisch Geprüft',
        desc: 'Nach DIN EN 1991',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        borderColor: 'border-violet-100',
    },
    {
        Icon: IconStar,
        title: 'Top Bewertet',
        desc: '4.9/5 auf Google',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-500',
        borderColor: 'border-amber-100',
    },
];

export const TrustSection: React.FC = () => {
    return (
        <div className="space-y-8">
            {/* Trust Badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {TRUST_BADGES.map((badge, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className={`w-11 h-11 ${badge.iconBg} ${badge.iconColor} rounded-xl flex items-center justify-center mb-3 border ${badge.borderColor} group-hover:scale-105 transition-transform`}>
                            <badge.Icon />
                        </div>
                        <div className="font-bold text-slate-800 text-sm leading-tight">{badge.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{badge.desc}</div>
                    </div>
                ))}
            </div>

            {/* Social Proof — Google Reviews link */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </span>
                        Kundenbewertungen
                    </h3>
                    <a
                        href="https://www.google.com/maps/place/Polendach24"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                    >
                        Alle ansehen
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        {
                            text: 'Von der Beratung bis zur Montage – alles top! Das Terrassendach hat unseren Garten komplett aufgewertet.',
                            initials: 'P.K.',
                            name: 'Zufriedener Kunde',
                            location: 'Brandenburg',
                            color: 'bg-blue-50 text-blue-600 border-blue-100',
                        },
                        {
                            text: 'Top Qualität zu einem fairen Preis. Die Monteure waren sehr sauber und professionell. Gerne wieder!',
                            initials: 'S.W.',
                            name: 'Zufriedener Kunde',
                            location: 'Sachsen',
                            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                        },
                        {
                            text: 'Wir genießen jetzt das ganze Jahr unsere Terrasse. Selbst bei Regen ist es gemütlich unter dem Dach!',
                            initials: 'M.R.',
                            name: 'Zufriedener Kunde',
                            location: 'Berlin',
                            color: 'bg-violet-50 text-violet-600 border-violet-100',
                        },
                    ].map((review, i) => (
                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                            {/* Stars */}
                            <div className="flex items-center gap-0.5 mb-2.5 text-amber-400">
                                {[...Array(5)].map((_, j) => (
                                    <svg key={j} viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed mb-3">
                                „{review.text}"
                            </p>
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${review.color}`}>
                                    {review.initials}
                                </div>
                                <div>
                                    <div className="font-semibold text-xs text-slate-700">{review.name}</div>
                                    <div className="text-[10px] text-slate-400">{review.location}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Google Reviews badge */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="text-xs text-slate-400 font-medium">Verifizierte Google-Bewertungen</span>
                </div>
            </div>
        </div>
    );
};
