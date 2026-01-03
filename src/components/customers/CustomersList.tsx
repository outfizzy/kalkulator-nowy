import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Customer } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { MergeDuplicatesModal } from './MergeDuplicatesModal';

interface CustomerWithStats {
    customer: Customer & { id?: string };
    lastOfferDate: Date;
    offerCount: number;
    latestOfferId: string;
    contractCount: number;
    hasSignedContract: boolean;
}

export const CustomersList: React.FC = () => {
    const { isAdmin } = useAuth();
    const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'contracts' | 'unsigned'>('all');
    const [showMergeModal, setShowMergeModal] = useState(false);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            console.log('Fetching customers, contracts, and offers...');
            const [rawCustomers, rawContracts, rawOffers] = await Promise.all([
                DatabaseService.getCustomers(),
                DatabaseService.getContracts(),
                DatabaseService.getOffers()
            ]);

            // 1. Map Offer ID -> Customer ID (for linking contracts to customers via offers)
            const offerToCustomerMap = new Map<string, string>();
            const customerOfferStats = new Map<string, { count: number; lastDate: Date; latestId: string }>();

            rawOffers.forEach(offer => {
                const custId = offer.customer?.id;
                if (!custId) return;

                offerToCustomerMap.set(offer.id, custId);

                // Update Offer Stats
                const stats = customerOfferStats.get(custId) || { count: 0, lastDate: new Date(0), latestId: '' };
                stats.count++;
                if (offer.createdAt > stats.lastDate) {
                    stats.lastDate = offer.createdAt;
                    stats.latestId = offer.id;
                }
                customerOfferStats.set(custId, stats);
            });

            // 2. Map Customer ID -> Contract Stats
            const customerContractStats = new Map<string, { count: number; hasSigned: boolean }>();

            rawContracts.forEach(contract => {
                // Try to link via Offer first (most reliable FK path)
                let custId = contract.offerId ? offerToCustomerMap.get(contract.offerId) : undefined;

                // Fallback: Try client.id from contract snapshot
                if (!custId && contract.client?.id) {
                    custId = contract.client.id;
                }

                if (!custId) return;

                const stats = customerContractStats.get(custId) || { count: 0, hasSigned: false };
                stats.count++;

                // Check for signed status
                // Status can be 'signed', 'completed', 'paid' - all imply signed contract?
                // Or purely 'signed'. Let's include 'signed', 'verified', 'completed'.
                const isSigned = ['signed', 'verified', 'completed', 'paid'].includes(contract.status);
                if (isSigned) {
                    stats.hasSigned = true;
                }

                customerContractStats.set(custId, stats);
            });

            // 3. Merge into Customers
            const customersWithStats: CustomerWithStats[] = (rawCustomers || []).map(c => {
                const cId = c.id!; // ID should exist if fetched from DB
                const offerStats = customerOfferStats.get(cId) || { count: 0, lastDate: new Date(0), latestId: '' };
                const contractStats = customerContractStats.get(cId) || { count: 0, hasSigned: false };

                return {
                    customer: c,
                    lastOfferDate: offerStats.lastDate,
                    offerCount: offerStats.count,
                    latestOfferId: offerStats.latestId,
                    contractCount: contractStats.count,
                    hasSignedContract: contractStats.hasSigned
                };
            });

            // Sort by Last Activity (Offer Date)
            customersWithStats.sort((a, b) => b.lastOfferDate.getTime() - a.lastOfferDate.getTime());

            setCustomers(customersWithStats);
        } catch (error: any) {
            console.error('Error loading customers:', error);
            console.error('Error details:', error.message, error.details, error.hint);
            toast.error(`Błąd: ${error.message || 'Nie udało się załadować danych'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const filteredCustomers = customers.filter(item => {
        // 1. Text Search
        const query = searchQuery.toLowerCase();
        const c = item.customer;
        const matchesSearch = !searchQuery || (
            c.firstName.toLowerCase().includes(query) ||
            c.lastName.toLowerCase().includes(query) ||
            c.city.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            c.phone.includes(query)
        );

        if (!matchesSearch) return false;

        // 2. Tab Filter
        if (activeTab === 'contracts') {
            return item.hasSignedContract;
        }
        if (activeTab === 'unsigned') {
            return !item.hasSignedContract;
        }

        return true;
    });

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie klientów...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Klienci</h1>
                    <p className="text-slate-500 mt-1">Baza klientów, umów i ofert</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowMergeModal(true)}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Znajdź Duplikaty
                    </button>
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
            </div>

            {/* Tabs & Search */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Wszyscy
                    </button>
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'contracts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Umowy
                    </button>
                    <button
                        onClick={() => setActiveTab('unsigned')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'unsigned' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Niepodpisani
                    </button>
                </div>

                <div className="relative w-full md:w-96">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Szukaj klientów..."
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
                        <p>Brak klientów w tej kategorii</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Klient</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Kontakt</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Adres</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
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
                                            {item.hasSignedContract ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    Umowa ({item.contractCount})
                                                </span>
                                            ) : item.offerCount > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                    Oferta
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    Lead
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {item.offerCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {item.lastOfferDate.getTime() > 0 ? item.lastOfferDate.toLocaleDateString('pl-PL') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            {item.customer.id ? (
                                                <>
                                                    <Link
                                                        to={`/customers/${item.customer.id}`}
                                                        className="text-accent hover:text-accent-dark"
                                                    >
                                                        Szczegóły
                                                    </Link>
                                                    {isAdmin() && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (window.confirm('Czy na pewno chcesz trwale usunąć tego klienta? Wszystkie oferty i historia zostaną utracone.')) {
                                                                    try {
                                                                        await DatabaseService.deleteCustomer(item.customer.id!);
                                                                        toast.success('Klient został usunięty');
                                                                        loadCustomers();
                                                                    } catch (error) {
                                                                        console.error('Failed to delete customer:', error);
                                                                        toast.error('Błąd usuwania (sprawdź powiązania)');
                                                                    }
                                                                }
                                                            }}
                                                            className="text-red-500 hover:text-red-700 ml-4 hover:bg-red-50 p-1 rounded"
                                                            title="Usuń (Admin)"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </>
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

            {showMergeModal && (
                <MergeDuplicatesModal
                    onClose={() => setShowMergeModal(false)}
                    onMergeComplete={() => {
                        loadCustomers();
                    }}
                />
            )}
        </div>
    );
};
