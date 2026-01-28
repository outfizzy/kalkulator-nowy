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
    const [expandedContract, setExpandedContract] = useState<string | null>(null);

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

    // Group contracts by postal code (first 2 digits)
    const groupedContracts = React.useMemo(() => {
        const groups = new Map<string, Contract[]>();

        filteredContracts.forEach(contract => {
            const clientData = contract.contractData?.client || contract.contractData?.customer || contract.client;
            const fullPostalCode = clientData?.postalCode || '';

            // Extract first 2 digits like in LeadsList
            const region = fullPostalCode.length >= 2
                ? `PLZ ${fullPostalCode.substring(0, 2)}xxx`
                : 'Inne / Brak kodu';

            if (!groups.has(region)) {
                groups.set(region, []);
            }
            groups.get(region)!.push(contract);
        });

        // Sort groups by region code
        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, contracts]) => ({
                postalCode: region,
                contracts: contracts.sort((a, b) => {
                    // Sort by contract number within group
                    const numA = a.contractNumber || '';
                    const numB = b.contractNumber || '';
                    return numA.localeCompare(numB);
                })
            }));
    }, [filteredContracts]);

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
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Contracts Tab - Grouped by Postal Code */}
                {activeTab === 'contracts' && groupedContracts.map((group) => (
                    <div key={group.postalCode} className="space-y-2">
                        {/* Postal Code Group Header */}
                        <div className="sticky top-0 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm z-10">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-700">
                                    📮 {group.postalCode}
                                </h3>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-medium">
                                    {group.contracts.length} {group.contracts.length === 1 ? 'umowa' : 'umów'}
                                </span>
                            </div>
                        </div>

                        {/* Contracts in this group */}
                        {group.contracts.map((contract) => {
                            const isExpanded = expandedContract === contract.id;
                            const orderedItems = contract.orderedItems || [];
                            const hasItems = orderedItems.length > 0;

                            // Calculate delivery readiness
                            const allDelivered = hasItems && orderedItems.every(i => i.status === 'delivered');
                            const someDelivered = hasItems && orderedItems.some(i => i.status === 'delivered');
                            const noneOrdered = hasItems && orderedItems.every(i => i.status === 'pending');
                            const someOrdered = hasItems && orderedItems.some(i => i.status === 'ordered');

                            return (
                                <div
                                    key={contract.id}
                                    className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all"
                                >
                                    {/* Header - Always Visible */}
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, contract.id, 'contract')}
                                        className="p-3 cursor-grab group"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-800 truncate">
                                                    {contract.contractNumber}
                                                </p>
                                                <p className="font-medium text-slate-700 truncate">
                                                    {(() => {
                                                        const clientData = contract.contractData?.client || contract.contractData?.customer || contract.client;
                                                        if (clientData?.name) return clientData.name;
                                                        if (clientData?.firstName || clientData?.lastName) {
                                                            return `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
                                                        }
                                                        return 'Brak nazwy';
                                                    })()}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {(() => {
                                                        const clientData = contract.contractData?.client || contract.contractData?.customer || contract.client;
                                                        const street = clientData?.street || '';
                                                        const postalCode = clientData?.postalCode || '';
                                                        const city = clientData?.city || '';

                                                        const parts = [];
                                                        if (street) parts.push(street);
                                                        if (postalCode && city) parts.push(`${postalCode} ${city}`);
                                                        else if (city) parts.push(city);

                                                        return parts.length > 0 ? `📍 ${parts.join(', ')}` : '📍 Brak adresu';
                                                    })()}
                                                </p>
                                            </div>

                                            {/* Quick Schedule Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSchedule(contract.id, 'contract');
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-opacity"
                                                title="Utwórz zlecenie"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Readiness Indicator */}
                                        <div className="flex items-center justify-between">
                                            {hasItems ? (
                                                allDelivered ? (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                        ✓ Gotowe do montażu
                                                    </span>
                                                ) : someDelivered ? (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                                                        ⚠️ Częściowo dostarczone
                                                    </span>
                                                ) : noneOrdered ? (
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                                        ❌ Nie zamówiono
                                                    </span>
                                                ) : someOrdered ? (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                                        🚚 W dostawie
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                                                        ⏳ Oczekuje
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                                                    📦 Brak elementów
                                                </span>
                                            )}

                                            {/* Expand Button */}
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

                                        {/* Installation Days Estimate */}
                                        {contract.installationDaysEstimate && (
                                            <p className="text-xs text-indigo-600 mt-2">
                                                ⏱️ Szacowany czas montażu: ~{contract.installationDaysEstimate} dni
                                            </p>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && hasItems && (
                                        <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-3">
                                            {/* Product Info */}
                                            {contract.product && (
                                                <div className="text-xs">
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
                                                    {orderedItems.map((item) => (
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

                                            {/* Earliest Delivery Date */}
                                            {orderedItems.some(i => i.plannedDeliveryDate) && (
                                                <div className="text-xs bg-indigo-50 p-2 rounded">
                                                    <p className="font-medium text-indigo-700">
                                                        📦 Najwcześniejsza dostawa:{' '}
                                                        {new Date(
                                                            Math.min(...orderedItems
                                                                .filter(i => i.plannedDeliveryDate)
                                                                .map(i => new Date(i.plannedDeliveryDate!).getTime())
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
