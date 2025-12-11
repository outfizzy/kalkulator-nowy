import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/database';

interface PricingInsightsProps {
    postalCode: string;
    currentMargin: number;
}

interface RegionStats {
    winRate: number; // 0-100
    avgMargin: number; // 0.25 etc.
    totalOffers: number;
}

export const PricingInsights: React.FC<PricingInsightsProps> = ({ postalCode, currentMargin }) => {
    const [stats, setStats] = useState<RegionStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!postalCode || postalCode.length < 2) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                // In a real app, this would be a DB RPC call. 
                // Creating a simplified mock simulation based on available data 
                // or implementing the logic if I can access all offers.
                // For now, I will use a simulated logic that we can replace with real DB aggregation later
                // because we haven't implemented 'getRegionStats' in DB service yet.

                // Fetching regional stats via existing filtered query strategy implies heavy client-side logic
                // if we don't have a backend function. 
                // Let's implement a filtered fetch using filtering by postal code prefix if possible,
                // or just leave a placeholder logic if we can't efficiently query 1000s of offers.

                // Efficient way: DatabaseService.getRegionStats (we need to add this)
                const data = await DatabaseService.getRegionStats(postalCode.substring(0, 2));
                setStats(data);
            } catch (e) {
                console.error("Failed to load pricing insights", e);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchStats, 500); // Debounce
        return () => clearTimeout(timeout);
    }, [postalCode]);

    if (!stats || stats.totalOffers < 5) return null; // Not enough data

    const isMarginCompetitive = currentMargin <= stats.avgMargin * 1.05; // Within 5% of avg
    const winChanceColor = stats.winRate > 30 ? 'text-green-600' : stats.winRate > 15 ? 'text-yellow-600' : 'text-red-600';

    return (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4 text-sm">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                🤖 AI Pricing Insights (Region {postalCode.substring(0, 2)})
            </h4>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-gray-500 block text-xs">Szansa sprzedaży</span>
                    <span className={`text-lg font-bold ${winChanceColor}`}>
                        {stats.winRate.toFixed(1)}%
                    </span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs">Śr. marża w regionie</span>
                    <span className="text-lg font-bold text-gray-700">
                        {(stats.avgMargin * 100).toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
                {currentMargin > stats.avgMargin + 0.05 ? (
                    <span className="text-red-500">⚠ Twoja marża jest wyższa niż średnia w tym regionie. Rozważ obniżkę.</span>
                ) : isMarginCompetitive ? (
                    <span className="text-green-600">✓ Twoja cena jest konkurencyjna.</span>
                ) : (
                    <span className="text-blue-600">ℹ Masz zapas marży względem konkurencji.</span>
                )}
            </div>
            <div className="mt-1 text-[10px] text-gray-400">
                Na podstawie {stats.totalOffers} ofert z ostatnich 6 miesięcy.
            </div>
        </div>
    );
};
