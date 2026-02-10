import React, { useEffect, useRef, useState } from 'react';
import type { Measurement } from '../../types';
import type { MeasurementRoute } from '../../services/route-calculation.service';
import { X, MapPin, Fuel, User } from 'lucide-react';

interface DailyRouteMapProps {
    date: Date;
    measurements: Measurement[];
    routes: Record<string, MeasurementRoute>;
    onClose: () => void;
}

const GUBIN_COORDS = { lat: 51.9533, lng: 14.7233 };

// Group measurements by sales rep
function groupBySalesRep(measurements: Measurement[]): Record<string, Measurement[]> {
    return measurements.reduce((acc, m) => {
        if (!acc[m.salesRepId]) {
            acc[m.salesRepId] = [];
        }
        acc[m.salesRepId].push(m);
        return acc;
    }, {} as Record<string, Measurement[]>);
}

// Colors for different sales reps
const COLORS = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
];

export const DailyRouteMap: React.FC<DailyRouteMapProps> = ({ date, measurements, routes, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedSalesRep, setSelectedSalesRep] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const renderersRef = useRef<google.maps.DirectionsRenderer[]>([]);

    const measurementsBySalesRep = groupBySalesRep(measurements);
    const salesReps = Object.keys(measurementsBySalesRep);

    useEffect(() => {
        if (!mapRef.current || !window.google) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
            center: GUBIN_COORDS,
            zoom: 9,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
        });

        setMap(mapInstance);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!map) return;

        // Clear existing renderers
        renderersRef.current.forEach(r => r.setMap(null));
        renderersRef.current = [];

        // Add START/FINISH marker in Gubin
        const startMarker = new google.maps.Marker({
            position: GUBIN_COORDS,
            map,
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: new google.maps.Size(40, 40),
            },
            label: {
                text: 'START',
                color: 'white',
                fontWeight: 'bold',
            },
            title: 'Gubin 66-620 (START/META)',
        });

        // Filter measurements by selected sales rep
        const filteredMeasurements = selectedSalesRep
            ? measurementsBySalesRep[selectedSalesRep] || []
            : measurements;

        // Sort by orderInRoute
        const sortedMeasurements = [...filteredMeasurements].sort((a, b) => {
            const orderA = a.orderInRoute || 999;
            const orderB = b.orderInRoute || 999;
            return orderA - orderB;
        });

        // Get measurements that have GPS coordinates
        const measurementsWithGPS = sortedMeasurements.filter(
            m => m.locationLat && m.locationLng
        );

        if (measurementsWithGPS.length === 0) {
            console.log('No measurements with GPS coordinates');
            return;
        }

        // Process each sales rep individually: markers numbered per rep + connected route
        const repsToRender = selectedSalesRep
            ? [selectedSalesRep]
            : salesReps;

        repsToRender.forEach((repId) => {
            const repMeasurements = (selectedSalesRep
                ? measurementsWithGPS
                : measurementsWithGPS.filter(m => m.salesRepId === repId)
            ).sort((a, b) => (a.orderInRoute || 999) - (b.orderInRoute || 999));

            if (repMeasurements.length === 0) return;

            const color = COLORS[salesReps.indexOf(repId) % COLORS.length];

            // Add numbered markers PER REP (each rep starts from 1)
            repMeasurements.forEach((measurement, repIdx) => {
                const route = routes[measurement.id];
                const repNumber = repIdx + 1; // Each rep starts from 1

                const marker = new google.maps.Marker({
                    position: { lat: measurement.locationLat!, lng: measurement.locationLng! },
                    map,
                    label: {
                        text: `${repNumber}`,
                        color: 'white',
                        fontWeight: 'bold',
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: color,
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2,
                    },
                    title: `${measurement.salesRepName} - ${repNumber}. ${measurement.customerName}`,
                    zIndex: 10,
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; max-width: 220px;">
                            <div style="font-weight: bold; font-size: 14px;">${repNumber}. ${measurement.customerName}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 4px;">${measurement.customerAddress}</div>
                            <div style="font-size: 12px; margin-top: 4px;">
                                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle;"></span>
                                <strong>${measurement.salesRepName}</strong>
                            </div>
                            ${route?.distance_km ? `
                                <div style="font-size: 12px; color: #3B82F6; margin-top: 4px;">
                                    📍 ${route.distance_km.toFixed(0)} km z Gubina
                                </div>
                            ` : ''}
                            ${route?.fuel_cost ? `
                                <div style="font-size: 12px; color: #10B981;">
                                    ⛽ ${route.fuel_cost.toFixed(2)} zł
                                </div>
                            ` : ''}
                        </div>
                    `,
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            });

            // Draw ONE connected route for this rep: Gubin → Client 1 → Client 2 → ... → Gubin
            const waypoints = repMeasurements.map(m => ({
                location: new google.maps.LatLng(m.locationLat!, m.locationLng!),
                stopover: true,
            }));

            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
                {
                    origin: GUBIN_COORDS,
                    destination: GUBIN_COORDS,
                    waypoints: waypoints,
                    optimizeWaypoints: false,
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === 'OK' && result) {
                        const renderer = new google.maps.DirectionsRenderer({
                            map: map,
                            directions: result,
                            suppressMarkers: true,
                            polylineOptions: {
                                strokeColor: color,
                                strokeOpacity: 0.7,
                                strokeWeight: 4,
                            },
                        });
                        renderersRef.current.push(renderer);
                        console.log(`Route for ${repMeasurements[0]?.salesRepName}: ${repMeasurements.length} stops`);
                    } else {
                        console.error('Failed to calculate route:', status);
                    }
                }
            );
        });

        // Fit bounds to show all markers
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(GUBIN_COORDS);
        measurementsWithGPS.forEach((m) => {
            bounds.extend({ lat: m.locationLat!, lng: m.locationLng! });
        });
        map.fitBounds(bounds);
    }, [map, measurements, routes, selectedSalesRep, measurementsBySalesRep, salesReps]);

    // Calculate summary for selected sales rep or all
    const getSummary = () => {
        const filteredMeasurements = selectedSalesRep
            ? measurementsBySalesRep[selectedSalesRep] || []
            : measurements;

        const totalDistance = filteredMeasurements.reduce((sum, m) => {
            const route = routes[m.id];
            return sum + (route?.distance_km || 0);
        }, 0);

        const totalCost = filteredMeasurements.reduce((sum, m) => {
            const route = routes[m.id];
            return sum + (route?.fuel_cost || 0);
        }, 0);

        return {
            visitCount: filteredMeasurements.length,
            totalDistance,
            totalCost,
        };
    };

    const summary = getSummary();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Mapa Tras - {date.toLocaleDateString('pl-PL')}
                        </h2>
                        <p className="text-sm text-slate-500">
                            Trasa dnia: Gubin → Klienci → Gubin
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Sales Rep Filter */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setSelectedSalesRep(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedSalesRep === null
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Wszyscy ({measurements.length})
                    </button>
                    {salesReps.map((salesRepId, idx) => {
                        const repMeasurements = measurementsBySalesRep[salesRepId];
                        const repName = repMeasurements[0]?.salesRepName || 'Nieznany';
                        const color = COLORS[idx % COLORS.length];

                        return (
                            <button
                                key={salesRepId}
                                onClick={() => setSelectedSalesRep(salesRepId)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${selectedSalesRep === salesRepId
                                    ? 'text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                style={{
                                    backgroundColor: selectedSalesRep === salesRepId ? color : undefined,
                                }}
                            >
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                {repName} ({repMeasurements.length})
                            </button>
                        );
                    })}
                </div>

                {/* Map */}
                <div className="flex-1 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                            <div className="text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                                <p className="text-sm text-slate-600">Ładowanie mapy...</p>
                            </div>
                        </div>
                    )}
                    <div ref={mapRef} className="w-full h-full" />
                </div>

                {/* Summary Panel */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{summary.visitCount}</div>
                            <div className="text-xs text-slate-600 mt-1">Wizyt</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {summary.totalDistance.toFixed(0)} km
                            </div>
                            <div className="text-xs text-slate-600 mt-1">Całkowity dystans</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {summary.totalCost.toFixed(2)} zł
                            </div>
                            <div className="text-xs text-slate-600 mt-1">Koszt paliwa</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
