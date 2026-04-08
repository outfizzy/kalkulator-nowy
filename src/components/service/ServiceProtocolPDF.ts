import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { ServiceTicket } from '../../types';

// ── Polish transliteration (helvetica doesn't support diacritics) ──
function t(s: string): string {
    if (!s) return '';
    const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        'ü': 'ue', 'ö': 'oe', 'ä': 'ae', 'Ü': 'Ue', 'Ö': 'Oe', 'Ä': 'Ae', 'ß': 'ss',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a',
    };
    return s.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄßéèêëàâ]/g, ch => map[ch] || ch);
}

const TYPE_LABELS: Record<string, string> = {
    leak: 'Przeciek / Nieszczelnosc',
    electrical: 'Elektryka / LED / Motor',
    mechanical: 'Usterka mechaniczna',
    visual: 'Usterka wizualna',
    other: 'Inne',
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Niski', medium: 'Sredni', high: 'Wysoki', critical: 'Krytyczny',
};

const STATUS_LABELS: Record<string, string> = {
    new: 'Nowe', open: 'Przyjete', scheduled: 'Zaplanowane', in_progress: 'W realizacji',
    resolved: 'Rozwiazane', closed: 'Zamkniete', rejected: 'Odrzucone',
};

export const generateServiceProtocol = async (ticket: ServiceTicket) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const F = 'helvetica';
    const PW = 210;
    const M = 15; // margin
    const contentW = PW - 2 * M;

    // Colors
    const darkSlate = [30, 41, 59];
    const midSlate = [71, 85, 105];
    const lightSlate = [148, 163, 184];
    const accent = [79, 70, 229]; // indigo-600
    const lightBg: [number, number, number] = [248, 250, 252];

    const setColor = (c: number[]) => doc.setTextColor(c[0], c[1], c[2]);
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const txt = (s: string, x: number, y: number) => doc.text(t(s), x, y);

    let y = 15;

    // ════════════════════════════════
    // HEADER
    // ════════════════════════════════
    setFill([30, 41, 59]);
    doc.roundedRect(M, y, contentW, 22, 2, 2, 'F');

    doc.setFontSize(16);
    doc.setFont(F, 'bold');
    doc.setTextColor(255, 255, 255);
    txt('PROTOKOL SERWISOWY', M + 6, y + 10);

    doc.setFontSize(8);
    doc.setFont(F, 'normal');
    doc.setTextColor(200, 200, 200);
    txt('Polendach24 GmbH — Kundenservice', M + 6, y + 17);

    // Ticket number on right
    doc.setFontSize(12);
    doc.setFont(F, 'bold');
    doc.setTextColor(255, 255, 255);
    const ticketNum = ticket.ticketNumber || 'SRV-0000';
    const numW = doc.getTextWidth(t(ticketNum));
    txt(ticketNum, M + contentW - numW - 6, y + 10);

    doc.setFontSize(7);
    doc.setFont(F, 'normal');
    doc.setTextColor(180, 180, 180);
    const dateStr = format(new Date(), 'dd.MM.yyyy');
    const dateW = doc.getTextWidth(dateStr);
    txt(dateStr, M + contentW - dateW - 6, y + 17);

    y += 28;

    // ════════════════════════════════
    // SECTION: CLIENT + SERVICE INFO
    // ════════════════════════════════
    const sectionHeader = (title: string) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setFont(F, 'bold');
        setColor(accent);
        txt(title, M, y);
        y += 1;
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(0.3);
        doc.line(M, y, M + contentW, y);
        y += 5;
    };

    // Two-column layout: Client left, Service Info right
    sectionHeader('DANE KLIENTA / INFORMACJE O SERWISIE');

    setFill(lightBg);
    doc.roundedRect(M, y, contentW, 28, 1, 1, 'F');

    const col1x = M + 4;
    const col2x = M + contentW / 2 + 4;

    // Left column: Client
    doc.setFontSize(7);
    doc.setFont(F, 'bold');
    setColor(lightSlate);
    txt('KLIENT', col1x, y + 4);

    doc.setFontSize(10);
    doc.setFont(F, 'bold');
    setColor(darkSlate);
    const clientName = ticket.client
        ? `${ticket.client.firstName || ''} ${ticket.client.lastName || ''}`.trim()
        : 'Brak danych';
    txt(clientName, col1x, y + 10);

    doc.setFontSize(8);
    doc.setFont(F, 'normal');
    setColor(midSlate);
    if (ticket.client?.street || ticket.client?.city) {
        txt(`${ticket.client?.street || ''} ${(ticket.client as any)?.houseNumber || ''}`, col1x, y + 16);
        txt(`${(ticket.client as any)?.postalCode || ''} ${ticket.client?.city || ''}`, col1x, y + 21);
    }
    if (ticket.client?.phone) {
        txt(`Tel: ${ticket.client.phone}`, col1x, y + 26);
    }

    // Right column: Service info
    doc.setFontSize(7);
    doc.setFont(F, 'bold');
    setColor(lightSlate);
    txt('INFORMACJE O SERWISIE', col2x, y + 4);

    doc.setFontSize(8);
    doc.setFont(F, 'normal');
    setColor(midSlate);
    const typeLabel = TYPE_LABELS[ticket.type] || ticket.type;
    const priorityLabel = PRIORITY_LABELS[ticket.priority] || ticket.priority;
    const statusLabel = STATUS_LABELS[ticket.status] || ticket.status;

    txt(`Typ: ${typeLabel}`, col2x, y + 10);
    txt(`Priorytet: ${priorityLabel}`, col2x, y + 16);
    txt(`Status: ${statusLabel}`, col2x, y + 22);


    if (ticket.scheduledDate) {
        txt(`Termin: ${format(new Date(ticket.scheduledDate), 'dd.MM.yyyy (EEEE)', { locale: pl })}`, col2x, y + 28);
        y += 34;
    } else {
        y += 32;
    }

    // Contract number
    if (ticket.contract?.contractNumber || ticket.contractNumber) {
        const cn = ticket.contract?.contractNumber || ticket.contractNumber || '';
        doc.setFontSize(8);
        doc.setFont(F, 'bold');
        setColor(accent);
        txt(`Nr umowy: ${cn}`, M + 4, y);
        y += 6;
    }

    // Assigned team
    if (ticket.assignedTeam?.name) {
        doc.setFontSize(8);
        doc.setFont(F, 'normal');
        setColor(midSlate);
        txt(`Zespol serwisowy: ${ticket.assignedTeam.name}`, M + 4, y);
        y += 6;
    }

    y += 2;

    // ════════════════════════════════
    // SECTION: DESCRIPTION
    // ════════════════════════════════
    sectionHeader('OPIS USTERKI');

    setFill(lightBg);
    doc.setFontSize(9);
    doc.setFont(F, 'normal');
    setColor(darkSlate);

    const descLines = doc.splitTextToSize(t(ticket.description || 'Brak opisu'), contentW - 8);
    const descH = Math.max(12, descLines.length * 4.5 + 6);
    doc.roundedRect(M, y, contentW, descH, 1, 1, 'F');
    doc.text(descLines, M + 4, y + 5);
    y += descH + 4;

    // Client Notes (from public form)
    if (ticket.clientNotes) {
        sectionHeader('NOTATKI OD KLIENTA');
        const notesLines = doc.splitTextToSize(t(ticket.clientNotes), contentW - 8);
        const notesH = Math.max(10, notesLines.length * 4.5 + 6);
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(M, y, contentW, notesH, 1, 1, 'F');
        doc.setFontSize(9);
        setColor(darkSlate);
        doc.text(notesLines, M + 4, y + 5);
        y += notesH + 4;
    }

    // ════════════════════════════════
    // SECTION: TASKS / CHECKLIST
    // ════════════════════════════════
    if (ticket.tasks && ticket.tasks.length > 0) {
        sectionHeader('LISTA CZYNNOSCI');

        ticket.tasks.forEach((task) => {
            if (y > 270) { doc.addPage(); y = 20; }

            // Checkbox
            const isChecked = task.completed;
            if (isChecked) {
                doc.setFillColor(34, 197, 94);
                doc.roundedRect(M + 2, y - 2.5, 4, 4, 0.5, 0.5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.setFont(F, 'bold');
                doc.text('✓', M + 2.8, y + 0.5);
            } else {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.roundedRect(M + 2, y - 2.5, 4, 4, 0.5, 0.5, 'S');
            }

            doc.setFontSize(9);
            doc.setFont(F, 'normal');
            setColor(isChecked ? [148, 163, 184] : darkSlate);
            txt(task.label, M + 9, y);

            // Status label
            doc.setFontSize(7);
            if (isChecked) {
                doc.setTextColor(34, 197, 94);
                txt('Wykonano', M + contentW - 20, y);
            } else {
                doc.setTextColor(239, 68, 68);
                txt('Do wykonania', M + contentW - 24, y);
            }

            y += 6;
        });
        y += 2;
    }

    // ════════════════════════════════
    // SECTION: RESOLUTION NOTES
    // ════════════════════════════════
    if (ticket.resolutionNotes) {
        sectionHeader('NOTATKI Z NAPRAWY');

        doc.setFillColor(240, 253, 244);
        doc.setFontSize(9);
        doc.setFont(F, 'normal');
        setColor(darkSlate);
        const resLines = doc.splitTextToSize(t(ticket.resolutionNotes), contentW - 8);
        const resH = Math.max(10, resLines.length * 4.5 + 6);
        doc.roundedRect(M, y, contentW, resH, 1, 1, 'F');
        doc.text(resLines, M + 4, y + 5);
        y += resH + 4;
    }

    // ════════════════════════════════
    // SECTION: PHOTOS
    // ════════════════════════════════
    if (ticket.photos && ticket.photos.length > 0) {
        sectionHeader('DOKUMENTACJA FOTOGRAFICZNA');

        // Load images and place 2 per row
        const imgW = (contentW - 6) / 2;
        const imgH = 55;
        const captionH = 6; // extra space for caption text

        for (let i = 0; i < ticket.photos.length; i++) {
            const photoUrl = ticket.photos[i];
            const caption = ticket.photoCaptions?.[photoUrl] || '';
            const totalH = imgH + (caption ? captionH : 0);

            if (y + totalH + 8 > 280) { doc.addPage(); y = 20; }

            const col = i % 2;
            const x = M + col * (imgW + 6);

            try {
                const response = await fetch(photoUrl);
                const blob = await response.blob();
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });

                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(x, y, imgW, imgH, 1, 1, 'S');
                doc.addImage(dataUrl, 'JPEG', x + 0.5, y + 0.5, imgW - 1, imgH - 1);

                // Caption under photo
                doc.setFontSize(7);
                if (caption) {
                    doc.setFont(F, 'bold');
                    setColor(darkSlate);
                    const truncated = t(caption).substring(0, 60);
                    txt(truncated, x + 2, y + imgH + 4);
                } else {
                    doc.setFont(F, 'normal');
                    setColor(lightSlate);
                    txt(`Zdjecie ${i + 1}`, x + 2, y + imgH + 4);
                }
            } catch {
                // Placeholder for failed image
                setFill([241, 245, 249]);
                doc.roundedRect(x, y, imgW, imgH, 1, 1, 'F');
                doc.setFontSize(8);
                setColor(lightSlate);
                txt('Blad ladowania zdjecia', x + imgW / 2 - 18, y + imgH / 2);
            }

            if (col === 1 || i === ticket.photos.length - 1) {
                y += imgH + captionH + 4;
            }
        }
    }

    // ════════════════════════════════
    // SECTION: INTERNAL NOTES
    // ════════════════════════════════
    if (ticket.internalNotes) {
        sectionHeader('NOTATKI WEWNETRZNE');

        doc.setFillColor(255, 251, 235); // amber-50
        doc.setFontSize(9);
        doc.setFont(F, 'normal');
        setColor(darkSlate);
        const intLines = doc.splitTextToSize(t(ticket.internalNotes), contentW - 8);
        const intH = Math.max(10, intLines.length * 4.5 + 6);
        if (y + intH > 270) { doc.addPage(); y = 20; }
        doc.roundedRect(M, y, contentW, intH, 1, 1, 'F');
        doc.text(intLines, M + 4, y + 5);
        y += intH + 4;
    }

    // ════════════════════════════════
    // SECTION: SIGNATURES
    // ════════════════════════════════
    if (y > 230) { doc.addPage(); y = 20; }
    y = Math.max(y + 10, 245);

    sectionHeader('PODPISY');

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    // Left signature
    doc.line(M + 5, y + 10, M + contentW / 2 - 10, y + 10);
    doc.setFontSize(8);
    doc.setFont(F, 'normal');
    setColor(midSlate);
    txt('Podpis Wykonawcy', M + 5, y + 15);
    txt('Data: ____.____.________', M + 5, y + 20);

    // Right signature
    doc.line(M + contentW / 2 + 10, y + 10, M + contentW - 5, y + 10);
    txt('Podpis Klienta', M + contentW / 2 + 10, y + 15);
    txt('Data: ____.____.________', M + contentW / 2 + 10, y + 20);

    y += 28;

    // Acceptance note
    doc.setFontSize(7);
    setColor(lightSlate);
    const acceptLine = 'Potwierdzam odbior prac serwisowych bez zastrzezen / z uwagami powyzej.';
    txt(acceptLine, M + 5, y);

    // Footer
    doc.setFontSize(6);
    setColor(lightSlate);
    doc.line(M, 285, M + contentW, 285);
    txt(`Wygenerowano: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Polendach24 GmbH | polendach24.app`, M, 289);

    // Save
    doc.save(`Protokol_Serwisowy_${ticket.ticketNumber}.pdf`);
};
