import jsPDF from 'jspdf';
import type { Contract } from '../types';

export type PhotoLayout = '2-per-page' | '1-per-page';

// Polish character transliteration for helvetica (no unicode support)
const PL_MAP: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
    'ü': 'u', 'ö': 'o', 'ä': 'a', 'Ü': 'U', 'Ö': 'O', 'Ä': 'A', 'ß': 'ss',
    '—': '-', '–': '-', '×': 'x'
};
const t = (str: string): string => str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄß—–×]/g, ch => PL_MAP[ch] || ch);

/**
 * Generate a professional installation protocol PDF from Contract data.
 */
export async function generateContractProtocolPDF(
    contract: Contract,
    photoLayout: PhotoLayout = '2-per-page'
): Promise<void> {
    const doc = await buildContractProtocol(contract, photoLayout);
    const lastName = t(contract.client?.lastName || 'Klient');
    const nr = (contract.contractNumber || '').replace(/\//g, '-');
    doc.save(`Protokol_Montazowy_${lastName}_${nr}.pdf`);
}

// ─── INTERNAL ─────────────────────────────────────────────

async function buildContractProtocol(contract: Contract, photoLayout: PhotoLayout): Promise<jsPDF> {
    const doc = new jsPDF();

    // Use helvetica — always works, no font loading issues
    const F = 'helvetica';

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;
    const contentW = W - 2 * M;
    let y = M;

    const product = contract.product as any;
    const pricing = contract.pricing as any;
    const measurements = product?.measurements || {};
    const client = contract.client;

    // ── Color palette ──
    const darkSlate = [30, 41, 59] as const;
    const midSlate = [100, 116, 139] as const;
    const accentBlue = [37, 99, 235] as const;
    const lightBg = [248, 250, 252] as const;
    const greenBg = [220, 252, 231] as const;
    const amberBg = [254, 243, 199] as const;

    // ── Helper functions ──
    const setColor = (rgb: readonly [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setFill = (rgb: readonly [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

    const txt = (text: string, x: number, yy: number, opts?: any) => {
        doc.text(t(text), x, yy, opts);
    };

    const sectionHeader = (title: string) => {
        if (y > H - 40) { doc.addPage(); y = M; }
        setFill(darkSlate);
        doc.roundedRect(M, y, contentW, 9, 1, 1, 'F');
        doc.setFontSize(10);
        doc.setFont(F, 'bold');
        doc.setTextColor(255, 255, 255);
        txt(title, M + 4, y + 6.5);
        y += 13;
        doc.setFont(F, 'normal');
        setColor(darkSlate);
    };

    const hr = () => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(M, y, W - M, y);
        y += 3;
    };

    // ════════════════════════════════════════════════════
    // PAGE 1: HEADER
    // ════════════════════════════════════════════════════

    // Logo
    try {
        doc.addImage('/logo.png', 'PNG', M, y, 35, 13);
    } catch { /* no logo */ }

    // Title
    doc.setFontSize(18);
    doc.setFont(F, 'bold');
    setColor(darkSlate);
    txt('PROTOKOL MONTAZOWY', W - M, y + 8, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont(F, 'normal');
    setColor(midSlate);
    txt(`Umowa nr: ${contract.contractNumber || '-'}`, W - M, y + 14, { align: 'right' });
    txt(`Data wydruku: ${new Date().toLocaleDateString('pl-PL')}`, W - M, y + 19, { align: 'right' });

    if (product?.plannedInstallDate) {
        doc.setFont(F, 'bold');
        setColor(accentBlue);
        txt(`Planowany montaz: ${new Date(product.plannedInstallDate).toLocaleDateString('pl-PL')}`, W - M, y + 24, { align: 'right' });
        doc.setFont(F, 'normal');
    }

    y += 30;
    hr();
    y += 2;

    // ════════════════════════════════════════════════════
    // SECTION 1: KLIENT & ADRES MONTAŻU
    // ════════════════════════════════════════════════════
    sectionHeader('DANE KLIENTA I ADRES MONTAZU');

    // Client name — large
    doc.setFontSize(14);
    doc.setFont(F, 'bold');
    setColor(darkSlate);
    txt(`${client.firstName} ${client.lastName}`, M + 2, y + 2);
    y += 10;

    // Left column: Address
    const leftStartY = y;
    doc.setFontSize(10);
    doc.setFont(F, 'normal');
    setColor(darkSlate);
    const address = `${client.street || ''} ${client.houseNumber || ''}`.trim();
    const cityLine = `${client.postalCode || ''} ${client.city || ''}`.trim();
    if (address) { txt(address, M + 2, y); y += 6; }
    if (cityLine) { txt(cityLine, M + 2, y); y += 6; }
    const leftEndY = y;

    // Right column: Phone & Email
    const contactX = W / 2 + 10;
    let contactY = leftStartY;
    if (client.phone) {
        doc.setFontSize(8);
        setColor(midSlate);
        txt('Telefon:', contactX, contactY);
        doc.setFontSize(11);
        doc.setFont(F, 'bold');
        setColor(accentBlue);
        txt(client.phone, contactX, contactY + 5);
        doc.setFont(F, 'normal');
        contactY += 14;
    }
    if (client.email) {
        doc.setFontSize(8);
        setColor(midSlate);
        txt('E-mail:', contactX, contactY);
        doc.setFontSize(9);
        setColor(darkSlate);
        txt(client.email, contactX, contactY + 5);
        contactY += 12;
    }
    const rightEndY = contactY;

    // Use the taller column to set y
    y = Math.max(leftEndY, rightEndY) + 4;

    // Delivery address (if different)
    if (product?.deliveryAddress && (product.deliveryAddress.street || product.deliveryAddress.city)) {
        setFill(amberBg);
        doc.roundedRect(M, y, contentW, 12, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setFont(F, 'bold');
        setColor([146, 64, 14]);
        txt('ADRES DOSTAWY / MONTAZU (INNY NIZ KLIENT):', M + 3, y + 4);
        doc.setFontSize(10);
        doc.setFont(F, 'normal');
        txt(`${product.deliveryAddress.street || ''} ${product.deliveryAddress.city || ''}`.trim(), M + 3, y + 9);
        y += 15;
    }

    y += 3;

    // ════════════════════════════════════════════════════
    // SECTION 2: PRODUKT
    // ════════════════════════════════════════════════════
    sectionHeader('PRODUKT I KONFIGURACJA');

    // Model card
    setFill(lightBg);
    doc.roundedRect(M, y, contentW, 22, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(M, y, contentW, 22, 2, 2, 'S');

    const modelId = product?.modelId || 'Brak';
    const modelName = modelId === 'MANUAL' ? 'Zlecenie Manualne' : modelId.toUpperCase();
    doc.setFontSize(14);
    doc.setFont(F, 'bold');
    setColor(darkSlate);
    txt(modelName, M + 4, y + 7);

    // Dimensions
    const dimParts: string[] = [];
    if (product?.width && product?.projection) dimParts.push(`${product.width} x ${product.projection} mm`);
    if (product?.color && product.color !== 'N/A') dimParts.push(product.color);
    if (dimParts.length) {
        doc.setFontSize(10);
        doc.setFont(F, 'normal');
        setColor(midSlate);
        txt(dimParts.join('  |  '), M + 4, y + 13);
    }

    // Badges
    const badges: string[] = [];
    if (product?.numberOfPosts) badges.push(`${product.numberOfPosts} slupow`);
    const mountLabels: Record<string, string> = { wall: 'Scienny', ceiling: 'Sufitowy', freestanding: 'Wolnostojacy' };
    if (product?.installationType) badges.push(mountLabels[product.installationType] || product.installationType);
    if (measurements?.hasDrainage) {
        const drLabels: Record<string, string> = { links: '<- Links', rechts: 'Rechts ->', beidseitig: '<- Obie ->' };
        badges.push(`Odplyw: ${drLabels[product?.drainageDirection] || product?.drainageDirection || 'Tak'}`);
    }
    if (measurements?.hasElectrical) badges.push('Prad');

    if (badges.length) {
        doc.setFontSize(8);
        setColor(midSlate);
        txt(badges.join('  |  '), M + 4, y + 19);
    }

    y += 26;

    // ── Items / Addons table ──
    // Use orderedItems as canonical source (it already includes addons + customItems).
    // Fall back to product-level items only when orderedItems is empty.
    const allItems: Array<{ name: string; qty: number; type: string }> = [];
    if (contract.orderedItems?.length) {
        // Canonical list — no duplication
        contract.orderedItems.forEach((item: any) => {
            const typeLabel = item.category === 'Roofing' ? 'Produkt' :
                              item.category === 'Accessories' ? 'Akcesorium' :
                              item.category === 'Other' ? 'Pozycja' : item.category || 'Zamowiony';
            allItems.push({ name: item.name || item.description || '', qty: item.quantity || 1, type: typeLabel });
        });
    } else {
        // Fallback: build from raw product config (older contracts without orderedItems)
        if (product?.customItems?.length) {
            product.customItems.forEach((item: any) => {
                allItems.push({ name: item.name || item.description || '', qty: item.quantity || 1, type: 'Produkt' });
            });
        }
        if (product?.addons?.length) {
            product.addons.forEach((a: any) => {
                allItems.push({ name: a.name || a, qty: a.quantity || 1, type: 'Dodatek' });
            });
        }
    }

    if (allItems.length > 0) {
        doc.setFontSize(8);
        doc.setFont(F, 'bold');
        setColor(midSlate);
        txt('ELEMENTY ZLECENIA:', M, y + 3);
        y += 6;

        // Table header
        setFill([241, 245, 249]);
        doc.rect(M, y, contentW, 7, 'F');
        doc.setFontSize(7);
        doc.setFont(F, 'bold');
        setColor(midSlate);
        txt('Lp.', M + 2, y + 5);
        txt('Nazwa / Opis', M + 12, y + 5);
        txt('Typ', W - M - 30, y + 5);
        txt('Ilosc', W - M - 10, y + 5);
        y += 8;

        allItems.forEach((item, idx) => {
            if (y > H - 30) { doc.addPage(); y = M; }
            if (idx % 2 === 0) {
                setFill([248, 250, 252]);
                doc.rect(M, y - 1, contentW, 7, 'F');
            }
            doc.setFontSize(8);
            doc.setFont(F, 'normal');
            setColor(darkSlate);
            txt(`${idx + 1}.`, M + 2, y + 4);

            const nameLines = doc.splitTextToSize(t(item.name), contentW - 60);
            doc.text(nameLines[0], M + 12, y + 4);

            doc.setFontSize(7);
            setColor(midSlate);
            txt(item.type, W - M - 30, y + 4);

            doc.setFontSize(9);
            doc.setFont(F, 'bold');
            setColor(darkSlate);
            txt(`${item.qty}`, W - M - 6, y + 4, { align: 'right' });
            doc.setFont(F, 'normal');

            y += nameLines.length > 1 ? 10 : 7;
        });

        y += 3;
    }

    // ════════════════════════════════════════════════════
    // SECTION 2.5: WYMAGANIA TECHNICZNE
    // ════════════════════════════════════════════════════
    const req = contract.requirements;
    if (req) {
        const reqItems: string[] = [];
        if (req.projectBudowlany) reqItems.push('Projekt Budowlany');
        if (req.fundamenty) reqItems.push('Fundamenty');
        if (req.doprowadzeniePradu) reqItems.push('Doprowadzenie Pradu');
        if (req.pozwolenieNaBudowe) reqItems.push('Pozwolenie na Budowe');
        if (req.innePrace) reqItems.push(`Inne: ${req.innePrace}`);

        if (reqItems.length > 0) {
            sectionHeader('WYMAGANIA TECHNICZNE');
            setFill(lightBg);
            const reqBoxH = Math.max(10, reqItems.length * 7 + 4);
            doc.roundedRect(M, y, contentW, reqBoxH, 1, 1, 'F');

            doc.setFontSize(9);
            doc.setFont(F, 'normal');
            setColor(darkSlate);
            reqItems.forEach((item, idx) => {
                doc.setDrawColor(34, 197, 94);
                doc.setFillColor(34, 197, 94);
                doc.circle(M + 5, y + 3 + idx * 7, 1.2, 'F');
                txt(item, M + 10, y + 4 + idx * 7);
            });
            y += reqBoxH + 4;
        }
    }

    // ════════════════════════════════════════════════════
    // SECTION 3: DANE TECHNICZNE Z POMIARU
    // ════════════════════════════════════════════════════
    const hasTechData = measurements?.unterkRinne || measurements?.unterkWand || measurements?.wallType;
    if (hasTechData) {
        sectionHeader('DANE TECHNICZNE (POMIAR)');

        setFill(lightBg);
        doc.roundedRect(M, y, contentW, 24, 1, 1, 'F');

        const col1 = M + 4;
        const col2 = M + contentW / 3;
        const col3 = M + (contentW * 2) / 3;

        // Row 1
        if (measurements.unterkRinne) {
            doc.setFontSize(7); setColor(midSlate); txt('Unterkante Rinne / H3', col1, y + 4);
            doc.setFontSize(11); doc.setFont(F, 'bold'); setColor(darkSlate);
            txt(`${measurements.unterkRinne} mm`, col1, y + 10);
            doc.setFont(F, 'normal');
        }
        if (measurements.unterkWand) {
            doc.setFontSize(7); setColor(midSlate); txt('Unterkante Wand / H1', col2, y + 4);
            doc.setFontSize(11); doc.setFont(F, 'bold'); setColor(darkSlate);
            txt(`${measurements.unterkWand} mm`, col2, y + 10);
            doc.setFont(F, 'normal');
        }
        if (measurements.wallType) {
            const wallLabels: Record<string, string> = {
                massiv: 'Mur masywny', daemmung: 'Ocieplenie/WDVS',
                holz: 'Drewno', blech: 'Blacha', fertighaus: 'Prefabrykat', other: 'Inne'
            };
            doc.setFontSize(7); setColor(midSlate); txt('Typ sciany', col3, y + 4);
            doc.setFontSize(11); doc.setFont(F, 'bold'); setColor(darkSlate);
            txt(wallLabels[measurements.wallType] || measurements.wallType, col3, y + 10);
            doc.setFont(F, 'normal');
        }

        // Row 2 — leveling profiles
        if (measurements.needsLevelingProfiles) {
            doc.setFontSize(7); setColor([146, 64, 14]);
            txt('PROFILE WYROWNUJACE:', col1, y + 16);
            doc.setFontSize(9); doc.setFont(F, 'bold');
            const lvlParts = [];
            if (measurements.slopeLeft) lvlParts.push(`L: ${measurements.slopeLeft}mm`);
            if (measurements.slopeFront) lvlParts.push(`V: ${measurements.slopeFront}mm`);
            if (measurements.slopeRight) lvlParts.push(`R: ${measurements.slopeRight}mm`);
            txt(lvlParts.join('  /  ') || 'Tak', col1, y + 21);
            doc.setFont(F, 'normal');
        }

        y += 28;
    }

    // Technical notes
    if (measurements?.technicalNotes) {
        setFill(amberBg);
        const noteLines = doc.splitTextToSize(t(measurements.technicalNotes), contentW - 8);
        const noteH = noteLines.length * 5 + 8;
        doc.roundedRect(M, y, contentW, noteH, 1, 1, 'F');
        doc.setFontSize(7); doc.setFont(F, 'bold'); setColor([146, 64, 14]);
        txt('UWAGI TECHNICZNE:', M + 3, y + 4);
        doc.setFontSize(9); doc.setFont(F, 'normal'); setColor(darkSlate);
        doc.text(noteLines, M + 3, y + 9);
        y += noteH + 3;
    }

    // ════════════════════════════════════════════════════
    // SECTION 4: PŁATNOŚĆ
    // ════════════════════════════════════════════════════
    sectionHeader('PLATNOSC');

    const paymentMethod = pricing?.paymentMethod || 'transfer';
    const isCash = paymentMethod === 'cash';

    const isPL = pricing?.currency === 'PLN';
    const vatRate = pricing?.vatRate || (isPL ? 1.23 : 1.19);
    const currSuffix = isPL ? ' PLN' : ' EUR';

    const netPrice = pricing?.finalPriceNet || pricing?.sellingPriceNet || 0;
    const grossPrice = netPrice * vatRate;
    const advanceAmount = contract.advanceAmount || pricing?.advancePayment || 0;
    const advancePaid = contract.advancePaid;
    const installCosts = pricing?.installationCosts;
    const installNet = installCosts?.totalInstallation || 0;
    const installGross = installNet * vatRate;
    const totalGross = grossPrice + installGross;
    const remainingGross = totalGross - (advanceAmount * vatRate);

    const fmt = (n: number) => n.toFixed(2).replace('.', ',') + currSuffix;

    if (isCash) {
        // Cash — show amount to collect
        setFill(greenBg);
        doc.roundedRect(M, y, contentW, 30, 2, 2, 'F');
        doc.setDrawColor(34, 197, 94);
        doc.roundedRect(M, y, contentW, 30, 2, 2, 'S');

        doc.setFontSize(9); doc.setFont(F, 'bold'); setColor([22, 101, 52]);
        txt('METODA PLATNOSCI: GOTOWKA PRZY ODBIORZE', M + 4, y + 6);

        doc.setFontSize(8); doc.setFont(F, 'normal'); setColor(darkSlate);
        txt(`Wartosc zlecenia brutto: ${fmt(grossPrice)}`, M + 4, y + 13);
        if (installNet > 0) txt(`Montaz brutto: ${fmt(installGross)}`, M + contentW / 2, y + 13);
        txt(`Razem brutto: ${fmt(totalGross)}`, M + 4, y + 18);
        if (advanceAmount > 0) {
            txt(`Zaliczka (${advancePaid ? 'oplacona' : 'nieoplacona'}): ${fmt(advanceAmount * vatRate)}`, M + contentW / 2, y + 18);
        }

        // Big remaining amount
        doc.setFontSize(14); doc.setFont(F, 'bold'); setColor([22, 101, 52]);
        txt(`DO ODBIORU OD KLIENTA: ${fmt(Math.max(0, remainingGross))}`, M + 4, y + 27);

        y += 34;
    } else {
        // Transfer — no amount
        setFill(lightBg);
        doc.roundedRect(M, y, contentW, 14, 2, 2, 'F');
        doc.setFontSize(9); doc.setFont(F, 'bold'); setColor(darkSlate);
        txt('METODA PLATNOSCI: PRZELEW BANKOWY', M + 4, y + 6);
        doc.setFontSize(8); doc.setFont(F, 'normal'); setColor(midSlate);
        txt('Brak kwoty do odbioru - platnosc przelewem.', M + 4, y + 11);
        y += 18;
    }

    // ════════════════════════════════════════════════════
    // SECTION 5: NOTATKI DLA EKIPY
    // ════════════════════════════════════════════════════
    if (contract.installationNotes) {
        sectionHeader('UWAGI DLA EKIPY MONTAZOWEJ');
        const notesLines = doc.splitTextToSize(t(contract.installationNotes), contentW - 8);
        const boxH = Math.max(12, notesLines.length * 5 + 6);

        setFill([255, 247, 237]);
        doc.roundedRect(M, y, contentW, boxH, 1, 1, 'F');
        doc.setDrawColor(251, 191, 36);
        doc.roundedRect(M, y, contentW, boxH, 1, 1, 'S');

        doc.setFontSize(9); doc.setFont(F, 'normal'); setColor(darkSlate);
        doc.text(notesLines, M + 4, y + 5);
        y += boxH + 4;
    }

    // ════════════════════════════════════════════════════
    // SECTION 6: CHECKLISTA & PODPISY
    // ════════════════════════════════════════════════════
    if (y > H - 80) { doc.addPage(); y = M; }

    sectionHeader('ODBIOR I POTWIERDZENIE');

    doc.setFontSize(9);
    doc.setFont(F, 'normal');
    setColor(darkSlate);

    const checks = [
        'Montaz zakonczony zgodnie z umowa',
        'Teren uporzadkowany po montazu',
        'Klient poinstruowany o obsludze',
        'Brak widocznych uszkodzen transportowych',
        'Odprowadzenie wody sprawdzone'
    ];

    checks.forEach(label => {
        doc.rect(M + 2, y - 2.5, 3.5, 3.5);
        txt(label, M + 8, y);
        y += 7;
    });

    y += 3;

    // Additional notes from installer
    doc.setFontSize(8);
    setColor(midSlate);
    txt('Uwagi montazysty:', M, y);
    y += 4;
    for (let i = 0; i < 3; i++) {
        doc.setLineDash([1, 1], 0);
        doc.setDrawColor(200, 200, 200);
        doc.line(M, y + 4, W - M, y + 4);
        y += 8;
    }
    doc.setLineDash([], 0);
    y += 4;

    // Signature boxes
    const boxW = (contentW - 10) / 2;
    const sigH = 32;

    doc.setDrawColor(200, 200, 200);
    doc.rect(M, y, boxW, sigH);
    doc.setFontSize(7);
    doc.setFont(F, 'bold');
    setColor(midSlate);
    txt('DATA I PODPIS MONTAZYSTY', M + 3, y + 4);

    doc.rect(M + boxW + 10, y, boxW, sigH);
    txt('DATA I PODPIS KLIENTA', M + boxW + 13, y + 4);

    doc.setFontSize(6);
    doc.setFont(F, 'normal');
    txt(
        'Podpisujac protokol, klient potwierdza odbior ilosciowy i jakosciowy prac montazowych oraz brak zastrzezen do wykonania.',
        M + boxW + 13, y + sigH - 8,
        { maxWidth: boxW - 6 }
    );

    y += sigH + 5;

    // Footer
    doc.setFontSize(7);
    setColor([180, 180, 180]);
    txt(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}  |  Polendach24`, W / 2, H - 8, { align: 'center' });

    // ════════════════════════════════════════════════════
    // PAGES 2+: ZDJĘCIA
    // ════════════════════════════════════════════════════
    const images = (contract.attachments || []).filter(a => a.type === 'image' && a.url);

    if (images.length > 0) {
        if (photoLayout === '2-per-page') {
            for (let i = 0; i < images.length; i += 2) {
                doc.addPage();
                doc.setFontSize(10);
                doc.setFont(F, 'bold');
                setColor(darkSlate);
                txt(
                    `Zdjecia z dokumentacji - ${contract.contractNumber || ''}`,
                    W / 2, M, { align: 'center' }
                );
                doc.setFontSize(8);
                doc.setFont(F, 'normal');
                setColor(midSlate);
                txt(`${Math.floor(i / 2) + 1} / ${Math.ceil(images.length / 2)}`, W / 2, M + 5, { align: 'center' });

                const imgY1 = M + 10;
                const maxImgH = (H - M * 2 - 20) / 2 - 5;
                const maxImgW = contentW;

                try {
                    await addImageFromUrl(doc, images[i].url, M, imgY1, maxImgW, maxImgH);
                    doc.setFontSize(7);
                    setColor(midSlate);
                    txt(images[i].name || `Zdjecie ${i + 1}`, M, imgY1 + maxImgH + 4);
                } catch (err) {
                    doc.setFontSize(9); setColor(midSlate);
                    txt(`[Nie udalo sie zaladowac: ${images[i].name || ''}]`, M, imgY1 + 10);
                }

                if (i + 1 < images.length) {
                    const imgY2 = imgY1 + maxImgH + 10;
                    try {
                        await addImageFromUrl(doc, images[i + 1].url, M, imgY2, maxImgW, maxImgH);
                        doc.setFontSize(7);
                        setColor(midSlate);
                        txt(images[i + 1].name || `Zdjecie ${i + 2}`, M, imgY2 + maxImgH + 4);
                    } catch (err) {
                        doc.setFontSize(9); setColor(midSlate);
                        txt(`[Nie udalo sie zaladowac: ${images[i + 1].name || ''}]`, M, imgY2 + 10);
                    }
                }
            }
        } else {
            for (let i = 0; i < images.length; i++) {
                doc.addPage();
                doc.setFontSize(10);
                doc.setFont(F, 'bold');
                setColor(darkSlate);
                txt(
                    `Zdjecie ${i + 1} / ${images.length} - ${contract.contractNumber || ''}`,
                    W / 2, M, { align: 'center' }
                );

                const imgY = M + 10;
                const maxImgH = H - M * 2 - 20;
                const maxImgW = contentW;

                try {
                    await addImageFromUrl(doc, images[i].url, M, imgY, maxImgW, maxImgH);
                    doc.setFontSize(7);
                    setColor(midSlate);
                    txt(images[i].name || `Zdjecie ${i + 1}`, M, H - M);
                } catch (err) {
                    doc.setFontSize(9); setColor(midSlate);
                    txt(`[Nie udalo sie zaladowac: ${images[i].name || ''}]`, M, imgY + 10);
                }
            }
        }
    }

    return doc;
}

// ── Load image from URL and add to PDF ──
async function addImageFromUrl(
    doc: jsPDF,
    url: string,
    x: number,
    y: number,
    maxW: number,
    maxH: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                if (!w || !h) { reject(new Error('Invalid image dimensions')); return; }
                const ratio = w / h;

                let drawW = maxW;
                let drawH = drawW / ratio;
                if (drawH > maxH) { drawH = maxH; drawW = drawH * ratio; }

                const drawX = x + (maxW - drawW) / 2;
                doc.addImage(img, 'JPEG', drawX, y, drawW, drawH);
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error(`Failed to load: ${url}`));
        img.src = url;
    });
}
