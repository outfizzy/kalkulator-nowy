import React, { useState, useEffect } from 'react';
import type { Measurement } from '../../types';
import { haversineDistance } from '../../utils/distanceCalculator';

interface MeasurementRouteViewProps {
    measurements: Measurement[];
    onReorder: (measurements: Measurement[]) => void;
    date: Date;
}

export const MeasurementRouteView: React.FC<MeasurementRouteViewProps> = ({ measurements, onReorder, date }) => {
    // Local state for optimistic updates
    const [orderedMeasurements, setOrderedMeasurements] = useState<Measurement[]>([]);

    useEffect(() => {
        // Sort by orderInRoute if available, otherwise by time
        const sorted = [...measurements].sort((a, b) => {
            if (a.orderInRoute !== undefined && b.orderInRoute !== undefined) {
                return a.orderInRoute - b.orderInRoute;
            }
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        });
        setOrderedMeasurements(sorted);
    }, [measurements]);

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...orderedMeasurements];
        if (direction === 'up' && index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        }
        setOrderedMeasurements(newOrder);
        onReorder(newOrder);
    };

    const calculateStats = () => {
        let totalDistance = 0;
        let totalDuration = 0;

        for (let i = 0; i < orderedMeasurements.length; i++) {
            const current = orderedMeasurements[i];
            totalDuration += current.estimatedDuration || 30; // Default 30 min

            if (i > 0) {
                const prev = orderedMeasurements[i - 1];
                if (current.locationLat && current.locationLng && prev.locationLat && prev.locationLng) {
                    const dist = haversineDistance(
                        prev.locationLat, prev.locationLng,
                        current.locationLat, current.locationLng
                    );
                    totalDistance += dist;
                    // Add travel time (approx 60km/h = 1km/min)
                    totalDuration += Math.round(dist * 1.2); // +20% for traffic/roads
                }
            }
        }
        return { totalDistance, totalDuration };
    };

    const stats = calculateStats();

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">
                    Trasa: {date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <div className="flex gap-6 text-slate-300">
                    <div>
                        <span className="text-slate-500 text-sm block">Liczba wizyt</span>
                        <span className="text-xl font-semibold text-white">{orderedMeasurements.length}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 text-sm block">Szacowany dystans</span>
                        <span className="text-xl font-semibold text-white">{Math.round(stats.totalDistance)} km</span>
                    </div>
                    <div>
                        <span className="text-slate-500 text-sm block">Szacowany czas</span>
                        <span className="text-xl font-semibold text-white">
                            {Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {orderedMeasurements.map((measurement, index) => (
                    <div key={measurement.id} className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => handleMove(index, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                            >
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </button>
                            <span className="text-center text-slate-500 font-mono text-sm">{index + 1}</span>
                            <button
                                onClick={() => handleMove(index, 'down')}
                                disabled={index === orderedMeasurements.length - 1}
                                className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                            >
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-white">{measurement.customerName}</div>
                                    <div className="text-sm text-slate-400">{measurement.customerAddress}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-accent font-medium">
                                        {new Date(measurement.scheduledDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {measurement.estimatedDuration && (
                                        <div className="text-xs text-slate-500">
                                            {measurement.estimatedDuration} min
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Distance from previous */}
                            {index > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    Dojazd: {
                                        (measurement.locationLat && orderedMeasurements[index - 1].locationLat)
                                            ? `${Math.round(haversineDistance(
                                                orderedMeasurements[index - 1].locationLat!, orderedMeasurements[index - 1].locationLng!,
                                                measurement.locationLat!, measurement.locationLng!
                                            ))} km`
                                            : 'Brak danych lokalizacji'
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
