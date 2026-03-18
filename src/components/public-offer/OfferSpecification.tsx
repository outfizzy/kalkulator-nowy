import React from 'react';
import type { ProductConfig } from '../../types';
import { getModelDisplayName, getModelImage } from '../../config/modelImages';

// ===== CLEAN SVG ICONS =====

const IconCheck = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconRuler = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M21 3H3v18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 3l-8 8M21 3v4M21 3h-4M3 21h4M3 21v-4" strokeLinecap="round" />
    </svg>
);

const IconPalette = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity={0.3} />
        <circle cx="8.5" cy="14" r="1.5" fill="currentColor" opacity={0.3} />
        <circle cx="15.5" cy="14" r="1.5" fill="currentColor" opacity={0.3} />
    </svg>
);

const IconRoof = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M3 21h18M4 21V10l8-6 8 6v11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconWall = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <rect x="2" y="4" width="20" height="16" rx="1" />
        <path d="M2 10h20M2 16h20M8 4v6M14 4v6M5 10v6M11 10v6M17 10v6M8 16v4M14 16v4" strokeWidth={1} opacity={0.5} />
    </svg>
);

const IconDoor = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <path d="M9 2v20" strokeLinecap="round" opacity={0.4} />
        <circle cx="7" cy="12" r="0.75" fill="currentColor" />
    </svg>
);

const IconWedge = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M4 20h16L12 4 4 20z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconAwning = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M3 7h18l-2 10H5L3 7z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 7c0 3-1 4-2 5M12 7c0 3-1 4-2 5M17 7c0 3-1 4-2 5" strokeWidth={1.2} />
        <path d="M3 7V4h18v3" strokeLinecap="round" />
    </svg>
);

const IconZip = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <path d="M4 6h16" strokeLinecap="round" />
        <path d="M8 10h8M8 14h8M8 18h8" strokeWidth={1} opacity={0.4} strokeLinecap="round" />
    </svg>
);

const IconLed = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
);

const IconWpc = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <rect x="2" y="6" width="20" height="3" rx="0.5" />
        <rect x="2" y="11" width="20" height="3" rx="0.5" />
        <rect x="2" y="16" width="20" height="3" rx="0.5" />
    </svg>
);

const IconHeater = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <rect x="6" y="10" width="12" height="10" rx="1" />
        <path d="M8 6c0-2 2-3 2-4M12 6c0-2 2-3 2-4M16 6c0-2 2-3 2-4" strokeLinecap="round" />
    </svg>
);

const IconStructure = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M4 21V8l8-5 8 5v13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 8h16M4 21h16" strokeLinecap="round" />
        <path d="M8 8v13M12 8v13M16 8v13" strokeWidth={1} opacity={0.4} />
    </svg>
);

const IconGlass = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 12h18M12 3v18" strokeLinecap="round" opacity={0.4} />
    </svg>
);

const IconCar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M5 17h14M5 17a2 2 0 01-2-2v-3l2-5h10l2 5v3a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconPergola = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M4 6h16M4 10h16M4 14h16" strokeLinecap="round" />
        <path d="M4 6v14M20 6v14" strokeLinecap="round" />
        <path d="M2 20h20" strokeLinecap="round" />
    </svg>
);

const IconPackage = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" />
    </svg>
);

const IconArrow = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconInfo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
);

