import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/database';
import type { MeasurementReport, User, Visit } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Car, User as UserIcon, Route, Banknote, Users, Edit2, Check, X, Filter, Calendar, ChevronDown, ChevronUp, Eye, FileText, MapPin, Phone, CheckCircle, Clock, XCircle, Star, Download, Trash2 } from 'lucide-react';
import { generateMeasurementReportPDF } from '../../utils/measurementReportPDF';

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

const OUTCOME_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bgColor: string }> = {
    signed: { label: 'Umowa', icon: CheckCircle, color: 'text-green-700', bgColor: 'bg-green-100' },
    measured: { label: 'Pomiar', icon: FileText, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    postponed: { label: 'Decyzja', icon: Clock, color: 'text-amber-700', bgColor: 'bg-amber-100' },
    rejected: { label: 'Odrzucone', icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-100' },
    pending: { label: 'Oczekuje', icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

export const MeasurementReportsList: React.FC = () => {
    const { isAdmin, currentUser } = useAuth();
    const [reports, setReports] = useState<MeasurementReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCostId, setEditingCostId] = useState<string | null>(null);
    const [editingCostValue, setEditingCostValue] = useState<string>('');
    const [savingCost, setSavingCost] = useState(false);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [editingOutcome, setEditingOutcome] = useState<{ reportId: string; visitIdx: number } | null>(null);
    const [savingOutcome, setSavingOutcome] = useState(false);
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

    const COST_PER_KM = 1.50; // PLN per km

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

        const allVisits = filteredReports.flatMap(r => r.visits || []);
        const signedCount = allVisits.filter(v => v.outcome === 'signed').length;
        const measuredCount = allVisits.filter(v => v.outcome === 'measured').length;
        const postponedCount = allVisits.filter(v => v.outcome === 'postponed').length;
        const rejectedCount = allVisits.filter(v => v.outcome === 'rejected').length;

        return {
            totalKm,
            reportCount: filteredReports.length,
            totalClients: allVisits.length,
            totalCost,
            signedContracts: signedCount,
            measuredCount,
            postponedCount,
            rejectedCount,
            conversionRate: allVisits.length > 0 ? (signedCount / allVisits.length * 100) : 0,
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

    const handleUpdateVisitOutcome = async (reportId: string, visitIdx: number, newOutcome: string) => {
        setSavingOutcome(true);
        try {
            const report = reports.find(r => r.id === reportId);
            if (!report) return;

            const updatedVisits = [...report.visits];
            updatedVisits[visitIdx] = { ...updatedVisits[visitIdx], outcome: newOutcome as Visit['outcome'] };

            await DatabaseService.updateMeasurementReport(reportId, {
                visits: updatedVisits,
            });
            toast.success('Status wizyty zaktualizowany');
            setEditingOutcome(null);
            loadReports();
        } catch (error) {
            console.error('Error updating visit outcome:', error);
            toast.error('Nie udało się zaktualizować statusu');
        } finally {
            setSavingOutcome(false);
        }
    };

    const calculateAutoCost = (totalKm: number) => {
        return totalKm * COST_PER_KM;
    };

    const clearFilters = () => {
        setSelectedSalesRepId('all');
        setSelectedMonth('all');
    };

    const handleDownloadPDF = (report: MeasurementReport) => {
        generateMeasurementReportPDF(report, report.salesRepName || 'Nieznany');
    };

    const handleDeleteReport = async (reportId: string) => {
        setDeletingReportId(reportId);
        try {
            await DatabaseService.deleteMeasurementReport(reportId);
            setReports(prev => prev.filter(r => r.id !== reportId));
            toast.success('Raport został usunięty');
        } catch (err) {
            console.error('Error deleting report:', err);
            toast.error('Nie udało się usunąć raportu');
        } finally {
            setDeletingReportId(null);
            setConfirmDeleteId(null);
        }
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

            {/* Summary Stats */}
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
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Raportów</div>
                            <div className="text-lg font-bold text-slate-900">{stats.reportCount}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Dystans</div>
                            <div className="text-lg font-bold text-slate-900">{stats.totalKm.toLocaleString()} km</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Klientów</div>
                            <div className="text-lg font-bold text-blue-600">{stats.totalClients}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                            <div className="text-xs text-green-700 mb-1">Umowy ✓</div>
                            <div className="text-lg font-bold text-green-600">{stats.signedContracts}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                            <div className="text-xs text-blue-700 mb-1">Pomiary</div>
                            <div className="text-lg font-bold text-blue-600">{stats.measuredCount}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                            <div className="text-xs text-amber-700 mb-1">Decyzja</div>
                            <div className="text-lg font-bold text-amber-600">{stats.postponedCount}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Konwersja</div>
                            <div className="text-lg font-bold text-indigo-600">{stats.conversionRate.toFixed(0)}%</div>
                        </div>
                        {canEditCost && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <div className="text-xs text-slate-500 mb-1">Koszty</div>
                                <div className="text-lg font-bold text-amber-600">{stats.totalCost.toFixed(0)} zł</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reports Table/Cards */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{hasActiveFilters ? 'Brak raportów dla wybranych filtrów.' : 'Brak raportów do wyświetlenia.'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredReports.map((report) => {
                            const isExpanded = expandedReportId === report.id;
                            const signedCount = (report.visits || []).filter(v => v.outcome === 'signed').length;
                            const visitsCount = report.visits?.length || 0;

                            return (
                                <div key={report.id} className="group">
                                    {/* Report Row / Header */}
                                    <div
                                        className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : ''}`}
                                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                                    >
                                        {/* Expand icon */}
                                        <div className="text-slate-400">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>

                                        {/* Date */}
                                        <div className="min-w-[110px]">
                                            <div className="text-sm font-bold text-slate-900">
                                                {new Date(report.date).toLocaleDateString('pl-PL', {
                                                    weekday: 'short',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </div>

                                        {/* Sales Rep */}
                                        <div className="flex items-center gap-2 min-w-[150px]">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                {report.salesRepName?.split(' ').map(n => n[0]).join('') || '?'}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 truncate">
                                                {report.salesRepName || 'Nieznany'}
                                            </span>
                                        </div>

                                        {/* Car */}
                                        <div className="flex items-center gap-1 min-w-[90px]">
                                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{report.carPlate || '-'}</span>
                                            {report.withDriver && (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">KIER</span>
                                            )}
                                        </div>

                                        {/* Distance */}
                                        <div className="min-w-[70px] text-right">
                                            <span className="font-bold text-sm text-slate-900">{report.totalKm || 0}</span>
                                            <span className="text-slate-500 text-xs ml-1">km</span>
                                        </div>

                                        {/* Clients */}
                                        <div className="min-w-[55px] text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {visitsCount}
                                            </span>
                                        </div>

                                        {/* Signed quick badge */}
                                        <div className="min-w-[55px] text-center">
                                            {signedCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                    <CheckCircle className="w-3 h-3" /> {signedCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </div>

                                        {/* Cost */}
                                        {canEditCost && (
                                            <div className="min-w-[100px] text-right" onClick={e => e.stopPropagation()}>
                                                {editingCostId === report.id ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingCostValue}
                                                            onChange={(e) => setEditingCostValue(e.target.value)}
                                                            className="w-20 px-2 py-1 border border-slate-300 rounded text-right text-xs focus:ring-2 focus:ring-accent outline-none"
                                                            placeholder="0.00"
                                                            autoFocus
                                                        />
                                                        <span className="text-slate-500 text-xs">zł</span>
                                                        <button
                                                            onClick={() => handleSaveCost(report.id)}
                                                            disabled={savingCost}
                                                            className="p-0.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEditCost}
                                                            className="p-0.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        {report.tripCost !== undefined && report.tripCost > 0 ? (
                                                            <span className="font-bold text-green-600 text-sm">
                                                                {report.tripCost.toFixed(2)} zł
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">
                                                                ~{calculateAutoCost(report.totalKm || 0).toFixed(0)} zł
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleStartEditCost(report)}
                                                            className="p-0.5 text-slate-400 hover:text-accent hover:bg-accent/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Edytuj koszt"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleDownloadPDF(report)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Pobierz PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            {isAdmin() && (
                                                confirmDeleteId === report.id ? (
                                                    <div className="flex items-center gap-1 ml-1">
                                                        <button
                                                            onClick={() => handleDeleteReport(report.id)}
                                                            disabled={deletingReportId === report.id}
                                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {deletingReportId === report.id ? 'Usuwam...' : 'Potwierdź'}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteId(report.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Usuń raport"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Detail View */}
                                    {isExpanded && (
                                        <div className="px-5 py-4 bg-slate-50/50">
                                            {/* Report Description */}
                                            {report.reportDescription && (
                                                <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                                                    <div className="text-xs font-medium text-slate-500 mb-1">Opis raportu</div>
                                                    <p className="text-sm text-slate-700">{report.reportDescription}</p>
                                                </div>
                                            )}

                                            {/* Car Issues */}
                                            {report.carIssues && (
                                                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                    <div className="text-xs font-medium text-amber-700 mb-1">⚠️ Uwagi do auta</div>
                                                    <p className="text-sm text-amber-800">{report.carIssues}</p>
                                                </div>
                                            )}

                                            {/* Visits List */}
                                            <div className="mb-2">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-slate-500" />
                                                    Wizyty ({visitsCount})
                                                </h4>
                                            </div>
                                            <div className="space-y-2">
                                                {(report.visits || []).map((visit, idx) => {
                                                    const outcomeConf = OUTCOME_CONFIG[visit.outcome] || OUTCOME_CONFIG.pending;
                                                    const OutcomeIcon = outcomeConf.icon;
                                                    const isEditingThis = editingOutcome?.reportId === report.id && editingOutcome?.visitIdx === idx;

                                                    return (
                                                        <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    {/* Customer Name & Phone */}
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-sm text-slate-900">
                                                                            {idx + 1}. {visit.customerName}
                                                                        </span>
                                                                        {visit.customerPhone && (
                                                                            <a href={`tel:${visit.customerPhone}`} className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700">
                                                                                <Phone className="w-3 h-3" />
                                                                                {visit.customerPhone}
                                                                            </a>
                                                                        )}
                                                                    </div>

                                                                    {/* Address */}
                                                                    {visit.address && (
                                                                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                                                                            <MapPin className="w-3 h-3 shrink-0" />
                                                                            <span className="truncate">{visit.address}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Product */}
                                                                    {visit.productSummary && (
                                                                        <div className="text-xs text-slate-600 mb-1">
                                                                            Produkt: <span className="font-medium">{visit.productSummary}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Notes */}
                                                                    {(visit.visitNotes || visit.notes) && (
                                                                        <div className="text-xs text-slate-500 mt-1 italic">
                                                                            „{visit.visitNotes || visit.notes}"
                                                                        </div>
                                                                    )}

                                                                    {/* Sales Potential */}
                                                                    {visit.salesPotential && visit.outcome !== 'signed' && (
                                                                        <div className="flex items-center gap-1 mt-1.5">
                                                                            <span className="text-xs text-slate-500">Potencjał:</span>
                                                                            {Array.from({ length: 5 }, (_, i) => (
                                                                                <Star
                                                                                    key={i}
                                                                                    className={`w-3 h-3 ${i < visit.salesPotential! ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                                                                                />
                                                                            ))}
                                                                            {visit.salesPotentialNote && (
                                                                                <span className="text-[10px] text-slate-400 ml-1">— {visit.salesPotentialNote}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Outcome Badge / Editor */}
                                                                <div className="shrink-0">
                                                                    {isEditingThis ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            {Object.entries(OUTCOME_CONFIG).map(([val, conf]) => {
                                                                                const Icon = conf.icon;
                                                                                return (
                                                                                    <button
                                                                                        key={val}
                                                                                        disabled={savingOutcome}
                                                                                        onClick={() => handleUpdateVisitOutcome(report.id, idx, val)}
                                                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${conf.bgColor} ${conf.color} hover:opacity-80 ${visit.outcome === val ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                                                                    >
                                                                                        <Icon className="w-3 h-3" />
                                                                                        {conf.label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                            <button
                                                                                onClick={() => setEditingOutcome(null)}
                                                                                className="text-xs text-slate-500 hover:text-slate-700 mt-1"
                                                                            >
                                                                                Anuluj
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setEditingOutcome({ reportId: report.id, visitIdx: idx })}
                                                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${outcomeConf.bgColor} ${outcomeConf.color} hover:opacity-80 transition-opacity cursor-pointer`}
                                                                            title="Kliknij aby zmienić status"
                                                                        >
                                                                            <OutcomeIcon className="w-3 h-3" />
                                                                            {outcomeConf.label}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Trip Summary in expanded view */}
                                            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-6 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Route className="w-3.5 h-3.5" /> {report.totalKm} km</span>
                                                <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {report.carPlate || '—'}</span>
                                                {report.withDriver && <span className="text-blue-600">Z kierowcą (+{430} zł)</span>}
                                                {report.costPerKm && <span>{report.costPerKm} zł/km</span>}
                                                {report.tripCost !== undefined && report.tripCost > 0 && (
                                                    <span className="font-semibold text-green-600">Koszt: {report.tripCost.toFixed(2)} zł</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
