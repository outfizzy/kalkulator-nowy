import React from 'react';

export const TrustSection: React.FC = () => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Trust Badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: '🛡️', title: '10 Jahre Garantie', desc: 'Auf Konstruktion' },
                    { icon: '👷', title: 'Profi-Montage', desc: 'Durch eigene Teams' },
                    { icon: '🇩🇪', title: 'Deutsche Qualität', desc: 'Nach DIN Normen' },
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
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Sehr professionelle Abwicklung von der Planung bis zur Montage. Das Dach sieht fantastisch aus!"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                MS
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Michael Schmidt</div>
                                <div className="text-xs text-slate-500">Berlin, Montage 2024</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-slate-600 italic text-sm mb-3">
                            "Top Qualität zu einem fairen Preis. Die Monteure waren sehr sauber und schnell."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
                                AK
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-900">Anna Weber</div>
                                <div className="text-xs text-slate-500">Potsdam, Montage 2024</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
