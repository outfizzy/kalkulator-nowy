import React, { useEffect, useMemo, useState } from 'react';
import type { ProductConfig, SelectedAddon } from '../types';
import { orangestyleAccessories } from '../data/orangestyle_accessories';
import { trendstyleAccessories } from '../data/trendstyle_accessories';
import { LightingSelector } from './configurator/LightingSelector';
import { KeilfensterSelector } from './configurator/KeilfensterSelector';
import { PanoramaWallSelector } from './configurator/PanoramaWallSelector';
import { AwningSelector } from './configurator/AwningSelector';
import trendstyleData from '../data/trendstyle_full.json';
import orangelineData from '../data/orangeline_full.json';
import topstyleData from '../data/topstyle_full.json';
import topstyleXlData from '../data/topstyle_xl_full.json';
import skystyleData from '../data/skystyle_full.json';
import { formatCurrency } from '../utils/translations';

interface ProductConfiguratorProps {
    onComplete: (config: ProductConfig) => void;
    initialData?: ProductConfig;
}

const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
    </div>
);

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({ onComplete, initialData }) => {
    const [config, setConfig] = useState<ProductConfig>(initialData || {
        modelId: '',
        width: 3000,
        projection: 2500,
        postsHeight: 2500,
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

    const [activeWallTab, setActiveWallTab] = useState<'sliding' | 'panorama' | 'walls' | 'keil' | 'awning' | 'lighting' | 'accessories'>('sliding');

    const totalPrice = useMemo(() => {
        const addonsTotal = config.addons.reduce((sum, a) => sum + a.price, 0);
        const accessoriesTotal = config.selectedAccessories?.reduce((sum, a) => sum + a.price * (a.quantity || 1), 0) || 0;
        return addonsTotal + accessoriesTotal;
    }, [config.addons, config.selectedAccessories]);

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

        return defaultLimits;
    }, [config.modelId, config.installationType]);

    const accessoryPool = useMemo(() => {
        if (config.modelId === 'trendstyle' || config.modelId === 'trendstyle_plus') {
            return trendstyleAccessories;
        }
        return orangestyleAccessories;
    }, [config.modelId]);

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
            newAccessories.push({ name: acc.description, price: acc.price_net, quantity: 1 });
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'orangestyle', name: 'Orangestyle', desc: 'Klasyczny design, do 1.5 kN/m²', features: ['Softline Design', 'Rynna zintegrowana'] },
                                    { id: 'trendstyle', name: 'Trendstyle', desc: 'Nowoczesny, do 2.0 kN/m²', features: ['Płaskie profile', 'Wzmocniona konstrukcja'] },
                                    { id: 'trendstyle_plus', name: 'Trendstyle+', desc: 'Premium, do 2.5 kN/m²', features: ['Extra wzmocnienia', 'Duże rozpiętości'] },
                                    { id: 'topstyle', name: 'Topstyle', desc: 'Premium, do 2.5 kN/m²', features: ['Ukryty odpływ', 'Nowoczesny design'] },
                                    { id: 'topstyle_xl', name: 'Topstyle XL', desc: 'Premium XL, szerokości 6-7m', features: ['Większe rozpiętości', 'Ukryty odpływ'] },
                                    { id: 'skystyle', name: 'Skystyle', desc: 'Tylko szkło VSG, 4-7m szerokości', features: ['Tylko szkło VSG', 'Przyścienny / wolnostojący'] }
                                ].map(model => (
                                    <div
                                        key={model.id}
                                        onClick={() => {
                                            handleBasicConfigChange('modelId', model.id);
                                            if (model.id === 'skystyle') {
                                                // Skystyle: tylko szkło VSG
                                                handleBasicConfigChange('roofType', 'glass');
                                                handleBasicConfigChange('glassType', 'standard');
                                            }
                                        }}
                                        className={`cursor-pointer border-2 rounded-xl p-6 transition-all ${config.modelId === model.id ? 'border-accent bg-accent/5 shadow-md' : 'border-slate-100 hover:border-accent/30'}`}
                                    >
                                        <h3 className="text-xl font-bold mb-2 text-slate-900">{model.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{model.desc}</p>
                                        <ul className="text-xs text-slate-600 space-y-1">
                                            {model.features.map((f, i) => <li key={i}>• {f}</li>)}
                                        </ul>
                                    </div>
                                ))}
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
                                    { id: 'extras', label: 'Pozostałe Dodatki', icon: '✨' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveWallTab(tab.id === 'enclosure' ? 'sliding' : tab.id === 'comfort' ? 'awning' : 'accessories')}
                                        className={`flex-1 px-4 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${(tab.id === 'enclosure' && ['sliding', 'panorama', 'walls', 'keil'].includes(activeWallTab)) ||
                                            (tab.id === 'comfort' && ['awning', 'lighting'].includes(activeWallTab)) ||
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
                                                <div>Sliding Doors Temporarily Disabled</div>
                                                /*<SlidingDoorSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    maxRoofWidth={config.width}
                                                />*/
                                            )}
                                            {activeWallTab === 'panorama' && (
                                                <PanoramaWallSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                />
                                            )}
                                            {activeWallTab === 'walls' && (
                                                <div>Aluminum Walls Temporarily Disabled</div>
                                                /*<AluminumWallSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    maxRoofWidth={config.width}
                                                    maxRoofDepth={config.projection}
                                                />*/
                                            )}
                                            {activeWallTab === 'keil' && (
                                                <KeilfensterSelector
                                                    currentAddons={config.addons}
                                                    onAdd={handleAddonAdd}
                                                    onRemove={handleAddonRemove}
                                                    maxRoofDepth={config.projection}
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
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* EXTRAS CONTENT (Dodatki) */}
                                {activeWallTab === 'accessories' && (
                                    <div>
                                        <div className="mb-6">
                                            <h4 className="text-lg font-bold text-slate-800 mb-2">Pozostałe akcesoria</h4>
                                            <p className="text-slate-500 text-sm">Dodatkowe elementy wyposażenia i montażu.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {accessoryPool.map((acc, idx) => {
                                                const selected = config.selectedAccessories?.find(a => a.name === acc.description);
                                                const qty = selected?.quantity || 0;
                                                return (
                                                    <div key={idx} className={`border rounded-xl p-4 transition-all ${qty > 0 ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-medium text-slate-900 text-sm line-clamp-2 h-10 pr-2" title={acc.description}>{acc.description}</div>
                                                            <div className="font-bold text-accent text-sm whitespace-nowrap">{acc.price_net} €</div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 bg-white rounded-lg border border-slate-200 p-1">
                                                            <button
                                                                onClick={() => toggleAccessory(acc, false)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                                                            >-</button>
                                                            <span className="font-bold text-sm text-slate-900 w-8 text-center">{qty}</span>
                                                            <button
                                                                onClick={() => toggleAccessory(acc, true)}
                                                                className="w-8 h-8 flex items-center justify-center text-white bg-accent rounded hover:bg-accent/90"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

                        {/* Total Price */}
                        <div className="space-y-1 pt-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 text-sm">Cena Netto</span>
                                <span className="font-bold text-slate-700 text-lg">
                                    {formatCurrency(totalPrice)}
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
