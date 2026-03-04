import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { ServiceService } from '../../services/database/service.service';
import { ContractService } from '../../services/database/contract.service';
import { DatabaseService } from '../../services/database';
import type { Contract, Customer, ServiceTicketType, ServiceTicketPriority } from '../../types';

interface AddServiceTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type SearchMode = 'contract' | 'client' | 'manual';

export const AddServiceTicketModal: React.FC<AddServiceTicketModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    // Form State
    const [type, setType] = useState<ServiceTicketType>('other');
    const [priority, setPriority] = useState<ServiceTicketPriority>('medium');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);

    // Search Mode
    const [searchMode, setSearchMode] = useState<SearchMode>('contract');

    // Contract Selection State
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [contractSearchQuery, setContractSearchQuery] = useState('');
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [showContractSuggestions, setShowContractSuggestions] = useState(false);
    const contractWrapperRef = useRef<HTMLDivElement>(null);

    // Client Selection State
    const [customers, setCustomers] = useState<{ customer: Customer; lastOfferDate: Date; offerCount: number }[]>([]);
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const clientWrapperRef = useRef<HTMLDivElement>(null);

    // Manual Entry State
    const [manualClientName, setManualClientName] = useState('');
    const [manualAddress, setManualAddress] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setType('other');
            setPriority('medium');
            setDescription('');
            setPhotos([]);
            setSelectedContract(null);
            setSelectedClient(null);
            setContractSearchQuery('');
            setClientSearchQuery('');
            setManualClientName('');
            setManualAddress('');
            setManualPhone('');
            setSearchMode('contract');
            fetchContracts();
            fetchCustomers();
        }
    }, [isOpen]);

    // Close suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (contractWrapperRef.current && !contractWrapperRef.current.contains(event.target as Node)) {
                setShowContractSuggestions(false);
            }
            if (clientWrapperRef.current && !clientWrapperRef.current.contains(event.target as Node)) {
                setShowClientSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchContracts = async () => {
        setLoadingContracts(true);
        try {
            const data = await ContractService.getContracts();
            setContracts(data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoadingContracts(false);
        }
    };

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const data = await DatabaseService.getUniqueCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotos(Array.from(e.target.files));
        }
    };

    const handleContractSelect = (contract: Contract) => {
        setSelectedContract(contract);
        setContractSearchQuery(`${contract.contractNumber} - ${contract.client.lastName}`);
        setShowContractSuggestions(false);
    };

    const handleClientSelect = (customer: Customer) => {
        setSelectedClient(customer);
        setClientSearchQuery(`${customer.firstName} ${customer.lastName} — ${customer.city}`);
        setShowClientSuggestions(false);
    };

    const handleModeSwitch = (mode: SearchMode) => {
        setSearchMode(mode);
        // Clear previous selection when switching mode
        setSelectedContract(null);
        setSelectedClient(null);
        setContractSearchQuery('');
        setClientSearchQuery('');
        setManualClientName('');
        setManualAddress('');
        setManualPhone('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            toast.error('Opis zgłoszenia jest wymagany');
            return;
        }

        // Validate based on mode
        if (searchMode === 'manual' && !manualClientName.trim()) {
            toast.error('Podaj nazwisko klienta');
            return;
        }

        setLoading(true);
        try {
            // Build description with manual client info if applicable
            let fullDescription = description;
            if (searchMode === 'manual') {
                const manualInfo = [
                    manualClientName && `Klient: ${manualClientName}`,
                    manualAddress && `Adres: ${manualAddress}`,
                    manualPhone && `Telefon: ${manualPhone}`
                ].filter(Boolean).join('\n');
                fullDescription = `${manualInfo}\n\n${description}`;
            }

            const { error } = await ServiceService.createTicket({
                type,
                priority,
                status: 'new',
                description: fullDescription,
                contractId: selectedContract?.id,
                clientId: selectedContract?.client?.id || selectedClient?.id || undefined,
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

    const filteredContracts = useMemo(() => {
        if (!contractSearchQuery) return [];
        const q = contractSearchQuery.toLowerCase();
        return contracts.filter(c =>
            c.contractNumber.toLowerCase().includes(q) ||
            c.client.lastName.toLowerCase().includes(q) ||
            c.client.companyName?.toLowerCase().includes(q)
        );
    }, [contractSearchQuery, contracts]);

    const filteredCustomers = useMemo(() => {
        if (!clientSearchQuery) return [];
        const q = clientSearchQuery.toLowerCase();
        return customers.filter(c =>
            c.customer.lastName.toLowerCase().includes(q) ||
            c.customer.firstName.toLowerCase().includes(q) ||
            c.customer.city.toLowerCase().includes(q) ||
            c.customer.phone.includes(clientSearchQuery)
        );
    }, [clientSearchQuery, customers]);

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

                    {/* Search Mode Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Źródło klienta</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('contract')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${searchMode === 'contract'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Po umowie
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('client')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${searchMode === 'client'
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Po kliencie
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('manual')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${searchMode === 'manual'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Manualnie
                            </button>
                        </div>
                    </div>

                    {/* Mode: Contract Search */}
                    {searchMode === 'contract' && (
                        <div className="relative" ref={contractWrapperRef}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Numer Umowy / Klient
                            </label>
                            {selectedContract ? (
                                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                    <div>
                                        <p className="font-medium text-blue-900">{selectedContract.contractNumber}</p>
                                        <p className="text-xs text-blue-700">
                                            {selectedContract.client.firstName} {selectedContract.client.lastName}
                                            {selectedContract.client.companyName ? ` (${selectedContract.client.companyName})` : ''}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedContract(null);
                                            setContractSearchQuery('');
                                        }}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={contractSearchQuery}
                                        onChange={(e) => {
                                            setContractSearchQuery(e.target.value);
                                            setShowContractSuggestions(true);
                                        }}
                                        onFocus={() => setShowContractSuggestions(true)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Wpisz numer umowy lub nazwisko..."
                                        disabled={loadingContracts}
                                    />
                                    {loadingContracts && <div className="absolute right-3 top-9 text-xs text-gray-400">Ładowanie...</div>}

                                    {showContractSuggestions && contractSearchQuery && (
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
                                </>
                            )}
                        </div>
                    )}

                    {/* Mode: Client Search */}
                    {searchMode === 'client' && (
                        <div className="relative" ref={clientWrapperRef}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Szukaj Klienta
                            </label>
                            {selectedClient ? (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <div>
                                        <p className="font-medium text-emerald-900">
                                            {selectedClient.firstName} {selectedClient.lastName}
                                        </p>
                                        <p className="text-xs text-emerald-700">
                                            {selectedClient.city}{selectedClient.street ? `, ${selectedClient.street}` : ''}
                                            {selectedClient.phone ? ` • ${selectedClient.phone}` : ''}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedClient(null);
                                            setClientSearchQuery('');
                                        }}
                                        className="text-emerald-500 hover:text-emerald-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={clientSearchQuery}
                                        onChange={(e) => {
                                            setClientSearchQuery(e.target.value);
                                            setShowClientSuggestions(true);
                                        }}
                                        onFocus={() => setShowClientSuggestions(true)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                                        placeholder="Nazwisko, miasto lub telefon..."
                                        disabled={loadingCustomers}
                                    />
                                    {loadingCustomers && <div className="absolute right-3 top-9 text-xs text-gray-400">Ładowanie...</div>}

                                    {showClientSuggestions && clientSearchQuery && (
                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                            {filteredCustomers.length > 0 ? (
                                                filteredCustomers.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleClientSelect(item.customer)}
                                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                    >
                                                        <div className="font-medium text-sm text-gray-900">
                                                            {item.customer.firstName} {item.customer.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {item.customer.city}{item.customer.street ? `, ${item.customer.street}` : ''}
                                                            {item.customer.phone ? ` • ${item.customer.phone}` : ''}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-gray-500">Brak wyników</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Mode: Manual Entry */}
                    {searchMode === 'manual' && (
                        <div className="space-y-3">
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-1">
                                <p className="text-sm text-orange-700">
                                    <span className="font-medium">✏️ Wpis ręczny</span> — dane klienta zostaną dołączone do opisu zgłoszenia
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko Klienta *</label>
                                <input
                                    type="text"
                                    value={manualClientName}
                                    onChange={(e) => setManualClientName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                                    placeholder="Jan Kowalski"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                                <input
                                    type="text"
                                    value={manualAddress}
                                    onChange={(e) => setManualAddress(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                                    placeholder="ul. Przykładowa 1, 00-000 Miasto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                                <input
                                    type="text"
                                    value={manualPhone}
                                    onChange={(e) => setManualPhone(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                                    placeholder="+48 123 456 789"
                                />
                            </div>
                        </div>
                    )}

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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        {loading ? 'Tworzenie...' : 'Utwórz Zgłoszenie'}
                    </button>
                </div>
            </div>
        </div>
    );
};
