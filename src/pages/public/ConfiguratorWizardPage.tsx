import React, { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ConfiguratorService } from '../../services/database/configurator.service';
import { supabase } from '../../lib/supabase';
import { StructuralZonesService } from '../../services/structural-zones.service';
import { StructuralZoneBadge } from '../../components/common/StructuralZoneBadge';
import { GeocodingService } from '../../services/geocoding.service';
import type { ProductConfig, InstallationType, RoofType } from '../../types';

const Visualizer3D = React.lazy(() => import('../../components/visualizer/Visualizer3D').then(m => ({ default: m.Visualizer3D })));

// ========== TYPES ==========
interface CustomerData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    companyName: string;
    snowZone?: string;
    snowLoad?: string;
    snowZonePostalCode?: string;
    windZone?: string;
    windSpeedKmh?: number;
    snowLoadKn?: number;
    structuralRecommendation?: string;
}

interface WizardState {
    customerData: CustomerData;
    model: string;
    modelDisplayName: string;
    selectedModels: string[]; // multi-model selection
    standaloneMode: boolean; // standalone markise/wall only
    standaloneProducts: string[]; // e.g. ['zip', 'markise-aufdach', 'seitenwand']
    standaloneWidth: number;
    standaloneHeight: number;
    width: number;
    projection: number;
    mountingType: 'fundament' | 'pflaster' | 'erde' | '';
    installType: 'wand' | 'frei' | '';
    roofCovering: 'glass' | 'poly' | '';
    roofVariant: string;
    color: string;
    glazingSides: { left: string; right: string; front: string };
    senkrechtmarkise: { sides: string[] };
    markise: { sides: string[]; type: 'aufdach' | 'unterdach' };
    heater: boolean;
    led: boolean;
    flooring: string;
    notes: string;
    photos: File[];
}

// ========== ALL MODELS ==========
const WIZARD_MODELS: { id: string; name: string; description: string; features: string[]; image: string; badge: string; badgeColor: string; hasPoly: boolean; hasGlass: boolean; glassThickness?: '8' | '8-10'; roofNote?: string; techSpecs?: string[]; maxWidth: number; maxDepth: number }[] = [
    {
        id: 'Orangeline', name: 'Orangestyle',
        description: 'Preislich attraktive Überdachung in Basisausstattung. Starke Pfosten und Sparren der Trendline.',
        features: ['Fixierte Neigung 8°', 'Max. 5000×4000mm', '8mm VSG oder 16mm Poly', 'LED-Spots / LED-Strips'],
        image: '/images/models/orangeline.jpg', badge: 'Preis-Tipp', badgeColor: '#f97316',
        hasPoly: true, hasGlass: true, glassThickness: '8', maxWidth: 5000, maxDepth: 4000,
        techSpecs: [
            'Preislich attraktive Überdachung in Basisausstattung',
            'Fixierte Neigung 8°',
            'Pfostenbreite: 110 mm',
            'Standardgrößen, Zuschnitte auf Maß gegen Aufpreis möglich',
            'Maximale Spannweite auf zwei Pfosten mit Glaseindeckung: 5000 × 4000 mm*',
            'Drei Standard-Farben: RAL 7016 (Anthrazit), RAL 9010 (Reinweiß)',
            'Dacheindeckung: 8 mm VSG oder 16 mm Polycarbonat',
            'Milch- und Hitzeschutzvarianten gegen Aufpreis erhältlich',
            'LED-Spots in Sparren möglich / LED-Strips in Sparren möglich',
            'Schnelle und einfache Montage',
        ],
    },
    {
        id: 'Orangeline+', name: 'Orangestyle+',
        description: 'Verbessertes Einstiegsmodell mit stärkerem 60mm Profil für mehr Tragfähigkeit.',
        features: ['60mm Profil', '8mm VSG oder 16mm Poly', 'Wandanbau', 'LED möglich'],
        image: '/images/models/orangeline-plus.jpg', badge: '', badgeColor: '',
        hasPoly: true, hasGlass: true, glassThickness: '8', maxWidth: 5000, maxDepth: 4000,
        techSpecs: [
            'Verbessertes Einstiegsmodell mit stärkerem 60mm Profil',
            'Pfostenbreite: 110 mm',
            'Höhere Tragfähigkeit als Orangeline',
            'Fixierte Neigung 8°',
            'Dacheindeckung: 8 mm VSG oder 16 mm Polycarbonat',
            'Wandanbau-Konstruktion',
            'LED-Beleuchtung möglich',
        ],
    },
    {
        id: 'Trendline', name: 'Trendstyle',
        description: 'Nachhaltige, langlebige und attraktive Überdachung. Konstruktion mit untenliegender Statik.',
        features: ['Neigung 5-15°', 'Max. 6000×3000mm', '8/10mm VSG oder 16mm Poly', 'Stil: flach, rund, klassisch'],
        image: '/images/models/trendline.webp', badge: 'Bestseller', badgeColor: '#059669',
        hasPoly: true, hasGlass: true, maxWidth: 6000, maxDepth: 3000,
        techSpecs: [
            'Konstruktion mit untenliegender Statik',
            'Geneigtes Dach, variable Dachneigung 5-15°',
            'Pfostenbreite: 110 mm | Sparrenhöhe: 47,5 mm',
            'Maximale Spannweite auf zwei Pfosten mit Glaseindeckung: 6000 × 3000 mm*',
            'Dacheindeckung: 8 mm oder 10 mm VSG oder 16 mm Polycarbonat',
            'Milch- und Hitzeschutzvarianten gegen Aufpreis erhältlich',
            'Verschiedene Stil-Varianten: flach, rund oder klassisch',
            'LED-Spots in Sparren möglich / LED-Strips in Sparren möglich',
            'Variable Kipp-Profile für einfache Ausrichtung',
            'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
        ],
    },
    {
        id: 'Trendline+', name: 'Trendstyle+',
        description: 'Verstärkte Version mit 70mm Profil für größere Spannweiten und höhere Schneelast.',
        features: ['70mm Profil', 'Erhöhte Stabilität', '8/10mm VSG oder 16mm Poly', 'Wandanbau & Freistehend'],
        image: '/images/models/trendline-plus.jpg', badge: '', badgeColor: '',
        hasPoly: true, hasGlass: true, maxWidth: 6000, maxDepth: 3500,
        techSpecs: [
            'Verstärktes 70mm Profil für größere Spannweiten',
            'Pfostenbreite: 110 mm | Sparrenhöhe: 57,5 mm',
            'Erhöhte Schneelast-Tragfähigkeit',
            'Dacheindeckung: 8 mm oder 10 mm VSG oder 16 mm Polycarbonat',
            'Wandanbau und freistehende Montage möglich',
            'Alle Vorteile der Trendline mit erhöhter Stabilität',
        ],
    },
    {
        id: 'Topline', name: 'Topstyle',
        description: 'Top-Überdachung — überzeugt mit Stärke und Design. Kräftige Konstruktion für alle Wetterbedingungen.',
        features: ['Neigung 5-15°', 'Max. 6000×4500mm', '8/10mm VSG oder 16mm Poly', 'Untenliegende Statik'],
        image: '/images/models/topline.webp', badge: 'Premium', badgeColor: '#7c3aed',
        hasPoly: true, hasGlass: true, maxWidth: 6000, maxDepth: 4500,
        techSpecs: [
            'Konstruktion mit untenliegender Statik',
            'Geneigtes Dach, variable Dachneigung 5-15°',
            'Pfostenbreite: 149 mm | Sparrenhöhe: 93,2 mm',
            'Maximale Spannweite auf zwei Pfosten mit Glaseindeckung: 6000 × 4500 mm*',
            'Dacheindeckung: 8 mm oder 10 mm VSG oder 16 mm Polycarbonat',
            'Milch- und Hitzeschutzvarianten gegen Aufpreis erhältlich',
            'LED-Spots in Sparren möglich / LED-Strips in Sparren möglich',
            'Eindrucksvolle und kräftige Konstruktion für alle Wetterbedingungen',
            'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
        ],
    },
    {
        id: 'Topline XL', name: 'Topstyle XL',
        description: 'Besonders große Spannweiten mit extra starken Pfosten und Rinne. XL-Variante der Topline.',
        features: ['Max. 7000×4000mm', 'Extra starke Pfosten', '8/10mm VSG oder 16mm Poly', 'Höchste Schnee-/Windlast'],
        image: '/images/models/toplinexl.webp', badge: 'XL', badgeColor: '#7c3aed',
        hasPoly: true, hasGlass: true, maxWidth: 7000, maxDepth: 4000,
        techSpecs: [
            'Pfostenbreite: 196 mm | Sparrenhöhe: 117 mm',
            'Maximale Spannweite auf zwei Pfosten mit Glaseindeckung: 7000 × 4000 mm*',
            'Besonders starke Pfosten und extra starke Rinne für extreme Robustheit',
            'Spezielle Montagebügel verblenden die Rinnenverschraubung — nahtloses Erscheinungsbild',
            'Dacheindeckung: 8 mm oder 10 mm VSG oder 16 mm Polycarbonat',
            'Sehr widerstandsfähig — höchste Schnee- und Windlasten',
            'LED-Spots in Sparren möglich / LED-Strips in Sparren möglich',
            'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
        ],
    },
    {
        id: 'Designline', name: 'Designstyle',
        description: 'Funktionelles Designobjekt mit obenliegender Statik. Optionale Schiebedachfunktion.',
        features: ['Neigung 5-12°', 'Max. 6000×4000mm', 'Nur 8/10mm VSG', 'Schiebedachfunktion'],
        image: '/images/models/designline.webp', badge: 'Design', badgeColor: '#0ea5e9',
        hasPoly: false, hasGlass: true, roofNote: 'Nur Glaseindeckung', maxWidth: 6000, maxDepth: 4000,
        techSpecs: [
            'Konstruktion mit obenliegender Statik',
            'Geneigtes Dach, variable Dachneigung 5-12°',
            'Pfostenbreite: 196 mm',
            'Maximale Spannweite auf zwei Pfosten: 6000 × 4000 mm*',
            'Dacheindeckung: 8 mm oder 10 mm VSG (nur Glas)',
            'Milch- und Hitzeschutzvarianten gegen Aufpreis erhältlich',
            'Schiebedachfunktion — frische Brise, keine Stauhitze',
            'LED-Spots in Sparren möglich',
            'Besonders starke Konstruktion — höchste Wind- und Schneelasten',
            'Farben: DB 703, RAL 9010, RAL 9005',
        ],
    },
    {
        id: 'Ultraline', name: 'Ultrastyle',
        description: 'Horizontale Flachdach-Optik in minimalistischem Design. Stärkste Profile im Sortiment.',
        features: ['Horizontales Flachdach', 'Max. 7000×5000mm', 'Nur 8/10mm VSG', 'LED-Spots + LED-Strips'],
        image: '/images/models/ultraline.jpg', badge: 'Ultra', badgeColor: '#dc2626',
        hasPoly: false, hasGlass: true, roofNote: 'Nur Glaseindeckung', maxWidth: 7000, maxDepth: 5000,
        techSpecs: [
            'Horizontale Flachdach-Optik ohne Dachüberstand mit Frontleiste',
            'Pfostenbreite: 196 mm',
            'Maximale Spannweite auf zwei Pfosten: 7000 × 5000 mm*',
            'Dacheindeckung: 8 mm oder 10 mm VSG (nur Glas)',
            'Milch- und Hitzeschutzvarianten gegen Aufpreis erhältlich',
            'LED-Spots in Sparren möglich / LED-Strips in Pfosten, Rinne und Sparren möglich',
            'Minimalistisches Design mit starken Pfosten und Sparren',
            'Alternative Montage mit schmaleren Pfosten möglich',
            'Farben: RAL 7016, RAL 9007, RAL 9010, RAL 9005',
        ],
    },
    {
        id: 'Skyline', name: 'Skystyle',
        description: 'Neueste Entwicklung — schlankes, modernes Design mit horizontalem Dach.',
        features: ['Horizontales Dach', 'Max. 7000×5000mm', '8-10mm VSG', 'LED-Spots + LED-Strips'],
        image: '/images/models/skyline.jpg', badge: 'Innovation', badgeColor: '#0d9488',
        hasPoly: false, hasGlass: true, roofNote: 'Nur Glaseindeckung', maxWidth: 7000, maxDepth: 5000,
        techSpecs: [
            'Horizontales Vordach im schlanken Baustil',
            'Pfostenbreite: 160 mm | Glashöhe: 95 mm',
            'Maximale Spannweite auf vier Pfosten: 7000 × 5000 mm',
            'Bedachung: 8-10 mm Verbundsicherheitsglas (nur Glas)',
            'Milch- und wärmereflektierendes Glas gegen Aufpreis erhältlich',
            'LED-Spots in Trägern möglich / LED-Streifen in Rinne und Trägern möglich',
            'Kubistisches Design mit praktischer Funktionalität',
            'Ideal für den Ausbau zu einem Gartenzimmer',
            'Farbe: RAL 7016',
        ],
    },
    {
        id: 'Pergola', name: 'Pergola',
        description: 'Freistehende Pergola mit verstellbaren Lamellen. Moderne Architektur für Ihren Garten.',
        features: ['Freistehend', 'Verstellbare Lamellen', 'LED-Integration', 'Bioklimatisch'],
        image: '/images/models/pergola.jpg', badge: '', badgeColor: '',
        hasPoly: false, hasGlass: false, roofNote: 'Lamellendach', maxWidth: 6000, maxDepth: 5000,
    },
    {
        id: 'Pergola Deluxe', name: 'Pergola Deluxe',
        description: 'Premium-Pergola mit Komplett-Ausstattung. LED, Heizstrahler und Verglasung möglich.',
        features: ['Premium-Ausstattung', 'LED & Heizstrahler', 'Komplett-Verglasung', 'Bioklimatisch'],
        image: '/images/models/pergola-deluxe.jpg', badge: 'Deluxe', badgeColor: '#b45309',
        hasPoly: false, hasGlass: false, roofNote: 'Lamellendach', maxWidth: 7000, maxDepth: 5000,
    },
    {
        id: 'Carport', name: 'Carport',
        description: 'Horizontale Flachdach-Optik mit Trapezblech. Solar-ready. Einzel- oder Doppelcarport.',
        features: ['Max. 7000×5000mm', 'Trapezblech-Dach', 'Solar-ready', 'Freistehend'],
        image: '/images/models/carport.jpg', badge: '', badgeColor: '',
        hasPoly: false, hasGlass: false, roofNote: 'Trapezblech (Stahl)', maxWidth: 7000, maxDepth: 5000,
        techSpecs: [
            'Horizontale Flachdach-Optik in schlanker Bauweise',
            'Pfostenbreite: 160 mm | Dachhöhe: 28 mm',
            'Maximale Spannweite auf vier Pfosten: 7000 × 5000 mm',
            'Dacheindeckung: Trapezblech aus Stahl',
            'Freistehende Konstruktion als Einzel- oder Doppelcarport möglich',
            'Erfüllt Anforderungen für die Installation einer Solaranlage',
            'LED-Spots in Sparren möglich / LED-Strips in Rinne und Seitensparren möglich',
            'Vlies-Beschichtung an der Unterseite minimiert Kondensat-Abtropfen',
            'Farbe: RAL 7016',
        ],
    },
];

