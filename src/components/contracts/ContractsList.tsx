import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Contract, Installation } from '../../types';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ContractStats } from './ContractStats';
import { LegacyImportModal } from './LegacyImportModal';
export const ContractsList: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, currentUser } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showStats, setShowStats] = useState(false);
    const [isLegacyImportOpen, setIsLegacyImportOpen] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const loadContracts = useCallback(async () => {
        try {
            setError(null);
            const [contractsData, installationsData] = await Promise.all([
                DatabaseService.getContracts(),
                DatabaseService.getInstallations()
            ]);
            setContracts(contractsData);
            setInstallations(installationsData);
        } catch (err: unknown) {
            console.error('Error loading contracts:', err);
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
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
            await DatabaseService.updateContract(contractId, {
                status: newStatus,
                signedBy: newStatus === 'signed' ? currentUser?.id : undefined
            });

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
                    {isAdmin() && (
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${showStats ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="font-medium text-sm">Statystyki</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsLegacyImportOpen(true)}
                        className="ml-2 p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-2 transition-all"
                    >
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="font-medium text-sm text-slate-700">Import Archiwalnej</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 w-full">
                                <p className="text-sm text-red-700 font-bold mb-1">
                                    Wystąpił błąd podczas ładowania umów:
                                </p>
                                <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                                    {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}


                {showStats && isAdmin() && <ContractStats contracts={filteredContracts} />}

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
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Handlowiec</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Podpisana</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Montaż</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Wartość Netto</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Prowizja</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
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
                                                <div className="flex flex-col gap-1">
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
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {contract.salesRep ? `${contract.salesRep.firstName} ${contract.salesRep.lastName}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {contract.signedByUser ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{contract.signedByUser.firstName} {contract.signedByUser.lastName}</span>
                                                        {contract.signedAt && <span className="text-xs text-slate-400">{new Date(contract.signedAt).toLocaleDateString()}</span>}
                                                    </div>
                                                ) : '-'}
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

            {/* Legacy Import Modal */}
            <LegacyImportModal
                isOpen={isLegacyImportOpen}
                onClose={() => setIsLegacyImportOpen(false)}
                onSuccess={() => {
                    loadContracts();
                }}
            />
        </div>
    );
};
