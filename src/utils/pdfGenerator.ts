import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Offer } from '../types';
import { getSalesProfile } from './storage';
import { translate, formatCurrency } from './translations';

// Define colors for consistent branding
const COLORS = {
    primary: [0, 102, 204] as [number, number, number], // Blue
    secondary: [71, 85, 105] as [number, number, number], // Slate
    accent: [59, 130, 246] as [number, number, number], // Light blue
    text: [15, 23, 42] as [number, number, number], // Dark slate
    textLight: [100, 116, 139] as [number, number, number], // Medium slate
    background: [248, 250, 252] as [number, number, number], // Light gray
    border: [226, 232, 240] as [number, number, number], // Border gray
};

// Helper to load fonts
async function loadFonts(doc: jsPDF) {
    const loadFont = async (path: string, name: string, style: string) => {
        try {
            const response = await fetch(path);
            const blob = await response.blob();
            const reader = new FileReader();

            return new Promise<void>((resolve) => {
                reader.onloadend = () => {
                    const base64data = (reader.result as string).split(',')[1];
                    doc.addFileToVFS(`${name}-${style}.ttf`, base64data);
                    doc.addFont(`${name}-${style}.ttf`, name, style);
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Failed to load font ${path}:`, error);
            // Fallback to helvetica if font loading fails
        }
    };

    await Promise.all([
        loadFont('/fonts/Roboto-Regular.ttf', 'Roboto', 'normal'),
        loadFont('/fonts/Roboto-Bold.ttf', 'Roboto', 'bold')
    ]);
}

// Helper to add logo and header to each page
function addHeader(doc: jsPDF, pageNumber: number) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add subtle background for header
    doc.setFillColor(...COLORS.background);
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Add logo
    try {
        const logoImg = new Image();
        logoImg.src = '/logo.png';
        doc.addImage(logoImg, 'PNG', 15, 8, 60, 15);
    } catch (e) {
        // If logo fails, add text header with better styling
        doc.setFontSize(20);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('PolenDach24', 15, 18);
    }

    // Add page number in top right with styling
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...COLORS.textLight);
    doc.text(`Seite ${pageNumber}`, pageWidth - 15, 18, { align: 'right' });

    // Add decorative line under header
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(15, 28, pageWidth - 15, 28);

    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
}

// Helper to check if we need a new page
function checkAndAddPage(doc: jsPDF, currentY: number, requiredSpace: number, pageNumber: number): { y: number; page: number } {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 25;

    if (currentY + requiredSpace > pageHeight - bottomMargin) {
        doc.addPage();
        pageNumber++;
        addHeader(doc, pageNumber);
        return { y: 40, page: pageNumber }; // Start below header
    }
    return { y: currentY, page: pageNumber };
}

// Helper to add a section title with styling
function addSectionTitle(doc: jsPDF, title: string, y: number, leftMargin: number = 15): number {
    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text(title, leftMargin, y);
    doc.setTextColor(0, 0, 0);
    return y + 8;
}

export async function generateOfferPDF(offer: Offer) {
    const profile = getSalesProfile();
    const doc = new jsPDF('p', 'mm', 'a4');

    // Load fonts first
    await loadFonts(doc);
    doc.setFont('Roboto'); // Set default font

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40; // Start position after header
    let pageNumber = 1;

    // Add header to first page
    addHeader(doc, pageNumber);

    // Date formatting
    const dateStr = new Date(offer.createdAt).toLocaleDateString('de-DE');

    // Offer title box (visually enhanced)
    const titleBoxHeight = 25;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(pageWidth - 80, currentY - 5, 65, titleBoxHeight, 3, 3, 'F');

    doc.setFontSize(16);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ANGEBOT', pageWidth - 47.5, currentY + 3, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.text(`Nr: #${offer.id.substring(0, 8)}`, pageWidth - 47.5, currentY + 10, { align: 'center' });
    doc.text(`Datum: ${dateStr}`, pageWidth - 47.5, currentY + 16, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    currentY += 30;

    // Customer and Seller addresses with boxes
    const leftCol = 15;
    const rightCol = pageWidth / 2 + 5;
    const boxHeight = 45;

    // Customer box
    doc.setFillColor(...COLORS.background);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(leftCol, currentY, (pageWidth / 2) - 20, boxHeight, 2, 2, 'FD');

    // Seller box
    doc.roundedRect(rightCol, currentY, (pageWidth / 2) - 10, boxHeight, 2, 2, 'FD');

    let boxY = currentY + 5;

    // Customer
    doc.setFontSize(8);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...COLORS.textLight);
    doc.text('KUNDE', leftCol + 3, boxY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10);
    boxY += 5;
    doc.text(`${offer.customer.salutation} ${offer.customer.firstName} ${offer.customer.lastName}`, leftCol + 3, boxY);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    boxY += 4;
    doc.text(`${offer.customer.street} ${offer.customer.houseNumber}`, leftCol + 3, boxY);
    boxY += 4;
    doc.text(`${offer.customer.postalCode} ${offer.customer.city}`, leftCol + 3, boxY);
    boxY += 4;
    doc.text(offer.customer.country, leftCol + 3, boxY);
    boxY += 5;
    doc.setTextColor(...COLORS.textLight);
    doc.setFontSize(7);
    doc.text(offer.customer.email, leftCol + 3, boxY);
    boxY += 3;
    doc.text(offer.customer.phone, leftCol + 3, boxY);
    doc.setTextColor(0, 0, 0);

    // Seller
    let sellerBoxY = currentY + 5;
    doc.setFontSize(8);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...COLORS.textLight);
    doc.text('VERKÄUFER', rightCol + 3, sellerBoxY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10);
    sellerBoxY += 5;

    if (profile) {
        doc.text(`${profile.firstName} ${profile.lastName}`, rightCol + 3, sellerBoxY);
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(8);
        sellerBoxY += 4;
        doc.text('PolenDach24 Vertreter', rightCol + 3, sellerBoxY);
        sellerBoxY += 5;
        doc.setTextColor(...COLORS.textLight);
        doc.setFontSize(7);
        doc.text(profile.email, rightCol + 3, sellerBoxY);
        sellerBoxY += 3;
        doc.text(profile.phone || '', rightCol + 3, sellerBoxY);
    } else {
        doc.text('PolenDach24', rightCol + 3, sellerBoxY);
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(8);
        sellerBoxY += 4;
        doc.text('Kundenservice', rightCol + 3, sellerBoxY);
        sellerBoxY += 5;
        doc.setTextColor(...COLORS.textLight);
        doc.setFontSize(7);
        doc.text('kontakt@polendach24.de', rightCol + 3, sellerBoxY);
    }
    doc.setTextColor(0, 0, 0);

    currentY += boxHeight + 12;

    // Check if we need a new page
    const check1 = checkAndAddPage(doc, currentY, 50, pageNumber);
    currentY = check1.y;
    pageNumber = check1.page;

    // Product Specification Section
    currentY = addSectionTitle(doc, 'PRODUKTSPEZIFIKATION', currentY);

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

    // Specification table with better styling
    const specData = [
        ['Modell:', modelName.toUpperCase()],
        ['Abmessungen:', `${offer.product.width} mm × ${offer.product.projection} mm`],
    ];

    if (offer.product.postsHeight) {
        specData.push(['Pfostenhöhe:', `${offer.product.postsHeight} mm`]);
    }

    specData.push(
        ['Farbe:', colorName],
        ['Dachtyp:', `${roofName}${roofDetail ? ' - ' + roofDetail : ''}`],
        ['Montageart:', installationType],
        ['Schneelastzone:', `Zone ${offer.snowZone.id} (${offer.snowZone.value} kN/m²)`]
    );

    autoTable(doc, {
        startY: currentY,
        head: [],
        body: specData,
        theme: 'plain',
        styles: {
            font: 'Roboto',
            fontSize: 9,
            cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
            lineColor: COLORS.border,
            lineWidth: 0.1
        },
        columnStyles: {
            0: { fontStyle: 'normal', textColor: COLORS.textLight, cellWidth: 55 },
            1: { fontStyle: 'bold', textColor: COLORS.text }
        },
        margin: { left: leftCol },
        alternateRowStyles: { fillColor: COLORS.background }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Check if we need a new page
    const check2 = checkAndAddPage(doc, currentY, 40, pageNumber);
    currentY = check2.y;
    pageNumber = check2.page;

    // Addons Section (if any)
    if (offer.product.addons.length > 0 || (offer.product.selectedAccessories && offer.product.selectedAccessories.length > 0)) {
        currentY = addSectionTitle(doc, 'ZUSATZAUSSTATTUNG', currentY);

        const addonsData: any[] = [];

        offer.product.addons.forEach(addon => {
            const name = addon.variant ? `${addon.name} (${addon.variant})` : addon.name;
            addonsData.push([name, formatCurrency(addon.price)]);
        });

        if (offer.product.selectedAccessories) {
            offer.product.selectedAccessories.forEach(acc => {
                addonsData.push([`${acc.quantity}× ${acc.name}`, formatCurrency(acc.price * acc.quantity)]);
            });
        }

        autoTable(doc, {
            startY: currentY,
            head: [['Position', 'Preis']],
            body: addonsData,
            theme: 'grid',
            styles: {
                font: 'Roboto',
                fontSize: 9,
                cellPadding: 3,
                lineColor: COLORS.border,
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: COLORS.primary,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left'
            },
            alternateRowStyles: { fillColor: COLORS.background },
            columnStyles: {
                0: { cellWidth: pageWidth - 75 },
                1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' }
            },
            margin: { left: leftCol, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Installation Section (if any)
    if (offer.pricing.installationCosts) {
        const check3 = checkAndAddPage(doc, currentY, 35, pageNumber);
        currentY = check3.y;
        pageNumber = check3.page;

        currentY = addSectionTitle(doc, 'MONTAGE', currentY);

        const installData = [
            [`Montage (${offer.product.installationDays} Tage)`, formatCurrency(offer.pricing.installationCosts.dailyTotal)],
            [`Anfahrt (${offer.pricing.installationCosts.travelDistance} km)`, formatCurrency(offer.pricing.installationCosts.travelCost)],
            ['Gesamt Montage:', formatCurrency(offer.pricing.installationCosts.totalInstallation)]
        ];

        autoTable(doc, {
            startY: currentY,
            head: [],
            body: installData,
            theme: 'plain',
            styles: {
                font: 'Roboto',
                fontSize: 9,
                cellPadding: 3,
                lineColor: COLORS.border,
                lineWidth: 0.1
            },
            columnStyles: {
                0: { cellWidth: pageWidth - 75, textColor: COLORS.textLight },
                1: { halign: 'right', fontStyle: 'bold', cellWidth: 45, textColor: COLORS.text }
            },
            margin: { left: leftCol, right: 15 },
            alternateRowStyles: { fillColor: COLORS.background }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Pricing Summary
    const check4 = checkAndAddPage(doc, currentY, 55, pageNumber);
    currentY = check4.y;
    pageNumber = check4.page;

    currentY = addSectionTitle(doc, 'PREISZUSAMMENFASSUNG', currentY);

    const vatAmount = (offer.pricing?.sellingPriceGross ?? 0) - (offer.pricing?.sellingPriceNet ?? 0);

    const pricingData = [
        ['Nettopreis:', formatCurrency(offer.pricing.sellingPriceNet)],
        ['MwSt. (19%):', formatCurrency(vatAmount)],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [],
        body: pricingData,
        theme: 'plain',
        styles: {
            font: 'Roboto',
            fontSize: 10,
            cellPadding: 4,
            lineColor: COLORS.border,
            lineWidth: 0.1
        },
        columnStyles: {
            0: { textColor: COLORS.textLight, cellWidth: pageWidth - 75 },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 45, textColor: COLORS.text }
        },
        margin: { left: leftCol, right: 15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3;

    // Grand Total with enhanced styling
    const totalBoxHeight = 15;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(leftCol, currentY, pageWidth - 30, totalBoxHeight, 2, 2, 'F');

    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('GESAMTPREIS (BRUTTO):', leftCol + 4, currentY + 9);

    doc.setFontSize(16);
    doc.text(formatCurrency(offer.pricing.sellingPriceGross), pageWidth - 18, currentY + 9.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    currentY += totalBoxHeight + 15;

    // Footer / Terms
    const check5 = checkAndAddPage(doc, currentY, 30, pageNumber);
    currentY = check5.y;
    pageNumber = check5.page;

    // Add decorative line above footer
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(leftCol, currentY, pageWidth - 15, currentY);
    currentY += 5;

    doc.setFontSize(7);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...COLORS.textLight);
    const footerText = [
        'Dieses Angebot ist 30 Tage gültig.',
        'Zahlungsbedingungen: 30% Anzahlung, 70% bei Lieferung.',
        'Bei Fragen kontaktieren Sie uns gerne unter kontakt@polendach24.de'
    ];

    footerText.forEach((line, i) => {
        doc.text(line, pageWidth / 2, currentY + (i * 4), { align: 'center' });
    });

    // Save the PDF with proper encoding for Polish/German characters
    doc.save(`Angebot_Polendach24_${offer.id.substring(0, 8)}.pdf`);
}
