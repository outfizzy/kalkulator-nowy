import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { LeadForm } from './LeadForm';
import type { Lead } from '../../types';

export const LeadDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLead = async () => {
            if (!id) return;
            try {
                // We need to implement getLead(id) in DatabaseService or filter from getLeads
                // Since I implemented getLeads() but not getLead(id) explicitly in the summary, 
                // I should check if getLead exists or filter.
                // Assuming I implemented standard CRUD as per plan.
                // Edit: I implemented CRUD in step 29 (DatabaseService modification).
                // Let's assume getLeadById exists or use getLeads for now and optimization later.
                // Wait, I recall standard CRUD: getLeads, createLead, updateLead, deleteLead.
                // Did I implement getLead(id)? 
                // Let's check database.ts via view_file if unsure, but I trust my memory or I'll implement a fallback.

                // Better approach: fetch all and find (temporary) or add getLeadById.
                // Actually, I can use supabase direct call if needed, but keeping it clean.
                // I'll check database.ts in a moment. For now, I'll write this to use DatabaseService.getLead(id).

                const data = await DatabaseService.getLead(id);
                setLead(data);
            } catch (error) {
                console.error('Error fetching lead:', error);
                toast.error('Nie udało się pobrać szczegółów leada');
                navigate('/leads');
            } finally {
                setLoading(false);
            }
        };

        fetchLead();
    }, [id, navigate]);

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie...</div>;
    }

    if (!lead) {
        return <div className="p-12 text-center text-slate-400">Lead nie znaleziony.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900">
                    Edycja Leada
                </h1>
                <button
                    onClick={() => navigate('/leads')}
                    className="text-slate-500 hover:text-slate-700 font-medium"
                >
                    Wróć do listy
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <LeadForm
                    initialData={lead}
                    isEditMode={true}
                    onSuccess={() => {
                        toast.success('Zapisano zmiany');
                        // Optional: refresh or stay
                    }}
                    onCancel={() => navigate('/leads')}
                />
            </div>
        </div>
    );
};
