import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Contract } from '../types';
import { ensureUnicodeFont } from './pdfFontLoader';
import { AGB_SECTIONS } from './bestellscheinAGB';
import { AGB_SECTIONS_PL, RODO_SECTION_PL } from './contractAGB.pl';
import { loadBrandLogo, drawBrandLogo } from './pdfBrandLogo';
import { translateForPDF } from './pdfGenerator';
import { getBrand, normalizeVat, formatMoney, type BrandConfig } from '../config/brandConfig';

// ── Gotowa do druku umowa generowana z danych umowy ──
// Dwujęzyczna i brand-aware (Polendach24 / zadaszto.pl):
//   • DE (Polendach24): Werkvertrag, EUR, VAT 19%, niemieckie AGB.
//   • PL (zadaszto.pl): Umowa, PLN, VAT 8%/23%, polskie OWU + RODO.
// Marka i waluta pochodzą z contract.brand / contract.pricing (config: brandConfig).
// Strony: 1-2 umowa właściwa (strony, przedmiot, ceny, warunki, podpisy),
// dalej AGB/OWU. Dane firmowe spójne z PDF oferty i Bestellscheinem.

const M = 18; // margines mm

// vatRate w danych produkcyjnych bywa 0.19, 1.19 albo null — normalizujemy do ułamka
export function normalizeVatRate(raw: number | null | undefined): number {
    return normalizeVat(raw, 0.19);
}

function fullAddress(c: any): string {
    const street = [c?.street || c?.address, c?.houseNumber || c?.house_number].filter(Boolean).join(' ');
    const cityLine = [c?.postalCode || c?.postal_code, c?.city].filter(Boolean).join(' ');
    return [street, cityLine, c?.country].filter(Boolean).join(', ');
}

