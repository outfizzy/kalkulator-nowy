// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { buildOfferEmail } from "./email-template.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * trigger-offer-agent v3 — Claude AI Sales Agent
 * 
 * Claude analyzes each lead, decides whether to:
 *   a) Generate a full offer (data complete)
 *   b) Propose email/SMS to gather missing info
 * 
 * Claude instructs the pricing bots what to configure.
 */

// ===== CLAUDE AI TYPES =====
interface ClaudeAnalysis {
    canMakeOffer: boolean;
    // Customer understanding
    customerProfile: string;
    urgency: 'high' | 'medium' | 'low';
    sentiment: string;
    internalNotes: string;
    // Configuration (when canMakeOffer = true)
    configuration?: {
        width: number;
        depth: number;
        color: string;
        primaryModel: string;
        roofType: string;
        /** Dodatki wymienione WPROST przez klienta (canonical keys):
         *  led, zip_sides, zip_front, markise, heater, panorama_front, panorama_sides, keilfenster */
        extras?: string[];
        /** true tylko gdy klient wprost chce wolnostojącą konstrukcję */
        freestanding?: boolean;
        reasoning: string;
    };
    tierStrategy?: {
        economy: string;
        recommended: string;
        premium: string;
    };
    botInstructions?: {
        skipProducts?: string[];
        preferredModels?: string[];
        colorOverride?: string;
    };
    // Missing info (when canMakeOffer = false)
    missingInfo?: string[];
    proposedEmail?: { subject: string; body: string };
    proposedSMS?: string;
}

// ===== CLAUDE AI BRAIN =====
async function claudeAnalyzeLead(lead: any, customerData: any, notes: string, fairProducts: any[]): Promise<ClaudeAnalysis> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
        console.log('🧠 No ANTHROPIC_API_KEY — falling back to regex');
        return { canMakeOffer: true, customerProfile: '', urgency: 'medium', sentiment: 'unknown', internalNotes: '' };
    }

    const productCatalog = `
PRODUKTY POLENDACH24 (nazwy własne = nazwy dostawców):

DACHY TARASOWE (category: roof, Terrassenüberdachung):
- Orangestyle 10 (=Orangeline u Aluxe): od ~3200€ EK, budżetowy, polycarbonat
- Trendstyle 15 (=Trendline u Aluxe): od ~4500€ EK, najpopularniejszy, poly/glas
- Topstyle 20 (=Topline XL u Aluxe): od ~5500€ EK, grubsze profile, poly/glas
- Skystyle (=Skyline u Aluxe): od ~8000€ EK, flachdach, premium
- Designstyle (=Designline u Aluxe): premium design
- Ultrastyle (=Ultraline u Aluxe): od ~7000€ EK, premium classic/style/compact
- Teranda TR15: alternatywa dla Trendstyle, porównywalna cena

CARPORT (category: carport, TYLKO gdy klient wyraźnie pisze o carport/auto/fahrzeug):
- Carport: aluminiowy carport, od ~3500€ EK, Wandmontage lub Freistehend

PERGOLA (category: pergola, TYLKO gdy klient pisze o pergoli/lamellach):
- Pergola: bioklimatyczna pergola z lamelami, od ~4500€ EK
- Pergola Deluxe: premium wersja pergoli

AKCESORIA:
- Panorama AL23 Schiebewand: szklana ściana przesuwna, ~2000-4000€ EK
- ZIP Screen / Senkrechtmarkise: ochrona przeciwsłoneczna, ~600-1500€ EK
- Markise / Unterdachmarkise: markiza na/pod dachem, ~800-1500€ EK
- LED Spots, LED Stripes, Somfy Smart Home

KOLORY: RAL 7016 (antracyt, default), RAL 9016 (biały), RAL 9005 (czarny), RAL 9006 (srebrny)
WYMIARY: szerokość 3000-12000mm, głębokość 2000-5000mm
MONTAŻ: 1200€/dzień (1 dzień kalkulowany w ofercie wstępnej)
MARŻA: minimum 40% od EK lub min. 2000€

WAŻNE MAPOWANIE primaryModel:
- "Überdachung" / "Terrassenüberdachung" / "Dach" → primaryModel: "trendstyle" (to NIE jest carport!)
- "Carport" / "Stellplatz" / "Fahrzeug" → primaryModel: "carport"
- "Pergola" / "Lamellen" → primaryModel: "pergola"
- Dopuszczalne wartości primaryModel: trendstyle, orangestyle, topstyle, skystyle, designline, ultrastyle, carport, pergola, pergola_deluxe
`;

    const systemPrompt = `Jesteś doświadczonym handlowcem firmy Polendach24 — sprzedajemy aluminiowe zadaszenia tarasowe w Niemczech.

Analizujesz leady klientów. Dostajesz dane z formularza i/lub notatki z maila.

${productCatalog}

ZASADY:
1. canMakeOffer = true ZAWSZE gdy masz wymiary (szerokość × głębokość). Nawet przybliżone wymiary wystarczą!
2. canMakeOffer = true ZAWSZE gdy customerData zawiera configuredWidth i configuredProjection (dane z formularza konfiguracyjnego klienta)
3. canMakeOffer = false TYLKO gdy kompletnie brak wymiarów i nie da się ich wywnioskować
4. NIGDY nie ustawiaj canMakeOffer = false z powodu braku emaila, telefonu, adresu czy kontaktu! Email/telefon NIE SĄ wymagane do wygenerowania oferty.
5. Wymiary ZAWSZE w mm. "7m x 3,5m" = 7000 x 3500mm. "ca. 6x4" = 6000 x 4000mm
6. Domyślny kolor: RAL 7016. Domyślny model: trendstyle (najpopularniejszy)
7. Pisz po niemiecku do klientów (email/SMS), po polsku notatki wewnętrzne
8. Bądź konkretny — nie zadawaj pytań, na które sam możesz odpowiedzieć
9. Email do klienta powinien być profesjonalny, ciepły, ale krótki
10. W tierStrategy opisz DLACZEGO ten model pasuje do tego klienta
11. Jeśli klient wspomina budżet — dostosuj tier strategy
12. KRYTYCZNE — WYMIARY: Gdy klient pisze w notatce/mailu konkretne wymiary (np. "ca. 7m x 3,5m"), ZAWSZE użyj TYCH wymiarów, NIE wartości z formularza konfiguracyjnego. Formularz ma ograniczone opcje (np. max 3000mm głębokości), ale klient pisze czego naprawdę potrzebuje. Wymiary z notatek/maila > wymiary z formularza. Zawsze bierz WIĘKSZY wymiar gdy się różnią.
13. KRYTYCZNE — KATEGORIA: "Überdachung" / "Terrassenüberdachung" = to DACH TARASOWY (primaryModel: "trendstyle"), NIE carport! Carport to WYŁĄCZNIE gdy klient pisze wprost o carporcie/samochodzie/Fahrzeug. Nie myl Terrassenüberdachung z Carport!

14. DACH: Jeśli klient NIE podał typu dachu — ustaw roofType na poliwęglan (najtańsza opcja = najniższa, konkurencyjna cena bazowa), a w tierStrategy ORAZ w mailu wyraźnie zaproponuj szkło VSG jako opcję/upgrade (pokaż obie możliwości). Jeśli klient podał dach — użyj DOKŁADNIE tego.
15. DODATKI (LED, ZIP-Screen, ogrzewanie, markizy, sterowanie): do konfiguracji i CENY BAZOWEJ wliczaj WYŁĄCZNIE te, które klient WPROST wymienił. Zwróć je w configuration.extras jako tablicę z DOKŁADNIE tymi kluczami: "led" (oświetlenie LED), "zip_sides" (Senkrechtmarkise/ZIP po bokach), "zip_front" (ZIP z przodu), "markise" (markiza na/pod dachem), "heater" (Heizstrahler/ogrzewanie), "panorama_front" (Schiebewand/szklana ściana z przodu), "panorama_sides" (szklane ściany po bokach), "keilfenster" (trójkątne okna boczne). Jeśli klient nic nie wymienił — extras = []. Pozostałych NIE wliczaj do ceny — wymień je jako opcjonalne propozycje (Optionen) w tierStrategy i w mailu. Cena bazowa ma być jak najniższa i konkurencyjna (konkurencja często wysyła ofertę bez LED/ZIP). Jeśli klient wprost chce konstrukcji wolnostojącej (freistehend, 4 Pfosten, ohne Wand) — ustaw configuration.freestanding = true.
16. CENA NA POCZĄTKU: w mailu do klienta podaj cenę możliwie najwcześniej — klient najpierw widzi cenę, potem szczegóły i opcje.
17. Domyślne wartości stosuj TYLKO dla pól, których klient nie podał. Wszystko, co klient wprost określił (model, dach, kolor, dodatki, wymiary), zachowaj bez zmian.
Odpowiedz TYLKO jako JSON (bez markdown):`;

    const userMessage = `LEAD DO ANALIZY:

FORMULARZ (customer_data):
${JSON.stringify(customerData, null, 2)}

NOTATKI (z maila/rozmowy):
${notes || '(brak)'}

PRODUKTY Z TARGÓW:
${fairProducts?.length ? JSON.stringify(fairProducts, null, 2) : '(brak)'}

IMIĘ I NAZWISKO: ${lead.first_name || ''} ${lead.last_name || ''}
EMAIL: ${lead.email || customerData?.email || '(brak)'}
TELEFON: ${lead.phone || customerData?.phone || '(brak)'}
ŹRÓDŁO: ${lead.source || 'nieznane'}

Przeanalizuj i zwróć JSON z polami: canMakeOffer, customerProfile, urgency, sentiment, internalNotes, configuration (jeśli canMakeOffer; z polami width, depth, color, primaryModel, roofType, extras[], freestanding, reasoning), tierStrategy (jeśli canMakeOffer), botInstructions (jeśli canMakeOffer), missingInfo (jeśli !canMakeOffer), proposedEmail (jeśli !canMakeOffer), proposedSMS (jeśli !canMakeOffer, opcjonalnie).`;

    try {
        console.log('🧠 Calling Claude AI for lead analysis...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                messages: [
                    { role: 'user', content: userMessage }
                ],
                system: systemPrompt,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`🧠 Claude API error ${response.status}: ${errText.substring(0, 200)}`);
            return { canMakeOffer: true, customerProfile: 'Claude API error — fallback to regex', urgency: 'medium', sentiment: 'unknown', internalNotes: `API Error: ${errText.substring(0, 100)}` };
        }

        const result = await response.json();
        const text = result.content?.[0]?.text || '';
        console.log(`🧠 Claude response (${text.length} chars)`);

        // Parse JSON from Claude response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('🧠 Claude did not return valid JSON');
            return { canMakeOffer: true, customerProfile: 'JSON parse error', urgency: 'medium', sentiment: 'unknown', internalNotes: text.substring(0, 500) };
        }

        const analysis: ClaudeAnalysis = JSON.parse(jsonMatch[0]);
        console.log(`🧠 Claude decision: canMakeOffer=${analysis.canMakeOffer}, urgency=${analysis.urgency}`);
        if (analysis.configuration) {
            console.log(`🧠 Claude config: ${analysis.configuration.width}×${analysis.configuration.depth}mm, ${analysis.configuration.primaryModel}, ${analysis.configuration.color}`);
        }
        if (analysis.missingInfo) {
            console.log(`🧠 Missing info: ${analysis.missingInfo.join(', ')}`);
        }

        return analysis;
    } catch (err) {
        console.error('🧠 Claude error:', err);
        return { canMakeOffer: true, customerProfile: 'Claude call failed — fallback', urgency: 'medium', sentiment: 'unknown', internalNotes: `Error: ${(err as Error).message}` };
    }
}

