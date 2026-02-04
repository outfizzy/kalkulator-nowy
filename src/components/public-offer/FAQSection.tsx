import React, { useState } from 'react';

const faqData = [
    {
        q: "Wie lange dauert die Realisierung?",
        a: "Die Produktionszeit beträgt je nach Modell und Konfiguration etwa 3-8 Wochen. Nach der Fertigstellung kontaktieren wir Sie telefonisch, um den genauen Montagetermin zu vereinbaren – in der Regel innerhalb von 7 Tagen."
    },
    {
        q: "Welche Farben sind verfügbar?",
        a: "Wir bieten alle RAL-Farben an! Von klassischem Anthrazitgrau (RAL 7016) bis hin zu individuellen Wunschtönen – wir realisieren Ihre persönliche Farbvorstellung. Sprechen Sie uns einfach an."
    },
    {
        q: "Wie bereite ich den Untergrund vor?",
        a: "Ein ebener Untergrund reicht aus (Beton, Pflastersteine oder Punktfundamente). Unser Techniker prüft die Gegebenheiten beim endgültigen Aufmaß genau und berät Sie zur besten Lösung."
    },
    {
        q: "Wie pflege ich meine Terrassenüberdachung?",
        a: "Die Pflege ist unkompliziert: Die Glasflächen können Sie mit handelsüblichem Glasreiniger säubern. Die integrierten Regenrinnen sollten 1-2 Mal jährlich von Laub befreit werden – das war's schon!"
    },
    {
        q: "Ist die Montage im Preis enthalten?",
        a: "Ja, die professionelle Montage durch unser eigenes Montageteam ist in der Regel im Angebotspreis inkludiert. Wir legen großen Wert darauf, alle Projekte mit unseren geschulten Fachkräften zu realisieren."
    },
    {
        q: "Was passiert bei schlechtem Wetter am Montagetag?",
        a: "Kein Problem! Sollte das Wetter eine sichere Montage nicht zulassen, finden wir gemeinsam einen neuen Termin. Ihr Projekt soll stressfrei und professionell ablaufen – dafür sorgen wir."
    },
    {
        q: "Gibt es eine Garantie?",
        a: "Selbstverständlich! Wir gewähren 5 Jahre Garantie auf die Aluminiumkonstruktion sowie auf alle verbauten Materialien. Bei uns sind Sie auf der sicheren Seite."
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
