import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import type { Contract } from '../../types';
import { toast } from 'react-hot-toast';

type FilterMode = 'all' | 'unpaid' | 'paid';

export const AdvancePaymentsList: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, currentUser } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterMode>('all');

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        setLoading(false);
        try {
            const all = await DatabaseService.getContracts();
            // Only contracts with advance > 0
            setContracts(all.filter(c => c.advanceAmount && c.advanceAmount > 0));
        } catch (err) {
            console.error('Error loading contracts:', err);
            toast.error('Błąd ładowania umów');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async (contract: Contract) => {
        if (!window.confirm(`Potwierdzić zaliczkę ${contract.advanceAmount?.toFixed(0)} € dla ${contract.contractNumber}?`)) return;
        try {
            await DatabaseService.updateContract(contract.id, { advancePaid: true });
            toast.success('Zaliczka potwierdzona ✅');
            loadContracts();
        } catch (err) {
            toast.error('Błąd potwierdzania');
        }
    };

    const handleUndoPayment = async (contract: Contract) => {
        if (!window.confirm(`Cofnąć potwierdzenie zaliczki dla ${contract.contractNumber}?`)) return;
        try {
            await DatabaseService.updateContract(contract.id, { advancePaid: false });
            toast.success('Cofnięto potwierdzenie');
            loadContracts();
        } catch (err) {
            toast.error('Błąd cofania');
        }
    };

    const filtered = contracts.filter(c => {
        if (filter === 'unpaid') return !c.advancePaid;
        if (filter === 'paid') return c.advancePaid;
        return true;
    });

    const totalAdvance = contracts.reduce((sum, c) => sum + (c.advanceAmount || 0), 0);
    const paidAdvance = contracts.filter(c => c.advancePaid).reduce((sum, c) => sum + (c.advanceAmount || 0), 0);
    const unpaidAdvance = totalAdvance - paidAdvance;
    const unpaidCount = contracts.filter(c => !c.advancePaid).length;
    const paidCount = contracts.filter(c => c.advancePaid).length;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">💰 Zaliczki</h1>
                        <p className="text-sm text-slate-500 hidden sm:block">Przegląd zaliczek do umów</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Łącznie zaliczek</div>
                        <div className="text-lg font-bold text-slate-800">{contracts.length}</div>
                        <div className="text-xs text-slate-500">{totalAdvance.toFixed(0)} €</div>
                    </div>
                    <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-red-400 uppercase mb-1">Oczekujące</div>
                        <div className="text-lg font-bold text-red-600">{unpaidCount}</div>
                        <div className="text-xs text-red-500 font-medium">{unpaidAdvance.toFixed(0)} €</div>
                    </div>
                    <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-green-400 uppercase mb-1">Potwierdzone</div>
                        <div className="text-lg font-bold text-green-600">{paidCount}</div>
                        <div className="text-xs text-green-500 font-medium">{paidAdvance.toFixed(0)} €</div>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">% Potwierdzonych</div>
                        <div className="text-lg font-bold text-amber-600">
                            {contracts.length > 0 ? Math.round((paidCount / contracts.length) * 100) : 0}%
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-1.5 mt-1">
                            <div
                                className="bg-amber-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${contracts.length > 0 ? (paidCount / contracts.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-slate-200 w-fit">
                    {([
                        { key: 'all', label: `Wszystkie (${contracts.length})` },
                        { key: 'unpaid', label: `❌ Oczekujące (${unpaidCount})` },
                        { key: 'paid', label: `✅ Potwierdzone (${paidCount})` },
                    ] as { key: FilterMode; label: string }[]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                filter === tab.key
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* ── Mobile Cards ── */}
                    <div className="lg:hidden divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-400">Brak zaliczek</div>
                        ) : filtered.map(contract => (
                            <div
                                key={contract.id}
                                className={`p-4 transition-colors ${!contract.advancePaid ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-bold text-sm text-slate-900 truncate">{contract.contractNumber}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            contract.advancePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {contract.advancePaid ? '✅ Opłacona' : '❌ Oczekuje'}
                                        </span>
                                    </div>
                                    <span className="font-bold text-sm text-slate-900 flex-shrink-0">
                                        {contract.advanceAmount?.toFixed(0)} €
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-sm text-slate-600 truncate">
                                            {contract.client.firstName} {contract.client.lastName}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">
                                            {contract.client.city}
                                            {contract.salesRep && ` · ${contract.salesRep.firstName} ${contract.salesRep.lastName}`}
                                        </div>
                                        {contract.advancePaid && contract.advancePaidByUser && (
                                            <div className="text-[10px] text-green-600 mt-0.5">
                                                Potw. {contract.advancePaidByUser.firstName} {contract.advancePaidByUser.lastName}
                                                {contract.advancePaidAt && ` · ${new Date(contract.advancePaidAt).toLocaleDateString('pl-PL')}`}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        {!contract.advancePaid ? (
                                            <button
                                                onClick={() => handleConfirmPayment(contract)}
                                                className="px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                ✅ Potwierdź
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleUndoPayment(contract)}
                                                className="px-2 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
                                            >
                                                ↩️ Cofnij
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate(`/contracts/${contract.id}`)}
                                            className="px-2 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-200 transition-colors"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Desktop Table ── */}
                    <div className="hidden lg:block">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Numer Umowy</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Klient</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Handlowiec</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Kwota Zaliczki</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Potwierdził</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Data Potwierdzenia</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                            Brak zaliczek spełniających kryteria
                                        </td>
                                    </tr>
                                ) : filtered.map(contract => (
                                    <tr
                                        key={contract.id}
                                        className={`transition-colors ${!contract.advancePaid ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                onClick={() => navigate(`/contracts/${contract.id}`)}
                                                className="font-bold text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                                            >
                                                {contract.contractNumber}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-sm text-slate-800">
                                                {contract.client.firstName} {contract.client.lastName}
                                            </div>
                                            <div className="text-xs text-slate-400">{contract.client.city}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {contract.salesRep ? `${contract.salesRep.firstName} ${contract.salesRep.lastName}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <span className="font-bold text-sm text-slate-900">{contract.advanceAmount?.toFixed(0)} €</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                contract.advancePaid
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700 animate-pulse'
                                            }`}>
                                                {contract.advancePaid ? '✅ Opłacona' : '❌ Oczekuje'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {contract.advancePaidByUser
                                                ? `${contract.advancePaidByUser.firstName} ${contract.advancePaidByUser.lastName}`
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                            {contract.advancePaidAt
                                                ? new Date(contract.advancePaidAt).toLocaleDateString('pl-PL', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!contract.advancePaid ? (
                                                    <button
                                                        onClick={() => handleConfirmPayment(contract)}
                                                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                                    >
                                                        ✅ Potwierdź
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleUndoPayment(contract)}
                                                        className="px-2.5 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
                                                    >
                                                        ↩️ Cofnij
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/contracts/${contract.id}`)}
                                                    className="px-2.5 py-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                                >
                                                    Otwórz →
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
