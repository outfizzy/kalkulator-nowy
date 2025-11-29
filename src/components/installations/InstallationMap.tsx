import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Installation, InstallationTeam } from '../../types';

// Fix for default marker icon missing in Leaflet + Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface InstallationMapProps {
    installations: Installation[];
    teams: InstallationTeam[];
    selectedIds: string[];
    onSelect: (id: string) => void;
    onEdit: (installation: Installation) => void;
}

// Component to fit map bounds to markers
const MapBounds: React.FC<{ markers: Installation[] }> = ({ markers }) => {
    const map = useMap();

    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(
                markers
                    .filter(m => m.client.coordinates)
                    .map(m => [m.client.coordinates!.lat, m.client.coordinates!.lng])
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [markers, map]);

    return null;
};

// Custom marker icon generator
const createCustomIcon = (color: string, isSelected: boolean) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: ${isSelected ? '24px' : '16px'};
            height: ${isSelected ? '24px' : '16px'};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.2s;
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

export const InstallationMap: React.FC<InstallationMapProps> = ({ installations, teams, selectedIds, onSelect, onEdit }) => {
    // Filter only installations with coordinates
    const validInstallations = installations.filter(i => i.client.coordinates);

    const getTeamColor = (teamId?: string) => {
        if (!teamId) return '#94a3b8'; // Gray for unassigned
        const team = teams.find(t => t.id === teamId);
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

                <MapBounds markers={validInstallations} />

                {validInstallations.map(inst => (
                    <Marker
                        key={inst.id}
                        position={[inst.client.coordinates!.lat, inst.client.coordinates!.lng]}
                        icon={createCustomIcon(getTeamColor(inst.teamId), selectedIds.includes(inst.id))}
                        eventHandlers={{
                            click: () => onSelect(inst.id)
                        }}
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
