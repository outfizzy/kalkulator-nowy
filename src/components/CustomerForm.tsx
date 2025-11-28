import React, { useState, useEffect } from 'react';
import type { Customer } from '../types';
import { getSnowZone } from '../utils/snowZones';
import { DatabaseService } from '../services/database';

interface CustomerFormProps {
    onComplete: (customer: Customer, snowZone: any) => void;
    initialData?: Customer;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onComplete, initialData }) => {
    const [customer, setCustomer] = useState<Customer>(initialData || {
        salutation: 'Herr',
        firstName: '',
        lastName: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        phone: '',
        email: '',
        country: 'Deutschland'
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [previousCustomers, setPreviousCustomers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Load previous customers on mount
    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const customers = await DatabaseService.getUniqueCustomers();
                setPreviousCustomers(customers);
            } catch (error) {
                console.error('Error loading customers:', error);
            }
        };
        loadCustomers();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.customer-search-container')) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const snowZone = React.useMemo(() => {
        if (customer.postalCode.length === 5) {
            return getSnowZone(customer.postalCode);
        }
        return null;
    }, [customer.postalCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setShowDropdown(true);
    };

    const handleSelectCustomer = (selectedCustomer: any) => {
        setCustomer(selectedCustomer.customer);
        setSearchQuery(`${selectedCustomer.customer.firstName} ${selectedCustomer.customer.lastName}`);
        setShowDropdown(false);
    };

    const handleClearSelection = () => {
        setCustomer({
            salutation: 'Herr',
            firstName: '',
            lastName: '',
            street: '',
            houseNumber: '',
            postalCode: '',
            city: '',
            phone: '',
            email: '',
            country: 'Deutschland'
        });
        setSearchQuery('');
        setShowDropdown(false);
    };

    // Filter customers based on search query
    const filteredCustomers = previousCustomers.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const fullName = `${item.customer.firstName} ${item.customer.lastName}`.toLowerCase();
        const postal = item.customer.postalCode;
        const city = item.customer.city.toLowerCase();
        return fullName.includes(query) || postal.includes(query) || city.includes(query);
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        const newErrors: Record<string, string> = {};
        if (!customer.lastName) newErrors.lastName = 'Nazwisko jest wymagane';
        if (!customer.postalCode) newErrors.postalCode = 'Kod pocztowy jest wymagany';
        if (!customer.city) newErrors.city = 'Miasto jest wymagane';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onComplete(customer, snowZone || { id: 'II', value: 0.85, description: 'Domyślna strefa' });
    };

    return (
        <div className="space-y-8">
            {/* Customer Selection (if exists) */}
            {previousCustomers.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900">Wyszukaj istniejącego klienta</h3>
                            <p className="text-sm text-blue-700">Lub wprowadź nowe dane poniżej</p>
                        </div>
                    </div>
                    <div className="relative customer-search-container">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Wpisz imię, nazwisko, miasto lub kod pocztowy..."
                            className="w-full p-3 pl-10 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm transition-all"
                        />
                        <svg className="w-5 h-5 text-blue-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClearSelection}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}

                        {/* Dropdown results */}
                        {showDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-blue-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {filteredCustomers.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectCustomer(item)}
                                        className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                                    >
                                        <div className="font-bold text-slate-900">
                                            {item.customer.firstName} {item.customer.lastName}
                                        </div>
                                        <div className="text-sm text-slate-600 mt-1">
                                            {item.customer.postalCode} {item.customer.city} • <span className="text-accent font-medium">{item.offerCount} {item.offerCount === 1 ? 'oferta' : 'ofert'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showDropdown && searchQuery && filteredCustomers.length === 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-blue-300 rounded-xl shadow-xl p-4 text-slate-500 text-sm">
                                <svg className="w-5 h-5 inline mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Nie znaleziono klientów pasujących do "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Personal Data */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-2xl">👤</span>
                        <h3 className="text-xl font-bold text-slate-800">Dane Osobowe</h3>
                    </div>

                    <div className="space-y-5">
                        {/* Salutation */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Zwrot grzecznościowy</label>
                            <div className="flex gap-4">
                                {['Herr', 'Frau', 'Firma'].map(opt => (
                                    <label key={opt} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl border-2 transition-all ${customer.salutation === opt ? 'border-accent bg-accent/5 text-accent font-bold' : 'border-slate-200 hover:border-accent/30'}`}>
                                        <input
                                            type="radio"
                                            name="salutation"
                                            value={opt}
                                            checked={customer.salutation === opt}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Name fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Imię</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={customer.firstName}
                                    onChange={handleChange}
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                    placeholder="Hans"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nazwisko / Nazwa Firmy <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={customer.lastName}
                                    onChange={handleChange}
                                    className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-accent'}`}
                                    placeholder="Müller"
                                />
                                {errors.lastName && <p className="text-xs text-red-600 mt-1 font-medium">{errors.lastName}</p>}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Address */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-2xl">📍</span>
                        <h3 className="text-xl font-bold text-slate-800">Adres</h3>
                    </div>

                    <div className="space-y-5">
                        {/* Street and House Number */}
                        <div className="grid grid-cols-3 gap-5">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ulica</label>
                                <input
                                    type="text"
                                    name="street"
                                    value={customer.street}
                                    onChange={handleChange}
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                    placeholder="Musterstraße"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nr domu</label>
                                <input
                                    type="text"
                                    name="houseNumber"
                                    value={customer.houseNumber}
                                    onChange={handleChange}
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                    placeholder="12a"
                                />
                            </div>
                        </div>

                        {/* PLZ and City */}
                        <div className="grid grid-cols-3 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    PLZ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="postalCode"
                                    value={customer.postalCode}
                                    onChange={handleChange}
                                    maxLength={5}
                                    className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all ${errors.postalCode ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-accent'}`}
                                    placeholder="12345"
                                />
                                {errors.postalCode && <p className="text-xs text-red-600 mt-1 font-medium">{errors.postalCode}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Miasto (Ort) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={customer.city}
                                    onChange={handleChange}
                                    className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all ${errors.city ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-accent'}`}
                                    placeholder="Berlin"
                                />
                                {errors.city && <p className="text-xs text-red-600 mt-1 font-medium">{errors.city}</p>}
                            </div>
                        </div>

                        {/* Snow Zone Info */}
                        {snowZone && (
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200 flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900">Wykryto Strefę Śniegową: {snowZone.id}</p>
                                    <p className="text-sm text-blue-700 mt-1">Obciążenie: {snowZone.value} kN/m²</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Section 3: Contact */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-2xl">📞</span>
                        <h3 className="text-xl font-bold text-slate-800">Kontakt</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                            <input
                                type="tel"
                                name="phone"
                                value={customer.phone}
                                onChange={handleChange}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                placeholder="+49 ..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={customer.email}
                                onChange={handleChange}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                placeholder="kunde@example.de"
                            />
                        </div>
                    </div>
                </section>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-accent/30 hover:shadow-xl hover:scale-[1.02] flex items-center gap-3"
                    >
                        <span>Dalej: Konfiguracja Produktu</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};