// ===== CONSTANTS =====
const VAT_RATE = 0.19;
const BASE_INSTALL_COST_EUR = 1200; // 1 day
const APP_URL = 'https://polendach24.app';

// ===== PRODUCT CATALOG =====
interface ProductModel {
    id: string;
    displayName: string;
    supplierName: string;      // Aluxe internal name
    supplier: string;          // aluxe | teranda
    category: 'roof' | 'pergola' | 'carport';
    heroImage: string;
    galleryImages: string[];
    basePricePerSqM: number;   // EUR purchase price per m²
    minPrice: number;
    description: string;
    highlights: string[];
    competitorCompare?: string; // "Vergleichbar mit Teranda X"
}

const PRODUCT_CATALOG: Record<string, ProductModel> = {
    // ── ROOFING ──
    trendstyle: {
        id: 'trendstyle', displayName: 'Trendstyle', supplierName: 'Trendline',
        supplier: 'aluxe', category: 'roof',
        heroImage: '/images/models/trendline.jpg',
        galleryImages: ['/images/models/trendline.jpg', '/images/models/trendline-2.webp', '/images/models/trendline-3.webp', '/images/models/trendline-4.webp'],
        basePricePerSqM: 280, minPrice: 2200,
        description: 'Bewährte Qualität zum besten Preis. Das meistverkaufte Modell für Terrassenüberdachungen.',
        highlights: ['Bewährtes Bestseller-Modell', 'Integrierte Regenrinne', 'Bis 7m Breite ohne Pfosten', 'Statik nach DIN EN 1991'],
        competitorCompare: 'Vergleichbar mit Teranda Trend',
    },
    orangestyle: {
        id: 'orangestyle', displayName: 'Orangestyle', supplierName: 'Orangeline',
        supplier: 'aluxe', category: 'roof',
        heroImage: '/images/models/orangeline.jpg',
        galleryImages: ['/images/models/orangeline.jpg', '/images/models/orangeline-2.webp'],
        basePricePerSqM: 320, minPrice: 2500,
        description: 'Elegante Wintergarten-Optik mit Dachrinnenverkleidung. Perfekt für anspruchsvolle Architektur.',
        highlights: ['Orangerie-Design mit Rundprofilen', 'Verkleidete Dachrinne', 'Edles Erscheinungsbild', 'Perfekt als Wintergarten-Ersatz'],
        competitorCompare: 'Premium-Alternative zu Teranda Living',
    },
    skystyle: {
        id: 'skystyle', displayName: 'Skystyle', supplierName: 'Skyline',
        supplier: 'aluxe', category: 'roof',
        heroImage: '/images/models/skyline.jpg',
        galleryImages: ['/images/models/skyline.jpg', '/images/models/skyline-2.jpg', '/images/models/skyline-3.jpg', '/images/models/skyline-4.jpg'],
        basePricePerSqM: 380, minPrice: 3200,
        description: 'Minimalistisches Flachdach-Design mit maximaler Lichtdurchlässigkeit. Architektur-Statement.',
        highlights: ['Flachdach-Optik (nur 3° Neigung)', 'Maximaler Lichteinfall', 'Modernes, minimalistisches Design', 'Architekten-Favorit'],
        competitorCompare: 'Design-Alternative zu Deponti Piazza',
    },
    topstyle: {
        id: 'topstyle', displayName: 'Topstyle', supplierName: 'Topline',
        supplier: 'aluxe', category: 'roof',
        heroImage: '/images/models/topline.jpg',
        galleryImages: ['/images/models/topline.jpg', '/images/models/topline-2.webp', '/images/models/topline-3.webp', '/images/models/topline-4.webp'],
        basePricePerSqM: 340, minPrice: 2800,
        description: 'Das Premium-Dach mit extra verstärkten Profilen. Für große Spannweiten und hohe Schneelasten.',
        highlights: ['Extra verstärkte Profile', 'Bis 10m Breite möglich', 'Für hohe Schneelasten geeignet', 'Premium-Rinnendesign'],
        competitorCompare: 'Vergleichbar mit Teranda Excellence',
    },
    designline: {
        id: 'designline', displayName: 'Designline', supplierName: 'Designline',
        supplier: 'aluxe', category: 'roof',
        heroImage: '/images/models/designline.jpg',
        galleryImages: ['/images/models/designline.jpg', '/images/models/designline-2.webp', '/images/models/designline-3.webp'],
        basePricePerSqM: 360, minPrice: 3000,
        description: 'Design-Ikone mit klaren Linien. Für architektonisch anspruchsvolle Projekte.',
        highlights: ['Puristisches Design', 'Verdeckte Befestigung', 'Klare Linienführung', 'Award-Winning Design'],
    },
    // ── PERGOLA ──
    pergola: {
        id: 'pergola', displayName: 'Pergola', supplierName: 'Pergola',
        supplier: 'aluxe', category: 'pergola',
        heroImage: '/images/models/pergola.jpg',
        galleryImages: ['/images/models/pergola.jpg'],
        basePricePerSqM: 450, minPrice: 4500,
        description: 'Bioklimatische Lamellen-Pergola. Stufenlos regulierbarer Sonnenschutz mit Regenschutzfunktion.',
        highlights: ['Drehbare Aluminium-Lamellen', 'Regen- und Sonnenschutz in Einem', 'Motorisiert mit Fernbedienung', 'Freistehend oder wandmontiert'],
        competitorCompare: 'Vergleichbar mit Teranda Nuun / Deponti Arco',
    },
    pergola_deluxe: {
        id: 'pergola_deluxe', displayName: 'Pergola Deluxe', supplierName: 'Pergola Deluxe',
        supplier: 'aluxe', category: 'pergola',
        heroImage: '/images/models/pergola-deluxe.jpg',
        galleryImages: ['/images/models/pergola-deluxe.jpg'],
        basePricePerSqM: 550, minPrice: 5500,
        description: 'Die Premium-Pergola mit erweiterten Funktionen und edlem Design.',
        highlights: ['Premium-Lamellendesign', 'Integrierte LED-Beleuchtung', 'Erweiterte Regenschutzfunktion', 'Hochwertige Pulverbeschichtung'],
    },
    // ── CARPORT ──
    carport: {
        id: 'carport', displayName: 'Carport', supplierName: 'Carport',
        supplier: 'aluxe', category: 'carport',
        heroImage: '/images/models/carport.jpg',
        galleryImages: ['/images/models/carport-2.jpg', '/images/models/carport-3.jpg', '/images/models/carport-4.jpg'],
        basePricePerSqM: 350, minPrice: 3500,
        description: 'Eleganter Aluminium-Carport. Schutz für Ihr Fahrzeug in Premium-Qualität.',
        highlights: ['Wetterfestes Aluminium', 'Freistehend oder anliegend', 'Integrierte Regenrinne', 'Einfache Baugenehmigung'],
        competitorCompare: 'Premium-Alternative zu Standard-Stahl-Carports',
    },
};

// ===== CROSS-MODEL SUGGESTIONS =====
// When customer asks for X, also suggest Y and Z
const MODEL_CROSS_SUGGESTIONS: Record<string, string[]> = {
    // Roofing → suggest alternatives
    trendstyle: ['orangestyle', 'skystyle'],
    orangestyle: ['trendstyle', 'topstyle'],
    skystyle: ['trendstyle', 'designline'],
    topstyle: ['trendstyle', 'orangestyle'],
    designline: ['skystyle', 'topstyle'],
    // Pergola → suggest flat roof alternative
    pergola: ['skystyle', 'trendstyle'],
    pergola_deluxe: ['pergola', 'skystyle'],
    // Carport → suggest basic roof
    carport: ['trendstyle', 'topstyle'],
    // Generic "roof" → main lineup
    roof: ['trendstyle', 'orangestyle', 'skystyle'],
};

