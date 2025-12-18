import React from 'react';
import type { Installation } from '../../../types';

interface JobCardProps {
    installation: Installation;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: () => void;
    highlight?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ installation, onDragStart, onClick, highlight }) => {
    const isReady = installation.partsReady;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, installation.id)}
            onClick={onClick}
            className={`
                bg-white p-3 rounded-lg border shadow-sm cursor-move transition-all hover:shadow-md
                ${highlight ? 'ring-2 ring-indigo-500 scale-[1.02]' : 'border-slate-200'}
                ${!isReady ? 'opacity-80 bg-slate-50' : 'border-l-4 border-l-emerald-500 hover:border-indigo-300'}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">{installation.client.city}</h4>
                    <p className="text-xs text-slate-500">{installation.client.lastName}</p>
                </div>
                <div className={`
                    flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm border
                    ${isReady
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'}
                `}>
                    {isReady ? (
                        <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            GOTOWE
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            CZEKA
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{installation.expectedDuration || 1} dni</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate max-w-[140px]">{installation.productSummary}</span>
                </div>
                {installation.deliveryDate && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-medium border border-indigo-100 mt-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Dostawa: {installation.deliveryDate}</span>
                    </div>
                )}
            </div>

            {/* Contract/Offer Info */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                <span>#{installation.offerId.slice(0, 8)}</span>
                {installation.client.coordinates ? (
                    <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        GPS OK
                    </span>
                ) : (
                    <span className="text-slate-300">Brak GPS</span>
                )}
            </div>
        </div>
    );
};
