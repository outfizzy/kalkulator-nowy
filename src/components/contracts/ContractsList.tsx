import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Contract } from '../../types';
import { DatabaseService } from '../../services/database';

export const ContractsList: React.FC = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadContracts = async () => {
            try {
                const data = await DatabaseService.getContracts();
                setContracts(data);
            } catch (error) {
                console.error('Error loading contracts:', error);
            }
        };

        loadContracts();
    }, []);

    const filteredContracts = contracts.filter(c => {
        const term = searchTerm.toLowerCase();
        const contractNumber = c.contractNumber.toLowerCase();
        const lastName = (c.client.lastName || '').toString().toLowerCase();
        const city = (c.client.city || '').toString().toLowerCase();

        return (
            contractNumber.includes(term) ||
            lastName.includes(term) ||
            city.includes(term)
        );
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'signed': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-accent-soft text-accent-dark';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'signed': return 'Podpisana';
            case 'completed': return 'Zakończona';
            case 'cancelled': return 'Anulowana';
            default: return 'Szkic';
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Lista Umów</h1>
                        <p className="text-slate-500">Zarządzaj umowami i dokumentacją</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Szukaj po numerze, nazwisku lub mieście..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Numer</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Klient</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data Utworzenia</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Wartość Netto</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Prowizja (5%)</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            Brak umów spełniających kryteria wyszukiwania
                                        </td>
                                    </tr>
                                ) : (
                                    filteredContracts.map((contract) => (
                                        <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                                {contract.contractNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {contract.client.firstName} {contract.client.lastName}
                                                </div>
                                                <div className="text-xs text-slate-500">{contract.client.city}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(contract.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(contract.status)}`}>
                                                    {getStatusLabel(contract.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                                                {(contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet).toFixed(2)} EUR
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                                {contract.commission.toFixed(2)} EUR
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => navigate(`/contracts/${contract.id}`)}
                                                    className="text-accent hover:text-accent-dark font-bold"
                                                >
                                                    Szczegóły
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
