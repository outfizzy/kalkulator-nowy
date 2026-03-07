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

// ──── COLORS ────
const NAVY: [number, number, number] = [15, 30, 55];
const BLUE: [number, number, number] = [40, 100, 210];
const DARK_GRAY: [number, number, number] = [60, 60, 65];
const MED_GRAY: [number, number, number] = [120, 120, 125];
const LIGHT_GRAY: [number, number, number] = [200, 200, 205];
const ZEBRA_BG: [number, number, number] = [245, 247, 252];
const WHITE: [number, number, number] = [255, 255, 255];

const formatEUR = (val: number): string =>
    val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

// ──── DOCUMENT BUILDER ────
const buildOfferDoc = (data: OfferPDFData): { doc: jsPDF; filename: string } => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.width;   // 210
    const H = doc.internal.pageSize.height;  // 297
    const ML = 18;   // margin left
    const MR = 18;   // margin right
    const CW = W - ML - MR;                 // content width (174)
    let Y = 0;

    // ── helpers ──
    const pageBreak = (need: number) => {
        if (Y + need > H - 28) { doc.addPage(); Y = 22; }
    };
    const separator = (y: number, color: [number, number, number] = LIGHT_GRAY) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.3);
        doc.line(ML, y, W - MR, y);
    };
    const sectionTitle = (title: string) => {
        pageBreak(18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text(title.toUpperCase(), ML, Y);
        Y += 1.5;
        separator(Y, BLUE);
        Y += 5;
    };
    const addFooter = () => {
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            // Thin line
            doc.setDrawColor(...LIGHT_GRAY);
            doc.setLineWidth(0.2);
            doc.line(ML, H - 16, W - MR, H - 16);
            // Left — company
            doc.setFontSize(6.5);
            doc.setTextColor(...MED_GRAY);
            doc.setFont('helvetica', 'normal');
            doc.text('Polendach24 — Terrassenüberdachungen & Carports', ML, H - 12);
            doc.text('Tel: +49 176 47453883 | buero@polendach24.de', ML, H - 8.5);
            // Right — page number
            doc.text(`Seite ${i} / ${pages}`, W - MR, H - 12, { align: 'right' });
            doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, W - MR, H - 8.5, { align: 'right' });
        }
    };

    // ═══════════════════════════════════════
    // 1. HEADER BAR
    // ═══════════════════════════════════════
    // Dark navy strip
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 32, 'F');

    doc.setTextColor(...WHITE);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('POLENDACH24', ML, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 200, 230);
    doc.text('Terrassenüberdachungen & Carports — Qualität aus Aluminium', ML, 20);

    // Right side — Offer meta
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ANGEBOT', W - MR, 12, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (data.offerNumber) {
        doc.text(`Nr.: ${data.offerNumber}`, W - MR, 17, { align: 'right' });
    }
    doc.text(`Datum: ${data.offerDate || new Date().toLocaleDateString('de-DE')}`, W - MR, 22, { align: 'right' });
    if (data.salesPerson) {
        doc.text(`Berater: ${data.salesPerson}`, W - MR, 27, { align: 'right' });
    }

    Y = 42;

    // ═══════════════════════════════════════
    // 2. KUNDENDATEN
    // ═══════════════════════════════════════
    sectionTitle('Kundendaten');

    const c = data.customer;
    const fullName = [c.salutation, c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || '';
    const customerRows: string[][] = [];
    if (fullName) customerRows.push(['Name:', fullName]);
    if (c.companyName) customerRows.push(['Firma:', c.companyName]);
    const addr = [c.street, c.houseNumber].filter(Boolean).join(' ');
    const city = [c.postalCode, c.city].filter(Boolean).join(' ');
    if (addr || city) customerRows.push(['Adresse:', [addr, city].filter(Boolean).join(', ')]);
    if (c.phone) customerRows.push(['Telefon:', c.phone]);
    if (c.email) customerRows.push(['E-Mail:', c.email]);

    if (customerRows.length > 0) {
        autoTable(doc, {
            startY: Y,
            body: customerRows,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 22, textColor: DARK_GRAY },
                1: { cellWidth: 'auto', textColor: [30, 30, 30] }
            },
            margin: { left: ML }
        });
        Y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ═══════════════════════════════════════
    // 3. PRODUKTKONFIGURATION
    // ═══════════════════════════════════════
    if (data.technical) {
        sectionTitle('Produktkonfiguration');
        const t = data.technical;
        const techRows: string[][] = [
            ['Modell:', t.model],
            ['Abmessungen:', `${t.width} × ${t.projection} mm (B × T)`],
            ['Eindeckung:', `${t.cover} — ${t.variant}`],
            ['Bauweise:', t.construction === 'wall' ? 'Wandmontage' : 'Freistehend'],
            ['Farbe:', t.color],
        ];
        if (t.postsCount) {
            const total = t.postsCount + (t.extraPosts || 0);
            let desc = `${total} Stück`;
            if (t.extraPosts && t.extraPosts > 0) desc += ` (${t.postsCount} inkl. + ${t.extraPosts} Zusatzpfosten)`;
            if (t.extraPostHeight === 3000) desc += ' — Höhe 3000 mm';
            techRows.push(['Pfosten:', desc]);
        }
        if (t.rafterType) techRows.push(['Sparrentyp:', t.rafterType]);

        autoTable(doc, {
            startY: Y,
            body: techRows,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 28, textColor: DARK_GRAY },
                1: { cellWidth: 'auto', textColor: [30, 30, 30] }
            },
            margin: { left: ML }
        });
        Y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ═══════════════════════════════════════
    // 4. POSITIONSTABELLE
    // ═══════════════════════════════════════
    sectionTitle('Positionen');

    const posBody = data.positions.map((pos, i) => [
        String(i + 1),
        pos.name,
        pos.description,
        pos.dimensions || '',
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
            cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        },
        styles: {
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            overflow: 'linebreak',
            lineColor: [210, 210, 215],
            lineWidth: 0.15,
            textColor: [30, 30, 30],
        },
        alternateRowStyles: { fillColor: ZEBRA_BG },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', textColor: MED_GRAY },
            1: { cellWidth: 34, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 30, halign: 'center', fontSize: 7, textColor: DARK_GRAY },
            4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: ML, right: MR },
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
    });
    Y = (doc as any).lastAutoTable.finalY + 10;

    // ═══════════════════════════════════════
    // 5. PREISZUSAMMENFASSUNG
    // ═══════════════════════════════════════
    sectionTitle('Preiszusammenfassung');

    const p = data.pricing;
    const priceRows: (string | { content: string; styles?: any })[][] = [];

    priceRows.push(['Zwischensumme (Katalogpreis)', formatEUR(p.subtotal)]);
    if (p.marginPercent > 0)
        priceRows.push([`Aufschlag ${p.marginPercent}%`, `+ ${formatEUR(p.marginValue)}`]);
    if (p.discountPercent > 0)
        priceRows.push([`Rabatt ${p.discountPercent}%`, `− ${formatEUR(p.discountValue)}`]);
    if (p.extraPostTotal > 0)
        priceRows.push(['Zusatzpfosten / Höhenaufschlag', `+ ${formatEUR(p.extraPostTotal)}`]);
    if (p.montagePrice > 0)
        priceRows.push(['Montage', `+ ${formatEUR(p.montagePrice)}`]);

    // Netto total
    priceRows.push([
        { content: 'Gesamtbetrag netto', styles: { fontStyle: 'bold', fontSize: 10, textColor: NAVY } },
        { content: formatEUR(p.finalPriceNet), styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', textColor: NAVY } }
    ]);
    // MwSt
    priceRows.push(['zzgl. 19 % MwSt.', `+ ${formatEUR(p.finalPriceGross - p.finalPriceNet)}`]);
    // Brutto total
    priceRows.push([
        { content: 'Gesamtbetrag brutto', styles: { fontStyle: 'bold', fontSize: 12, textColor: NAVY } },
        { content: formatEUR(p.finalPriceGross), styles: { fontStyle: 'bold', fontSize: 12, halign: 'right', textColor: NAVY } }
    ]);

    autoTable(doc, {
        startY: Y,
        body: priceRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: DARK_GRAY },
        columnStyles: {
            0: { cellWidth: CW - 38 },
            1: { cellWidth: 38, halign: 'right' }
        },
        margin: { left: ML, right: MR },
        didDrawCell: (hookData: any) => {
            // Separator line before netto total
            if (hookData.row.index === priceRows.length - 3 && hookData.column.index === 0 && hookData.section === 'body') {
                doc.setDrawColor(...BLUE);
                doc.setLineWidth(0.4);
                doc.line(ML, hookData.cell.y, W - MR, hookData.cell.y);
            }
            // Highlight brutto row with light blue background
            if (hookData.row.index === priceRows.length - 1 && hookData.section === 'body') {
                doc.setFillColor(235, 240, 252);
                doc.rect(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height, 'F');
                // Re-draw text over fill
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...NAVY);
                if (hookData.column.index === 0) {
                    doc.text('Gesamtbetrag brutto', hookData.cell.x + 4, hookData.cell.y + hookData.cell.height / 2 + 1.5);
                } else {
                    doc.text(formatEUR(p.finalPriceGross), hookData.cell.x + hookData.cell.width - 4, hookData.cell.y + hookData.cell.height / 2 + 1.5, { align: 'right' });
                }
            }
        }
    });
    Y = (doc as any).lastAutoTable.finalY + 14;

    // ═══════════════════════════════════════
    // 6. HINWEISE
    // ═══════════════════════════════════════
    pageBreak(28);
    doc.setFontSize(7.5);
    doc.setTextColor(...MED_GRAY);
    doc.setFont('helvetica', 'normal');
    const notes = [
        'Dieses Angebot ist 30 Tage gültig. Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer.',
        'Technische Änderungen und Irrtümer vorbehalten. Lieferzeit nach Auftragsbestätigung: ca. 4–6 Wochen.',
        'Farb- und Materialabweichungen aufgrund der Druckdarstellung sind möglich.',
        'Mit freundlichen Grüßen — Ihr Polendach24 Team'
    ];
    notes.forEach((line, i) => {
        doc.text(line, ML, Y + i * 4);
    });

    // ═══════════════════════════════════════
    // 7. FOOTER
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
