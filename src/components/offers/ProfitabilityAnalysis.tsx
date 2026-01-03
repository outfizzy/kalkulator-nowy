import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Offer } from '../../types';

interface ProfitabilityAnalysisProps {
    offer: Offer;
    distance?: number;
    installationDays?: number; // Estimated
}

export const ProfitabilityAnalysis: React.FC<ProfitabilityAnalysisProps> = ({ offer, distance = 0, installationDays = 1 }) => {
    const [config, setConfig] = useState<{ fuelPrice: number, hourlyRate: number, maintenanceRate: number }>({
        fuelPrice: 6.50, // Default PLN
        hourlyRate: 35, // Default PLN per hour per tech
        maintenanceRate: 0.50 // Default PLN per km
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // 1. Fetch Global Settings (Fuel Price)
                const { data: settings } = await supabase
                    .from('global_settings')
                    .select('value')
                    .eq('key', 'fuel_price_pln')
                    .single();

                // 2. Fetch Team/Profile Stats (Hourly Rate) - simplified for now, taking average or default
                // In future: get specific team assigned to this offer?
                // For now, use a hardcoded safe default or fetch "default installer rate"

                setConfig(prev => ({
                    ...prev,
                    fuelPrice: settings ? Number(settings.value) : 6.50
                }));
            } catch (e) {
                console.warn('Could not fetch profitability config', e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    // --- Calculations ---

    // 1. Logistics
    // Distance is one-way. Round trip = distance * 2.
    // If multiple days, typically technicians return home? Or stay in hotel?
    // Let's assume for > 1 day they stay in hotel (hotel cost) OR return items.
    // Simplifying: 1 Trip per day of installation (worst case) or 1 Trip total + Hotel?
    // Let's assume 1 Trip Total (Start -> Client -> End) plus Hotel if needed.
    // Actually, usually it's Distance * 2 * (Days if no hotel).
    // Let's stick to simple: 2 * Distance (Round Trip) per Trip.
    // Assuming 1 trip for now.
    const fuelConsumption = 12; // L/100km (Bus)
    const totalKm = distance * 2;
    const fuelCost = (totalKm / 100) * fuelConsumption * config.fuelPrice;

    // Vehicle maintenance (tires, oil, depreciation)
    const maintenanceCost = totalKm * config.maintenanceRate;

    const logisticsCost = fuelCost + maintenanceCost;

    // 2. Labor
    // Team of 2 technicians?
    const teamSize = 2;
    const hoursPerDay = 8;
    const totalHours = installationDays * hoursPerDay * teamSize;
    const laborCost = totalHours * config.hourlyRate;

    // 3. Materials & System
    // This should come from the PricingService "Base Price" (which is technically sell price).
    // do we have a "Purchase Price" / "Cost Price" in DB?
    // Currently NO. We only have Sell Price.
    // Rough estimation: Material Cost is ~50-60% of Sell Price (minus Installation/Margin).
    // Let's assume for now Material Cost = 55% of Product Price (Net).
    // THIS IS AN ASSUMPTION for demo. In real systems, we need Buy Price list.
    // THIS IS AN ASSUMPTION for demo. In real systems, we need Buy Price list.
    // Wait, offer.pricing.productPrice is usually Gross or Net? The UI says "Cena Netto" elsewhere?
    // Looking at OfferSummary, it formats as currency.
    // Let's assume offer.pricing values are FINAL values shown to client (Gross/Net depending on context).
    // Usually systems store NET price in DB. Let's assume Net.
    const revenue = offer.pricing.sellingPriceNet; // This is the total to client.

    // Cost Estimation
    // If we don't have real Buy Price, we can't show real margin.
    // But we can show "Operations Cost" (Install + Logistics).

    const operationalCost = logisticsCost + laborCost;
    const estimatedMaterialCost = offer.pricing.sellingPriceNet * 0.55; // 55% heuristic

    const totalRealCost = operationalCost + estimatedMaterialCost;
    const margin = revenue - totalRealCost;
    const marginPercent = (margin / revenue) * 100;

    if (loading) return <div className="text-xs text-slate-400">Loading metrics...</div>;

    return (
        <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700 text-slate-300 shadow-sm">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analiza Zyskowności (Szacunek)
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">

                {/* Logistics */}
                <div className="bg-slate-700/50 p-2 rounded border border-slate-600">
                    <div className="text-slate-400 mb-1">Logistyka ({totalKm} km)</div>
                    <div className="font-semibold text-slate-200">{logisticsCost.toFixed(0)} PLN</div>
                    <div className="text-[10px] text-slate-500">Paliwo: {fuelCost.toFixed(0)} | Auto: {maintenanceCost.toFixed(0)}</div>
                </div>

                {/* Labor */}
                <div className="bg-slate-700/50 p-2 rounded border border-slate-600">
                    <div className="text-slate-400 mb-1">Robocizna ({totalHours}h)</div>
                    <div className="font-semibold text-slate-200">{laborCost.toFixed(0)} PLN</div>
                    <div className="text-[10px] text-slate-500">{teamSize} os. x {config.hourlyRate} zł/h</div>
                </div>

                {/* Material (Heuristic) */}
                <div className="bg-slate-700/50 p-2 rounded border border-slate-600">
                    <div className="text-slate-400 mb-1">Materiał (~55%)</div>
                    <div className="font-semibold text-slate-200">{estimatedMaterialCost.toFixed(0)} PLN</div>
                    <div className="text-[10px] text-slate-500">Szacowany koszt zakupu</div>
                </div>

                {/* Total Margin */}
                <div className={`p-2 rounded border ${margin > 0 ? 'bg-emerald-900/30 border-emerald-800' : 'bg-red-900/30 border-red-800'}`}>
                    <div className={margin > 0 ? 'text-emerald-400' : 'text-red-400'}>Marża Realna</div>
                    <div className={`font-bold text-lg ${margin > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {marginPercent.toFixed(1)}%
                    </div>
                    <div className="text-[10px] opacity-70 cursor-help" title={`Revenue: ${revenue} - Cost: ${totalRealCost}`}>
                        {margin > 0 ? '+' : ''}{margin.toFixed(0)} PLN
                    </div>
                </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-500 italic text-center">
                * Wyliczenia szacunkowe na podstawie stawek systemowych i średniego spalania. Nie uwzględniają kosztów biura/marketingu.
            </div>
        </div>
    );
};
