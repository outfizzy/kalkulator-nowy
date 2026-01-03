import React, { useState } from 'react';
import { getStructureSpecs } from '../structureUtils';
import { VisualizerOfferModal } from './VisualizerOfferModal';
import type { ProductConfig } from '../../../types';
import { formatCurrency } from '../../../utils/translations';
import { PricingService } from '../../../services/pricing.service';

interface VisualizerSidebarProps {
    config: ProductConfig;
    onChange: (updates: Partial<ProductConfig>) => void;
    price: { net: number; gross: number };
    priceLoading: boolean;
    onUploadBackground?: (file: File) => void;
    onClearBackground?: () => void;
    sunPosition?: number;
    onSunChange?: (val: number) => void;
    onAnalyzeAI?: () => void;
    // Layout Control
    isCollapsed: boolean;
    onToggle: (collapsed: boolean) => void;
}

type Tab = 'structure' | 'finish' | 'equip' | 'env';

export const VisualizerSidebar: React.FC<VisualizerSidebarProps> = ({
    config, onChange, price, priceLoading, onUploadBackground, onClearBackground,
    sunPosition = 0.5, onSunChange, onAnalyzeAI,
    isCollapsed, onToggle
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('structure');
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [componentLists, setComponentLists] = useState<any[]>([]);

    React.useEffect(() => {
        const load = async () => {
            try {
                const lists = await PricingService.getComponentLists();
                setComponentLists(lists || []);
            } catch (e) {
                console.error('Failed to load components', e);
            }
        };
        load();
    }, []);

    // No internal isCollapsed state


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateConfig = (key: keyof ProductConfig, value: any) => {
        onChange({ [key]: value });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && onUploadBackground) {
            onUploadBackground(e.target.files[0]);
        }
    };

    const handleAddon = (type: string, price: number) => {
        let newAddons = [...config.addons];
        const existingIndex = newAddons.findIndex(a => a.type === type);

        if (existingIndex >= 0) {
            newAddons = newAddons.filter(a => a.type !== type);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newAddon: any = {
                id: `${type}-${Date.now()}`,
                type: type,
                name: type === 'heater' ? 'Promiennik Ciepła' : type === 'wpc-floor' ? 'Podłoga WPC' : type,
                price: price,
            };
            newAddons.push(newAddon);
        }
        onChange({ addons: newAddons });
    };

    const models = [
        { id: 'trendstyle', name: 'Trendstyle', icon: '🟥', desc: 'Nowoczesny, proste linie' },
        { id: 'trendstyle_plus', name: 'Trendstyle Plus', icon: '➕', desc: 'Wzmocniona konstrukcja (gł. > 3.5m)' },
        { id: 'orangestyle', name: 'Orangestyle', icon: '🟧', desc: 'Klasyczny, zaokrąglony', note: 'Wymaga strefy 1-2' },
        { id: 'topstyle', name: 'Topstyle', icon: '🟦', desc: 'Premium, ukryty odpływ' },
        { id: 'topstyle_xl', name: 'Topstyle XL', icon: '🟦', desc: 'Topstyle dla dużych rozpiętości' },
        { id: 'skystyle', name: 'Skystyle', icon: '🌤️', desc: 'Dach wolnowiszący / Specjalny' },
        { id: 'pergola_bio', name: 'Pergola Bioklimatyczna', icon: '☀️', desc: 'Ruchome lamele, nowoczesna' },
    ];

    const standardColors = [
        { name: 'Antracyt', ral: 'RAL 7016', hex: '#373F43' },
        { name: 'Srebrny', ral: 'RAL 9006', hex: '#A5A5A5' },
        { name: 'Biały', ral: 'RAL 9010', hex: '#FFFFFF' },
        { name: 'Szary', ral: 'RAL 9007', hex: '#8F8F8F' },
        { name: 'Sepia', ral: 'RAL 8014', hex: '#4E3B31' },
    ];

    return (
        <>
            <button
                onClick={() => onToggle(false)}
                className={`fixed left-4 top-4 z-40 p-3 bg-white shadow-lg rounded-xl transition-all duration-300 flex items-center gap-2 font-bold text-slate-700 ${isCollapsed ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}
            >
                ⚙️ Konfiguruj
            </button>

            <div className={`fixed lg:absolute left-0 transition-transform duration-300 z-50 flex flex-col bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl overflow-hidden
                bottom-0 w-full h-[50vh] rounded-t-3xl
                lg:top-4 lg:bottom-4 lg:left-4 lg:w-96 lg:h-auto lg:rounded-3xl
                ${isCollapsed
                    ? 'translate-y-[110%] lg:translate-y-0 lg:-translate-x-[120%]'
                    : 'translate-y-0 lg:translate-x-0'
                }`}>
                {/* Header */}
                <div className="p-6 border-b border-slate-200/50 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-transparent">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            Konfigurator 3D
                        </h2>
                        <p className="text-xs font-medium text-accent uppercase tracking-wider mt-1">Premium Studio</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-400 border border-slate-200">V 2.1</div>
                        <button onClick={() => onToggle(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                            ◀
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-2 pt-2 bg-slate-50/30 overflow-x-auto no-scrollbar border-b border-slate-200/50">
                    <TabButton active={activeTab === 'structure'} onClick={() => setActiveTab('structure')} icon="📐" label="Konstrukcja" />
                    <TabButton active={activeTab === 'finish'} onClick={() => setActiveTab('finish')} icon="🎨" label="Wygląd" />
                    <TabButton active={activeTab === 'equip'} onClick={() => setActiveTab('equip')} icon="✨" label="Wyposażenie" />
                    <TabButton active={activeTab === 'env'} onClick={() => setActiveTab('env')} icon="🌳" label="Otoczenie" />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

                    {/* STRUCTURE TAB */}
                    {activeTab === 'structure' && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* 1. Model Selection */}
                            <div>
                                <SectionLabel>Model Zadaszenia</SectionLabel>
                                <div className="grid grid-cols-1 gap-3">
                                    {models.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                updateConfig('modelId', m.id);
                                                if (m.id === 'pergola_bio' && !config.color) {
                                                    updateConfig('color', 'RAL 7016');
                                                }
                                            }}
                                            className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left overflow-hidden ${config.modelId === m.id
                                                ? 'border-accent bg-accent/5 shadow-accent/10 shadow-lg'
                                                : 'border-slate-100 hover:border-slate-300 bg-white/50 hover:bg-white'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm border border-slate-100 transition-transform ${config.modelId === m.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                                                {m.icon}
                                            </div>
                                            <div className="relative z-10 flex-1">
                                                <div className={`font-bold text-base ${config.modelId === m.id ? 'text-accent' : 'text-slate-700'}`}>{m.name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{m.desc}</div>
                                            </div>
                                            {config.modelId === m.id && (
                                                <div className="absolute right-4 w-2 h-2 rounded-full bg-accent animate-pulse" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PERGOLA CONTROLS (CONDITIONAL) */}
                            {config.modelId === 'pergola_bio' && (
                                <div className="pt-6 border-t border-slate-200/50 space-y-6 animate-fadeIn">
                                    <SectionLabel>Opcje Pergoli Bioklimatycznej</SectionLabel>

                                    <RangeControl
                                        label="Kąt Lameli (°)"
                                        value={config.lamellaAngle || 0}
                                        min={0} max={135} step={5}
                                        onChange={(v: number) => updateConfig('lamellaAngle', v)}
                                    />

                                    <RangeControl
                                        label="Liczba Modułów"
                                        value={config.moduleCount || 1}
                                        min={1} max={4} step={1}
                                        onChange={(v: number) => updateConfig('moduleCount', v)}
                                    />
                                </div>
                            )}

                            {/* 2. Installation Type */}
                            <div className="pt-6 border-t border-slate-200/50">
                                <SectionLabel>Sposób Montażu</SectionLabel>
                                <div className="flex bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/50">
                                    <OptionButton
                                        active={config.installationType === 'wall-mounted'}
                                        onClick={() => updateConfig('installationType', 'wall-mounted')}
                                        label="Przyścienny"
                                    />
                                    <OptionButton
                                        active={config.installationType === 'freestanding'}
                                        onClick={() => updateConfig('installationType', 'freestanding')}
                                        label="Wolnostojący"
                                    />
                                </div>
                            </div>

                            {/* 3. Dimensions */}
                            <div className="pt-6 border-t border-slate-200/50 space-y-6">
                                <SectionLabel>Wymiary Podstawowe</SectionLabel>
                                <RangeControl
                                    label="Szerokość (mm)"
                                    value={config.width}
                                    min={3000} max={12000} step={100}
                                    onChange={(v: number) => updateConfig('width', v)}
                                />
                                <RangeControl
                                    label="Głębokość (mm)"
                                    value={config.projection}
                                    min={2000} max={5000} step={100}
                                    onChange={(v: number) => updateConfig('projection', v)}
                                />
                            </div>

                            {/* 4. Heights & Angles */}
                            {/* 4. Heights & Angles */}
                            {config.modelId !== 'pergola_bio' ? (
                                <div className="pt-6 border-t border-slate-200/50 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-700 text-sm">Wysokości i Kąt</h4>
                                        <div className="text-xs bg-white px-2 py-1 rounded border border-slate-200 font-mono text-slate-500">
                                            {(() => {
                                                const f = config.frontHeight || 2500;
                                                const r = config.rearHeight || (f + (config.projection * 0.14));
                                                const ang = Math.atan((r - f) / config.projection) * (180 / Math.PI);
                                                return `${ang.toFixed(1)}°`;
                                            })()}
                                        </div>
                                    </div>

                                    <RangeControl
                                        label={config.installationType === 'wall-mounted' ? "Wysokość przy Ścianie (mm)" : "Wysokość Tylnych Słupów (mm)"}
                                        value={config.rearHeight || ((config.frontHeight || 2500) + (config.projection * 0.14))}
                                        min={2400} max={4000} step={50}
                                        onChange={(v: number) => updateConfig('rearHeight', v)}
                                    />
                                    <RangeControl
                                        label="Wysokość Frontu (Przejście) (mm)"
                                        value={config.frontHeight || 2500}
                                        min={2000} max={3000} step={50}
                                        onChange={(v: number) => updateConfig('frontHeight', v)}
                                    />
                                </div>
                            ) : (
                                <div className="pt-6 border-t border-slate-200/50 space-y-6">
                                    <SectionLabel>Wysokość Konstrukcji</SectionLabel>
                                    <RangeControl
                                        label="Wysokość (mm)"
                                        value={config.postsHeight || config.frontHeight || 2500}
                                        min={2200} max={3000} step={50}
                                        onChange={(v: number) => {
                                            updateConfig('postsHeight', v);
                                            updateConfig('frontHeight', v);
                                        }}
                                    />
                                </div>
                            )}

                            {/* 5. Advanced Construction */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <SectionLabel>Konstrukcja Zaawansowana</SectionLabel>
                                    <button
                                        onClick={() => {
                                            if (config.customPostCount) {
                                                updateConfig('customPostCount', undefined);
                                                updateConfig('customRafterCount', undefined);
                                            } else {
                                                const specs = getStructureSpecs(config);
                                                updateConfig('customPostCount', specs.postCount || 2);
                                                updateConfig('customRafterCount', specs.rafterCount || 5);
                                            }
                                        }}
                                        className={`text-xs px-2 py-1 rounded transition-colors ${config.customPostCount ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {config.customPostCount ? 'Tryb Manualny' : 'Automat'}
                                    </button>
                                </div>

                                {config.customPostCount ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        <RangeControl
                                            label="Liczba Słupów"
                                            value={config.customPostCount}
                                            min={2} max={6} step={1}
                                            onChange={(v: number) => updateConfig('customPostCount', v)}
                                        />
                                        {config.modelId !== 'pergola_bio' && (
                                            <RangeControl
                                                label="Liczba Krokwi"
                                                value={config.customRafterCount || 5}
                                                min={3} max={15} step={1}
                                                onChange={(v: number) => updateConfig('customRafterCount', v)}
                                            />
                                        )}

                                        {/* Post Offsets */}
                                        <div className="pt-2 mt-4 border-t border-slate-100">
                                            <div className="text-xs font-bold text-slate-500 uppercase mb-3">Przesunięcie Słupów</div>
                                            <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                                                {Array.from({ length: config.customPostCount }).map((_, i) => {
                                                    const currentOffset = (config.postOffsets && config.postOffsets[i]) || 0;
                                                    return (
                                                        <div key={i} className="flex flex-col gap-1">
                                                            <div className="flex justify-between text-xs text-slate-600">
                                                                <span className="font-medium">Słup {i + 1}</span>
                                                                <span className={currentOffset !== 0 ? "text-accent font-bold" : "text-slate-400"}>
                                                                    {currentOffset > 0 ? `+${currentOffset}` : currentOffset} mm
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={-1000} max={1000} step={10}
                                                                value={currentOffset}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    const count = config.customPostCount || 2;
                                                                    const currentOffsets = config.postOffsets ? [...config.postOffsets] : Array(count).fill(0);
                                                                    while (currentOffsets.length < count) currentOffsets.push(0);
                                                                    currentOffsets[i] = val;
                                                                    updateConfig('postOffsets', currentOffsets);
                                                                }}
                                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg">
                                        <div>
                                            <span className="block font-bold text-slate-700 text-lg">{getStructureSpecs(config).postCount || 2}</span>
                                            Słupy
                                        </div>
                                        <div>
                                            <span className="block font-bold text-slate-700 text-lg">{getStructureSpecs(config).rafterCount || 5}</span>
                                            Krokwie
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FINISH TAB */}
                    {activeTab === 'finish' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* 1. Roof Type - HIDE FOR PERGOLA */}
                            {config.modelId !== 'pergola_bio' && (
                                <div>
                                    <SectionLabel>Pokrycie Dachowe</SectionLabel>
                                    <div className="flex bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/50 backdrop-blur-sm mb-3">
                                        <OptionButton
                                            active={config.roofType === 'polycarbonate'}
                                            onClick={() => updateConfig('roofType', 'polycarbonate')}
                                            label="Poliwęglan"
                                        />
                                        <OptionButton
                                            active={config.roofType === 'glass'}
                                            onClick={() => updateConfig('roofType', 'glass')}
                                            label="Szkło VSG"
                                        />
                                    </div>

                                    {/* Variant Selection */}
                                    <div className="grid grid-cols-2 gap-2 animate-fadeIn">
                                        {config.roofType === 'polycarbonate' ? (
                                            <>
                                                <OptionButton
                                                    active={!config.polycarbonateType || config.polycarbonateType === 'standard'}
                                                    onClick={() => updateConfig('polycarbonateType', 'standard')}
                                                    label="Standard (Opal)"
                                                    subLabel="Mleczny"
                                                />
                                                <OptionButton
                                                    active={config.polycarbonateType === 'clear'}
                                                    onClick={() => updateConfig('polycarbonateType', 'clear')}
                                                    label="Przeźroczyste"
                                                    subLabel="Jasne"
                                                />
                                                <OptionButton
                                                    active={config.polycarbonateType === 'ir-gold'}
                                                    onClick={() => updateConfig('polycarbonateType', 'ir-gold')}
                                                    label="IR Gold"
                                                    subLabel="Ochrona termiczna"
                                                    highlight
                                                />
                                                <OptionButton
                                                    active={config.polycarbonateType === 'iq-relax'}
                                                    onClick={() => updateConfig('polycarbonateType', 'iq-relax')}
                                                    label="IQ Relax"
                                                    subLabel="Auto-klimatyzacja"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <OptionButton
                                                    active={!config.glassType || config.glassType === 'standard'}
                                                    onClick={() => updateConfig('glassType', 'standard')}
                                                    label="Przeźroczyste"
                                                    subLabel="Standard VSG"
                                                />
                                                <OptionButton
                                                    active={config.glassType === 'mat'}
                                                    onClick={() => updateConfig('glassType', 'mat')}
                                                    label="Matowe"
                                                    subLabel="Mleczna folia"
                                                />
                                                <OptionButton
                                                    active={config.glassType === 'sunscreen'}
                                                    onClick={() => updateConfig('glassType', 'sunscreen')}
                                                    label="Przyciemniane"
                                                    subLabel="Grafit / Brąz"
                                                />
                                                <OptionButton
                                                    active={config.glassType === 'heat-protection'}
                                                    onClick={() => updateConfig('glassType', 'heat-protection')}
                                                    label="Anty-Nagrzew."
                                                    subLabel="Redukcja ciepła"
                                                    highlight
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2. Colors */}
                            <div className="pt-6 border-t border-slate-200/50">
                                <SectionLabel>Kolor Konstrukcji (RAL)</SectionLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    {standardColors.map(c => (
                                        <button
                                            key={c.ral}
                                            onClick={() => {
                                                updateConfig('color', c.ral);
                                                updateConfig('customColor', false);
                                            }}
                                            className={`relative p-3 rounded-2xl border-2 transition-all flex items-center gap-3 group ${!config.customColor && config.color === c.ral
                                                ? 'border-accent bg-white shadow-lg scale-[1.02] ring-2 ring-accent/20'
                                                : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-white hover:scale-[1.01]'
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full border border-slate-200 shadow-inner flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: c.hex }}>
                                                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{c.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{c.ral}</div>
                                            </div>
                                            {config.color === c.ral && !config.customColor && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Flooring */}
                            <div className="pt-6 border-t border-slate-200/50">
                                <SectionLabel>Podłoga / Taras</SectionLabel>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'none', label: 'Brak', icon: '🚫' },
                                        { id: 'wpc', label: 'WPC', sub: 'Deska', icon: '🪵', price: 120 },
                                        { id: 'gres', label: 'Gres', sub: 'Płyta 60x60', icon: 'tiles', price: 150 }
                                    ].map((opt) => {
                                        const isActive = config.floorType === opt.id || (!config.floorType && opt.id === 'none');
                                        const isLegacyWpc = !config.floorType && opt.id === 'wpc' && config.addons.some(a => a.type === 'wpc-floor');
                                        const selected = isActive || isLegacyWpc;

                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    if (opt.id === 'none') {
                                                        const newAddons = config.addons.filter(a => !['wpc-floor', 'gres-floor'].includes(a.type));
                                                        onChange({ floorType: undefined, addons: newAddons });
                                                    } else {
                                                        const area = (config.width / 1000) * (config.projection / 1000);
                                                        const price = Math.round(area * (opt.price || 0));
                                                        const newAddons = config.addons.filter(a => !['wpc-floor', 'gres-floor'].includes(a.type));
                                                        newAddons.push({
                                                            id: `floor-${opt.id}-${Date.now()}`,
                                                            type: opt.id === 'wpc' ? 'wpc-floor' : 'gres-floor',
                                                            name: opt.id === 'wpc' ? 'Podłoga WPC' : 'Podłoga Gres',
                                                            price: price,
                                                            quantity: 1
                                                        });
                                                        onChange({ floorType: opt.id as 'wpc' | 'gres', addons: newAddons });
                                                    }
                                                }}
                                                className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${selected
                                                    ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                                                    }`}
                                            >
                                                <span className="text-xl">
                                                    {opt.icon === 'tiles' ?
                                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="16" height="16" rx="1" /><line x1="10" y1="2" x2="10" y2="18" /><line x1="2" y1="10" x2="18" y2="10" /></svg>
                                                        : opt.icon
                                                    }
                                                </span>
                                                <span className="text-xs">{opt.label}</span>
                                                {opt.sub && <span className="text-[9px] opacity-70">{opt.sub}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}



                    {/* EQUIPMENT TAB */}
                    {activeTab === 'equip' && (
                        <div className="space-y-6 animate-fadeIn">
                            <SectionLabel>Zabudowa Boczna</SectionLabel>

                            {config.modelId !== 'pergola_bio' && (
                                <button
                                    onClick={() => updateConfig('sideWedges', !config.sideWedges)}
                                    className={`w-full p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${config.sideWedges
                                        ? 'border-accent bg-accent/5 shadow-md'
                                        : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${config.sideWedges ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            📐
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-bold text-base transition-colors ${config.sideWedges ? 'text-accent' : 'text-slate-800'}`}>Trójkąty (Kliny)</div>
                                            <div className="text-xs text-slate-500">Szklana zabudowa boczna</div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${config.sideWedges ? 'border-accent bg-accent text-white scale-110' : 'border-slate-300'
                                        }`}>
                                        {config.sideWedges && <span className="text-xs">✓</span>}
                                    </div>
                                </button>
                            )}

                            <div className="grid grid-cols-1 gap-3 mt-4">
                                {/* Dynamic Components / Lighting - HIDE FOR PERGOLA */}
                                {config.modelId !== 'pergola_bio' && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Oświetlenie i Dodatki</div>

                                        {/* Dynamic List */}
                                        {componentLists.flatMap(list => list.entries).filter(e => e.properties?.unit === 'piece' || e.properties?.unit === 'meter').map(entry => {
                                            const isActive = config.addons.some(a => a.name === (entry.properties?.name || 'Komponent'));

                                            return (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => {
                                                        let newAddons = [...config.addons];
                                                        if (isActive) {
                                                            newAddons = newAddons.filter(a => a.name !== (entry.properties?.name || 'Komponent'));
                                                        } else {
                                                            newAddons.push({
                                                                id: `addon-${entry.id}-${Date.now()}`,
                                                                type: 'lighting', // Generalize?
                                                                name: entry.properties?.name || 'Dodatek',
                                                                price: entry.price,
                                                                quantity: 1,
                                                                attributes: {
                                                                    image: entry.properties?.image // Attach Image!
                                                                }
                                                            });
                                                        }
                                                        onChange({ addons: newAddons });
                                                    }}
                                                    className={`w-full p-3 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 text-left group ${isActive
                                                        ? 'border-accent bg-accent/5 shadow-md'
                                                        : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-white'
                                                        }`}
                                                >
                                                    {/* Image or Icon */}
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl overflow-hidden border ${isActive ? 'border-accent' : 'border-slate-100'}`}>
                                                        {entry.properties?.image ? (
                                                            <img src={entry.properties.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl">💡</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className={`font-bold text-sm ${isActive ? 'text-accent' : 'text-slate-800'}`}>
                                                            {entry.properties?.name || 'Oświetlenie'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 line-clamp-1">
                                                            {entry.properties?.description || 'Dodatek do zadaszenia'}
                                                        </div>
                                                    </div>

                                                    <div className={`font-bold text-sm ${isActive ? 'text-accent' : 'text-slate-600'}`}>
                                                        {entry.price} zł
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {/* Fallback if no components loaded? Keep generic? No, user wants specific. */}
                                        {componentLists.length === 0 && (
                                            <div className="text-center py-4 text-xs text-slate-400 italic">Ładowanie opcji...</div>
                                        )}
                                    </div>
                                )}

                                {/* Sliding Glass Section */}
                                <div className="bg-white/50 rounded-2xl p-4 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Systemy Przesuwne</div>
                                    <div className="flex gap-2">
                                        {['left', 'front', 'right'].map((loc) => {
                                            const location = loc as 'left' | 'front' | 'right';
                                            const isActive = config.addons.some(a => a.type === 'slidingWall' && (a.location === location || (!a.location && location === 'front')));

                                            return (
                                                <button
                                                    key={location}
                                                    onClick={() => {
                                                        let newAddons = [...config.addons];
                                                        if (isActive) {
                                                            // Remove specific location
                                                            newAddons = newAddons.filter(a => !(a.type === 'slidingWall' && (a.location === location || (!a.location && location === 'front'))));
                                                        } else {
                                                            // Add
                                                            newAddons.push({
                                                                id: `glass-${location}-${Date.now()}`,
                                                                type: 'slidingWall',
                                                                name: `Szyby Przesuwne (${location === 'front' ? 'Front' : location === 'left' ? 'Lewa' : 'Prawa'})`,
                                                                location: location,
                                                                price: 1200, // Placeholder
                                                                width: location === 'front' ? config.width : config.projection,
                                                                height: config.postsHeight
                                                            });
                                                        }
                                                        onChange({ addons: newAddons });
                                                    }}
                                                    className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isActive
                                                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 bg-white'
                                                        }`}
                                                >
                                                    <div className="text-xl">
                                                        {location === 'left' ? '⬅️' : location === 'right' ? '➡️' : '⬆️'}
                                                    </div>
                                                    <div className="text-[10px] font-bold uppercase">{location === 'front' ? 'Przód' : location === 'left' ? 'Lewa' : 'Prawa'}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Markiza - HIDE FOR PERGOLA */}
                                {config.modelId !== 'pergola_bio' && (
                                    <button
                                        onClick={() => {
                                            const hasAwning = config.addons.some(a => a.type === 'awning');
                                            let newAddons = [...config.addons];
                                            if (hasAwning) {
                                                newAddons = newAddons.filter(a => a.type !== 'awning');
                                            } else {
                                                newAddons.push({
                                                    id: `awning-${Date.now()}`,
                                                    type: 'awning',
                                                    name: 'Markiza Poddachowa',
                                                    price: 2500,
                                                    projection: config.projection,
                                                    width: config.width
                                                });
                                            }
                                            onChange({ addons: newAddons });
                                        }}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${config.addons.some(a => a.type === 'awning')
                                            ? 'border-accent bg-accent/5 shadow-md'
                                            : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${config.addons.some(a => a.type === 'awning') ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                ⛱️
                                            </div>
                                            <div className="text-left">
                                                <div className={`font-bold text-sm transition-colors ${config.addons.some(a => a.type === 'awning') ? 'text-accent' : 'text-slate-800'}`}>Markiza</div>
                                                <div className="text-[10px] text-slate-500">Ochrona przeciwsłoneczna</div>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${config.addons.some(a => a.type === 'awning') ? 'border-accent bg-accent text-white scale-110' : 'border-slate-300'
                                            }`}>
                                            {config.addons.some(a => a.type === 'awning') && <span className="text-[10px]">✓</span>}
                                        </div>
                                    </button>
                                )}

                                {/* ZIP Screens */}
                                <div className="bg-white/50 rounded-2xl p-4 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">ZIP Screen</div>
                                    <div className="flex gap-2">
                                        {['left', 'front', 'right'].map((loc) => {
                                            const location = loc as 'left' | 'front' | 'right';
                                            const isActive = config.addons.some(a => a.type === 'zipScreen' && (a.location === location || (!a.location && location === 'front')));

                                            return (
                                                <button
                                                    key={location}
                                                    onClick={() => {
                                                        let newAddons = [...config.addons];
                                                        if (isActive) {
                                                            newAddons = newAddons.filter(a => !(a.type === 'zipScreen' && (a.location === location || (!a.location && location === 'front'))));
                                                        } else {
                                                            newAddons.push({
                                                                id: `zip-${location}-${Date.now()}`,
                                                                type: 'zipScreen',
                                                                name: `ZIP Screen`,
                                                                location: location,
                                                                price: 1500,
                                                                width: location === 'front' ? config.width : config.projection,
                                                                height: config.postsHeight
                                                            });
                                                        }
                                                        onChange({ addons: newAddons });
                                                    }}
                                                    className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isActive
                                                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 bg-white'
                                                        }`}
                                                >
                                                    <div className="text-xl">
                                                        {location === 'left' ? '⬅️' : location === 'right' ? '➡️' : '⬆️'}
                                                    </div>
                                                    <div className="text-[10px] font-bold uppercase">{location === 'front' ? 'Przód' : location === 'left' ? 'Lewa' : 'Prawa'}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* HEATER - HIDE FOR PERGOLA */}
                                {config.modelId !== 'pergola_bio' && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-bold text-slate-700">Promiennik Ciepła</span>
                                            <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">250 EUR</span>
                                        </div>
                                        <button
                                            onClick={() => handleAddon('heater', 250)}
                                            className={`w-full py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${config.addons.some(a => a.type === 'heater')
                                                ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                                                }`}
                                        >
                                            <span>🔥</span>
                                            <span>{config.addons.some(a => a.type === 'heater') ? 'Dodano' : 'Dodaj Promiennik'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* ENVIRONMENT TAB */}
                    {activeTab === 'env' && (
                        <div className="space-y-6 animate-fadeIn pb-20">

                            {/* 1. DOM I OTOCZENIE (Context) */}
                            <SectionLabel>Dom i Otoczenie</SectionLabel>

                            {/* Wall Toggle & Config */}
                            <button
                                onClick={() => updateConfig('contextConfig', { ...config.contextConfig, hasWall: !config.contextConfig?.hasWall })}
                                className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${config.contextConfig?.hasWall
                                    ? 'border-accent bg-accent/5 shadow-md'
                                    : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-white'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${config.contextConfig?.hasWall ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        🏠
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-bold text-sm transition-colors ${config.contextConfig?.hasWall ? 'text-accent' : 'text-slate-800'}`}>Pokaż Fasade Domu</div>
                                        <div className="text-[10px] text-slate-500">Symulacja ściany budynku</div>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.contextConfig?.hasWall ? 'bg-accent' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.contextConfig?.hasWall ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            {config.contextConfig?.hasWall && (
                                <div className="space-y-6 pt-4 border-t border-slate-100 animate-fadeIn">
                                    {/* Wall Color */}
                                    <div>
                                        <SectionLabel>Kolor Elewacji</SectionLabel>
                                        <div className="flex gap-2">
                                            {['#ffffff', '#f0f0f0', '#e5e5e5', '#d4d4d4', '#f5e6d3', '#e6ceac'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => updateConfig('contextConfig', { ...config.contextConfig, wallColor: color })}
                                                    className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 ${config.contextConfig?.wallColor === color ? 'ring-2 ring-accent ring-offset-2' : 'border-slate-200'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Door Position */}
                                    <RangeControl
                                        label="Pozycja Drzwi (Przesunięcie)"
                                        value={config.contextConfig?.doorPosition || 0}
                                        min={-3000} max={3000} step={100}
                                        onChange={(v: number) => updateConfig('contextConfig', { ...config.contextConfig, doorPosition: v })}
                                    />
                                </div>
                            )}

                            {/* Decor Toggle */}
                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => updateConfig('contextConfig', { ...config.contextConfig, showDecor: !config.contextConfig?.showDecor })}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${config.contextConfig?.showDecor
                                        ? 'border-accent bg-accent/5 shadow-md'
                                        : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${config.contextConfig?.showDecor ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            🪑
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-bold text-sm transition-colors ${config.contextConfig?.showDecor ? 'text-accent' : 'text-slate-800'}`}>Pokaż Meble i Rośliny</div>
                                            <div className="text-[10px] text-slate-500">Dodaj stół, krzesła i rośliny dla skali</div>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.contextConfig?.showDecor ? 'bg-accent' : 'bg-slate-200'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.contextConfig?.showDecor ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                            </div>

                            {/* 2. TŁO I OŚWIETLENIE (Background & Lighting) */}
                            <div className="pt-6 border-t border-slate-100">
                                <SectionLabel>Tło i Oświetlenie</SectionLabel>

                                {/* Background Upload */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4 mb-4">
                                    <label className="w-full py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent hover:text-accent transition-all group">
                                        <div className="text-2xl text-slate-300 group-hover:text-accent transition-colors">📷</div>
                                        <span className="text-xs font-bold">Wgraj zdjęcie tarasu</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    {onClearBackground && (
                                        <button
                                            onClick={onClearBackground}
                                            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            🗑️ Usuń Tło
                                        </button>
                                    )}
                                </div>

                                {/* Sun Position */}
                                {onSunChange && (
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <RangeControl
                                            label={`Pora Dnia (${Math.floor((sunPosition || 0.5) * 12 + 6)}:00)`}
                                            value={Math.round((sunPosition || 0.5) * 100)}
                                            min={0} max={100} step={1}
                                            onChange={(v: number) => onSunChange(v / 100)}
                                        />
                                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold">
                                            <span>Ranek</span>
                                            <span>Południe</span>
                                            <span>Wieczór</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 3. AI STUDIO */}
                            <div className="pt-6 border-t border-slate-100">
                                <SectionLabel>AI Magic Studio ✨</SectionLabel>
                                <div className="p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-100 flex flex-col gap-4">
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Nasza sztuczna inteligencja nałoży zadaszenie na Twoje zdjęcie w fotorealistycznej jakości.
                                    </p>

                                    <button
                                        onClick={onAnalyzeAI}
                                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 transform transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group"
                                    >
                                        <span className="text-xl group-hover:animate-pulse">🪄</span>
                                        <span>Generuj Wizualizację AI</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Content End */}
                </div >

                {/* Price Footer */}
                <div className="p-6 bg-slate-900 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-20 bg-slate-900/50 blur-xl z-10" />

                    <div className="flex flex-col gap-4 relative z-20">
                        {/* Price Row */}
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Cena Netto</div>
                                <div className="text-xl font-medium text-slate-300">
                                    {priceLoading ? <span className="animate-pulse">...</span> : formatCurrency(price.net)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-accent font-bold uppercase tracking-widest mb-1">CENA BRUTTO</div>
                                <div className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
                                    {priceLoading ? <span className="animate-pulse">...</span> : formatCurrency(price.gross)}
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={() => setShowOfferModal(true)}
                            className="w-full bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-accent/20 flex items-center justify-center gap-2 transform transition-all hover:-translate-y-1 active:scale-95"
                        >
                            <span>💾</span>
                            <span>Zapisz Ofertę</span>
                        </button>
                    </div>

                </div >
            </div >

            <VisualizerOfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                productConfig={config}
                pricing={{
                    sellingPriceNet: price.net,
                    sellingPriceGross: price.gross,
                    marginPercentage: 35,
                    totalCost: price.net * 0.65,
                    basePrice: price.net,
                    addonsPrice: 0,
                    marginValue: price.net * 0.35
                }}
            />
        </>
    );
};

// --- Helpers ---

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">{children}</div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all relative ${active
            ? 'text-accent bg-white shadow-sm rounded-t-xl z-10'
            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
    >
        <span className={`text-lg transition-transform ${active ? 'scale-110' : ''}`}>{icon}</span>
        {label}
        {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent rounded-full mx-4" />}
    </button>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OptionButton = ({ active, onClick, label, subLabel, highlight }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${active
            ? `bg-white text-slate-900 shadow-md scale-[1.02] ring-1 ${highlight ? 'ring-amber-400' : 'ring-black/5'}`
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            } ${highlight && !active ? 'bg-amber-50/50 text-amber-700 hover:bg-amber-100/50' : ''}`}
    >
        <span>{label}</span>
        {subLabel && <span className="text-[9px] opacity-70 font-normal">{subLabel}</span>}
    </button>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RangeControl = ({ label, value, min, max, step, onChange }: any) => (
    <div className="group">
        <div className="flex justify-between mb-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-accent transition-colors">{label}</label>
            <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 shadow-sm font-bold min-w-[3rem] text-center">{value}</span>
        </div>
        <div className="relative h-6 flex items-center">
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent hover:h-2 transition-all"
            />
        </div>

        <div className="flex justify-between mt-1 text-[10px] text-slate-300 font-medium">
            <span>{min}</span>
            <span>{max}</span>
        </div>
    </div>
);
