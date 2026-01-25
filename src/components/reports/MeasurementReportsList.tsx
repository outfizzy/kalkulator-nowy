import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/database';
import type { MeasurementReport, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Car, User as UserIcon, Route, Euro, Users, Edit2, Check, X, Filter, Calendar, ChevronDown } from 'lucide-react';

// Generate month options for the last 12 months
const generateMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }

    return options;
};

export const MeasurementReportsList: React.FC = () => {
    const { isAdmin, currentUser } = useAuth();
    const [reports, setReports] = useState<MeasurementReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCostId, setEditingCostId] = useState<string | null>(null);
    const [editingCostValue, setEditingCostValue] = useState<string>('');
    const [savingCost, setSavingCost] = useState(false);

    // Filters
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(true);

    const canEditCost = isAdmin() || currentUser?.role === 'manager';
    const canFilterByRep = isAdmin() || currentUser?.role === 'manager';
    const monthOptions = useMemo(() => generateMonthOptions(), []);

    // Load sales reps for filter
    useEffect(() => {
        const loadSalesReps = async () => {
            if (canFilterByRep) {
                try {
                    const allUsers = await DatabaseService.getAllUsers();
                    const reps = allUsers.filter(u =>
                        (u.role === 'sales_rep' || u.role === 'manager' || u.role === 'admin') &&
                        u.status === 'active'
                    );
                    setSalesReps(reps);
                } catch (error) {
                    console.error('Error loading sales reps:', error);
                }
            }
        };
        loadSalesReps();
    }, [canFilterByRep]);

    useEffect(() => {
        loadReports();
    }, [currentUser, isAdmin]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const filters = isAdmin() ? {} : { userId: currentUser?.id };
            const data = await DatabaseService.getMeasurementReports(filters);
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
            toast.error('Nie udało się pobrać raportów');
        } finally {
            setLoading(false);
        }
    };

    // Filter reports based on selections
    const filteredReports = useMemo(() => {
        let result = reports;

        // Filter by sales rep
        if (selectedSalesRepId !== 'all') {
            result = result.filter(r => r.salesRepId === selectedSalesRepId);
        }

        // Filter by month
        if (selectedMonth !== 'all') {
            result = result.filter(r => {
                const reportDate = new Date(r.date);
                const reportMonth = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
                return reportMonth === selectedMonth;
            });
        }

        return result;
    }, [reports, selectedSalesRepId, selectedMonth]);

    const COST_PER_KM = 0.40; // EUR per km

    // Calculate stats for filtered reports
    const stats = useMemo(() => {
        const totalKm = filteredReports.reduce((sum, r) => sum + (r.totalKm || 0), 0);
        // Use manual cost if set, otherwise calculate automatically
        const totalCost = filteredReports.reduce((sum, r) => {
            if (r.tripCost !== undefined && r.tripCost > 0) {
                return sum + r.tripCost;
            }
            return sum + ((r.totalKm || 0) * COST_PER_KM);
        }, 0);

        return {
            totalKm,
            reportCount: filteredReports.length,
            totalClients: filteredReports.reduce((sum, r) => sum + (r.visits?.length || 0), 0),
            totalCost,
            signedContracts: filteredReports.reduce((sum, r) => sum + (r.signedContractsCount || 0), 0),
        };
    }, [filteredReports]);

    const handleStartEditCost = (report: MeasurementReport) => {
        setEditingCostId(report.id);
        setEditingCostValue(report.tripCost?.toString() || '');
    };

    const handleCancelEditCost = () => {
        setEditingCostId(null);
        setEditingCostValue('');
    };

    const handleSaveCost = async (reportId: string) => {
        setSavingCost(true);
        try {
            const tripCost = parseFloat(editingCostValue) || 0;
            await DatabaseService.updateReportTripCost(reportId, tripCost);
            toast.success('Koszt wyjazdu zapisany');
            setEditingCostId(null);
            loadReports();
        } catch (error) {
            console.error('Error saving trip cost:', error);
            toast.error('Nie udało się zapisać kosztu');
        } finally {
            setSavingCost(false);
        }
    };

    const calculateAutoCost = (totalKm: number) => {
        return totalKm * COST_PER_KM;
    };

    const clearFilters = () => {
        setSelectedSalesRepId('all');
        setSelectedMonth('all');
    };

    const hasActiveFilters = selectedSalesRepId !== 'all' || selectedMonth !== 'all';

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie raportów...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Raporty Pomiarowe</h1>
                    <p className="text-slate-500 mt-1">Przegląd raportów dziennych z wyjazdów pomiarowych</p>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-accent/10 border-accent text-accent' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    Filtry
                    {hasActiveFilters && (
                        <span className="w-2 h-2 bg-accent rounded-full"></span>
                    )}
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Sales Rep Filter */}
                        {canFilterByRep && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <UserIcon className="w-4 h-4 inline-block mr-1" />
                                    Przedstawiciel
                                </label>
                                <select
                                    value={selectedSalesRepId}
                                    onChange={(e) => setSelectedSalesRepId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                                >
                                    <option value="all">Wszyscy przedstawiciele</option>
                                    {salesReps.map(rep => (
                                        <option key={rep.id} value={rep.id}>
                                            {rep.firstName} {rep.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Month Filter */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                <Calendar className="w-4 h-4 inline-block mr-1" />
                                Miesiąc
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                            >
                                <option value="all">Wszystkie miesiące</option>
                                {monthOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Wyczyść filtry
                            </button>
                        )}
                    </div>

                    {/* Active Filters Summary */}
                    {hasActiveFilters && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-600">
                            <span>Aktywne filtry:</span>
                            {selectedSalesRepId !== 'all' && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    {salesReps.find(r => r.id === selectedSalesRepId)?.firstName} {salesReps.find(r => r.id === selectedSalesRepId)?.lastName}
                                </span>
                            )}
                            {selectedMonth !== 'all' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    {monthOptions.find(m => m.value === selectedMonth)?.label}
                                </span>
                            )}
                            <span className="text-slate-400">
                                ({filteredReports.length} z {reports.length} raportów)
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{hasActiveFilters ? 'Brak raportów dla wybranych filtrów.' : 'Brak raportów do wyświetlenia.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <UserIcon className="w-3.5 h-3.5" />
                                            Przedstawiciel
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <Car className="w-3.5 h-3.5" />
                                            Auto
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1 justify-end">
                                            <Route className="w-3.5 h-3.5" />
                                            Dystans
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1 justify-center">
                                            <Users className="w-3.5 h-3.5" />
                                            Klientów
                                        </div>
                                    </th>
                                    {canEditCost && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            <div className="flex items-center gap-1 justify-end">
                                                <Euro className="w-3.5 h-3.5" />
                                                Koszt Wyjazdu
                                            </div>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                            {new Date(report.date).toLocaleDateString('pl-PL', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-xs font-bold">
                                                    {report.salesRepName?.split(' ').map(n => n[0]).join('') || '?'}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">
                                                    {report.salesRepName || 'Nieznany'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{report.carPlate || '-'}</span>
                                                {report.withDriver && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">z kierowcą</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                            <span className="font-bold text-slate-900">{report.totalKm || 0}</span>
                                            <span className="text-slate-500 ml-1">km</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {report.visits?.length || 0}
                                            </span>
                                        </td>
                                        {canEditCost && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                {editingCostId === report.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingCostValue}
                                                            onChange={(e) => setEditingCostValue(e.target.value)}
                                                            className="w-24 px-2 py-1 border border-slate-300 rounded text-right text-sm focus:ring-2 focus:ring-accent outline-none"
                                                            placeholder="0.00"
                                                            autoFocus
                                                        />
                                                        <span className="text-slate-500">€</span>
                                                        <button
                                                            onClick={() => handleSaveCost(report.id)}
                                                            disabled={savingCost}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEditCost}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {report.tripCost !== undefined && report.tripCost > 0 ? (
                                                            <span className="font-bold text-green-600">
                                                                {report.tripCost.toFixed(2)} €
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">
                                                                ~{calculateAutoCost(report.totalKm || 0).toFixed(2)} €
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleStartEditCost(report)}
                                                            className="p-1 text-slate-400 hover:text-accent hover:bg-accent/10 rounded transition-colors"
                                                            title="Edytuj koszt"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Summary Stats - Updated based on filters */}
            {filteredReports.length > 0 && (
                <div className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-sm font-semibold text-slate-700">
                            Podsumowanie {hasActiveFilters ? '(filtrowane)' : ''}
                        </h3>
                        {hasActiveFilters && (
                            <span className="text-xs text-slate-500">
                                {filteredReports.length} z {reports.length} raportów
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Łączny dystans</div>
                            <div className="text-xl font-bold text-slate-900">
                                {stats.totalKm.toLocaleString()} km
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Liczba raportów</div>
                            <div className="text-xl font-bold text-slate-900">{stats.reportCount}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Klientów odwiedzonych</div>
                            <div className="text-xl font-bold text-blue-600">
                                {stats.totalClients}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Podpisanych umów</div>
                            <div className="text-xl font-bold text-green-600">
                                {stats.signedContracts}
                            </div>
                        </div>
                        {canEditCost && (
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="text-xs text-slate-500 mb-1">Łączny koszt</div>
                                <div className="text-xl font-bold text-amber-600">
                                    {stats.totalCost.toFixed(2)} €
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