// ===== MODEL-SPECIFIC TECHNICAL SPECS =====
const MODEL_TECH_SPECS: Record<string, string[]> = {
    'orangeline': [
        'Fixierte Dachneigung 8°',
        'Pfostenbreite: 110 mm',
        'Max. Spannweite: 5 000 × 4 000 mm (2 Pfosten)',
        'Dacheindeckung: 8 mm VSG oder 16 mm Polycarbonat',
        'LED-Spots und LED-Strips in Sparren möglich',
    ],
    'orangeline+': [
        'Verstärktes 60 mm Profil',
        'Pfostenbreite: 110 mm',
        'Fixierte Dachneigung 8°',
        'Dacheindeckung: 8 mm VSG oder 16 mm Polycarbonat',
        'LED-Beleuchtung möglich',
    ],
    'trendline': [
        'Untenliegende Statik',
        'Variable Dachneigung 5–15°',
        'Pfostenbreite: 110 mm | Sparrenhöhe: 47,5 mm',
        'Max. Spannweite: 6 000 × 3 000 mm (2 Pfosten)',
        'Dacheindeckung: 8/10 mm VSG oder 16 mm Polycarbonat',
        'Stil-Varianten: flach, rund, klassisch',
        'LED-Spots und LED-Strips möglich',
        'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
    ],
    'trendline+': [
        'Verstärktes 70 mm Profil für größere Spannweiten',
        'Pfostenbreite: 110 mm | Sparrenhöhe: 57,5 mm',
        'Erhöhte Schneelast-Tragfähigkeit',
        'Dacheindeckung: 8/10 mm VSG oder 16 mm Polycarbonat',
        'Wandanbau und freistehende Montage möglich',
    ],
    'topline': [
        'Untenliegende Statik',
        'Variable Dachneigung 5–15°',
        'Pfostenbreite: 149 mm | Sparrenhöhe: 93,2 mm',
        'Max. Spannweite: 6 000 × 4 500 mm (2 Pfosten)',
        'Dacheindeckung: 8/10 mm VSG oder 16 mm Polycarbonat',
        'LED-Spots und LED-Strips möglich',
        'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
    ],
    'topline xl': [
        'Pfostenbreite: 196 mm | Sparrenhöhe: 117 mm',
        'Max. Spannweite: 7 000 × 4 000 mm (2 Pfosten)',
        'Extra starke Pfosten und Rinne',
        'Höchste Schnee- und Windlasten',
        'Dacheindeckung: 8/10 mm VSG oder 16 mm Polycarbonat',
        'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
    ],
    'designline': [
        'Obenliegende Statik',
        'Variable Dachneigung 5–12°',
        'Pfostenbreite: 196 mm',
        'Max. Spannweite: 6 000 × 4 000 mm (2 Pfosten)',
        'Nur VSG Glaseindeckung (8/10 mm)',
        'Schiebedachfunktion möglich',
        'Höchste Wind- und Schneelasten',
        'Farben: DB 703, RAL 9010, RAL 9005',
    ],
    'ultraline': [
        'Horizontale Flachdach-Optik',
        'Pfostenbreite: 196 mm',
        'Max. Spannweite: 7 000 × 5 000 mm (2 Pfosten)',
        'Nur VSG Glaseindeckung (8/10 mm)',
        'LED-Spots und LED-Strips in Pfosten, Rinne und Sparren',
        'Minimalistisches Design',
        'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
    ],
    'skyline': [
        'Horizontales Dach – schlanker Baustil',
        'Pfostenbreite: 160 mm | Glashöhe: 95 mm',
        'Max. Spannweite: 7 000 × 5 000 mm (4 Pfosten)',
        'Nur VSG Glaseindeckung (8–10 mm)',
        'LED-Spots und LED-Strips möglich',
        'Kubistisches Design – ideal für Gartenzimmer',
        'Farbe: RAL 7016',
    ],
    'carport': [
        'Horizontale Flachdach-Optik',
        'Pfostenbreite: 160 mm | Dachhöhe: 28 mm',
        'Max. Spannweite: 7 000 × 5 000 mm (4 Pfosten)',
        'Dacheindeckung: Trapezblech aus Stahl',
        'Einzel- oder Doppelcarport möglich',
        'Solar-ready – geeignet für PV-Anlage',
        'Farbe: RAL 7016',
    ],
    'pergola': [
        'Bioklimatische Pergola mit drehbaren Lamellen',
        'Freistehende Konstruktion',
        'LED-Integration möglich',
        'Maximale Spannweite: 6 000 × 5 000 mm',
    ],
    'pergola_bio': [
        'Bioklimatische Pergola mit drehbaren Lamellen',
        'Freistehende Konstruktion',
        'LED-Integration möglich',
        'Maximale Spannweite: 6 000 × 5 000 mm',
    ],
    'pergola deluxe': [
        'Premium-Pergola mit Komplett-Ausstattung',
        'LED-Beleuchtung und Heizstrahler möglich',
        'Komplett-Verglasung optional',
        'Maximale Spannweite: 7 000 × 5 000 mm',
    ],
    'pergola_deluxe': [
        'Premium-Pergola mit Komplett-Ausstattung',
        'LED-Beleuchtung und Heizstrahler möglich',
        'Komplett-Verglasung optional',
        'Maximale Spannweite: 7 000 × 5 000 mm',
    ],
};

function getModelTechSpecs(modelId: string): string[] {
    if (!modelId) return [];
    const lower = modelId.toLowerCase().trim();
    if (MODEL_TECH_SPECS[lower]) return MODEL_TECH_SPECS[lower];
    const key = Object.keys(MODEL_TECH_SPECS).find(k => lower.includes(k) || k.includes(lower));
    return key ? MODEL_TECH_SPECS[key] : [];
}

