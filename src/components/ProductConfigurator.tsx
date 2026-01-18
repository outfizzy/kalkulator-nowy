import React, { useEffect, useMemo, useState } from 'react';
import type { ProductConfig, SelectedAddon, PricingResult } from '../types';

import { LightingSelector } from './configurator/LightingSelector';
import { KeilfensterSelector } from './configurator/KeilfensterSelector';
import { PanoramaWallSelector } from './configurator/PanoramaWallSelector';
import { SlidingDoorSelector } from './configurator/SlidingDoorSelector';
import { AluminumWallSelector } from './configurator/AluminumWallSelector';
import { AwningSelector } from './configurator/AwningSelector';
import { WPCFlooringSelector } from './configurator/WPCFlooringSelector';
// import trendstyleData from '../data/trendstyle_full.json'; // Removed legacy
// import orangelineData from '../data/orangeline_full.json'; // Removed legacy
// import topstyleData from '../data/topstyle_full.json'; // Removed legacy
// import topstyleXlData from '../data/topstyle_xl_full.json'; // Removed legacy
// import skystyleData from '../data/skystyle_full.json'; // Removed legacy
// import ultrastyleData from '../data/ultrastyle_full.json'; // Removed legacy
// import carportData from '../data/carport_full.json'; // Removed legacy
import { formatCurrency } from '../utils/translations';
import { toast } from 'react-hot-toast';
import { PricingService, type AdditionalCost } from '../services/pricing.service';
import { SettingsService } from '../services/database/settings.service';

// === OFFER BASKET TYPES ===
interface ProductDefinition {
    id: string;
    code: string;
    name: string;
    description: string;
    image_url?: string;
    standard_colors?: string[];
    custom_color_surcharge_percentage?: number;
}

interface ExternalOfferItem {
    id: string;
    supplier: 'selt' | 'aliplast' | 'other';
    productName: string;
    description: string;
    purchasePrice: number;
    sellingPrice: number;
}

interface ProductConfiguratorProps {
    onComplete: (config: ProductConfig) => void;
    initialData?: ProductConfig;
    // New: support for external items basket
    externalItems?: ExternalOfferItem[];
    onExternalItemsChange?: (items: ExternalOfferItem[]) => void;
}

