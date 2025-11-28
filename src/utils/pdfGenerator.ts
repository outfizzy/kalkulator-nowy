import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Offer } from '../types';
import { getSalesProfile } from './storage';
import { translations, translate, formatCurrency } from './translations';

export async function generateOfferPDF(offer: Offer) {
    const profile = getSalesProfile();

    // Create a temporary container for the PDF content
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // A4 width at 96 DPI (approx)
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'Inter, sans-serif';

    const dateStr = new Date(offer.createdAt).toLocaleDateString('de-DE');

    // Prepare product details
    const modelName = translate(offer.product.modelId, 'models');
    const colorName = translate(offer.product.color, 'colors');
    const roofName = translate(offer.product.roofType, 'roofTypes');

    let roofDetail = '';
    if (offer.product.roofType === 'polycarbonate' && offer.product.polycarbonateType) {
        roofDetail = translate(offer.product.polycarbonateType, 'polycarbonateTypes');
    } else if (offer.product.roofType === 'glass' && offer.product.glassType) {
        roofDetail = translate(offer.product.glassType, 'glassTypes');
    }

    const installationType = translate(offer.product.installationType, 'installationTypes');

    const addonsHtml = (offer.product.addons.length > 0 || (offer.product.selectedAccessories && offer.product.selectedAccessories.length > 0))
        ? `
        <div class="mb-6">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">${translations.addons}</h3>
            <table class="w-full text-sm border-collapse">
                <thead class="bg-slate-100 text-slate-600">
                    <tr>
                        <th class="p-2 text-left">Position</th>
                        <th class="p-2 text-right">Preis</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${offer.product.addons.map(addon => `
                        <tr>
                            <td class="p-2 text-slate-800">
                                <span class="font-medium">${addon.name}</span>
                                ${addon.variant ? `<span class="text-slate-500 text-xs ml-1">(${addon.variant})</span>` : ''}
                            </td>
                            <td class="p-2 text-right text-slate-800 font-medium">${formatCurrency(addon.price)}</td>
                        </tr>
                    `).join('')}
                    ${offer.product.selectedAccessories ? offer.product.selectedAccessories.map(acc => `
                        <tr>
                            <td class="p-2 text-slate-800">
                                <span class="font-medium">${acc.quantity}x ${acc.name}</span>
                            </td>
                            <td class="p-2 text-right text-slate-800 font-medium">${formatCurrency(acc.price * acc.quantity)}</td>
                        </tr>
                    `).join('') : ''}
                </tbody>
            </table>
        </div>
        `
        : '';

    const installationHtml = offer.pricing.installationCosts
        ? `
        <div class="mb-6">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">${translations.installation}</h3>
            <div class="bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm">
                <div class="flex justify-between mb-1">
                    <span>Montage (${offer.product.installationDays} Tage)</span>
                    <span class="font-medium">${formatCurrency(offer.pricing.installationCosts.dailyTotal)}</span>
                </div>
                <div class="flex justify-between mb-1 text-slate-500 text-xs">
                    <span>Anfahrt (${offer.pricing.installationCosts.travelDistance} km)</span>
                    <span>${formatCurrency(offer.pricing.installationCosts.travelCost)}</span>
                </div>
                <div class="flex justify-between font-bold border-t border-slate-200 pt-2 mt-2">
                    <span>Gesamt Montage</span>
                    <span>${formatCurrency(offer.pricing.installationCosts.totalInstallation)}</span>
                </div>
            </div>
        </div>
        `
        : '';

    container.innerHTML = `
        <div class="p-10 bg-white text-slate-900">
            <!-- Header -->
            <div class="flex justify-between items-start mb-10 border-b border-slate-200 pb-6">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">PolenDach 24</h1>
                    <p class="text-sm text-slate-500 mt-1">Profesjonalne Systemy Zadaszeń</p>
                </div>
                <div class="text-right">
                    <h2 class="text-xl font-bold text-slate-800">${translations.offer}</h2>
                    <p class="text-slate-500 text-sm">Nr: #${offer.id}</p>
                    <p class="text-slate-500 text-sm">${translations.date}: ${dateStr}</p>
                </div>
            </div>

            <!-- Addresses -->
            <div class="grid grid-cols-2 gap-10 mb-10">
                <div>
                    <h3 class="text-xs font-bold text-slate-400 uppercase mb-2">${translations.customer}</h3>
                    <div class="text-sm text-slate-800 leading-relaxed">
                        <p class="font-bold text-base">${offer.customer.salutation} ${offer.customer.firstName} ${offer.customer.lastName}</p>
                        <p>${offer.customer.street} ${offer.customer.houseNumber}</p>
                        <p>${offer.customer.postalCode} ${offer.customer.city}</p>
                        <p>${offer.customer.country}</p>
                        <p class="mt-2 text-slate-500">${offer.customer.email}</p>
                        <p class="text-slate-500">${offer.customer.phone}</p>
                    </div>
                </div>
                <div class="text-right">
                    <h3 class="text-xs font-bold text-slate-400 uppercase mb-2">${translations.seller}</h3>
                    <div class="text-sm text-slate-800 leading-relaxed">
                        ${profile ? `
                            <p class="font-bold text-base">${profile.firstName} ${profile.lastName}</p>
                            <p>PolenDach 24 Representative</p>
                            <p class="mt-2">${profile.email}</p>
                            <p>${profile.phone}</p>
                        ` : `
                            <p class="font-bold text-base">PolenDach 24</p>
                            <p>Kundenservice</p>
                            <p>kontakt@polendach24.de</p>
                        `}
                    </div>
                </div>
            </div>

            <!-- Product Specs -->
            <div class="mb-8">
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">${translations.specification}</h3>
                <div class="bg-slate-50 rounded-lg p-6 border border-slate-100">
                    <div class="grid grid-cols-2 gap-y-4 text-sm">
                        <div class="text-slate-500">${translations.model}:</div>
                        <div class="font-bold text-slate-900 uppercase">${modelName}</div>
                        
                        <div class="text-slate-500">${translations.dimensions}:</div>
                        <div class="font-bold text-slate-900">${offer.product.width} mm x ${offer.product.projection} mm</div>
                        
                        ${offer.product.postsHeight ? `
                        <div class="text-slate-500">Pfostenhöhe:</div>
                        <div class="font-bold text-slate-900">${offer.product.postsHeight} mm</div>
                        ` : ''}

                        <div class="text-slate-500">${translations.color}:</div>
                        <div class="font-bold text-slate-900">${colorName}</div>
                        
                        <div class="text-slate-500">${translations.roofType}:</div>
                        <div class="font-bold text-slate-900">
                            ${roofName} <br/>
                            <span class="text-xs font-normal text-slate-600">${roofDetail}</span>
                        </div>

                        <div class="text-slate-500">Montagetyp:</div>
                        <div class="font-bold text-slate-900">${installationType}</div>

                        <div class="text-slate-500">${translations.snowZone}:</div>
                        <div class="font-bold text-blue-600">
                            Zone ${offer.snowZone.id} (${offer.snowZone.value} kN/m²)
                        </div>
                    </div>
                </div>
            </div>

            <!-- Addons -->
            ${addonsHtml}

            <!-- Installation -->
            ${installationHtml}

            <!-- Pricing Summary -->
            <div class="flex justify-end mt-10">
                <div class="w-1/2 bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <div class="flex justify-between mb-2 text-sm">
                        <span class="text-slate-500">${translations.netPrice}:</span>
                        <span class="font-medium text-slate-900">${formatCurrency(offer.pricing.sellingPriceNet)}</span>
                    </div>
                    <div class="flex justify-between mb-4 text-sm">
                        <span class="text-slate-500">${translations.vat} (19%):</span>
                        <span class="font-medium text-slate-900">${formatCurrency(offer.pricing.sellingPriceGross - offer.pricing.sellingPriceNet)}</span>
                    </div>
                    <div class="border-t border-slate-200 pt-4 flex justify-between items-end">
                        <span class="font-bold text-slate-700">${translations.grossPrice}:</span>
                        <span class="text-3xl font-bold text-primary">${formatCurrency(offer.pricing.sellingPriceGross)}</span>
                    </div>
                </div>
            </div>

            <!-- Footer / Terms -->
            <div class="mt-16 pt-8 border-t border-slate-200 text-xs text-slate-400 text-center">
                <p class="mb-2">${translations.validity} ${translations.paymentTerms}</p>
                <p>${translations.contact}</p>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Angebot_Polendach24_${offer.id}.pdf`);

    } catch (err) {
        console.error("Error generating PDF:", err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
}
