import React from 'react';
import type { ProductConfig } from '../../types';
import { getModelImage, getModelDisplayName } from '../../config/modelImages';

interface OfferHeroProps {
    product: ProductConfig;
    customerName: string;
    offerNumber: string;
}

export const OfferHero: React.FC<OfferHeroProps> = ({ product, customerName, offerNumber }) => {
    // Select image based on model - use our configured images first
    const getHeroImage = (modelId: string) => {
        // 1. Try to get from our configured model images (has correct file extensions)
        const configuredImage = getModelImage(modelId);
        if (configuredImage) return configuredImage;

        // 2. Fallback to product.imageUrl if configured image not found
        if (product.imageUrl) return product.imageUrl;

        // 3. Final fallback to placeholder
        return '/images/models/trendline.webp';
    };

    return (
        <div className="relative h-[400px] w-full rounded-2xl overflow-hidden shadow-md mb-8">
            {/* Background Image */}
            <img
                src={getHeroImage(product.modelId)}
                alt={product.modelId}
                className="absolute inset-0 w-full h-full object-cover"
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
    );
};
