import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const FuelRegistryPublic: React.FC = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        liters: '',
        vehiclePlate: ''
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate
            if (!formData.firstName || !formData.lastName || !formData.liters) {
                toast.error('Wypełnij wszystkie wymagane pola');
                setLoading(false);
                return;
            }

            const litersNum = parseFloat(formData.liters);
            if (isNaN(litersNum) || litersNum <= 0) {
                toast.error('Podaj prawidłową ilość litrów');
                setLoading(false);
                return;
            }

            // Insert into fuel_logs
            const { error } = await supabase
                .from('fuel_logs')
                .insert({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    liters: litersNum,
                    vehicle_plate: formData.vehiclePlate || null,
                    entry_source: 'qr_public',
                    user_id: null,
                    log_date: new Date().toISOString()
                });

            if (error) throw error;

            // Success
            setSubmitted(true);
            toast.success('Wpis został zapisany!');

            // Reset form after 3 seconds
            setTimeout(() => {
                setFormData({ firstName: '', lastName: '', liters: '', vehiclePlate: '' });
                setSubmitted(false);
            }, 3000);

        } catch (error: any) {
            console.error('Error saving fuel log:', error);
            toast.error('Błąd zapisu. Spróbuj ponownie.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Zapisano!</h2>
                    <p className="text-gray-600">Wpis został dodany do rejestru paliwowego</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Rejestr Paliwowy</h1>
                    <p className="text-gray-600">Uzupełnij dane tankowania</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Imię <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                            placeholder="Jan"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nazwisko <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                            placeholder="Kowalski"
                            required
                        />
                    </div>

                    {/* Liters */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Ilość litrów <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.liters}
                            onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                            placeholder="50.00"
                            required
                        />
                    </div>

                    {/* Vehicle Plate (Optional) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Tablica rejestracyjna <span className="text-gray-400 text-xs">(opcjonalnie)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.vehiclePlate}
                            onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg uppercase"
                            placeholder="ABC 1234"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Zapisywanie...
                            </span>
                        ) : (
                            'Zapisz wpis'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Polendach24 • Rejestr Paliwowy</p>
                </div>
            </div>
        </div>
    );
};
