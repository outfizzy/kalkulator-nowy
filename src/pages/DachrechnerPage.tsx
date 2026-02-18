import React, { useState, useEffect } from 'react';
import { MeasurementCalculator } from '../components/measurements/MeasurementCalculator';
import { LedCalculator } from '../components/led-calculator';
import { ProjectMeasurementService } from '../services/database/project-measurement.service';
import { DatabaseService } from '../services/database';
import { supabase } from '../lib/supabase';
import type { Customer, Contract } from '../types';
import toast from 'react-hot-toast';

export const DachrechnerPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedContractId, setSelectedContractId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [activeTab, setActiveTab] = useState<'dachrechner' | 'led'>('dachrechner');

    // Load customers on mount
    useEffect(() => {
        (async () => {
            try {
                const data = await DatabaseService.getCustomers();
                setCustomers(data);
            } catch {
                toast.error('Błąd ładowania klientów');
            } finally {
                setLoadingCustomers(false);
            }
        })();
    }, []);

    // Load contracts when customer changes
    useEffect(() => {
        if (!selectedCustomer?.id) {
            setContracts([]);
            setSelectedContractId('');
            return;
        }
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('contracts')
                    .select('id, contract_number, status, created_at')
                    .eq('customer_id', selectedCustomer.id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setContracts((data || []).map((c: any) => ({
                    ...c,
                    contractNumber: c.contract_number,
                })));
            } catch {
                console.error('Error loading contracts');
            }
        })();
    }, [selectedCustomer]);

    const filteredCustomers = searchTerm.trim()
        ? customers.filter(c => {
            const term = searchTerm.toLowerCase();
            return (
                (c.lastName || '').toLowerCase().includes(term) ||
                (c.firstName || '').toLowerCase().includes(term) ||
                (c.city || '').toLowerCase().includes(term) ||
                (c.companyName || '').toLowerCase().includes(term) ||
                (c.email || '').toLowerCase().includes(term)
            );
        }).slice(0, 20)
        : [];

    const handleSave = async (data: any) => {
        if (!selectedCustomer?.id) {
            toast.error('Wybierz klienta, aby zapisać pomiar');
            return;
        }
        try {
            await ProjectMeasurementService.createMeasurement({
                ...data,
                customerId: selectedCustomer.id,
                contractId: selectedContractId || undefined,
                status: 'draft'
            });
            toast.success('Pomiar zapisany pomyślnie!');
        } catch (error) {
            console.error('Error saving measurement:', error);
            toast.error('Błąd zapisu pomiaru');
        }
    };

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSearchTerm('');
        setShowSearch(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Dachrechner
                            </h1>
                            <p className="text-slate-500 mt-1">Kalkulator wymiarów konstrukcji dachowych</p>
                        </div>
                    </div>

                    {/* Customer & Contract Selector */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Customer */}
                            <div className="flex-1 min-w-[280px]">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                                    Klient
                                </label>
                                {selectedCustomer ? (
                                    <div className="flex items-center gap-3 bg-white rounded-lg border border-green-200 p-3">
                                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                            {(selectedCustomer.firstName || '')[0]}{(selectedCustomer.lastName || '')[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-sm truncate">
                                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                                                {selectedCustomer.companyName && <span className="font-normal text-slate-500 ml-1">({selectedCustomer.companyName})</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">
                                                {selectedCustomer.city}{selectedCustomer.street ? `, ${selectedCustomer.street} ${selectedCustomer.houseNumber || ''}` : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedCustomer(null); setSelectedContractId(''); }}
                                            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                            title="Zmień klienta"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => { setSearchTerm(e.target.value); setShowSearch(true); }}
                                            onFocus={() => setShowSearch(true)}
                                            placeholder={loadingCustomers ? 'Ładowanie...' : 'Szukaj klienta (nazwisko, miasto, firma)...'}
                                            disabled={loadingCustomers}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                        />
                                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>

                                        {showSearch && filteredCustomers.length > 0 && (
                                            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[250px] overflow-y-auto">
                                                {filteredCustomers.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => handleSelectCustomer(c)}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                    >
                                                        <div className="text-sm font-medium text-slate-800">
                                                            {c.firstName} {c.lastName}
                                                            {c.companyName && <span className="text-slate-500 ml-1 text-xs">({c.companyName})</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-400">{c.city}, {c.street}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Contract (optional) */}
                            <div className="w-[280px]">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                                    Umowa <span className="text-slate-400 font-normal">(opcjonalnie)</span>
                                </label>
                                <select
                                    value={selectedContractId}
                                    onChange={e => setSelectedContractId(e.target.value)}
                                    disabled={!selectedCustomer || contracts.length === 0}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <option value="">
                                        {!selectedCustomer ? 'Najpierw wybierz klienta' : contracts.length === 0 ? 'Brak umów' : '— Bez przypisania do umowy —'}
                                    </option>
                                    {contracts.map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {c.contractNumber || c.contract_number} ({c.status === 'signed' ? 'Podpisana' : c.status === 'completed' ? 'Zakończona' : 'Szkic'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!selectedCustomer && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Wybierz klienta, aby móc zapisać pomiar. Bez klienta kalkulator działa w trybie podglądu.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
                    <button
                        onClick={() => setActiveTab('dachrechner')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dachrechner'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200/50'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Dachrechner
                    </button>
                    <button
                        onClick={() => setActiveTab('led')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'led'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-200/50'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        <span className="text-lg">💡</span>
                        LED Rechner
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'dachrechner' ? (
                    <MeasurementCalculator onSave={selectedCustomer ? handleSave : undefined} />
                ) : (
                    <LedCalculator />
                )}
            </div>
        </div>
    );
};

export default DachrechnerPage;
