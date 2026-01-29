import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Contract, ServiceTicket, Installation } from '../../types';

type Priority = 'urgent' | 'ready' | 'pending' | 'future';
type ItemType = 'contract' | 'service' | 'installation';

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
            // Service returns 'client' and 'contractData'. 'customerData' might be missing.
            const client = c.client || c.contractData?.client || c.contractData?.customer || c.customerData || {};
            return {
                name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
                firstName: client.firstName,
                lastName: client.lastName,
                city: client.city || '',
                address: client.address || '', // Ensure address is captured
                postalCode: client.postalCode || ''
            };
        } else if (item.type === 'service') {
            const t = item.data as ServiceTicket;
            return {
                name: t.customerName || t.client?.name || '',
                city: t.client?.city || '',
                address: t.client?.address || '',
                postalCode: t.client?.postalCode || ''
            };
        } else {
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
        id: item.id,
        data: {
            type: item.type,
            itemId: item.type === 'contract'
                ? (item.data as Contract).id
                : item.type === 'service'
                    ? (item.data as ServiceTicket).id
                    : (item.data as Installation).id,
            // Additional metadata for DragOverlay
            title: itemTitle,
            subtitle: itemSubtitle
        }
    });

    const renderContent = () => {
        if (item.type === 'contract') {
            const contract = item.data as any; // Use any to access potentially unmapped props
            const orderedItems = (contract.orderedItems || []) as any[];

            // Supply Logic
            // 1. Check if we have ordered items
            const hasOrderedItems = orderedItems.length > 0;
            const allDelivered = hasOrderedItems && orderedItems.every(i => i.status === 'delivered');
            const someOrdered = hasOrderedItems && orderedItems.some(i => i.status === 'ordered');

            // 2. Fallback to legacy fields if needed
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
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            Serwis
                        </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                        <p className="line-clamp-2">{ticket.description}</p>
                        {ticket.scheduledDate && (
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{new Date(ticket.scheduledDate).toLocaleDateString('pl-PL')}</span>
                            </div>
                        )}
                    </div>
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
                            ? 'border-blue-200'
                            : 'border-slate-200'
                }`}
        >
            {renderContent()}
        </div>
    );
};
