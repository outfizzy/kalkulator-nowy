import React from 'react';
import type { Offer } from '../types';
import { OfferSummary } from './OfferSummary';

interface OfferPreviewModalProps {
    offer: Offer;
    onClose: () => void;
}

export const OfferPreviewModal: React.FC<OfferPreviewModalProps> = ({ offer, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Podgląd Oferty #{offer.id}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-6 bg-slate-100">
                    <OfferSummary
                        offer={offer}
                        onReset={() => { }} // No-op for preview
                    />
                </div>
            </div>
        </div>
    );
};
