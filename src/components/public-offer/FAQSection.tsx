import React, { useState } from 'react';

const faqData = [
    {
        q: "Wie lange dauert die Realisierung?",
        a: "Die Produktionszeit beträgt je nach Modell und Konfiguration etwa 3–8 Wochen. Nach der Fertigstellung kontaktieren wir Sie telefonisch, um den genauen Montagetermin zu vereinbaren — in der Regel innerhalb von 7 Tagen."
    },
    {
        q: "Welche Farben sind verfügbar?",
        a: "Wir bieten alle RAL-Farben an! Von klassischem Anthrazitgrau (RAL 7016) bis hin zu individuellen Wunschtönen — wir realisieren Ihre persönliche Farbvorstellung. Sprechen Sie uns einfach an."
    },
    {
        q: "Ist die Montage im Preis enthalten?",
        a: "Die Montagekosten werden in Ihrem Angebot als separate Position transparent ausgewiesen. So haben Sie einen klaren Überblick über Material- und Montagekosten. Unsere geschulten Fachkräfte führen die professionelle Montage durch."
    },
    {
        q: "Gibt es eine Garantie?",
        a: "Selbstverständlich! Wir gewähren 5 Jahre Garantie auf die Aluminiumkonstruktion sowie auf alle verbauten Materialien. Bei uns sind Sie auf der sicheren Seite."
    },
    {
        q: "Was muss ich vor der Montage vorbereiten?",
        a: "Ein ebener Untergrund reicht aus (Beton, Pflastersteine oder Punktfundamente). Unser Techniker prüft die Gegebenheiten beim endgültigen Aufmaß genau und berät Sie zur besten Lösung."
    }
];

export const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-400">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Häufige Fragen
                </h3>
            </div>
            <div>
                {faqData.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-100 last:border-0">
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full text-left p-5 flex justify-between items-center hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-semibold text-slate-700 text-sm">{item.q}</span>
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className={`w-4 h-4 text-slate-400 shrink-0 ml-3 transform transition-transform duration-200 ${openIndex === idx ? 'rotate-180' : ''}`}
                            >
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-48' : 'max-h-0'}`}
                        >
                            <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed">
                                {item.a}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
