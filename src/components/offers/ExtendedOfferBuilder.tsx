/**
 * ExtendedOfferBuilder - Rozszerzony kreator ofert z obsługą wielu dostawców
 * 
 * Ten komponent rozszerza główny konfigurator o:
 * - Wybór dostawcy na początku (Aluxe, Deponti, Selt, Aliplast)
 * - Możliwość dodawania wielu produktów do jednej oferty
 * - Wspólny koszyk ofertowy z podsumowaniem
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ProductConfigurator } from '../ProductConfigurator';
import { calculatePrice } from '../../utils/pricing';
import type { ProductConfig, SnowZoneInfo } from '../../types';

// ========== TYPES ==========

interface OfferItem {
    id: string;
    supplier: 'aluxe' | 'deponti' | 'selt' | 'aliplast' | 'other';
    productName: string;
    description: string;
    config?: ProductConfig; // Pełna konfiguracja dla Aluxe
    width?: number;
    depth?: number;
    color?: string;
    purchasePrice: number;
    sellingPrice: number;
}

interface CustomerData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postalCode: string;
}

// ========== CONSTANTS ==========

const SUPPLIERS = [
    {
        id: 'aluxe',
        name: 'Aluxe',
        description: 'Pełny konfigurator z cenami',
        icon: '🏠',
        color: 'from-orange-500 to-orange-600'
    },
    {
        id: 'deponti',
        name: 'Deponti',
        description: 'Gotowe produkty',
        icon: '🏡',
        color: 'from-purple-500 to-purple-600'
    },
    {
        id: 'selt',
        name: 'Selt',
        description: 'Zewnętrzny konfigurator',
        icon: '🔗',
        color: 'from-blue-500 to-blue-600'
    },
    {
        id: 'aliplast',
        name: 'Aliplast',
        description: 'Zewnętrzny konfigurator',
        icon: '🔗',
        color: 'from-green-500 to-green-600'
    },
];

const DEPONTI_PRODUCTS = {
    zadaszenia: [
        { id: 'nebbiolo', name: 'Nebbiolo' },
        { id: 'bosco', name: 'Bosco' },
        { id: 'ribolla', name: 'Ribolla' },
        { id: 'pigato', name: 'Pigato' },
        { id: 'pigato-plus', name: 'Pigato Plus' },
        { id: 'giallo', name: 'Giallo' },
        { id: 'giallo-plus', name: 'Giallo Plus' },
        { id: 'trebbiano', name: 'Trebbiano' },
        { id: 'verdeca', name: 'Verdeca' },
    ],
    pinela: [
        { id: 'pinela', name: 'Pinela' },
        { id: 'pinela-deluxe', name: 'Pinela Deluxe' },
        { id: 'pinela-glass', name: 'Pinela Glass' },
        { id: 'pinela-deluxe-plus', name: 'Pinela Deluxe Plus' },
    ]
};

const EXTERNAL_URLS = {
    selt: 'https://www.sfrpolska.pl/',
    aliplast: 'https://aliplast.com.pl/'
};

// ========== MAIN COMPONENT ==========

export const ExtendedOfferBuilder: React.FC = () => {
    const navigate = useNavigate();

    // Core state
    const [activeSupplier, setActiveSupplier] = useState<string | null>(null);
    const [items, setItems] = useState<OfferItem[]>([]);
    const [showAluxeConfigurator, setShowAluxeConfigurator] = useState(false);
    const [customer, setCustomer] = useState<CustomerData>({
        firstName: '', lastName: '', email: '', phone: '',
        street: '', city: '', postalCode: ''
    });

    // Manual entry state (for Deponti, Selt, Aliplast)
    const [manualEntry, setManualEntry] = useState({
        productName: '',
        description: '',
        width: 0,
        depth: 0,
        color: '',
        purchasePrice: 0,
        sellingPrice: 0
    });

    const [depontiCategory, setDepontiCategory] = useState<'zadaszenia' | 'pinela'>('zadaszenia');

    // Calculations
    const totals = useMemo(() => {
        const purchase = items.reduce((sum, i) => sum + i.purchasePrice, 0);
        const selling = items.reduce((sum, i) => sum + i.sellingPrice, 0);
        const margin = selling - purchase;
        const marginPercent = selling > 0 ? ((margin / selling) * 100) : 0;
        return { purchase, selling, margin, marginPercent };
    }, [items]);

    // ========== HANDLERS ==========

    const handleAluxeComplete = (config: ProductConfig) => {
        // When Aluxe configurator completes, calculate price and add to items
        const snowZone: SnowZoneInfo = { id: '2', value: 90, description: 'Strefa 2' };
        const pricing = calculatePrice(config, 0.35, snowZone);

        const modelNames: Record<string, string> = {
            'orangestyle': 'Orangestyle',
            'trendstyle': 'Trendstyle',
            'trendstyle_plus': 'Trendstyle Plus',
            'topstyle': 'Topstyle',
            'topstyle_xl': 'Topstyle XL',
            'skystyle': 'Skystyle'
        };

        const item: OfferItem = {
            id: crypto.randomUUID(),
            supplier: 'aluxe',
            productName: modelNames[config.modelId] || config.modelId,
            description: `${config.width}x${config.projection}mm, ${config.roofType === 'glass' ? 'Szkło' : 'Poliwęglan'}, ${config.color}`,
            config,
            width: config.width,
            depth: config.projection,
            color: config.color,
            purchasePrice: Math.round(pricing.totalCost),
            sellingPrice: Math.round(pricing.sellingPriceNet)
        };

        setItems([...items, item]);
        setShowAluxeConfigurator(false);
        setActiveSupplier(null);
        toast.success(`Dodano ${item.productName} do oferty`);
    };

    const handleAddManualItem = () => {
        if (!manualEntry.productName || !manualEntry.sellingPrice) {
            toast.error('Wypełnij nazwę produktu i cenę sprzedaży');
            return;
        }

        const item: OfferItem = {
            id: crypto.randomUUID(),
            supplier: activeSupplier as OfferItem['supplier'],
            productName: manualEntry.productName,
            description: manualEntry.description,
            width: manualEntry.width || undefined,
            depth: manualEntry.depth || undefined,
            color: manualEntry.color || undefined,
            purchasePrice: manualEntry.purchasePrice,
            sellingPrice: manualEntry.sellingPrice
        };

        setItems([...items, item]);
        setManualEntry({
            productName: '',
            description: '',
            width: 0,
            depth: 0,
            color: '',
            purchasePrice: 0,
            sellingPrice: 0
        });
        toast.success('Dodano pozycję do oferty');
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
        toast.success('Usunięto pozycję');
    };

    const handleSave = () => {
        if (items.length === 0) {
            toast.error('Dodaj przynajmniej jedną pozycję');
            return;
        }
        // TODO: Implement save to database
        toast.success('Oferta zapisana (demo)');
        console.log('Offer:', { customer, items, totals });
    };

    // ========== RENDER ==========

    // If Aluxe configurator is active, show it fullscreen
    if (showAluxeConfigurator) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowAluxeConfigurator(false)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                            >
                                ← Anuluj
                            </button>
                            <div>
                                <h2 className="font-bold text-lg">Konfiguracja Aluxe</h2>
                                <p className="text-sm text-slate-500">Po zakończeniu produkt zostanie dodany do oferty</p>
                            </div>
                        </div>
                        <div className="bg-accent/10 px-4 py-2 rounded-lg">
                            <span className="text-sm text-slate-500">Pozycje w ofercie: </span>
                            <span className="font-bold text-accent">{items.length}</span>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <ProductConfigurator onComplete={handleAluxeComplete} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">📋 Rozszerzony Kreator Ofert</h1>
                        <p className="text-slate-500">Twórz oferty z produktów różnych dostawców</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                        ← Powrót do Panelu
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Supplier Selection */}
                        {!activeSupplier && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold mb-6">Wybierz Dostawcę</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {SUPPLIERS.map(supplier => (
                                        <button
                                            key={supplier.id}
                                            onClick={() => {
                                                setActiveSupplier(supplier.id);
                                                if (supplier.id === 'aluxe') {
                                                    setShowAluxeConfigurator(true);
                                                }
                                            }}
                                            className={`p-6 rounded-xl bg-gradient-to-br ${supplier.color} text-white text-left hover:scale-105 transition-transform shadow-lg`}
                                        >
                                            <span className="text-3xl mb-2 block">{supplier.icon}</span>
                                            <div className="font-bold text-lg">{supplier.name}</div>
                                            <div className="text-sm opacity-80">{supplier.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Deponti Form */}
                        {activeSupplier === 'deponti' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <span className="text-2xl">🏡</span> Produkty Deponti
                                    </h2>
                                    <button
                                        onClick={() => setActiveSupplier(null)}
                                        className="text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        ← Zmień dostawcę
                                    </button>
                                </div>

                                {/* Category tabs */}
                                <div className="flex gap-2 mb-6">
                                    <button
                                        onClick={() => setDepontiCategory('zadaszenia')}
                                        className={`px-4 py-2 rounded-lg font-bold ${depontiCategory === 'zadaszenia'
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        Zadaszenia
                                    </button>
                                    <button
                                        onClick={() => setDepontiCategory('pinela')}
                                        className={`px-4 py-2 rounded-lg font-bold ${depontiCategory === 'pinela'
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        Pinela
                                    </button>
                                </div>

                                {/* Product grid */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {DEPONTI_PRODUCTS[depontiCategory].map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => setManualEntry({ ...manualEntry, productName: product.name })}
                                            className={`p-3 rounded-lg border-2 text-left ${manualEntry.productName === product.name
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-slate-200 hover:border-purple-300'
                                                }`}
                                        >
                                            <div className="font-bold">{product.name}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Configuration form */}
                                {manualEntry.productName && (
                                    <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                                        <h3 className="font-bold">{manualEntry.productName}</h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Szerokość (mm)</label>
                                                <input
                                                    type="number"
                                                    value={manualEntry.width || ''}
                                                    onChange={e => setManualEntry({ ...manualEntry, width: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Głębokość (mm)</label>
                                                <input
                                                    type="number"
                                                    value={manualEntry.depth || ''}
                                                    onChange={e => setManualEntry({ ...manualEntry, depth: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Kolor</label>
                                            <input
                                                type="text"
                                                value={manualEntry.color}
                                                onChange={e => setManualEntry({ ...manualEntry, color: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="np. RAL 7016"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Opis / Dodatki</label>
                                            <textarea
                                                value={manualEntry.description}
                                                onChange={e => setManualEntry({ ...manualEntry, description: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                                rows={2}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Cena Zakupu (EUR)</label>
                                                <input
                                                    type="number"
                                                    value={manualEntry.purchasePrice || ''}
                                                    onChange={e => setManualEntry({ ...manualEntry, purchasePrice: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Cena Sprzedaży (EUR)</label>
                                                <input
                                                    type="number"
                                                    value={manualEntry.sellingPrice || ''}
                                                    onChange={e => setManualEntry({ ...manualEntry, sellingPrice: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg font-bold"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAddManualItem}
                                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                                        >
                                            ➕ Dodaj do Oferty
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selt / Aliplast Form */}
                        {(activeSupplier === 'selt' || activeSupplier === 'aliplast') && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <span className="text-2xl">🔗</span> {activeSupplier === 'selt' ? 'Selt' : 'Aliplast'}
                                    </h2>
                                    <button
                                        onClick={() => setActiveSupplier(null)}
                                        className="text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        ← Zmień dostawcę
                                    </button>
                                </div>

                                {/* External link */}
                                <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold">Otwórz zewnętrzny konfigurator</div>
                                        <div className="text-sm text-slate-500">{EXTERNAL_URLS[activeSupplier as keyof typeof EXTERNAL_URLS]}</div>
                                    </div>
                                    <a
                                        href={EXTERNAL_URLS[activeSupplier as keyof typeof EXTERNAL_URLS]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                                    >
                                        Otwórz ↗
                                    </a>
                                </div>

                                {/* Manual entry form */}
                                <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                                    <h3 className="font-bold">Dodaj produkt ręcznie</h3>
                                    <p className="text-sm text-slate-500">Skonfiguruj produkt w zewnętrznym konfiguratorze, a następnie wpisz dane poniżej.</p>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nazwa Produktu</label>
                                        <input
                                            type="text"
                                            value={manualEntry.productName}
                                            onChange={e => setManualEntry({ ...manualEntry, productName: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="np. Pergola SR3500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Specyfikacja</label>
                                        <textarea
                                            value={manualEntry.description}
                                            onChange={e => setManualEntry({ ...manualEntry, description: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            rows={2}
                                            placeholder="np. 4000x3000mm, RAL 7016, LED..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Cena Zakupu (EUR)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.purchasePrice || ''}
                                                onChange={e => setManualEntry({ ...manualEntry, purchasePrice: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Cena Sprzedaży (EUR)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.sellingPrice || ''}
                                                onChange={e => setManualEntry({ ...manualEntry, sellingPrice: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg font-bold"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddManualItem}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                                    >
                                        ➕ Dodaj do Oferty
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Items List */}
                        {items.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="text-2xl">📦</span> Pozycje Oferty ({items.length})
                                </h2>

                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold">{item.productName}</div>
                                                <div className="text-sm text-slate-500">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${item.supplier === 'aluxe' ? 'bg-orange-100 text-orange-700' :
                                                            item.supplier === 'deponti' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {item.supplier.toUpperCase()}
                                                    </span>
                                                    {item.description}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-400">Zakup: {item.purchasePrice.toLocaleString()} €</div>
                                                <div className="font-bold text-lg text-accent">{item.sellingPrice.toLocaleString()} €</div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Customer Data & Actions */}
                        {items.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="text-2xl">👤</span> Dane Klienta
                                </h2>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Imię</label>
                                        <input
                                            type="text"
                                            value={customer.firstName}
                                            onChange={e => setCustomer({ ...customer, firstName: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nazwisko</label>
                                        <input
                                            type="text"
                                            value={customer.lastName}
                                            onChange={e => setCustomer({ ...customer, lastName: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={customer.email}
                                            onChange={e => setCustomer({ ...customer, email: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Telefon</label>
                                        <input
                                            type="tel"
                                            value={customer.phone}
                                            onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">Ulica</label>
                                        <input
                                            type="text"
                                            value={customer.street}
                                            onChange={e => setCustomer({ ...customer, street: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Miasto</label>
                                        <input
                                            type="text"
                                            value={customer.city}
                                            onChange={e => setCustomer({ ...customer, city: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Kod pocztowy</label>
                                        <input
                                            type="text"
                                            value={customer.postalCode}
                                            onChange={e => setCustomer({ ...customer, postalCode: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700"
                                    >
                                        💾 Zapisz Ofertę
                                    </button>
                                    <button
                                        onClick={() => toast('Generowanie PDF... (demo)')}
                                        className="flex-1 py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent-dark"
                                    >
                                        📄 Generuj PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
                            <h3 className="font-bold text-lg mb-4">📊 Podsumowanie</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Pozycje:</span>
                                    <span className="font-bold">{items.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Suma Zakupu:</span>
                                    <span className="font-bold">{totals.purchase.toLocaleString()} €</span>
                                </div>
                                <hr />
                                <div className="flex justify-between">
                                    <span className="font-bold">Suma Sprzedaży:</span>
                                    <span className="font-bold text-xl text-accent">{totals.selling.toLocaleString()} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Marża:</span>
                                    <span className={`font-bold ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {totals.margin.toLocaleString()} € ({totals.marginPercent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Mini items list */}
                            {items.length > 0 && (
                                <div className="border-t pt-4">
                                    <div className="text-xs font-bold text-slate-500 mb-2">POZYCJE:</div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {items.map(item => (
                                            <div key={item.id} className="text-xs flex justify-between">
                                                <div className="flex items-center gap-1 truncate flex-1">
                                                    <span className={`w-2 h-2 rounded-full ${item.supplier === 'aluxe' ? 'bg-orange-500' :
                                                            item.supplier === 'deponti' ? 'bg-purple-500' :
                                                                'bg-blue-500'
                                                        }`}></span>
                                                    <span className="truncate">{item.productName}</span>
                                                </div>
                                                <span className="font-bold ml-2">{item.sellingPrice.toLocaleString()} €</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add more button */}
                            {items.length > 0 && !activeSupplier && (
                                <button
                                    onClick={() => { }}
                                    className="w-full mt-4 py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-bold hover:border-accent hover:text-accent"
                                >
                                    ➕ Dodaj kolejny produkt
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