const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
    </div>
);

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({
    onComplete,
    initialData,
    externalItems: initialExternalItems = [],
    onExternalItemsChange
}) => {
    const [config, setConfig] = useState<ProductConfig>(initialData || {
        modelId: '',
        width: 3000,
        projection: 2500,
        postsHeight: 2500,
        snowZone: '1', // Default to Zone 1
        color: 'RAL 7016',
        customColor: false,
        customColorRAL: '',
        roofType: 'polycarbonate',
        polycarbonateType: 'standard',
        glassType: 'standard',
        installationType: 'wall-mounted',
        addons: [],
        selectedAccessories: [],
        selectedSurcharges: [],
        installationDays: 0,
        discount: 0,
        discountMode: 'percentage'
    });

    // Dynamic Pricing state
    const [dynamicBasePrice, setDynamicBasePrice] = useState<number>(0);
    const [priceLoading, setPriceLoading] = useState(false);
    const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
    const [surchargesBreakdown, setSurchargesBreakdown] = useState<{ name: string, price: number }[]>([]);
    const [installationData, setInstallationData] = useState<any>(null);
    const [availableSurcharges, setAvailableSurcharges] = useState<{ id: string, name: string, price?: number }[]>([]);
    const [products, setProducts] = useState<ProductDefinition[]>([]);

    // Addons Data
    const [addonGroups, setAddonGroups] = useState<{
        walls: any[];
        sliding: any[];
        keilfenster: any[];
        lighting: any[];
        heating: any[];
        awnings: any[];
        panorama: any[];
        wpc: any[];
        accessories: any[]; // General accessories
        zip_screens: any[];
    }>({
        walls: [],
        sliding: [],
        keilfenster: [],
        lighting: [],
        heating: [],
        awnings: [],
        zip_screens: [],
        panorama: [],
        wpc: [],
        accessories: []
    });

    const [loadingComponents, setLoadingComponents] = useState(false);

    // New: Effective Dimensions & Error State
    const [matchedDimensions, setMatchedDimensions] = useState<{ width: number, projection: number } | null>(null);
    const [priceError, setPriceError] = useState<string | null>(null);

    const [variantNote, setVariantNote] = useState<string | null>(null);
    const [detail, setDetail] = useState<any>({});
    // marginData moved to lower section

    // Dynamic Limits State
    const [limits, setLimits] = useState({ minWidth: 2000, maxWidth: 10000, minDepth: 2000, maxDepth: 5000 });

    // Fetch Limits when model changes
    useEffect(() => {
        if (!config.modelId) return;
        PricingService.getProductLimits(config.modelId).then(setLimits);

        // NEW: Set default dimensions to smallest valid size in price list
        // This ensures the calculator never starts with "0 EUR" due to invalid default dims
        const setSmartDefaults = async () => {
            try {
                // Construct basic attributes for lookup
                let calculatedSubtype = (config.roofType === 'glass' ? config.glassType : config.polycarbonateType) || 'standard';
                const isAluxe = ['topstyle', 'trendstyle', 'orangestyle', 'ultrastyle', 'carport', 'topstyle_xl', 'grillo_rigid'].some(m => config.modelId.toLowerCase().includes(m));

                if (isAluxe) {
                    if (config.roofType === 'glass' && calculatedSubtype === 'standard') calculatedSubtype = 'glass_clear';
                    if (config.roofType === 'polycarbonate' && calculatedSubtype === 'standard') calculatedSubtype = 'poly_clear';
                }

                // Handle Skystyle/Ultrastyle override (Force Glass context)
                let roofType = config.roofType;
                if (config.modelId === 'skystyle' || config.modelId === 'ultrastyle') {
                    roofType = 'glass';
                    calculatedSubtype = 'glass_clear';
                }

                const attributes: Record<string, string> = {
                    snow_zone: config.snowZone ? String(config.snowZone) : '1',
                    roof_type: roofType,
                    mounting: config.installationType === 'wall-mounted' ? 'wall' : 'free',
                    subtype: calculatedSubtype
                };

                const matrix = await PricingService.getPriceMatrix(config.modelId, attributes);

                if (matrix && matrix.length > 0) {
                    // Find Minimum Valid Dimension Pair
                    // Sort by Width ASC, then Depth ASC
                    const sorted = matrix.sort((a: any, b: any) => {
                        if (a.width_mm !== b.width_mm) return a.width_mm - b.width_mm;
                        return a.depth_mm - b.depth_mm;
                    });

                    const bestFit = sorted[0]; // The smallest width/depth combo

                    if (bestFit) {
                        console.log(`📏 Setting Default Dimensions for ${config.modelId}: ${bestFit.width_mm}x${bestFit.depth_mm}`);
                        setConfig(prev => ({
                            ...prev,
                            width: bestFit.width_mm,
                            projection: bestFit.depth_mm
                        }));
                    }
                }
            } catch (e) {
                console.error('Error setting smart defaults:', e);
            }
        };

        setSmartDefaults();

    }, [config.modelId]);

    // Fetch Price when attributes change
    useEffect(() => {
        const calculatePrice = async () => {
            if (!config.modelId) return;
            setPriceLoading(true);

            try {
                // 1. Prepare Attributes Context
                let calculatedSubtype = (config.roofType === 'glass' ? config.glassType : config.polycarbonateType) || 'standard';

                // MAPPING FIX: imported Aluxe tables use generic 'glass'/'polycarbonate' subtypes for standard variants
                // AND map specific dropdown keys (ir-gold) to DB keys (poly_iq_relax)
                // Added topstyle_xl to validation list
                const aluxeModels = ['topstyle', 'trendstyle', 'orangestyle', 'ultrastyle', 'carport', 'topstyle_xl', 'grillo_rigid'];
                if (aluxeModels.some(m => config.modelId.toLowerCase().includes(m))) {
                    if (config.roofType === 'glass' && calculatedSubtype === 'standard') {
                        calculatedSubtype = 'glass_clear' as any;
                    }
                    if (config.roofType === 'polycarbonate') {
                        if (calculatedSubtype === 'standard') calculatedSubtype = 'poly_clear' as any;
                        if (calculatedSubtype === 'ir-gold') calculatedSubtype = 'poly_iq_relax' as any; // Map Gold -> Relax
                    }
                }

                const attributes: Record<string, string> = {
                    snow_zone: config.snowZone ? String(config.snowZone) : '1',
                    roof_type: config.roofType, // 'polycarbonate', 'glass', or 'tin'
                    mounting: config.installationType === 'wall-mounted' ? 'wall' : 'free',
                    subtype: calculatedSubtype,
                    // Add other attributes if needed (e.g. post height range)
                };

                // 2. Get Matrix Price (Removed legacy matrix fetch)

                // --- REFACTORED PRICING LOGIC (Centralized in PricingService) ---
                const priceConfig: ProductConfig = {
                    ...config
                };

                const result: PricingResult = await PricingService.calculateOfferPrice(priceConfig, 0);

                // 1. Update Base Price
                // Note: result.totalCost includes surcharges. result.basePrice is pure foundation.
                setDynamicBasePrice(result.basePrice);

                // 2. Update Surcharges & Installation Breakdown
                setSurchargesBreakdown(result.surchargesBreakdown || []);
                setInstallationData(result.installationCosts || null);

                // 3. Update Found/Error State
                const isFound = (result._debuginfo as any)?.found;

                if (isFound) {
                    setPriceError(null);
                    setMatchedDimensions(result.matchedWidth && result.matchedProjection ? { width: result.matchedWidth, projection: result.matchedProjection } : null);

                    // Update Detail for Posts/Fields
                    setDetail({
                        matchedWidth: result.matchedWidth,
                        matchedProjection: result.matchedProjection,
                        properties: {
                            posts_count: result.numberOfPosts,
                            fields_count: result.numberOfFields
                        },
                        construction_type: result.constructionType,
                        variant_note: result.structuralNote
                    });

                    setVariantNote(result.structuralNote || null);
                    setMarginData({
                        value: result.marginValue || 0,
                        percentage: result.marginPercentage || 0
                    });
                } else {
                    // Check if table missing completely
                    const tableExists = await PricingService.checkPriceTableExists();
                    if (!tableExists) {
                        setPriceError('Brak cennika dla wybranej strefy śniegowej. Prosimy o kontakt w celu wyceny indywidualnej.');
                    } else {
                        setPriceError(null);
                    }
                    setMatchedDimensions(null);
                    setDetail({});
                    setVariantNote(null);
                }

                // Legacy Additional Costs
                // Reconstruct attributes roughly for legacy support (if needed)

                const surcharges = await PricingService.getAdditionalCosts(config.modelId, attributes);
                setAdditionalCosts(surcharges);


            } catch (err) {
                console.error("Pricing error", err);
            } finally {
                setPriceLoading(false);
            }
        };

        const timeoutId = setTimeout(calculatePrice, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [config.modelId, config.width, config.projection, config.snowZone, config.roofType, config.installationType, config.selectedSurcharges, config.glassType, config.polycarbonateType, availableSurcharges]);

    // Fetch Available Surcharges
    useEffect(() => {
        const fetchSurcharges = async () => {
            if (!config.modelId) return;
            try {
                let calculatedSubtype: string = (config.roofType === 'glass' ? config.glassType : config.polycarbonateType) || 'standard';
                // Normalization for Aluxe defaults
                if (['topstyle', 'trendstyle', 'orangestyle', 'ultrastyle', 'carport'].includes(config.modelId.toLowerCase())) {
                    if (config.roofType === 'glass' && calculatedSubtype === 'standard') calculatedSubtype = 'glass_clear' as any;
                    if (config.roofType === 'polycarbonate' && calculatedSubtype === 'standard') calculatedSubtype = 'poly_clear' as any;
                }

                const attributes: Record<string, string> = {
                    snow_zone: config.snowZone ? String(config.snowZone) : '1',
                    roof_type: config.roofType,
                    mounting: config.installationType === 'wall-mounted' ? 'wall' : 'free',
                    subtype: calculatedSubtype
                };

                const surcharges = await PricingService.getAvailableSurcharges(config.modelId, attributes);
                setAvailableSurcharges(surcharges);
            } catch (error) {
                console.error("Error fetching surcharges:", error);
            }
        };
        fetchSurcharges();
    }, [config.modelId, config.roofType, config.snowZone, config.installationType, config.glassType, config.polycarbonateType]);

    // Fetch Addon Groups
    useEffect(() => {
        const fetchComponents = async () => {
            setLoadingComponents(true);
            try {
                // Derive Model Name from products list + config.modelId
                // config.modelId matches 'code'. product.name matches 'imported_from'.
                const activeModelName = products.find(p => p.code === config.modelId?.toLowerCase())?.name;

                console.log('📦 Fetching Addons for Context:', activeModelName || 'Global');

                // Fetch all groups in parallel
                const [walls, sliding, keil, light, heat, awnings, zips, panorama, wpc, accessories] = await Promise.all([
                    PricingService.getAddonsByGroup('walls_aluminum', activeModelName),
                    PricingService.getAddonsByGroup('sliding_doors', activeModelName),
                    PricingService.getAddonsByGroup('keilfenster', activeModelName),
                    PricingService.getAddonsByGroup('lighting', activeModelName),
                    PricingService.getAddonsByGroup('heating', activeModelName),
                    PricingService.getAddonsByGroup('awnings', activeModelName),
                    PricingService.getAddonsByGroup('zip_screens', activeModelName),
                    PricingService.getAddonsByGroup('panorama', activeModelName),
                    PricingService.getAddonsByGroup('wpc_floor', activeModelName),
                    PricingService.getAddonsByGroup('accessories', activeModelName)
                ]);

                setAddonGroups({
                    walls,
                    sliding,
                    keilfenster: keil,
                    lighting: light,
                    heating: heat,
                    awnings,
                    zip_screens: zips,
                    panorama,
                    wpc,
                    accessories
                });
            } catch (e) {
                console.error("Error loading addons", e);
            } finally {
                setLoadingComponents(false);
            }
        };

        if (products.length > 0) {
            fetchComponents();
        }
    }, [products, config.modelId]);

    // Margin State
    const [marginData, setMarginData] = useState<{ percentage: number; value: number }>({ percentage: 40, value: 0 });

    // Load Global Settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // If initialData provided margin, respect it (logic to extract is handled in effect below or passed differently?
                // Actually initialData doesn't strictly have margin in ProductConfig, it's in PricingResult. 
                // But ProductConfigurator returns config. 
                // The margin is usually handled in the "Offer" context or passed as props if we were editing an Offer.
                // Here we are creating/editing a CONFIG.

                // If it's a fresh config (no info), load global default.
                const policy = await SettingsService.getGlobalPricingPolicy();
                if (policy && policy.defaultMargin) {
                    setMarginData(prev => ({ ...prev, percentage: policy.defaultMargin }));
                }
            } catch (e) {
                console.error('Error loading global pricing policy', e);
            }
        };
        loadSettings();
    }, []);

    // Fetch Dynamic Products
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await PricingService.getMainProducts();
                console.log("Loaded products:", data);
                if (data && data.length > 0) {
                    // Filter out Orangestyle+ (missing data)
                    const filtered = data.filter(p => !p.code.includes('orangestyle_plus'));
                    setProducts(filtered);
                } else {
                    console.warn("No products found in DB.");
                    toast.error('Brak produktów w bazie.');
                }
            } catch (error) {
                console.error("Failed to load products:", error);
                toast.error('Błąd ładowania produktów. Odśwież stronę.');
            }
        };
        loadProducts();
    }, []);

    // === EXTERNAL ITEMS BASKET ===
    const [externalItems, setExternalItems] = useState<ExternalOfferItem[]>(initialExternalItems);
    const [showExternalForm, setShowExternalForm] = useState<'selt' | 'aliplast' | null>(null);
    const [externalForm, setExternalForm] = useState({
        productName: '',
        description: '',
        purchasePrice: 0,
        sellingPrice: 0
    });

    // Notify parent when external items change
    useEffect(() => {
        if (onExternalItemsChange) {
            onExternalItemsChange(externalItems);
        }
    }, [externalItems, onExternalItemsChange]);

    const handleAddExternalItem = () => {
        if (!externalForm.productName || !externalForm.sellingPrice) {
            toast.error('Podaj nazwę produktu i cenę sprzedaży');
            return;
        }
        const newItem: ExternalOfferItem = {
            id: crypto.randomUUID(),
            supplier: showExternalForm!,
            productName: externalForm.productName,
            description: externalForm.description,
            purchasePrice: externalForm.purchasePrice,
            sellingPrice: externalForm.sellingPrice
        };
        setExternalItems([...externalItems, newItem]);
        setExternalForm({ productName: '', description: '', purchasePrice: 0, sellingPrice: 0 });
        setShowExternalForm(null);
        toast.success(`Dodano ${newItem.productName} do oferty`);
    };

    const handleRemoveExternalItem = (id: string) => {
        setExternalItems(externalItems.filter(i => i.id !== id));
        toast.success('Usunięto pozycję');
    };

    const externalItemsTotal = useMemo(() => {
        return externalItems.reduce((sum, i) => sum + i.sellingPrice, 0);
    }, [externalItems]);

    const [activeWallTab, setActiveWallTab] = useState<'sliding' | 'panorama' | 'walls' | 'keil' | 'awning' | 'lighting' | 'accessories' | 'floor'>('sliding');

    const basePrice = useMemo(() => {
        return dynamicBasePrice;
    }, [dynamicBasePrice]);

    const additionalCostsTotal = useMemo(() => {
        if (!additionalCosts || additionalCosts.length === 0) return 0;

        let sum = 0;
        const currentBasePrice = dynamicBasePrice > 0 ? dynamicBasePrice : basePrice;

        additionalCosts.forEach(cost => {
            if (cost.cost_type === 'fixed') {
                sum += Number(cost.value);
            } else if (cost.cost_type === 'percentage') {
                sum += currentBasePrice * (Number(cost.value) / 100);
            }
        });
        return sum;
    }, [additionalCosts, basePrice, dynamicBasePrice]);

    const totalCost = useMemo(() => {
        const addonsTotal = config.addons.reduce((sum, a) => sum + a.price, 0);
        const accessoriesTotal = (config.selectedAccessories || []).reduce((sum, a) => sum + (a.price * a.quantity), 0);
        // External Items Total
        const extTotal = externalItems.reduce((sum, item) => sum + item.sellingPrice, 0);

        // Sum Surcharges (handled in PricingService, but need to be included in Cost Total)
        const surchargesTotal = surchargesBreakdown.reduce((sum, item) => sum + item.price, 0);

        return basePrice + addonsTotal + accessoriesTotal + extTotal + additionalCostsTotal + surchargesTotal;
    }, [basePrice, config.addons, config.selectedAccessories, externalItems, additionalCostsTotal, surchargesBreakdown]);

    const totalPrice = useMemo(() => {
        // Just use the totalCost + Margin Logic
        // IF marginData is percentage based:
        let productSelling = totalCost;
        if (marginData && marginData.percentage) {
            productSelling = totalCost / (1 - (marginData.percentage / 100));
        }

        // Apply Manual Discount
        // Discount is applied to the PRODUCT part (productSelling), before services? 
        // Or to the total? Usually discount is on the product.
        // Let's apply to productSelling.
        if (config.discount && config.discount > 0) {
            if (config.discountMode === 'fixed') {
                productSelling = Math.max(0, productSelling - config.discount);
            } else {
                // percentage
                productSelling = productSelling * (1 - (config.discount / 100));
            }
        }

        // Add Services (Pass-through)
        const services = (installationData?.dailyTotal || 0) + (installationData?.travelCost || 0);

        return productSelling + services;
    }, [totalCost, marginData, installationData, config.discount, config.discountMode]);

    // --- Logic & Calculations ---

    // Limits are now handled by state `limits` fetched from DB
    // Removed legacy local limits calculation





    const handleBasicConfigChange = (name: string, value: any) => {
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleAddonAdd = (addon: SelectedAddon) => {
        setConfig(prev => {
            const others = prev.addons.filter(a => a.id !== addon.id);
            return { ...prev, addons: [...others, addon] };
        });
    };

    const handleAddonRemove = (id: string) => {
        setConfig(prev => ({ ...prev, addons: prev.addons.filter(a => a.id !== id) }));
    };

    // Recalculate Matrix Addon Prices when Dimensions Change
    useEffect(() => {
        const recalculatePrices = async () => {
            if (!config.selectedAccessories || config.selectedAccessories.length === 0) return;

            const hasMatrixItems = config.selectedAccessories.some(a => a.pricing_basis === 'MATRIX');
            if (!hasMatrixItems) return;

            console.log('🔄 Recalculating Matrix Addon Prices...');

            const updated = await Promise.all(config.selectedAccessories.map(async (acc) => {
                if (acc.pricing_basis === 'MATRIX') {
                    // We need the full addon object (properties, etc)
                    // But selectedAccessories only has { name, price, quantity, attributes }.
                    // We are missing properties/id needed for calculation!
                    // FIX: We need to store full metadata in selectedAccessories or fetch it.
                    // Ideally, selectedAccessories should store 'addonId' or full object.

                    // Assuming we update toggleAccessory to store 'properties' and 'pricing_basis'
                    // acc.attributes currently stores 'properties' based on line 460 in original code
                    // Let's rely on acc.attributes (which is properties) and acc.pricing_basis

                    // Wait, calculateAddonPrice needs properties.price_table_id.
                    // In original code: properties: entry.properties.
                    // So acc.attributes is the properties object.

                    // We need to reconstruct the "addon" object structure expected by PricingService
                    const mockAddon = {
                        addon_name: acc.name,
                        pricing_basis: 'MATRIX',
                        properties: acc.attributes
                    };

                    const newPrice = await PricingService.calculateAddonPrice(mockAddon, config.width, config.projection);

                    if (newPrice !== acc.price) {
                        return { ...acc, price: newPrice };
                    }
                }
                return acc;
            }));

            // Only update if changes found
            const changed = updated.some((u, i) => u.price !== config.selectedAccessories![i].price);
            if (changed) {
                setConfig(prev => ({ ...prev, selectedAccessories: updated }));
            }
        };

        const timeoutId = setTimeout(recalculatePrices, 500); // Debounce
        return () => clearTimeout(timeoutId);

    }, [config.width, config.projection, config.selectedAccessories?.length]); // Dep on length to run when new items added, but avoid loop on update

    const toggleAccessory = async (acc: any, increment: boolean) => {
        // If incrementing a new item that is MATRIX, we should calculate price first
        // But for "Toggle" logic with +/- buttons, we need to be careful not to double add

        const newAccessories = [...(config.selectedAccessories || [])];
        const existingIdx = newAccessories.findIndex(a => a.name === acc.description);

        if (existingIdx >= 0) {
            if (increment) {
                newAccessories[existingIdx].quantity++;
            } else {
                if (newAccessories[existingIdx].quantity > 1) {
                    newAccessories[existingIdx].quantity--;
                } else {
                    newAccessories.splice(existingIdx, 1);
                }
            }
            setConfig(prev => ({ ...prev, selectedAccessories: newAccessories }));
        } else if (increment) {
            // NEW ITEM
            let finalPrice = acc.price_net;

            if (acc.pricing_basis === 'MATRIX') {
                // Calculate initial price
                toast.loading('Obliczanie ceny dodatku...', { id: 'calc-addon' });
                finalPrice = await PricingService.calculateAddonPrice(acc, config.width, config.projection);
                toast.dismiss('calc-addon');
                if (finalPrice === 0) {
                    toast.error('Nie znaleziono ceny dla podanych wymiarów.');
                    // Add anyway? Or block?
                    // Lets add with 0 price but warn.
                }
            }

            newAccessories.push({
                name: acc.description,
                price: finalPrice,
                quantity: 1,
                attributes: acc.properties || acc.attributes,
                pricing_basis: acc.pricing_basis // Store this!
            });
            setConfig(prev => ({ ...prev, selectedAccessories: newAccessories }));
        }
    };

    const invalidWidth = config.width > limits.maxWidth || config.width < limits.minWidth;
    const invalidDepth = config.projection > limits.maxDepth || config.projection < limits.minDepth;

    // Skystyle: automatycznie koryguj wymiary do dopuszczalnego zakresu,
    // żeby nie blokować konfiguracji błędem po zmianie modelu
    useEffect(() => {
        if (config.modelId !== 'skystyle') return;

        let nextWidth = config.width;
        let nextDepth = config.projection;

        // ... Skystyle logic same as before ...
        if (nextWidth < limits.minWidth) nextWidth = limits.minWidth;
        if (nextWidth > limits.maxWidth) nextWidth = limits.maxWidth;
        if (nextDepth < limits.minDepth) nextDepth = limits.minDepth;
        if (nextDepth > limits.maxDepth) nextDepth = limits.maxDepth;

        if (nextWidth !== config.width || nextDepth !== config.projection) {
            setConfig(prev => ({
                ...prev,
                width: nextWidth,
                projection: nextDepth
            }));
        }
    }, [
        config.modelId,
        config.width,
        config.projection,
        limits.minWidth,
        limits.maxWidth,
        limits.minDepth,
        limits.maxDepth
    ]);

    const [activeStep, setActiveStep] = useState(0);



    const steps = [
        { id: 'model', label: 'Model', icon: '🏠' },
        { id: 'dimensions', label: 'Wymiary', icon: '📏' },
        { id: 'roof-color', label: 'Dach i Kolor', icon: '🎨' },
        { id: 'addons', label: 'Dodatki', icon: '✨' },
        { id: 'installation', label: 'Montaż', icon: '🔧' }
    ];

    const handleNext = () => {
        if (activeStep < steps.length - 1) {
            setActiveStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Configuration Controls */}
            <div className="col-span-12 lg:col-span-9 w-full">

                {/* Stepper Navigation */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8">
                    <div className="flex justify-between items-center relative">
                        {/* Progress Bar Background */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-0 rounded-full" />

                        {/* Active Progress Bar */}
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-accent transition-all duration-500 ease-in-out -z-0 rounded-full"
                            style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                        />

                        {steps.map((step, index) => (
                            <button
                                key={step.id}
                                onClick={() => setActiveStep(index)}
                                className={`relative z-10 flex flex-col items-center gap-2 group transition-all duration-300 ${index <= activeStep ? 'text-accent' : 'text-slate-400'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-300 bg-white ${index === activeStep
                                    ? 'border-accent shadow-lg shadow-accent/20 scale-110'
                                    : index < activeStep
                                        ? 'border-accent bg-accent text-white'
                                        : 'border-slate-200 group-hover:border-slate-300'
                                    }`}>
                                    {index < activeStep ? '✓' : step.icon}
                                </div>
                                <span className={`text-xs font-bold hidden md:block transition-all duration-300 ${index === activeStep ? 'text-slate-800' : 'text-slate-400'
                                    }`}>
                                    {step.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">

                    {/* 1. MODEL SELECTION */}
                    {activeStep === 0 && (
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <SectionHeader title="Wybierz Model" icon="🏠" />

                            {/* Aluxe Models */}
                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    Zadaszenia Aluxe (konfigurowane)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {products.length > 0 ? (
                                        products.map(product => (
                                            <div
                                                key={product.id || product.code}
                                                onClick={() => {
                                                    handleBasicConfigChange('modelId', product.code);
                                                    if (product.code === 'skystyle' || product.code === 'ultrastyle') {
                                                        handleBasicConfigChange('roofType', 'glass');
                                                        handleBasicConfigChange('glassType', 'standard');
                                                    }
                                                }}
                                                className={`cursor-pointer border-2 rounded-xl p-4 transition-all relative overflow-hidden group ${config.modelId === product.code
                                                    ? 'border-accent bg-accent/5 shadow-md'
                                                    : 'border-slate-100 hover:border-accent/30'
                                                    }`}
                                            >
                                                {product.image_url && (
                                                    <div className="absolute top-0 right-0 w-24 h-24 -mt-4 -mr-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                                        />
                                                    </div>
                                                )}
                                                {product.image_url && (
                                                    <div className="mb-3 rounded-lg overflow-hidden h-32 bg-white border border-slate-100">
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                )}
                                                <h3 className="text-lg font-bold mb-1 text-slate-900 flex justify-between items-center gap-2">
                                                    <span>{product.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono" title={`Kod systemowy: ${product.code}`}>
                                                        {product.code}
                                                    </span>
                                                </h3>
                                                <p className="text-xs text-slate-500 mb-3">{product.description || 'System aluminiowy'}</p>
                                                <ul className="text-[10px] text-slate-600 space-y-0.5">
                                                    {/* Placeholder features - can be added to DB later */}
                                                    <li>• Konfigurowalny</li>
                                                </ul>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full p-8 text-center text-slate-400">
                                            Ładowanie produktów...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deponti - Zadaszenia Gotowe */}


                            {/* Selt / Aliplast - External Suppliers */}
                            {/* External Items Basket */}
                            {externalItems.length > 0 && (
                                <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl">
                                    <h5 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                        🛒 Dodane produkty zewnętrzne ({externalItems.length})
                                    </h5>
                                    <div className="space-y-2">
                                        {externalItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${item.supplier === 'selt' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                                    <div>
                                                        <div className="font-bold text-sm">{item.productName}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {item.supplier.toUpperCase()} • {item.description || 'Brak opisu'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-accent">{formatCurrency(item.sellingPrice)}</span>
                                                    <button
                                                        onClick={() => handleRemoveExternalItem(item.id)}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Suma produktów zewnętrznych:</span>
                                        <span className="font-bold text-lg text-accent">{formatCurrency(externalItemsTotal)}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 2. DIMENSIONS & CONSTRUCTION */}
                    {activeStep === 1 && (
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
                            <SectionHeader title="Wymiary i Konstrukcja" icon="📏" />

                            {/* Dimensions Subsection */}
                            <div className="mb-6 md:mb-8">
                                <h4 className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-2">
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    Wymiary Tarasu
                                </h4>
                                <div className="space-y-4 md:space-y-8">
                                    {/* Width */}
                                    <div className="bg-slate-50 p-3 md:p-5 rounded-xl border border-slate-200">
                                        <label className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-2 text-sm font-medium text-slate-700 mb-3 md:mb-4">
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                </svg>
                                                <span className="text-xs md:text-sm">Szerokość (mm)</span>
                                            </span>
                                            <span className="text-xl md:text-2xl text-accent font-bold">{config.width} mm</span>
                                        </label>
                                        <input
                                            type="range"
                                            min={limits.minWidth}
                                            max={limits.maxWidth}
                                            step={100}
                                            value={config.width}
                                            onChange={(e) => handleBasicConfigChange('width', Number(e.target.value))}
                                            className="w-full accent-accent h-2 md:h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] md:text-xs text-slate-500 mt-2 md:mt-3 font-medium gap-2">
                                            <span className="bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-center">Min: {limits.minWidth} mm</span>
                                            <span className="bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-center">Max: {limits.maxWidth} mm</span>
                                        </div>
                                        {/* Direct input */}
                                        <div className="mt-3 md:mt-4">
                                            <input
                                                type="number"
                                                min={limits.minWidth}
                                                max={limits.maxWidth}
                                                step={100}
                                                value={config.width}
                                                onChange={(e) => handleBasicConfigChange('width', Number(e.target.value))}
                                                className="w-full p-2 md:p-3 border-2 border-slate-300 rounded-lg text-center text-base md:text-lg font-bold text-accent focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Depth */}
                                    <div className="bg-slate-50 p-3 md:p-5 rounded-xl border border-slate-200">
                                        <label className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-2 text-sm font-medium text-slate-700 mb-3 md:mb-4">
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                </svg>
                                                <span className="text-xs md:text-sm">Głębokość (mm)</span>
                                            </span>
                                            <span className="text-xl md:text-2xl text-accent font-bold">{config.projection} mm</span>
                                        </label>
                                        <input
                                            type="range"
                                            min={limits.minDepth}
                                            max={limits.maxDepth}
                                            step={100}
                                            value={config.projection}
                                            onChange={(e) => handleBasicConfigChange('projection', Number(e.target.value))}
                                            className="w-full accent-accent h-2 md:h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] md:text-xs text-slate-500 mt-2 md:mt-3 font-medium gap-2">
                                            <span className="bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-center">Min: {limits.minDepth} mm</span>
                                            <span className="bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-center">Max: {limits.maxDepth} mm</span>
                                        </div>
                                        {/* Direct input */}
                                        <div className="mt-3 md:mt-4">
                                            <input
                                                type="number"
                                                min={limits.minDepth}
                                                max={limits.maxDepth}
                                                step={100}
                                                value={config.projection}
                                                onChange={(e) => handleBasicConfigChange('projection', Number(e.target.value))}
                                                className="w-full p-2 md:p-3 border-2 border-slate-300 rounded-lg text-center text-base md:text-lg font-bold text-accent focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Construction Options Subsection */}
                            <div className="pt-4 md:pt-6 border-t border-slate-200">
                                <h4 className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-2">
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Opcje Konstrukcji
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    {/* Post Height */}
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-5 rounded-xl border border-slate-200">
                                        <label className="block text-xs md:text-sm font-bold text-slate-700 mb-3 md:mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                            </svg>
                                            Wysokość słupów
                                        </label>
                                        <div className="flex gap-2 md:gap-3">
                                            {[2400, 3000].map(h => (
                                                <button
                                                    key={h}
                                                    onClick={() => handleBasicConfigChange('postsHeight', h)}
                                                    className={`flex-1 py-3 md:py-4 px-2 md:px-4 rounded-xl text-sm md:text-base font-bold border-2 transition-all ${config.postsHeight === h
                                                        ? 'border-accent bg-accent text-white shadow-lg shadow-accent/30 scale-105'
                                                        : 'border-slate-300 bg-white text-slate-700 hover:border-accent/50 hover:scale-102'
                                                        }`}
                                                >
                                                    {h} mm
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Installation Type */}
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-5 rounded-xl border border-slate-200">
                                        <label className="block text-xs md:text-sm font-bold text-slate-700 mb-3 md:mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                            Typ montażu
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                            {[
                                                { id: 'wall-mounted', label: 'Przyścienny', icon: '🏠' },
                                                { id: 'freestanding', label: 'Wolnostojący', icon: '⛺' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => handleBasicConfigChange('installationType', type.id)}
                                                    className={`flex-1 py-3 md:py-4 px-2 md:px-4 rounded-xl text-sm md:text-base font-bold border-2 transition-all ${config.installationType === type.id
                                                        ? 'border-accent bg-accent text-white shadow-lg shadow-accent/30 scale-105'
                                                        : 'border-slate-300 bg-white text-slate-700 hover:border-accent/50 hover:scale-102'
                                                        }`}
                                                >
                                                    <div className="text-lg md:text-xl mb-1">{type.icon}</div>
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Snow Zone Selection */}
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 md:p-5 rounded-xl border border-blue-200 col-span-1 md:col-span-2">
                                        <label className="block text-xs md:text-sm font-bold text-blue-800 mb-3 md:mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            Strefa Śniegowa (Obciążenie)
                                        </label>
                                        <div className="flex gap-2 md:gap-4">
                                            {(['1', '2', '3'] as const).map(zone => (
                                                <button
                                                    key={zone}
                                                    onClick={() => setConfig({ ...config, snowZone: zone })}
                                                    className={`flex-1 py-3 md:py-4 px-2 md:px-4 rounded-xl border-2 transition-all relative overflow-hidden ${config.snowZone === zone
                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                                                        : 'border-blue-200 bg-white text-blue-700 hover:border-blue-400'
                                                        }`}
                                                >
                                                    <div className="text-xs font-semibold opacity-80 uppercase tracking-widest mb-1">Strefa</div>
                                                    <div className="text-2xl md:text-3xl font-black">{zone}</div>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="mt-3 text-[10px] md:text-xs text-blue-600 text-center">
                                            Wybór strefy (1, 2 lub 3) wpływa na wzmocnienia konstrukcji i cenę końcową.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 3. ROOF & COLOR */}
                    {activeStep === 2 && (
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <SectionHeader title="Dach i Kolor" icon="🎨" />
                            <div className={`grid ${config.modelId === 'skystyle' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-8`}>
                                {/* Roof Type */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">Rodzaj pokrycia</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {config.modelId !== 'skystyle' && config.modelId !== 'ultrastyle' && (
                                            <div
                                                onClick={() => handleBasicConfigChange('roofType', 'polycarbonate')}
                                                className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${config.roofType === 'polycarbonate' ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30'}`}
                                            >
                                                <div className="text-2xl mb-2">🛡️</div>
                                                <div className="font-bold text-slate-900">Poliwęglan</div>
                                                <div className="text-xs text-slate-500">Lekki i wytrzymały</div>
                                            </div>
                                        )}
                                        <div
                                            onClick={() => handleBasicConfigChange('roofType', 'glass')}
                                            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${config.roofType === 'glass' ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30'}`}
                                        >
                                            <div className="text-2xl mb-2">💎</div>
                                            <div className="font-bold text-slate-900">Szkło VSG</div>
                                            <div className="text-xs text-slate-500">
                                                {(config.modelId === 'skystyle' || config.modelId === 'ultrastyle')
                                                    ? 'Jedyny wariant dachu dla tego modelu'
                                                    : 'Premium wygląd'}
                                            </div>
                                        </div>
                                    </div>
                                    {config.modelId === 'carport' && (
                                        <div className="mt-4">
                                            <div
                                                onClick={() => handleBasicConfigChange('roofType', 'tin')}
                                                className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${config.roofType === 'tin' ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30'}`}
                                            >
                                                <div className="text-2xl mb-2">🏗️</div>
                                                <div className="font-bold text-slate-900">Blacha Trapezowa</div>
                                                <div className="text-xs text-slate-500">Standard dla Carportu</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-options for Polycarbonate */}
                                    {config.modelId !== 'skystyle' && config.modelId !== 'ultrastyle' && config.roofType === 'polycarbonate' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                                            <div className="text-sm font-medium text-slate-700 mb-3">Warianty Poliwęglanu</div>
                                            <div className="space-y-2">
                                                {/* Clear */}
                                                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                    <input
                                                        type="radio"
                                                        name="polyType"
                                                        checked={config.polycarbonateType === 'poly_clear' || config.polycarbonateType === 'standard'} // Handle legacy 'standard'
                                                        onChange={() => {
                                                            handleBasicConfigChange('polycarbonateType', 'poly_clear');
                                                            // Clear surcharges
                                                            handleBasicConfigChange('selectedSurcharges', []);
                                                        }}
                                                        className="w-4 h-4 text-accent focus:ring-accent"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">Clear (Przeźroczysty)</div>
                                                        <div className="text-xs text-slate-500">Bez dopłaty</div>
                                                    </div>
                                                </label>

                                                {/* Opal */}
                                                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                    <input
                                                        type="radio"
                                                        name="polyType"
                                                        checked={config.polycarbonateType === 'poly_opal'}
                                                        onChange={() => {
                                                            handleBasicConfigChange('polycarbonateType', 'poly_opal');
                                                            // Clear surcharges
                                                            handleBasicConfigChange('selectedSurcharges', []);
                                                        }}
                                                        className="w-4 h-4 text-accent focus:ring-accent"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">Opal (Mleczny)</div>
                                                        <div className="text-xs text-slate-500">Bez dopłaty</div>
                                                    </div>
                                                </label>

                                                {/* IQ Relax / Surcharges */}
                                                {availableSurcharges
                                                    .filter(s => s.name.toLowerCase().includes('ir') || s.name.toLowerCase().includes('heat') || s.name.toLowerCase().includes('gold') || s.name.toLowerCase().includes('relax'))
                                                    .map(surcharge => {
                                                        const isSelected = config.selectedSurcharges?.includes(surcharge.id);
                                                        return (
                                                            <label key={surcharge.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                                <input
                                                                    type="radio"
                                                                    name="polyType"
                                                                    checked={isSelected || false}
                                                                    onChange={() => {
                                                                        handleBasicConfigChange('polycarbonateType', 'poly_iq_relax'); // Internal type for logic
                                                                        const polySurcharges = availableSurcharges.filter(s => s.name.toLowerCase().match(/ir|heat|gold|relax/)).map(s => s.id);
                                                                        const current = config.selectedSurcharges || [];
                                                                        const othersRemoved = current.filter(id => !polySurcharges.includes(id));
                                                                        handleBasicConfigChange('selectedSurcharges', [...othersRemoved, surcharge.id]);
                                                                    }}
                                                                    className="w-4 h-4 text-accent focus:ring-accent"
                                                                />
                                                                <div>
                                                                    <div className="font-medium text-sm text-slate-900">{surcharge.name}</div>
                                                                    <div className="text-xs text-slate-500">Opcja dodatkowa (+{surcharge.price} EUR)</div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                {/* IR Gold (New Option) */}
                                                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                    <input
                                                        type="radio"
                                                        name="polyType"
                                                        checked={config.polycarbonateType === 'poly_iq_relax'}
                                                        onChange={() => {
                                                            handleBasicConfigChange('polycarbonateType', 'poly_iq_relax');
                                                        }}
                                                        className="w-4 h-4 text-accent focus:ring-accent"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">IR Gold (Heat Protection)</div>
                                                        <div className="text-xs text-slate-500">Dopłata</div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-options for Glass */}
                                    {config.roofType === 'glass' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-3">
                                            <div className="text-sm font-medium text-slate-700">Wariant szkła</div>
                                            <div className="space-y-2">
                                                {/* Clear (Standard) */}
                                                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                    <input
                                                        type="radio"
                                                        name="glassType"
                                                        checked={config.glassType === 'glass_clear' || config.glassType === 'standard'}
                                                        onChange={() => {
                                                            handleBasicConfigChange('glassType', 'glass_clear');
                                                            // Remove glass surcharges
                                                            const glassSurcharges = availableSurcharges.filter(s => s.name.match(/mat|sun|milch|opal|tint/i)).map(s => s.id);
                                                            const current = config.selectedSurcharges || [];
                                                            handleBasicConfigChange('selectedSurcharges', current.filter(id => !glassSurcharges.includes(id)));
                                                        }}
                                                        className="w-4 h-4 text-accent focus:ring-accent"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">Przeźroczyste (Clear 44.2)</div>
                                                        <div className="text-xs text-slate-500">Standard</div>
                                                    </div>
                                                </label>

                                                {/* Opal (Matte) - Check if it's a surcharge or distinct type in DB */}
                                                {/* Assuming Surcharge for Opal/Matt based on prior Importer logic */}
                                                {/* Opal (Matte) */}
                                                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                    <input
                                                        type="radio"
                                                        name="glassType"
                                                        checked={config.glassType === 'glass_opal'}
                                                        onChange={() => {
                                                            handleBasicConfigChange('glassType', 'glass_opal');
                                                        }}
                                                        className="w-4 h-4 text-accent focus:ring-accent"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">Opal (Mleczne)</div>
                                                        <div className="text-xs text-slate-500">
                                                            {(() => {
                                                                const sur = availableSurcharges.find(s => s.name.match(/mat|milch|opal/i));
                                                                return sur ? `Dopłata (+${sur.price} EUR)` : 'Dopłata';
                                                            })()}
                                                        </div>
                                                    </div>
                                                </label>

                                                {/* Tinted (Sun Protection) */}
                                                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                    <input
                                                        type="radio"
                                                        name="glassType"
                                                        checked={config.glassType === 'glass_tinted'}
                                                        onChange={() => {
                                                            handleBasicConfigChange('glassType', 'glass_tinted');
                                                        }}
                                                        className="w-4 h-4 text-accent focus:ring-accent"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">Sun Protection (Przyciemniane)</div>
                                                        <div className="text-xs text-slate-500">
                                                            {(() => {
                                                                const sur = availableSurcharges.find(s => s.name.match(/sun|tint|protec/i));
                                                                return sur ? `Dopłata (+${sur.price} EUR)` : 'Dopłata';
                                                            })()}
                                                        </div>
                                                    </div>
                                                </label>

                                            </div>
                                        </div>
                                    )}


                                </div>

                                {/* Colors */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">Kolor konstrukcji</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(() => {
                                            const selectedProduct = products.find(p => p.code === config.modelId);
                                            // Default colors if none defined
                                            const defaultColors = ['RAL 7016', 'RAL 9016', 'RAL 9005', 'RAL 9007'];
                                            const productColors = (selectedProduct?.standard_colors && selectedProduct.standard_colors.length > 0)
                                                ? selectedProduct.standard_colors
                                                : defaultColors;

                                            // Helper to get hex for preview (expanded mapping)
                                            const getHex = (name: string) => {
                                                const n = name.toUpperCase();
                                                // Anthracite & Greys
                                                if (n.includes('7016')) return '#383e42'; // Anthracite Grey
                                                if (n.includes('9006')) return '#a5a5a5'; // White Aluminum
                                                if (n.includes('9007')) return '#878581'; // Grey Aluminum
                                                if (n.includes('7035')) return '#d7d7d7'; // Light Grey
                                                if (n.includes('7039')) return '#6c6960'; // Quartz Grey
                                                if (n.includes('DB 703') || n.includes('DB703')) return '#4e5452'; // DB 703 (Metallic Grey)

                                                // Whites
                                                if (n.includes('9016')) return '#f1f0ea'; // Traffic White
                                                if (n.includes('9010')) return '#fdfbf7'; // Pure White
                                                if (n.includes('9001')) return '#fdf4e3'; // Cream White

                                                // Blacks
                                                if (n.includes('9005') || n.includes('TEXTURE')) return '#0e0e10'; // Jet Black

                                                // Browns
                                                if (n.includes('8014')) return '#4f3b33'; // Sepia Brown
                                                if (n.includes('8017')) return '#44322d'; // Chocolate Brown
                                                if (n.includes('8019')) return '#3b3332'; // Grey Brown
                                                if (n.includes('8001')) return '#9d6b38'; // Ochre Brown

                                                // Greens
                                                if (n.includes('6005')) return '#0e3a1f'; // Moss Green
                                                if (n.includes('6009')) return '#213529'; // Fir Green

                                                // Fallbacks
                                                if (n.includes('SILVER') || n.includes('SREBR')) return '#c0c0c0';

                                                return '#cccccc'; // Default gray
                                            };

                                            return (
                                                <>
                                                    {productColors.map(c => (
                                                        <div
                                                            key={c}
                                                            onClick={() => handleBasicConfigChange('color', c)}
                                                            className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${config.color === c && !config.customColor
                                                                ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                                                                : 'border-slate-200 hover:border-accent/30'
                                                                }`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: getHex(c) }} />
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-900">{c}</div>
                                                                <div className="text-xs text-slate-500">Standard</div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Custom Color Option */}
                                                    <div
                                                        onClick={() => {
                                                            handleBasicConfigChange('customColor', !config.customColor);
                                                            // Reset specific color if toggling on
                                                            if (!config.customColor) {
                                                                handleBasicConfigChange('color', 'Niestandardowy');
                                                            } else {
                                                                handleBasicConfigChange('color', productColors[0]);
                                                            }
                                                        }}
                                                        className={`cursor-pointer flex flex-col justify-center gap-1 p-3 rounded-xl border transition-all ${config.customColor
                                                            ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                                                            : 'border-slate-200 hover:border-accent/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full border border-slate-300 shadow-sm bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                                                            <div className="font-bold text-sm text-slate-900">Inny Kolor</div>
                                                        </div>
                                                        {selectedProduct?.custom_color_surcharge_percentage ? (
                                                            <div className="text-xs text-red-500 font-medium mt-1">
                                                                Dopłata +{selectedProduct.custom_color_surcharge_percentage}%
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-500 mt-1">Wycena indywidualna</div>
                                                        )}
                                                    </div>

                                                    {/* Custom Color Input */}
                                                    {config.customColor && (
                                                        <div className="col-span-2 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                            <label className="text-xs font-bold text-slate-700 block mb-1">Podaj kod koloru (np. RAL 1234)</label>
                                                            <input
                                                                type="text"
                                                                value={config.customColorRAL || ''}
                                                                onChange={(e) => handleBasicConfigChange('customColorRAL', e.target.value)}
                                                                className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-accent focus:border-accent"
                                                                placeholder="Wpisz nazwę koloru..."
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 4. ADDONS & ACCESSORIES (Tabbed) */}
                    {activeStep === 3 && (
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                                <span className="text-2xl">🧩</span>
                                <h3 className="text-xl font-bold text-slate-800">Dodatki i Akcesoria</h3>
                            </div>

                            {/* Main Tabs */}
                            <div className="flex border-b border-slate-200">
                                {[
                                    { id: 'enclosure', label: 'Zabudowa (Ściany)', icon: '🏗️' },
                                    { id: 'comfort', label: 'Komfort (Markizy, LED, Ogrzewanie)', icon: '☀️' },
                                    { id: 'floor', label: 'Podłoga', icon: '🪵' },
                                    { id: 'extras', label: 'Pozostałe Dodatki', icon: '✨' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveWallTab(tab.id === 'enclosure' ? 'sliding' : tab.id === 'comfort' ? 'awning' : tab.id === 'floor' ? 'floor' : 'accessories')}
                                        className={`flex-1 px-4 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${(tab.id === 'enclosure' && ['sliding', 'panorama', 'walls', 'keil'].includes(activeWallTab)) ||
                                            (tab.id === 'comfort' && ['awning', 'lighting'].includes(activeWallTab)) ||
                                            (tab.id === 'floor' && activeWallTab === 'floor') ||
                                            (tab.id === 'extras' && activeWallTab === 'accessories')
                                            ? 'text-accent border-accent bg-accent/5'
                                            : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="text-xl">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* ENCLOSURE CONTENT (Zabudowa) */}
                                {['sliding', 'panorama', 'walls', 'keil'].includes(activeWallTab) && (
                                    <div>
                                        {/* Sub-tabs for Enclosure */}
                                        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-2">
                                            {[
                                                { id: 'sliding', label: 'Szyby Przesuwne' },
                                                { id: 'walls', label: 'Ściany Aluminiowe' },
                                                { id: 'panorama', label: 'Panorama' },
                                                { id: 'keil', label: 'Keilfenster (Trójkąty)' },
                                            ].map(subTab => (
                                                <button
                                                    key={subTab.id}
                                                    onClick={() => setActiveWallTab(subTab.id as any)}
                                                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeWallTab === subTab.id
                                                        ? 'bg-slate-800 text-white shadow-md'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {subTab.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="min-h-[300px]">
                                            {activeWallTab === 'sliding' && (
                                                <SlidingDoorSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    availableItems={addonGroups.sliding}
                                                />
                                            )}
                                            {activeWallTab === 'panorama' && (
                                                <PanoramaWallSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    availableItems={addonGroups.panorama}
                                                />
                                            )}
                                            {activeWallTab === 'walls' && (
                                                <AluminumWallSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    maxRoofWidth={config.width}
                                                    maxRoofDepth={config.projection}
                                                    availableItems={addonGroups.walls}
                                                />
                                            )}
                                            {activeWallTab === 'keil' && (
                                                <KeilfensterSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    availableItems={addonGroups.keilfenster}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* COMFORT CONTENT (Komfort) */}
                                {['awning', 'lighting'].includes(activeWallTab) && (
                                    <div>
                                        {/* Sub-tabs for Comfort */}
                                        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-2">
                                            {[
                                                { id: 'awning', label: 'Markizy (Ochrona przed słońcem)' },
                                                { id: 'lighting', label: 'Oświetlenie i Ogrzewanie' },
                                            ].map(subTab => (
                                                <button
                                                    key={subTab.id}
                                                    onClick={() => setActiveWallTab(subTab.id as any)}
                                                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeWallTab === subTab.id
                                                        ? 'bg-orange-500 text-white shadow-md'
                                                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                                        }`}
                                                >
                                                    {subTab.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="min-h-[300px]">
                                            {activeWallTab === 'awning' && (
                                                <AwningSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    availableItems={[...addonGroups.awnings, ...addonGroups.zip_screens]}
                                                    maxRoofWidth={config.width}
                                                    maxRoofDepth={config.projection}
                                                />
                                            )}
                                            {activeWallTab === 'lighting' && (
                                                <LightingSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    availableItems={[...(addonGroups.lighting || []), ...(addonGroups.heating || [])]}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* FLOOR CONTENT (Podłoga) */}
                                {activeWallTab === 'floor' && (
                                    <WPCFlooringSelector
                                        currentAddons={config.addons}
                                        onAdd={handleAddonAdd}
                                        onRemove={handleAddonRemove}
                                        roofWidth={config.width}
                                        roofDepth={config.projection}
                                        availableItems={addonGroups.wpc}
                                    />
                                )}

                                {/* EXTRAS CONTENT (Dodatki) */}
                                {activeWallTab === 'accessories' && (
                                    <div>
                                        <div className="mb-6">
                                            <h4 className="text-lg font-bold text-slate-800 mb-2">Pozostałe akcesoria</h4>
                                            <p className="text-slate-500 text-sm">Dodatkowe elementy wyposażenia i montażu.</p>
                                        </div>

                                        {/* Imported Component Lists */}
                                        {loadingComponents ? (
                                            <div className="py-8 text-center text-slate-400">Ładowanie komponentów...</div>
                                        ) : (
                                            addonGroups.accessories.length > 0 && (
                                                <div className="mt-8 pt-8 border-t border-slate-100">
                                                    <h5 className="font-semibold text-slate-700 mb-3 pl-1 border-l-4 border-accent">Akcesoria Ogólne</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {addonGroups.accessories
                                                            .filter(entry => {
                                                                // HIDE "Freestanding" from addons if user already selected Freestanding Type
                                                                // or if it's the redundant "Konstrukcja Wolnostojąca" item
                                                                const nameLower = entry.addon_name.toLowerCase();
                                                                const isFreestandingItem = nameLower.includes('free') || nameLower.includes('wolnostoj');

                                                                // If Config is set to Freestanding, HIDE the addon (it's built-in)
                                                                if (config.installationType === 'freestanding' && isFreestandingItem) return false;

                                                                return true;
                                                            })
                                                            .map((entry, idx) => {
                                                                const itemName = entry.addon_name;
                                                                const itemPrice = entry.price_upe_net_eur;
                                                                const uniqueName = `[Akcesoria] ${itemName}`;
                                                                const isMatrix = entry.pricing_basis === 'MATRIX';

                                                                const selected = config.selectedAccessories?.find(a => a.name === uniqueName);
                                                                const qty = selected?.quantity || 0;

                                                                const displayPrice = isMatrix && itemPrice === 0
                                                                    ? 'Wg wymiarów'
                                                                    : formatCurrency(itemPrice);

                                                                return (
                                                                    <div key={idx} className={`border rounded-xl p-4 transition-all ${qty > 0 ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30'}`}>
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div className="font-medium text-slate-900 text-sm line-clamp-2 h-10 pr-2" title={uniqueName}>
                                                                                {itemName}
                                                                            </div>
                                                                            <div className="font-bold text-accent text-sm whitespace-nowrap">{displayPrice}</div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-2 bg-white rounded-lg border border-slate-200 p-1">
                                                                            <button
                                                                                onClick={() => toggleAccessory({ description: uniqueName, price_net: itemPrice, properties: entry.properties, pricing_basis: entry.pricing_basis }, false)}
                                                                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                                                                            >-</button>
                                                                            <span className="font-bold text-sm text-slate-900 w-8 text-center">{qty}</span>
                                                                            <button
                                                                                onClick={() => toggleAccessory({ description: uniqueName, price_net: itemPrice, properties: entry.properties, pricing_basis: entry.pricing_basis }, true)}
                                                                                className="w-8 h-8 flex items-center justify-center text-white bg-accent rounded hover:bg-accent/90"
                                                                            >+</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* 7. INSTALLATION */}
                    {activeStep === 4 && (
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <SectionHeader title="Montaż" icon="🔧" />
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Liczba dni montażowych</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[0, 1, 2, 3, 4, 5].map(days => (
                                            <button
                                                key={days}
                                                onClick={() => handleBasicConfigChange('installationDays', days)}
                                                className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${config.installationDays === days
                                                    ? 'bg-accent text-white shadow-lg shadow-accent/30 scale-110'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {days}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                                    <div className="font-semibold text-slate-900 mb-1">Szacowany koszt montażu</div>
                                    <p className="text-slate-500 text-xs mb-2">Zawiera dojazd i robociznę (przybliżone)</p>
                                    {config.installationDays ? (
                                        <div className="text-xl font-bold text-accent">
                                            {config.installationDays} dni
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 italic">Wybierz ilość dni</div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-8">
                        <button
                            onClick={handleBack}
                            disabled={activeStep === 0}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeStep === 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            ← Wstecz
                        </button>

                        {activeStep < steps.length - 1 ? (
                            <button
                                onClick={handleNext}
                                className="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-accent/30 hover:shadow-xl hover:scale-[1.02] flex items-center gap-2"
                            >
                                Dalej <span className="text-xl">→</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => onComplete(config)}
                                className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/30 hover:shadow-xl hover:scale-[1.02] flex items-center gap-2"
                            >
                                Zakończ Konfigurację <span className="text-xl">✓</span>
                            </button>
                        )}
                    </div>

                    {/* Debug Info for Mobile/Tablet (< lg) - HIDDEN FOR PRODUCTION */}
                    {/* <div className="lg:hidden mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400">
                        <details>
                            <summary className="cursor-pointer hover:text-slate-600 font-mono select-none p-2 bg-slate-50 rounded">DEBUG: Parametry Wyceny (Mobile)</summary>
                            <div className="mt-2 space-y-1 font-mono bg-slate-100 p-2 rounded overflow-x-auto">
                                <div>Model ID: <span className="text-slate-600">{config.modelId}</span></div>
                                <div>Wymiary: <span className="text-slate-600">{config.width} x {config.projection}</span></div>
                                <div>Strefa: <span className="text-slate-600">{config.snowZone}</span></div>
                                <div>Typ Dachu: <span className="text-slate-600">{config.roofType}</span></div>
                                <div>Subtyp: <span className="text-slate-600">{config.roofType === 'glass' ? config.glassType : config.polycarbonateType}</span></div>
                                <div>Montaż (App): <span className="text-slate-600">{config.installationType}</span></div>
                                <div>Montaż (DB): <span className="text-slate-600 font-bold">{config.installationType === 'wall-mounted' ? 'wall' : 'free'}</span></div>
                                <div>Cena Bazowa: <span className="text-slate-600">{dynamicBasePrice}</span></div>
                                <div>Dopasowano: <span className={matchedDimensions ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{matchedDimensions ? `${matchedDimensions.width}x${matchedDimensions.projection}` : 'BRAK DOPASOWANIA'}</span></div>
                                {priceError && <div className="text-red-500 font-bold">Błąd: {priceError}</div>}
                            </div>
                        </details>
                    </div> */}

                </div>
            </div>

            {/* RIGHT COLUMN: Sticky Summary (Desktop) */}
            <div className="hidden lg:block col-span-12 lg:col-span-3 w-full lg:sticky lg:top-6 space-y-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 text-white p-6">
                        <h3 className="text-xl font-bold">Podsumowanie</h3>
                        <p className="text-slate-400 text-sm">Twoja konfiguracja</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-3 pb-6 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Model</span>
                                <span className="font-bold text-slate-800">{
                                    config.modelId === 'trendstyle_plus' ? 'Trendstyle+' :
                                        config.modelId === 'topstyle_xl' ? 'Topstyle XL' :
                                            config.modelId === 'skystyle' ? 'Skystyle' :
                                                config.modelId ? config.modelId.charAt(0).toUpperCase() + config.modelId.slice(1) : '-'
                                }</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Wymiary</span>
                                <div className="text-right">
                                    <span className="font-medium text-slate-800 block">{config.width} x {config.projection} mm</span>
                                    {matchedDimensions && (matchedDimensions.width !== config.width || matchedDimensions.projection !== config.projection) && (
                                        <span className="text-[10px] text-green-600 font-semibold block bg-green-50 px-1 rounded">
                                            (Wycena dla: {matchedDimensions.width} x {matchedDimensions.projection})
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Dach</span>
                                <span className="font-medium text-slate-800 capitalize">{config.roofType === 'glass' ? 'Szkło VSG' : 'Poliwęglan'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Kolor</span>
                                <span className="font-medium text-slate-800">{config.color}</span>
                            </div>
                        </div>

                        {/* Base Price (Structure) */}
                        <div className="space-y-3 pb-6 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Konstrukcja</span>
                            <div className="flex justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="text-slate-600">Model Podstawowy</span>
                                    <span className="text-[10px] text-slate-400">
                                        {config.installationType === 'freestanding' ? 'Wersja wolnostojąca' : 'Montaż ścienny'}
                                    </span>
                                </div>
                                <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(dynamicBasePrice)}</span>
                            </div>
                        </div>

                        {/* Addons List */}
                        {(config.addons.length > 0 || (config.selectedAccessories && config.selectedAccessories.length > 0)) && (
                            <div className="space-y-3 pb-6 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dodatki</span>
                                <div className="space-y-2">
                                    {config.addons.map(a => (
                                        <div key={a.id} className="flex justify-between text-sm group">
                                            <span className="text-slate-600 group-hover:text-slate-900 transition-colors truncate max-w-[140px] xl:max-w-[160px]" title={a.name}>
                                                {(a.quantity ?? 1) > 1 ? `${a.quantity}x ` : ''}{a.name}
                                            </span>
                                            <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(a.price)}</span>
                                        </div>
                                    ))}
                                    {config.selectedAccessories?.map((a, i) => (
                                        <div key={i} className="flex justify-between text-sm group">
                                            <span className="text-slate-600 group-hover:text-slate-900 transition-colors truncate max-w-[140px] xl:max-w-[160px]" title={a.name}>
                                                {a.quantity}x {a.name}
                                            </span>
                                            <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(a.price * (a.quantity || 1))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Table Surcharges (Rules) */}
                        {surchargesBreakdown.length > 0 && (
                            <div className="space-y-3 pb-6 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reguły Cennika</span>
                                <div className="space-y-2">
                                    {surchargesBreakdown.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-slate-600 truncate" title={item.name}>
                                                {item.name === 'Freestanding Surcharge' ? 'Konstrukcja Wolnostojąca (Dopłata)' : item.name}
                                            </span>
                                            <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(item.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Installation & Services */}
                        {installationData && (installationData.dailyTotal > 0 || installationData.travelCost > 0) && (
                            <div className="space-y-3 pb-6 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montaż i Transport</span>
                                <div className="space-y-2">
                                    {installationData.dailyTotal > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Montaż ({installationData.days} dni)</span>
                                            <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(installationData.dailyTotal)}</span>
                                        </div>
                                    )}
                                    {installationData.travelCost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Transport / Dojazd ({installationData.distance} km)</span>
                                            <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(installationData.travelCost)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Additional Costs (Surcharges) */}
                        {additionalCosts.length > 0 && (
                            <div className="space-y-3 pb-6 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dopłaty Systemowe</span>
                                <div className="space-y-2">
                                    {additionalCosts.map(cost => {
                                        let costValue = 0;
                                        if (cost.cost_type === 'fixed') {
                                            costValue = Number(cost.value);
                                        } else {
                                            const base = dynamicBasePrice > 0 ? dynamicBasePrice : basePrice;
                                            costValue = base * (Number(cost.value) / 100);
                                        }
                                        return (
                                            <div key={cost.id} className="flex justify-between text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-600 transition-colors" title={cost.name}>
                                                        {cost.name}
                                                    </span>
                                                    {Object.keys(cost.attributes || {}).length > 0 && (
                                                        <span className="text-[10px] text-slate-400">
                                                            (Wymagane przez: {Object.values(cost.attributes || {}).join(', ')})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(costValue)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Discount Section */}
                        <div className="space-y-3 pb-6 border-b border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rabat</span>
                                <div className="flex bg-slate-100 rounded p-0.5">
                                    <button
                                        onClick={() => handleBasicConfigChange('discountMode', 'percentage')}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${config.discountMode === 'percentage' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                    >%</button>
                                    <button
                                        onClick={() => handleBasicConfigChange('discountMode', 'fixed')}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${config.discountMode === 'fixed' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                    >EUR</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step={config.discountMode === 'percentage' ? "1" : "10"}
                                    value={config.discount || ''}
                                    onChange={(e) => handleBasicConfigChange('discount', parseFloat(e.target.value) || 0)}
                                    placeholder={config.discountMode === 'percentage' ? "np. 5%" : "np. 500 EUR"}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                                />
                                {config.discount && config.discount > 0 ? (
                                    <div className="text-right whitespace-nowrap">
                                        <span className="text-red-500 font-bold text-sm">
                                            -{formatCurrency(
                                                config.discountMode === 'percentage'
                                                    ? (totalPrice - ((installationData?.dailyTotal || 0) + (installationData?.travelCost || 0))) * (config.discount / (100 - config.discount))
                                                    : config.discount
                                            )}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Margin Display (Explicit) */}
                        {marginData && typeof marginData.value === 'number' && (
                            <div className="space-y-3 pb-6 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marża / Zysk</span>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">
                                        Zysk z oferty ({Math.round(marginData.percentage || 0)}%)
                                    </span>
                                    <span className="font-medium text-emerald-600 whitespace-nowrap">
                                        {formatCurrency(marginData.value)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Cost Breakdown (Reference for User) */}
                        <div className="space-y-3 pb-6 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analiza Kosztów (Netto)</span>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Materiały (Suma):</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(totalCost)}</span>
                                </div>
                                {installationData && (installationData.dailyTotal > 0 || installationData.travelCost > 0) && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Usługi / Transport:</span>
                                        <span className="font-medium text-slate-700">
                                            {formatCurrency((installationData.dailyTotal || 0) + (installationData.travelCost || 0))}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm pt-2 mt-1 border-t border-slate-100">
                                    <span className="font-bold text-slate-800">Całkowity Koszt Zakupu:</span>
                                    <span className="font-bold text-slate-900">
                                        {formatCurrency(totalCost + (installationData?.dailyTotal || 0) + (installationData?.travelCost || 0))}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400 text-right italic">
                                    (Podstawa do obliczenia marży)
                                </div>
                            </div>
                        </div>

                        {/* Total Price (Selling) */}
                        <div className="space-y-1 pt-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 text-sm">Cena Netto</span>
                                <span className="font-bold text-slate-700 text-lg flex items-center gap-2">
                                    {priceLoading && (
                                        <svg className="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {priceLoading ? 'Liczenie...' : formatCurrency(totalPrice)}
                                </span>
                            </div>
                        </div>
                        {variantNote && (
                            <div className="mt-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                                <span>ℹ️</span>
                                {variantNote}
                            </div>
                        )}

                        {/* Debug Info for User/Dev */}
                        <details className="mt-4 pt-4 border-t border-slate-200 text-[10px] text-slate-400">
                            <summary className="cursor-pointer hover:text-slate-600 font-mono select-none">DEBUG: Parametry Wyceny</summary>
                            <div className="mt-2 space-y-1 font-mono bg-slate-100 p-2 rounded overflow-x-auto">
                                <div>Model ID: <span className="text-slate-600">{config.modelId}</span></div>
                                <div>Wymiary: <span className="text-slate-600">{config.width} x {config.projection}</span></div>
                                <div>Strefa: <span className="text-slate-600">{config.snowZone}</span></div>
                                <div>Typ Dachu: <span className="text-slate-600">{config.roofType}</span></div>
                                <div>Subtyp: <span className="text-slate-600">{config.roofType === 'glass' ? config.glassType : config.polycarbonateType}</span></div>
                                <div>Montaż (App): <span className="text-slate-600">{config.installationType}</span></div>
                                <div>Montaż (DB): <span className="text-slate-600 font-bold">{config.installationType === 'wall-mounted' ? 'wall' : 'free'}</span></div>
                                <div>Cena Bazowa: <span className="text-slate-600">{dynamicBasePrice}</span></div>
                                <div>Dopasowano: <span className={matchedDimensions ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{matchedDimensions ? `${matchedDimensions.width}x${matchedDimensions.projection}` : 'BRAK DOPASOWANIA'}</span></div>
                                {priceError && <div className="text-red-500 font-bold">Błąd: {priceError}</div>}
                            </div>
                        </details>
                    </div>


                    <div className="p-6 bg-slate-50 border-t border-slate-200">
                        <button
                            onClick={() => onComplete(config)}
                            disabled={!config.modelId || invalidWidth || invalidDepth || !!priceError}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${!config.modelId || invalidWidth || invalidDepth || !!priceError
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-accent text-white hover:bg-accent/90 hover:scale-[1.02]'
                                }`}
                        >
                            <span>Generuj Ofertę</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                        {(invalidWidth || invalidDepth) && (
                            <div className="mt-3 text-xs text-red-500 text-center font-medium">
                                ⚠️ Wymiary poza zakresem dla wybranego modelu!
                            </div>
                        )}
                        {priceError && (
                            <div className="mt-3 text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded">
                                ⚠️ {priceError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE BOTTOM BAR */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50">
                <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500">Cena Netto</span>
                        <span className="text-xl font-bold text-slate-800">{formatCurrency(totalPrice)}</span>
                    </div>
                    <button
                        onClick={() => onComplete(config)}
                        disabled={!config.modelId || invalidWidth || invalidDepth}
                        className={`flex-1 max-w-[200px] py-3 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${!config.modelId || invalidWidth || invalidDepth
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-accent text-white hover:bg-accent/90'
                            }`}
                    >
                        <span>Generuj</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
                {(invalidWidth || invalidDepth) && (
                    <div className="mt-2 text-xs text-red-500 text-center font-medium">
                        ⚠️ Wymiary poza zakresem!
                    </div>
                )}
            </div>
        </div >
    );
};
