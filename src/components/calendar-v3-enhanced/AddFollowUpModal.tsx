import React, { useState, useEffect } from 'react';
import { InstallationService } from '../../services/database/installation.service';
import { ContractService } from '../../services/database/contract.service';
import type { Installation } from '../../types';
import toast from 'react-hot-toast';

interface AddFollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

interface SourceOption {
    id: string;
    label: string;
    subtitle: string;
    type: 'installation' | 'manual';
    client?: {
        firstName: string;
        lastName: string;
        city: string;
        address: string;
        phone: string;
    };
    contractNumber?: string;
}

export const AddFollowUpModal: React.FC<AddFollowUpModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [mode, setMode] = useState<'existing' | 'manual'>('existing');
    const [searchQuery, setSearchQuery] = useState('');
    const [sources, setSources] = useState<SourceOption[]>([]);
    const [selectedSource, setSelectedSource] = useState<SourceOption | null>(null);
    const [loading, setLoading] = useState(false);

    // Manual mode fields
    const [clientName, setClientName] = useState('');
    const [clientCity, setClientCity] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [contractNumber, setContractNumber] = useState('');
    const [description, setDescription] = useState('');

    // Load existing installations for selection
    useEffect(() => {
        if (!isOpen) return;
        const loadSources = async () => {
            try {
                const installations = await InstallationService.getInstallations();
                // Show completed + scheduled installations as potential follow-up sources
                const options: SourceOption[] = installations
                    .filter(i => i.status === 'completed' || i.status === 'scheduled' || i.status === 'in_progress')
                    .map(i => ({
                        id: i.id,
                        label: i.client?.name || `${i.client?.firstName || ''} ${i.client?.lastName || ''}`.trim() || 'Brak klienta',
                        subtitle: [i.contractNumber, i.client?.city].filter(Boolean).join(' • '),
                        type: 'installation' as const,
                        client: i.client ? {
                            firstName: i.client.firstName || '',
                            lastName: i.client.lastName || '',
                            city: i.client.city || '',
                            address: i.client.address || '',
                            phone: i.client.phone || ''
                        } : undefined,
                        contractNumber: i.contractNumber
                    }));
                setSources(options);
            } catch (e) {
                console.error('Error loading sources:', e);
            }
        };
        loadSources();
    }, [isOpen]);

    const filteredSources = sources.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.label.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q);
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (mode === 'existing' && selectedSource) {
                // Create follow-up from existing installation
                await InstallationService.createManualFollowUp(
                    selectedSource.id,
                    description || 'Dokończenie montażu'
                );
            } else if (mode === 'manual') {
                if (!clientName.trim()) {
                    toast.error('Podaj nazwę klienta');
                    setLoading(false);
                    return;
                }
                // Create standalone manual follow-up
                await InstallationService.createStandaloneFollowUp({
                    clientName: clientName.trim(),
                    clientCity: clientCity.trim(),
                    clientAddress: clientAddress.trim(),
                    clientPhone: clientPhone.trim(),
                    contractNumber: contractNumber.trim(),
                    description: description.trim() || 'Dokończenie montażu'
                });
            }
            toast.success('Dokończenie dodane do zaplanowania');
            onCreated();
            onClose();
            // Reset
            setSelectedSource(null);
            setDescription('');
            setClientName('');
            setClientCity('');
            setClientAddress('');
            setClientPhone('');
            setContractNumber('');
            setSearchQuery('');
        } catch (e: any) {
            toast.error('Błąd: ' + (e.message || 'Nie udało się dodać'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
                    <h2 className="text-lg font-bold text-slate-800">🔄 Dodaj dokończenie</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Wybierz istniejący montaż lub dodaj ręcznie
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                    <button
                        onClick={() => setMode('existing')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${mode === 'existing' ? 'text-amber-700 bg-white' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Z istniejącego montażu
                        {mode === 'existing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${mode === 'manual' ? 'text-amber-700 bg-white' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Ręcznie
                        {mode === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {mode === 'existing' ? (
                        <>
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Szukaj klienta lub numer umowy..."
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Source List */}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {filteredSources.map(source => (
                                    <button
                                        key={source.id}
                                        onClick={() => setSelectedSource(source)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedSource?.id === source.id
                                                ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
                                                : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                                            }`}
                                    >
                                        <div className="font-medium text-sm text-slate-800">{source.label}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{source.subtitle || 'Brak danych'}</div>
                                    </button>
                                ))}
                                {filteredSources.length === 0 && (
                                    <div className="p-4 text-center text-sm text-slate-400">Brak wyników</div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Co trzeba dokończyć?</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="np. ZIP Screen, szyby przesuwne, poprawki..."
                                    rows={2}
                                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Manual client details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Nazwa klienta *</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        placeholder="Jan Kowalski"
                                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Miasto</label>
                                    <input
                                        type="text"
                                        value={clientCity}
                                        onChange={e => setClientCity(e.target.value)}
                                        placeholder="Warszawa"
                                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Nr umowy</label>
                                    <input
                                        type="text"
                                        value={contractNumber}
                                        onChange={e => setContractNumber(e.target.value)}
                                        placeholder="PL/001/01/2025"
                                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Adres</label>
                                    <input
                                        type="text"
                                        value={clientAddress}
                                        onChange={e => setClientAddress(e.target.value)}
                                        placeholder="ul. Przykładowa 10"
                                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                                    <input
                                        type="text"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        placeholder="+48 123 456 789"
                                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Co trzeba zamontować? *</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="np. ZIP Screen, szyby przesuwne, poprawki..."
                                    rows={2}
                                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400 resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex gap-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (mode === 'existing' && !selectedSource)}
                        className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Dodawanie...' : '🔄 Dodaj dokończenie'}
                    </button>
                </div>
            </div>
        </div>
    );
};
