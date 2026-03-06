
import React, { useState } from 'react';
import { CustomerSelector } from '../customers/CustomerSelector';
import { DatabaseService } from '../../services/database';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';

interface ManualContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    preselectedCustomer?: Customer;
}

export const ManualContractModal: React.FC<ManualContractModalProps> = ({ isOpen, onClose, onSuccess, preselectedCustomer }) => {
    const [step, setStep] = useState<'customer' | 'details'>(preselectedCustomer ? 'details' : 'customer');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(preselectedCustomer);

    // Form State
    const [contractNumber, setContractNumber] = useState('');

    // Auto-fetch next contract number
    React.useEffect(() => {
        if (isOpen) {
            DatabaseService.getNextContractNumber()
                .then(num => setContractNumber(num))
                .catch(err => console.error('Failed to fetch next contract number:', err));
        }
    }, [isOpen]);

    // Items State (descriptive, no per-item price)
    const [items, setItems] = useState<Array<{
        id: string;
        modelId: string;
        description: string;
        quantity: number;
    }>>([]);

    // New Item State
    const [newItemModel, setNewItemModel] = useState('other');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);

    // Financial State
    const [totalContractPrice, setTotalContractPrice] = useState('');
    const [advance, setAdvance] = useState('0');
    const [installationPrice, setInstallationPrice] = useState('');
    const [installationDays, setInstallationDays] = useState('1');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
    const [installationNotes, setInstallationNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Product Configuration State
    const [productModel, setProductModel] = useState('other');
    const [productColor, setProductColor] = useState('');
    const [productWidth, setProductWidth] = useState('');
    const [productDepth, setProductDepth] = useState('');
    const [productAddons, setProductAddons] = useState<string[]>([]);
    const [newAddon, setNewAddon] = useState('');

    // Measurement / Ordering Data State
    const [unterkRinne, setUnterkRinne] = useState('');     // H3 - Unterkante Rinne
    const [unterkWand, setUnterkWand] = useState('');       // H1 - Unterkante Wandprofil  
    const [slopeLeft, setSlopeLeft] = useState('');          // Gefälle links (mm)
    const [slopeRight, setSlopeRight] = useState('');        // Gefälle rechts (mm)
    const [slopeFront, setSlopeFront] = useState('');        // Gefälle vorne (mm)
    const [wallType, setWallType] = useState('massiv');      // Wandbeschaffenheit
    const [mountType, setMountType] = useState('wall');      // Montageart
    const [hasElectrical, setHasElectrical] = useState(false);
    const [hasDrainage, setHasDrainage] = useState(false);
    const [technicalNotes, setTechnicalNotes] = useState('');

    // Addons from catalog.json and pricing engine — grouped by category
    const commonAddons = [
        // Oświetlenie / Beleuchtung
        'LED Spots', 'LED Listwa (Stripe)', 'LED Trafo',
        // Szyby przesuwne / Schiebewände
        'Schiebewand Glas AL23', 'Schiebewand Glas AL24',
        // Markizy / Markisen
        'Markise Aufdach (Dachowa)', 'Markise Unterdach (Poddachowa)',
        'Senkrechtmarkise (ZIP Screen)',
        // Ściany / Wände
        'Seitenwand Glas', 'Seitenwand Alu', 'Frontwand Alu',
        'Seitenwand Polycarbonat',
        // Keilfenster & inne
        'Keilfenster (Okno klinowe)',
        'Heizstrahler (Promiennik)', 'Lautsprecher',
        // Podłogi / Böden
        'WPC Terrassenboden', 'Fundament',
        // Inne / Sonstiges
        'Regenrinne (Rynna)', 'Photovoltaik', 'Windschutz'
    ];

    const commonColors = [
        'RAL 7016 (Anthrazit)', 'RAL 9016 (Weiß)', 'RAL 9005 (Schwarz)',
        'RAL 7035 (Lichtgrau)', 'RAL 8014 (Sepiabraun)', 'RAL 9006 (Silber)',
        'DB 703', 'Sonderfarbe (RAL)'
    ];

    // Catalog Models matching catalog.json + additional models from pricing engine
    const availableModels = [
        { id: 'orangestyle', name: 'Orangestyle' },
        { id: 'trendstyle', name: 'Trendstyle' },
        { id: 'trendstyle_plus', name: 'Trendstyle+' },
        { id: 'topstyle', name: 'Topstyle' },
        { id: 'topstyle_xl', name: 'Topstyle XL' },
        { id: 'ultrastyle_style', name: 'Ultrastyle Style' },
        { id: 'designline', name: 'Designline (Schiebedach)' },
        { id: 'pergola_deluxe', name: 'Pergola Deluxe' },
        { id: 'carport', name: 'Carport' },
        { id: 'other', name: 'Inny / Sonstiges' }
    ];

    if (!isOpen) return null;

    const totalPrice = parseFloat(totalContractPrice.replace(',', '.')) || 0;
    const installPriceNum = parseFloat(installationPrice.replace(',', '.')) || 0;
    const installDaysNum = parseInt(installationDays) || 1;

    const handleAddItem = () => {
        if (!newItemDesc && newItemModel === 'other') {
            toast.error('Podaj opis elementu');
            return;
        }

        const modelName = availableModels.find(m => m.id === newItemModel)?.name || 'Inny';

        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                modelId: newItemModel,
                description: newItemDesc || modelName,
                quantity: newItemQty
            }
        ]);

        setNewItemDesc('');
        setNewItemQty(1);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) {
            toast.error('Wybierz klienta');
            return;
        }

        if (items.length === 0 && productAddons.length === 0) {
            toast.error('Dodaj przynajmniej jeden element lub dodatek do umowy');
            return;
        }

        if (totalPrice <= 0) {
            toast.error('Podaj kwotę za zlecenie');
            return;
        }

        // Auto-include addons as items
        const allItems = [
            ...items.map(i => ({ ...i, price: 0 })),
            ...productAddons.map((addon, idx) => ({
                id: `addon-${idx}-${Date.now()}`,
                modelId: 'addon',
                description: addon,
                quantity: 1,
                price: 0
            }))
        ];

        setIsSubmitting(true);
        try {
            const advanceNum = parseFloat(advance.replace(',', '.'));

            await DatabaseService.createManualContract({
                customer: selectedCustomer,
                items: allItems,
                totalPrice: totalPrice,
                contractDetails: {
                    contractNumber: contractNumber,
                    advance: isNaN(advanceNum) ? 0 : advanceNum,
                    signedAt: new Date(),
                    installationPriceNet: installPriceNum,
                    installationDays: installDaysNum,
                    paymentMethod: paymentMethod,
                    installationNotes: installationNotes.trim() || undefined
                },
                productConfig: {
                    modelId: productModel,
                    color: productColor.trim() || undefined,
                    width: parseInt(productWidth) || 0,
                    projection: parseInt(productDepth) || 0,
                    addons: productAddons,
                    measurements: {
                        unterkRinne: parseInt(unterkRinne) || undefined,
                        unterkWand: parseInt(unterkWand) || undefined,
                        slopeLeft: parseInt(slopeLeft) || undefined,
                        slopeRight: parseInt(slopeRight) || undefined,
                        slopeFront: parseInt(slopeFront) || undefined,
                        wallType: wallType || undefined,
                        mountType: mountType || undefined,
                        hasElectrical,
                        hasDrainage,
                        technicalNotes: technicalNotes.trim() || undefined
                    }
                }
            });

            toast.success('Umowa została utworzona!');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error creating manual contract:', JSON.stringify(error, null, 2));
            // Handle Supabase PostgrestError (which is not an Error instance)
            const msg = error?.message || error?.error_description || (error instanceof Error ? error.message : 'Nieznany błąd');
            const details = error?.details || error?.hint || '';
            toast.error(`Błąd tworzenia umowy: ${msg} ${details ? `(${details})` : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-800 text-lg">
                        {step === 'customer' ? 'Wybierz Klienta' : 'Nowa Umowa Manualna'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'customer' ? (
                        <CustomerSelector
                            onSelect={(c) => {
                                setSelectedCustomer(c);
                                setStep('details');
                            }}
                            onCancel={onClose}
                        />
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Selected Customer Widget */}
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-indigo-600 font-bold uppercase">Klient</div>
                                    <div className="font-bold text-slate-800">
                                        {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                                    </div>
                                    <div className="text-xs text-slate-600">{selectedCustomer?.city}</div>
                                </div>
                                {!preselectedCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => setStep('customer')}
                                        className="text-indigo-600 text-sm font-medium hover:underline"
                                    >
                                        Zmień
                                    </button>
                                )}
                            </div>

                            {/* Contract Number */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Numer Umowy (Opcjonalne)
                                </label>
                                <input
                                    type="text"
                                    value={contractNumber}
                                    onChange={e => setContractNumber(e.target.value)}
                                    placeholder="np. PL/001/13/01/2026"
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* ── Product Configuration ── */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-sm">
                                    <span>📦</span> Konfiguracja Produktu
                                </h3>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {/* Model */}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Model zadaszenia</label>
                                        <select
                                            value={productModel}
                                            onChange={e => setProductModel(e.target.value)}
                                            className="w-full p-2.5 border border-blue-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-blue-400 outline-none"
                                        >
                                            {availableModels.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Color */}
                                    <div>
                                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Kolor</label>
                                        <input
                                            type="text"
                                            value={productColor}
                                            onChange={e => setProductColor(e.target.value)}
                                            placeholder="np. RAL 7016, Anthrazit"
                                            className="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                        />
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {commonColors.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setProductColor(c)}
                                                    className={`px-1.5 py-0.5 text-[9px] rounded-full border transition-colors ${productColor === c
                                                        ? 'bg-blue-500 text-white border-blue-500'
                                                        : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
                                                        }`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Width x Depth */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Szerokość (mm)</label>
                                            <input
                                                type="number"
                                                value={productWidth}
                                                onChange={e => setProductWidth(e.target.value)}
                                                placeholder="np. 4000"
                                                className="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Głębokość (mm)</label>
                                            <input
                                                type="number"
                                                value={productDepth}
                                                onChange={e => setProductDepth(e.target.value)}
                                                placeholder="np. 3000"
                                                className="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Addons */}
                                <div>
                                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Dodatki do zadaszenia</label>

                                    {/* Selected Addons */}
                                    {productAddons.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {productAddons.map((addon, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                    {addon}
                                                    <button type="button" onClick={() => setProductAddons(prev => prev.filter((_, idx) => idx !== i))} className="text-blue-500 hover:text-red-500">✕</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quick-add common addons */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {commonAddons.filter(a => !productAddons.includes(a)).slice(0, 8).map(addon => (
                                            <button
                                                key={addon}
                                                type="button"
                                                onClick={() => setProductAddons(prev => [...prev, addon])}
                                                className="px-2 py-0.5 text-[10px] bg-white border border-blue-200 rounded-full text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                            >
                                                + {addon}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom addon input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newAddon}
                                            onChange={e => setNewAddon(e.target.value)}
                                            placeholder="Inny dodatek..."
                                            className="flex-1 p-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newAddon.trim()) {
                                                    e.preventDefault();
                                                    setProductAddons(prev => [...prev, newAddon.trim()]);
                                                    setNewAddon('');
                                                }
                                            }}
                                        />
                                        <button type="button" onClick={() => {
                                            if (newAddon.trim()) {
                                                setProductAddons(prev => [...prev, newAddon.trim()]);
                                                setNewAddon('');
                                            }
                                        }} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors">+</button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Measurement / Ordering Data ── */}
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-sm">
                                    <span>📐</span> Dane z Pomiaru (Bestelldaten)
                                </h3>
                                <p className="text-[10px] text-emerald-500 mb-3">Dane techniczne potrzebne do złożenia zamówienia u producenta.</p>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {/* Unterkante Rinne (H3) */}
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Unterkante Rinne / H3 (mm)</label>
                                        <input
                                            type="number"
                                            value={unterkRinne}
                                            onChange={e => setUnterkRinne(e.target.value)}
                                            placeholder="np. 2500"
                                            className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                        />
                                        <p className="text-[9px] text-emerald-400 mt-0.5">Höhe Unterkante Rinne vom Boden</p>
                                    </div>

                                    {/* Unterkante Wand (H1) */}
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Unterkante Wand / H1 (mm)</label>
                                        <input
                                            type="number"
                                            value={unterkWand}
                                            onChange={e => setUnterkWand(e.target.value)}
                                            placeholder="np. 2800"
                                            className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                        />
                                        <p className="text-[9px] text-emerald-400 mt-0.5">Höhe Unterkante Wandprofil</p>
                                    </div>
                                </div>

                                {/* Ground Slopes (Gefälle) */}
                                <div className="mb-3">
                                    <label className="block text-xs font-bold text-emerald-700 mb-1.5">Spadki terenu / Gefälle (mm)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <input
                                                type="number"
                                                value={slopeLeft}
                                                onChange={e => setSlopeLeft(e.target.value)}
                                                placeholder="Lewo / Links"
                                                className="w-full p-2 border border-emerald-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-400 outline-none"
                                            />
                                            <p className="text-[9px] text-emerald-400 text-center mt-0.5">← Links</p>
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={slopeFront}
                                                onChange={e => setSlopeFront(e.target.value)}
                                                placeholder="Przód / Vorne"
                                                className="w-full p-2 border border-emerald-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-400 outline-none"
                                            />
                                            <p className="text-[9px] text-emerald-400 text-center mt-0.5">↓ Vorne</p>
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={slopeRight}
                                                onChange={e => setSlopeRight(e.target.value)}
                                                placeholder="Prawo / Rechts"
                                                className="w-full p-2 border border-emerald-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-400 outline-none"
                                            />
                                            <p className="text-[9px] text-emerald-400 text-center mt-0.5">→ Rechts</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Wall & Mounting Type */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Ściana / Wandbeschaffenheit</label>
                                        <select
                                            value={wallType}
                                            onChange={e => setWallType(e.target.value)}
                                            className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                        >
                                            <option value="massiv">Mur masywny (Massivwand)</option>
                                            <option value="daemmung">Ocieplenie / WDVS (Dämmung)</option>
                                            <option value="holz">Drewno (Holzwand)</option>
                                            <option value="blech">Blacha (Blechfassade)</option>
                                            <option value="fertighaus">Dom prefabrykowany (Fertighaus)</option>
                                            <option value="other">Inne (Sonstiges)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Montaż / Montageart</label>
                                        <select
                                            value={mountType}
                                            onChange={e => setMountType(e.target.value)}
                                            className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                        >
                                            <option value="wall">Montaż ścienny (Wandmontage)</option>
                                            <option value="ceiling">Montaż sufitowy (Deckenmontage)</option>
                                            <option value="freestanding">Wolnostojący (Freistand)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Electrical & Drainage Checkboxes */}
                                <div className="flex flex-wrap gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hasElectrical}
                                            onChange={e => setHasElectrical(e.target.checked)}
                                            className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-400"
                                        />
                                        <span className="text-xs text-emerald-800 font-medium">⚡ Prąd na miejscu (Strom vorhanden)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hasDrainage}
                                            onChange={e => setHasDrainage(e.target.checked)}
                                            className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-400"
                                        />
                                        <span className="text-xs text-emerald-800 font-medium">🌧️ Odpływ wody (Entwässerung vorhanden)</span>
                                    </label>
                                </div>

                                {/* Technical Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-emerald-700 mb-1">Uwagi techniczne / Technische Hinweise</label>
                                    <textarea
                                        value={technicalNotes}
                                        onChange={e => setTechnicalNotes(e.target.value)}
                                        className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-400 outline-none"
                                        rows={2}
                                        placeholder="Np. grubość ocieplenia 16cm, dojazd utrudniony, konieczność cięcia profili na miejscu..."
                                    />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                                    <span>Elementy Umowy</span>
                                    <span className="text-xs text-slate-500">{items.length + productAddons.length} elementów</span>
                                </h3>

                                {/* List of Items + Addons */}
                                {(items.length > 0 || productAddons.length > 0) && (
                                    <div className="mb-4 bg-white rounded-lg border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="p-2 pl-4">Nazwa / Model</th>
                                                    <th className="p-2 text-center">Ilość</th>
                                                    <th className="p-2 text-center">Typ</th>
                                                    <th className="p-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {items.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="p-2 pl-4">
                                                            <div className="font-medium text-slate-800">{item.description}</div>
                                                            <div className="text-xs text-slate-500">{item.modelId !== 'other' ? item.modelId : 'Inne'}</div>
                                                        </td>
                                                        <td className="p-2 text-center">{item.quantity}</td>
                                                        <td className="p-2 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Produkt</span>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {productAddons.map((addon, i) => (
                                                    <tr key={`addon-${i}`} className="bg-blue-50/30">
                                                        <td className="p-2 pl-4">
                                                            <div className="font-medium text-slate-700">{addon}</div>
                                                        </td>
                                                        <td className="p-2 text-center">1</td>
                                                        <td className="p-2 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Dodatek</span>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button type="button" onClick={() => setProductAddons(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Add New Item Form */}
                                <div className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="col-span-3">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Model</label>
                                        <select
                                            value={newItemModel}
                                            onChange={e => {
                                                setNewItemModel(e.target.value);
                                                if (e.target.value !== 'other' && !newItemDesc) {
                                                    const model = availableModels.find(m => m.id === e.target.value);
                                                    if (model) setNewItemDesc(model.name);
                                                }
                                            }}
                                            className="w-full p-2 border rounded text-sm"
                                        >
                                            {availableModels.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-7">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Opis / Wymiary</label>
                                        <input
                                            type="text"
                                            value={newItemDesc}
                                            onChange={e => setNewItemDesc(e.target.value)}
                                            placeholder="np. 400x300cm, Antracyt"
                                            className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Ilość</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newItemQty}
                                            onChange={e => setNewItemQty(parseInt(e.target.value) || 1)}
                                            className="w-full p-2 border rounded text-sm text-center"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="w-full p-2 bg-slate-800 text-white rounded hover:bg-slate-700 flex items-center justify-center h-[38px]"
                                            title="Dodaj"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span>💰</span> Podsumowanie Finansowe
                                </h3>

                                {/* Total Contract Price */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota za zlecenie Netto (EUR)</label>
                                        <input
                                            type="text"
                                            value={totalContractPrice}
                                            onChange={e => setTotalContractPrice(e.target.value)}
                                            placeholder="np. 5000"
                                            className="w-full p-2.5 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right font-bold text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota za zlecenie Brutto</label>
                                        <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-600 text-right text-lg">
                                            {(totalPrice * 1.19).toFixed(2)} €
                                            <span className="text-[10px] text-slate-400 ml-1">(19% MwSt)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Installation Price + Days */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cena Montażu Netto (EUR)</label>
                                        <input
                                            type="text"
                                            value={installationPrice}
                                            onChange={e => setInstallationPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cena Montażu Brutto</label>
                                        <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-600 text-right">
                                            {(installPriceNum * 1.19).toFixed(2)} €
                                            <span className="text-[10px] text-slate-400 ml-1">(19%)</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dni montażowe</label>
                                        <input
                                            type="number"
                                            value={installationDays}
                                            onChange={e => setInstallationDays(e.target.value)}
                                            min="1"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold text-lg"
                                        />
                                    </div>
                                </div>

                                {/* Total Combined */}
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border border-indigo-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-indigo-800">RAZEM Netto (Zlecenie + Montaż)</span>
                                        <span className="text-lg font-bold text-indigo-900">
                                            {(totalPrice + installPriceNum).toFixed(2)} €
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-indigo-600">RAZEM Brutto (19% MwSt)</span>
                                        <span className="text-sm font-bold text-indigo-700">
                                            {((totalPrice + installPriceNum) * 1.19).toFixed(2)} €
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zaliczka (EUR)</label>
                                        <input
                                            type="number"
                                            value={advance}
                                            onChange={e => setAdvance(e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Metoda odbioru płatności</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        >
                                            <option value="transfer">💳 Przelew bankowy</option>
                                            <option value="cash">💵 Gotówka przy odbiorze</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Team Notes */}
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2 text-sm">
                                    <span>🔧</span> Notatki dla Ekipy Montażowej
                                </h3>
                                <p className="text-[10px] text-orange-500 mb-2">Te notatki pojawią się w kalendarzu montaży i w dashboardzie monterów.</p>
                                <textarea
                                    value={installationNotes}
                                    onChange={e => setInstallationNotes(e.target.value)}
                                    className="w-full p-3 border border-orange-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-400 outline-none"
                                    rows={3}
                                    placeholder="Np. kod do bramy 1234, uwaga na psa, klient prosi o wcześniejszy kontakt..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Tworzenie...' : 'Utwórz Umowę'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
