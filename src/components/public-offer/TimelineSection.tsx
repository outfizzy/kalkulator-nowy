import React from 'react';

export const TimelineSection: React.FC = () => {
    const steps = [
        { icon: '✅', title: 'Angebot annehmen', desc: 'Jetzt', active: true },
        { icon: '📅', title: 'Aufmaßtermin', desc: 'bis 7 Tage', active: false },
        { icon: '🏭', title: 'Produktion', desc: '4-6 Wochen', active: false },
        { icon: '🚚', title: 'Lieferung & Montage', desc: '1-2 Tage', active: false },
        { icon: '🎉', title: 'Fertige Überdachung', desc: 'Viel Freude!', active: false },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Projektablauf</h3>

            <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 z-0"></div>

                {steps.map((step, index) => (
                    <div key={index} className="relative z-10 flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 ${step.active
                            ? 'bg-blue-50 border-blue-500 shadow-sm shadow-blue-200'
                            : 'bg-white border-slate-200 text-slate-300'
                            }`}>
                            <span className={step.active ? 'opacity-100' : 'opacity-50 grayscale'}>
                                {step.icon}
                            </span>
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${step.active ? 'text-slate-800' : 'text-slate-500'}`}>
                                {step.title}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                                {step.desc}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Zahlung erst nach Montage!
            </div>
        </div>
    );
};
