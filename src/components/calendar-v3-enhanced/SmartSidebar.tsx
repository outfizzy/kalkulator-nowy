import React, { useState, useMemo } from 'react';
import type { Contract, ServiceTicket, Installation } from '../../types';
import { BacklogCard } from './BacklogCard';

interface SmartSidebarProps {
    contracts: Contract[];
    serviceTickets: ServiceTicket[];
    pendingInstallations: Installation[];
    onClose?: () => void;
    onSearchChange?: (query: string) => void;
}

type TabType = 'contracts' | 'services' | 'pending';

export const SmartSidebar: React.FC<SmartSidebarProps> = ({
    contracts,
    serviceTickets,
    pendingInstallations,
    onClose
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('contracts');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Filter items logic
    const filteredContracts = useMemo(() => contracts.filter(c => {
        if (!searchQuery) return true;
        const data = c.contractData;
        const searchLower = searchQuery.toLowerCase();
        return (
            data?.customer?.name?.toLowerCase().includes(searchLower) ||
            data?.customer?.city?.toLowerCase().includes(searchLower) ||
            c.contractNumber?.toLowerCase().includes(searchLower)
        );
    }), [contracts, searchQuery]);

    const filteredTickets = useMemo(() => serviceTickets.filter(t => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            t.ticketNumber?.toLowerCase().includes(searchLower) ||
            t.client?.firstName?.toLowerCase().includes(searchLower) ||
            t.client?.lastName?.toLowerCase().includes(searchLower)
        );
    }), [serviceTickets, searchQuery]);

    const filteredPending = useMemo(() => pendingInstallations.filter(i => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            i.title?.toLowerCase().includes(searchLower) ||
            i.client?.firstName?.toLowerCase().includes(searchLower) ||
            i.client?.lastName?.toLowerCase().includes(searchLower) ||
            i.contractNumber?.toLowerCase().includes(searchLower)
        );
    }), [pendingInstallations, searchQuery]);

    // Group Contracts by Region logic (V2 style)
    const groupedContracts = useMemo(() => {
        const groups = new Map<string, Contract[]>();

        filteredContracts.forEach(contract => {
            const clientData = contract.contractData?.client || contract.contractData?.customer;
            const postalCode = clientData?.postalCode || '';

            // Group by first 2 digits of postal code (Region)
            const region = postalCode.length >= 2
                ? `PLZ ${postalCode.substring(0, 2)}xxx`
                : 'Inne / Brak kodu';

            if (!groups.has(region)) groups.set(region, []);
            groups.get(region)!.push(contract);
        });

        // Initialize expanded state for new groups
        // We can do this in a useEffect but doing it lazily is fine too

        // Sort groups by region
        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, items]) => ({
                id: region,
                title: region,
                items: items,
                count: items.length
            }));
    }, [filteredContracts]);



    return (
        <div className="w-80 h-full flex flex-col border-r border-slate-200 bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-800">📋 Do zaplanowania</h2>
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange?.(e.target.value) || setSearchQuery(e.target.value)}
                        placeholder="Szukaj..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                    onClick={() => setActiveTab('contracts')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'contracts'
                        ? 'text-indigo-600 bg-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    Umowy
                    <span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                        {filteredContracts.length}
                    </span>
                    {activeTab === 'contracts' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'services'
                        ? 'text-indigo-600 bg-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    Serwis
                    <span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                        {filteredTickets.length}
                    </span>
                    {activeTab === 'services' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'pending'
                        ? 'text-indigo-600 bg-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    Inne
                    <span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                        {filteredPending.length}
                    </span>
                    {activeTab === 'pending' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                </button>
            </div>

            {/* Content Items */}
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
                {activeTab === 'contracts' && (
                    <div className="space-y-4">
                        {groupedContracts.map(group => (
                            <div key={group.id} className="space-y-2">
                                <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm px-1 py-1.5 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    <span>{group.title}</span>
                                    <span>{group.count}</span>
                                </div>
                                <div className="space-y-2">
                                    {group.items.map((contract) => (
                                        <BacklogCard
                                            key={contract.id}
                                            item={{
                                                id: contract.id,
                                                type: 'contract',
                                                priority: 'future',
                                                data: contract
                                            }}
                                            priority={'future'}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="space-y-2">
                        {filteredTickets.map(ticket => (
                            <BacklogCard
                                key={ticket.id}
                                item={{
                                    id: ticket.id,
                                    type: 'service',
                                    priority: 'future',
                                    data: ticket
                                }}
                                priority={'future'}
                            />
                        ))}
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="space-y-2">
                        {filteredPending.map(installation => (
                            <BacklogCard
                                key={installation.id}
                                item={{
                                    id: installation.id,
                                    type: 'installation',
                                    priority: 'future',
                                    data: installation
                                }}
                                priority={'future'}
                            />
                        ))}
                    </div>
                )}

                {((activeTab === 'contracts' && filteredContracts.length === 0) ||
                    (activeTab === 'services' && filteredTickets.length === 0) ||
                    (activeTab === 'pending' && filteredPending.length === 0)) && (
                        <div className="p-8 text-center text-slate-500">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="font-medium">Brak elementów</p>
                        </div>
                    )}
            </div>
        </div>
    );
};
