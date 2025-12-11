import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Contract, Installation } from '../../types';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
export const ContractsList: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const loadContracts = useCallback(async () => {
        try {
            const [contractsData, installationsData] = await Promise.all([
                DatabaseService.getContracts(),
                DatabaseService.getInstallations()
            ]);
            setContracts(contractsData);
            setInstallations(installationsData);
        } catch (error) {
            console.error('Error loading contracts:', error);
        }
    }, []); // No dependencies needed as setContracts and setInstallations are stable

    useEffect(() => {
        loadContracts();
    }, [loadContracts]); // Add loadContracts to dependencies

    const handleStatusChange = async (contractId: string, currentContract: Contract, newStatus: Contract['status']) => {
        // Confirm signing
        if (newStatus === 'signed' && currentContract.status !== 'signed') {
            if (!window.confirm('Czy na pewno chcesz oznaczyć tę umowę jako PODPISANĄ? Ta umowa będzie dostępna do utworzenia montażu.')) {
                return;
            }
        }

        try {
            // Pass ONLY status, updateContract will handle the rest safely now
            await DatabaseService.updateContract(contractId, { status: newStatus });

            if (newStatus === 'signed') {
                toast.success('Umowa podpisana! Możesz teraz utworzyć montaż w sekcji "Planowanie Montaży"');
            } else {
                toast.success('Status umowy zaktualizowany');
            }

            await loadContracts(); // Reload to show updated data
        } catch (error) {
            console.error('Error updating contract status:', error);
            toast.error('Błąd przy zmianie statusu umowy');
        }
    };

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
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Montaż</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Wartość Netto</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Prowizja</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                            Brak umów spełniających kryteria wyszukiwania
                                        </td>
                                    </tr>
                                ) : (
                                    filteredContracts.map((contract) => (
                                        <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                                {contract.contractNumber}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div
                                                    className="font-medium text-slate-800 cursor-pointer hover:text-accent"
                                                    onClick={() => {
                                                        if (contract.client.id) {
                                                            navigate(`/customers/${contract.client.id}`);
                                                        } else {
                                                            toast.error('Brak ID klienta');
                                                        }
                                                    }}
                                                >
                                                    {contract.client.firstName} {contract.client.lastName}
                                                </div>
                                                <div className="text-sm text-slate-500">{contract.client.city}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(contract.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={contract.status}
                                                    onChange={(e) => handleStatusChange(contract.id, contract, e.target.value as Contract['status'])}
                                                    className={`px-3 py-1 text-xs font-bold rounded-full border-2 cursor-pointer ${getStatusColor(contract.status)}`}
                                                >
                                                    <option value="draft">Szkic</option>
                                                    <option value="signed">Podpisana</option>
                                                    <option value="completed">Zakończona</option>
                                                    <option value="cancelled">Anulowana</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {(() => {
                                                    const installation = installations.find(i => i.offerId === contract.offerId);
                                                    if (!installation) return <span className="text-slate-300">-</span>;
                                                    const color = installation.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        installation.status === 'scheduled' ? 'bg-accent-soft text-accent-dark' :
                                                            'bg-yellow-100 text-yellow-700';
                                                    const label = installation.status === 'completed' ? 'Zakończony' :
                                                        installation.status === 'scheduled' ? 'Zaplanowany' : 'Oczekuje';
                                                    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{label}</span>;
                                                })()}
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
                                                {isAdmin() && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm('Czy na pewno chcesz usunąć tę umowę?')) {
                                                                try {
                                                                    await DatabaseService.deleteContract(contract.id);
                                                                    toast.success('Umowa usunięta');
                                                                    loadContracts();
                                                                } catch (err) {
                                                                    console.error('Error deleting contract:', err);
                                                                    toast.error('Błąd usuwania umowy');
                                                                }
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-700 ml-4 font-bold"
                                                        title="Usuń (Admin)"
                                                    >
                                                        Usuń
                                                    </button>
                                                )}
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
