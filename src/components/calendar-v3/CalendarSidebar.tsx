import React, { useState, useMemo } from 'react';
import type { Installation, Contract, ServiceTicket } from '../../types';

interface CalendarSidebarProps {
    contracts: Contract[];
    serviceTickets: ServiceTicket[];
    pendingInstallations: Installation[];
    onSchedule: (id: string, type: 'contract' | 'service') => void;
    onClose: () => void;
}

type TabType = 'contracts' | 'services' | 'pending';

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
    contracts,
    serviceTickets,
    pendingInstallations,
    onSchedule,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('contracts');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedContract, setExpandedContract] = useState<string | null>(null);

    // === Helpers ===
    const getClientData = (contract: any) => {
        return contract.contractData?.client || contract.contractData?.customer || contract.client || {};
    };

    const getClientName = (client: any): string => {
        if (client?.name) return client.name;
        if (client?.firstName || client?.lastName) {
            return `${client.firstName || ''} ${client.lastName || ''}`.trim();
        }
        return 'Brak nazwy';
    };

    const getClientAddress = (client: any): string => {
        const street = client?.street || client?.address || '';
        const postalCode = client?.postalCode || client?.postal_code || '';
        const city = client?.city || '';
        const parts: string[] = [];
        if (street) parts.push(street);
        if (postalCode && city) parts.push(`${postalCode} ${city}`);
        else if (city) parts.push(city);
        return parts.length > 0 ? parts.join(', ') : '';
    };

    // === Filtering ===
    const filteredContracts = useMemo(() => {
        if (!searchQuery) return contracts;
        const q = searchQuery.toLowerCase();
        return contracts.filter(c => {
            const client = getClientData(c);
            return (
                getClientName(client).toLowerCase().includes(q) ||
                client?.city?.toLowerCase().includes(q) ||
                client?.postalCode?.toLowerCase().includes(q) ||
                c.contractNumber?.toLowerCase().includes(q)
            );
        });
    }, [contracts, searchQuery]);

    const filteredTickets = useMemo(() => {
        if (!searchQuery) return serviceTickets;
        const q = searchQuery.toLowerCase();
        return serviceTickets.filter(t =>
            t.ticketNumber?.toLowerCase().includes(q) ||
            t.client?.firstName?.toLowerCase().includes(q) ||
            t.client?.lastName?.toLowerCase().includes(q)
        );
    }, [serviceTickets, searchQuery]);

    const filteredPending = useMemo(() => {
        if (!searchQuery) return pendingInstallations;
        const q = searchQuery.toLowerCase();
        return pendingInstallations.filter(i =>
            i.title?.toLowerCase().includes(q) ||
            i.client?.firstName?.toLowerCase().includes(q) ||
            i.client?.lastName?.toLowerCase().includes(q)
        );
    }, [pendingInstallations, searchQuery]);

    // === Postal Code Grouping (for contracts) ===
    const groupedContracts = useMemo(() => {
        const groups = new Map<string, typeof filteredContracts>();

        filteredContracts.forEach(contract => {
            const client = getClientData(contract);
            const postalCode = client?.postalCode || client?.postal_code || '';
            const region = postalCode.length >= 2
                ? `PLZ ${postalCode.substring(0, 2)}xxx`
                : 'Inne / Brak kodu';

            if (!groups.has(region)) groups.set(region, []);
            groups.get(region)!.push(contract);
        });

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, items]) => ({
                postalCode: region,
                contracts: items.sort((a, b) =>
                    (a.contractNumber || '').localeCompare(b.contractNumber || '')
                )
            }));
    }, [filteredContracts]);

    // === Drag support ===
    const handleDragStart = (e: React.DragEvent, id: string, type: 'contract' | 'service' | 'installation') => {
        e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
        e.dataTransfer.effectAllowed = 'move';
    };

    // === Supply status ===
    const getSupplyBadge = (contract: any) => {
        const orderedItems = contract.orderedItems || [];
        if (orderedItems.length === 0) {
            return <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">📦 Brak elementów</span>;
        }

        const allDelivered = orderedItems.every((i: any) => i.status === 'delivered');
        const someDelivered = orderedItems.some((i: any) => i.status === 'delivered');
        const noneOrdered = orderedItems.every((i: any) => i.status === 'pending');
        const someOrdered = orderedItems.some((i: any) => i.status === 'ordered');

        if (allDelivered) return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Gotowe do montażu</span>;
        if (someDelivered) return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⚠️ Częściowo</span>;
        if (noneOrdered) return <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">❌ Nie zamówiono</span>;
        if (someOrdered) return <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🚚 W dostawie</span>;
        return <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">⏳ Oczekuje</span>;
    };

    const activeCount = activeTab === 'contracts' ? contracts.length
        : activeTab === 'services' ? serviceTickets.length
            : pendingInstallations.length;

    return (
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">📋 Do zaplanowania</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Szukaj klienta, umowy, miasta..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('contracts')}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'contracts'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    📄 Umowy ({contracts.length})
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'services'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    🔧 Serwis ({serviceTickets.length})
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'pending'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    ⏳ Oczekujące ({pendingInstallations.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

                {/* ======================== CONTRACTS TAB ======================== */}
                {activeTab === 'contracts' && groupedContracts.map((group) => (
                    <div key={group.postalCode} className="space-y-2">
                        {/* Region Header */}
                        <div className="sticky top-0 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm z-10">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-700">📮 {group.postalCode}</h3>
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                    {group.contracts.length} {group.contracts.length === 1 ? 'umowa' : 'umów'}
                                </span>
                            </div>
                        </div>

                        {/* Contracts in group */}
                        {group.contracts.map((contract) => {
                            const isExpanded = expandedContract === contract.id;
                            const clientData = getClientData(contract);
                            const orderedItems = contract.orderedItems || [];
                            const hasItems = orderedItems.length > 0;

                            return (
                                <div
                                    key={contract.id}
                                    className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all"
                                >
                                    {/* Card Header — Draggable */}
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, contract.id, 'contract')}
                                        className="p-3 cursor-grab group"
                                    >
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-800 truncate">
                                                    {contract.contractNumber}
                                                </p>
                                                <p className="font-medium text-[13px] text-slate-700 break-words">
                                                    {getClientName(clientData)}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                                    📍 {getClientAddress(clientData) || 'Brak adresu'}
                                                </p>
                                            </div>

                                            {/* Quick Schedule */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSchedule(contract.id, 'contract');
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-opacity flex-shrink-0"
                                                title="Utwórz zlecenie"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Status badges row */}
                                        <div className="flex items-center justify-between mt-2">
                                            {getSupplyBadge(contract)}

                                            {hasItems && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedContract(isExpanded ? null : contract.id);
                                                    }}
                                                    className="text-slate-400 hover:text-slate-600 p-1"
                                                >
                                                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>

                                        {/* Installation days estimate */}
                                        {(contract as any).installationDaysEstimate && (
                                            <p className="text-xs text-indigo-600 mt-1.5">
                                                ⏱️ Szac. czas montażu: ~{(contract as any).installationDaysEstimate} dni
                                            </p>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && hasItems && (
                                        <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-3">
                                            {/* Product Info */}
                                            {contract.product && (
                                                <div className="text-xs mt-2">
                                                    <p className="font-medium text-slate-700 mb-1">Produkt:</p>
                                                    <p className="text-slate-600">
                                                        {contract.product.modelId || 'Nieokreślony'}
                                                        {contract.product.width && contract.product.projection &&
                                                            ` - ${contract.product.width}x${contract.product.projection}mm`
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                            {/* Ordered Items */}
                                            <div className="text-xs">
                                                <p className="font-medium text-slate-700 mb-2">Zamówione elementy:</p>
                                                <div className="space-y-1.5">
                                                    {orderedItems.map((item: any) => (
                                                        <div key={item.id} className="flex justify-between items-start gap-2 p-2 bg-slate-50 rounded">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-slate-700 font-medium truncate">{item.name}</p>
                                                                {item.details && (
                                                                    <p className="text-slate-500 text-[10px] truncate">{item.details}</p>
                                                                )}
                                                                {item.plannedDeliveryDate && (
                                                                    <p className="text-slate-500 text-[10px] mt-0.5">
                                                                        📅 {new Date(item.plannedDeliveryDate).toLocaleDateString('pl-PL')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${item.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                                    item.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {item.status === 'delivered' ? '✓ Dostarczone' :
                                                                    item.status === 'ordered' ? '🚚 Zamówione' :
                                                                        '⏳ Oczekuje'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Earliest Delivery */}
                                            {orderedItems.some((i: any) => i.plannedDeliveryDate) && (
                                                <div className="text-xs bg-indigo-50 p-2 rounded">
                                                    <p className="font-medium text-indigo-700">
                                                        📦 Najwcześniejsza dostawa:{' '}
                                                        {new Date(
                                                            Math.min(...orderedItems
                                                                .filter((i: any) => i.plannedDeliveryDate)
                                                                .map((i: any) => new Date(i.plannedDeliveryDate).getTime())
                                                            )
                                                        ).toLocaleDateString('pl-PL')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* ======================== SERVICES TAB ======================== */}
                {activeTab === 'services' && filteredTickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id, 'service')}
                        className="p-3 bg-amber-50 rounded-lg border border-amber-200 shadow-sm cursor-grab hover:shadow-md hover:border-amber-400 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-amber-800 truncate">
                                    🔧 {ticket.ticketNumber || 'Zgłoszenie serwisowe'}
                                </p>
                                <p className="text-sm text-amber-700 mt-1">
                                    {ticket.client?.firstName} {ticket.client?.lastName}
                                </p>
                                {ticket.client?.city && (
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        📍 {ticket.client.city}
                                    </p>
                                )}
                                {ticket.description && (
                                    <p className="text-xs text-amber-600 mt-1 line-clamp-2">
                                        {ticket.description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSchedule(ticket.id, 'service');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-amber-200 text-amber-700 hover:bg-amber-300 transition-opacity flex-shrink-0"
                                title="Utwórz zlecenie"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                {/* ======================== PENDING TAB ======================== */}
                {activeTab === 'pending' && filteredPending.map((inst) => (
                    <div
                        key={inst.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, inst.id, 'installation')}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:border-slate-400 transition-all"
                    >
                        <p className="font-medium text-slate-800 truncate">
                            {inst.title || `${inst.client?.firstName || ''} ${inst.client?.lastName || ''}`.trim() || 'Bez nazwy'}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-1">
                            📍 {inst.client?.city || 'Brak lokalizacji'}
                        </p>
                        {inst.contractNumber && (
                            <p className="text-[10px] text-slate-400 font-mono mt-1">
                                #{inst.contractNumber}
                            </p>
                        )}
                    </div>
                ))}

                {/* Empty State */}
                {((activeTab === 'contracts' && filteredContracts.length === 0) ||
                    (activeTab === 'services' && filteredTickets.length === 0) ||
                    (activeTab === 'pending' && filteredPending.length === 0)) && (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-sm font-medium">Brak elementów</p>
                            {searchQuery && (
                                <p className="text-xs mt-1">Spróbuj zmienić kryteria wyszukiwania</p>
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
};
