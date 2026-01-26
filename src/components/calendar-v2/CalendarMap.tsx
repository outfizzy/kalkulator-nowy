import React, { useEffect, useRef, useState } from 'react';
import type { Installation, InstallationTeam } from '../../types';

// ============================================================================
// CALENDAR MAP - Map View with Installation Pins
// Uses Leaflet for map rendering
// ============================================================================

interface CalendarMapProps {
    installations: Installation[];
    teams: InstallationTeam[];
    onEditInstallation?: (installation: Installation) => void;
}

// Dynamically import Leaflet to avoid SSR issues
let L: typeof import('leaflet') | null = null;

export const CalendarMap: React.FC<CalendarMapProps> = ({
    installations,
    teams,
    onEditInstallation
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Get team color by ID
    const getTeamColor = (teamId?: string): string => {
        const team = teams.find(t => t.id === teamId);
        return team?.color || '#6366f1';
    };

    // Initialize map
    useEffect(() => {
        const initMap = async () => {
            if (!mapContainerRef.current || mapRef.current) return;

            // Dynamic import of Leaflet
            if (!L) {
                L = await import('leaflet');
                await import('leaflet/dist/leaflet.css');
            }

            // Create map centered on Germany
            const map = L.map(mapContainerRef.current).setView([51.5, 10.5], 6);

            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

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

    // Add markers when map is ready or installations change
    useEffect(() => {
        if (!mapRef.current || !isMapReady || !L) return;

        const map = mapRef.current;

        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Add markers for installations with coordinates
        const bounds: L.LatLngBoundsExpression = [];

        installations.forEach((inst) => {
            const lat = inst.client?.lat || inst.installationData?.lat;
            const lng = inst.client?.lng || inst.installationData?.lng;

            if (lat && lng) {
                const teamColor = getTeamColor(inst.teamId);

                // Create custom icon
                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: `
                        <div style="
                            width: 30px;
                            height: 30px;
                            background: ${teamColor};
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 2px solid white;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                        ">
                            <div style="
                                transform: rotate(45deg);
                                width: 100%;
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 12px;
                            ">📍</div>
                        </div>
                    `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                });

                const marker = L.marker([lat, lng], { icon }).addTo(map);

                // Popup content
                const popupContent = `
                    <div style="min-width: 200px;">
                        <strong>${inst.title || `${inst.client?.firstName} ${inst.client?.lastName}`}</strong>
                        <br/>
                        <span style="color: #666;">📍 ${inst.client?.city || 'Brak miasta'}</span>
                        <br/>
                        <span style="color: #666;">${inst.client?.address || ''}</span>
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
                        // Delay to allow popup to show first
                        setTimeout(() => onEditInstallation(inst), 300);
                    }
                });

                bounds.push([lat, lng]);
            }
        });

        // Fit bounds if we have markers
        if (bounds.length > 0) {
            map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
        }
    }, [installations, teams, isMapReady, onEditInstallation]);

    // Count installations by team
    const teamStats = teams.map(team => ({
        ...team,
        count: installations.filter(i => i.teamId === team.id).length
    }));

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Legend */}
            <div className="p-3 border-b border-slate-200 flex flex-wrap gap-3">
                <span className="text-sm font-medium text-slate-600">Ekipy:</span>
                {teamStats.map(team => (
                    <div key={team.id} className="flex items-center gap-1.5 text-sm">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                        />
                        <span className="text-slate-700">{team.name}</span>
                        <span className="text-slate-400">({team.count})</span>
                    </div>
                ))}
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} className="flex-1 min-h-[400px]" />

            {/* No coordinates warning */}
            {installations.filter(i => !i.client?.lat && !i.installationData?.lat).length > 0 && (
                <div className="p-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
                    ⚠️ {installations.filter(i => !i.client?.lat && !i.installationData?.lat).length} montaży bez współrzędnych GPS
                </div>
            )}
        </div>
    );
};
