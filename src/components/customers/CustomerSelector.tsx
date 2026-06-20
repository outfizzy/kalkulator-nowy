
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';

interface CustomerSelectorProps {
    onSelect: (customer: Customer) => void;
    onCancel: () => void;
    /** 'pl' = formularz po polsku z polskimi domyślnymi (zadaszto.pl), 'de' = niemiecki (Polendach24) */
    locale?: 'de' | 'pl';
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({ onSelect, onCancel, locale = 'de' }) => {
    const isPL = locale === 'pl';
    const L = (de: string, pl: string) => (isPL ? pl : de);
    const salutations: Customer['salutation'][] = isPL ? ['Pan', 'Pani', 'Firma'] : ['Herr', 'Frau', 'Firma'];
    const [mode, setMode] = useState<'search' | 'new'>('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [customerStats, setCustomerStats] = useState<Map<string, { hasContract: boolean; hasOffer: boolean }>>(new Map());

    // New customer form state
    const [newCustomer, setNewCustomer] = useState<{ salutation: Customer['salutation']; firstName: string; lastName: string; companyName: string; street: string; houseNumber: string; postalCode: string; city: string; phone: string; email: string; country: string }>({
        salutation: salutations[0],
        firstName: '',
        lastName: '',
        companyName: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        phone: '',
        email: '',
        country: isPL ? 'Polska' : 'Deutschland',
    });
    const [isCreating, setIsCreating] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [customers, { data: contracts }, { data: offers }] = await Promise.all([
                DatabaseService.getCustomers(),
                supabase.from('contracts').select('customer_id'),
                supabase.from('offers').select('customer_id')
            ]);

            const stats = new Map<string, { hasContract: boolean; hasOffer: boolean }>();

            const contractCustIds = new Set((contracts || []).map((c: { customer_id: any }) => c.customer_id) || []);
            const offerCustIds = new Set((offers || []).map((o: { customer_id: any }) => o.customer_id) || []);

            customers.forEach(c => {
                if (c.id) {
                    stats.set(c.id, {
                        hasContract: contractCustIds.has(c.id),
                        hasOffer: offerCustIds.has(c.id)
                    });
                }
            });

            setCustomerStats(stats);
            setAllCustomers(customers);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Błąd ładowania danych');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = allCustomers.filter(c => {
            const lastName = (c.lastName || '').toLowerCase();
            const firstName = (c.firstName || '').toLowerCase();
            const city = (c.city || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const company = (c.companyName || '').toLowerCase();
            const phone = (c.phone || '');
            const fullName = `${firstName} ${lastName}`.trim();

            return (
                lastName.includes(term) ||
                firstName.includes(term) ||
                fullName.includes(term) ||
                city.includes(term) ||
                email.includes(term) ||
                company.includes(term) ||
                phone.includes(term)
            );
        }).slice(0, 50); // Limit results

        setResults(filtered);
    }, [searchTerm, allCustomers]);

    const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewCustomer(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleCreateAndSelect = async () => {
        // Validate
        const errors: Record<string, string> = {};
        if (!newCustomer.lastName.trim()) errors.lastName = 'Nazwisko jest wymagane';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsCreating(true);
        try {
            const created = await DatabaseService.createCustomer({
                salutation: newCustomer.salutation,
                firstName: newCustomer.firstName.trim(),
                lastName: newCustomer.lastName.trim(),
                companyName: newCustomer.companyName.trim() || undefined,
                street: newCustomer.street.trim(),
                houseNumber: newCustomer.houseNumber.trim(),
                postalCode: newCustomer.postalCode.trim(),
                city: newCustomer.city.trim(),
                phone: newCustomer.phone.trim(),
                email: newCustomer.email.trim(),
                country: newCustomer.country,
                source: 'manual',
            } as any);

            toast.success(`Klient ${created.first_name || newCustomer.firstName} ${created.last_name || newCustomer.lastName} utworzony`);

            // Normalize the created customer for the contract modal
            const normalized: Customer = {
                id: created.id,
                salutation: created.salutation || newCustomer.salutation,
                firstName: created.first_name || newCustomer.firstName,
                lastName: created.last_name || newCustomer.lastName,
                companyName: created.company_name || newCustomer.companyName,
                street: created.street || newCustomer.street,
                houseNumber: created.house_number || newCustomer.houseNumber,
                postalCode: created.postal_code || newCustomer.postalCode,
                city: created.city || newCustomer.city,
                phone: created.phone || newCustomer.phone,
                email: created.email || newCustomer.email,
                country: created.country || newCustomer.country,
            };

            onSelect(normalized);
        } catch (error: any) {
            console.error('Error creating customer:', error);
            toast.error(`Błąd tworzenia klienta: ${error.message || 'Nieznany błąd'}`);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                    type="button"
                    onClick={() => setMode('search')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        mode === 'search'
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Z bazy danych
                </button>
                <button
                    type="button"
                    onClick={() => setMode('new')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        mode === 'new'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowy klient
                </button>
            </div>

            {/* ─── Search Mode ─── */}
            {mode === 'search' && (
                <>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Szukaj klienta (nazwisko, miasto, email, telefon)..."
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            autoFocus
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-lg">
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-500">Ładowanie bazy klientów...</div>
                        ) : searchTerm && results.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-500 font-medium">Nie znaleziono klientów</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Pre-fill the new customer form with search term as lastName
                                        setNewCustomer(prev => ({ ...prev, lastName: searchTerm }));
                                        setMode('new');
                                    }}
                                    className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors inline-flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Utwórz nowego klienta „{searchTerm}"
                                </button>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {/* Group: Contracts */}
                                {results.filter(c => c.id && customerStats.get(c.id)?.hasContract).length > 0 && (
                                    <>
                                        <div className="bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 uppercase tracking-wider sticky top-0">
                                            Klienci z Umowami
                                        </div>
                                        {results
                                            .filter(c => c.id && customerStats.get(c.id)?.hasContract)
                                            .map(customer => (
                                                <CustomerResultItem key={customer.id} customer={customer} onSelect={onSelect} />
                                            ))
                                        }
                                    </>
                                )}

                                {/* Group: Offers */}
                                {results.filter(c => c.id && !customerStats.get(c.id)?.hasContract && customerStats.get(c.id)?.hasOffer).length > 0 && (
                                    <>
                                        <div className="bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider sticky top-0">
                                            Potencjalni Klienci (Oferty)
                                        </div>
                                        {results
                                            .filter(c => c.id && !customerStats.get(c.id)?.hasContract && customerStats.get(c.id)?.hasOffer)
                                            .map(customer => (
                                                <CustomerResultItem key={customer.id} customer={customer} onSelect={onSelect} />
                                            ))
                                        }
                                    </>
                                )}

                                {/* Group: Others */}
                                {results.filter(c => c.id && !customerStats.get(c.id)?.hasContract && !customerStats.get(c.id)?.hasOffer).length > 0 && (
                                    <>
                                        <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider sticky top-0">
                                            Pozostali
                                        </div>
                                        {results
                                            .filter(c => c.id && !customerStats.get(c.id)?.hasContract && !customerStats.get(c.id)?.hasOffer)
                                            .map(customer => (
                                                <CustomerResultItem key={customer.id} customer={customer} onSelect={onSelect} />
                                            ))
                                        }
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                Wpisz frazę aby wyszukać...
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ─── New Customer Mode ─── */}
            {mode === 'new' && (
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Klient zostanie automatycznie dodany do bazy i przypisany do umowy.
                        </p>
                    </div>

                    {/* Salutation */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{L('Zwrot / Anrede', 'Zwrot')}</label>
                        <div className="flex gap-2">
                            {salutations.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setNewCustomer(prev => ({ ...prev, salutation: opt }))}
                                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
                                        newCustomer.salutation === opt
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{L('Imię / Vorname', 'Imię')}</label>
                            <input
                                type="text"
                                name="firstName"
                                value={newCustomer.firstName}
                                onChange={handleNewCustomerChange}
                                placeholder={L('Hans', 'Jan')}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                {L('Nazwisko / Nachname', 'Nazwisko')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={newCustomer.lastName}
                                onChange={handleNewCustomerChange}
                                placeholder={L('Müller', 'Kowalski')}
                                className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none ${
                                    formErrors.lastName ? 'border-red-400 bg-red-50' : 'border-slate-300'
                                }`}
                            />
                            {formErrors.lastName && <p className="text-xs text-red-500 mt-0.5">{formErrors.lastName}</p>}
                        </div>
                    </div>

                    {/* Company */}
                    {newCustomer.salutation === 'Firma' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Firma</label>
                            <input
                                type="text"
                                name="companyName"
                                value={newCustomer.companyName}
                                onChange={handleNewCustomerChange}
                                placeholder="Firma GmbH"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                    )}

                    {/* Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{L('Ulica / Straße', 'Ulica')}</label>
                            <input
                                type="text"
                                name="street"
                                value={newCustomer.street}
                                onChange={handleNewCustomerChange}
                                placeholder={L('Musterstraße', 'ul. Przykładowa')}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nr</label>
                            <input
                                type="text"
                                name="houseNumber"
                                value={newCustomer.houseNumber}
                                onChange={handleNewCustomerChange}
                                placeholder="12a"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{L('PLZ', 'Kod pocztowy')}</label>
                            <input
                                type="text"
                                name="postalCode"
                                value={newCustomer.postalCode}
                                onChange={handleNewCustomerChange}
                                placeholder={L('12345', '00-001')}
                                maxLength={isPL ? 6 : 5}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{L('Miasto / Ort', 'Miasto')}</label>
                            <input
                                type="text"
                                name="city"
                                value={newCustomer.city}
                                onChange={handleNewCustomerChange}
                                placeholder={L('Berlin', 'Warszawa')}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Telefon</label>
                            <input
                                type="tel"
                                name="phone"
                                value={newCustomer.phone}
                                onChange={handleNewCustomerChange}
                                placeholder={L('+49...', '+48 600 100 200')}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={newCustomer.email}
                                onChange={handleNewCustomerChange}
                                placeholder={L('kunde@example.de', 'klient@example.pl')}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="button"
                        onClick={handleCreateAndSelect}
                        disabled={isCreating}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            isCreating
                                ? 'bg-slate-200 text-slate-400 cursor-wait'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                        }`}
                    >
                        {isCreating ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Tworzenie klienta...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Utwórz klienta i przejdź do umowy
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="flex justify-end pt-2">
                <button
                    onClick={onCancel}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1"
                >
                    Anuluj
                </button>
            </div>
        </div>
    );
};

const CustomerResultItem = ({ customer, onSelect }: { customer: Customer; onSelect: (c: Customer) => void }) => (
    <div
        onClick={() => onSelect(customer)}
        className="p-3 hover:bg-purple-50 transition-colors cursor-pointer group flex justify-between items-center"
    >
        <div>
            <p className="text-sm font-bold text-slate-800">
                {customer.firstName} {customer.lastName}
                {customer.companyName && <span className="ml-2 font-normal text-slate-500 text-xs">({customer.companyName})</span>}
            </p>
            <p className="text-xs text-slate-500">
                {customer.city}{customer.street ? `, ${customer.street} ${customer.houseNumber || ''}` : ''}
            </p>
            <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                <span>{customer.email}</span>
                {customer.phone && <span>• {customer.phone}</span>}
            </div>
        </div>
        <span className="opacity-0 group-hover:opacity-100 text-purple-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        </span>
    </div>
);
