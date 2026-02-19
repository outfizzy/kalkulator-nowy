import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Installation, InstallationTeam } from '../../../types';

interface CalendarMapViewProps {
    installations: Installation[];
    teams: InstallationTeam[];
    onEditInstallation?: (installation: Installation) => void;
}

// Simple geocoding cache
const geocodeCache = new Map<string, { lat: number; lng: number }>();

// Default center: Poland
const DEFAULT_CENTER = { lat: 51.9194, lng: 19.1451 };

export const CalendarMapView: React.FC<CalendarMapViewProps> = ({
    installations,
    teams,
    onEditInstallation
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState<string>('all');

    // Load Google Maps script
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).google?.maps) {
            setScriptLoaded(true);
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => setScriptLoaded(true));
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${(import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=marker`;
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => console.error('Google Maps script failed to load');
        document.head.appendChild(script);
    }, []);

    // Get unique dates for filter
    const uniqueDates = useMemo(() => {
        const dates = new Set<string>();
        installations.forEach(inst => {
            const d = inst.scheduledDate?.split('T')[0];
            if (d) dates.add(d);
        });
        return Array.from(dates).sort();
    }, [installations]);

    // Filter installations
    const filteredInstallations = useMemo(() => {
        return installations.filter(inst => {
            if (selectedTeam !== 'all' && inst.teamId !== selectedTeam) return false;
            if (selectedDate !== 'all' && inst.scheduledDate?.split('T')[0] !== selectedDate) return false;
            return true;
        });
    }, [installations, selectedTeam, selectedDate]);

    // Get team info
    const getTeamInfo = (teamId?: string) => {
        if (!teamId) return { name: 'Bez ekipy', color: '#94a3b8' };
        const team = teams.find(t => t.id === teamId);
        return { name: team?.name || 'Nieznany', color: team?.color || '#6366f1' };
    };

    // Get client address for geocoding
    const getClientAddress = (inst: Installation): string | null => {
        const c = inst.client;
        if (!c) return null;
        const parts: string[] = [];
        if ((c as any).address) parts.push((c as any).address);
        if ((c as any).street) parts.push((c as any).street);
        if (c.city) parts.push(c.city);
        if ((c as any).postalCode) parts.push((c as any).postalCode);
        return parts.length > 0 ? parts.join(', ') + ', Polska' : null;
    };

    // Initialize map
    useEffect(() => {
        if (!scriptLoaded || !mapRef.current || mapInstanceRef.current) return;

        try {
            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                center: DEFAULT_CENTER,
                zoom: 7,
                mapId: 'calendar-map-v3',
                gestureHandling: 'greedy',
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true
            });
        } catch (err) {
            console.error('Map init error:', err);
        }
    }, [scriptLoaded]);

    // Update markers
    const updateMarkers = useCallback(async () => {
        const map = mapInstanceRef.current;
        if (!map || !scriptLoaded) return;

        // Clear existing markers
        markersRef.current.forEach(m => { m.map = null; });
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasValidBounds = false;

        for (const inst of filteredInstallations) {
            const address = getClientAddress(inst);
            if (!address) continue;

            let position: { lat: number; lng: number } | null = null;

            // Check cache
            if (geocodeCache.has(address)) {
                position = geocodeCache.get(address)!;
            } else {
                // Geocode
                try {
                    const geocoder = new google.maps.Geocoder();
                    const result = await geocoder.geocode({ address });

                    if (result.results?.[0]?.geometry?.location) {
                        position = {
                            lat: result.results[0].geometry.location.lat(),
                            lng: result.results[0].geometry.location.lng()
                        };
                        geocodeCache.set(address, position);
                    }
                } catch (err) {
                    console.warn('Geocode failed for:', address, err);
                }
            }

            if (!position) continue;

            // Create marker
            const teamInfo = getTeamInfo(inst.teamId);
            const clientName = inst.client
                ? `${inst.client.firstName || ''} ${inst.client.lastName || ''}`.trim()
                : inst.title || 'Montaż';

            // Create pin element
            const pinEl = document.createElement('div');
            pinEl.style.cssText = `
                width: 32px; height: 32px; border-radius: 50%; 
                background: ${teamInfo.color}; border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
                font-size: 14px; cursor: pointer;
            `;
            pinEl.textContent = '🏠';

            const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: new google.maps.LatLng(position.lat, position.lng),
                content: pinEl,
                title: `${clientName} — ${teamInfo.name}`
            });

            // Info window
            const infoContent = `
                <div style="min-width: 200px; font-family: system-ui, sans-serif;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${clientName}</h3>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                        📍 ${address}
                    </p>
                    <p style="margin: 0 0 4px 0; font-size: 12px;">
                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${teamInfo.color}; margin-right: 4px;"></span>
                        ${teamInfo.name}
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #999;">
                        📅 ${inst.scheduledDate ? new Date(inst.scheduledDate).toLocaleDateString('pl-PL') : 'Brak daty'}
                        ${inst.expectedDuration ? ` — ${inst.expectedDuration} dni` : ''}
                    </p>
                    ${inst.contractNumber ? `<p style="margin: 4px 0 0; font-size: 11px; color: #999;">📄 ${inst.contractNumber}</p>` : ''}
                </div>
            `;

            const infoWindow = new google.maps.InfoWindow({ content: infoContent });

            marker.addListener('click', () => {
                infoWindow.open({ anchor: marker, map });
            });

            markersRef.current.push(marker);
            bounds.extend(new google.maps.LatLng(position.lat, position.lng));
            hasValidBounds = true;
        }

        if (hasValidBounds) {
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }
    }, [filteredInstallations, scriptLoaded]);

    useEffect(() => {
        updateMarkers();
    }, [updateMarkers]);

    return (
        <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
                {/* Team selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 font-medium">Ekipa:</span>
                    <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                        <option value="all">Wszystkie ({filteredInstallations.length})</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Date selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 font-medium">Data:</span>
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                        <option value="all">Wszystkie daty</option>
                        {uniqueDates.map(d => (
                            <option key={d} value={d}>{new Date(d).toLocaleDateString('pl-PL')}</option>
                        ))}
                    </select>
                </div>

                <div className="ml-auto text-sm text-slate-400">
                    📍 {filteredInstallations.length} montaży na mapie
                </div>
            </div>

            {/* Map container */}
            <div className="flex-1 relative">
                {!scriptLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                            <p className="text-sm text-slate-500">Ładowanie mapy...</p>
                        </div>
                    </div>
                )}
                <div ref={mapRef} className="w-full h-full" />
            </div>

            {/* Legend: Team colors */}
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4 flex-wrap text-xs text-slate-500">
                {teams.map(t => (
                    <div key={t.id} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || '#6366f1' }} />
                        <span>{t.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
