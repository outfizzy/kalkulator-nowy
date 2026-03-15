import React, { useState } from 'react';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// INSPIRATIONEN TAB — Content Pillars, Calendar, Examples
// ═══════════════════════════════════════════

const CONTENT_PILLARS = [
    { name: 'Realizacje', icon: '🏗️', color: 'bg-blue-500', desc: '2-3x/Woche: Vorher-Nachher, Projektfotos', examples: [
        '☀️ Von „wir können die Terrasse nur bei schönem Wetter nutzen" zu „unser zweites Wohnzimmer" — Familie M. aus Düsseldorf.\n\n✅ Pulverbeschichtetes Aluminium\n✅ Integrierte LED-Beleuchtung\n✅ VSG-Sicherheitsglas\n\n📞 Kostenlose Beratung: Nachricht schreiben!\n#Terrassenüberdachung #Polendach24',
        '🏠 Carport-Montage in nur 2 Tagen! Familie K. aus München hat sich für unser Premium-Aluminium-Carport entschieden.\n\nDas Ergebnis? Ein designstarker Unterstand, der das gesamte Grundstück aufwertet. 💎\n#Carport #Aluminium #Polendach24',
    ]},
    { name: 'Experten-Tipps', icon: '📚', color: 'bg-emerald-500', desc: '1-2x/Woche: Materialvergleiche, Pflege, Baugenehmigung', examples: [
        '❓ Aluminium oder Holz?\n\n1️⃣ Aluminium rostet nicht — Holz schon\n2️⃣ Kein Streichen, kein Ölen\n3️⃣ Leichtere Montage\n4️⃣ Über 200 RAL-Farben\n5️⃣ Lebensdauer: 30+ Jahre\n\n💡 Aluminium gewinnt in fast jeder Kategorie.\n#ExpertenTipp #Aluminium',
    ]},
    { name: 'Social Proof', icon: '⭐', color: 'bg-amber-500', desc: '2x/Woche: Google-Bewertungen, Kundenstimmen', examples: [
        '⭐⭐⭐⭐⭐\n\n„Von der Beratung bis zur Montage — alles war perfekt. Das Team war pünktlich, professionell und hat sauber gearbeitet. Unsere Terrasse ist jetzt unser Lieblingsplatz!"\n— Thomas R., Hannover\n\n🙏 Danke für Ihr Vertrauen!\n\n#Kundenstimme #Polendach24',
    ]},
    { name: 'Sezonowe', icon: '🌞', color: 'bg-orange-500', desc: '1x/Woche: Frühbucher, Sommer, Herbst-Aktion', examples: [
        '🌸 Der Frühling kommt — und Ihre Terrasse wartet!\n\nJetzt planen = im Sommer genießen ☀️\nVon Beratung bis Montage: ca. 4-6 Wochen.\n\n🎁 Frühbucher-Vorteil: Bis Ende April!\n📞 Kostenlose Beratung anfordern\n#Frühling2026 #Terrassenüberdachung',
    ]},
    { name: 'Hinter den Kulissen', icon: '🔧', color: 'bg-slate-500', desc: '1x/Woche: Montage, Team, Werkstatt', examples: [
        '🔧 Montage-Tag in Köln!\nUnser Team baut heute 6×4m Terrassenüberdachung mit integriertem Seitenteil.\n\nJeder Handgriff sitzt — 8 Jahre Erfahrung. 💪\nVon Ankunft bis fertig in nur 6 Stunden!\n#BehindTheScenes #Montage',
    ]},
    { name: 'Engagement', icon: '📊', color: 'bg-purple-500', desc: '1x/Woche: Umfragen, Quiz, Community', examples: [
        '🤔 Was wäre Ihr Traumprojekt?\n\n❤️ = Terrassenüberdachung\n👍 = Carport\n😮 = Bioklimatische Pergola\n😍 = Alle drei!\n\nKommentiert! 👇\n#Umfrage #TraumTerrasse',
    ]},
];

const SEASONAL_CALENDAR = [
    { month: 'Jan', theme: '❄️ Winterangebote', tip: 'Planungsgespräche für Frühling' },
    { month: 'Feb', theme: '🌱 Frühbucher-Kampagne', tip: '„In 4-6 Wochen montiert"' },
    { month: 'Mär', theme: '🌸 Frühlingsstart, Messen', tip: 'Höchste Lead-Generierung!' },
    { month: 'Apr', theme: '☀️ Outdoor-Saison', tip: 'Letzte Chance Sommer-Montage' },
    { month: 'Mai', theme: '🏡 Gartentipps + Referenzen', tip: 'Fertige Projekte showcasen' },
    { month: 'Jun', theme: '🌞 Sommergefühl', tip: 'Emotionale Bilder, Abendstimmung' },
    { month: 'Jul', theme: '🍦 Best-Of Projekte', tip: 'Carport für Urlaubsauto' },
    { month: 'Aug', theme: '🏖️ Letzte Sommeraktion', tip: 'Herbst-Planung starten' },
    { month: 'Sep', theme: '🍂 Herbst, Regenschutz', tip: '„Auch im Herbst draußen sitzen"' },
    { month: 'Okt', theme: '🎃 Winterfest machen', tip: 'Schutz vor Herbststürmen' },
    { month: 'Nov', theme: '🖤 Black Week Angebote', tip: 'Sonderkonditionen' },
    { month: 'Dez', theme: '🎄 Jahresrückblick', tip: 'Team-danke & beste Projekte' },
];

