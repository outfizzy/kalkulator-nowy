import React from 'react';
import { Users } from 'lucide-react';

const SALES_TEAM = [
    {
        name: 'Mike Ledwin',
        position: 'Vertriebsberater',
        phone: '+49 152 57487430',
        phoneHref: 'tel:+4915257487430',
        email: 'm.ledwin@polendach24.de',
        initials: 'ML',
        gradient: 'from-blue-500 to-indigo-600',
        shadow: 'shadow-blue-200',
    },
    {
        name: 'Hubert Kościów',
        position: 'Vertriebsberater',
        phone: '+49 152 23634823',
        phoneHref: 'tel:+4915223634823',
        email: 'h.kosciow@polendach24.de',
        initials: 'HK',
        gradient: 'from-emerald-500 to-teal-600',
        shadow: 'shadow-emerald-200',
    },
    {
        name: 'Oliwia Duź',
        position: 'Vertriebsberaterin',
        phone: '+49 162 6692445',
        phoneHref: 'tel:+491626692445',
        email: 'o.duz@polendach24.de',
        initials: 'OD',
        gradient: 'from-violet-500 to-purple-600',
        shadow: 'shadow-violet-200',
    },
];

export const SalesTeamSection: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#F0F6FF] to-[#EAF2FE] px-6 py-5 md:px-8 border-b border-[#E5E7EB]">
                <p className="text-[10px] text-[#1E6FD9] font-bold uppercase tracking-[0.15em] mb-1 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Ihr Vertriebsteam
                </p>
                <p className="text-sm text-slate-500 ml-[22px]">Rufen Sie einfach an oder schreiben Sie uns — wir beraten Sie gerne!</p>
            </div>

            {/* Team Cards */}
            <div className="p-4 space-y-3">
                {SALES_TEAM.map((rep) => (
                    <div key={rep.email} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        {/* Avatar */}
                        <div className={`w-12 h-12 bg-gradient-to-br ${rep.gradient} rounded-xl flex items-center justify-center text-white font-bold text-sm border-2 border-white ${rep.shadow} shadow-lg shrink-0`}>
                            {rep.initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-slate-800 font-bold text-sm">{rep.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{rep.position} • Polendach24</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <a
                                href={rep.phoneHref}
                                className="w-11 h-11 bg-[#EAF2FE] hover:bg-[#DCEAFD] rounded-full flex items-center justify-center text-[#1E6FD9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-1"
                                title={`${rep.name} anrufen`}
                                aria-label={`${rep.name} anrufen`}
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </a>
                            <a
                                href={`mailto:${rep.email}`}
                                className="w-11 h-11 bg-[#EAF2FE] hover:bg-[#DCEAFD] rounded-full flex items-center justify-center text-[#1E6FD9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-1"
                                title={`${rep.name} E-Mail`}
                                aria-label={`${rep.name} E-Mail schreiben`}
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* Company Fallback */}
            <div className="px-6 pb-5 pt-1">
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Oder unser Büro-Team erreichen</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <a href="tel:+4935615019981" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#1E6FD9] transition-colors font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            03561 501 9981
                        </a>
                        <a href="tel:+4915888649130" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#1E6FD9] transition-colors font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            01588 864 9130
                        </a>
                        <a href="mailto:buero@polendach24.de" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#1E6FD9] transition-colors font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            buero@polendach24.de
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