// ===== TRANSLATIONS (Expanded) =====
const GERMAN_LABELS: Record<string, { label: string; description?: string; iconKey: string; category: string }> = {
    // === Base / Construction ===
    'trendstyle': { label: 'Trendstyle Terrassenüberdachung', description: 'Hochwertiges Aluminiumprofilsystem mit integrierter Regenrinne', iconKey: 'structure', category: 'base' },
    'trendstyle+': { label: 'Trendstyle+ Terrassenüberdachung', description: 'Premium-Aluminiumsystem mit verstärkten Profilen', iconKey: 'structure', category: 'base' },
    'trendline': { label: 'Trendstyle Terrassenüberdachung', description: 'Hochwertiges Aluminiumprofilsystem', iconKey: 'structure', category: 'base' },
    'trendline+': { label: 'Trendstyle+ Terrassenüberdachung', description: 'Verstärktes Profilsystem', iconKey: 'structure', category: 'base' },
    'topstyle': { label: 'Topstyle Terrassenüberdachung', description: 'Kräftige Konstruktion für alle Wetterbedingungen', iconKey: 'structure', category: 'base' },
    'topstyle xl': { label: 'Topstyle XL Terrassenüberdachung', description: 'Für Spannweiten bis 7 m', iconKey: 'structure', category: 'base' },
    'topline': { label: 'Topstyle Terrassenüberdachung', description: 'Kräftige Konstruktion', iconKey: 'structure', category: 'base' },
    'topline xl': { label: 'Topstyle XL Terrassenüberdachung', description: 'Für Spannweiten bis 7 m', iconKey: 'structure', category: 'base' },
    'skystyle': { label: 'Skystyle Terrassenüberdachung', description: 'Modernes Flachdach mit verdeckter Entwässerung', iconKey: 'structure', category: 'base' },
    'skyline': { label: 'Skystyle Terrassenüberdachung', description: 'Schlankes horizontales Design', iconKey: 'structure', category: 'base' },
    'ultrastyle': { label: 'Ultrastyle Terrassenüberdachung', description: 'Extra-stabile Profile für höchste Belastbarkeit', iconKey: 'structure', category: 'base' },
    'ultraline': { label: 'Ultrastyle Terrassenüberdachung', description: 'Minimalistisches Flachdach-Design', iconKey: 'structure', category: 'base' },
    'orangestyle': { label: 'Orangestyle Terrassenüberdachung', description: 'Bewährte Technik, zeitloses Design', iconKey: 'structure', category: 'base' },
    'orangestyle+': { label: 'Orangestyle+ Terrassenüberdachung', description: 'Verstärktes Profil mit 60 mm', iconKey: 'structure', category: 'base' },
    'orangeline': { label: 'Orangestyle Terrassenüberdachung', description: 'Preislich attraktive Überdachung', iconKey: 'structure', category: 'base' },
    'orangeline+': { label: 'Orangestyle+ Terrassenüberdachung', description: 'Verstärktes Einstiegsmodell', iconKey: 'structure', category: 'base' },
    'designline': { label: 'Designline Terrassenüberdachung', description: 'Exklusive Profilformen, Premium-Finish', iconKey: 'structure', category: 'base' },
    'designstyle': { label: 'Designline Terrassenüberdachung', description: 'Obenliegende Statik mit Schiebedach', iconKey: 'structure', category: 'base' },
    'carport': { label: 'Aluminium-Carport', description: 'Hohe Tragfähigkeit für Fahrzeugschutz', iconKey: 'car', category: 'base' },
    'pergola': { label: 'Bioklimatische Pergola', description: 'Drehbare Lamellen für Sonnen- und Wetterkontrolle', iconKey: 'pergola', category: 'base' },
    'pergola_bio': { label: 'Bioklimatische Pergola', description: 'Drehbare Lamellen für Sonnen- und Wetterkontrolle', iconKey: 'pergola', category: 'base' },
    'pergola bio': { label: 'Bioklimatische Pergola', description: 'Drehbare Lamellen', iconKey: 'pergola', category: 'base' },
    'pergola deluxe': { label: 'Pergola Deluxe', description: 'Motorisierte Lamellen mit integrierter Beleuchtung', iconKey: 'pergola', category: 'base' },
    'pergola_deluxe': { label: 'Pergola Deluxe', description: 'Motorisierte Lamellen mit integrierter Beleuchtung', iconKey: 'pergola', category: 'base' },
    'freistehend': { label: 'Freistehende Montage', description: 'Mit vier Stützpfosten', iconKey: 'structure', category: 'base' },
    'freestanding': { label: 'Freistehende Montage', description: 'Mit vier Stützpfosten', iconKey: 'structure', category: 'base' },
    'wandmontage': { label: 'Wandmontage', description: 'Befestigung an der Hauswand', iconKey: 'structure', category: 'base' },
    'wall mount': { label: 'Wandmontage', description: 'Befestigung an der Hauswand', iconKey: 'structure', category: 'base' },

    // === Roof ===
    'polycarbonate': { label: 'Polycarbonat-Eindeckung', description: '16 mm Stegplatten mit UV-Schutz', iconKey: 'glass', category: 'roof' },
    'polycarbonat': { label: 'Polycarbonat-Eindeckung', description: '16 mm Stegplatten mit UV-Schutz', iconKey: 'glass', category: 'roof' },
    'glass': { label: 'Verbundsicherheitsglas (VSG)', description: '8 mm VSG mit Splitterschutz', iconKey: 'glass', category: 'roof' },
    'vsg': { label: 'Verbundsicherheitsglas (VSG)', description: '8 mm VSG mit Splitterschutz', iconKey: 'glass', category: 'roof' },
    'matt': { label: 'Mattglas-Eindeckung', description: 'Satiniert für Lichtstreuung und Sichtschutz', iconKey: 'glass', category: 'roof' },
    'stopsol': { label: 'UV Reflex Sonnenschutzglas', description: 'Reduziert Sonneneinstrahlung um bis zu 65 %', iconKey: 'glass', category: 'roof' },
    'sunscreen': { label: 'Sonnenschutzglas', description: 'UV-reflektierend für weniger Hitze', iconKey: 'glass', category: 'roof' },
    'ir-gold': { label: 'IR Gold Hitzeschutzglas', description: 'Maximaler Hitzeschutz bei voller Transparenz', iconKey: 'glass', category: 'roof' },
    'heat-protection': { label: 'Hitzeschutzglas', description: 'Reduziert Wärmeeinstrahlung', iconKey: 'glass', category: 'roof' },
    'opal': { label: 'Opal Polycarbonat', description: 'Gleichmäßige Lichtverteilung', iconKey: 'glass', category: 'roof' },
    'klar': { label: 'Klar Polycarbonat', description: 'Maximale Lichtdurchlässigkeit', iconKey: 'glass', category: 'roof' },
    'clear': { label: 'Klarglas', description: 'Maximale Transparenz', iconKey: 'glass', category: 'roof' },
    'iq-relax': { label: 'IQ Relax Polycarbonat', description: 'Wärmereflektierend', iconKey: 'glass', category: 'roof' },
    'trapezblech': { label: 'Trapezblech-Dach', description: 'Stahl-Dacheindeckung', iconKey: 'roof', category: 'roof' },
    'lamellen': { label: 'Lamellendach', description: 'Drehbare Aluminium-Lamellen', iconKey: 'pergola', category: 'roof' },

    // === Walls ===
    'seitenwand': { label: 'Seitenwand', description: 'VSG oder Polycarbonat als Wetterschutz', iconKey: 'wall', category: 'walls' },
    'side wall': { label: 'Seitenwand', description: 'VSG oder Polycarbonat als Wetterschutz', iconKey: 'wall', category: 'walls' },
    'sidewall': { label: 'Seitenwand', description: 'Seitliche Verglasung', iconKey: 'wall', category: 'walls' },
    'frontwand': { label: 'Frontwand', description: 'Festverglasung in Konstruktionsfarbe', iconKey: 'wall', category: 'walls' },
    'front wall': { label: 'Frontwand', description: 'Festverglasung in Konstruktionsfarbe', iconKey: 'wall', category: 'walls' },
    'frontwall': { label: 'Frontwand', description: 'Frontale Verglasung', iconKey: 'wall', category: 'walls' },
    'festwand': { label: 'Festwand', description: 'Feste Glaswand ohne Öffnungsfunktion', iconKey: 'wall', category: 'walls' },
    'fixed wall': { label: 'Festwand', description: 'Permanenter Wetterschutz', iconKey: 'wall', category: 'walls' },
    'sliding door': { label: 'Glasschiebetür', description: 'Softclose mit bodengeführter Laufschiene', iconKey: 'door', category: 'walls' },
    'schiebetür': { label: 'Glasschiebetür', description: 'Softclose mit bodengeführter Laufschiene', iconKey: 'door', category: 'walls' },
    'schiebetuer': { label: 'Glasschiebetür', description: 'Softclose mit bodengeführter Laufschiene', iconKey: 'door', category: 'walls' },
    'schiebewand': { label: 'Glasschiebewand', description: 'Großflächige Glaselemente zum Öffnen', iconKey: 'door', category: 'walls' },
    'panoramaschiebewand': { label: 'Panorama-Schiebewand', description: 'Rahmenlose Ganzglas-Elemente', iconKey: 'door', category: 'walls' },
    'panorama': { label: 'Panorama-Schiebewand', description: 'Rahmenlose Verglasung', iconKey: 'door', category: 'walls' },
    'sonnenschutzpaneele': { label: 'Sonnenschutzpaneele', description: 'Schiebbare Alu-Paneele mit 45°-Lamellen', iconKey: 'wall', category: 'walls' },
    'sichtschutz': { label: 'Sichtschutz-System', description: 'Horizontale Alu-Planken', iconKey: 'wall', category: 'walls' },
    'keilfenster': { label: 'Keilfenster', description: 'Dreieckige Festverglasung für die Giebelseite', iconKey: 'wedge', category: 'walls' },
    'wedge': { label: 'Keilfenster', description: 'Dreieckige Festverglasung', iconKey: 'wedge', category: 'walls' },
    'wedge window': { label: 'Keilfenster', description: 'Dreieckige Festverglasung', iconKey: 'wedge', category: 'walls' },

    // === Comfort ===
    'markise': { label: 'Aufdachmarkise mit Somfy-Motor', description: 'Sonnenschutz mit elektrischem Antrieb', iconKey: 'awning', category: 'comfort' },
    'awning': { label: 'Aufdachmarkise mit Somfy-Motor', description: 'Sonnenschutz mit elektrischem Antrieb', iconKey: 'awning', category: 'comfort' },
    'unterdachmarkise': { label: 'Unterdachmarkise mit Somfy-Motor', description: 'Unter der Überdachung montiert', iconKey: 'awning', category: 'comfort' },
    'aufdachmarkise': { label: 'Aufdachmarkise mit Somfy-Motor', description: 'Auf dem Dach montierter Sonnenschutz', iconKey: 'awning', category: 'comfort' },
    'zip screen': { label: 'ZIP-Senkrechtmarkise mit Somfy-Motor', description: 'Windstabile Vertikalmarkise (Textilscreen)', iconKey: 'zip', category: 'comfort' },
    'zip-screen': { label: 'ZIP-Senkrechtmarkise mit Somfy-Motor', description: 'Windstabile Vertikalmarkise (Textilscreen)', iconKey: 'zip', category: 'comfort' },
    'zip': { label: 'ZIP-Senkrechtmarkise mit Somfy-Motor', description: 'Seitliche Beschattung mit Reißverschlussführung', iconKey: 'zip', category: 'comfort' },
    'senkrechtmarkise': { label: 'ZIP-Senkrechtmarkise mit Somfy-Motor', description: 'Vertikaler Sonnenschutz (Textilscreen)', iconKey: 'zip', category: 'comfort' },
    'led': { label: 'LED-Beleuchtung', description: 'Dimmbar für stimmungsvolle Abende', iconKey: 'led', category: 'comfort' },
    'led spot': { label: 'LED Spotbeleuchtung', description: 'Warmweiß 3 000 K', iconKey: 'led', category: 'comfort' },
    'led-spot': { label: 'LED Spotbeleuchtung', description: 'Warmweiß 3 000 K', iconKey: 'led', category: 'comfort' },
    'led strip': { label: 'LED Lichtleiste', description: 'Indirekte Beleuchtung im Rinnenprofil', iconKey: 'led', category: 'comfort' },
    'led-strip': { label: 'LED Lichtleiste', description: 'Indirekte Beleuchtung im Rinnenprofil', iconKey: 'led', category: 'comfort' },
    'led spots': { label: 'LED Spotbeleuchtung', description: 'Warmweiß 3 000 K', iconKey: 'led', category: 'comfort' },
    'led strips': { label: 'LED Lichtleisten', description: 'Indirekte Beleuchtung', iconKey: 'led', category: 'comfort' },
    'wpc': { label: 'WPC Terrassendiele', description: 'Pflegeleicht und witterungsbeständig', iconKey: 'wpc', category: 'comfort' },
    'wpc terrassendiele': { label: 'WPC Terrassendiele', description: 'Holz-Kunststoff-Verbundwerkstoff', iconKey: 'wpc', category: 'comfort' },
    'heizstrahler': { label: 'Infrarot-Heizstrahler', description: 'Wärme an kühlen Abenden', iconKey: 'heater', category: 'comfort' },
    'heater': { label: 'Infrarot-Heizstrahler', description: 'Für angenehme Wärme', iconKey: 'heater', category: 'comfort' },
    'infrared heater': { label: 'Infrarot-Heizstrahler', description: 'Wärme an kühlen Abenden', iconKey: 'heater', category: 'comfort' },
    'bodenbelag': { label: 'Bodenbelag', description: 'Terrassen-Bodenbelag', iconKey: 'wpc', category: 'comfort' },
    'flooring': { label: 'Bodenbelag', description: 'Terrassen-Bodenbelag', iconKey: 'wpc', category: 'comfort' },
    'rinne': { label: 'Regenrinne', description: 'Integrierte Wasserabführung', iconKey: 'structure', category: 'base' },
    'gutter': { label: 'Regenrinne', description: 'Integrierte Wasserabführung', iconKey: 'structure', category: 'base' },
};

