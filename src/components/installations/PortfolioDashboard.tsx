import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import { loadGoogleMapsAPI, batchGeocodeForMap } from '../../services/map-geocoding.service';
import { RealizationGallery } from './RealizationGallery';
import { AddRealizationModal } from './AddRealizationModal';
import { EditRealizationModal } from './EditRealizationModal';
import type { Realization, RealizationPhoto } from '../../services/database/realization.service';
import type { Installation, InstallationTeam } from '../../types';

import { toast } from 'react-hot-toast';
import {
    MapPin, Plus, Filter, Search, X, Camera, Calendar, Package, Trash2,
    List, Map as MapIcon, ArrowUpDown, Upload, FileText, Ruler, Edit, Star
} from 'lucide-react';
import { supabase } from '../../services/database/base.service';

// ---- Types ----
interface MapItem {
    id: string;
    lat: number;
    lng: number;
    title: string;
    description?: string | null;
    product_type: string;
    city?: string | null;
    address?: string | null;
    postal_code?: string | null;
    client_name?: string | null;
    contract_number?: string | null;
    contract_id?: string | null;
    photos: RealizationPhoto[];
    completion_date?: string | null;
    source: 'manual' | 'installation' | 'contract';
    realization_id?: string;
    installation_id?: string;
}

// ---- Haversine distance (km) ----
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- Product type colors ----
const PRODUCT_COLORS: Record<string, string> = {
    'Terrassenüberdachung': '#10B981',
    'Carport': '#3B82F6',
    'Pergola': '#8B5CF6',
    'Lamellendach': '#F59E0B',
    'Zaun': '#EF4444',
    'Tor': '#EC4899',
    'Vordach': '#06B6D4',
    'Wintergarten': '#14B8A6',
    'Sonstiges': '#6B7280',
};

