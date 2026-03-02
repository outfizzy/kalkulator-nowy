import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { MeasurementReminderService, type MeasurementOutcome } from '../../services/measurement-reminder.service';
import type { Measurement, MeasurementReport, Visit } from '../../types';
import type { MeasurementRoute } from '../../services/route-calculation.service';
import { toast } from 'react-hot-toast';
import { FileText, Car, User, MapPin, CheckCircle, XCircle, Clock, Star, ChevronDown, ChevronUp, Phone, Sparkles, Route, Calculator } from 'lucide-react';

interface MeasurementReportModalProps {
    date: Date;
    measurements: Measurement[];
    onClose: () => void;
    onSave: () => void;
    currentUserId: string;
    report?: MeasurementReport;
    routes?: Record<string, MeasurementRoute>;
}

const OUTCOME_OPTIONS = [
    { value: 'signed', label: 'Podpisano umowę', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { value: 'measured', label: 'Wykonano pomiar', icon: FileText, color: 'text-blue-600 bg-blue-100' },
    { value: 'postponed', label: 'Odłożono decyzję', icon: Clock, color: 'text-amber-600 bg-amber-100' },
    { value: 'rejected', label: 'Rezygnacja klienta', icon: XCircle, color: 'text-red-600 bg-red-100' },
    { value: 'pending', label: 'Do uzupełnienia', icon: Clock, color: 'text-slate-500 bg-slate-100' },
] as const;

const POTENTIAL_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Bardzo mało prawdopodobne', color: 'bg-red-500' },
    2: { label: 'Mało prawdopodobne', color: 'bg-orange-500' },
    3: { label: 'Umiarkowane szanse', color: 'bg-yellow-500' },
    4: { label: 'Duże szanse', color: 'bg-lime-500' },
    5: { label: 'Bardzo duże szanse', color: 'bg-green-500' },
};

