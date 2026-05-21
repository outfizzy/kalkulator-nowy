import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import { RealizationGallery } from './RealizationGallery';
import { AddRealizationModal } from './AddRealizationModal';
import type { Realization, RealizationPhoto } from '../../services/database/realization.service';
import type { Installation, InstallationTeam } from '../../types';

import { toast } from 'react-hot-toast';
import {
    MapPin, Plus, Filter, Search, X, Camera, Calendar, Package, Trash2,
    List, Map as MapIcon, ArrowUpDown, Upload, FileText, Ruler
} from 'lucide-react';

// Fix default Leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

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

// ---- Map Bounds ----
const MapBounds: React.FC<{ items: MapItem[] }> = ({ items }) => {
    const map = useMap();
    useEffect(() => {
        if (items.length > 0) {
            const bounds = L.latLngBounds(items.map(i => [i.lat, i.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
    }, [items, map]);
    return null;
};

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

const createMarkerIcon = (productType: string, hasPhotos: boolean, isSelected: boolean = false) => {
    const color = PRODUCT_COLORS[productType] || '#6B7280';
    const size = isSelected ? 28 : 20;
    const photoIndicator = hasPhotos
        ? `<div style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;background:#F59E0B;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:6px;">📷</div>`
        : '';

    return L.divIcon({
        className: 'custom-portfolio-marker',
        html: `<div style="position:relative;">
            <div style="
                background: ${color};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                border: ${isSelected ? '4px' : '3px'} solid ${isSelected ? '#1e293b' : 'white'};
                box-shadow: 0 2px 8px rgba(0,0,0,${isSelected ? '0.5' : '0.3'});
                ${isSelected ? 'animation: pulse 1.5s infinite;' : ''}
            "></div>
            ${photoIndicator}
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
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
            // ALL installations with coordinates (not just completed)
            const withCoords = allInst.filter(i => i.client?.coordinates);
            setInstallations(withCoords);
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

    // Merge all data sources into MapItem[]
    const allMapItems: MapItem[] = useMemo(() => {
        const items: MapItem[] = [];

        // 1. From realizations table
        realizations.forEach(r => {
            if (r.latitude && r.longitude) {
                items.push({
                    id: `r-${r.id}`,
                    lat: r.latitude,
                    lng: r.longitude,
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

        // 2. From installations with coordinates (not already in realizations)
        const realizationContractIds = new Set(realizations.filter(r => r.contract_id).map(r => r.contract_id));
        const installationOfferIds = new Set<string>();
        installations.forEach(inst => {
            if (realizationContractIds.has(inst.contractId)) return;
            if (!inst.client?.coordinates) return;

            installationOfferIds.add(inst.offerId || '');

            items.push({
                id: `i-${inst.id}`,
                lat: inst.client.coordinates.lat,
                lng: inst.client.coordinates.lng,
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
            // Skip if installation already covers this contract
            if (installationOfferIds.has(contract.offerId)) return;
            if (realizationContractIds.has(contract.id)) return;

            // Try to get coordinates from client data
            const client = contract.client;
            if (!client) return;

            // Use client coordinates if available
            let lat = client.coordinates?.lat;
            let lng = client.coordinates?.lng;

            // Fallback: approximate from PLZ (German postal codes)
            if (!lat && client.postalCode) {
                const plz = String(client.postalCode).replace(/\D/g, '').substring(0, 5);
                if (plz.length >= 4) {
                    // Simple PLZ→approximate coordinates for Germany
                    const plzPrefix = parseInt(plz.substring(0, 2));
                    // Rough lat/lng grid for German PLZ regions
                    const plzGrid: Record<number, [number, number]> = {
                        0: [51.3, 12.4], 1: [52.5, 13.4], 2: [53.6, 10.0], 3: [52.4, 9.7],
                        4: [51.5, 7.5], 5: [50.9, 7.0], 6: [50.1, 8.7], 7: [48.8, 9.2],
                        8: [48.1, 11.6], 9: [49.5, 11.1],
                    };
                    const region = plzGrid[Math.floor(plzPrefix / 10)];
                    if (region) {
                        lat = region[0] + (plzPrefix % 10) * 0.15;
                        lng = region[1] + (plzPrefix % 10) * 0.12;
                    }
                }
            }

            if (!lat || !lng) return;

            const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.company || '';
            const productDesc = contract.product
                ? (typeof contract.product === 'string' ? contract.product : `${contract.product.modelId || ''} ${contract.product.width || ''}x${contract.product.projection || ''}`)
                : 'Umowa';

            items.push({
                id: `c-${contract.id}`,
                lat,
                lng,
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
    }, [realizations, installations, contracts]);

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

    const handleSearch = async () => {
        if (!searchLocation) { setSearchCenter(null); return; }
        setIsSearching(true);
        try {
            const coords = await geocodeAddress(searchLocation);
            if (coords) {
                setSearchCenter(coords);
                toast.success(`Szukam w promieniu ${searchRadius} km`);
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
            void loadData();
        } catch { toast.error('Błąd usuwania'); }
    };

    // Photo upload handler
    const handlePhotoUpload = async (files: FileList) => {
        if (!uploadingItemId) return;
        const item = allMapItems.find(i => i.id === uploadingItemId);
        if (!item) return;

        setIsUploading(true);
        try {
            if (item.realization_id) {
                // Existing realization — add photos
                await DatabaseService.addPhotosToRealization(item.realization_id, Array.from(files));
                toast.success(`Dodano ${files.length} zdjęć`);
            } else if (item.installation_id) {
                // Installation without realization — create one first
                const newReal = await DatabaseService.createRealization({
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
                            <p className="text-sm text-slate-500">Portfolio zrealizowanych projektów • automatycznie z umów</p>
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
                <div className="flex-1 min-w-0">
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

                <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Szukaj w okolicy
                    </label>
                    <input type="text" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)}
                        placeholder="Kod pocztowy / miasto" className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>

                <div className="w-20">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Promień</label>
                    <input type="number" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm" min={1} max={500} />
                </div>

                <button onClick={handleSearch} disabled={isSearching}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors h-[38px] whitespace-nowrap">
                    {isSearching ? '...' : '🔍 Szukaj'}
                </button>

                {searchCenter && (
                    <button onClick={() => { setSearchCenter(null); setSearchLocation(''); }}
                        className="text-slate-400 hover:text-red-500 p-2 transition-colors" title="Wyczyść">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

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
                <div className={`${selectedItem ? 'flex-1' : 'w-full'} bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all`}>
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                            <div className="text-center">
                                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-slate-500">Ładowanie mapy realizacji...</p>
                            </div>
                        </div>
                    ) : viewMode === 'map' ? (
                        /* ========== MAP VIEW ========== */
                        filteredItems.length > 0 ? (
                            <MapContainer center={[52.0, 15.0]} zoom={7} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapBounds items={filteredItems} />

                                {/* HQ Marker */}
                                <Marker position={[51.9516, 14.7118]}
                                    icon={L.divIcon({ className: 'hq-marker', html: `<div style="font-size:24px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🏢</div>`, iconSize: [30, 30], iconAnchor: [15, 15] })}
                                    zIndexOffset={2000}>
                                    <Popup><div className="p-2 text-center"><h3 className="font-bold text-sm">Baza Firmy</h3><p className="text-xs text-slate-500">Gubin 66-620</p></div></Popup>
                                </Marker>

                                {/* Distance lines from selected to nearest */}
                                {selectedItem && nearbyItems.slice(0, 3).map(ni => (
                                    <Polyline key={`line-${ni.id}`}
                                        positions={[[selectedItem.lat, selectedItem.lng], [ni.lat, ni.lng]]}
                                        pathOptions={{ color: '#6366f1', weight: 2, dashArray: '8,6', opacity: 0.6 }} />
                                ))}

                                {/* Realization Markers */}
                                {filteredItems.map(item => (
                                    <Marker key={item.id}
                                        position={[item.lat, item.lng]}
                                        icon={createMarkerIcon(item.product_type, item.photos.length > 0, selectedItemId === item.id)}
                                        eventHandlers={{ click: () => setSelectedItemId(item.id) }}>
                                        <Popup minWidth={300} maxWidth={380}>
                                            <div className="p-1" style={{ minWidth: '280px' }}>
                                                {/* Header */}
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-sm text-slate-800 leading-tight">{item.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                                style={{ backgroundColor: PRODUCT_COLORS[item.product_type] || '#6B7280' }}>
                                                                {item.product_type}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {item.source === 'manual' ? '✍️ Manualne' : item.source === 'contract' ? '📄 Z umowy' : '🔧 Z montażu'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {item.realization_id && (
                                                        <button onClick={() => handleDeleteRealization(item.realization_id!)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Usuń">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Contract + Client info */}
                                                <div className="space-y-1 text-xs text-slate-500 mb-2">
                                                    {item.contract_number && (
                                                        <div className="flex items-center gap-1 text-indigo-600 font-semibold">
                                                            <FileText className="w-3 h-3" /> {item.contract_number}
                                                        </div>
                                                    )}
                                                    {item.client_name && (
                                                        <div className="flex items-center gap-1 font-medium text-slate-700">
                                                            👤 {item.client_name}
                                                        </div>
                                                    )}
                                                    {item.address && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {[item.address, item.postal_code, item.city].filter(Boolean).join(', ')}
                                                        </div>
                                                    )}
                                                    {item.completion_date && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(item.completion_date).toLocaleDateString('pl-PL')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Gallery */}
                                                {item.photos.length > 0 ? (
                                                    <RealizationGallery photos={item.photos} title={item.title} />
                                                ) : (
                                                    <div className="bg-slate-50 rounded-lg p-3 text-center text-xs text-slate-400 border border-dashed border-slate-200">
                                                        <Camera className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                                                        Brak zdjęć
                                                    </div>
                                                )}

                                                {/* Upload button */}
                                                <button
                                                    onClick={() => { setUploadingItemId(item.id); photoInputRef.current?.click(); }}
                                                    className="w-full mt-2 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1">
                                                    <Upload className="w-3 h-3" /> Dodaj zdjęcia
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
                                <div className="text-center">
                                    <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">Brak realizacji spełniających kryteria</p>
                                </div>
                            </div>
                        )
                    ) : (
                        /* ========== LIST VIEW ========== */
                        <div className="overflow-y-auto h-full p-4">
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

                    {/* Overlay Statistics (map only) */}
                    {viewMode === 'map' && !isLoading && (
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 z-[400]">
                            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Widoczne</div>
                            <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                                {filteredItems.length}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {filteredItems.filter(i => i.photos.length > 0).length} ze zdjęciami
                            </div>
                        </div>
                    )}
                </div>

                {/* ========== SIDE PANEL — Nearby Items ========== */}
                {selectedItem && (
                    <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto flex-shrink-0 hidden lg:block">
                        {/* Selected item header */}
                        <div className="p-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800 truncate">{selectedItem.title}</h3>
                                <button onClick={() => setSelectedItemId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                    <X className="w-4 h-4" />
                                </button>
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
        </div>
    );
};
