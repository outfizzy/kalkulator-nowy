import React, { useState, useEffect } from 'react';
import { MeasurementService } from '../../services/database/measurement.service';
import { GeocodingService } from '../../services/GeocodingService';
import { MapPin, Calendar, ChevronDown, ChevronUp, Route, Clock, User, CalendarX } from 'lucide-react';
import type { Measurement } from '../../types';

interface MeasurementSuggestionWidgetProps {
    leadAddress: string;
    leadCity?: string;
    leadPostalCode?: string;
    assignedRepId?: string;
    onSchedule?: (date: Date) => void;
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MeasurementSlot {
    id: string;
    customerName: string;
    address: string;
    distanceKm: number;
    time: string;
    endTime?: string;
}

interface FreeSlot {
    from: string;
    to: string;
    durationMin: number;
}

interface DaySuggestion {
    date: string; // YYYY-MM-DD
    dayLabel: string;
    measurements: MeasurementSlot[];
    freeSlots: FreeSlot[];
    minDistance: number;
    avgDistance: number;
    measurementCount: number;
    salesRepName: string;
    salesRepId?: string;
    routeAddKm?: number; // estimated extra km if this lead is added
}

const DAY_LABELS: Record<number, string> = {
    0: 'Niedziela', 1: 'Poniedziałek', 2: 'Wtorek', 3: 'Środa',
    4: 'Czwartek', 5: 'Piątek', 6: 'Sobota'
};

const WORK_START = 8; // 08:00
const WORK_END = 17;  // 17:00
const EST_MEASUREMENT_MIN = 90; // estimated measurement duration

export const MeasurementSuggestionWidget: React.FC<MeasurementSuggestionWidgetProps> = ({
    leadAddress, leadCity, leadPostalCode, assignedRepId, onSchedule
}) => {
    const [suggestions, setSuggestions] = useState<DaySuggestion[]>([]);
    const [freeDays, setFreeDays] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [leadCoords, setLeadCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [viewMode, setViewMode] = useState<'best' | 'free'>('best');

    useEffect(() => {
        analyzeMeasurements();
    }, [leadAddress, leadCity, leadPostalCode, assignedRepId]);

    const analyzeMeasurements = async () => {
        setLoading(true);
        try {
            const fullAddress = [leadAddress, leadPostalCode, leadCity].filter(Boolean).join(', ');
            if (!fullAddress || fullAddress.length < 5) { setLoading(false); return; }

            const coords = await GeocodingService.search(fullAddress);
            if (!coords) { setLoading(false); return; }
            setLeadCoords(coords);

            // Load ALL measurements (not just assigned rep) for multi-rep comparison
            let measurements: Measurement[];
            if (assignedRepId) {
                measurements = await MeasurementService.getMeasurementsBySalesRep(assignedRepId);
            } else {
                // No assigned rep → load all to compare routes across reps
                measurements = await MeasurementService.getMeasurements();
            }

            const now = new Date();
            const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

            const upcoming = measurements.filter(m =>
                m.status === 'scheduled' &&
                m.scheduledDate >= now &&
                m.scheduledDate <= twoWeeksLater
            );

            // ── Find FREE days (workdays without any measurements) ──
            const busyDates = new Set(upcoming.map(m => m.scheduledDate.toISOString().split('T')[0]));
            const emptyDays: string[] = [];
            for (let d = new Date(now); d <= twoWeeksLater; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends
                const key = d.toISOString().split('T')[0];
                if (!busyDates.has(key)) {
                    const dayName = DAY_LABELS[dayOfWeek];
                    const formatted = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
                    emptyDays.push(`${dayName}, ${formatted}`);
                }
            }
            setFreeDays(emptyDays.slice(0, 5));

            if (upcoming.length === 0) { setSuggestions([]); setLoading(false); return; }

            // ── Group by date ──
            const byDate = new Map<string, Measurement[]>();
            for (const m of upcoming) {
                const dateKey = m.scheduledDate.toISOString().split('T')[0];
                if (!byDate.has(dateKey)) byDate.set(dateKey, []);
                byDate.get(dateKey)!.push(m);
            }

            const results: DaySuggestion[] = [];

            for (const [dateKey, dayMeasurements] of byDate.entries()) {
                const d = new Date(dateKey);
                const dayName = DAY_LABELS[d.getDay()];
                const dateFormatted = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

                // Sort by time
                dayMeasurements.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

                const withDistance = dayMeasurements.map(m => {
                    let dist = Infinity;
                    if (m.locationLat && m.locationLng) {
                        dist = haversineKm(coords.lat, coords.lng, m.locationLat, m.locationLng);
                    }
                    const duration = m.estimatedDuration || EST_MEASUREMENT_MIN;
                    const endDate = new Date(m.scheduledDate.getTime() + duration * 60000);
                    return {
                        id: m.id,
                        customerName: m.customerName,
                        address: m.customerAddress || '',
                        distanceKm: Math.round(dist * 10) / 10,
                        time: m.scheduledDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                        endTime: endDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
                    };
                }).filter(m => m.distanceKm < 9999);

                if (withDistance.length === 0) continue;

                // ── Calculate free slots ──
                const freeSlots: FreeSlot[] = [];
                const dayStart = new Date(d); dayStart.setHours(WORK_START, 0, 0, 0);
                const dayEnd = new Date(d); dayEnd.setHours(WORK_END, 0, 0, 0);

                // Build a timeline of busy periods
                const busyPeriods = dayMeasurements
                    .map(m => {
                        const dur = m.estimatedDuration || EST_MEASUREMENT_MIN;
                        return {
                            start: m.scheduledDate,
                            end: new Date(m.scheduledDate.getTime() + dur * 60000)
                        };
                    })
                    .sort((a, b) => a.start.getTime() - b.start.getTime());

                let cursor = dayStart;
                for (const period of busyPeriods) {
                    if (period.start > cursor) {
                        const gapMin = (period.start.getTime() - cursor.getTime()) / 60000;
                        if (gapMin >= 60) { // only show slots >= 1h
                            freeSlots.push({
                                from: cursor.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                                to: period.start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                                durationMin: Math.round(gapMin)
                            });
                        }
                    }
                    if (period.end > cursor) cursor = period.end;
                }
                // Check gap after last measurement
                if (cursor < dayEnd) {
                    const gapMin = (dayEnd.getTime() - cursor.getTime()) / 60000;
                    if (gapMin >= 60) {
                        freeSlots.push({
                            from: cursor.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                            to: dayEnd.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                            durationMin: Math.round(gapMin)
                        });
                    }
                }

                const distances = withDistance.map(m => m.distanceKm);

                // ── Estimate route impact ──
                // How much extra km would adding this lead cost? (min distance = detour)
                const minDist = Math.min(...distances);
                const routeAddKm = Math.round(minDist * 2 * 10) / 10; // round trip detour estimate

                results.push({
                    date: dateKey,
                    dayLabel: `${dayName}, ${dateFormatted}`,
                    measurements: withDistance.sort((a, b) => a.distanceKm - b.distanceKm),
                    freeSlots,
                    minDistance: minDist,
                    avgDistance: Math.round(distances.reduce((a, b) => a + b, 0) / distances.length * 10) / 10,
                    measurementCount: dayMeasurements.length,
                    salesRepName: dayMeasurements[0]?.salesRepName || '',
                    salesRepId: dayMeasurements[0]?.salesRepId,
                    routeAddKm
                });
            }

            results.sort((a, b) => a.minDistance - b.minDistance);
            setSuggestions(results);
        } catch (err) {
            console.error('[MeasurementSuggestionWidget]', err);
        } finally {
            setLoading(false);
        }
    };

    const distanceBadge = (km: number) => {
        if (km <= 15) return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Blisko', dot: 'bg-emerald-500' };
        if (km <= 40) return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Średnio', dot: 'bg-amber-500' };
        return { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Daleko', dot: 'bg-red-400' };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full" />
                    Analizuję kalendarz pomiarów...
                </div>
            </div>
        );
    }

    if (!leadCoords || (suggestions.length === 0 && freeDays.length === 0)) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                        <Route className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500">Sugestie pomiarów</div>
                        <div className="text-[10px] text-slate-400">
                            {!leadCoords ? 'Brak danych adresowych do analizy' : 'Brak zaplanowanych pomiarów w najbliższych 2 tygodniach'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const bestDay = suggestions[0];
    const badge = bestDay ? distanceBadge(bestDay.minDistance) : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                        <Route className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-bold text-slate-700">Sugestie pomiarów</div>
                        <div className="text-[10px] text-slate-400">
                            {suggestions.length} dni z trasą • {freeDays.length} wolnych dni
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {bestDay.minDistance} km
                        </span>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>

            {/* Best suggestion preview (collapsed) */}
            {!expanded && bestDay && badge && (
                <div className="px-3 pb-3">
                    <div className={`rounded-lg border p-2.5 ${badge.bg}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-xs font-semibold text-slate-700">{bestDay.dayLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">{bestDay.measurementCount} pomiar{bestDay.measurementCount !== 1 ? (bestDay.measurementCount < 5 ? 'y' : 'ów') : ''}</span>
                                <span className={`text-[10px] font-bold ${badge.text}`}>↗ {bestDay.minDistance} km</span>
                            </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                            {bestDay.measurements[0] && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">Najbliżej: {bestDay.measurements[0].customerName}</span>
                                </div>
                            )}
                            {bestDay.freeSlots.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium flex-shrink-0">
                                    <Clock className="w-3 h-3" />
                                    {bestDay.freeSlots.length} wolne okno{bestDay.freeSlots.length > 1 ? 'a' : ''}
                                </div>
                            )}
                        </div>
                        {bestDay.routeAddKm !== undefined && (
                            <div className="mt-1 text-[10px] text-slate-400">
                                ≈ +{bestDay.routeAddKm} km objazdu przy dodaniu tego leada
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Expanded view */}
            {expanded && (
                <div className="px-3 pb-3">
                    {/* View mode tabs */}
                    <div className="flex gap-1 mb-2 bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('best')}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors flex items-center justify-center gap-1
                                ${viewMode === 'best' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Route className="w-3 h-3" /> Najlepsza trasa ({suggestions.length})
                        </button>
                        <button
                            onClick={() => setViewMode('free')}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors flex items-center justify-center gap-1
                                ${viewMode === 'free' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarX className="w-3 h-3" /> Wolne dni ({freeDays.length})
                        </button>
                    </div>

                    {/* ── BEST ROUTE VIEW ── */}
                    {viewMode === 'best' && (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto">
                            {suggestions.map((day, idx) => {
                                const db = distanceBadge(day.minDistance);
                                const isExpDay = expandedDay === day.date;
                                return (
                                    <div key={day.date} className={`rounded-lg border ${db.bg} overflow-hidden`}>
                                        <button
                                            onClick={() => setExpandedDay(isExpDay ? null : day.date)}
                                            className="w-full flex items-center justify-between p-2.5"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {idx === 0 && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">TOP</span>}
                                                <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                                <span className="text-xs font-semibold text-slate-700 truncate">{day.dayLabel}</span>
                                                {day.salesRepName && <span className="text-[10px] text-slate-400 flex-shrink-0 hidden sm:inline">• {day.salesRepName}</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {day.freeSlots.length > 0 && (
                                                    <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                                        {day.freeSlots.length} okno
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-500">{day.measurementCount}×</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${db.text}`}>
                                                    {day.minDistance} km
                                                </span>
                                                {isExpDay ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                            </div>
                                        </button>

                                        {isExpDay && (
                                            <div className="border-t border-slate-200/50 bg-white/50 p-2 space-y-1.5">
                                                {/* Existing measurements */}
                                                {day.measurements.map(m => {
                                                    const mb = distanceBadge(m.distanceKm);
                                                    return (
                                                        <div key={m.id} className="flex items-center gap-2 text-[11px]">
                                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${mb.dot}`} />
                                                            <span className="text-slate-400 font-mono w-20 flex-shrink-0">{m.time}{m.endTime ? `–${m.endTime}` : ''}</span>
                                                            <span className="text-slate-700 font-medium truncate flex-1">{m.customerName}</span>
                                                            <span className={`font-bold ${mb.text} flex-shrink-0`}>{m.distanceKm} km</span>
                                                        </div>
                                                    );
                                                })}

                                                {/* Free time slots */}
                                                {day.freeSlots.length > 0 && (
                                                    <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                                                        <div className="text-[10px] font-bold text-emerald-600 mb-1 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> Wolne okna czasowe:
                                                        </div>
                                                        {day.freeSlots.map((slot, si) => (
                                                            <div key={si} className="flex items-center gap-2 text-[11px] text-emerald-700">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-300 flex-shrink-0" />
                                                                <span className="font-mono">{slot.from}–{slot.to}</span>
                                                                <span className="text-emerald-500">({Math.floor(slot.durationMin / 60)}h {slot.durationMin % 60 > 0 ? `${slot.durationMin % 60}min` : ''})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Route impact */}
                                                {day.routeAddKm !== undefined && (
                                                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                                        📏 Szacowany objazd: <span className="font-bold text-slate-600">+{day.routeAddKm} km</span>
                                                        {day.routeAddKm <= 20 && <span className="text-emerald-600 ml-1">• Warto!</span>}
                                                        {day.routeAddKm > 20 && day.routeAddKm <= 50 && <span className="text-amber-600 ml-1">• Akceptowalne</span>}
                                                        {day.routeAddKm > 50 && <span className="text-red-500 ml-1">• Daleko, rozważ solo</span>}
                                                    </div>
                                                )}

                                                {onSchedule && (
                                                    <button
                                                        onClick={() => onSchedule(new Date(day.date))}
                                                        className="w-full mt-1 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Calendar className="w-3 h-3" />
                                                        Zaplanuj pomiar na ten dzień
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── FREE DAYS VIEW ── */}
                    {viewMode === 'free' && (
                        <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                            {freeDays.length > 0 ? freeDays.map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="flex items-center gap-2">
                                        <CalendarX className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-700">{day}</span>
                                    </div>
                                    <span className="text-[10px] text-blue-600 font-medium">Cały dzień wolny</span>
                                </div>
                            )) : (
                                <div className="text-center py-4 text-[11px] text-slate-400">
                                    Brak wolnych dni w najbliższych 2 tygodniach
                                </div>
                            )}
                            {freeDays.length > 0 && (
                                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                    💡 W wolne dni możesz zaplanować solo wizytę bez objazdu
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
