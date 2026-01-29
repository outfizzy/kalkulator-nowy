import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleMeasurementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    leadData: {
        leadId: string;
        firstName: string;
        lastName: string;
        phone?: string;
        address?: string;
        postalCode?: string;
        city?: string;
    };
}

export const ScheduleMeasurementModal: React.FC<ScheduleMeasurementModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    leadData
}) => {
    const { currentUser } = useAuth();
    const [date, setDate] = useState('');
    const [time, setTime] = useState('10:00');
    const [duration, setDuration] = useState(60);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const customerName = `${leadData.firstName} ${leadData.lastName}`;
    const customerAddress = leadData.address
        ? `${leadData.address}, ${leadData.postalCode || ''} ${leadData.city || ''}`.trim()
        : `${leadData.postalCode || ''} ${leadData.city || ''}`.trim();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!date) {
            toast.error('Wybierz datę pomiaru');
            return;
        }

        if (!currentUser?.id) {
            toast.error('Brak zalogowanego użytkownika');
            return;
        }

        setIsSubmitting(true);

        try {
            // Create scheduled date with time
            const scheduledDateTime = new Date(`${date}T${time}:00`);

            // Step 1: Create the measurement
            try {
                await DatabaseService.createMeasurement({
                    leadId: leadData.leadId,
                    scheduledDate: scheduledDateTime,
                    salesRepId: currentUser.id,
                    customerName,
                    customerAddress,
                    customerPhone: leadData.phone,
                    notes: notes || `Lead: ${customerName}`,
                    estimatedDuration: duration
                });
            } catch (measurementError: any) {
                console.error('createMeasurement error:', measurementError);
                throw new Error(`Błąd tworzenia pomiaru: ${measurementError?.message || 'Nieznany błąd'}`);
            }

            // Step 2: Update lead status (optional - don't fail if this fails)
            try {
                await DatabaseService.updateLead(leadData.leadId, {
                    status: 'measurement_scheduled' // Correct status for scheduled measurement
                });
            } catch (leadError) {
                console.warn('Could not update lead status:', leadError);
                // Don't throw - measurement was created successfully
            }

            toast.success('Pomiar został zaplanowany!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error scheduling measurement:', error);
            toast.error(error?.message || 'Błąd podczas planowania pomiaru');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get today and future dates
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold">Umów Pomiar</h2>
                            <p className="text-blue-100 mt-1">{customerName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Customer Info Preview */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Klient:</span>
                                <p className="font-medium text-slate-800">{customerName}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Telefon:</span>
                                <p className="font-medium text-slate-800">{leadData.phone || '-'}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-slate-500">Adres:</span>
                                <p className="font-medium text-slate-800">{customerAddress || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Sales Rep */}
                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                            </div>
                            <div>
                                <p className="text-xs text-indigo-600 uppercase tracking-wide font-medium">Przypisany do</p>
                                <p className="font-bold text-indigo-900">
                                    {currentUser?.firstName} {currentUser?.lastName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data pomiaru *
                            </label>
                            <input
                                type="date"
                                required
                                min={today}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Godzina
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Przewidywany czas (minuty)
                        </label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                        >
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>1 godzina</option>
                            <option value={90}>1.5 godziny</option>
                            <option value={120}>2 godziny</option>
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Notatki (opcjonalnie)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Dodatkowe informacje o pomiarze..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Planowanie...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Zaplanuj Pomiar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
