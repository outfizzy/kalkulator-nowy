import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { CustomerSelector } from '../customers/CustomerSelector';
import type { Contract, Customer } from '../../types';

interface GCalEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { date?: string; dateTime?: string };
    end: { date?: string; dateTime?: string };
    colorId?: string;
    htmlLink?: string;
}

interface GCalEventActionModalProps {
    event: GCalEvent | null;
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    preSelectedTeamId?: string;
    preSelectedDate?: string;
}

/**
 * Parse a Google Calendar event title to extract client name and product.
 * Typical format: "KACPER - Lars Nitsche, Pergola Deluxe"
 * or: "Lingner - MPL 600x400"
 */
function parseEventTitle(summary: string): { clientName: string; product: string } {
    // Try "Name - Product" format
    const dashParts = summary.split(' - ');
    if (dashParts.length >= 2) {
        // First part could be crew name, second part is "Client, Product"
        const rest = dashParts.slice(1).join(' - ');
        const commaParts = rest.split(',').map(s => s.trim());
        if (commaParts.length >= 2) {
            return { clientName: commaParts[0], product: commaParts.slice(1).join(', ') };
        }
        return { clientName: rest, product: '' };
    }
    // Try "Name, Product" format
    const commaParts = summary.split(',').map(s => s.trim());
    if (commaParts.length >= 2) {
        return { clientName: commaParts[0], product: commaParts.slice(1).join(', ') };
    }
    return { clientName: summary, product: '' };
}

/**
 * Parse Google Calendar location to extract street, city, country
 * Example: "Fliederstraße 14, 14550 Groß Kreutz (Havel), Niemcy"
 */
function parseLocation(location: string): { street: string; city: string } {
    const parts = location.split(',').map(s => s.trim());
    if (parts.length >= 2) {
        const street = parts[0];
        // Second part often has postal code + city
        const cityMatch = parts[1].match(/^(\d{5})\s+(.+)$/);
        const city = cityMatch ? cityMatch[2] : parts[1];
        return { street, city };
    }
    return { street: location, city: '' };
}

function getEventDateStr(event: GCalEvent): string {
    return (event.start?.date || event.start?.dateTime || '').slice(0, 10);
}

