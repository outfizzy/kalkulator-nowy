import React, { useState } from 'react';
import type { Installation } from '../../../types';
import { JobCard } from './JobCard';

interface BacklogSidebarProps {
    installations: Installation[];
    onDragStart: (e: React.DragEvent, id: string) => void;
    onAutoSchedule: (selectedIds: string[]) => void;
    onItemClick: (installation: Installation) => void;
}

export const BacklogSidebar: React.FC<BacklogSidebarProps> = ({
    installations,
    onDragStart,
    onAutoSchedule,
    onItemClick
}) => {
    const [filterReady, setFilterReady] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Filter logic
    const filtered = installations.filter(inst => {
        if (filterReady && !inst.partsReady) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                inst.client.lastName?.toLowerCase().includes(query) ||
                inst.client.city?.toLowerCase().includes(query) ||
                inst.productSummary?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(i => i.id));
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 w-80">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white border-l-4 border-l-indigo-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Do zaplanowania 📋</h3>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                        {filtered.length}
                    </span>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <input
                        type="text"
                        placeholder="Szukaj klienta, miasta..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mb-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                        <div className={`
                            w-9 h-5 rounded-full flex items-center transition-colors p-1
                            ${filterReady ? 'bg-emerald-500' : 'bg-slate-300'}
                        `} onClick={() => setFilterReady(!filterReady)}>
                            <div className={`
                                w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform
                                ${filterReady ? 'translate-x-4' : 'translate-x-0'}
                            `} />
                        </div>
                        <span className="text-xs font-medium">Tylko gotowe</span>
                    </label>
                </div>

                {/* Batch Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            setSelectedIds([]);
                        }}
                        className={`
                            flex-1 py-1.5 px-3 rounded text-xs font-medium border transition-colors
                            ${isSelectionMode
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}
                        `}
                    >
                        {isSelectionMode ? 'Anuluj wybór' : 'Wybierz wiele'}
                    </button>

                    {isSelectionMode && (
                        <button
                            onClick={() => onAutoSchedule(selectedIds)}
                            disabled={selectedIds.length === 0}
                            className={`
                                flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors
                                ${selectedIds.length > 0
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            Zaplanuj 🪄 ({selectedIds.length})
                        </button>
                    )}
                </div>

                {isSelectionMode && (
                    <button
                        onClick={handleSelectAll}
                        className="mt-2 text-[10px] text-indigo-600 font-medium hover:underline"
                    >
                        {selectedIds.length === filtered.length ? 'Odznacz wszystko' : 'Zaznacz widoczne'}
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Brak zleceń do zaplanowania
                    </div>
                ) : (
                    filtered.map(inst => (
                        <div key={inst.id} className="relative group">
                            {isSelectionMode && (
                                <div className="absolute top-3 right-3 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(inst.id)}
                                        onChange={() => toggleSelection(inst.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                            )}
                            <JobCard
                                installation={inst}
                                onDragStart={onDragStart}
                                onClick={() => onItemClick(inst)}
                                highlight={selectedIds.includes(inst.id)}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
