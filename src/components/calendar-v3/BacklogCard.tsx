import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Contract } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface BacklogCardProps {
    contract: Contract;
    priority: 'urgent' | 'ready' | 'pending' | 'future';
}

export const BacklogCard: React.FC<BacklogCardProps> = ({ contract, priority }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `contract-${contract.id}`,
        data: { type: 'contract', contract }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    const deliveryDate = contract.deliveryDate ? new Date(contract.deliveryDate) : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        >
            {/* Customer Name */}
            <div className="font-semibold text-sm text-slate-900 mb-1">
                {contract.customerData?.firstName} {contract.customerData?.lastName}
            </div>

            {/* Contract Number */}
            <div className="text-xs text-slate-500 mb-2">
                #{contract.contractNumber}
            </div>

            {/* Address */}
            {contract.customerData?.city && (
                <div className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                        {contract.customerData.postalCode} {contract.customerData.city}
                    </span>
                </div>
            )}

            {/* Delivery Status */}
            {deliveryDate && (
                <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : priority === 'ready'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                    }`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span>
                        {priority === 'urgent' ? 'Dostarczone' : `Dostawa: ${format(deliveryDate, 'd MMM', { locale: pl })}`}
                    </span>
                </div>
            )}
        </div>
    );
};
