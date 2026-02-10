import React, { useState } from 'react';
import { MeasurementReminderService, type MeasurementOutcome } from '../../services/measurement-reminder.service';
import toast from 'react-hot-toast';
import { X, CheckCircle, Clock, XCircle, UserX } from 'lucide-react';

interface MeasurementOutcomeModalProps {
    measurementId: string;
    customerName: string;
    scheduledDate: Date;
    onClose: () => void;
    onSave: () => void;
}

export const MeasurementOutcomeModal: React.FC<MeasurementOutcomeModalProps> = ({
    measurementId,
    customerName,
    scheduledDate,
    onClose,
    onSave
}) => {
    const [outcome, setOutcome] = useState<MeasurementOutcome | ''>('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!outcome) {
            toast.error('Wybierz wynik pomiaru');
            return;
        }

        setSaving(true);
        try {
            await MeasurementReminderService.updateMeasurementOutcome(
                measurementId,
                outcome,
                notes
            );

            toast.success('Wynik pomiaru zapisany!');
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving measurement outcome:', error);
            toast.error('Błąd zapisywania wyniku');
        } finally {
            setSaving(false);
        }
    };

    const outcomes: { value: MeasurementOutcome; label: string; icon: React.ReactNode; color: string; description: string }[] = [
        {
            value: 'signed',
            label: 'Podpisał umowę',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
            description: 'Klient podpisał umowę podczas pomiaru'
        },
        {
            value: 'considering',
            label: 'Zastanawia się',
            icon: <Clock className="w-5 h-5" />,
            color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
            description: 'Klient potrzebuje czasu na decyzję'
        },
        {
            value: 'rejected',
            label: 'Odrzucił ofertę',
            icon: <XCircle className="w-5 h-5" />,
            color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
            description: 'Klient nie jest zainteresowany'
        },
        {
            value: 'no_show',
            label: 'Nie stawił się',
            icon: <UserX className="w-5 h-5" />,
            color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
            description: 'Klient nie był obecny w umówionym terminie'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Uzupełnij dane pomiaru</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {customerName} • {new Date(scheduledDate).toLocaleDateString('pl-PL')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Outcome Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Wynik pomiaru *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {outcomes.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setOutcome(option.value)}
                                    className={`
                                        p-4 rounded-lg border-2 transition-all text-left
                                        ${outcome === option.value
                                            ? option.color + ' ring-2 ring-offset-2 ring-current'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                        }
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={outcome === option.value ? '' : 'text-slate-400'}>
                                            {option.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm mb-1">
                                                {option.label}
                                            </div>
                                            <div className="text-xs opacity-75">
                                                {option.description}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Notatki
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Dodatkowe informacje o pomiarze..."
                            rows={4}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Info Box */}
                    {outcome && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1 text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Co się stanie po zapisaniu?</p>
                                    <p>
                                        {outcome === 'signed' && 'Lead zostanie przeniesiony do "Wygrane" w Kanbanie.'}
                                        {outcome === 'considering' && 'Lead zostanie przeniesiony do "Pomiar odbył się" i zostanie utworzone zadanie follow-up za 3 dni.'}
                                        {outcome === 'rejected' && 'Lead zostanie przeniesiony do "Utracone" w Kanbanie.'}
                                        {outcome === 'no_show' && 'Lead pozostanie w "Pomiar zaplanowany" - będzie wymagał przełożenia terminu.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!outcome || saving}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Zapisywanie...
                            </>
                        ) : (
                            'Zapisz i przesuń lead'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
