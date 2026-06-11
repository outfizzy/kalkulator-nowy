import React, { useState } from 'react';

const faqData = [
    {
        q: "Wie lange dauert die Realisierung?",
        a: "Das Aufmaß erfolgt innerhalb von 7 Tagen, die Produktion dauert 4–6 Wochen. Die Montage vor Ort nimmt in der Regel 1–2 Tage in Anspruch."
    },
    {
        q: "Welche Farben sind verfügbar?",
        a: "Jede RAL-Farbe ist möglich. Ohne Aufpreis erhalten Sie unsere Standardfarben: RAL 7016 Anthrazit, RAL 9016 Weiß, RAL 9005 Schwarz sowie DB 703."
    },
    {
        q: "Ist die Montage im Preis enthalten?",
        a: "Ja — 1 Montagetag inklusive Transport ist im Preis enthalten. Weitere Montagetage werden günstiger berechnet; der genaue Umfang wird nach dem Aufmaß festgelegt."
    },
    {
        q: "Gibt es eine Garantie?",
        a: "Ja, wir gewähren 10 Jahre Herstellergarantie auf Konstruktion und Beschichtung."
    },
    {
        q: "Ist der Preis verbindlich?",
        a: "Es handelt sich um einen Richtpreis auf Basis Ihrer Angaben. Die verbindliche Bestätigung erhalten Sie nach dem kostenlosen Aufmaß."
    },
    {
        q: "Gibt es Größenbeschränkungen bei der Breite?",
        a: "Nein. Dank modularer Bauweise (gekoppelte Felder) gibt es keine Breitenbegrenzung — auch sehr breite Terrassen überdachen wir problemlos. Jede Anlage wird als Maßanfertigung millimetergenau nach Ihren Maßen gefertigt."
    },
    {
        q: "Ist eine Finanzierung möglich?",
        a: "Ja, auf Anfrage. Sprechen Sie dazu einfach Ihren persönlichen Berater an."
    }
];

export const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-4 md:px-8 border-b border-slate-100 flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-[#1E6FD9]">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-[15px] font-bold text-slate-800">Häufige Fragen</h3>
            </div>
            <div>
                {faqData.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-100 last:border-0">
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            aria-expanded={openIndex === idx}
                            className="w-full text-left px-5 md:px-8 py-3 min-h-[44px] flex justify-between items-center gap-3 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E6FD9]"
                        >
                            <span className="font-semibold text-slate-700 text-[13px]">{item.q}</span>
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
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-80' : 'max-h-0'}`}
                        >
                            <div className="px-5 md:px-8 pb-5 text-slate-500 text-[13px] leading-relaxed">
                                {item.a}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
