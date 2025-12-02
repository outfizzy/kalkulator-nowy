import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Offer } from '../types';
import { getSalesProfile } from './storage';
import { translate, formatCurrency } from './translations';

// Helper to add logo and header to each page
function addHeader(doc: jsPDF, pageNumber: number) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add logo
    try {
        const logoImg = new Image();
        logoImg.src = '/logo.png';
        // Logo dimensions: width 60mm, height auto (maintaining aspect ratio)
        doc.addImage(logoImg, 'PNG', 15, 10, 60, 15);
    } catch (e) {
        // If logo fails, add text header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('PolenDach24', 15, 20);
    }

    // Add page number in top right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(`Seite ${pageNumber}`, pageWidth - 15, 15, { align: 'right' });

    // Reset text color
    doc.setTextColor(0);
}

// Helper to check if we need a new page
function checkAndAddPage(doc: jsPDF, currentY: number, requiredSpace: number, pageNumber: number): { y: number; page: number } {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 20;

    if (currentY + requiredSpace > pageHeight - bottomMargin) {
        doc.addPage();
        pageNumber++;
        addHeader(doc, pageNumber);
        return { y: 35, page: pageNumber }; // Start below header
    }
    return { y: currentY, page: pageNumber };
}

export async function generateOfferPDF(offer: Offer) {
    const profile = getSalesProfile();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 35; // Start position after header
    let pageNumber = 1;

    // Add header to first page
    addHeader(doc, pageNumber);

    // Date formatting
    const dateStr = new Date(offer.createdAt).toLocaleDateString('de-DE');

    // Offer title and number
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ANGEBOT', pageWidth - 15, currentY, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    currentY += 6;
    doc.text(`Nr: #${offer.id.substring(0, 8)}`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 5;
    doc.text(`Datum: ${dateStr}`, pageWidth - 15, currentY, { align: 'right' });

    currentY += 10;

    // Customer and Seller addresses (side by side)
    const leftCol = 15;
    const rightCol = pageWidth / 2 + 5;

    // Customer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('KUNDE', leftCol, currentY);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    currentY += 6;
    doc.text(`${offer.customer.salutation} ${offer.customer.firstName} ${offer.customer.lastName}`, leftCol, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    currentY += 5;
    doc.text(`${offer.customer.street} ${offer.customer.houseNumber}`, leftCol, currentY);
    currentY += 4;
    doc.text(`${offer.customer.postalCode} ${offer.customer.city}`, leftCol, currentY);
    currentY += 4;
    doc.text(offer.customer.country, leftCol, currentY);
    currentY += 5;
    doc.setTextColor(100);
    doc.text(offer.customer.email, leftCol, currentY);
    currentY += 4;
    doc.text(offer.customer.phone, leftCol, currentY);
    doc.setTextColor(0);

    // Seller (on the right side, aligned top)
    let sellerY = currentY - 33; // Reset to customer start position
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('VERKÄUFER', rightCol, sellerY);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    sellerY += 6;

    if (profile) {
        doc.text(`${profile.firstName} ${profile.lastName}`, rightCol, sellerY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        sellerY += 5;
        doc.text('PolenDach24 Vertreter', rightCol, sellerY);
        sellerY += 5;
        doc.setTextColor(100);
        doc.text(profile.email, rightCol, sellerY);
        sellerY += 4;
        doc.text(profile.phone || '', rightCol, sellerY);
    } else {
        doc.text('PolenDach24', rightCol, sellerY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        sellerY += 5;
        doc.text('Kundenservice', rightCol, sellerY);
        sellerY += 5;
        doc.setTextColor(100);
        doc.text('kontakt@polendach24.de', rightCol, sellerY);
    }
    doc.setTextColor(0);

    currentY += 15;

    // Check if we need a new page
    const check1 = checkAndAddPage(doc, currentY, 50, pageNumber);
    currentY = check1.y;
    pageNumber = check1.page;

    // Product Specification Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUKTSPEZIFIKATION', leftCol, currentY);
    currentY += 7;

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

    // Specification table
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
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'normal', textColor: [100, 100, 100], cellWidth: 50 },
            1: { fontStyle: 'bold', textColor: [0, 0, 0] }
        },
        margin: { left: leftCol }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Check if we need a new page
    const check2 = checkAndAddPage(doc, currentY, 40, pageNumber);
    currentY = check2.y;
    pageNumber = check2.page;

    // Addons Section (if any)
    if (offer.product.addons.length > 0 || (offer.product.selectedAccessories && offer.product.selectedAccessories.length > 0)) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ZUSATZAUSSTATTUNG', leftCol, currentY);
        currentY += 7;

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
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: pageWidth - 70 },
                1: { halign: 'right', cellWidth: 40 }
            },
            margin: { left: leftCol, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Installation Section (if any)
    if (offer.pricing.installationCosts) {
        const check3 = checkAndAddPage(doc, currentY, 35, pageNumber);
        currentY = check3.y;
        pageNumber = check3.page;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MONTAGE', leftCol, currentY);
        currentY += 7;

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
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: pageWidth - 70 },
                1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
            },
            margin: { left: leftCol, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Pricing Summary
    const check4 = checkAndAddPage(doc, currentY, 50, pageNumber);
    currentY = check4.y;
    pageNumber = check4.page;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PREISZUSAMMENFASSUNG', leftCol, currentY);
    currentY += 10;

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
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { textColor: [100, 100, 100], cellWidth: pageWidth - 70 },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
        },
        margin: { left: leftCol, right: 15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;

    // Grand Total with background
    doc.setFillColor(241, 245, 249);
    doc.rect(leftCol, currentY, pageWidth - 30, 12, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GESAMTPREIS (BRUTTO):', leftCol + 3, currentY + 8);
    doc.setTextColor(0, 102, 204);
    doc.text(formatCurrency(offer.pricing.sellingPriceGross), pageWidth - 18, currentY + 8, { align: 'right' });
    doc.setTextColor(0);

    currentY += 20;

    // Footer / Terms
    const check5 = checkAndAddPage(doc, currentY, 25, pageNumber);
    currentY = check5.y;
    pageNumber = check5.page;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    const footerText = [
        'Dieses Angebot ist 30 Tage gültig.',
        'Zahlungsbedingungen: 30% Anzahlung, 70% bei Lieferung.',
        'Bei Fragen kontaktieren Sie uns gerne.'
    ];

    footerText.forEach((line, i) => {
        doc.text(line, pageWidth / 2, currentY + (i * 5), { align: 'center' });
    });

    // Save the PDF
    doc.save(`Angebot_Polendach24_${offer.id.substring(0, 8)}.pdf`);
}
