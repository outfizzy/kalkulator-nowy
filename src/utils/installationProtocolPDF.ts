import jsPDF from 'jspdf';
import type { Installation } from '../types';
import { getOfferPhotos } from './offerPhotos';

// Generate installation protocol PDF and download it
export async function generateInstallationProtocolPDF(installation: Installation): Promise<void> {
    const doc = await buildProtocolPDF(installation);
    const fileName = `Protokol_Montazowy_${installation.client.lastName}_${installation.id.substring(0, 8)}.pdf`;
    doc.save(fileName);
}

// Generate installation protocol PDF and return as Blob (for uploading to database)
export async function generateInstallationProtocolPDFAsBlob(installation: Installation): Promise<Blob> {
    const doc = await buildProtocolPDF(installation);
    return doc.output('blob');
}

// Internal helper to build the PDF document
// Internal helper to build the PDF document
import { robotoRegular } from './robotoFont';

// Internal helper to build the PDF document
async function buildProtocolPDF(installation: Installation): Promise<jsPDF> {
    const doc = new jsPDF();

    // Add font for Polish characters (Roboto)
    try {
        doc.addFileToVFS('Roboto-Regular.ttf', robotoRegular);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto'); // Set as default
    } catch (e) {
        console.warn('Failed to load Roboto font, falling back to Helvetica', e);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Get photos from centralized storage
    const photos = installation.offerId ? getOfferPhotos(installation.offerId) : [];

    // **Page 1: Installation Details**

    // Header - Logo (if exists)
    const logoPath = '/logo.png';
    try {
        doc.addImage(logoPath, 'PNG', margin, yPos, 40, 15);
        // yPos += 20; // Don't move Y too much, keep logo aside
    } catch (err) {
        console.warn('Error loading logo image', err);
    }

    // Header Text
    doc.setFontSize(18);
    // Use Roboto if loaded, else fallback
    doc.setFont('Roboto', 'bold');
    doc.text('PROTOKÓŁ MONTAŻOWY', pageWidth - margin, yPos + 10, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    const orderRef = installation.id ? installation.id.substring(0, 8).toUpperCase() : '---';
    doc.text(`Nr zlecenia: ${orderRef}`, pageWidth - margin, yPos + 16, { align: 'right' });
    doc.text(`Data: ${new Date().toLocaleDateString('pl-PL')}`, pageWidth - margin, yPos + 22, { align: 'right' });

    yPos += 30;

    // Divider
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // 1. Client & Location
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.text('1. DANE KLIENTA I MIEJSCE MONTAŻU', margin + 2, yPos + 6);
    yPos += 14;

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    // Using simple substitution for potentially missing chars if font fails, but here we assume font works
    doc.text(`Klient: ${installation.client.firstName} ${installation.client.lastName}`, margin, yPos);
    doc.text(`Tel: ${installation.client.phone}`, pageWidth / 2, yPos);
    yPos += 6;
    doc.text(`Adres: ${installation.client.address}, ${installation.client.city} ${installation.client.postalCode || ''}`, margin, yPos);
    yPos += 12;

    // 2. Installation Scope
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.text('2. ZAKRES PRAC I PRODUKTY', margin + 2, yPos + 6);
    yPos += 14;

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');

    // Product Summary
    doc.text(`Produkt główny:`, margin, yPos);
    doc.setFont('Roboto', 'bold');
    const productSplit = doc.splitTextToSize(installation.productSummary || 'Brak danych', pageWidth - margin - 50);
    doc.text(productSplit, margin + 35, yPos);
    doc.setFont('Roboto', 'normal');
    yPos += 6 * productSplit.length + 4;

    // Contract Number (if available) use as ref
    if (installation.contractNumber) {
        doc.text(`Umowa nr: ${installation.contractNumber}`, margin, yPos);
        yPos += 6;
    }

    doc.text(`Status: ${getStatusLabel(installation.status)}`, margin, yPos);
    yPos += 6;


    // Add space for manual list check
    yPos += 4;
    doc.rect(margin, yPos, 5, 5); doc.text('Konstrukcja', margin + 8, yPos + 4);
    doc.rect(margin + 40, yPos, 5, 5); doc.text('Pokrycie (Szkło/Poli)', margin + 48, yPos + 4);
    doc.rect(margin + 90, yPos, 5, 5); doc.text('Dodatki (Markizy/LED)', margin + 98, yPos + 4);
    yPos += 12;


    // 3. Notes
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.text('3. UWAGI MONTAŻOWE / BIURO', margin + 2, yPos + 6);
    yPos += 14;

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    if (installation.notes) {
        const notesLines = doc.splitTextToSize(installation.notes, pageWidth - 2 * margin);
        doc.text(notesLines, margin, yPos);
        yPos += notesLines.length * 6 + 6;
    } else {
        doc.text('Brak uwag.', margin, yPos);
        yPos += 10;
    }

    // 4. Client Notes
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.text('4. UWAGI KLIENTA PO MONTAŻU', margin + 2, yPos + 6);
    yPos += 14;

    // Dotted lines for client notes
    for (let i = 0; i < 3; i++) {
        // jsPDF setLineDash: [dash length, gap length], phase
        doc.setLineDash([1, 1], 0);
        doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);
        yPos += 8;
    }
    doc.setLineDash([], 0); // Reset
    yPos += 5;

    // 5. Checklist & Signatures
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.text('5. ODBIÓR I PODPISY', margin + 2, yPos + 6);
    yPos += 14;


    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Checkboxes
    const checkY = yPos;
    doc.rect(margin, checkY, 4, 4); doc.text('Montaż zakończony', margin + 6, checkY + 3);
    doc.rect(margin + 50, checkY, 4, 4); doc.text('Teren posprzątany', margin + 56, checkY + 3);
    doc.rect(margin + 100, checkY, 4, 4); doc.text('Klient poinstruowany', margin + 106, checkY + 3);
    yPos += 10;

    // Signature Boxes
    const boxHeight = 35;
    const boxWidth = (pageWidth - 2 * margin - 10) / 2;

    // Installer Box
    doc.rect(margin, yPos, boxWidth, boxHeight);
    doc.setFontSize(8);
    doc.text('DATA I PODPIS MONTERA', margin + 2, yPos + 4);

    // Client Box
    doc.rect(margin + boxWidth + 10, yPos, boxWidth, boxHeight);
    doc.text('DATA I PODPIS KLIENTA (Odbiór prac)', margin + boxWidth + 12, yPos + 4);

    doc.setFontSize(7);
    doc.text('Podpisując protokół klient potwierdza odbiór ilościowy i jakościowy prac oraz brak uwag do stanu mienia.', margin + boxWidth + 12, yPos + boxHeight - 2, { maxWidth: boxWidth - 4 });

    yPos += boxHeight + 10;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Wygenerowano systemowo | TGA Metal', pageWidth / 2, pageHeight - 10, { align: 'center' });


    // **Page 2+: Photos (one per page)**
    if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
            doc.addPage();
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Zdjęcie podglądowe ${i + 1} / ${photos.length}`, pageWidth / 2, margin, { align: 'center' });

            // Image logic... (simplified for brevity, reuse existing logic if robust)
            try {
                const photo = photos[i];
                const imgProps = getImageDimensions(photo, pageWidth - 2 * margin, pageHeight - 2 * margin - 20);

                const xPos = (pageWidth - imgProps.width) / 2;
                const yPosImg = margin + 15;

                doc.addImage(photo, 'JPEG', xPos, yPosImg, imgProps.width, imgProps.height);
            } catch (err) {
                console.warn('Error rendering image in PDF', err);
            }
        }
    }

    return doc;
}

// Helper: Get status label in Polish
function getStatusLabel(status: string): string {
    switch (status) {
        case 'pending': return 'Oczekujący';
        case 'scheduled': return 'Zaplanowany';
        case 'in-progress': return 'W trakcie';
        case 'completed': return 'Zakończony';
        default: return status;
    }
}

// Helper: Calculate image dimensions to fit page while maintaining aspect ratio
function getImageDimensions(
    imgData: string,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    // Create temporary image to get dimensions
    const img = new Image();
    img.src = imgData;

    const aspectRatio = img.width / img.height;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    return { width, height };
}