export const MeasurementReportModal: React.FC<MeasurementReportModalProps> = ({
    date,
    measurements,
    onClose,
    onSave,
    currentUserId,
    report,
    routes = {}
}) => {
    const [loading, setLoading] = useState(false);
    const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

    // Calculate GPS route distance
    const calculatedRouteKm = measurements.reduce((sum, m) => {
        const route = routes[m.id];
        return sum + (route?.distance_km || 0);
    }, 0);
    const calculatedRoundTripKm = Math.round(calculatedRouteKm * 2);

    const DRIVER_SURCHARGE = 430; // PLN
    const DEFAULT_COST_PER_KM = 1.50; // PLN

    const [formData, setFormData] = useState({
        carPlate: report?.carPlate || '',
        totalKm: report?.totalKm || 0,
        costPerKm: report?.costPerKm || DEFAULT_COST_PER_KM,
        withDriver: report?.withDriver || false,
        carIssues: report?.carIssues || '',
        reportDescription: report?.reportDescription || ''
    });

    // Estimated cost calculation
    const fuelCost = Math.round(formData.totalKm * formData.costPerKm * 100) / 100;
    const driverCost = formData.withDriver ? DRIVER_SURCHARGE : 0;
    const estimatedTotalCost = fuelCost + driverCost;

    // Auto-populate totalKm from GPS calculation when no report exists yet
    useEffect(() => {
        if (!report && calculatedRoundTripKm > 0 && formData.totalKm === 0) {
            setFormData(prev => ({ ...prev, totalKm: calculatedRoundTripKm }));
        }
    }, [calculatedRoundTripKm, report, formData.totalKm]);

    // Map DB measurement outcomes to report visit outcomes
    const mapMeasurementOutcome = (m: Measurement): Visit['outcome'] => {
        // If measurement already has an outcome from DB, map it
        if (m.outcome) {
            const outcomeMap: Record<string, Visit['outcome']> = {
                'signed': 'signed',
                'considering': 'measured',
                'rejected': 'rejected',
                'no_show': 'pending', // no_show maps to pending for user to decide
            };
            return outcomeMap[m.outcome] || 'pending';
        }
        // Fallback to status-based mapping
        return m.status === 'completed' ? 'measured' : 'pending';
    };

    // Initialize visits from measurements or existing report
    const [visits, setVisits] = useState<Visit[]>(() => {
        if (report?.visits && report.visits.length > 0) {
            return report.visits;
        }
        return measurements.map(m => ({
            id: m.id,
            offerId: m.offerId,
            leadId: m.leadId,
            customerName: m.customerName,
            address: m.customerAddress,
            customerPhone: m.customerPhone,
            productSummary: 'N/A',
            price: 0,
            outcome: mapMeasurementOutcome(m),
            notes: m.notes || '',
            visitNotes: '',
            salesPotential: undefined,
            salesPotentialNote: ''
        }));
    });

    // Use the editable totalKm from formData (pre-filled from GPS or manual)
    const totalKm = formData.totalKm;

    const updateVisit = (visitId: string, updates: Partial<Visit>) => {
        setVisits(prev => prev.map(v =>
            v.id === visitId ? { ...v, ...updates } : v
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Warn about pending visits but allow saving
        const pendingVisits = visits.filter(v => v.outcome === 'pending');
        if (pendingVisits.length > 0) {
            toast(`${pendingVisits.length} klient(ów) bez uzupełnionego wyniku — raport zapisano jako wersja robocza`, {
                icon: '⚠️',
                duration: 4000
            });
        }

        setLoading(true);
        try {
            // Map report outcomes to measurement outcomes for kanban sync
            const outcomeToMeasurementOutcome: Record<string, MeasurementOutcome | null> = {
                'signed': 'signed',        // → Wygrane
                'measured': 'considering',  // → Pomiar odbył się
                'postponed': 'considering', // → Pomiar odbył się
                'rejected': 'rejected',     // → Utracone
                'pending': null,            // no change
            };

            // Sync visit outcomes to leads (kanban) and sales potential — skip pending visits
            for (const visit of visits) {
                if (visit.leadId && visit.outcome !== 'pending') {
                    try {
                        // 1. Move lead in kanban based on outcome
                        const measurementOutcome = outcomeToMeasurementOutcome[visit.outcome];
                        if (measurementOutcome) {
                            await MeasurementReminderService.updateMeasurementOutcome(
                                visit.id,
                                measurementOutcome,
                                visit.visitNotes || visit.notes
                            );
                        }

                        // 2. Sync sales potential if applicable
                        if (visit.outcome !== 'signed' && visit.salesPotential) {
                            const aiScore = visit.salesPotential * 20; // 1-5 → 20-100
                            await DatabaseService.updateLead(visit.leadId, {
                                aiScore,
                                aiSummary: `Potencjał sprzedaży: ${POTENTIAL_LABELS[visit.salesPotential].label}. ${visit.salesPotentialNote || ''}`,
                                notes: visit.visitNotes ? `[Pomiar ${date.toLocaleDateString('pl-PL')}] ${visit.visitNotes}` : undefined
                            });
                        }
                    } catch (err) {
                        console.warn('Could not sync lead:', visit.leadId, err);
                    }
                }
            }

            if (report?.id) {
                // Update existing report
                await DatabaseService.updateMeasurementReport(report.id, {
                    carPlate: formData.carPlate,
                    totalKm,
                    tripCost: estimatedTotalCost,
                    costPerKm: formData.costPerKm,
                    withDriver: formData.withDriver,
                    carIssues: formData.carIssues,
                    reportDescription: formData.reportDescription,
                    visits: visits,
                });
                toast.success('Raport został zaktualizowany');
            } else {
                // Create new report
                const newReport: Omit<MeasurementReport, 'id' | 'createdAt'> = {
                    date: date.toISOString().split('T')[0],
                    salesRepId: currentUserId,
                    carPlate: formData.carPlate,
                    totalKm,
                    tripCost: estimatedTotalCost,
                    costPerKm: formData.costPerKm,
                    withDriver: formData.withDriver,
                    carIssues: formData.carIssues,
                    reportDescription: formData.reportDescription,
                    visits: visits,
                    signedContractsCount: visits.filter(v => v.outcome === 'signed').length,
                    offerIds: visits.map(v => v.offerId).filter(Boolean) as string[],
                    is_active: true,
                    currency: 'PLN'
                };
                await DatabaseService.createMeasurementReport(newReport);
                toast.success('Raport został utworzony');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving report:', error);
            toast.error('Nie udało się zapisać raportu');
        } finally {
            setLoading(false);
        }
    };

    const signedCount = visits.filter(v => v.outcome === 'signed').length;
    const measuredCount = visits.filter(v => v.outcome === 'measured').length;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Raport dzienny: {date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {visits.length} klientów • {signedCount} umów • {measuredCount} pomiarów
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Visits Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-accent" />
                                Klienci ({visits.length})
                            </h3>
                            <div className="space-y-3">
                                {visits.map((visit, idx) => {
                                    const isExpanded = expandedVisitId === visit.id;
                                    const outcomeOption = OUTCOME_OPTIONS.find(o => o.value === visit.outcome);
                                    const OutcomeIcon = outcomeOption?.icon || Clock;

                                    return (
                                        <div
                                            key={visit.id}
                                            className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-accent shadow-lg' : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {/* Visit Header */}
                                            <div
                                                className={`p-4 cursor-pointer flex items-center justify-between ${isExpanded ? 'bg-accent/5' : 'bg-white hover:bg-slate-50'
                                                    }`}
                                                onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-800">{visit.customerName}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {visit.address}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${outcomeOption?.color || 'bg-slate-100 text-slate-600'}`}>
                                                        <OutcomeIcon className="w-4 h-4" />
                                                        {outcomeOption?.label || 'Do uzupełnienia'}
                                                    </div>
                                                    {visit.salesPotential && visit.outcome !== 'signed' && (
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-4 h-4 ${star <= visit.salesPotential! ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="p-4 border-t border-slate-100 bg-white space-y-4">
                                                    {/* Contact Info */}
                                                    {visit.customerPhone && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Phone className="w-4 h-4" />
                                                            {visit.customerPhone}
                                                        </div>
                                                    )}

                                                    {/* Outcome Selection */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Wynik wizyty *</label>
                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                            {OUTCOME_OPTIONS.map(option => {
                                                                const Icon = option.icon;
                                                                const isSelected = visit.outcome === option.value;
                                                                return (
                                                                    <button
                                                                        key={option.value}
                                                                        type="button"
                                                                        onClick={() => updateVisit(visit.id, { outcome: option.value as Visit['outcome'] })}
                                                                        className={`p-3 rounded-lg border-2 transition-all text-center ${isSelected
                                                                            ? 'border-accent bg-accent/10'
                                                                            : 'border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-accent' : 'text-slate-400'}`} />
                                                                        <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-slate-600'}`}>
                                                                            {option.label}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Sales Potential (only if not signed) */}
                                                    {visit.outcome !== 'signed' && visit.outcome !== 'pending' && (
                                                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                                            <label className="block text-sm font-medium text-amber-800 mb-3 flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4" />
                                                                Ocena potencjału sprzedażowego
                                                            </label>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                {[1, 2, 3, 4, 5].map(rating => (
                                                                    <button
                                                                        key={rating}
                                                                        type="button"
                                                                        onClick={() => updateVisit(visit.id, { salesPotential: rating as 1 | 2 | 3 | 4 | 5 })}
                                                                        className={`p-2 rounded-lg transition-all flex flex-col items-center ${visit.salesPotential === rating
                                                                            ? 'bg-amber-200 scale-110'
                                                                            : 'bg-white hover:bg-amber-100'
                                                                            }`}
                                                                    >
                                                                        <div className="flex">
                                                                            {[...Array(rating)].map((_, i) => (
                                                                                <Star
                                                                                    key={i}
                                                                                    className={`w-5 h-5 ${visit.salesPotential === rating ? 'text-amber-500 fill-amber-500' : 'text-amber-300'}`}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {visit.salesPotential && (
                                                                <p className="text-sm text-amber-700 font-medium mb-2">
                                                                    {POTENTIAL_LABELS[visit.salesPotential].label}
                                                                </p>
                                                            )}
                                                            <textarea
                                                                rows={2}
                                                                value={visit.salesPotentialNote || ''}
                                                                onChange={(e) => updateVisit(visit.id, { salesPotentialNote: e.target.value })}
                                                                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-sm bg-white"
                                                                placeholder="Dlaczego taka ocena? Co może wpłynąć na decyzję klienta?"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Visit Notes */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Notatki z wizyty</label>
                                                        <textarea
                                                            rows={3}
                                                            value={visit.visitNotes || ''}
                                                            onChange={(e) => updateVisit(visit.id, { visitNotes: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                                                            placeholder="Szczegóły wizyty, wymagania klienta, uwagi..."
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Day Summary / Notes */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Podsumowanie dnia
                            </label>
                            <textarea
                                rows={4}
                                value={formData.reportDescription}
                                onChange={e => setFormData({ ...formData, reportDescription: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                                placeholder="Ogólne uwagi z dnia pomiarowego, obserwacje, problemy, sukcesy..."
                            />
                        </div>

                        {/* Car Details */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                Dane pojazdu i przebieg
                            </h4>

                            {/* Editable total km with GPS suggestion */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                                        <Route className="w-3.5 h-3.5" />
                                        Przejechane kilometry (edytowalne)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.totalKm}
                                            onChange={e => setFormData({ ...formData, totalKm: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-white text-sm font-bold"
                                            placeholder="km"
                                        />
                                        <span className="text-sm text-blue-700 font-medium whitespace-nowrap">km</span>
                                    </div>
                                    {calculatedRoundTripKm > 0 && (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <span className="text-xs text-emerald-600">
                                                📍 GPS: ~{calculatedRoundTripKm} km
                                            </span>
                                            {formData.totalKm !== calculatedRoundTripKm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, totalKm: calculatedRoundTripKm })}
                                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    Ustaw z GPS
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-blue-700 mb-1">Nr Rejestracyjny</label>
                                    <input
                                        type="text"
                                        value={formData.carPlate}
                                        onChange={e => setFormData({ ...formData, carPlate: e.target.value })}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-white text-sm"
                                        placeholder="np. DW 12345"
                                    />
                                </div>
                            </div>


                            <div className="mt-3 flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.withDriver}
                                        onChange={e => setFormData({ ...formData, withDriver: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-blue-700">Jazda z kierowcą</span>
                                    {formData.withDriver && (
                                        <span className="text-xs text-amber-600 font-medium">(+{DRIVER_SURCHARGE} zł)</span>
                                    )}
                                </label>
                            </div>
                            {/* Car Issues */}
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-blue-700 mb-1">Uwagi dot. auta / trasy</label>
                                <input
                                    type="text"
                                    value={formData.carIssues}
                                    onChange={e => setFormData({ ...formData, carIssues: e.target.value })}
                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-white text-sm"
                                    placeholder="Zgłoszone usterki, uwagi..."
                                />
                            </div>

                            {/* Estimated Cost Summary */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
                                <h5 className="text-sm font-bold text-violet-800 mb-3 flex items-center gap-2">
                                    <Calculator className="w-4 h-4" />
                                    Szacunkowy koszt wyjazdu
                                </h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-violet-600 mb-1">Stawka za km (PLN)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.costPerKm}
                                            onChange={e => setFormData({ ...formData, costPerKm: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none bg-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-violet-600">
                                            <span>Paliwo ({formData.totalKm} km × {formData.costPerKm.toFixed(2)} zł)</span>
                                            <span className="font-medium">{fuelCost.toFixed(2)} zł</span>
                                        </div>
                                        {formData.withDriver && (
                                            <div className="flex justify-between text-xs text-violet-600">
                                                <span>Kierowca</span>
                                                <span className="font-medium">+{DRIVER_SURCHARGE.toFixed(2)} zł</span>
                                            </div>
                                        )}
                                        <div className="border-t border-violet-200 pt-1.5 flex justify-between text-sm font-bold text-violet-900">
                                            <span>Razem</span>
                                            <span>{estimatedTotalCost.toFixed(2)} zł</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                        <div className="text-sm text-slate-500">
                            {visits.filter(v => v.outcome !== 'pending').length} / {visits.length} uzupełnionych
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                disabled={loading || visits.length === 0}
                                className="px-6 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Zapisywanie...
                                    </>
                                ) : (
                                    report ? 'Zaktualizuj Raport' : 'Utwórz Raport'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
