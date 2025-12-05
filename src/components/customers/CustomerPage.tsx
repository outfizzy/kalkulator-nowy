import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { CustomerForm } from '../CustomerForm';
import { CustomerDetails } from './CustomerDetails';
import type { Customer } from '../../types';

export const CustomerPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<Customer & { id?: string } | null>(null);
    const [loading, setLoading] = useState(!!id);
    const [isEditing, setIsEditing] = useState(!id); // Edit mode by default if adding new

    useEffect(() => {
        if (id) {
            const loadCustomer = async () => {
                try {
                    const data = await DatabaseService.getCustomer(id);
                    if (data) {
                        setCustomer(data);
                        setIsEditing(false); // Default to view mode for existing
                    } else {
                        toast.error('Nie znaleziono klienta');
                        navigate('/customers');
                    }
                } catch (error) {
                    console.error('Error loading customer:', error);
                    toast.error('Błąd ładowania danych klienta');
                } finally {
                    setLoading(false);
                }
            };
            loadCustomer();
        } else {
            setLoading(false);
            setIsEditing(true); // Ensure edit mode for new
        }
    }, [id, navigate]);

    const handleSave = async (data: Customer) => {
        try {
            if (id) {
                await DatabaseService.updateCustomer(id, data);
                toast.success('Dane klienta zaktualizowane');
                // Refresh data and switch to view mode
                const updated = await DatabaseService.getCustomer(id);
                setCustomer(updated);
                setIsEditing(false);
            } else {
                const newCustomer = await DatabaseService.createCustomer(data);
                toast.success('Klient dodany pomyślnie');
                navigate(`/customers/${newCustomer.id}`);
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error('Błąd zapisu danych klienta');
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie...</div>;
    }

    // New Customer Mode (always edit)
    if (!id) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-slate-900">Nowy Klient</h1>
                    <button
                        onClick={() => navigate('/customers')}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Anuluj
                    </button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <CustomerForm
                        onComplete={(data) => handleSave(data)}
                        submitLabel="Dodaj Klienta"
                    />
                </div>
            </div>
        );
    }

    // Existing Customer - View Mode
    if (!isEditing && customer) {
        return (
            <div className="max-w-6xl mx-auto">
                <CustomerDetails
                    customer={customer}
                    onEdit={() => setIsEditing(true)}
                    onBack={() => navigate('/customers')}
                />
            </div>
        );
    }

    // Existing Customer - Edit Mode
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900">Edytuj Klienta</h1>
                <button
                    onClick={() => setIsEditing(false)}
                    className="text-slate-500 hover:text-slate-700"
                >
                    Anuluj
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <CustomerForm
                    initialData={customer || undefined}
                    onComplete={(data) => handleSave(data)}
                    submitLabel="Zapisz Zmiany"
                />
            </div>
        </div>
    );
};
