import React, { useState, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable
} from '@dnd-kit/core';
import type {
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Lead, LeadStatus } from '../../types';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { LostLeadModal } from './LostLeadModal';

interface LeadsKanbanProps {
    leads: Lead[];
    onLeadUpdate: () => void;
}

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
    { id: 'new', title: 'Nowe', color: 'bg-blue-50 border-blue-100 text-blue-700' },
    { id: 'contacted', title: 'Skontaktowano', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
    { id: 'offer_sent', title: 'Wysłano Ofertę', color: 'bg-yellow-50 border-yellow-100 text-yellow-700' },
    { id: 'negotiation', title: 'Negocjacje', color: 'bg-orange-50 border-orange-100 text-orange-700' },
    { id: 'won', title: 'Wygrane', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    { id: 'lost', title: 'Utracone', color: 'bg-red-50 border-red-100 text-red-700' },
];

// Helper to identify stale leads (> 3 days no contact)
const isLeadStale = (lead: Lead) => {
    if (lead.status === 'won' || lead.status === 'lost') return false; // Won/Lost don't get stale
    const lastDate = lead.lastContactDate ? new Date(lead.lastContactDate) : new Date(lead.createdAt);
    return differenceInDays(new Date(), lastDate) > 3;
};

const KanbanCard = ({ lead, onClick, onUpdate }: { lead: Lead; onClick: (id: string) => void; onUpdate: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: lead.id,
        data: {
            type: 'Lead',
            lead
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isStale = isLeadStale(lead);

    const handleQuickContact = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await DatabaseService.updateLead(lead.id, { status: 'contacted' });
            toast.success('Oznaczono jako skontaktowano');
            onUpdate();
        } catch (error) {
            console.error('Error updating lead:', error);
            toast.error('Błąd aktualizacji');
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(lead.id)}
            className={`bg-white p-3 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer group relative ${isStale ? 'border-red-200 ring-1 ring-red-50' : 'border-slate-200'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="pr-6">
                    <h4 className="font-bold text-slate-800 text-sm">
                        {lead.customerData.firstName} {lead.customerData.lastName}
                    </h4>
                    {lead.customerData.companyName && (
                        <div className="text-xs text-slate-500 font-medium">{lead.customerData.companyName}</div>
                    )}
                </div>
                {lead.status === 'new' && (
                    <button
                        onClick={handleQuickContact}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Oznacz jako skontaktowano"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                )}
                {isStale && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Brak kontaktu > 3 dni">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>!</span>
                    </div>
                )}
            </div>

            <div className="text-xs text-slate-600 space-y-1 mb-3">
                {lead.customerData.address && (
                    <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{lead.customerData.address}</span>
                    </div>
                )}
                {lead.customerData.city && (
                    <div className="flex items-center gap-1.5 pl-5">
                        <span className="text-slate-500">{lead.customerData.postalCode}</span>
                        <span>{lead.customerData.city}</span>
                    </div>
                )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    {lead.assignee ? (
                        <>
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 border border-white">
                                {lead.assignee.firstName[0]}{lead.assignee.lastName[0]}
                            </div>
                            <span className="text-slate-600 font-medium truncate max-w-[100px]">
                                {lead.assignee.firstName} {lead.assignee.lastName}
                            </span>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 italic">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] border border-slate-200">
                                ?
                            </div>
                            <span>Brak opiekuna</span>
                        </div>
                    )}
                </div>

                <div className="text-[10px] text-slate-400">
                    {format(new Date(lead.createdAt), 'dd.MM', { locale: pl })}
                </div>
            </div>
        </div>
    );
};

// Extracted Column Component with useDroppable
const KanbanColumn = ({ column, leads, onNavigate, onUpdate }: { column: typeof COLUMNS[0], leads: Lead[], onNavigate: (id: string) => void, onUpdate: () => void }) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    return (
        <div ref={setNodeRef} className="flex-shrink-0 w-72 flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200/50">
            {/* Column Header */}
            <div className={`p-3 border-b border-slate-100 rounded-t-xl flex justify-between items-center ${column.color.replace('text-', 'bg-').replace('50', '50/50')}`}>
                <h3 className={`font-semibold text-sm ${column.color.split(' ')[2]}`}>
                    {column.title}
                </h3>
                <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                    {leads.length}
                </span>
            </div>

            {/* Column Content */}
            <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[100px]">
                <SortableContext
                    id={column.id}
                    items={leads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2 min-h-[50px]">
                        {leads.map(lead => (
                            <KanbanCard
                                key={lead.id}
                                lead={lead}
                                onClick={onNavigate}
                                onUpdate={onUpdate}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({ leads, onLeadUpdate }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [activeId, setActiveId] = useState<string | null>(null);

    // Modal State
    const [lostModalOpen, setLostModalOpen] = useState(false);
    const [pendingLostLeadId, setPendingLostLeadId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const columns = useMemo(() => {
        const cols: Record<LeadStatus, Lead[]> = {
            new: [],
            contacted: [],
            offer_sent: [],
            negotiation: [],
            won: [],
            lost: []
        };
        leads.forEach(lead => {
            if (cols[lead.status]) {
                cols[lead.status].push(lead);
            }
        });
        return cols;
    }, [leads]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        let newStatus: LeadStatus | undefined;

        // Check if dropped directly on a column container
        if (COLUMNS.find(c => c.id === overId)) {
            newStatus = overId as LeadStatus;
        } else {
            // Dropped on another card? Find that card's status
            const overLead = leads.find(l => l.id === overId);
            if (overLead) {
                newStatus = overLead.status;
            }
        }

        if (newStatus) {
            const lead = leads.find(l => l.id === activeId);
            if (lead && lead.status !== newStatus) {

                // Special handling for 'lost' status -> Open Modal
                if (newStatus === 'lost') {
                    setPendingLostLeadId(activeId);
                    setLostModalOpen(true);
                    return; // Stop default Update, wait for modal confirm
                }

                await updateLeadStatus(activeId, newStatus);
            }
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus, extraUpdates: Partial<Lead> = {}) => {
        const lead = leads.find(l => l.id === leadId);
        const updates: Partial<Lead> = { status, ...extraUpdates };

        if (currentUser && status !== 'new' && lead?.assignedTo !== currentUser.id) {
            updates.assignedTo = currentUser.id;
            toast.success('Przejąłeś opiekę nad tym leadem');
        }

        try {
            await DatabaseService.updateLead(leadId, updates);
            onLeadUpdate();
            // Find custom Polish title manually if needed, or just standard toast
            const statusTitle = COLUMNS.find(c => c.id === status)?.title;
            if (status !== 'lost') {
                toast.success(`Status zmieniony na ${statusTitle}`);
            }
        } catch (error) {
            console.error('Failed to update lead status:', error);
            toast.error('Błąd aktualizacji statusu');
        }
    };

    const handleLostConfirm = async (reason: string, notes: string) => {
        if (!pendingLostLeadId) return;

        await updateLeadStatus(pendingLostLeadId, 'lost', {
            lostReason: reason,
            notes: notes ? (leads.find(l => l.id === pendingLostLeadId)?.notes + '\n\n[Utrata]: ' + notes) : undefined
        });

        toast.success('Oznaczono jako utracone');
        setPendingLostLeadId(null);
    };

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full overflow-x-auto pb-4 gap-4 px-2">
                    {COLUMNS.map(column => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            leads={columns[column.id]}
                            onNavigate={(id) => navigate(`/leads/${id}`)}
                            onUpdate={onLeadUpdate}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        (() => {
                            const lead = leads.find(l => l.id === activeId);
                            return lead ? (
                                <div className="opacity-90 rotate-3 cursor-grabbing transform scale-105">
                                    <KanbanCard lead={lead} onClick={() => { }} onUpdate={() => { }} />
                                </div>
                            ) : null;
                        })()
                    ) : null}
                </DragOverlay>
            </DndContext>

            <LostLeadModal
                isOpen={lostModalOpen}
                onClose={() => { setLostModalOpen(false); setPendingLostLeadId(null); }}
                onConfirm={handleLostConfirm}
            />
        </>
    );
};