// ── Etykiety/treści w dwóch językach ──
type Lang = 'de' | 'pl';
const LABELS = {
    de: {
        docTitle: 'WERKVERTRAG',
        fileName: 'Werkvertrag',
        nrLabel: 'Vertrags-Nr.:',
        dateLabel: 'Datum:',
        contractor: 'AUFTRAGNEHMER',
        client: 'AUFTRAGGEBER',
        phoneLabel: 'Zentrale',
        s1: '§1 Vertragsgegenstand',
        specModel: 'Modell',
        specDims: 'Abmessungen (B × T)',
        specRoof: 'Dacheindeckung',
        specColor: 'Farbe',
        specMount: 'Montageart',
        specPosts: 'Anzahl Pfosten',
        specSnow: 'Schneelastzone (DIN)',
        specWind: 'Windzone',
        sonderfarbe: (ral: string) => `RAL ${ral} (Sonderfarbe)`,
        addonsTitle: 'Zusatzausstattung:',
        sonderpos: 'Sonderposition',
        s2: '§2 Vergütung und Zahlungsbedingungen',
        rowNet: 'Gesamtpreis netto (inkl. Lieferung und Montage)',
        rowVat: (pct: number) => `MwSt. (${pct} %)`,
        rowGross: 'Gesamtpreis brutto',
        rowAdvance: 'Anzahlung bei Vertragsabschluss',
        advanceNet: (v: string) => ` (netto ${v})`,
        rowRest: 'Restzahlung nach Abnahme der Montage',
        payCash: 'Zahlungsart: Barzahlung. Die Restzahlung erfolgt in bar bei Abnahme der Montage.',
        payTransfer: (iban: string, bank: string) =>
            `Zahlungsart: Überweisung auf das Konto IBAN: ${iban} (${bank}). Die Restzahlung ist nach Abnahme der Montage ohne Abzug fällig.`,
        s3: '§3 Bauseitige Voraussetzungen und Pflichten des Auftraggebers',
        reqFoundation: (b: boolean) => `• Fundamente: ${b ? 'werden bauseitig durch den Auftraggeber erstellt' : 'im Leistungsumfang des Auftragnehmers enthalten bzw. nicht erforderlich'}`,
        reqPower: (b: boolean) => `• Stromzuführung: ${b ? 'wird bauseitig durch den Auftraggeber bereitgestellt' : 'nicht erforderlich bzw. gesondert vereinbart'}`,
        reqConstr: (b: boolean) => `• Bauantrag/Baugenehmigung: ${b ? 'liegt in der Verantwortung des Auftraggebers' : 'nicht Gegenstand dieses Vertrages'}`,
        reqOther: (s: string) => `• Sonstiges: ${s}`,
        reqAccess: 'Der Auftraggeber stellt einen freien Zugang zur Montagestelle sicher.',
        reqSnow: '• Nutzung und Schneeräumung: Die Konstruktion ist für die in §1 angegebene Schneelastzone ausgelegt. Der Auftraggeber ist verpflichtet, das Dach bei Überschreiten der zulässigen Schneehöhe schonend zu räumen (ohne beschädigende Werkzeuge), Eis zu entfernen und Rinnen/Abläufe freizuhalten. Bewegliche Elemente (Markisen, ZIP-Screens, Schiebesysteme) sind bei Schneefall, Vereisung und starkem Wind einzufahren.',
        reqMaintenance: '• Der Auftraggeber führt regelmäßige Wartung und Reinigung gemäß den Pflegehinweisen durch. Schäden durch Überschreiten der Schneelast, unterlassene Räumung/Wartung oder unsachgemäße Nutzung sind von der Gewährleistung ausgeschlossen.',
        s4: '§4 Liefer- und Montagezeit',
        s4Body: (weeks?: number, days?: number) =>
            `Die Montage erfolgt nach Terminabsprache${weeks ? `, voraussichtlich innerhalb von ca. ${weeks} Wochen nach Vertragsabschluss` : ''}.` +
            (days ? ` Geplante Montagedauer: ca. ${days} Arbeitstag${days > 1 ? 'e' : ''}.` : ''),
        s4Delay: 'Witterungsbedingte oder durch Lieferengpässe verursachte Verzögerungen verlängern die Frist angemessen; der Auftraggeber wird hierüber informiert.',
        s5: '§5 Schlussbestimmungen',
        s5p1: '1. Die gelieferte Ware bleibt bis zur vollständigen Bezahlung Eigentum des Auftragnehmers (Eigentumsvorbehalt).',
        s5p2: (legal: string) => `2. Es gelten die beigefügten Allgemeinen Geschäftsbedingungen (AGB) der ${legal}. Der Auftraggeber bestätigt mit seiner Unterschrift deren Kenntnisnahme.`,
        s5p3: '3. Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.',
        s5p4: '4. Änderungen und Ergänzungen dieses Vertrages bedürfen der Textform.',
        sigContractor: 'Ort, Datum, Unterschrift Auftragnehmer',
        sigClient: 'Ort, Datum, Unterschrift Auftraggeber',
        agbHeader: 'ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB)',
        pageLabel: 'Seite',
        preamble: '',
        closing: '',
    },
    pl: {
        docTitle: 'UMOWA',
        fileName: 'Umowa',
        nrLabel: 'Nr umowy:',
        dateLabel: 'Data:',
        contractor: 'WYKONAWCA',
        client: 'ZAMAWIAJĄCY',
        phoneLabel: 'Tel.',
        s1: '§1 Przedmiot umowy',
        specModel: 'Model',
        specDims: 'Wymiary (szer. × gł.)',
        specRoof: 'Pokrycie dachu',
        specColor: 'Kolor',
        specMount: 'Rodzaj montażu',
        specPosts: 'Liczba słupów',
        specSnow: 'Strefa obciążenia śniegiem (DIN)',
        specWind: 'Strefa wiatrowa',
        sonderfarbe: (ral: string) => `RAL ${ral} (kolor specjalny)`,
        addonsTitle: 'Wyposażenie dodatkowe:',
        sonderpos: 'Pozycja dodatkowa',
        s2: '§2 Wynagrodzenie i warunki płatności',
        rowNet: 'Cena całkowita netto (z dostawą i montażem)',
        rowVat: (pct: number) => `VAT (${pct}%)`,
        rowGross: 'Cena całkowita brutto',
        rowAdvance: 'Zaliczka przy zawarciu umowy',
        advanceNet: (v: string) => ` (netto ${v})`,
        rowRest: 'Pozostała płatność po odbiorze montażu',
        payCash: 'Forma płatności: gotówka. Pozostała kwota płatna gotówką przy odbiorze montażu.',
        payTransfer: (iban: string, bank: string) =>
            `Forma płatności: przelew na konto IBAN: ${iban} (${bank}). Pozostała kwota płatna po odbiorze montażu, bez potrąceń.`,
        s3: '§3 Warunki i obowiązki Zamawiającego',
        reqFoundation: (b: boolean) => `• Fundamenty: ${b ? 'wykonuje Zamawiający we własnym zakresie' : 'w zakresie Wykonawcy lub niewymagane'}`,
        reqPower: (b: boolean) => `• Doprowadzenie prądu: ${b ? 'zapewnia Zamawiający we własnym zakresie' : 'niewymagane lub uzgodnione odrębnie'}`,
        reqConstr: (b: boolean) => `• Pozwolenie / zgłoszenie budowlane: ${b ? 'po stronie Zamawiającego' : 'nie jest przedmiotem niniejszej umowy'}`,
        reqOther: (s: string) => `• Inne: ${s}`,
        reqAccess: 'Zamawiający zapewnia swobodny dostęp do miejsca montażu.',
        reqSnow: '• Eksploatacja i odśnieżanie: konstrukcja jest przewidziana na obciążenie śniegiem zgodne ze strefą wskazaną w §1. Zamawiający zobowiązany jest do bieżącego, ostrożnego odśnieżania dachu po przekroczeniu dopuszczalnej grubości pokrywy (bez narzędzi mogących uszkodzić pokrycie), usuwania lodu oraz utrzymywania drożności rynien i odpływów. Elementy ruchome (markizy, rolety ZIP, systemy przesuwne) należy złożyć na czas opadów śniegu, oblodzenia i silnego wiatru.',
        reqMaintenance: '• Konserwacja: Zamawiający wykonuje okresowe czyszczenie i konserwację zgodnie z zaleceniami. Szkody z tytułu przekroczenia obciążenia śniegiem, zaniechania odśnieżania/konserwacji lub niewłaściwego użytkowania nie są objęte gwarancją.',
        s4: '§4 Termin dostawy i montażu',
        s4Body: (weeks?: number, days?: number) =>
            `Montaż następuje po uzgodnieniu terminu${weeks ? `, przewidywany w ciągu ok. ${weeks} tygodni od zawarcia umowy` : ''}.` +
            (days ? ` Planowany czas montażu: ok. ${days} ${days > 1 ? 'dni roboczych' : 'dzień roboczy'}.` : ''),
        s4Delay: 'Opóźnienia spowodowane warunkami atmosferycznymi lub brakami w dostawach odpowiednio przedłużają termin; Zamawiający zostanie o tym poinformowany.',
        s5: '§5 Postanowienia końcowe',
        s5p1: '1. Dostarczony towar pozostaje własnością Wykonawcy do chwili pełnej zapłaty (zastrzeżenie własności).',
        s5p2: (legal: string) => `2. Obowiązują załączone Ogólne Warunki Umowy (OWU) ${legal}. Zamawiający potwierdza ich znajomość własnoręcznym podpisem.`,
        s5p3: '3. Nieważność poszczególnych postanowień umowy nie wpływa na ważność pozostałych.',
        s5p4: '4. Zmiany i uzupełnienia niniejszej umowy wymagają formy dokumentowej.',
        sigContractor: 'Miejscowość, data, podpis Wykonawcy',
        sigClient: 'Miejscowość, data, podpis Zamawiającego',
        agbHeader: 'OGÓLNE WARUNKI UMOWY (OWU)',
        pageLabel: 'Strona',
        preamble: 'Niniejsza umowa (dalej „Umowa") zostaje zawarta pomiędzy Wykonawcą a Zamawiającym i dotyczy sprzedaży oraz montażu zadaszenia tarasowego zgodnie z poniższą specyfikacją techniczną i warunkami płatności. Integralną częścią Umowy są Ogólne Warunki Umowy (OWU).',
        closing: 'Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron. Zamawiający oświadcza, że zapoznał się z treścią Umowy oraz załączonych OWU i akceptuje ich postanowienia.',
    },
} as const;