// ========== GLAZING OPTIONS WITH IMAGES ==========
const GLAZING_OPTIONS = [
    { id: '', label: 'Keine', desc: 'Offene Seite – kein Seitenschutz', image: '', tip: 'Ideal für sonnige, geschützte Lagen' },
    { id: 'fest', label: 'Festwand Glass', desc: 'Feste Glaswand (VSG/ESG) – permanenter Wind- & Regenschutz bei voller Sicht', image: '/images/models/glazing-fest.jpg', tip: 'Klare Sicht, kein Öffnen möglich' },
    { id: 'panoramisch', label: 'Panoramaschiebewand', desc: 'Rahmenlose Glaselemente auf Laufschienen – uneingeschränkte Sicht, Schutz vor Regen & Insekten', image: '/images/models/glazing-panoramisch-real.jpg', tip: '10mm ESG, barrierefrei (AL22/AL24)' },
    { id: 'rahmen', label: 'Schiebetüren mit Rahmen', desc: 'Aluminium-Schiebetüren im stabilen Rahmen – öffenbar für Belüftung & Zugang', image: '/images/models/glazing-rahmen-real.jpg', tip: 'Belüftung + Schutz' },
    { id: 'sonnenschutz', label: 'Sonnenschutzpaneele', desc: 'Schiebbare Alu-Paneele mit festen 45°-Lamellen – Sonnenschutz, Wind- & Sichtschutz', image: '/images/models/glazing-sonnenschutz.png', tip: 'Kombinierbar mit Panoramaschiebewand' },
    { id: 'sichtschutz', label: 'Sichtschutz Systeme', desc: 'Horizontale Alu-Planken – robuster Wind-, Wetter- & Sichtschutz', image: '/images/models/glazing-sichtschutz.png', tip: 'Auch freistehend als Zaunsystem' },
];

const MOUNTING_OPTIONS = [
    { id: 'fundament', label: 'Betonfundament', icon: '🏗️', desc: 'Maximale Stabilität für jedes Wetter', recommended: true },
    { id: 'pflaster', label: 'Pflastersteine', icon: '🧱', desc: 'Auf vorhandene Pflasterfläche montiert' },
    { id: 'erde', label: 'Erdreich', icon: '🌱', desc: 'Punktfundamente im Boden – flexible Lösung' },
];

// ========== ROOF COVERING OPTIONS ==========
const ROOF_GLASS_OPTIONS = [
    { id: 'klar-8', label: 'VSG Klar 8mm', desc: 'Klares Sicherheitsglas — maximale Transparenz', image: '/images/models/roof-glass.jpg', thickness: '8' as const },
    { id: 'matt-8', label: 'VSG Matt 8mm', desc: 'Satiniertes Glas — dezenter Sichtschutz', image: '/images/models/roof-glass.jpg', thickness: '8' as const },
    { id: 'sonnenschutz-8', label: 'Sonnenschutz UV Reflex 8mm', desc: 'UV-reflektierendes Sonnenschutzglas — reduziert Hitze', image: '/images/models/roof-glass.jpg', thickness: '8' as const },
    { id: 'klar-10', label: 'VSG Klar 10mm', desc: 'Verstärktes Klarglas — höhere Tragfähigkeit', image: '/images/models/roof-glass.jpg', thickness: '10' as const },
    { id: 'matt-10', label: 'VSG Matt 10mm', desc: 'Verstärktes Mattglas — Sichtschutz + Stärke', image: '/images/models/roof-glass.jpg', thickness: '10' as const },
    { id: 'sonnenschutz-10', label: 'Sonnenschutz UV Reflex 10mm', desc: 'Verstärktes UV-reflektierendes Sonnenschutzglas', image: '/images/models/roof-glass.jpg', thickness: '10' as const },
];

const ROOF_POLY_OPTIONS = [
    { id: 'opal', label: 'Opal (milchig)', desc: 'Lichtstreuend — angenehme Helligkeit ohne Blendung', image: '/images/models/roof-poly.jpg' },
    { id: 'klar', label: 'Klar (transparent)', desc: 'Volle Transparenz — maximaler Lichteinfall', image: '/images/models/roof-poly.jpg' },
    { id: 'ir-gold', label: 'IR Gold', desc: 'Wärmereflektierend — weniger Hitze unter dem Dach', image: '/images/models/roof-poly.jpg' },
];

const COLOR_OPTIONS = [
    { id: 'RAL 7016', label: 'RAL 7016', desc: 'Anthrazitgrau', hex: '#383E42' },
    { id: 'RAL 9016', label: 'RAL 9016', desc: 'Verkehrsweiß', hex: '#F1F0EA' },
    { id: 'RAL 9005', label: 'RAL 9005', desc: 'Tiefschwarz', hex: '#0E0E10' },
    { id: 'RAL 9007', label: 'RAL 9007', desc: 'Graualuminium', hex: '#8F8F8C' },
    { id: 'RAL 9010', label: 'RAL 9010', desc: 'Reinweiß', hex: '#F7F5EF' },
    { id: 'DB 703', label: 'DB 703', desc: 'Feinstruktur', hex: '#5E6066' },
    { id: 'Sonderfarbe', label: 'Sonderfarbe', desc: 'Wunschfarbe auf Anfrage', hex: 'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)' },
];

const FLOORING_OPTIONS = [
    { id: '', label: 'Kein Boden', icon: '⬜', desc: 'Ohne Bodenbelag' },
    { id: 'wpc', label: 'WPC Terrassendielen', icon: '🪵', desc: 'Holz-Kunststoff-Verbundwerkstoff — pflegeleicht & langlebig' },
    { id: 'holz', label: 'Holz / Drewno', icon: '🌲', desc: 'Natürliches Echtholz — warme Optik & angenehmes Laufgefühl' },
    { id: 'gres', label: 'Gres / Feinsteinzeug', icon: '🏗️', desc: 'Keramikfliesen — kratzfest, frostsicher & pflegeleicht' },
    { id: 'pflaster', label: 'Kostka brukowa / Pflastersteine', icon: '🧱', desc: 'Klassische Pflastersteine — robust & vielfältige Gestaltung' },
];

