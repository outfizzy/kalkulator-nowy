import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FairService, type Fair, type Prize } from '../../services/database/fair.service';
import { FairLeadForm } from './FairLeadForm';
import confetti from 'canvas-confetti';

type ViewState = 'select_fair' | 'dashboard' | 'new_lead' | 'result';

export const FairDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<ViewState>('select_fair');
    const [fairs, setFairs] = useState<Fair[]>([]);
    const [selectedFair, setSelectedFair] = useState<Fair | null>(null);
    const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
    const [currentLeadName, setCurrentLeadName] = useState('');
    const [wonPrizeLabel, setWonPrizeLabel] = useState<string>('');

    useEffect(() => {
        FairService.getActiveFairs().then(data => {
            setFairs(data);
            if (data.length === 1) {
                setSelectedFair(data[0]);
                setView('dashboard');
            }
        });
    }, []);

    const handleLeadSaved = (leadId: string, leadName: string, prizeLabel?: string) => {
        setCurrentLeadId(leadId);
        setCurrentLeadName(leadName);
        setWonPrizeLabel(prizeLabel || 'Brak Nagrody');

        setView('result');
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    if (view === 'select_fair') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-8">Wybierz Targi</h1>
                <div className="grid gap-4 w-full max-w-md">
                    {fairs.map(fair => (
                        <button
                            key={fair.id}
                            onClick={() => {
                                setSelectedFair(fair);
                                setView('dashboard');
                            }}
                            className="p-6 bg-white rounded-xl shadow-lg border-2 border-slate-100 hover:border-accent text-left transition-all"
                        >
                            <h3 className="text-xl font-bold">{fair.name}</h3>
                            <p className="text-slate-500">{fair.location}</p>
                        </button>
                    ))}
                    {fairs.length === 0 && (
                        <div className="text-center text-slate-500">
                            <p>Brak aktywnych wydarzeń.</p>
                            <a href="/admin/fairs" className="text-accent hover:underline mt-2 block">
                                Przejdź do Panelu Administratora, aby utworzyć wydarzenie.
                            </a>
                        </div>
                    )}
                    <button onClick={() => navigate('/')} className="mt-8 text-slate-400 font-medium">Powrót</button>
                </div>
            </div>
        );
    }

    if (view === 'dashboard') {
        return (
            <div className="min-h-screen bg-slate-100 p-8 flex flex-col">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">{selectedFair?.name}</h1>
                        <p className="text-xl text-slate-600">{selectedFair?.location}</p>
                    </div>
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-white rounded-lg shadow font-medium">Wyjście</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full flex-1">
                    <button
                        onClick={() => setView('new_lead')}
                        className="bg-accent hover:bg-accent-dark text-white rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-6 p-12 transition-transform hover:scale-105 active:scale-95"
                    >
                        <div className="p-6 bg-white/20 rounded-full">
                            <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <span className="text-4xl font-bold">Nowy Klient</span>
                    </button>

                    <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col">
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">Statystyki Sesji</h3>
                        <div className="flex-1 flex items-center justify-center text-slate-400 italic">
                            (Statystyki wkrótce...)
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'new_lead') {
        return (
            <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-8 shrink-0">
                        <h2 className="text-3xl font-bold text-slate-900">Dane Klienta</h2>
                        <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-slate-600 p-2 text-xl">✕</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <FairLeadForm
                            fairId={selectedFair!.id}
                            fairName={selectedFair!.name}
                            onSaved={handleLeadSaved}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'result') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-12 rounded-3xl shadow-2xl animate-bounce-in max-w-2xl w-full">
                    <h2 className="text-3xl font-bold text-slate-800 mb-4">GRATULACJE!</h2>
                    <p className="text-xl text-slate-500 mb-4">{currentLeadName}</p>

                    <div className="py-8 border-y border-slate-100 my-6">
                        <div className="text-sm uppercase font-bold text-slate-400 mb-2">WYLOSOWANA NAGRODA</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                            {wonPrizeLabel}
                        </div>
                    </div>

                    <p className="text-slate-500 text-lg mb-8">
                        Nagroda została przypisana do klienta.<br />
                        Wysłano potwierdzenie PDF.
                    </p>

                    <button
                        onClick={() => {
                            setWonPrizeLabel('');
                            setCurrentLeadId(null);
                            setView('dashboard');
                        }}
                        className="px-12 py-4 bg-slate-900 text-white rounded-xl text-xl font-bold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl w-full"
                    >
                        Wróć do Pulpitu
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
