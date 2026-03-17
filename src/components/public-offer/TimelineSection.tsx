import React from 'react';

// Professional SVG icons for each step
const IconAccept = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconCalendar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
);

const IconFactory = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <path d="M2 20h20M4 20V10l4-2v4l4-2v4l4-2v4l4-2v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconTruck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
);

const IconHome = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const STEPS = [
    {
        Icon: IconAccept,
        title: 'Angebot annehmen',
        desc: 'Jetzt',
        active: true,
        color: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200',
        lineColor: 'bg-emerald-300',
    },
    {
        Icon: IconCalendar,
        title: 'Aufmaßtermin',
        desc: 'Innerhalb von 7 Tagen',
        active: false,
        color: 'bg-white text-slate-400 border-slate-200',
        lineColor: 'bg-slate-200',
    },
    {
        Icon: IconFactory,
        title: 'Produktion',
        desc: '4–6 Wochen',
        active: false,
        color: 'bg-white text-slate-400 border-slate-200',
        lineColor: 'bg-slate-200',
    },
    {
        Icon: IconTruck,
        title: 'Lieferung & Montage',
        desc: '1–2 Tage vor Ort',
        active: false,
        color: 'bg-white text-slate-400 border-slate-200',
        lineColor: 'bg-slate-200',
    },
    {
        Icon: IconHome,
        title: 'Fertige Überdachung',
        desc: 'Genießen Sie Ihre Terrasse!',
        active: false,
        color: 'bg-white text-slate-400 border-slate-200',
        lineColor: '',
    },
];

export const TimelineSection: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-slate-300">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Projektablauf
            </h3>

            <div className="space-y-0 relative">
                {STEPS.map((step, index) => (
                    <div key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
                        {/* Connector line */}
                        {index < STEPS.length - 1 && (
                            <div className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-20px)] ${step.lineColor} z-0`} />
                        )}
                        {/* Icon circle */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${step.color} ${step.active ? 'shadow-md' : ''}`}>
                            <step.Icon />
                        </div>
                        {/* Content */}
                        <div className="pt-1">
                            <div className={`font-bold text-sm leading-tight ${step.active ? 'text-slate-800' : 'text-slate-500'}`}>
                                {step.title}
                            </div>
                            <div className={`text-xs mt-0.5 ${step.active ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                {step.desc}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
