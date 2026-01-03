import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Measurement } from '../../types';

// Fix Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const plannedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const completedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface RouteMapProps {
    measurements: Measurement[];
    height?: string;
    showRoute?: boolean;
}

// Component to update map center when measurements change
const MapUpdater: React.FC<{ measurements: Measurement[] }> = ({ measurements }) => {
    const map = useMap();

    useEffect(() => {
        if (measurements.length > 0) {
            const points = measurements
                .filter(m => m.locationLat && m.locationLng)
                .map(m => [m.locationLat!, m.locationLng!] as [number, number]);

            if (points.length > 0) {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [measurements, map]);

    return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({
    measurements,
    height = '500px',
    showRoute = true
}) => {
    const validMeasurements = measurements.filter(m => m.locationLat && m.locationLng);

    const routePoints = validMeasurements.map(m => [m.locationLat!, m.locationLng!] as [number, number]);

    // Default center (Poland) if no points
    const defaultCenter: [number, number] = [52.0693, 19.4803];

    if (validMeasurements.length === 0) {
        return (
            <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
                Brak punktów na mapie (brak współrzędnych)
            </div>
        );
    }

    return (
        <MapContainer
            center={defaultCenter}
            zoom={6}
            style={{ height: height, width: '100%', zIndex: 0 }}
            className="rounded-xl overflow-hidden border border-slate-200"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater measurements={validMeasurements} />

            {validMeasurements.map((m, index) => (
                <Marker
                    key={m.id}
                    position={[m.locationLat!, m.locationLng!]}
                    icon={m.status === 'completed' ? completedIcon : plannedIcon}
                >
                    <Popup>
                        <div className="text-sm">
                            <strong className="block mb-1">#{index + 1} {m.customerName}</strong>
                            <p className="mb-1">{m.customerAddress}</p>
                            <p className="text-gray-500">
                                {new Date(m.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {showRoute && routePoints.length > 1 && (
                <Polyline
                    positions={routePoints}
                    pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7, dashArray: '10, 10' }}
                />
            )}
        </MapContainer>
    );
};
