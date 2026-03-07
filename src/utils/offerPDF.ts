import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OfferPDFData {
    // Customer
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
    // Technical specs (optional — not shown for manual mode)
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
    // Positions (basket items + custom items)
    positions: Array<{
        name: string;
        description: string;
        dimensions?: string;
        price: number;
    }>;
    // Pricing breakdown
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
    // Meta
    offerNumber?: string;
    offerDate?: string;
    salesPerson?: string;
}

const PRIMARY_COLOR: [number, number, number] = [30, 58, 95];
const ACCENT_COLOR: [number, number, number] = [59, 130, 246];
const LIGHT_BG: [number, number, number] = [245, 247, 250];

const formatEUR = (val: number): string => {
    return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
};

const buildOfferDoc = (data: OfferPDFData): { doc: jsPDF; filename: string } => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const marginLeft = 15;
    const marginRight = 15;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let cursorY = 0;

    const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Seite ${i} von ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
            doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} • Angebot freibleibend`, pageWidth / 2, pageHeight - 4, { align: 'center' });
        }
    };

    const checkPageBreak = (neededHeight: number): void => {
        if (cursorY + neededHeight > pageHeight - 25) {
            doc.addPage();
            cursorY = 20;
        }
    };

    // 1. HEADER
    cursorY = 20;
    doc.setFontSize(18);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('ALUXE', marginLeft, cursorY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Terrassenüberdachungen & Carports', marginLeft, cursorY + 5);

    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('ANGEBOT', pageWidth - marginRight, cursorY, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (data.offerNumber) {
        doc.text(`Nr.: ${data.offerNumber}`, pageWidth - marginRight, cursorY + 5, { align: 'right' });
    }
    doc.text(`Datum: ${data.offerDate || new Date().toLocaleDateString('de-DE')}`, pageWidth - marginRight, cursorY + 10, { align: 'right' });
    if (data.salesPerson) {
        doc.text(`Berater: ${data.salesPerson}`, pageWidth - marginRight, cursorY + 15, { align: 'right' });
    }

    cursorY += 22;
    doc.setDrawColor(...ACCENT_COLOR);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY, pageWidth - marginRight, cursorY);
    cursorY += 8;

    // 2. KUNDENDATEN
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Kundendaten', marginLeft, cursorY);
    cursorY += 6;

    const c = data.customer;
    const customerLines: string[][] = [];
    const fullName = [c.salutation, c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || '';
    if (fullName) customerLines.push(['Name:', fullName]);
    if (c.companyName) customerLines.push(['Firma:', c.companyName]);
    const address = [c.street, c.houseNumber].filter(Boolean).join(' ');
    const cityLine = [c.postalCode, c.city].filter(Boolean).join(' ');
    if (address || cityLine) customerLines.push(['Adresse:', [address, cityLine].filter(Boolean).join(', ')]);
    if (c.phone) customerLines.push(['Telefon:', c.phone]);
    if (c.email) customerLines.push(['E-Mail:', c.email]);

    autoTable(doc, {
        startY: cursorY,
        head: [],
        body: customerLines,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25, textColor: [80, 80, 80] },
            1: { cellWidth: 'auto' }
        },
        margin: { left: marginLeft }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;

    // 3. TECHNISCHE DATEN
    if (data.technical) {
        checkPageBreak(45);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text('Produktkonfiguration', marginLeft, cursorY);
        cursorY += 6;

        const t = data.technical;
        const techData: string[][] = [
            ['Modell:', t.model],
            ['Abmessungen:', `${t.width} × ${t.projection} mm (B × T)`],
            ['Eindeckung:', `${t.cover} — ${t.variant}`],
            ['Bauweise:', t.construction === 'wall' ? 'Wandmontage' : 'Freistehend'],
            ['Farbe:', t.color],
        ];
        if (t.postsCount) {
            const totalPosts = t.postsCount + (t.extraPosts || 0);
            let postDesc = `${totalPosts} Stück`;
            if (t.extraPosts && t.extraPosts > 0) postDesc += ` (${t.postsCount} inkl. + ${t.extraPosts} Zusatzpfosten)`;
            if (t.extraPostHeight === 3000) postDesc += ' — Höhe 3000mm';
            techData.push(['Pfosten:', postDesc]);
        }
        if (t.rafterType) techData.push(['Sparrentyp:', t.rafterType]);

        autoTable(doc, {
            startY: cursorY,
            head: [],
            body: techData,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 } },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 30, textColor: [80, 80, 80] },
                1: { cellWidth: 'auto' }
            },
            margin: { left: marginLeft }
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
    }

    // 4. POSITIONSTABELLE
    checkPageBreak(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Positionen', marginLeft, cursorY);
    cursorY += 6;

    const posBody = data.positions.map((pos, i) => [
        String(i + 1), pos.name, pos.description, pos.dimensions || '', formatEUR(pos.price)
    ]);

    autoTable(doc, {
        startY: cursorY,
        head: [['Nr.', 'Bezeichnung', 'Beschreibung', 'Maße', 'Preis (netto)']],
        body: posBody,
        theme: 'grid',
        headStyles: { fillColor: PRIMARY_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: LIGHT_BG },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 28, halign: 'center', fontSize: 7.5 },
            4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: marginLeft, right: marginRight },
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;

    // 5. PREISZUSAMMENFASSUNG
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Preiszusammenfassung', marginLeft, cursorY);
    cursorY += 6;

    const p = data.pricing;
    const priceRows: (string | { content: string; styles?: any })[][] = [];
    priceRows.push(['Zwischensumme (Katalogpreis)', formatEUR(p.subtotal)]);
    if (p.marginPercent > 0) priceRows.push([`Aufschlag (${p.marginPercent}%)`, `+ ${formatEUR(p.marginValue)}`]);
    if (p.discountPercent > 0) priceRows.push([`Rabatt (${p.discountPercent}%)`, `- ${formatEUR(p.discountValue)}`]);
    if (p.extraPostTotal > 0) priceRows.push(['Zusatzpfosten / Höhenaufschlag', `+ ${formatEUR(p.extraPostTotal)}`]);
    if (p.montagePrice > 0) priceRows.push(['Montage', `+ ${formatEUR(p.montagePrice)}`]);

    priceRows.push([
        { content: 'Gesamtbetrag netto', styles: { fontStyle: 'bold', fontSize: 10 } },
        { content: formatEUR(p.finalPriceNet), styles: { fontStyle: 'bold', fontSize: 10, halign: 'right' } }
    ]);
    priceRows.push(['zzgl. 19% MwSt.', `+ ${formatEUR(p.finalPriceGross - p.finalPriceNet)}`]);
    priceRows.push([
        { content: 'Gesamtbetrag brutto', styles: { fontStyle: 'bold', fontSize: 11, textColor: PRIMARY_COLOR } },
        { content: formatEUR(p.finalPriceGross), styles: { fontStyle: 'bold', fontSize: 11, halign: 'right', textColor: PRIMARY_COLOR } }
    ]);

    autoTable(doc, {
        startY: cursorY,
        head: [],
        body: priceRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 } },
        columnStyles: {
            0: { cellWidth: contentWidth - 40 },
            1: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: marginLeft, right: marginRight },
        didDrawCell: (hookData: any) => {
            if (hookData.row.index === priceRows.length - 3 && hookData.column.index === 0 && hookData.section === 'body') {
                doc.setDrawColor(...ACCENT_COLOR);
                doc.setLineWidth(0.4);
                doc.line(marginLeft, hookData.cell.y, pageWidth - marginRight, hookData.cell.y);
            }
        }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 15;

    // 6. HINWEIS
    checkPageBreak(25);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    const hinweis = [
        'Dieses Angebot ist 30 Tage gültig. Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer.',
        'Technische Änderungen und Irrtümer vorbehalten. Lieferzeit nach Auftragsbestätigung: ca. 4–6 Wochen.',
        'Farb- und Materialabweichungen aufgrund der Druckdarstellung sind möglich.'
    ];
    hinweis.forEach((line, i) => { doc.text(line, marginLeft, cursorY + (i * 4)); });

    // 7. FOOTER
    addFooter();

    const filename = data.offerNumber
        ? `Angebot_${data.offerNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`
        : `Angebot_${new Date().toISOString().slice(0, 10)}.pdf`;

    return { doc, filename };
};

export const generateOfferPDF = (data: OfferPDFData) => {
    const { doc, filename } = buildOfferDoc(data);
    doc.save(filename);
};

export const generateOfferPDFBase64 = (data: OfferPDFData): { base64: string; filename: string } => {
    const { doc, filename } = buildOfferDoc(data);
    // datauristring gives "data:application/pdf;base64,XXXXX" — extract just the base64 part
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1];
    return { base64, filename };
};

