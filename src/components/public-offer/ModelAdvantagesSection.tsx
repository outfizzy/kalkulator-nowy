import React from 'react';

// ===== MODEL ADVANTAGES DATA =====
// Sales-oriented benefits per model family, displayed to customer
const MODEL_ADVANTAGES: Record<string, {
    headline: string;
    benefits: { icon: string; title: string; desc: string }[];
}> = {
    'orangeline': {
        headline: 'Das Einsteigermodell mit Profi-Qualität',
        benefits: [
            { icon: '💰', title: 'Bestes Preis-Leistungs-Verhältnis', desc: 'Premium Aluminium zum attraktiven Einstiegspreis — ohne Kompromisse bei der Qualität.' },
            { icon: '🛡️', title: 'Wetterfeste Konstruktion', desc: 'Pulverbeschichtetes Aluminium trotzt jedem Wetter. Rostfrei und pflegeleicht für Jahrzehnte.' },
            { icon: '💡', title: 'LED-Integration möglich', desc: 'Spots und LED-Strips lassen sich elegant in die Sparren integrieren — für stimmungsvolle Abende.' },
            { icon: '⚡', title: 'Schnelle Montage', desc: 'Durchdachtes Stecksystem für eine saubere und effiziente Montage durch unser Fachteam.' },
        ]
    },
    'orangeline+': {
        headline: 'Verstärkt für maximale Stabilität',
        benefits: [
            { icon: '💪', title: 'Verstärktes 60mm Profil', desc: 'Mehr Stabilität als das Basismodell — ideal für größere Spannweiten und höhere Lasten.' },
            { icon: '💰', title: 'Attraktiver Einstiegspreis', desc: 'Premium-Qualität zum fairen Preis — das optimale Upgrade vom Orangestyle.' },
            { icon: '🛡️', title: 'Langlebig & pflegeleicht', desc: 'Hochwertige Pulverbeschichtung für dauerhaften Schutz und zeitlose Optik.' },
            { icon: '💡', title: 'LED-Beleuchtung optional', desc: 'Integrierte Beleuchtungslösungen für eine einladende Atmosphäre.' },
        ]
    },
    'trendline': {
        headline: 'Der Bestseller — Qualität trifft Design',
        benefits: [
            { icon: '🏆', title: 'Meistverkauftes Modell', desc: 'Hunderte zufriedener Kunden vertrauen auf den bewährten Trendstyle — unser Klassiker.' },
            { icon: '📐', title: 'Variable Neigung 5–15°', desc: 'Flexible Dachneigung für optimale Wasserableitung und individuellen Look.' },
            { icon: '🎨', title: '3 Stil-Varianten', desc: 'Wählen Sie zwischen flach, rund oder klassisch — passend zu jedem Architekturstil.' },
            { icon: '🔧', title: 'Vielseitige Erweiterungen', desc: 'Seitenwände, Schiebetüren, Markisen und mehr — alles nahtlos integrierbar.' },
        ]
    },
    'trendline+': {
        headline: 'Mehr Power für größere Projekte',
        benefits: [
            { icon: '💪', title: '70mm Verstärktes Profil', desc: 'Für größere Spannweiten und erhöhte Schneelasten — die robuste Alternative.' },
            { icon: '🏗️', title: 'Freistehend oder Wandanbau', desc: 'Maximale Flexibilität bei der Montage — auch mitten im Garten.' },
            { icon: '❄️', title: 'Erhöhte Tragfähigkeit', desc: 'Ausgelegt für höhere Schnee- und Windlasten — Sicherheit steht an erster Stelle.' },
            { icon: '🔧', title: 'Komplett-Ausstattung möglich', desc: 'Alle Erweiterungen wie Seitenwände, LEDs und Heizstrahler sind kompatibel.' },
        ]
    },
    'topline': {
        headline: 'Premium-Klasse für höchste Ansprüche',
        benefits: [
            { icon: '👑', title: 'Premium 80mm Profilsystem', desc: 'Massive Konstruktion mit verstärkten 149mm Pfosten — gebaut für Generationen.' },
            { icon: '📏', title: 'Große Spannweiten', desc: 'Bis zu 6.000 × 4.500 mm mit nur 2 Pfosten — maximaler Freiraum unter der Überdachung.' },
            { icon: '🛡️', title: 'Höchste Statik-Werte', desc: 'Geprüft nach DIN EN 1991 für extreme Schnee- und Windlasten.' },
            { icon: '✨', title: 'Elegantes Design', desc: 'Schlanke Profile und durchdachte Details — das sieht man einfach.' },
        ]
    },
    'topline xl': {
        headline: 'Die XL-Lösung für große Terrassen',
        benefits: [
            { icon: '🏛️', title: 'Extra starke 196mm Pfosten', desc: 'Die massivste Konstruktion in unserem Sortiment — für repräsentative Projekte.' },
            { icon: '📏', title: 'Bis zu 7.000 mm Breite', desc: 'Überspannen Sie auch die größte Terrasse mit nur einer Konstruktion.' },
            { icon: '❄️', title: 'Maximale Belastbarkeit', desc: 'Höchste Schnee- und Windlasten — für absolute Sicherheit.' },
            { icon: '☀️', title: 'Solar-kompatibel', desc: 'Die starke Konstruktion eignet sich als Basis für Photovoltaik-Module.' },
        ]
    },
    'designline': {
        headline: 'Architektur trifft Innovation',
        benefits: [
            { icon: '🎨', title: 'Obenliegende Statik', desc: 'Einzigartiges Design mit verdeckter Rinnenführung — schlank und puristisch.' },
            { icon: '🔲', title: 'Schiebedach-Funktion', desc: 'Optional als Schiebedach erhältlich — Sonnenlicht nach Wunsch.' },
            { icon: '🛡️', title: 'Höchste Widerstandsfähigkeit', desc: 'Massive 196mm Pfosten für extreme Wind- und Schneelasten.' },
            { icon: '🏆', title: 'Exklusive Glaseindeckung', desc: 'Nur mit VSG-Sicherheitsglas — maximale Transparenz und Eleganz.' },
        ]
    },
    'ultraline': {
        headline: 'Minimalistisch. Modern. Makellos.',
        benefits: [
            { icon: '✨', title: 'Horizontale Flachdach-Optik', desc: 'Klare Linien und modernes Design — der Blickfang für Ihr Zuhause.' },
            { icon: '📏', title: 'Größte Spannweite', desc: 'Bis zu 7.000 × 5.000 mm — für überdimensionale Terrassen und Freisitze.' },
            { icon: '💡', title: 'Integrierte Beleuchtung', desc: 'LEDs in Pfosten, Rinne und Sparren — für ein durchgängiges Lichtkonzept.' },
            { icon: '🏛️', title: 'Architekten-Favorit', desc: 'Das Premiummodell für anspruchsvolle Bauherren — minimalistisch und elegant.' },
        ]
    },
    'skyline': {
        headline: 'Das Gartenzimmer der Zukunft',
        benefits: [
            { icon: '🏡', title: 'Kubistisches Design', desc: 'Modernes, gradliniges Design — ideal als gläsernes Gartenzimmer.' },
            { icon: '🌡️', title: 'Ganzjährig nutzbar', desc: 'In Kombination mit Seitenwänden entsteht ein vollwertiger Wintergarten.' },
            { icon: '💡', title: 'Integrierte Beleuchtung', desc: 'LED-Spots und -Strips für die perfekte Atmosphäre — zu jeder Tageszeit.' },
            { icon: '🔲', title: 'Schlanker 160mm Pfosten', desc: 'Trotz kompakter Bauweise — maximale Stabilität und Glasfläche.' },
        ]
    },
    'carport': {
        headline: 'Stilvoller Schutz für Ihr Fahrzeug',
        benefits: [
            { icon: '🚗', title: 'Optimaler Fahrzeugschutz', desc: 'Schützt vor Sonne, Regen, Hagel und Schnee — ganzjähriger Komfort.' },
            { icon: '☀️', title: 'Solar-ready', desc: 'Die robuste Stahlblech-Eindeckung ist ideal als Unterkonstruktion für PV-Module.' },
            { icon: '🏗️', title: 'Einzel- oder Doppelcarport', desc: 'Flexibel konfigurierbar — für ein oder zwei Fahrzeuge.' },
            { icon: '🛡️', title: 'Rostfreies Aluminium', desc: 'Wartungsfreie Konstruktion mit langer Lebensdauer — im Gegensatz zu Holz oder Stahl.' },
        ]
    },
    'pergola': {
        headline: 'Bioklimatisch. Intelligent. Flexibel.',
        benefits: [
            { icon: '🌤️', title: 'Drehbare Lamellen', desc: 'Stufenlos regulierbar — von vollem Sonnenschutz bis zu offener Belüftung.' },
            { icon: '🌧️', title: 'Regenschutz auf Knopfdruck', desc: 'Geschlossene Lamellen halten jeden Regenschauer ab.' },
            { icon: '💡', title: 'Smart-Home-Integration', desc: 'Optional mit motorischer Steuerung und Sensor-Automatik.' },
            { icon: '🏡', title: 'Freistehende Konstruktion', desc: 'Ideal für den Garten, Pool-Bereich oder die Dachterrasse.' },
        ]
    },
    'pergola deluxe': {
        headline: 'Die Pergola ohne Kompromisse',
        benefits: [
            { icon: '👑', title: 'Premium-Ausstattung', desc: 'LED-Beleuchtung, Heizstrahler und Verglasung — alles inklusive möglich.' },
            { icon: '🌤️', title: 'Bioklimatische Lamellen', desc: 'Intelligente Sonnenschutz-Steuerung für maximalen Komfort.' },
            { icon: '📏', title: 'Große Spannweite', desc: 'Bis zu 7.000 × 5.000 mm — für großzügige Außenbereiche.' },
            { icon: '🏆', title: 'Das Flaggschiff', desc: 'Unser exklusivstes Pergola-Modell — für höchste Ansprüche.' },
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ihre Vorteile
                </h3>
                <p className="text-white font-bold text-lg">{data.headline}</p>
            </div>

            {/* Benefits Grid */}
            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.benefits.map((benefit, i) => (
                        <div
                            key={i}
                            className="flex gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                                {benefit.icon}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm leading-tight">{benefit.title}</div>
                                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{benefit.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Trust Note */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
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