const ICON_MAP: Record<string, React.FC> = {
    structure: IconStructure, glass: IconGlass, wall: IconWall, door: IconDoor,
    wedge: IconWedge, awning: IconAwning, zip: IconZip, led: IconLed,
    wpc: IconWpc, heater: IconHeater, car: IconCar, pergola: IconPergola,
    package: IconPackage, roof: IconRoof, info: IconInfo,
};

const CATEGORIES: Record<string, { title: string; iconKey: string; order: number }> = {
    base: { title: 'Basiskonstruktion', iconKey: 'structure', order: 1 },
    roof: { title: 'Dacheindeckung', iconKey: 'roof', order: 2 },
    walls: { title: 'Seitliche Elemente', iconKey: 'wall', order: 3 },
    comfort: { title: 'Komfort & Ausstattung', iconKey: 'led', order: 4 },
    other: { title: 'Weitere Positionen', iconKey: 'package', order: 5 },
};

function getGermanInfo(itemName: string): { label: string; description: string; iconKey: string; category: string } {
    const lowerName = itemName.toLowerCase().trim();
    // Direct match
    if (GERMAN_LABELS[lowerName]) {
        const m = GERMAN_LABELS[lowerName];
        return { label: m.label, description: m.description || '', iconKey: m.iconKey, category: m.category };
    }
    // Partial match
    for (const [key, value] of Object.entries(GERMAN_LABELS)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            return { label: value.label, description: value.description || '', iconKey: value.iconKey, category: value.category };
        }
    }
    return { label: itemName, description: '', iconKey: 'package', category: 'other' };
}

