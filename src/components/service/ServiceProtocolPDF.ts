import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { ServiceTicket } from '../../types';

export const generateServiceProtocol = (ticket: ServiceTicket) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // -- Header --
    doc.setFontSize(22);
    doc.text('Protokół Serwisowy', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Numer zgłoszenia: ${ticket.ticketNumber}`, pageWidth - 20, 30, { align: 'right' });
    doc.text(`Data: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth - 20, 35, { align: 'right' });

    // -- Service Provider --
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Wykonawca:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Polendach', 20, 50);
    // Add company address here if needed

    // -- Client --
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Klient:', pageWidth / 2 + 10, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (ticket.client) {
        doc.text(`${ticket.client.firstName} ${ticket.client.lastName}`, pageWidth / 2 + 10, 50);
        doc.text(`${ticket.client.street || ''} ${ticket.client.houseNumber || ''}`, pageWidth / 2 + 10, 55);
        doc.text(`${ticket.client.city || ''} ${ticket.client.postalCode || ''}`, pageWidth / 2 + 10, 60);
        doc.text(`Tel: ${ticket.client.phone}`, pageWidth / 2 + 10, 65);
    } else {
        doc.text('Brak danych klienta', pageWidth / 2 + 10, 50);
    }

    // -- Ticket Info --
    let yPos = 80;
    doc.setDrawColor(200);
    doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Szczegóły zgłoszenia', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Typ: ${ticket.type}`, 20, yPos);

    // Description (Wrap text)
    const splitDesc = doc.splitTextToSize(`Opis: ${ticket.description}`, pageWidth - 40);
    doc.text(splitDesc, 20, yPos + 7);
    yPos += 10 + (splitDesc.length * 5);

    // -- Tasks --
    if (ticket.tasks && ticket.tasks.length > 0) {
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Lista Czynności (Checklista)', 20, yPos);
        yPos += 10;

        const tableData = ticket.tasks.map(t => [
            t.label,
            t.completed ? 'Wykonano' : 'Nie wykonano'
        ]);

        (doc as any).autoTable({
            startY: yPos,
            head: [['Czynność', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244] },
            margin: { left: 20, right: 20 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 20;
    } else {
        yPos += 10;
    }

    // -- Resolution Notes --
    if (ticket.resolutionNotes) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Notatki z naprawy', 20, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(ticket.resolutionNotes, pageWidth - 40);
        doc.text(splitNotes, 20, yPos);
        yPos += (splitNotes.length * 5) + 20;
    }

    // -- Signatures --
    if (yPos > 250) {
        doc.addPage();
        yPos = 40;
    } else if (yPos < 200) {
        yPos = 240; // Push to bottom if space allows
    }

    doc.setFontSize(10);
    doc.text('......................................................', 20, yPos);
    doc.text('Podpis Wykonawcy', 20, yPos + 5);

    doc.text('......................................................', pageWidth / 2 + 10, yPos);
    doc.text('Podpis Klienta', pageWidth / 2 + 10, yPos + 5);

    doc.text('Potwierdzam odbiór prac bez zastrzeżeń / z uwagami powyżej', pageWidth / 2 + 10, yPos + 12);

    // Save
    doc.save(`Protokol_Serwisowy_${ticket.ticketNumber}.pdf`);
};
