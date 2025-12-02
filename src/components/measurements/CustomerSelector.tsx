import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { Customer } from '../../types';

interface CustomerSelectorProps {
    onSelect: (customer: Customer) => void;
    onClose: () => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({ onSelect, onClose }) => {
    const [customers, setCustomers] = useState<{ customer: Customer; lastOfferDate: Date; offerCount: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const data = await DatabaseService.getUniqueCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(({ customer }) => {
        const search = searchTerm.toLowerCase();
        return (
            customer.firstName.toLowerCase().includes(search) ||
            customer.lastName.toLowerCase().includes(search) ||
            customer.city.toLowerCase().includes(search) ||
            customer.email.toLowerCase().includes(search) ||
            customer.phone.includes(search)
        );
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Wybierz Klienta</h2>
                        <p className="text-sm text-slate-500">Wyszukaj klienta z bazy ofert</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Szukaj po nazwisku, mieście, emailu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        </div>
                    ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => onSelect(item.customer)}
                                className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-accent hover:bg-accent/5 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-slate-800 group-hover:text-accent transition-colors">
                                            {item.customer.firstName} {item.customer.lastName}
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                            <span>{item.customer.city}, {item.customer.street} {item.customer.houseNumber}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1 flex gap-3">
                                            <span>📧 {item.customer.email}</span>
                                            {item.customer.phone && <span>📞 {item.customer.phone}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-medium bg-slate-100 px-2 py-1 rounded text-slate-600">
                                            Ofert: {item.offerCount}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            Ost: {new Date(item.lastOfferDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            Nie znaleziono klientów pasujących do wyszukiwania.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
