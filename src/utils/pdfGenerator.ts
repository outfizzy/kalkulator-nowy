import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Offer } from '../types';
import { getSalesProfile, getCurrentUser } from './storage';
import { translate, formatCurrency } from './translations';
import { LOGO_BASE64 } from './assets';

// --- ULTRA PREMIUM DESIGN SYSTEM ---
const THEME = {
    primary: [18, 28, 45] as [number, number, number],      // Dark Midnight Navy (More premium than standard blue)
    secondary: [197, 160, 101] as [number, number, number], // Muted Brass/Gold (Less yellow, more elegant)
    surface: [250, 250, 250] as [number, number, number],   // Pure Ultra-Light Gray for surfaces
    text: [30, 30, 30] as [number, number, number],         // Soft Black
    textLight: [100, 100, 100] as [number, number, number], // Slate Gray
    white: [255, 255, 255] as [number, number, number],
    line: [230, 230, 230] as [number, number, number]
};

const FONTS = {
    bold: 'Helvetica',
    normal: 'Helvetica',
};

const MARGIN = 18; // Slightly tighter margin for modern look

// SAFE STRING UTILS
function safeStr(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val);
}

function sanitizeText(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
        '€': 'EUR'
    };
    return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüßÄÖÜ€]/g, m => map[m] || m);
}

function translateForPDF(key: string, category: string): string {
    const v2Map: Record<string, string> = {
        // Models - using "style" naming convention
        'trendline': 'Trendstyle', 'trendstyle': 'Trendstyle',
        'trendline_new': 'Trendstyle New', 'trendstyle_new': 'Trendstyle New',
        'trendline_plus': 'Trendstyle+', 'trendstyle_plus': 'Trendstyle+',
        'skyline': 'Skystyle', 'skystyle': 'Skystyle',
        'ultraline': 'Ultrastyle', 'ultrastyle': 'Ultrastyle',
        'topline': 'Topstyle', 'topstyle': 'Topstyle',
        'topline_xl': 'Topstyle XL', 'topstyle_xl': 'Topstyle XL',
        'designline': 'Designstyle', 'designstyle': 'Designstyle',
        'orangeline': 'Orangestyle', 'orangestyle': 'Orangestyle',
        'orangeline+': 'Orangestyle+', 'orangestyle+': 'Orangestyle+',
        // Roof types
        'poly': 'Polycarbonat', 'polycarbonate': 'Polycarbonat', 'glass': 'Glas VSG 8mm',
        'clear': 'Klar', 'klar': 'Klar', 'opal': 'Opal', 'matt': 'Matt',
        'stopsol': 'Stopsol (Sonnenschutz)', 'ir-gold': 'IR Gold (Hitzeschutz)',
        // Installation types
        'wall': 'Wandmontage', 'wall-mounted': 'Wandmontage',
        'freestanding': 'Freistehend', 'wedge': 'Keilform',
        // Colors
        'anthracite': 'Anthrazit (RAL 7016)', 'white': 'Weiss (RAL 9016)',
        'ral7016': 'Anthrazit (RAL 7016)', 'ral9016': 'Weiss (RAL 9016)',
        'silberr': 'Silber (RAL 9006)', 'sepia': 'Sepiabraun (RAL 8014)'
    };
    if (v2Map[key.toLowerCase()]) return v2Map[key.toLowerCase()];
    return translate(key, category as any);
}