// SVG marker icon generator for Google Maps
const createGoogleMarkerIcon = (productType: string, hasPhotos: boolean, isSelected: boolean = false): google.maps.Icon => {
    const color = PRODUCT_COLORS[productType] || '#6B7280';
    const size = isSelected ? 26 : 18;
    const strokeWidth = isSelected ? 4 : 2.5;
    const strokeColor = isSelected ? '#1e293b' : '#ffffff';
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size + 10}" height="${size + 10}" viewBox="0 0 ${size + 10} ${size + 10}">
            <circle cx="${(size + 10) / 2}" cy="${(size + 10) / 2}" r="${size / 2}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
            ${hasPhotos ? `
                <circle cx="${size + 4}" cy="6" r="5" fill="#F59E0B" stroke="white" stroke-width="1"/>
                <text x="${size + 4}" y="8.5" font-size="7" font-weight="bold" font-family="system-ui" text-anchor="middle" fill="white">📷</text>
            ` : ''}
        </svg>
    `;
    
    return {
        url: `data:image/svg+xml,${encodeURIComponent(svg.trim())}`,
        scaledSize: new google.maps.Size(size + 10, size + 10),
        anchor: new google.maps.Point((size + 10) / 2, (size + 10) / 2)
    };
};

// ---- Sort options ----
type SortMode = 'newest' | 'oldest' | 'with_photos' | 'no_photos';
const SORT_LABELS: Record<SortMode, string> = {
    newest: 'Najnowsze',
    oldest: 'Najstarsze',
    with_photos: 'Ze zdjęciami',
    no_photos: 'Bez zdjęć',
};

// ---- Main Component ----
export const PortfolioDashboard: React.FC = () => {
    const [realizations, setRealizations] = useState<Realization[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEditRealization, setSelectedEditRealization] = useState<Realization | null>(null);

    // View mode
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [sortMode, setSortMode] = useState<SortMode>('newest');

    // Selection & nearby panel
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // Photo upload
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Filters
    const [filterProductType, setFilterProductType] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [searchLocation, setSearchLocation] = useState('');
    const [searchRadius, setSearchRadius] = useState(20);
    const [isSearching, setIsSearching] = useState(false);
    const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

    // Google Maps Refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const hqMarkerRef = useRef<google.maps.Marker | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Geocoding Cache State
    const [geoCoords, setGeoCoords] = useState<Map<string, { lat: number; lng: number }>>(new Map());
    const [geoProgress, setGeoProgress] = useState<{ done: number; total: number } | null>(null);

    // Load data
    const loadData = async () => {
        setIsLoading(true);
        try {
            let reals: Realization[] = [];
            let allInst: Installation[] = [];
            let allContracts: any[] = [];
            let allTeams: InstallationTeam[] = [];

            try { reals = await DatabaseService.getRealizations(); } catch (e) { console.warn('[Portfolio] getRealizations failed:', e); }
            try { allInst = await DatabaseService.getInstallations(); } catch (e) { console.warn('[Portfolio] getInstallations failed:', e); }
            try { allContracts = await DatabaseService.getContracts(); } catch (e) { console.warn('[Portfolio] getContracts failed:', e); }
            try { allTeams = await DatabaseService.getTeams(); } catch (e) { console.warn('[Portfolio] getTeams failed:', e); }

            setRealizations(reals);
            // ALL installations with coordinates or client data
            const validInst = allInst.filter(i => i.client);
            setInstallations(validInst);
            setContracts(allContracts);
            setTeams(allTeams);
        } catch (error) {
            console.error('Error loading portfolio:', error);
            toast.error('Błąd ładowania danych');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadData(); }, []);

    // 1. Build geocodable items for realizations/installations/contracts that lack lat/lng
    const allGeoItems = useMemo(() => {
        const items: Array<{ id: string; address?: string; city?: string; postalCode?: string; lat?: number; lng?: number }> = [];

        // Realizations
        realizations.forEach(r => {
            items.push({
                id: `r-${r.id}`,
                address: r.address || undefined,
                city: r.city || undefined,
                postalCode: r.postal_code || undefined,
                lat: r.latitude || undefined,
                lng: r.longitude || undefined
            });
        });

        // Installations
        installations.forEach(inst => {
            items.push({
                id: `i-${inst.id}`,
                address: inst.client?.address,
                city: inst.client?.city,
                postalCode: inst.client?.postalCode,
                lat: inst.client?.coordinates?.lat || (inst as any).client?.lat,
                lng: inst.client?.coordinates?.lng || (inst as any).client?.lng
            });
        });

        // Contracts
        contracts.forEach(c => {
            const client = c.client;
            if (!client) return;
            items.push({
                id: `c-${c.id}`,
                address: client.address || client.street,
                city: client.city,
                postalCode: client.postalCode || client.zip,
                lat: client.coordinates?.lat,
                lng: client.coordinates?.lng
            });
        });

        return items;
    }, [realizations, installations, contracts]);

    // 2. Background precision geocoding via Google Geocoding API
    useEffect(() => {
        if (allGeoItems.length === 0) return;
        let cancelled = false;
        setGeoProgress({ done: 0, total: allGeoItems.length });
        
        batchGeocodeForMap(allGeoItems, (done, total) => {
            if (!cancelled) setGeoProgress({ done, total });
        })
        .then(results => {
            if (!cancelled) {
                const coordsMap = new Map<string, { lat: number; lng: number }>();
                results.forEach((v, k) => {
                    coordsMap.set(k, { lat: v.lat, lng: v.lng });
                });
                setGeoCoords(coordsMap);
                setGeoProgress(null);
            }
        })
        .catch(err => {
            console.error('Batch geocoding failed:', err);
            if (!cancelled) setGeoProgress(null);
        });

        return () => { cancelled = true; };
    }, [allGeoItems]);

    // Merge all data sources into MapItem[] using resolved Google Geocoding coordinates
    const allMapItems: MapItem[] = useMemo(() => {
        const items: MapItem[] = [];

        // 1. From realizations table
        realizations.forEach(r => {
            const geo = geoCoords.get(`r-${r.id}`) || (r.latitude && r.longitude ? { lat: r.latitude, lng: r.longitude } : null);
            if (geo) {
                items.push({
                    id: `r-${r.id}`,
                    lat: geo.lat,
                    lng: geo.lng,
                    title: r.title,
                    description: r.description,
                    product_type: r.product_type,
                    city: r.city,
                    address: r.address,
                    postal_code: r.postal_code,
                    client_name: r.client_name,
                    contract_number: null,
                    contract_id: r.contract_id,
                    photos: r.photos,
                    completion_date: r.completion_date,
                    source: r.source,
                    realization_id: r.id,
                });
            }
        });

        // 2. From installations (not already in realizations)
        const realizationContractIds = new Set(realizations.filter(r => r.contract_id).map(r => r.contract_id));
        const installationOfferIds = new Set<string>();
        
        installations.forEach(inst => {
            if (realizationContractIds.has(inst.contractId)) return;
            const geo = geoCoords.get(`i-${inst.id}`);
            if (!geo) return;

            installationOfferIds.add(inst.offerId || '');

            items.push({
                id: `i-${inst.id}`,
                lat: geo.lat,
                lng: geo.lng,
                title: inst.productSummary || 'Realizacja',
                description: null,
                product_type: 'Terrassenüberdachung',
                city: inst.client.city,
                address: inst.client.address,
                postal_code: inst.client.postalCode,
                client_name: `${inst.client.firstName || ''} ${inst.client.lastName || ''}`.trim(),
                contract_number: inst.contractNumber || null,
                contract_id: inst.contractId || null,
                photos: (inst.photoUrls || []).map(url => ({ url, is_cover: false })),
                completion_date: inst.completedDate || inst.scheduledDate || null,
                source: 'installation',
                installation_id: inst.id,
            });
        });

        // 3. From contracts NOT already covered by installations or realizations
        contracts.forEach(contract => {
            if (installationOfferIds.has(contract.offerId)) return;
            if (realizationContractIds.has(contract.id)) return;

            const client = contract.client;
            if (!client) return;

            const geo = geoCoords.get(`c-${contract.id}`);
            if (!geo) return;

            const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.company || '';
            const productDesc = contract.product
                ? (typeof contract.product === 'string' ? contract.product : `${contract.product.modelId || ''} ${contract.product.width || ''}x${contract.product.projection || ''}`)
                : 'Umowa';

            items.push({
                id: `c-${contract.id}`,
                lat: geo.lat,
                lng: geo.lng,
                title: productDesc,
                description: null,
                product_type: 'Terrassenüberdachung',
                city: client.city || null,
                address: client.address || client.street || null,
                postal_code: client.postalCode || null,
                client_name: clientName,
                contract_number: contract.contractNumber || null,
                contract_id: contract.id,
                photos: [],
                completion_date: contract.signedAt ? new Date(contract.signedAt).toISOString() : contract.createdAt ? new Date(contract.createdAt).toISOString() : null,
                source: 'contract',
            });
        });

        return items;
    }, [realizations, installations, contracts, geoCoords]);

    // Apply filters
    const filteredItems = useMemo(() => {
        let items = allMapItems;

        if (filterProductType !== 'all') {
            items = items.filter(i => i.product_type === filterProductType);
        }
        if (filterSource !== 'all') {
            items = items.filter(i => i.source === filterSource);
        }

        // Radius search
        if (searchCenter) {
            items = items.filter(item => haversineKm(searchCenter.lat, searchCenter.lng, item.lat, item.lng) <= searchRadius);
        }

        // Sort (for list view)
        const sorted = [...items];
        switch (sortMode) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.completion_date || 0).getTime() - new Date(a.completion_date || 0).getTime());
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.completion_date || 0).getTime() - new Date(b.completion_date || 0).getTime());
                break;
            case 'with_photos':
                sorted.sort((a, b) => b.photos.length - a.photos.length);
                break;
            case 'no_photos':
                sorted.sort((a, b) => a.photos.length - b.photos.length);
                break;
        }

        return sorted;
    }, [allMapItems, filterProductType, filterSource, searchCenter, searchRadius, sortMode]);

    // Selected item + nearby items
    const selectedItem = useMemo(() => filteredItems.find(i => i.id === selectedItemId) || null, [filteredItems, selectedItemId]);

    const nearbyItems = useMemo(() => {
        if (!selectedItem) return [];
        return filteredItems
            .filter(i => i.id !== selectedItem.id)
            .map(i => ({ ...i, distance: haversineKm(selectedItem.lat, selectedItem.lng, i.lat, i.lng) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8);
    }, [selectedItem, filteredItems]);

    // Product type stats
    const productStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allMapItems.forEach(item => { stats[item.product_type] = (stats[item.product_type] || 0) + 1; });
        return stats;
    }, [allMapItems]);

    // Initialize Google Map
    useEffect(() => {
        const init = async () => {
            if (!mapContainerRef.current || mapRef.current) return;
            try {
                await loadGoogleMapsAPI();
                const map = new google.maps.Map(mapContainerRef.current, {
                    center: { lat: 51.5, lng: 11.5 }, // Central Germany
                    zoom: 6,
                    mapTypeControl: true,
                    fullscreenControl: true,
                    streetViewControl: false,
                    zoomControl: true,
                    styles: [
                        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                    ],
                });
                infoWindowRef.current = new google.maps.InfoWindow();
                mapRef.current = map;
                setIsMapReady(true);
            } catch (err) {
                console.error('[Portfolio] Google Maps load error:', err);
                toast.error('Błąd ładowania Google Maps API');
            }
        };
        init();
        return () => {
            mapRef.current = null;
        };
    }, []);

    // Info Window content builder
    const buildItemPopupHtml = useCallback((item: MapItem): string => {
        const color = PRODUCT_COLORS[item.product_type] || '#6B7280';
        const sourceLabel = item.source === 'manual' ? '✍️ Manualne' : item.source === 'contract' ? '📄 Z umowy' : '🔧 Z montażu';
        
        let photosHtml = '';
        if (item.photos.length > 0) {
            photosHtml = `
                <div style="display:flex;gap:4px;overflow-x:auto;padding:4px 0;margin-bottom:6px;">
                    ${item.photos.slice(0, 4).map(p => `
                        <img src="${p.url}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" />
                    `).join('')}
                    ${item.photos.length > 4 ? `
                        <div style="width:48px;height:48px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:#475569;border-radius:4px;">
                            +${item.photos.length - 4}
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            photosHtml = `
                <div style="background:#f8fafc;border:1px dashed #e2e8f0;border-radius:6px;padding:8px;text-align:center;font-size:11px;color:#94a3b8;margin-bottom:6px;">
                    Brak zdjęć w galerii
                </div>
            `;
        }

        return `
            <div style="min-width:240px;max-width:280px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;padding:4px;">
                <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:4px;">
                    <div style="flex:1;min-width:0;">
                        <h4 style="margin:0;font-size:13px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</h4>
                        <div style="margin-top:2px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                            <span style="display:inline-block;padding:1px 6px;background:${color};color:white;border-radius:10px;font-size:9px;font-weight:bold;">${item.product_type}</span>
                            <span style="font-size:9px;color:#64748b;">${sourceLabel}</span>
                        </div>
                    </div>
                </div>
                
                <div style="font-size:11px;color:#64748b;margin:6px 0;line-height:1.4;">
                    ${item.client_name ? `<div style="font-weight:500;color:#334155;">👤 ${item.client_name}</div>` : ''}
                    ${item.contract_number ? `<div style="font-weight:600;color:#4f46e5;">📄 ${item.contract_number}</div>` : ''}
                    ${item.address ? `<div style="margin-top:1px;">📍 ${[item.address, item.postal_code, item.city].filter(Boolean).join(', ')}</div>` : ''}
                    ${item.completion_date ? `<div style="margin-top:1px;">📅 ${new Date(item.completion_date).toLocaleDateString('pl-PL')}</div>` : ''}
                </div>

                ${photosHtml}

                <div style="display:flex;gap:4px;margin-top:8px;">
                    <button onclick="window.__portfolioSelectRealization&&window.__portfolioSelectRealization('${item.id}')" 
                            style="flex:1;padding:6px 0;background:#4f46e5;color:white;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;transition:all;">
                        Szczegóły / Galeria
                    </button>
                    <button onclick="window.__portfolioUploadPhotos&&window.__portfolioUploadPhotos('${item.id}')" 
                            style="padding:6px 10px;background:#10b981;color:white;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:2px;">
                        📷 +
                    </button>
                </div>
            </div>
        `;
    }, []);

    // Global window functions registration for markers interaction
    useEffect(() => {
        (window as any).__portfolioSelectRealization = (id: string) => {
            setSelectedItemId(id);
        };
        (window as any).__portfolioUploadPhotos = (itemId: string) => {
            setUploadingItemId(itemId);
            photoInputRef.current?.click();
        };
        return () => {
            delete (window as any).__portfolioSelectRealization;
            delete (window as any).__portfolioUploadPhotos;
        };
    }, []);

    // Render Markers & Polylines on Google Map
    useEffect(() => {
        if (!mapRef.current || !isMapReady || viewMode !== 'map') return;
        const map = mapRef.current;

        // Clear existing map items
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        polylinesRef.current.forEach(p => p.setMap(null));
        polylinesRef.current = [];
        if (hqMarkerRef.current) {
            hqMarkerRef.current.setMap(null);
            hqMarkerRef.current = null;
        }

        const bounds = new google.maps.LatLngBounds();
        let hasMarkers = false;

        // 1. Add HQ Marker
        const hqMarker = new google.maps.Marker({
            position: { lat: 51.9516, lng: 14.7118 },
            map,
            icon: {
                url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><text x="15" y="24" font-size="24" text-anchor="middle">🏢</text></svg>'),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15)
            },
            zIndex: 1000,
            title: 'Baza Firmy (Gubin)'
        });
        hqMarker.addListener('click', () => {
            if (infoWindowRef.current) {
                infoWindowRef.current.setContent('<div style="padding:6px;font-family:sans-serif;"><h3 style="margin:0 0 2px 0;font-size:13px;font-weight:bold;">Baza Firmy</h3><p style="margin:0;font-size:11px;color:#64748b;">Gubin 66-620</p></div>');
                infoWindowRef.current.open(map, hqMarker);
            }
        });
        hqMarkerRef.current = hqMarker;
        bounds.extend({ lat: 51.9516, lng: 14.7118 });
        hasMarkers = true;

        // 2. Add Realization Markers
        filteredItems.forEach(item => {
            const isSelected = selectedItemId === item.id;
            const marker = new google.maps.Marker({
                position: { lat: item.lat, lng: item.lng },
                map,
                icon: createGoogleMarkerIcon(item.product_type, item.photos.length > 0, isSelected),
                title: item.title,
                zIndex: isSelected ? 100 : 10
            });

            marker.addListener('click', () => {
                setSelectedItemId(item.id);
                if (infoWindowRef.current) {
                    infoWindowRef.current.setContent(buildItemPopupHtml(item));
                    infoWindowRef.current.open({ anchor: marker, map });
                }
            });

            markersRef.current.push(marker);
            bounds.extend({ lat: item.lat, lng: item.lng });
            hasMarkers = true;
        });

        // 3. Draw distance lines from selected to nearest 3 realizations
        if (selectedItem) {
            nearbyItems.slice(0, 3).forEach(ni => {
                const polyline = new google.maps.Polyline({
                    path: [
                        { lat: selectedItem.lat, lng: selectedItem.lng },
                        { lat: ni.lat, lng: ni.lng }
                    ],
                    map,
                    strokeColor: '#4f46e5',
                    strokeWeight: 2,
                    strokeOpacity: 0.7,
                    icons: [{
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 1,
                            scale: 2
                        },
                        offset: '0',
                        repeat: '8px'
                    }],
                });
                polylinesRef.current.push(polyline);
            });
        }

        // Fit map bounds
        if (hasMarkers && filteredItems.length > 0) {
            map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
            const listener = map.addListener('idle', () => {
                if ((map.getZoom() || 6) > 12) map.setZoom(12);
                google.maps.event.removeListener(listener);
            });
        }
    }, [filteredItems, selectedItemId, viewMode, isMapReady, selectedItem, nearbyItems, buildItemPopupHtml]);

    const handleSearch = async () => {
        if (!searchLocation) { setSearchCenter(null); return; }
        setIsSearching(true);
        try {
            const coords = await geocodeAddress(searchLocation);
            if (coords) {
                setSearchCenter(coords);
                toast.success(`Szukam w promieniu ${searchRadius} km`);
                if (mapRef.current) {
                    mapRef.current.panTo(coords);
                    mapRef.current.setZoom(10);
                }
            } else {
                toast.error('Nie znaleziono lokalizacji');
            }
        } catch { toast.error('Błąd wyszukiwania'); }
        finally { setIsSearching(false); }
    };

    const handleDeleteRealization = async (id: string) => {
        if (!confirm('Czy na pewno chcesz usunąć tę realizację?')) return;
        try {
            await DatabaseService.deleteRealization(id);
            toast.success('Realizacja usunięta');
            setSelectedItemId(null);
            void loadData();
        } catch { toast.error('Błąd usuwania'); }
    };

    // Photo upload handler
    const handlePhotoUpload = async (files: FileList) => {
        const activeItemId = uploadingItemId || selectedItemId;
        if (!activeItemId) return;
        const item = allMapItems.find(i => i.id === activeItemId);
        if (!item) return;

        setIsUploading(true);
        try {
            if (item.realization_id) {
                // Existing realization — add photos
                await DatabaseService.addPhotosToRealization(item.realization_id, Array.from(files));
                toast.success(`Dodano ${files.length} zdjęć`);
            } else if (item.installation_id) {
                // Installation without realization — create one first
                await DatabaseService.createRealization({
                    title: item.title,
                    product_type: item.product_type,
                    address: item.address || undefined,
                    city: item.city || undefined,
                    postal_code: item.postal_code || undefined,
                    latitude: item.lat,
                    longitude: item.lng,
                    client_name: item.client_name || undefined,
                    completion_date: item.completion_date || undefined,
                    source: 'installation',
                    contract_id: item.contract_id || undefined,
                }, Array.from(files));
                toast.success(`Utworzono realizację i dodano ${files.length} zdjęć`);
            }
            void loadData();
        } catch (e) {
            console.error('Upload error:', e);
            toast.error('Błąd wgrywania zdjęć');
        } finally {
            setIsUploading(false);
            setUploadingItemId(null);
        }
    };

    const withPhotosCount = allMapItems.filter(i => i.photos.length > 0).length;

    // ---- RENDER ----
    return (
        <div className="h-full flex flex-col space-y-3">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                            <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Mapa Realizacji</h1>
                            <p className="text-sm text-slate-500">Portfolio zrealizowanych projektów • geolokalizacja Google Maps</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MapIcon className="w-3.5 h-3.5" /> Mapa
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <List className="w-3.5 h-3.5" /> Lista
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Dodaj
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 rounded-xl border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">{allMapItems.length}</div>
                        <div className="text-xs text-emerald-600 font-medium">Wszystkie realizacje</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{withPhotosCount}</div>
                        <div className="text-xs text-blue-600 font-medium">Ze zdjęciami</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl border border-purple-200">
                        <div className="text-2xl font-bold text-purple-700">{allMapItems.filter(i => i.contract_number).length}</div>
                        <div className="text-xs text-purple-600 font-medium">Z numerem umowy</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-xl border border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">{Object.keys(productStats).length}</div>
                        <div className="text-xs text-amber-600 font-medium">Typy produktów</div>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 min-w-0 w-full">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Typ produktu
                    </label>
                    <select value={filterProductType} onChange={(e) => setFilterProductType(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                        <option value="all">Wszystkie ({allMapItems.length})</option>
                        {Object.entries(productStats).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                            <option key={type} value={type}>{type} ({count})</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-40">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Źródło
                    </label>
                    <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                        <option value="all">Wszystkie</option>
                        <option value="manual">Manualne</option>
                        <option value="installation">Z montażu</option>
                        <option value="contract">Z umów</option>
                    </select>
                </div>

                {viewMode === 'list' && (
                    <div className="w-full md:w-40">
                        <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <ArrowUpDown className="w-3 h-3" /> Sortuj
                        </label>
                        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                            {Object.entries(SORT_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex-1 min-w-0 w-full">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Szukaj w okolicy
                    </label>
                    <input type="text" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)}
                        placeholder="Kod pocztowy / miasto" className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>

                <div className="w-full md:w-20">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Promień</label>
                    <input type="number" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm" min={1} max={500} />
                </div>

                <button onClick={handleSearch} disabled={isSearching}
                    className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors h-[38px] whitespace-nowrap">
                    {isSearching ? '...' : '🔍 Szukaj'}
                </button>

                {searchCenter && (
                    <button onClick={() => { setSearchCenter(null); setSearchLocation(''); }}
                        className="text-slate-400 hover:text-red-500 p-2 transition-colors" title="Wyczyść">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Geocoding Progress Bar */}
            {geoProgress && (
                <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex flex-col md:flex-row md:items-center gap-3 text-xs text-blue-700">
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                        <span className="font-semibold">Geokodowanie adresów z Google Maps:</span>
                        <span>{geoProgress.done} z {geoProgress.total}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${(geoProgress.done / geoProgress.total) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* Product type legend */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-wrap gap-2">
                {Object.entries(productStats).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <button key={type}
                        onClick={() => setFilterProductType(filterProductType === type ? 'all' : type)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${filterProductType === type ? 'text-white shadow-md scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        style={filterProductType === type ? { backgroundColor: PRODUCT_COLORS[type] || '#6B7280' } : {}}>
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PRODUCT_COLORS[type] || '#6B7280' }} />
                        {type} ({count})
                    </button>
                ))}
            </div>

            {/* Hidden file input for photo upload */}
            <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files && e.target.files.length > 0) handlePhotoUpload(e.target.files); e.target.value = ''; }} />

            {/* Main content area */}
            <div className="flex-1 flex gap-3 min-h-[500px]">
                {/* Main view (map or list) */}
                <div className={`${selectedItemId ? 'flex-1' : 'w-full'} bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all`}>
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                            <div className="text-center">
                                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-slate-500">Ładowanie mapy realizacji...</p>
                            </div>
                        </div>
                    ) : viewMode === 'map' ? (
                        /* ========== MAP VIEW ========== */
                        <div className="relative w-full h-full">
                            <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }} />
                            
                            {/* Overlay Statistics (map only) */}
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 z-[10]">
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Widoczne</div>
                                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                                    {filteredItems.length}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    {filteredItems.filter(i => i.photos.length > 0).length} ze zdjęciami
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ========== LIST VIEW ========== */
                        <div className="overflow-y-auto h-full p-4 max-h-[600px]">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">Brak realizacji</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredItems.map(item => {
                                        const coverPhoto = item.photos.find(p => p.is_cover) || item.photos[0];
                                        const isSelected = selectedItemId === item.id;
                                        return (
                                            <div key={item.id}
                                                onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                                                className={`bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg group ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-lg' : 'border-slate-100 hover:border-slate-200'}`}>
                                                {/* Image */}
                                                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
                                                    {coverPhoto ? (
                                                        <img src={coverPhoto.url} alt={item.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <Camera className="w-10 h-10" />
                                                        </div>
                                                    )}
                                                    {/* Product badge */}
                                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                                                        style={{ backgroundColor: PRODUCT_COLORS[item.product_type] || '#6B7280' }}>
                                                        {item.product_type}
                                                    </span>
                                                    {/* Photo count */}
                                                    {item.photos.length > 0 && (
                                                        <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                            <Camera className="w-2.5 h-2.5" /> {item.photos.length}
                                                        </span>
                                                    )}
                                                    {/* Upload overlay for items without photos */}
                                                    {item.photos.length === 0 && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setUploadingItemId(item.id); photoInputRef.current?.click(); }}
                                                            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                                                            <div className="bg-white/90 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                <Upload className="w-3 h-3" /> Dodaj zdjęcia
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="p-3">
                                                    <h4 className="font-bold text-sm text-slate-800 leading-tight truncate">{item.title}</h4>

                                                    {/* Contract number — prominent */}
                                                    {item.contract_number && (
                                                        <div className="flex items-center gap-1 mt-1 text-indigo-600 text-xs font-semibold">
                                                            <FileText className="w-3 h-3" /> {item.contract_number}
                                                        </div>
                                                    )}

                                                    {/* Client */}
                                                    {item.client_name && (
                                                        <div className="text-xs text-slate-600 mt-0.5 font-medium">👤 {item.client_name}</div>
                                                    )}

                                                    {/* Address + Date */}
                                                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                                                        <span className="truncate">{[item.postal_code, item.city].filter(Boolean).join(' ')}</span>
                                                        {item.completion_date && (
                                                            <span>{new Date(item.completion_date).toLocaleDateString('pl-PL')}</span>
                                                        )}
                                                    </div>

                                                    {/* Source badge */}
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${item.source === 'manual' ? 'bg-purple-50 text-purple-600' : item.source === 'contract' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {item.source === 'manual' ? '✍️ Manualne' : item.source === 'contract' ? '📄 Z umowy' : '🔧 Z montażu'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ========== SIDE PANEL — Selected Realization Details & Gallery ========== */}
                {selectedItem && (
                    <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto flex-shrink-0 flex flex-col hidden lg:flex max-h-[600px]">
                        {/* Selected item header */}
                        <div className="p-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800 truncate pr-2">{selectedItem.title}</h3>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {selectedItem.realization_id && (
                                        <button
                                            onClick={() => {
                                                const real = realizations.find(r => r.id === selectedItem.realization_id);
                                                if (real) {
                                                    setSelectedEditRealization(real);
                                                    setShowEditModal(true);
                                                }
                                            }}
                                            className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                                            title="Edytuj realizację"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedItemId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {selectedItem.contract_number && (
                                <div className="flex items-center gap-1 mt-1 text-indigo-600 text-xs font-semibold">
                                    <FileText className="w-3 h-3" /> {selectedItem.contract_number}
                                </div>
                            )}
                            {selectedItem.client_name && (
                                <div className="text-xs text-slate-600 mt-0.5">👤 {selectedItem.client_name}</div>
                            )}
                            {selectedItem.address && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {[selectedItem.address, selectedItem.postal_code, selectedItem.city].filter(Boolean).join(', ')}
                                </div>
                            )}

                            {/* Upload photos button */}
                            <button
                                onClick={() => { setUploadingItemId(selectedItem.id); photoInputRef.current?.click(); }}
                                disabled={isUploading}
                                className="w-full mt-3 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                                {isUploading ? (
                                    <><div className="w-3 h-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /> Wgrywanie...</>
                                ) : (
                                    <><Upload className="w-3.5 h-3.5" /> Dodaj zdjęcia ({selectedItem.photos.length})</>
                                )}
                            </button>
                        </div>

                        {/* Realization Gallery in Side Panel */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-emerald-500" /> Zdjęcia realizacji
                            </h4>
                            {selectedItem.photos.length > 0 ? (
                                <RealizationGallery photos={selectedItem.photos} title={selectedItem.title} />
                            ) : (
                                <div className="bg-white rounded-lg p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200">
                                    <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                    Brak zdjęć w portfolio. Kliknij przycisk powyżej, aby dodać.
                                </div>
                            )}
                        </div>

                        {/* Nearby realizations */}
                        <div className="p-3">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Ruler className="w-3.5 h-3.5 text-indigo-500" /> Najbliższe realizacje
                            </h4>

                            {nearbyItems.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">Brak innych realizacji</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {nearbyItems.map(ni => (
                                        <button key={ni.id}
                                            onClick={() => setSelectedItemId(ni.id)}
                                            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                                            {/* Color dot */}
                                            <div className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm"
                                                style={{ backgroundColor: PRODUCT_COLORS[ni.product_type] || '#6B7280' }} />
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-slate-700 truncate">{ni.client_name || ni.title}</div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    {ni.contract_number && <span className="text-indigo-500 font-medium">{ni.contract_number} • </span>}
                                                    {[ni.postal_code, ni.city].filter(Boolean).join(' ')}
                                                </div>
                                            </div>
                                            {/* Distance badge */}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${ni.distance < 10 ? 'bg-green-100 text-green-700' : ni.distance < 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {ni.distance < 1 ? `${Math.round(ni.distance * 1000)}m` : `${ni.distance.toFixed(1)} km`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Realization Modal */}
            <AddRealizationModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={loadData}
            />

            {/* Edit Realization Modal */}
            {selectedEditRealization && (
                <EditRealizationModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedEditRealization(null);
                    }}
                    realization={selectedEditRealization}
                    onSuccess={loadData}
                />
            )}
        </div>
    );
};