// Helper: check if item name matches model/roof/color (to filter duplicates)
function isRedundantItem(itemName: string, modelId: string, roofType: string, color: string): boolean {
    const lower = itemName.toLowerCase().trim();
    // Skip items that are just the model name
    const modelLower = (modelId || '').toLowerCase();
    if (modelLower && (lower.includes(modelLower) || modelLower.includes(lower))) return true;
    // Skip display-name matches (e.g. "Trendstyle" vs internal "Trendline")
    const displayNames = ['orangestyle', 'trendstyle', 'topstyle', 'ultrastyle', 'skystyle', 'designstyle', 'designline'];
    for (const dn of displayNames) {
        if (lower.includes(dn) && (modelLower.includes(dn) || modelLower.includes(dn.replace('style', 'line')))) return true;
    }
    // Skip items that just restate the roof type
    if (roofType === 'glass' && (lower === 'glass' || lower === 'vsg' || lower === 'verbundsicherheitsglas')) return true;
    if (roofType !== 'glass' && (lower === 'polycarbonate' || lower === 'polycarbonat')) return true;
    // Skip items that are just the color
    if (color && lower === color.toLowerCase()) return true;
    return false;
}

const LOCATION_LABELS: Record<string, string> = { 'links': 'Links', 'rechts': 'Rechts', 'front': 'Frontseite' };

