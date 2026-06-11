import React from 'react';

// ===== SVG ICONS for professional advantages display =====
const ICONS: Record<string, React.ReactNode> = {
    price: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-blue-600">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-600">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    bulb: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-amber-600">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    bolt: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-yellow-600">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    trophy: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-amber-600">
            <path d="M8 21h8M12 17v4M7 4h10M17 4v4a5 5 0 01-10 0V4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 8h2a2 2 0 002-2V4h-4M7 8H5a2 2 0 01-2-2V4h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    ruler: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-indigo-600">
            <path d="M2 12h5M9 12h2M13 12h2M17 12h5M12 2v20" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="8" width="18" height="8" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    palette: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-purple-600">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H17c2.8 0 5-2.2 5-5 0-4.8-4.5-8.6-10-8.4z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor" />
            <circle cx="10" cy="7.5" r="1.5" fill="currentColor" />
            <circle cx="14" cy="7.5" r="1.5" fill="currentColor" />
            <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor" />
        </svg>
    ),
    wrench: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-600">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    muscle: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-orange-600">
            <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    building: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-600">
            <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V6h6v16M9 10h6M9 14h6M9 18h6" strokeLinecap="round" />
        </svg>
    ),
    snow: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-cyan-600">
            <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    crown: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-amber-600">
            <path d="M2 20h20L19 8l-5 4-2-6-2 6-5-4-1 12z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    expand: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-blue-600">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    sparkle: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-violet-600">
            <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3zM5 3v2M19 19v2M3 5h2M19 19h2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    grid: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-600">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    sun: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-amber-500">
            <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
        </svg>
    ),
    car: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-blue-600">
            <path d="M5 17h14M3 12l2-5h14l2 5M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    home: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-emerald-600">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    thermometer: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-red-500">
            <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    wind: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-teal-600">
            <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    rain: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-blue-500">
            <path d="M16 13v8M8 13v8M12 15v8" strokeLinecap="round" /><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    chip: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-violet-600">
            <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
            <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" strokeLinecap="round" />
        </svg>
    ),
};