export function InspirationenTab() {
    const [selectedPillar, setSelectedPillar] = useState(0);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
                <h2 className="text-xl font-bold">💡 Inspiracje i gotowe treści</h2>
                <p className="text-amber-100 text-sm mt-1">Gotowe przykłady postów, kalendarz sezonowy, filary treści</p>
            </div>

            {/* Content Pillars */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-700">📌 Filary treści — Content Pillars</h3>
                <div className="flex flex-wrap gap-2">
                    {CONTENT_PILLARS.map((p, i) => (
                        <button key={i} onClick={() => setSelectedPillar(i)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedPillar === i ? 'bg-orange-600 text-white shadow' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
                            {p.icon} {p.name}
                        </button>
                    ))}
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${CONTENT_PILLARS[selectedPillar].color}`} />
                        <p className="font-bold text-slate-800 text-sm">{CONTENT_PILLARS[selectedPillar].name}</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{CONTENT_PILLARS[selectedPillar].desc}</p>
                    <div className="space-y-3">
                        {CONTENT_PILLARS[selectedPillar].examples.map((ex, i) => (
                            <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 relative group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">P</div>
                                    <div><p className="text-xs font-bold">Polendach24</p><p className="text-[10px] text-slate-400">Beispiel-Post</p></div>
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{ex}</p>
                                <button onClick={() => { navigator.clipboard.writeText(ex); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); }}
                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-800 text-white rounded text-[10px] transition-opacity">
                                    {copiedIdx === i ? '✅ Skopiowano' : '📋 Kopiuj'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Seasonal Calendar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">📅 Kalendarz sezonowy 2026</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {SEASONAL_CALENDAR.map((m, i) => {
                        const isCurrentMonth = new Date().getMonth() === i;
                        return (
                            <div key={i} className={`rounded-lg p-3 text-center ${isCurrentMonth ? 'bg-orange-100 border-2 border-orange-400 shadow' : 'bg-slate-50 border border-slate-200'}`}>
                                <p className={`text-xs font-bold ${isCurrentMonth ? 'text-orange-700' : 'text-slate-700'}`}>{m.month}</p>
                                <p className="text-[10px] text-slate-600 mt-1">{m.theme}</p>
                                <p className="text-[9px] text-slate-400 mt-1 italic">{m.tip}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hashtag Library */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">🏷️ Hashtag-Bibliothek</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { cat: '🏗️ Produkt', tags: '#Terrassenüberdachung #Carport #Pergola #Aluminium #Terrassendach #Überdachung #Glasdach #Sonnenschutz' },
                        { cat: '🏡 Lifestyle', tags: '#OutdoorLiving #Gartenliebe #Traumgarten #WohnenImFreien #Terrasse #GartenDesign #Draußen #Gemütlich' },
                        { cat: '📍 Regional', tags: '#NRW #Bayern #Niedersachsen #Hessen #BadenWürttemberg #Deutschland #Hausbau #Renovierung' },
                    ].map((h, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-slate-700 mb-1">{h.cat}</p>
                            <p className="text-xs text-blue-600">{h.tags}</p>
                            <button onClick={() => { navigator.clipboard.writeText(h.tags); toast.success('📋 Skopiowano!'); }}
                                className="text-[10px] text-slate-400 hover:text-slate-600 mt-1">📋 Kopiuj</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// EXPERT TOOLBOX TAB
// ═══════════════════════════════════════════

export function ExpertToolboxTab() {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-5 text-white">
                <h2 className="text-xl font-bold">🧰 Ekspert-Toolbox</h2>
                <p className="text-slate-300 text-sm mt-1">Targetowanie, formuły copy, CTA, best practices dla rynku DE</p>
            </div>

            {/* Targeting Presets */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">🎯 Presety targetowania — rynek niemiecki</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { name: '🏡 Eigenheimbesitzer', age: '35-65', int: 'Haus & Garten, Heimwerken, Immobilien', geo: 'Deutschland, 50km Radius', budget: '€15-25/Tag' },
                        { name: '🔨 Renovierer', age: '30-55', int: 'Renovierung, Hausbau, Architektur', geo: 'NRW, Bayern, BaWü', budget: '€10-20/Tag' },
                        { name: '💎 Premium', age: '40-65', int: 'Luxus, Premium Lifestyle, Gartendesign', geo: 'München, Hamburg, Düsseldorf +50km', budget: '€25-50/Tag' },
                        { name: '📱 Lookalike 1%', age: 'Auto', int: 'Basierend auf bestehenden Kunden', geo: 'Deutschland', budget: '€20-30/Tag' },
                    ].map((tp, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                            <h4 className="font-bold text-slate-800 text-sm mb-2">{tp.name}</h4>
                            <div className="space-y-1 text-xs text-slate-600">
                                <p>👤 <strong>Wiek:</strong> {tp.age}</p>
                                <p>❤️ <strong>Zainteresowania:</strong> {tp.int}</p>
                                <p>📍 <strong>Geo:</strong> {tp.geo}</p>
                                <p>💰 <strong>Budżet:</strong> {tp.budget}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ad Copy Formulas */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">✍️ Formuły copywriterskie</h3>
                <div className="space-y-3">
                    {[
                        { name: 'AIDA', desc: 'Attention → Interest → Desire → Action', ex: '🔥 80% der Deutschen nutzen ihre Terrasse zu wenig!\nMit Alu-Überdachung: das ganze Jahr nutzbar.\nStellen Sie sich gemütliche Abende vor, geschützt vor Regen.\n👉 Jetzt kostenlose Beratung anfordern!' },
                        { name: 'PAS', desc: 'Problem → Agitate → Solution', ex: 'Ihr Auto steht im Regen, Hagel und UV?\nJedes Jahr Schäden für hunderte Euro?\n✅ Aluminium-Carport von Polendach24 — in 2 Tagen montiert!' },
                        { name: 'BAB', desc: 'Before → After → Bridge', ex: 'VORHER: Leere, wetterabhängige Terrasse.\nNACHHER: Zweites Wohnzimmer bei jedem Wetter.\n🌉 Polendach24 macht den Unterschied!' },
                    ].map((f, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-xs">{f.name}</span>
                                <span className="text-xs text-slate-500">{f.desc}</span>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap bg-white p-3 rounded border">{f.ex}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Library */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">🔘 Biblioteka CTA</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                        { de: 'Jetzt kostenlose Beratung anfordern!', type: 'Lead' },
                        { de: 'Angebot in 24 Stunden erhalten', type: 'Lead' },
                        { de: 'Jetzt Termin vereinbaren', type: 'Lead' },
                        { de: 'Mehr erfahren →', type: 'Traffic' },
                        { de: 'Projekte ansehen', type: 'Traffic' },
                        { de: 'Nur noch X Plätze verfügbar!', type: 'FOMO' },
                        { de: 'Frühbucher-Aktion — nur bis zum...', type: 'FOMO' },
                        { de: 'Schreiben Sie uns eine Nachricht', type: 'Messenger' },
                    ].map((cta, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5 group hover:bg-blue-50 transition-colors">
                            <p className="text-sm font-medium text-slate-800">{cta.de}</p>
                            <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cta.type === 'Lead' ? 'bg-green-100 text-green-700' : cta.type === 'FOMO' ? 'bg-red-100 text-red-700' : cta.type === 'Messenger' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{cta.type}</span>
                                <button onClick={() => { navigator.clipboard.writeText(cta.de); toast.success('📋 Skopiowano!'); }}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 transition-opacity">📋</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Best Practices */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
                <h3 className="text-sm font-bold text-blue-800 mb-3">💎 Best Practices — Facebook Ads 2026</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {[
                        { icon: '📸', title: 'Zdjęcia', tip: 'Min 1080×1080px. Pokazuj EFEKT, nie produkt. Ludzie na zdjęciu = +25% engagement.' },
                        { icon: '🎬', title: 'Video', tip: 'Pierwsze 3 sek. decydują. Hook: „Stellen Sie sich vor..." Format: 4:5 portrait.' },
                        { icon: '📝', title: 'Tekst', tip: 'Max 3 linijki nad foldem. Emoji na początku punktu. Krótkie zdania.' },
                        { icon: '⏰', title: 'Timing', tip: 'Najlepsza pora: Wt-Czw 9-11 i 19-21. Weekend: So 10-12.' },
                        { icon: '💰', title: 'Budżet', tip: 'Start: €15/dzień. Testuj 3-5 kreacji. Wyłącz jeśli CTR < 1% po 3 dniach.' },
                        { icon: '🎯', title: 'Targeting', tip: 'Zacznij od Lookalike 1%. Zawęź: Eigenheim + 35-65 lat.' },
                    ].map((bp, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="font-bold text-blue-800">{bp.icon} {bp.title}</p>
                            <p className="text-blue-700 mt-1">{bp.tip}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