function parseItemConfig(config?: string): { location?: string; dimensions?: string; rawConfig?: string } {
    if (!config) return {};
    const configLower = config.toLowerCase().trim();
    let location: string | undefined;
    // Check prefix format: "Links: ...", "Rechts: ...", "Front: ..."
    // Must use prefix matching to avoid 'Front Wall' matching 'front' placement
    for (const [key, label] of Object.entries(LOCATION_LABELS)) {
        if (configLower.startsWith(key + ':') || configLower.startsWith(key + ' ')) {
            location = label;
            break;
        }
    }
    const dimMatch = config.match(/(\d{3,5})\s*[xX×]\s*(\d{3,5})/);
    let dimensions: string | undefined;
    if (dimMatch) dimensions = `${parseInt(dimMatch[1])} × ${parseInt(dimMatch[2])} mm`;
    return { location, dimensions, rawConfig: config };
}

// ═══════ SECTION HEADER — clean, minimal ═══════
const SectionHeader = ({ title, iconKey }: { title: string; iconKey: string }) => {
    const Icon = ICON_MAP[iconKey] || IconPackage;
    return (
        <div className="flex items-center gap-2.5 pt-7 pb-3 first:pt-0">
            <span className="text-slate-400"><Icon /></span>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
            <div className="flex-1 h-px bg-slate-100" />
        </div>
    );
};

