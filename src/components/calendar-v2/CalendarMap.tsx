import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Installation, InstallationTeam } from '../../types';

// ============================================================================
// CALENDAR MAP V2 - Map View with Route Optimization
// Uses Leaflet for map rendering with route lines and distance calculation
// ============================================================================

interface CalendarMapProps {
    installations: Installation[];
    teams: InstallationTeam[];
    onEditInstallation?: (installation: Installation) => void;
}

// Dynamically import Leaflet to avoid SSR issues
let L: typeof import('leaflet') | null = null;

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Format date to YYYY-MM-DD
const toISODateString = (date: Date): string => date.toISOString().split('T')[0];

export const CalendarMap: React.FC<CalendarMapProps> = ({
    installations,
    teams,
    onEditInstallation
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Filters
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(toISODateString(new Date()));
    const [showRoute, setShowRoute] = useState(true);

    // Get team color by ID
    const getTeamColor = (teamId?: string): string => {
        const team = teams.find(t => t.id === teamId);
        return team?.color || '#6366f1';
    };

    // Filter installations
    const filteredInstallations = useMemo(() => {
        return installations.filter(inst => {
            if (selectedTeamId && inst.teamId !== selectedTeamId) return false;
            if (selectedDate && inst.scheduledDate !== selectedDate) return false;
            return true;
        });
    }, [installations, selectedTeamId, selectedDate]);

    // Get installations with coords for route
    const installationsWithCoords = useMemo(() => {
        return filteredInstallations
            .filter(inst => {
                const lat = inst.client?.lat || inst.installationData?.lat;
                const lng = inst.client?.lng || inst.installationData?.lng;
                return lat && lng;
            })
            .map(inst => ({
                ...inst,
                lat: inst.client?.lat || inst.installationData?.lat || 0,
                lng: inst.client?.lng || inst.installationData?.lng || 0
            }));
    }, [filteredInstallations]);

    // Calculate total route distance
    const routeStats = useMemo(() => {
        if (installationsWithCoords.length < 2) return { distance: 0, count: installationsWithCoords.length };

        let totalDistance = 0;
        for (let i = 0; i < installationsWithCoords.length - 1; i++) {
            const curr = installationsWithCoords[i];
            const next = installationsWithCoords[i + 1];
            totalDistance += calculateDistance(curr.lat, curr.lng, next.lat, next.lng);
        }

        return {
            distance: Math.round(totalDistance),
            count: installationsWithCoords.length
        };
    }, [installationsWithCoords]);

    // Initialize map
    useEffect(() => {
        const initMap = async () => {
            if (!mapContainerRef.current || mapRef.current) return;

            if (!L) {
                L = await import('leaflet');
                await import('leaflet/dist/leaflet.css');
            }

            const map = L.map(mapContainerRef.current).setView([51.5, 10.5], 6);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            routeLayerRef.current = L.layerGroup().addTo(map);

            mapRef.current = map;
            setIsMapReady(true);
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update markers and route when data changes
    useEffect(() => {
        if (!mapRef.current || !isMapReady || !L || !routeLayerRef.current) return;

        const map = mapRef.current;
        const routeLayer = routeLayerRef.current;

        // Clear existing layers
        routeLayer.clearLayers();

        const bounds: [number, number][] = [];

        // Add markers
        installationsWithCoords.forEach((inst, idx) => {
            const teamColor = getTeamColor(inst.teamId);

            const icon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="
                        position: relative;
                        width: 32px;
                        height: 32px;
                    ">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: ${teamColor};
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        "></div>
                        <div style="
                            position: absolute;
                            top: 6px;
                            left: 0;
                            width: 100%;
                            text-align: center;
                            font-size: 12px;
                            font-weight: bold;
                            color: white;
                        ">${idx + 1}</div>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });

            const marker = L.marker([inst.lat, inst.lng], { icon });

            const popupContent = `
                <div style="min-width: 220px;">
                    <div style="font-size: 11px; color: #6366f1; font-weight: bold; margin-bottom: 4px;">
                        #${idx + 1} na trasie
                    </div>
                    <strong>${inst.title || `${inst.client?.firstName} ${inst.client?.lastName}`}</strong>
                    <br/>
                    <span style="color: #666;">📍 ${inst.client?.city || 'Brak miasta'}</span>
                    <br/>
                    <span style="color: #666;">${inst.client?.address || ''}</span>
                    ${inst.expectedDuration && inst.expectedDuration > 1 ? `<br/><span style="color: #6366f1;">⏱️ ${inst.expectedDuration} dni</span>` : ''}
                    <br/>
                    <span style="
                        display: inline-block;
                        margin-top: 4px;
                        padding: 2px 8px;
                        background: ${teamColor}20;
                        color: ${teamColor};
                        border-radius: 4px;
                        font-size: 11px;
                    ">
                        ${teams.find(t => t.id === inst.teamId)?.name || 'Bez ekipy'}
                    </span>
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('click', () => {
                if (onEditInstallation) {
                    setTimeout(() => onEditInstallation(inst), 300);
                }
            });

            routeLayer.addLayer(marker);
            bounds.push([inst.lat, inst.lng]);
        });

        // Draw route line
        if (showRoute && installationsWithCoords.length >= 2) {
            const routeCoords = installationsWithCoords.map(i => [i.lat, i.lng] as [number, number]);

            // Main route line
            const routeLine = L.polyline(routeCoords, {
                color: selectedTeamId ? getTeamColor(selectedTeamId) : '#6366f1',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            });
            routeLayer.addLayer(routeLine);

            // Distance labels between points
            for (let i = 0; i < installationsWithCoords.length - 1; i++) {
                const curr = installationsWithCoords[i];
                const next = installationsWithCoords[i + 1];
                const dist = calculateDistance(curr.lat, curr.lng, next.lat, next.lng);

                const midLat = (curr.lat + next.lat) / 2;
                const midLng = (curr.lng + next.lng) / 2;

                const distIcon = L.divIcon({
                    className: 'distance-label',
                    html: `<div style="
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 4px;
                        padding: 2px 6px;
                        font-size: 10px;
                        font-weight: 600;
                        color: #475569;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        white-space: nowrap;
                    ">${Math.round(dist)} km</div>`,
                    iconSize: [50, 20],
                    iconAnchor: [25, 10]
                });

                const distMarker = L.marker([midLat, midLng], { icon: distIcon, interactive: false });
                routeLayer.addLayer(distMarker);
            }
        }

        // Fit bounds
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [installationsWithCoords, teams, isMapReady, showRoute, selectedTeamId, onEditInstallation]);

    // Team stats
    const teamStats = teams.map(team => ({
        ...team,
        count: filteredInstallations.filter(i => i.teamId === team.id).length
    }));

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Filters & Controls */}
            <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
                {/* Date Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">📅 Data:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Team Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">👷 Ekipa:</label>
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Wszystkie</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>

                {/* Show Route Toggle */}
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showRoute}
                        onChange={(e) => setShowRoute(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Pokaż trasę
                </label>

                {/* Route Stats */}
                {routeStats.count > 0 && (
                    <div className="ml-auto flex items-center gap-4 text-sm">
                        <span className="text-slate-600">
                            📍 <strong>{routeStats.count}</strong> punktów
                        </span>
                        {routeStats.distance > 0 && (
                            <span className="text-indigo-600 font-medium">
                                🛣️ ~{routeStats.distance} km
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-3 bg-slate-50">
                <span className="text-xs font-medium text-slate-500">Ekipy:</span>
                {teamStats.filter(t => t.count > 0).map(team => (
                    <button
                        key={team.id}
                        onClick={() => setSelectedTeamId(selectedTeamId === team.id ? '' : team.id)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${selectedTeamId === team.id
                                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                        />
                        {team.name} ({team.count})
                    </button>
                ))}
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} className="flex-1 min-h-[400px]" />

            {/* Warnings */}
            {filteredInstallations.filter(i => !i.client?.lat && !i.installationData?.lat).length > 0 && (
                <div className="p-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
                    ⚠️ {filteredInstallations.filter(i => !i.client?.lat && !i.installationData?.lat).length} montaży bez współrzędnych GPS
                </div>
            )}
        </div>
    );
};
