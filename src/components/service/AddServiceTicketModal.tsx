import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { ServiceService } from '../../services/database/service.service';
import { ContractService } from '../../services/database/contract.service';
import type { Contract, ServiceTicketType, ServiceTicketPriority } from '../../types';

interface AddServiceTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddServiceTicketModal: React.FC<AddServiceTicketModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [loadingContracts, setLoadingContracts] = useState(false);

    // Form State
    const [type, setType] = useState<ServiceTicketType>('other');
    const [priority, setPriority] = useState<ServiceTicketPriority>('medium');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);

    // Contract Selection State
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchContracts();
            // Reset form
            setType('other');
            setPriority('medium');
            setDescription('');
            setPhotos([]);
            setSelectedContract(null);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Close suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const fetchContracts = async () => {
        setLoadingContracts(true);
        try {
            const data = await ContractService.getContracts();
            setContracts(data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
            toast.error('Nie udało się pobrać listy umów');
        } finally {
            setLoadingContracts(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotos(Array.from(e.target.files));
        }
    };

    const handleContractSelect = (contract: Contract) => {
        setSelectedContract(contract);
        setSearchQuery(`${contract.contractNumber} - ${contract.client.lastName}`);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!description.trim()) {
            toast.error('Opis zgłoszenia jest wymagany');
            return;
        }

        // Ideally require contract or client, but maybe "Unlinked" tickets are allowed?
        // User asked "choose contract number". Let's assume it's preferred but maybe optional? 
        // Or if manual create, maybe we enforce it? 
        // Let's enforce it if user specifically asked for "choose contract".
        // But let's be flexible -> Warn if empty? no, let's just proceed.

        setLoading(true);
        try {
            const { error } = await ServiceService.createTicket({
                type,
                priority,
                status: 'new',
                description,
                contractId: selectedContract?.id,
                clientId: selectedContract?.client?.id || undefined,
                // Installation ID logic:
                // We'd need to find installation linked to this contract/offer.
                // ServiceService.verifyContract does this.
                // Or we can just let backend/trigger handle it? 
                // Or verify manually?
                // Let's do a quick verify call if contract selected to get installation ID?
                // Or just modify ServiceService.createTicket to handle finding installation if missing?
                // For MVP: Pass null for installationId unless found here.
                // Optimization: Just lookup installation matching this offer_id
            }, photos);

            if (error) throw error;

            toast.success('Zgłoszenie utworzone');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error('Błąd tworzenia zgłoszenia');
        } finally {
            setLoading(false);
        }
    };

    const filteredContracts = contracts.filter(c =>
        c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.client.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Nowe Zgłoszenie Serwisowe</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* Contract Search */}
                    <div className="relative" ref={wrapperRef}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Numer Umowy / Klient
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                                if (selectedContract && e.target.value !== selectedContract.contractNumber) {
                                    setSelectedContract(null); // Clear selection if typing
                                }
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            className={`w-full border ${!selectedContract && searchQuery ? 'border-yellow-300' : 'border-slate-200'} rounded-lg px-3 py-2 focus:border-accent outline-none`}
                            placeholder="Wpisz numer umowy lub nazwisko..."
                            disabled={loadingContracts}
                        />
                        {loadingContracts && <div className="absolute right-3 top-9 text-xs text-gray-400">Ładowanie...</div>}

                        {/* Suggestions Dropdown */}
                        {showSuggestions && searchQuery && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                {filteredContracts.length > 0 ? (
                                    filteredContracts.map(contract => (
                                        <div
                                            key={contract.id}
                                            onClick={() => handleContractSelect(contract)}
                                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                        >
                                            <div className="font-medium text-sm text-gray-900">{contract.contractNumber}</div>
                                            <div className="text-xs text-gray-500">
                                                {contract.client.firstName} {contract.client.lastName}
                                                {contract.client.companyName ? ` (${contract.client.companyName})` : ''}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-2 text-sm text-gray-500">Brak wyników</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Typ Zgłoszenia</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as ServiceTicketType)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none bg-white"
                            >
                                <option value="leak">Przeciek</option>
                                <option value="electrical">Elektryka</option>
                                <option value="mechanical">Mechanika</option>
                                <option value="visual">Wizualne</option>
                                <option value="other">Inne</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priorytet</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as ServiceTicketPriority)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none bg-white"
                            >
                                <option value="low">Niski</option>
                                <option value="medium">Średni</option>
                                <option value="high">Wysoki</option>
                                <option value="critical">Krytyczny</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Opis Problemu</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-accent outline-none min-h-[120px] resize-none"
                            placeholder="Opisz dokładnie problem..."
                        />
                    </div>

                    {/* Photos */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Zdjęcia / Załączniki</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-slate-500">Możesz dodać wiele zdjęć.</p>
                    </div>

                </form>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2"
                        // Note: Assuming 'bg-accent' exists in your tailwind config, otherwise use 'bg-blue-600'
                        style={{ backgroundColor: '#2563EB' }}
                    >
                        {loading ? 'Tworzenie...' : 'Utwórz Zgłoszenie'}
                    </button>
                </div>
            </div>
        </div>
    );
};
