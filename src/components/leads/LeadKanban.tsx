import React, { useState } from 'react';
import { DatabaseService } from '../../services/database';
import type { Lead, LeadStatus } from '../../types';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface LeadKanbanProps {
    leads: Lead[];
    onLeadUpdate: () => void;
}

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'Nowy', color: 'bg-blue-50 border-blue-200' },
    { id: 'contacted', label: 'Skontaktowano', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'offer_sent', label: 'Oferta Wysłana', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'negotiation', label: 'Negocjacje', color: 'bg-purple-50 border-purple-200' },
    { id: 'won', label: 'Wygrany', color: 'bg-green-50 border-green-200' },
    { id: 'lost', label: 'Utracony', color: 'bg-red-50 border-red-200' },
];

export const LeadKanban: React.FC<LeadKanbanProps> = ({ leads, onLeadUpdate }) => {
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLeadId(leadId);
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setData('text/plain', leadId); // Optional, state is enough
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: LeadStatus) => {
        e.preventDefault();
        if (!draggedLeadId) return;

        const lead = leads.find(l => l.id === draggedLeadId);
        if (!lead || lead.status === status) {
            setDraggedLeadId(null);
            return;
        }

        // Optimistic update (optional, but let's just wait for DB for safety first or show loading)
        // For simplicity: Call DB then refresh
        const toastId = toast.loading('Aktualizowanie statusu...');
        try {
            await DatabaseService.updateLead(draggedLeadId, { status });
            toast.success('Status zaktualizowany', { id: toastId });
            onLeadUpdate();
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Błąd aktualizacji', { id: toastId });
        } finally {
            setDraggedLeadId(null);
        }
    };

    return (
        <div className="flex overflow-x-auto pb-4 gap-4 h-[calc(100vh-200px)] min-h-[500px]">
            {COLUMNS.map(column => {
                const columnLeads = leads.filter(l => l.status === column.id);

                return (
                    <div
                        key={column.id}
                        className={`flex-shrink-0 w-72 flex flex-col rounded-xl border ${column.color} bg-opacity-50 text-slate-700`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Header */}
                        <div className="p-3 font-bold border-b border-inherit flex justify-between items-center bg-white/50 rounded-t-xl">
                            <span>{column.label}</span>
                            <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-inherit">
                                {columnLeads.length}
                            </span>
                        </div>

                        {/* Drop Zone / List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {columnLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, lead.id)}
                                    className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-shadow group relative"
                                >
                                    <div className="mb-2">
                                        <div className="font-semibold text-slate-800 text-sm">
                                            {lead.customerData.firstName} {lead.customerData.lastName}
                                        </div>
                                        {lead.customerData.companyName && (
                                            <div className="text-xs text-slate-500 truncate">
                                                {lead.customerData.companyName}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                        <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                        {lead.assignee && (
                                            <span
                                                title={`Przypisany: ${lead.assignee.firstName}`}
                                                className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200"
                                            >
                                                {lead.assignee.firstName[0]}
                                            </span>
                                        )}
                                    </div>

                                    <Link to={`/leads/${lead.id}`} className="absolute inset-0 z-10" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
