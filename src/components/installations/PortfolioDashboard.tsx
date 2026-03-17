import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import { RealizationGallery } from './RealizationGallery';
import { AddRealizationModal } from './AddRealizationModal';
import type { Realization, RealizationPhoto } from '../../services/database/realization.service';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';
import { MapPin, Plus, Filter, Search, X, Camera, Calendar, Package, Trash2 } from 'lucide-react';

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
    client_name?: string | null;
    photos: RealizationPhoto[];
    completion_date?: string | null;
    source: 'manual' | 'installation' | 'contract';
    realization_id?: string; // for manual items
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

const createMarkerIcon = (productType: string, hasPhotos: boolean) => {
    const color = PRODUCT_COLORS[productType] || '#6B7280';
    const size = 20;
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
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
            ${photoIndicator}
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

// ---- Main Component ----
export const PortfolioDashboard: React.FC = () => {
    const [realizations, setRealizations] = useState<Realization[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

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
            const [reals, allInst, allTeams] = await Promise.all([
                DatabaseService.getRealizations(),
                DatabaseService.getInstallations(),
                DatabaseService.getTeams()
            ]);

            setRealizations(reals);
            const completed = allInst.filter(i => i.status === 'completed' && i.client.coordinates);
            setInstallations(completed);
            setTeams(allTeams);
        } catch (error) {
            console.error('Error loading portfolio:', error);
            toast.error('Błąd ładowania danych');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadData(); }, []);

    // Merge both data sources into MapItem[]
    const allMapItems: MapItem[] = useMemo(() => {
        const items: MapItem[] = [];

        // From realizations table
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
                    client_name: r.client_name,
                    photos: r.photos,
                    completion_date: r.completion_date,
                    source: r.source,
                    realization_id: r.id,
                });
            }
        });

        // From completed installations (not already in realizations)
        const realizationContractIds = new Set(realizations.filter(r => r.contract_id).map(r => r.contract_id));
        installations.forEach(inst => {
            // Skip if already exists as a realization
            if (realizationContractIds.has(inst.contractId)) return;
            if (!inst.client.coordinates) return;

            items.push({
                id: `i-${inst.id}`,
                lat: inst.client.coordinates.lat,
                lng: inst.client.coordinates.lng,
                title: inst.productSummary || 'Realizacja',
                description: null,
                product_type: 'Terrassenüberdachung',
                city: inst.client.city,
                address: inst.client.address,
                client_name: `${inst.client.firstName || ''} ${inst.client.lastName || ''}`.trim(),
                photos: [],
                completion_date: inst.completedDate || inst.scheduledDate || null,
                source: 'installation',
            });
        });

        return items;
    }, [realizations, installations]);

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
            const R = 6371;
            const lat1 = searchCenter.lat * Math.PI / 180;
            items = items.filter(item => {
                const lat2 = item.lat * Math.PI / 180;
                const dLat = (item.lat - searchCenter.lat) * Math.PI / 180;
                const dLon = (item.lng - searchCenter.lng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c <= searchRadius;
            });
        }

        return items;
    }, [allMapItems, filterProductType, filterSource, searchCenter, searchRadius]);

    // Product type stats
    const productStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allMapItems.forEach(item => {
            stats[item.product_type] = (stats[item.product_type] || 0) + 1;
        });
        return stats;
    }, [allMapItems]);

    const handleSearch = async () => {
        if (!searchLocation) {
            setSearchCenter(null);
            return;
        }
        setIsSearching(true);
        try {
            const coords = await geocodeAddress(searchLocation);
            if (coords) {
                setSearchCenter(coords);
                toast.success(`Szukam w promieniu ${searchRadius} km`);
            } else {
                toast.error('Nie znaleziono lokalizacji');
            }
        } catch {
            toast.error('Błąd wyszukiwania');
        } finally {
            setIsSearching(false);
        }
    };

    const handleDeleteRealization = async (id: string) => {
        if (!confirm('Czy na pewno chcesz usunąć tę realizację?')) return;
        try {
            await DatabaseService.deleteRealization(id);
            toast.success('Realizacja usunięta');
            void loadData();
        } catch {
            toast.error('Błąd usuwania');
        }
    };

    const withPhotosCount = allMapItems.filter(i => i.photos.length > 0).length;

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
                            <p className="text-sm text-slate-500">Portfolio zrealizowanych projektów</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Dodaj Realizację
                    </button>
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
                        <div className="text-2xl font-bold text-purple-700">{realizations.length}</div>
                        <div className="text-xs text-purple-600 font-medium">Manualne wpisy</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-xl border border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">{Object.keys(productStats).length}</div>
                        <div className="text-xs text-amber-600 font-medium">Typy produktów</div>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col md:flex-row gap-3 items-end">
                {/* Product Type Filter */}
                <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Typ produktu
                    </label>
                    <select
                        value={filterProductType}
                        onChange={(e) => setFilterProductType(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    >
                        <option value="all">Wszystkie ({allMapItems.length})</option>
                        {Object.entries(productStats).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                            <option key={type} value={type}>{type} ({count})</option>
                        ))}
                    </select>
                </div>

                {/* Source Filter */}
                <div className="w-full md:w-40">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Źródło
                    </label>
                    <select
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    >
                        <option value="all">Wszystkie</option>
                        <option value="manual">Manualne</option>
                        <option value="installation">Z montażu</option>
                    </select>
                </div>

                {/* Location Search */}
                <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Szukaj w okolicy
                    </label>
                    <input
                        type="text"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        placeholder="Kod pocztowy / miasto"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>

                <div className="w-20">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Promień</label>
                    <input
                        type="number"
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        min={1}
                        max={500}
                    />
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors h-[38px] whitespace-nowrap"
                >
                    {isSearching ? '...' : '🔍 Szukaj'}
                </button>

                {searchCenter && (
                    <button
                        onClick={() => { setSearchCenter(null); setSearchLocation(''); }}
                        className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                        title="Wyczyść wyszukiwanie"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Product type legend */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-wrap gap-2">
                {Object.entries(productStats).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <button
                        key={type}
                        onClick={() => setFilterProductType(filterProductType === type ? 'all' : type)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            filterProductType === type
                                ? 'text-white shadow-md scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        style={filterProductType === type ? { backgroundColor: PRODUCT_COLORS[type] || '#6B7280' } : {}}
                    >
                        <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: PRODUCT_COLORS[type] || '#6B7280' }}
                        />
                        {type} ({count})
                    </button>
                ))}
            </div>

            {/* Map */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm relative min-h-[500px] overflow-hidden">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                        <div className="text-center">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-slate-500">Ładowanie mapy realizacji...</p>
                        </div>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <MapContainer
                        center={[52.0, 15.0]}
                        zoom={7}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapBounds items={filteredItems} />

                        {/* HQ Marker */}
                        <Marker
                            position={[51.9516, 14.7118]}
                            icon={L.divIcon({
                                className: 'hq-marker',
                                html: `<div style="font-size:24px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🏢</div>`,
                                iconSize: [30, 30],
                                iconAnchor: [15, 15]
                            })}
                            zIndexOffset={2000}
                        >
                            <Popup>
                                <div className="p-2 text-center">
                                    <h3 className="font-bold text-sm">Baza Firmy</h3>
                                    <p className="text-xs text-slate-500">Gubin 66-620</p>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Realization Markers */}
                        {filteredItems.map(item => (
                            <Marker
                                key={item.id}
                                position={[item.lat, item.lng]}
                                icon={createMarkerIcon(item.product_type, item.photos.length > 0)}
                            >
                                <Popup minWidth={300} maxWidth={380}>
                                    <div className="p-1" style={{ minWidth: '280px' }}>
                                        {/* Popup Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm text-slate-800 leading-tight">{item.title}</h3>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span
                                                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: PRODUCT_COLORS[item.product_type] || '#6B7280' }}
                                                    >
                                                        {item.product_type}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {item.source === 'manual' ? '✍️ Manualne' : '🔧 Z montażu'}
                                                    </span>
                                                </div>
                                            </div>
                                            {item.realization_id && (
                                                <button
                                                    onClick={() => handleDeleteRealization(item.realization_id!)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                    title="Usuń realizację"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {item.description && (
                                            <p className="text-xs text-slate-600 mb-2">{item.description}</p>
                                        )}

                                        {/* Details */}
                                        <div className="space-y-1 text-xs text-slate-500 mb-2">
                                            {item.address && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {[item.address, item.city].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                            {item.client_name && (
                                                <div>👤 {item.client_name}</div>
                                            )}
                                            {item.completion_date && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(item.completion_date).toLocaleDateString('pl-PL')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Photo Gallery */}
                                        {item.photos.length > 0 ? (
                                            <RealizationGallery
                                                photos={item.photos}
                                                title={item.title}
                                            />
                                        ) : (
                                            <div className="bg-slate-50 rounded-lg p-3 text-center text-xs text-slate-400 border border-dashed border-slate-200">
                                                <Camera className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                                                Brak zdjęć
                                            </div>
                                        )}
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
                            <p className="text-xs text-slate-400 mt-1">Spróbuj zmienić filtry lub dodaj pierwszą realizację</p>
                        </div>
                    </div>
                )}

                {/* Overlay Statistics */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 z-[400]">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Widoczne</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                        {filteredItems.length}
                    </div>
                    <div className="text-[10px] text-slate-400">
                        {filteredItems.filter(i => i.photos.length > 0).length} ze zdjęciami
                    </div>
                </div>
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
