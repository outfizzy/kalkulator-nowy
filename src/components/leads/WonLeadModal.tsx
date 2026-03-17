import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface WonLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, value: string, notes: string) => Promise<void>;
}

const WON_REASONS = [
    'Dobra cena',
    'Szybki termin',
    'Jakość produktu',
    'Relacja z klientem',
    'Brak konkurencji',
    'Polecenie',
    'Inne'
];

export const WonLeadModal: React.FC<WonLeadModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState<string>('');
    const [value, setValue] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Wybierz powód wygranej');
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm(reason, value, notes);
            onClose();
        } catch (error) {
            console.error('Error submitting won lead:', error);
            toast.error('Wystąpił błąd');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-emerald-100 bg-emerald-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-emerald-800">🏆 Wygrana!</h2>
                        <p className="text-xs text-emerald-600">Co zdecydowało o wygranej?</p>
                    </div>
                    <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Powód wygranej</label>
                        <div className="grid grid-cols-2 gap-2">
                            {WON_REASONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`p-2 text-xs font-medium rounded-lg border transition-all ${reason === r
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Wartość kontraktu (€)</label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            placeholder="np. 12500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Dodatkowe uwagi (opcjonalne)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            rows={2}
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
                        className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? 'Zapisywanie...' : '🏆 Zatwierdź Wygraną'}
                    </button>
                </div>
            </div>
        </div>
    );
};