const STEPS = ['Kontaktdaten', 'Modell wählen', 'Dach & Farbe', 'Maße & Montage', 'Ausstattung', 'Übersicht'];

// ========== MAIN COMPONENT ==========
export const ConfiguratorWizardPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [glazingPreview, setGlazingPreview] = useState<string | null>(null);

    const [state, setState] = useState<WizardState>({
        customerData: { firstName: '', lastName: '', email: '', phone: '', street: '', postalCode: '', city: '', companyName: '' },
        model: '',
        modelDisplayName: '',
        selectedModels: [],
        standaloneMode: false,
        standaloneProducts: [],
        standaloneWidth: 3000,
        standaloneHeight: 2200,
        width: 4000,
        projection: 3000,
        mountingType: '',
        installType: '',
        roofCovering: '',
        roofVariant: '',
        color: 'RAL 7016',
        glazingSides: { left: '', right: '', front: '' },
        senkrechtmarkise: { sides: [] },
        markise: { sides: [], type: 'aufdach' },
        heater: false,
        led: false,
        flooring: '',
        notes: '',
        photos: [],
    });

    useEffect(() => {
        if (!token) return;
        ConfiguratorService.getByToken(token).then(config => {
            if (!config) {
                setNotFound(true);
            } else if (config.status === 'completed') {
                setSubmitted(true);
                setState(prev => ({ ...prev, customerData: { ...prev.customerData, ...config.customerData } as CustomerData, model: config.model || '', modelDisplayName: config.modelDisplayName || '' }));
            } else {
                setState(prev => ({ ...prev, customerData: { ...prev.customerData, ...config.customerData } as CustomerData }));
            }
            setLoading(false);
        });
    }, [token]);

    const updateCustomer = (field: keyof CustomerData, value: string) => {
        if (field === 'city') cityManuallyEdited.current = true;
        if (field === 'postalCode') cityManuallyEdited.current = false;
        setState(prev => ({ ...prev, customerData: { ...prev.customerData, [field]: value } }));
    };

    // Geocoding auto-fill: PLZ → City
    const cityManuallyEdited = useRef(false);
    useEffect(() => {
        const plz = state.customerData.postalCode.trim();
        if (!plz || plz.length !== 5 || cityManuallyEdited.current) return;

        const country = GeocodingService.detectCountryFromPLZ(plz);
        GeocodingService.lookupCity(plz, country, 'configuratorWizard').then(result => {
            if (result?.city && !cityManuallyEdited.current) {
                setState(prev => ({ ...prev, customerData: { ...prev.customerData, city: result.city } }));
            }
        });
    }, [state.customerData.postalCode]);

    const canProceed = (): boolean => {
        const selectedModel = WIZARD_MODELS.find(m => m.id === state.model);
        switch (currentStep) {
            case 0: return !!(state.customerData.firstName && state.customerData.lastName && state.customerData.email);
            case 1: return !!(state.model || state.standaloneMode);
            case 2: {
                if (state.standaloneMode) return state.standaloneProducts.length > 0;
                if (selectedModel && (selectedModel.hasGlass || selectedModel.hasPoly)) {
                    return !!state.roofCovering;
                }
                return true; // Pergola, Carport — no roof covering selection needed
            }
            case 3: {
                if (state.standaloneMode) return true; // dimensions are optional guidance
                return state.width >= 1500 && state.projection >= 1500 && !!state.mountingType && !!state.installType;
            }
            case 4: return true;
            case 5: return true;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        if (!token) return;
        setSubmitting(true);
        try {
            // Upload photos to Supabase storage
            let photoUrls: string[] = [];
            if (state.photos.length > 0) {
                for (const file of state.photos) {
                    const ext = file.name.split('.').pop() || 'jpg';
                    const fileName = `configurator/${token}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                    try {
                        const { error: uploadErr } = await supabase.storage.from('lead-attachments').upload(fileName, file);
                        if (!uploadErr) {
                            const { data: urlData } = supabase.storage.from('lead-attachments').getPublicUrl(fileName);
                            if (urlData?.publicUrl) photoUrls.push(urlData.publicUrl);
                        }
                    } catch (e) { console.warn('Photo upload failed:', e); }
                }
            }

            // Build standalone info for notes
            let enrichedNotes = state.notes;
            if (state.standaloneMode && state.standaloneProducts.length > 0) {
                const labels: Record<string, string> = { 'zip': 'ZIP Screen / Senkrechtmarkise', 'markise-aufdach': 'Aufdachmarkise', 'markise-unterdach': 'Unterdachmarkise', 'seitenwand': 'Seitenwand (Glas)', 'frontwand': 'Frontwand (Glas)', 'panorama-schiebewand': 'Panoramaschiebewand', 'schiebetuer-rahmen': 'Schiebetüren mit Rahmen' };
                const prods = state.standaloneProducts.map(p => labels[p] || p).join(', ');
                enrichedNotes = `[EINZELKOMPONENTEN] ${prods} — Breite: ${state.standaloneWidth}mm, Höhe: ${state.standaloneHeight}mm\n${state.notes}`;
            }
            // Multi-model info
            if (state.selectedModels.length > 1) {
                const names = state.selectedModels.map(id => WIZARD_MODELS.find(m => m.id === id)?.name || id).join(', ');
                enrichedNotes = `[MODELLVERGLEICH] ${names}\n${enrichedNotes}`;
            }

            // Enrich customerData with structural zone info
            const plz = state.customerData.postalCode?.trim();
            let enrichedCustomerData = { ...state.customerData };
            if (plz && plz.length === 5) {
                const zones = StructuralZonesService.getZones(plz);
                enrichedCustomerData = {
                    ...enrichedCustomerData,
                    windZone: zones.windZone ? String(zones.windZone) : undefined,
                    snowZone: zones.snowZoneDIN || undefined,
                    snowLoad: zones.snowLoad ? `${zones.snowLoad} kN/m²` : undefined,
                    structuralRecommendation: zones.requiresReinforcement ? 'Verstärkte Konstruktion empfohlen' : undefined,
                    snowZonePostalCode: plz,
                };
            }

            const success = await ConfiguratorService.submitConfiguration(token, {
                customerData: enrichedCustomerData,
                model: state.standaloneMode ? 'Einzelkomponenten' : state.model,
                modelDisplayName: state.standaloneMode ? 'Einzelkomponenten' : state.modelDisplayName,
                width: state.standaloneMode ? state.standaloneWidth : state.width,
                projection: state.standaloneMode ? state.standaloneHeight : state.projection,
                mountingType: state.mountingType || 'fundament',
                installType: state.installType || 'wand',
                glazingSides: state.glazingSides,
                zipScreen: { enabled: state.senkrechtmarkise.sides.length > 0, sides: state.senkrechtmarkise.sides, type: state.markise.type },
                heater: state.heater,
                led: state.led,
                roofCovering: state.roofCovering,
                roofVariant: state.roofVariant,
                color: state.color,
                senkrechtmarkise: state.senkrechtmarkise,
                markise: state.markise,
                flooring: state.flooring,
                notes: enrichedNotes,
                photos: photoUrls,
                selectedModels: state.selectedModels,
                standaloneProducts: state.standaloneProducts,
            });
            if (success) { setSubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        } catch (err) { console.error(err); } finally { setSubmitting(false); }
    };

    // ========== LOADING / ERROR STATES ==========
    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fef3c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#92400e', fontSize: 18 }}>Ihr Konfigurator wird geladen...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        </div>
    );

    if (notFound) return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fef3c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Link nicht gültig</h1>
                <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6 }}>Dieser Konfigurationslink ist ungültig oder abgelaufen.<br />Bitte kontaktieren Sie uns für einen neuen Link.</p>
                <a href="https://www.polendach24.de" style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#f97316', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>→ www.polendach24.de</a>
            </div>
        </div>
    );

    if (submitted) return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ textAlign: 'center', maxWidth: 520 }}>
                <div style={{ width: 80, height: 80, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(34,197,94,0.2)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>Vielen Dank!</h1>
                <p style={{ color: '#64748b', fontSize: 18, lineHeight: 1.6, marginBottom: 24 }}>
                    Ihre Konfiguration wurde erfolgreich übermittelt.<br />
                    <strong style={{ color: '#16a34a' }}>Einer unserer Projektberater wird sich in Kürze bei Ihnen melden.</strong>
                </p>
                <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '2px solid #e2e8f0', display: 'inline-block' }}>
                    <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Ihre Auswahl</p>
                    <p style={{ color: '#1e293b', fontSize: 22, fontWeight: 800 }}>{state.modelDisplayName || 'Konfiguration gesendet'}</p>
                </div>
                <div style={{ marginTop: 32 }}>
                    <a href="https://www.polendach24.de" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none', fontSize: 16 }}>→ Zurück zu Polendach24.de</a>
                </div>
            </div>
        </div>
    );

    // ========== WIZARD ==========
    return (
        <div translate="no" style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 15%, #ffffff 85%, #fef3c7 100%)' }}>
            {/* Header */}
            <header style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #fed7aa', position: 'sticky', top: 0, zIndex: 40 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <a href="https://www.polendach24.de" target="_blank" rel="noreferrer">
                        <img src="https://polendach24.app/PolenDach24-Logo.png" alt="Polendach24" style={{ height: 36 }} />
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid #fed7aa' }}>
                            🛡️ Kostenlos & unverbindlich
                        </span>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            {/* Progress Steps — responsive */}
            <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(12px, 3vw, 24px) clamp(8px, 3vw, 20px) 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {STEPS.map((step, i) => (
                        <React.Fragment key={i}>
                            <button
                                onClick={() => i < currentStep && setCurrentStep(i)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 16px)', borderRadius: 99,
                                    fontSize: 'clamp(10px, 2vw, 13px)', fontWeight: 700, border: 'none', cursor: i <= currentStep ? 'pointer' : 'default',
                                    background: i === currentStep ? '#f97316' : i < currentStep ? '#dcfce7' : '#f1f5f9',
                                    color: i === currentStep ? '#fff' : i < currentStep ? '#16a34a' : '#94a3b8',
                                    boxShadow: i === currentStep ? '0 4px 16px rgba(249,115,22,0.3)' : 'none',
                                    transition: 'all 0.3s', whiteSpace: 'nowrap', flexShrink: 0,
                                }}
                            >
                                <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: i === currentStep ? 'rgba(0,0,0,0.15)' : i < currentStep ? '#22c55e' : '#cbd5e1', color: i < currentStep ? '#fff' : 'inherit', flexShrink: 0 }}>
                                    {i < currentStep ? '✓' : i + 1}
                                </span>
                                <span style={{ display: 'none' }} className="step-label">{step}</span>
                            </button>
                            {i < STEPS.length - 1 && <div style={{ flex: 1, minWidth: 8, height: 2, background: i < currentStep ? '#bbf7d0' : '#e2e8f0', margin: '0 2px' }} />}
                        </React.Fragment>
                    ))}
                </div>
                <style>{`
                    @media(min-width:640px){.step-label{display:inline!important}}
                    @media(max-width:639px){
                        .wiz-grid-2col{grid-template-columns:1fr!important}
                        .wiz-grid-3col{grid-template-columns:1fr 1fr!important}
                        .wiz-grid-plz{grid-template-columns:1fr!important}
                        .wiz-h2{font-size:clamp(22px,5vw,32px)!important}
                    }
                `}</style>
            </div>

            {/* Step Content */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(8px, 2vw, 16px) clamp(8px, 3vw, 20px) 120px' }}>
                {currentStep === 0 && <StepPersonalData data={state.customerData} onChange={updateCustomer} />}
                {currentStep === 1 && <StepModelSelection state={state} setState={setState} />}
                {currentStep === 2 && (state.standaloneMode ? <StepStandaloneProducts state={state} setState={setState} /> : <StepRoofAndColor state={state} setState={setState} />)}
                {currentStep === 3 && (state.standaloneMode ? <StepStandaloneDimensions state={state} setState={setState} /> : <StepDimensions state={state} setState={setState} />)}
                {currentStep === 4 && <StepAccessories state={state} setState={setState} glazingPreview={glazingPreview} setGlazingPreview={setGlazingPreview} />}
                {currentStep === 5 && <StepSummary state={state} />}
            </div>

            {/* Fixed Bottom Bar */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', zIndex: 30 }}>
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                        onClick={() => { setCurrentStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentStep === 0}
                        style={{ padding: '10px 20px', color: currentStep === 0 ? '#cbd5e1' : '#64748b', fontWeight: 600, background: 'none', border: 'none', cursor: currentStep === 0 ? 'default' : 'pointer', fontSize: 15 }}
                    >← Zurück</button>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>Schritt {currentStep + 1} / {STEPS.length}</div>
                    {currentStep < STEPS.length - 1 ? (
                        <button
                            onClick={() => { setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={!canProceed()}
                            style={{
                                padding: '12px 28px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 15, cursor: canProceed() ? 'pointer' : 'default',
                                background: canProceed() ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#e2e8f0',
                                color: canProceed() ? '#fff' : '#94a3b8',
                                boxShadow: canProceed() ? '0 4px 20px rgba(249,115,22,0.35)' : 'none',
                                transition: 'all 0.3s',
                            }}
                        >Weiter →</button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                padding: '12px 28px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
                                boxShadow: '0 4px 20px rgba(22,163,74,0.35)', display: 'flex', alignItems: 'center', gap: 8,
                            }}
                        >
                            {submitting ? <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Wird gesendet...</> : 'Konfiguration absenden ✓'}
                            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                        </button>
                    )}
                </div>
            </div>

            {/* Glazing Preview Modal */}
            {glazingPreview && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={() => setGlazingPreview(null)}>
                    <div style={{ maxWidth: 600, maxHeight: '80vh', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                        <img src={glazingPreview} alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ========== STEP 1: PERSONAL DATA ==========
const StepPersonalData: React.FC<{ data: CustomerData; onChange: (f: keyof CustomerData, v: string) => void }> = ({ data, onChange }) => (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 className="wiz-h2" style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Willkommen bei Ihrem Konfigurator</h2>
            <p style={{ color: '#64748b', fontSize: 16 }}>Füllen Sie Ihre Daten aus und wir erstellen Ihnen ein individuelles Angebot.</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <WField label="Vorname *" value={data.firstName} onChange={v => onChange('firstName', v)} placeholder="Max" />
                <WField label="Nachname *" value={data.lastName} onChange={v => onChange('lastName', v)} placeholder="Mustermann" />
            </div>
            <WField label="E-Mail Adresse *" value={data.email} onChange={v => onChange('email', v)} placeholder="max@beispiel.de" type="email" />
            <WField label="Telefon" value={data.phone} onChange={v => onChange('phone', v)} placeholder="+49 123 456789" type="tel" />
            <WField label="Firma (optional)" value={data.companyName} onChange={v => onChange('companyName', v)} placeholder="Firma GmbH" />
            <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>📍 Montageadresse</h3>
            <WField label="Straße & Hausnummer" value={data.street} onChange={v => onChange('street', v)} placeholder="Musterstraße 1" />
            <div className="wiz-grid-plz" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
                <WField label="PLZ" value={data.postalCode} onChange={v => onChange('postalCode', v)} placeholder="12345" />
                <WField label="Ort" value={data.city} onChange={v => onChange('city', v)} placeholder="Musterstadt" />
            </div>
            {/* Structural Zones — DIN EN 1991 */}
            {data.postalCode && data.postalCode.replace(/\s/g, '').length === 5 && (
                <div style={{ marginTop: 12 }}>
                    <StructuralZoneBadge zones={StructuralZonesService.getZones(data.postalCode)} compact />
                </div>
            )}
        </div>
    </div>
);

// ========== STANDALONE PRODUCT OPTIONS ==========
const STANDALONE_PRODUCTS = [
    { id: 'zip', label: 'ZIP Screen / Senkrechtmarkise', icon: '🪄', desc: 'Vertikaler Sonnenschutz mit seitlicher Schienenführung' },
    { id: 'markise-aufdach', label: 'Aufdachmarkise', icon: '☀️', desc: 'Horizontaler Sonnenschutz auf dem Dach montiert' },
    { id: 'markise-unterdach', label: 'Unterdachmarkise', icon: '🌤️', desc: 'Horizontaler Sonnenschutz unter dem Dach montiert' },
    { id: 'seitenwand', label: 'Seitenwand (Glas)', icon: '🔲', desc: 'Aluminium-Seitenwand mit VSG-Verglasung' },
    { id: 'frontwand', label: 'Frontwand (Glas)', icon: '⬛', desc: 'Aluminium-Frontwand mit VSG-Verglasung' },
    { id: 'panorama-schiebewand', label: 'Panoramaschiebewand', icon: '🪟', desc: 'Rahmenlose Ganzglas-Schiebewand — maximale Transparenz' },
    { id: 'schiebetuer-rahmen', label: 'Schiebetüren mit Rahmen', icon: '🚪', desc: 'Schiebetüren mit Aluminium-Rahmen — robust und elegant' },
];

// ========== STEP 2: MODEL SELECTION (MULTI-SELECT + STANDALONE) ==========
const StepModelSelection: React.FC<{ state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }> = ({ state, setState }) => {
    const toggleModel = (id: string, name: string) => {
        setState(s => {
            const isSelected = s.selectedModels.includes(id);
            const newSelected = isSelected
                ? s.selectedModels.filter(m => m !== id)
                : [...s.selectedModels, id];
            // Primary model = first selected
            const primary = newSelected[0] || '';
            const primaryName = WIZARD_MODELS.find(m => m.id === primary)?.name || '';
            return {
                ...s,
                model: primary,
                modelDisplayName: primaryName,
                selectedModels: newSelected,
                standaloneMode: false,
                roofCovering: isSelected ? '' : s.roofCovering, // reset roof if changing primary
                roofVariant: isSelected ? '' : s.roofVariant,
            };
        });
    };

    const toggleStandalone = () => {
        setState(s => ({
            ...s,
            standaloneMode: !s.standaloneMode,
            model: !s.standaloneMode ? '' : s.model,
            modelDisplayName: !s.standaloneMode ? '' : s.modelDisplayName,
            selectedModels: !s.standaloneMode ? [] : s.selectedModels,
        }));
    };

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h2 className="wiz-h2" style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Wählen Sie Ihr Modell</h2>
                <p style={{ color: '#64748b', fontSize: 16 }}>Entdecken Sie unsere Überdachungen und Konstruktionen.</p>
            </div>

            {/* Multi-model hint */}
            <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', border: '2px solid #93c5fd', borderRadius: 16, padding: '20px 24px', marginBottom: 28, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.1, transform: 'rotate(15deg)' }}>📊</div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#1e40af', marginBottom: 6 }}>💡 Sie möchten mehrere Modelle vergleichen?</p>
                <p style={{ fontSize: 14, color: '#3b82f6', lineHeight: 1.6 }}>Kein Problem! Markieren Sie alle Modelle, die Sie interessieren — <br />wir erstellen Ihnen gerne eine <strong>Vergleichsübersicht</strong> mit individuellen Angeboten.</p>
            </div>

            {state.selectedModels.length > 1 && (
                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ color: '#166534', fontWeight: 700, fontSize: 14 }}>{state.selectedModels.length} Modelle ausgewählt — Sie erhalten ein Vergleichsangebot</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, opacity: state.standaloneMode ? 0.4 : 1, pointerEvents: state.standaloneMode ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
                {WIZARD_MODELS.map(m => {
                    const isSelected = state.selectedModels.includes(m.id);
                    const isPrimary = state.model === m.id;
                    return (
                        <button key={m.id} onClick={() => toggleModel(m.id, m.name)}
                            style={{ position: 'relative', textAlign: 'left', borderRadius: 16, overflow: 'hidden', border: isSelected ? '3px solid #f97316' : '2px solid #e2e8f0', background: '#fff', cursor: 'pointer', transition: 'all 0.3s', padding: 0, boxShadow: isSelected ? '0 8px 32px rgba(249,115,22,0.2)' : '0 2px 12px rgba(0,0,0,0.05)', transform: isSelected ? 'scale(1.02)' : 'scale(1)' }}>
                            {/* Checkbox */}
                            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 3, width: 26, height: 26, borderRadius: 6, border: isSelected ? '2px solid #f97316' : '2px solid #cbd5e1', background: isSelected ? '#f97316' : 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            {m.badge && <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, background: m.badgeColor, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>{m.badge}</div>}
                            {isPrimary && state.selectedModels.length > 1 && <div style={{ position: 'absolute', top: 12, right: m.badge ? 90 : 12, zIndex: 2, background: '#0d9488', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>Hauptmodell</div>}
                            <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#f8fafc' }}>
                                <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x400/f8fafc/94a3b8?text=${m.name}`; }} />
                            </div>
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{m.name}</h3>
                                </div>
                                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>{m.description}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {m.features.map((f, i) => <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: 6, fontWeight: 600 }}>{f}</span>)}
                                </div>
                                {isPrimary && m.techSpecs && m.techSpecs.length > 0 && (
                                    <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Technische Details</p>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {m.techSpecs.map((spec, i) => (
                                                <li key={i} style={{ fontSize: 12, color: '#334155', lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                    <span style={{ color: '#f97316', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                                                    {spec}
                                                </li>
                                            ))}
                                        </ul>
                                        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>* kann je nach Schnee- und Windlast variieren.</p>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Standalone option */}
            <div style={{ marginTop: 32, borderTop: '2px dashed #e2e8f0', paddingTop: 28 }}>
                <button onClick={toggleStandalone}
                    style={{ width: '100%', padding: '24px 28px', borderRadius: 20, border: state.standaloneMode ? '3px solid #8b5cf6' : '2px solid #e2e8f0', background: state.standaloneMode ? 'linear-gradient(135deg, #ede9fe, #f5f3ff)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', boxShadow: state.standaloneMode ? '0 8px 32px rgba(139,92,246,0.2)' : '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: state.standaloneMode ? '#8b5cf6' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, transition: 'all 0.3s' }}>
                        {state.standaloneMode ? '✓' : '🧩'}
                    </div>
                    <div>
                        <p style={{ fontSize: 18, fontWeight: 800, color: state.standaloneMode ? '#6d28d9' : '#1e293b', marginBottom: 4 }}>Nur Einzelkomponenten gewünscht?</p>
                        <p style={{ fontSize: 14, color: state.standaloneMode ? '#7c3aed' : '#64748b', lineHeight: 1.5 }}>
                            Sie möchten nur eine <strong>Markise</strong>, einen <strong>ZIP Screen</strong> oder eine <strong>Seitenwand</strong>? <br />
                            Kein Problem — wählen Sie diese Option und konfigurieren Sie nur die gewünschten Einzelteile.
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
};

// ========== STEP 2B: STANDALONE PRODUCT SELECTION ==========
const StepStandaloneProducts: React.FC<{ state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }> = ({ state, setState }) => {
    const toggleProduct = (id: string) => {
        setState(s => {
            const isSelected = s.standaloneProducts.includes(id);
            return { ...s, standaloneProducts: isSelected ? s.standaloneProducts.filter(p => p !== id) : [...s.standaloneProducts, id] };
        });
    };

    return (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h2 className="wiz-h2" style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Welche Komponenten benötigen Sie?</h2>
                <p style={{ color: '#64748b', fontSize: 16 }}>Wählen Sie alle gewünschten Einzelkomponenten aus.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {STANDALONE_PRODUCTS.map(p => {
                    const isSelected = state.standaloneProducts.includes(p.id);
                    return (
                        <button key={p.id} onClick={() => toggleProduct(p.id)}
                            style={{ padding: 24, borderRadius: 16, border: isSelected ? '3px solid #8b5cf6' : '2px solid #e2e8f0', background: isSelected ? 'linear-gradient(135deg, #ede9fe, #f5f3ff)' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: isSelected ? '0 6px 20px rgba(139,92,246,0.2)' : 'none' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>{p.icon}</div>
                            <p style={{ fontWeight: 800, fontSize: 15, color: isSelected ? '#6d28d9' : '#1e293b', marginBottom: 6 }}>{p.label}</p>
                            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{p.desc}</p>
                            {isSelected && <span style={{ display: 'inline-block', marginTop: 8, background: '#8b5cf6', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>✓ Gewählt</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ========== STEP 3B: STANDALONE DIMENSIONS ==========
const StepStandaloneDimensions: React.FC<{ state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }> = ({ state, setState }) => (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Maße Ihrer Einzelkomponenten</h2>
            <p style={{ color: '#64748b', fontSize: 16 }}>Geben Sie die ungefähren Abmessungen an — wir beraten Sie gerne im Detail.</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                    <label style={{ color: '#64748b', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Breite (mm)</label>
                    <input type="number" value={state.standaloneWidth} onChange={e => setState(s => ({ ...s, standaloneWidth: Number(e.target.value) }))} min={500} max={10000} step={100}
                        style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', background: '#f8fafc', outline: 'none', color: '#1e293b', boxSizing: 'border-box' }} />
                    <input type="range" min={500} max={10000} step={100} value={state.standaloneWidth} onChange={e => setState(s => ({ ...s, standaloneWidth: Number(e.target.value) }))} style={{ width: '100%', marginTop: 8, accentColor: '#8b5cf6' }} />
                </div>
                <div>
                    <label style={{ color: '#64748b', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Höhe / Ausladung (mm)</label>
                    <input type="number" value={state.standaloneHeight} onChange={e => setState(s => ({ ...s, standaloneHeight: Number(e.target.value) }))} min={500} max={5000} step={100}
                        style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', background: '#f8fafc', outline: 'none', color: '#1e293b', boxSizing: 'border-box' }} />
                    <input type="range" min={500} max={5000} step={100} value={state.standaloneHeight} onChange={e => setState(s => ({ ...s, standaloneHeight: Number(e.target.value) }))} style={{ width: '100%', marginTop: 8, accentColor: '#8b5cf6' }} />
                </div>
            </div>
            <div style={{ marginTop: 20, background: '#ede9fe', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <p style={{ color: '#6d28d9', fontSize: 13 }}>Gewählte Komponenten: <strong>{state.standaloneProducts.map(p => STANDALONE_PRODUCTS.find(sp => sp.id === p)?.label).join(', ') || '—'}</strong></p>
            </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginTop: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>📝 Anmerkungen / Sonderwünsche</h3>
            <textarea value={state.notes} onChange={e => setState(s => ({ ...s, notes: e.target.value }))}
                placeholder="Hier können Sie uns gerne zusätzliche Wünsche oder Anmerkungen mitteilen..."
                rows={4} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
    </div>
);

// ========== STEP 3: ROOF COVERING & COLOR ==========
const StepRoofAndColor: React.FC<{ state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }> = ({ state, setState }) => {
    const selectedMdl = WIZARD_MODELS.find(m => m.id === state.model);
    const hasRoofChoice = selectedMdl && (selectedMdl.hasGlass || selectedMdl.hasPoly);

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h2 className="wiz-h2" style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Dacheindeckung & Farbe</h2>
                <p style={{ color: '#64748b', fontSize: 16 }}>Wählen Sie das Material für Ihr Dach und die gewünschte Farbe für Ihre {state.modelDisplayName || 'Überdachung'}.</p>
            </div>

            {/* Roof Covering */}
            {hasRoofChoice ? (
                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>🏠 Dacheindeckung wählen *</h3>
                    <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: selectedMdl!.hasPoly ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
                        {selectedMdl!.hasGlass && (
                            <button onClick={() => setState(s => ({ ...s, roofCovering: 'glass', roofVariant: '' }))} style={{ padding: 20, borderRadius: 14, border: state.roofCovering === 'glass' ? '2px solid #f97316' : '2px solid #e2e8f0', background: state.roofCovering === 'glass' ? '#fff7ed' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
                                <img src="/images/models/roof-glass.jpg" alt="Glas" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <div><p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>Sicherheitsglas VSG</p><p style={{ fontSize: 12, color: '#94a3b8' }}>Premium — maximaler Lichteinfall, 8 oder 10 mm</p></div>
                            </button>
                        )}
                        {selectedMdl!.hasPoly && (
                            <button onClick={() => setState(s => ({ ...s, roofCovering: 'poly', roofVariant: '' }))} style={{ padding: 20, borderRadius: 14, border: state.roofCovering === 'poly' ? '2px solid #f97316' : '2px solid #e2e8f0', background: state.roofCovering === 'poly' ? '#fff7ed' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
                                <img src="/images/models/roof-poly.jpg" alt="Poly" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <div><p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>Polycarbonat 16mm</p><p style={{ fontSize: 12, color: '#94a3b8' }}>Leicht, robust, wirtschaftlich</p></div>
                            </button>
                        )}
                    </div>
                    {state.roofCovering === 'glass' && (() => {
                        const modelGlassThickness = selectedMdl?.glassThickness || '8-10';
                        const filteredGlass = modelGlassThickness === '8'
                            ? ROOF_GLASS_OPTIONS.filter(o => o.thickness === '8')
                            : ROOF_GLASS_OPTIONS;
                        return (
                            <div style={{ background: '#f0f9ff', borderRadius: 14, padding: 16, border: '1px solid #bae6fd' }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0c4a6e', marginBottom: 12 }}>Glasart wählen:</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                                    {filteredGlass.map(opt => (
                                        <button key={opt.id} onClick={() => setState(s => ({ ...s, roofVariant: opt.id }))}
                                            style={{ padding: 12, borderRadius: 10, border: state.roofVariant === opt.id ? '2px solid #0284c7' : '2px solid #e0f2fe', background: state.roofVariant === opt.id ? '#e0f2fe' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                                            <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{opt.label}</p>
                                            <p style={{ fontSize: 11, color: '#64748b' }}>{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                    {state.roofCovering === 'poly' && (
                        <div style={{ background: '#fff7ed', borderRadius: 14, padding: 16, border: '1px solid #fed7aa' }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>Polycarbonat-Typ wählen:</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {ROOF_POLY_OPTIONS.map(opt => (
                                    <button key={opt.id} onClick={() => setState(s => ({ ...s, roofVariant: opt.id }))}
                                        style={{ padding: 12, borderRadius: 10, border: state.roofVariant === opt.id ? '2px solid #f97316' : '2px solid #fef3c7', background: state.roofVariant === opt.id ? '#fef3c7' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                                        <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{opt.label}</p>
                                        <p style={{ fontSize: 11, color: '#64748b' }}>{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : selectedMdl?.roofNote ? (
                <div style={{ background: '#f0fdf4', borderRadius: 16, border: '1px solid #bbf7d0', padding: 20, marginBottom: 24, textAlign: 'center' }}>
                    <p style={{ color: '#166534', fontWeight: 700, fontSize: 16 }}>🏗️ Dacheindeckung: {selectedMdl.roofNote}</p>
                    <p style={{ color: '#15803d', fontSize: 13, marginTop: 4 }}>Dieses Modell hat eine feste Dacheindeckung — keine Auswahl erforderlich.</p>
                </div>
            ) : null}

            {/* Color */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🎨 Farbe wählen</h3>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Standardfarben ab Lager verfügbar. Sonderfarbe gegen Aufpreis und längere Lieferzeit.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {COLOR_OPTIONS.map(c => (
                        <button key={c.id} onClick={() => setState(s => ({ ...s, color: c.id }))}
                            style={{ padding: 12, borderRadius: 12, border: state.color === c.id ? '2px solid #f97316' : '2px solid #e2e8f0', background: state.color === c.id ? '#fff7ed' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', margin: '0 auto 8px', background: c.hex, border: '2px solid #e2e8f0', boxShadow: state.color === c.id ? '0 0 0 3px #f97316' : 'none' }} />
                            <p style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{c.label}</p>
                            <p style={{ fontSize: 10, color: '#94a3b8' }}>{c.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


// ========== STEP 3: DIMENSIONS & MOUNTING ==========
const StepDimensions: React.FC<{ state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }> = ({ state, setState }) => (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 className="wiz-h2" style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Maße & Montageart</h2>
            <p style={{ color: '#64748b', fontSize: 16 }}>Geben Sie die gewünschten Abmessungen Ihrer {state.modelDisplayName} an.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>📐 Abmessungen</h3>
            {(() => {
                const selModel = WIZARD_MODELS.find(m => m.id === state.model);
                const mD = selModel?.maxDepth || 5000;
                return (
                    <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                            <label style={{ color: '#64748b', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Breite (mm)</label>
                            <input type="number" value={state.width} onChange={e => setState(s => ({ ...s, width: Number(e.target.value) }))} min={1500} max={15000} step={100}
                                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', background: '#f8fafc', outline: 'none', color: '#1e293b' }}
                            />
                            <input type="range" min={1500} max={15000} step={100} value={state.width} onChange={e => setState(s => ({ ...s, width: Number(e.target.value) }))}
                                style={{ width: '100%', marginTop: 8, accentColor: '#f97316' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}><span>1.500</span><span>15.000 mm</span></div>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>Bei größeren Breiten werden zusätzliche Pfosten eingeplant.</p>
                        </div>
                        <div>
                            <label style={{ color: '#64748b', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Tiefe / Ausladung (mm)</label>
                            <input type="number" value={state.projection} onChange={e => { const v = Math.min(Number(e.target.value), mD); setState(s => ({ ...s, projection: v })); }} min={1500} max={mD} step={100}
                                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', background: '#f8fafc', outline: 'none', color: '#1e293b' }}
                            />
                            <input type="range" min={1500} max={mD} step={100} value={Math.min(state.projection, mD)} onChange={e => setState(s => ({ ...s, projection: Number(e.target.value) }))}
                                style={{ width: '100%', marginTop: 8, accentColor: '#f97316' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}><span>1.500</span><span style={{ fontWeight: 700, color: '#f97316' }}>max. {(mD / 1000).toFixed(1)}m</span></div>
                        </div>
                    </div>
                );
            })()}
            <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', border: '1px solid #fed7aa', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <span style={{ color: '#92400e', fontSize: 14 }}>Überdachte Fläche: </span>
                <span style={{ color: '#c2410c', fontSize: 24, fontWeight: 800 }}>{((state.width * state.projection) / 1000000).toFixed(1)} m²</span>
            </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>🔩 Wie soll montiert werden? *</h3>
            <div className="wiz-grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {MOUNTING_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setState(s => ({ ...s, mountingType: opt.id as any }))}
                        style={{
                            position: 'relative', padding: 20, borderRadius: 14, border: state.mountingType === opt.id ? '2px solid #f97316' : '2px solid #e2e8f0',
                            background: state.mountingType === opt.id ? '#fff7ed' : '#fff', cursor: 'pointer', textAlign: 'left',
                            boxShadow: state.mountingType === opt.id ? '0 4px 16px rgba(249,115,22,0.15)' : 'none', transition: 'all 0.2s',
                        }}>
                        {'recommended' in opt && opt.recommended && <span style={{ position: 'absolute', top: -8, right: 12, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>Empfohlen</span>}
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
                        <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{opt.label}</p>
                        <p style={{ color: '#94a3b8', fontSize: 12 }}>{opt.desc}</p>
                    </button>
                ))}
            </div>
        </div>

        {/* Konstruktionsart: Wandmontage vs Freistehend */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginTop: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>🏠 Konstruktionsart *</h3>
            <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                    { id: 'wand', label: 'Wandmontage', icon: '🏠', desc: 'An der Hauswand befestigt — stabiler Halt, kein hinterer Pfosten', recommended: true },
                    { id: 'frei', label: 'Freistehend', icon: '⛺', desc: 'Frei aufgestellt — Pfosten vorne und hinten, flexibler Standort' },
                ].map(opt => (
                    <button key={opt.id} onClick={() => setState(s => ({ ...s, installType: opt.id as any }))}
                        style={{
                            position: 'relative', padding: 24, borderRadius: 14, border: state.installType === opt.id ? '2px solid #f97316' : '2px solid #e2e8f0',
                            background: state.installType === opt.id ? '#fff7ed' : '#fff', cursor: 'pointer', textAlign: 'center',
                            boxShadow: state.installType === opt.id ? '0 4px 16px rgba(249,115,22,0.15)' : 'none', transition: 'all 0.2s',
                        }}>
                        {'recommended' in opt && opt.recommended && <span style={{ position: 'absolute', top: -8, right: 12, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>Empfohlen</span>}
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{opt.icon}</div>
                        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 16, marginBottom: 4 }}>{opt.label}</p>
                        <p style={{ color: '#94a3b8', fontSize: 12 }}>{opt.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    </div>
);

// ========== STEP 4: ACCESSORIES WITH VISUAL GLAZING ==========
const StepAccessories: React.FC<{
    state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>;
    glazingPreview: string | null; setGlazingPreview: (v: string | null) => void;
}> = ({ state, setState, setGlazingPreview }) => {
    const setGlazing = (side: 'left' | 'right' | 'front', value: string) => {
        setState(s => ({ ...s, glazingSides: { ...s.glazingSides, [side]: value } }));
    };
    const toggleSenkrecht = (side: string) => {
        setState(s => {
            const sides = s.senkrechtmarkise.sides.includes(side) ? s.senkrechtmarkise.sides.filter(x => x !== side) : [...s.senkrechtmarkise.sides, side];
            return { ...s, senkrechtmarkise: { sides } };
        });
    };
    const toggleMarkise = (side: string) => {
        setState(s => {
            const sides = s.markise.sides.includes(side) ? s.markise.sides.filter(x => x !== side) : [...s.markise.sides, side];
            return { ...s, markise: { ...s.markise, sides } };
        });
    };
    const sideLabels: Record<string, string> = { left: '← Linke Seite', right: 'Rechte Seite →', front: '↑ Vorderseite (Front)' };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h2 className="wiz-h2" style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Individuelle Ausstattung</h2>
                <p style={{ color: '#64748b', fontSize: 16 }}>Wählen Sie für jede Seite den gewünschten Abschluss.</p>
            </div>

            {/* Glazing per side */}
            {(['left', 'right', 'front'] as const).map(side => (
                <div key={side} style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>{sideLabels[side]}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                        {GLAZING_OPTIONS.map(opt => (
                            <button key={opt.id} onClick={() => setGlazing(side, opt.id)}
                                style={{ borderRadius: 12, overflow: 'hidden', border: state.glazingSides[side] === opt.id ? '2px solid #f97316' : '2px solid #e2e8f0', background: state.glazingSides[side] === opt.id ? '#fff7ed' : '#fafafa', cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'all 0.2s' }}>
                                {opt.image ? (
                                    <div style={{ height: 90, overflow: 'hidden', position: 'relative' }} onClick={e => { e.stopPropagation(); if (opt.image) setGlazingPreview(opt.image); }}>
                                        <img src={opt.image} alt={opt.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>🔍</div>
                                    </div>
                                ) : <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: 32 }}>⬜</div>}
                                <div style={{ padding: '10px 12px' }}>
                                    <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>{opt.label}</p>
                                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{opt.desc}</p>
                                    {opt.tip && <p style={{ fontSize: 10, color: '#f97316', marginTop: 4, fontWeight: 600 }}>💡 {opt.tip}</p>}
                                </div>
                                {state.glazingSides[side] === opt.id && <div style={{ background: '#f97316', color: '#fff', textAlign: 'center', padding: '4px 0', fontSize: 11, fontWeight: 700 }}>✓ Ausgewählt</div>}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Senkrechtmarkise / ZIP Screen */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>🪄 Senkrechtmarkise / ZIP Screen</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Vertikaler Sonnenschutz mit seitlicher Schienenführung — ideal gegen Blendung, Hitze und Wind.</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Seiten auswählen:</p>
                <div className="wiz-grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {(['left', 'right', 'front'] as const).map(side => {
                        const isSelected = state.senkrechtmarkise.sides.includes(side);
                        const label = side === 'left' ? '← Linke Seite' : side === 'right' ? 'Rechte Seite →' : '↓ Vorderseite';
                        return (
                            <button key={side} onClick={() => toggleSenkrecht(side)}
                                style={{ padding: '16px 10px', borderRadius: 14, border: isSelected ? '3px solid #f97316' : '2px solid #cbd5e1', background: isSelected ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : '#f8fafc', cursor: 'pointer', fontWeight: 700, color: isSelected ? '#c2410c' : '#64748b', fontSize: 14, transition: 'all 0.2s', boxShadow: isSelected ? '0 4px 12px rgba(249,115,22,0.2)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 22 }}>{side === 'left' ? '◀' : side === 'right' ? '▶' : '▼'}</span>
                                <span>{label}</span>
                                {isSelected && <span style={{ fontSize: 11, background: '#f97316', color: '#fff', padding: '2px 10px', borderRadius: 20, fontWeight: 800 }}>✓ Ausgewählt</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Markise — Aufdach / Unterdach — HIDDEN for Pergola/Pergola Deluxe */}
            {!['Pergola', 'Pergola Deluxe'].includes(state.model) && (
                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>☀️ Markise (Sonnenschutz)</h3>
                    <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Horizontaler Sonnenschutz auf dem Dach montiert — schützt vor direkter Sonneneinstrahlung und Hitzestau.</p>

                    <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {(['aufdach', 'unterdach'] as const).map(type => {
                            const isNone = !state.markise.type || (state.markise.sides.length === 0 && state.markise.type !== type);
                            const isActive = state.markise.type === type && state.markise.sides.length > 0;
                            return (
                                <button key={type} onClick={() => {
                                    setState(s => {
                                        const wasActive = s.markise.type === type && s.markise.sides.length > 0;
                                        return { ...s, markise: { type, sides: wasActive ? [] : ['roof'] } };
                                    });
                                }}
                                    style={{ borderRadius: 16, overflow: 'hidden', border: isActive ? '3px solid #f97316' : '2px solid #cbd5e1', background: isActive ? '#fff7ed' : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? '0 4px 16px rgba(249,115,22,0.2)' : 'none', textAlign: 'left', padding: 0 }}>
                                    <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                                        <img src={type === 'aufdach' ? '/images/models/markise-aufdach.jpg' : '/images/models/markise-unterdach.jpg'} alt={type === 'aufdach' ? 'Aufdachmarkise' : 'Unterdachmarkise'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {isActive && <div style={{ position: 'absolute', top: 8, right: 8, background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>✓ Gewählt</div>}
                                    </div>
                                    <div style={{ padding: '12px 14px' }}>
                                        <p style={{ fontWeight: 800, fontSize: 16, color: isActive ? '#c2410c' : '#1e293b', marginBottom: 4 }}>{type === 'aufdach' ? 'Aufdachmarkise' : 'Unterdachmarkise'}</p>
                                        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{type === 'aufdach'
                                            ? 'Auf dem Dach montiert — verhindert Aufheizen der Glaseindeckung, spendet Schatten. ZIP-System für straffen Tuchsitz.'
                                            : 'Unter dem Dach montiert — Tuch vor Witterung geschützt, elegante Optik. ZIP-System für Windbeständigkeit.'}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, fontStyle: 'italic' }}>Tipp: Aufdach schützt Glas vor Aufheizen, Unterdach verschmutzt weniger.</p>
                </div>
            )}

            {/* Extras */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>✨ Komfort-Extras</h3>
                <div className="wiz-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button onClick={() => setState(s => ({ ...s, heater: !s.heater }))}
                        style={{ padding: 20, borderRadius: 14, border: state.heater ? '2px solid #f97316' : '2px solid #e2e8f0', background: state.heater ? '#fff7ed' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
                        <div style={{ fontSize: 32 }}>🔥</div>
                        <div><p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Heizstrahler</p><p style={{ fontSize: 12, color: '#94a3b8' }}>Infrarot-Wärmestrahler</p></div>
                    </button>
                    <button onClick={() => setState(s => ({ ...s, led: !s.led }))}
                        style={{ padding: 20, borderRadius: 14, border: state.led ? '2px solid #f97316' : '2px solid #e2e8f0', background: state.led ? '#fff7ed' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
                        <div style={{ fontSize: 32 }}>💡</div>
                        <div><p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>LED-Beleuchtung</p><p style={{ fontSize: 12, color: '#94a3b8' }}>Integrierte LED-Streifen</p></div>
                    </button>
                </div>
            </div>

            {/* Bodenbelag / Flooring */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>🪵 Bodenbelag</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Wünschen Sie einen Terrassenboden? Wählen Sie Ihr bevorzugtes Material.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {FLOORING_OPTIONS.map(opt => {
                        const isSelected = state.flooring === opt.id;
                        return (
                            <button key={opt.id || 'none'} onClick={() => setState(s => ({ ...s, flooring: opt.id }))}
                                style={{ padding: '16px 14px', borderRadius: 14, border: isSelected ? '3px solid #f97316' : '2px solid #cbd5e1', background: isSelected ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : '#f8fafc', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: isSelected ? '0 4px 12px rgba(249,115,22,0.2)' : 'none' }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
                                <p style={{ fontWeight: 700, fontSize: 14, color: isSelected ? '#c2410c' : '#1e293b', marginBottom: 4 }}>{opt.label}</p>
                                <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{opt.desc}</p>
                                {isSelected && opt.id && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, background: '#f97316', color: '#fff', padding: '2px 10px', borderRadius: 20, fontWeight: 800 }}>✓ Ausgewählt</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notes */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>&#128221; Anmerkungen / Sonderwünsche</h3>
                <textarea value={state.notes} onChange={e => setState(s => ({ ...s, notes: e.target.value }))}
                    placeholder="Hier können Sie uns gerne zusätzliche Wünsche oder Anmerkungen mitteilen..."
                    rows={4} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#f97316'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
            </div>

            {/* Photo Upload */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>&#128247; Fotos hinzufügen</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Laden Sie Fotos Ihres Grundstücks, der Hausfassade oder Ihrer Vorstellungen hoch &ndash; das hilft uns, Ihr Projekt besser zu planen.</p>

                <label
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 20px', border: '2px dashed #cbd5e1', borderRadius: 16, cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f97316'; (e.currentTarget as HTMLElement).style.background = '#fff7ed'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'; (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                >
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                        onChange={e => {
                            if (e.target.files) {
                                const newFiles = Array.from(e.target.files);
                                setState(s => ({ ...s, photos: [...s.photos, ...newFiles].slice(0, 10) }));
                            }
                        }}
                    />
                    <div style={{ fontSize: 36 }}>&#x2B06;&#xFE0F;</div>
                    <span style={{ fontWeight: 600, color: '#475569', fontSize: 14 }}>Fotos auswählen oder hierher ziehen</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>JPG, PNG &bull; max. 10 Fotos</span>
                </label>

                {state.photos.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 16 }}>
                        {state.photos.map((file, idx) => (
                            <div key={idx} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', aspectRatio: '1' }}>
                                <img src={URL.createObjectURL(file)} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    onClick={() => setState(s => ({ ...s, photos: s.photos.filter((_, i) => i !== idx) }))}
                                    style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Foto entfernen"
                                >&times;</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ========== STEP 5: SUMMARY WITH VISUALIZATION ==========
const StepSummary: React.FC<{ state: WizardState }> = ({ state }) => {
    const selectedModel = WIZARD_MODELS.find(m => m.id === state.model);
    const glazingLabel = (v: string) => GLAZING_OPTIONS.find(g => g.id === v)?.label || 'Keine';
    const roofLabel = state.roofCovering === 'glass'
        ? (ROOF_GLASS_OPTIONS.find(o => o.id === state.roofVariant)?.label || 'Sicherheitsglas VSG')
        : (ROOF_POLY_OPTIONS.find(o => o.id === state.roofVariant)?.label || 'Polycarbonat 16mm');
    const colorInfo = COLOR_OPTIONS.find(c => c.id === state.color);
    const sLabel = (s: string) => s === 'left' ? 'Links' : s === 'right' ? 'Rechts' : 'Vorne';
    const colorHex = colorInfo?.hex?.startsWith('#') ? colorInfo.hex : '#383E42';
    const rX = 60, rY = 40, rW = 240, rH = 180;

    // Build ProductConfig for 3D visualization
    const vizConfig = useMemo<ProductConfig>(() => {
        // Map wizard IDs → visualizer modelIds
        const modelMap: Record<string, string> = {
            'Orangeline': 'orangestyle', 'Orangeline+': 'orangestyle_plus',
            'Trendline': 'trendstyle', 'Trendline+': 'trendstyle_plus',
            'Topline': 'topstyle', 'Topline XL': 'topstyle_xl',
            'Ultraline': 'ultraline_style',
            'Skyline': 'skyline', 'Designline': 'designline',
            'Pergola': 'pergola_bio', 'Pergola Deluxe': 'pergola_deluxe',
            'Carport': 'carport',
        };
        const roofMap: Record<string, RoofType> = { glass: 'glass', poly: 'polycarbonate' };
        const mountMap: Record<string, InstallationType> = { fundament: 'wall-mounted', pflaster: 'wall-mounted', erdreich: 'freestanding' };

        // Post sizes (meters) per model specs
        const postSizeMap: Record<string, number> = {
            orangestyle: 0.11, orangestyle_plus: 0.11,
            trendstyle: 0.11, trendstyle_plus: 0.11,
            topstyle: 0.149, topstyle_xl: 0.196,
            ultraline_classic: 0.149, ultraline_style: 0.149,
            skyline: 0.149, designline: 0.149,
            carport: 0.11, pergola_bio: 0.149, pergola_deluxe: 0.149,
        };
        // Sparrenhöhe (meters) per model
        const beamHeightMap: Record<string, number> = {
            orangestyle: 0.047, orangestyle_plus: 0.047,
            trendstyle: 0.0475, trendstyle_plus: 0.0575,
            topstyle: 0.0932, topstyle_xl: 0.117,
            ultraline_classic: 0.0932, ultraline_style: 0.0932,
            skyline: 0.0932, designline: 0.0932,
            carport: 0.0475, pergola_bio: 0.0932, pergola_deluxe: 0.0932,
        };

        const resolvedModelId = modelMap[state.model] || state.model.toLowerCase().replace(/\s+/g, '_');

        // Map wizard roof variant to poly type
        const polyTypeMap: Record<string, string> = {
            'poly_klar': 'clear', 'poly_opal': 'opal', 'poly_iq_relax': 'iq-relax',
        };

        return {
            modelId: resolvedModelId,
            width: state.width,
            projection: state.projection,
            color: state.color,
            customColor: state.color === 'Sonderfarbe',
            roofType: roofMap[state.roofCovering] || 'glass',
            installationType: state.installType === 'frei' ? 'freestanding' : 'wall-mounted',
            polycarbonateType: (polyTypeMap[state.roofVariant] || 'opal') as ProductConfig['polycarbonateType'],
            postsHeight: 2500,
            // Build addons from wizard selections
            addons: (() => {
                const addons: ProductConfig['addons'] = [];

                // --- Glazing → slidingWall / fixedWall addons ---
                const glazingToAddon = (type: string, location: 'front' | 'left' | 'right') => {
                    if (!type) return;
                    if (type === 'fest' || type === 'alu_wand') {
                        addons.push({ id: `fixed-${location}`, type: 'fixedWall', name: type === 'alu_wand' ? 'Festwand Aluminium' : 'Festwand Glass', location, price: 0 });
                    } else if (type === 'panoramisch') {
                        addons.push({ id: `slide-${location}`, type: 'slidingWall', name: 'Panoramaschiebewand', location, price: 0 });
                    } else if (type === 'rahmen') {
                        addons.push({ id: `slide-${location}`, type: 'slidingWall', name: 'Schiebetüren mit Rahmen', location, price: 0 });
                    } else if (type === 'lamellen' || type === 'sonnenschutz') {
                        addons.push({ id: `fixed-${location}`, type: 'fixedWall', name: type === 'sonnenschutz' ? 'Sonnenschutzpaneele' : 'Lamellenelemente', location, price: 0 });
                    } else if (type === 'sichtschutz') {
                        addons.push({ id: `fixed-${location}`, type: 'fixedWall', name: 'Sichtschutz Systeme', location, price: 0 });
                    }
                };
                glazingToAddon(state.glazingSides.front, 'front');
                glazingToAddon(state.glazingSides.left, 'left');
                glazingToAddon(state.glazingSides.right, 'right');

                // --- Senkrechtmarkise → ZIP Screen ---
                state.senkrechtmarkise.sides.forEach(side => {
                    addons.push({ id: `zip-${side}`, type: 'zipScreen', name: 'ZIP Screen', location: side as 'front' | 'left' | 'right', price: 0 });
                });

                // --- Markise → Awning (roof-level, not per-side) ---
                if (state.markise.sides.length > 0 && state.markise.type) {
                    addons.push({ id: 'awning-roof', type: 'awning', name: state.markise.type === 'aufdach' ? 'Aufdachmarkise' : 'Unterdachmarkise', location: 'front', price: 0, depth: state.projection });
                }

                // --- Heater ---
                if (state.heater) {
                    addons.push({ id: 'heater-1', type: 'heater', name: 'Heizstrahler', price: 0 });
                }

                // --- LED ---
                if (state.led) {
                    addons.push({ id: 'led-1', type: 'lighting', name: 'LED-Spots', price: 0 });
                }

                return addons;
            })(),
            ledCount: state.led ? 3 : 0,
            // Auto-enable Keilfenster (wedge windows) when Panorama Schiebewand on sides
            sideWedges: state.glazingSides.left === 'panoramisch' || state.glazingSides.right === 'panoramisch',
            productSpecs: {
                postSize: postSizeMap[resolvedModelId] || 0.11,
                beamHeight: beamHeightMap[resolvedModelId] || 0.15,
            },
            contextConfig: {
                hasWall: true,
                wallHeight: 3000,
                wallColor: '#f5f0eb',
                wallMaterial: 'plaster',
                floorMaterial: 'tiles',
                doorPosition: 0,
                showDecor: false,
            },
        };
    }, [state.model, state.width, state.projection, state.color, state.roofCovering, state.roofVariant, state.mountingType, state.glazingSides, state.senkrechtmarkise, state.markise, state.heater, state.led]);

    // Animated CTA arrow — appears after 2s
    const [showArrow, setShowArrow] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShowArrow(true), 2000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 4px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Fast geschafft!</h2>
                <p style={{ color: '#64748b', fontSize: 'clamp(13px, 3vw, 16px)' }}>Überprüfen Sie Ihre Konfiguration und senden Sie sie kostenlos ab.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 3D Visualization — responsive height */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ padding: '12px 16px 6px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: 'clamp(13px, 3vw, 16px)', fontWeight: 700, color: '#1e293b', margin: 0 }}>🏡 3D-Vorschau Ihrer {state.modelDisplayName}</h3>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Drehen und zoomen Sie mit der Maus oder Touch</p>
                    </div>
                    <div style={{ height: 'clamp(260px, 40vw, 380px)', background: 'linear-gradient(180deg, #e8edf5 0%, #d4dbe6 100%)' }}>
                        <Suspense fallback={
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                                <div style={{ width: 40, height: 40, border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <p style={{ color: '#64748b', fontSize: 14 }}>3D-Modell wird geladen...</p>
                            </div>
                        }>
                            <Visualizer3D config={vizConfig} />
                        </Suspense>
                    </div>
                </div>

                <SCard title="📋 Ihre Kontaktdaten" items={[
                    { l: 'Name', v: `${state.customerData.firstName} ${state.customerData.lastName}` },
                    { l: 'E-Mail', v: state.customerData.email },
                    ...(state.customerData.phone ? [{ l: 'Telefon', v: state.customerData.phone }] : []),
                    ...(state.customerData.street ? [{ l: 'Adresse', v: `${state.customerData.street}, ${state.customerData.postalCode} ${state.customerData.city}` }] : []),
                ]} />
                {/* Model + Roof + Color */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 'clamp(12px, 3vw, 20px)', display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 20px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    {selectedModel && <img src={selectedModel.image} alt={selectedModel.name} style={{ width: 'clamp(60px, 15vw, 100px)', height: 'clamp(60px, 15vw, 100px)', borderRadius: 12, objectFit: 'cover' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Ihre Konstruktion</p>
                        <p style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, color: '#1e293b' }}>{state.modelDisplayName}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0f9ff', color: '#0284c7', borderRadius: 6, fontWeight: 600 }}>{roofLabel}</span>
                            {colorInfo && <span style={{ fontSize: 11, padding: '2px 8px', background: '#f1f5f9', color: '#475569', borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorHex, border: '1px solid #d1d5db' }} />{state.color}
                            </span>}
                        </div>
                    </div>
                </div>
                <SCard title="📐 Maße & Montage" items={[
                    { l: 'Breite', v: `${state.width} mm` }, { l: 'Tiefe', v: `${state.projection} mm` },
                    { l: 'Fläche', v: `${((state.width * state.projection) / 1000000).toFixed(1)} m²` },
                    { l: 'Montage', v: state.mountingType === 'fundament' ? 'Betonfundament' : state.mountingType === 'pflaster' ? 'Pflastersteine' : 'Erdreich' },
                    { l: 'Konstruktionsart', v: state.installType === 'frei' ? 'Freistehend' : 'Wandmontage' },
                    ...(state.customerData.snowZone ? [{ l: '❄️ Schneelastzone', v: `Zone ${state.customerData.snowZone}${state.customerData.snowLoad ? ` (${state.customerData.snowLoad} kN/m²)` : ''}` }] : []),
                    ...((state.customerData as any).windZone ? [{ l: '🌬️ Windzone', v: `Zone ${(state.customerData as any).windZone}` }] : []),
                    ...((state.customerData as any).structuralRecommendation ? [{ l: '⚠️ Empfehlung', v: (state.customerData as any).structuralRecommendation }] : []),
                ]} />
                <SCard title="🪟 Verglasung & Sonnenschutz" items={[
                    { l: 'Linke Seite', v: glazingLabel(state.glazingSides.left) },
                    { l: 'Rechte Seite', v: glazingLabel(state.glazingSides.right) },
                    { l: 'Vorderseite', v: glazingLabel(state.glazingSides.front) },
                    ...(state.senkrechtmarkise.sides.length > 0 ? [{ l: 'ZIP Screen', v: state.senkrechtmarkise.sides.map(sLabel).join(', ') }] : []),
                    ...(state.markise.sides.length > 0 ? [{ l: `${state.markise.type === 'aufdach' ? 'Aufdach' : 'Unterdach'}markise`, v: '✓ Gewählt' }] : []),
                    ...(state.heater ? [{ l: 'Heizstrahler', v: '✓ Ja' }] : []),
                    ...(state.led ? [{ l: 'LED-Beleuchtung', v: '✓ Ja' }] : []),
                    ...(state.flooring ? [{ l: 'Bodenbelag', v: FLOORING_OPTIONS.find(f => f.id === state.flooring)?.label || state.flooring }] : []),
                ]} />
                {state.notes && <SCard title="📝 Anmerkungen" items={[{ l: '', v: state.notes }]} />}
                {/* SVG Draufsicht */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 'clamp(12px, 3vw, 20px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ fontSize: 'clamp(13px, 3vw, 16px)', fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🏗️ Draufsicht</h3>
                    <svg viewBox="0 0 360 280" style={{ width: '100%', maxWidth: 400, margin: '0 auto', display: 'block' }}>
                        <rect x={rX - 10} y={rY - 18} width={rW + 20} height={18} rx={3} fill="#94a3b8" />
                        <text x={180} y={rY - 5} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">HAUSWAND</text>
                        <rect x={rX} y={rY} width={rW} height={rH} rx={4} fill={state.roofCovering === 'glass' ? '#e0f2fe' : '#fef3c7'} stroke={colorHex} strokeWidth={3} />
                        {state.roofCovering === 'glass' && [1, 2, 3, 4, 5].map(i => <line key={i} x1={rX + (rW / 6) * i} y1={rY} x2={rX + (rW / 6) * i} y2={rY + rH} stroke={colorHex} strokeWidth={1} opacity={0.25} />)}
                        <rect x={rX} y={rY + rH - 8} width={8} height={8} fill={colorHex} rx={1} />
                        <rect x={rX + rW - 8} y={rY + rH - 8} width={8} height={8} fill={colorHex} rx={1} />
                        {state.glazingSides.left && <rect x={rX - 6} y={rY} width={5} height={rH} rx={2} fill="#38bdf8" opacity={0.6} />}
                        {state.glazingSides.right && <rect x={rX + rW + 1} y={rY} width={5} height={rH} rx={2} fill="#38bdf8" opacity={0.6} />}
                        {state.glazingSides.front && <rect x={rX} y={rY + rH + 1} width={rW} height={5} rx={2} fill="#38bdf8" opacity={0.6} />}
                        {state.senkrechtmarkise.sides.includes('left') && <rect x={rX - 12} y={rY} width={4} height={rH} rx={1} fill="#f97316" opacity={0.7} />}
                        {state.senkrechtmarkise.sides.includes('right') && <rect x={rX + rW + 8} y={rY} width={4} height={rH} rx={1} fill="#f97316" opacity={0.7} />}
                        {state.senkrechtmarkise.sides.includes('front') && <rect x={rX} y={rY + rH + 8} width={rW} height={4} rx={1} fill="#f97316" opacity={0.7} />}
                        <text x={180} y={268} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">{state.width} × {state.projection} mm</text>
                        <text x={180} y={rY + rH / 2 + 4} textAnchor="middle" fontSize="11" fill={colorHex} fontWeight="700" opacity={0.4}>{state.modelDisplayName}</text>
                        <rect x={8} y={250} width={8} height={8} rx={2} fill="#38bdf8" opacity={0.6} /><text x={20} y={257} fontSize="8" fill="#64748b">Verglasung</text>
                        <rect x={80} y={250} width={8} height={8} rx={2} fill="#f97316" opacity={0.7} /><text x={92} y={257} fontSize="8" fill="#64748b">ZIP Screen</text>
                    </svg>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', borderRadius: 16, border: '1px solid #fed7aa', padding: 'clamp(14px, 3vw, 20px)', textAlign: 'center' }}>
                    <p style={{ color: '#92400e', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>🛡️ Kostenlos & unverbindlich</p>
                    <p style={{ color: '#78350f', fontSize: 13, lineHeight: 1.6 }}>Nach Absendung wird sich ein Projektberater bei Ihnen melden,<br />um ein maßgeschneidertes Angebot zu erstellen.</p>
                </div>

                {/* Animated arrow CTA */}
                {showArrow && (
                    <div style={{ textAlign: 'center', padding: '8px 0 60px', animation: 'fadeInUp 0.5s ease-out' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'bounceDown 2s ease-in-out infinite' }}>
                            <p style={{ color: '#16a34a', fontWeight: 700, fontSize: 15, margin: 0 }}>Jetzt kostenlos absenden</p>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M19 12l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes bounceDown { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
                @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
        </div>
    );
};


// ========== SHARED ==========
const WField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#64748b', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#f97316'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
    </div>
);

const SCard: React.FC<{ title: string; items: { l: string; v: string }[] }> = ({ title, items }) => (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>{title}</h3>
        {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{item.l}</span>
                <span style={{ color: '#1e293b', fontWeight: 600, fontSize: 14 }}>{item.v}</span>
            </div>
        ))}
    </div>
);
