import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { Lead, LeadStatus, LeadSource } from '../../types';

interface LeadFormProps {
    initialData?: Partial<Lead>;
    onSuccess?: () => void;
    onCancel?: () => void;
    embedded?: boolean; // If true, rendering inside another component (e.g. Mail)
    isEditMode?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ initialData, onSuccess, onCancel, embedded, isEditMode = false }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        firstName: initialData?.customerData?.firstName || '',
        lastName: initialData?.customerData?.lastName || '',
        companyName: initialData?.customerData?.companyName || '',
        email: initialData?.customerData?.email || '',
        phone: initialData?.customerData?.phone || '',
        status: initialData?.status || 'new' as LeadStatus,
        source: initialData?.source || 'manual' as LeadSource,
        notes: initialData?.notes || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode && initialData?.id) {
                await DatabaseService.updateLead(initialData.id, {
                    status: formData.status,
                    source: formData.source,
                    customerData: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        companyName: formData.companyName,
                        email: formData.email,
                        phone: formData.phone,
                    },
                    notes: formData.notes,
                });
                toast.success('Lead zaktualizowany pomyślnie!');
            } else {
                await DatabaseService.createLead({
                    status: formData.status,
                    source: formData.source,
                    customerData: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        companyName: formData.companyName,
                        email: formData.email,
                        phone: formData.phone,
                    },
                    notes: formData.notes,
                    emailMessageId: initialData?.emailMessageId,
                    lastContactDate: new Date(), // Set last contact to now provided they are adding it now
                });
                toast.success('Lead dodany pomyślnie!');
            }

            if (onSuccess) {
                onSuccess();
            } else if (!embedded) {
                navigate('/leads');
            }
        } catch (error) {
            console.error('Error creating lead:', error);
            toast.error('Błąd podczas dodawania leada');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl ${embedded ? '' : 'shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto'}`}>
            {!embedded && <h2 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edytuj Leada' : 'Nowy Lead'}</h2>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                        <input
                            type="text"
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.firstName}
                            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                        <input
                            type="text"
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.lastName}
                            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Firma (opcjonalnie)</label>
                    <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                        value={formData.companyName}
                        onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.email}
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                        <input
                            type="tel"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent bg-white"
                            value={formData.status}
                            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                        >
                            <option value="new">Nowy</option>
                            <option value="contacted">Skontaktowano</option>
                            <option value="offer_sent">Oferta Wysłana</option>
                            <option value="negotiation">Negocjacje</option>
                            <option value="won">Wygrany</option>
                            <option value="lost">Utracony</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Źródło</label>
                        <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent bg-white"
                            value={formData.source}
                            onChange={e => setFormData(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                        >
                            <option value="manual">Ręczne wprowadzenie</option>
                            <option value="email">Email</option>
                            <option value="phone">Telefon</option>
                            <option value="website">Strona WWW</option>
                            <option value="other">Inne</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notatki</label>
                    <textarea
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent min-h-[100px]"
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Dodatkowe informacje..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onCancel || (() => navigate('/leads'))}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        disabled={loading}
                    >
                        Anuluj
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                        disabled={loading}
                    >
                        {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".3" /><path fill="currentColor" d="M20 12a8 8 0 0 0-8-8V2a10 10 0 0 1 10 10Z" /></svg>}
                        {isEditMode ? 'Zapisz zmiany' : 'Zapisz Leada'}
                    </button>
                </div>
            </form>
        </div>
    );
};
