import React from 'react';
import type { Offer } from '../../types';

interface CreatorProfileSectionProps {
    creator: Required<Offer>['creator'] & { clientPhone?: string; clientEmail?: string };
}

export const CreatorProfileSection: React.FC<CreatorProfileSectionProps> = ({ creator }) => {
    // Prefer client-facing contact, fallback to internal
    const displayPhone = creator.clientPhone || creator.phone;
    const displayEmail = creator.clientEmail || creator.email;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Rep Profile Header */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/50 p-6 pb-5">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[1.5px] mb-3">Ihr Ansprechpartner</p>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-lg shadow-blue-200">
                        {creator.firstName.charAt(0)}{creator.lastName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-slate-800 font-bold text-lg">{creator.firstName} {creator.lastName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Fachberater • Polendach24</p>
                    </div>
                </div>
            </div>

            {/* Contact Links */}
            <div className="px-6 py-4 space-y-3">
                {displayPhone && (
                    <a href={`tel:${displayPhone}`} className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group">
                        <div className="w-9 h-9 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Direkt anrufen</p>
                            <p className="text-sm font-bold text-slate-800">{displayPhone}</p>
                        </div>
                    </a>
                )}
                {displayEmail && (
                    <a href={`mailto:${displayEmail}`} className="flex items-center gap-3 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors group">
                        <div className="w-9 h-9 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg flex items-center justify-center text-indigo-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] text-indigo-500 font-medium">E-Mail schreiben</p>
                            <p className="text-sm font-bold text-slate-800">{displayEmail}</p>
                        </div>
                    </a>
                )}
            </div>

            {/* General Company Numbers */}
            <div className="px-6 pb-5 pt-2">
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Oder unser Büro-Team erreichen</p>
                    <div className="space-y-2">
                        <a href="tel:+4935615019981" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            03561 501 9981
                        </a>
                        <a href="tel:+49015888649130" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            01588 864 9130
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
