import React, { useState, useEffect } from 'react';
import type { Customer, ProductConfig } from '../../../types';
import { DatabaseService } from '../../../services/database';
import { PricingService } from '../../../services/pricing.service';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface VisualizerOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    productConfig: ProductConfig;
    pricing: any; // Using any for simplicity as PricingResult needs import but structure is known
    imageUrl?: string; // Optional screenshot
}

export const VisualizerOfferModal: React.FC<VisualizerOfferModalProps> = ({
    isOpen,
    onClose,
    productConfig,
    pricing,
    imageUrl
}) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'search' | 'create'>('search');
    const [loading, setLoading] = useState(false);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // Create State
    const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        country: 'Deutschland',
        salutation: 'Herr'
    });

    // Fetch customers on mount
    useEffect(() => {
        if (isOpen) {
            loadCustomers();
        }
    }, [isOpen]);

    // Filter customers
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCustomers([]);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const filtered = customers.filter(c =>
            (c.lastName?.toLowerCase() || '').includes(lowerTerm) ||
            (c.firstName?.toLowerCase() || '').includes(lowerTerm) ||
            (c.companyName?.toLowerCase() || '').includes(lowerTerm) ||
            (c.phone || '').includes(searchTerm) ||
            (c.email?.toLowerCase() || '').includes(lowerTerm)
        ).slice(0, 5); // Limit to 5 results

        setFilteredCustomers(filtered);
    }, [searchTerm, customers]);

    const loadCustomers = async () => {
        try {
            const data = await DatabaseService.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load customers:', error);
            toast.error('Nie udało się załadować listy klientów');
        }
    };

    const handleSave = async () => {
        if (mode === 'search' && !selectedCustomer) {
            toast.error('Wybierz klienta z listy');
            return;
        }

        if (mode === 'create') {
            if (!newCustomer.lastName || !newCustomer.phone || !newCustomer.city) {
                toast.error('Wypełnij wymagane pola (Nazwisko, Telefon, Miasto)');
                return;
            }
        }

        setLoading(true);
        try {
            const customerToSave = mode === 'search' ? selectedCustomer! : newCustomer as Customer;

            // 1. If creating new, actually create/ensure it first? 
            // DatabaseService.createOffer calls ensureCustomer, so we can just pass the object
            // provided it matches the interface.

            // 2. Prepare Offer Object
            // Resolve Official Product Image from Database (Price List)
            let resolvedImageUrl = imageUrl;
            try {
                // Try to get official image for the product
                const officialImage = await PricingService.getProductImage(productConfig.modelId, {
                    roofType: productConfig.roofType
                });
                if (officialImage) {
                    resolvedImageUrl = officialImage;
                }
            } catch (err) {
                console.warn('Failed to resolve product image from DB:', err);
                // Fallback to screenshot (imageUrl) if provided, or null
            }

            // Update productConfig with resolved image (so it persists in offer.product)
            const offerProductConfig = {
                ...productConfig,
                imageUrl: resolvedImageUrl,
                numberOfPosts: pricing?.numberOfPosts,
                numberOfFields: pricing?.numberOfFields
            };

            // We need to fetch userId/role to calculate commission - encapsulated in createOffer?
            // createOffer does: const { data: { user } } = await supabase.auth.getUser();

            // We need to calculate commission "optimistically" or let backend do it?
            // createOffer takes an 'offer' object which includes 'commission'.
            // Simple approach: default 5%
            const commission = (pricing.sellingPriceNet || 0) * 0.05;

            const newOfferData: any = {
                // omit id, createdAt, etc.
                status: 'draft',
                customer: customerToSave,
                snowZone: { id: '1', value: 0.85, description: 'Strefa 1' }, // Default or passed? VisualizerConfig has snowZone usually
                product: offerProductConfig,
                pricing: pricing,
                commission: commission,
                settings: {
                    coverImage: resolvedImageUrl // Explicitly set cover image for PDF
                }
                // leadId? undefined
            };

            // Fix SnowZone if present in productConfig
            if (productConfig.snowZone) {
                // Map snowZone ID to object? Logic usually in ProductConfigurator
                // For simplicity assuming default or reusing what we have
                newOfferData.snowZone = { id: productConfig.snowZone, value: 0.85, description: `Strefa ${productConfig.snowZone}` };
            }

            const createdOffer = await DatabaseService.createOffer(newOfferData);

            toast.success('Oferta została utworzona!');
            onClose();
            // Redirect to offer details
            navigate('/offers');

            // Optionally open preview of that offer?
            // navigate(\`/offers?preview=\${createdOffer.id}\`);

        } catch (error: any) {
            console.error('Error creating offer:', error);
            toast.error(error.message || 'Błąd tworzenia oferty');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Zapisz Konfigurację jako Ofertę</h2>
                        <p className="text-sm text-slate-500">Przypisz konfigurację do klienta</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setMode('search')}
                        className={`flex - 1 py - 4 text - sm font - medium transition - colors border - b - 2 ${mode === 'search'
                            ? 'border-accent text-accent bg-accent/5'
                            : 'border-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        🔍 Istniejący Klient
                    </button>
                    <button
                        onClick={() => setMode('create')}
                        className={`flex - 1 py - 4 text - sm font - medium transition - colors border - b - 2 ${mode === 'create'
                            ? 'border-accent text-accent bg-accent/5'
                            : 'border-transparent text-slate-500 hover:bg-slate-50'
                            } `}
                    >
                        ➕ Nowy Klient
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">

                    {/* Summary Preview */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-800">Aktualna Konfiguracja</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {productConfig.width}x{productConfig.projection}mm • {productConfig.color}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500">Cena Netto</div>
                            <div className="font-bold text-lg text-accent">
                                {pricing?.sellingPriceNet?.toLocaleString('pl-PL', { style: 'currency', currency: 'EUR' })}
                            </div>
                        </div>
                    </div>

                    {mode === 'search' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Szukaj klienta</label>
                                <input
                                    type="text"
                                    placeholder="Nazwisko, firma, telefon..."
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Results */}
                            {filteredCustomers.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredCustomers.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedCustomer(c)}
                                            className={`p - 3 rounded - xl border cursor - pointer transition - all flex justify - between items - center ${selectedCustomer?.id === c.id
                                                ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                                : 'border-slate-100 hover:border-accent/50 hover:bg-slate-50'
                                                } `}
                                        >
                                            <div>
                                                <div className="font-bold text-slate-800">{c.firstName} {c.lastName}</div>
                                                <div className="text-xs text-slate-500">{c.companyName}</div>
                                            </div>
                                            <div className="text-right text-xs text-slate-500">
                                                <div>{c.city}</div>
                                                <div>{c.phone}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : searchTerm ? (
                                <div className="text-center py-8 text-slate-400">
                                    Brak wyników. Spróbuj wpisać inne dane lub dodaj nowego klienta.
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    Wpisz frazę aby wyszukać klienta...
                                </div>
                            )}

                            {selectedCustomer && (
                                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
                                    Wybrano: <strong>{selectedCustomer.firstName} {selectedCustomer.lastName}</strong>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={newCustomer.firstName}
                                    onChange={e => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazwisko *</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={newCustomer.lastName}
                                    onChange={e => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon *</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ulica i nr</label>
                                <div className="flex gap-2">
                                    <input
                                        className="w-full p-2 border border-slate-200 rounded-lg flex-grow"
                                        placeholder="Ulica"
                                        value={newCustomer.street}
                                        onChange={e => setNewCustomer({ ...newCustomer, street: e.target.value })}
                                    />
                                    <input
                                        className="w-24 p-2 border border-slate-200 rounded-lg"
                                        placeholder="Nr"
                                        value={newCustomer.houseNumber}
                                        onChange={e => setNewCustomer({ ...newCustomer, houseNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kod Pocztowy</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={newCustomer.postalCode}
                                    onChange={e => setNewCustomer({ ...newCustomer, postalCode: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Miasto *</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={newCustomer.city}
                                    onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-500 font-medium hover:bg-white hover:shadow-sm rounded-lg transition-all"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`px - 6 py - 2 bg - accent text - white font - bold rounded - lg hover: bg - accent / 90 shadow - lg shadow - accent / 20 transition - all flex items - center gap - 2 ${loading ? 'opacity-70 cursor-not-allowed' : ''} `}
                    >
                        {loading ? 'Zapisywanie...' : '💾 Zapisz Ofertę'}
                    </button>
                </div>
            </div>
        </div>
    );
};