// ===== MODEL ADVANTAGES DATA with SVG icon keys =====
const MODEL_ADVANTAGES: Record<string, {
    headline: string;
    benefits: { icon: string; title: string; desc: string }[];
}> = {
    'orangeline': {
        headline: 'Das Einsteigermodell mit Profi-Qualität',
        benefits: [
            { icon: 'price', title: 'Bestes Preis-Leistungs-Verhältnis', desc: 'Premium Aluminium zum attraktiven Einstiegspreis — ohne Kompromisse bei der Qualität.' },
            { icon: 'shield', title: 'Wetterfeste Konstruktion', desc: 'Pulverbeschichtetes Aluminium trotzt jedem Wetter. Rostfrei und pflegeleicht für Jahrzehnte.' },
            { icon: 'bulb', title: 'LED-Integration möglich', desc: 'Spots und LED-Strips lassen sich elegant in die Sparren integrieren — für stimmungsvolle Abende.' },
            { icon: 'bolt', title: 'Schnelle Montage', desc: 'Durchdachtes Stecksystem für eine saubere und effiziente Montage durch unser Fachteam.' },
        ]
    },
    'orangeline+': {
        headline: 'Verstärkt für maximale Stabilität',
        benefits: [
            { icon: 'muscle', title: 'Verstärktes 60mm Profil', desc: 'Mehr Stabilität als das Basismodell — ideal für größere Spannweiten und höhere Lasten.' },
            { icon: 'price', title: 'Attraktiver Einstiegspreis', desc: 'Premium-Qualität zum fairen Preis — das optimale Upgrade vom Orangestyle.' },
            { icon: 'shield', title: 'Langlebig & pflegeleicht', desc: 'Hochwertige Pulverbeschichtung für dauerhaften Schutz und zeitlose Optik.' },
            { icon: 'bulb', title: 'LED-Beleuchtung optional', desc: 'Integrierte Beleuchtungslösungen für eine einladende Atmosphäre.' },
        ]
    },
    'trendline': {
        headline: 'Der Bestseller — Qualität trifft Design',
        benefits: [
            { icon: 'trophy', title: 'Meistverkauftes Modell', desc: 'Hunderte zufriedener Kunden vertrauen auf den bewährten Trendstyle — unser Klassiker.' },
            { icon: 'ruler', title: 'Variable Neigung 5–15°', desc: 'Flexible Dachneigung für optimale Wasserableitung und individuellen Look.' },
            { icon: 'palette', title: '3 Stil-Varianten', desc: 'Wählen Sie zwischen flach, rund oder klassisch — passend zu jedem Architekturstil.' },
            { icon: 'wrench', title: 'Vielseitige Erweiterungen', desc: 'Seitenwände, Schiebetüren, Markisen und mehr — alles nahtlos integrierbar.' },
        ]
    },
    'trendline+': {
        headline: 'Mehr Power für größere Projekte',
        benefits: [
            { icon: 'muscle', title: '70mm Verstärktes Profil', desc: 'Für größere Spannweiten und erhöhte Schneelasten — die robuste Alternative.' },
            { icon: 'building', title: 'Freistehend oder Wandanbau', desc: 'Maximale Flexibilität bei der Montage — auch mitten im Garten.' },
            { icon: 'snow', title: 'Erhöhte Tragfähigkeit', desc: 'Ausgelegt für höhere Schnee- und Windlasten — Sicherheit steht an erster Stelle.' },
            { icon: 'wrench', title: 'Komplett-Ausstattung möglich', desc: 'Alle Erweiterungen wie Seitenwände, LEDs und Heizstrahler sind kompatibel.' },
        ]
    },
    'topline': {
        headline: 'Premium-Klasse für höchste Ansprüche',
        benefits: [
            { icon: 'crown', title: 'Premium 80mm Profilsystem', desc: 'Massive Konstruktion mit verstärkten 149mm Pfosten — gebaut für Generationen.' },
            { icon: 'expand', title: 'Große Spannweiten', desc: 'Bis zu 6.000 × 4.500 mm mit nur 2 Pfosten — maximaler Freiraum unter der Überdachung.' },
            { icon: 'shield', title: 'Höchste Statik-Werte', desc: 'Geprüft nach DIN EN 1991 für extreme Schnee- und Windlasten.' },
            { icon: 'sparkle', title: 'Elegantes Design', desc: 'Schlanke Profile und durchdachte Details — das sieht man einfach.' },
        ]
    },
    'topline xl': {
        headline: 'Die XL-Lösung für große Terrassen',
        benefits: [
            { icon: 'building', title: 'Extra starke 196mm Pfosten', desc: 'Die massivste Konstruktion in unserem Sortiment — für repräsentative Projekte.' },
            { icon: 'expand', title: 'Bis zu 7.000 mm Breite', desc: 'Überspannen Sie auch die größte Terrasse mit nur einer Konstruktion.' },
            { icon: 'snow', title: 'Maximale Belastbarkeit', desc: 'Höchste Schnee- und Windlasten — für absolute Sicherheit.' },
            { icon: 'sun', title: 'Solar-kompatibel', desc: 'Die starke Konstruktion eignet sich als Basis für Photovoltaik-Module.' },
        ]
    },
    'designline': {
        headline: 'Architektur trifft Innovation',
        benefits: [
            { icon: 'palette', title: 'Obenliegende Statik', desc: 'Einzigartiges Design mit verdeckter Rinnenführung — schlank und puristisch.' },
            { icon: 'grid', title: 'Schiebedach-Funktion', desc: 'Optional als Schiebedach erhältlich — Sonnenlicht nach Wunsch.' },
            { icon: 'shield', title: 'Höchste Widerstandsfähigkeit', desc: 'Massive 196mm Pfosten für extreme Wind- und Schneelasten.' },
            { icon: 'trophy', title: 'Exklusive Glaseindeckung', desc: 'Nur mit VSG-Sicherheitsglas — maximale Transparenz und Eleganz.' },
        ]
    },
    'ultraline': {
        headline: 'Minimalistisch. Modern. Makellos.',
        benefits: [
            { icon: 'sparkle', title: 'Horizontale Flachdach-Optik', desc: 'Klare Linien und modernes Design — der Blickfang für Ihr Zuhause.' },
            { icon: 'expand', title: 'Größte Spannweite', desc: 'Bis zu 7.000 × 5.000 mm — für überdimensionale Terrassen und Freisitze.' },
            { icon: 'bulb', title: 'Integrierte Beleuchtung', desc: 'LEDs in Pfosten, Rinne und Sparren — für ein durchgängiges Lichtkonzept.' },
            { icon: 'building', title: 'Architekten-Favorit', desc: 'Das Premiummodell für anspruchsvolle Bauherren — minimalistisch und elegant.' },
        ]
    },
    'skyline': {
        headline: 'Das Gartenzimmer der Zukunft',
        benefits: [
            { icon: 'home', title: 'Kubistisches Design', desc: 'Modernes, gradliniges Design — ideal als gläsernes Gartenzimmer.' },
            { icon: 'thermometer', title: 'Ganzjährig nutzbar', desc: 'In Kombination mit Seitenwänden entsteht ein vollwertiger Wintergarten.' },
            { icon: 'bulb', title: 'Integrierte Beleuchtung', desc: 'LED-Spots und -Strips für die perfekte Atmosphäre — zu jeder Tageszeit.' },
            { icon: 'grid', title: 'Schlanker 160mm Pfosten', desc: 'Trotz kompakter Bauweise — maximale Stabilität und Glasfläche.' },
        ]
    },
    'carport': {
        headline: 'Stilvoller Schutz für Ihr Fahrzeug',
        benefits: [
            { icon: 'car', title: 'Optimaler Fahrzeugschutz', desc: 'Schützt vor Sonne, Regen, Hagel und Schnee — ganzjähriger Komfort.' },
            { icon: 'sun', title: 'Solar-ready', desc: 'Die robuste Stahlblech-Eindeckung ist ideal als Unterkonstruktion für PV-Module.' },
            { icon: 'building', title: 'Einzel- oder Doppelcarport', desc: 'Flexibel konfigurierbar — für ein oder zwei Fahrzeuge.' },
            { icon: 'shield', title: 'Rostfreies Aluminium', desc: 'Wartungsfreie Konstruktion mit langer Lebensdauer — im Gegensatz zu Holz oder Stahl.' },
        ]
    },
    'pergola': {
        headline: 'Bioklimatisch. Intelligent. Flexibel.',
        benefits: [
            { icon: 'wind', title: 'Drehbare Lamellen', desc: 'Stufenlos regulierbar — von vollem Sonnenschutz bis zu offener Belüftung.' },
            { icon: 'rain', title: 'Regenschutz auf Knopfdruck', desc: 'Geschlossene Lamellen halten jeden Regenschauer ab.' },
            { icon: 'chip', title: 'Smart-Home-Integration', desc: 'Optional mit motorischer Steuerung und Sensor-Automatik.' },
            { icon: 'home', title: 'Freistehende Konstruktion', desc: 'Ideal für den Garten, Pool-Bereich oder die Dachterrasse.' },
        ]
    },
    'pergola deluxe': {
        headline: 'Die Pergola ohne Kompromisse',
        benefits: [
            { icon: 'crown', title: 'Premium-Ausstattung', desc: 'LED-Beleuchtung, Heizstrahler und Verglasung — alles inklusive möglich.' },
            { icon: 'wind', title: 'Bioklimatische Lamellen', desc: 'Intelligente Sonnenschutz-Steuerung für maximalen Komfort.' },
            { icon: 'expand', title: 'Große Spannweite', desc: 'Bis zu 7.000 × 5.000 mm — für großzügige Außenbereiche.' },
            { icon: 'trophy', title: 'Das Flaggschiff', desc: 'Unser exklusivstes Pergola-Modell — für höchste Ansprüche.' },
        ]
    },
};