// ═══════ SPEC ROW — clean table row ═══════
const SpecRow = ({ label, value }: { label: string; value: string | number | undefined }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className="text-slate-800 font-semibold text-sm text-right">{value}</span>
        </div>
    );
};

// ═══════ ITEM ROW — dash-based list ═══════
const ItemRow = ({ item }: { item: { name: string; config?: string; price?: number } }) => {
    const info = getGermanInfo(item.name);
    const parsed = parseItemConfig(item.config);

    let displayLabel = info.label;
    if (parsed.location) {
        const isWallType = info.category === 'walls' || item.name.toLowerCase().includes('wall') || item.name.toLowerCase().includes('wand') || item.name.toLowerCase().includes('schiebe');
        if (isWallType) displayLabel = `${info.label} — ${parsed.location}`;
    }

    return (
        <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
            <div className="flex items-start gap-2 min-w-0">
                <span className="text-slate-400 font-medium shrink-0 mt-px">—</span>
                <div className="min-w-0">
                    <span className="font-semibold text-slate-700 text-sm">{displayLabel}</span>
                    {parsed.dimensions && (
                        <span className="text-xs text-slate-400 ml-2">{parsed.dimensions}</span>
                    )}
                    {!parsed.dimensions && item.config && (
                        <span className="text-xs text-slate-400 ml-2">{item.config}</span>
                    )}
                    {info.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
                    )}
                </div>
            </div>
            <span className="flex items-center gap-1 text-emerald-600 shrink-0 ml-3">
                <IconCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Inkl.</span>
            </span>
        </div>
    );
};

// ═══════ MAIN COMPONENT ═══════
interface OfferSpecificationProps {
    product: ProductConfig;
    pricing?: any;
}

