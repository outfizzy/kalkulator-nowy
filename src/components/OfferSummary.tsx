import React from 'react';
import type { Offer } from '../types';
import { generateOfferPDF } from '../utils/pdfGenerator';
import { translations, translate, formatCurrency } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database';
import { PricingService } from '../services/pricing.service';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PricingInsights } from './PricingInsights';
import { AiService } from '../services/ai';


interface OfferSummaryProps {
    offer: Offer;
    onReset: () => void;
    onOfferUpdate?: (offer: Offer) => void;
}

export const OfferSummary: React.FC<OfferSummaryProps> = ({ offer, onReset, onOfferUpdate }) => {


    const [isGenerating, setIsGenerating] = React.useState(false);
    const { currentUser } = useAuth();

    // isAdminOrManager removed as it's unused now

    const navigate = useNavigate();

    // orderCosts removed from UI but might be needed for logic? 
    // The previous code had setOrderCosts. If I remove the UI, I should remove the state unless used elsewhere.
    // It was only used in the removed UI.
    const [isCreatingContract, setIsCreatingContract] = React.useState(false);

    // Custom Item Form State
    const [showCustomItemForm, setShowCustomItemForm] = React.useState(false);
    const [newItemName, setNewItemName] = React.useState('');
    const [newItemPrice, setNewItemPrice] = React.useState('');
    const [newItemQty, setNewItemQty] = React.useState('1');

    const handleAddCustomItem = async () => {
        if (!newItemName || !newItemPrice || !onOfferUpdate) return;

        try {
            const price = parseFloat(newItemPrice.replace(',', '.'));
            const qty = parseInt(newItemQty) || 1;

            const newItem = {
                id: crypto.randomUUID(),
                name: newItemName,
                price: price,
                quantity: qty,
                description: 'Pozycja dodatkowa'
            };

            const updatedProduct = {
                ...offer.product,
                customItems: [...(offer.product.customItems || []), newItem]
            };

            // Recalculate using Async Pricing Service
            const margin = (offer.pricing.marginPercentage || 40) / 100;

            // Use PricingService to ensure DB variants are respected
            const newPricing = await PricingService.calculateOfferPrice(
                updatedProduct,
                margin,
                offer.snowZone,
                offer.customer.postalCode
            );

            // Preserve order costs if any (as they might not be in base calc)
            newPricing.orderCosts = offer.pricing.orderCosts;
            newPricing.measurementCost = offer.pricing.measurementCost;
            // Also preserve installation costs if manual overrides exist? 
            // For now trusting service calc for installation.

            const updatedOffer = {
                ...offer,
                product: updatedProduct,
                pricing: newPricing,
                updatedAt: new Date()
            };

            // Update DB
            await DatabaseService.updateOffer(updatedOffer.id, {
                product: updatedProduct,
                pricing: newPricing
            });

            // Update Parent
            onOfferUpdate(updatedOffer);

            // Reset Form
            setNewItemName('');
            setNewItemPrice('');
            setNewItemQty('1');
            setShowCustomItemForm(false);
            toast.success('Dodano pozycję');
        } catch (e) {
            console.error(e);
            toast.error('Błąd dodawania pozycji');
        }
    };

    const handleRemoveCustomItem = async (itemId: string) => {
        if (!onOfferUpdate) return;
        try {
            const updatedProduct = {
                ...offer.product,
                customItems: (offer.product.customItems || []).filter(i => i.id !== itemId)
            };

            const margin = (offer.pricing.marginPercentage || 40) / 100;
            const newPricing = await PricingService.calculateOfferPrice(
                updatedProduct,
                margin,
                offer.snowZone,
                offer.customer.postalCode
            );

            // Preserve costs
            newPricing.orderCosts = offer.pricing.orderCosts;
            newPricing.measurementCost = offer.pricing.measurementCost;

            const updatedOffer = {
                ...offer,
                product: updatedProduct,
                pricing: newPricing,
                updatedAt: new Date()
            };

            await DatabaseService.updateOffer(updatedOffer.id, {
                product: updatedProduct,
                pricing: newPricing
            });

            onOfferUpdate(updatedOffer);
            toast.success('Usunięto pozycję');
        } catch {
            toast.error('Błąd usuwania');
        }
    };

    const handleManualSave = async () => {
        if (!onOfferUpdate) return;
        try {
            // Force recalculate and save to be sure
            const margin = (offer.pricing.marginPercentage || 40) / 100;
            const newPricing = await PricingService.calculateOfferPrice(
                offer.product,
                margin,
                offer.snowZone,
                offer.customer.postalCode
            );

            // Preserve costs
            newPricing.orderCosts = offer.pricing.orderCosts;
            newPricing.measurementCost = offer.pricing.measurementCost;

            await DatabaseService.updateOffer(offer.id, {
                pricing: newPricing
            });
            toast.success('Oferta zapisana i przeliczona');
            window.location.reload();
        } catch {
            toast.error('Błąd zapisu');
        }
    };



    const handleCreateContract = async () => {
        setIsCreatingContract(true);
        try {
            const contractPayload = {
                offerId: offer.id,
                status: 'draft' as const,
                client: offer.customer,
                product: offer.product,
                pricing: offer.pricing,
                commission: offer.commission,
                requirements: {
                    constructionProject: false,
                    powerSupply: false,
                    foundation: false
                },
                comments: [],
                attachments: [],
                orderedItems: []
            };

            const newContract = await DatabaseService.createContract(contractPayload);
            toast.success('Umowa została utworzona');
            navigate(`/contracts/${newContract.id}`);
        } catch (error) {
            console.error('Contract creation failed:', error);
            toast.error('Błąd tworzenia umowy');
        } finally {
            setIsCreatingContract(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            await generateOfferPDF(offer);
        } catch (error) {
            console.error('PDF Generation failed:', error);
            toast.error('Błąd generowania PDF');
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
                {/* AI Enhancements */}
                <div className="mb-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm uppercase tracking-wider text-indigo-800 font-semibold flex items-center gap-2">
                            ✨ AI Asystent
                        </h3>
                        {onOfferUpdate && (
                            <button
                                onClick={async () => {
                                    const toastId = toast.loading('Generuję opis...');
                                    try {
                                        const text = await AiService.generateOfferIntro(offer, currentUser);
                                        // Save to offer.settings.aiDescription
                                        const newSettings = { ...(offer.settings || {}), aiDescription: text };

                                        await DatabaseService.updateOffer(offer.id, {
                                            settings: newSettings
                                        });

                                        onOfferUpdate({
                                            ...offer,
                                            settings: newSettings as any
                                        });

                                        toast.success('Opis wygenerowany!', { id: toastId });
                                    } catch (e: any) {
                                        console.error(e);
                                        toast.error(e.message || 'Błąd AI', { id: toastId });
                                    }
                                }}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 transition flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generuj Wstęp
                            </button>
                        )}
                        {onOfferUpdate && (
                            <button
                                onClick={async () => {
                                    const toastId = toast.loading('Generuję maila...');
                                    try {
                                        const text = await AiService.generateEmail(offer, currentUser);
                                        // Simple modal or alert for now
                                        // Copy to clipboard
                                        await navigator.clipboard.writeText(text);
                                        toast.success('Treść maila skopiowana do schowka!', { id: toastId });
                                        alert("Wygenerowana Treść Maila (Skopiowano do schowka):\n\n" + text);
                                    } catch {
                                        toast.error('Błąd generowania maila', { id: toastId });
                                    }
                                }}
                                className="ml-2 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Generuj Maila
                            </button>
                        )}
                    </div>

                    {offer.settings?.aiDescription && (
                        <div className="bg-white p-3 rounded border border-indigo-100 text-sm text-slate-600 italic mb-4">
                            "{offer.settings.aiDescription}"
                        </div>
                    )}

                    <PricingInsights
                        postalCode={offer.customer.postalCode}
                        currentMargin={offer.pricing.marginPercentage || 0.25}
                    />
                </div>

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
                            {/* Custom Items */}
                            {offer.product.customItems?.map((item, idx) => (
                                <tr key={`custom-${idx}`} className="bg-amber-50/50">
                                    <td className="py-4 text-slate-900 pl-2 border-l-2 border-amber-500">
                                        <div className="flex justify-between items-center group">
                                            <span className="font-medium">{item.quantity}x {item.name}</span>
                                            {onOfferUpdate && (
                                                <button onClick={() => handleRemoveCustomItem(item.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 text-slate-900 text-right">
                                        {formatCurrency(item.price * item.quantity)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Add Custom Item Button */}
                    {onOfferUpdate && !showCustomItemForm && (
                        <div className="mt-4 print:hidden">
                            <button
                                onClick={() => setShowCustomItemForm(true)}
                                className="text-sm font-bold text-accent hover:text-accent-dark flex items-center gap-2"
                            >
                                <span>➕ Dodaj własną pozycję</span>
                            </button>
                        </div>
                    )}

                    {/* Custom Item Form */}
                    {showCustomItemForm && (
                        <div className="mt-4 p-4 bg-white border border-accent/20 rounded-lg shadow-sm print:hidden animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold text-slate-700 mb-3">Nowa Pozycja</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-2">
                                    <input
                                        type="text"
                                        placeholder="Nazwa (np. Montaż dodatkowy)"
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        value={newItemName}
                                        onChange={e => setNewItemName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Cena (Netto)"
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        value={newItemPrice}
                                        onChange={e => setNewItemPrice(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Il."
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        value={newItemQty}
                                        onChange={e => setNewItemQty(e.target.value)}
                                    />
                                    <button
                                        onClick={handleAddCustomItem}
                                        className="bg-accent text-white px-3 rounded hover:bg-accent-dark transition-colors"
                                    >
                                        OK
                                    </button>
                                    <button
                                        onClick={() => setShowCustomItemForm(false)}
                                        className="text-slate-400 hover:text-slate-600 px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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

                {/* Profitability Analysis Removed - Moved to Customer Details */}
            </div>

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

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
                <button
                    onClick={onReset}
                    className="text-slate-500 hover:text-slate-700 font-medium"
                >
                    Neues Angebot
                </button>
                <div className="flex gap-3">
                    {/* Manual Save Button */}
                    <button
                        onClick={handleManualSave}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Zapisz Ofertę
                    </button>
                    {/* Contract Conversion Button */}
                    {offer.status === 'sold' && (
                        <button
                            onClick={handleCreateContract}
                            disabled={isCreatingContract}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isCreatingContract ? 'Tworzenie...' : 'Utwórz Umowę'}
                        </button>
                    )}

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
    );
};
