/**
 * B2B Promotions Page
 * Partner page for viewing active promotions and special offers
 */

import React, { useState, useEffect } from 'react';
import { B2BService, B2BPromotion } from '../../services/database/b2b.service';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

const DISCOUNT_LABELS: Record<string, string> = {
    percent: '% Rabatt',
    fixed: '€ Rabatt',
    bundle: 'Bundle-Angebot',
    free_shipping: 'Kostenloser Versand'
};

export function B2BPromotionsPage() {
    const [promotions, setPromotions] = useState<B2BPromotion[]>([]);
    const [selectedPromo, setSelectedPromo] = useState<B2BPromotion | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPromotions();
    }, []);

    async function loadPromotions() {
        setLoading(true);
        try {
            const data = await B2BService.getActivePromotions();
            setPromotions(data);
        } catch (err) {
            console.error('Error loading promotions:', err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const featuredPromos = promotions.filter(p => p.is_featured);
    const regularPromos = promotions.filter(p => !p.is_featured);

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    🔥 Aktuelle Aktionen
                </h1>
                <p className="text-gray-500 mt-1">Sonderangebote und Rabatte für unsere B2B Partner</p>
            </div>

            {/* Featured Promotions - Large Cards */}
            {featuredPromos.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        ⭐ Empfohlene Aktionen
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {featuredPromos.map(promo => (
                            <div
                                key={promo.id}
                                onClick={() => setSelectedPromo(promo)}
                                className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1"
                            >
                                {/* Background decoration */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="text-4xl font-black mb-1">
                                                {promo.discount_type === 'percent' && `-${promo.discount_value}%`}
                                                {promo.discount_type === 'fixed' && `-€${promo.discount_value}`}
                                                {promo.discount_type === 'bundle' && '🎁 Bundle'}
                                                {promo.discount_type === 'free_shipping' && '🚚 Gratis'}
                                            </div>
                                            <div className="text-blue-100 text-sm">
                                                {DISCOUNT_LABELS[promo.discount_type]}
                                            </div>
                                        </div>
                                        {promo.promo_code && (
                                            <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-lg text-sm font-mono">
                                                {promo.promo_code}
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold mb-2">{promo.title}</h3>
                                    {promo.description && (
                                        <p className="text-blue-100 text-sm mb-4 line-clamp-2">
                                            {promo.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between">
                                        {promo.end_date && (
                                            <div className="flex items-center gap-2 text-sm text-blue-100">
                                                <span>⏰</span>
                                                <span>
                                                    Endet {formatDistanceToNow(new Date(promo.end_date), { addSuffix: true, locale: de })}
                                                </span>
                                            </div>
                                        )}
                                        <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                                            Details →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Regular Promotions Grid */}
            {regularPromos.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        📋 Alle Aktionen
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {regularPromos.map(promo => (
                            <div
                                key={promo.id}
                                onClick={() => setSelectedPromo(promo)}
                                className="bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {promo.discount_type === 'percent' && `-${promo.discount_value}%`}
                                        {promo.discount_type === 'fixed' && `-€${promo.discount_value}`}
                                        {promo.discount_type === 'bundle' && '🎁'}
                                        {promo.discount_type === 'free_shipping' && '🚚'}
                                    </div>
                                    {promo.promo_code && (
                                        <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">
                                            {promo.promo_code}
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-semibold text-gray-900 mb-1">{promo.title}</h3>
                                {promo.description && (
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                                        {promo.description}
                                    </p>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-400">
                                    {promo.min_order_value > 0 && (
                                        <span>Ab €{promo.min_order_value}</span>
                                    )}
                                    {promo.end_date && (
                                        <span>
                                            Bis {format(new Date(promo.end_date), 'dd.MM.yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {promotions.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">Keine aktiven Aktionen</h3>
                    <p>Schauen Sie bald wieder vorbei!</p>
                </div>
            )}

            {/* Detail Modal */}
            {selectedPromo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-4xl font-black mb-1">
                                        {selectedPromo.discount_type === 'percent' && `-${selectedPromo.discount_value}%`}
                                        {selectedPromo.discount_type === 'fixed' && `-€${selectedPromo.discount_value}`}
                                        {selectedPromo.discount_type === 'bundle' && '🎁 Bundle-Angebot'}
                                        {selectedPromo.discount_type === 'free_shipping' && '🚚 Kostenloser Versand'}
                                    </div>
                                    <div className="text-blue-100 text-sm">
                                        {DISCOUNT_LABELS[selectedPromo.discount_type]}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPromo(null)}
                                    className="text-white/70 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedPromo.title}</h2>

                            {selectedPromo.description && (
                                <p className="text-gray-600 mb-6">{selectedPromo.description}</p>
                            )}

                            {/* Details */}
                            <div className="space-y-4 mb-6">
                                {selectedPromo.promo_code && (
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <span className="text-gray-600">Aktionscode:</span>
                                        <span className="font-mono font-bold text-blue-600 text-lg">
                                            {selectedPromo.promo_code}
                                        </span>
                                    </div>
                                )}

                                {selectedPromo.min_order_value > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                        <span className="text-yellow-700">Mindestbestellwert:</span>
                                        <span className="font-bold text-yellow-800">
                                            €{selectedPromo.min_order_value.toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Gültig:</span>
                                    <span className="text-gray-900">
                                        {format(new Date(selectedPromo.start_date), 'dd.MM.yyyy')}
                                        {selectedPromo.end_date && (
                                            <> - {format(new Date(selectedPromo.end_date), 'dd.MM.yyyy')}</>
                                        )}
                                    </span>
                                </div>

                                {selectedPromo.product_categories?.length > 0 && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <span className="text-blue-600 text-sm">Gilt für:</span>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedPromo.product_categories.map(cat => (
                                                <span key={cat} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Terms */}
                            {selectedPromo.terms_conditions && (
                                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 mb-6">
                                    <h4 className="font-medium text-gray-700 mb-2">Bedingungen:</h4>
                                    <p>{selectedPromo.terms_conditions}</p>
                                </div>
                            )}

                            {/* Action */}
                            <button
                                onClick={() => setSelectedPromo(null)}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                Verstanden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BPromotionsPage;
