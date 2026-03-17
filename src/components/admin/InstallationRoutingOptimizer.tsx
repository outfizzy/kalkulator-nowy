import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { batchGeocodeForMap } from '../../services/map-geocoding.service';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';

interface GeoInstallation extends Installation {
    lat: number;
    lng: number;
}

interface Cluster {
    id: number;
    color: string;
    installations: GeoInstallation[];
    centerLat: number;
    centerLng: number;
    totalDays: number;
    assignedTeamId?: string;
    distanceKm: number; // estimated route distance within cluster
}

const CLUSTER_COLORS = [
    '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4',
    '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6',
];

// Simple geographic clustering using postal code prefix (first 2 digits) as proxy
function clusterByPostalPrefix(installations: GeoInstallation[]): Cluster[] {
    const groups = new Map<string, GeoInstallation[]>();

    installations.forEach(inst => {
        const plz = inst.client.postalCode || '';
        const prefix = plz.replace(/\D/g, '').substring(0, 2) || 'XX';
        if (!groups.has(prefix)) groups.set(prefix, []);
        groups.get(prefix)!.push(inst);
    });

    let clusterId = 0;
    const clusters: Cluster[] = [];

    groups.forEach((installs, _prefix) => {
        const color = CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
        const centerLat = installs.reduce((s, i) => s + i.lat, 0) / installs.length;
        const centerLng = installs.reduce((s, i) => s + i.lng, 0) / installs.length;
        const totalDays = installs.reduce((s, i) => s + (i.expectedDuration || 1), 0);

        // Estimate in-cluster route distance (naive: sum of distances between consecutive points sorted by lat)
        const sorted = [...installs].sort((a, b) => a.lat - b.lat);
        let distanceKm = 0;
        for (let i = 1; i < sorted.length; i++) {
            distanceKm += haversineKm(sorted[i - 1].lat, sorted[i - 1].lng, sorted[i].lat, sorted[i].lng);
        }

        clusters.push({
            id: clusterId++,
            color,
            installations: installs,
            centerLat,
            centerLng,
            totalDays,
            distanceKm: Math.round(distanceKm),
        });
    });

    // Sort clusters by size (largest first)
    return clusters.sort((a, b) => b.installations.length - a.installations.length);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Optimized TSP route using nearest-neighbor heuristic
function optimizeRoute(installations: GeoInstallation[]): GeoInstallation[] {
    if (installations.length <= 2) return installations;

    const remaining = [...installations];
    const route: GeoInstallation[] = [];

    // Start from northernmost point (closest to base)
    remaining.sort((a, b) => b.lat - a.lat);
    route.push(remaining.shift()!);

    while (remaining.length > 0) {
        const last = route[route.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;

        remaining.forEach((inst, idx) => {
            const d = haversineKm(last.lat, last.lng, inst.lat, inst.lng);
            if (d < nearestDist) { nearestDist = d; nearestIdx = idx; }
        });

        route.push(remaining.splice(nearestIdx, 1)[0]);
    }

    return route;
}

export const InstallationRoutingOptimizer: React.FC = () => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [geoInstallations, setGeoInstallations] = useState<GeoInstallation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'clusters' | 'route'>('clusters');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [allInstallations, allTeams] = await Promise.all([
                DatabaseService.getInstallations(),
                InstallationTeamService.getTeams(),
            ]);

            // Filter to pending/scheduled installations only
            const pending = allInstallations.filter(i =>
                i.status === 'scheduled' || i.status === 'pending' || i.status === 'confirmed'
            );

            setInstallations(pending);
            setTeams(allTeams);

            // Geocode
            setGeocoding(true);
            const items = pending.map(i => ({
                id: i.id,
                address: i.client.address,
                city: i.client.city,
                postalCode: i.client.postalCode,
            }));

            const geoResults = await batchGeocodeForMap(items);
            const geoMap = new Map(geoResults.map(r => [r.id, r]));

            const geoInst: GeoInstallation[] = pending
                .filter(i => {
                    const geo = geoMap.get(i.id);
                    return geo && geo.lat && geo.lng;
                })
                .map(i => {
                    const geo = geoMap.get(i.id)!;
                    return { ...i, lat: geo.lat!, lng: geo.lng! };
                });

            setGeoInstallations(geoInst);

            // Cluster
            const clustered = clusterByPostalPrefix(geoInst);
            setClusters(clustered);
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania danych');
        } finally {
            setLoading(false);
            setGeocoding(false);
        }
    };

    const assignTeamToCluster = useCallback(async (clusterId: number, teamId: string) => {
        setClusters(prev => prev.map(c =>
            c.id === clusterId ? { ...c, assignedTeamId: teamId } : c
        ));

        // Update installations in this cluster
        const cluster = clusters.find(c => c.id === clusterId);
        if (!cluster) return;

        try {
            await Promise.all(
                cluster.installations.map(inst =>
                    DatabaseService.updateInstallation(inst.id, { teamId } as any)
                )
            );
            toast.success(`Przypisano ekipę do ${cluster.installations.length} montaży`);
        } catch (error) {
            console.error(error);
            toast.error('Błąd przypisywania ekipy');
        }
    }, [clusters]);

    // Optimized route for selected cluster
    const selectedRoute = useMemo(() => {
        if (selectedCluster === null) return [];
        const cluster = clusters.find(c => c.id === selectedCluster);
        if (!cluster) return [];
        return optimizeRoute(cluster.installations);
    }, [selectedCluster, clusters]);

    // Summary stats
    const stats = useMemo(() => ({
        totalInstallations: geoInstallations.length,
        totalDays: geoInstallations.reduce((s, i) => s + (i.expectedDuration || 1), 0),
        clustersCount: clusters.length,
        unassigned: clusters.filter(c => !c.assignedTeamId).length,
    }), [geoInstallations, clusters]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
                <p className="text-sm text-slate-400">
                    {geocoding ? 'Geokodowanie adresów instalacji...' : 'Ładowanie danych...'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">🗺️ AI Routing — Optymalny Plan Montaży</h1>
                    <p className="text-sm text-slate-500">Grupowanie montaży wg regionów, sugestie optymalnej trasy i przypisanie ekip</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('clusters')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            viewMode === 'clusters' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        🗂️ Klastry
                    </button>
                    <button
                        onClick={() => setViewMode('route')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            viewMode === 'route' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        🛣️ Trasa
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-2xl font-bold text-indigo-600">{stats.totalInstallations}</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">Montaży do zaplanowania</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-2xl font-bold text-amber-600">{stats.totalDays}</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">Dni roboczych</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-2xl font-bold text-emerald-600">{stats.clustersCount}</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">Regionów</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-2xl font-bold text-red-500">{stats.unassigned}</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">Bez ekipy</p>
                </div>
            </div>

            {/* Cluster View */}
            {viewMode === 'clusters' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusters.map(cluster => {
                        const team = cluster.assignedTeamId ? teams.find(t => t.id === cluster.assignedTeamId) : null;
                        const isSelected = selectedCluster === cluster.id;

                        return (
                            <div
                                key={cluster.id}
                                onClick={() => setSelectedCluster(isSelected ? null : cluster.id)}
                                className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                                    isSelected ? 'border-indigo-400 shadow-md' : 'border-slate-100'
                                }`}
                            >
                                {/* Cluster Header */}
                                <div
                                    className="px-4 py-3 flex items-center justify-between"
                                    style={{ backgroundColor: cluster.color + '15', borderBottom: `2px solid ${cluster.color}30` }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: cluster.color }}
                                        />
                                        <h3 className="font-bold text-slate-800">
                                            Region {cluster.id + 1}
                                        </h3>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white text-slate-600 shadow-sm">
                                        {cluster.installations.length} montaży
                                    </span>
                                </div>

                                {/* Cluster Content */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Dni roboczych:</span>
                                        <span className="font-bold text-slate-700">{cluster.totalDays}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Trasa (est.):</span>
                                        <span className="font-bold text-slate-700">{cluster.distanceKm} km</span>
                                    </div>

                                    {/* Installations in cluster */}
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {cluster.installations.map((inst, idx) => (
                                            <div key={inst.id} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-700 truncate">{inst.client.firstName} {inst.client.lastName}</p>
                                                    <p className="text-slate-400 truncate">{inst.client.postalCode} {inst.client.city}</p>
                                                </div>
                                                {(inst.expectedDuration || 1) > 1 && (
                                                    <span className="text-[9px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded">{inst.expectedDuration}d</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Team Assignment */}
                                    <div className="pt-2 border-t border-slate-100">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Przypisz ekipę:</label>
                                        <select
                                            value={cluster.assignedTeamId || ''}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                if (e.target.value) assignTeamToCluster(cluster.id, e.target.value);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full text-sm p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        >
                                            <option value="">— Wybierz ekipę —</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        {team && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                                                <span className="text-xs text-emerald-600 font-medium">✅ {team.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Route View */}
            {viewMode === 'route' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-between">
                        <h2 className="text-white font-bold">
                            {selectedCluster !== null
                                ? `Optymalna trasa — Region ${selectedCluster + 1}`
                                : 'Wybierz region aby zobaczyć trasę'
                            }
                        </h2>
                        {selectedCluster !== null && (
                            <span className="text-white/80 text-sm">
                                {selectedRoute.length} punktów
                            </span>
                        )}
                    </div>

                    {/* Cluster selector */}
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
                        {clusters.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCluster(c.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                                    selectedCluster === c.id
                                        ? 'text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                                style={selectedCluster === c.id ? { backgroundColor: c.color } : {}}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                Region {c.id + 1} ({c.installations.length})
                            </button>
                        ))}
                    </div>

                    {selectedCluster !== null && selectedRoute.length > 0 ? (
                        <div className="p-6">
                            {/* Route Summary */}
                            <div className="mb-4 bg-indigo-50 rounded-xl p-4 flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-indigo-600">{selectedRoute.length}</p>
                                    <p className="text-[10px] text-indigo-400 uppercase">Punktów</p>
                                </div>
                                <div className="w-px h-8 bg-indigo-200" />
                                <div className="text-center">
                                    <p className="text-xl font-bold text-indigo-600">
                                        {clusters.find(c => c.id === selectedCluster)?.distanceKm || 0}
                                    </p>
                                    <p className="text-[10px] text-indigo-400 uppercase">Km (est.)</p>
                                </div>
                                <div className="w-px h-8 bg-indigo-200" />
                                <div className="text-center">
                                    <p className="text-xl font-bold text-indigo-600">
                                        {clusters.find(c => c.id === selectedCluster)?.totalDays || 0}
                                    </p>
                                    <p className="text-[10px] text-indigo-400 uppercase">Dni</p>
                                </div>
                                <div className="flex-1" />
                                <a
                                    href={`https://www.google.com/maps/dir/${selectedRoute.map(i => `${i.lat},${i.lng}`).join('/')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                    </svg>
                                    Otwórz w Google Maps
                                </a>
                            </div>

                            {/* Route Steps */}
                            <div className="space-y-0">
                                {selectedRoute.map((inst, idx) => (
                                    <div key={inst.id} className="flex items-stretch">
                                        {/* Timeline */}
                                        <div className="flex flex-col items-center mr-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                                                idx === 0 ? 'bg-emerald-500' : idx === selectedRoute.length - 1 ? 'bg-red-500' : 'bg-indigo-500'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            {idx < selectedRoute.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-4">
                                            <div className="bg-slate-50 rounded-xl p-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">
                                                            {inst.client.firstName} {inst.client.lastName}
                                                        </h4>
                                                        <p className="text-xs text-slate-500">{inst.client.address}</p>
                                                        <p className="text-xs text-slate-500">{inst.client.postalCode} {inst.client.city}</p>
                                                        {inst.productSummary && (
                                                            <p className="text-[10px] text-slate-400 mt-1">{inst.productSummary}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        {(inst.expectedDuration || 1) > 1 && (
                                                            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                {inst.expectedDuration}d
                                                            </span>
                                                        )}
                                                        {idx > 0 && (
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                +{haversineKm(selectedRoute[idx - 1].lat, selectedRoute[idx - 1].lng, inst.lat, inst.lng).toFixed(0)} km
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400 text-sm">
                            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Kliknij region powyżej aby zobaczyć optymalną trasę
                        </div>
                    )}
                </div>
            )}

            <p className="text-xs text-slate-400 text-center">
                * Trasa obliczona algorytmem nearest-neighbor. Odległości to szacunki w linii prostej. Otwórz w Google Maps aby uzyskać dokładną nawigację.
            </p>
        </div>
    );
};
