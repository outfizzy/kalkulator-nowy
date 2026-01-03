import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface LostLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, notes: string) => Promise<void>;
}

const LOST_REASONS = [
    'Za wysoka cena',
    'Wybrał konkurencję',
    'Brak kontaktu / Rezygnacja',
    'Złe opinie',
    'Długi czas oczekiwania',
    'Inne'
];

export const LostLeadModal: React.FC<LostLeadModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Wybierz powód utraty szansy');
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm(reason, notes);
            onClose();
        } catch (error) {
            console.error('Error submitting lost lead:', error);
            toast.error('Wystąpił błąd');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-red-100 bg-red-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-red-800">Oznacz jako Utracone</h2>
                        <p className="text-xs text-red-600">Dlaczego tracimy tego klienta?</p>
                    </div>
                    <button onClick={onClose} className="text-red-400 hover:text-red-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Powód odrzucenia</label>
                        <div className="grid grid-cols-2 gap-2">
                            {LOST_REASONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`p-2 text-xs font-medium rounded-lg border transition-all ${reason === r
                                            ? 'bg-red-600 text-white border-red-600 shadow-md'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:bg-red-50'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Dodatkowe uwagi (opcjonalne)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                            rows={3}
                            placeholder="Wpisz szczegóły..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? 'Zapisywanie...' : 'Zatwierdź Utratę'}
                    </button>
                </div>
            </div>
        </div>
    );
};
