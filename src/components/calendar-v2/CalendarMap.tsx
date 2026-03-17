import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { Installation, InstallationTeam, ServiceTicket, Contract } from '../../types';
import { batchGeocodeForMap, haversineDistance, loadGoogleMapsAPI, type MapGeoResult } from '../../services/map-geocoding.service';

// ============================================================================
// CALENDAR MAP V4 - Google Maps API (Standard Markers)
// Multi-layer markers, clustering, route planner, search, nearest-service
// ============================================================================

interface CalendarMapProps {
    installations: Installation[];
    teams: InstallationTeam[];
    serviceTickets?: ServiceTicket[];
    contracts?: Contract[];
    followUps?: Installation[];
    currentDate?: Date;
    onEditInstallation?: (installation: Installation) => void;
}

type MapPointType = 'installation' | 'service' | 'unplanned' | 'followup';

interface MapPoint {
    id: string;
    type: MapPointType;
    lat: number;
    lng: number;
    geoSource: MapGeoResult['source'];
    label: string;
    sublabel: string;
    city?: string;
    address?: string;
    teamId?: string;
    teamName?: string;
    teamColor?: string;
    status?: string;
    scheduledDate?: string;
    priority?: string;
    serviceType?: string;
    contractNumber?: string;
    originalData: any;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

const STATUS_LABELS: Record<string, string> = {
    pending: '⏳ Oczekuje', scheduled: '📅 Zaplanowany', in_progress: '🔨 W trakcie',
    verification: '✔️ Weryfikacja', completed: '✅ Zakończony', cancelled: '❌ Anulowany',
    new: '🆕 Nowy', open: '📋 Otwarty', resolved: '✅ Rozwiązany', closed: '🔒 Zamknięty',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
    leak: '💧 Przeciek', electrical: '⚡ Elektryka', visual: '👁️ Wizualne',
    mechanical: '⚙️ Mechaniczne', other: '🔧 Inne',
};

const PRIORITY_COLORS: Record<string, string> = {
    low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
};

const TYPE_ICONS: Record<MapPointType, string> = {
    installation: '🏗️', service: '🔧', unplanned: '📋', followup: '🔄',
};

const TYPE_LABELS: Record<MapPointType, string> = {
    installation: 'Montaż', service: 'Serwis', unplanned: 'Niezaplan.', followup: 'Dokończenie',
};

const toISODate = (d: Date) => d.toISOString().split('T')[0];

const isInDateRange = (date: string | undefined, filter: DateFilter, refDate: Date): boolean => {
    if (filter === 'all') return true;
    if (!date) return filter === 'all';
    const d = new Date(date);
    const today = new Date(refDate);
    today.setHours(0, 0, 0, 0);
    if (filter === 'today') return date === toISODate(today);
    if (filter === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return d >= weekStart && d <= weekEnd;
    }
    if (filter === 'month') {
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }
    return true;
};

// SVG marker icon generator
const createSvgIcon = (color: string, shape: 'pin' | 'square' | 'circle', label?: string): string => {
    const encoded = encodeURIComponent(
        shape === 'pin'
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/>${label ? `<text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">${label}</text>` : ''}</svg>`
            : shape === 'square'
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="4" fill="${color}" stroke="white" stroke-width="2"/><text x="14" y="18" text-anchor="middle" fill="white" font-size="14" font-family="Arial">🔧</text></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2"/><text x="14" y="19" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Arial">${label || '!'}</text></svg>`
    );
    return `data:image/svg+xml,${encoded}`;
};

export const CalendarMap: React.FC<CalendarMapProps> = ({
    installations, teams, serviceTickets = [], contracts = [], followUps = [],
    currentDate, onEditInstallation
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const overlaysRef = useRef<google.maps.Polyline[]>([]);
    const labelMarkersRef = useRef<google.maps.Marker[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapLoadError, setMapLoadError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Layers
    const [showInstallations, setShowInstallations] = useState(true);
    const [showServices, setShowServices] = useState(true);
    const [showUnplanned, setShowUnplanned] = useState(true);
    const [showFollowUps, setShowFollowUps] = useState(true);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [showRoute, setShowRoute] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Geocoding
    const [geoCoords, setGeoCoords] = useState<Map<string, MapGeoResult>>(new Map());
    const [geoProgress, setGeoProgress] = useState<{ done: number; total: number } | null>(null);

    // Route planner
    const [routePlannerActive, setRoutePlannerActive] = useState(false);
    const [routePoints, setRoutePoints] = useState<MapPoint[]>([]);

    // Nearest service
    const [nearestServiceFor, setNearestServiceFor] = useState<MapPoint | null>(null);

    const getTeam = (teamId?: string) => teams.find(t => t.id === teamId);
    const refDate = currentDate || new Date();

    // Fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Build geocodable items
    const allGeoItems = useMemo(() => {
        const items: Array<{ id: string; address?: string; city?: string; postalCode?: string; lat?: number; lng?: number }> = [];
        installations.forEach(inst => {
            items.push({ id: `inst-${inst.id}`, address: inst.client?.address, city: inst.client?.city, postalCode: inst.client?.postalCode,
                lat: inst.client?.coordinates?.lat || (inst as any).client?.lat, lng: inst.client?.coordinates?.lng || (inst as any).client?.lng });
        });
        followUps.forEach(fu => {
            items.push({ id: `fu-${fu.id}`, address: fu.client?.address, city: fu.client?.city, postalCode: fu.client?.postalCode,
                lat: fu.client?.coordinates?.lat || (fu as any).client?.lat, lng: fu.client?.coordinates?.lng || (fu as any).client?.lng });
        });
        serviceTickets.forEach(st => {
            items.push({ id: `svc-${st.id}`, address: st.client?.address || (st.client as any)?.street, city: st.client?.city,
                postalCode: st.client?.postalCode || (st.client as any)?.zip, lat: st.client?.coordinates?.lat, lng: st.client?.coordinates?.lng });
        });
        const instOfferIds = new Set(installations.map(i => i.offerId).filter(Boolean));
        const instSourceIds = new Set(installations.map(i => i.sourceId).filter(Boolean));
        contracts.forEach(c => {
            if (instOfferIds.has(c.offerId) || instSourceIds.has(c.id)) return;
            const client = (c as any).contractData?.client || (c as any).client;
            if (!client) return;
            items.push({ id: `contract-${c.id}`, address: client.street ? `${client.street} ${client.houseNumber || ''}`.trim() : client.address,
                city: client.city, postalCode: client.postalCode || client.zip, lat: client.coordinates?.lat, lng: client.coordinates?.lng });
        });
        return items;
    }, [installations, serviceTickets, contracts, followUps]);

    // Auto-geocode
    useEffect(() => {
        if (allGeoItems.length === 0) return;
        let cancelled = false;
        setGeoProgress({ done: 0, total: allGeoItems.length });
        batchGeocodeForMap(allGeoItems, (done, total) => { if (!cancelled) setGeoProgress({ done, total }); })
            .then(results => { if (!cancelled) { setGeoCoords(results); setGeoProgress(null); } });
        return () => { cancelled = true; };
    }, [allGeoItems]);

    // Build all points
    const allMapPoints = useMemo<MapPoint[]>(() => {
        const points: MapPoint[] = [];

        if (showInstallations) {
            installations.filter(inst => inst.scheduledDate)
                .filter(inst => !selectedTeamId || inst.teamId === selectedTeamId)
                .filter(inst => isInDateRange(inst.scheduledDate, dateFilter, refDate))
                .forEach(inst => {
                    const geo = geoCoords.get(`inst-${inst.id}`);
                    if (!geo) return;
                    const team = getTeam(inst.teamId);
                    points.push({ id: inst.id, type: 'installation', lat: geo.lat, lng: geo.lng, geoSource: geo.source,
                        label: inst.title || `${inst.client?.firstName} ${inst.client?.lastName}`.trim(),
                        sublabel: inst.productSummary || '', city: inst.client?.city, address: inst.client?.address,
                        teamId: inst.teamId, teamName: team?.name, teamColor: team?.color || '#6366f1',
                        status: inst.status, scheduledDate: inst.scheduledDate, contractNumber: inst.contractNumber, originalData: inst });
                });
        }

        if (showFollowUps) {
            followUps.filter(fu => isInDateRange(fu.scheduledDate, dateFilter, refDate)).forEach(fu => {
                const geo = geoCoords.get(`fu-${fu.id}`);
                if (!geo) return;
                const team = getTeam(fu.teamId);
                points.push({ id: fu.id, type: 'followup', lat: geo.lat, lng: geo.lng, geoSource: geo.source,
                    label: fu.title || `${fu.client?.firstName} ${fu.client?.lastName}`.trim(),
                    sublabel: fu.productSummary || 'Dokończenie', city: fu.client?.city, address: fu.client?.address,
                    teamId: fu.teamId, teamName: team?.name, teamColor: team?.color,
                    status: fu.status, scheduledDate: fu.scheduledDate, contractNumber: fu.contractNumber, originalData: fu });
            });
        }

        if (showUnplanned) {
            installations.filter(inst => !inst.scheduledDate).forEach(inst => {
                const geo = geoCoords.get(`inst-${inst.id}`);
                if (!geo) return;
                points.push({ id: inst.id, type: 'unplanned', lat: geo.lat, lng: geo.lng, geoSource: geo.source,
                    label: inst.title || `${inst.client?.firstName} ${inst.client?.lastName}`.trim(),
                    sublabel: inst.productSummary || 'Niezaplanowany', city: inst.client?.city, address: inst.client?.address,
                    status: inst.status, contractNumber: inst.contractNumber, originalData: inst });
            });
            const instOfferIds = new Set(installations.map(i => i.offerId).filter(Boolean));
            const instSourceIds = new Set(installations.map(i => i.sourceId).filter(Boolean));
            contracts.forEach(c => {
                if (instOfferIds.has(c.offerId) || instSourceIds.has(c.id)) return;
                const geo = geoCoords.get(`contract-${c.id}`);
                if (!geo) return;
                const client = (c as any).contractData?.client || (c as any).client;
                if (!client) return;
                points.push({ id: c.id, type: 'unplanned', lat: geo.lat, lng: geo.lng, geoSource: geo.source,
                    label: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Umowa',
                    sublabel: c.contractNumber || 'Umowa bez montażu', city: client.city,
                    address: client.street || client.address, contractNumber: c.contractNumber, originalData: c });
            });
        }

        if (showServices) {
            serviceTickets.filter(st => !['closed', 'resolved', 'rejected'].includes(st.status))
                .filter(st => isInDateRange(st.scheduledDate, dateFilter, refDate) || !st.scheduledDate)
                .forEach(st => {
                    const geo = geoCoords.get(`svc-${st.id}`);
                    if (!geo) return;
                    const team = getTeam(st.assignedTeamId);
                    points.push({ id: st.id, type: 'service', lat: geo.lat, lng: geo.lng, geoSource: geo.source,
                        label: st.customerName || st.ticketNumber, sublabel: st.description?.slice(0, 60) || '',
                        city: st.client?.city, address: st.client?.address || (st.client as any)?.street,
                        teamId: st.assignedTeamId, teamName: team?.name, teamColor: team?.color,
                        status: st.status, scheduledDate: st.scheduledDate, priority: st.priority,
                        serviceType: st.type, contractNumber: st.contractNumber, originalData: st });
                });
        }

        return points;
    }, [installations, serviceTickets, contracts, followUps, geoCoords, showInstallations, showServices, showUnplanned, showFollowUps, selectedTeamId, dateFilter, refDate]);

    // Search filter
    const mapPoints = useMemo(() => {
        if (!searchQuery.trim()) return allMapPoints;
        const q = searchQuery.toLowerCase().trim();
        return allMapPoints.filter(p =>
            p.label.toLowerCase().includes(q) ||
            p.city?.toLowerCase().includes(q) ||
            p.address?.toLowerCase().includes(q) ||
            p.contractNumber?.toLowerCase().includes(q) ||
            p.teamName?.toLowerCase().includes(q)
        );
    }, [allMapPoints, searchQuery]);

    const stats = useMemo(() => ({
        installations: mapPoints.filter(p => p.type === 'installation').length,
        services: mapPoints.filter(p => p.type === 'service').length,
        unplanned: mapPoints.filter(p => p.type === 'unplanned').length,
        followups: mapPoints.filter(p => p.type === 'followup').length,
        total: mapPoints.length,
    }), [mapPoints]);

    // Nearest services
    const nearestServices = useMemo(() => {
        if (!nearestServiceFor) return [];
        return allMapPoints.filter(p => p.type === 'service')
            .map(sp => ({ ...sp, distance: haversineDistance(nearestServiceFor.lat, nearestServiceFor.lng, sp.lat, sp.lng) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
    }, [nearestServiceFor, allMapPoints]);

    // Route calc
    const routeCalc = useMemo(() => {
        if (routePoints.length < 2) return null;
        let totalKm = 0;
        const legs: { from: string; to: string; km: number; min: number }[] = [];
        for (let i = 0; i < routePoints.length - 1; i++) {
            const km = haversineDistance(routePoints[i].lat, routePoints[i].lng, routePoints[i + 1].lat, routePoints[i + 1].lng);
            totalKm += km;
            legs.push({ from: routePoints[i].label, to: routePoints[i + 1].label, km: Math.round(km), min: Math.round(km / 60 * 60) });
        }
        return { totalKm: Math.round(totalKm), totalMin: Math.round(totalKm / 60 * 60), legs };
    }, [routePoints]);

    // Init Google Maps
    useEffect(() => {
        const init = async () => {
            if (!mapContainerRef.current || mapRef.current) return;
            try {
                await loadGoogleMapsAPI();
                const map = new google.maps.Map(mapContainerRef.current, {
                    center: { lat: 51.2, lng: 10.4 },
                    zoom: 6,
                    mapTypeControl: true,
                    mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
                    fullscreenControl: false,
                    streetViewControl: false,
                    zoomControl: true,
                });
                infoWindowRef.current = new google.maps.InfoWindow();
                mapRef.current = map;
                setIsMapReady(true);
            } catch (err) {
                setMapLoadError('Nie udało się załadować Google Maps API');
                console.error('[CalendarMap] Google Maps load error:', err);
            }
        };
        init();
        return () => { mapRef.current = null; };
    }, []);

    // Register popup action handlers
    useEffect(() => {
        (window as any).__mapRouteAdd = (pointId: string) => {
            const pt = mapPoints.find(p => p.id === pointId);
            if (!pt) return;
            setRoutePlannerActive(true);
            setRoutePoints(prev => prev.some(p => p.id === pt.id) ? prev : [...prev, pt]);
        };
        (window as any).__mapNearestSvc = (pointId: string) => {
            const pt = mapPoints.find(p => p.id === pointId);
            if (pt) setNearestServiceFor(pt);
        };
        return () => { delete (window as any).__mapRouteAdd; delete (window as any).__mapNearestSvc; };
    }, [mapPoints]);

    // Build popup HTML
    const buildPopup = useCallback((point: MapPoint): string => {
        const statusLabel = STATUS_LABELS[point.status || ''] || point.status || '';
        const approx = (point.geoSource === 'plz' || point.geoSource === 'city')
            ? '<div style="font-size:9px;color:#f59e0b;margin-bottom:4px;">⚠️ Przybliżona lokalizacja (PLZ/Miasto)</div>' : '';
        const typeLabel = `${TYPE_ICONS[point.type]} ${TYPE_LABELS[point.type]}`;
        const teamBadge = point.teamName
            ? `<span style="display:inline-block;margin-top:4px;padding:2px 8px;background:${point.teamColor}20;color:${point.teamColor};border-radius:4px;font-size:11px;font-weight:600;">${point.teamName}</span>` : '';

        return `<div style="min-width:200px;max-width:280px;font-family:system-ui,sans-serif;">
            ${approx}
            <div style="font-size:10px;color:#94a3b8;font-weight:600;margin-bottom:2px;">${typeLabel}</div>
            <strong style="font-size:13px;">${point.label}</strong>
            <div style="font-size:11px;color:#666;margin-top:2px;">${point.sublabel}</div>
            ${point.contractNumber ? `<div style="font-size:11px;color:#6366f1;margin-top:2px;">📄 ${point.contractNumber}</div>` : ''}
            <div style="font-size:11px;color:#475569;margin-top:4px;">📍 ${point.city || ''} ${point.address || ''}</div>
            ${point.scheduledDate ? `<div style="font-size:11px;color:#6366f1;margin-top:2px;">📅 ${point.scheduledDate}</div>` : ''}
            ${statusLabel ? `<div style="font-size:11px;margin-top:2px;">${statusLabel}</div>` : ''}
            ${point.priority ? `<div style="font-size:11px;margin-top:2px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PRIORITY_COLORS[point.priority] || '#eab308'};margin-right:4px;"></span>${point.priority.toUpperCase()}</div>` : ''}
            ${point.serviceType ? `<div style="font-size:11px;color:#666;margin-top:2px;">${SERVICE_TYPE_LABELS[point.serviceType] || point.serviceType}</div>` : ''}
            ${teamBadge}
            <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
                <button onclick="window.__mapRouteAdd&&window.__mapRouteAdd('${point.id}')" style="padding:3px 8px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600;">📏 Dodaj do trasy</button>
                <button onclick="window.__mapNearestSvc&&window.__mapNearestSvc('${point.id}')" style="padding:3px 8px;background:#f97316;color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600;">🔧 Najbliższe</button>
            </div>
        </div>`;
    }, []);

    // Clear all map objects
    const clearMapObjects = useCallback(() => {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        overlaysRef.current.forEach(p => p.setMap(null));
        overlaysRef.current = [];
        labelMarkersRef.current.forEach(m => m.setMap(null));
        labelMarkersRef.current = [];
    }, []);

    // Render markers
    useEffect(() => {
        if (!mapRef.current || !isMapReady) return;
        const map = mapRef.current;
        clearMapObjects();

        const bounds = new google.maps.LatLngBounds();
        const instPoints = mapPoints.filter(p => p.type === 'installation');

        mapPoints.forEach((point) => {
            const instIdx = point.type === 'installation' ? instPoints.indexOf(point) : undefined;

            let icon: google.maps.Icon;
            if (point.type === 'installation') {
                icon = { url: createSvgIcon(point.teamColor || '#6366f1', 'pin', instIdx !== undefined ? String(instIdx + 1) : ''), scaledSize: new google.maps.Size(32, 42), anchor: new google.maps.Point(16, 42) };
            } else if (point.type === 'followup') {
                icon = { url: createSvgIcon('#8b5cf6', 'pin', '↻'), scaledSize: new google.maps.Size(32, 42), anchor: new google.maps.Point(16, 42) };
            } else if (point.type === 'service') {
                const pColor = PRIORITY_COLORS[point.priority || 'medium'] || '#f97316';
                icon = { url: createSvgIcon(pColor, 'square'), scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 14) };
            } else {
                icon = { url: createSvgIcon('#eab308', 'circle', '!'), scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 14) };
            }

            const opacity = (point.geoSource === 'plz' || point.geoSource === 'city') ? 0.7 : 1.0;

            const marker = new google.maps.Marker({
                position: { lat: point.lat, lng: point.lng },
                map,
                icon,
                opacity,
                title: point.label,
            });

            marker.addListener('click', () => {
                if (infoWindowRef.current) {
                    infoWindowRef.current.setContent(buildPopup(point));
                    infoWindowRef.current.open({ anchor: marker, map });
                }
            });

            markersRef.current.push(marker);
            bounds.extend({ lat: point.lat, lng: point.lng });
        });

        // Installation route line
        if (showRoute && instPoints.length >= 2) {
            const teamColor = selectedTeamId ? (getTeam(selectedTeamId)?.color || '#6366f1') : '#6366f1';
            const line = new google.maps.Polyline({
                path: instPoints.map(p => ({ lat: p.lat, lng: p.lng })),
                map,
                strokeColor: teamColor,
                strokeWeight: 3,
                strokeOpacity: 0.7,
                geodesic: true,
            });
            overlaysRef.current.push(line);

            for (let i = 0; i < instPoints.length - 1; i++) {
                const dist = haversineDistance(instPoints[i].lat, instPoints[i].lng, instPoints[i + 1].lat, instPoints[i + 1].lng);
                const mLat = (instPoints[i].lat + instPoints[i + 1].lat) / 2;
                const mLng = (instPoints[i].lng + instPoints[i + 1].lng) / 2;
                const lbl = new google.maps.Marker({
                    position: { lat: mLat, lng: mLng }, map,
                    icon: { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), scaledSize: new google.maps.Size(1, 1) },
                    label: { text: `${Math.round(dist)} km`, color: '#475569', fontSize: '10px', fontWeight: 'bold',
                        className: 'map-dist-label' },
                    clickable: false,
                });
                labelMarkersRef.current.push(lbl);
            }
        }

        // Route planner lines
        if (routePoints.length >= 2) {
            const mLine = new google.maps.Polyline({
                path: routePoints.map(p => ({ lat: p.lat, lng: p.lng })),
                map,
                strokeColor: '#ef4444',
                strokeWeight: 4,
                geodesic: true,
            });
            overlaysRef.current.push(mLine);

            for (let i = 0; i < routePoints.length - 1; i++) {
                const dist = haversineDistance(routePoints[i].lat, routePoints[i].lng, routePoints[i + 1].lat, routePoints[i + 1].lng);
                const mLat = (routePoints[i].lat + routePoints[i + 1].lat) / 2;
                const mLng = (routePoints[i].lng + routePoints[i + 1].lng) / 2;
                const lbl = new google.maps.Marker({
                    position: { lat: mLat, lng: mLng }, map,
                    icon: { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), scaledSize: new google.maps.Size(1, 1) },
                    label: { text: `${Math.round(dist)} km · ~${Math.round(dist / 60 * 60)} min`, color: '#ef4444', fontSize: '10px', fontWeight: 'bold' },
                    clickable: false,
                });
                labelMarkersRef.current.push(lbl);
            }
        }

        if (mapPoints.length > 0 && !bounds.isEmpty()) {
            map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
            const listener = map.addListener('idle', () => {
                if ((map.getZoom() || 6) > 15) map.setZoom(15);
                google.maps.event.removeListener(listener);
            });
        }
    }, [mapPoints, isMapReady, showRoute, selectedTeamId, routePoints, buildPopup, clearMapObjects]);

    const scrollToPoint = (point: MapPoint) => {
        mapRef.current?.panTo({ lat: point.lat, lng: point.lng });
        mapRef.current?.setZoom(14);
    };

    return (
        <div ref={containerRef} className={`h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
            {/* Toolbar */}
            <div className="p-2.5 border-b border-slate-200 flex flex-wrap items-center gap-2">
                {([
                    { key: 'inst', show: showInstallations, set: setShowInstallations, icon: '🏗️', label: 'Montaże', count: stats.installations, ac: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' },
                    { key: 'fu', show: showFollowUps, set: setShowFollowUps, icon: '🔄', label: 'Dokończenia', count: stats.followups, ac: 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' },
                    { key: 'svc', show: showServices, set: setShowServices, icon: '🔧', label: 'Serwisy', count: stats.services, ac: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' },
                    { key: 'unpl', show: showUnplanned, set: setShowUnplanned, icon: '📋', label: 'Niezaplan.', count: stats.unplanned, ac: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300' },
                ] as const).map(f => (
                    <button key={f.key} onClick={() => f.set(!f.show)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${f.show ? f.ac : 'bg-slate-100 text-slate-400'}`}>
                        {f.icon} {f.label} <span className="bg-white/80 px-1 rounded-full text-[9px]">{f.count}</span>
                    </button>
                ))}

