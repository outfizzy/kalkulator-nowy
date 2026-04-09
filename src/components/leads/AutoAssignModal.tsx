import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Lead, User } from '../../types';

interface AutoAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    unassignedLeads: Lead[];
}

type Strategy = 'equal' | 'plz' | 'manual';

interface RepAllocation {
    rep: User;
    selected: boolean;
    manualCount: number;
    previewLeads: Lead[];
}

export const AutoAssignModal: React.FC<AutoAssignModalProps> = ({ isOpen, onClose, onComplete, unassignedLeads }) => {
    const [allocations, setAllocations] = useState<RepAllocation[]>([]);
    const [strategy, setStrategy] = useState<Strategy>('equal');
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [workloadMap, setWorkloadMap] = useState<Map<string, number>>(new Map());

    // Load sales reps
    useEffect(() => {
        if (!isOpen) return;
        const loadReps = async () => {
            setLoading(true);
            try {
                const { data, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, status, phone')
                    .in('role', ['sales_rep', 'sales_rep_pl'])
                    .eq('status', 'active')
                    .order('full_name');

                if (profileError) {
                    console.error('[AutoAssign] Profile query error:', profileError);
                    toast.error('Błąd ładowania przedstawicieli');
                    setLoading(false);
                    return;
                }

                const users: User[] = (data || []).map(row => ({
                    id: row.id,
                    username: (row.full_name || '').split(' ')[0].toLowerCase() || '',
                    firstName: (row.full_name || '').split(' ')[0] || '',
                    lastName: (row.full_name || '').split(' ').slice(1).join(' ') || '',
                    email: '',
                    role: row.role as User['role'],
                    createdAt: new Date(),
                    phone: row.phone,
                    status: row.status as 'pending' | 'active' | 'blocked',
                }));

                if (users.length === 0) {
                    toast.error('Brak aktywnych przedstawicieli');
                    setLoading(false);
                    return;
                }

                // Load current workload (active leads per rep)
                const repIds = users.map(u => u.id);
                const { data: leadCounts } = await supabase
                    .from('leads')
                    .select('assigned_to')
                    .in('assigned_to', repIds)
                    .not('status', 'in', '("won","lost")');

                const wl = new Map<string, number>();
                repIds.forEach(id => wl.set(id, 0));
                (leadCounts || []).forEach((l: any) => {
                    if (l.assigned_to) wl.set(l.assigned_to, (wl.get(l.assigned_to) || 0) + 1);
                });
                setWorkloadMap(wl);

                // Initialize allocations — all selected by default
                setAllocations(users.map(u => ({
                    rep: u,
                    selected: true,
                    manualCount: 0,
                    previewLeads: [],
                })));
            } catch (err) {
                console.error('[AutoAssign] Failed to load reps:', err);
                toast.error('Nie udało się załadować przedstawicieli');
            } finally {
                setLoading(false);
            }
        };
        loadReps();
    }, [isOpen]);

    const selectedReps = useMemo(() => allocations.filter(a => a.selected), [allocations]);
    const totalLeads = unassignedLeads.length;

    // Calculate distribution preview
    const distribution = useMemo(() => {
        if (selectedReps.length === 0 || totalLeads === 0) return [];

        if (strategy === 'equal') {
            const perRep = Math.floor(totalLeads / selectedReps.length);
            const remainder = totalLeads % selectedReps.length;
            let offset = 0;
            return selectedReps.map((a, idx) => {
                const count = perRep + (idx < remainder ? 1 : 0);
                const leads = unassignedLeads.slice(offset, offset + count);
                offset += count;
                return { ...a, previewLeads: leads, manualCount: count };
            });
        }

        if (strategy === 'plz') {
            const plzGroups = new Map<string, Lead[]>();
            unassignedLeads.forEach(lead => {
                const plz = lead.customerData?.postalCode?.substring(0, 2) || 'XX';
                if (!plzGroups.has(plz)) plzGroups.set(plz, []);
                plzGroups.get(plz)!.push(lead);
            });

            const sortedGroups = [...plzGroups.entries()].sort((a, b) => b[1].length - a[1].length);

            const repLeads = new Map<string, Lead[]>();
            selectedReps.forEach(a => repLeads.set(a.rep.id, []));

            for (const [, leads] of sortedGroups) {
                let minRep = selectedReps[0].rep.id;
                let minCount = Infinity;
                for (const a of selectedReps) {
                    const current = (repLeads.get(a.rep.id) || []).length;
                    if (current < minCount) {
                        minCount = current;
                        minRep = a.rep.id;
                    }
                }
                repLeads.get(minRep)!.push(...leads);
            }

            return selectedReps.map(a => ({
                ...a,
                previewLeads: repLeads.get(a.rep.id) || [],
                manualCount: (repLeads.get(a.rep.id) || []).length,
            }));
        }

        if (strategy === 'manual') {
            let offset = 0;
            return selectedReps.map(a => {
                const count = Math.min(a.manualCount, totalLeads - offset);
                const leads = unassignedLeads.slice(offset, offset + count);
                offset += count;
                return { ...a, previewLeads: leads };
            });
        }

        return [];
    }, [selectedReps, strategy, unassignedLeads, totalLeads]);

    const totalAssigned = distribution.reduce((sum, d) => sum + d.previewLeads.length, 0);
    const unallocated = totalLeads - totalAssigned;

    const toggleRep = (repId: string) => {
        setAllocations(prev => prev.map(a =>
            a.rep.id === repId ? { ...a, selected: !a.selected } : a
        ));
    };

    const updateManualCount = (repId: string, count: number) => {
        setAllocations(prev => prev.map(a =>
            a.rep.id === repId ? { ...a, manualCount: Math.max(0, count) } : a
        ));
    };

    const handleAssign = async () => {
        if (distribution.length === 0 || totalAssigned === 0) return;

        setAssigning(true);
        const toastId = toast.loading('Przydzielam leady...');

        let assigned = 0;
        let errors = 0;

        try {
            // Batch update per rep — much faster than one-by-one
            for (const alloc of distribution) {
                if (alloc.previewLeads.length === 0) continue;

                const leadIds = alloc.previewLeads.map(l => l.id);

                // Batch update all leads for this rep at once
                const { error, count } = await supabase
                    .from('leads')
                    .update({
                        assigned_to: alloc.rep.id,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', leadIds)
                    .select('id', { count: 'exact', head: true });

                if (error) {
                    console.error(`[AutoAssign] Batch update failed for ${alloc.rep.firstName}:`, error);
                    errors += leadIds.length;
                } else {
                    assigned += count || leadIds.length;
                }

                // Send notification to rep
                try {
                    await supabase.from('notifications').insert({
                        user_id: alloc.rep.id,
                        type: 'info',
                        title: 'Nowe leady przydzielone',
                        message: `Otrzymałeś ${alloc.previewLeads.length} nowych leadów do obsługi`,
                        link: '/leads'
                    });
                } catch { /* non-critical */ }
            }

            toast.dismiss(toastId);
            if (assigned > 0) {
                toast.success(`Przydzielono ${assigned} leadów${errors > 0 ? ` (${errors} błędów)` : ''}`);
            } else {
                toast.error('Nie udało się przydzielić żadnego leada');
            }

            onComplete();
            onClose();
        } catch (err) {
            toast.dismiss(toastId);
            toast.error('Błąd przydzielania leadów');
            console.error('[AutoAssign] Error:', err);
        } finally {
            setAssigning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Przydziel leady
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {totalLeads} nieprzypisanych leadów do rozdzielenia
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-5">
                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="w-8 h-8 mx-auto mb-3 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
                            <p className="text-slate-400 text-sm">Ładowanie przedstawicieli...</p>
                        </div>
                    ) : allocations.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <p className="text-sm">Brak aktywnych przedstawicieli handlowych</p>
                        </div>
                    ) : (
                        <>
                            {/* Strategy Selector */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">Strategia podziału</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setStrategy('equal')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${strategy === 'equal' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="mb-1"><svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div>
                                        <div className="text-sm font-bold text-slate-800">Równo</div>
                                        <div className="text-[10px] text-slate-500">Każdy dostaje tyle samo</div>
                                    </button>
                                    <button
                                        onClick={() => setStrategy('plz')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${strategy === 'plz' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="mb-1"><svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                                        <div className="text-sm font-bold text-slate-800">Wg regionu</div>
                                        <div className="text-[10px] text-slate-500">Grupowanie po PLZ</div>
                                    </button>
                                    <button
                                        onClick={() => setStrategy('manual')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${strategy === 'manual' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="mb-1"><svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>
                                        <div className="text-sm font-bold text-slate-800">Manualnie</div>
                                        <div className="text-[10px] text-slate-500">Sam wybierasz ile</div>
                                    </button>
                                </div>
                            </div>

                            {/* Rep Selection */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Przedstawiciele ({selectedReps.length} wybranych)
                                </label>
                                <div className="space-y-2">
                                    {allocations.map((alloc) => {
                                        const workload = workloadMap.get(alloc.rep.id) || 0;
                                        const distItem = distribution.find(d => d.rep.id === alloc.rep.id);
                                        const willGet = distItem?.previewLeads.length || 0;

                                        return (
                                            <div
                                                key={alloc.rep.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${alloc.selected ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={alloc.selected}
                                                    onChange={() => toggleRep(alloc.rep.id)}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                />

                                                {/* Avatar */}
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {alloc.rep.firstName?.[0]}{alloc.rep.lastName?.[0]}
                                                </div>

                                                {/* Name + info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-slate-900">
                                                        {alloc.rep.firstName} {alloc.rep.lastName}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                            Aktywne: {workload}
                                                        </span>
                                                        {alloc.rep.role === 'sales_rep_pl' && (
                                                            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-bold">PL</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Count / Manual input */}
                                                {alloc.selected && (
                                                    <div className="flex items-center gap-2">
                                                        {strategy === 'manual' ? (
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={totalLeads}
                                                                value={alloc.manualCount}
                                                                onChange={(e) => updateManualCount(alloc.rep.id, parseInt(e.target.value) || 0)}
                                                                className="w-16 p-1.5 text-center text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                                                <span className="text-lg font-bold text-indigo-600">{willGet}</span>
                                                                <span className="text-xs text-slate-400">leadów</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* PLZ Preview — show distribution by region when PLZ strategy */}
                            {strategy === 'plz' && distribution.length > 0 && (
                                <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-200">
                                    <div className="text-xs font-medium text-violet-700 mb-2 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Podgląd regionów
                                    </div>
                                    <div className="space-y-1.5">
                                        {distribution.filter(d => d.previewLeads.length > 0).map(d => {
                                            const plzCounts = new Map<string, number>();
                                            d.previewLeads.forEach(l => {
                                                const plz = l.customerData?.postalCode?.substring(0, 2) || '??';
                                                plzCounts.set(plz, (plzCounts.get(plz) || 0) + 1);
                                            });
                                            const plzList = [...plzCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
                                            return (
                                                <div key={d.rep.id} className="flex items-center gap-2 text-xs">
                                                    <span className="font-medium text-slate-700 min-w-[100px]">{d.rep.firstName} {d.rep.lastName?.charAt(0)}.</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {plzList.map(([plz, count]) => (
                                                            <span key={plz} className="px-1.5 py-0.5 bg-white rounded border border-violet-200 text-violet-700 text-[10px] font-mono">
                                                                {plz}×{count}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Do przydzielenia:</span>
                                    <span className="font-bold text-slate-900">{totalLeads}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-slate-600">Przydzielone wg planu:</span>
                                    <span className="font-bold text-indigo-600">{totalAssigned}</span>
                                </div>
                                {unallocated > 0 && (
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="text-amber-600 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg> Nieprzydzielone:</span>
                                        <span className="font-bold text-amber-600">{unallocated}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        disabled={assigning}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={assigning || selectedReps.length === 0 || totalAssigned === 0}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {assigning ? (
                            <>
                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Przydzielam...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Przydziel {totalAssigned} leadów
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
