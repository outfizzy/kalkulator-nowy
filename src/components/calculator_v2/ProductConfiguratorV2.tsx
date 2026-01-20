import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/translations';
import { PricingService } from '../../services/pricing.service';
import { toast } from 'react-hot-toast';
import { WallVisualizer } from './WallVisualizer';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import type { Customer, Lead, Offer } from '../../types';
import { generateOfferPDF } from '../../utils/pdfGenerator';
import { CustomerForm } from '../CustomerForm';

// ======= TYPES =======
type CoverType = 'Poly' | 'Glass';
type ConstructionType = 'wall' | 'freestanding';
type ViewState = 'customer' | 'config' | 'summary';

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
    { id: 'Orangeline', name: 'Orangeline', description: 'Ekonomiczny profil 50mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: false },
    { id: 'Orangeline+', name: 'Orangeline+', description: 'Ekonomiczny Plus 60mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: false },
    { id: 'Trendline', name: 'Trendline', description: 'Klasyczny profil 60mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: true },
    { id: 'Trendline+', name: 'Trendline+', description: 'Klasyczny Plus 70mm • od 2000mm', hasPoly: true, hasGlass: true, hasFreestanding: true },
    { id: 'Topline', name: 'Topline', description: 'Premium profil 80mm • od 2500mm', hasPoly: true, hasGlass: true, hasFreestanding: true },
    { id: 'Topline XL', name: 'Topline XL', description: 'Extra duża konstrukcja XL', hasPoly: true, hasGlass: true, hasFreestanding: false },
    { id: 'Designline', name: 'Designline', description: 'Elegancki design • tylko szkło', hasPoly: false, hasGlass: true, hasFreestanding: true },
    { id: 'Ultraline', name: 'Ultraline', description: 'Najwyższa klasa 100mm • tylko szkło', hasPoly: false, hasGlass: true, hasFreestanding: false },
    { id: 'Skyline', name: 'Skyline', description: 'Pergola bioklimatyczna z lamelami', hasPoly: false, hasGlass: false, hasFreestanding: true },
    { id: 'Carport', name: 'Carport', description: 'Wiata garażowa z blachą', hasPoly: false, hasGlass: false, hasFreestanding: true },
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

// Schiebetür - framed sliding doors
const SCHIEBETUR_PRODUCTS = [
    { id: 'Schiebetür (VSG klar)', name: 'Drzwi VSG klar', icon: '🚪', description: 'Szkło hartowane czyste' },
    { id: 'Schiebetür (VSG matt)', name: 'Drzwi VSG matt', icon: '🚪', description: 'Szkło matowe' },
    { id: 'Schiebetür (Isolierglas)', name: 'Drzwi Izolacyjne', icon: '🚪', description: 'Szkło termoizolacyjne' },
];

// Panorama - frameless sliding glass systems
const PANORAMA_PRODUCTS = [
    // AL22 - flat track
    { id: 'Panorama AL22 (3-Tor)', name: 'AL22 3-Tor', description: 'Płaska szyna, 3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL22 (5-Tor)', name: 'AL22 5-Tor', description: 'Płaska szyna, 5 torów', icon: '⊟', tracks: 5 },
    // AL23 - high track
    { id: 'Panorama AL23 (3-Tor)', name: 'AL23 3-Tor', description: 'Wysoka szyna, 3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL23 (5-Tor)', name: 'AL23 5-Tor', description: 'Wysoka szyna, 5 torów', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL23 (7-Tor)', name: 'AL23 7-Tor', description: 'Wysoka szyna, 7 torów', icon: '⊞', tracks: 7 },
    // AL24
    { id: 'Panorama AL24 (3-Tor)', name: 'AL24 3-Tor', description: '3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL24 (5-Tor)', name: 'AL24 5-Tor', description: '5 torów', icon: '⊟', tracks: 5 },
    // AL25
    { id: 'Panorama AL25 (3-Tor)', name: 'AL25 3-Tor', description: '3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL25 (5-Tor)', name: 'AL25 5-Tor', description: '5 torów', icon: '⊟', tracks: 5 },
    // AL26
    { id: 'Panorama AL26 (3-Tor)', name: 'AL26 3-Tor', description: '3 tory', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL26 (5-Tor)', name: 'AL26 5-Tor', description: '5 torów', icon: '⊟', tracks: 5 },
];

const PANORAMA_MODELS = [
    { id: 'AL22', name: 'AL22', description: 'Płaska szyna (Flat Track)', icon: '⊞', validTracks: [3, 5] },
    { id: 'AL23', name: 'AL23', description: 'Wysoka szyna (High Track)', icon: '⊞', validTracks: [3, 5, 7] },
    { id: 'AL24', name: 'AL24', description: 'Standard', icon: '⊞', validTracks: [3, 5] },
    { id: 'AL25', name: 'AL25', description: 'Premium', icon: '⊞', validTracks: [3, 5] },
    { id: 'AL26', name: 'AL26', description: 'Exclusive', icon: '⊞', validTracks: [3, 5] },
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

// ======= HELPER: Build table name =======
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

    // === WALL CONFIG ===
    const [wallProduct, setWallProduct] = useState<string>('Side Wall (Glass)');
    const [wallWidth, setWallWidth] = useState<number>(2000);
    const [wallHeight, setWallHeight] = useState<number>(2200);
    const [wallTab, setWallTab] = useState<'walls' | 'awnings' | 'led' | 'materials'>('walls');
    const [wallPrice, setWallPrice] = useState<number | null>(null);
    const [wallPriceLoading, setWallPriceLoading] = useState(false);
    const [wallCategory, setWallCategory] = useState<'fixed' | 'sliding' | 'panorama'>('fixed');
    const [structuralMetadata, setStructuralMetadata] = useState<{ posts_count: number } | null>(null);

    // === ACCESSORIES ===
    const [accessories, setAccessories] = useState<Accessory[]>([]);
    const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
    const [loadingAccessories, setLoadingAccessories] = useState(false);

    // === AWNING CONFIG ===
    const [awningType, setAwningType] = useState<'aufdach' | 'unterdach' | 'zip'>('aufdach');
    const [awningWidth, setAwningWidth] = useState<number>(2000);
    const [awningProjection, setAwningProjection] = useState<number>(2000);
    const [awningPrice, setAwningPrice] = useState<number | null>(null);

    // === MATERIALS ===
    const [materials, setMaterials] = useState<any[]>([]);
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // === PRICING STATE ===
    const [price, setPrice] = useState<number | null>(null);
    const [freestandingSurchargePrice, setFreestandingSurchargePrice] = useState<number>(0);
    const [variantSurchargePrice, setVariantSurchargePrice] = useState<number>(0);
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
    const [savingOffer, setSavingOffer] = useState(false);
    const [savedOfferId, setSavedOfferId] = useState<string | null>(null);
    const [publicLink, setPublicLink] = useState<string | null>(null);
    // Email Workflow State
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [emailBody, setEmailBody] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);

    // === CUSTOM ITEMS (Manual Positions) ===
    const [customItems, setCustomItems] = useState<{ id: string; name: string; price: number }[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    // === CALCULATED VALUES ===
    const areaM2 = (width * projection) / 1_000_000; // Convert mm² to m²

    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // === AUTO-SWITCH COVER TYPE FOR GLASS-ONLY MODELS ===
    useEffect(() => {
        const currentModelConfig = ROOF_MODELS.find(m => m.id === model);
        if (currentModelConfig) {
            // If model doesn't support Poly, switch to Glass
            if (!currentModelConfig.hasPoly && cover === 'Poly') {
                setCover('Glass');
            }
            // If model doesn't support Glass (Skyline, Carport), set to special
            if (!currentModelConfig.hasGlass && cover === 'Glass') {
                setCover('Poly'); // Will use buildTableName without cover prefix
            }
        }
    }, [model, cover]);

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
            const tableName = awningType === 'aufdach'
                ? 'Aluxe V2 - Aufdachmarkise'
                : awningType === 'unterdach'
                    ? 'Aluxe V2 - Unterdachmarkise'
                    : 'Aluxe V2 - ZIP Screen';

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
    }, [awningType, awningWidth, awningProjection]);

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
                // Determine cover type for Wedge (Glass vs Poly) based on roof config
                const wedgeType = cover === 'Poly' ? 'Poly' : 'Glass';
                tableName = `Aluxe V2 - Wedge (${wedgeType})`;
            } else if (wallProduct.includes('Schiebetür')) {
                // Use exact product ID for sliding doors
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
                            850, // Lookup key for panel price
                            0
                        );

                        console.log(`Panorama pricing: product=${wallProduct}, trackCount=${trackCount}, panelPrice=${panelPrice}, height=${wallHeight}`);

                        if (panelPrice !== null) {
                            // Calculate total price: price_per_panel × number_of_tracks × height_in_meters
                            const heightInMeters = wallHeight / 1000;
                            finalPrice = panelPrice * trackCount * heightInMeters;
                            console.log(`Panorama final price: ${panelPrice} × ${trackCount} × ${heightInMeters}m = ${finalPrice.toFixed(2)}`);
                        }
                    } else {
                        // Determine correct lookup dimensions based on product type
                        const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
                        const isSideWall = wallProduct.includes('Side');

                        let lookupWidth: number;
                        let lookupProjection: number;

                        if (isWedge) {
                            // Keilfenster: price by ROOF projection (not wall height!)
                            // SQL data has projection_mm = 4000/4500/5000
                            lookupWidth = 0;
                            lookupProjection = projection; // Use roof projection from main config
                        } else if (isSideWall) {
                            // Side Wall: price by wall height (stored as projection_mm)
                            lookupWidth = 0;
                            lookupProjection = wallHeight;
                        } else {
                            // Front Wall / Schiebetür: price by width
                            lookupWidth = wallWidth;
                            lookupProjection = 0;
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
                            if (glassVariant === 'matt') {
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
                            // Iso Glass (Future / Surcharge)
                            // Note: 'isolierglas' isn't in GLASS_VARIANTS yet, but logic is ready
                            if (glassVariant === 'isolierglas') {
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
    }, [wallProduct, wallWidth, wallHeight, projection]);

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

    // === CALCULATE ROOF PRICE ===
    useEffect(() => {
        const fetchPrice = async () => {
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

                if (construction === 'freestanding' && isSurchargeModel) {
                    // For Trendline/Topline Freestanding, we use the Wall price as base
                    tableName = buildTableName(model, cover, zone, 'wall');
                }

                let { data: tables } = await supabase
                    .from('price_tables')
                    .select('id, name')
                    .eq('name', tableName)
                    .eq('is_active', true)
                    .limit(1);

                if (!tables || tables.length === 0) {
                    // Fallback logic for safety if table not found
                    if (construction === 'freestanding' && !isSurchargeModel) {
                        // Maybe it's a model where freestanding is just +15% or different table?
                        // Current logic was: check Freestanding table, if missing, check Wall table + 15%.
                        const wallTableName = buildTableName(model, cover, zone, 'wall');
                        const { data: wallTables } = await supabase
                            .from('price_tables')
                            .select('id, name')
                            .eq('name', wallTableName)
                            .eq('is_active', true)
                            .limit(1);

                        if (wallTables && wallTables.length > 0) {
                            tables = wallTables;
                            // For non-surcharge models, we might default to 15% if that was legacy behavior
                            // But user request was specific about surcharge. 
                            // We'll keep 15% logic for NON-Trendline/Topline as fallback via manual calculation in component if needed.
                            // But let's assume if it finds the Wall table here (for e.g. Ultraline Freestanding), we might need to apply a default 15%.
                            // However, user specifically asked for Trendline/Topline logic.
                        }
                    }
                }

                if (!tables || tables.length === 0) {
                    setError(`Brak cennika bazowego: ${tableName}`);
                    setLoading(false);
                    return;
                }

                const table = tables[0];

                // Fetch dimension limits for this table (for UI constraints)
                const limits = await PricingService.getTableDimensionLimits(table.id);
                if (limits) {
                    setDimensionLimits({
                        maxWidth: limits.maxWidth,
                        maxDepth: limits.maxDepth,
                        minWidth: limits.minWidth,
                        minDepth: limits.minDepth
                    });

                    // Auto-constrain projection if exceeds max
                    if (projection > limits.maxDepth) {
                        setProjection(limits.maxDepth);
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
                            const surcharge = await PricingService.calculateMatrixPrice(surchargeTables[0].id, width, 0);
                            if (surcharge !== null) {
                                setFreestandingSurchargePrice(surcharge);
                            } else {
                                console.warn('Surcharge not found for width', width);
                            }
                        }
                    } else {
                        // Logic for other models (e.g. Ultraline) if they fallback to simplified +15%
                        // If we are here, it means we found a base table.
                        // If it was a 'Freestanding' table (Skyline/Carport), price covers everything.
                        // If it was a 'Wall' table (fallback logic above), we might need to add 15%.
                        if (tables[0].name.includes('Freestanding')) {
                            // Price is already full
                        } else {
                            // Price is Wall base, add 15% manually?
                            // Legacy logic was +15%. Let's keep it consistent for non-surcharge models.
                            // Currently `freestandingSurchargePrice` is absolute. 15% of base price.
                            setFreestandingSurchargePrice(matrixPrice * 0.15);
                        }
                    }
                }

                // 3. Fetch VARIANT SURCHARGE (Glass Matt/Stopsol or Poly IR Gold)
                setVariantSurchargePrice(0); // Reset

                // Only apply surcharge for non-default variants
                const needsSurcharge = (cover === 'Glass' && glassVariant !== 'klar') ||
                    (cover === 'Poly' && polyVariant === 'ir-gold');

                if (needsSurcharge && matrixPrice) {
                    let variantTableName = '';
                    if (cover === 'Glass' && glassVariant === 'matt') {
                        variantTableName = `Aluxe V2 - ${model} Glass Matt Surcharge (Zone ${zone})`;
                    } else if (cover === 'Glass' && glassVariant === 'stopsol') {
                        variantTableName = `Aluxe V2 - ${model} Glass Stopsol Surcharge (Zone ${zone})`;
                    } else if (cover === 'Poly' && polyVariant === 'ir-gold') {
                        variantTableName = `Aluxe V2 - ${model} Poly IR Gold Surcharge (Zone ${zone})`;
                    }

                    if (variantTableName) {
                        const { data: variantTables } = await supabase
                            .from('price_tables')
                            .select('id')
                            .eq('name', variantTableName)
                            .limit(1);

                        if (variantTables && variantTables.length > 0) {
                            const variantSurcharge = await PricingService.calculateMatrixPrice(
                                variantTables[0].id, width, projection
                            );
                            if (variantSurcharge !== null) {
                                setVariantSurchargePrice(variantSurcharge);
                            }
                        }
                    }
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        const t = setTimeout(fetchPrice, 300);
        return () => clearTimeout(t);
    }, [model, cover, zone, construction, width, projection, includeFoundations, glassVariant, polyVariant]);

    // === TOTALS ===
    const currentModel = useMemo(() => ROOF_MODELS.find(m => m.id === model), [model]);

    const totalPrice = useMemo(() => {
        if (price === null) return null;
        return price + freestandingSurchargePrice + variantSurchargePrice;
    }, [price, freestandingSurchargePrice, variantSurchargePrice]);

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
            (structureNote ? ` (${structureNote})` : '');
        addToBasket(model, totalPrice, configStr, `${width}×${projection}mm`, 'roof');
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



    // === CUSTOMER HANDLER ===
    const handleCustomerComplete = (data: Customer, snowZoneData: any) => {
        setCustomerState(data);



        // Map snow zone if provided
        if (snowZoneData && snowZoneData.value) {
            // Note: snowZone in V2 is currently just a number 'zone'. 
            // If snowZoneData is { id: '2', value: 0.85 }, we might need mapping logic
            // For now, let's try to parse the ID if it's numeric, or default to 1
            const zoneId = parseInt(snowZoneData.id);
            if (!isNaN(zoneId)) {
                setZone(zoneId);
            }
        }

        setView('config'); // Proceed to configuration
    };



    // === CALCULATED SUMMARY VALUES ===
    const customItemsTotal = customItems.reduce((sum, item) => sum + item.price, 0);
    const subtotal = basketTotal + customItemsTotal;
    const marginValue = subtotal * (margin / 100);
    const priceAfterMargin = subtotal + marginValue;
    const discountValue = priceAfterMargin * (discount / 100);
    const finalPrice = priceAfterMargin - discountValue;

    // === SAVE OFFER HANDLER ===
    // === SAVE OFFER HANDLER ===
    const handleSaveOffer = async () => {
        if (!currentUser) {
            toast.error('Musisz być zalogowany');
            return;
        }
        if (basket.length === 0) {
            toast.error('Koszyk jest pusty');
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

            // 2. Create Lead (with status 'negotiation')
            const lead = await DatabaseService.createLead({
                status: 'negotiation',
                source: 'calculator_v2',
                customerData: customerData,
                customerId: customerState.id, // Use existing ID if we have it
                notes: `Konfiguracja V2: ${basket.map(b => b.name).join(', ')}`
            });

            // 3. Build product config from basket
            const productConfig = {
                modelId: model,
                width: width,
                projection: projection,
                roofType: cover.toLowerCase() as any,
                construction: construction,
                color: color,
                variant: variant,
                // Main items from V2 basket
                items: basket.map(b => ({ name: b.name, config: b.config, price: b.price })),
                // New Custom items for V2 (mapped to match ProductConfig type)
                customItems: customItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    description: 'Manuelle Position',
                }))
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
            if (!offer || !currentUser) return;
            setIsGeneratingEmail(true);
            try {
                // Use the dedicated offer object if available, otherwise reconstruct context if needed
                // Ideally we use the 'savedOffer' object but 'offer' state might be null if we reloaded page
                // But here we setOffer(savedOffer) in handleSaveOffer.
                const content = await AiService.generateEmail(offer as any, currentUser, publicLink || undefined);
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
                            onClick={() => setView('config')}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                        >
                            ← Zurück zur Konfiguration
                        </button>
                        <h1 className="text-2xl font-black text-slate-900">Angebotszusammenfassung</h1>
                    </div>

                    {/* Technical Specs */}
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
                                        <td></td>
                                    </tr>
                                ))}
                                {customItems.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 last:border-0 bg-blue-50">
                                        <td className="py-3 font-medium text-blue-700">📝 {item.name}</td>
                                        <td className="py-3 text-slate-600 text-xs">Manuell hinzugefügt</td>
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
                                    <td colSpan={2} className="py-3 font-bold">Zwischensumme</td>
                                    <td className="py-3 text-right font-bold">{formatCurrency(subtotal)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Add Custom Item */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Position hinzufügen</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="Beschreibung..."
                                    className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                />
                                <input
                                    type="number"
                                    value={newItemPrice}
                                    onChange={e => setNewItemPrice(e.target.value)}
                                    placeholder="Preis €"
                                    className="w-32 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-right"
                                />
                                <button
                                    onClick={handleAddCustomItem}
                                    disabled={!newItemName.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
                                >
                                    + Hinzufügen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Margin & Discount */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">💰 Marge & Rabatt</h2>
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
                    </div>

                    {/* Final Price */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-indigo-200 text-sm">Endpreis (netto)</p>
                                <p className="text-4xl font-black">{formatCurrency(finalPrice)}</p>
                                <p className="text-indigo-200 text-sm mt-1">inkl. 19% MwSt. = {formatCurrency(finalPrice * 1.19)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-indigo-200 text-xs">Fläche</p>
                                <p className="text-2xl font-bold">{areaM2.toFixed(2)} m²</p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button or Success State */}
                    {savedOfferId ? (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-green-700">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="font-bold">Angebot erfolgreich gespeichert!</p>
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
                                    onClick={() => generateOfferPDF(offer as any)}
                                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                                >
                                    📄 PDF
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
                            disabled={savingOffer || basket.length === 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${savingOffer || basket.length === 0
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
            {/* LEFT COLUMN: Config */}
            <div className="col-span-12 lg:col-span-9 space-y-8">

                {/* CUSTOMER VIEW */}
                {view === 'customer' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                        <CustomerForm
                            onComplete={handleCustomerComplete}
                            submitLabel="Weiter zur Konfiguration"
                            initialData={customerState || undefined}
                        />
                    </div>
                )}

                {/* CONFIG/SUMMARY VIEW */}
                {(view === 'config' || view === 'summary') && (
                    <>
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
                                </div>

                                <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                        )}

                                                        {/* SLIDING DOORS */}
                                                        {wallCategory === 'sliding' && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {SCHIEBETUR_PRODUCTS.map(p => (
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
                                                        )}

                                                        {/* PANORAMA */}
                                                        {wallCategory === 'panorama' && (
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
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dimensions Card */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-sm font-bold text-slate-700">Wymiary zabudowy</h5>
                                                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Wybierz wymiar w mm</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                                                                {(wallProduct.includes('Side') || wallProduct.includes('Wedge')) ? 'Głębokość' : 'Szerokość'} (mm)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={wallWidth}
                                                                onChange={e => setWallWidth(Number(e.target.value))}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Wysokość (mm)</label>
                                                            <input
                                                                type="number"
                                                                value={wallHeight}
                                                                onChange={e => setWallHeight(Number(e.target.value))}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                            />
                                                        </div>
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
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cena elementu</div>
                                                            {wallPriceLoading ? (
                                                                <div className="text-2xl font-bold text-white/50 animate-pulse">Obliczam...</div>
                                                            ) : wallPrice !== null ? (
                                                                <div className="text-4xl font-black text-emerald-400 tracking-tight">
                                                                    {formatCurrency(wallPrice)}
                                                                </div>
                                                            ) : (
                                                                <div className="text-red-300 text-sm font-medium bg-red-500/10 py-1 px-3 rounded-full inline-block">Niedostępne dla wymiaru</div>
                                                            )}
                                                        </div>

                                                        <div className="h-px bg-white/10 w-full"></div>

                                                        <button
                                                            onClick={() => wallPrice && addToBasket(wallProduct, wallPrice, `${wallProduct}`, `${wallWidth}x${wallHeight}`, 'wall')}
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
                    </>
                )}
            </div>

            {/* RIGHT COLUMN: Summary (Always visible in Config/Summary view) */}
            {
                (view === 'config' || view === 'summary') && (
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
                                        <div key={item.id} className="text-sm border-b border-slate-50 last:border-0 pb-2">
                                            <div className="flex justify-between font-bold text-slate-700">
                                                <span>{item.name}</span>
                                                <span>{formatCurrency(item.price)}</span>
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
                                        const subject = `Angebot ${offer?.offerNumber} - PolenDach24`;
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
        </div >
    );
};
