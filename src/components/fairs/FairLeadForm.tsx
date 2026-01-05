import React, { useState } from 'react';
import { DatabaseService } from '../../services/database';

interface FairLeadFormProps {
    fairId: string;
    onSaved: (leadId: string, leadName: string) => void;
}

export const FairLeadForm: React.FC<FairLeadFormProps> = ({ fairId, onSaved }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [interest, setInterest] = useState<string[]>([]);
    const [width, setWidth] = useState(4);
    const [projection, setProjection] = useState(3);
    const [loading, setLoading] = useState(false);

    const toggleInterest = (val: string) => {
        setInterest(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const notes = `Targi: Zainteresowany: ${interest.join(', ')}. Wymiary: ${width}x${projection}m.`;

        try {
            const lead = await DatabaseService.createLead({
                customerData: {
                    firstName,
                    lastName,
                    phone,
                    email,
                    companyName: '',
                },
                source: 'targi',
                status: 'new',
                notes: notes,
                fair_id: fairId
            } as any);

            if (lead) {
                onSaved(lead.id, `${firstName} ${lastName}`);
            }
        } catch (error) {
            console.error(error);
            alert('Błąd zapisu! Sprawdź internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <input
                    placeholder="Imię"
                    className="p-4 text-xl border rounded-xl"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                />
                <input
                    placeholder="Nazwisko"
                    className="p-4 text-xl border rounded-xl"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                />
            </div>
            <input
                type="tel"
                placeholder="Telefon (np. 500 123 456)"
                className="w-full p-4 text-xl border rounded-xl"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required // Enforce phone for SMS followup often used at fairs
            />
            <input
                type="email"
                placeholder="E-mail (opcjonalnie)"
                className="w-full p-4 text-xl border rounded-xl"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />

            <div className="p-4 bg-slate-50 rounded-xl">
                <label className="block text-sm font-bold text-slate-500 uppercase mb-3">Co go interesuje?</label>
                <div className="flex flex-wrap gap-3">
                    {['Zadaszenie', 'Ogród Zimowy', 'Carport', 'Markiza', 'Okna', 'Inne'].map(opt => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => toggleInterest(opt)}
                            className={`px-6 py-3 rounded-full text-lg font-medium transition-colors ${interest.includes(opt)
                                ? 'bg-accent text-white shadow-lg scale-105'
                                : 'bg-white border border-slate-200 text-slate-600'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                <label className="block text-sm font-bold text-slate-500 uppercase">Wstępne Wymiary</label>

                <div className="flex items-center gap-4">
                    <span className="w-24 font-bold text-slate-700">Szerokość:</span>
                    <input
                        type="range" min="2" max="10" step="0.5"
                        value={width} onChange={e => setWidth(Number(e.target.value))}
                        className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <span className="w-16 text-right font-bold text-xl text-accent">{width} m</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="w-24 font-bold text-slate-700">Wysięg:</span>
                    <input
                        type="range" min="2" max="6" step="0.5"
                        value={projection} onChange={e => setProjection(Number(e.target.value))}
                        className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <span className="w-16 text-right font-bold text-xl text-accent">{projection} m</span>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-green-600 hover:bg-green-700 text-white text-2xl font-bold rounded-2xl shadow-xl transition-transform active:scale-95"
            >
                {loading ? 'Zapisywanie...' : 'ZAPISZ I GRAJ 🎲'}
            </button>
        </form>
    );
};
