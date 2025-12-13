import React from 'react';
import type { Offer } from '../../types';

interface CreatorProfileSectionProps {
    creator: Required<Offer>['creator'];
}

export const CreatorProfileSection: React.FC<CreatorProfileSectionProps> = ({ creator }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-white shadow-sm">
                {creator.firstName.charAt(0)}{creator.lastName.charAt(0)}
            </div>
            <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Ihr Ansprechpartner</p>
                <h3 className="text-slate-800 font-bold">{creator.firstName} {creator.lastName}</h3>
                <div className="flex flex-col gap-0.5 mt-1">
                    {creator.phone && (
                        <a href={`tel:${creator.phone}`} className="text-sm text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {creator.phone}
                        </a>
                    )}
                    {creator.email && (
                        <a href={`mailto:${creator.email}`} className="text-sm text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {creator.email}
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
