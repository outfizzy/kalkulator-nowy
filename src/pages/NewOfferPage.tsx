import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { calculateCommission } from '../utils/commission';
import { DatabaseService } from '../services/database';
import { PricingService } from '../services/pricing.service';
import { CustomerForm } from '../components/CustomerForm';
import { ProductConfigurator } from '../components/ProductConfigurator';
import { ManualOfferConfigurator } from '../components/ManualOfferConfigurator';
import { MarginControl } from '../components/MarginControl';
import { OfferSummary } from '../components/OfferSummary';
import { ConfiguratorService, type LeadConfiguration } from '../services/database/configurator.service';
import type { Customer, SnowZoneInfo, ProductConfig, Offer } from '../types';

type Step = 'customer' | 'product' | 'summary';

interface NewOfferPageProps {
    mode?: 'standard' | 'partner';
}

export function NewOfferPage({ mode = 'standard' }: NewOfferPageProps) {
    const { currentUser } = useAuth();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const initialPhone = searchParams.get('phone');

    // Handle both direct customer object (legacy) and wrapped object with leadId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = location.state as any;
    const leadData = (state?.customer || state) as Partial<Customer> | undefined;
    const leadId = state?.leadId as string | undefined;
    const leadNotes = state?.leadNotes as string | undefined;
    const leadCustomerData = state?.leadCustomerData as any;

    const [step, setStep] = useState<Step>('customer');
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [snowZone, setSnowZone] = useState<SnowZoneInfo | null>(null);
    const [product, setProduct] = useState<ProductConfig | null>(null);
    const [offer, setOffer] = useState<Offer | null>(null);
    const [isManualMode, setIsManualMode] = useState(false);
    const [leadConfig, setLeadConfig] = useState<LeadConfiguration | null>(null);
    const [contextOpen, setContextOpen] = useState(true);

    // Initialize margin based on mode and user
    const [margin, setMargin] = useState<number>(() => {
        if (mode === 'partner') {
            return 0.25;
        }
        return 0.40;
    });

    // Scroll to top when step changes
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    // Load configurator form data for the lead (if exists)
    useEffect(() => {
        if (leadId) {
            ConfiguratorService.getByLeadId(leadId).then(configs => {
                const completed = configs.find(c => c.status === 'completed') || configs[0];
                if (completed) setLeadConfig(completed);
            }).catch(console.error);
        }
    }, [leadId]);

    const handleCustomerComplete = (data: Customer, zone: SnowZoneInfo) => {
        setCustomer(data);
        setSnowZone(zone);
        setStep('product');
    };

    const handleProductComplete = async (config: ProductConfig) => {
        // Fetch dynamic image
        try {
            const imageUrl = await PricingService.getProductImage(config.modelId, {
                roofType: config.roofType,
                snowZone: snowZone?.id || '1'
            });
            if (imageUrl) {
                config.imageUrl = imageUrl;
            }
        } catch (e) {
            console.error('Failed to fetch product image', e);
        }

        setProduct(config);

        if (customer && snowZone && currentUser) {
            try {
                // const pricing = calculatePrice(config, margin, snowZone, customer.postalCode, transportSettings);
                const pricing = await PricingService.calculateOfferPrice(config, margin, snowZone, customer.postalCode);
                // Inject transport settings if returned or used (PricingService might not return it exactly same way or needs it passed differently if it uses distanceCalculator internally)
                // PricingService.calculateOfferPrice uses calculateInstallationCosts internally which uses distanceCalculator.
                // It returns transportConfig in the result.

                // Note: PricingService.calculateOfferPrice signature: (product, margin, snowZone, postalCode)
                // It fetches transport settings internally or we might need to verify that.
                // Looking at PricingService previously:
                /*
                   async calculateOfferPrice(
                       product: ProductConfig,
                       marginPercentage: number,
                       snowZone?: SnowZoneInfo,
                       postalCode?: string
                   ): Promise<PricingResult> { ... }
                */

                // Partners might not have soldOffersCount logic or it might be different
                const soldOffersCount = mode === 'partner' ? 0 : await DatabaseService.getSoldOffersCount(currentUser.id);

                // Commission: Use user's individual rate or default 5%
                const userCommissionRate = currentUser.commissionRate ?? 0.05;
                const userCommissionConfig = currentUser.commissionConfig ?? { enableMarginBonus: false, enableVolumeBonus: false };
                const commission = calculateCommission(pricing.sellingPriceNet, pricing.marginPercentage, soldOffersCount, userCommissionRate, userCommissionConfig);

                const newOffer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
                    offerNumber: `OFF/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`, // Temp number generation
                    status: 'draft',
                    customer,
                    snowZone,
                    product: config,
                    pricing,
                    commission,
                    leadId, // Pass lead ID if available
                };

                const savedOffer = await DatabaseService.createOffer(newOffer);
                toast.success('Oferta utworzona pomyślnie!');
                setOffer(savedOffer);
                setStep('summary');
            } catch (error) {
                console.error('Error creating offer:', error);
                toast.error('Błąd podczas tworzenia oferty');
            }
        }
    };

    const handleMarginChange = async (newMargin: number) => {
        setMargin(newMargin);
        if (offer && currentUser) {
            try {
                // const newPricing = calculatePrice(offer.product, newMargin, offer.snowZone, offer.customer.postalCode, transportSettings);
                const newPricing = await PricingService.calculateOfferPrice(offer.product, newMargin, offer.snowZone, offer.customer.postalCode);

                const soldOffersCount = mode === 'partner' ? 0 : await DatabaseService.getSoldOffersCount(currentUser.id);
                const userCommissionRate = currentUser.commissionRate ?? 0.05;
                const userCommissionConfig = currentUser.commissionConfig ?? { enableMarginBonus: false, enableVolumeBonus: false };
                const newCommission = calculateCommission(newPricing.sellingPriceNet, newPricing.marginPercentage, soldOffersCount, userCommissionRate, userCommissionConfig);

                const updatedOffer = {
                    ...offer,
                    pricing: newPricing,
                    commission: newCommission,
                    updatedAt: new Date(),
                };

                await DatabaseService.updateOffer(offer.id, {
                    pricing: newPricing,
                    commission: newCommission
                });
                setOffer(updatedOffer);
            } catch (error) {
                console.error('Error updating offer:', error);
                toast.error('Błąd aktualizacji oferty');
            }
        }
    };

    const handleReset = () => {
        setStep('customer');
        setCustomer(null);
        setSnowZone(null);
        setProduct(null);
        setOffer(null);
        setMargin(mode === 'partner' ? (currentUser?.partnerMargin ?? 0.25) : 0.40);
        setIsManualMode(false);
    };

    const handleManualProductComplete = async (config: ProductConfig) => {
        // Handle visualization image fetch (same as standard)
        try {
            const imageUrl = await PricingService.getProductImage(config.modelId, {
                roofType: config.roofType,
                snowZone: snowZone?.id || '1'
            });
            if (imageUrl) {
                config.imageUrl = imageUrl;
            }
        } catch (e) {
            console.error('Failed to fetch product image', e);
        }

        setProduct(config);

        if (customer && snowZone && currentUser) {
            try {
                // Manual Pricing Logic
                const sellingPriceNet = config.manualPrice || 0;
                const sellingPriceGross = sellingPriceNet * 1.19; // VAT estimation or exact? German VAT is 19%
                // For manual offers, we assume purchase price is 0 or user doesn't care about margin calculation for now
                // Or we could ask for Purchase Price too? Plan said "Price: Netto input" which usually implies selling price
                // Let's assume margin is 0 or strictly unknown for now.

                const pricing = {
                    basePrice: sellingPriceNet,
                    addonsPrice: 0,
                    totalCost: 0, // Unknown in manual mode
                    marginPercentage: 0,
                    marginValue: 0,
                    sellingPriceNet,
                    sellingPriceGross,
                    installationCosts: undefined,
                    paymentMethod: 'transfer' as const, // fixed literal type
                };

                const newOffer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
                    offerNumber: `OFF/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`,
                    status: 'draft',
                    customer,
                    snowZone,
                    product: config,
                    pricing: pricing as any, // Cast because we might miss some calculated fields
                    commission: 0, // No auto-commission for manual? or calculate based on price?
                    leadId,
                };

                const savedOffer = await DatabaseService.createOffer(newOffer);
                toast.success('Oferta ręczna utworzona!');
                setOffer(savedOffer);
                setStep('summary');

            } catch (error) {
                console.error('Error creating manual offer:', error);
                toast.error('Błąd podczas tworzenia oferty ręcznej');
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Nowa Oferta</h1>
                    <p className="text-slate-500 mt-1">Kreator oferty krok po kroku</p>
                </div>
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />

                    <div className={`flex flex-col items-center gap-2 bg-background px-2 ${step === 'customer' || step === 'product' || step === 'summary' ? 'text-accent' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step === 'customer' ? 'bg-accent text-white' : (step === 'product' || step === 'summary' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500')}`}>
                            1
                        </div>
                        <span className="text-xs font-medium">Klient</span>
                    </div>

                    <div className={`flex flex-col items-center gap-2 bg-background px-2 ${step === 'product' || step === 'summary' ? 'text-accent' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step === 'product' ? 'bg-accent text-white' : (step === 'summary' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500')}`}>
                            2
                        </div>
                        <span className="text-xs font-medium">Konfiguracja</span>
                    </div>

                    <div className={`flex flex-col items-center gap-2 bg-background px-2 ${step === 'summary' ? 'text-accent' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step === 'summary' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500'}`}>
                            3
                        </div>
                        <span className="text-xs font-medium">Podsumowanie</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="transition-all duration-300 ease-in-out">
                {step === 'customer' && (
                    <CustomerForm
                        onComplete={handleCustomerComplete}
                        initialData={leadData ? (leadData as Customer) : (initialPhone ? { phone: initialPhone } as Customer : customer || undefined)}
                    />
                )}

                {step === 'product' && (
                    <div className="space-y-6">
                        {/* Lead Context Panel — only visible when creating from a lead */}
                        {leadId && (leadConfig || leadNotes || leadCustomerData?.configuredModel) && (
                            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
                                <button
                                    onClick={() => setContextOpen(!contextOpen)}
                                    className="w-full flex items-center justify-between px-5 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                >
                                    <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                        📋 Ściąga z leada
                                        {leadConfig?.status === 'completed' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Formularz ✅</span>}
                                    </span>
                                    <svg className={`w-4 h-4 text-indigo-500 transition-transform ${contextOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {contextOpen && (
                                    <div className="px-5 py-4 space-y-4 text-sm">
                                        {/* Configuration from form */}
                                        {(leadConfig || leadCustomerData?.configuredModel) && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1">⚙️ Konfiguracja klienta</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {(leadConfig?.modelDisplayName || leadCustomerData?.configuredModel) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Model</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.modelDisplayName || leadCustomerData?.configuredModel}</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.width || leadCustomerData?.configuredWidth) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Szerokość</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.width || leadCustomerData?.configuredWidth} mm</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.projection || leadCustomerData?.configuredProjection) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Wysięg</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.projection || leadCustomerData?.configuredProjection} mm</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.mountingType || leadCustomerData?.configuredMounting) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Montaż</div>
                                                            <div className="font-bold text-slate-800 capitalize">{leadConfig?.mountingType || leadCustomerData?.configuredMounting}</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.color || leadCustomerData?.configuredColor) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Kolor</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.color || leadCustomerData?.configuredColor}</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.roofCovering || leadCustomerData?.configuredRoofCovering) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Pokrycie</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.roofCovering || leadCustomerData?.configuredRoofCovering}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Extras */}
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(leadConfig?.heater || leadCustomerData?.configuredHeater) && (
                                                        <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">🔥 Grzejnik</span>
                                                    )}
                                                    {(leadConfig?.led || leadCustomerData?.configuredLed) && (
                                                        <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200">💡 LED</span>
                                                    )}
                                                    {leadConfig?.glazingSides && Object.entries(leadConfig.glazingSides).filter(([, v]) => v).map(([side, type]) => (
                                                        <span key={side} className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-[10px] font-bold border border-sky-200">🪟 {side}: {type}</span>
                                                    ))}
                                                    {leadConfig?.zipScreen?.enabled && (
                                                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">🔲 ZipScreen</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes from form */}
                                        {(leadConfig?.notes || leadCustomerData?.configuredNotes) && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1">💬 Uwagi klienta (z formularza)</h4>
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-slate-700 text-sm whitespace-pre-wrap">
                                                    {leadConfig?.notes || leadCustomerData?.configuredNotes}
                                                </div>
                                            </div>
                                        )}

                                        {/* Lead Notizen */}
                                        {leadNotes && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1">📝 Notizen</h4>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-slate-700 text-sm whitespace-pre-wrap">
                                                    {leadNotes}
                                                </div>
                                            </div>
                                        )}

                                        {/* Photos from form */}
                                        {leadConfig?.photos && leadConfig.photos.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1">📸 Zdjęcia klienta</h4>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {leadConfig.photos.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                            <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:ring-2 ring-indigo-400 transition-all" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mode Toggle */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shadow-inner">
                                <button
                                    onClick={() => setIsManualMode(false)}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isManualMode
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    ⚡️ Konfigurator (Standard)
                                </button>
                                <button
                                    onClick={() => setIsManualMode(true)}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isManualMode
                                        ? 'bg-accent text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    ✍️ Tryb Ręczny
                                </button>
                            </div>
                        </div>

                        {isManualMode ? (
                            <ManualOfferConfigurator onComplete={handleManualProductComplete} initialData={product || undefined} />
                        ) : (
                            <ProductConfigurator onComplete={handleProductComplete} initialData={product || undefined} />
                        )}
                    </div>
                )}

                {step === 'summary' && offer && (
                    <div className="space-y-6">
                        <div className="print:hidden">
                            {mode === 'partner' ? (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800">Marża partnera B2B</h3>
                                    <p className="mt-2 text-2xl font-bold text-accent">
                                        {Math.round(margin * 100)}%
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Marża ustalona przez administratora. Ceny w konfiguratorze uwzględniają tę marżę.
                                    </p>
                                </div>
                            ) : (
                                <MarginControl
                                    value={margin}
                                    onChange={handleMarginChange}
                                    purchasePrice={offer.pricing.totalCost}
                                    sellingPrice={offer.pricing.sellingPriceNet}
                                />
                            )}
                        </div>

                        <OfferSummary offer={offer} onReset={handleReset} onOfferUpdate={setOffer} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default NewOfferPage;
