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
                        <SectionHeader title="Dodatki i Akcesoria" icon="✨" />
                        <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                            {product.addons.map((addon, idx) => (
                                <SpecRow
                                    key={`addon-${idx}`}
                                    label={addon.name}
                                    value="W zestawie"
                                />
                            ))}
                            {product.selectedAccessories?.map((acc, idx) => (
                                <SpecRow
                                    key={`acc-${idx}`}
                                    label={`${acc.name} (${acc.quantity} szt.)`}
                                    value="W zestawie"
                                />
                            ))}
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
