import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Deponti Products Database
const DEPONTI_ZADASZENIA = [
    { id: 'nebbiolo', name: 'Nebbiolo', category: 'zadaszenie' },
    { id: 'bosco', name: 'Bosco', category: 'zadaszenie' },
    { id: 'ribolla', name: 'Ribolla', category: 'zadaszenie' },
    { id: 'pigato', name: 'Pigato', category: 'zadaszenie' },
    { id: 'pigato-plus', name: 'Pigato Plus', category: 'zadaszenie' },
    { id: 'giallo', name: 'Giallo', category: 'zadaszenie' },
    { id: 'giallo-plus', name: 'Giallo Plus', category: 'zadaszenie' },
    { id: 'trebbiano', name: 'Trebbiano', category: 'zadaszenie' },
    { id: 'verdeca', name: 'Verdeca', category: 'zadaszenie' },
];

const DEPONTI_PINELA = [
    { id: 'pinela', name: 'Pinela', category: 'pinela' },
    { id: 'pinela-deluxe', name: 'Pinela Deluxe', category: 'pinela' },
    { id: 'pinela-glass', name: 'Pinela Glass', category: 'pinela' },
    { id: 'pinela-deluxe-plus', name: 'Pinela Deluxe Plus', category: 'pinela' },
];

const EXTERNAL_SUPPLIERS = [
    { id: 'selt', name: 'Selt', url: 'https://www.sfrpolska.pl/', color: 'bg-blue-500' },
    { id: 'aliplast', name: 'Aliplast', url: 'https://aliplast.com.pl/', color: 'bg-green-500' },
    { id: 'aluxe', name: 'Aluxe (Istniejący konfigurator)', url: '/new-offer', color: 'bg-orange-500', internal: true },
];

