import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../services/database';
import { InstallerSessionService } from '../../services/database/installer-session.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { formatCurrency } from '../../utils/format';

interface ProfitabilityRow {
    id: string;
    clientName: string;
    contractNumber: string;
    date: string;
    teamName: string;
    teamColor: string;
    // Costs from work sessions (EUR)
    laborCost: number;
    fuelCost: number;
    hotelCost: number;
    totalCrewCost: number;
    // From installation
    additionalCosts: number;
    totalCost: number;
    // Work details
    totalHours: number;
    sessionCount: number;
}

export const InstallationProfitability: React.FC = () => {
    const [rows, setRows] = useState<ProfitabilityRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'all'>('month');

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [installations, teams] = await Promise.all([
                DatabaseService.getInstallations(),
                InstallationTeamService.getTeams(),
            ]);

            // Calculate date filter
            const now = new Date();
            let startDate: string | undefined;
            if (dateRange === 'month') {
                const d = new Date(now);
                d.setMonth(d.getMonth() - 1);
                startDate = d.toISOString().split('T')[0];
            } else if (dateRange === 'quarter') {
                const d = new Date(now);
                d.setMonth(d.getMonth() - 3);
                startDate = d.toISOString().split('T')[0];
            }

            // Get all work sessions
            const allSessions = await InstallerSessionService.getAllSessions(startDate);

            const teamMap = new Map(teams.map(t => [t.id, t]));

            // Group sessions by installation_id
            const sessionsByInstallation = new Map<string, typeof allSessions>();
            allSessions.forEach(s => {
                if (!s.installationId) return;
                if (!sessionsByInstallation.has(s.installationId)) {
                    sessionsByInstallation.set(s.installationId, []);
                }
                sessionsByInstallation.get(s.installationId)!.push(s);
            });

            // Filter installations
            const filteredInstallations = installations.filter(inst => {
                if (!inst.scheduledDate) return false;
                if (startDate && inst.scheduledDate < startDate) return false;
                // Only show installations that have work sessions or are completed
                return sessionsByInstallation.has(inst.id) || inst.status === 'completed';
            });

            const processed: ProfitabilityRow[] = filteredInstallations.map(inst => {
                const sessions = sessionsByInstallation.get(inst.id) || [];
                const team = inst.teamId ? teamMap.get(inst.teamId) : null;

                // Aggregate costs from sessions
                let laborCost = 0;
                let fuelCost = 0;
                let hotelCost = 0;
                let totalHours = 0;

                sessions.forEach(s => {
                    laborCost += s.laborCost;
                    fuelCost += s.fuelCost;
                    hotelCost += s.hotelCost;
                    if (s.totalWorkMinutes) totalHours += s.totalWorkMinutes / 60;
                });

                const totalCrewCost = laborCost + fuelCost + hotelCost;

                // Additional costs from installation record (manual entries)
                const additionalCosts = (inst.consumablesCost || 0) + (inst.additionalCosts || 0);

                // If no sessions but installation has costs, use installation-level costs
                if (sessions.length === 0) {
                    hotelCost = inst.hotelCost || 0;
                }

                const totalCost = totalCrewCost + additionalCosts;

                return {
                    id: inst.id,
                    clientName: `${inst.client.firstName} ${inst.client.lastName}`,
                    contractNumber: inst.contractNumber || '',
                    date: inst.scheduledDate || '',
                    teamName: team?.name || '-',
                    teamColor: team?.color || '#94a3b8',
                    laborCost: Math.round(laborCost * 100) / 100,
                    fuelCost: Math.round(fuelCost * 100) / 100,
                    hotelCost: Math.round(hotelCost * 100) / 100,
                    totalCrewCost: Math.round(totalCrewCost * 100) / 100,
                    additionalCosts: Math.round(additionalCosts * 100) / 100,
                    totalCost: Math.round(totalCost * 100) / 100,
                    totalHours: Math.round(totalHours * 10) / 10,
                    sessionCount: sessions.length,
                };
            }).sort((a, b) => b.date.localeCompare(a.date));

            setRows(processed);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Totals
    const totals = rows.reduce((acc, r) => ({
        laborCost: acc.laborCost + r.laborCost,
        fuelCost: acc.fuelCost + r.fuelCost,
        hotelCost: acc.hotelCost + r.hotelCost,
        totalCost: acc.totalCost + r.totalCost,
        hours: acc.hours + r.totalHours,
    }), { laborCost: 0, fuelCost: 0, hotelCost: 0, totalCost: 0, hours: 0 });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Koszty Montażu</h2>
                    <p className="text-sm text-slate-500">Rozliczenie ekip montażowych na podstawie sesji pracy</p>
                </div>
                <div className="flex items-center gap-2">
                    {(['month', 'quarter', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                dateRange === range
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {range === 'month' ? 'Miesiąc' : range === 'quarter' ? 'Kwartał' : 'Wszystko'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-slate-50 border-b border-slate-100">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium uppercase">Robocizna</p>
                    <p className="text-xl font-bold text-slate-800">{totals.laborCost.toFixed(2)} <span className="text-sm text-slate-400">EUR</span></p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium uppercase">Paliwo</p>
                    <p className="text-xl font-bold text-slate-800">{totals.fuelCost.toFixed(2)} <span className="text-sm text-slate-400">EUR</span></p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium uppercase">Hotel</p>
                    <p className="text-xl font-bold text-slate-800">{totals.hotelCost.toFixed(2)} <span className="text-sm text-slate-400">EUR</span></p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium uppercase">Godziny</p>
                    <p className="text-xl font-bold text-slate-800">{totals.hours.toFixed(1)} <span className="text-sm text-slate-400">h</span></p>
                </div>
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 shadow-sm text-white">
                    <p className="text-xs font-medium uppercase opacity-80">RAZEM</p>
                    <p className="text-xl font-bold">{totals.totalCost.toFixed(2)} <span className="text-sm opacity-80">EUR</span></p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-3 font-semibold text-slate-600">Klient</th>
                            <th className="p-3 font-semibold text-slate-600">Umowa</th>
                            <th className="p-3 font-semibold text-slate-600">Data</th>
                            <th className="p-3 font-semibold text-slate-600">Ekipa</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Godziny</th>
                            <th className="p-3 text-right font-semibold text-amber-600">👷 Robocizna</th>
                            <th className="p-3 text-right font-semibold text-emerald-600">⛽ Paliwo</th>
                            <th className="p-3 text-right font-semibold text-blue-600">🏨 Hotel</th>
                            <th className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50">💰 Suma</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-slate-400">
                                    Brak danych do wyświetlenia
                                </td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-medium text-slate-800">{row.clientName}</td>
                                    <td className="p-3 text-slate-500 text-xs">{row.contractNumber || '—'}</td>
                                    <td className="p-3 text-slate-500">{row.date.split('T')[0]}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.teamColor }} />
                                            <span className="text-xs font-medium text-slate-600">{row.teamName}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right text-slate-600">
                                        {row.totalHours > 0 ? `${row.totalHours}h` : '—'}
                                        {row.sessionCount > 1 && (
                                            <span className="text-xs text-slate-400 ml-1">({row.sessionCount} sesji)</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right text-amber-700 font-medium">
                                        {row.laborCost > 0 ? `${row.laborCost.toFixed(2)}` : '—'}
                                    </td>
                                    <td className="p-3 text-right text-emerald-700 font-medium">
                                        {row.fuelCost > 0 ? `${row.fuelCost.toFixed(2)}` : '—'}
                                    </td>
                                    <td className="p-3 text-right text-blue-700 font-medium">
                                        {row.hotelCost > 0 ? `${row.hotelCost.toFixed(2)}` : '—'}
                                    </td>
                                    <td className="p-3 text-right font-bold text-indigo-700 bg-indigo-50">
                                        {row.totalCost > 0 ? `${row.totalCost.toFixed(2)} EUR` : '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                <td className="p-3 text-slate-700" colSpan={4}>SUMA</td>
                                <td className="p-3 text-right text-slate-700">{totals.hours.toFixed(1)}h</td>
                                <td className="p-3 text-right text-amber-700">{totals.laborCost.toFixed(2)}</td>
                                <td className="p-3 text-right text-emerald-700">{totals.fuelCost.toFixed(2)}</td>
                                <td className="p-3 text-right text-blue-700">{totals.hotelCost.toFixed(2)}</td>
                                <td className="p-3 text-right text-indigo-700 bg-indigo-50">{totals.totalCost.toFixed(2)} EUR</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            <p className="text-xs text-slate-400 px-6 py-4 border-t border-slate-100">
                * Dane pochodzą z sesji pracy ekip montażowych. Robocizna = godziny × stawka per osoba (EUR/h). Wszystkie kwoty w EUR.
            </p>
        </div>
    );
};
