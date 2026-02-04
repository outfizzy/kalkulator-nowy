import React from 'react';

export const TrustSection: React.FC = () => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Trust Badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: '🛡️', title: '5 Jahre Garantie', desc: 'Auf Konstruktion & Montage' },
                    { icon: '👷', title: 'Profi-Montage', desc: 'Durch eigene Teams' },
                    { icon: '📐', title: 'Statisch Geprüft', desc: 'Nach DIN EN 1991' },
                    { icon: '⭐', title: 'Top Bewertet', desc: '4.9/5 auf Google' },
                ].map((badge, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="text-3xl">{badge.icon}</div>
                        <div>
                            <div className="font-bold text-slate-800 text-sm">{badge.title}</div>
                            <div className="text-xs text-slate-500">{badge.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Testimonials */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-yellow-500">★★★★★</span>
                    Das sagen unsere Kunden
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Von der Beratung bis zur Montage – alles top! Das Terrassendach hat unseren Garten komplett aufgewertet."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                MS
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Michael Schmidt</div>
                                <div className="text-xs text-slate-500">Berlin, Montage 2025</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Top Qualität zu einem fairen Preis. Die Monteure waren sehr sauber und professionell."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
                                AW
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Anna Weber</div>
                                <div className="text-xs text-slate-500">Potsdam, Montage 2024</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Wir genießen jetzt das ganze Jahr unsere Terrasse. Selbst bei Regen ist es gemütlich!"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                                KM
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Klaus Müller</div>
                                <div className="text-xs text-slate-500">Dresden, Montage 2023</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Schnelle Lieferung, perfekte Montage. Das Team war super freundlich und hat alles sauber hinterlassen."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                                SB
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Sandra Becker</div>
                                <div className="text-xs text-slate-500">Hamburg, Montage 2024</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Nach 2 Jahren immer noch wie neu! Keine Verfärbungen, keine Probleme. Absolute Empfehlung."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-xs">
                                TH
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Thomas Hoffmann</div>
                                <div className="text-xs text-slate-500">München, Montage 2022</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Die individuelle Beratung war super. Man merkt, dass hier Profis am Werk sind."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-xs">
                                LK
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Lisa Klein</div>
                                <div className="text-xs text-slate-500">Frankfurt, Montage 2025</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flexible Financing Note */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="text-3xl">💳</div>
                    <div>
                        <h4 className="font-bold text-slate-800 mb-1">Flexible Finanzierungsmöglichkeiten</h4>
                        <p className="text-sm text-slate-600">
                            Wir bieten verschiedene Zahlungsoptionen, die wir individuell an Ihre Bedürfnisse anpassen können.
                            Sprechen Sie uns einfach an – gemeinsam finden wir die beste Lösung für Sie.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
