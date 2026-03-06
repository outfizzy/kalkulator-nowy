import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/translations';
import { PricingService } from '../../services/pricing.service';
import { toast } from 'react-hot-toast';
import { WallVisualizer } from './WallVisualizer';
import { DatabaseService } from '../../services/database';
import { LeadService } from '../../services/database/lead.service';
import { useAuth } from '../../contexts/AuthContext';
import type { Customer, Lead, Offer } from '../../types';
import { generateOfferPDF } from '../../utils/pdfGenerator';
import { CustomerForm } from '../CustomerForm';
import { calculateDachrechner, type RoofModelId, type DachrechnerResults } from '../../services/dachrechner.service';

// ======= TYPES =======
type CoverType = 'Poly' | 'Glass';
type ConstructionType = 'wall' | 'freestanding';
type ViewState = 'customer' | 'mode-select' | 'config' | 'manual' | 'summary';

import { AiService } from '../../services/ai';

interface RoofModel {
    id: string;
    name: string;
    description: string;
    hasPoly: boolean;
    hasGlass: boolean;
    hasFreestanding: boolean;
    image_url?: string;
}

interface Accessory {
    id: string;
    name: string;
    price: number;
    category: 'led' | 'profile' | 'pvc' | 'mounting' | 'polycarbonate' | 'other';
    unit: string;
}

interface BasketItem {
    id: string;
    category: 'roof' | 'wall' | 'accessory' | 'panorama';
    name: string;
    config: string;
    dimensions: string;
    price: number;
    quantity: number;
}

