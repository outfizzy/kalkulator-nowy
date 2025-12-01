import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { geocodeAddress } from '../../utils/geocoding';
import type { Contract, Installation } from '../../types';
import { toast } from 'react-hot-toast';

interface ContractBulkSelectionPanelProps {
    onInstallationsCreated: () => void;
}

export const ContractBulkSelectionPanel: React.FC<ContractBulkSelectionPanelProps> = ({ onInstallationsCreated }) => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRegion, setFilterRegion] = useState('all');

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        setIsLoading(true);
        try {
            const data = await DatabaseService.getUnassignedContracts();
            setContracts(data);
        } catch (error) {
            console.error('Error loading contracts:', error);
            toast.error('Błąd ładowania umów');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredContracts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredContracts.map(c => c.id));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreateInstallations = async () => {
        if (selectedIds.length === 0) {
            toast.error('Wybierz minimum jedną umowę');
            return;
        }

        setIsCreating(true);
        try {
            // Create installations
            const createdInstallations = await DatabaseService.bulkCreateInstallations(selectedIds);

            if (createdInstallations.length === 0) {
                toast.error('Nie udało się utworzyć żadnych montaży');
                return;
            }

            toast.success(`Utworzono ${createdInstallations.length} montaży`);

            // Geocode addresses in background (rate limited)
            geocodeInBackground(createdInstallations);

            // Clear selection and reload
            setSelectedIds([]);
            await loadContracts();
            onInstallationsCreated();
        } catch (error) {
            console.error('Error creating installations:', error);
            toast.error('Błąd tworzenia montaży');
        } finally {
            setIsCreating(false);
        }
    };

    const geocodeInBackground = async (installations: Installation[]) => {
        let geocoded = 0;
        for (const inst of installations) {
            // Rate limit: 1 request per second
            await new Promise(resolve => setTimeout(resolve, 1000));

            const coords = await geocodeAddress(inst.client.address, inst.client.city);
            if (coords) {
                try {
                    await DatabaseService.updateInstallation(inst.id, {
                        client: {
                            ...inst.client,
                            coordinates: coords
                        }
                    });
                    geocoded++;
                } catch (error) {
                    console.error(`Error updating coordinates for ${inst.id}:`, error);
                }
            }
        }

        if (geocoded > 0) {
            toast.success(`Zaktualizowano współrzędne GPS dla ${geocoded} montaży`, { duration: 4000 });
        }
    };

    const getRegion = (city: string): string => {
        // Simple region extraction - can be enhanced with a proper mapping
        const wojewodztwa: Record<string, string[]> = {
            'Mazowieckie': ['warszawa', 'radom', 'płock', 'siedlce'],
            'Śląskie': ['katowice', 'sosnowiec', 'gliwice', 'bielsko-biała'],
            'Wielkopolskie': ['poznań', 'kalisz', 'konin', 'piła'],
            'Małopolskie': ['kraków', 'tarnów', 'nowy sącz'],
            'Dolnośląskie': ['wrocław', 'wałbrzych', 'legnica'],
            'Łódzkie': ['łódź', 'piotrków trybunalski'],
            'Zachodniopomorskie': ['szczecin', 'koszalin'],
            'Pomorskie': ['gdańsk', 'gdynia', 'sopot'],
        };

        const cityLower = city.toLowerCase();
        for (const [region, cities] of Object.entries(wojewodztwa)) {
            if (cities.some(c => cityLower.includes(c))) {
                return region;
            }
        }
        return 'Inne';
    };

    const filteredContracts = contracts.filter(c => {
        const matchesSearch = searchTerm === '' ||
            c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.client.city.toLowerCase().includes(searchTerm.toLowerCase());

        const region = getRegion(c.client.city);
        const matchesRegion = filterRegion === 'all' || region === filterRegion;

        return matchesSearch && matchesRegion;
    });

    const regions = ['all', ...new Set(contracts.map(c => getRegion(c.client.city)))];

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Podpisane Umowy bez Montażu</h2>
                <p className="text-sm text-slate-500">Wybierz umowy, aby utworzyć montaże</p>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 space-y-3">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Szukaj po numerze, nazwisku lub mieście..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <select
                        value={filterRegion}
                        onChange={(e) => setFilterRegion(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">Wszystkie regiony</option>
                        {regions.filter(r => r !== 'all').map(region => (
                            <option key={region} value={region}>{region}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === filteredContracts.length && filteredContracts.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                                Zaznacz wszystkie ({filteredContracts.length})
                            </span>
                        </label>
                        <span className="text-sm text-slate-500">
                            Wybrano: <span className="font-bold text-purple-600">{selectedIds.length}</span>
                        </span>
                    </div>

                    <button
                        onClick={handleCreateInstallations}
                        disabled={selectedIds.length === 0 || isCreating}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Tworzenie...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Utwórz Montaże ({selectedIds.length})
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Contract List */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-slate-500">Ładowanie umów...</p>
                        </div>
                    </div>
                ) : filteredContracts.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-slate-500 text-lg mb-1">Brak umów do wyświetlenia</p>
                        <p className="text-slate-400 text-sm">Wszystkie podpisane umowy mają już przypisane montaże</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredContracts.map(contract => {
                            const region = getRegion(contract.client.city);
                            const isSelected = selectedIds.includes(contract.id);

                            return (
                                <div
                                    key={contract.id}
                                    onClick={() => handleToggleSelect(contract.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                            ? 'border-purple-500 bg-purple-50 shadow-md'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelect(contract.id)}
                                            className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{contract.contractNumber}</h3>
                                                    <p className="text-sm text-slate-600">
                                                        {contract.client.firstName} {contract.client.lastName}
                                                    </p>
                                                </div>
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                                    {region}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Miasto:</span>
                                                    <span className="ml-2 font-medium text-slate-700">{contract.client.city}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Adres:</span>
                                                    <span className="ml-2 font-medium text-slate-700">
                                                        {contract.client.street} {contract.client.houseNumber}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Produkt:</span>
                                                    <span className="ml-2 font-medium text-slate-700">
                                                        {contract.product.modelId} {contract.product.width}x{contract.product.projection}mm
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Podpisano:</span>
                                                    <span className="ml-2 font-medium text-slate-700">
                                                        {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
