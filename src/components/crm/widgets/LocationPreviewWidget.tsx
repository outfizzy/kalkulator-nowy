import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix icons
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPreviewWidgetProps {
    address: string;
    city: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
}

export const LocationPreviewWidget: React.FC<LocationPreviewWidgetProps> = ({
    address,
    city,
    postalCode,
    coordinates
}) => {
    // If we don't have coordinates, we can try to "guess" or just show a placeholder
    // For now, let's assume we might default to Gubin if no coords, or hide map
    const hasCoordinates = coordinates && coordinates.lat && coordinates.lng;
    const center = hasCoordinates ? [coordinates.lat, coordinates.lng] : [51.9516, 14.7118]; // Default Gubin

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Lokalizacja
                </h3>
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${postalCode} ${city}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                >
                    Otwórz w Google Maps ↗
                </a>
            </div>

            <div className="h-48 bg-slate-100 relative">
                {hasCoordinates ? (
                    <MapContainer
                        center={center as L.LatLngExpression}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={center as L.LatLngExpression}>
                            <Popup>{address}, {city}</Popup>
                        </Marker>
                    </MapContainer>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm">Brak koordynatów GPS</span>
                        <span className="text-xs mt-1">{address}, {city}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
