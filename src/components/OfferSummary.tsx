import React from 'react';
import type { Offer } from '../types';
import { generateOfferPDF } from '../utils/pdfGenerator';
import { translations, translate, formatCurrency } from '../utils/translations';


interface OfferSummaryProps {
    offer: Offer;
    onReset: () => void;
}

export const OfferSummary: React.FC<OfferSummaryProps> = ({ offer, onReset }) => {


    const [isGenerating, setIsGenerating] = React.useState(false);

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            await generateOfferPDF(offer);
        } catch (error) {
            console.error('PDF Generation failed:', error);
            // toast.error('Błąd generowania PDF'); // Assuming toast is available or add it
        } finally {
            setIsGenerating(false);
        }
    };

    const modelName = translate(offer.product.modelId, 'models');
    const colorName = translate(offer.product.color, 'colors');
    const roofName = translate(offer.product.roofType, 'roofTypes');
    const installationType = translate(offer.product.installationType, 'installationTypes');

    let roofDetail = '';
    if (offer.product.roofType === 'polycarbonate' && offer.product.polycarbonateType) {
        roofDetail = translate(offer.product.polycarbonateType, 'polycarbonateTypes');
    } else if (offer.product.roofType === 'glass' && offer.product.glassType) {
        roofDetail = translate(offer.product.glassType, 'glassTypes');
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header for Print */}
            <div className="bg-primary text-white p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">PolenDach 24</h1>
                        <p className="opacity-80">{translations.offer} #{offer.id}</p>
                        <p className="opacity-80">{translations.date}: {offer.createdAt.toLocaleDateString('de-DE')}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">PolenDach 24</h2>
                        <p className="text-sm opacity-70">Systemy Zadaszeń</p>
                    </div>
                </div>
            </div>

            <div className="p-8">
                {/* Customer Details */}
                <div className="mb-8">
                    <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">{translations.customer}</h3>
                    <div className="grid grid-cols-2 gap-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <p className="text-sm text-slate-500">Name</p>
                            <p className="font-medium text-slate-900">{offer.customer.salutation} {offer.customer.firstName} {offer.customer.lastName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Adresse</p>
                            <p className="font-medium text-slate-900">{offer.customer.postalCode} {offer.customer.city}</p>
                        </div>
                        <div className="col-span-2 border-t border-slate-200 pt-4 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">{translations.snowZone}:</span>
                                <span className="font-bold text-accent">Zone {offer.snowZone.id}</span>
                                <span className="text-xs bg-accent-soft text-accent-dark px-2 py-0.5 rounded-full">
                                    {offer.snowZone.value} kN/m²
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Details */}
                <div className="mb-8">
                    <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">{translations.specification}</h3>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="py-3 font-medium text-slate-500 text-sm">Beschreibung</th>
                                <th className="py-3 font-medium text-slate-500 text-sm text-right">Wert</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="py-4 text-slate-900">{translations.model}</td>
                                <td className="py-4 text-slate-900 text-right uppercase">
                                    {modelName}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-4 text-slate-900">{translations.dimensions}</td>
                                <td className="py-4 text-slate-900 text-right font-mono">{offer.product.width} mm x {offer.product.projection} mm</td>
                            </tr>
                            {offer.product.postsHeight && (
                                <tr>
                                    <td className="py-4 text-slate-900">Pfostenhöhe</td>
                                    <td className="py-4 text-slate-900 text-right font-mono">{offer.product.postsHeight} mm</td>
                                </tr>
                            )}
                            <tr>
                                <td className="py-4 text-slate-900">{translations.color}</td>
                                <td className="py-4 text-slate-900 text-right">{colorName}</td>
                            </tr>
                            <tr>
                                <td className="py-4 text-slate-900">{translations.roofType}</td>
                                <td className="py-4 text-slate-900 text-right">
                                    {roofName}
                                    {roofDetail && <div className="text-xs text-slate-500">{roofDetail}</div>}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-4 text-slate-900">Montagetyp</td>
                                <td className="py-4 text-slate-900 text-right">
                                    {installationType}
                                </td>
                            </tr>
                            {offer.pricing.numberOfFields && (
                                <tr>
                                    <td className="py-4 text-slate-900">Anzahl der Felder</td>
                                    <td className="py-4 text-slate-900 text-right font-mono">{offer.pricing.numberOfFields}</td>
                                </tr>
                            )}
                            {offer.pricing.numberOfPosts && (
                                <tr>
                                    <td className="py-4 text-slate-900">Anzahl der Pfosten</td>
                                    <td className="py-4 text-slate-900 text-right font-mono">{offer.pricing.numberOfPosts}</td>
                                </tr>
                            )}
                            {/* Selected Add-ons */}
                            {offer.product.addons.map((addon, idx) => (
                                <tr key={idx} className="bg-green-50/50">
                                    <td className="py-4 text-slate-900 pl-2 border-l-2 border-green-500">
                                        <span className="font-medium">{addon.name}</span>
                                        {addon.variant && <span className="text-slate-500 text-xs ml-2">({addon.variant})</span>}
                                    </td>
                                    <td className="py-4 text-slate-900 text-right">
                                        {formatCurrency(addon.price)}
                                    </td>
                                </tr>
                            ))}
                            {offer.product.selectedAccessories?.map((acc, idx) => (
                                <tr key={`acc-${idx}`} className="bg-green-50/50">
                                    <td className="py-4 text-slate-900 pl-2 border-l-2 border-green-500">
                                        <span className="font-medium">{acc.quantity}x {acc.name}</span>
                                    </td>
                                    <td className="py-4 text-slate-900 text-right">
                                        {formatCurrency(acc.price * acc.quantity)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Installation Costs */}
                {offer.pricing.installationCosts && offer.pricing.installationCosts.days > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">{translations.installation} (Brutto)</h3>
                        <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="space-y-2 mb-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-700">Montage ({offer.product.installationDays} Tage):</span>
                                    <span className="font-medium text-slate-900">
                                        {formatCurrency(offer.pricing.installationCosts.dailyTotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                                    <span className="text-slate-700">
                                        Anfahrt ({offer.pricing.installationCosts.travelDistance} km):
                                    </span>
                                    <span className="font-medium text-slate-900">
                                        {formatCurrency(offer.pricing.installationCosts.travelCost)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-blue-400">
                                <span className="font-bold text-slate-800">Gesamt ({translations.installation}):</span>
                                <span className="font-bold text-lg text-accent-dark">
                                    {formatCurrency(offer.pricing.installationCosts.totalInstallation)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Total */}
                <div className="flex justify-end mb-12">
                    <div className="text-right p-6 bg-slate-50 rounded-xl border border-slate-200 min-w-[300px]">
                        <p className="text-sm text-slate-500 mb-1">{translations.netPrice}</p>
                        <p className="text-xl font-semibold text-slate-700 mb-2">
                            {formatCurrency(offer.pricing.sellingPriceNet)}
                        </p>

                        <div className="border-t border-slate-200 my-2"></div>

                        <p className="text-sm text-slate-500 mb-1">{translations.grossPrice}</p>
                        <p className="text-4xl font-bold text-primary">
                            {formatCurrency(offer.pricing.sellingPriceGross)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">* {translations.vat} 19%</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
                    <button
                        onClick={onReset}
                        className="text-slate-500 hover:text-slate-700 font-medium"
                    >
                        Neues Angebot
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                        >
                            Drucken
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generiere PDF...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    PDF Herunterladen
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