// ===== EXTRAS CATALOG =====
interface ExtraDef { nameDE: string; descriptionDE: string; priceEUR: number; }
const EXTRAS_CATALOG: Record<string, ExtraDef> = {
    led_spots: { nameDE: 'LED-Spotbeleuchtung', descriptionDE: 'Warmweiß 3000K, dimmbar', priceEUR: 350 },
    led_strips: { nameDE: 'LED-Lichtleisten', descriptionDE: 'Indirekte Beleuchtung in Rinne', priceEUR: 280 },
    zip_screen_1: { nameDE: 'ZIP-Senkrechtmarkise (1×)', descriptionDE: 'Windstabiler Textilscreen', priceEUR: 1200 },
    zip_screen_2: { nameDE: 'ZIP-Senkrechtmarkisen (2×)', descriptionDE: 'Seitlicher Wetterschutz', priceEUR: 2200 },
    zip_screen_3: { nameDE: 'ZIP-Senkrechtmarkisen (3×)', descriptionDE: 'Kompletter Wetterschutz', priceEUR: 3100 },
    somfy_motor: { nameDE: 'Somfy io Motorsteuerung', descriptionDE: 'Elektrisch + Fernbedienung', priceEUR: 450 },
    somfy_io: { nameDE: 'Somfy io Smart-Home', descriptionDE: 'App-Steuerung + Alexa/Google', priceEUR: 650 },
    heater: { nameDE: 'Infrarot-Heizstrahler 2×1.500W', descriptionDE: 'Für gemütliche Abende', priceEUR: 890 },
    glass_sliding: { nameDE: 'Glas-Schiebewände', descriptionDE: 'Rahmenlose Verglasung', priceEUR: 2800 },
};

// Extras per tier per category
const TIER_EXTRAS: Record<string, Record<string, string[]>> = {
    roof: {
        economy: [],
        recommended: ['led_spots', 'zip_screen_1', 'somfy_motor'],
        premium: ['led_spots', 'led_strips', 'zip_screen_2', 'somfy_io', 'heater'],
    },
    pergola: {
        economy: [],
        recommended: ['led_spots', 'somfy_motor', 'zip_screen_1'],
        premium: ['led_spots', 'led_strips', 'zip_screen_3', 'somfy_io', 'heater'],
    },
    carport: {
        economy: [],
        recommended: ['led_strips', 'somfy_motor'],
        premium: ['led_spots', 'led_strips', 'somfy_io'],
    },
};

// ===== TIER MARGIN CONFIG =====
const MIN_MARGIN_PERCENT = 40;
const MIN_MARGIN_EUR = 2000;
const TIER_MARGINS = { economy: 40, recommended: 40, premium: 40 };
const TIER_LABELS = {
    economy: { label: 'Economy', tagline: 'Solide Grundausstattung zum besten Preis' },
    recommended: { label: 'Empfohlen', tagline: 'Unser beliebtestes Paket — Komfort & Qualität' },
    premium: { label: 'Premium', tagline: 'Komplettausstattung für höchsten Komfort' },
};

// ===== SMART DATA EXTRACTION =====
interface ParsedLeadData {
    customerName: string;
    email: string;
    phone: string;
    city: string;
    postalCode: string;
    address: string;
    width: number;
    depth: number;
    color: string;
    primaryModelId: string;
    alternativeModelIds: string[];
    productCategory: 'roof' | 'pergola' | 'carport';
    freestanding: boolean;
    wallMounted: boolean;
    roofType: string; // glass, polycarbonate
    /** true tylko gdy klient FAKTYCZNIE określił pokrycie (konfigurator/notatki/Claude) — default nie liczy się jako życzenie */
    roofTypeExplicit: boolean;
    /** Dodatki wymienione wprost: led, zip_sides, zip_front, markise, heater, panorama_front, panorama_sides, keilfenster */
    requestedExtras: string[];
    extraNotes: string;
}

const VALID_EXTRAS = ['led', 'zip_sides', 'zip_front', 'markise', 'heater', 'panorama_front', 'panorama_sides', 'keilfenster'];

