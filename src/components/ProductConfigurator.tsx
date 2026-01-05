import React, { useEffect, useMemo, useState } from 'react';
import type { ProductConfig, SelectedAddon } from '../types';

import { LightingSelector } from './configurator/LightingSelector';
import { KeilfensterSelector } from './configurator/KeilfensterSelector';
import { PanoramaWallSelector } from './configurator/PanoramaWallSelector';
import { SlidingDoorSelector } from './configurator/SlidingDoorSelector';
import { AluminumWallSelector } from './configurator/AluminumWallSelector';
import { AwningSelector } from './configurator/AwningSelector';
import { WPCFlooringSelector } from './configurator/WPCFlooringSelector';
import trendstyleData from '../data/trendstyle_full.json';
import orangelineData from '../data/orangeline_full.json';
import topstyleData from '../data/topstyle_full.json';
import topstyleXlData from '../data/topstyle_xl_full.json';
import skystyleData from '../data/skystyle_full.json';
import ultrastyleData from '../data/ultrastyle_full.json';
import carportData from '../data/carport_full.json';
import { formatCurrency } from '../utils/translations';
import { toast } from 'react-hot-toast';
import { PricingService, type AdditionalCost } from '../services/pricing.service';

// === OFFER BASKET TYPES ===
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
        selectedAccessories: []
    });

    // Dynamic Pricing state
    const [dynamicBasePrice, setDynamicBasePrice] = useState<number>(0);
    const [priceLoading, setPriceLoading] = useState(false);
    const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
    const [surchargesBreakdown, setSurchargesBreakdown] = useState<{ name: string, price: number }[]>([]);

    // Component Lists (Imported Components)
    const [componentLists, setComponentLists] = useState<{ table: any, entries: any[] }[]>([]);
    const [matrixTables, setMatrixTables] = useState<{ table: any, entries: any[] }[]>([]);
    const [loadingComponents, setLoadingComponents] = useState(false);

    // Fetch Price when attributes change
    useEffect(() => {
        const calculatePrice = async () => {
            if (!config.modelId) return;
            setPriceLoading(true);

            try {
                // 1. Prepare Attributes Context
                const attributes: Record<string, string> = {
                    snow_zone: config.snowZone ? String(config.snowZone) : '1',
                    roof_type: config.roofType, // 'polycarbonate', 'glass', or 'tin'
                    mounting: config.installationType === 'wall-mounted' ? 'wall' : 'freestanding',
                    subtype: (config.roofType === 'glass' ? config.glassType : config.polycarbonateType) || 'standard',
                    // Add other attributes if needed (e.g. post height range)
                };

                // 2. Get Matrix Price
                const matrix = await PricingService.getPriceMatrix(config.modelId, attributes);
                let price = 0;

                if (matrix.length > 0) {
                    price = PricingService.calculateMatrixPrice(matrix, config.width, config.projection);
                }

                // 2.5 Apply Table Configuration Surcharges (e.g. Free Standing, Glass, Color)
                const { config: tableConfig, attributes: tableAttributes } = await PricingService.getTableConfig(config.modelId, attributes);

                const surchargeResult = PricingService.calculateSurcharges(
                    price,
                    config.width,
                    config.projection,
                    tableConfig,
                    {
                        mountingType: config.installationType === 'wall-mounted' ? 'wall' : 'free_standing',
                        roofType: config.roofType
                    }
                );

                if (surchargeResult.total > 0) {
                    price += surchargeResult.total;
                    console.log('[Pricing] Surcharges applied:', surchargeResult.items);
                }
                setSurchargesBreakdown(surchargeResult.items);

                // NEW: Apply Table Discount (Cascaded)
                // If the selected table has a discount (e.g. "10+5"), apply it to the calculated price (matrix + surcharges)
                if (tableAttributes?.discount) {
                    const originalPrice = price;
                    price = PricingService.calculateDiscountedPrice(price, tableAttributes.discount);
                    if (price !== originalPrice) {
                        console.log(`[Pricing] Applied Discount '${tableAttributes.discount}': ${originalPrice} -> ${price}`);
                    }
                }

                if (price > 0) {
                    setDynamicBasePrice(price);
                } else {
                    // Keep old logic if 0 (backward compatibility)
                }

                // 3. Get Additional Costs (Surcharges for this specific variant)
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
    }, [config.modelId, config.width, config.projection, config.snowZone, config.roofType, config.installationType]);

    // Fetch Component Lists
    useEffect(() => {
        const fetchComponents = async () => {
            if (!config.modelId) return;
            setLoadingComponents(true);
            try {
                // Determine context attributes if needed
                const attributes: Record<string, string> = {
                    provider: 'Aluxe' // Or detect based on model
                };
                // Fetch all component lists that are active
                // For now we fetch ALL and maybe filter by provider later? 
                // Or simply show all available lists regardless of model?
                // Ideally we should filter by provider or model family if tagged.
                // But the requirement implies "Imported Component Lists" are generic or manually selected.

                const lists = await PricingService.getComponentLists(attributes);
                setComponentLists(lists);

                const matrices = await PricingService.getMatrixTables();
                setMatrixTables(matrices);
            } catch (error) {
                console.error("Error fetching component lists:", error);
            } finally {
                setLoadingComponents(false);
            }
        };

        fetchComponents();
    }, [config.modelId]);

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
        // If we have a dynamic price from the Matrix Service, use it!
        if (dynamicBasePrice > 0) return dynamicBasePrice;

        if (!config.modelId) return 0;

        let data: any = null;
        switch (config.modelId) {
            case 'trendstyle': data = trendstyleData; break;
            case 'orangeline': data = orangelineData; break;
            case 'topstyle': data = topstyleData; break;
            case 'topstyle_xl': data = topstyleXlData; break;
            case 'skystyle': data = skystyleData; break;
            case 'ultrastyle': data = ultrastyleData; break;
            case 'carport': data = carportData; break;
            default: return 0;
        }

        if (!data) return 0;

        // Find matching product
        // Find matching product (Smart Lookup: Next Size Up)
        const candidates = data.products.filter((p: any) => {
            // For Skystyle check mounting type
            if (config.modelId === 'skystyle') {
                const mountingType = config.installationType === 'wall-mounted' ? 'wall' : 'freestanding';
                if (p.mounting_type !== mountingType) return false;
            }
            // Check if product dimensions fit the requested ones
            return p.width_mm >= config.width && p.depth_mm >= config.projection;
        });

        // Sort candidates by size (area) to find the "Next Size Up" (smallest sufficient)
        candidates.sort((a: any, b: any) => (a.width_mm * a.depth_mm) - (b.width_mm * b.depth_mm));

        const product = candidates[0];

        return product ? product.price_eur : 0;
    }, [config.modelId, config.width, config.projection, config.installationType, dynamicBasePrice]);

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

    const totalPrice = useMemo(() => {
        const addonsTotal = config.addons.reduce((sum, a) => sum + a.price, 0);
        const accessoriesTotal = (config.selectedAccessories || []).reduce((sum, a) => sum + (a.price * a.quantity), 0);
        // External Items Total
        const extTotal = externalItems.reduce((sum, item) => sum + item.sellingPrice, 0);

        return basePrice + addonsTotal + accessoriesTotal + extTotal + additionalCostsTotal;
    }, [basePrice, config.addons, config.selectedAccessories, externalItems, additionalCostsTotal]);

    // --- Logic & Calculations ---

    const limits = useMemo(() => {
        const defaultLimits = { minWidth: 2000, maxWidth: 10000, minDepth: 2000, maxDepth: 5000 };
        if (!config.modelId) return defaultLimits;

        if (config.modelId === 'trendstyle' || config.modelId === 'trendstyle_plus') {
            const modelKey = config.modelId === 'trendstyle_plus' ? 'Trendstyle+' : 'Trendstyle';
            const entries = (trendstyleData as any).products.filter((p: any) => p.model === modelKey);
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        if (config.modelId === 'orangestyle') {
            const entries = (orangelineData as any).products.filter((p: any) => p.model === 'Orangeline');
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        if (config.modelId === 'topstyle') {
            const entries = (topstyleData as any).products.filter((p: any) => p.model === 'Topstyle');
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        if (config.modelId === 'topstyle_xl') {
            const entries = (topstyleXlData as any).products.filter((p: any) => p.model === 'Topstyle XL');
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        if (config.modelId === 'skystyle') {
            const mountingType = config.installationType === 'wall-mounted' ? 'wall' : 'freestanding';
            const entries = (skystyleData as any).products.filter((p: any) =>
                p.model === 'Skystyle' && p.mounting_type === mountingType
            );
            if (!entries.length) {
                // Brak danych dla danego typu montażu – wracamy do domyślnego zakresu,
                // zamiast psuć slider nieskończonymi wartościami
                return defaultLimits;
            }
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        if (config.modelId === 'ultrastyle') {
            const entries = (ultrastyleData as any).products.filter((p: any) => p.model === 'Ultrastyle');
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        if (config.modelId === 'carport') {
            const entries = (carportData as any).products.filter((p: any) => p.model === 'Carport');
            const widths = entries.map((p: any) => p.width_mm);
            const depths = entries.map((p: any) => p.depth_mm);
            return {
                minWidth: Math.min(...widths),
                maxWidth: Math.max(...widths),
                minDepth: Math.min(...depths),
                maxDepth: Math.max(...depths)
            };
        }

        return defaultLimits;
    }, [config.modelId, config.installationType]);





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

    const toggleAccessory = (acc: any, increment: boolean) => {
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
        } else if (increment) {
            newAccessories.push({
                name: acc.description,
                price: acc.price_net,
                quantity: 1,
                attributes: acc.properties || acc.attributes // Save multilingual props
            });
        }
        setConfig(prev => ({ ...prev, selectedAccessories: newAccessories }));
    };

    const invalidWidth = config.width > limits.maxWidth || config.width < limits.minWidth;
    const invalidDepth = config.projection > limits.maxDepth || config.projection < limits.minDepth;

    // Skystyle: automatycznie koryguj wymiary do dopuszczalnego zakresu,
    // żeby nie blokować konfiguracji błędem po zmianie modelu
    useEffect(() => {
        if (config.modelId !== 'skystyle') return;

        let nextWidth = config.width;
        let nextDepth = config.projection;

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
                                    {[
                                        { id: 'orangestyle', name: 'Orangestyle', desc: 'Klasyczny design, do 1.5 kN/m²', features: ['Softline Design', 'Rynna zintegrowana'] },
                                        { id: 'trendstyle', name: 'Trendstyle', desc: 'Nowoczesny, do 2.0 kN/m²', features: ['Płaskie profile', 'Wzmocniona konstrukcja'] },
                                        { id: 'trendstyle_plus', name: 'Trendstyle+', desc: 'Premium, do 2.5 kN/m²', features: ['Extra wzmocnienia', 'Duże rozpiętości'] },
                                        { id: 'topstyle', name: 'Topstyle', desc: 'Premium, do 2.5 kN/m²', features: ['Ukryty odpływ', 'Nowoczesny design'] },
                                        { id: 'topstyle_xl', name: 'Topstyle XL', desc: 'Premium XL, szerokości 6-7m', features: ['Większe rozpiętości', 'Ukryty odpływ'] },
                                        { id: 'skystyle', name: 'Skystyle', desc: 'Tylko szkło VSG, 4-7m szerokości', features: ['Tylko szkło VSG', 'Przyścienny / wolnostojący'] },
                                        { id: 'ultrastyle', name: 'Ultrastyle', desc: 'Minimalistyczny design', features: ['Ultra cienkie profile', 'Modern look'] },
                                        { id: 'carport', name: 'Carport', desc: 'Zadaszenie samochodowe', features: ['Wiata garażowa', 'Do 2 samochodów'] }
                                    ].map(model => (
                                        <div
                                            key={model.id}
                                            onClick={() => {
                                                handleBasicConfigChange('modelId', model.id);
                                                if (model.id === 'skystyle') {
                                                    handleBasicConfigChange('roofType', 'glass');
                                                    handleBasicConfigChange('glassType', 'standard');
                                                }
                                            }}
                                            className={`cursor-pointer border-2 rounded-xl p-4 transition-all relative ${config.modelId === model.id
                                                ? 'border-accent bg-accent/5 shadow-md'
                                                : 'border-slate-100 hover:border-accent/30'
                                                }`}
                                        >
                                            <h3 className="text-lg font-bold mb-1 text-slate-900 flex justify-between items-center gap-2">
                                                <span>{model.name}</span>
                                                <span className="text-[10px] text-slate-400 font-normal bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono" title={`Kod systemowy: ${model.id}`}>
                                                    {model.id}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-500 mb-3">{model.desc}</p>
                                            <ul className="text-[10px] text-slate-600 space-y-0.5">
                                                {model.features.map((f, i) => <li key={i}>• {f}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Deponti - Zadaszenia Gotowe */}
                            <div className="border-t border-slate-200 pt-6">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                    Zadaszenia Gotowe (Deponti) — wkrótce cenniki
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {[
                                        { id: 'nebbiolo', name: 'Nebbiolo' },
                                        { id: 'bosco', name: 'Bosco' },
                                        { id: 'ribolla', name: 'Ribolla' },
                                        { id: 'pigato', name: 'Pigato' },
                                        { id: 'pigato_plus', name: 'Pigato Plus' },
                                        { id: 'giallo', name: 'Giallo' },
                                        { id: 'giallo_plus', name: 'Giallo Plus' },
                                        { id: 'trebbiano', name: 'Trebbiano' },
                                        { id: 'verdeca', name: 'Verdeca' },
                                        { id: 'pinela', name: 'Pinela' },
                                        { id: 'pinela_deluxe', name: 'Pinela Deluxe' },
                                        { id: 'pinela_glass', name: 'Pinela Glass' },
                                        { id: 'pinela_deluxe_plus', name: 'Pinela Deluxe+' }
                                    ].map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => {
                                                handleBasicConfigChange('modelId', product.id);
                                            }}
                                            className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${config.modelId === product.id
                                                ? 'border-purple-500 bg-purple-50 shadow-sm'
                                                : 'border-slate-100 hover:border-purple-300 bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-sm text-slate-800">{product.name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono scale-90 opacity-70">[{product.id}]</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-3 italic">
                                    💡 Wybierz produkt Deponti, a następnie przejdź dalej do konfiguracji wymiarów i dodatków.
                                </p>
                            </div>

                            {/* Selt / Aliplast - External Suppliers */}
                            <div className="border-t border-slate-200 pt-6 mt-6">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                    Zewnętrzni Dostawcy (Selt, Aliplast)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Selt */}
                                    <div className="border-2 border-slate-100 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-blue-100/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                                    S
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-slate-800">Selt</h5>
                                                    <p className="text-xs text-slate-500">Pergole i zadaszenia</p>
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href="https://www.sfrpolska.pl/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                                        >
                                            Otwórz Konfigurator Selt ↗
                                        </a>
                                        <button
                                            onClick={() => setShowExternalForm('selt')}
                                            className="block w-full text-center py-2 mt-2 border-2 border-blue-500 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors"
                                        >
                                            ➕ Dodaj produkt Selt
                                        </button>
                                    </div>

                                    {/* Aliplast */}
                                    <div className="border-2 border-slate-100 rounded-xl p-4 bg-gradient-to-br from-green-50 to-green-100/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                                    A
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-slate-800">Aliplast</h5>
                                                    <p className="text-xs text-slate-500">Systemy aluminiowe</p>
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href="https://aliplast.com.pl/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full text-center py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                                        >
                                            Otwórz Konfigurator Aliplast ↗
                                        </a>
                                        <button
                                            onClick={() => setShowExternalForm('aliplast')}
                                            className="block w-full text-center py-2 mt-2 border-2 border-green-500 text-green-600 rounded-lg font-bold text-sm hover:bg-green-50 transition-colors"
                                        >
                                            ➕ Dodaj produkt Aliplast
                                        </button>
                                    </div>
                                </div>

                                {/* External Product Form Modal */}
                                {showExternalForm && (
                                    <div className="mt-4 p-4 bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="font-bold text-lg flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${showExternalForm === 'selt' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                                Dodaj produkt {showExternalForm === 'selt' ? 'Selt' : 'Aliplast'}
                                            </h5>
                                            <button
                                                onClick={() => setShowExternalForm(null)}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa produktu *</label>
                                                <input
                                                    type="text"
                                                    value={externalForm.productName}
                                                    onChange={e => setExternalForm({ ...externalForm, productName: e.target.value })}
                                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                                    placeholder="np. Pergola SR3500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Opis / Specyfikacja</label>
                                                <textarea
                                                    value={externalForm.description}
                                                    onChange={e => setExternalForm({ ...externalForm, description: e.target.value })}
                                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                                    rows={2}
                                                    placeholder="np. 4000x3000mm, RAL 7016, LED..."
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddExternalItem}
                                                className={`w-full py-3 rounded-xl font-bold text-white ${showExternalForm === 'selt'
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                    }`}
                                            >
                                                ✓ Dodaj do oferty
                                            </button>
                                        </div>
                                    </div>
                                )}

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
                            </div>
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
                                        {config.modelId !== 'skystyle' && (
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
                                                {config.modelId === 'skystyle'
                                                    ? 'Jedyny wariant dachu dla Skystyle'
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

                                    {/* Sub-options */}
                                    {config.modelId !== 'skystyle' && config.roofType === 'polycarbonate' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={config.polycarbonateType === 'ir-gold'}
                                                    onChange={(e) => handleBasicConfigChange('polycarbonateType', e.target.checked ? 'ir-gold' : 'standard')}
                                                    className="w-5 h-5 text-accent rounded focus:ring-accent"
                                                />
                                                <div>
                                                    <div className="font-medium text-slate-900">IR Gold (Odbijający ciepło)</div>
                                                    <div className="text-xs text-slate-500">Redukuje nagrzewanie się tarasu</div>
                                                </div>
                                            </label>
                                        </div>
                                    )}

                                    {config.roofType === 'glass' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                            <div className="text-sm font-medium text-slate-700">Wariant szkła</div>
                                            <div className="space-y-2">
                                                {[
                                                    { id: 'standard', label: 'Klar (Przeźroczyste)', desc: 'Standard 44.2' },
                                                    { id: 'mat', label: 'Mat (Mleczne)', desc: 'Dopłata wg cennika' },
                                                    { id: 'sunscreen', label: 'Sunscreen (Przeciwsłoneczne)', desc: 'Dopłata wg cennika' }
                                                ].map(opt => (
                                                    <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                                                        <input
                                                            type="radio"
                                                            name="glassType"
                                                            checked={config.glassType === opt.id}
                                                            onChange={() => handleBasicConfigChange('glassType', opt.id)}
                                                            className="w-4 h-4 text-accent focus:ring-accent"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-slate-900">{opt.label}</div>
                                                            <div className="text-xs text-slate-500">{opt.desc}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Colors */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">Kolor konstrukcji</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { name: 'RAL 7016', label: 'Anthrazit', hex: '#383e42' },
                                            { name: 'RAL 9016', label: 'Weiß', hex: '#f1f0ea' },
                                            { name: 'RAL 9005', label: 'Schwarz', hex: '#0e0e10' },
                                            { name: 'RAL 9007', label: 'Graualuminium', hex: '#878581' }
                                        ].map(c => (
                                            <div
                                                key={c.name}
                                                onClick={() => handleBasicConfigChange('color', c.name)}
                                                className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${config.color === c.name
                                                    ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                                                    : 'border-slate-200 hover:border-accent/30'
                                                    }`}
                                            >
                                                <div className="w-8 h-8 rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: c.hex }} />
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">{c.name}</div>
                                                    <div className="text-xs text-slate-500">{c.label}</div>
                                                </div>
                                            </div>
                                        ))}
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
                                    { id: 'comfort', label: 'Komfort (Markizy, LED)', icon: '☀️' },
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
                                                    maxRoofWidth={config.width}
                                                    matrixEntries={matrixTables.find(t => t.table.attributes?.system === 'alu_schiebetuer_base')?.entries || []}
                                                />
                                            )}
                                            {activeWallTab === 'panorama' && (
                                                <PanoramaWallSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    al22List={componentLists.find(l => l.table.attributes?.system === 'AL22')?.entries || []}
                                                    al23List={componentLists.find(l => l.table.attributes?.system === 'AL23')?.entries || []}
                                                />
                                            )}
                                            {activeWallTab === 'walls' && (
                                                <AluminumWallSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    maxRoofWidth={config.width}
                                                    maxRoofDepth={config.projection}
                                                    availableItems={componentLists.find(l => l.table.attributes?.system === 'alu_walls')?.entries || []}
                                                    sideMatrix={matrixTables.find(t => t.table.attributes?.system === 'alu_seitenwand_base')?.entries || []}
                                                    frontMatrix={matrixTables.find(t => t.table.attributes?.system === 'alu_frontwand_base')?.entries || []}
                                                />
                                            )}
                                            {activeWallTab === 'keil' && (
                                                <KeilfensterSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    maxRoofDepth={config.projection}
                                                    availableItems={componentLists.find(l => l.table.attributes?.system === 'keilfenster')?.entries || []}
                                                    baseMatrix={matrixTables.find(t => t.table.attributes?.system === 'keilfenster_base')?.entries || []}
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
                                                { id: 'lighting', label: 'Oświetlenie LED' },
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
                                                    maxRoofWidth={config.width}
                                                    maxRoofDepth={config.projection}
                                                />
                                            )}
                                            {activeWallTab === 'lighting' && (
                                                <LightingSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    availableItems={componentLists.find(l => l.table.attributes?.system === 'lighting')?.entries || []}
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
                                        availableItems={componentLists.find(l => l.table.attributes?.system === 'wpc_floor')?.entries || []}
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
                                            componentLists.length > 0 && (
                                                <div className="mt-8 pt-8 border-t border-slate-100">
                                                    <h4 className="text-lg font-bold text-slate-800 mb-6">Dodatkowe Części / Elementy</h4>

                                                    {componentLists
                                                        .filter(list => {
                                                            const system = list.table.attributes?.system;
                                                            // Exclude special systems handled elsewhere
                                                            if (['lighting', 'wpc_floor', 'AL22', 'AL23', 'alu_walls', 'keilfenster'].includes(system)) return false;

                                                            // Compatibility Logic for Standard Accessories
                                                            const productCode = list.table.product?.code;
                                                            if (productCode === 'trendstyle') {
                                                                return (config.modelId || '').startsWith('trendstyle');
                                                            }
                                                            if (productCode === 'orangestyle') {
                                                                // Fallback for everything else
                                                                return !(config.modelId || '').startsWith('trendstyle');
                                                            }
                                                            // Default include others
                                                            return true;
                                                        })
                                                        .map((list, listIdx) => (
                                                            <div key={list.table.id || listIdx} className="mb-8">
                                                                <h5 className="font-semibold text-slate-700 mb-3 pl-1 border-l-4 border-accent">{list.table.name}</h5>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    {list.entries.map((entry: any, entryIdx: number) => {
                                                                        const itemName = entry.properties?.name || entry.properties?.description || `Element ${entryIdx + 1}`;
                                                                        const itemPrice = entry.structure_price || entry.price;
                                                                        // Unique key for accessories selection
                                                                        const uniqueName = `[${list.table.name}] ${itemName} ${entry.properties.width ? `(${entry.properties.width}mm)` : ''}`;

                                                                        const selected = config.selectedAccessories?.find(a => a.name === uniqueName);
                                                                        const qty = selected?.quantity || 0;

                                                                        return (
                                                                            <div key={entry.id || entryIdx} className={`border rounded-xl p-4 transition-all ${qty > 0 ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30'}`}>
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <div className="font-medium text-slate-900 text-sm line-clamp-2 h-10 pr-2" title={uniqueName}>
                                                                                        {itemName}
                                                                                        {entry.properties.width && <span className="block text-xs text-slate-500">{entry.properties.width} mm</span>}
                                                                                    </div>
                                                                                    <div className="font-bold text-accent text-sm whitespace-nowrap">{formatCurrency(itemPrice)}</div>
                                                                                </div>
                                                                                <div className="flex items-center justify-between mt-2 bg-white rounded-lg border border-slate-200 p-1">
                                                                                    <button
                                                                                        onClick={() => toggleAccessory({ description: uniqueName, price_net: itemPrice, properties: entry.properties }, false)}
                                                                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                                                                                    >-</button>
                                                                                    <span className="font-bold text-sm text-slate-900 w-8 text-center">{qty}</span>
                                                                                    <button
                                                                                        onClick={() => toggleAccessory({ description: uniqueName, price_net: itemPrice, properties: entry.properties }, true)}
                                                                                        className="w-8 h-8 flex items-center justify-center text-white bg-accent rounded hover:bg-accent/90"
                                                                                    >+</button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
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
                                <span className="font-medium text-slate-800">{config.width} x {config.projection} mm</span>
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
                                                {item.name}
                                            </span>
                                            <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrency(item.price)}</span>
                                        </div>
                                    ))}
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
                                                            (Wymagane przez: {Object.values(cost.attributes).join(', ')})
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

                        {/* Total Price */}
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
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200">
                        <button
                            onClick={() => onComplete(config)}
                            disabled={!config.modelId || invalidWidth || invalidDepth}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${!config.modelId || invalidWidth || invalidDepth
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
        </div>
    );
};