export const GCalEventActionModal: React.FC<GCalEventActionModalProps> = ({
    event,
    isOpen,
    onClose,
    onCreated,
    preSelectedTeamId,
    preSelectedDate
}) => {
    const [mode, setMode] = useState<'contract' | 'manual'>('manual');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Contract[]>([]);
    const [allContracts, setAllContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    const [form, setForm] = useState({
        customerId: '',
        firstName: '',
        lastName: '',
        city: '',
        street: '',
        phone: '',
        product: '',
        notes: ''
    });

    // Parse event data when event changes
    useEffect(() => {
        if (!event || !isOpen) return;

        const parsed = parseEventTitle(event.summary || '');
        const loc = event.location ? parseLocation(event.location) : { street: '', city: '' };
        const eventDate = getEventDateStr(event);

        // Extract first/last name from client name
        const nameParts = parsed.clientName.split(/\s+/);
        const firstName = nameParts.length > 1 ? nameParts[0] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : parsed.clientName;

        setForm({
            customerId: '',
            firstName,
            lastName,
            city: loc.city,
            street: loc.street,
            phone: '',
            product: parsed.product || event.summary || '',
            notes: [
                event.description || '',
                eventDate ? `📅 Data z Google: ${eventDate}` : '',
                event.location ? `📍 ${event.location}` : ''
            ].filter(Boolean).join('\n')
        });

        // Pre-fill search with client last name
        setSearchTerm(lastName || parsed.clientName || '');
        setShowCustomerSearch(false);

        loadContracts();
    }, [event, isOpen]);

    const loadContracts = async () => {
        setIsLoading(true);
        try {
            const contracts = await DatabaseService.getUnassignedContracts();
            setAllContracts(contracts);
        } catch {
            setAllContracts([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter contracts by search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }
        const term = searchTerm.toLowerCase();
        setResults(allContracts.filter(c => {
            const num = (c.contractNumber || '').toLowerCase();
            const ln = (c.client.lastName || '').toLowerCase();
            const fn = (c.client.firstName || '').toLowerCase();
            const city = (c.client.city || '').toLowerCase();
            return num.includes(term) || ln.includes(term) || `${fn} ${ln}`.includes(term) || city.includes(term);
        }));
    }, [searchTerm, allContracts]);

    const handleCustomerSelect = (customer: Customer) => {
        setForm(prev => ({
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
        if (!event) return;
        try {
            const eventDate = preSelectedDate || getEventDateStr(event);
            await DatabaseService.createInstallation({
                offerId: contract.offerId,
                customerId: contract.client.id,
                status: eventDate ? 'scheduled' : 'pending',
                scheduledDate: eventDate || undefined,
                teamId: preSelectedTeamId || undefined,
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
                    event.description || '',
                    `📅 Z Google Calendar: ${event.summary}`
                ].filter(Boolean).join('\n')
            });
            toast.success('✅ Utworzono montaż z umowy (z GCal)');
            onCreated();
            onClose();
        } catch (error) {
            console.error('Error creating installation from GCal:', error);
            toast.error('Błąd tworzenia montażu');
        }
    };

    const handleManualCreate = async () => {
        if (!event) return;
        if (!form.lastName || !form.product) {
            toast.error('Wypełnij: Nazwisko i Produkt');
            return;
        }

        try {
            const eventDate = preSelectedDate || getEventDateStr(event);
            await DatabaseService.createManualInstallation({
                title: form.product,
                client: {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    city: form.city,
                    address: form.street,
                    phone: form.phone
                },
                description: [form.product, form.notes].filter(Boolean).join('\n'),
                sourceType: 'manual',
                teamId: preSelectedTeamId || undefined,
                scheduledDate: eventDate || undefined,
                status: eventDate ? 'scheduled' : 'pending'
            });

            toast.success('✅ Utworzono montaż (z Google Calendar)');
            onCreated();
            onClose();
        } catch (error) {
            console.error('Error manual create from GCal:', error);
            toast.error('Błąd tworzenia montażu');
        }
    };

    if (!isOpen || !event) return null;

    const eventDate = getEventDateStr(event);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header with event info */}
                <div className="p-4 bg-gradient-to-r from-sky-600 to-sky-500 text-white relative">
                    <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📅</span>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">Google Calendar</span>
                        {preSelectedTeamId && (
                            <span className="text-xs font-medium bg-emerald-400/30 px-2 py-0.5 rounded-full">→ Przypisz do ekipy</span>
                        )}
                    </div>
                    <h2 className="text-lg font-bold leading-tight pr-8">{event.summary}</h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-white/80">
                        {eventDate && (
                            <span className="flex items-center gap-1">
                                <span>📅</span> {eventDate}
                            </span>
                        )}
                        {event.location && (
                            <span className="flex items-center gap-1 truncate max-w-[250px]">
                                <span>📍</span> {event.location}
                            </span>
                        )}
                    </div>
                    {event.description && (
                        <div className="mt-2 text-xs text-white/70 bg-white/10 rounded-lg p-2 max-h-[60px] overflow-y-auto whitespace-pre-line leading-relaxed">
                            {event.description}
                        </div>
                    )}
                </div>

                {/* Mode tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setMode('contract')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'contract'
                            ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        🔗 Połącz z umową
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'manual'
                            ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        ✏️ Utwórz ręcznie
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {mode === 'contract' ? (
                        <>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Szukaj umowy (nr, nazwisko, miasto)..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                                    autoFocus
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                                {isLoading ? (
                                    <div className="text-center py-6 text-slate-500 text-sm">Ładowanie umów...</div>
                                ) : searchTerm && results.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-slate-400 text-sm">Nie znaleziono umów dla „{searchTerm}"</p>
                                        <button
                                            onClick={() => setMode('manual')}
                                            className="mt-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
                                        >
                                            → Utwórz ręcznie
                                        </button>
                                    </div>
                                ) : results.length > 0 ? (
                                    results.map(contract => (
                                        <div key={contract.id} className="p-3 border border-slate-200 rounded-lg hover:bg-sky-50 transition-colors group cursor-pointer"
                                            onClick={() => handleCreateFromContract(contract)}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-sm">{contract.contractNumber}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Podpisana</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700">{contract.client.firstName} {contract.client.lastName}</p>
                                                    <p className="text-xs text-slate-500">{contract.client.city}, {contract.client.street}</p>
                                                </div>
                                                <span className="text-sky-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Wybierz →
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-sm">
                                        Wpisz frazę aby wyszukać umowę...
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            {/* Customer selector */}
                            {!showCustomerSearch && !form.customerId && (
                                <button
                                    onClick={() => setShowCustomerSearch(true)}
                                    className="w-full py-2 border border-sky-200 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    👤 Wyszukaj klienta z bazy
                                </button>
                            )}

                            {showCustomerSearch ? (
                                <CustomerSelector
                                    onSelect={handleCustomerSelect}
                                    onCancel={() => setShowCustomerSearch(false)}
                                />
                            ) : (
                                <>
                                    {form.customerId && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex justify-between items-center">
                                            <span className="text-sm text-green-800 font-medium">✅ Klient połączony</span>
                                            <button
                                                onClick={() => setForm(prev => ({ ...prev, customerId: '' }))}
                                                className="text-xs text-red-500 hover:text-red-700"
                                            >Odłącz</button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Imię</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-lg text-sm"
                                                value={form.firstName}
                                                onChange={e => setForm({ ...form, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Nazwisko *</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-lg text-sm"
                                                value={form.lastName}
                                                onChange={e => setForm({ ...form, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Miasto</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-lg text-sm"
                                                value={form.city}
                                                onChange={e => setForm({ ...form, city: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Ulica</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded-lg text-sm"
                                                value={form.street}
                                                onChange={e => setForm({ ...form, street: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-lg text-sm"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Produkt / Opis *</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-lg text-sm"
                                            value={form.product}
                                            onChange={e => setForm({ ...form, product: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Notatki z GCal</label>
                                        <textarea
                                            className="w-full p-2 border rounded-lg text-sm h-20"
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        onClick={handleManualCreate}
                                        className="w-full py-2.5 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors text-sm"
                                    >
                                        ✅ Utwórz montaż
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
