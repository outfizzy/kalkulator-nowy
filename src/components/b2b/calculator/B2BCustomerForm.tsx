import React, { useState } from 'react';
import type { Customer } from '../../../types';
import { getSnowZone } from '../../../utils/snowZones';

interface B2BCustomerFormProps {
    onComplete: (customer: Customer, snowZone: any) => void;
    initialData?: Customer;
}

export const B2BCustomerForm: React.FC<B2BCustomerFormProps> = ({ onComplete, initialData }) => {
    const [customer, setCustomer] = useState<Customer>(() => {
        return {
            salutation: initialData?.salutation || 'Herr',
            firstName: initialData?.firstName || '',
            lastName: initialData?.lastName || '',
            street: initialData?.street || '',
            houseNumber: initialData?.houseNumber || '',
            postalCode: initialData?.postalCode || '',
            city: initialData?.city || '',
            phone: initialData?.phone || '',
            email: initialData?.email || '',
            country: initialData?.country || 'Deutschland',
            // Note: B2B customers don't have PolandDach representatives assigned
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Calculate snow zone automatically
    const snowZone = React.useMemo(() => {
        const postalCode = customer.postalCode;
        if (postalCode && postalCode.length === 5) {
            return getSnowZone(postalCode);
        }
        return null;
    }, [customer.postalCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};
        if (!customer.lastName) newErrors.lastName = 'Nachname / Firmenname ist erforderlich';
        if (!customer.postalCode) newErrors.postalCode = 'PLZ ist erforderlich';
        if (!customer.city) newErrors.city = 'Stadt ist erforderlich';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onComplete(customer, snowZone || { id: 'II', value: 0.85, description: 'Standard Zone' });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Kundendaten</h2>
                <p className="text-slate-500">Geben Sie die Daten Ihres Kunden ein</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-xl">👤</span>
                        <h3 className="font-bold text-slate-800">Persönliche Daten</h3>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Anrede</label>
                            <div className="flex gap-4">
                                {['Herr', 'Frau', 'Firma'].map(opt => (
                                    <label key={opt} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl border-2 transition-all ${customer.salutation === opt ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 hover:border-blue-200'}`}>
                                        <input
                                            type="radio"
                                            name="salutation"
                                            value={opt}
                                            checked={customer.salutation === opt}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Vorname</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={customer.firstName}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Max"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nachname / Firmenname <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={customer.lastName}
                                    onChange={handleChange}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                    placeholder="Mustermann GmbH"
                                />
                                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-xl">📍</span>
                        <h3 className="font-bold text-slate-800">Adresse / Montageort</h3>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-5">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Straße</label>
                                <input
                                    type="text"
                                    name="street"
                                    value={customer.street}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Musterstraße"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Hausnr.</label>
                                <input
                                    type="text"
                                    name="houseNumber"
                                    value={customer.houseNumber}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="12"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    PLZ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="postalCode"
                                    value={customer.postalCode}
                                    onChange={handleChange}
                                    maxLength={5}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.postalCode ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                    placeholder="12345"
                                />
                                {errors.postalCode && <p className="text-xs text-red-600 mt-1">{errors.postalCode}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Stadt <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={customer.city}
                                    onChange={handleChange}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                    placeholder="Berlin"
                                />
                                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                            </div>
                        </div>

                        {snowZone && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                <div className="text-2xl">❄️</div>
                                <div>
                                    <p className="font-bold text-blue-900">Schneelastzone: {snowZone.id}</p>
                                    <p className="text-sm text-blue-700">Last: {snowZone.value} kN/m²</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-xl">📞</span>
                        <h3 className="font-bold text-slate-800">Kontakt (Optional)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                            <input
                                type="tel"
                                name="phone"
                                value={customer.phone}
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="+49 ..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={customer.email}
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="kunde@example.de"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <span>Weiter zur Konfiguration</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};
