import React, { useMemo } from 'react';
import { UserRound, Phone, Mail, MessageCircle, ShieldCheck, Star } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
 *  TeamSection — shows all 3 sales reps in a randomised order
 *  Used on agent-generated offers so the customer sees real people.
 * ────────────────────────────────────────────────────────────── */

interface TeamMember {
    firstName: string;
    lastName: string;
    phone: string;        // nicely formatted display
    phoneTel: string;     // tel: href (no spaces)
    email: string;
    whatsapp: string;
    position: string;
}

const TEAM: TeamMember[] = [
    {
        firstName: 'Mike',
        lastName: 'Ledwin',
        phone: '0152 5748 7430',
        phoneTel: '+4915257487430',
        email: 'm.ledwin@polendach24.de',
        whatsapp: '4915257487430',
        position: 'Fachberater',
    },
    {
        firstName: 'Hubert',
        lastName: 'Kosciow',
        phone: '0152 2363 4823',
        phoneTel: '+49152223634823',
        email: 'h.kosciow@polendach24.de',
        whatsapp: '49152223634823',
        position: 'Fachberater',
    },
    {
        firstName: 'Oliwia',
        lastName: 'Duz',
        phone: '0162 6692 445',
        phoneTel: '+491626692445',
        email: 'o.duz@polendach24.de',
        whatsapp: '491626692445',
        position: 'Fachberaterin',
    },
];

/** Fisher-Yates shuffle (pure — returns new array) */
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const GRADIENTS = [
    { bg: 'from-[#1E6FD9] to-[#3B82F6]', shadow: 'shadow-blue-300/30', ring: 'ring-blue-100' },
    { bg: 'from-[#10B981] to-[#34D399]', shadow: 'shadow-emerald-300/30', ring: 'ring-emerald-100' },
    { bg: 'from-[#8B5CF6] to-[#A78BFA]', shadow: 'shadow-violet-300/30', ring: 'ring-violet-100' },
];

export const TeamSection: React.FC = () => {
    const members = useMemo(() => shuffle(TEAM), []);

    return (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden">
            {/* Header */}
            <div className="relative px-6 py-5 md:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F0F6FF] via-white to-[#EAF2FE]" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#1E6FD9]/[0.05] to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1E6FD9] to-[#3B82F6] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-300/30">
                        <UserRound className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Ihre Ansprechpartner</h3>
                        <p className="text-[12px] text-slate-400">Unser Fachberater-Team steht Ihnen persönlich zur Verfügung</p>
                    </div>
                </div>
            </div>

            {/* Team cards — horizontal on desktop, stacked on mobile */}
            <div className="px-4 pb-4 md:px-6 md:pb-6">
                <div className="space-y-3">
                    {members.map((m, idx) => {
                        const initials = `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`;
                        const fullName = `${m.firstName} ${m.lastName}`;
                        const g = GRADIENTS[idx];

                        return (
                            <div key={idx} className={`relative rounded-xl border border-slate-100 hover:border-slate-200 bg-gradient-to-br from-white to-slate-50/40 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-between gap-3`}>
                                {/* Avatar + Name */}
                                <div className="flex items-center gap-3 mb-0">
                                    <div className={`w-11 h-11 bg-gradient-to-br ${g.bg} rounded-xl flex items-center justify-center text-white border-2 border-white shadow-lg ${g.shadow} shrink-0`}>
                                        <span className="font-bold text-sm leading-none tracking-wide">{initials}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-slate-800 font-bold text-[13px] leading-tight">{fullName}</h4>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{m.position} · Polendach24</p>
                                        <p className="text-[11px] text-[#1E6FD9] font-semibold mt-0.5">{m.phone}</p>
                                    </div>
                                </div>

                                {/* Contact buttons — compact icons */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={`tel:${m.phoneTel}`}
                                        className="flex items-center justify-center w-9 h-9 bg-[#EAF2FE] hover:bg-[#DCEAFD] rounded-lg transition-colors"
                                    >
                                        <Phone className="w-4 h-4 text-[#1E6FD9]" />
                                    </a>
                                    <a
                                        href={`https://wa.me/${m.whatsapp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-9 h-9 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                    >
                                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                                    </a>
                                    <a
                                        href={`mailto:${m.email}`}
                                        className="flex items-center justify-center w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Mail className="w-4 h-4 text-slate-500" />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Office footer + trust */}
            <div className="mx-4 mb-4 md:mx-6 md:mb-6 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm ring-1 ring-slate-200">
                        <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Büro-Zentrale</p>
                        <a href="tel:+4935615019981" className="text-[13px] font-bold text-slate-700 hover:text-[#1E6FD9] transition-colors tracking-wide">
                            03561 501 9981
                        </a>
                    </div>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Antwort in der Regel innerhalb 24 h
                </p>
            </div>
        </div>
    );
};
