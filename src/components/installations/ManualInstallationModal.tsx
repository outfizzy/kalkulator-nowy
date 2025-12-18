import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Contract } from '../../types';

interface ManualInstallationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInstallationCreated: () => void;
}

export const ManualInstallationModal: React.FC<ManualInstallationModalProps> = ({ isOpen, onClose, onInstallationCreated }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allContracts, setAllContracts] = useState<Contract[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadContracts();
            setSearchTerm('');
            setResults([]);
        }
    }, [isOpen]);

    const loadContracts = async () => {
        setIsLoading(true);
        try {
            // Get all signed contracts that DON'T have an installation yet
            // Reusing the service method that does exactly this
            const contracts = await DatabaseService.getUnassignedContracts();
            setAllContracts(contracts);
        } catch (error) {
            console.error('Error loading contracts:', error);
            toast.error('Błąd ładowania umów');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = allContracts.filter(c => {
            const contractNumber = (c.contractNumber || '').toLowerCase();
            const lastName = (c.client.lastName || '').toLowerCase();
            const firstName = (c.client.firstName || '').toLowerCase();
            const city = (c.client.city || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();

            return (
                contractNumber.includes(term) ||
                lastName.includes(term) ||
                fullName.includes(term) ||
                city.includes(term)
            );
        });

        setResults(filtered);
    }, [searchTerm, allContracts]);

    const handleCreate = async (contract: Contract) => {
        try {
            await DatabaseService.createInstallation({
                offerId: contract.offerId,
                status: 'pending',
                client: {
                    firstName: contract.client.firstName,
                    lastName: contract.client.lastName,
                    city: contract.client.city,
                    address: `${contract.client.street} ${contract.client.houseNumber}`.trim(),
                    phone: contract.client.phone,
                    // Postal code is often needed for geocoding but address string above might be enough or we improve it
                },
                productSummary: `${contract.product.modelId} ${contract.product.width}x${contract.product.projection} mm`,
                notes: [
                    contract.requirements.constructionProject ? 'Projekt' : '',
                    contract.requirements.powerSupply ? 'Prąd' : '',
                    contract.requirements.foundation ? 'Fundament' : '',
                    contract.requirements.other
                ].filter(Boolean).join(', ')
            }); // Close createInstallation call

            toast.success('Utworzono zlecenie montażu');
            onInstallationCreated();
            onClose();
        } catch (error) {
            console.error('Error creating installation:', error);
            toast.error('Błąd tworzenia montażu');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Dodaj Montaż Ręcznie</h2>
                        <p className="text-xs text-slate-500">Wyszukaj podpisaną umowę bez montażu</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Wpisz numer umowy lub nazwisko klienta..."
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            autoFocus
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-500">Ładowanie umów...</div>
                        ) : searchTerm && results.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-500 font-medium">Nie znaleziono umów</p>
                                <p className="text-xs text-slate-400 mt-1">Upewnij się, że umowa jest podpisana i nie ma jeszcze montażu.</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="space-y-2">
                                {results.map(contract => (
                                    <div key={contract.id} className="p-3 border border-slate-200 rounded-lg hover:bg-purple-50 transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{contract.contractNumber}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Podpisana</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 mt-1">
                                                    {contract.client.firstName} {contract.client.lastName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {contract.client.city}, {contract.client.street}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Produkt: {contract.product.modelId}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleCreate(contract)}
                                                className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Wybierz
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                Wpisz frazę aby wyszukać umowę...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
