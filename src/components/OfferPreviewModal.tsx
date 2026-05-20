import React, { useState, useEffect } from 'react';
import type { Offer } from '../types';
import { DatabaseService } from '../services/database';

interface OfferPreviewModalProps {
    offer: Offer;
    onClose: () => void;
}

export const OfferPreviewModal: React.FC<OfferPreviewModalProps> = ({ offer, onClose }) => {
    const [token, setToken] = useState<string | null>(offer.publicToken || null);
    const [loading, setLoading] = useState(!offer.publicToken);

    useEffect(() => {
        if (!token) {
            const ensureToken = async () => {
                try {
                    const t = await DatabaseService.ensurePublicToken(offer.id);
                    setToken(t);
                } catch (e) {
                    console.error('Failed to generate preview token:', e);
                } finally {
                    setLoading(false);
                }
            };
            ensureToken();
        }
    }, [offer.id, token]);

    const previewUrl = token ? `/p/offer/${token}` : null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-800 truncate">
                                Podgląd Oferty — {offer.customer.firstName} {offer.customer.lastName}
                            </h2>
                            <p className="text-xs text-slate-400 truncate">
                                {offer.offerNumber || offer.id.slice(0, 8)} • {offer.product?.modelId || 'Oferta'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {previewUrl && (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                title="Otwórz w nowej karcie"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Nowa karta
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-slate-100">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-slate-400">Przygotowuję podgląd oferty...</p>
                            </div>
                        </div>
                    ) : previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title={`Podgląd oferty ${offer.offerNumber || offer.id}`}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="text-4xl mb-3">⚠️</div>
                                <p className="text-sm text-slate-500 font-medium">Nie udało się wygenerować podglądu</p>
                                <p className="text-xs text-slate-400 mt-1">Spróbuj ponownie lub otwórz ofertę bezpośrednio</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
