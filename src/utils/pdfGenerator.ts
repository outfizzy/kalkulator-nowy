import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Offer } from '../types';
import { getSalesProfile } from './storage';
import { translate, formatCurrency } from './translations';
import { LOGO_BASE64 } from './assets';

// COPORATE IDENTITY COLORS (Professional & Modern)
const COLORS = {
    primary: [44, 62, 80] as [number, number, number],    // Dark Slate Blue (Professional)
    accent: [229, 142, 38] as [number, number, number],   // Elegant Orange/Gold accent
    text: [30, 30, 30] as [number, number, number],       // Almost Black
    textLight: [100, 100, 100] as [number, number, number], // Gray
    line: [200, 200, 200] as [number, number, number],    // Light Gray for lines
    tableHeader: [240, 240, 240] as [number, number, number] // Very light gray for headers
};



// (Font loading disabled for stability)
// (Image loading disabled for stability - using embedded assets)

// Draw Header on every page (Logo + Line)
function addPageHeader(doc: jsPDF, logoBase64: string | null) {
    const pageWidth = doc.internal.pageSize.getWidth();

    try {
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 140, 10, 50, 12);
        } else {
            // Text Fallback
            doc.setFontSize(18);
            doc.setTextColor(...COLORS.primary);
            doc.setFont('Helvetica', 'bold');
            doc.text(sanitizeText('PolenDach24'), 140, 20);
        }
    } catch (err) {
        console.warn("Header generation failed", err);
    }

    // Thin line below header area
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.1);
    doc.line(20, 30, pageWidth - 20, 30);
}

// Draw Footer (3 Columns: Address, Contact, Bank/Reg)
function addPageFooter(doc: jsPDF, pageNumber: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 35;

    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.1);
    doc.line(20, footerY, pageWidth - 20, footerY);

    const safeFont = doc.getFont().fontName === 'Roboto' ? 'Roboto' : 'Helvetica';

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont(safeFont, 'normal');

    const colY = footerY + 5;
    const colW = (pageWidth - 40) / 3;

    // Col 1: Company Address
    doc.setFont(safeFont, 'bold');
    doc.text(sanitizeText('PolenDach24'), 20, colY);
    doc.setFont(safeFont, 'normal');
    doc.text(sanitizeText('Musterstraße 123'), 20, colY + 4);
    doc.text(sanitizeText('12345 Berlin'), 20, colY + 8);
    doc.text(sanitizeText('Deutschland'), 20, colY + 12);

    // Col 2: Contact
    doc.setFont(safeFont, 'bold');
    doc.text(sanitizeText('Kontakt'), 20 + colW, colY);
    doc.setFont(safeFont, 'normal');
    doc.text(sanitizeText('Tel: +49 123 456 789'), 20 + colW, colY + 4);
    doc.text(sanitizeText('Email: kontakt@polendach24.de'), 20 + colW, colY + 8);
    doc.text(sanitizeText('Web: www.polendach24.de'), 20 + colW, colY + 12);

    // Col 3: Bank / Legal
    doc.setFont(safeFont, 'bold');
    doc.text(sanitizeText('Bankverbindung'), 20 + (colW * 2), colY);
    doc.setFont(safeFont, 'normal');
    doc.text(sanitizeText('Volksbank'), 20 + (colW * 2), colY + 4);
    doc.text(sanitizeText('IBAN: DE00 0000 0000 0000 00'), 20 + (colW * 2), colY + 8);
    doc.text(sanitizeText('BIC: AAAAAAAAAA'), 20 + (colW * 2), colY + 12);

    // Page count centered bottom
    doc.text(sanitizeText(`Seite ${pageNumber}`), pageWidth / 2, pageHeight - 5, { align: 'center' });
}

// Helpers for layout
const MARGIN = 20;
const CONTENT_START_Y = 40;

export async function generateOfferPDF(offer: Offer) {
    try {
        const doc = await createDocument(offer);
        const safeId = offer.id ? offer.id.substring(0, 7) : 'draft';
        doc.save(`Angebot_${safeId}.pdf`);
    } catch (e) {
        console.error("CRITICAL PDF GENERATION FAILURE", e);
        const msg = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : '';
        alert(`Błąd generowania PDF: ${msg}\n\n${stack ? 'Szczegóły w konsoli.' : ''}`);
    }
}

export async function generateOfferPDFData(offer: Offer): Promise<string> {
    try {
        const doc = await createDocument(offer);
        return doc.output('datauristring');
    } catch (e) {
        console.error("CRITICAL PDF GENERATION FAILURE", e);
        // Throw actual error message for debugging
        if (e instanceof Error) {
            throw new Error(`PDF Generation Failed: ${e.message}`);
        }
        throw new Error(`PDF Generation Failed: ${String(e)}`);
    }
}

// SAFE STRING CONVERTER
function safeStr(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val);
}

