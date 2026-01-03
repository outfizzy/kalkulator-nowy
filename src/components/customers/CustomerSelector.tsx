
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';

interface CustomerSelectorProps {
    onSelect: (customer: Customer) => void;
    onCancel: () => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({ onSelect, onCancel }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [customerStats, setCustomerStats] = useState<Map<string, { hasContract: boolean; hasOffer: boolean }>>(new Map());

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
            const fullName = `${firstName} ${lastName}`.trim();

            return (
                lastName.includes(term) ||
                firstName.includes(term) ||
                fullName.includes(term) ||
                city.includes(term) ||
                email.includes(term) ||
                company.includes(term)
            );
        }).slice(0, 50); // Limit results

        setResults(filtered);
    }, [searchTerm, allCustomers]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Szukaj klienta (nazwisko, miasto, email)..."
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

            <div className="flex justify-end pt-2">
                <button
                    onClick={onCancel}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1"
                >
                    Anuluj szukanie
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
                {customer.city}, {customer.street} {customer.houseNumber}
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