                <div className="h-5 w-px bg-slate-200" />

                <select value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilter)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-indigo-500">
                    <option value="all">📅 Wszystkie daty</option>
                    <option value="today">Dzisiaj</option>
                    <option value="week">Ten tydzień</option>
                    <option value="month">Ten miesiąc</option>
                </select>

                <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-indigo-500">
                    <option value="">Wszystkie ekipy</option>
                    {teams.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={showRoute} onChange={e => setShowRoute(e.target.checked)} className="rounded text-indigo-600 w-3 h-3" />
                    🛣️ Trasa
                </label>

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">📍 <b>{stats.total}</b></span>
                    {!routePlannerActive && (
                        <button onClick={() => setRoutePlannerActive(true)} className="text-[10px] text-indigo-600 font-bold hover:underline">📏 Planer</button>
                    )}
                    <button onClick={toggleFullscreen}
                        className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 transition-colors">
                        {isFullscreen ? '⬇️ Zmniejsz' : '⬆️ Pełny ekran'}
                    </button>
                </div>
            </div>

            {/* Geocoding progress */}
            {geoProgress && (
                <div className="px-3 py-1 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-[11px] text-blue-700">
                    <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    Geocoding: {geoProgress.done}/{geoProgress.total}
                    <div className="flex-1 h-1 bg-blue-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(geoProgress.done / geoProgress.total) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* Route planner */}
            {routePlannerActive && (
                <div className="px-3 py-2 bg-red-50 border-b border-red-200 max-h-40 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-red-700">📏 Planer trasy ({routePoints.length} pkt.)</span>
                        <div className="flex items-center gap-1">
                            {routePoints.length > 0 && <button onClick={() => setRoutePoints(p => p.slice(0, -1))} className="text-[10px] text-red-500 hover:text-red-700 font-bold">↩ Cofnij</button>}
                            <button onClick={() => { setRoutePoints([]); setRoutePlannerActive(false); }} className="text-[10px] text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 bg-red-100 rounded">✕</button>
                        </div>
                    </div>
                    {routePoints.map((rp, idx) => (
                        <div key={rp.id} className="flex items-center gap-1.5 text-[11px] py-0.5">
                            <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{idx + 1}</span>
                            <span className="text-red-700 font-medium truncate flex-1">{TYPE_ICONS[rp.type]} {rp.label}</span>
                            <span className="text-red-400 text-[9px] truncate max-w-[80px]">{rp.city}</span>
                            {idx < routePoints.length - 1 && routeCalc?.legs[idx] && (
                                <span className="text-red-500 font-bold whitespace-nowrap text-[10px]">→ {routeCalc.legs[idx].km} km · ~{routeCalc.legs[idx].min} min</span>
                            )}
                            <button onClick={() => setRoutePoints(p => p.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-600 text-[10px]">✕</button>
                        </div>
                    ))}
                    {routeCalc && (
                        <div className="mt-1 pt-1 border-t border-red-200 flex items-center justify-between text-[11px]">
                            <span className="text-red-700 font-bold">🏁 RAZEM: {routeCalc.totalKm} km · ~{routeCalc.totalMin} min</span>
                        </div>
                    )}
                    {routePoints.length < 2 && <p className="text-[9px] text-red-400 mt-0.5">💡 Kliknij „Dodaj do trasy" w popup markera</p>}
                </div>
            )}

            {/* Nearest services */}
            {nearestServiceFor && (
                <div className="px-3 py-2 bg-orange-50 border-b border-orange-200">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-orange-700">🔧 Najbliższe serwisy od: {nearestServiceFor.label}</span>
                        <button onClick={() => setNearestServiceFor(null)} className="text-[10px] text-orange-500 hover:text-orange-700 font-bold px-1.5 py-0.5 bg-orange-100 rounded">✕</button>
                    </div>
                    {nearestServices.length === 0 ? (
                        <p className="text-[10px] text-orange-400">Brak otwartych serwisów na mapie</p>
                    ) : nearestServices.map((ns, idx) => (
                        <button key={ns.id} onClick={() => scrollToPoint(ns)} className="flex items-center gap-2 text-[11px] py-0.5 w-full text-left hover:bg-orange-100 rounded px-1">
                            <span className="w-4 h-4 rounded bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{idx + 1}</span>
                            <span className="text-orange-800 font-medium truncate flex-1">🔧 {ns.label}</span>
                            <span className="text-orange-500 text-[10px] truncate max-w-[80px]">{ns.city}</span>
                            <span className="text-orange-600 font-bold whitespace-nowrap text-[10px]">{Math.round(ns.distance)} km</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Map + Sidebar */}
            <div className="flex-1 flex min-h-0">
                <div className="flex-1 relative">
                    {mapLoadError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                            <p className="text-sm text-slate-500">⚠️ {mapLoadError}</p>
                        </div>
                    )}
                    <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
                </div>

                <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto hidden lg:flex flex-col">
                    <div className="p-2 bg-slate-50 border-b border-slate-100">
                        <input type="text" placeholder="🔍 Szukaj klienta, miasto, umowę..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {mapPoints.length === 0 && <div className="p-4 text-center text-[11px] text-slate-400">Brak punktów do wyświetlenia</div>}
                        {mapPoints.map(point => (
                            <div key={`${point.type}-${point.id}`} className="flex items-center gap-0.5 hover:bg-slate-50 transition-colors">
                                <button onClick={() => scrollToPoint(point)} className="flex-1 text-left px-2 py-1.5 min-w-0">
                                    <div className="flex items-start gap-1.5">
                                        <span className="text-[11px] mt-0.5">{TYPE_ICONS[point.type]}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[11px] font-bold text-slate-800 truncate">{point.label}</div>
                                            <div className="text-[9px] text-slate-500 truncate">{point.city} {point.address}</div>
                                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                {point.teamColor && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: point.teamColor }} />}
                                                {point.scheduledDate && <span className="text-[9px] text-indigo-500">{point.scheduledDate}</span>}
                                                {point.priority && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: PRIORITY_COLORS[point.priority] }} />}
                                                {(point.geoSource === 'plz' || point.geoSource === 'city') && <span className="text-[9px] text-amber-500">~PLZ</span>}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                {routePlannerActive && (
                                    <button onClick={() => setRoutePoints(p => p.some(pp => pp.id === point.id) ? p : [...p, point])}
                                        className="px-1 py-0.5 text-[9px] text-indigo-600 hover:bg-indigo-50 rounded font-bold flex-shrink-0 mr-1">+📏</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