// Sanitize text for standard fonts (strip Polish diacritics)
function sanitizeText(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        '€': 'EUR' // Euro sign often fails in standard fonts
    };
    return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ€]/g, m => map[m] || m);
}

// (Removed unused safeText helper)

async function createDocument(offer: Offer): Promise<jsPDF> {
    // 1. SAFE DATA EXTRACTION
    const profile = getSalesProfile();

    // 2. SETUP DOCUMENT
    const doc = new jsPDF('p', 'mm', 'a4');

    // 3. FONT LOADING STRATEGY
    // CRITICAL FIX: Custom fonts are corrupt/HTML. Forcing standard font to prevent crash.
    // const customFontsLoaded = await loadFonts(doc); 
    const customFontsLoaded = false;
    const fontFamily = customFontsLoaded ? 'Roboto' : 'Helvetica';

    doc.setFont(fontFamily);

    // 4. IMAGE LOADING
    // Bypass fetch, use embedded asset
    const logoBase64 = LOGO_BASE64;

    let currentY = CONTENT_START_Y;

    const pageWidth = doc.internal.pageSize.getWidth();

    // --- PAGE 1 SETUP ---
    addPageHeader(doc, logoBase64);

    // 1. Sender Line (Tiny above address) - Standard DIN 5008
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.textLight);
    doc.text('PolenDach24 - Musterstraße 123 - 12345 Berlin', MARGIN, currentY + 5);

    // 2. Recipient Address Block
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.setFont(fontFamily, 'normal');

    let addrY = currentY + 15;
    const c = offer.customer || {} as any; // Safe empty obj

    // Defensive coding for address
    const compName = safeStr(c.companyName);
    if (compName) {
        doc.text(sanitizeText(compName), MARGIN, addrY);
        addrY += 5;
    }

    const salutation = safeStr(c.salutation);
    const firstName = safeStr(c.firstName);
    const lastName = safeStr(c.lastName);

    let recipientName = `${salutation} ${firstName} ${lastName}`.trim();
    if (!recipientName) recipientName = "Kunde"; // Ultimate fallback

    doc.text(sanitizeText(recipientName), MARGIN, addrY);
    addrY += 5;

    const street = safeStr(c.street);
    const houseNumber = safeStr(c.houseNumber);
    doc.text(sanitizeText(`${street} ${houseNumber}`.trim()), MARGIN, addrY);
    addrY += 5;

    const postalCode = safeStr(c.postalCode);
    const city = safeStr(c.city);
    doc.text(sanitizeText(`${postalCode} ${city}`.trim()), MARGIN, addrY);
    addrY += 5;

    const country = safeStr(c.country) || 'Deutschland';
    doc.text(sanitizeText(country), MARGIN, addrY);

    // 3. Info Block (Right side)
    const infoX = pageWidth - MARGIN - 70; // 70mm width
    const infoY = currentY + 10;

    doc.setFontSize(10);
    // Labels
    doc.setTextColor(...COLORS.textLight);
    doc.text('Datum:', infoX, infoY);
    doc.text('Kundennummer:', infoX, infoY + 6);
    doc.text('Angebotsnummer:', infoX, infoY + 12);
    doc.text('Ihr Ansprechpartner:', infoX, infoY + 18);

    // Values
    doc.setTextColor(...COLORS.text);
    doc.text(new Date().toLocaleDateString('de-DE'), infoX + 35, infoY);

    // Safe check for customerId
    const customerIdStr = safeStr((offer as any).customerId || c.id);
    doc.text(customerIdStr ? customerIdStr.substring(0, 8).toUpperCase() : '-', infoX + 35, infoY + 6);

    const offerIdStr = safeStr(offer.id);
    doc.text(offerIdStr ? offerIdStr.substring(0, 8).toUpperCase() : '-', infoX + 35, infoY + 12);

    const contactName = profile ? `${safeStr(profile.firstName)} ${safeStr(profile.lastName)}` : 'Kundenservice';
    doc.text(sanitizeText(contactName), infoX + 35, infoY + 18);

    // 4. Offer Title / Subject
    currentY = 100; // Fixed position usually around 98mm-100mm
    doc.setFontSize(14);
    doc.setFont(fontFamily, 'bold');
    doc.text(sanitizeText(`Angebot #${offerIdStr ? offerIdStr.substring(0, 8).toUpperCase() : ''}`), MARGIN, currentY);

    doc.setFontSize(11);
    doc.setFont(fontFamily, 'normal');
    currentY += 8;

    // Safeguard product model
    const modelId = offer.product ? offer.product.modelId : '';
    const translatedModel = modelId ? translate(modelId, 'models') : 'Unbekanntes Modell';
    doc.text(sanitizeText(`Projekt: Terrassenüberdachung - ${translatedModel}`), MARGIN, currentY);

    // 5. Intro Text
    currentY += 15;
    doc.setFontSize(10);

    // 5. Intro Text
    currentY += 15;
    doc.setFontSize(10);

    // Check for AI Description
    if (offer.settings?.aiDescription) {
        const aiText = safeStr(offer.settings.aiDescription);
        const splitText = doc.splitTextToSize(sanitizeText(aiText), pageWidth - (MARGIN * 2));
        doc.text(splitText, MARGIN, currentY);
        // Adjust Y based on lines count
        currentY += (splitText.length * 5) + 5;

        // Add bridge sentence if not present in AI text (optional, but good for consistency)
        // doc.text('Gerne unterbreiten wir Ihnen folgendes freibleibendes Angebot:', MARGIN, currentY);
    } else {
        // Standard Fallback Text
        let greeting = 'Sehr geehrte Damen und Herren,';
        if (salutation === 'Firma') {
            greeting = 'Sehr geehrte Damen und Herren,';
        } else if (lastName) {
            const suffix = salutation === 'Herr' ? 'r' : '';
            if (salutation === 'Herr' || salutation === 'Frau') {
                greeting = `Sehr geehrte${suffix} ${salutation} ${lastName},`;
            }
        }

        doc.text(sanitizeText(greeting), MARGIN, currentY);
        currentY += 6;
        doc.text(sanitizeText('vielen Dank für Ihre Anfrage und das damit verbundene Interesse an unseren Produkten.'), MARGIN, currentY);
        currentY += 5;
        doc.text(sanitizeText('Gerne unterbreiten wir Ihnen folgendes freibleibendes Angebot:'), MARGIN, currentY);
    }

    currentY += 10;

    // 6. Product Table
    // Define table content
    const tableBody = [];

    // Main Product
    const width = offer.product ? safeStr(offer.product.width) : '0';
    const projection = offer.product ? safeStr(offer.product.projection) : '0';
    const color = offer.product ? translate(safeStr(offer.product.color), 'colors') : '-';

    let roofDesc = '-';
    if (offer.product) {
        roofDesc = translate(safeStr(offer.product.roofType), 'roofTypes');
        if (offer.product.roofType === 'polycarbonate' && offer.product.polycarbonateType) {
            roofDesc += ` (${translate(offer.product.polycarbonateType, 'polycarbonateTypes')})`;
        } else if (offer.product.roofType === 'glass' && offer.product.glassType) {
            roofDesc += ` (${translate(offer.product.glassType, 'glassTypes')})`;
        }
    }

    const basePrice = offer.pricing ? offer.pricing.basePrice : 0;

    tableBody.push([
        '1',
        `Terrassenüberdachung Modell "${translatedModel}"\n` +
        `Maße: ${width}mm x ${projection}mm\n` +
        `Farbe: ${color}\n` +
        `Dacheindeckung: ${roofDesc}`,
        formatCurrency(basePrice)
    ]);

    // Consolidate Addons & Custom Items
    let pos = 2;
    if (offer.product && offer.product.addons) {
        offer.product.addons.forEach(addon => {
            const variant = safeStr(addon.variant);
            const name = variant ? `${addon.name} (${variant})` : addon.name;
            tableBody.push([
                String(pos),
                safeStr(name),
                formatCurrency(addon.price)
            ]);
            pos++;
        });
    }

    if (offer.product && offer.product.selectedAccessories) {
        offer.product.selectedAccessories.forEach(acc => {
            tableBody.push([
                String(pos),
                `${acc.quantity}x ${safeStr(acc.name)}`,
                formatCurrency(acc.price * acc.quantity)
            ]);
            pos++;
        });
    }

    if (offer.product && offer.product.customItems) {
        offer.product.customItems.forEach(item => {
            tableBody.push([
                String(pos),
                `${item.quantity}x ${safeStr(item.name)}`,
                formatCurrency(item.price * item.quantity)
            ]);
            pos++;
        });
    }

    // Installation
    if (offer.pricing && offer.pricing.installationCosts) {
        const days = safeStr(offer.product.installationDays);
        const dist = safeStr(offer.pricing.installationCosts.travelDistance);
        tableBody.push([
            String(pos),
            `Montage & Lieferung\n` +
            `- Montage (${days} Tage)\n` +
            `- Anfahrt (${dist} km)`,
            formatCurrency(offer.pricing.installationCosts.totalInstallation)
        ]);
        pos++;
    }

    // Sanitize body to ensure no nulls/undefineds
    const safeBody = tableBody.filter(row => Array.isArray(row) && row.length === 3);

    console.log('[PDF DEBUG] Table Body:', safeBody);

    // Render Table
    autoTable(doc, {
        startY: currentY,
        head: [['Pos.', 'Bezeichnung', 'Gesamtpreis']],
        body: safeBody,
        theme: 'plain', // Clean look
        styles: {
            font: fontFamily,
            fontSize: 10,
            cellPadding: 5,
            lineWidth: 0,
        },
        headStyles: {
            fillColor: COLORS.tableHeader,
            textColor: COLORS.text,
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: {}, // Auto width (default)
            2: { cellWidth: 40, halign: 'right' }
        },
        didDrawPage: () => {
            // Optional: Handle multipage headers if needed
        }
    });

    // Update Y
    // Defensive check for lastAutoTable presence
    const lastTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : currentY;
    currentY = lastTableY + 10;

    // ensure we have space for totals
    if (currentY + 60 > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        currentY = CONTENT_START_Y;
        addPageHeader(doc, logoBase64); // Add header to new page
    }

    // 7. Totals Block (Right aligned)
    const totalX = pageWidth - MARGIN - 80;
    const valX = pageWidth - MARGIN;

    // Defensive math
    const sellingGross = offer.pricing ? Number(offer.pricing.sellingPriceGross) || 0 : 0;
    const sellingNet = offer.pricing ? Number(offer.pricing.sellingPriceNet) || 0 : 0;
    const vat = sellingGross - sellingNet;

    doc.setFontSize(10);
    doc.text(sanitizeText('Nettosumme:'), totalX, currentY);
    doc.text(sanitizeText(formatCurrency(sellingNet)), valX, currentY, { align: 'right' });
    currentY += 6;

    doc.text(sanitizeText('Zzgl. 19% MwSt.:'), totalX, currentY);
    doc.text(sanitizeText(formatCurrency(vat)), valX, currentY, { align: 'right' });
    currentY += 4;

    // Double Line under totals
    doc.setDrawColor(...COLORS.text);
    doc.setLineWidth(0.5);
    doc.line(totalX, currentY, pageWidth - MARGIN, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.setFont(fontFamily, 'bold');
    doc.text(sanitizeText('Gesamtsumme:'), totalX, currentY);
    doc.text(sanitizeText(formatCurrency(sellingGross)), valX, currentY, { align: 'right' });

    // Double line bottom
    currentY += 2;
    doc.setLineWidth(0.5);
    doc.line(totalX, currentY, pageWidth - MARGIN, currentY);
    doc.setLineWidth(0.1);
    doc.line(totalX, currentY + 1, pageWidth - MARGIN, currentY + 1);

    currentY += 20;

    // 8. Terms & Conditions Block
    // Check space
    if (currentY + 100 > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        currentY = CONTENT_START_Y;
        addPageHeader(doc, logoBase64);
    }

    doc.setFontSize(11);
    doc.setFont(fontFamily, 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(sanitizeText('Zahlungsmethoden und Bedingungen'), MARGIN, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.setFont(fontFamily, 'normal');

    const conditions = [
        { t: 'Anzahlung', d: 'Für die Realisierung des Projekts ist eine Anzahlung von 40-50 % der Gesamtsumme erforderlich, abhängig von der Größe des Auftrags.' },
        { t: 'Zahlung am Montagetag', d: '90 % der Gesamtsumme werden am Tag der Montage fällig, um die Fertigstellung und termingerechte Ausführung zu gewährleisten.' },
        { t: 'Endzahlung', d: 'Der Restbetrag wird nach der erfolgreichen Fertigstellung des Projekts ausgezahlt.' },
        { t: 'Flexible Anzahlung', d: 'In Ausnahmefällen und bei gegenseitigem Vertrauen kann auf eine Anzahlung verzichtet werden. Die Wahl der Materialien spielt hierbei eine entscheidende Rolle.' },
        { t: 'Zahlungsoptionen', d: 'Barzahlung: Direkt an den Monteur.\nÜberweisung: Auf unser Konto bei der Volksbank.' },
        { t: 'Steuerhinweis', d: 'Alle unsere Rechnungen werden mit 19% Mehrwertsteuer ausgewiesen.' }
    ];

    conditions.forEach(item => {
        // Check for page break
        if (currentY + 15 > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            currentY = CONTENT_START_Y;
            addPageHeader(doc, logoBase64);
        }

        doc.setFont(fontFamily, 'bold');
        doc.text(sanitizeText(item.t), MARGIN, currentY);
        currentY += 4;

        doc.setFont(fontFamily, 'normal');
        // Handle multiline text
        const splitText = doc.splitTextToSize(sanitizeText(item.d), pageWidth - (MARGIN * 2));
        doc.text(splitText, MARGIN, currentY);
        currentY += (splitText.length * 4) + 4;
    });

    // Add Headers/Footers to all pages at the end
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Header is added during creation for page 1/resets, 
        // but need to ensure footer is on all pages. 
        // Careful not to double-add header. 
        // Our 'addPageHeader' is safe to call if we manage positions, 
        // but here we just want footers.
        addPageFooter(doc, i);
    }

    return doc;
}