// ======= PRODUCT CATALOG =======
const ROOF_MODELS: RoofModel[] = [
    { id: 'Orangeline', name: 'Orangestyle', description: 'Ekonomiczny profil 50mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/orangeline.jpg' },
    { id: 'Orangeline+', name: 'Orangestyle+', description: 'Ekonomiczny Plus 60mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/orangeline-plus.jpg' },
    { id: 'Trendline', name: 'Trendstyle', description: 'Klasyczny profil 60mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: true, image_url: '/images/models/trendline.jpg' },
    { id: 'Trendline+', name: 'Trendstyle+', description: 'Klasyczny Plus 70mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: true, image_url: '/images/models/trendline-plus.jpg' },
    { id: 'Topline', name: 'Topstyle', description: 'Premium profil 80mm • od 2500mm', hasPoly: true, hasGlass: true, hasFreestanding: true, image_url: '/images/models/topline.jpg' },
    { id: 'Topline XL', name: 'Topstyle XL', description: 'Extra duża konstrukcja XL', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/topline-xl.jpg' },
    { id: 'Designline', name: 'Designstyle', description: 'Elegancki design • tylko szkło', hasPoly: false, hasGlass: true, hasFreestanding: true, image_url: '/images/models/designline.jpg' },
    { id: 'Ultraline', name: 'Ultrastyle', description: 'Najwyższa klasa 100mm • tylko szkło', hasPoly: false, hasGlass: true, hasFreestanding: false, image_url: '/images/models/ultraline.jpg' },
    { id: 'Skyline', name: 'Skystyle', description: 'Pergola bioklimatyczna z lamelami', hasPoly: false, hasGlass: false, hasFreestanding: true, image_url: '/images/models/skyline.jpg' },
    { id: 'Carport', name: 'Carport', description: 'Wiata garażowa z blachą', hasPoly: false, hasGlass: false, hasFreestanding: true, image_url: '/images/models/carport.jpg' },
];

// Glass variant options
const GLASS_VARIANTS = [
    { id: 'klar', name: 'Klar (VSG)', description: 'Przezroczyste szkło hartowane', icon: '🟢' },
    { id: 'matt', name: 'Matt (VSG)', description: 'Szkło matowe, prywatność', icon: '⚪' },
    { id: 'stopsol', name: 'Stopsol', description: 'Szkło z filtrem słonecznym', icon: '🔶' },
];

// Polycarbonate variant options (per Excel: klar/opal share price, IR Gold is surcharge)
const POLY_VARIANTS = [
    { id: 'opal', name: 'Opal', description: 'Mleczny, rozpraszający światło', icon: '⚪' },
    { id: 'klar', name: 'Klar', description: 'Przezroczysty poliwęglan', icon: '🟢' },
    { id: 'ir-gold', name: 'IR Gold', description: 'Ochrona przed promieniowaniem IR', icon: '🟡' },
];

const WALL_PRODUCTS = [
    { id: 'Side Wall (Glass)', name: 'Ściana Boczna', icon: '🔲', description: 'Szklana ściana boczna' },
    { id: 'Front Wall (Glass)', name: 'Ściana Frontowa', icon: '⬛', description: 'Szklana ściana frontowa' },
    { id: 'Wedge (Glass)', name: 'Keilfenster', icon: '📐', description: 'Szyba klinowa trójkątna' },
];

// Keilfenster (Wedge) accessories from Aluxe pricelist
const KEILFENSTER_ACCESSORIES = [
    { id: 'uProfil', name: 'U-Profil 55x29mm', price: 38.40, icon: '📏', description: 'Ausgleichs U Profil für Fenster' },
    { id: 'schraubenSet', name: 'Schrauben-Set', price: 15.32, icon: '🔩', description: 'Montage-Schrauben Set' },
    { id: 'kippFenster', name: 'Kipp-Fenster', price: 564.75, icon: '🪟', description: 'Uchylne okno w klinie' },
    { id: 'abdeckungEL891', name: 'Abdeckung EL891', price: 20.07, icon: '🔳', description: 'Osłona 3200mm' },
];


// Schiebetür - framed sliding doors
const SCHIEBETUR_PRODUCTS = [
    { id: 'Schiebetür (VSG klar)', name: 'Szkło przezroczyste (VSG klar)', icon: '🚪', description: 'Drzwi przesuwne aluminiowe – szkło hartowane czyste' },
    { id: 'Schiebetür (VSG matt)', name: 'Szkło matowe (VSG matt)', icon: '🚪', description: 'Drzwi przesuwne aluminiowe – szkło matowe' },
    { id: 'Schiebetür (Isolierglas)', name: 'Szkło izolacyjne (Isolierglas)', icon: '🚪', description: 'Drzwi przesuwne aluminiowe – szkło termoizolacyjne' },
];

// Schiebetür handle types (from Aluxe ACSL catalog)
const SCHIEBETUR_HANDLES = [
    { id: 'ACSL2042', name: 'Uchwyt płaski (wewnętrzny)', description: 'Handgriff flach (innen)', icon: '🔲' },
    { id: 'ACSL2046', name: 'Uchwyt stały (zewnętrzny)', description: 'Handgriff fest (außen)', icon: '🔳' },
    { id: 'ACSL2044', name: 'Uchwyt stały (wewnętrzny)', description: 'Handgriff fest (innen)', icon: '🔳' },
    { id: 'ACSL2047', name: 'Uchwyt z zamkiem (zewnętrzny)', description: 'Handgriff mit Zylinder (außen)', icon: '🔐' },
];

// Schiebetür opening directions
const SCHIEBETUR_OPENING = [
    { id: 'left', name: 'Lewo otwierające', description: 'Links öffnend', icon: '◀️' },
    { id: 'right', name: 'Prawo otwierające', description: 'Rechts öffnend', icon: '▶️' },
    { id: 'center', name: 'Środkowo otwierające', description: 'Mittig öffnend/schließend', icon: '↔️' },
];

// Auto-calculate panel count from width (from Aluxe pricelist, Feldbreite max 1500mm)
function getSchiebetuerPanelCount(widthMm: number): { count: string; maxWidth: number } {
    if (widthMm <= 2500) return { count: '2-skrzydłowe', maxWidth: 2620 };
    if (widthMm <= 3000) return { count: '2-3 skrzydłowe', maxWidth: 2620 };
    if (widthMm <= 3500) return { count: '3-skrzydłowe', maxWidth: 2620 };
    if (widthMm <= 4500) return { count: '3-4 skrzydłowe', maxWidth: 2620 };
    if (widthMm <= 5000) return { count: '4-skrzydłowe', maxWidth: 2620 };
    if (widthMm <= 6000) return { count: '4-6 skrzydłowe', maxWidth: 2620 };
    return { count: '6+ skrzydłowe', maxWidth: 2620 };
}

// Panorama - frameless sliding glass systems
const PANORAMA_PRODUCTS = [
    // AL22 - flat track
    { id: 'Panorama AL22 (3-Tor)', name: 'AL22 3-Tor', description: 'Płaska szyna, 3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL22 (5-Tor)', name: 'AL22 5-Tor', description: 'Płaska szyna, 5 torów', icon: '⊟', tracks: 5 },
    // AL23 - high track
    { id: 'Panorama AL23 (3-Tor)', name: 'AL23 3-Tor', description: 'Wysoka szyna, 3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL23 (4-Tor)', name: 'AL23 4-Tor', description: 'Wysoka szyna, 4 tory', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL23 (5-Tor)', name: 'AL23 5-Tor', description: 'Wysoka szyna, 5 torów', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL23 (6-Tor)', name: 'AL23 6-Tor', description: 'Wysoka szyna, 6 torów', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL23 (7-Tor)', name: 'AL23 7-Tor', description: 'Wysoka szyna, 7 torów', icon: '⊞', tracks: 7 },
    // AL24
    { id: 'Panorama AL24 (3-Tor)', name: 'AL24 3-Tor', description: '3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL24 (4-Tor)', name: 'AL24 4-Tor', description: '4 tory', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL24 (5-Tor)', name: 'AL24 5-Tor', description: '5 torów', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL24 (6-Tor)', name: 'AL24 6-Tor', description: '6 torów', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL24 (7-Tor)', name: 'AL24 7-Tor', description: '7 torów', icon: '⊞', tracks: 7 },
    // AL25
    { id: 'Panorama AL25 (3-Tor)', name: 'AL25 3-Tor', description: '3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL25 (4-Tor)', name: 'AL25 4-Tor', description: '4 tory', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL25 (5-Tor)', name: 'AL25 5-Tor', description: '5 torów', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL25 (6-Tor)', name: 'AL25 6-Tor', description: '6 torów', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL25 (7-Tor)', name: 'AL25 7-Tor', description: '7 torów', icon: '⊞', tracks: 7 },
    // AL26
    { id: 'Panorama AL26 (3-Tor)', name: 'AL26 3-Tor', description: '3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL26 (4-Tor)', name: 'AL26 4-Tor', description: '4 tory', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL26 (5-Tor)', name: 'AL26 5-Tor', description: '5 torów', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL26 (6-Tor)', name: 'AL26 6-Tor', description: '6 torów', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL26 (7-Tor)', name: 'AL26 7-Tor', description: '7 torów', icon: '⊞', tracks: 7 },
];

const PANORAMA_MODELS = [
    { id: 'AL22', name: 'AL22', description: 'Płaska szyna (Flat Track)', icon: '⊞', validTracks: [3, 5] },
    { id: 'AL23', name: 'AL23', description: 'Wysoka szyna (High Track)', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
    { id: 'AL24', name: 'AL24', description: 'Standard', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
    { id: 'AL25', name: 'AL25', description: 'Premium', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
    { id: 'AL26', name: 'AL26', description: 'Exclusive', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
];

function getBestPanoramaVariant(modelId: string, width: number): string {
    const model = PANORAMA_MODELS.find(m => m.id === modelId);
    if (!model) return PANORAMA_PRODUCTS[0].id;

    // Logic: Panel width max ~1100mm
    // minTracks = width / 1100
    const minTracks = Math.ceil(width / 1100);

    // Find smallest available track count >= minTracks
    let bestTracks = model.validTracks.find(t => t >= minTracks);

    // If width is too large (requires more tracks than available), pick max
    if (!bestTracks) {
        bestTracks = model.validTracks[model.validTracks.length - 1];
    }

    return `Panorama ${model.id} (${bestTracks}-Tor)`;
}

// ======= MODEL NAME MAPPING =======
// Calculator uses 'Trendline' but DB uses 'Trendstyle' etc.
function modelToDbName(model: string): string {
    const mapping: Record<string, string> = {
        'Orangeline': 'Orangestyle',
        'Orangeline+': 'Orangestyle+',
        'Trendline': 'Trendstyle',
        'Trendline+': 'Trendstyle+',
        'Topline': 'Topstyle',
        'Topline XL': 'Topstyle XL',
        'Designline': 'Designline',
        'Ultraline': 'Ultrastyle',
        'Skyline': 'Skystyle',
        'Carport': 'Carport',
    };
    return mapping[model] || model;
}

// ======= HELPER: Build table name =======
// LEGACY format: Aluxe V2 - {Model} {Cover} (Zone {X})
// NEW format (from migration): {DbModel} - Zone {X} - {subtype}
function buildTableName(model: string, cover: CoverType, zone: number, construction: ConstructionType): string {
    const prefix = 'Aluxe V2 - ';

    if (model === 'Skyline' || model === 'Carport') {
        if (construction === 'freestanding') {
            return `${prefix}${model} Freestanding (Zone ${zone})`;
        }
        return `${prefix}${model} (Zone ${zone})`;
    }

    const coverName = cover === 'Poly' ? 'Poly' : 'Glass';
    if (construction === 'freestanding') {
        return `${prefix}${model} Freestanding ${coverName} (Zone ${zone})`;
    }
    return `${prefix}${model} ${coverName} (Zone ${zone})`;
}

// ======= HELPER: Build DB-compatible table name (from migration format) =======
function buildDbTableName(model: string, cover: CoverType, zone: number): string {
    const dbModel = modelToDbName(model);
    const subtype = cover === 'Poly' ? 'polycarbonate' : 'glass';
    return `${dbModel} - Zone ${zone} - ${subtype}`;
}

// ======= HELPER: Build surcharge table name =======
function buildSurchargeTableName(model: string, cover: CoverType, zone: number, variant: string): string {
    const dbModel = modelToDbName(model);
    const subtype = cover === 'Poly' ? 'polycarbonate' : 'glass';
    return `${dbModel} - Zone ${zone} - ${subtype} - surcharge_${variant}`;
}

// ======= HELPER: Try multiple table name formats =======
async function findPriceTable(supabase: any, model: string, cover: CoverType, zone: number, construction: ConstructionType): Promise<{ id: string; name: string } | null> {
    // Skyline/Carport don't have cover type - use special handling
    const isNoCoverModel = model === 'Skyline' || model === 'Carport';

    // Try formats in order of preference
    const formats: string[] = [];

    if (isNoCoverModel) {
        // For Skyline/Carport: only try the legacy format (no cover type)
        formats.push(buildTableName(model, cover, zone, construction)); // Aluxe V2 - Skyline (Zone 1)
    } else {
        // Standard models: try new format first, then legacy
        formats.push(buildDbTableName(model, cover, zone)); // Trendstyle - Zone 1 - glass
        formats.push(buildTableName(model, cover, zone, construction)); // Aluxe V2 - Trendline Glass (Zone 1)
    }

    for (const name of formats) {
        console.log(`[findPriceTable] Trying: "${name}"`);
        const { data } = await supabase
            .from('price_tables')
            .select('id, name')
            .eq('name', name)
            .eq('is_active', true)
            .limit(1);

        if (data && data.length > 0) {
            console.log(`[findPriceTable] ✅ Found: "${data[0].name}"`);
            return data[0];
        }
    }

    // Fallback: try partial match
    if (isNoCoverModel) {
        // For Skyline/Carport: fuzzy search without cover type
        const { data: fuzzy } = await supabase
            .from('price_tables')
            .select('id, name')
            .ilike('name', `%${model}%Zone ${zone}%`)
            .eq('is_active', true)
            .limit(1);

        if (fuzzy && fuzzy.length > 0) {
            console.log(`[findPriceTable] ✅ Fuzzy found: "${fuzzy[0].name}"`);
            return fuzzy[0];
        }
    } else {
        // Standard models: fuzzy search with cover type
        const dbModel = modelToDbName(model);
        const subtype = cover === 'Poly' ? 'polycarbonate' : 'glass';
        const { data: fuzzy } = await supabase
            .from('price_tables')
            .select('id, name')
            .ilike('name', `%${dbModel}%Zone ${zone}%${subtype}%`)
            .eq('is_active', true)
            .limit(1);

        if (fuzzy && fuzzy.length > 0) {
            console.log(`[findPriceTable] ✅ Fuzzy found: "${fuzzy[0].name}"`);
            return fuzzy[0];
        }
    }

    console.log(`[findPriceTable] ❌ No table found for model=${model}, zone=${zone}`);
    return null;
}

// ======= COMPONENT =======
export const ProductConfiguratorV2: React.FC = () => {
    // === STEPS ===
    const [activeStep, setActiveStep] = useState(0);
    const steps = [
        { id: 0, label: 'Model', icon: '🏠' },
        { id: 1, label: 'Wymiary', icon: '📏' },
        { id: 2, label: 'Specyfikacja', icon: '⚙️' },
        { id: 3, label: 'Dodatki', icon: '🧩' },
    ];

    // === VIEW STATE ===
    const [view, setView] = useState<ViewState>('customer');
    const [customerState, setCustomerState] = useState<Customer | null>(null);

    // === ROOF CONFIG ===
    const [model, setModel] = useState<string>('Trendline');
    const [cover, setCover] = useState<CoverType>('Poly');
    const [zone, setZone] = useState<number>(1);
    const [construction, setConstruction] = useState<ConstructionType>('wall');
    const [width, setWidth] = useState<number>(3000);
    const [projection, setProjection] = useState<number>(3000);
    const [color, setColor] = useState('RAL 7016');
    const [glassVariant, setGlassVariant] = useState<string>('klar');
    const [polyVariant, setPolyVariant] = useState<string>('opal');
    const [sonderfarben, setSonderfarben] = useState<boolean>(false); // Special color +20% surcharge

    // === DESIGNLINE SCHIEBEEINHEIT (Sliding Roof Glass) ===
    const [schiebeeinheitCount, setSchiebeeinheitCount] = useState<number>(0); // Number of sliding roof fields
    const [schiebeeinheitUnitPrice, setSchiebeeinheitUnitPrice] = useState<number>(0); // Price per field
    const [schiebeeinheitTotalPrice, setSchiebeeinheitTotalPrice] = useState<number>(0); // Total surcharge

    // === DACHRECHNER / STRUCTURAL HEIGHTS ===
    // Per-model Dachrechner configuration
    const MODEL_DACHRECHNER_CONFIG: Record<string, {
        defaultH3: number; defaultH1: number; defaultOverhang?: number;
        needsH1: boolean; needsH3: boolean; needsOverhang: boolean;
        fixedAngle?: number; postWidth: number;
        label: string; hint: string;
    }> = {
        'Orangeline': { defaultH3: 2200, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, fixedAngle: 8, postWidth: 110, label: 'Orangestyle', hint: '8% Gefälle (fest), nur H3 + Tiefe' },
        'Orangeline+': { defaultH3: 2200, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, fixedAngle: 8, postWidth: 110, label: 'Orangestyle+', hint: '8% Gefälle (fest), nur H3 + Tiefe' },
        'Trendline': { defaultH3: 2200, defaultH1: 2650, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 110, label: 'Trendstyle', hint: 'Profilhöhe 47.5mm, Neigung berechnet aus H3/H1/Tiefe' },
        'Trendline+': { defaultH3: 2200, defaultH1: 2700, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 110, label: 'Trendstyle+', hint: 'Profilhöhe 57.5mm, verstärkt, Neigung berechnet' },
        'Topline': { defaultH3: 2200, defaultH1: 2796, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 149, label: 'Topstyle', hint: 'Profilhöhe 93.2mm, massive Konstruktion' },
        'Topline XL': { defaultH3: 2200, defaultH1: 2900, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 196, label: 'Topstyle XL', hint: 'Profilhöhe 117mm, Pfosten 196mm' },
        'Designline': { defaultH3: 2200, defaultH1: 2796, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 196, label: 'Designstyle', hint: 'Pfosten 196mm, eleganter Anschluss' },
        'Ultraline': { defaultH3: 2200, defaultH1: 2796, defaultOverhang: 300, needsH1: true, needsH3: false, needsOverhang: true, postWidth: 196, label: 'Ultrastyle', hint: 'Kein H3 erforderlich — Überstand + H1 + Tiefe' },
        'Skyline': { defaultH3: 2400, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, postWidth: 160, label: 'Skystyle', hint: 'Flachdach, Glashöhe 95mm, nur H3 + Tiefe' },
        'Carport': { defaultH3: 2400, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, postWidth: 160, label: 'Carport', hint: 'Flachdach, Glashöhe 28mm, nur H3 + Tiefe' },
    };
    const modelDrConfig = MODEL_DACHRECHNER_CONFIG[model] || MODEL_DACHRECHNER_CONFIG['Topline'];

    const [dachH3, setDachH3] = useState<number>(modelDrConfig.defaultH3);
    const [dachH1, setDachH1] = useState<number>(modelDrConfig.defaultH1);
    const [dachOverhang, setDachOverhang] = useState<number>(modelDrConfig.defaultOverhang || 300);
    const [wallDimsAuto, setWallDimsAuto] = useState<boolean>(true);

    // === WALL CONFIG ===
    const [wallProduct, setWallProduct] = useState<string>('Side Wall (Glass)');
    const [wallPlacement, setWallPlacement] = useState<'left' | 'right' | 'front'>('left');
    const [keilfensterSide, setKeilfensterSide] = useState<'left' | 'right'>('left');
    const [wallWidth, setWallWidth] = useState<number>(2000);
    const [wallHeight, setWallHeight] = useState<number>(2200);
    const [wallTab, setWallTab] = useState<'walls' | 'awnings' | 'led' | 'materials' | 'wpc' | 'aluminum'>('walls');
    const [wallPrice, setWallPrice] = useState<number | null>(null);
    const [wallPriceLoading, setWallPriceLoading] = useState(false);
    const [wallCategory, setWallCategory] = useState<'fixed' | 'sliding' | 'panorama'>('fixed');
    const [structuralMetadata, setStructuralMetadata] = useState<{ posts_count: number } | null>(null);

    // === SCHIEBETÜR OPTIONS ===
    const [schiebetuerHandle, setSchiebetuerHandle] = useState<string>('ACSL2042');
    const [schiebetuerOpening, setSchiebetuerOpening] = useState<string>('left');

    // === PANORAMA ACCESSORIES ===
    const [panoramaOpeningType, setPanoramaOpeningType] = useState<'side' | 'center'>('side');
    const [panoramaHandleType, setPanoramaHandleType] = useState<'griff' | 'knauf'>('griff');
    const [panoramaSteelLook, setPanoramaSteelLook] = useState<boolean>(false);
    const [panoramaGlassType, setPanoramaGlassType] = useState<'klar' | 'planibel_grau'>('klar');
    const [panoramaAccessoriesPrice, setPanoramaAccessoriesPrice] = useState<number>(0);

    // === ACCESSORIES ===
    const [accessories, setAccessories] = useState<Accessory[]>([]);
    const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
    const [loadingAccessories, setLoadingAccessories] = useState(false);

    // === AWNING CONFIG ===
    const [awningType, setAwningType] = useState<'aufdach' | 'unterdach' | 'zip'>('aufdach');
    const [awningWidth, setAwningWidth] = useState<number>(3000);
    const [awningProjection, setAwningProjection] = useState(3000);
    const [awningMotorCount, setAwningMotorCount] = useState<1 | 2>(1);

    // Keilfenster Options
    const [wedgeGlassType, setWedgeGlassType] = useState('clear');
    const [wedgeAccessories, setWedgeAccessories] = useState<Record<string, boolean>>({
        uProfil: false,
        schraubenSet: false,
        kippFenster: false,
        abdeckungEL891: false
    });

    // === WPC FLOORING ===
    const [wpcArea, setWpcArea] = useState<number>(0);
    const [wpcPricePerM2, setWpcPricePerM2] = useState<number>(0);
    const [wpcTotal, setWpcTotal] = useState<number>(0);

    // === ALUMINUM WALLS ===
    const [aluWallType, setAluWallType] = useState<'full' | 'lamellar'>('full');
    const [aluWallWidth, setAluWallWidth] = useState<number>(2000);
    const [aluWallHeight, setAluWallHeight] = useState<number>(2200);
    const [aluWallPrice, setAluWallPrice] = useState<number | null>(null);
    const [aluWallPriceLoading, setAluWallPriceLoading] = useState(false);

    // === PRICE STATE ===
    const [awningPrice, setAwningPrice] = useState<number | null>(null);

    // === MATERIALS ===
    const [materials, setMaterials] = useState<any[]>([]);
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // === PRICING STATE ===
    const [price, setPrice] = useState<number | null>(null);
    const [freestandingSurchargePrice, setFreestandingSurchargePrice] = useState<number>(0);
    const [variantSurchargePrice, setVariantSurchargePrice] = useState<number>(0);
    const [sonderfarbenSurcharge, setSonderfarbenSurcharge] = useState<number>(0); // +20% for special colors
    const [includeFoundations, setIncludeFoundations] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // === DIMENSION LIMITS (from price table) ===
    const [dimensionLimits, setDimensionLimits] = useState<{
        maxWidth: number;
        maxDepth: number;
        minWidth: number;
        minDepth: number;
    } | null>(null);
    const [structureCount, setStructureCount] = useState<number>(1);
    const [structureNote, setStructureNote] = useState<string>('');

    // === BASKET ===
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [showBasket, setShowBasket] = useState(false);



    // === SUMMARY VIEW ===

    const [margin, setMargin] = useState(40); // Default 40%
    const [discount, setDiscount] = useState(0); // Default 0%
    const [purchaseDiscount, setPurchaseDiscount] = useState(0); // Global purchase discount from Admin
    const [savingOffer, setSavingOffer] = useState(false);
    const [savedOfferId, setSavedOfferId] = useState<string | null>(null);
    const [savedOffer, setSavedOffer] = useState<Offer | null>(null); // Store full offer for PDF
    const [publicLink, setPublicLink] = useState<string | null>(null);
    // Email Workflow State
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [emailBody, setEmailBody] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);

    // === CUSTOM ITEMS (Manual Positions) ===
    const [customItems, setCustomItems] = useState<{ id: string; name: string; price: number }[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    // === MANUAL OFFER MODE ===
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualModel, setManualModel] = useState<string>('Trendline');

    // === MONTAGE (INSTALLATION) ===
    const [montagePrice, setMontagePrice] = useState<number>(0);

    // === CALCULATED VALUES ===
    const areaM2 = (width * projection) / 1_000_000; // Convert mm² to m²

    // === DACHRECHNER INTEGRATION ===
    // Map V2 model IDs to Dachrechner model keys
    const getDachrechnerModelId = (v2ModelId: string): RoofModelId | null => {
        const map: Record<string, RoofModelId> = {
            'Orangeline': 'orangeline',
            'Orangeline+': 'orangeline+',
            'Trendline': 'trendline',
            'Trendline+': 'trendline+',
            'Topline': 'topline',
            'Topline XL': 'topline_xl',
            'Designline': 'designline',
            'Ultraline': 'ultraline_classic',
            'Skyline': 'skyline',
            'Carport': 'carport',
        };
        return map[v2ModelId] || null;
    };

    // Run Dachrechner calculation whenever roof config changes
    const dachrechnerResults = useMemo<DachrechnerResults | null>(() => {
        const drModelId = getDachrechnerModelId(model);
        if (!drModelId || !projection) return null;
        try {
            return calculateDachrechner(drModelId, {
                h3: modelDrConfig.needsH3 ? dachH3 : undefined,
                depth: projection,
                h1: modelDrConfig.needsH1 ? dachH1 : undefined,
                width: width,
                overhang: modelDrConfig.needsOverhang ? dachOverhang : undefined,
                postCount: structuralMetadata?.posts_count || 2,
            });
        } catch {
            return null;
        }
    }, [model, projection, width, dachH3, dachH1, dachOverhang, modelDrConfig, structuralMetadata]);

    // Auto-fill wall dimensions from Dachrechner when product changes
    useEffect(() => {
        if (!wallDimsAuto || !dachrechnerResults) return;

        const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
        const isSide = wallProduct.includes('Side');
        const isFront = wallProduct.includes('Front');
        const isSchiebetur = wallProduct.includes('Schiebetür');
        const isPanorama = wallProduct.includes('Panorama');
        const isFrontPlacement = wallPlacement === 'front';

        // Width calculation: front → full width, side → innerWidth between posts
        const sideWidth = dachrechnerResults.innerWidth ? Math.round(dachrechnerResults.innerWidth) : (dachrechnerResults.fensterF2 ? Math.round(dachrechnerResults.fensterF2) : null);
        const frontWidth = width; // full roof width for front
        const postHeight = dachH3; // H3 = post height for all wall products

        if (isWedge) {
            // Keilfenster: width = fensterF2, height auto from K1/K2
            if (dachrechnerResults.fensterF2) {
                setWallWidth(Math.round(dachrechnerResults.fensterF2));
            }
            // Height = K1 (gutter side) for display – actual K1/K2 shown in summary
            if (dachrechnerResults.keilhoeheK1) {
                setWallHeight(Math.round(dachrechnerResults.keilhoeheK1));
            }
        } else if (isSide || (isSchiebetur && !isFrontPlacement)) {
            // Side wall / side Schiebetür: width = innerWidth, height = H3
            if (sideWidth) setWallWidth(sideWidth);
            setWallHeight(postHeight);
        } else if (isFront || (isSchiebetur && isFrontPlacement) || isPanorama) {
            // Front wall / front Schiebetür / Panorama: each segment = innerWidth between posts
            if (sideWidth) {
                setWallWidth(sideWidth); // per-segment width (between posts)
            } else {
                setWallWidth(frontWidth);
            }
            setWallHeight(postHeight);
        }
    }, [wallProduct, wallPlacement, dachrechnerResults, wallDimsAuto, width, dachH3]);

    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // === AUTO-SWITCH COVER TYPE FOR GLASS-ONLY OR SPECIAL MODELS ===
    useEffect(() => {
        const currentModelConfig = ROOF_MODELS.find(m => m.id === model);
        if (currentModelConfig) {
            // Skyline/Carport have neither Poly nor Glass - leave cover as-is (it's ignored anyway)
            if (!currentModelConfig.hasPoly && !currentModelConfig.hasGlass) {
                // Do nothing - these models don't use cover type in pricing
                return;
            }
            // If model doesn't support Poly, switch to Glass
            if (!currentModelConfig.hasPoly && cover === 'Poly') {
                setCover('Glass');
            }
            // If model doesn't support Glass, switch to Poly
            if (!currentModelConfig.hasGlass && cover === 'Glass') {
                setCover('Poly');
            }
        }
    }, [model, cover]);

    // === FETCH PURCHASE DISCOUNT FROM ADMIN ===
    useEffect(() => {
        const fetchPurchaseDiscount = async () => {
            try {
                // Try to find discount for specific model, fallback to GLOBAL
                const { data } = await supabase
                    .from('pricing_discounts')
                    .select('model_family, discount_percent')
                    .in('model_family', [model, 'GLOBAL']);

                if (data && data.length > 0) {
                    // Prefer model-specific discount, fallback to GLOBAL
                    const modelDiscount = data.find(d => d.model_family === model);
                    const globalDiscount = data.find(d => d.model_family === 'GLOBAL');

                    const discountPercent = modelDiscount?.discount_percent ?? globalDiscount?.discount_percent ?? 0;
                    setPurchaseDiscount(discountPercent);
                } else {
                    setPurchaseDiscount(0);
                }
            } catch (e) {
                console.error('Error fetching purchase discount:', e);
                setPurchaseDiscount(0);
            }
        };
        fetchPurchaseDiscount();
    }, [model]);

    // === LOAD ACCESSORIES ===
    useEffect(() => {
        const loadAccessories = async () => {
            setLoadingAccessories(true);
            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id, name')
                    .eq('is_active', true)
                    .eq('type', 'fixed')
                    .ilike('name', 'Aluxe V2%')
                    .order('name');

                if (!tables) return;

                const accessoryList: Accessory[] = [];
                for (const table of tables) {
                    const { data: priceData } = await supabase
                        .from('price_matrix_entries')
                        .select('price')
                        .eq('price_table_id', table.id)
                        .limit(1);

                    const price = priceData?.[0]?.price || 0;
                    const name = table.name.toLowerCase();
                    let category: Accessory['category'] = 'other';
                    if (name.includes('led') || name.includes('stripe') || name.includes('spots')) category = 'led';
                    else if (name.includes('profil') || name.includes('leiste')) category = 'profile';
                    else if (name.includes('fundament')) category = 'mounting';
                    else if (name.includes('poly')) category = 'polycarbonate';
                    else if (name.includes('pvc')) category = 'pvc';

                    accessoryList.push({
                        id: table.id,
                        name: table.name.replace('Aluxe V2 - ', ''),
                        price: Number(price),
                        category,
                        unit: 'szt'
                    });
                }
                setAccessories(accessoryList);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAccessories(false);
            }
        };
        loadAccessories();
    }, []);

    // === LOAD MATERIALS ===
    useEffect(() => {
        const loadMaterials = async () => {
            setLoadingMaterials(true);
            try {
                const { data } = await supabase
                    .from('aluxe_materials')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order');

                if (data) {
                    // Filter by current model
                    const filtered = data.filter(m =>
                        m.model_family === 'all' ||
                        m.model_family === model ||
                        (m.compatible_models && m.compatible_models.includes(model))
                    );
                    setMaterials(filtered);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingMaterials(false);
            }
        };
        loadMaterials();
    }, [model]);

    // === CALCULATE AWNING PRICE ===
    useEffect(() => {
        const fetchAwningPrice = async () => {
            setAwningPrice(null);

            // Build table name based on type and motor count
            let tableName: string;
            if (awningType === 'aufdach') {
                tableName = awningMotorCount === 1
                    ? 'Aluxe V2 - Markise Aufdach ZIP (1 Motor)'
                    : 'Aluxe V2 - Markise Aufdach ZIP (2 Motors)';
            } else if (awningType === 'unterdach') {
                tableName = awningMotorCount === 1
                    ? 'Aluxe V2 - Markise Unterdach ZIP (1 Motor)'
                    : 'Aluxe V2 - Markise Unterdach ZIP (2 Motors)';
            } else {
                tableName = 'Aluxe V2 - ZIP Screen'; // Fallback for vertical ZIP
            }

            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    const price = await PricingService.calculateMatrixPrice(
                        tables[0].id,
                        awningWidth,
                        awningProjection
                    );
                    if (price !== null) setAwningPrice(price);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchAwningPrice();
    }, [awningType, awningWidth, awningProjection, awningMotorCount]);

    // === CALCULATE WALL/ENCLOSURE PRICE ===
    useEffect(() => {
        const fetchWallPrice = async () => {
            setWallPrice(null);
            setWallPriceLoading(true);

            // Determine target table name based on selected product
            let tableName = '';
            if (wallProduct.includes('Side Wall')) {
                tableName = 'Aluxe V2 - Side Wall (Glass)';
            } else if (wallProduct.includes('Front Wall')) {
                tableName = 'Aluxe V2 - Front Wall (Glass)';
            } else if (wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) {
                // Keilfenster is always Glass (per pricelist), even if roof is Poly
                tableName = `Aluxe V2 - Wedge (Glass)`;
            } else if (wallProduct.includes('Schiebetür')) {
                // Each glass variant has its own full-price table in the database
                tableName = `Aluxe V2 - ${wallProduct}`;
            } else if (wallProduct.includes('Panorama')) {
                // Handle Panorama systems (AL22-AL26)
                tableName = `Aluxe V2 - ${wallProduct}`;
            }

            if (!tableName) {
                setWallPriceLoading(false);
                return;
            }

            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    // Pattern 643: Linearized Matrix lookup
                    // Side Wall: price by HEIGHT (projection_mm = wallHeight), width_mm = 0
                    // Wedge: price by ROOF PROJECTION (not wall height!), width_mm = 0
                    // Front Wall / Schiebetür: price by WIDTH, projection_mm = 0
                    // Panorama: fixed price per panel × number of panels
                    const isPanorama = wallProduct.includes('Panorama');

                    let finalPrice: number | null = null;

                    if (isPanorama) {
                        // Panorama pricing: price per PANEL per METER of height (stored at width=850 as representative)
                        // Formula: price_per_panel * number_of_panels * height_in_meters
                        const panoramaProduct = PANORAMA_PRODUCTS.find(p => wallProduct.includes(p.id.replace('Panorama ', '')));
                        const trackCount = panoramaProduct?.tracks || 3;

                        const panelPrice = await PricingService.calculateMatrixPrice(
                            tables[0].id,
                            1, // Lookup key for panel price (1mm is standard in new tables, 850mm only in legacy)
                            0
                        );

                        console.log(`Panorama pricing: product=${wallProduct}, trackCount=${trackCount}, panelPrice=${panelPrice}, height=${wallHeight}`);

                        if (panelPrice !== null) {
                            // Calculate total price: price_per_panel × number_of_tracks
                            // The DB price is "Per Panel" (up to max height), NOT per meter height.
                            finalPrice = panelPrice * trackCount;
                            console.log(`Panorama final price: ${panelPrice} × ${trackCount} = ${finalPrice.toFixed(2)}`);

                            // Add accessory prices
                            let accessoriesTotal = 0;

                            // Lock based on opening type
                            const lockPrice = panoramaOpeningType === 'center' ? 97.92 : 73.44;
                            accessoriesTotal += lockPrice;

                            // Handle type
                            const handlePrice = panoramaHandleType === 'knauf' ? 36.68 : 14.21;
                            accessoriesTotal += handlePrice;

                            // Verriegelung (always included)
                            accessoriesTotal += 9.80;

                            // Glass surcharge for Planibel Grau (per m²)
                            if (panoramaGlassType === 'planibel_grau') {
                                // Panel area: panel width (max 1100mm) × height
                                const panelWidthM = Math.min(wallWidth / trackCount, 1100) / 1000;
                                const panelHeightM = wallHeight / 1000;
                                const panelArea = panelWidthM * panelHeightM;
                                const glassSurcharge = 47.95 * panelArea * trackCount;
                                accessoriesTotal += glassSurcharge;
                                console.log(`Glass surcharge: 47.95 × ${panelArea.toFixed(2)}m² × ${trackCount} panels = ${glassSurcharge.toFixed(2)}€`);
                            }

                            // Steel-Look profiles (2 side profiles per system)
                            if (panoramaSteelLook) {
                                accessoriesTotal += 18.95 * 2;
                            }

                            setPanoramaAccessoriesPrice(accessoriesTotal);
                            finalPrice += accessoriesTotal;
                            console.log(`Panorama with accessories: base ${(finalPrice - accessoriesTotal).toFixed(2)} + accessories ${accessoriesTotal.toFixed(2)} = ${finalPrice.toFixed(2)}€`);
                        }
                    } else {
                        // Determine correct lookup dimensions based on product type
                        const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
                        const isSideWall = wallProduct.includes('Side');
                        const isSchiebetur = wallProduct.includes('Schiebetür');

                        let lookupWidth: number;
                        let lookupProjection: number;

                        if (isWedge) {
                            // Keilfenster: price by D1 (Breite) dimension from pricelist
                            // D1 ranges from 2000mm to 5000mm in manufacturer pricelist
                            // User enters this as wallWidth in the UI
                            // SQL data has width_mm=0, projection_mm = D1 dimension
                            lookupWidth = 0;
                            lookupProjection = wallWidth; // Use wallWidth as D1 (Breite) dimension
                        } else if (isSideWall) {
                            // Side Wall: price by wall height (stored as projection_mm)
                            lookupWidth = 0;
                            lookupProjection = wallHeight;
                        } else {
                            // Front Wall: price by width, projection = 0
                            // Schiebetür: price by width, projection = 2200 (fixed height in pricelist)
                            lookupWidth = wallWidth;
                            lookupProjection = isSchiebetur ? 2200 : 0;
                        }


                        finalPrice = await PricingService.calculateMatrixPrice(
                            tables[0].id,
                            lookupWidth,
                            lookupProjection
                        );

                        // WEDGE SURCHARGES (Matt / Iso)
                        if (isWedge && finalPrice !== null) {
                            let surcharge = 0;
                            // Matt Glass Surcharge
                            if (wedgeGlassType === 'matt') {
                                const { data: mattTables } = await supabase
                                    .from('price_tables')
                                    .select('id')
                                    .eq('name', 'Aluxe V2 - Wedge (Glass) Surcharge Matt')
                                    .limit(1);
                                if (mattTables?.[0]) {
                                    const mattPrice = await PricingService.calculateMatrixPrice(mattTables[0].id, 0, lookupProjection);
                                    if (mattPrice) surcharge += mattPrice;
                                }
                            }
                            // Iso Glass Surcharge
                            if (wedgeGlassType === 'iso') {
                                const { data: isoTables } = await supabase
                                    .from('price_tables')
                                    .select('id')
                                    .eq('name', 'Aluxe V2 - Wedge (Glass) Surcharge Iso')
                                    .limit(1);
                                if (isoTables?.[0]) {
                                    const isoPrice = await PricingService.calculateMatrixPrice(isoTables[0].id, 0, lookupProjection);
                                    if (isoPrice) surcharge += isoPrice;
                                }
                            }
                            finalPrice += surcharge;
                        }

                        // Schiebetür: full price already included in per-glass-type table, no surcharge needed
                    }

                    if (finalPrice !== null) setWallPrice(finalPrice);
                } else {
                    console.warn(`Table not found: ${tableName}`);
                }
            } catch (e) {
                console.error('Wall price fetch error:', e);
            } finally {
                setWallPriceLoading(false);
            }
        };

        const t = setTimeout(fetchWallPrice, 300);
        return () => clearTimeout(t);
    }, [wallProduct, wallWidth, wallHeight, projection, wedgeGlassType, panoramaOpeningType, panoramaHandleType, panoramaGlassType, panoramaSteelLook]);

    // === AUTO-CALCULATE PANORAMA TRACKS ===
    useEffect(() => {
        if (wallCategory === 'panorama' && wallProduct.includes('Panorama')) {
            // Extract current model from ID
            const currentModelMatch = wallProduct.match(/Panorama (AL\d+)/);
            const currentModel = currentModelMatch ? currentModelMatch[1] : 'AL22';

            const bestVariantId = getBestPanoramaVariant(currentModel, wallWidth);

            // Only update if different to avoid loop
            if (bestVariantId !== wallProduct) {
                setWallProduct(bestVariantId);
            }
        }
    }, [wallWidth, wallCategory]); // Intentionally exclude wallProduct to avoid loops, logic handles manual model changes via click

    // === STRUCTURAL METADATA FETCH ===
    useEffect(() => {
        const fetchStructural = async () => {
            try {
                // Determine table name for structural lookup
                // We use the current configuration (Model + Cover + Zone)
                // If it's pure structure, cover might not matter much but we need a valid table name
                const tableName = buildTableName(model, cover, zone, construction);

                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    const { data: entries } = await supabase
                        .from('price_matrix_entries')
                        .select('posts_count')
                        .eq('price_table_id', tables[0].id)
                        .eq('width_mm', width)
                        .eq('projection_mm', projection)
                        .limit(1);

                    if (entries && entries.length > 0) {
                        setStructuralMetadata({ posts_count: entries[0].posts_count });
                    } else {
                        setStructuralMetadata(null);
                    }
                }
            } catch (e) {
                console.error('Structural fetch error:', e);
            }
        };
        fetchStructural();
    }, [model, cover, zone, construction, width, projection]);

    // === CALCULATE SCHIEBEEINHEIT (Sliding Roof) PRICE FOR DESIGNLINE ===
    useEffect(() => {
        const fetchSchiebeeinheitPrice = async () => {
            // Only applies to Designline model
            if (model !== 'Designline') {
                setSchiebeeinheitUnitPrice(0);
                setSchiebeeinheitTotalPrice(0);
                return;
            }

            try {
                // Lookup surcharge table for Schiebeeinheit
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .ilike('name', '%Designline%Schiebeeinheit%')
                    .eq('is_active', true)
                    .limit(1);

                if (tables && tables.length > 0) {
                    // Price is by projection (depth) dimension
                    const unitPrice = await PricingService.calculateMatrixPrice(
                        tables[0].id,
                        0,
                        projection
                    );

                    if (unitPrice !== null) {
                        setSchiebeeinheitUnitPrice(unitPrice);
                        setSchiebeeinheitTotalPrice(unitPrice * schiebeeinheitCount);
                        console.log(`[SCHIEBEEINHEIT] Unit price: ${unitPrice}€, Count: ${schiebeeinheitCount}, Total: ${unitPrice * schiebeeinheitCount}€`);
                    }
                } else {
                    // Fallback: calculate based on formula from Excel (89.10 EUR per meter depth per field)
                    const fallbackUnitPrice = Math.round((projection / 1000) * 89.10 * 100) / 100;
                    setSchiebeeinheitUnitPrice(fallbackUnitPrice);
                    setSchiebeeinheitTotalPrice(fallbackUnitPrice * schiebeeinheitCount);
                    console.log(`[SCHIEBEEINHEIT] Using fallback formula: ${fallbackUnitPrice}€ per field`);
                }
            } catch (e) {
                console.error('Schiebeeinheit price fetch error:', e);
            }
        };

        fetchSchiebeeinheitPrice();
    }, [model, projection, schiebeeinheitCount]);

    // === CALCULATE ROOF PRICE ===
    useEffect(() => {
        const fetchPrice = async () => {
            console.log('[PRICE FETCH START]', { model, cover, zone, construction, width, projection, glassVariant, polyVariant });
            setLoading(true);
            setPrice(null);
            setError(null);
            setFreestandingSurchargePrice(0);

            try {
                // 1. Fetch BASE Price
                let tableName = buildTableName(model, cover, zone, construction);
                // IF Freestanding AND (Trendline OR Topline), we use the WALL table for base price
                // and add surcharge separately.
                // UNLESS logical "Freestanding" tables exist for other models (Skyline/Carport) which usually do.

                // Models that use the Freestanding Surcharge table (per Excel sheet 'Freistehende TerrassendächerR')
                // Applies to: Orangeline, Trendline, Topline, Designline and their Plus/XL variants
                const isSurchargeModel = [
                    'Orangeline', 'Orangeline+',
                    'Trendline', 'Trendline+',
                    'Topline', 'Topline XL',
                    'Designline'
                ].includes(model);

                const effectiveConstruction = (construction === 'freestanding' && isSurchargeModel) ? 'wall' : construction;

                // Use the new findPriceTable helper that tries multiple naming formats
                let table = await findPriceTable(supabase, model, cover, zone, effectiveConstruction);

                if (!table) {
                    // For Skyline/Carport: if freestanding table not found, DON'T fallback to wall
                    // They have separate tables and shouldn't be mixed
                    const isNoCoverModel = model === 'Skyline' || model === 'Carport';
                    if (!isNoCoverModel && construction === 'freestanding' && !isSurchargeModel) {
                        // Only for regular models with surcharge approach, try wall table
                        table = await findPriceTable(supabase, model, cover, zone, 'wall');
                    }
                }

                if (!table) {
                    setError(`Brak cennika bazowego: ${tableName} lub ${buildDbTableName(model, cover, zone)}`);
                    setLoading(false);
                    return;
                }

                // Fetch dimension limits for this table (for UI constraints)
                const limits = await PricingService.getTableDimensionLimits(table.id);
                if (limits) {
                    setDimensionLimits({
                        maxWidth: limits.maxWidth,
                        maxDepth: limits.maxDepth,
                        minWidth: limits.minWidth,
                        minDepth: limits.minDepth
                    });

                    // Auto-constrain dimensions to valid range
                    let needsRerun = false;

                    // Check WIDTH limits (allow up to 2x for combined constructions)
                    if (width < limits.minWidth) {
                        console.log(`[Price] Width ${width} < min ${limits.minWidth}, auto-adjusting`);
                        setWidth(limits.minWidth);
                        needsRerun = true;
                    } else if (width > limits.maxWidth * 2) {
                        console.log(`[Price] Width ${width} > max combined ${limits.maxWidth * 2}, auto-adjusting`);
                        setWidth(limits.maxWidth * 2);
                        needsRerun = true;
                    }

                    // Check PROJECTION/DEPTH limits
                    if (projection < limits.minDepth) {
                        console.log(`[Price] Projection ${projection} < min ${limits.minDepth}, auto-adjusting`);
                        setProjection(limits.minDepth);
                        needsRerun = true;
                    } else if (projection > limits.maxDepth) {
                        console.log(`[Price] Projection ${projection} > max ${limits.maxDepth}, auto-adjusting`);
                        setProjection(limits.maxDepth);
                        needsRerun = true;
                    }

                    if (needsRerun) {
                        // Re-run calculation will happen due to state change
                        setLoading(false);
                        return;
                    }
                }

                // Use combined pricing (handles multi-structure automatically)
                const combinedResult = await PricingService.calculateCombinedPrice(table.id, width, projection);

                if (combinedResult !== null) {
                    setPrice(combinedResult.totalPrice);
                    setStructureCount(combinedResult.structureCount);
                    setStructureNote(combinedResult.note);
                } else {
                    setError(`Wymiar niedostępny w cenniku bazowym`);
                    setLoading(false);
                    return;
                }

                // 2. Fetch Freestanding SURCHARGE if applicable
                if (construction === 'freestanding') {
                    if (isSurchargeModel) {
                        // Ultraline has its own surcharge table (no foundations variant only)
                        let surchargeTableName = '';
                        if (model === 'Ultraline') {
                            surchargeTableName = 'Aluxe V2 - Ultraline Freestanding Surcharge (No Foundation)';
                        } else {
                            surchargeTableName = includeFoundations
                                ? 'Aluxe V2 - Freestanding Surcharge (With Foundation)'
                                : 'Aluxe V2 - Freestanding Surcharge (No Foundation)';
                        }

                        const { data: surchargeTables } = await supabase
                            .from('price_tables')
                            .select('id')
                            .eq('name', surchargeTableName)
                            .limit(1);


                        if (surchargeTables && surchargeTables.length > 0) {
                            // Surcharge is based on WIDTH only. Projection is irrelevant (pass 0).
                            // IMPORTANT: For combined structures, calculate surcharge per segment
                            let totalSurcharge = 0;

                            if (combinedResult && combinedResult.structures.length > 1) {
                                // Multiple structures: calculate surcharge for EACH segment's width
                                for (const structure of combinedResult.structures) {
                                    const segmentSurcharge = await PricingService.calculateMatrixPrice(
                                        surchargeTables[0].id,
                                        structure.width,
                                        0
                                    );
                                    if (segmentSurcharge !== null) {
                                        totalSurcharge += segmentSurcharge;
                                    }
                                }
                                console.log(`🔧 Freestanding Surcharge: ${combinedResult.structures.length} segments, total: ${totalSurcharge} EUR`);
                            } else {
                                // Single structure: use total width
                                const surcharge = await PricingService.calculateMatrixPrice(surchargeTables[0].id, width, 0);
                                totalSurcharge = surcharge || 0;
                            }

                            if (totalSurcharge > 0) {
                                setFreestandingSurchargePrice(totalSurcharge);
                            } else {
                                console.warn('Surcharge not found for width', width);
                            }
                        }
                    } else {
                        // Logic for other models (e.g. Ultraline) if they fallback to simplified +15%
                        // If we are here, it means we found a base table.
                        // If it was a 'Freestanding' table (Skyline/Carport), price covers everything.
                        // If it was a 'Wall' table (fallback logic above), we might need to add 15%.
                        if (table.name.includes('Freestanding')) {
                            // Price is already full
                        } else {
                            // Price is Wall base, add 15% manually?
                            // Legacy logic was +15%. Let's keep it consistent for non-surcharge models.
                            // Currently `freestandingSurchargePrice` is absolute. 15% of base price.
                            setFreestandingSurchargePrice((combinedResult?.totalPrice || 0) * 0.15);
                        }
                    }
                }

                // 3. Fetch VARIANT SURCHARGE from database (Glass Matt/Stopsol or Poly IR Gold)
                // Surcharge tables exist in format: "Aluxe V2 - {Model} {Poly/Glass} {Variant} Surcharge (Zone {N})"
                setVariantSurchargePrice(0); // Reset

                // Only apply surcharge for non-default variants
                const needsSurcharge = (cover === 'Glass' && glassVariant !== 'klar') ||
                    (cover === 'Poly' && polyVariant === 'ir-gold');

                console.log('[SURCHARGE DEBUG]', { cover, glassVariant, polyVariant, needsSurcharge, basePrice: combinedResult?.totalPrice });

                if (needsSurcharge && combinedResult?.totalPrice) {
                    // Map model name to DB format (e.g., "Trendline" stays as "Trendline")
                    const dbModel = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();

                    // Determine surcharge type and build table name
                    let surchargeType = '';
                    let coverType = '';

                    if (cover === 'Glass' && glassVariant === 'matt') {
                        surchargeType = 'Glass Matt';
                        coverType = 'Glass';
                    } else if (cover === 'Glass' && glassVariant === 'stopsol') {
                        surchargeType = 'Glass Stopsol';
                        coverType = 'Glass';
                    } else if (cover === 'Poly' && polyVariant === 'ir-gold') {
                        surchargeType = 'Poly IR Gold';
                        coverType = 'Poly';
                    }

                    if (surchargeType) {
                        // Table name format: "Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)"
                        const surchargeTableName = `Aluxe V2 - ${dbModel} ${surchargeType} Surcharge (Zone ${zone})`;
                        console.log('[SURCHARGE DEBUG] Looking for table:', surchargeTableName);

                        // Try exact match first
                        let { data: surchargeTable } = await supabase
                            .from('price_tables')
                            .select('id, name')
                            .eq('name', surchargeTableName)
                            .limit(1);

                        // If not found, try ILIKE for flexible matching
                        if (!surchargeTable || surchargeTable.length === 0) {
                            const searchPattern = `%${dbModel}%${surchargeType}%Zone ${zone}%`;
                            console.log('[SURCHARGE DEBUG] Trying ILIKE:', searchPattern);

                            const { data: fuzzyResult } = await supabase
                                .from('price_tables')
                                .select('id, name')
                                .ilike('name', searchPattern)
                                .limit(1);
                            surchargeTable = fuzzyResult;
                        }

                        if (surchargeTable && surchargeTable.length > 0) {
                            console.log('[SURCHARGE DEBUG] Found table:', surchargeTable[0].name);

                            // Get price from matrix
                            const surchargePrice = await PricingService.calculateMatrixPrice(
                                surchargeTable[0].id, width, projection
                            );

                            console.log('[SURCHARGE DEBUG] Surcharge price:', surchargePrice);

                            if (surchargePrice !== null && surchargePrice > 0) {
                                setVariantSurchargePrice(surchargePrice);
                            }
                        } else {
                            console.warn('[SURCHARGE DEBUG] Surcharge table not found:', surchargeTableName);
                        }
                    }
                }

                // 4. Calculate SONDERFARBEN surcharge (+20% on construction price)
                if (sonderfarben && combinedResult?.totalPrice) {
                    const constructionPrice = combinedResult.totalPrice;
                    const sonderfarbenAmount = Math.round(constructionPrice * 0.20 * 100) / 100;
                    console.log(`[SONDERFARBEN] Applied +20% = ${sonderfarbenAmount}€`);
                    setSonderfarbenSurcharge(sonderfarbenAmount);
                } else {
                    setSonderfarbenSurcharge(0);
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        const t = setTimeout(fetchPrice, 300);
        return () => clearTimeout(t);
    }, [model, cover, zone, construction, width, projection, includeFoundations, glassVariant, polyVariant, sonderfarben]);

    // === FETCH WPC PRICE PER M² ===
    useEffect(() => {
        const fetchWpcPrice = async () => {
            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', 'Aluxe V2 - WPC Flooring')
                    .limit(1);

                if (tables && tables.length > 0) {
                    const { data: entries } = await supabase
                        .from('price_matrix_entries')
                        .select('price')
                        .eq('price_table_id', tables[0].id)
                        .limit(1);

                    if (entries && entries.length > 0) {
                        const pricePerM2 = parseFloat(entries[0].price);
                        setWpcPricePerM2(pricePerM2);
                        setWpcTotal(wpcArea * pricePerM2);
                    }
                }
            } catch (e) {
                console.error('WPC price fetch error:', e);
            }
        };
        fetchWpcPrice();
    }, [wpcArea]); // Re-fetch to update total when area changes

    // === FETCH ALUMINUM WALL PRICE ===
    useEffect(() => {
        const fetchAluWallPrice = async () => {
            setAluWallPriceLoading(true);
            try {
                const tableName = aluWallType === 'full'
                    ? 'Aluxe V2 - Aluminum Wall Full'
                    : 'Aluxe V2 - Aluminum Wall Lamellar';

                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    if (aluWallType === 'full') {
                        // Matrix lookup: width × height
                        const { data: entries } = await supabase
                            .from('price_matrix_entries')
                            .select('price')
                            .eq('price_table_id', tables[0].id)
                            .eq('width_mm', aluWallWidth)
                            .eq('projection_mm', aluWallHeight)
                            .limit(1);

                        if (entries && entries.length > 0) {
                            setAluWallPrice(parseFloat(entries[0].price));
                        } else {
                            setAluWallPrice(null);
                        }
                    } else {
                        // Lamellar: price per mb × length × height_factor
                        // Get price for this height (stored as projection_mm)
                        const { data: entries } = await supabase
                            .from('price_matrix_entries')
                            .select('price')
                            .eq('price_table_id', tables[0].id)
                            .eq('projection_mm', aluWallHeight)
                            .limit(1);

                        if (entries && entries.length > 0) {
                            const pricePerMb = parseFloat(entries[0].price);
                            // aluWallWidth for lamellar is treated as length in mm
                            const lengthInMeters = aluWallWidth / 1000;
                            setAluWallPrice(pricePerMb * lengthInMeters);
                        } else {
                            setAluWallPrice(null);
                        }
                    }
                } else {
                    setAluWallPrice(null);
                }
            } catch (e) {
                console.error('Aluminum wall price fetch error:', e);
                setAluWallPrice(null);
            } finally {
                setAluWallPriceLoading(false);
            }
        };

        const t = setTimeout(fetchAluWallPrice, 300);
        return () => clearTimeout(t);
    }, [aluWallType, aluWallWidth, aluWallHeight]);

    // === TOTALS ===
    const currentModel = useMemo(() => ROOF_MODELS.find(m => m.id === model), [model]);

    const totalPrice = useMemo(() => {
        if (price === null) return null;
        return price + freestandingSurchargePrice + variantSurchargePrice + sonderfarbenSurcharge + schiebeeinheitTotalPrice;
    }, [price, freestandingSurchargePrice, variantSurchargePrice, sonderfarbenSurcharge, schiebeeinheitTotalPrice]);

    const addToBasket = (itemName: string, itemPrice: number, configStr: string, dimStr: string, category: BasketItem['category']) => {
        const newItem: BasketItem = {
            id: crypto.randomUUID(),
            category,
            name: itemName,
            config: configStr,
            dimensions: dimStr,
            price: itemPrice,
            quantity: 1
        };
        setBasket(prev => [...prev, newItem]);
        toast.success(`Dodano do koszyka: ${itemName}`);
    };

    const handleAddRoofToBasket = () => {
        if (!totalPrice) return;
        const variantName = cover === 'Glass'
            ? GLASS_VARIANTS.find(v => v.id === glassVariant)?.name || glassVariant
            : POLY_VARIANTS.find(v => v.id === polyVariant)?.name || polyVariant;
        const configStr = `${cover} (${variantName})${variantSurchargePrice > 0 ? ` +${formatCurrency(variantSurchargePrice)}` : ''}, Zone ${zone}, ${construction === 'wall' ? 'Przyścienna' : 'Wolnostojąca'}` +
            (freestandingSurchargePrice > 0 ? ` (+${formatCurrency(freestandingSurchargePrice)})` : '') +
            (construction === 'freestanding' && includeFoundations ? ' + Fundamenty' : '') +
            (sonderfarben ? ` | Sonderfarben +20% (+${formatCurrency(sonderfarbenSurcharge)})` : '') +
            (schiebeeinheitCount > 0 ? ` | Schiebeeinheit: ${schiebeeinheitCount}× (+${formatCurrency(schiebeeinheitTotalPrice)})` : '') +
            (structureNote ? ` (${structureNote})` : '');
        const roofDisplayName = ROOF_MODELS.find(m => m.id === model)?.name || model;
        addToBasket(roofDisplayName, totalPrice, configStr, `${width}×${projection}mm`, 'roof');
    };

    const handleAddAccessoryBatch = () => {
        const items = Object.entries(accessoryQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
                const acc = accessories.find(a => a.id === id)!;
                return {
                    id: crypto.randomUUID(),
                    category: 'accessory' as const,
                    name: acc.name,
                    config: `${qty} x ${formatCurrency(acc.price)}`,
                    dimensions: '',
                    price: acc.price * qty,
                    quantity: qty
                };
            });

        if (items.length === 0) {
            toast.error('Wybierz dodatki');
            return;
        }
        setBasket(prev => [...prev, ...items]);
        setAccessoryQuantities({});
        toast.success(`Dodano ${items.length} dodatków`);
    };

    const basketTotal = useMemo(() => basket.reduce((sum, item) => sum + item.price, 0), [basket]);

    const removeFromBasket = (itemId: string) => {
        setBasket(prev => prev.filter(item => item.id !== itemId));
        toast.success('Usunięto z koszyka');
    };


    // === CUSTOMER HANDLER ===
    const handleCustomerComplete = (data: Customer, snowZoneData: any) => {
        setCustomerState(data);

        // Map snow zone if provided
        if (snowZoneData && snowZoneData.value) {
            const zoneId = parseInt(snowZoneData.id);
            if (!isNaN(zoneId)) {
                setZone(zoneId);
            }
        }

        setView('mode-select'); // Go to mode selection (calculator vs manual)
    };



    // === CALCULATED SUMMARY VALUES ===
    const customItemsTotal = customItems.reduce((sum, item) => sum + item.price, 0);
    const subtotal = basketTotal + customItemsTotal;

    // Step 1: Apply purchase discount (this is the cost price after your discount from supplier)
    const purchaseDiscountValue = subtotal * (purchaseDiscount / 100);
    const purchasePrice = subtotal - purchaseDiscountValue;

    // Step 2: Apply margin on top of purchase price
    const marginValue = purchasePrice * (margin / 100);
    const priceAfterMargin = purchasePrice + marginValue;

    // Step 3: Apply customer discount (manual discount given to customer)
    const discountValue = priceAfterMargin * (discount / 100);
    const priceAfterDiscount = priceAfterMargin - discountValue;

    // Step 4: Add montage price (netto, not affected by margin/discount)
    const finalPrice = priceAfterDiscount + montagePrice;

    // === SAVE OFFER HANDLER ===
    const handleSaveOffer = async () => {
        if (!currentUser) {
            toast.error('Musisz być zalogowany');
            return;
        }
        // In manual mode, check customItems instead of basket
        if (!isManualMode && basket.length === 0) {
            toast.error('Koszyk jest pusty');
            return;
        }
        if (isManualMode && customItems.length === 0) {
            toast.error('Dodaj co najmniej jedną pozycję');
            return;
        }
        // Validation using customerState
        if (!customerState || (!customerState.name && !customerState.lastName)) {
            toast.error('Brak danych klienta');
            return;
        }

        setSavingOffer(true);
        try {
            // 1. Prepare customer data from customerState
            // Ensure we have a valid structure for the DB service
            // customerState comes from CustomerForm which has correct fields
            const customerData = {
                firstName: customerState.firstName || '',
                lastName: customerState.lastName || customerState.name || '',
                email: customerState.email,
                phone: customerState.phone,
                address: customerState.street ? `${customerState.street} ${customerState.houseNumber || ''}, ${customerState.postalCode || ''} ${customerState.city || ''}` : customerState.address,
                street: customerState.street,
                houseNumber: customerState.houseNumber,
                postalCode: customerState.postalCode,
                city: customerState.city,
                name: customerState.name || `${customerState.firstName || ''} ${customerState.lastName || ''}`,
                companyName: customerState.companyName || '',
                salutation: customerState.salutation || 'Herr'
            };

            // 2. Reuse existing lead or create new one
            let lead: any;
            if (customerState.id) {
                // Customer already exists — check for existing lead
                const existingLeads = await LeadService.getCustomerLeads(customerState.id);
                if (existingLeads && existingLeads.length > 0) {
                    // Reuse the most recent lead
                    lead = existingLeads[0];
                    console.log('♻️ Reusing existing lead:', lead.id);
                }
            }
            if (!lead) {
                // No existing lead found — create a new one
                lead = await DatabaseService.createLead({
                    status: 'negotiation',
                    source: 'calculator_v2',
                    customerData: customerData,
                    customerId: customerState.id,
                    notes: `Konfiguracja V2: ${basket.map(b => b.name).join(', ')}`
                });
                console.log('🆕 Created new lead:', lead.id);
            }

            const selectedModel = isManualMode ? manualModel : model;
            const selectedModelConfig = ROOF_MODELS.find(m => m.id === selectedModel);

            const productConfig = {
                modelId: selectedModel,
                isManual: isManualMode,
                width: isManualMode ? 0 : width,
                projection: isManualMode ? 0 : projection,
                roofType: isManualMode ? 'manual' as any : cover.toLowerCase() as any,
                construction: isManualMode ? 'wall' as any : construction,
                color: isManualMode ? '' : color,
                variant: isManualMode ? '' : (cover === 'Glass' ? glassVariant : polyVariant),
                // Include model image URL for interactive offer
                imageUrl: selectedModelConfig?.image_url || `/images/models/${selectedModel.toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus')}.jpg`,
                // Main items from V2 basket (empty in manual mode)
                items: isManualMode ? [] : basket.map(b => ({ name: b.name, config: b.config, price: b.price })),
                // Custom items — primary content in manual mode, supplementary in standard mode
                customItems: customItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    description: isManualMode ? 'Manuelle Angebotsposition' : 'Manuelle Position',
                })),
                // Dachrechner technical data
                dachrechnerData: dachrechnerResults ? {
                    h3: dachH3,
                    h1: dachH1,
                    angleAlpha: dachrechnerResults.angleAlpha,
                    angleBeta: dachrechnerResults.angleBeta,
                    inclinationMmM: dachrechnerResults.inclinationMmM,
                    heightH2: dachrechnerResults.heightH2,
                    depthD1: dachrechnerResults.depthD1,
                    depthD2: dachrechnerResults.depthD2,
                    depthD2alt: dachrechnerResults.depthD2alt,
                    depthD4post: dachrechnerResults.depthD4post,
                    depthD5: dachrechnerResults.depthD5,
                    fensterF1: dachrechnerResults.fensterF1,
                    fensterF2: dachrechnerResults.fensterF2,
                    fensterF3: dachrechnerResults.fensterF3,
                    keilhoeheK1: dachrechnerResults.keilhoeheK1,
                    keilhoeheK2: dachrechnerResults.keilhoeheK2,
                    sparrenMitte: dachrechnerResults.sparrenMitte,
                    sparrenAussen: dachrechnerResults.sparrenAussen,
                } : null,
                postWidth: ({ 'Orangeline': 110, 'Orangeline+': 110, 'Trendline': 110, 'Trendline+': 110, 'Topline': 149, 'Topline XL': 196, 'Designline': 196, 'Ultraline': 196, 'Skyline': 160, 'Carport': 160 } as Record<string, number>)[selectedModel] || null,
            };

            // 4. Build pricing object
            const pricing = {
                basePrice: basketTotal, // Base sum of basket components
                addonsPrice: 0,
                customItemsPrice: customItemsTotal, // Separate custom items sum
                marginPercentage: margin,
                marginValue: marginValue,
                discountPercentage: discount,
                discountValue: discountValue,
                sellingPriceNet: finalPrice,
                sellingPriceGross: finalPrice * 1.19, // 19% VAT
                totalCost: finalPrice * 1.19
            };

            // 5. Create Offer
            const offer = await DatabaseService.createOffer({
                offerNumber: `V2-${Date.now()}`,
                customer: customerData as Customer,
                product: productConfig as any, // Cast for flexibility with V2 custom types
                pricing: pricing,
                status: 'draft',
                snowZone: { id: '1', value: 0.85, description: 'Zone 1' },
                commission: 0,
                leadId: lead.id
            });

            // 6. Generate public link
            // 6. Generate public link
            const token = await DatabaseService.ensurePublicToken(offer.id);
            const link = `${window.location.origin}/p/offer/${token}`;
            setPublicLink(link);
            setSavedOfferId(offer.id);
            setSavedOffer(offer); // Store full offer for PDF generation

            toast.success('Oferta zapisana!');

            // Stay on summary to show link, or navigate
            // For now, show success state on summary

        } catch (e: any) {
            console.error('Save offer error:', e);
            toast.error(e.message || 'Błąd zapisu oferty');
        } finally {
            setSavingOffer(false);
        }
    };

    // === FINAL SUMMARY VIEW ===
    if (view === 'summary') {
        const handleAddCustomItem = () => {
            if (!newItemName.trim()) return;
            const price = parseFloat(newItemPrice) || 0;
            setCustomItems([...customItems, {
                id: `custom-${Date.now()}`,
                name: newItemName.trim(),
                price
            }]);
            setNewItemName('');
            setNewItemPrice('');
        };

        const handleRemoveCustomItem = (id: string) => {
            setCustomItems(customItems.filter(item => item.id !== id));
        };

        const handleGenerateEmail = async () => {
            if (!savedOffer || !currentUser) return;
            setIsGeneratingEmail(true);
            try {
                // Use the saved offer object for email generation
                const content = await AiService.generateEmail(savedOffer as any, currentUser, publicLink || undefined);
                setEmailBody(content);
                setShowEmailModal(true);
            } catch (error) {
                console.error("Email generation failed", error);
                toast.error("Błąd generowania treści maila");
            } finally {
                setIsGeneratingEmail(false);
            }
        };

        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setView(isManualMode ? 'manual' : 'config')}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                        >
                            ← {isManualMode ? 'Zurück zur manuellen Eingabe' : 'Zurück zur Konfiguration'}
                        </button>
                        <h1 className="text-2xl font-black text-slate-900">Angebotszusammenfassung</h1>
                    </div>

                    {/* Technical Specs — hidden in manual mode */}
                    {!isManualMode ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                📐 Technische Daten
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="bg-slate-50 p-3 rounded-lg text-center">
                                    <p className="text-slate-500 text-xs uppercase">Breite</p>
                                    <p className="font-bold text-lg">{(width / 1000).toFixed(2)} m</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg text-center">
                                    <p className="text-slate-500 text-xs uppercase">Tiefe</p>
                                    <p className="font-bold text-lg">{(projection / 1000).toFixed(2)} m</p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-lg text-center border border-indigo-200">
                                    <p className="text-indigo-600 text-xs uppercase font-bold">Fläche</p>
                                    <p className="font-black text-xl text-indigo-700">{areaM2.toFixed(2)} m²</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-200">
                                    <p className="text-amber-600 text-xs uppercase font-bold">Pfosten</p>
                                    <p className="font-black text-xl text-amber-700">{structuralMetadata?.posts_count || '-'}</p>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                                <div><span className="text-slate-500">Modell:</span> <strong>{model}</strong></div>
                                <div><span className="text-slate-500">Dachtyp:</span> <strong>{cover}</strong></div>
                                <div><span className="text-slate-500">Bauweise:</span> <strong>{construction === 'wall' ? 'Wandmontage' : 'Freistehend'}</strong></div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                ✍️ Manuelles Angebot
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100">
                                    <img
                                        src={ROOF_MODELS.find(m => m.id === manualModel)?.image_url || '/images/models/trendline.jpg'}
                                        alt={manualModel}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">Ausgewähltes Modell</p>
                                    <p className="font-bold text-xl text-slate-800">{manualModel}</p>
                                    <p className="text-xs text-slate-400">{ROOF_MODELS.find(m => m.id === manualModel)?.description || ''}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Info (REFRESHED) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative">
                        <div className="flex justify-between items-start">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                👤 Kundendaten
                            </h2>
                            <button
                                onClick={() => setView('customer')}
                                className="text-xs text-indigo-600 font-bold hover:underline"
                            >
                                Bearbeiten
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500 block">Name:</span>
                                <strong className="text-slate-800">
                                    {customerState ? (customerState.firstName ? `${customerState.firstName} ${customerState.lastName}` : customerState.name) : '-'}
                                </strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block">E-Mail:</span>
                                <strong className="text-slate-800">{customerState?.email || '-'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block">Telefon:</span>
                                <strong className="text-slate-800">{customerState?.phone || '-'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block">Adresse:</span>
                                <strong className="text-slate-800">
                                    {[customerState?.street, customerState?.postalCode, customerState?.city].filter(Boolean).join(', ') || '-'}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">🛒 Positionen</h2>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-2 text-slate-500">Produkt</th>
                                    <th className="text-left py-2 text-slate-500">Konfiguration</th>
                                    <th className="text-right py-2 text-slate-500">Preis</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {basket.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                        <td className="py-3 font-medium">{item.name}</td>
                                        <td className="py-3 text-slate-600 text-xs max-w-[200px] truncate">{item.config}</td>
                                        <td className="py-3 text-right font-bold">{formatCurrency(item.price)}</td>
                                        <td className="py-3 text-center">
                                            <button
                                                onClick={() => removeFromBasket(item.id)}
                                                className="text-red-500 hover:text-red-700 text-xs p-1 hover:bg-red-50 rounded"
                                                title="Usuń z koszyka"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {customItems.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 last:border-0 bg-blue-50">
                                        <td className="py-3 font-medium text-blue-700">📝 {item.name}</td>
                                        <td className="py-3 text-slate-600 text-xs">Dodano ręcznie</td>
                                        <td className="py-3 text-right font-bold">{formatCurrency(item.price)}</td>
                                        <td className="py-3 text-center">
                                            <button
                                                onClick={() => handleRemoveCustomItem(item.id)}
                                                className="text-red-500 hover:text-red-700 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-200">
                                    <td colSpan={2} className="py-3 font-bold">Suma częściowa</td>
                                    <td className="py-3 text-right font-bold">{formatCurrency(subtotal)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Add Custom Item */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Dodaj pozycję</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="Opis pozycji..."
                                    className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                />
                                <input
                                    type="number"
                                    value={newItemPrice}
                                    onChange={e => setNewItemPrice(e.target.value)}
                                    placeholder="Cena €"
                                    className="w-32 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-right"
                                />
                                <button
                                    onClick={handleAddCustomItem}
                                    disabled={!newItemName.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
                                >
                                    + Dodaj
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Margin & Discount */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">💰 Marża & Rabat</h2>

                        {/* Purchase Discount Info (from Admin) */}
                        {purchaseDiscount > 0 && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-green-700">🏷️ Rabat zakupowy (Admin):</span>
                                    <span className="font-bold text-green-800">{purchaseDiscount}%</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-xs text-green-600">
                                    <span>Cena zakupu:</span>
                                    <span className="font-bold">{formatCurrency(purchasePrice)}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Marża (%)</label>
                                <input
                                    type="number"
                                    value={margin}
                                    onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <p className="text-xs text-slate-400 mt-1">+ {formatCurrency(marginValue)}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rabat (%)</label>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <p className="text-xs text-slate-400 mt-1">- {formatCurrency(discountValue)}</p>
                            </div>
                        </div>

                        {/* MONTAGE PRICE */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">🔧 Montaż (netto)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={montagePrice || ''}
                                    onChange={e => setMontagePrice(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step={100}
                                    placeholder="0.00"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <span className="text-slate-500 font-bold text-lg flex-shrink-0">€ netto</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Kwota dodawana do ceny końcowej (nie podlega marży ani rabatowi)</p>
                        </div>
                    </div>

                    {/* Final Price */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-indigo-200 text-sm">Cena końcowa (netto)</p>
                                <p className="text-4xl font-black">{formatCurrency(finalPrice)}</p>
                                {montagePrice > 0 && <p className="text-indigo-200 text-xs">w tym montaż: {formatCurrency(montagePrice)}</p>}
                                <p className="text-indigo-200 text-sm mt-1">z 19% VAT = {formatCurrency(finalPrice * 1.19)}</p>
                            </div>
                            {!isManualMode && (
                                <div className="text-right">
                                    <p className="text-indigo-200 text-xs">Powierzchnia</p>
                                    <p className="text-2xl font-bold">{areaM2.toFixed(2)} m²</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Button or Success State */}
                    {savedOfferId ? (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-green-700">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="font-bold">Oferta zapisana pomyślnie!</p>
                                    <p className="text-xs text-green-600">ID: {savedOfferId}</p>
                                </div>
                            </div>

                            {/* Public Link Section */}
                            {publicLink && (
                                <div className="bg-white p-4 rounded-xl border border-green-100 space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        🔗 Link zur interaktiven Angebotsseite
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={publicLink}
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none"
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(publicLink);
                                                toast.success('Link skopiowany!');
                                            }}
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm"
                                        >
                                            Kopiuj
                                        </button>
                                        <a
                                            href={publicLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm flex items-center"
                                        >
                                            ↗️
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleGenerateEmail}
                                    disabled={isGeneratingEmail}
                                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {isGeneratingEmail ? (
                                        <>
                                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                            Generuję...
                                        </>
                                    ) : (
                                        <>✉️ Treść E-Maila (AI)</>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        if (publicLink) {
                                            const printUrl = publicLink.replace('/p/offer/', '/print/offer/');
                                            window.open(printUrl, '_blank');
                                        } else if (savedOffer?.publicToken) {
                                            window.open(`/print/offer/${savedOffer.publicToken}`, '_blank');
                                        } else {
                                            toast.error("Proszę najpierw zapisać ofertę");
                                        }
                                    }}
                                    disabled={!savedOffer}
                                    className={`px-4 py-3 border rounded-xl font-bold ${savedOffer ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                                >
                                    📄 Drukuj / PDF
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                                >
                                    Wyjdź
                                </button>
                            </div>
                        </div>

                    ) : (
                        <button
                            onClick={handleSaveOffer}
                            disabled={savingOffer || (!isManualMode && basket.length === 0) || (isManualMode && customItems.length === 0)}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${savingOffer || (!isManualMode && basket.length === 0) || (isManualMode && customItems.length === 0)
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                                }`}
                        >
                            {savingOffer ? 'Speichern...' : '💾 Angebot speichern'}
                        </button>
                    )}
                </div >
            </div >
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            {/* CUSTOMER VIEW — full width centered */}
            {view === 'customer' && (
                <div className="col-span-12 max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                        <CustomerForm
                            onComplete={handleCustomerComplete}
                            submitLabel="Weiter"
                            initialData={customerState || undefined}
                        />
                    </div>
                </div>
            )}

            {/* MODE SELECTION VIEW — full width centered */}
            {view === 'mode-select' && (
                <div className="col-span-12 max-w-3xl mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-slate-900 mb-2">Angebotsart wählen</h1>
                        <p className="text-slate-500">Wie möchten Sie das Angebot erstellen?</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Standard Calculator */}
                        <button
                            onClick={() => { setIsManualMode(false); setView('config'); }}
                            className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8 hover:border-indigo-400 hover:shadow-lg transition-all text-left group"
                        >
                            <div className="text-4xl mb-4">🧮</div>
                            <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">Kalkulator</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Automatische Preisberechnung basierend auf Modell, Maßen und Konfiguration.
                                Ideal für Standardprodukte aus dem Aluxe-Sortiment.
                            </p>
                            <div className="mt-4 text-xs text-slate-400">Dach • Wände • Markisen • Zubehör</div>
                        </button>

                        {/* Manual Offer */}
                        <button
                            onClick={() => { setIsManualMode(true); setView('manual'); }}
                            className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8 hover:border-emerald-400 hover:shadow-lg transition-all text-left group"
                        >
                            <div className="text-4xl mb-4">✍️</div>
                            <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Manuelles Angebot</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Positionen frei eingeben mit Name und Preis.
                                Ideal für individuelle Angebote und Sonderanfertigungen.
                            </p>
                            <div className="mt-4 text-xs text-slate-400">Freie Eingabe • Flexibel • Schnell</div>
                        </button>
                    </div>
                    <div className="text-center">
                        <button
                            onClick={() => setView('customer')}
                            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            ← Zurück zu Kundendaten
                        </button>
                    </div>
                </div>
            )}

            {/* MANUAL OFFER VIEW — full width centered */}
            {view === 'manual' && (
                <div className="col-span-12 max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setView('mode-select')}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                        >
                            ← Zurück zur Auswahl
                        </button>
                        <h1 className="text-2xl font-black text-slate-900">✍️ Manuelles Angebot</h1>
                    </div>

                    {/* Customer compact header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <span className="text-xl">👤</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 block">
                                    {customerState ? (customerState.firstName ? `${customerState.firstName} ${customerState.lastName}` : customerState.name) : 'Kein Kunde'}
                                </span>
                                <span className="text-xs text-slate-400">{customerState?.email || ''}</span>
                            </div>
                        </div>
                        <button onClick={() => setView('customer')} className="text-xs text-indigo-600 font-bold hover:underline">
                            Bearbeiten
                        </button>
                    </div>

                    {/* Model Selection */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            🏠 Modell auswählen <span className="text-xs text-red-500 font-normal">(erforderlich)</span>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {ROOF_MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setManualModel(m.id)}
                                    className={`p-3 rounded-xl border-2 text-center transition-all ${manualModel === m.id
                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className="w-full h-16 rounded-lg overflow-hidden mb-2 bg-slate-100">
                                        <img
                                            src={m.image_url}
                                            alt={m.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                    <p className={`text-xs font-bold ${manualModel === m.id ? 'text-indigo-700' : 'text-slate-700'}`}>{m.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            📋 Angebotspositionen
                        </h2>

                        {customItems.length > 0 && (
                            <table className="w-full text-sm mb-4">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2 text-slate-500 w-8">#</th>
                                        <th className="text-left py-2 text-slate-500">Bezeichnung</th>
                                        <th className="text-right py-2 text-slate-500">Preis (netto)</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customItems.map((item, index) => (
                                        <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-3 text-slate-400 text-xs">{index + 1}</td>
                                            <td className="py-3 font-medium text-slate-800">{item.name}</td>
                                            <td className="py-3 text-right font-bold text-slate-800">{formatCurrency(item.price)}</td>
                                            <td className="py-3 text-center">
                                                <button
                                                    onClick={() => setCustomItems(prev => prev.filter(i => i.id !== item.id))}
                                                    className="text-red-500 hover:text-red-700 text-xs p-1 hover:bg-red-50 rounded"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200">
                                        <td colSpan={2} className="py-3 font-bold text-slate-800">Summe</td>
                                        <td className="py-3 text-right font-black text-indigo-600">{formatCurrency(customItemsTotal)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}

                        {customItems.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-3xl mb-2">📝</p>
                                <p className="text-sm">Noch keine Positionen. Fügen Sie Ihre erste Position hinzu.</p>
                            </div>
                        )}

                        {/* Add Item */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Neue Position hinzufügen</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="Positionsbezeichnung..."
                                    className="flex-1 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newItemName.trim()) {
                                            const price = parseFloat(newItemPrice) || 0;
                                            setCustomItems(prev => [...prev, { id: `manual-${Date.now()}`, name: newItemName.trim(), price }]);
                                            setNewItemName('');
                                            setNewItemPrice('');
                                        }
                                    }}
                                />
                                <input
                                    type="number"
                                    value={newItemPrice}
                                    onChange={e => setNewItemPrice(e.target.value)}
                                    placeholder="Preis €"
                                    className="w-36 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-right"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newItemName.trim()) {
                                            const price = parseFloat(newItemPrice) || 0;
                                            setCustomItems(prev => [...prev, { id: `manual-${Date.now()}`, name: newItemName.trim(), price }]);
                                            setNewItemName('');
                                            setNewItemPrice('');
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (!newItemName.trim()) return;
                                        const price = parseFloat(newItemPrice) || 0;
                                        setCustomItems(prev => [...prev, { id: `manual-${Date.now()}`, name: newItemName.trim(), price }]);
                                        setNewItemName('');
                                        setNewItemPrice('');
                                    }}
                                    disabled={!newItemName.trim()}
                                    className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50 transition-all"
                                >
                                    + Hinzufügen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Margin & Discount */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">💰 Marża & Rabat</h2>

                        {purchaseDiscount > 0 && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-green-700">🏷️ Rabat zakupowy (Admin):</span>
                                    <span className="font-bold text-green-800">{purchaseDiscount}%</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-xs text-green-600">
                                    <span>Cena zakupu:</span>
                                    <span className="font-bold">{formatCurrency(purchasePrice)}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Marge (%)</label>
                                <input
                                    type="number"
                                    value={margin}
                                    onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <p className="text-xs text-slate-400 mt-1">+ {formatCurrency(marginValue)}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rabatt (%)</label>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <p className="text-xs text-slate-400 mt-1">- {formatCurrency(discountValue)}</p>
                            </div>
                        </div>

                        {/* Montage Price */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">🔧 Montage (netto)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={montagePrice || ''}
                                    onChange={e => setMontagePrice(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step={100}
                                    placeholder="0.00"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <span className="text-slate-500 font-bold text-lg flex-shrink-0">€ netto</span>
                            </div>
                        </div>
                    </div>

                    {/* Final Price Preview */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-emerald-200 text-sm">Endpreis (netto)</p>
                                <p className="text-4xl font-black">{formatCurrency(finalPrice)}</p>
                                {montagePrice > 0 && <p className="text-emerald-200 text-xs">inkl. Montage: {formatCurrency(montagePrice)}</p>}
                                <p className="text-emerald-200 text-sm mt-1">inkl. 19% MwSt. = {formatCurrency(finalPrice * 1.19)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-200 text-xs">Positionen</p>
                                <p className="text-2xl font-bold">{customItems.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => setView('summary')}
                        disabled={customItems.length === 0}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${customItems.length === 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                            }`}
                    >
                        Weiter zur Zusammenfassung →
                    </button>
                </div>
            )}

            {/* CONFIG/SUMMARY VIEW */}
            {(view === 'config') && (
                <>
                    {/* LEFT COLUMN: Config */}
                    <div className="col-span-12 lg:col-span-9 space-y-8">
                        {/* Compact Customer Header (replacing the old expandable card) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <span className="text-xl">👤</span>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-800 block">
                                        {customerState ?
                                            (customerState.firstName ? `${customerState.firstName} ${customerState.lastName}` : customerState.lastName)
                                            : 'Wybrany Klient'}
                                    </span>
                                    <span className="text-xs text-slate-500 block">
                                        {customerState?.email} • {customerState?.phone}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setView('customer')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                                Zmień
                            </button>
                        </div>

                        {/* Stepper */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative overflow-hidden">
                            <div className="flex justify-between items-center relative z-10">
                                {steps.map((step, index) => (
                                    <button
                                        key={step.id}
                                        onClick={() => setActiveStep(index)}
                                        className={`flex flex-col items-center gap-2 group transition-all ${index <= activeStep ? 'opacity-100' : 'opacity-50'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${index === activeStep ? 'border-indigo-600 bg-white text-indigo-600 shadow-md scale-110' :
                                            index < activeStep ? 'border-indigo-600 bg-indigo-600 text-white' :
                                                'border-slate-300 bg-white text-slate-400'
                                            }`}>
                                            {index < activeStep ? '✓' : step.icon}
                                        </div>
                                        <span className={`text-xs font-bold ${index === activeStep ? 'text-indigo-900' : 'text-slate-500'}`}>
                                            {step.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {/* Progress Bar Container */}
                            <div className="absolute top-9 left-0 w-full h-0.5 bg-slate-200 z-0" />
                            <div
                                className="absolute top-9 left-0 h-0.5 bg-indigo-600 transition-all duration-300 z-0"
                                style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                            />
                        </div>

                        {/* CONTENT */}

                        {/* STEP 0: MODEL */}
                        {activeStep === 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="text-2xl">🏠</span> Wybierz Model
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {ROOF_MODELS.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setModel(m.id)}
                                            className={`relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md ${model === m.id
                                                ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200'
                                                : 'border-slate-100 hover:border-indigo-200 bg-white'
                                                }`}
                                        >
                                            <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1 mb-3">{m.description}</p>
                                            <div className="flex gap-1 flex-wrap">
                                                {m.hasPoly && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Poly</span>}
                                                {m.hasGlass && <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded-full">Glass</span>}
                                                {m.hasFreestanding && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Wolnostojące</span>}
                                            </div>
                                            {model === m.id && (
                                                <div className="absolute top-3 right-3 text-indigo-600">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 1: DIMENSIONS */}
                        {activeStep === 1 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="text-2xl">📏</span> Wymiary i Konstrukcja
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    {/* Width */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <label className="flex justify-between mb-4">
                                            <span className="font-bold text-slate-700">Szerokość (mm)</span>
                                            <span className="text-indigo-600 font-black text-xl">{width} mm</span>
                                        </label>
                                        <input
                                            type="range" min="2000" max="14000" step="100"
                                            value={width} onChange={e => setWidth(Number(e.target.value))}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mb-4"
                                        />
                                        <div className="flex justify-between gap-2">
                                            {[3000, 4000, 5000, 6000, 7000].map(w => (
                                                <button key={w} onClick={() => setWidth(w)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:border-indigo-300 transition-colors shadow-sm text-slate-600">{w}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Projection */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <label className="flex justify-between mb-4">
                                            <span className="font-bold text-slate-700">Głębokość (mm)</span>
                                            <span className="text-indigo-600 font-black text-xl">{projection} mm</span>
                                        </label>
                                        <input
                                            type="range" min={dimensionLimits?.minDepth || 1500} max={dimensionLimits?.maxDepth || 6000} step="100"
                                            value={projection} onChange={e => setProjection(Number(e.target.value))}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mb-4"
                                        />
                                        <div className="flex justify-between gap-2">
                                            {[2500, 3000, 3500, 4000].filter(p => !dimensionLimits || p <= dimensionLimits.maxDepth).map(p => (
                                                <button key={p} onClick={() => setProjection(p)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:border-indigo-300 transition-colors shadow-sm text-slate-600">{p}</button>
                                            ))}
                                        </div>
                                        {dimensionLimits && (
                                            <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                                ⚠️ Max głębokość dla tego modelu: <strong>{dimensionLimits.maxDepth} mm</strong>
                                            </div>
                                        )}
                                    </div>

                                    {/* Model-specific Construction Heights */}
                                    {modelDrConfig.needsH3 && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <label className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700">H3 – Pfostenhöhe (mm)</span>
                                                <span className="text-indigo-600 font-black text-xl">{dachH3} mm</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">Unterkante Rinne – Höhe der Pfosten</p>
                                            <input
                                                type="number"
                                                value={dachH3}
                                                onChange={e => setDachH3(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                {(model === 'Skyline' || model === 'Carport' ? [2200, 2400, 2600, 2800] : [2000, 2200, 2400, 2600]).map(h => (
                                                    <button key={h} onClick={() => setDachH3(h)} className={`px-2 py-1 text-xs border rounded transition-colors shadow-sm ${dachH3 === h ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{h}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {modelDrConfig.needsH1 && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <label className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700">H1 – Wandanschluss (mm)</span>
                                                <span className="text-indigo-600 font-black text-xl">{dachH1} mm</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">Oberkante Wandprofil – Montagehöhe</p>
                                            <input
                                                type="number"
                                                value={dachH1}
                                                onChange={e => setDachH1(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                {(model === 'Topline XL' ? [2700, 2900, 3100, 3300] : [2500, 2700, 2796, 3000]).map(h => (
                                                    <button key={h} onClick={() => setDachH1(h)} className={`px-2 py-1 text-xs border rounded transition-colors shadow-sm ${dachH1 === h ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{h}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ultraline Overhang */}
                                    {modelDrConfig.needsOverhang && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <label className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700">U1 – Dachüberstand (mm)</span>
                                                <span className="text-indigo-600 font-black text-xl">{dachOverhang} mm</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">Überstand vorne (nur Ultrastyle Classic)</p>
                                            <input
                                                type="number"
                                                value={dachOverhang}
                                                onChange={e => setDachOverhang(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                {[200, 300, 400, 500].map(h => (
                                                    <button key={h} onClick={() => setDachOverhang(h)} className={`px-2 py-1 text-xs border rounded transition-colors shadow-sm ${dachOverhang === h ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{h}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Model Info Badge + Dachrechner Results */}
                                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-sm font-bold text-blue-800 flex items-center gap-2">📐 {modelDrConfig.label} – Dachrechner</h5>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Pfosten: {modelDrConfig.postWidth}mm</span>
                                            {modelDrConfig.fixedAngle && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">α = {modelDrConfig.fixedAngle}° (fest)</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-blue-600 mb-3 italic">{modelDrConfig.hint}</p>

                                    {dachrechnerResults ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            {dachrechnerResults.angleAlpha != null && (
                                                <div className="bg-white/60 rounded-lg p-2 text-center">
                                                    <span className="block text-blue-500 uppercase text-[9px] font-bold">α Neigung</span>
                                                    <span className="font-bold text-blue-900 text-sm">{dachrechnerResults.angleAlpha.toFixed(1)}°</span>
                                                </div>
                                            )}
                                            {dachrechnerResults.inclinationMmM != null && (
                                                <div className="bg-white/60 rounded-lg p-2 text-center">
                                                    <span className="block text-blue-500 uppercase text-[9px] font-bold">Gefälle</span>
                                                    <span className="font-bold text-blue-900 text-sm">{dachrechnerResults.inclinationMmM.toFixed(0)} mm/m</span>
                                                </div>
                                            )}
                                            {dachrechnerResults.heightH2 != null && (
                                                <div className="bg-white/60 rounded-lg p-2 text-center">
                                                    <span className="block text-blue-500 uppercase text-[9px] font-bold">H2 Oberkante</span>
                                                    <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.heightH2)} mm</span>
                                                </div>
                                            )}
                                            {dachrechnerResults.fensterF2 != null && (
                                                <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                                                    <span className="block text-emerald-600 uppercase text-[9px] font-bold">Fensterbreite</span>
                                                    <span className="font-bold text-emerald-900">{Math.round(dachrechnerResults.fensterF2)} mm</span>
                                                </div>
                                            )}
                                            {dachrechnerResults.depthD2 != null && (
                                                <div className="bg-white/60 rounded-lg p-2 text-center">
                                                    <span className="block text-blue-500 uppercase text-[9px] font-bold">D2 + Rinne</span>
                                                    <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.depthD2)} mm</span>
                                                </div>
                                            )}
                                            {dachrechnerResults.sparrenMitte != null && (
                                                <div className="bg-white/60 rounded-lg p-2 text-center">
                                                    <span className="block text-blue-500 uppercase text-[9px] font-bold">Sparren Mitte</span>
                                                    <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.sparrenMitte)} mm</span>
                                                </div>
                                            )}
                                            {dachrechnerResults.sparrenAussen != null && (
                                                <div className="bg-white/60 rounded-lg p-2 text-center">
                                                    <span className="block text-blue-500 uppercase text-[9px] font-bold">Sparren Außen</span>
                                                    <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.sparrenAussen)} mm</span>
                                                </div>
                                            )}
                                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                                <span className="block text-blue-500 uppercase text-[9px] font-bold">Pfostenbreite</span>
                                                <span className="font-bold text-blue-900">{modelDrConfig.postWidth} mm</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs text-blue-400 py-4">
                                            Bitte Maße eingeben um Berechnung zu starten...
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Construction Type */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-3">Typ Montażu</label>
                                        <div className="flex gap-3">
                                            {[
                                                { id: 'wall', label: 'Przyścienny', icon: '🏠' },
                                                { id: 'freestanding', label: 'Wolnostojący', icon: '⛺' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setConstruction(t.id as any)}
                                                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${construction === t.id
                                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                                        }`}
                                                >
                                                    <span>{t.icon}</span> {t.label}
                                                </button>
                                            ))}
                                        </div>
                                        {construction === 'freestanding' && (
                                            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={includeFoundations}
                                                            onChange={e => setIncludeFoundations(e.target.checked)}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">
                                                        Uwzględnij Fundamenty
                                                        {['Orangeline', 'Orangeline+', 'Trendline', 'Trendline+', 'Topline', 'Topline XL', 'Designline'].includes(model) && (
                                                            <span className="text-xs text-indigo-600 block font-normal">
                                                                (Automatyczna dopłata wg cennika)
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Zone */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-3">Strefa Śniegowa</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map(z => (
                                                <button
                                                    key={z}
                                                    onClick={() => setZone(z)}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${zone === z
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-slate-200 hover:border-slate-300 text-slate-500'
                                                        }`}
                                                >
                                                    {z}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: SPECIFICATION */}
                        {activeStep === 2 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="text-2xl">⚙️</span> Specyfikacja
                                </h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Cover */}
                                    {(currentModel?.hasPoly || currentModel?.hasGlass) && (
                                        <div>
                                            <h3 className="font-bold text-slate-700 mb-4">Pokrycie Dachu</h3>
                                            <div className="space-y-3">
                                                {currentModel?.hasPoly && (
                                                    <button
                                                        onClick={() => setCover('Poly')}
                                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${cover === 'Poly'
                                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-slate-900">Poliwęglan 16mm</div>
                                                            <div className="text-xs text-slate-500">Lekki, wytrzymały, ekonomiczny</div>
                                                        </div>
                                                        {cover === 'Poly' && <span className="text-indigo-600 text-xl">✓</span>}
                                                    </button>
                                                )}
                                                {currentModel?.hasGlass && (
                                                    <button
                                                        onClick={() => setCover('Glass')}
                                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${cover === 'Glass'
                                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-slate-900">Szkło Bezpieczne VSG</div>
                                                            <div className="text-xs text-slate-500">Premium, maksymalne światło</div>
                                                        </div>
                                                        {cover === 'Glass' && <span className="text-indigo-600 text-xl">✓</span>}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Variant Selector */}
                                            {cover === 'Glass' && currentModel?.hasGlass && (
                                                <div className="mt-4 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                                                    <h4 className="text-sm font-bold text-cyan-800 mb-3">Rodzaj Szkła</h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {GLASS_VARIANTS.map(v => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => setGlassVariant(v.id)}
                                                                className={`p-3 rounded-lg border-2 text-center transition-all ${glassVariant === v.id
                                                                    ? 'border-cyan-500 bg-white shadow-sm ring-1 ring-cyan-300'
                                                                    : 'border-cyan-100 bg-white/50 hover:border-cyan-300'
                                                                    }`}
                                                            >
                                                                <div className="text-lg mb-1">{v.icon}</div>
                                                                <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                <div className="text-[9px] text-slate-500 leading-tight">{v.description}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {cover === 'Poly' && currentModel?.hasPoly && (
                                                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                    <h4 className="text-sm font-bold text-blue-800 mb-3">Rodzaj Poliwęglanu</h4>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {POLY_VARIANTS.map(v => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => setPolyVariant(v.id)}
                                                                className={`p-3 rounded-lg border-2 text-center transition-all ${polyVariant === v.id
                                                                    ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-300'
                                                                    : 'border-blue-100 bg-white/50 hover:border-blue-300'
                                                                    }`}
                                                            >
                                                                <div className="text-lg mb-1">{v.icon}</div>
                                                                <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                <div className="text-[9px] text-slate-500 leading-tight">{v.description}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Color */}
                                    <div>
                                        <h3 className="font-bold text-slate-700 mb-4">Kolor Konstrukcji</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['RAL 7016', 'RAL 9016', 'RAL 9005', 'RAL 9007'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setColor(c)}
                                                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${color === c ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className="w-6 h-6 rounded-full border border-slate-300 shadow-sm" style={{
                                                        backgroundColor: c.includes('7016') ? '#374151' : c.includes('9016') ? '#f3f4f6' : c.includes('9005') ? '#111827' : '#9ca3af'
                                                    }} />
                                                    <span className="text-sm font-bold text-slate-700">{c}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Sonderfarben Option */}
                                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={sonderfarben}
                                                    onChange={(e) => setSonderfarben(e.target.checked)}
                                                    className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="font-bold text-amber-800">Sonderfarben</span>
                                                    <span className="ml-2 text-sm text-amber-600">(+20% dopłata)</span>
                                                </div>
                                                {sonderfarbenSurcharge > 0 && (
                                                    <span className="text-sm font-bold text-amber-700">
                                                        +{formatCurrency(sonderfarbenSurcharge)}
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xs text-amber-600 mt-2">
                                                Kolor specjalny RAL na zamówienie - czas realizacji +3 tygodnie
                                            </p>
                                        </div>

                                        {/* Schiebeeinheit (Sliding Roof) - Designline Only */}
                                        {model === 'Designline' && (
                                            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                                <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                                                    <span className="text-lg">🔄</span>
                                                    Schiebeeinheit (Przesuwne Szyby Dachowe)
                                                </h4>
                                                <p className="text-xs text-indigo-600 mb-4">
                                                    Przesuwne szyby umożliwiają otwieranie dachu. Cena za każde pole przesuwne.
                                                </p>

                                                <div className="flex items-center gap-4">
                                                    <label className="text-sm font-medium text-indigo-700">
                                                        Ilość pól przesuwnych:
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setSchiebeeinheitCount(Math.max(0, schiebeeinheitCount - 1))}
                                                            className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-700 font-bold hover:bg-indigo-300 transition-colors"
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            value={schiebeeinheitCount}
                                                            onChange={(e) => setSchiebeeinheitCount(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                                                            className="w-16 h-8 text-center rounded-lg border border-indigo-300 font-bold text-indigo-800"
                                                        />
                                                        <button
                                                            onClick={() => setSchiebeeinheitCount(Math.min(10, schiebeeinheitCount + 1))}
                                                            className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-700 font-bold hover:bg-indigo-300 transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    {schiebeeinheitCount > 0 && schiebeeinheitUnitPrice > 0 && (
                                                        <div className="ml-auto text-sm">
                                                            <span className="text-indigo-600">
                                                                {schiebeeinheitCount} × {formatCurrency(schiebeeinheitUnitPrice)} =
                                                            </span>
                                                            <span className="font-bold text-indigo-800 ml-1">
                                                                +{formatCurrency(schiebeeinheitTotalPrice)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {schiebeeinheitCount > 0 && (
                                                    <div className="mt-3 p-3 bg-indigo-100 rounded-lg">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-indigo-700">Dopłata za przesuwne szyby:</span>
                                                            <span className="font-bold text-indigo-900">
                                                                +{formatCurrency(schiebeeinheitTotalPrice)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ADDONS - Premium Redesign */}
                        {activeStep === 3 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">🧩</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Dodatki i Akcesoria</h3>
                                        <p className="text-slate-300 text-sm">Wybierz zabudowę, markizy i akcesoria</p>
                                    </div>
                                </div>

                                {/* Main Category Tabs */}
                                <div className="flex border-b border-slate-200 bg-slate-50">
                                    {[
                                        { id: 'walls', label: 'Zabudowa', icon: '🏗️', desc: 'Ściany, Szyby' },
                                        { id: 'awnings', label: 'Komfort', icon: '☀️', desc: 'Markizy, LED' },
                                        { id: 'wpc', label: 'Podłoga WPC', icon: '🪵', desc: 'Tarasy' },
                                        { id: 'aluminum', label: 'Ściany Alu', icon: '🔲', desc: 'Pełne, Lamele' },
                                        { id: 'materials', label: 'Materiały', icon: '🔧', desc: 'Komponenty' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setWallTab(tab.id as any)}
                                            className={`flex-1 px-4 py-4 text-center transition-all border-b-3 ${wallTab === tab.id
                                                ? 'border-b-4 border-indigo-600 bg-white text-slate-800'
                                                : 'border-b-4 border-transparent text-slate-500 hover:bg-white/50'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{tab.icon}</div>
                                            <div className="font-bold text-sm">{tab.label}</div>
                                            <div className="text-[10px] opacity-60">{tab.desc}</div>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6">
                                    {/* ====== ZABUDOWA TAB ====== */}
                                    {/* ====== WALLS TAB ====== */}
                                    {wallTab === 'walls' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* LEFT COLUMN - CONTROLS */}
                                            <div className="lg:col-span-2 space-y-6">

                                                {/* 0. Wall Placement Selector */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                                    <h5 className="text-sm font-bold text-slate-700 mb-3">📍 Umiejscowienie ściany</h5>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {([
                                                            { id: 'left' as const, label: 'Lewa', icon: '◀', desc: 'Ściana boczna lewa' },
                                                            { id: 'right' as const, label: 'Prawa', icon: '▶', desc: 'Ściana boczna prawa' },
                                                            { id: 'front' as const, label: 'Front', icon: '⬛', desc: 'Ściana frontowa' },
                                                        ]).map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => setWallPlacement(p.id)}
                                                                className={`p-3 rounded-xl border-2 text-center transition-all ${wallPlacement === p.id
                                                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                                                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                                            >
                                                                <div className="text-2xl mb-1">{p.icon}</div>
                                                                <div className="font-bold text-sm text-slate-800">{p.label}</div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Dimension badge */}
                                                    {dachrechnerResults && (() => {
                                                        const postsCount = structuralMetadata?.posts_count || 2;
                                                        const frontSegments = postsCount - 1;
                                                        const isFrontPlacement = wallPlacement === 'front';
                                                        return (
                                                            <div className="mt-3 text-xs bg-blue-50 rounded-lg p-2 border border-blue-200 space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-blue-600 font-bold">📐</span>
                                                                    <span className="text-blue-800">
                                                                        {isFrontPlacement ? 'Front' : wallPlacement === 'left' ? 'Lewa strona' : 'Prawa strona'}:
                                                                        {' '}<strong>{wallWidth} × {wallHeight} mm</strong>
                                                                        {' '}(per element)
                                                                    </span>
                                                                </div>
                                                                {isFrontPlacement && (
                                                                    <div className="flex items-center gap-2 bg-amber-50 rounded p-1.5 border border-amber-200">
                                                                        <span className="text-amber-600 font-bold">⬛</span>
                                                                        <span className="text-amber-800">
                                                                            <strong>{frontSegments} {frontSegments === 1 ? 'segment' : 'segmentów'}</strong> między <strong>{postsCount} słupkami</strong>
                                                                            {dachrechnerResults.innerWidth && (
                                                                                <span className="text-amber-600 ml-1">(każdy: {Math.round(dachrechnerResults.innerWidth)} mm)</span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* 1. Category Selector */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                    <div className="flex border-b border-slate-100">
                                                        {[
                                                            { id: 'fixed', label: 'Ściany Stałe', icon: '🧱' },
                                                            { id: 'sliding', label: 'Drzwi Przesuwne', icon: '🚪' },
                                                            { id: 'panorama', label: 'Panorama', icon: '🌅' },
                                                        ].map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => {
                                                                    setWallCategory(cat.id as any);
                                                                    // Auto-select first product in category
                                                                    if (cat.id === 'fixed') setWallProduct(WALL_PRODUCTS[0].id);
                                                                    if (cat.id === 'sliding') setWallProduct(SCHIEBETUR_PRODUCTS[0].id);
                                                                    if (cat.id === 'panorama') setWallProduct(PANORAMA_PRODUCTS[0].id);
                                                                }}
                                                                className={`flex-1 py-4 text-center transition-colors font-bold text-sm flex items-center justify-center gap-2 ${wallCategory === cat.id
                                                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                                                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <span>{cat.icon}</span> {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="p-6">
                                                        {/* FIXED WALLS */}
                                                        {wallCategory === 'fixed' && (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {WALL_PRODUCTS.map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            onClick={() => setWallProduct(p.id)}
                                                                            className={`text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${wallProduct === p.id
                                                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                                                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="text-3xl bg-white p-2 rounded-lg shadow-sm">{p.icon}</span>
                                                                            <div>
                                                                                <div className="font-bold text-slate-700">{p.name}</div>
                                                                                <div className="text-xs text-slate-400 mt-1">{p.description}</div>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* WEDGE GLASS OPTIONS */}
                                                                {(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (
                                                                    <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                                                                        {/* Keilfenster Side Selector */}
                                                                        <h4 className="text-sm font-bold text-orange-800 mb-3">📐 Strona Keilfenster</h4>
                                                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                                                            {([
                                                                                { id: 'left' as const, label: 'Lewy', icon: '◀', desc: 'Keilfenster po lewej' },
                                                                                { id: 'right' as const, label: 'Prawy', icon: '▶', desc: 'Keilfenster po prawej' },
                                                                            ]).map(s => (
                                                                                <button
                                                                                    key={s.id}
                                                                                    onClick={() => setKeilfensterSide(s.id)}
                                                                                    className={`p-3 rounded-lg border-2 text-center transition-all ${keilfensterSide === s.id
                                                                                        ? 'border-orange-500 bg-white shadow-sm ring-1 ring-orange-300'
                                                                                        : 'border-orange-100 bg-white/50 hover:border-orange-300'}`}
                                                                                >
                                                                                    <div className="text-xl mb-0.5">{s.icon}</div>
                                                                                    <div className="font-bold text-xs text-slate-800">{s.label}</div>
                                                                                    <div className="text-[9px] text-slate-400">{s.desc}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>

                                                                        {/* K1/K2 Dimension Preview */}
                                                                        {dachrechnerResults && (dachrechnerResults.keilhoeheK1 || dachrechnerResults.keilhoeheK2) && (
                                                                            <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                                                                                <div className="bg-white rounded-lg p-2 text-center border border-orange-200">
                                                                                    <span className="block text-orange-500 uppercase text-[9px] font-bold">K1 (Rinne)</span>
                                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.keilhoeheK1 ? Math.round(dachrechnerResults.keilhoeheK1) : '–'} mm</span>
                                                                                </div>
                                                                                <div className="bg-white rounded-lg p-2 text-center border border-orange-200">
                                                                                    <span className="block text-orange-500 uppercase text-[9px] font-bold">K2 (Wand)</span>
                                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.keilhoeheK2 ? Math.round(dachrechnerResults.keilhoeheK2) : '–'} mm</span>
                                                                                </div>
                                                                                <div className="bg-white rounded-lg p-2 text-center border border-orange-200">
                                                                                    <span className="block text-orange-500 uppercase text-[9px] font-bold">Breite (F2)</span>
                                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.fensterF2 ? Math.round(dachrechnerResults.fensterF2) : '–'} mm</span>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <h4 className="text-sm font-bold text-orange-800 mb-3">Rodzaj Szkła (Keilfenster)</h4>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            {[
                                                                                { id: 'clear', name: 'Przeźroczyste', icon: '🪟', price: 'Standard' },
                                                                                { id: 'matt', name: 'Mleczne (Matt)', icon: '🌫️', price: '+ Dopłata' },
                                                                                { id: 'iso', name: 'Izolacyjne (Iso)', icon: '🔥', price: '+ Dopłata' }
                                                                            ].map(v => (
                                                                                <button
                                                                                    key={v.id}
                                                                                    onClick={() => setWedgeGlassType(v.id)}
                                                                                    className={`p-3 rounded-lg border-2 text-center transition-all ${wedgeGlassType === v.id
                                                                                        ? 'border-orange-500 bg-white shadow-sm ring-1 ring-orange-300'
                                                                                        : 'border-orange-100 bg-white/50 hover:border-orange-300'
                                                                                        }`}
                                                                                >
                                                                                    <div className="text-lg mb-1">{v.icon}</div>
                                                                                    <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                                    <div className="text-[9px] text-slate-500 leading-tight">{v.price}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* KEILFENSTER ACCESSORIES */}
                                                                {(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (
                                                                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                                        <h4 className="text-sm font-bold text-blue-800 mb-3">Opcje dodatkowe (Keilfenster)</h4>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {KEILFENSTER_ACCESSORIES.map(acc => (
                                                                                <label
                                                                                    key={acc.id}
                                                                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${wedgeAccessories[acc.id]
                                                                                        ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-300'
                                                                                        : 'border-blue-100 bg-white/50 hover:border-blue-300'
                                                                                        }`}
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={wedgeAccessories[acc.id] || false}
                                                                                        onChange={(e) => setWedgeAccessories(prev => ({
                                                                                            ...prev,
                                                                                            [acc.id]: e.target.checked
                                                                                        }))}
                                                                                        className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-lg">{acc.icon}</span>
                                                                                            <span className="font-bold text-xs text-slate-800 truncate">{acc.name}</span>
                                                                                        </div>
                                                                                        <div className="text-[10px] text-slate-500">{acc.description}</div>
                                                                                        <div className="text-xs font-bold text-blue-600 mt-1">€{acc.price.toFixed(2)}</div>
                                                                                    </div>
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* SLIDING DOORS */}
                                                        {wallCategory === 'sliding' && (
                                                            <>
                                                                <div className="space-y-2">
                                                                    {SCHIEBETUR_PRODUCTS.map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            onClick={() => setWallProduct(p.id)}
                                                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${wallProduct === p.id
                                                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                                                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="text-2xl bg-white p-2 rounded-lg shadow-sm flex-shrink-0">{p.icon}</span>
                                                                            <div className="min-w-0">
                                                                                <div className="font-bold text-slate-700 text-sm">{p.name}</div>
                                                                                <div className="text-xs text-slate-400 mt-0.5 truncate">{p.description}</div>
                                                                            </div>
                                                                            {wallProduct === p.id && <span className="ml-auto text-indigo-500 flex-shrink-0">✓</span>}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* PANEL COUNT INFO */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-lg">📐</span>
                                                                                <span className="text-sm font-bold text-indigo-800">Ilość skrzydeł</span>
                                                                            </div>
                                                                            <span className="text-sm font-black text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-sm">
                                                                                {getSchiebetuerPanelCount(wallWidth).count}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] text-indigo-500 mt-1">Automatycznie na podstawie szerokości (maks. szerokość skrzydła: 1500mm)</p>
                                                                    </div>
                                                                )}

                                                                {/* OPENING DIRECTION */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <h4 className="text-sm font-bold text-slate-700 mb-3">Kierunek otwierania</h4>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            {SCHIEBETUR_OPENING.map(o => (
                                                                                <button
                                                                                    key={o.id}
                                                                                    onClick={() => setSchiebetuerOpening(o.id)}
                                                                                    className={`p-3 rounded-lg border-2 text-center transition-all ${schiebetuerOpening === o.id
                                                                                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-300'
                                                                                        : 'border-slate-100 bg-white/50 hover:border-indigo-300'
                                                                                        }`}
                                                                                >
                                                                                    <div className="text-lg mb-1">{o.icon}</div>
                                                                                    <div className="font-bold text-xs text-slate-800">{o.name}</div>
                                                                                    <div className="text-[9px] text-slate-400 mt-0.5">{o.description}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* HANDLE TYPE */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <h4 className="text-sm font-bold text-slate-700 mb-3">Typ uchwytu (Griff)</h4>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {SCHIEBETUR_HANDLES.map(h => (
                                                                                <button
                                                                                    key={h.id}
                                                                                    onClick={() => setSchiebetuerHandle(h.id)}
                                                                                    className={`text-left p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${schiebetuerHandle === h.id
                                                                                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-300'
                                                                                        : 'border-slate-100 bg-white/50 hover:border-indigo-300'
                                                                                        }`}
                                                                                >
                                                                                    <span className="text-lg">{h.icon}</span>
                                                                                    <div>
                                                                                        <div className="font-bold text-xs text-slate-800">{h.name}</div>
                                                                                        <div className="text-[9px] text-slate-400">{h.id}</div>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* INCLUDED INFO */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-700">
                                                                        <strong className="block mb-1">✅ W cenie zawarte:</strong>
                                                                        <ul className="list-disc list-inside space-y-0.5">
                                                                            <li>Uszczelki (Dichtung) 44.2 VSG klar</li>
                                                                            <li>Nakładki odwadniające (Entwässerungskappen)</li>
                                                                            <li>Kolor standardowy: RAL 7016 / 9007 / 9010 / 9016 / 9005 / DB703</li>
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* PANORAMA */}
                                                        {wallCategory === 'panorama' && (
                                                            <>
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {PANORAMA_MODELS.map(model => {
                                                                        const isActive = wallProduct.includes(`Panorama ${model.id}`);
                                                                        // Show current active variant description if active
                                                                        const currentVariant = isActive ? wallProduct : getBestPanoramaVariant(model.id, wallWidth);
                                                                        const variantInfo = PANORAMA_PRODUCTS.find(p => p.id === currentVariant);

                                                                        return (
                                                                            <button
                                                                                key={model.id}
                                                                                onClick={() => setWallProduct(getBestPanoramaVariant(model.id, wallWidth))}
                                                                                className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${isActive
                                                                                    ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200 shadow-sm'
                                                                                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'}`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-2xl bg-white p-1.5 rounded-lg shadow-sm text-purple-600">{model.icon}</span>
                                                                                    <div>
                                                                                        <div className="font-bold text-slate-700">{model.name}</div>
                                                                                        <div className="text-xs text-slate-400">{model.description}</div>
                                                                                        {isActive && (
                                                                                            <div className="text-xs text-purple-600 font-bold mt-1">
                                                                                                Wybrano: {variantInfo?.tracks}-tory (Auto)
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {isActive && <span className="text-purple-600 font-bold">✓</span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* PANORAMA OPTIONS */}
                                                                <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
                                                                    <h6 className="text-xs font-bold text-slate-600 uppercase">Opcje Panorama</h6>

                                                                    {/* Opening Direction */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-slate-500 mb-2 block">Strona otwierania</label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => setPanoramaOpeningType('side')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaOpeningType === 'side'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                ← Boczne
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPanoramaOpeningType('center')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaOpeningType === 'center'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                ↔ Środkowe
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Handle Type */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-slate-500 mb-2 block">Typ uchwytu</label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => setPanoramaHandleType('griff')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaHandleType === 'griff'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                🚪 Griff (14.21 €)
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPanoramaHandleType('knauf')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaHandleType === 'knauf'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                🔘 Knauf (36.68 €)
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Glass Type */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-slate-500 mb-2 block">Typ szkła</label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => setPanoramaGlassType('klar')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaGlassType === 'klar'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                🔳 Klar (Standard)
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPanoramaGlassType('planibel_grau')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaGlassType === 'planibel_grau'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                🌫️ Planibel Grau (+47.95 €/m²)
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Steel-Look Toggle */}
                                                                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                                                                        <div>
                                                                            <span className="text-sm font-medium text-slate-700">Steel-Look Profile</span>
                                                                            <p className="text-xs text-slate-400">RAL 7016 / 9005 (+18.95 € pro Profil)</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => setPanoramaSteelLook(!panoramaSteelLook)}
                                                                            className={`w-12 h-6 rounded-full transition-all ${panoramaSteelLook ? 'bg-purple-500' : 'bg-slate-300'}`}
                                                                        >
                                                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${panoramaSteelLook ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Compact Dachrechner Summary + Auto/Manual toggle */}
                                                {dachrechnerResults && (
                                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-xs font-bold text-blue-800">📐 Maße aus Dachrechner</h5>
                                                            <button
                                                                onClick={() => setWallDimsAuto(!wallDimsAuto)}
                                                                className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${wallDimsAuto
                                                                    ? 'bg-green-500 text-white'
                                                                    : 'bg-slate-200 text-slate-600'}`}
                                                            >
                                                                {wallDimsAuto ? '⚡ Auto' : '✏️ Manuell'}
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                                                            <div className="bg-white/60 rounded p-1.5 text-center">
                                                                <span className="block text-blue-400 uppercase text-[8px]">H3</span>
                                                                <span className="font-bold text-blue-900">{dachH3}</span>
                                                            </div>
                                                            <div className="bg-white/60 rounded p-1.5 text-center">
                                                                <span className="block text-blue-400 uppercase text-[8px]">H1</span>
                                                                <span className="font-bold text-blue-900">{dachH1}</span>
                                                            </div>
                                                            {dachrechnerResults.fensterF2 != null && (
                                                                <div className="bg-emerald-50 rounded p-1.5 text-center border border-emerald-200">
                                                                    <span className="block text-emerald-500 uppercase text-[8px]">Breite</span>
                                                                    <span className="font-bold text-emerald-900">{Math.round(dachrechnerResults.fensterF2)}</span>
                                                                </div>
                                                            )}
                                                            {dachrechnerResults.angleAlpha != null && (
                                                                <div className="bg-white/60 rounded p-1.5 text-center">
                                                                    <span className="block text-blue-400 uppercase text-[8px]">α</span>
                                                                    <span className="font-bold text-blue-900">{dachrechnerResults.angleAlpha.toFixed(1)}°</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Keilfenster K1/K2 */}
                                                        {(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (dachrechnerResults.keilhoeheK1 != null || dachrechnerResults.keilhoeheK2 != null) && (
                                                            <div className="mt-2 pt-2 border-t border-blue-200 grid grid-cols-3 gap-1.5 text-[10px]">
                                                                <div className="bg-orange-50 rounded p-1.5 text-center border border-orange-200">
                                                                    <span className="block text-orange-500 text-[8px]">K1</span>
                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.keilhoeheK1 != null ? Math.round(dachrechnerResults.keilhoeheK1) : '–'}</span>
                                                                </div>
                                                                <div className="bg-orange-50 rounded p-1.5 text-center border border-orange-200">
                                                                    <span className="block text-orange-500 text-[8px]">K2</span>
                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.keilhoeheK2 != null ? Math.round(dachrechnerResults.keilhoeheK2) : '–'}</span>
                                                                </div>
                                                                {dachrechnerResults.fensterF2 != null && (
                                                                    <div className="bg-orange-50 rounded p-1.5 text-center border border-orange-200">
                                                                        <span className="block text-orange-500 text-[8px]">D1</span>
                                                                        <span className="font-bold text-orange-900">{Math.round(dachrechnerResults.fensterF2)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Dimensions Card */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-sm font-bold text-slate-700">Wymiary zabudowy</h5>
                                                        {wallDimsAuto && dachrechnerResults && (
                                                            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full font-bold">⚡ Automatisch berechnet</span>
                                                        )}
                                                    </div>

                                                    <div className={`grid ${(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                                                                {wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')
                                                                    ? 'Breite D1'
                                                                    : wallProduct.includes('Side')
                                                                        ? 'Głębokość'
                                                                        : 'Szerokość'} (mm)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={wallWidth}
                                                                onChange={e => { setWallWidth(Number(e.target.value)); setWallDimsAuto(false); }}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                            />
                                                            {(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (
                                                                <p className="text-xs text-slate-400 mt-2">
                                                                    📐 Breite D1 z cennika producenta (2000-5000mm)
                                                                </p>
                                                            )}
                                                        </div>
                                                        {!(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Wysokość (mm)</label>
                                                                <input
                                                                    type="number"
                                                                    value={wallHeight}
                                                                    onChange={e => { setWallHeight(Number(e.target.value)); setWallDimsAuto(false); }}
                                                                    className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* RIGHT COLUMN - VISUALIZER & PRICE */}
                                            <div className="space-y-6 lg:sticky lg:top-6">
                                                {/* Visualizer Card - ENLARGED */}
                                                <div className="h-[450px] w-full">
                                                    <WallVisualizer
                                                        wallProduct={wallProduct}
                                                        width={wallWidth}
                                                        projection={projection}
                                                        height={wallHeight}
                                                        modelName={model}
                                                        postsCount={structuralMetadata?.posts_count}
                                                    />
                                                    {/* Structure Info Overlay */}
                                                    {structuralMetadata && (
                                                        <div className="flex justify-center mt-2 gap-4 text-xs font-bold text-slate-500">
                                                            <span className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                                                Słupy: {structuralMetadata.posts_count}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Price & Action Card */}
                                                <div className="bg-slate-800 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                                                    {/* Background decoration */}
                                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>

                                                    <div className="relative z-10 text-center space-y-4">
                                                        {(() => {
                                                            const postsCount = structuralMetadata?.posts_count || 2;
                                                            const frontSegments = postsCount - 1;
                                                            const isFrontPlacement = wallPlacement === 'front';
                                                            const segmentMultiplier = isFrontPlacement ? frontSegments : 1;
                                                            return (
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                                        {isFrontPlacement ? `Cena za 1 element (×${segmentMultiplier})` : 'Cena elementu'}
                                                                    </div>
                                                                    {wallPriceLoading ? (
                                                                        <div className="text-2xl font-bold text-white/50 animate-pulse">Obliczam...</div>
                                                                    ) : wallPrice !== null ? (
                                                                        <>
                                                                            <div className="text-4xl font-black text-emerald-400 tracking-tight">
                                                                                {formatCurrency(wallPrice)}
                                                                            </div>
                                                                            {isFrontPlacement && segmentMultiplier > 1 && (
                                                                                <div className="mt-1 text-sm font-bold text-amber-400">
                                                                                    × {segmentMultiplier} = <span className="text-emerald-300 text-lg">{formatCurrency(wallPrice * segmentMultiplier)}</span>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <div className="text-red-300 text-sm font-medium bg-red-500/10 py-1 px-3 rounded-full inline-block">Niedostępne dla wymiaru</div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="h-px bg-white/10 w-full"></div>

                                                        <button
                                                            onClick={() => {
                                                                if (!wallPrice) return;
                                                                const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
                                                                const isSchiebetur = wallProduct.includes('Schiebetür');

                                                                // Calculate accessories total for Keilfenster
                                                                let accessoriesTotal = 0;
                                                                let accessoriesNames: string[] = [];
                                                                if (isWedge) {
                                                                    KEILFENSTER_ACCESSORIES.forEach(acc => {
                                                                        if (wedgeAccessories[acc.id]) {
                                                                            accessoriesTotal += acc.price;
                                                                            accessoriesNames.push(acc.name);
                                                                        }
                                                                    });
                                                                }

                                                                const totalWithAccessories = wallPrice + accessoriesTotal;

                                                                // Build display-friendly name
                                                                let displayName = WALL_PRODUCTS.find(p => p.id === wallProduct)?.name || wallProduct;
                                                                let configStr = '';
                                                                if (isSchiebetur) {
                                                                    const schiebaturProduct = SCHIEBETUR_PRODUCTS.find(p => p.id === wallProduct);
                                                                    const handleInfo = SCHIEBETUR_HANDLES.find(h => h.id === schiebetuerHandle);
                                                                    const openingInfo = SCHIEBETUR_OPENING.find(o => o.id === schiebetuerOpening);
                                                                    const panelInfo = getSchiebetuerPanelCount(wallWidth);
                                                                    displayName = schiebaturProduct ? `Drzwi przesuwne – ${schiebaturProduct.name}` : wallProduct;
                                                                    configStr = `${displayName} | ${panelInfo.count} | ${openingInfo?.name || ''} | ${handleInfo?.name || ''} (${schiebetuerHandle})`;
                                                                } else {
                                                                    configStr = isWedge && accessoriesNames.length > 0
                                                                        ? `${displayName} + ${accessoriesNames.join(', ')}`
                                                                        : displayName;
                                                                }

                                                                const postsCount = structuralMetadata?.posts_count || 2;
                                                                const frontSegments = postsCount - 1;
                                                                const isFrontPlacement = wallPlacement === 'front';
                                                                const segmentMultiplier = isFrontPlacement ? frontSegments : 1;

                                                                // For front: add all segments at once with placement info
                                                                const placementLabel = wallPlacement === 'front' ? 'Front' : wallPlacement === 'left' ? 'Lewa' : 'Prawa';
                                                                const finalPrice = totalWithAccessories * segmentMultiplier;
                                                                const qtyNote = isFrontPlacement && segmentMultiplier > 1 ? ` (${segmentMultiplier}× segment)` : '';
                                                                const dimNote = `${wallWidth}x${wallHeight}`;
                                                                configStr = `${placementLabel}: ${configStr}${qtyNote}`;
                                                                addToBasket(displayName, finalPrice, configStr, dimNote, 'wall');

                                                                // Reset accessories after adding
                                                                if (isWedge) {
                                                                    setWedgeAccessories({
                                                                        uProfil: false,
                                                                        schraubenSet: false,
                                                                        kippFenster: false,
                                                                        abdeckungEL891: false
                                                                    });
                                                                }
                                                            }}
                                                            disabled={!wallPrice}
                                                            className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${wallPrice
                                                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-[1.02] active:scale-[0.98]'
                                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-70'
                                                                }`}
                                                        >
                                                            <span>Dodaj do oferty</span>
                                                            <span>➡️</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Helper Text */}
                                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                                                    <strong className="block mb-1">💡 Wskazówka:</strong>
                                                    Wybierz typ zabudowy z listy po lewej. Wizualizacja powyżej pokazuje podgląd wybranego rozwiązania w kontekście konstrukcji.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* ====== KOMFORT TAB (Awnings, LED) ====== */}
                                    {wallTab === 'awnings' && (
                                        <div className="space-y-6">
                                            {/* Awnings Section */}
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                <h4 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">☀️</span>
                                                    Markizy & ZIP Screen
                                                </h4>

                                                {/* Type Selector with Images */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                                    {[
                                                        { id: 'aufdach', label: 'Aufdachmarkise', desc: 'Markiza na dachu', icon: '🌤️', color: 'bg-orange-50' },
                                                        { id: 'unterdach', label: 'Unterdachmarkise', desc: 'Markiza pod dachem', icon: '🏠', color: 'bg-amber-50' },
                                                        { id: 'zip', label: 'ZIP Screen', desc: 'Ekran pionowy', icon: '📱', color: 'bg-slate-50' },
                                                    ].map(type => (
                                                        <button
                                                            key={type.id}
                                                            onClick={() => setAwningType(type.id as any)}
                                                            className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${awningType === type.id
                                                                ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-200'
                                                                : 'border-slate-100 hover:border-orange-200 bg-white'}`}
                                                        >
                                                            <div className="text-2xl mb-2">{type.icon}</div>
                                                            <div className="font-bold text-sm text-slate-800">{type.label}</div>
                                                            <div className="text-[10px] text-slate-500">{type.desc}</div>
                                                            {awningType === type.id && (
                                                                <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full"></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Dimensions and Price calculation area */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                                    {/* Dimensions Inputs */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Szerokość (mm)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={awningWidth}
                                                                    onChange={e => setAwningWidth(Number(e.target.value))}
                                                                    step={500}
                                                                    min={1000}
                                                                    max={6000}
                                                                    className="w-full p-3 pl-4 border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                                                                />
                                                                <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold">MM</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{awningType === 'zip' ? 'Wysokość' : 'Wysięg'} (mm)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={awningProjection}
                                                                    onChange={e => setAwningProjection(Number(e.target.value))}
                                                                    step={500}
                                                                    min={1000}
                                                                    max={5000}
                                                                    className="w-full p-3 pl-4 border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                                                                />
                                                                <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold">MM</span>
                                                            </div>
                                                        </div>

                                                        {/* Motor Count Selector - only for aufdach/unterdach */}
                                                        {awningType !== 'zip' && (
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ilość motorów</label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <button
                                                                        onClick={() => setAwningMotorCount(1)}
                                                                        className={`p-3 rounded-lg border-2 text-center transition-all ${awningMotorCount === 1
                                                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                                            : 'border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <div className="font-bold text-sm">1 Motor</div>
                                                                        <div className="text-xs text-slate-500">do 6000mm</div>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setAwningMotorCount(2)}
                                                                        className={`p-3 rounded-lg border-2 text-center transition-all ${awningMotorCount === 2
                                                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                                            : 'border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <div className="font-bold text-sm">2 Motory</div>
                                                                        <div className="text-xs text-slate-500">6000-12000mm</div>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Price & Add Button */}
                                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                                                        <div className="text-center mb-3">
                                                            {awningPrice !== null ? (
                                                                <>
                                                                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Cena netto</div>
                                                                    <div className="text-3xl font-black text-slate-800">{formatCurrency(awningPrice)}</div>
                                                                </>
                                                            ) : (
                                                                <div className="text-slate-400 py-2">Wybierz wymiary...</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => awningPrice && addToBasket(
                                                                awningType === 'aufdach' ? 'Aufdachmarkise' : awningType === 'unterdach' ? 'Unterdachmarkise' : 'ZIP Screen',
                                                                awningPrice,
                                                                awningType === 'aufdach' ? 'Markiza na dachu' : awningType === 'unterdach' ? 'Markiza pod dachem' : 'Ekran ZIP pionowy',
                                                                `${awningWidth}x${awningProjection}`,
                                                                'accessory'
                                                            )}
                                                            disabled={awningPrice === null}
                                                            className={`w-full py-3 rounded-lg font-bold transition-all shadow-sm ${awningPrice
                                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-md transform hover:-translate-y-0.5'
                                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                        >
                                                            {awningPrice !== null ? '➕ Dodaj do koszyka' : 'Obliczanie...'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* LED & Accessories Section */}
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                <h4 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">✨</span>
                                                    LED & Akcesoria
                                                </h4>

                                                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {loadingAccessories ? (
                                                        <div className="text-center py-8 text-slate-400">Ładowanie cennika...</div>
                                                    ) : (
                                                        accessories.filter(a => a.category === 'led' || a.category === 'other').map(acc => {
                                                            const qty = accessoryQuantities[acc.id] || 0;
                                                            return (
                                                                <div key={acc.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${qty > 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${qty > 0 ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                                                            {acc.category === 'led' ? '💡' : '🔧'}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-700">{acc.name}</div>
                                                                            <div className="text-xs text-slate-500 font-medium">{formatCurrency(acc.price)} / {acc.unit}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                                                        <button
                                                                            onClick={() => setAccessoryQuantities(prev => ({ ...prev, [acc.id]: Math.max(0, (prev[acc.id] || 0) - 1) }))}
                                                                            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 font-bold transition-colors"
                                                                        >−</button>
                                                                        <span className={`w-6 text-center font-bold ${qty > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{qty}</span>
                                                                        <button
                                                                            onClick={() => setAccessoryQuantities(prev => ({ ...prev, [acc.id]: (prev[acc.id] || 0) + 1 }))}
                                                                            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-500 hover:text-white transition-all font-bold"
                                                                        >+</button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>

                                                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                                                    <button
                                                        onClick={handleAddAccessoryBatch}
                                                        className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 transition-all transform hover:-translate-y-0.5"
                                                    >
                                                        Dodaj wybrane akcesoria ➕
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ====== MATERIALS TAB ====== */}
                                    {/* ====== MATERIALS TAB ====== */}
                                    {wallTab === 'materials' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                <span className="text-indigo-900 font-medium">Materiały dla modelu:</span>
                                                <span className="font-bold text-indigo-700 bg-white px-4 py-1.5 rounded-lg text-sm border border-indigo-200 shadow-sm">{model}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Profile Column */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm">📏</span>
                                                        Profile
                                                    </h5>
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {loadingMaterials ? (
                                                            <div className="text-center py-8 text-slate-400">Ładowanie...</div>
                                                        ) : materials.filter(m => m.category === 'profile').map(mat => {
                                                            const qty = materialQuantities[mat.id] || 0;
                                                            return (
                                                                <div key={mat.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                                    <div className="flex-1 min-w-0 pr-3">
                                                                        <div className="font-bold text-slate-700 truncate text-sm">{mat.name}</div>
                                                                        <div className="text-xs text-slate-400 mt-0.5">{mat.dimension} • {formatCurrency(mat.base_price)}/{mat.unit}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: Math.max(0, (prev[mat.id] || 0) - 1) }))} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors">−</button>
                                                                        <span className="w-6 text-center text-sm font-bold text-slate-700">{qty}</span>
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: (prev[mat.id] || 0) + 1 }))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-500 hover:text-white transition-colors font-bold">+</button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Other Materials Column */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">🔩</span>
                                                        Pozostałe Materiały
                                                    </h5>
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {materials.filter(m => m.category !== 'profile').map(mat => {
                                                            const qty = materialQuantities[mat.id] || 0;
                                                            return (
                                                                <div key={mat.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                                    <div className="flex-1 min-w-0 pr-3">
                                                                        <div className="font-bold text-slate-700 truncate text-sm">{mat.name}</div>
                                                                        <div className="text-xs text-slate-400 mt-0.5">{formatCurrency(mat.base_price)}/{mat.unit} <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase tracking-wide ml-1 font-bold text-slate-500">{mat.category}</span></div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: Math.max(0, (prev[mat.id] || 0) - 1) }))} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors">−</button>
                                                                        <span className="w-6 text-center text-sm font-bold text-slate-700">{qty}</span>
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: (prev[mat.id] || 0) + 1 }))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white transition-colors font-bold">+</button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => {
                                                        Object.entries(materialQuantities).forEach(([id, qty]) => {
                                                            if (qty > 0) {
                                                                const mat = materials.find(m => m.id === id);
                                                                if (mat) {
                                                                    addToBasket(mat.name, mat.base_price * qty, mat.dimension || '', `${qty}x`, 'accessory');
                                                                }
                                                            }
                                                        });
                                                        setMaterialQuantities({});
                                                    }}
                                                    className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 transition-all transform hover:-translate-y-0.5"
                                                >
                                                    ➕ Dodaj wybrane materiały do koszyka
                                                </button>
                                            </div>
                                        </div>
                                    )}


                                    {/* ====== WPC FLOORING TAB ====== */}
                                    {wallTab === 'wpc' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-100">
                                                <span className="text-amber-900 font-medium">🪵 Podłoga WPC (Taras)</span>
                                                <span className="font-bold text-amber-700 bg-white px-4 py-1.5 rounded-lg text-sm border border-amber-200 shadow-sm">Cena za m²</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Dimensions */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm">📐</span>
                                                        Wymiary Tarasu
                                                    </h5>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Powierzchnia (m²)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                value={wpcArea}
                                                                onChange={e => {
                                                                    const area = parseFloat(e.target.value) || 0;
                                                                    setWpcArea(area);
                                                                    setWpcTotal(area * wpcPricePerM2);
                                                                }}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                                                placeholder="np. 15.5"
                                                            />
                                                        </div>
                                                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                                                            <strong>Wskazówka:</strong> Oblicz m² jako szerokość × głębokość w metrach
                                                            <div className="mt-2 text-xs text-slate-400">
                                                                Przykład: dach {width}mm × {projection}mm = {((width * projection) / 1000000).toFixed(2)} m²
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const area = (width * projection) / 1000000;
                                                                    setWpcArea(parseFloat(area.toFixed(2)));
                                                                    setWpcTotal(area * wpcPricePerM2);
                                                                }}
                                                                className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-bold"
                                                            >
                                                                → Użyj wymiarów dachu
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pricing */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-sm">💰</span>
                                                        Cena WPC
                                                    </h5>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                            <span className="text-slate-500">Cena za m²:</span>
                                                            <span className="font-bold text-lg">{formatCurrency(wpcPricePerM2)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                            <span className="text-slate-500">Powierzchnia:</span>
                                                            <span className="font-bold text-lg">{wpcArea.toFixed(2)} m²</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-3 bg-amber-50 rounded-lg px-3">
                                                            <span className="text-amber-900 font-bold">Suma:</span>
                                                            <span className="font-black text-2xl text-amber-700">{formatCurrency(wpcTotal)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => {
                                                        if (wpcArea > 0 && wpcTotal > 0) {
                                                            addToBasket('Podłoga WPC', wpcTotal, 'Taras WPC', `${wpcArea.toFixed(2)} m²`, 'accessory');
                                                            setWpcArea(0);
                                                            setWpcTotal(0);
                                                        }
                                                    }}
                                                    disabled={wpcArea <= 0 || wpcTotal <= 0}
                                                    className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${wpcArea > 0 && wpcTotal > 0
                                                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    ➕ Dodaj WPC do koszyka
                                                </button>
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 border border-blue-100">
                                                <strong>💡 Uwaga:</strong> Cena WPC jest ustawiana w panelu Admin → Cenniki V2 → Podłogi WPC.
                                            </div>
                                        </div>
                                    )}

                                    {/* ====== ALUMINUM WALLS TAB ====== */}
                                    {wallTab === 'aluminum' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl border border-slate-200">
                                                <span className="text-slate-900 font-medium">🔲 Ściany Aluminiowe</span>
                                                <span className="font-bold text-slate-700 bg-white px-4 py-1.5 rounded-lg text-sm border border-slate-300 shadow-sm">Pełne / Lamelowe</span>
                                            </div>

                                            {/* Wall Type Selector */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { id: 'full', name: 'Pełna', icon: '⬛', desc: 'Ściana aluminiowa pełna' },
                                                    { id: 'lamellar', name: 'Lamelowa', icon: '≡', desc: 'Lamele aluminiowe (mb × wys)' },
                                                ].map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setAluWallType(type.id as 'full' | 'lamellar')}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${aluWallType === type.id
                                                            ? 'border-slate-800 bg-slate-50 shadow-md'
                                                            : 'border-slate-200 hover:border-slate-400'
                                                            }`}
                                                    >
                                                        <div className="text-2xl mb-2">{type.icon}</div>
                                                        <div className="font-bold text-slate-800">{type.name}</div>
                                                        <div className="text-xs text-slate-500">{type.desc}</div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Dimensions */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm">📐</span>
                                                        Wymiary
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                                                                {aluWallType === 'lamellar' ? 'Długość (mb)' : 'Szerokość (mm)'}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={aluWallWidth}
                                                                onChange={e => setAluWallWidth(Number(e.target.value))}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Wysokość (mm)</label>
                                                            <input
                                                                type="number"
                                                                value={aluWallHeight}
                                                                onChange={e => setAluWallHeight(Number(e.target.value))}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    {aluWallType === 'lamellar' && (
                                                        <div className="mt-4 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                                                            <strong>Formula:</strong> Cena = cena_za_mb × długość_mb × (wysokość_mm / 1000)
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Pricing */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-sm">💰</span>
                                                        Cena
                                                    </h5>
                                                    {aluWallPriceLoading ? (
                                                        <div className="flex items-center justify-center py-12">
                                                            <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full"></div>
                                                        </div>
                                                    ) : aluWallPrice !== null ? (
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                                <span className="text-slate-500">Typ:</span>
                                                                <span className="font-bold">{aluWallType === 'full' ? 'Pełna' : 'Lamelowa'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                                <span className="text-slate-500">Wymiary:</span>
                                                                <span className="font-bold">{aluWallWidth} × {aluWallHeight} mm</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-3 bg-slate-100 rounded-lg px-3">
                                                                <span className="text-slate-900 font-bold">Cena:</span>
                                                                <span className="font-black text-2xl text-slate-800">{formatCurrency(aluWallPrice)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-slate-400">
                                                            <div className="text-3xl mb-2">📊</div>
                                                            <p>Brak ceny dla wybranych wymiarów</p>
                                                            <p className="text-xs mt-2">Uzupełnij cennik w Admin → Cenniki V2 → Ściany Alu</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => {
                                                        if (aluWallPrice && aluWallPrice > 0) {
                                                            addToBasket(
                                                                `Ściana Alu ${aluWallType === 'full' ? 'Pełna' : 'Lamelowa'}`,
                                                                aluWallPrice,
                                                                aluWallType === 'full' ? 'Aluminum Wall Full' : 'Aluminum Wall Lamellar',
                                                                `${aluWallWidth}x${aluWallHeight}`,
                                                                'wall'
                                                            );
                                                        }
                                                    }}
                                                    disabled={!aluWallPrice || aluWallPrice <= 0}
                                                    className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${aluWallPrice && aluWallPrice > 0
                                                        ? 'bg-slate-800 text-white hover:bg-slate-700'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    ➕ Dodaj ścianę do koszyka
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* LED tab redirect - merge into awnings */}
                                    {wallTab === 'led' && (
                                        <div className="text-center py-12">
                                            <div className="text-4xl mb-4">✨</div>
                                            <p className="text-slate-500 mb-4">LED i akcesoria zostały przeniesione do zakładki "Komfort"</p>
                                            <button onClick={() => setWallTab('awnings')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                                                Przejdź do Komfort →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-8 border-t border-slate-200">
                            <button
                                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                                disabled={activeStep === 0}
                                className={`px-6 py-3 rounded-xl font-bold transition-all ${activeStep === 0 ? 'opacity-0 pointer-events-none' : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                ← Wstecz
                            </button>
                            <button
                                onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
                                disabled={activeStep === steps.length - 1}
                                className={`px-8 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all ${activeStep === steps.length - 1 ? 'hidden' : 'block'}`}
                            >
                                Dalej →
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Summary (Always visible in Config/Summary view) */}
                    {
                        (view === 'config') && (
                            <div className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-4">
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Podsumowanie</h3>

                                    {/* Main Config Summary */}
                                    <div className="mb-6 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Model</span>
                                            <span className="font-bold text-slate-800">{model}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Wymiar</span>
                                            <span className="font-bold text-slate-800">{width} × {projection}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Montaż</span>
                                            <span className={`font-bold ${construction === 'freestanding' ? 'text-amber-600' : 'text-slate-800'}`}>
                                                {construction === 'wall' ? 'Przyścienny' : `Wolnostojący ${freestandingSurchargePrice > 0 ? '(+' + formatCurrency(freestandingSurchargePrice) + ')' : ''}`}
                                            </span>
                                        </div>
                                        {model === 'Designline' && schiebeeinheitCount > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">Schiebeeinheit</span>
                                                <span className="font-bold text-indigo-600">
                                                    {schiebeeinheitCount}× (+{formatCurrency(schiebeeinheitTotalPrice)})
                                                </span>
                                            </div>
                                        )}
                                        <div className="h-px bg-slate-100 my-2" />

                                        {/* Price Display */}
                                        <div className="text-center py-2">
                                            {price ? (
                                                <>
                                                    <div className="text-3xl font-black text-slate-900">{formatCurrency(totalPrice || 0)}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium mt-1">Cena netto (bez VAT)</div>
                                                    {structureCount > 1 && (
                                                        <div className="text-xs text-amber-600 font-medium mt-2 bg-amber-50 rounded-lg py-1.5 px-3 inline-block">
                                                            🔗 {structureCount}× konstrukcja łączona
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-slate-400 italic text-sm">{error || 'Obliczam...'}</div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleAddRoofToBasket}
                                            disabled={!totalPrice}
                                            className={`w-full py-3 rounded-xl font-bold transition-all ${totalPrice
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:-translate-y-0.5'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            Dodaj Zadaszenie +
                                        </button>
                                    </div>
                                </div>

                                {/* Basket Preview */}
                                <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
                                    <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setShowBasket(!showBasket)}>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            🛒 Koszyk <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{basket.length}</span>
                                        </h3>
                                        <span className="text-slate-400 text-sm">{showBasket ? '▼' : '▲'}</span>
                                    </div>

                                    {showBasket && (
                                        <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                                            {basket.map((item, i) => (
                                                <div key={item.id} className="text-sm border-b border-slate-50 last:border-0 pb-2 group">
                                                    <div className="flex justify-between font-bold text-slate-700">
                                                        <span>{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span>{formatCurrency(item.price)}</span>
                                                            <button
                                                                onClick={() => removeFromBasket(item.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs transition-opacity"
                                                                title="Usuń"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate pr-4">{item.config}</div>
                                                </div>
                                            ))}
                                            {basket.length === 0 && <p className="text-center text-slate-400 text-xs py-2">Pusty koszyk</p>}
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-500">Razem:</span>
                                        <span className="font-black text-lg text-indigo-600">{formatCurrency(basketTotal)}</span>
                                    </div>

                                    <button
                                        onClick={() => basket.length > 0 ? setView('summary') : toast.error('Dodaj coś do koszyka')}
                                        className={`w-full mt-3 py-2 rounded-lg font-bold text-sm ${basket.length > 0
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        Przejdź do oferty →
                                    </button>
                                </div>
                            </div>
                        )
                    }
                    {/* Email Modal */}
                    {
                        showEmailModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                        <h3 className="text-xl font-bold text-slate-800">Wygenerowana Treść Maila</h3>
                                        <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-2">
                                        💡 Ta treść została wygenerowana automatycznie. Możesz ją edytować przed wysłaniem.
                                    </div>

                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono leading-relaxed"
                                        rows={12}
                                    />

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(emailBody);
                                                toast.success('Skopiowano do schowka');
                                            }}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                                        >
                                            Kopiuj
                                        </button>
                                        <button
                                            onClick={() => {
                                                const subject = `Angebot ${savedOffer?.offerNumber || savedOfferId || 'V2'} - PolenDach24`;
                                                window.open(`mailto:${customerState?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`);
                                            }}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2"
                                        >
                                            ↗️ Otwórz w Poczcie
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </>
            )
            }
        </div >
    );
};
