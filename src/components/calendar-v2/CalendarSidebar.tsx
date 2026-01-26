import React, { useState } from 'react';
import type { Installation, Contract, ServiceTicket } from '../../types';

// ============================================================================
// CALENDAR SIDEBAR - Backlog Panel
// Shows contracts waiting for installation scheduling
// ============================================================================

interface CalendarSidebarProps {
    contracts: Contract[];
    serviceTickets: ServiceTicket[];
    pendingInstallations: Installation[];
    onSchedule: (id: string, type: 'contract' | 'service') => void;
}

type TabType = 'contracts' | 'services' | 'pending';

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
    contracts,
    serviceTickets,
    pendingInstallations,
    onSchedule
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('contracts');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter items by search
    const filteredContracts = contracts.filter(c => {
        const data = c.contractData;
        const searchLower = searchQuery.toLowerCase();
        return (
            data?.customer?.name?.toLowerCase().includes(searchLower) ||
            data?.customer?.city?.toLowerCase().includes(searchLower) ||
            c.id.toLowerCase().includes(searchQuery)
        );
    });

    const filteredTickets = serviceTickets.filter(t => {
        const searchLower = searchQuery.toLowerCase();
        return (
            t.ticketNumber?.toLowerCase().includes(searchLower) ||
            t.client?.firstName?.toLowerCase().includes(searchLower) ||
            t.client?.lastName?.toLowerCase().includes(searchLower)
        );
    });

    const filteredPending = pendingInstallations.filter(i => {
        const searchLower = searchQuery.toLowerCase();
        return (
            i.title?.toLowerCase().includes(searchLower) ||
            i.client?.firstName?.toLowerCase().includes(searchLower) ||
            i.client?.lastName?.toLowerCase().includes(searchLower)
        );
    });

    const handleDragStart = (e: React.DragEvent, id: string, type: 'contract' | 'service' | 'installation') => {
        e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-800 mb-3">📋 Do zaplanowania</h2>

                {/* Search */}
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('contracts')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'contracts'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Umowy ({contracts.length})
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'services'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Serwis ({serviceTickets.length})
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'pending'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Oczekujące ({pendingInstallations.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Contracts Tab */}
                {activeTab === 'contracts' && filteredContracts.map((contract) => (
                    <div
                        key={contract.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, contract.id, 'contract')}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:border-indigo-300 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">
                                    {contract.contractData?.customer?.name || 'Brak nazwy'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    📍 {contract.contractData?.customer?.city || 'Brak miasta'}
                                </p>
                                {contract.installationDaysEstimate && (
                                    <p className="text-xs text-indigo-600 mt-1">
                                        ⏱️ ~{contract.installationDaysEstimate} dni
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => onSchedule(contract.id, 'contract')}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-opacity"
                                title="Utwórz zlecenie"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                {/* Services Tab */}
                {activeTab === 'services' && filteredTickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id, 'service')}
                        className="p-3 bg-amber-50 rounded-lg border border-amber-200 shadow-sm cursor-grab hover:shadow-md hover:border-amber-400 transition-all"
                    >
                        <p className="font-medium text-amber-800 truncate">
                            🔧 {ticket.ticketNumber || 'Zgłoszenie serwisowe'}
                        </p>
                        <p className="text-xs text-amber-600 truncate mt-1">
                            {ticket.client?.firstName} {ticket.client?.lastName}
                        </p>
                    </div>
                ))}

                {/* Pending Installations Tab */}
                {activeTab === 'pending' && filteredPending.map((inst) => (
                    <div
                        key={inst.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, inst.id, 'installation')}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:border-slate-400 transition-all"
                    >
                        <p className="font-medium text-slate-800 truncate">
                            {inst.title || `${inst.client?.firstName} ${inst.client?.lastName}`}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-1">
                            📍 {inst.client?.city || 'Brak lokalizacji'}
                        </p>
                    </div>
                ))}

                {/* Empty State */}
                {((activeTab === 'contracts' && filteredContracts.length === 0) ||
                    (activeTab === 'services' && filteredTickets.length === 0) ||
                    (activeTab === 'pending' && filteredPending.length === 0)) && (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-sm">Brak elementów</p>
                        </div>
                    )}
            </div>
        </div>
    );
};
