import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Measurement, MeasurementReport } from '../../types';
import { MeasurementReportModal } from './MeasurementReportModal';
import { MeasurementOutcomeModal } from './MeasurementOutcomeModal';
import { ClientDetailModal } from './ClientDetailModal';
import { DailyRouteMap } from './DailyRouteMap';
import { RecalculateRoutesButton } from './RecalculateRoutesButton';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import { RouteCalculationService, type MeasurementRoute } from '../../services/route-calculation.service';
import { FileText, PlusSquare, CheckCircle, Map, Route, AlertTriangle, AlertCircle } from 'lucide-react';

interface MeasurementCalendarProps {
    measurements: Measurement[];
    onEdit: (measurement: Measurement) => void;
    onDragDrop?: (measurementId: string, newDate: string) => Promise<void>;
    viewingUserId?: string; // For admin/manager: the selected sales rep's ID. For sales rep: their own ID.
}

function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

export const MeasurementCalendar: React.FC<MeasurementCalendarProps> = ({ measurements, onEdit, onDragDrop, viewingUserId }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        return getStartOfWeek(today);
    });
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ date: Date } | null>(null);

    // Reports Integration
    const [reports, setReports] = useState<MeasurementReport[]>([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReportDate, setSelectedReportDate] = useState<Date>(new Date());
    const [selectedReport, setSelectedReport] = useState<MeasurementReport | undefined>(undefined);

    // Routes Integration
    const [routes, setRoutes] = useState<Record<string, MeasurementRoute>>({});

    // Outcome Modal
    const [showOutcomeModal, setShowOutcomeModal] = useState(false);
    const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);

    // Route Map Modal
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedMapDate, setSelectedMapDate] = useState<Date>(new Date());

    // Client Detail Modal
    const [showClientDetail, setShowClientDetail] = useState(false);
    const [selectedClientMeasurement, setSelectedClientMeasurement] = useState<Measurement | null>(null);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        return date;
    });

    // Determine which user's reports to fetch:
    // - If viewingUserId is provided (admin viewing specific rep), use that
    // - Otherwise use the current user's own ID
    const effectiveUserId = viewingUserId || currentUser?.id;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    useEffect(() => {
        const fetchReports = async () => {
            if (!effectiveUserId) return;
            try {
                const startStr = weekDays[0].toISOString().split('T')[0];
                const endStr = weekDays[6].toISOString().split('T')[0];
                // Admin viewing 'all' → fetch all reports; otherwise scopeto specific user
                const data = await DatabaseService.getMeasurementReports({
                    userId: (isAdmin && !viewingUserId) ? undefined : effectiveUserId,
                    dateFrom: startStr,
                    dateTo: endStr
                });
                setReports(data);
            } catch (e) {
                console.error('Error fetching reports', e);
            }
        };
        fetchReports();
    }, [currentWeekStart, effectiveUserId, viewingUserId, isAdmin]);

    // Fetch routes for measurements
    const fetchRoutesData = async () => {
        const routesMap: Record<string, MeasurementRoute> = {};
        for (const measurement of measurements) {
            try {
                const route = await RouteCalculationService.getRouteForMeasurement(measurement.id);
                if (route) {
                    routesMap[measurement.id] = route;
                }
            } catch (e) {
                console.error(`Error fetching route for measurement ${measurement.id}:`, e);
            }
        }
        setRoutes(routesMap);
    };

    useEffect(() => {
        if (measurements.length > 0) {
            fetchRoutesData();
        }
    }, [measurements]);

    const handlePrevWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        setCurrentWeekStart(newStart);
    };

    const handleNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        setCurrentWeekStart(newStart);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ date });
    };

    const handleDrop = async (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        if (draggedItemId && onDragDrop) {
            await onDragDrop(draggedItemId, date.toISOString().split('T')[0]);
        }
        setDraggedItemId(null);
        setDropTarget(null);
    };

    const getMeasurementsForDate = (date: Date): Measurement[] => {
        const dateStr = date.toISOString().split('T')[0];
        return measurements.filter(m => {
            const mDateStr = new Date(m.scheduledDate).toISOString().split('T')[0];
            return mDateStr === dateStr;
        });
    };

    const getStatusBadgeColor = (status: Measurement['status']) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'completed': return 'bg-green-50 text-green-700 border-green-200';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pl-PL', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        }).format(date);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Get day route summary
    const getDayRouteSummary = (dayMeasurements: Measurement[]) => {
        if (dayMeasurements.length === 0) return null;

        const withRoutes = dayMeasurements.filter(m => routes[m.id]);
        const withoutRoutes = dayMeasurements.filter(m => !routes[m.id]);

        const totalDistance = withRoutes.reduce((sum, m) => sum + (routes[m.id]?.distance_km || 0), 0);
        const totalCost = withRoutes.reduce((sum, m) => sum + (routes[m.id]?.fuel_cost || 0), 0);

        return {
            totalDistance,
            totalCost,
            routeCount: withRoutes.length,
            measurementCount: dayMeasurements.length,
            isComplete: withoutRoutes.length === 0 && withRoutes.length > 0,
            isOutdated: withoutRoutes.length > 0 && withRoutes.length > 0,
            hasNoRoutes: withRoutes.length === 0,
        };
    };

    return (
        <div className="space-y-4">
            {/* Header with week navigation */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <button
                    onClick={handlePrevWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Poprzedni tydzień
                </button>

                <div className="text-lg font-bold text-slate-800">
                    {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
                </div>

                <button
                    onClick={handleNextWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors font-medium"
                >
                    Następny tydzień
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Unfilled Reports Banner */}
            {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysNeedingReport = weekDays.filter(date => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    if (d >= today) return false; // Only past days
                    const dayMeasurements = getMeasurementsForDate(date);
                    if (dayMeasurements.length === 0) return false; // No measurements = no report needed
                    const dateStr = date.toISOString().split('T')[0];
                    const hasReport = reports.find(r => r.date === dateStr);
                    return !hasReport;
                });
                if (daysNeedingReport.length === 0) return null;
                return (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 text-sm text-amber-800">
                            <strong>Uzupełnij raporty!</strong> Masz <strong>{daysNeedingReport.length}</strong> {daysNeedingReport.length === 1 ? 'dzień' : 'dni'} bez raportu:
                            {' '}
                            {daysNeedingReport.map((d, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setSelectedReportDate(d);
                                        setSelectedReport(undefined);
                                        setShowReportModal(true);
                                    }}
                                    className="inline-flex items-center px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-amber-900 font-semibold transition-colors mx-0.5"
                                >
                                    {d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, index) => {
                    const dayMeasurements = getMeasurementsForDate(date);
                    const isTargetDate = dropTarget && dropTarget.date.toDateString() === date.toDateString();
                    const routeSummary = getDayRouteSummary(dayMeasurements);

                    return (
                        <div
                            key={index}
                            className={`
                                min-h-[200px] bg-white rounded-xl border-2 p-3 transition-all shadow-sm flex flex-col
                                ${isToday(date) ? 'border-accent ring-2 ring-accent/10' : 'border-slate-100'}
                                ${isTargetDate ? 'border-blue-400 bg-blue-50' : ''}
                            `}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDrop={(e) => handleDrop(e, date)}
                        >
                            {/* Day Header */}
                            <div className="mb-3 pb-2 border-b border-slate-50 flex justify-between items-start">
                                <div className={`text-sm font-bold ${isToday(date) ? 'text-accent' : 'text-slate-600'}`}>
                                    {formatDate(date)}
                                </div>

                                {/* Action Icons */}
                                {(() => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const report = reports.find(r => r.date === dateStr);

                                    return (
                                        <div className="flex items-center gap-0.5">
                                            {/* Recalculate Routes */}
                                            {dayMeasurements.length > 0 && (
                                                <RecalculateRoutesButton
                                                    date={date}
                                                    onComplete={() => fetchRoutesData()}
                                                />
                                            )}

                                            {/* Map Button */}
                                            {dayMeasurements.length > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMapDate(date);
                                                        setShowMapModal(true);
                                                    }}
                                                    className="p-1 rounded transition-colors text-purple-600 hover:bg-purple-50"
                                                    title="Pokaż mapę tras"
                                                >
                                                    <Map size={16} />
                                                </button>
                                            )}

                                            {/* Report Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReportDate(date);
                                                    setSelectedReport(report);
                                                    setShowReportModal(true);
                                                }}
                                                className={`
                                                    p-1 rounded transition-colors relative
                                                    ${report
                                                        ? 'text-green-600 hover:bg-green-50'
                                                        : 'text-slate-300 hover:text-accent hover:bg-slate-50'}
                                                `}
                                                title={report ? 'Edytuj Raport' : 'Utwórz Raport'}
                                            >
                                                {report ? <FileText size={16} /> : <PlusSquare size={16} />}
                                                {/* Pulsing dot for past days without report */}
                                                {!report && (() => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const d = new Date(date);
                                                    d.setHours(0, 0, 0, 0);
                                                    return d < today && dayMeasurements.length > 0;
                                                })() && (
                                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                    )}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Measurements */}
                            <div className="space-y-2 flex-1">
                                {dayMeasurements.map((measurement, idx) => (
                                    <div
                                        key={measurement.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, measurement.id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedClientMeasurement(measurement);
                                            setShowClientDetail(true);
                                        }}
                                        className={`
                                            p-2 rounded-lg border cursor-pointer transition-all shadow-sm
                                            ${getStatusBadgeColor(measurement.status)}
                                            hover:shadow-md active:scale-95
                                            ${draggedItemId === measurement.id ? 'opacity-50' : ''}
                                        `}
                                        title="Kliknij aby zobaczyć szczegóły klienta"
                                    >
                                        <div className="text-xs font-bold text-slate-800 truncate">
                                            {measurement.customerName}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="truncate">{measurement.salesRepName}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="truncate">{measurement.customerAddress}</span>
                                        </div>

                                        {/* Outcome button for past measurements */}
                                        {!measurement.outcome && new Date(measurement.scheduledDate) < new Date() && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMeasurement(measurement);
                                                    setShowOutcomeModal(true);
                                                }}
                                                className="mt-1.5 w-full py-1 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                                            >
                                                <CheckCircle size={11} />
                                                Uzupełnij wynik
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Day Route Summary (bottom of column) */}
                            {routeSummary && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                    {routeSummary.isComplete && (
                                        <div
                                            className="flex items-center gap-1.5 text-[11px] bg-emerald-50 text-emerald-700 rounded-md px-2 py-1.5 cursor-pointer hover:bg-emerald-100 transition-colors"
                                            onClick={() => {
                                                setSelectedMapDate(date);
                                                setShowMapModal(true);
                                            }}
                                        >
                                            <Route size={12} className="flex-shrink-0" />
                                            <span className="font-semibold">{routeSummary.totalDistance.toFixed(0)} km</span>
                                            <span className="text-emerald-500">·</span>
                                            <span className="font-semibold">{routeSummary.totalCost.toFixed(0)} zł</span>
                                        </div>
                                    )}

                                    {routeSummary.isOutdated && (
                                        <div
                                            className="flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-700 rounded-md px-2 py-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
                                            onClick={() => {
                                                setSelectedMapDate(date);
                                                setShowMapModal(true);
                                            }}
                                        >
                                            <AlertTriangle size={12} className="flex-shrink-0" />
                                            <span className="font-medium">Trasa nieaktualna</span>
                                            <span className="text-amber-500">·</span>
                                            <span>{routeSummary.totalDistance.toFixed(0)} km</span>
                                        </div>
                                    )}

                                    {routeSummary.hasNoRoutes && dayMeasurements.length > 0 && (
                                        <div className="text-[11px] text-slate-400 text-center py-1">
                                            Kliknij 🔄 aby obliczyć trasę
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-sm bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-slate-700">Status:</div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded border ${getStatusBadgeColor('scheduled')}`}>
                            Zaplanowano
                        </span>
                        <span className={`px-2 py-1 rounded border ${getStatusBadgeColor('completed')}`}>
                            Zrealizowano
                        </span>
                        <span className={`px-2 py-1 rounded border ${getStatusBadgeColor('cancelled')}`}>
                            Anulowano
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => setShowReportModal(true)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Raport z Dzisiaj
                </button>
            </div>

            {showReportModal && (
                <MeasurementReportModal
                    date={selectedReportDate}
                    measurements={getMeasurementsForDate(selectedReportDate)}
                    report={selectedReport}
                    routes={routes}
                    onClose={() => {
                        setShowReportModal(false);
                        setSelectedReport(undefined);
                    }}
                    onSave={() => {
                        setShowReportModal(false);
                        setSelectedReport(undefined);
                        const startStr = weekDays[0].toISOString().split('T')[0];
                        const endStr = weekDays[6].toISOString().split('T')[0];
                        DatabaseService.getMeasurementReports({
                            userId: (isAdmin && !viewingUserId) ? undefined : effectiveUserId,
                            dateFrom: startStr,
                            dateTo: endStr
                        }).then(setReports);
                    }}
                    currentUserId={effectiveUserId || currentUser?.id || ''}
                />
            )}

            {/* Outcome Modal */}
            {showOutcomeModal && selectedMeasurement && (
                <MeasurementOutcomeModal
                    measurementId={selectedMeasurement.id}
                    customerName={selectedMeasurement.customerName}
                    scheduledDate={selectedMeasurement.scheduledDate}
                    onClose={() => {
                        setShowOutcomeModal(false);
                        setSelectedMeasurement(null);
                    }}
                    onSave={() => {
                        window.location.reload();
                    }}
                />
            )}

            {/* Route Map Modal */}
            {showMapModal && (
                <DailyRouteMap
                    date={selectedMapDate}
                    measurements={getMeasurementsForDate(selectedMapDate)}
                    routes={routes}
                    onClose={() => setShowMapModal(false)}
                />
            )}

            {/* Client Detail Modal */}
            {showClientDetail && selectedClientMeasurement && (
                <ClientDetailModal
                    measurement={selectedClientMeasurement}
                    onClose={() => {
                        setShowClientDetail(false);
                        setSelectedClientMeasurement(null);
                    }}
                    onEdit={(m) => {
                        setShowClientDetail(false);
                        setSelectedClientMeasurement(null);
                        onEdit(m);
                    }}
                />
            )}
        </div>
    );
};
