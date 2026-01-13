
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

    // Items State
    const [items, setItems] = useState<Array<{
        id: string;
        modelId: string; // from catalog or 'OTHER'
        description: string;
        quantity: number;
        price: number;
    }>>([]);

    // New Item State
    const [newItemModel, setNewItemModel] = useState('other');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemPrice, setNewItemPrice] = useState('');

    const [advance, setAdvance] = useState('0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Catalog Models (Hardcoded for now based on catalog.json to avoid async load issues in modal, 
    // or we could import. Let's use a simple list matching catalog.json)
    const availableModels = [
        { id: 'orangestyle', name: 'Orangestyle' },
        { id: 'trendstyle', name: 'Trendstyle' },
        { id: 'trendstyle_plus', name: 'Trendstyle+' },
        { id: 'topstyle', name: 'Topstyle' },
        { id: 'topstyle_xl', name: 'Topstyle XL' },
        { id: 'ultrastyle_style', name: 'Ultrastyle' },
        { id: 'carport', name: 'Carport' },
        { id: 'other', name: 'Inny / Akcesoria' }
    ];

    if (!isOpen) return null;

    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleAddItem = () => {
        if (!newItemDesc && newItemModel === 'other') {
            toast.error('Podaj opis elementu');
            return;
        }

        const priceNum = parseFloat(newItemPrice.replace(',', '.'));
        if (isNaN(priceNum)) {
            toast.error('Nieprawidłowa cena');
            return;
        }

        const modelName = availableModels.find(m => m.id === newItemModel)?.name || 'Inny';

        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                modelId: newItemModel,
                description: newItemDesc || modelName,
                quantity: newItemQty,
                price: priceNum
            }
        ]);

        // Reset inputs
        setNewItemDesc('');
        setNewItemQty(1);
        setNewItemPrice('');
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

        if (items.length === 0) {
            toast.error('Dodaj przynajmniej jeden element do umowy');
            return;
        }

        setIsSubmitting(true);
        try {
            const advanceNum = parseFloat(advance.replace(',', '.'));

            await DatabaseService.createManualContract({
                customer: selectedCustomer,
                items: items,
                contractDetails: {
                    contractNumber: contractNumber,
                    advance: isNaN(advanceNum) ? 0 : advanceNum,
                    signedAt: new Date()
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

                            {/* Items Section */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                                    <span>Elementy Umowy</span>
                                    <span className="text-sm bg-white px-2 py-1 rounded border border-slate-200">
                                        Suma: {totalPrice.toFixed(2)} EUR
                                    </span>
                                </h3>

                                {/* List of Items */}
                                {items.length > 0 && (
                                    <div className="mb-4 bg-white rounded-lg border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="p-2 pl-4">Nazwa / Model</th>
                                                    <th className="p-2 text-center">Ilość</th>
                                                    <th className="p-2 text-right">Cena Jedn.</th>
                                                    <th className="p-2 text-right">Wartość</th>
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
                                                        <td className="p-2 text-right">{item.price.toFixed(2)}</td>
                                                        <td className="p-2 text-right font-bold">{(item.price * item.quantity).toFixed(2)}</td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(item.id)}
                                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
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
                                                // Auto-fill description if not 'other' and empty
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
                                    <div className="col-span-5">
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
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Cena (Net)</label>
                                        <input
                                            type="text" // Text to handle comma
                                            value={newItemPrice}
                                            onChange={e => setNewItemPrice(e.target.value)}
                                            placeholder="EUR"
                                            className="w-full p-2 border rounded text-sm text-right"
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Całkowita Cena (EUR Netto)
                                    </label>
                                    <div className="w-full p-2 bg-slate-100 border border-slate-300 rounded font-bold text-slate-800">
                                        {totalPrice.toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Zaliczka (EUR)
                                    </label>
                                    <input
                                        type="number"
                                        value={advance}
                                        onChange={e => setAdvance(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
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
