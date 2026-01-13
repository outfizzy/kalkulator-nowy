import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FairProductConfig } from '../types';

interface PDFLeadData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes?: string;
    wonPrize?: {
        label: string;
        type: string;
        value: any;
    } | null;
    photos?: { url: string; name: string }[];
}

export const generateFairPDF = (data: PDFLeadData, products: FairProductConfig[], salesRepName: string) => {
    // 1. Initialize Doc
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 2. Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Karta Klienta - TARGI', 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}`, 15, 28);
    doc.text(`Opiekun: ${salesRepName}`, 15, 33);

    // 3. Client Info Table
    autoTable(doc, {
        startY: 40,
        head: [['Dane Klienta', 'Kontakt']],
        body: [
            [`${data.firstName} ${data.lastName}`, `Tel: ${data.phone}`],
            [data.email || '-', ``]
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // 4. Prize Section
    if (data.wonPrize) {
        doc.setFontSize(14);
        doc.setTextColor(22, 163, 74); // Green
        doc.text(`🎉 WYGRANA NAGRODA: ${data.wonPrize.label}`, 15, currentY);
        currentY += 10;
        doc.setLineWidth(0.5);
        doc.setDrawColor(22, 163, 74);
        doc.line(15, currentY - 8, pageWidth - 15, currentY - 8);
    }

    // 5. Products Table
    if (products.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Konfiguracja Produktów', 15, currentY + 10);

        const rows = products.map((p, index) => {
            const details = [];
            if (p.roofFill) details.push(`Wypełnienie: ${p.roofFill === 'glass' ? 'Szkło' : 'Poliwęglan'}`);
            if (p.wallTypes && p.wallTypes.length > 0) details.push(`Ściany: ${p.wallTypes.join(', ')} (${p.wallSidesCount} strony)`);
            if (p.zipEnabled) details.push(`ZIP: TAK (${p.zipSidesCount} szt.)`);
            if (p.ledType && p.ledType !== 'none') details.push(`LED: ${p.ledType}`);
            if (p.notes) details.push(`Uwagi: ${p.notes}`);

            return [
                `${index + 1}. ${getProductLabel(p.type)}`,
                `${p.width} x ${p.projection} mm`,
                details.join('\n')
            ];
        });

        autoTable(doc, {
            startY: currentY + 15,
            head: [['Produkt', 'Wymiary', 'Szczegóły']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [71, 85, 105] },
            styles: { cellPadding: 2, fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 6. Notes
    if (data.notes) {
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text('Notatka Główna:', 15, currentY);
        doc.setFontSize(10);

        const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 30);
        doc.text(splitNotes, 15, currentY + 7);
        currentY += splitNotes.length * 5 + 10;
    }

    // 7. Footer (Attachments count)
    if (data.photos && data.photos.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`* Załączono ${data.photos.length} zdjęć/szkiców do systemu CRM.`, 15, currentY + 10);
    }

    // 8. Save
    doc.save(`Karta_Targowa_${data.lastName}_${new Date().getTime()}.pdf`);
};

const getProductLabel = (type: string) => {
    switch (type) {
        case 'roof': return 'Zadaszenie';
        case 'pergola': return 'Pergola';
        case 'carport': return 'Carport';
        case 'other': return 'Inne';
        default: return type;
    }
};