function extractLeadData(customerData: any, notes: string, fairProducts?: any[]): ParsedLeadData {
    const cd = customerData || {};
    const text = `${notes || ''} ${JSON.stringify(cd)}`.toLowerCase();
    
    const result: ParsedLeadData = {
        customerName: `${cd.firstName || ''} ${cd.lastName || ''}`.trim(),
        email: cd.email || '',
        phone: cd.phone || '',
        city: cd.city || cd.ort || '',
        postalCode: cd.postalCode || cd.plz || '',
        address: cd.address || cd.street || '',
        width: 0,
        depth: 0,
        color: 'RAL 7016',
        primaryModelId: 'trendstyle',
        alternativeModelIds: [],
        productCategory: 'roof',
        freestanding: false,
        wallMounted: true,
        roofType: 'glass',
        roofTypeExplicit: false,
        requestedExtras: [],
        extraNotes: '',
    };

    // ══════════════════════════════════════════════════════════════════
    // PRIORITY 1: Configurator form fields (most reliable source)
    // These come from the interactive configurator the customer filled in
    // ══════════════════════════════════════════════════════════════════
    if (cd.configuredWidth && cd.configuredWidth > 0) {
        result.width = cd.configuredWidth;
    }
    if (cd.configuredProjection && cd.configuredProjection > 0) {
        result.depth = cd.configuredProjection;
    }
    if (cd.configuredColor) {
        result.color = cd.configuredColor;
    }
    if (cd.configuredModel) {
        const modelMap: Record<string, string> = {
            'trendstyle': 'trendstyle', 'trendline': 'trendstyle',
            'orangestyle': 'orangestyle', 'orangeline': 'orangestyle',
            'skystyle': 'skystyle', 'skyline': 'skystyle',
            'topstyle': 'topstyle', 'topline': 'topstyle',
            'designline': 'designline',
            'pergola': 'pergola', 'pergola deluxe': 'pergola_deluxe',
            'carport': 'carport',
        };
        const normalized = cd.configuredModel.toLowerCase().trim();
        result.primaryModelId = modelMap[normalized] || result.primaryModelId;
    }
    if (cd.configuredRoofCovering) {
        const rc = cd.configuredRoofCovering.toLowerCase();
        if (rc.includes('poly') || rc.includes('opal') || rc.includes('klar') || rc.includes('steg')) {
            result.roofType = 'polycarbonate';
            result.roofTypeExplicit = true;
        } else if (rc.includes('glas') || rc.includes('glass')) {
            result.roofType = 'glass';
            result.roofTypeExplicit = true;
        }
    }
    if (cd.configuredInstallType) {
        const it = cd.configuredInstallType.toLowerCase();
        if (it.includes('frei') || it.includes('fundament')) {
            result.freestanding = true;
            result.wallMounted = false;
        }
    }
    if (cd.configuredRoofVariant) {
        const rv = cd.configuredRoofVariant.toLowerCase();
        if (rv.includes('opal') || rv.includes('poly') || rv.includes('klar')) {
            result.roofType = 'polycarbonate';
            result.roofTypeExplicit = true;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PRIORITY 2: Notes / email text (regex extraction as fallback)
    // Only parse if configurator didn't provide dimensions
    // ══════════════════════════════════════════════════════════════════
    const allText = notes || '';
    
    // ── DIMENSIONS from notes (only if not already set from configurator) ──
    if (result.width <= 0 || result.depth <= 0) {
        const dimPatterns = [
            /(\d{3,5})\s*[x×*]\s*(\d{3,5})\s*(?:mm)?/i,             // 6000x4000, 6000*4000
            /(\d{1,2})[,.]?(\d{0,2})\s*[x×*]\s*(\d{1,2})[,.]?(\d{0,2})\s*m/i, // 6x4m, 6,5x4m
            /ca\.?\s*(\d{1,2})[,.]?(\d{0,2})\s*m?\s*[x×*]\s*(\d{1,2})[,.]?(\d{0,2})\s*m?/i, // ca. 7m x 3,5m
            /(\d{1,2})[,.](\d{1,2})\s*[x×*]\s*(\d{1,2})[,.](\d{1,2})/i, // 6.0x4.0
            /breite[:\s]*(\d{3,5})/i,                                // Breite: 6000
            /tiefe[:\s]*(\d{3,5})/i,                                 // Tiefe: 4000
            /(?:b|breite|width)[:\s]*(\d{1,2})[,.]?(\d{0,2})\s*m/i,  // B: 6m
            /(\d{1,2})[,.]?(\d{0,2})\s*m?\s*(?:breit|lang|wide)/i,   // 6m breit
            /wymiar[yi]?[:\s]*(\d{3,5})\s*[x×*]\s*(\d{3,5})/i,      // Wymiary: 6000x4000
        ];
        
        for (const pattern of dimPatterns) {
            const match = allText.match(pattern);
            if (match) {
                if (match[3] && match[4] !== undefined) {
                    const w = parseFloat(`${match[1]}.${match[2] || '0'}`);
                    const d = parseFloat(`${match[3]}.${match[4] || '0'}`);
                    if (result.width <= 0) result.width = w < 20 ? Math.round(w * 1000) : Math.round(w);
                    if (result.depth <= 0) result.depth = d < 20 ? Math.round(d * 1000) : Math.round(d);
                } else {
                    if (result.width <= 0) {
                        result.width = parseInt(match[1]);
                        if (result.width < 20) result.width *= 1000;
                    }
                    if (result.depth <= 0 && match[2]) {
                        result.depth = parseInt(match[2]);
                        if (result.depth > 0 && result.depth < 20) result.depth *= 1000;
                    }
                }
                if (result.width > 0 && result.depth > 0) break;
            }
        }
        
        // Fix likely cm→mm errors: values 100-999 are probably cm, not mm
        // e.g. "750*300mm" → probably 7500×3000mm
        if (result.width >= 100 && result.width < 1000) {
            console.log(`🤖 [extract] Dimension looks like cm, converting: ${result.width}cm → ${result.width * 10}mm`);
            result.width *= 10;
        }
        if (result.depth >= 100 && result.depth < 1000) {
            console.log(`🤖 [extract] Dimension looks like cm, converting: ${result.depth}cm → ${result.depth * 10}mm`);
            result.depth *= 10;
        }
    }

    // ── OVERRIDE depth from notes if configurator value seems wrong ──
    // Customer notes ("7m x 3,5m") take priority over configurator projection
    // when they specify larger dimensions (customer may have misconfigured)
    const notesDimMatch = allText.match(/ca\.?\s*(\d{1,2})[,.]?(\d{0,2})\s*m?\s*[x×]\s*(\d{1,2})[,.]?(\d{0,2})\s*m?/i);
    if (notesDimMatch) {
        const notesW = parseFloat(`${notesDimMatch[1]}.${notesDimMatch[2] || '0'}`);
        const notesD = parseFloat(`${notesDimMatch[3]}.${notesDimMatch[4] || '0'}`);
        const noteWidthMM = notesW < 20 ? Math.round(notesW * 1000) : Math.round(notesW);
        const noteDepthMM = notesD < 20 ? Math.round(notesD * 1000) : Math.round(notesD);
        // If notes depth > configurator depth, use notes (customer likely meant larger)
        if (noteDepthMM > result.depth && noteDepthMM > 0) {
            console.log(`🤖 [extract] Overriding depth from notes: ${result.depth} → ${noteDepthMM}mm (notes: "ca. ${notesW}x${notesD}m")`);
            result.depth = noteDepthMM;
        }
        if (noteWidthMM > result.width && noteWidthMM > 0) {
            console.log(`🤖 [extract] Overriding width from notes: ${result.width} → ${noteWidthMM}mm`);
            result.width = noteWidthMM;
        }
    }
    
    // Defaults if no dimensions found
    if (result.width <= 0) result.width = 5000;
    if (result.depth <= 0) result.depth = 3500;

    // ══════════════════════════════════════════════════════════════════
    // NORMALIZE: wider dimension = width, narrower = depth
    // Customers write "3×5m" or "5×3m" — the wider one is always Breite
    // ══════════════════════════════════════════════════════════════════
    if (result.width > 0 && result.depth > 0 && result.depth > result.width) {
        console.log(`🤖 [extract] Swapping dims: ${result.width}×${result.depth} → ${result.depth}×${result.width} (wider=width)`);
        const tmp = result.width;
        result.width = result.depth;
        result.depth = tmp;
    }

    // ── COLOR (only if not set from configurator) ──
    if (!cd.configuredColor) {
        const colorMatch = text.match(/ral\s*(\d{4})/i);
        if (colorMatch) {
            result.color = `RAL ${colorMatch[1]}`;
        } else if (text.includes('weiß') || text.includes('white') || text.includes('biał')) {
            result.color = 'RAL 9016';
        } else if (text.includes('silber') || text.includes('silver') || text.includes('srebrn')) {
            result.color = 'RAL 9006';
        }
    }

    // Wintergarten detection — separate from model, it's an enclosure style.
    // ZAWSZE liczona, ale TYLKO z treści od klienta (notatki + pola tekstowe) —
    // NIE z JSON.stringify(cd), bo techniczne id typu 'panorama-schiebewand'
    // w standaloneProducts robiły false positive dla zwykłej Schiebewand.
    // NOTE: 80% of "Wintergarten" requests actually want Terrassenüberdachung + Panorama AL23
    const wintergartenKeywords = /wintergarten|kaltwintergarten|warmwintergarten|geschlossen|rundherum.*glas|rundum.*vergl|schiebew[aä]nd|schiebetür|glasschieb|3\s*seiten.*glas|seiten.*geschloss/i;
    const customerText = `${notes || ''} ${cd.configuredNotes || ''} ${cd.message || ''} ${cd.wishes || ''}`.toLowerCase();
    const isWintergarten = wintergartenKeywords.test(customerText);

    // ── PRODUCT DETECTION (only if not set from configurator) ──
    if (!cd.configuredModel) {
        // Check fair products first
        if (fairProducts && fairProducts.length > 0) {
            const fp = fairProducts[0];
            if (fp.type === 'pergola') {
                result.primaryModelId = 'pergola';
                result.productCategory = 'pergola';
            } else if (fp.type === 'carport') {
                result.primaryModelId = 'carport';
                result.productCategory = 'carport';
            }
            if (fp.width) result.width = fp.width;
            if (fp.depth || fp.projection) result.depth = fp.depth || fp.projection;
        }

        const productKeywords: [RegExp, string, 'roof' | 'pergola' | 'carport'][] = [
            [/pergola\s*deluxe/i, 'pergola_deluxe', 'pergola'],
            [/pergol[ae]/i, 'pergola', 'pergola'],
            [/lamellen(?:dach)?/i, 'pergola', 'pergola'],
            [/bioklimat/i, 'pergola', 'pergola'],
            [/carport/i, 'carport', 'carport'],
            [/skystyle|skyline|flachdach/i, 'skystyle', 'roof'],
            [/orangestyle|orangeline|orangeri/i, 'orangestyle', 'roof'],
            [/topstyle|topline/i, 'topstyle', 'roof'],
            [/designline/i, 'designline', 'roof'],
            [/ultrastyle|ultraline/i, 'trendstyle', 'roof'],
            [/trendstyle|trendline/i, 'trendstyle', 'roof'],
            [/pavillon/i, 'trendstyle', 'roof'],  // Pavillon = freistehende Überdachung
            [/terassen|terrasse|überdachung|zadasz|dach/i, 'trendstyle', 'roof'],
        ];
        
        for (const [regex, modelId, category] of productKeywords) {
            if (regex.test(text)) {
                result.primaryModelId = modelId;
                result.productCategory = category;
                break;
            }
        }
        
        // "Pavillon" always means freistehend
        if (/pavillon/i.test(text)) {
            result.freestanding = true;
            result.wallMounted = false;
        }
        
        // If wintergarten detected but no specific model, default to trendstyle roof
        if (isWintergarten && !result.primaryModelId) {
            result.primaryModelId = 'trendstyle';
            result.productCategory = 'roof';
        }
    }

    // Store wintergarten flag — niezależnie od tego, czy konfigurator był wypełniony
    (result as any).wantsWintergarten = isWintergarten;
    if (isWintergarten) {
        console.log(`🏠 Wintergarten detected! Will include panorama glass walls on all sides.`);
    }

    // ── PRODUCT CATEGORY from modelId ──
    if (['pergola', 'pergola_deluxe'].includes(result.primaryModelId)) {
        result.productCategory = 'pergola';
    } else if (result.primaryModelId === 'carport') {
        result.productCategory = 'carport';
    }

    // ── CROSS-MODEL ALTERNATIVES ──
    result.alternativeModelIds = MODEL_CROSS_SUGGESTIONS[result.primaryModelId] || [];

    // ── ROOF TYPE (from notes, only if not set from configurator) ──
    if (!cd.configuredRoofCovering && !cd.configuredRoofVariant) {
        if (text.includes('polycarb') || text.includes('stegplat') || text.includes('poliwęg')) {
            result.roofType = 'polycarbonate';
            result.roofTypeExplicit = true;
        } else if (/glasdach|echtglas|vsg|dach\s*(aus|mit)\s*glas|glas(eindeckung|dach)/i.test(text)) {
            result.roofType = 'glass';
            result.roofTypeExplicit = true;
        }
    }
    
    // ── FREESTANDING (from notes, only if not set from configurator) ──
    if (!cd.configuredInstallType) {
        if (/freisteh|wolnost|freestanding|4\s*pfosten|4\s*słup|ohne\s*wand|fundament/i.test(text)) {
            result.freestanding = true;
            result.wallMounted = false;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // CLAMP DIMENSIONS for product-specific constraints
    // ══════════════════════════════════════════════════════════════════
    if (result.productCategory === 'pergola') {
        // Pergola constraints (match CATEGORY_LIMITS in bot-pricing-orchestrator)
        // Width: 3000-7000mm, Depth: 3000-5000mm, single module max 4000mm (auto-splits)
        if (result.width > 7000) {
            console.log(`🤖 [extract] Pergola width clamped: ${result.width} → 7000mm (max)`);
            result.width = 7000;
        }
        if (result.depth > 5000) {
            console.log(`🤖 [extract] Pergola depth clamped: ${result.depth} → 5000mm (max)`);
            result.depth = 5000;
        }
        if (result.width < 3000) result.width = 3000;
        if (result.depth < 3000) result.depth = 3000;
        // Pergola is always freistehend by default
        result.freestanding = true;
        result.wallMounted = false;
    }

    if (result.productCategory === 'roof') {
        // Roof products: min 2000mm, max 12000mm width, max 6000mm depth
        if (result.width > 12000) {
            console.log(`🤖 [extract] Roof width clamped: ${result.width} → 12000mm (max)`);
            result.width = 12000;
        }
        if (result.depth > 6000) {
            console.log(`🤖 [extract] Roof depth clamped: ${result.depth} → 6000mm (max)`);
            result.depth = 6000;
        }
    }

    if (result.productCategory === 'carport') {
        // Carport min 2500mm width, max 9000mm width, depth 3000-7000mm
        if (result.width < 2500) result.width = 2500;
        if (result.depth < 3000) result.depth = 3000;
    }

    // ══════════════════════════════════════════════════════════════════
    // REQUESTED EXTRAS — dodatki wymienione WPROST przez klienta.
    // Źródła: pola konfiguratora (merge z lead_configurations) + notatki.
    // Trafiają do KAŻDEGO pakietu (zasada 15 promptu / spec §1).
    // ══════════════════════════════════════════════════════════════════
    const extras = new Set<string>();
    const isYes = (v: any) => {
        if (v === true) return true;
        if (typeof v === 'string') {
            const s = v.toLowerCase().trim();
            return s.length > 0 && !['nein', 'no', 'ohne', 'false', '0', 'keine', 'brak', 'nie'].includes(s);
        }
        return typeof v === 'number' && v > 0;
    };
    // Konfigurator (te pola były dotąd zapisywane, ale nigdzie nie czytane)
    if (isYes(cd.configuredLed)) extras.add('led');
    if (isYes(cd.configuredZipScreen) || isYes(cd.configuredSenkrechtmarkise)) extras.add('zip_sides');
    if (isYes(cd.configuredMarkise)) extras.add('markise');
    if (isYes(cd.configuredHeater)) extras.add('heater');
    if (isYes(cd.configuredGlazing)) extras.add('panorama_front');
    // Notatki / mail (fallback regex) — UWAGA: tylko na notatkach (allText), NIE na `text`,
    // bo `text` zawiera JSON.stringify(customerData) i klucze typu "configuredZipScreen"
    // / "configuredMarkise" matchowałyby regexy dla KAŻDEGO leada z konfiguratora.
    const notesText = allText.toLowerCase();
    if (/\bled\b|beleuchtung|oświetlen/i.test(notesText)) extras.add('led');
    const notesNoSenk = notesText.replace(/senkrechtmarkise/gi, '');
    if (/senkrechtmarkise|zip[\s-]?screen/i.test(notesText)) extras.add('zip_sides');
    if (/markise|markiza/i.test(notesNoSenk)) extras.add('markise');
    if (/heizstrahler|heizung|infrarot|ogrzewani/i.test(notesText)) extras.add('heater');
    if (/keilfenster|dreiecksfenster/i.test(notesText)) extras.add('keilfenster');
    // Schiebewand/panorama: przy Wintergarten flaga obejmuje pełną zabudowę — nie dublujemy
    if (!isWintergarten && /schiebewand|schiebeverglasung|panorama|glasschieb/i.test(notesText)) extras.add('panorama_front');
    // Dachy PŁASKIE nie mają osobnej ścieżki Wintergarten w orchestratorze —
    // tam pełna zabudowa idzie kanałem requestedExtras (propagacja do każdego pakietu)
    if (isWintergarten && ['skystyle', 'ultrastyle'].includes(result.primaryModelId)) {
        extras.add('panorama_front');
        extras.add('panorama_sides');
    }
    result.requestedExtras = Array.from(extras);
    if (result.requestedExtras.length > 0) {
        console.log(`🎯 [extract] Kunden-Extras: ${result.requestedExtras.join(', ')}`);
    }

    console.log(`🤖 [extract] Final: ${result.primaryModelId} (${result.productCategory}) ${result.width}×${result.depth}mm, ${result.freestanding ? 'freistehend' : 'wandmontage'}, ${result.roofType}${result.roofTypeExplicit ? ' (explizit)' : ' (default)'}`);

    // ── EXTRACT RELEVANT NOTES ──
    const lines = allText.split('\n').filter(l => l.trim().length > 10);
    const relevantLines = lines.filter(l => {
        const lower = l.toLowerCase();
        return lower.includes('interes') || lower.includes('möchte') || lower.includes('wünsch') ||
               lower.includes('suche') || lower.includes('chciał') || lower.includes('potrzeb') ||
               lower.includes('anfrage') || lower.includes('zapytanie');
    });
    result.extraNotes = relevantLines.slice(0, 3).join(' ').substring(0, 300);

    return result;
}

// ===== GENERATE MULTI-MODEL OFFER =====
interface OfferVariant {
    id: string;
    tier: 'economy' | 'recommended' | 'premium';
    label: string;
    tagline: string;
    modelId: string;
    modelName: string;
    modelDescription: string;
    modelHighlights: string[];
    heroImage: string;
    galleryImages: string[];
    competitorCompare?: string;
    features: { name: string; included: boolean; highlight?: boolean }[];
    extras: { name: string; description?: string; priceEUR: number }[];
    dimensions: string;
    width: number;
    projection: number;
    color: string;
    priceNetEUR: number;
    priceGrossEUR: number;
    installationDays: number;
    installationCostEUR: number;
    totalNetEUR: number;
    totalGrossEUR: number;
    marginPercent: number;
    pricing: { sellingPriceNet: number; sellingPriceGross: number; currency: string };
}

// ===== LIVE PRICING FROM HETZNER WORKER =====
interface LivePricingResponse {
    liveQuotes: { supplier: string; product: string; price: number | null; success: boolean; source: string; confidence: number; category: string }[];
    packages: { id: string; nameDE: string; purchaseNetto: number; customerNetto: number; customerBrutto: number; marginPercent: number; items: any[] }[];
    totalDurationMs: number;
}

async function fetchLivePrices(parsed: ParsedLeadData): Promise<LivePricingResponse> {
    const workerUrl = Deno.env.get('PRICING_WORKER_URL');
    const workerKey = Deno.env.get('PRICING_WORKER_API_KEY');
    if (!workerUrl) {
        throw new Error('PRICING_WORKER_URL not configured — cannot generate offer without live pricing');
    }

    console.log(`🏭 Fetching live prices from worker: ${workerUrl}/api/offer-agent`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout

    let response: Response;
    try {
        response = await fetch(`${workerUrl}/api/offer-agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerKey || 'polendach24-dev'}`,
            },
            body: JSON.stringify({
                customerName: parsed.customerName,
                width: parsed.width,
                depth: parsed.depth,
                color: parsed.color?.replace('RAL ', '') || '7016',
                roofType: 'both', // Always price both covers for tier differentiation
                customerPreferredCover: parsed.roofType || 'glass', // What the customer actually asked for
                postalCode: parsed.postalCode,
                productCategory: parsed.productCategory,
                primaryModelId: parsed.primaryModelId,
            }),
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeout);
        throw new Error(`Pricing Worker unreachable (${workerUrl}): ${(err as Error).message}`);
    }
    clearTimeout(timeout);

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Pricing Worker error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const result = await response.json() as LivePricingResponse;
    const successCount = result.liveQuotes?.filter(q => q.success)?.length || 0;
    console.log(`🏭 Live pricing done: ${successCount} prices in ${(result.totalDurationMs / 1000).toFixed(1)}s`);
    
    if (!result.packages || result.packages.length === 0) {
        throw new Error(`Pricing Worker returned no packages (${successCount} quotes succeeded)`);
    }
    
    return result;
}

async function generateMultiModelOffer(parsed: ParsedLeadData): Promise<OfferVariant[]> {
    const variants: OfferVariant[] = [];
    const dims = `${parsed.width.toLocaleString('de-DE')} × ${parsed.depth.toLocaleString('de-DE')} mm`;

    // ── Get live pricing from Hetzner worker (REQUIRED) ──
    const livePricing = await fetchLivePrices(parsed);
    console.log(`🏭 Using LIVE prices from worker (${livePricing.packages.length} packages)`);

    // Helper: extract roof model name from worker package items
    const extractRoofModel = (pkg: typeof livePricing.packages[0]) => {
        const roofItem = pkg.items?.find((i: any) => i.category === 'roof');
        return roofItem?.name || null;
    };

    // Helper: find matching ProductModel from catalog by name
    const findCatalogModel = (roofName: string | null): typeof PRODUCT_CATALOG[keyof typeof PRODUCT_CATALOG] | null => {
        if (!roofName) return null;
        const lower = roofName.toLowerCase();
        for (const [, model] of Object.entries(PRODUCT_CATALOG)) {
            if (lower.includes(model.displayName.toLowerCase()) || lower.includes(model.supplierName.toLowerCase())) {
                return model;
            }
        }
        // Fuzzy match
        if (lower.includes('orangestyle') || lower.includes('orangeline')) return PRODUCT_CATALOG.orangestyle;
        if (lower.includes('trendstyle') || lower.includes('trendline')) return PRODUCT_CATALOG.trendstyle;
        if (lower.includes('topstyle') || lower.includes('topline')) return PRODUCT_CATALOG.topstyle;
        if (lower.includes('skystyle') || lower.includes('skyline')) return PRODUCT_CATALOG.skystyle;
        if (lower.includes('ultrastyle') || lower.includes('ultraline')) return PRODUCT_CATALOG.ultrastyle;
        if (lower.includes('designstyle') || lower.includes('designline')) return PRODUCT_CATALOG.designline;
        if (lower.includes('teranda') || lower.includes('tr15')) return PRODUCT_CATALOG.trendstyle; // closest match
        if (lower.includes('carport')) return PRODUCT_CATALOG.carport;
        if (lower.includes('pergola')) return PRODUCT_CATALOG.pergola;
        return null;
    };

    // Build variants DIRECTLY from worker packages
    for (const pkg of livePricing.packages) {
        const tierKey = pkg.id as 'economy' | 'recommended' | 'premium';
        if (!['economy', 'recommended', 'premium'].includes(tierKey)) continue;

        const labels = TIER_LABELS[tierKey];
        const roofName = extractRoofModel(pkg);
        const catalogModel = findCatalogModel(roofName) || PRODUCT_CATALOG.trendstyle;

        // Use the ACTUAL model name from worker, not the catalog name
        const actualModelName = roofName
            ? roofName.replace(/ mit (Polycarbonat|Glas)$/i, '').replace(/ \(Flachdach\)$/i, '').trim()
            : catalogModel.displayName;

        const roofEK = pkg.purchaseNetto;
        const liveQuotes = livePricing.liveQuotes;

        // Build purchase breakdown from worker items
        const purchaseBreakdown: { position: string; ekEUR: number; category: string; supplier?: string }[] = [];
        if (pkg.items) {
            for (const item of pkg.items as any[]) {
                purchaseBreakdown.push({
                    position: item.name,
                    ekEUR: item.purchaseNetto,
                    category: item.category === 'roof' ? 'Dachkonstruktion' : 'Zubehör',
                    supplier: item.supplier,
                });
            }
        } else {
            purchaseBreakdown.push({
                position: `${actualModelName} ${parsed.width}×${parsed.depth}mm`,
                ekEUR: roofEK,
                category: 'Dachkonstruktion',
            });
        }

        const totalEK = roofEK;
        const installCost = BASE_INSTALL_COST_EUR;

        // Use worker's pricing if available, else recalculate
        let totalNet: number;
        let totalGross: number;
        let actualMargin: number;
        let actualMarginPercent: number;

        if (pkg.customerNetto && pkg.customerBrutto) {
            totalNet = pkg.customerNetto + installCost;
            totalGross = Math.round((pkg.customerNetto + installCost) * (1 + VAT_RATE));
            actualMargin = pkg.customerNetto - roofEK;
            actualMarginPercent = roofEK > 0 ? Math.round((actualMargin / roofEK) * 100) : 0;
        } else {
            const marginFromPercent = Math.round(totalEK * MIN_MARGIN_PERCENT / 100);
            actualMargin = Math.max(marginFromPercent, MIN_MARGIN_EUR);
            actualMarginPercent = Math.round((actualMargin / totalEK) * 100);
            const productNet = totalEK + actualMargin;
            totalNet = productNet + installCost;
            totalGross = Math.round(totalNet * (1 + VAT_RATE));
        }

        // ── Features for customer ──
        const features: { name: string; included: boolean; highlight?: boolean }[] = [
            { name: `${actualModelName} Aluminium-Konstruktion`, included: true },
            { name: `Farbe: ${parsed.color}`, included: true },
            { name: 'Integrierte Entwässerung', included: true },
            { name: 'Professionelle Montage (1 Tag)', included: true },
            { name: 'Statikberechnung nach DIN', included: true },
        ];
        // Add features from worker items (non-roof)
        if (pkg.items) {
            for (const item of pkg.items as any[]) {
                if (item.category !== 'roof') {
                    features.push({ name: item.name, included: true, highlight: true });
                }
            }
        }

        // ── Customer-facing positions (enriched with full item data) ──
        const customerPositions: {
            name: string; description?: string; included: boolean;
            dimensions?: string; category?: string; quantity?: number; note?: string;
        }[] = [];

        // Add ALL items from the package with rich metadata
        if (pkg.items) {
            for (const item of pkg.items as any[]) {
                const cleanName = (item.name || '')
                    .replace(/\b(aluxe|teranda|deponti|aliplast|c-cube)\b/gi, '')
                    .replace(/\s{2,}/g, ' ').trim();
                customerPositions.push({
                    name: cleanName || item.name,
                    description: item.note || undefined,
                    included: true,
                    dimensions: item.dimensions || undefined,
                    category: item.category || undefined,
                    quantity: item.quantity || 1,
                    note: item.note || undefined,
                });
            }
        }

        // ── Detailed material / structural component positions ──
        // Generate based on model type and dimensions so the customer
        // sees exactly which profiles and components are included.
        const widthMM = parsed.width;
        const depthMM = parsed.depth;
        const widthM = (widthMM / 1000).toFixed(1).replace('.0', '');
        const depthM = (depthMM / 1000).toFixed(1).replace('.0', '');

        // Number of posts: 2 wall-side + front posts (every ~3m max)
        const frontPosts = Math.max(2, Math.ceil(widthMM / 3000) + 1);
        const totalPosts = frontPosts; // front row only (wall-side is Wandanschluss)

        // Sparren count: roughly every 700-800mm
        const sparrenCount = Math.max(2, Math.ceil(widthMM / 750) + 1);

        // Determine profile sizes based on model category
        const isFlat = catalogModel.id === 'skystyle' || catalogModel.id === 'ultrastyle';
        const isPergola = catalogModel.category === 'pergola';
        const isCarport = catalogModel.category === 'carport';

        const pfostenSize = isCarport ? '120×120' : isPergola ? '100×100' : '110×110';
        const pfostenHeight = isCarport ? '2500' : '2500';
        const sparrenProfile = isFlat ? 'Flachsparren 200×40' : isPergola ? 'Lamellen-Sparren' : 'Sparren L 150×50';
        const wandProfil = isPergola ? 'Wandhalterung' : 'Wandanschlussprofil';

        // Determine roof covering
        const roofNameLower = (roofName || '').toLowerCase();
        const hasGlass = roofNameLower.includes('glas') || roofNameLower.includes('vsg');
        const roofCovering = hasGlass
            ? `VSG Sicherheitsglas 8.76mm klar`
            : isPergola
                ? 'Bioklimatische Aluminium-Lamellen'
                : 'Polycarbonat Stegplatten 16mm opal';

        const materialSpecs: typeof customerPositions = [
            {
                name: `Aluminium-Pfosten ${pfostenSize}mm`,
                description: `Höhe ca. ${pfostenHeight}mm, pulverbeschichtet ${parsed.color}`,
                included: true,
                quantity: totalPosts,
                category: 'material',
            },
            {
                name: sparrenProfile + 'mm',
                description: `Länge ca. ${depthM}m, Aluminium pulverbeschichtet`,
                included: true,
                quantity: sparrenCount,
                category: 'material',
            },
            {
                name: `${wandProfil} ${widthM}m`,
                description: `Aluminium ${parsed.color}, mit Dichtung`,
                included: true,
                quantity: 1,
                category: 'material',
            },
            {
                name: `Traufprofil / Blende ${widthM}m`,
                description: `Vordere Abschlussblende, Aluminium ${parsed.color}`,
                included: true,
                quantity: 1,
                category: 'material',
            },
            {
                name: roofCovering,
                description: `Dachfläche ca. ${widthM} × ${depthM}m`,
                included: true,
                quantity: 1,
                category: 'material',
            },
            {
                name: `Integrierte Regenrinne mit Fallrohr`,
                description: `${widthM}m Rinne inkl. ${totalPosts > 2 ? totalPosts : 2} Fallrohre in Pfosten`,
                included: true,
                quantity: 1,
                category: 'material',
            },
            {
                name: `Befestigungsmaterial & Montageset`,
                description: 'Edelstahl-Schrauben, Anker, Dichtungen, Verbinder',
                included: true,
                quantity: 1,
                category: 'material',
            },
        ];

        // Insert material specs before standard services
        customerPositions.push(...materialSpecs);

        // Add standard included services
        customerPositions.push(
            { name: 'Statikberechnung nach DIN EN 1991', included: true, category: 'montage' },
            { name: 'Lieferung frei Haus', included: true, category: 'montage' },
        );

        // Determine tier label — use actual model name
        let tierLabel = labels.label;
        let tierTagline = labels.tagline;
        if (tierKey === 'premium' && roofName) {
            tierLabel = `Premium · ${actualModelName}`;
            tierTagline = `Upgrade auf ${actualModelName} mit Komplettausstattung`;
        }

        variants.push({
            id: `${tierKey}-${catalogModel.id}-${Date.now()}`,
            tier: tierKey,
            label: tierLabel,
            tagline: tierTagline,
            modelId: catalogModel.id,
            modelName: actualModelName,
            modelDescription: catalogModel.description,
            modelHighlights: catalogModel.highlights,
            heroImage: catalogModel.heroImage,
            galleryImages: catalogModel.galleryImages,
            competitorCompare: catalogModel.competitorCompare,
            features,
            customerPositions,
            purchaseBreakdown,
            liveQuotes: liveQuotes || undefined,
            extras: [],
            dimensions: dims,
            width: parsed.width,
            projection: parsed.depth,
            color: parsed.color,
            supplier: 'live_configurator',
            purchasePriceEUR: totalEK,
            priceNetEUR: totalNet - installCost,
            priceGrossEUR: Math.round((totalNet - installCost) * (1 + VAT_RATE)),
            installationDays: 1,
            installationCostEUR: installCost,
            totalNetEUR: totalNet,
            totalGrossEUR: totalGross,
            marginEUR: actualMargin,
            marginPercent: actualMarginPercent,
            pricing: {
                sellingPriceNet: totalNet,
                sellingPriceGross: totalGross,
                currency: 'EUR',
            },
        } as any);
    }

    return variants;
}

// ===== MAIN HANDLER =====
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const { leadId, customerData, notes } = await req.json();
        console.log(`🤖 [OfferAgent v3 ASYNC] Starting for lead: ${leadId}`);

        if (!leadId) {
            return new Response(JSON.stringify({ error: 'leadId required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 1. Fetch full lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) throw new Error(`Lead not found: ${leadId}`);

        const cd = lead.customer_data || customerData || {};
        const leadNotes = lead.notes || notes || '';
        const fairProducts = lead.fair_products || [];

        // 1b. Fetch configurator form data (filled by customer via wizard link)
        const { data: configRows } = await supabase
            .from('lead_configurations')
            .select('*')
            .eq('lead_id', leadId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1);

        if (configRows && configRows.length > 0) {
            const cfg = configRows[0];
            console.log(`📋 Found completed configurator form: ${cfg.model_display_name || cfg.model} (${cfg.width}×${cfg.projection}mm)`);
            
            // Merge configurator data into cd (configurator has priority for structured fields)
            if (cfg.model_display_name && !cd.configuredModel) cd.configuredModel = cfg.model_display_name;
            if (cfg.width && cfg.width > 0 && !cd.configuredWidth) cd.configuredWidth = cfg.width;
            if (cfg.projection && cfg.projection > 0 && !cd.configuredProjection) cd.configuredProjection = cfg.projection;
            if (cfg.color && !cd.configuredColor) cd.configuredColor = cfg.color;
            if (cfg.roof_covering && !cd.configuredRoofCovering) cd.configuredRoofCovering = cfg.roof_covering;
            if (cfg.roof_variant && !cd.configuredRoofVariant) cd.configuredRoofVariant = cfg.roof_variant;
            if (cfg.install_type && !cd.configuredInstallType) cd.configuredInstallType = cfg.install_type;
            if (cfg.glazing_sides) cd.configuredGlazing = cfg.glazing_sides;
            if (cfg.zip_screen) cd.configuredZipScreen = cfg.zip_screen;
            if (cfg.senkrechtmarkise) cd.configuredSenkrechtmarkise = cfg.senkrechtmarkise;
            if (cfg.markise) cd.configuredMarkise = cfg.markise;
            if (cfg.heater) cd.configuredHeater = cfg.heater;
            if (cfg.led) cd.configuredLed = cfg.led;
            if (cfg.flooring) cd.configuredFlooring = cfg.flooring;
            if (cfg.mounting_type) cd.configuredMounting = cfg.mounting_type;
            if (cfg.notes) cd.configuredNotes = cfg.notes;
            if (cfg.customer_data?.selectedModels) cd.selectedModels = cfg.customer_data.selectedModels;
            if (cfg.customer_data?.standaloneProducts) cd.standaloneProducts = cfg.customer_data.standaloneProducts;
        }

        // 2. 🧠 CLAUDE AI ANALYSIS (~5s)
        const aiAnalysis = await claudeAnalyzeLead(lead, cd, leadNotes, fairProducts);
        
        // Save AI analysis to lead immediately
        await supabase.from('leads').update({
            ai_analysis: aiAnalysis,
            ai_sentiment: aiAnalysis.sentiment,
            updated_at: new Date().toISOString(),
        }).eq('id', leadId);

        // 2a. HARD OVERRIDE: If configurator form has dimensions → ALWAYS make offer
        const hasFormDimensions = (cd.configuredWidth && cd.configuredWidth > 0) || 
                                  (cd.configuredProjection && cd.configuredProjection > 0);
        const hasAnyDimensions = hasFormDimensions || 
                                 (aiAnalysis.configuration?.width && aiAnalysis.configuration?.depth);
        
        if (!aiAnalysis.canMakeOffer && hasAnyDimensions) {
            console.log(`🧠 OVERRIDE: Claude said canMakeOffer=false but form has dimensions (${cd.configuredWidth}×${cd.configuredProjection}mm) — forcing canMakeOffer=true`);
            aiAnalysis.canMakeOffer = true;
            aiAnalysis.internalNotes = (aiAnalysis.internalNotes || '') + ' [Override: form dimensions present]';
            
            // Fill configuration from form if Claude didn't provide one.
            // roofType ustawiamy TYLKO gdy klient faktycznie wybrał pokrycie w formularzu —
            // syntetyczny default nie może udawać jawnego życzenia (roofTypeExplicit).
            if (!aiAnalysis.configuration) {
                aiAnalysis.configuration = {
                    width: cd.configuredWidth || 5000,
                    depth: cd.configuredProjection || 3500,
                    primaryModel: cd.configuredModel?.toLowerCase() || 'trendstyle',
                    color: cd.configuredColor || 'RAL 7016',
                    ...(cd.configuredRoofCovering
                        ? { roofType: cd.configuredRoofCovering.toLowerCase().includes('glas') ? 'glass' : 'poly' }
                        : {}),
                    freestanding: cd.configuredInstallType?.toLowerCase()?.includes('frei') || false,
                } as any;
            }
        }

        // 2b. If Claude says we can't make an offer — stop
        if (!aiAnalysis.canMakeOffer) {
            console.log(`🧠 Claude: NOT enough data. Missing: ${aiAnalysis.missingInfo?.join(', ')}`);
            
            await supabase.from('leads').update({
                status: 'needs_info',
                ai_draft_email: aiAnalysis.proposedEmail ? JSON.stringify(aiAnalysis.proposedEmail) : null,
                ai_draft_sms: aiAnalysis.proposedSMS || null,
                updated_at: new Date().toISOString(),
            }).eq('id', leadId);

            if (lead.assigned_to) {
                // notifications: kolumna to `message` (nie `body`), a `type` ma CHECK
                // ('info'|'success'|'warning'|'error') — zdarzenie agenta idzie w metadata
                await supabase.from('notifications').insert({
                    user_id: lead.assigned_to,
                    type: 'warning',
                    title: `⚠️ Agent: Brakuje danych — ${cd.firstName || ''} ${cd.lastName || ''}`,
                    message: `${aiAnalysis.customerProfile}\nBrakuje: ${aiAnalysis.missingInfo?.join(', ')}`,
                    link: `/leads/${leadId}`,
                    metadata: { agentEvent: 'needs_info', leadId, missingInfo: aiAnalysis.missingInfo, urgency: aiAnalysis.urgency },
                });
            }

            return new Response(JSON.stringify({
                success: true,
                action: 'needs_info',
                missingInfo: aiAnalysis.missingInfo,
                customerProfile: aiAnalysis.customerProfile,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Smart data extraction
        const parsed = extractLeadData(cd, leadNotes, fairProducts);
        
        if (aiAnalysis.configuration) {
            const cc = aiAnalysis.configuration;
            // Claude may return dimensions at top level or nested in .dimensions
            const ccWidth = cc.width || cc.dimensions?.width || 0;
            const ccDepth = cc.depth || cc.dimensions?.depth || 0;
            if (ccWidth > 0) parsed.width = Math.max(parsed.width, ccWidth);
            if (ccDepth > 0) parsed.depth = Math.max(parsed.depth, ccDepth);
            if (cc.color) parsed.color = cc.color;
            if (cc.primaryModel && PRODUCT_CATALOG[cc.primaryModel]) {
                const prevModel = parsed.primaryModelId;
                parsed.primaryModelId = cc.primaryModel;
                // CRITICAL: Sync productCategory when Claude changes the model
                const catalogEntry = PRODUCT_CATALOG[cc.primaryModel];
                if (catalogEntry.category) {
                    const prevCat = parsed.productCategory;
                    parsed.productCategory = catalogEntry.category as 'roof' | 'pergola' | 'carport';
                    if (prevCat !== parsed.productCategory) {
                        console.log(`🧠 Claude changed category: ${prevCat} → ${parsed.productCategory} (model: ${prevModel} → ${cc.primaryModel})`);
                    }
                }
            }
            // Also check roofing field — normalize to 'polycarbonate' | 'glass'
            const normalizeCover = (v: string): string | null => {
                const s = (v || '').toLowerCase();
                if (s.includes('poly') || s.includes('steg') || s.includes('opal')) return 'polycarbonate';
                if (s.includes('glas') || s.includes('glass') || s.includes('vsg')) return 'glass';
                return null;
            };
            if (cc.roofType) {
                const norm = normalizeCover(cc.roofType);
                if (norm) { parsed.roofType = norm; parsed.roofTypeExplicit = true; }
            }
            if (cc.roofing) {
                const norm = normalizeCover(cc.roofing);
                if (norm) { parsed.roofType = norm; parsed.roofTypeExplicit = true; }
            }
            // Extras z analizy Claude (zasada 15) — tylko znane klucze
            if (Array.isArray(cc.extras)) {
                const merged = new Set(parsed.requestedExtras);
                for (const e of cc.extras) {
                    if (typeof e === 'string' && VALID_EXTRAS.includes(e)) merged.add(e);
                }
                parsed.requestedExtras = Array.from(merged);
            }
            if (cc.freestanding === true) {
                parsed.freestanding = true;
                parsed.wallMounted = false;
            }
            console.log(`🧠 Claude overrides: ${ccWidth}×${ccDepth}mm, model=${cc.primaryModel}, category=${parsed.productCategory}, color=${cc.color}`);
            console.log(`🧠 Final dims: ${parsed.width}×${parsed.depth}mm`);
        }

        console.log(`🤖 Customer: ${parsed.customerName} (${parsed.email})`);
        console.log(`🤖 Product: ${parsed.primaryModelId} (${parsed.productCategory})`);
        console.log(`🤖 Size: ${parsed.width}×${parsed.depth}mm, Color: ${parsed.color}`);

        // 4. Ensure customer
        let customerId = lead.customer_id;
        if (!customerId && cd.email) {
            const { data: existing } = await supabase
                .from('customers').select('id').eq('email', cd.email).limit(1).single();
            if (existing) {
                customerId = existing.id;
            } else {
                const { data: newCust } = await supabase.from('customers').insert({
                    first_name: cd.firstName || '', last_name: cd.lastName || '',
                    email: cd.email || '', phone: cd.phone || '',
                    postal_code: cd.postalCode || cd.plz || '',
                    city: cd.city || cd.ort || '',
                    street: cd.address || cd.street || '',
                    country: 'DE',
                }).select('id').single();
                if (newCust) customerId = newCust.id;
            }
        }

        // 5. Agent-generated offers — NEVER auto-assign, always team pickup
        console.log(`📋 Agent offer — no rep assigned, team pickup mode`);

        // 5b. ── GUARD ANTYDUPLIKATOWY ──
        // Podwójny drag / podwójne wywołanie tworzyło 2-3 oferty dla jednego leada
        // (klient dostawał kilka e-maili z różnymi linkami). Jeśli lead ma już
        // ofertę agenta w trakcie wyceny LUB świeższą niż 10 minut — nie twórz drugiej.
        const { data: existingAgentOffers } = await supabase
            .from('offers')
            .select('id, offer_number, status, created_at')
            .eq('lead_id', leadId)
            .contains('product_config', { agentGenerated: true })
            .order('created_at', { ascending: false })
            .limit(1);

        const existing = existingAgentOffers?.[0];
        if (existing) {
            const ageMs = Date.now() - new Date(existing.created_at).getTime();
            const isPending = existing.status === 'pricing_pending';
            const isFresh = ageMs < 10 * 60 * 1000;
            if (isPending || isFresh) {
                console.log(`🛡️ Duplicate guard: lead ${leadId} ma już ofertę ${existing.offer_number} (status: ${existing.status}, wiek: ${Math.round(ageMs / 1000)}s) — pomijam`);
                return new Response(JSON.stringify({
                    success: true,
                    skipped: true,
                    reason: 'duplicate_guard',
                    existingOffer: existing.offer_number,
                    message: `Lead ma już ofertę agenta (${existing.offer_number}, ${isPending ? 'wycena w toku' : 'utworzona przed chwilą'}) — nie tworzę duplikatu.`,
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // 6. Create offer IMMEDIATELY with status 'pricing_pending'
        //    Worker will update it with real prices when done
        const primaryModel = PRODUCT_CATALOG[parsed.primaryModelId] || PRODUCT_CATALOG.trendstyle;
        const offerNumber = `AGT-${Date.now().toString(36).toUpperCase()}`;
        const publicToken = crypto.randomUUID();
        const dims = `${parsed.width.toLocaleString('de-DE')} × ${parsed.depth.toLocaleString('de-DE')} mm`;

        // Create placeholder variants with estimated prices
        const placeholderVariants = ['economy', 'recommended', 'premium'].map(tier => ({
            id: `${tier}-${parsed.primaryModelId}-${Date.now()}`,
            tier,
            label: TIER_LABELS[tier as keyof typeof TIER_LABELS].label,
            tagline: TIER_LABELS[tier as keyof typeof TIER_LABELS].tagline,
            modelId: parsed.primaryModelId,
            modelName: primaryModel.displayName,
            modelDescription: primaryModel.description,
            heroImage: primaryModel.heroImage,
            dimensions: dims,
            width: parsed.width,
            projection: parsed.depth,
            color: parsed.color,
            supplier: 'pricing_pending',
            pricing: { status: 'pending', message: 'Live-Preise werden berechnet...' },
        }));

        // ── Randomly assign one of the sales team to the offer ──
        const SALES_TEAM = [
            '0375aad6-5e1b-43c1-82c1-640f8cb7feb9', // Mike Ledwin
            '15fb3c80-269f-42eb-8dcd-be11ed8153b1', // Hubert Kosciow
            '4e151d84-8cae-4ec8-90c4-a3bd46365b40', // Oliwia Duz
        ];
        const assignedRepId = SALES_TEAM[Math.floor(Math.random() * SALES_TEAM.length)];
        console.log(`🤖 Assigned sales rep: ${assignedRepId}`);

        const { data: newOffer, error: offerError } = await supabase.from('offers').insert({
            offer_number: offerNumber,
            user_id: assignedRepId, // Randomly assigned sales rep
            customer_id: customerId,
            customer_data: cd,
            lead_id: leadId,
            product_config: {
                modelId: primaryModel.id,
                description: `${primaryModel.displayName} — Agent-generiert`,
                width: parsed.width,
                projection: parsed.depth,
                color: parsed.color,
                roofType: parsed.roofType,
                roofTypeExplicit: parsed.roofTypeExplicit,
                installationType: parsed.freestanding ? 'freestanding' : 'wall-mounted',
                requestedExtras: parsed.requestedExtras,
                // Recovery w workerze odtwarza żądanie z product_config — te pola MUSZĄ tu być
                wantsWintergarten: (parsed as any).wantsWintergarten || false,
                productCategory: parsed.productCategory,
                agentGenerated: true,
                pricingSource: 'pending',
                alternatives: parsed.alternativeModelIds,
                aiAnalysis: {
                    customerProfile: aiAnalysis.customerProfile,
                    urgency: aiAnalysis.urgency,
                    sentiment: aiAnalysis.sentiment,
                    internalNotes: aiAnalysis.internalNotes,
                    tierStrategy: aiAnalysis.tierStrategy,
                    reasoning: aiAnalysis.configuration?.reasoning,
                },
            },
            pricing: {
                status: 'pending',
                currency: 'EUR',
            },
            variants: placeholderVariants,
            status: 'pricing_pending',
            public_token: publicToken,
            commission: 0,
            margin_percentage: 40,
        }).select('id').single();

        if (offerError) throw new Error(`Offer creation failed: ${offerError.message}`);
        
        const offerUrl = `${APP_URL}/p/offer/${publicToken}`;
        console.log(`🤖 Offer created (PENDING): ${offerNumber} → ${offerUrl}`);

        // 6. Update lead status
        await supabase.from('leads').update({
            status: 'offer_agent',
            customer_id: customerId,
            updated_at: new Date().toISOString(),
        }).eq('id', leadId);

        // 7. 🔥 FIRE-AND-FORGET: Send to worker — it will update the offer when done
        const WORKER_URL = Deno.env.get('PRICING_WORKER_URL') || 'http://localhost:3456';
        const WORKER_API_KEY = Deno.env.get('PRICING_WORKER_API_KEY') || 'polendach24-dev';
        
        try {
            console.log(`🤖 Firing worker: ${WORKER_URL}/api/offer-agent`);
            fetch(`${WORKER_URL}/api/offer-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${WORKER_API_KEY}`,
                },
                body: JSON.stringify({
                    leadId,
                    offerId: newOffer.id,
                    offerNumber,
                    publicToken,
                    customerName: parsed.customerName,
                    customerEmail: cd.email || '',
                    customerPhone: cd.phone || '',
                    width: parsed.width,
                    depth: parsed.depth,
                    color: parsed.color.replace('RAL ', ''),
                    roofType: 'both', // Always price both covers for tier differentiation
                    // Życzenia klienta — TYLKO gdy faktycznie je wyraził (default ≠ życzenie)
                    customerPreferredCover: parsed.roofTypeExplicit ? parsed.roofType : undefined,
                    freestanding: parsed.freestanding === true,
                    requestedExtras: parsed.requestedExtras,
                    postalCode: parsed.postalCode,
                    productCategory: parsed.productCategory,
                    primaryModelId: parsed.primaryModelId,
                    wantsWintergarten: (parsed as any).wantsWintergarten || false,
                    // Worker needs these to save back to Supabase
                    supabaseUrl,
                    supabaseServiceKey: serviceKey,
                    // AI analysis for context
                    aiAnalysis: {
                        primaryModelId: parsed.primaryModelId,
                        alternativeModelIds: parsed.alternativeModelIds,
                        tierStrategy: aiAnalysis.tierStrategy,
                    },
                }),
                signal: AbortSignal.timeout(10000), // Just 10s to deliver the request
            }).then(res => {
                console.log(`🤖 Worker accepted request (${res.status})`);
            }).catch(err => {
                console.error(`🤖 Worker fire-and-forget failed: ${err.message?.substring(0, 100)}`);
            });
        } catch (fireErr: any) {
            console.error(`🤖 Worker trigger failed: ${fireErr.message?.substring(0, 100)}`);
        }

        // 8. Notify sales rep
        if (lead.assigned_to) {
            await supabase.from('notifications').insert({
                user_id: lead.assigned_to,
                type: 'info',
                title: `🤖 Agent: Oferta ${offerNumber} — wycena trwa...`,
                message: `${primaryModel.displayName} ${parsed.width}×${parsed.depth}mm → ${parsed.customerName}\nLive-wyceny z Aluxe/Teranda/Aliplast w trakcie (~3 min)`,
                link: `/leads/${leadId}`,
                metadata: { agentEvent: 'offer_pending', leadId, offerId: newOffer.id, offerUrl },
            });
        }

        // Return IMMEDIATELY — worker will update the offer in background
        return new Response(JSON.stringify({
            success: true,
            action: 'offer_created_pricing_pending',
            offerId: newOffer.id,
            offerNumber,
            offerUrl,
            publicToken,
            message: 'Offer created. Live pricing in progress (~3 min). Worker will update automatically.',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('🤖 [OfferAgent v3] Error:', error?.message || error);
        console.error('🤖 Stack:', error?.stack?.substring(0, 500));

        // CRITICAL: Revert lead status so it doesn't get stuck in 'offer_agent'
        try {
            const { leadId } = await req.clone().json().catch(() => ({ leadId: null }));
            if (leadId) {
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, serviceKey);
                
                await supabase.from('leads').update({
                    status: 'new',
                    notes: `[Agent Error ${new Date().toISOString().substring(0, 16)}] ${error?.message || 'Unknown error'}`,
                    updated_at: new Date().toISOString(),
                }).eq('id', leadId);
                console.log(`🤖 Lead ${leadId} reverted to 'new' after error`);
            }
        } catch (revertErr) {
            console.error('🤖 Failed to revert lead status:', revertErr);
        }

        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

// ===== SALES EMAIL TEMPLATE =====
function buildSalesEmail(parsed: ParsedLeadData, offerNumber: string, offerUrl: string, variants: OfferVariant[]): string {
    return buildOfferEmail(
        { customerName: parsed.customerName, width: parsed.width, depth: parsed.depth, color: parsed.color, postalCode: parsed.postalCode },
        offerNumber,
        offerUrl,
        variants as any
    );
}
