import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
// We'll reuse LeadService to send the message for now
import { LeadService } from '../../services/database/lead.service';
import { OfferService } from '../../services/database/offer.service';

interface MeasurementRequestModalProps {
    offerToken: string;
    offerId?: string;
    onClose: () => void;
}

export const MeasurementRequestModal: React.FC<MeasurementRequestModalProps> = ({ offerToken, offerId, onClose }) => {
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const times = ['Vormittags (8-12)', 'Nachmittags (12-16)', 'Abends (16-19)'];

    const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDays.length === 0 || selectedTimes.length === 0) {
            toast.error('Bitte wählen Sie bevorzugte Tage und Tageszeiten.');
            return;
        }

        setSending(true);
        const message = `
ANFRAGE AUFMASS
Bevorzugte Tage: ${selectedDays.join(', ')}
Bevorzugte Zeiten: ${selectedTimes.join(', ')}
Notiz: ${note}

Bitte um Kontaktaufnahme zur Terminbestätigung.
        `.trim();

        try {
            const success = await LeadService.sendClientMessage(offerToken, message);
            if (success) {
                toast.success('Vielen Dank! Ihre Anfrage wurde gesendet.');
                // Notify sales rep about measurement request
                OfferService.notifyOfferAction(offerToken, 'measurement_requested', {
                    preferredDays: selectedDays.join(', '),
                    preferredTimes: selectedTimes.join(', '),
                    note: note
                }).catch(() => { });
                onClose();
            } else {
                toast.error('Fehler beim Senden.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Ein Fehler ist aufgetreten.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Aufmaßtermin vereinbaren</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Schlagen Sie für Sie passende Termine vor. Unser Berater wird Sie telefonisch kontaktieren, um das genaue Datum und die Uhrzeit für den Technikerbesuch zu bestätigen.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bevorzugte Tage</label>
                        <div className="flex flex-wrap gap-2">
                            {days.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleSelection(day, selectedDays, setSelectedDays)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedDays.includes(day)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bevorzugte Tageszeit</label>
                        <div className="flex flex-wrap gap-2">
                            {times.map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => toggleSelection(time, selectedTimes, setSelectedTimes)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedTimes.includes(time)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                        }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Zusätzliche Anmerkungen (Optional)</label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="z.B. bitte erst ab 16:00 Uhr anrufen..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-transform active:scale-95"
                    >
                        {sending ? 'Wird gesendet...' : 'Anfrage absenden'}
                    </button>

                    <p className="text-xs text-center text-slate-400">
                        Dies ist noch keine endgültige Terminbestätigung.
                    </p>
                </form>
            </div>
        </div>
    );
};
