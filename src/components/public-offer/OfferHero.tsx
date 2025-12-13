import React from 'react';
import type { ProductConfig } from '../../types';

interface OfferHeroProps {
    product: ProductConfig;
    customerName: string;
    offerNumber: string;
}

export const OfferHero: React.FC<OfferHeroProps> = ({ product, customerName, offerNumber }) => {
    // Select image based on model
    const getHeroImage = (modelId: string) => {
        const id = modelId.toLowerCase();
        if (id.includes('skystyle')) return '/images/skystyle-hero.jpg';
        if (id.includes('trend')) return 'https://images.unsplash.com/photo-1596241913227-23846995662a?auto=format&fit=crop&w=1200&q=80';
        if (id.includes('premium') || id.includes('prestige')) return 'https://images.unsplash.com/photo-1623157390772-2d334b220c5c?auto=format&fit=crop&w=1200&q=80';
        if (id.includes('loft')) return 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=1200&q=80';
        return 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80'; // Fallback
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
                            {product.modelId.charAt(0).toUpperCase() + product.modelId.slice(1)} Edition
                        </h1>
                        <p className="text-lg md:text-xl text-slate-200">
                            {product.width}mm x {product.projection}mm | {product.roofType === 'glass' ? 'Sicherheitsglas' : 'Polycarbonat'}
                        </p>
                    </div>

                    <div className="text-right hidden md:block">
                        <div className="text-sm opacity-70">Oferta nr</div>
                        <div className="text-xl font-mono font-bold">{offerNumber}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
