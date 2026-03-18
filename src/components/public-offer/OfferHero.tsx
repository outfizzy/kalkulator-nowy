import React, { useState } from 'react';
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

    return (
        <div className="mb-8">
            {/* Main Hero Image */}
            <div className="relative h-[400px] w-full rounded-2xl overflow-hidden shadow-md">
                <img
                    src={heroImage}
                    alt={getModelDisplayName(product.modelId)}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"></div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 text-white">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="inline-block px-3 py-1 bg-blue-600 text-xs font-bold uppercase tracking-wider rounded-full mb-3 shadow-lg shadow-blue-900/50">
                                Exklusives Angebot für {customerName}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-2 shadow-sm text-shadow">
                                {getModelDisplayName(product.modelId)} Edition
                            </h1>
                            <p className="text-lg md:text-xl text-slate-200">
                                {product.width > 0 && product.projection > 0
                                    ? `${product.width}mm x ${product.projection}mm | ${product.roofType === 'glass' ? 'Sicherheitsglas' : product.roofType === 'manual' ? 'Individuell' : 'Polycarbonat'}`
                                    : 'Individuelles Angebot'}
                            </p>
                        </div>

                        <div className="text-right hidden md:block">
                            <div className="text-sm opacity-70">Angebotsnr.</div>
                            <div className="text-xl font-mono font-bold">{offerNumber}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thumbnail Gallery — only when multiple images exist */}
            {gallery.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {gallery.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                idx === activeIdx
                                    ? 'border-blue-500 shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                                    : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                            }`}
                        >
                            <img
                                src={img}
                                alt={`${getModelDisplayName(product.modelId)} ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
