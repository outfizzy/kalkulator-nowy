import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MeasurementReport } from '../types';

export const generateMeasurementReportPDF = (report: MeasurementReport, userName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Raport Pomiarowy', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${new Date(report.date).toLocaleDateString('pl-PL')}`, pageWidth - 15, 15, { align: 'right' });
    doc.text(`Przedstawiciel: ${userName}`, pageWidth - 15, 20, { align: 'right' });
    doc.text(`ID Raportu: ${report.id.slice(0, 8)}`, pageWidth - 15, 25, { align: 'right' });

    // --- Car & Trip Details ---
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 35, pageWidth - 15, 35);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Dane Trasy', 15, 45);

    const tripData = [
        ['Nr Rejestracyjny:', report.carPlate],
        ['Licznik Start:', `${report.odometerStart} km`],
        ['Licznik Stop:', `${report.odometerEnd} km`],
        ['Dystans Całkowity:', `${report.totalKm} km`],
        ['Jazda z kierowcą:', report.withDriver ? 'TAK' : 'NIE'],
        ['Uwagi do auta:', report.carIssues || 'Brak']
    ];

    autoTable(doc, {
        startY: 50,
        head: [],
        body: tripData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 60 }
        },
        margin: { left: 15 }
    });

    // --- Description ---
    if (report.reportDescription) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.text('Opis / Notatki:', 15, finalY);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        const splitText = doc.splitTextToSize(report.reportDescription, pageWidth - 30);
        doc.text(splitText, 15, finalY + 6);
    }

    // --- Visits Table ---
    let visitsY = (doc as any).lastAutoTable.finalY + (report.reportDescription ? 25 : 15);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Lista Wizyt', 15, visitsY);

    const visitsData = report.visits.map((v, index) => [
        index + 1,
        v.customerName,
        v.address,
        v.productSummary,
        v.outcome === 'signed' ? 'UMOWA' :
            v.outcome === 'measured' ? 'Pomiar' :
                v.outcome === 'rejected' ? 'Odrzucone' : 'Decyzja',
        v.notes || '-'
    ]);

    autoTable(doc, {
        startY: visitsY + 5,
        head: [['Lp.', 'Klient', 'Adres', 'Produkt', 'Wynik', 'Notatki']],
        body: visitsData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 45 },
            3: { cellWidth: 30 },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 'auto' }
        }
    });

    // --- Summary ---
    const summaryY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text(`Podpisane umowy: ${report.signedContractsCount}`, 15, summaryY);
    doc.text(`Liczba wizyt: ${report.visits.length}`, 15, summaryY + 5);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Wygenerowano z systemu Polendach24 - Strona ${i} z ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`Raport_Pomiarowy_${report.date}_${userName.replace(/\s+/g, '_')}.pdf`);
};
