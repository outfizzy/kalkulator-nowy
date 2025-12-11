import React, { useState, useEffect } from 'react';
import { InstallationMap } from './InstallationMap';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';

export const PortfolioDashboard: React.FC = () => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [filteredInstallations, setFilteredInstallations] = useState<Installation[]>([]);
    const [searchLocation, setSearchLocation] = useState('');
    const [searchRadius, setSearchRadius] = useState(20); // km
    const [isSearching, setIsSearching] = useState(false);

    // Load ALL completed installations
    useEffect(() => {
        const loadData = async () => {
            try {
                const [allInst, allTeams] = await Promise.all([
                    DatabaseService.getInstallations(),
                    DatabaseService.getTeams()
                ]);

                // Filter only completed
                const completed = allInst.filter(i => i.status === 'completed' && i.client.coordinates);
                setInstallations(completed);
                setFilteredInstallations(completed);
                setTeams(allTeams);
            } catch (error) {
                console.error('Error loading portfolio:', error);
                toast.error('Błąd ładowania mapy referencyjnej');
            }
        };
        void loadData();
    }, []);

    const handleSearch = async () => {
        if (!searchLocation) {
            setFilteredInstallations(installations);
            return;
        }

        setIsSearching(true);
        try {
            const coords = await geocodeAddress(searchLocation);
            if (!coords) {
                toast.error('Nie znaleziono lokalizacji');
                setIsSearching(false);
                return;
            }

            // Client-side radius filtering
            // Haversine formula
            const R = 6371; // km
            const lat1 = coords.lat * Math.PI / 180;

            const nearby = installations.filter(inst => {
                const lat2 = inst.client.coordinates!.lat * Math.PI / 180;
                const dLat = (inst.client.coordinates!.lat - coords.lat) * Math.PI / 180;
                const dLon = (inst.client.coordinates!.lng - coords.lng) * Math.PI / 180;

                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c;

                return d <= searchRadius;
            });

            setFilteredInstallations(nearby);
            toast.success(`Znaleziono ${nearby.length} realizacji w pobliżu`);

        } catch (error) {
            console.error(error);
            toast.error('Błąd wyszukiwania');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header / Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-800">Mapa Realizacji (Portfolio)</h1>
                    <p className="text-sm text-slate-500">Pokaż klientowi nasze realizacje w okolicy</p>
                </div>

                <div className="flex gap-2 items-center w-full md:w-auto">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Kod pocztowy / Miasto</label>
                        <input
                            type="text"
                            value={searchLocation}
                            onChange={(e) => setSearchLocation(e.target.value)}
                            placeholder="np. 00-001 lub Warszawa"
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Promień (km)</label>
                        <input
                            type="number"
                            value={searchRadius}
                            onChange={(e) => setSearchRadius(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-dark transition-colors h-[38px] mt-auto"
                    >
                        {isSearching ? '...' : 'Szukaj'}
                    </button>
                    {searchLocation && (
                        <button
                            onClick={() => {
                                setSearchLocation('');
                                setFilteredInstallations(installations);
                            }}
                            className="text-slate-400 hover:text-red-500 p-2"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-1 relative min-h-[500px]">
                {filteredInstallations.length > 0 ? (
                    <InstallationMap
                        installations={filteredInstallations}
                        teams={teams}
                        selectedIds={[]}
                        onSelect={() => { }} // No selection needed
                        onEdit={() => { }} // Read only
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
                        Brak realizacji spełniających kryteria
                    </div>
                )}

                {/* Overlay Statistics */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200 z-[400]">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Widoczne Realizacje</div>
                    <div className="text-2xl font-bold text-accent">{filteredInstallations.length}</div>
                </div>
            </div>
        </div>
    );
};
