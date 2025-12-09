import React, { useState } from 'react';
import type { Customer } from '../../types';
import { DatabaseService } from '../../services/database';
import { toast } from 'react-hot-toast';

interface CustomerEditFormProps {
    customer: Customer;
    onSave: (updatedCustomer: Customer) => void;
}

export const CustomerEditForm: React.FC<CustomerEditFormProps> = ({ customer, onSave }) => {
    const [formData, setFormData] = useState<Customer>(customer);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await DatabaseService.updateCustomer(customer.id!, formData);
            toast.success('Zapisano zmiany');
            onSave(formData);
        } catch (error) {
            console.error('Error updating customer:', error);
            toast.error('Błąd zapisu');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-4 mb-6">Dane Klienta</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Firma (opcjonalnie)</label>
                    <input
                        type="text"
                        name="companyName" // Assuming this field exists or will be added to Customer type
                        value={(formData as any).companyName || ''}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">NIP (opcjonalnie)</label>
                    <input
                        type="text"
                        name="nip" // Assuming this field exists or will be added to Customer type
                        value={(formData as any).nip || ''}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ulica</label>
                    <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Numer domu/mieszkania</label>
                    <input
                        type="text"
                        name="houseNumber"
                        value={formData.houseNumber}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kod pocztowy</label>
                    <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Miasto</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kraj</label>
                    <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                    >
                        <option value="Deutschland">Niemcy</option>
                        <option value="Polska">Polska</option>
                        <option value="Österreich">Austria</option>
                        <option value="Schweiz">Szwajcaria</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent"
                        required
                    />
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t mt-8">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving && (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
            </div>
        </form>
    );
};