interface OfferItem {
    id: string;
    supplier: string;
    productName: string;
    description: string;
    width?: number;
    depth?: number;
    color?: string;
    purchasePrice: number;
    sellingPrice: number;
    notes?: string;
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

export const MultiSupplierCalculator: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'deponti' | 'external' | 'summary'>('deponti');
    const [items, setItems] = useState<OfferItem[]>([]);
    const [customer, setCustomer] = useState<CustomerData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        postalCode: ''
    });

    // Form state for adding new item
    const [newItem, setNewItem] = useState<Partial<OfferItem>>({
        supplier: 'deponti',
        productName: '',
        description: '',
        purchasePrice: 0,
        sellingPrice: 0,
    });

    const [depontiCategory, setDepontiCategory] = useState<'zadaszenie' | 'pinela'>('zadaszenie');

    const addItem = () => {
        if (!newItem.productName || !newItem.sellingPrice) {
            toast.error('Wypełnij nazwę produktu i cenę sprzedaży');
            return;
        }

        const item: OfferItem = {
            id: crypto.randomUUID(),
            supplier: newItem.supplier || 'deponti',
            productName: newItem.productName || '',
            description: newItem.description || '',
            width: newItem.width,
            depth: newItem.depth,
            color: newItem.color,
            purchasePrice: newItem.purchasePrice || 0,
            sellingPrice: newItem.sellingPrice || 0,
            notes: newItem.notes,
        };

        setItems([...items, item]);
        setNewItem({
            supplier: newItem.supplier,
            productName: '',
            description: '',
            purchasePrice: 0,
            sellingPrice: 0,
        });
        toast.success('Dodano pozycję');
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
        toast.success('Usunięto pozycję');
    };

    const totalPurchase = items.reduce((sum, i) => sum + i.purchasePrice, 0);
    const totalSelling = items.reduce((sum, i) => sum + i.sellingPrice, 0);
    const margin = totalSelling - totalPurchase;
    const marginPercent = totalSelling > 0 ? ((margin / totalSelling) * 100).toFixed(1) : '0';

    const saveOffer = () => {
        if (items.length === 0) {
            toast.error('Dodaj przynajmniej jedną pozycję');
            return;
        }
        // TODO: Save to database
        toast.success('Oferta zapisana (demo)');
        console.log('Offer data:', { customer, items, totalPurchase, totalSelling, margin });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">🧮 Kalkulator Multi-Dostawca</h1>
                        <p className="text-slate-500">Twórz oferty z produktów różnych dostawców</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                        ← Powrót do Panelu
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: 'deponti', label: 'Deponti (Produkty)', icon: '🏠' },
                        { id: 'external', label: 'Zewnętrzni (Selt, Aliplast)', icon: '🔗' },
                        { id: 'summary', label: 'Podsumowanie', icon: '📋' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                    ? 'bg-accent text-white shadow-lg'
                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <span className="text-xl">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* DEPONTI TAB */}
                        {activeTab === 'deponti' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="text-2xl">🏠</span> Produkty Deponti
                                </h2>

                                {/* Category selector */}
                                <div className="flex gap-2 mb-6">
                                    <button
                                        onClick={() => setDepontiCategory('zadaszenie')}
                                        className={`px-4 py-2 rounded-lg font-bold ${depontiCategory === 'zadaszenie'
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        Zadaszenia Aluminiowe
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
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                    {(depontiCategory === 'zadaszenie' ? DEPONTI_ZADASZENIA : DEPONTI_PINELA).map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => setNewItem({ ...newItem, supplier: 'deponti', productName: product.name })}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${newItem.productName === product.name
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-slate-200 hover:border-purple-300'
                                                }`}
                                        >
                                            <div className="font-bold text-slate-800">{product.name}</div>
                                            <div className="text-xs text-slate-500">{product.category}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Configuration form */}
                                {newItem.productName && (
                                    <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                                        <h3 className="font-bold text-lg">Konfiguracja: {newItem.productName}</h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Szerokość (mm)</label>
                                                <input
                                                    type="number"
                                                    value={newItem.width || ''}
                                                    onChange={e => setNewItem({ ...newItem, width: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg"
                                                    placeholder="np. 4000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Głębokość (mm)</label>
                                                <input
                                                    type="number"
                                                    value={newItem.depth || ''}
                                                    onChange={e => setNewItem({ ...newItem, depth: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg"
                                                    placeholder="np. 3000"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Kolor</label>
                                            <input
                                                type="text"
                                                value={newItem.color || ''}
                                                onChange={e => setNewItem({ ...newItem, color: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="np. RAL 7016"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Opis / Dodatki</label>
                                            <textarea
                                                value={newItem.description || ''}
                                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                                rows={2}
                                                placeholder="np. LED, szyba przesuwna..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Cena Zakupu (EUR)</label>
                                                <input
                                                    type="number"
                                                    value={newItem.purchasePrice || ''}
                                                    onChange={e => setNewItem({ ...newItem, purchasePrice: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Cena Sprzedaży (EUR)</label>
                                                <input
                                                    type="number"
                                                    value={newItem.sellingPrice || ''}
                                                    onChange={e => setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-lg font-bold"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={addItem}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
                                        >
                                            ➕ Dodaj do Oferty
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* EXTERNAL SUPPLIERS TAB */}
                        {activeTab === 'external' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="text-2xl">🔗</span> Dostawcy Zewnętrzni
                                </h2>

                                <div className="space-y-4 mb-8">
                                    {EXTERNAL_SUPPLIERS.map(supplier => (
                                        <div key={supplier.id} className={`p-4 rounded-xl border-2 border-slate-200`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 ${supplier.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                                                        {supplier.name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{supplier.name}</div>
                                                        <div className="text-xs text-slate-500">{supplier.url}</div>
                                                    </div>
                                                </div>
                                                <a
                                                    href={supplier.internal ? undefined : supplier.url}
                                                    onClick={supplier.internal ? () => navigate(supplier.url) : undefined}
                                                    target={supplier.internal ? undefined : "_blank"}
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-bold"
                                                >
                                                    {supplier.internal ? 'Otwórz Konfigurator' : 'Otwórz Stronę ↗'}
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Manual entry form */}
                                <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                                    <h3 className="font-bold text-lg">Dodaj Ręcznie Pozycję</h3>
                                    <p className="text-sm text-slate-500">Skonfiguruj produkt w zewnętrznym konfiguratorze, a następnie wpisz dane poniżej.</p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Dostawca</label>
                                            <select
                                                value={newItem.supplier || 'selt'}
                                                onChange={e => setNewItem({ ...newItem, supplier: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            >
                                                <option value="selt">Selt</option>
                                                <option value="aliplast">Aliplast</option>
                                                <option value="aluxe">Aluxe</option>
                                                <option value="other">Inny</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa Produktu</label>
                                            <input
                                                type="text"
                                                value={newItem.productName || ''}
                                                onChange={e => setNewItem({ ...newItem, productName: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="np. Pergola SR3500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Opis / Specyfikacja</label>
                                        <textarea
                                            value={newItem.description || ''}
                                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            rows={2}
                                            placeholder="np. 4000x3000mm, RAL 7016, LED..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Cena Zakupu (EUR)</label>
                                            <input
                                                type="number"
                                                value={newItem.purchasePrice || ''}
                                                onChange={e => setNewItem({ ...newItem, purchasePrice: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Cena Sprzedaży (EUR)</label>
                                            <input
                                                type="number"
                                                value={newItem.sellingPrice || ''}
                                                onChange={e => setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={addItem}
                                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
                                    >
                                        ➕ Dodaj do Oferty
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SUMMARY TAB */}
                        {activeTab === 'summary' && (
                            <div className="space-y-6">
                                {/* Customer Data */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                        <span className="text-2xl">👤</span> Dane Klienta
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                                            <input
                                                type="text"
                                                value={customer.firstName}
                                                onChange={e => setCustomer({ ...customer, firstName: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                                            <input
                                                type="text"
                                                value={customer.lastName}
                                                onChange={e => setCustomer({ ...customer, lastName: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={customer.email}
                                                onChange={e => setCustomer({ ...customer, email: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                                            <input
                                                type="tel"
                                                value={customer.phone}
                                                onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ulica</label>
                                            <input
                                                type="text"
                                                value={customer.street}
                                                onChange={e => setCustomer({ ...customer, street: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Miasto</label>
                                            <input
                                                type="text"
                                                value={customer.city}
                                                onChange={e => setCustomer({ ...customer, city: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Kod pocztowy</label>
                                            <input
                                                type="text"
                                                value={customer.postalCode}
                                                onChange={e => setCustomer({ ...customer, postalCode: e.target.value })}
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                        <span className="text-2xl">📋</span> Pozycje Oferty ({items.length})
                                    </h2>

                                    {items.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            Brak pozycji. Dodaj produkty z zakładek "Deponti" lub "Zewnętrzni".
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map((item, idx) => (
                                                <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold">{item.productName}</div>
                                                        <div className="text-sm text-slate-500">
                                                            <span className="inline-block px-2 py-0.5 bg-slate-200 rounded text-xs mr-2">
                                                                {item.supplier.toUpperCase()}
                                                            </span>
                                                            {item.description}
                                                            {item.width && item.depth && ` | ${item.width}x${item.depth}mm`}
                                                            {item.color && ` | ${item.color}`}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-400">Zakup: {item.purchasePrice} €</div>
                                                        <div className="font-bold text-lg text-accent">{item.sellingPrice} €</div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={saveOffer}
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

                    {/* Right Sidebar - Summary */}
                    <div className="space-y-6">
                        {/* Quick Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
                            <h3 className="font-bold text-lg mb-4">📊 Podsumowanie</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Pozycje:</span>
                                    <span className="font-bold">{items.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Suma Zakupu:</span>
                                    <span className="font-bold">{totalPurchase.toFixed(2)} €</span>
                                </div>
                                <hr />
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-700">Suma Sprzedaży:</span>
                                    <span className="font-bold text-xl text-accent">{totalSelling.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Marża:</span>
                                    <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {margin.toFixed(2)} € ({marginPercent}%)
                                    </span>
                                </div>
                            </div>

                            {/* Items mini-list */}
                            {items.length > 0 && (
                                <div className="border-t pt-4">
                                    <div className="text-xs font-bold text-slate-500 mb-2">POZYCJE:</div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {items.map(item => (
                                            <div key={item.id} className="text-xs flex justify-between">
                                                <span className="truncate flex-1">{item.productName}</span>
                                                <span className="font-bold ml-2">{item.sellingPrice} €</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
