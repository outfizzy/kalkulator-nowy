import React from 'react';
import { UserRound, Building2, Phone, Mail, ShieldCheck } from 'lucide-react';
import type { Offer } from '../../types';

interface CreatorProfileSectionProps {
    creator: Required<Offer>['creator'] & { clientPhone?: string; clientEmail?: string };
}

export const CreatorProfileSection: React.FC<CreatorProfileSectionProps> = ({ creator }) => {
    // Prefer client-facing contact, fallback to internal
    const displayPhone = creator.clientPhone || creator.phone;
    const displayEmail = creator.clientEmail || creator.email;

    // ── Robust monogram ──
    // Build initials from the advisor's name. If no real name is present
    // (e.g. a generic "Fachberater"), fall back to the company monogram "PD"
    // or a building icon — never an empty square.
    const first = (creator.firstName || '').trim();
    const last = (creator.lastName || '').trim();
    const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    const hasName = initials.length > 0;
    const fullName = `${first} ${last}`.trim() || 'Ihr Fachberater';

    return (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden">
            {/* Rep Profile Header */}
            <div className="bg-gradient-to-br from-[#F0F6FF] to-[#EAF2FE] px-6 py-5 md:px-8">
                <p className="text-[10px] text-[#1E6FD9] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <UserRound className="w-3.5 h-3.5" /> Ihr Ansprechpartner
                </p>
                <div className="flex items-center gap-4">
                    {/* Avatar — monogram on a gradient (or company icon fallback) */}
                    <div className="w-14 h-14 bg-gradient-to-br from-[#1E6FD9] to-[#195FC0] rounded-2xl flex items-center justify-center text-white border-2 border-white shadow-lg shadow-[#6DB1FF]/40 shrink-0">
                        {hasName ? (
                            <span className="font-bold text-lg leading-none tracking-wide">{initials}</span>
                        ) : (
                            <Building2 className="w-7 h-7" strokeWidth={1.75} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-slate-800 font-bold text-lg leading-tight truncate">{fullName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Fachberater · Polendach24</p>
                    </div>
                </div>
            </div>

            {/* Contact Links */}
            <div className="px-6 py-4 space-y-3">
                {displayPhone && (
                    <a href={`tel:${displayPhone}`} className="flex items-center gap-3 p-3 bg-[#EAF2FE] hover:bg-[#DCEAFD] rounded-xl transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9]">
                        <div className="w-9 h-9 bg-[#DCEAFD] group-hover:bg-[#C7DFFB] rounded-lg flex items-center justify-center text-[#1E6FD9] transition-colors shrink-0">
                            <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-[#1E6FD9] font-medium">Direkt anrufen</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{displayPhone}</p>
                        </div>
                    </a>
                )}
                {displayEmail && (
                    <a href={`mailto:${displayEmail}`} className="flex items-center gap-3 p-3 bg-[#F0F6FF] hover:bg-[#E3EEFE] rounded-xl transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9]">
                        <div className="w-9 h-9 bg-[#DCEAFD] group-hover:bg-[#C7DFFB] rounded-lg flex items-center justify-center text-[#1E6FD9] transition-colors shrink-0">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-[#1E6FD9] font-medium">E-Mail schreiben</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{displayEmail}</p>
                        </div>
                    </a>
                )}
            </div>

            {/* General Company Numbers */}
            <div className="px-6 pb-5 pt-2">
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Oder unser Büro-Team erreichen</p>
                    <div className="space-y-2">
                        <a href="tel:+4935615019981" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#1E6FD9] transition-colors font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            03561 501 9981
                        </a>
                        <a href="tel:+49015888649130" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#1E6FD9] transition-colors font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            01588 864 9130
                        </a>
                    </div>
                </div>
            </div>

            {/* Trust footer */}
            <div className="px-6 pb-5 -mt-1">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Persönliche Beratung · Antwort in der Regel innerhalb 24 h
                </p>
            </div>
        </div>
    );
};
