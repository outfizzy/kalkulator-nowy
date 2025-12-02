import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/database';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialType?: 'income' | 'expense';
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSuccess, initialType = 'income' }) => {
    const [type, setType] = useState<'income' | 'expense'>(initialType);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Income specific
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<{ customer: Customer; lastOfferDate: Date; offerCount: number }[]>([]);
    // filteredCustomers is now derived via useMemo
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const loadCustomers = async () => {
        try {
            const data = await DatabaseService.getUniqueCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setType(initialType);
            loadCustomers();
        }
    }, [isOpen, initialType]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.customer.lastName.toLowerCase().includes(lower) ||
            c.customer.firstName.toLowerCase().includes(lower) ||
            c.customer.city.toLowerCase().includes(lower) ||
            c.customer.phone.includes(searchTerm)
        );
    }, [searchTerm, customers]);

    useEffect(() => {
        setShowCustomerDropdown(!!searchTerm);
    }, [searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || isNaN(Number(amount))) {
            toast.error('Podaj poprawną kwotę');
            return;
        }

        if (type === 'income' && !selectedCustomer) {
            toast.error('Wybierz klienta dla wpłaty');
            return;
        }

        if (type === 'expense' && !category) {
            toast.error('Wybierz kategorię wydatku');
            return;
        }

        try {
            await DatabaseService.createWalletTransaction({
                type,
                amount: Number(amount),
                category: type === 'income' ? 'Wpłata od klienta' : category,
                description,
                date: new Date(date).toISOString(),
                customerId: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined, // Using name as ID for now as we don't have direct customer ID in types easily
                customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined,
                contractNumber: undefined // Could be added if we link to specific contract
            });

            toast.success('Transakcja dodana pomyślnie');
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error('Błąd podczas dodawania transakcji');
        }
    };

    const resetForm = () => {
        setAmount('');
        setCategory('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setSearchTerm('');
        setSelectedCustomer(null);
    };

    if (!isOpen) return null;

    const expenseCategories = [
        'Materiały',
        'Paliwo',
        'Narzędzia',
        'Wynagrodzenia',
        'Opłaty biurowe',
        'Marketing',
        'Inne'
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Dodaj Transakcję</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type Selection */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${type === 'income'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Wpływ (Przychód)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${type === 'expense'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Wypływ (Koszt)
                        </button>
                    </div>

                    {/* Amount & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kwota (PLN)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* Conditional Fields */}
                    {type === 'income' ? (
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Klient</label>
                            {selectedCustomer ? (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <div>
                                        <p className="font-medium text-emerald-900">
                                            {selectedCustomer.firstName} {selectedCustomer.lastName}
                                        </p>
                                        <p className="text-xs text-emerald-700">{selectedCustomer.city}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            setSearchTerm('');
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
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        placeholder="Szukaj po nazwisku, mieście..."
                                    />
                                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {filteredCustomers.map((item, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCustomer(item.customer);
                                                        setSearchTerm('');
                                                        setShowCustomerDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                                >
                                                    <p className="font-medium text-slate-800">
                                                        {item.customer.firstName} {item.customer.lastName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {item.customer.city}, {item.customer.street}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                            >
                                <option value="">Wybierz kategorię...</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Opis (opcjonalnie)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                            placeholder="Dodatkowe informacje..."
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 py-3 px-4 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20 ${type === 'income'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            Zapisz {type === 'income' ? 'Wpłatę' : 'Wydatek'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