export const OfferSpecification: React.FC<OfferSpecificationProps> = ({ product, pricing }) => {
    // === MANUAL OFFER ===
    if (product.isManual) {
        const hasCustomItems = product.customItems && product.customItems.length > 0;
        const hasDescription = product.manualDescription && product.manualDescription.trim().length > 0;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-5 md:px-8 md:py-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800">Technische Spezifikation</h2>
                            <p className="text-slate-400 text-sm mt-0.5">Ihre maßgeschneiderte Konfiguration</p>
                        </div>
                        <span className="px-2.5 py-1 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Individuell
                        </span>
                    </div>
                </div>

                <div className="px-6 py-5 md:px-8 md:py-6">
                    {product.width > 0 && product.projection > 0 && (
                        <>
                            <SectionHeader title="Abmessungen" iconKey="structure" />
                            <SpecRow label="Breite" value={`${product.width} mm`} />
                            <SpecRow label="Tiefe (Ausladung)" value={`${product.projection} mm`} />
                        </>
                    )}

                    {hasDescription && (
                        <>
                            <SectionHeader title="Beschreibung" iconKey="package" />
                            <div className="whitespace-pre-wrap text-slate-600 text-sm leading-relaxed py-2">
                                {product.manualDescription}
                            </div>
                        </>
                    )}

                    {hasCustomItems && (
                        <>
                            <SectionHeader title="Leistungsumfang" iconKey="package" />
                            {product.customItems!.map((item, idx) => (
                                <div key={`m-${idx}`} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center rounded bg-slate-50 text-[11px] font-bold text-slate-400 shrink-0">{idx + 1}</span>
                                        <div>
                                            <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                                            {item.description && item.description !== 'Manuelle Angebotsposition' && item.description !== 'Manuelle Position' && (
                                                <div className="text-xs text-slate-400">{item.description}</div>
                                            )}
                                            {item.quantity > 1 && (
                                                <div className="text-xs text-blue-600 font-semibold">Menge: {item.quantity} Stk.</div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="flex items-center gap-1 text-emerald-600 shrink-0">
                                        <IconCheck className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase">Inkl.</span>
                                    </span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // === CALCULATOR OFFER ===
    const v2Items: Array<{ name: string; config?: string; price?: number }> = (product as any).items || [];
    const filteredItems = v2Items.filter(item => !isRedundantItem(item.name, product.modelId, product.roofType, product.color));

    const displayName = getModelDisplayName(product.modelId);
    const modelImage = getModelImage(product.modelId);

    // Build all positions as a flat numbered list
    const allPositions: Array<{ label: string; description: string; config?: string; qty?: number }> = [];

    // 1. Base construction — includes roof covering info
    const coverInfo = product.roofType === 'glass'
        ? `inkl. ${product.glassType ? getGermanInfo(product.glassType).label : 'VSG Sicherheitsglas 8 mm'}`
        : `inkl. ${(product as any).variant ? getGermanInfo((product as any).variant).label : 'Polycarbonat Stegplatten 16 mm'}`;
    allPositions.push({
        label: `${displayName} Terrassenüberdachung`,
        description: `${product.width} × ${product.projection} mm — ${(product as any).construction === 'freestanding' ? 'Freistehend' : 'Wandmontage'} — ${product.customColor ? `RAL ${product.customColorRAL || 'Sonderfarbe'}` : (product.color || 'RAL 7016')}\n${coverInfo} · Pulverbeschichtung · Integrierte Entwässerung`,
    });

    // 3. V2 Items from calculator
    for (const item of filteredItems) {
        const info = getGermanInfo(item.name);
        const parsed = parseItemConfig(item.config);
        let label = info.label;
        if (parsed.location) {
            const isWallType = info.category === 'walls' || item.name.toLowerCase().includes('wall') || item.name.toLowerCase().includes('wand') || item.name.toLowerCase().includes('schiebe');
            if (isWallType) label = `${info.label} — ${parsed.location}`;
        }
        allPositions.push({
            label,
            description: info.description,
            config: parsed.dimensions || (!parsed.dimensions ? item.config : undefined),
        });
    }

    // 4. Legacy addons
    if (product.addons?.length > 0) {
        for (const addon of product.addons) {
            const info = getGermanInfo(addon.name);
            allPositions.push({ label: info.label, description: info.description, config: addon.variant });
        }
    }

    // 5. Selected accessories
    if (product.selectedAccessories?.length) {
        for (const acc of product.selectedAccessories) {
            const info = getGermanInfo(acc.name);
            allPositions.push({ label: info.label, description: info.description, qty: acc.quantity });
        }
    }

    // 6. Custom items
    if (product.customItems?.length) {
        for (const item of product.customItems) {
            allPositions.push({ label: item.name, description: item.description || '', qty: item.quantity });
        }
    }

    // 7. Installation & Delivery as a position
    if (pricing?.installationCosts?.totalInstallation > 0) {
        const instDays = pricing.installationCosts.installationDays;
        allPositions.push({
            label: 'Fachgerechte Montage & Lieferung',
            description: 'Durch zertifiziertes Montageteam inkl. Kleinmaterial',
        });
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* ═══ HEADER — no image (shown in OfferHero above) ═══ */}
            <div className="bg-slate-800 px-6 py-5 md:px-8 md:py-6">
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{displayName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold text-white/90">
                        {product.width} × {product.projection} mm
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold text-white/90">
                        {product.customColor ? `RAL ${product.customColorRAL || 'Sonderfarbe'}` : (product.color || 'RAL 7016')}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold text-white/90">
                        {(product as any).construction === 'freestanding' ? 'Freistehend' : 'Wandmontage'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold text-white/90">
                        {product.roofType === 'glass' ? 'VSG Glas' : 'Polycarbonat'}
                    </span>
                </div>
            </div>

            {/* ═══ POSITIONS LIST ═══ */}
            <div className="px-6 py-5 md:px-8 md:py-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leistungsumfang</h3>
                    <span className="text-[11px] text-slate-400">Alle Positionen im Angebotspreis enthalten</span>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Nr.</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Position</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase text-right">Status</span>
                    </div>

                    {/* Rows */}
                    {allPositions.map((pos, idx) => (
                        <div
                            key={idx}
                            className={`grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ${idx === 0 ? 'bg-blue-50/40' : ''}`}
                        >
                            <span className="text-xs font-bold text-slate-400 pt-0.5">{idx + 1}.</span>
                            <div className="min-w-0">
                                <p className={`text-sm font-semibold ${idx === 0 ? 'text-blue-800' : 'text-slate-700'}`}>{pos.label}</p>
                                {pos.description && (
                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{pos.description}</p>
                                )}
                                {pos.config && (
                                    <p className="text-xs text-slate-400 mt-0.5">{pos.config}</p>
                                )}
                                {pos.qty && pos.qty > 1 && (
                                    <p className="text-xs text-blue-500 font-semibold mt-0.5">Menge: {pos.qty} Stk.</p>
                                )}
                            </div>
                            <div className="text-right pt-0.5 shrink-0">
                                <span className="flex items-center gap-1 text-emerald-600">
                                    <IconCheck className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase">Inkl.</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