// Fallback aliases for model matching
const MODEL_ALIASES: Record<string, string> = {
    'trendstyle': 'trendline', 'trendstyle+': 'trendline+',
    'topstyle': 'topline', 'topstyle xl': 'topline xl', 'topstyle_xl': 'topline xl',
    'topline_xl': 'topline xl',
    'orangestyle': 'orangeline', 'orangestyle+': 'orangeline+',
    'designstyle': 'designline',
    'ultrastyle': 'ultraline',
    'skystyle': 'skyline',
    'pergola_bio': 'pergola', 'pergola_deluxe': 'pergola deluxe',
};

interface ModelAdvantagesSectionProps {
    modelId: string;
}

export const ModelAdvantagesSection: React.FC<ModelAdvantagesSectionProps> = ({ modelId }) => {
    const key = modelId?.toLowerCase() || '';
    const data = MODEL_ADVANTAGES[key] || MODEL_ADVANTAGES[MODEL_ALIASES[key] || ''];

    if (!data) return null;

    return (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden">
            {/* Header */}
            <div className="bg-brand-gradient p-5 md:p-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ihre Vorteile
                </h3>
                <p className="text-white font-bold text-base md:text-lg">{data.headline}</p>
            </div>

            {/* Benefits Grid */}
            <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.benefits.map((benefit, i) => (
                        <div
                            key={i}
                            className="flex gap-3 p-3.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all"
                        >
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                {ICONS[benefit.icon] || ICONS.sparkle}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm leading-tight">{benefit.title}</div>
                                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{benefit.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Trust Note */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-green-500">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Made in Germany
                    </span>
                    <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-green-500">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        5 Jahre Garantie
                    </span>
                    <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-green-500">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Profi-Montage
                    </span>
                </div>
            </div>
        </div>
    );
};
