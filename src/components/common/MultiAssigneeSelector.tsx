import React, { useEffect, useState } from 'react';
import { UserService } from '../../services/database/user.service';
import type { User } from '../../types';

interface MultiAssigneeSelectorProps {
    currentPrimaryId?: string;
    currentAdditionalIds?: string[];
    onSave: (primaryId: string | null, additionalIds: string[]) => Promise<void>;
    onCancel: () => void;
}

export const MultiAssigneeSelector: React.FC<MultiAssigneeSelectorProps> = ({
    currentPrimaryId,
    currentAdditionalIds = [],
    onSave,
    onCancel
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [primaryId, setPrimaryId] = useState<string>(currentPrimaryId || '');
    const [additionalIds, setAdditionalIds] = useState<Set<string>>(new Set(currentAdditionalIds));
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const reps = await UserService.getSalesReps();
                setUsers(reps.filter(u => u.status === 'active'));
            } catch (e) {
                console.error('Failed to load reps', e);
            }
        };
        load();
    }, []);

    const handleToggle = (userId: string) => {
        const next = new Set(additionalIds);
        if (next.has(userId)) {
            next.delete(userId);
        } else {
            next.add(userId);
        }
        // If toggling the primary user off from additional, that's fine
        // If making someone additional who is primary, remove from additional
        if (userId === primaryId) return; // Can't add primary as additional
        setAdditionalIds(next);
    };

    const handleSetPrimary = (userId: string) => {
        // Remove from additional if was there
        const next = new Set(additionalIds);
        next.delete(userId);
        // If old primary exists and isn't being replaced, add them to additional
        if (primaryId && primaryId !== userId) {
            next.add(primaryId);
        }
        setPrimaryId(userId);
        setAdditionalIds(next);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Filter out primary from additional (safety)
            const finalAdditional = Array.from(additionalIds).filter(id => id !== primaryId);
            await onSave(primaryId || null, finalAdditional);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        if (!search) return true;
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const allSelected = new Set([...(primaryId ? [primaryId] : []), ...additionalIds]);

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-4 min-w-[280px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Opiekunowie
                </h4>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                    {allSelected.size} wybranych
                </span>
            </div>

            {/* Search */}
            {users.length > 5 && (
                <div className="relative mb-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Szukaj..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-slate-50"
                    />
                </div>
            )}

            {/* User List */}
            <div className="max-h-[240px] overflow-y-auto space-y-0.5 -mx-1 px-1">
                {filteredUsers.map(user => {
                    const isPrimary = user.id === primaryId;
                    const isAdditional = additionalIds.has(user.id);
                    const isSelected = isPrimary || isAdditional;

                    return (
                        <div
                            key={user.id}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all group ${
                                isPrimary
                                    ? 'bg-blue-50 border border-blue-200 ring-1 ring-blue-100'
                                    : isAdditional
                                        ? 'bg-emerald-50 border border-emerald-200'
                                        : 'hover:bg-slate-50 border border-transparent'
                            }`}
                            onClick={() => {
                                if (isPrimary) return; // Can't deselect primary by clicking, use star
                                handleToggle(user.id);
                            }}
                        >
                            {/* Checkbox */}
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                    ? isPrimary ? 'bg-blue-500 border-blue-500' : 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-300 group-hover:border-slate-400'
                            }`}>
                                {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isPrimary ? 'bg-blue-500 text-white' : isAdditional ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                                {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-800 truncate">{user.firstName} {user.lastName}</div>
                                {isPrimary && (
                                    <div className="text-[10px] text-blue-600 font-semibold">Główny opiekun</div>
                                )}
                            </div>

                            {/* Star = Set as Primary */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetPrimary(user.id);
                                }}
                                className={`p-1 rounded transition-colors shrink-0 ${
                                    isPrimary
                                        ? 'text-blue-500'
                                        : 'text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                                }`}
                                title={isPrimary ? 'Główny opiekun' : 'Ustaw jako głównego'}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isPrimary ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            </button>
                        </div>
                    );
                })}
                {filteredUsers.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">Brak wyników</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                    Anuluj
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                    {loading ? (
                        <span className="w-3.5 h-3.5 block rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                    Zapisz
                </button>
            </div>
        </div>
    );
};