// Konfiguracja addonów po polsku (DE używa translateForPDF/addonLabel z niemieckimi etykietami)
function addonLabel(a: any, lang: Lang): string {
    const fallback = lang === 'pl' ? 'Wyposażenie dodatkowe' : 'Zusatzausstattung';
    if (typeof a === 'string') return a;
    const parts: string[] = [a?.name || a?.variant || fallback];
    if (a?.variant && a.variant !== a.name) parts.push(`(${a.variant})`);
    const dims: string[] = [];
    if (a?.width) dims.push(`B ${a.width} mm`);
    if (a?.height) dims.push(`H ${a.height} mm`);
    if (a?.projection || a?.depth) dims.push(`T ${a.projection || a.depth} mm`);
    if (a?.length) dims.push(`L ${a.length} mm`);
    if (dims.length) parts.push(`— ${dims.join(' × ')}`);
    if (a?.quantity && a.quantity > 1) parts.push(`× ${a.quantity}`);
    return parts.join(' ');
}

// Tłumaczenie wartości pól produktu na język marki
function specRoof(value: string, lang: Lang): string {
    if (!value) return '';
    if (lang === 'de') return translateForPDF(value, 'roofTypes');
    const v = value.toLowerCase();
    if (v.includes('glas') || v.includes('szk')) return 'szkło';
    if (v.includes('poly') || v.includes('poliw')) return 'poliwęglan';
    if (v === 'other' || v === 'inne') return '—';
    return value;
}
function specMount(value: string, lang: Lang): string {
    if (!value) return '';
    if (lang === 'de') return translateForPDF(value, 'installationTypes');
    const v = value.toLowerCase();
    if (v.includes('wall') || v.includes('wand') || v.includes('ścien')) return 'montaż ścienny';
    if (v.includes('free') || v.includes('stand') || v.includes('wolno')) return 'wolnostojący';
    if (v.includes('ceiling') || v.includes('decke') || v.includes('sufit')) return 'montaż sufitowy';
    return value;
}
function specColor(product: any, lang: Lang, L: typeof LABELS[Lang]): string {
    if (product.customColor && product.customColorRAL) return L.sonderfarbe(product.customColorRAL);
    const raw = product.color || '';
    if (!raw) return '';
    if (lang === 'de') return translateForPDF(raw, 'colors');
    return raw; // PL: zwykle już opisowy ("RAL 7016 (Anthrazit)")
}