export async function generateOfferPDF(offer: Offer) {
    try {
        const doc = await createDocument(offer);
        const safeId = offer.offerNumber || (offer.id ? offer.id.substring(0, 8) : 'draft');
        doc.save(`Angebot_${safeId}.pdf`);
    } catch (e) {
        console.error("PDF Fail:", e);
        alert("PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
    }
}

export async function generateOfferPDFData(offer: Offer): Promise<string> {
    const doc = await createDocument(offer);
    return doc.output('datauristring');
}

async function createDocument(offer: Offer): Promise<jsPDF> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- SALES CONTEXT ---
    let repName = 'Ihr Expertenteam';
    let repPhone = '+49 157 5064 6936';
    let repEmail = 'buero@polendach24.de';

    if (offer.creator) {
        repName = `${offer.creator.firstName} ${offer.creator.lastName}`;
        repPhone = offer.creator.phone || repPhone;
        repEmail = offer.creator.email || repEmail;
    } else {
        const profile = getSalesProfile();
        if (profile) {
            repName = `${profile.firstName} ${profile.lastName}`;
            repPhone = profile.phone || repPhone;
            repEmail = profile.email || repEmail;
        } else {
            const user = getCurrentUser();
            if (user) {
                repName = `${user.firstName} ${user.lastName}`;
                repPhone = user.phone || repPhone;
                repEmail = user.email || repEmail;
            }
        }
    }

    const c = offer.customer || {} as any;
    const model = translateForPDF(offer.product?.modelId || '', 'models');

    // --- RENDER HELPERS ---

    const drawHeader = () => {
        // High-end dark header
        doc.setFillColor(...THEME.primary);
        doc.rect(0, 0, pageWidth, 35, 'F'); // Taller header for elegance

        // Logo Positioning - Centered vertically in header
        // Assuming logo is rectangular (approx 4:1)
        if (LOGO_BASE64) {
            // Keep logo moderate size to look premium, not shouting
            doc.addImage(LOGO_BASE64, 'PNG', MARGIN, 10, 42, 14);
        } else {
            doc.setFont(FONTS.bold, 'bold');
            doc.setFontSize(20);
            doc.setTextColor(...THEME.white);
            doc.text('POLENDACH24', MARGIN, 24);
        }

        // Contact Stack - Right aligned, clean typography
        doc.setFont(FONTS.normal, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(200, 200, 200); // Off-white for subtleties
        doc.text('Ihr Premium Partner fuer Terrassen.', pageWidth - MARGIN, 15, { align: 'right' });

        doc.setFont(FONTS.bold, 'bold');
        doc.setTextColor(...THEME.secondary); // Gold accent text
        doc.text('www.polendach24.de', pageWidth - MARGIN, 24, { align: 'right' });

        // Gold Accent Line
        doc.setFillColor(...THEME.secondary);
        doc.rect(0, 35, pageWidth, 1.5, 'F'); // Thinner, sharper line
    };

    const drawFooter = (pageNo: number, pageCount: number, customY?: number) => {
        // Use custom y position if provided (for inline footer), otherwise use bottom of page
        const footerY = customY !== undefined ? customY : pageHeight - 22;

        doc.setDrawColor(...THEME.line);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, footerY, pageWidth - MARGIN, footerY);

        doc.setFontSize(7);
        doc.setTextColor(...THEME.textLight);
        doc.setFont(FONTS.normal, 'normal');

        // Compact columns
        const col1 = MARGIN;
        const col2 = MARGIN + 60;
        const col3 = MARGIN + 120;

        // Col 1: Address
        doc.text('PolenDach24 S.C.', col1, footerY + 5);
        doc.text('Kolonia Wałowice 221/33, 66-620 Gubin', col1, footerY + 9);
        doc.text('NIP: PL9261695520', col1, footerY + 13);

        // Col 2: Contact (Office)
        doc.text('Zentrale: +49 157 5064 6936', col2, footerY + 5);
        doc.text('Email: buero@polendach24.de', col2, footerY + 9);
        doc.text('Web: www.polendach24.de', col2, footerY + 13);

        // Col 3: Bank
        doc.text('Bank: Sparkasse Spree-Neisse', col3, footerY + 5);
        doc.text('IBAN: DE79 1805 0000 0190 1228 89', col3, footerY + 9);
        doc.text('BIC: WELADED1CBN', col3, footerY + 13);

        // Page number
        doc.text(`Seite ${pageNo} / ${pageCount}`, pageWidth - MARGIN, footerY + 17, { align: 'right' });
    };

    // --- PAGE 1 START ---

    drawHeader();
    let y = 50;

    // 1. TOP SECTION: DATA & ADDRESS
    // Modern "Metadata Bar" design

    // Offer Badge (Right)
    doc.setFillColor(...THEME.surface);
    doc.roundedRect(pageWidth - MARGIN - 70, y, 70, 28, 1, 1, 'F'); // Subtle bg
    doc.setDrawColor(...THEME.line);
    doc.rect(pageWidth - MARGIN - 70, y, 70, 28, 'S'); // Thin border

    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.text('ANGEBOTS-NUMMER', pageWidth - MARGIN - 65, y + 6);
    doc.text('DATUM', pageWidth - MARGIN - 25, y + 6);

    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...THEME.primary);
    const offerNum = safeStr(offer.offerNumber || offer.id?.substring(0, 8) || 'ENTWURF');
    doc.text(offerNum, pageWidth - MARGIN - 65, y + 13);
    doc.text(new Date().toLocaleDateString('de-DE'), pageWidth - MARGIN - 25, y + 13);

    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.setFont(FONTS.normal, 'normal');
    doc.text('BITTE BEI RUECKFRAGEN ANGEBEN', pageWidth - MARGIN - 65, y + 22);

    // Customer Address (Left)
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.text('PolenDach24 S.C. - Kolonia Wałowice 221/33 - 66-620 Gubin', MARGIN, y - 2);

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(...THEME.text);

    if (c.companyName) {
        doc.setFont(FONTS.bold, 'bold');
        doc.text(sanitizeText(c.companyName), MARGIN, y);
        y += 5;
    }

    doc.setFont(FONTS.normal, 'normal');
    const name = `${safeStr(c.salutation)} ${safeStr(c.firstName)} ${safeStr(c.lastName)}`.trim();
    doc.text(sanitizeText(name || 'Kunde'), MARGIN, y);
    y += 5;
    doc.text(sanitizeText(`${safeStr(c.street)} ${safeStr(c.houseNumber)}`.trim()), MARGIN, y);
    y += 5;
    doc.text(sanitizeText(`${safeStr(c.postalCode)} ${safeStr(c.city)}`.trim()), MARGIN, y);
    y += 5;
    doc.text(sanitizeText(safeStr(c.country) || 'Deutschland'), MARGIN, y);

    // 2. COMPACT GREETING (removed hero title to save space)
    y += 12;
    doc.setFontSize(10);
    doc.setFont(FONTS.normal, 'normal');
    doc.setTextColor(...THEME.text);

    let greeting = 'Sehr geehrte Damen und Herren,';
    if (c.lastName) {
        greeting = c.salutation === 'Frau' ? `Sehr geehrte Frau ${sanitizeText(c.lastName)},` : `Sehr geehrter Herr ${sanitizeText(c.lastName)},`;
    }
    doc.text(`${greeting} anbei Ihr Angebot fuer ${model}.`, MARGIN, y);
    y += 8;

    // 3. COMPACT PRODUCT SPECS BOX (20mm height)
    doc.setFillColor(...THEME.primary);
    doc.roundedRect(MARGIN, y, pageWidth - (MARGIN * 2), 20, 1, 1, 'F');

    doc.setTextColor(...THEME.secondary);
    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(7);
    doc.text('IHRE KONFIGURATION', MARGIN + 5, y + 5);

    // Specs in single row (White text)
    doc.setTextColor(...THEME.white);
    doc.setFontSize(8);
    doc.setFont(FONTS.normal, 'normal');

    const specsY = y + 12;
    const colW = (pageWidth - MARGIN * 2) / 3;

    // Col 1: Dimensions
    doc.text(`${offer.product?.width} x ${offer.product?.projection} mm`, MARGIN + 5, specsY);

    // Col 2: Color  
    const color = translateForPDF(offer.product?.color || '', 'colors');
    doc.text(color, MARGIN + 5 + colW, specsY);

    // Col 3: Roof
    const roof = translateForPDF(offer.product?.roofType || '', 'roofTypes');
    doc.text(roof, MARGIN + 5 + (colW * 2), specsY);

    y += 25;

    // 4. PRICING TABLE
    const bodyRows = [];
    let pos = 1;

    // Main Product
    bodyRows.push([
        { content: String(pos++), styles: { halign: 'center' } },
        {
            content: sanitizeText(`${model} Aluminiumkonstruktion\nPremium Pulverbeschichtung, Verstarkte Profile, Integrierte Entwaesserung.`),
            styles: { fontStyle: 'bold' }
        },
        formatCurrency(offer.pricing?.basePrice || 0)
    ]);

    // Items
    const items = (offer.product as any).items || [];
    if (items.length > 0) {
        items.forEach((item: any) => {
            if (item.name?.toLowerCase().includes(offer.product?.modelId)) return;
            bodyRows.push([
                { content: String(pos++), styles: { halign: 'center' } },
                sanitizeText(item.name + (item.config ? `\n${item.config}` : '')),
                formatCurrency(item.price)
            ]);
        });
    } else if (offer.product?.addons) {
        offer.product.addons.forEach((a: any) => {
            bodyRows.push([
                { content: String(pos++), styles: { halign: 'center' } },
                sanitizeText(a.name + (a.variant ? ` (${a.variant})` : '')),
                formatCurrency(a.price)
            ]);
        });
    }

    // Installation
    if (offer.pricing?.installationCosts) {
        const inst = offer.pricing.installationCosts;
        bodyRows.push([
            { content: String(pos++), styles: { halign: 'center' } },
            sanitizeText(`Fachgerechte Montage & Lieferung\nDurch zertifiziertes Montageteam inkl. Kleinmaterial.`),
            formatCurrency(inst.totalInstallation)
        ]);
    }

    // Check if we have enough space for the table, otherwise start on new page
    const estimatedTableHeight = bodyRows.length * 15 + 20; // Rough estimate: 15mm per row + header
    const availableSpace = pageHeight - y - 120; // Reserve 120mm for footer section

    if (estimatedTableHeight > availableSpace && y > 100) {
        // Not enough space and we're past the intro section - start table on new page
        doc.addPage();
        drawHeader();
        y = 50;
    }

    autoTable(doc, {
        startY: y,
        head: [['Pos.', 'Beschreibung', 'Betrag']],
        body: bodyRows,
        theme: 'grid',
        styles: {
            font: 'Helvetica',
            fontSize: 9,
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: THEME.line,
            textColor: THEME.text,
            minCellHeight: 8,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: THEME.surface,
            textColor: THEME.primary,
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: THEME.line
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: [252, 252, 252] as [number, number, number]
        },
        margin: { left: MARGIN, right: MARGIN, bottom: 30 }, // Reserve space for footer
        // Prevent row splitting across pages
        rowPageBreak: 'avoid',
        // Show head on each page
        showHead: 'everyPage',
        // Hooks for clean multi-page handling
        didDrawPage: function (data) {
            // Draw header on all pages
            drawHeader();

            // If this is a continuation page, add indication
            if (data.pageNumber > 1) {
                doc.setFontSize(8);
                doc.setTextColor(...THEME.textLight);
                doc.setFont(FONTS.normal, 'normal');
                doc.text(`Fortsetzung - Seite ${data.pageNumber}`, MARGIN, 45);
            }
        },
        willDrawPage: function (data) {
            // Before drawing a new page (except first), add continuation note at bottom of prev page
            if (data.pageNumber > 1) {
                doc.setPage(data.pageNumber - 1);
                doc.setFontSize(7);
                doc.setTextColor(...THEME.secondary);
                doc.setFont(FONTS.normal, 'italic');
                doc.text('Fortsetzung auf naechster Seite →', pageWidth - MARGIN, pageHeight - 28, { align: 'right' });
                doc.setPage(data.pageNumber);
            }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Check Page Break for Bottom Block
    // Need: card (35mm) + totals (40mm) + signatures (15mm) + footer (25mm) = 115mm
    const bottomContentHeight = 115;
    if (y > pageHeight - bottomContentHeight) {
        doc.addPage();
        drawHeader();
        y = 50;
    }

    // 5. SPLIT SECTION: CONTACT CARD (Left) vs TOTALS (Right)
    const midPoint = pageWidth / 2;

    // --- LEFT: SALES REP CARD (COMPACT) ---
    const cardY = y;
    const cardHeight = 35;

    doc.setDrawColor(...THEME.line);
    doc.setLineWidth(0.1);
    doc.rect(MARGIN, cardY, 75, cardHeight);

    // Top strip
    doc.setFillColor(...THEME.primary);
    doc.rect(MARGIN, cardY, 75, 6, 'F');
    doc.setTextColor(...THEME.white);
    doc.setFontSize(6);
    doc.setFont(FONTS.bold, 'bold');
    doc.text('IHR PERSOENLICHER ANSPRECHPARTNER', MARGIN + 3, cardY + 4);

    // Initials circle
    doc.setFillColor(...THEME.surface);
    doc.circle(MARGIN + 10, cardY + 18, 5, 'F');
    doc.setTextColor(...THEME.secondary);
    const initials = repName.split(' ').map(n => n[0]).join('').substring(0, 2);
    doc.setFontSize(8);
    doc.text(initials, MARGIN + 10, cardY + 19, { align: 'center' });

    // Info
    doc.setFontSize(9);
    doc.setTextColor(...THEME.primary);
    doc.text(sanitizeText(repName), MARGIN + 18, cardY + 14);

    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.setFont(FONTS.normal, 'normal');
    doc.text('Experte fuer Ueberdachungen', MARGIN + 18, cardY + 18);

    doc.setTextColor(...THEME.text);
    doc.text(sanitizeText(repPhone), MARGIN + 18, cardY + 24);
    doc.text(sanitizeText(repEmail), MARGIN + 18, cardY + 28);

    doc.setTextColor(...THEME.secondary);
    doc.setFontSize(6);
    doc.text('Fragen Sie mich nach Aktionen!', MARGIN + 3, cardY + 33);



    // --- RIGHT: TOTALS BLOCK ---
    const totalBoxWidth = 85;
    const totalBoxX = pageWidth - MARGIN - totalBoxWidth;
    let ty = y;

    doc.setFontSize(10);
    const net = offer.pricing?.sellingPriceNet || 0;
    const discount = offer.pricing?.discountValue || 0;
    const preDiscount = net + discount;
    const vat = net * 0.19;
    const gross = net + vat;

    if (discount > 0) {
        doc.setTextColor(...THEME.textLight);
        doc.text('Listenpreis (Netto):', totalBoxX, ty + 5);
        doc.text(formatCurrency(preDiscount), pageWidth - MARGIN, ty + 5, { align: 'right' });
        ty += 6;

        doc.setTextColor(...THEME.secondary); // Gold for discount
        doc.text(`Ihr Vorteil (-${offer.pricing?.discountPercentage}%):`, totalBoxX, ty + 5);
        doc.text(`- ${formatCurrency(discount)}`, pageWidth - MARGIN, ty + 5, { align: 'right' });
        ty += 8;

        // Separator
        doc.setDrawColor(...THEME.line);
        doc.line(totalBoxX, ty, pageWidth - MARGIN, ty);
        ty += 2;
    }

    doc.setTextColor(...THEME.text);
    doc.setFont(FONTS.bold, 'bold');
    doc.text('Endpreis Netto:', totalBoxX, ty + 5);
    doc.text(formatCurrency(net), pageWidth - MARGIN, ty + 5, { align: 'right' });
    ty += 6;

    doc.setFont(FONTS.normal, 'normal');
    doc.setTextColor(...THEME.textLight);
    doc.text('zzgl. 19% MwSt.:', totalBoxX, ty + 5);
    doc.text(formatCurrency(vat), pageWidth - MARGIN, ty + 5, { align: 'right' });
    ty += 10;

    // Grand Total Box
    doc.setFillColor(...THEME.primary);
    doc.roundedRect(totalBoxX, ty, totalBoxWidth, 14, 1, 1, 'F');

    doc.setTextColor(...THEME.white);
    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(12);
    doc.text('GESAMT BETRAG:', totalBoxX + 5, ty + 9);
    doc.text(formatCurrency(gross), pageWidth - MARGIN - 5, ty + 9, { align: 'right' });

    // 6. CLOSING & SIGNATURES (Compact)
    y = Math.max(ty + 18, cardY + cardHeight + 5);

    // Trust badges - single line, compact
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    const badges = "✓ Premium Qualitaet    ✓ 5 Jahre Garantie    ✓ Alles aus einer Hand";
    doc.text(badges, pageWidth / 2, y, { align: 'center' });

    y += 10;

    // Sign lines (compact)
    doc.setDrawColor(...THEME.textLight);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y + 5, MARGIN + 55, y + 5);
    doc.line(pageWidth - MARGIN - 55, y + 5, pageWidth - MARGIN, y + 5);

    doc.setFontSize(6);
    doc.text(sanitizeText(repName), MARGIN, y + 8);
    doc.text('Ort, Datum, Unterschrift Kunde', pageWidth - MARGIN - 55, y + 8);

    // Simple footer on all pages at page bottom
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawFooter(i, pageCount);
    }

    return doc;
}
