import React, { useState } from 'react';

const faqData = [
    {
        q: "Wann bezahle ich die Bestellung?",
        a: "Wir verlangen keine Anzahlung! Die Zahlung erfolgt erst nach Montage und Abnahme der Terrassenüberdachung. Sie können bar oder per Überweisung bezahlen."
    },
    {
        q: "Wie lange dauert die Realisierung?",
        a: "Die Standard-Produktionszeit beträgt 3-5 Wochen. Nach der Fertigstellung kontaktieren wir Sie telefonisch, um den genauen Montagetermin zu vereinbaren (meist innerhalb von 7 Tagen)."
    },
    {
        q: "Wie bereite ich den Untergrund vor?",
        a: "Ein ebener Untergrund reicht aus (Beton, Pflastersteine oder Punktfundamente). Unser Techniker prüft die Gegebenheiten beim endgültigen Aufmaß genau und berät Sie zur besten Lösung."
    },
    {
        q: "Gibt es eine Garantie?",
        a: "Ja, wir gewähren 10 Jahre Garantie auf die Aluminiumkonstruktion und 10 Jahre Garantie auf Polycarbonat/Glas."
    }
];

export const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">🤔</span> Häufige Fragen
                </h3>
            </div>
            <div>
                {faqData.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-100 last:border-0">
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full text-left p-5 flex justify-between items-center hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-semibold text-slate-700">{item.q}</span>
                            <span className={`transform transition-transform duration-200 text-slate-400 ${openIndex === idx ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-48' : 'max-h-0'
                                }`}
                        >
                            <div className="p-5 pt-0 text-slate-600 text-sm leading-relaxed bg-slate-50/30">
                                {item.a}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
