import React, { useState, useEffect } from 'react';
import type { Customer, User } from '../types';
import { getSnowZone } from '../utils/snowZones';
import { DatabaseService } from '../services/database';
import { UserService } from '../services/database/user.service';
import { useAuth } from '../contexts/AuthContext';

interface CustomerFormProps {
    onComplete: (customer: Customer, snowZone: any) => void;
    initialData?: Customer;
    submitLabel?: string;
    hideSearch?: boolean; // Hide customer search (for new customer page)
}

const normalizeCustomer = (raw: Partial<Customer> | any): Customer => {
    const salutation = raw.salutation;
    const validSalutation =
        salutation === 'Herr' || salutation === 'Frau' || salutation === 'Firma'
            ? salutation
            : 'Herr';

    return {
        salutation: validSalutation,
        firstName: (raw.firstName || '').toString(),
        lastName: (raw.lastName || '').toString(),
        street: (raw.street || '').toString(),
        houseNumber: (raw.houseNumber || '').toString(),
        postalCode: (raw.postalCode || '').toString(),
        city: (raw.city || '').toString(),
        phone: (raw.phone || '').toString(),
        email: (raw.email || '').toString(),
        country: (raw.country || 'Deutschland').toString(),
        representative_id: raw.representative_id || undefined,
        contract_signer_id: raw.contract_signer_id || undefined,
        contract_number: raw.contract_number || undefined,
    };
};

export const CustomerForm: React.FC<CustomerFormProps> = ({ onComplete, initialData, submitLabel, hideSearch = false }) => {
    const { currentUser } = useAuth();
    const [customer, setCustomer] = useState<Customer>(() => {
        const normalized = normalizeCustomer(initialData || {});
        // Default representative to current user if new customer (and user is logged in)
        if (!initialData?.id && !normalized.representative_id && currentUser) {
            normalized.representative_id = currentUser.id;
        }
        return normalized;
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [previousCustomers, setPreviousCustomers] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Load previous customers and users on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const [customers, allUsers] = await Promise.all([
                    DatabaseService.getUniqueCustomers(),
                    UserService.getAllUsers()
                ]);
                setPreviousCustomers(customers);
                // Filter users to only show relevant roles for assignment (Admins, Sales Reps, Partners)
                const relevantUsers = allUsers.filter(u =>
                    ['admin', 'sales_rep', 'partner', 'manager'].includes(u.role) && u.status === 'active'
                );
                setUsers(relevantUsers);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
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
        const postalCode = (customer.postalCode || '').toString();
        if (postalCode.length === 5) {
            return getSnowZone(postalCode);
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
        const normalized = normalizeCustomer(selectedCustomer.customer || {});

        // Auto-assign: If customer has no representative, assign current user (Sales Rep)
        // This prevents "stealing" if they already have one, but claims them if they are "orphan"
        if (!normalized.representative_id && currentUser) {
            normalized.representative_id = currentUser.id;
        }

        setCustomer(normalized);
        setSearchQuery(`${normalized.firstName} ${normalized.lastName}`.trim());
        setShowDropdown(false);
    };

    const handleClearSelection = () => {
        const reset = normalizeCustomer({});
        if (currentUser) {
            reset.representative_id = currentUser.id;
        }
        setCustomer(reset);
        setSearchQuery('');
        setShowDropdown(false);
    };

    // Filter customers based on search query
    const filteredCustomers = previousCustomers.filter(item => {
        if (!item || !item.customer) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();

        const firstName = (item.customer.firstName || '').toString().toLowerCase();
        const lastName = (item.customer.lastName || '').toString().toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const postal = (item.customer.postalCode || '').toString();
        const city = (item.customer.city || '').toString().toLowerCase();

        return (
            fullName.includes(query) ||
            postal.includes(query) ||
            city.includes(query)
        );
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
                <div className="bg-gradient-to-r from-accent-soft/70 to-accent-soft p-6 rounded-2xl shadow-sm border border-accent/40">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Wyszukaj istniejącego klienta</h3>
                                <p className="text-sm text-accent-dark">Lub wprowadź nowe dane poniżej</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const anonymousCustomer: Customer = {
                                    id: undefined, // Will be created or found by ensureCustomer
                                    salutation: 'Firma',
                                    firstName: 'Szybka',
                                    lastName: 'Wycena', // Generic name
                                    companyName: 'Wycena Wstępna',
                                    email: 'anonymous@system.local', // Technical email to deduplicate
                                    phone: '',
                                    street: '-',
                                    houseNumber: '-',
                                    postalCode: '00000',
                                    city: '-',
                                    country: 'Deutschland',
                                    representative_id: currentUser?.id,
                                };
                                const defaultSnowZone = { id: 'II', value: 0.85, description: 'Domyślna strefa (Brak adresu)' };
                                onComplete(anonymousCustomer, defaultSnowZone);
                            }}
                            className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-lg hover:border-accent hover:text-accent font-medium text-sm transition-all flex items-center gap-2"
                        >
                            <span className="text-xl">⚡️</span>
                            Szybka Wycena (Bez danych)
                        </button>
                    </div>
                    <div className="relative customer-search-container">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Wpisz imię, nazwisko, miasto lub kod pocztowy..."
                            className="w-full p-3 pl-10 border-2 border-accent/60 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-white shadow-sm transition-all"
                        />
                        <svg className="w-5 h-5 text-accent absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-accent/40 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {filteredCustomers.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectCustomer(item)}
                                        className="p-4 hover:bg-accent-soft/60 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
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
                            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-accent/40 rounded-xl shadow-xl p-4 text-slate-500 text-sm">
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
                                    <p className="text-sm text-accent-dark mt-1">Obciążenie: {snowZone.value} kN/m²</p>
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

                    <div className="space-y-5">
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
                    </div>
                </section>

                {/* Section 4: Assignments (New) */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-2xl">🤝</span>
                        <h3 className="text-xl font-bold text-slate-800">Przypisania</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Opiekun / Przedstawiciel</label>
                            <select
                                name="representative_id"
                                value={customer.representative_id || ''}
                                onChange={handleChange}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all bg-white"
                            >
                                <option value="">-- Wybierz opiekuna --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.role})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Osoba odpowiedzialna za kontakt z klientem.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Osoba Podpisująca Umowę</label>
                            <select
                                name="contract_signer_id"
                                value={customer.contract_signer_id || ''}
                                onChange={handleChange}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all bg-white"
                            >
                                <option value="">-- Wybierz osobę --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.role})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Osoba z firmy, która podpisze umowę.</p>
                        </div>
                    </div>
                </section>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-accent/30 hover:shadow-xl hover:scale-[1.02] flex items-center gap-3"
                    >
                        <span>{submitLabel || 'Dalej: Konfiguracja Produktu'}</span>
                        {submitLabel ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
