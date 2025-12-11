import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Installation, InstallationTeam } from '../../types';

// Fix for default marker icon missing in Leaflet + Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface InstallationMapProps {
    installations: Installation[];
    allInstallations?: Installation[]; // Used for route context even if map is filtered
    teams: InstallationTeam[];
    selectedIds: string[];
    onSelect: (id: string) => void;
    onEdit: (installation: Installation) => void;
    previewRoute?: {
        date: string;
        teamId: string;
    };
}

// Component to fit map bounds to markers
const MapBounds: React.FC<{ markers: Installation[], routePoints?: Installation[] }> = ({ markers, routePoints }) => {
    const map = useMap();

    useEffect(() => {
        const allPoints = [...markers, ...(routePoints || [])];
        if (allPoints.length > 0) {
            const validPoints = allPoints.filter(m => m.client.coordinates);
            if (validPoints.length > 0) {
                const bounds = L.latLngBounds(
                    validPoints.map(m => [m.client.coordinates!.lat, m.client.coordinates!.lng])
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [markers, routePoints, map]);

    return null;
};

// Custom marker icon generator
const createCustomIcon = (color: string, isSelected: boolean) => {
    const size = isSelected ? 30 : 16;
    const border = isSelected ? '3px solid white' : '2px solid white';

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: ${border};
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.2s;
            ${isSelected ? 'animation: pulse 1s infinite;' : ''}
        "></div>
        <style>
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0px ${color}80; transform: scale(1); }
                100% { box-shadow: 0 0 0 10px ${color}00; transform: scale(1.1); }
            }
        </style>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
};

const HQ_COORDS = { lat: 51.9516, lng: 14.7118 }; // Gubin

const hqIcon = L.divIcon({
    className: 'hq-marker',
    html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🏢</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

export const InstallationMap: React.FC<InstallationMapProps> = ({ installations, allInstallations, teams, selectedIds, onSelect, onEdit, previewRoute }) => {
    // Filter only installations with coordinates
    const validInstallations = installations.filter(i => i.client.coordinates);

    // Calculate route preview points
    const routeInstallations = useMemo(() => {
        if (!previewRoute) return [];

        // Use allInstallations if provided, otherwise fallback to visible ones
        const sourceData = allInstallations || installations;

        const validSource = sourceData.filter(i => i.client.coordinates);

        return validSource.filter(inst =>
            inst.teamId === previewRoute.teamId &&
            inst.scheduledDate === previewRoute.date &&
            inst.status === 'scheduled'
        );
    }, [allInstallations, installations, previewRoute]);

    const getTeamColor = (inst: Installation) => {
        // Highlighting for selection or route
        if (selectedIds.includes(inst.id)) return '#8b5cf6'; // Violet for selection

        // Status overrides
        if (inst.status === 'verification') return '#f97316'; // orange-500
        if (inst.status === 'completed') return '#3b82f6'; // blue-500

        // Red = Ready but unscheduled
        if (inst.partsReady && !inst.scheduledDate) return '#ef4444'; // red-500

        // Gray = Not ready and unscheduled
        if (!inst.partsReady && !inst.scheduledDate) return '#cbd5e1'; // slate-300

        // Scheduled color
        if (!inst.teamId) return '#22c55e';
        const team = teams.find(t => t.id === inst.teamId);
        return team ? team.color : '#94a3b8';
    };

    return (
        <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
            <MapContainer
                center={[52.0, 19.0]} // Center of Poland
                zoom={6}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBounds markers={validInstallations} routePoints={routeInstallations} />

                {/* HQ Marker */}
                <Marker position={[HQ_COORDS.lat, HQ_COORDS.lng]} icon={hqIcon} zIndexOffset={2000}>
                    <Popup>
                        <div className="p-2 text-center">
                            <h3 className="font-bold text-sm">Baza Firmy</h3>
                            <p className="text-xs text-slate-500">Gubin 66-620</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Draw Route Line */}
                {previewRoute && routeInstallations.length > 1 && (
                    <Polyline
                        positions={routeInstallations.map(i => [i.client.coordinates!.lat, i.client.coordinates!.lng])}
                        color={teams.find(t => t.id === previewRoute.teamId)?.color || 'blue'}
                        dashArray="10, 10"
                        weight={4}
                        opacity={0.6}
                    />
                )}

                {/* Draw Route Line connecting Selected items too? 
                    Maybe confusing. Let's just show route of EXISTING jobs.
                */}

                {validInstallations.map(inst => (
                    <Marker
                        key={inst.id}
                        position={[inst.client.coordinates!.lat, inst.client.coordinates!.lng]}
                        icon={createCustomIcon(getTeamColor(inst), selectedIds.includes(inst.id))}
                        eventHandlers={{
                            click: () => onSelect(inst.id)
                        }}
                        zIndexOffset={selectedIds.includes(inst.id) ? 1000 : 0}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold text-sm">{inst.client.firstName} {inst.client.lastName}</h3>
                                <p className="text-xs text-slate-500">{inst.client.city}</p>
                                <p className="text-xs mt-1 font-medium">{inst.productSummary}</p>
                                <div className="mt-2 text-xs flex justify-between items-center">
                                    <div>
                                        Status: <span className="font-bold">{inst.status}</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(inst);
                                        }}
                                        className="text-accent hover:text-accent-dark font-bold underline ml-2"
                                    >
                                        Edytuj
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};
