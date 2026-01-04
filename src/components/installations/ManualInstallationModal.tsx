import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Contract, Customer } from '../../types';
import { CustomerSelector } from '../customers/CustomerSelector';

interface ManualInstallationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInstallationCreated: () => void;
}

export const ManualInstallationModal: React.FC<ManualInstallationModalProps> = ({ isOpen, onClose, onInstallationCreated }) => {
    const [mode, setMode] = useState<'contract' | 'manual'>('contract');

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allContracts, setAllContracts] = useState<Contract[]>([]);

    // Manual Form State
    const [manualForm, setManualForm] = useState({
        customerId: '',
        firstName: '',
        lastName: '',
        city: '',
        street: '',
        phone: '',
        product: '',
        notes: ''
    });

    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadContracts();
            setSearchTerm('');
            setResults([]);
            setMode('contract'); // Reset to default
            setManualForm({ customerId: '', firstName: '', lastName: '', city: '', street: '', phone: '', product: '', notes: '' });
            setShowCustomerSearch(false);
        }
    }, [isOpen]);

    const loadContracts = async () => {
        setIsLoading(true);
        try {
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

    const handleCustomerSelect = (customer: Customer) => {
        setManualForm((prev: typeof manualForm) => ({
            ...prev,
            customerId: customer.id || '',
            firstName: customer.firstName,
            lastName: customer.lastName,
            city: customer.city,
            street: `${customer.street} ${customer.houseNumber}`.trim(),
            phone: customer.phone,
        }));
        setShowCustomerSearch(false);
        toast.success('Pobrano dane klienta');
    };

    const handleCreateFromContract = async (contract: Contract) => {
        try {
            await DatabaseService.createInstallation({
                offerId: contract.offerId,
                customerId: contract.client.id, // Try to link if we have ID
                status: 'pending',
                sourceType: 'contract',
                client: {
                    firstName: contract.client.firstName,
                    lastName: contract.client.lastName,
                    city: contract.client.city,
                    address: `${contract.client.street} ${contract.client.houseNumber}`.trim(),
                    phone: contract.client.phone,
                },
                productSummary: `${contract.product.modelId} ${contract.product.width}x${contract.product.projection} mm`,
                notes: [
                    contract.requirements.constructionProject ? 'Projekt' : '',
                    contract.requirements.powerSupply ? 'Prąd' : '',
                    contract.requirements.foundation ? 'Fundament' : '',
                    contract.requirements.other
                ].filter(Boolean).join(', ')
            });

            toast.success('Utworzono zlecenie montażu');
            onInstallationCreated();
            onClose();
        } catch (error) {
            console.error('Error creating installation:', error);
            toast.error('Błąd tworzenia montażu');
        }
    };

    const handleManualCreate = async () => {
        if (!manualForm.lastName || !manualForm.city || !manualForm.product) {
            toast.error('Wypełnij wymagane pola (Nazwisko, Miasto, Produkt)');
            return;
        }

        try {
            await DatabaseService.createManualInstallation({
                title: manualForm.product,
                client: {
                    firstName: manualForm.firstName,
                    lastName: manualForm.lastName,
                    city: manualForm.city,
                    address: manualForm.street,
                    phone: manualForm.phone
                },
                description: manualForm.notes
                    ? `${manualForm.product}\n${manualForm.notes}`
                    : manualForm.product,
                sourceType: 'manual'
            });

            toast.success('Utworzono montaż ręczny');
            onInstallationCreated();
            onClose();
        } catch (error) {
            console.error('Error creating manual installation:', error);
            toast.error('Błąd zapisu');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Nowy Montaż</h2>
                        <p className="text-xs text-slate-500">Dodaj z umowy lub wpisz ręcznie</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setMode('contract')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'contract' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Z Umowy
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'manual' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Wpisz Ręcznie
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    {mode === 'contract' ? (
                        <>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Szukaj umowy (nr, nazwisko, miasto)..."
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    autoFocus
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto">
                                {isLoading ? (
                                    <div className="text-center py-8 text-slate-500">Ładowanie umów...</div>
                                ) : searchTerm && results.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 font-medium">Nie znaleziono umów</p>
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
                                                            {contract.product.modelId} ({contract.product.width}x{contract.product.projection})
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCreateFromContract(contract)}
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
                        </>
                    ) : (
                        <div className="space-y-4">
                            {/* Connect with Customer */}
                            {!showCustomerSearch && !manualForm.customerId && (
                                <button
                                    onClick={() => setShowCustomerSearch(true)}
                                    className="w-full py-2 mb-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Wybierz klienta z bazy (auto-uzupełnianie)
                                </button>
                            )}

                            {showCustomerSearch ? (
                                <CustomerSelector
                                    onSelect={handleCustomerSelect}
                                    onCancel={() => setShowCustomerSearch(false)}
                                />
                            ) : (
                                <>
                                    {manualForm.customerId && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center mb-2">
                                            <span className="text-sm text-green-800 font-medium flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Połączono z klientem
                                            </span>
                                            <button
                                                onClick={() => setManualForm((prev: typeof manualForm) => ({ ...prev, customerId: '' }))}
                                                className="text-xs text-red-500 hover:text-red-700 underline"
                                            >
                                                Odłącz
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Imię</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-md"
                                                value={manualForm.firstName}
                                                onChange={e => setManualForm({ ...manualForm, firstName: e.target.value })}
                                                placeholder="Jan"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Nazwisko *</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-md"
                                                value={manualForm.lastName}
                                                onChange={e => setManualForm({ ...manualForm, lastName: e.target.value })}
                                                placeholder="Kowalski"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Miasto *</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-md"
                                                value={manualForm.city}
                                                onChange={e => setManualForm({ ...manualForm, city: e.target.value })}
                                                placeholder="Warszawa"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Ulica i numer</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-md"
                                                value={manualForm.street}
                                                onChange={e => setManualForm({ ...manualForm, street: e.target.value })}
                                                placeholder="Polna 12"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Telefon</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-md"
                                            value={manualForm.phone}
                                            onChange={e => setManualForm({ ...manualForm, phone: e.target.value })}
                                            placeholder="+48..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Produkt / Opis *</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-md"
                                            value={manualForm.product}
                                            onChange={e => setManualForm({ ...manualForm, product: e.target.value })}
                                            placeholder="np. Pergola Tarasowa 4x3m"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Notatki</label>
                                        <textarea
                                            className="w-full p-2 border rounded-md h-20 text-sm"
                                            value={manualForm.notes}
                                            onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                                            placeholder="Dodatkowe informacje dla ekipy..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleManualCreate}
                                        className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Utwórz Montaż
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

