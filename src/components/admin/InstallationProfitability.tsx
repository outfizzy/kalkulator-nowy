import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../services/database';
import { SettingsService } from '../../services/database/settings.service';
import { formatCurrency } from '../../utils/format';

interface ProfitabilityRow {
    id: string;
    clientName: string;
    date: string;
    revenue: number;
    laborCost: number;
    materialCost: number; // Consumption/Hotel/etc
    totalCost: number;
    profit: number;
    marginPercent: number;
    issues?: string;
}

export const InstallationProfitability: React.FC = () => {
    const [rows, setRows] = useState<ProfitabilityRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [installations, teams, users, eurRate] = await Promise.all([
                DatabaseService.getInstallations(),
                DatabaseService.getTeams(),
                DatabaseService.getAllUsers(),
                SettingsService.getEurRate()
            ]);

            const completed = installations.filter(i => i.status === 'completed');

            // Create lookup maps with currency conversion
            const userRateMap = new Map<string, number>();
            users.forEach(u => {
                let rate = u.hourlyRate || 35; // Default 35 PLN if not set
                if (u.hourlyRateCurrency === 'EUR') {
                    rate = rate * eurRate;
                }
                userRateMap.set(u.id, rate);
            });

            const teamMap = new Map<string, typeof teams[0]>();
            teams.forEach(t => teamMap.set(t.id, t));

            const processed = await Promise.all(completed.slice(0, 50).map(async (inst) => {
                // Mock calculation based on available data
                const revenue = parseFloat(inst.productSummary?.match(/(\d+)\s*EUR/)?.[1] || '0') * eurRate; // Convert EUR to PLN

                // Fetch logs
                const logs = await DatabaseService.getWorkLogs(inst.id);

                let laborCost = 0;
                logs.forEach(log => {
                    if (log.endTime && log.startTime) {
                        const durationHours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
                        if (log.userIds && log.userIds.length > 0) {
                            log.userIds.forEach(uid => {
                                const rate = userRateMap.get(uid) || 35;
                                laborCost += durationHours * rate;
                            });
                        } else {
                            // Fallback if no userIds logged (legacy)
                            laborCost += durationHours * 35;
                        }
                    }
                });

                // Travel Costs
                // If team is assigned, use team specific rates.
                const team = inst.teamId ? teamMap.get(inst.teamId) : null;
                const fuelConsumption = team?.fuelConsumption || 12; // L/100km
                const maintenanceRate = team?.vehicleMaintenanceRate || 0; // PLN/km
                const fuelPrice = 6.50; // PLN/L (Global const?)

                // Distance: Mock 100km one way if not available.
                // Ideally this comes from Offer -> Customer Address distance.
                const oneWayDistance = 100;
                const totalDistance = oneWayDistance * 2;

                const fuelCost = (totalDistance / 100) * fuelConsumption * fuelPrice;
                const vehicleCost = totalDistance * maintenanceRate;
                const travelCost = fuelCost + vehicleCost;

                const extras = (inst.hotelCost || 0) + (inst.consumablesCost || 0) + (inst.additionalCosts || 0);

                const totalCost = laborCost + travelCost + extras;
                const profit = revenue - totalCost;
                const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                return {
                    id: inst.id,
                    clientName: `${inst.client.firstName} ${inst.client.lastName}`,
                    date: inst.scheduledDate || '',
                    revenue,
                    laborCost,
                    materialCost: travelCost + extras,
                    totalCost,
                    profit,
                    marginPercent: margin
                };
            }));

            setRows(processed);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Ładowanie danych finansowych...</div>;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Rentowność Montaży</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b">
                            <th className="p-3">Klient</th>
                            <th className="p-3">Data</th>
                            <th className="p-3 text-right">Przychód (Est.)</th>
                            <th className="p-3 text-right">Robocizna</th>
                            <th className="p-3 text-right">Dojazd/Inne</th>
                            <th className="p-3 text-right bg-green-50">Zysk</th>
                            <th className="p-3 text-right bg-green-50">Marża</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.id} className="border-b hover:bg-slate-50">
                                <td className="p-3 font-medium">{row.clientName}</td>
                                <td className="p-3 text-sm text-slate-500">{row.date.split('T')[0]}</td>
                                <td className="p-3 text-right">{formatCurrency(row.revenue)}</td>
                                <td className="p-3 text-right text-red-600">-{formatCurrency(row.laborCost)}</td>
                                <td className="p-3 text-right text-red-600">-{formatCurrency(row.materialCost)}</td>
                                <td className={`p-3 text-right font-bold ${row.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(row.profit)}
                                </td>
                                <td className={`p-3 text-right font-bold ${row.marginPercent > 20 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {row.marginPercent.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 mt-4">
                * Robocizna obliczana na podstawie stawek godzinowych pracowników (waluty przeliczane po aktualnym kursie).
                * Koszt dojazdu: (Dystans x 2) x (Spalanie ekipy + Amortyzacja). Paliwo przyjęto 6.50 PLN/L.
                * Dystans przyjęty domyślnie: 100km w jedną stronę (do integracji z Google Maps).
            </p>
        </div>
    );
};
