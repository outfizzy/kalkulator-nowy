import React from 'react';
import type { ProductConfig } from '../../types';

const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-t-xl border-b border-slate-200 mt-6 first:mt-0">
        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-lg border border-slate-200">
            {icon}
        </div>
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
    </div>
);

const SpecRow = ({ label, value }: { label: string, value: string | number | undefined }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 text-sm font-medium">{label}</span>
            <span className="text-slate-800 font-semibold text-sm text-right">{value}</span>
        </div>
    );
};

interface OfferSpecificationProps {
    product: ProductConfig;
}

export const OfferSpecification: React.FC<OfferSpecificationProps> = ({ product }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">Specyfikacja Techniczna</h2>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono opacity-70">
                    ID: {product.modelId}
                </span>
            </div>

            <div className="p-6">

                {/* 1. Dimensions & Structure */}
                <SectionHeader title="Wymiary i Konstrukcja" icon="📐" />
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                    <SpecRow label="Szerokość" value={`${product.width} mm`} />
                    <SpecRow label="Głębokość (Wysięg)" value={`${product.projection} mm`} />
                    {product.postsHeight && <SpecRow label="Wysokość Słupów" value={`${product.postsHeight} mm`} />}
                    {product.installationDays && <SpecRow label="Przewidywany czas montażu" value={`${product.installationDays} dni`} />}
                    {product.numberOfPosts && <SpecRow label="Liczba Słupów" value={`${product.numberOfPosts} szt.`} />}
                    {product.numberOfFields && <SpecRow label="Liczba Pól (Sekcji)" value={`${product.numberOfFields}`} />}
                </div>

                {/* 2. Aesthetics */}
                <SectionHeader title="Kolorystyka" icon="🎨" />
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                    <SpecRow label="Kolor Konstrukcji" value={product.customColor ? 'Indywidualny (RAL)' : product.color} />
                    {product.customColor && <SpecRow label="Numer RAL" value={product.customColorRAL} />}
                </div>

                {/* 3. Roof */}
                <SectionHeader title="Pokrycie Dachowe" icon="🏠" />
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                    <SpecRow label="Typ Dachu" value={product.roofType === 'glass' ? 'Szkło Bezpieczne (VSG)' : 'Poliwęglan Komorowy'} />
                    {product.roofType === 'glass' && <SpecRow label="Rodzaj Szkła" value={product.glassType || 'Standard (8mm)'} />}
                    {product.roofType === 'polycarbonate' && <SpecRow label="Rodzaj Poliwęglanu" value={product.polycarbonateType || 'Opal / Klar'} />}
                </div>

                {/* 4. Addons & Extras */}
                {(product.addons?.length > 0 || (product.selectedAccessories?.length || 0) > 0) && (
                    <>
                        <SectionHeader title="Dodatki i Wyposażenie" icon="✨" />
                        <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6 p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {product.addons.map((addon, idx) => {
                                    const image = (addon.attributes?.image as string) || null;
                                    return (
                                        <div key={`addon-${idx}`} className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={addon.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">
                                                        ✨
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 shadow-sm">
                                                    {addon.quantity || 1} szt.
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <div className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 min-h-[2.5em]">
                                                    {addon.name}
                                                </div>
                                                <div className="text-xs text-accent font-medium mt-1">
                                                    W zestawie
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {product.selectedAccessories?.map((acc, idx) => (
                                    <div key={`acc-${idx}`} className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                            {/* Accessories usually don't have images yet, use generic icon or mapping */}
                                            <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">
                                                📦
                                            </div>
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 shadow-sm">
                                                {acc.quantity} szt.
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <div className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 min-h-[2.5em]">
                                                {acc.name}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium mt-1">
                                                Akcesoria
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* 5. Custom Items */}
                {product.customItems && product.customItems.length > 0 && (
                    <>
                        <SectionHeader title="Elementy Niestandardowe" icon="🛠️" />
                        <div className="bg-white border-x border-b border-slate-200 rounded-b-xl">
                            {product.customItems.map((item, idx) => (
                                <SpecRow
                                    key={`custom-${idx}`}
                                    label={`${item.name} (${item.quantity} szt.)`}
                                    value={item.description || 'Specjalne zamówienie'}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
