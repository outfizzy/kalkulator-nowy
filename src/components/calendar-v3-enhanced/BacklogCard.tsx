import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Contract, ServiceTicket, Installation } from '../../types';

type Priority = 'urgent' | 'ready' | 'pending' | 'future';
type ItemType = 'contract' | 'service' | 'installation' | 'followup';

interface BacklogItem {
    id: string;
    type: ItemType;
    priority: Priority;
    data: Contract | ServiceTicket | Installation;
}

interface BacklogCardProps {
    item: BacklogItem;
    priority: Priority;
}

export const BacklogCard: React.FC<BacklogCardProps> = ({ item, priority }) => {
    // Helper to extract client data safely
    const getClientData = (item: BacklogItem) => {
        if (item.type === 'contract') {
            const c = item.data as any;
            const client = c.client || c.contractData?.client || c.contractData?.customer || c.customerData || {};
            return {
                name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
                firstName: client.firstName,
                lastName: client.lastName,
                city: client.city || '',
                address: client.address || '',
                postalCode: client.postalCode || ''
            };
        } else if (item.type === 'service') {
            const t = item.data as ServiceTicket;
            const firstName = t.client?.firstName || '';
            const lastName = t.client?.lastName || '';
            return {
                name: t.customerName || `${firstName} ${lastName}`.trim() || t.client?.name || '',
                city: t.client?.city || '',
                address: t.client?.address || '',
                postalCode: t.client?.postalCode || ''
            };
        } else {
            // Installation or followup
            const i = item.data as Installation;
            return {
                name: i.client?.name || `${i.client?.firstName || ''} ${i.client?.lastName || ''}`.trim(),
                city: i.client?.city || '',
                address: i.client?.address || '',
                postalCode: i.client?.postalCode || ''
            };
        }
    };

    const clientData = getClientData(item);
    const itemTitle = clientData.name;
    const itemSubtitle = item.type === 'contract'
        ? ((item.data as any).contractNumber || (item.data as any).contract_number)
        : item.type === 'service'
            ? ((item.data as ServiceTicket).type === 'warranty' ? 'Gwarancja' : 'Serwis')
            : (item.data as Installation).contractNumber;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.type === 'followup' ? `followup-${item.id}` : item.id,
        data: {
            type: item.type,
            itemId: item.id,
            // Additional metadata for DragOverlay
            title: itemTitle,
            subtitle: item.type === 'followup' ? 'Dokończenie' : itemSubtitle
        }
    });

    const renderContent = () => {
        if (item.type === 'contract') {
            const contract = item.data as any;
            const orderedItems = (contract.orderedItems || []) as any[];

            // Supply Logic
            const hasOrderedItems = orderedItems.length > 0;
            const allDelivered = hasOrderedItems && orderedItems.every(i => i.status === 'delivered');
            const someOrdered = hasOrderedItems && orderedItems.some(i => i.status === 'ordered');

            const legacyStatus = contract.supplyInfo?.status;
            const isDelivered = allDelivered || legacyStatus === 'delivered';

            return (
                <>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm">
                                {itemTitle || 'Brak danych klienta'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                {itemSubtitle || 'Brak numeru'}
                            </p>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Umowa
                        </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 mb-2">
                        <div className="flex items-start gap-1">
                            <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-700">
                                    {clientData.address || 'Brak ulicy'}
                                </span>
                                <span>
                                    {clientData.postalCode ? `${clientData.postalCode} ` : ''}{clientData.city || 'Brak miasta'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Supply Status */}
                    {isDelivered ? (
                        <div className="mt-2 p-1.5 rounded text-xs flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-200">
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <div className="font-bold">Towar na miejscu</div>
                        </div>
                    ) : (hasOrderedItems || someOrdered) ? (
                        <div className="mt-2 p-1.5 rounded text-xs flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <div className="font-semibold">W trakcie realizacji</div>
                                <div className="text-[10px] opacity-75">
                                    {orderedItems.filter(i => i.status === 'delivered').length} / {orderedItems.length} pozycji
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 p-1.5 rounded text-xs flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <div>Brak zamówienia</div>
                        </div>
                    )}
                </>
            );
        } else if (item.type === 'service') {
            const ticket = item.data as ServiceTicket;
            const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
                leak: { label: 'Nieszczelność', icon: '💧', color: 'bg-blue-100 text-blue-700' },
                electrical: { label: 'Elektryka', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
                visual: { label: 'Wizualne', icon: '👁️', color: 'bg-purple-100 text-purple-700' },
                mechanical: { label: 'Mechaniczne', icon: '🔧', color: 'bg-slate-100 text-slate-700' },
                repair: { label: 'Naprawa', icon: '🔨', color: 'bg-orange-100 text-orange-700' },
                other: { label: 'Inne', icon: '📋', color: 'bg-slate-100 text-slate-600' },
            };
            const priorityLabels: Record<string, { label: string; color: string }> = {
                critical: { label: 'Krytyczny', color: 'bg-red-100 text-red-700 border-red-200' },
                high: { label: 'Wysoki', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                medium: { label: 'Średni', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                low: { label: 'Niski', color: 'bg-slate-50 text-slate-500 border-slate-200' },
            };
            const typeInfo = typeLabels[ticket.type] || typeLabels.other;
            const prioInfo = priorityLabels[ticket.priority] || priorityLabels.medium;
            const clientName = ticket.client
                ? `${ticket.client.firstName || ''} ${ticket.client.lastName || ''}`.trim()
                : (ticket.customerName || '');

            // Clean description — strip manual client info lines
            const cleanDesc = ticket.description
                .replace(/Klient:.*\n?/gi, '')
                .replace(/Adres:.*\n?/gi, '')
                .replace(/Telefon:.*\n?/gi, '')
                .replace(/---.*\n?/g, '')
                .trim();

            return (
                <>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm truncate">
                                {clientName || itemTitle || 'Klient nieznany'}
                            </h4>
                            {clientData.city && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    <span className="truncate">{clientData.postalCode ? `${clientData.postalCode} ` : ''}{clientData.city}</span>
                                </div>
                            )}
                        </div>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded flex-shrink-0 ml-1">
                            Serwis
                        </span>
                    </div>
                    {/* Type + Priority badges */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${typeInfo.color}`}>
                            <span className="text-[10px]">{typeInfo.icon}</span> {typeInfo.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${prioInfo.color}`}>
                            {prioInfo.label}
                        </span>
                        {ticket.contractNumber && (
                            <span className="text-[10px] text-slate-400 font-mono ml-auto truncate">{ticket.contractNumber}</span>
                        )}
                    </div>
                    {/* Description */}
                    <div className="space-y-1 text-xs text-slate-600">
                        <p className="line-clamp-2 leading-relaxed">{cleanDesc || ticket.description.slice(0, 80)}</p>
                    </div>
                    {/* Footer: Ticket number + date */}
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                        <span className="font-mono">{ticket.ticketNumber}</span>
                        <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('pl-PL') : ''}</span>
                    </div>
                </>
            );
        } else if (item.type === 'followup') {
            // Follow-up card — completed installation with pending items
            const installation = item.data as Installation;
            const pendingItems = installation.followUpItems || [];

            return (
                <>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm">
                                {itemTitle || 'Klient'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                {installation.contractNumber || ''}
                            </p>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                            🔄 Dokończ.
                        </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{clientData.city}</span>
                        </div>
                    </div>
                    {/* Pending items list */}
                    {pendingItems.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">
                                Do zamontowania:
                            </div>
                            <div className="space-y-0.5">
                                {pendingItems.slice(0, 3).map((itemName, idx) => (
                                    <div key={idx} className="text-xs text-amber-700 flex items-center gap-1">
                                        <span className="text-amber-400">•</span>
                                        <span className="truncate">{itemName}</span>
                                    </div>
                                ))}
                                {pendingItems.length > 3 && (
                                    <div className="text-[10px] text-amber-500">
                                        +{pendingItems.length - 3} więcej...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            );
        } else {
            const installation = item.data as Installation;
            return (
                <>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm">
                                {itemTitle}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {itemSubtitle}
                            </p>
                        </div>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Montaż
                        </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{clientData.city}</span>
                        </div>
                        <p className="line-clamp-1">{installation.productSummary}</p>
                    </div>
                </>
            );
        }
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`p-3 bg-white border rounded-lg cursor-move transition-all ${isDragging
                ? 'opacity-50 scale-95 shadow-lg'
                : 'hover:shadow-md hover:border-accent'
                } ${priority === 'urgent'
                    ? 'border-red-200'
                    : priority === 'ready'
                        ? 'border-yellow-200'
                        : priority === 'pending'
                            ? 'border-amber-200'
                            : 'border-slate-200'
                }`}
        >
            {renderContent()}
        </div>
    );
};