export async function generateContractPDF(contract: Contract): Promise<void> {
    const doc = await createContractDocument(contract);
    const L = LABELS[getBrand(contract.brand).language];
    const nr = (contract.contractNumber || 'umowa').replace(/\//g, '-');
    doc.save(`${L.fileName}_${nr}.pdf`);
}

export async function generateContractPDFDataUri(contract: Contract): Promise<string> {
    const doc = await createContractDocument(contract);
    return doc.output('datauristring');
}

/** Podgląd w nowej karcie — blob URL nie jest blokowany jak data-URI */
export async function generateContractPDFBlobUrl(contract: Contract): Promise<string> {
    const doc = await createContractDocument(contract);
    return doc.output('bloburl').toString();
}

async function createContractDocument(contract: Contract): Promise<jsPDF> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const FONT = await ensureUnicodeFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const client: any = contract.client || {};
    const product: any = contract.product || {};
    const pricing: any = contract.pricing || {};

    // ── Marka / waluta / język ──
    const brand: BrandConfig = getBrand(contract.brand);
    const lang: Lang = brand.language;
    const L = LABELS[lang];
    const company = brand.company;
    const money = (v: number) => formatMoney(v, brand);
    const brandLogo = await loadBrandLogo(brand);

    // ── Paleta marki (PL: zadaszto.pl, DE: Polendach24) ──
    const ACCENT: [number, number, number] = lang === 'pl' ? [196, 167, 106] : [197, 160, 101];
    const INK: [number, number, number] = lang === 'pl' ? [43, 47, 51] : [30, 41, 59];
    const MUTED: [number, number, number] = [120, 128, 138];
    const TEXT: [number, number, number] = [55, 65, 81];
    const SOFT: [number, number, number] = [247, 248, 250];
    const LINE: [number, number, number] = [223, 227, 233];
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

    const vat = normalizeVat(pricing.vatRate, brand.defaultVatRate);
    // sellingPriceNet/finalPriceNet ZAWIERAJĄ montaż i dojazd (pricing.service)
    // — niczego nie dosumowujemy (w PDF oferty był przez to podwójnie liczony montaż)
    const totalNet = Number(pricing.finalPriceNet || pricing.sellingPriceNet || 0);
    const totalGross = totalNet * (1 + vat);
    const advanceNet = Number(pricing.advancePayment ?? contract.advanceAmount ?? 0);
    const advanceGross = advanceNet * (1 + vat);
    const restGross = Math.max(0, totalGross - advanceGross);

    const contractDate = contract.signedAt || contract.createdAt || new Date();
    const dateStr = new Date(contractDate).toLocaleDateString(brand.locale);

    let y = M;

    const footer = () => {
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            const fy = H - 13;
            setDraw(ACCENT); doc.setLineWidth(0.7); doc.line(M, fy, W - M, fy);
            setDraw(LINE); doc.setLineWidth(0.2); doc.line(M, fy + 0.9, W - M, fy + 0.9);
            doc.setFont(FONT, 'bold'); doc.setFontSize(7.5); setText(INK);
            doc.text(company.tradeName, M, fy + 4.5);
            doc.setFont(FONT, 'normal'); doc.setFontSize(6.7); setText(MUTED);
            doc.text(`${company.legalName} • ${company.address} • NIP: ${company.nip}`, M, fy + 7.8);
            doc.text(`${L.phoneLabel}: ${company.phone} • ${company.email} • ${company.bank}, IBAN: ${company.iban}`, M, fy + 10.6);
            doc.text(`${L.pageLabel} ${i} / ${pages}`, W - M, fy + 4.5, { align: 'right' });
        }
    };

    const ensureSpace = (needed: number) => {
        if (y + needed > H - 22) {
            doc.addPage();
            y = M;
        }
    };

    const sectionTitle = (title: string) => {
        ensureSpace(16);
        y += 1;
        doc.setFont(FONT, 'bold');
        doc.setFontSize(11);
        setText(INK);
        doc.text(title, M, y);
        y += 2.4;
        // Akcent marki pod tytułem + cienka linia do końca
        setDraw(ACCENT); doc.setLineWidth(1.2); doc.line(M, y, M + 24, y);
        setDraw(LINE); doc.setLineWidth(0.3); doc.line(M + 24, y, W - M, y);
        y += 5.5;
    };

    const bodyText = (text: string, opts: { size?: number; bold?: boolean } = {}) => {
        doc.setFont(FONT, opts.bold ? 'bold' : 'normal');
        doc.setFontSize(opts.size ?? 9.5);
        setText(opts.bold ? INK : TEXT);
        const lines = doc.splitTextToSize(text, W - 2 * M);
        for (const line of lines) {
            ensureSpace(5);
            doc.text(line, M, y);
            y += 4.6;
        }
    };

    // ═══ NAGŁÓWEK ═══
    drawBrandLogo(doc, brand, M, y - 2, 48, 15, FONT, brandLogo);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(22);
    setText(INK);
    doc.text(L.docTitle, W - M, y + 6, { align: 'right' });
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9.5);
    setText(MUTED);
    doc.text(`${L.nrLabel} ${contract.contractNumber || '—'}     ${L.dateLabel} ${dateStr}`, W - M, y + 12, { align: 'right' });
    y += 19;
    setDraw(ACCENT); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
    setDraw(LINE); doc.setLineWidth(0.25); doc.line(M, y + 0.9, W - M, y + 0.9);
    y += 8;

    // ═══ STRONY UMOWY (karty) ═══
    const gap = 8;
    const cardW = (W - 2 * M - gap) / 2;
    const clientName = [client.salutation, client.firstName || client.first_name, client.lastName || client.last_name]
        .filter(Boolean).join(' ') || '—';
    const wrapLines = (arr: string[]) => arr.flatMap(s => doc.splitTextToSize(s, cardW - 10) as string[]);
    const leftWrapped = wrapLines([company.address, `NIP: ${company.nip}`, `${L.phoneLabel}: ${company.phone}`, company.email].filter(Boolean) as string[]);
    const rightWrapped = wrapLines([
        client.companyName || client.company_name,
        fullAddress(client),
        client.phone || client.phone_number,
        client.email,
    ].filter(Boolean) as string[]);
    const cardRows = Math.max(leftWrapped.length, rightWrapped.length, 1);
    const cardH = 6 + 5 + 4.6 + cardRows * 3.8 + 3;
    const drawParty = (x: number, label: string, name: string, lines: string[]) => {
        setFill(SOFT); setDraw(LINE); doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardW, cardH, 1.6, 1.6, 'FD');
        setFill(ACCENT); doc.rect(x + 2, y, cardW - 4, 1.1, 'F');
        let yy = y + 6;
        doc.setFont(FONT, 'bold'); doc.setFontSize(7); setText(MUTED);
        doc.text(label, x + 5, yy); yy += 5;
        doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); setText(INK);
        doc.text(doc.splitTextToSize(name, cardW - 10), x + 5, yy); yy += 4.6;
        doc.setFont(FONT, 'normal'); doc.setFontSize(8); setText(TEXT);
        for (const ln of lines) { doc.text(ln, x + 5, yy); yy += 3.8; }
    };
    drawParty(M, L.contractor, company.legalName, leftWrapped);
    drawParty(M + cardW + gap, L.client, clientName, rightWrapped);
    y += cardH + 8;

    // Preambuła (tylko PL — DE bez zmian)
    if (L.preamble) {
        bodyText(L.preamble);
        y += 4;
    }

    // ═══ §1 PRZEDMIOT UMOWY ═══
    sectionTitle(L.s1);
    const model = translateForPDF(product.modelId || '', 'models');
    const roof = specRoof(product.roofType || '', lang);
    const color = specColor(product, lang, L);
    const installation = specMount(product.installationType || '', lang);

    const specRows: [string, string][] = [
        [L.specModel, model || '—'],
        [L.specDims, product.width && product.projection ? `${product.width} × ${product.projection} mm` : '—'],
        [L.specRoof, roof || '—'],
        [L.specColor, color || '—'],
        [L.specMount, installation || '—'],
    ];
    if (product.numberOfPosts || pricing.numberOfPosts) {
        specRows.push([L.specPosts, String(product.numberOfPosts || pricing.numberOfPosts)]);
    }
    if (client.snow_zone_din) specRows.push([L.specSnow, String(client.snow_zone_din)]);
    if (client.wind_zone) specRows.push([L.specWind, String(client.wind_zone)]);

    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [],
        body: specRows,
        theme: 'grid',
        styles: { font: FONT, fontSize: 9, textColor: TEXT, cellPadding: 2.2, lineColor: LINE, lineWidth: 0.2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58, fillColor: SOFT, textColor: INK } },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    const addons = Array.isArray(product.addons) ? product.addons : [];
    const customItems = Array.isArray(product.customItems) ? product.customItems : [];
    // Dedup po etykiecie — w umowach manualnych dodatki trafiają i do addons,
    // i do customItems; bez tego wyświetlałyby się dwukrotnie. Dla ofert (rozłączne
    // listy) pokażemy wszystkie pozycje.
    const extras: string[] = [];
    const seenExtras = new Set<string>();
    const pushExtra = (label: string) => {
        const t = (label || '').trim();
        const k = t.toLowerCase();
        if (t && !seenExtras.has(k)) { seenExtras.add(k); extras.push(t); }
    };
    for (const a of addons) pushExtra(addonLabel(a, lang));
    for (const ci of customItems) pushExtra(ci?.name || ci?.description || L.sonderpos);
    if (extras.length) {
        bodyText(L.addonsTitle, { bold: true });
        for (const e of extras) bodyText(`• ${e}`);
        y += 2;
    }

    // ═══ §2 CENA I PŁATNOŚCI ═══
    sectionTitle(L.s2);
    const grossCell = (s: string) => ({ content: s, styles: { fontStyle: 'bold' as const, fillColor: INK, textColor: [255, 255, 255] as [number, number, number] } });
    const boldCell = (s: string, halign?: 'right') => ({ content: s, styles: { fontStyle: 'bold' as const, ...(halign ? { halign } : {}) } });
    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        body: [
            [L.rowNet, money(totalNet)],
            [L.rowVat(Math.round(vat * 100)), money(totalGross - totalNet)],
            [grossCell(L.rowGross), grossCell(money(totalGross))],
            [boldCell(`${L.rowAdvance}${advanceNet > 0 ? L.advanceNet(money(advanceNet)) : ''}`), boldCell(money(advanceGross), 'right')],
            [L.rowRest, money(restGross)],
        ],
        theme: 'grid',
        styles: { font: FONT, fontSize: 9.5, textColor: TEXT, cellPadding: 2.4, lineColor: LINE, lineWidth: 0.2 },
        columnStyles: { 1: { halign: 'right', cellWidth: 48, textColor: INK } },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
    bodyText(
        pricing.paymentMethod === 'cash'
            ? L.payCash
            : L.payTransfer(company.iban, company.bank)
    );
    y += 3;

    // ═══ §3 WARUNKI PO STRONIE ZAMAWIAJĄCEGO ═══
    sectionTitle(L.s3);
    const req = contract.requirements || ({} as any);
    bodyText(L.reqFoundation(!!req.foundation));
    bodyText(L.reqPower(!!req.powerSupply));
    bodyText(L.reqConstr(!!req.constructionProject));
    if (req.other) bodyText(L.reqOther(req.other));
    bodyText(L.reqAccess);
    bodyText(L.reqSnow);
    bodyText(L.reqMaintenance);
    y += 3;

    // ═══ §4 TERMIN MONTAŻU ═══
    sectionTitle(L.s4);
    const days = contract.installation_days_estimate || (contract as any).installationDaysEstimate;
    const weeks = (contract as any).plannedInstallationWeeks;
    bodyText(L.s4Body(weeks, days));
    bodyText(L.s4Delay);
    y += 3;

    // ═══ §5 POSTANOWIENIA KOŃCOWE ═══
    sectionTitle(L.s5);
    bodyText(L.s5p1);
    bodyText(L.s5p2(company.legalName));
    bodyText(L.s5p3);
    bodyText(L.s5p4);
    y += 4;

    // Klauzula końcowa (tylko PL — DE bez zmian)
    if (L.closing) {
        bodyText(L.closing);
        y += 2;
    }

    // ═══ PODPISY ═══
    ensureSpace(40);
    y += 16;
    const sigW = (W - 2 * M - 20) / 2;
    setDraw(MUTED);
    doc.setLineWidth(0.4);
    doc.line(M, y, M + sigW, y);
    doc.line(W - M - sigW, y, W - M, y);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    setText(MUTED);
    doc.text(L.sigContractor, M, y + 4.5);
    doc.text(L.sigClient, W - M - sigW, y + 4.5);

    // ═══ AGB / OWU (kolejne strony) ═══
    const agbSections = lang === 'pl' ? AGB_SECTIONS_PL : AGB_SECTIONS;
    doc.addPage();
    y = M;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(13);
    setText(INK);
    doc.text(L.agbHeader, M, y);
    y += 2.6;
    setDraw(ACCENT); doc.setLineWidth(1.2); doc.line(M, y, M + 24, y);
    setDraw(LINE); doc.setLineWidth(0.3); doc.line(M + 24, y, W - M, y);
    y += 5;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    setText(MUTED);
    doc.text(`${company.legalName}, ${company.address}`, M, y);
    y += 6;
    const renderSections = (sections: Array<{ title: string; items: string[] }>) => {
        for (const section of sections) {
            ensureSpace(12);
            doc.setFont(FONT, 'bold');
            doc.setFontSize(8.5);
            setText(INK);
            const titleLines = doc.splitTextToSize(section.title, W - 2 * M);
            doc.text(titleLines, M, y);
            y += 4.2 + (titleLines.length - 1) * 3.6;
            doc.setFont(FONT, 'normal');
            doc.setFontSize(7);
            setText(TEXT);
            section.items.forEach((item, idx) => {
                const lines = doc.splitTextToSize(`${idx + 1}. ${item}`, W - 2 * M);
                for (const line of lines) {
                    ensureSpace(3.4);
                    doc.text(line, M, y);
                    y += 3.2;
                }
                y += 0.8;
            });
            y += 2.5;
        }
    };
    renderSections(agbSections);

    // ═══ RODO (tylko PL) ═══
    if (lang === 'pl') {
        ensureSpace(14);
        y += 2;
        renderSections([{ title: RODO_SECTION_PL.title, items: RODO_SECTION_PL.items }]);
    }

    footer();
    return doc;
}
