import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Measurement, MeasurementReport } from '../../types';
import { MeasurementReportModal } from './MeasurementReportModal';
import { MeasurementOutcomeModal } from './MeasurementOutcomeModal';
import { DailyRouteMap } from './DailyRouteMap';
import { RecalculateRoutesButton } from './RecalculateRoutesButton';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import { RouteCalculationService, type MeasurementRoute } from '../../services/route-calculation.service';
import { FileText, PlusSquare, MapPin, Fuel, CheckCircle, Map } from 'lucide-react';

interface MeasurementCalendarProps {
    measurements: Measurement[];
    onEdit: (measurement: Measurement) => void;
    onDragDrop?: (measurementId: string, newDate: string) => Promise<void>;
}

function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

export const MeasurementCalendar: React.FC<MeasurementCalendarProps> = ({ measurements, onEdit, onDragDrop }) => {
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

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        return date;
    });

    useEffect(() => {
        const fetchReports = async () => {
            if (!currentUser?.id) return;
            try {
                const startStr = weekDays[0].toISOString().split('T')[0];
                const endStr = weekDays[6].toISOString().split('T')[0];
                const data = await DatabaseService.getMeasurementReports({
                    userId: currentUser.id,
                    dateFrom: startStr,
                    dateTo: endStr
                });
                setReports(data);
            } catch (e) {
                console.error('Error fetching reports', e);
            }
        };
        fetchReports();
    }, [currentWeekStart, currentUser?.id]);

    // Fetch routes for measurements
    useEffect(() => {
        const fetchRoutes = async () => {
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
        if (measurements.length > 0) {
            fetchRoutes();
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

                <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-slate-800">
                        {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
                    </div>
                    <RecalculateRoutesButton />
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

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, index) => {
                    const dayMeasurements = getMeasurementsForDate(date);
                    const isTargetDate = dropTarget && dropTarget.date.toDateString() === date.toDateString();

                    return (
                        <div
                            key={index}
                            className={`
                                min-h-[200px] bg-white rounded-xl border-2 p-3 transition-all shadow-sm
                                ${isToday(date) ? 'border-accent ring-2 ring-accent/10' : 'border-slate-100'}
                                ${isTargetDate ? 'border-blue-400 bg-blue-50' : ''}
                            `}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDrop={(e) => handleDrop(e, date)}
                        >
                            <div className="mb-3 pb-2 border-b border-slate-50 flex justify-between items-start">
                                <div className={`text-sm font-bold ${isToday(date) ? 'text-accent' : 'text-slate-600'}`}>
                                    {formatDate(date)}
                                </div>

                                {/* Report Action */}
                                {(() => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const report = reports.find(r => r.date === dateStr);

                                    return (
                                        <div className="flex items-center gap-1">
                                            {/* Map Button */}
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

                                            {/* Report Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReportDate(date);
                                                    setSelectedReport(report);
                                                    setShowReportModal(true);
                                                }}
                                                className={`
                                                    p-1 rounded transition-colors
                                                    ${report
                                                        ? 'text-green-600 hover:bg-green-50'
                                                        : 'text-slate-300 hover:text-accent hover:bg-slate-50'}
                                                `}
                                                title={report ? 'Edytuj Raport' : 'Utwórz Raport'}
                                            >
                                                {report ? <FileText size={16} /> : <PlusSquare size={16} />}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="space-y-2">
                                {dayMeasurements.map((measurement) => {
                                    const route = routes[measurement.id];
                                    return (
                                        <div
                                            key={measurement.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, measurement.id)}
                                            onClick={(e) => {
                                                // If has lead_id, navigate to lead details
                                                if (measurement.leadId && e.ctrlKey) {
                                                    e.stopPropagation();
                                                    navigate(`/leads/${measurement.leadId}`);
                                                } else {
                                                    onEdit(measurement);
                                                }
                                            }}
                                            className={`
                                                p-3 rounded-lg border cursor-pointer transition-all shadow-sm
                                                ${getStatusBadgeColor(measurement.status)}
                                                hover:shadow-md active:scale-95
                                                ${draggedItemId === measurement.id ? 'opacity-50' : ''}
                                            `}
                                            title={measurement.leadId ? 'Ctrl+Click aby zobaczyć lead' : ''}
                                        >
                                            <div className="text-xs font-bold mb-1 text-slate-800">
                                                {measurement.customerName}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {measurement.salesRepName}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">{measurement.customerAddress}</span>
                                            </div>

                                            {/* Route info */}
                                            {route && (
                                                <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1 text-blue-600">
                                                        <MapPin size={12} />
                                                        <span className="font-medium">{route.distance_km.toFixed(0)}km</span>
                                                    </div>
                                                    {route.fuel_cost && (
                                                        <div className="flex items-center gap-1 text-green-600">
                                                            <Fuel size={12} />
                                                            <span className="font-medium">{route.fuel_cost.toFixed(2)}zł</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Outcome completion button for past measurements */}
                                            {!measurement.outcome && new Date(measurement.scheduledDate) < new Date() && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMeasurement(measurement);
                                                        setShowOutcomeModal(true);
                                                    }}
                                                    className="mt-2 w-full py-1.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <CheckCircle size={12} />
                                                    Uzupełnij wynik
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
                    onClose={() => {
                        setShowReportModal(false);
                        setSelectedReport(undefined);
                    }}
                    onSave={() => {
                        setShowReportModal(false);
                        setSelectedReport(undefined);
                        // Trigger refresh logic if needed, e.g. refetch reports
                        const startStr = weekDays[0].toISOString().split('T')[0]; // Quick refetch hack
                        const endStr = weekDays[6].toISOString().split('T')[0];
                        if (currentUser?.id) {
                            DatabaseService.getMeasurementReports({
                                userId: currentUser.id,
                                dateFrom: startStr,
                                dateTo: endStr
                            }).then(setReports);
                        }
                    }}
                    currentUserId={currentUser?.id || ''}
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
                        // Refresh measurements list
                        window.location.reload(); // Simple refresh for now
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
        </div>
    );
};
