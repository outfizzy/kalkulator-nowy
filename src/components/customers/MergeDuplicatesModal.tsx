import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';

interface DuplicatesGroup {
    key: string;
    type: 'email' | 'name';
    customers: Customer[];
}

interface MergeDuplicatesModalProps {
    onClose: () => void;
    onMergeComplete: () => void;
}

export const MergeDuplicatesModal: React.FC<MergeDuplicatesModalProps> = ({ onClose, onMergeComplete }) => {
    const [scanning, setScanning] = useState(true);
    const [duplicates, setDuplicates] = useState<DuplicatesGroup[]>([]);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        scanForDuplicates();
    }, []);

    const scanForDuplicates = async () => {
        setScanning(true);
        try {
            const groups = await DatabaseService.findDuplicates();
            setDuplicates(groups);

            // Initialize selections with first customer of each group
            const initialSelections: Record<string, string> = {};
            groups.forEach(g => {
                if (g.customers.length > 0 && g.customers[0].id) {
                    initialSelections[g.key] = g.customers[0].id;
                }
            });
            setSelections(initialSelections);
        } catch (error) {
            console.error('Scan failed', error);
            toast.error('Błąd podczas skanowania bazy');
        } finally {
            setScanning(false);
        }
    };

    const handleMerge = async (group: DuplicatesGroup) => {
        const primaryId = selections[group.key];
        if (!primaryId) return;

        const idsToMerge = group.customers.map(c => c.id).filter(id => id && id !== primaryId) as string[];

        if (idsToMerge.length === 0) return;

        setProcessing(group.key);
        try {
            await DatabaseService.mergeCustomers(primaryId, idsToMerge);
            toast.success('Pomyślnie scalono klientów');
            // Remove group from list locally
            setDuplicates(prev => prev.filter(g => g.key !== group.key));
            // Update selections cleanup
            setSelections(prev => {
                const next = { ...prev };
                delete next[group.key];
                return next;
            });
            onMergeComplete();
        } catch (error) {
            console.error('Merge failed', error);
            toast.error('Wystąpił błąd podczas scalania');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Menedżer Duplikatów
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Wykryj i połącz zduplikowane konta klientów</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {scanning ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-600 font-medium">Analizowanie bazy klientów...</p>
                            <p className="text-xs text-slate-400 mt-2">Szukam powtarzających się adresów email i nazwisk</p>
                        </div>
                    ) : duplicates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Brak duplikatów!</h3>
                            <p className="text-slate-500 max-w-md">Twoja baza klientów wygląda na uporządkowaną. Nie znaleziono żadnych powtarzających się rekordów.</p>
                        </div>
                    ) : (
                        duplicates.map((group) => {
                            const primaryId = selections[group.key];

                            return (
                                <div key={group.key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-md ${group.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {group.type === 'email' ? 'Ten sam Email' : 'Podobne Nazwisko'}
                                            </span>
                                            <span className="font-mono text-sm font-semibold text-slate-700">{group.key}</span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-400">{group.customers.length} rekordy</span>
                                    </div>

                                    <div className="p-6">
                                        <div className="space-y-3 mb-6">
                                            {group.customers.map(customer => (
                                                <div
                                                    key={customer.id}
                                                    onClick={() => customer.id && setSelections(prev => ({ ...prev, [group.key]: customer.id! }))}
                                                    className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${customer.id === primaryId
                                                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                                                        : 'border-slate-100 hover:border-purple-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${customer.id === primaryId ? 'border-purple-600' : 'border-slate-300'
                                                        }`}>
                                                        {customer.id === primaryId && <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />}
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">{customer.firstName} {customer.lastName}</div>
                                                            <div className="text-xs text-slate-500">ID: {customer.id?.slice(0, 8)}...</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-slate-700">{customer.email || '-'}</div>
                                                            <div className="text-xs text-slate-500">{customer.phone || '-'}</div>
                                                        </div>
                                                        <div className="text-right md:text-left">
                                                            <div className="text-sm text-slate-700">{customer.city}, {customer.street}</div>
                                                        </div>
                                                    </div>

                                                    {customer.id === primaryId && (
                                                        <div className="absolute top-2 right-2 text-[10px] font-bold text-purple-600 bg-white px-2 py-0.5 rounded shadow-sm">
                                                            GLÓWNY
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                            <div className="text-xs text-slate-500 self-center mr-auto">
                                                Wybierz konto <b>główne</b> powyżej. Pozostałe zostaną usunięte, a ich dane przeniesione.
                                            </div>
                                            <button
                                                onClick={() => handleMerge(group)}
                                                disabled={processing === group.key || !primaryId}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {processing === group.key ? (
                                                    <>
                                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".3" /><path fill="currentColor" d="M20 12a8 8 0 0 0-8-8V2a10 10 0 0 1 10 10Z" /></svg>
                                                        Scalanie...
                                                    </>
                                                ) : (
                                                    'Scal grupę'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
                        Zamknij podgląd
                    </button>
                </div>
            </div>
        </div>
    );
};
