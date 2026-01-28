import React, { useState, useMemo } from 'react';
import type { Contract } from '../../types';
import { BacklogCard } from './BacklogCard';

interface CalendarSidebarProps {
    contracts: Contract[];
    onClose: () => void;
}

type Priority = 'urgent' | 'ready' | 'pending' | 'future';

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
    contracts,
    onClose
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
    const [expandedGroups, setExpandedGroups] = useState<Set<Priority>>(
        new Set(['urgent', 'ready'])
    );

    // Calculate priority for each contract
    const contractsWithPriority = useMemo(() => {
        return contracts.map(contract => {
            const deliveryDate = contract.deliveryDate ? new Date(contract.deliveryDate) : null;
            const today = new Date();
            const daysUntilDelivery = deliveryDate
                ? Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            let priority: Priority;

            if (deliveryDate && daysUntilDelivery !== null) {
                if (daysUntilDelivery < 0) {
                    // Parts delivered, not scheduled = URGENT
                    priority = 'urgent';
                } else if (daysUntilDelivery <= 3) {
                    // Delivery within 3 days = READY
                    priority = 'ready';
                } else if (daysUntilDelivery <= 7) {
                    // Delivery within week = PENDING
                    priority = 'pending';
                } else {
                    // Delivery 7+ days = FUTURE
                    priority = 'future';
                }
            } else {
                // No delivery date = PENDING
                priority = 'pending';
            }

            return { ...contract, priority };
        });
    }, [contracts]);

    // Filter and group contracts
    const filteredContracts = useMemo(() => {
        let filtered = contractsWithPriority;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.customerData?.firstName?.toLowerCase().includes(query) ||
                c.customerData?.lastName?.toLowerCase().includes(query) ||
                c.contractNumber?.toLowerCase().includes(query) ||
                c.customerData?.city?.toLowerCase().includes(query)
            );
        }

        // Priority filter
        if (selectedPriority !== 'all') {
            filtered = filtered.filter(c => c.priority === selectedPriority);
        }

        return filtered;
    }, [contractsWithPriority, searchQuery, selectedPriority]);

    // Group by priority
    const groupedContracts = useMemo(() => {
        const groups: Record<Priority, typeof filteredContracts> = {
            urgent: [],
            ready: [],
            pending: [],
            future: []
        };

        filteredContracts.forEach(contract => {
            groups[contract.priority].push(contract);
        });

        return groups;
    }, [filteredContracts]);

    const toggleGroup = (priority: Priority) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(priority)) {
                newSet.delete(priority);
            } else {
                newSet.add(priority);
            }
            return newSet;
        });
    };

    const priorityConfig = {
        urgent: {
            label: 'Pilne',
            icon: '🔴',
            color: 'bg-red-50 border-red-200 text-red-700',
            description: 'Części dostarczone, oczekuje na montaż'
        },
        ready: {
            label: 'Gotowe',
            icon: '🟡',
            color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
            description: 'Dostawa w ciągu 3 dni'
        },
        pending: {
            label: 'Oczekujące',
            icon: '🔵',
            color: 'bg-blue-50 border-blue-200 text-blue-700',
            description: 'Oczekuje na dostawę'
        },
        future: {
            label: 'Przyszłe',
            icon: '⚪',
            color: 'bg-slate-50 border-slate-200 text-slate-700',
            description: 'Dostawa za 7+ dni'
        }
    };

    return (
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">
                        Backlog
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <input
                        type="text"
                        placeholder="Szukaj klienta, umowy..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Priority Filter */}
                <div className="flex gap-1">
                    <button
                        onClick={() => setSelectedPriority('all')}
                        className={`px-2 py-1 text-xs font-medium rounded ${selectedPriority === 'all'
                                ? 'bg-accent text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Wszystkie ({filteredContracts.length})
                    </button>
                    {(Object.keys(priorityConfig) as Priority[]).map(priority => (
                        <button
                            key={priority}
                            onClick={() => setSelectedPriority(priority)}
                            className={`px-2 py-1 text-xs font-medium rounded ${selectedPriority === priority
                                    ? 'bg-accent text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {priorityConfig[priority].icon} {groupedContracts[priority].length}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contract Groups */}
            <div className="flex-1 overflow-y-auto">
                {(Object.keys(priorityConfig) as Priority[]).map(priority => {
                    const contracts = groupedContracts[priority];
                    if (contracts.length === 0) return null;

                    const config = priorityConfig[priority];
                    const isExpanded = expandedGroups.has(priority);

                    return (
                        <div key={priority} className="border-b border-slate-200">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(priority)}
                                className={`w-full p-3 flex items-center justify-between hover:bg-slate-50 ${config.color} border-l-4`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{config.icon}</span>
                                    <div className="text-left">
                                        <div className="font-semibold text-sm">
                                            {config.label}
                                        </div>
                                        <div className="text-xs opacity-75">
                                            {config.description}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold">
                                        {contracts.length}
                                    </span>
                                    <svg
                                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Group Content */}
                            {isExpanded && (
                                <div className="p-2 space-y-2">
                                    {contracts.map(contract => (
                                        <BacklogCard
                                            key={contract.id}
                                            contract={contract}
                                            priority={priority}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredContracts.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-medium">Brak umów</p>
                        <p className="text-sm mt-1">Wszystkie umowy zostały zaplanowane</p>
                    </div>
                )}
            </div>
        </div>
    );
};
