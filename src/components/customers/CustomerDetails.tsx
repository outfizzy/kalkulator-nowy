import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Customer, Contract, Installation } from '../../types';

interface RingostatCall {
    id: string;
    date: string;
    duration: number;
    caller: string;
    callee: string;
    status: 'answered' | 'missed' | 'failed';
    direction: 'incoming' | 'outgoing';
    recording?: string;
}

interface CustomerDetailsProps {
    customer: Customer & { id?: string };
    onEdit: () => void;
    onBack: () => void;
}

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer, onEdit, onBack }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'logistics' | 'communication'>('overview');
    // Removed unused offers state, using contracts for financials/logistics mainly.
    // However, if we want to show draft offers, we might need it. 
    // For now, let's keep offers in stats but not in state list to avoid unused var warning if we don't render them all.
    // actually we DO render offers in "stats" calculation, but we can fetch them just for stats or render a summary.
    // Let's keep fetching offers for stats count.

    const [contracts, setContracts] = useState<Contract[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [calls, setCalls] = useState<RingostatCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOffers: 0,
        acceptedOffers: 0,
        totalSoldValue: 0,
        paidValue: 0
    });

    useEffect(() => {
        const loadData = async () => {
            if (!customer.id) return;
            try {
                // Parallel fetching for performance
                const [offersData, contractsData, installationsData] = await Promise.all([
                    DatabaseService.getCustomerOffers(customer.id),
                    DatabaseService.getCustomerContracts(customer.id),
                    DatabaseService.getCustomerInstallations(customer.id)
                ]);

                setContracts(contractsData);
                setInstallations(installationsData);

                // Calculate Stats
                const soldContracts = contractsData.filter(c => c.status === 'signed' || c.status === 'completed');
                const totalSold = soldContracts.reduce((sum, c) => sum + (c.pricing.finalPriceNet || c.pricing.sellingPriceNet || 0), 0);
                // Approx paid value: advance payments
                const paid = soldContracts.reduce((sum, c) => sum + (c.pricing.advancePayment || 0), 0);

                setStats({
                    totalOffers: offersData.length, // Used for stats
                    acceptedOffers: soldContracts.length,
                    totalSoldValue: totalSold,
                    paidValue: paid
                });

                // Fetch Ringostat Calls (Last 3 months)
                if (customer.phone) {
                    const today = new Date();
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(today.getMonth() - 3);

                    const dateTo = today.toISOString().split('T')[0];
                    const dateFrom = threeMonthsAgo.toISOString().split('T')[0];

                    const response = await fetch(`/api/ringostat-calls?date_from=${dateFrom}&date_to=${dateTo}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.calls) {
                            // Normalize customer phone for matching
                            const normalize = (p: string) => p.replace(/\D/g, '').replace(/^48/, '').replace(/^0048/, '');
                            const customerPhone = normalize(customer.phone);

                            const customerCalls = data.calls.filter((call: any) => {
                                const caller = normalize(call.caller);
                                const callee = normalize(call.callee);
                                return caller.includes(customerPhone) || callee.includes(customerPhone);
                            });
                            setCalls(customerCalls);
                        }
                    }
                }

            } catch (error) {
                console.error('Error loading customer data:', error);
                toast.error('Błąd ładowania danych klienta');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [customer.id, customer.phone]);

    const formatMoney = (amount: number) => amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('pl-PL');

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie danych...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        {customer.firstName} {customer.lastName}
                    </h1>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Klient aktywny
                        </span>
                        <span>•</span>
                        <span>{customer.city}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        Wróć
                    </button>
                    <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edytuj
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Wartość Zamówień</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{formatMoney(stats.totalSoldValue)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Wpłacono (Zaliczki)</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{formatMoney(stats.paidValue)}</div>
                    <div className="text-xs text-slate-400 mt-1">Pozostało: {formatMoney(stats.totalSoldValue - stats.paidValue)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Liczba Ofert</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{stats.totalOffers}</div>
                    <div className="text-xs text-slate-400 mt-1">{stats.acceptedOffers} przyjętych</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Ostatni Kontakt</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                        {calls.length > 0 ? formatDate(calls[0].date) : '-'}
                    </div>
                </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                <div className="border-b border-slate-200 flex">
                    {[
                        { id: 'overview', label: 'Podsumowanie', icon: 'M4 6h16M4 12h16M4 18h7' },
                        { id: 'financials', label: 'Oferty i Umowy', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { id: 'logistics', label: 'Realizacja i Produkty', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                        { id: 'communication', label: 'Historia Kontaktu', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Dane Kontaktowe</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-slate-50">
                                        <span className="text-slate-500">Telefon</span>
                                        <span className="font-medium text-slate-800">{customer.phone}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-50">
                                        <span className="text-slate-500">Email</span>
                                        <span className="font-medium text-slate-800">{customer.email || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-50">
                                        <span className="text-slate-500">Adres</span>
                                        <span className="font-medium text-slate-800 text-right">
                                            {customer.street} {customer.houseNumber}<br />
                                            {customer.postalCode} {customer.city}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Ostatnie Aktywności</h3>
                                <div className="space-y-3">
                                    {history.length === 0 && <span className="text-slate-400 text-sm">Brak aktywności</span>}
                                    {/* Simplified activity feed based on offers/contracts */}
                                    {contracts.slice(0, 3).map(c => (
                                        <div key={c.id} className="flex gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">Umowa {c.contractNumber}</div>
                                                <div className="text-slate-500">{formatDate(c.createdAt)} • {c.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {calls.slice(0, 3).map(call => (
                                        <div key={call.id} className="flex gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">Rozmowa ({call.direction === 'incoming' ? 'przych.' : 'wych.'})</div>
                                                <div className="text-slate-500">{formatDate(call.date)} • {Math.round(call.duration / 60)} min</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FINANCIALS TAB */}
                    {activeTab === 'financials' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Umowy i Płatności</h3>
                                <Link to={`/new-offer?customerId=${customer.id}`} className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
                                    + Nowa Oferta
                                </Link>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Numer</th>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Wartość</th>
                                        <th className="p-3">Zaliczka</th>
                                        <th className="p-3">Metoda</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 rounded-r-lg text-right">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {contracts.map(contract => (
                                        <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-medium text-slate-900">{contract.contractNumber}</td>
                                            <td className="p-3 text-slate-500">{formatDate(contract.createdAt)}</td>
                                            <td className="p-3 font-bold text-slate-800">
                                                {formatMoney(contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet || 0)}
                                            </td>
                                            <td className="p-3 text-green-600 font-medium">
                                                {contract.pricing.advancePayment ? (
                                                    <div>
                                                        {formatMoney(contract.pricing.advancePayment)}
                                                        <div className="text-[10px] text-slate-400">
                                                            {contract.pricing.advancePaymentDate ? formatDate(contract.pricing.advancePaymentDate) : ''}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-3 text-slate-600 capitalize">{contract.pricing.paymentMethod || '-'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${contract.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {contract.status === 'signed' ? 'Podpisana' : contract.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Link to={`/contracts/${contract.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Podgląd</Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {contracts.length === 0 && (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">Brak umów</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* LOGISTICS TAB */}
                    {activeTab === 'logistics' && (
                        <div className="space-y-6">
                            {/* Main Products from Contracts */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Główne Produkty (z Umów)</h3>
                                {contracts.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {contracts.map(contract => (
                                            <div key={contract.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-bl-lg">
                                                    {contract.contractNumber}
                                                </div>
                                                <div className="font-bold text-lg text-slate-800">{contract.product.modelId.toUpperCase()}</div>
                                                <div className="text-sm text-slate-600 mt-1">
                                                    {contract.product.width} x {contract.product.projection} mm
                                                </div>
                                                <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-2">
                                                    <span className="bg-slate-100 px-2 py-1 rounded">Kolor: {contract.product.color}</span>
                                                    <span className="bg-slate-100 px-2 py-1 rounded">Dach: {contract.product.roofType}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-slate-400 italic">Brak umów z produktami</div>
                                )}
                            </div>

                            {/* Additional Ordered Items */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Dodatkowe Elementy Zamówienia</h3>
                                {contracts.flatMap(c => c.orderedItems).length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {contracts.flatMap(c => c.orderedItems).map((item, i) => (
                                            <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                <div className="font-bold text-slate-800">{item.name}</div>
                                                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                                                    {item.category}
                                                </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${item.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        item.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {item.status === 'ordered' ? 'Zamówione' :
                                                            item.status === 'delivered' ? 'Dostarczone' : 'Oczekuje'}
                                                    </span>
                                                    {item.plannedDeliveryDate && (
                                                        <span className="text-[10px] text-slate-500">
                                                            Dostawa: {new Date(item.plannedDeliveryDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-slate-400 italic">Brak dodatkowych elementów</div>
                                )}
                            </div>

                            <div className="mt-8">
                                <h3 className="font-bold text-slate-800 mb-4">Planowane Dostawy / Montaże</h3>
                                {installations.length > 0 ? (
                                    <div className="space-y-3">
                                        {installations.map(inst => (
                                            <div key={inst.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg">
                                                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold flex-col leading-none">
                                                    <span className="text-lg">{inst.scheduledDate ? new Date(inst.scheduledDate).getDate() : '?'}</span>
                                                    <span className="text-[10px] uppercase">{inst.scheduledDate ? new Date(inst.scheduledDate).toLocaleString('pl-PL', { month: 'short' }) : '-'}</span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{inst.productSummary}</div>
                                                    <div className="text-sm text-slate-500">Status: {inst.status}</div>
                                                </div>
                                                <div className="ml-auto">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${inst.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {inst.status === 'completed' ? 'Zakończono' : 'Zaplanowano'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-slate-400 italic">Brak zaplanowanych montaży</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* COMMUNICATION TAB */}
                    {activeTab === 'communication' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800">Historia Połączeń (Ringostat)</h3>
                                <div className="text-xs text-slate-500">Ostatnie 3 miesiące</div>
                            </div>

                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {calls.length > 0 ? calls.map(call => (
                                    <div key={call.id} className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${call.direction === 'incoming' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {call.direction === 'incoming' ? '↙' : '↗'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">
                                                    {call.direction === 'incoming' ? 'Połączenie przychodzące' : 'Połączenie wychodzące'}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {formatDate(call.date)} {new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {Math.ceil(call.duration / 60)} min
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${call.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {call.status === 'answered' ? 'Odebrane' : 'Nieodebrane'}
                                            </div>
                                            {call.recording && (
                                                <audio controls src={call.recording} className="h-8 w-48" />
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-slate-400">Brak historii połączeń</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
