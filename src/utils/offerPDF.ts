import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OfferPDFData {
    customer: {
        salutation?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        companyName?: string;
        street?: string;
        houseNumber?: string;
        postalCode?: string;
        city?: string;
        phone?: string;
        email?: string;
    };
    technical?: {
        model: string;
        width: number;
        projection: number;
        cover: string;
        variant: string;
        construction: string;
        color: string;
        postsCount?: number;
        extraPosts?: number;
        extraPostHeight?: number;
        rafterType?: string | null;
    };
    positions: Array<{
        name: string;
        description: string;
        dimensions?: string;
        price: number;
    }>;
    pricing: {
        subtotal: number;
        marginPercent: number;
        marginValue: number;
        discountPercent: number;
        discountValue: number;
        montagePrice: number;
        extraPostTotal: number;
        finalPriceNet: number;
        finalPriceGross: number;
        purchaseDiscount?: number;
    };
    offerNumber?: string;
    offerDate?: string;
    salesPerson?: string;
}

// ──── BRAND COLORS ────
const NAVY: [number, number, number] = [15, 30, 55];
const BLUE: [number, number, number] = [37, 99, 235];
const BLUE_DARK: [number, number, number] = [29, 78, 216];
const DARK_TEXT: [number, number, number] = [30, 30, 35];
const MED_GRAY: [number, number, number] = [100, 116, 139];
const LIGHT_GRAY: [number, number, number] = [226, 232, 240];
const ZEBRA_BG: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const ACCENT_BG: [number, number, number] = [240, 247, 255];

const formatEUR = (val: number): string =>
    val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

