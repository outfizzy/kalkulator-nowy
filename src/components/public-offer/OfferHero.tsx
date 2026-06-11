import React, { useState } from 'react';
import { ShieldCheck, Globe } from 'lucide-react';
import type { ProductConfig } from '../../types';
import { getModelImage, getModelDisplayName, getModelGallery } from '../../config/modelImages';

interface OfferHeroProps {
    product: ProductConfig;
    customerName: string;
    offerNumber: string;
}

export const OfferHero: React.FC<OfferHeroProps> = ({ product, customerName, offerNumber }) => {
    const gallery = getModelGallery(product.modelId);
    const [activeIdx, setActiveIdx] = useState(0);

    const heroImage = gallery[activeIdx] || getModelImage(product.modelId) || '/images/models/trendline.jpg';
    const displayName = getModelDisplayName(product.modelId);

    return (
        <div className="rounded-2xl overflow-hidden bg-white border border-[#E5E7EB] shadow-card">
            {/* Hero Image — large, cinematic */}
            <div className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden bg-[#0A1628]">
                <img
                    src={heroImage}
                    alt={displayName}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content on image */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10">
                    <p className="text-white/70 text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] mb-1.5">
                        Ihr persönliches Angebot
                    </p>
                    <h1 className="text-white text-2xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                        {customerName}
                    </h1>
                </div>

                {/* Offer number badge */}
                <div className="absolute top-4 right-4 md:top-6 md:right-6">
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2">
                        <p className="text-white/60 text-[10px] md:text-xs font-medium uppercase tracking-wider">Nr.</p>
                        <p className="text-white font-bold text-sm md:text-base font-mono">{offerNumber}</p>
                    </div>
                </div>
            </div>

            {/* Product info bar — clean, informative */}
            <div className="px-6 py-5 md:px-10 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        {displayName}
                    </h2>
                    {product.width > 0 && product.projection > 0 && (
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <path d="M21 3H3v18" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3l-8 8M21 3v4M21 3h-4M3 21h4M3 21v-4" strokeLinecap="round" />
                                </svg>
                                {product.width.toLocaleString('de-DE')} × {product.projection.toLocaleString('de-DE')} mm
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-sm text-slate-500">
                                {product.roofType === 'glass' ? 'Sicherheitsglas' : product.roofType === 'manual' ? 'Individuell' : 'Polycarbonat'}
                            </span>
                            {product.color && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-sm text-slate-500">{product.color}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Quality badges */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        10 J. Garantie
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                        <Globe className="w-3.5 h-3.5 text-violet-500" />
                        Made in EU
                    </span>
                </div>
            </div>

            {/* Thumbnail Gallery — only when multiple images */}
            {gallery.length > 1 && (
                <div className="px-6 pb-5 md:px-10 md:pb-6">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {gallery.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveIdx(idx)}
                                className={`relative flex-shrink-0 w-20 h-14 md:w-24 md:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                    idx === activeIdx
                                        ? 'border-[#1E6FD9] shadow-md ring-1 ring-[#6DB1FF]'
                                        : 'border-[#E5E7EB] opacity-60 hover:opacity-100 hover:border-slate-300'
                                }`}
                            >
                                <img
                                    src={img}
                                    alt={`${displayName} ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
