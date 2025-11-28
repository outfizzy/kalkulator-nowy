import jsPDF from 'jspdf';
import type { Installation } from '../types';
import { getOfferPhotos } from './offerPhotos';

export async function generateInstallationProtocolPDF(installation: Installation): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Get photos from centralized storage
    const photos = getOfferPhotos(installation.offerId);

    // **Page 1: Installation Details**

    // Header - Logo (if exists)
    const logoPath = '/logo.png';
    try {
        doc.addImage(logoPath, 'PNG', margin, yPos, 40, 15);
        yPos += 20;
    } catch (e) {
        // Logo not found, skip
        console.warn('Logo not found, skipping in PDF');
    }

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PROTOKÓŁ MONTAŻOWY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Order Number
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Numer zlecenia: ${installation.id}`, margin, yPos);
    yPos += 10;

    // Divider
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Client Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Dane klienta:', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Imię i nazwisko: ${installation.client.firstName} ${installation.client.lastName}`, margin, yPos);
    yPos += 6;
    doc.text(`Adres: ${installation.client.address}, ${installation.client.city}`, margin, yPos);
    yPos += 6;
    doc.text(`Telefon: ${installation.client.phone}`, margin, yPos);
    yPos += 12;

    // Installation Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Szczegóły montażu:', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    if (installation.scheduledDate) {
        const date = new Date(installation.scheduledDate);
        doc.text(`Data montażu: ${date.toLocaleDateString('pl-PL')}`, margin, yPos);
        yPos += 6;
    }

    if (installation.teamId) {
        doc.text(`Przypisana ekipa: ${installation.teamId}`, margin, yPos);
        yPos += 6;
    }

    doc.text(`Produkt: ${installation.productSummary}`, margin, yPos);
    yPos += 6;
    doc.text(`Status: ${getStatusLabel(installation.status)}`, margin, yPos);
    yPos += 12;

    // Notes/Instructions for Crew
    if (installation.notes) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Uwagi/Instrukcje dla ekipy:', margin, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Word wrap for notes
        const notesLines = doc.splitTextToSize(installation.notes, pageWidth - 2 * margin);
        doc.text(notesLines, margin, yPos);
        yPos += notesLines.length * 6;
    }

    // **Page 2+: Photos (one per page)**
    if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
            doc.addPage();

            // Page header
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Zdjęcie ${i + 1} / ${photos.length}`, pageWidth / 2, margin, { align: 'center' });

            // Add image
            try {
                const photo = photos[i];
                const imgProps = getImageDimensions(photo, pageWidth - 2 * margin, pageHeight - 2 * margin - 20);

                const xPos = (pageWidth - imgProps.width) / 2;
                const yPosImg = margin + 15;

                doc.addImage(photo, 'JPEG', xPos, yPosImg, imgProps.width, imgProps.height);
            } catch (e) {
                console.error(`Error adding image ${i + 1} to PDF:`, e);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('Błąd wczytywania zdjęcia', pageWidth / 2, pageHeight / 2, { align: 'center' });
            }
        }
    }

    // Save PDF
    const fileName = `Protokol_Montazowy_${installation.client.lastName}_${installation.id.substring(0, 8)}.pdf`;
    doc.save(fileName);
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