// ──── DOCUMENT BUILDER ────
const buildOfferDoc = (data: OfferPDFData): { doc: jsPDF; filename: string } => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.width;   // 210
    const H = doc.internal.pageSize.height;  // 297
    const ML = 20;   // margin left
    const MR = 20;   // margin right
    const CW = W - ML - MR;                 // content width (170)
    let Y = 0;

    // ── helpers ──
    const pageBreak = (need: number) => {
        if (Y + need > H - 30) { doc.addPage(); Y = 24; }
    };
    const separator = (y: number, color: [number, number, number] = LIGHT_GRAY, width = 0.3) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(width);
        doc.line(ML, y, W - MR, y);
    };
    const sectionTitle = (title: string, icon?: string) => {
        pageBreak(20);
        Y += 3;
        // Blue accent bar on the left
        doc.setFillColor(...BLUE);
        doc.rect(ML, Y - 4, 1.2, 6, 'F');
        // Title text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        const displayTitle = icon ? `${icon}  ${title.toUpperCase()}` : title.toUpperCase();
        doc.text(displayTitle, ML + 4, Y);
        Y += 2;
        separator(Y, LIGHT_GRAY, 0.2);
        Y += 6;
    };
    const addFooter = () => {
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            // Footer line
            doc.setDrawColor(...LIGHT_GRAY);
            doc.setLineWidth(0.2);
            doc.line(ML, H - 18, W - MR, H - 18);

            // Left — company info
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...MED_GRAY);
            doc.text('Polendach24 — Terrassenüberdachungen & Carports', ML, H - 14);
            doc.text('Tel: +49 176 47453883  |  buero@polendach24.de  |  polendach24.de', ML, H - 10.5);

            // Right — page & date
            doc.setFontSize(6.5);
            doc.text(`Seite ${i} / ${pages}`, W - MR, H - 14, { align: 'right' });
            doc.text(`Erstellt: ${data.offerDate || new Date().toLocaleDateString('de-DE')}`, W - MR, H - 10.5, { align: 'right' });
        }
    };

    // ═══════════════════════════════════════
    // 1. HEADER BAR
    // ═══════════════════════════════════════
    // Full-width dark header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 36, 'F');

    // Blue accent strip at bottom of header
    doc.setFillColor(...BLUE);
    doc.rect(0, 36, W, 1.5, 'F');

    // Company name
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('POLENDACH24', ML, 16);

    // Tagline
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Terrassenüberdachungen & Carports — Qualität aus Aluminium', ML, 23);

    // Website
    doc.setTextColor(96, 165, 250); // blue-400
    doc.setFontSize(7.5);
    doc.text('www.polendach24.de', ML, 29);

    // Right side — Offer meta badge
    const badgeX = W - MR - 52;
    doc.setFillColor(37, 99, 235); // blue-600
    doc.roundedRect(badgeX, 8, 52, 22, 3, 3, 'F');

    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ANGEBOT', badgeX + 26, 14, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    if (data.offerNumber) {
        doc.text(`Nr. ${data.offerNumber}`, badgeX + 26, 19, { align: 'center' });
    }
    doc.text(`${data.offerDate || new Date().toLocaleDateString('de-DE')}`, badgeX + 26, 24, { align: 'center' });

    // Sales person below badge
    if (data.salesPerson) {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(`Berater: ${data.salesPerson}`, W - MR, 34, { align: 'right' });
    }

    Y = 46;

    // ═══════════════════════════════════════
    // 2. KUNDENDATEN
    // ═══════════════════════════════════════
    sectionTitle('Kundendaten');

    const c = data.customer;
    const fullName = [c.salutation, c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || '';
    const customerRows: string[][] = [];
    if (fullName) customerRows.push(['Name', fullName]);
    if (c.companyName) customerRows.push(['Firma', c.companyName]);
    const addr = [c.street, c.houseNumber].filter(Boolean).join(' ');
    const city = [c.postalCode, c.city].filter(Boolean).join(' ');
    if (addr || city) customerRows.push(['Adresse', [addr, city].filter(Boolean).join(', ')]);
    if (c.phone) customerRows.push(['Telefon', c.phone]);
    if (c.email) customerRows.push(['E-Mail', c.email]);

    if (customerRows.length > 0) {
        autoTable(doc, {
            startY: Y,
            body: customerRows,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: DARK_TEXT },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 24, textColor: MED_GRAY, fontSize: 8 },
                1: { cellWidth: 'auto', textColor: DARK_TEXT, fontStyle: 'normal' }
            },
            margin: { left: ML + 4 }
        });
        Y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ═══════════════════════════════════════
    // 3. PRODUKTKONFIGURATION
    // ═══════════════════════════════════════
    if (data.technical) {
        sectionTitle('Produktkonfiguration');
        const t = data.technical;

        // Technical specs in a subtle background box
        doc.setFillColor(...ACCENT_BG);
        // Calculate box height before drawing
        const techRows: [string, string][] = [
            ['Modell', t.model],
            ['Abmessungen', `${(t.width / 1000).toFixed(2)} × ${(t.projection / 1000).toFixed(2)} m (B × T)`],
            ['Fläche', `${((t.width / 1000) * (t.projection / 1000)).toFixed(2)} m²`],
            ['Eindeckung', `${t.cover} — ${t.variant}`],
            ['Bauweise', t.construction === 'wall' ? 'Wandmontage' : 'Freistehend'],
            ['Farbe', t.color],
        ];
        if (t.postsCount) {
            const total = t.postsCount + (t.extraPosts || 0);
            let desc = `${total} Stück`;
            if (t.extraPosts && t.extraPosts > 0) desc += ` (${t.postsCount} Std. + ${t.extraPosts} Zusatz)`;
            if (t.extraPostHeight === 3000) desc += ' — Höhe 3.000 mm';
            techRows.push(['Pfosten', desc]);
        }
        if (t.rafterType) techRows.push(['Sparrentyp', t.rafterType]);

        const boxH = techRows.length * 6 + 8;
        doc.roundedRect(ML, Y - 2, CW, boxH, 2, 2, 'F');

        autoTable(doc, {
            startY: Y,
            body: techRows,
            theme: 'plain',
            styles: { fontSize: 8.5, cellPadding: { top: 1.8, bottom: 1.8, left: 4, right: 3 }, textColor: DARK_TEXT },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 30, textColor: MED_GRAY, fontSize: 8 },
                1: { cellWidth: 'auto', textColor: NAVY, fontStyle: 'bold' }
            },
            margin: { left: ML }
        });
        Y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ═══════════════════════════════════════
    // 4. POSITIONSTABELLE
    // ═══════════════════════════════════════
    sectionTitle('Positionen');

    const posBody = data.positions.map((pos, i) => [
        String(i + 1),
        pos.name,
        pos.description,
        pos.dimensions || '—',
        formatEUR(pos.price)
    ]);

    autoTable(doc, {
        startY: Y,
        head: [['Nr.', 'Bezeichnung', 'Beschreibung', 'Maße', 'Preis netto']],
        body: posBody,
        theme: 'grid',
        headStyles: {
            fillColor: NAVY,
            textColor: WHITE,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        },
        styles: {
            fontSize: 8,
            cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
            overflow: 'linebreak',
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
            textColor: DARK_TEXT,
        },
        alternateRowStyles: { fillColor: ZEBRA_BG },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', textColor: MED_GRAY, fontStyle: 'bold' },
            1: { cellWidth: 34, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 28, halign: 'center', fontSize: 7.5, textColor: MED_GRAY },
            4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: ML, right: MR },
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
    });
    Y = (doc as any).lastAutoTable.finalY + 12;

    // ═══════════════════════════════════════
    // 5. PREISZUSAMMENFASSUNG
    // ═══════════════════════════════════════
    sectionTitle('Preiszusammenfassung');

    const p = data.pricing;
    const priceRows: (string | { content: string; styles?: any })[][] = [];

    priceRows.push(['Zwischensumme (Katalogpreis)', formatEUR(p.subtotal)]);
    if (p.marginPercent > 0)
        priceRows.push([`Aufschlag ${p.marginPercent} %`, `+ ${formatEUR(p.marginValue)}`]);
    if (p.discountPercent > 0)
        priceRows.push([`Rabatt ${p.discountPercent} %`, `− ${formatEUR(p.discountValue)}`]);
    if (p.extraPostTotal > 0)
        priceRows.push(['Zusatzpfosten / Höhenaufschlag', `+ ${formatEUR(p.extraPostTotal)}`]);
    if (p.montagePrice > 0)
        priceRows.push(['Montage', `+ ${formatEUR(p.montagePrice)}`]);

    // Separator row index
    const nettoRowIdx = priceRows.length;

    // Netto total
    priceRows.push([
        { content: 'Gesamtbetrag netto', styles: { fontStyle: 'bold', fontSize: 10, textColor: NAVY } },
        { content: formatEUR(p.finalPriceNet), styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', textColor: NAVY } }
    ]);
    // MwSt
    priceRows.push(['zzgl. 19 % MwSt.', `+ ${formatEUR(p.finalPriceGross - p.finalPriceNet)}`]);
    // Brutto total
    priceRows.push([
        { content: 'Gesamtbetrag brutto', styles: { fontStyle: 'bold', fontSize: 13, textColor: NAVY } },
        { content: formatEUR(p.finalPriceGross), styles: { fontStyle: 'bold', fontSize: 13, halign: 'right', textColor: NAVY } }
    ]);

    autoTable(doc, {
        startY: Y,
        body: priceRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }, textColor: DARK_TEXT },
        columnStyles: {
            0: { cellWidth: CW - 40 },
            1: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: ML, right: MR },
        didDrawCell: (hookData: any) => {
            // Blue separator line before netto total
            if (hookData.row.index === nettoRowIdx && hookData.column.index === 0 && hookData.section === 'body') {
                doc.setDrawColor(...BLUE);
                doc.setLineWidth(0.5);
                doc.line(ML, hookData.cell.y, W - MR, hookData.cell.y);
            }
            // Highlight brutto row with branded background
            if (hookData.row.index === priceRows.length - 1 && hookData.section === 'body') {
                doc.setFillColor(240, 247, 255);
                doc.rect(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height, 'F');
                // Blue left accent
                if (hookData.column.index === 0) {
                    doc.setFillColor(...BLUE);
                    doc.rect(hookData.cell.x, hookData.cell.y, 1.5, hookData.cell.height, 'F');
                }
                // Re-draw text over fill
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...NAVY);
                if (hookData.column.index === 0) {
                    doc.text('Gesamtbetrag brutto', hookData.cell.x + 5, hookData.cell.y + hookData.cell.height / 2 + 2);
                } else {
                    doc.text(formatEUR(p.finalPriceGross), hookData.cell.x + hookData.cell.width - 5, hookData.cell.y + hookData.cell.height / 2 + 2, { align: 'right' });
                }
            }
        }
    });
    Y = (doc as any).lastAutoTable.finalY + 16;

    // ═══════════════════════════════════════
    // 6. ZAHLUNGSBEDINGUNGEN & HINWEISE
    // ═══════════════════════════════════════
    pageBreak(55);
    sectionTitle('Konditionen & Hinweise');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);

    const conditions = [
        ['Gültigkeit', 'Dieses Angebot ist 30 Tage ab Ausstellungsdatum gültig.'],
        ['Lieferzeit', 'Ca. 4–6 Wochen nach Auftragsbestätigung und Eingang der Anzahlung.'],
        ['Zahlung', '40 % Anzahlung bei Auftragsbestätigung, 60 % bei Lieferung / Montageabschluss.'],
        ['Garantie', '10 Jahre auf Aluminium-Konstruktion, 2 Jahre auf Montageleistung.'],
        ['Preise', 'Alle Preise verstehen sich netto zzgl. der gesetzlichen Mehrwertsteuer (19 %).'],
        ['Hinweis', 'Technische Änderungen und Irrtümer vorbehalten. Farb- und Materialabweichungen aufgrund der Druckdarstellung sind möglich.'],
    ];

    conditions.forEach(([label, text]) => {
        pageBreak(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MED_GRAY);
        doc.setFontSize(7.5);
        doc.text(label, ML + 4, Y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(text, CW - 34);
        doc.text(lines, ML + 30, Y);
        Y += lines.length * 4 + 3;
    });

    // ═══════════════════════════════════════
    // 7. CLOSING / SIGNATURE
    // ═══════════════════════════════════════
    Y += 6;
    pageBreak(30);
    separator(Y, LIGHT_GRAY, 0.2);
    Y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.text('Wir freuen uns auf Ihre Rückmeldung und stehen Ihnen jederzeit', ML, Y);
    Y += 4.5;
    doc.text('für Rückfragen gerne zur Verfügung.', ML, Y);
    Y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Mit freundlichen Grüßen', ML, Y);
    Y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.text(data.salesPerson ? data.salesPerson : 'Ihr Polendach24 Team', ML, Y);
    Y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(...MED_GRAY);
    doc.text('Polendach24 — polendach24.de', ML, Y);

    // ═══════════════════════════════════════
    // 8. FOOTER (ALL PAGES)
    // ═══════════════════════════════════════
    addFooter();

    const filename = data.offerNumber
        ? `Angebot_${data.offerNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`
        : `Angebot_${new Date().toISOString().slice(0, 10)}.pdf`;

    return { doc, filename };
};

// ── Public API ──
export const generateOfferPDF = (data: OfferPDFData) => {
    const { doc, filename } = buildOfferDoc(data);
    doc.save(filename);
};

export const generateOfferPDFBase64 = (data: OfferPDFData): { base64: string; filename: string } => {
    const { doc, filename } = buildOfferDoc(data);
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1];
    return { base64, filename };
};
