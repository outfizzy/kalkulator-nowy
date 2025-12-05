import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Customer } from '../../types';

interface CustomerWithStats {
    customer: Customer & { id?: string };
    lastOfferDate: Date;
    offerCount: number;
    latestOfferId: string;
}

export const CustomersList: React.FC = () => {
    const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getUniqueCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
            toast.error('Nie udało się załadować klientów');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const filteredCustomers = customers.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const c = item.customer;

        return (
            c.firstName.toLowerCase().includes(query) ||
            c.lastName.toLowerCase().includes(query) ||
            c.city.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            c.phone.includes(query)
        );
    });

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie klientów...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Klienci</h1>
                    <p className="text-slate-500 mt-1">Baza klientów i historia kontaktów</p>
                </div>
                <Link
                    to="/customers/new"
                    className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Dodaj Klienta
                </Link>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Szukaj po nazwisku, mieście, emailu lub telefonie..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredCustomers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <p>Brak klientów do wyświetlenia</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Klient</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Kontakt</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Adres</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Oferty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ostatnia aktywność</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCustomers.map((item, idx) => (
                                    <tr key={item.customer.id || idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {item.customer.firstName} {item.customer.lastName}
                                            </div>
                                            <div className="text-xs text-slate-500">{item.customer.salutation}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">{item.customer.phone}</div>
                                            <div className="text-xs text-slate-500">{item.customer.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">{item.customer.street} {item.customer.houseNumber}</div>
                                            <div className="text-xs text-slate-500">{item.customer.postalCode} {item.customer.city}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {item.offerCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {item.lastOfferDate.getTime() > 0 ? item.lastOfferDate.toLocaleDateString('pl-PL') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            {item.customer.id ? (
                                                <Link
                                                    to={`/customers/${item.customer.id}`}
                                                    className="text-accent hover:text-accent-dark"
                                                >
                                                    Szczegóły
                                                </Link>
                                            ) : (
                                                <span className="text-slate-300 cursor-not-allowed" title="Brak ID klienta">
                                                    Szczegóły
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
