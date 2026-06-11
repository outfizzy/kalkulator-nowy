import React from 'react';
import {
    CalendarCheck, FileCheck, Factory, Handshake, HardHat,
    ShieldCheck, Clock, ChevronRight,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
 *  Projektablauf — 5 steps, clean vertical timeline
 * ────────────────────────────────────────────────────────────── */
interface Step {
    Icon: React.ComponentType<{ className?: string }>;
    title: string;
    range: string;
    you: string;
    us: string;
    color: string;        // dot bg
    colorLight: string;   // ring pulse
}

const STEPS: Step[] = [
    {
        Icon: CalendarCheck,
        title: 'Aufmaßtermin',
        range: 'Innerhalb 7 Tagen',
        you: 'Termin bestätigen',
        us: 'Fachberater kommt mit Mustern zu Ihnen',
        color: 'bg-[#1E6FD9]',
        colorLight: 'ring-[#1E6FD9]/20',
    },
    {
        Icon: FileCheck,
        title: 'Verbindliches Angebot',
        range: 'Direkt vor Ort oder 1–2 Tage',
        you: 'Angebot prüfen & freigeben',
        us: 'Festpreis-Angebot mit allen Details',
        color: 'bg-[#8B5CF6]',
        colorLight: 'ring-[#8B5CF6]/20',
    },
    {
        Icon: Handshake,
        title: 'Vertrag & Sicherheit',
        range: 'Nach Angebotsfreigabe',
        you: 'Vertrag in Ruhe prüfen & unterschreiben',
        us: 'Transparenter Vertrag — Sicherheit für beide Seiten',
        color: 'bg-[#0EA5E9]',
        colorLight: 'ring-[#0EA5E9]/20',
    },
    {
        Icon: Factory,
        title: 'Produktion',
        range: '4–6 Wochen',
        you: 'Zurücklehnen & vorfreuen',
        us: 'Maßanfertigung in der EU',
        color: 'bg-[#F59E0B]',
        colorLight: 'ring-[#F59E0B]/20',
    },
    {
        Icon: HardHat,
        title: 'Montage',
        range: '1–2 Tage vor Ort',
        you: 'Zugang ermöglichen',
        us: 'Professionelle Montage & Abnahme',
        color: 'bg-[#10B981]',
        colorLight: 'ring-[#10B981]/20',
    },
];

export const TimelineSection: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 md:px-8 border-b border-slate-100">
                <h3 className="text-[15px] font-bold text-slate-800">Projektablauf</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">In 5 Schritten zu Ihrer Traumterrasse</p>
            </div>

            {/* Timeline */}
            <div className="px-6 py-5 md:px-8">
                <div className="relative">
                    {/* Vertical gradient line */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#1E6FD9] via-[#8B5CF6] via-[#0EA5E9] via-[#F59E0B] to-[#10B981] rounded-full" />

                    <div className="space-y-0">
                        {STEPS.map((step, i) => {
                            const isLast = i === STEPS.length - 1;
                            return (
                                <div key={i} className={`relative flex gap-4 ${isLast ? 'pb-0' : 'pb-6'}`}>
                                    {/* Dot */}
                                    <div className="relative z-10 shrink-0 flex flex-col items-center">
                                        <div className={`w-[31px] h-[31px] rounded-full ${step.color} ring-4 ${step.colorLight} flex items-center justify-center text-white shadow-sm`}>
                                            <step.Icon className="w-[15px] h-[15px]" strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 -mt-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-[14px] font-bold text-slate-800">{step.title}</h4>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                                                <Clock className="w-2.5 h-2.5" />
                                                {step.range}
                                            </span>
                                        </div>

                                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                                            <p className="text-[12px] text-slate-500 flex items-start gap-1.5">
                                                <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                                                <span><span className="font-semibold text-slate-600">Sie:</span> {step.you}</span>
                                            </p>
                                            <p className="text-[12px] text-slate-500 flex items-start gap-1.5">
                                                <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                                                <span><span className="font-semibold text-emerald-600">Wir:</span> {step.us}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Non-binding reassurance */}
            <div className="mx-6 mb-5 md:mx-8 px-4 py-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                    <p className="text-[12px] font-bold text-slate-700">100 % unverbindlich</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Die Wahl eines Pakets ist nicht bindend — sie hilft uns, uns optimal auf den Aufmaßtermin vorzubereiten.
                    </p>
                </div>
            </div>
        </div>
    );
};
