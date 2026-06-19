import jsPDF from 'jspdf';
import type { Contract } from '../types';
import { AGB_SECTIONS, RODO_SECTION } from './bestellscheinAGB';
import { AGB_SECTIONS_PL, RODO_SECTION_PL } from './contractAGB.pl';
import { loadBrandLogo, drawBrandLogo } from './pdfBrandLogo';
import { ensureUnicodeFont } from './pdfFontLoader';
import { getBrand, normalizeVat, formatMoney, type BrandConfig } from '../config/brandConfig';

// ── Karta zamówienia (Bestellschein) — brand-aware (Polendach24 / zadaszto.pl) ──
// DE: "Bestellschein", EUR, niemieckie nagłówki + AGB.
// PL: "Karta zamówienia", PLN, polskie nagłówki + OWU/RODO.
// Font: Roboto (pełne UTF-8: polskie znaki + niemieckie umlauty). Fallback: helvetica
// z transliteracją (CH) gdy fontów nie da się załadować.

/** Form selections from BestellscheinPage — when provided they override the heuristics derived from the contract */
export interface BestellscheinFormData {
  datum?: string;                 // 'YYYY-MM-DD'
  dachPolycarbonat?: string;      // 'Opal' | 'Klar' | 'UV Reflex Opal' | 'UV Reflex Klar' | ''
  dachGlassThickness?: string;    // '8mm' | '10mm' | ''
  dachGlassType?: string;         // 'Matt/milch' | 'Klar' | 'Sonnenschutzglass' | ''
  keilfensterMaterial?: string;   // 'poly' | 'glass' | ''
  keilfensterType?: string;       // 'Matt/milch' | 'Klar' | 'ISO (nur glass)' | ''
  sideLeft?: string[];
  sideFront?: string[];
  sideRight?: string[];
  ledSpots?: boolean;
  ledSpotsCount?: string;
  ledStripe?: boolean;
  ledStripeLength?: string;
  heizTyp4?: boolean;
  heizTyp5?: boolean;
  montagePolendach?: boolean;
  montageKunde?: boolean;
}

// Transliteracja dla helvetica (fallback gdy Roboto niedostępne)
const CH: Record<string, string> = {
  'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z',
  'Ą':'A','Ć':'C','Ę':'E','Ł':'L','Ń':'N','Ó':'O','Ś':'S','Ź':'Z','Ż':'Z',
  'ü':'ue','ö':'oe','ä':'ae','Ü':'Ue','Ö':'Oe','Ä':'Ae','ß':'ss',
  '—':'-','–':'-','×':'x'
};

// Construction types on the form
const KONSTRUKTION_TYPES = [
  'trendstyle','topstyle','topstyle_xl','carport',
  'ultrastyle','skystyle','pergola','pergola_deluxe'
];
const KONSTRUKTION_LABELS: Record<string,string> = {
  trendstyle:'Trendstyle', topstyle:'Topstyle', topstyle_xl:'Topstyle XL',
  carport:'Carport', ultrastyle:'Ultrastyle', skystyle:'Skystyle',
  pergola:'Pergola', pergola_deluxe:'Pergola deluxe'
};
const COLOR_MAP: Record<string,string> = {
  '7016':'RAL 7016','9005':'RAL 9005','9016':'RAL 9016','9007':'RAL 9007',
  'ral7016':'RAL 7016','ral9005':'RAL 9005','ral9016':'RAL 9016','ral9007':'RAL 9007',
  'anthracite':'RAL 7016','white':'RAL 9016'
};
const COLORS_LIST = ['7016','9005','9016','9007','Andere'];

// ── Etykiety nagłówków/struktury w dwóch językach (wartości opcji produktu zostają
//    techniczne, bo formularz BestellscheinPage zapisuje je w jednej formie) ──
type Lang = 'de' | 'pl';
const BL = {
  de: {
    title: 'Bestellschein nr', datum: 'Datum',
    partyClient: 'Zwischen', partyCompany: 'Und',
    rName: 'Name, Vorname', rAddr: 'Adress', rPhone: 'Mobil', rMail: 'E-mail',
    priceNet: 'Gesamtpreis exkl. MwSt. - NETTO',
    priceGross: (pct: number) => `Gesamtpreis inkl. MwSt. (${pct} %) - BRUTTO`,
    konstruktionstyp: 'Konstruktionstyp',
    befestigung: 'Art der Befestigung', wandmontage: 'Wandmontage', freistehend: 'Freistehende Konstruktion',
    masse: 'Masse der Konstruktion', breit: 'mm breit', tief: 'mm tief', hoehe: 'mm max.Hoehe',
    dachPoly: 'Art der Dacheindeckung (Polycarbonat)', dachGlas: 'Art der Dacheindeckung (Glass)',
    zusatz: 'Zusatzausstattung und Optionen', keilfenster: 'Keilfenster',
    seitlich: 'Seitliche Optionen', sides: ['Linke Seite','Front','Rechte Seite'],
    led: 'LED', ledSpots: (n: string) => `SPOTS (Anzahl: ${n} Stk.)`, ledStripe: (n: string) => `LED STRIPE (Anzahl: ${n} m)`,
    heiz: 'Heizstrahler', montageLief: 'Montage/Lieferung', kunde: 'Kunde',
    zusatzBeschr: 'Zusätzliche Auftragsbeschreibung',
    kundeSign: 'Kunde Signature:', seite: 'Seite',
    unterschriftKunde: 'Unterschrift des Kunden:', unterschriftFirma: 'Unterschrift des Firmenvertreters:',
    agbHeader: (legal: string, addr: string) => `ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB) ${legal}, ${addr}`,
  },
  pl: {
    title: 'Karta zamówienia nr', datum: 'Data',
    partyClient: 'Zamawiający', partyCompany: 'Wykonawca',
    rName: 'Imię i nazwisko', rAddr: 'Adres', rPhone: 'Telefon', rMail: 'E-mail',
    priceNet: 'Cena całkowita netto',
    priceGross: (pct: number) => `Cena całkowita brutto (VAT ${pct}%)`,
    konstruktionstyp: 'Typ konstrukcji',
    befestigung: 'Rodzaj mocowania', wandmontage: 'Montaż ścienny', freistehend: 'Konstrukcja wolnostojąca',
    masse: 'Wymiary konstrukcji', breit: 'mm szer.', tief: 'mm gł.', hoehe: 'mm maks. wys.',
    dachPoly: 'Rodzaj pokrycia dachu (poliwęglan)', dachGlas: 'Rodzaj pokrycia dachu (szkło)',
    zusatz: 'Wyposażenie dodatkowe i opcje', keilfenster: 'Okno klinowe (Keilfenster)',
    seitlich: 'Opcje boczne', sides: ['Lewa strona','Front','Prawa strona'],
    led: 'LED', ledSpots: (n: string) => `SPOTY (ilość: ${n} szt.)`, ledStripe: (n: string) => `Taśma LED (długość: ${n} m)`,
    heiz: 'Promiennik grzewczy', montageLief: 'Montaż/Dostawa', kunde: 'Klient',
    zusatzBeschr: 'Dodatkowy opis zamówienia',
    kundeSign: 'Podpis klienta:', seite: 'Strona',
    unterschriftKunde: 'Podpis Klienta:', unterschriftFirma: 'Podpis przedstawiciela firmy:',
    agbHeader: (legal: string, addr: string) => `OGÓLNE WARUNKI UMOWY (OWU) ${legal}, ${addr}`,
  },
} as const;

export async function generateBestellscheinPDF(contract: Contract, formData?: BestellscheinFormData): Promise<void> {
  const doc = new jsPDF();
  const F = await ensureUnicodeFont(doc);
  const useTranslit = F === 'helvetica';
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const cW = W - 2 * M;
  const product = contract.product as any;
  const pricing = contract.pricing as any;
  const client = contract.client;

  // ── Marka / waluta / język ──
  const brand: BrandConfig = getBrand(contract.brand);
  const lang: Lang = brand.language;
  const L = BL[lang];
  const company = brand.company;
  // Wyświetlanie wartości opcji po polsku (wartości dopasowania pozostają kanoniczne/niemieckie)
  const PL_OPT: Record<string, string> = {
    'Opal': 'Opal', 'Klar': 'Przezroczysty', 'UV Reflex Opal': 'UV Reflex Opal', 'UV Reflex Klar': 'UV Reflex przezroczysty',
    'Matt/milch': 'Matowe/mleczne', 'Sonnenschutzglass': 'Szkło przeciwsłoneczne', 'ISO (nur glass)': 'ISO (tylko szkło)',
    'Panoramaschiebesystem': 'System przesuwny panoramiczny', 'Rahmen mit Schiebelementen': 'Rama z elementami przesuwnymi',
    'Festwand': 'Ściana stała', 'ZIP Screen': 'Roleta ZIP', 'Markise': 'Markiza',
    'Polycarbonat': 'Poliwęglan', 'Glass': 'Szkło',
  };
  const optL = (v: string) => (lang === 'pl' ? (PL_OPT[v] || v) : v);
  const brandLogo = await loadBrandLogo(brand);
  const vatFraction = normalizeVat(pricing?.vatRate, brand.defaultVatRate);
  const vatPct = Math.round(vatFraction * 100);
  const netPrice = pricing?.finalPriceNet || pricing?.sellingPriceNet || 0;
  const grossPrice = netPrice * (1 + vatFraction);
  const money = (v: number) => formatMoney(v, brand);
  const modelId = (product?.modelId || '').toLowerCase().replace(/line/g,'style');

  // Detect color
  const colorRaw = (product?.color || '').toLowerCase();
  let detectedColor = '';
  for (const [k,v] of Object.entries(COLOR_MAP)) {
    if (colorRaw.includes(k)) { detectedColor = v; break; }
  }

  // ── Paleta marki ──
  const ACCENT: [number, number, number] = lang === 'pl' ? [196, 167, 106] : [197, 160, 101];
  const INK: [number, number, number] = lang === 'pl' ? [43, 47, 51] : [30, 41, 59];
  const MUTED: [number, number, number] = [120, 128, 138];
  const TEXT: [number, number, number] = [55, 65, 81];
  const SOFT: [number, number, number] = [247, 248, 250];
  const LINE: [number, number, number] = [223, 227, 233];
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

  // helpers
  const tr = (s: string) => useTranslit ? s.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄß—–×]/g, c => CH[c] || c) : s;
  const txt = (s:string, x:number, y:number, o?:any) => doc.text(tr(s), x, y, o);
  const checkbox = (x:number, y:number, checked:boolean) => {
    if (checked) {
      setFill(ACCENT); setDraw(ACCENT); doc.setLineWidth(0.3);
      doc.roundedRect(x, y, 4, 4, 0.6, 0.6, 'FD');
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.6);
      doc.line(x + 0.9, y + 2.1, x + 1.7, y + 3.0);
      doc.line(x + 1.7, y + 3.0, x + 3.2, y + 1.1);
    } else {
      setDraw([172, 178, 186]); doc.setLineWidth(0.3); setFill([255, 255, 255]);
      doc.roundedRect(x, y, 4, 4, 0.6, 0.6, 'FD');
    }
  };
  // Nagłówek sekcji: tytuł INK + mosiężny akcent
  const sectionHead = (title: string, size = 10.5) => {
    doc.setFont(F, 'bold'); doc.setFontSize(size); setText(INK);
    txt(title, M, y);
    const yLine = y + 1.8;
    setDraw(ACCENT); doc.setLineWidth(1.0); doc.line(M, yLine, M + 22, yLine);
    setDraw(LINE); doc.setLineWidth(0.25); doc.line(M + 22, yLine, W - M, yLine);
    y += 6.5;
  };
  const footer = (page: number) => {
    const fy = H - 11;
    setDraw(ACCENT); doc.setLineWidth(0.6); doc.line(M, fy, W - M, fy);
    doc.setFont(F, 'bold'); doc.setFontSize(8); setText(INK);
    txt(company.tradeName, M, fy + 4);
    doc.setFont(F, 'normal'); doc.setFontSize(7); setText(MUTED);
    txt(L.kundeSign, W / 2 - doc.getTextWidth(tr(L.kundeSign)) / 2, fy + 4);
    txt(`${L.seite} ${page}`, W - M, fy + 4, { align: 'right' });
  };

  // ═══════════ PAGE 1 ═══════════
  let y = M;
  // Logo marki (DE: wbudowane; PL: /public/zadaszto-logo.png lub wordmark)
  drawBrandLogo(doc, brand, M, y - 1, 44, 14, F, brandLogo);
  const datumSource = formData?.datum || contract.createdAt;
  const dateStr = datumSource ? new Date(datumSource).toLocaleDateString(brand.locale) : '..........';
  doc.setFont(F,'bold'); doc.setFontSize(16); setText(INK);
  txt(L.title.replace(/ nr$/i, '').toUpperCase(), W-M, y+5, {align:'right'});
  doc.setFont(F,'normal'); doc.setFontSize(8.5); setText(MUTED);
  txt(`${contract.contractNumber || '—'}     ${L.datum}: ${dateStr}`, W-M, y+10.5, {align:'right'});
  y += 16;
  setDraw(ACCENT); doc.setLineWidth(0.7); doc.line(M, y, W-M, y);
  setDraw(LINE); doc.setLineWidth(0.25); doc.line(M, y+0.9, W-M, y+0.9);
  y += 7;

  // Strony (Zamawiający / Wykonawca)
  doc.setFont(F,'bold'); doc.setFontSize(7.5); setText(MUTED);
  txt(L.partyClient, M, y); txt(L.partyCompany, W/2+5, y);
  y += 4.5;
  const rows = [
    [L.rName, `${client.firstName || ''} ${client.lastName || ''}`.trim(), company.legalName],
    [L.rAddr, `${client.street || ''} ${client.houseNumber || ''}, ${client.postalCode || ''} ${client.city || ''}`, company.address],
    [L.rPhone, client.phone || '', company.phone],
    [L.rMail, client.email || '', company.email],
  ];
  rows.forEach(([label, left, right]) => {
    setDraw(LINE); doc.setLineWidth(0.2); doc.line(M, y+5, W-M, y+5);
    doc.setFont(F,'normal'); doc.setFontSize(6.8); setText(MUTED);
    txt(label, M, y+3);
    doc.setFontSize(9); setText(INK);
    txt(left, M+26, y+3);
    txt(right, W/2+5, y+3);
    y += 7;
  });
  y += 6;

  // Ceny (karta z akcentem)
  const boxH = 16;
  setFill(SOFT); setDraw(LINE); doc.setLineWidth(0.3);
  doc.roundedRect(M, y, cW, boxH, 1.5, 1.5, 'FD');
  setFill(ACCENT); doc.rect(M, y, 1.4, boxH, 'F');
  doc.setFont(F,'normal'); doc.setFontSize(8); setText(MUTED);
  txt(L.priceNet, M+6, y+6);
  doc.setFont(F,'bold'); doc.setFontSize(9); setText(INK);
  txt(money(netPrice), W-M-4, y+6, {align:'right'});
  doc.setFont(F,'normal'); doc.setFontSize(8); setText(MUTED);
  txt(L.priceGross(vatPct), M+6, y+12.5);
  doc.setFont(F,'bold'); doc.setFontSize(11); setText(INK);
  txt(money(grossPrice), W-M-4, y+12.5, {align:'right'});
  y += boxH + 6;

  // Konstruktionstyp
  sectionHead(L.konstruktionstyp);
  doc.setFontSize(8); doc.setFont(F,'normal');
  const ktRows = [KONSTRUKTION_TYPES.slice(0,4), KONSTRUKTION_TYPES.slice(4)];
  ktRows.forEach(row => {
    let rx = M;
    row.forEach(kt => {
      const checked = modelId.includes(kt) || modelId === kt;
      checkbox(rx, y, checked);
      txt(KONSTRUKTION_LABELS[kt], rx+6, y+3);
      rx += 42;
    });
    y += 8;
  });
  y += 3;

  // Art der Befestigung
  sectionHead(L.befestigung);
  doc.setFontSize(8); doc.setFont(F,'normal');
  const mountType = (product?.installationType || '').toLowerCase();
  checkbox(M, y, mountType === 'wall' || mountType === 'wall-mounted');
  txt(L.wandmontage, M+6, y+3);
  checkbox(M+70, y, mountType === 'freestanding');
  txt(L.freistehend, M+76, y+3);
  y += 10;

  // Masse der Konstruktion
  sectionHead(L.masse);
  doc.setFontSize(9); doc.setFont(F,'normal'); setText(INK);
  setFill(SOFT); setDraw(LINE); doc.setLineWidth(0.3); doc.roundedRect(M, y, cW, 10, 1.4, 1.4, 'FD');
  const wVal = product?.width || '______';
  const dVal = product?.projection || '______';
  const hVal = (product as any)?.maxHeight || '______';
  txt(`${wVal} ${L.breit}`, M+8, y+7);
  txt(`${dVal} ${L.tief}`, M+65, y+7);
  txt(`${hVal} ${L.hoehe}`, M+120, y+7);
  y += 15;

  // Colors
  doc.setFontSize(8);
  let cx = M;
  COLORS_LIST.forEach(c => {
    const isChecked = detectedColor.includes(c) || (c === 'Andere' && detectedColor === '' && colorRaw !== '');
    checkbox(cx, y, isChecked);
    txt(c === 'Andere' && lang === 'pl' ? 'Inny' : c, cx+6, y+3);
    cx += 30;
  });
  y += 10;
  footer(1);

  // ═══════════ PAGE 2 ═══════════
  doc.addPage(); y = M;

  // Dacheindeckung polycarbonat
  sectionHead(L.dachPoly);
  const roofType = (product?.roofType || '').toLowerCase();
  const polyOpts = ['Opal','Klar','UV Reflex Opal','UV Reflex Klar'];
  doc.setFontSize(8); doc.setFont(F,'normal');
  let px = M;
  polyOpts.forEach(opt => {
    const checked = formData
      ? formData.dachPolycarbonat === opt
      : (roofType.includes('poly') && roofType.includes(opt.toLowerCase().split(' ')[0]));
    checkbox(px, y, checked);
    txt(optL(opt), px+6, y+3);
    px += 40;
  });
  y += 12;

  // Dacheindeckung glass
  sectionHead(L.dachGlas);
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, formData ? formData.dachGlassThickness === '8mm' : (roofType.includes('glass') && roofType.includes('8')));
  txt('8 mm', M+6, y+3);
  checkbox(M+30, y, formData ? formData.dachGlassThickness === '10mm' : (roofType.includes('glass') && roofType.includes('10')));
  txt('10 mm', M+36, y+3);
  y += 8;
  const glassOpts = ['Matt/milch','Klar','Sonnenschutzglass'];
  px = M;
  glassOpts.forEach(opt => {
    const checked = formData
      ? formData.dachGlassType === opt
      : (roofType.includes('glass') && roofType.includes(opt.toLowerCase().split('/')[0]));
    checkbox(px, y, checked);
    txt(optL(opt), px+6, y+3);
    px += 50;
  });
  y += 12;

  // Zusatzausstattung
  sectionHead(L.zusatz, 12);

  // Keilfenster
  sectionHead(L.keilfenster);
  doc.setFontSize(8); doc.setFont(F,'normal');
  const keilMaterialChecks = [formData?.keilfensterMaterial === 'poly', formData?.keilfensterMaterial === 'glass'];
  ['Polycarbonat','Glass'].forEach((opt,i) => {
    checkbox(M + i*50, y, keilMaterialChecks[i]);
    txt(optL(opt), M+6 + i*50, y+3);
  });
  y += 8;
  ['Matt/milch','Klar','ISO (nur glass)'].forEach((opt,i) => {
    checkbox(M + i*50, y, formData?.keilfensterType === opt);
    txt(optL(opt), M+6 + i*50, y+3);
  });
  y += 12;

  // Seitliche optionen
  sectionHead(L.seitlich);
  doc.setFontSize(8); doc.setFont(F,'normal');
  const sideSelections: string[][] = [formData?.sideLeft || [], formData?.sideFront || [], formData?.sideRight || []];
  const sideOpts = ['Panoramaschiebesystem','Rahmen mit Schiebelementen','Festwand','ZIP Screen','Markise'];
  L.sides.forEach((side, si) => {
    doc.setFont(F,'bold'); doc.setFontSize(8);
    txt(side, M, y); y += 5;
    doc.setFont(F,'normal'); doc.setFontSize(7);
    sideOpts.forEach(opt => {
      const checked = sideSelections[si].some(s => s.toLowerCase() === opt.toLowerCase());
      checkbox(M+3, y, checked);
      txt(optL(opt), M+9, y+3);
      y += 5;
    });
    y += 3;
  });
  y += 3;

  // LED
  sectionHead(L.led);
  doc.setFontSize(8); doc.setFont(F,'normal');
  const spotsCount = formData?.ledSpots && formData.ledSpotsCount ? formData.ledSpotsCount : '____';
  const stripeLength = formData?.ledStripe && formData.ledStripeLength ? formData.ledStripeLength : '____';
  checkbox(M, y, !!formData?.ledSpots); txt(L.ledSpots(spotsCount), M+6, y+3);
  checkbox(M+80, y, !!formData?.ledStripe); txt(L.ledStripe(stripeLength), M+86, y+3);
  y += 10;
  footer(2);

  // ═══════════ PAGE 3 ═══════════
  doc.addPage(); y = M;

  // Heizstrahler
  sectionHead(L.heiz);
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, !!formData?.heizTyp4); txt('2000W (typ 4)', M+6, y+3);
  checkbox(M+70, y, !!formData?.heizTyp5); txt('2000 W (typ 5) + Music', M+76, y+3);
  y += 12;

  // Montage/Lieferung
  sectionHead(L.montageLief);
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, formData ? !!formData.montagePolendach : true); txt(company.tradeName, M+6, y+3);
  checkbox(M+70, y, !!formData?.montageKunde); txt(L.kunde, M+76, y+3);
  y += 12;

  // Zusaetzliche Auftragsbeschreibung
  sectionHead(L.zusatzBeschr);
  // Draw lined area
  doc.setDrawColor(200,200,200);
  for (let i = 0; i < 12; i++) {
    doc.line(M, y+6, W-M, y+6);
    y += 8;
  }

  // Fill with notes if available
  const notes = contract.installationNotes || '';
  if (notes) {
    doc.setFontSize(8); doc.setFont(F,'normal'); doc.setTextColor(30,30,30);
    const lines = doc.splitTextToSize(tr(notes), cW - 6);
    const startY2 = y - 12*8 + 4;
    doc.text(lines.slice(0, 12), M+2, startY2);
  }
  footer(3);

  // ═══════════ PAGE 4+ AGB / OWU ═══════════
  const agbSections = lang === 'pl' ? AGB_SECTIONS_PL : AGB_SECTIONS;
  const rodoSection = lang === 'pl' ? RODO_SECTION_PL : RODO_SECTION;
  doc.addPage(); y = M;
  doc.setFont(F,'bold'); doc.setFontSize(11); setText(INK);
  txt(lang === 'pl' ? 'OGÓLNE WARUNKI UMOWY (OWU)' : 'ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB)', M, y);
  y += 2.2;
  setDraw(ACCENT); doc.setLineWidth(1.0); doc.line(M, y, M + 22, y);
  setDraw(LINE); doc.setLineWidth(0.25); doc.line(M + 22, y, W - M, y);
  y += 4.5;
  doc.setFont(F,'normal'); doc.setFontSize(7); setText(MUTED);
  txt(`${company.legalName}, ${company.address}`, M, y);
  y += 6;
  let pageNum = 4;

  agbSections.forEach(section => {
    if (y > H - 30) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
    doc.setFontSize(8.5); doc.setFont(F,'bold'); setText(INK);
    const titleLines = doc.splitTextToSize(tr(section.title), cW - 6);
    doc.text(titleLines, M, y); y += titleLines.length * 4 + 1;
    doc.setFont(F,'normal'); doc.setFontSize(7); setText(TEXT);
    section.items.forEach((item, idx) => {
      const lines = doc.splitTextToSize(tr(`${idx+1}. ${item}`), cW - 6);
      if (y + lines.length * 3.5 > H - 20) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
      doc.text(lines, M+3, y);
      y += lines.length * 3.5 + 1.5;
    });
    y += 3;
  });

  // Signatures
  if (y > H - 50) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
  y += 6;
  const sigW = (cW - 20) / 2;
  setDraw(LINE); doc.setLineWidth(0.3); setFill(SOFT);
  doc.roundedRect(M, y, sigW, 24, 1.5, 1.5, 'FD');
  doc.roundedRect(M + sigW + 20, y, sigW, 24, 1.5, 1.5, 'FD');
  setFill(ACCENT); doc.rect(M + 2, y, sigW - 4, 1, 'F'); doc.rect(M + sigW + 22, y, sigW - 4, 1, 'F');
  doc.setFontSize(7); doc.setFont(F,'normal'); setText(MUTED);
  txt(L.unterschriftKunde, M+4, y+5);
  txt(L.unterschriftFirma, M+sigW+24, y+5);
  y += 30;

  // RODO
  if (y > H - 60) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
  setFill(ACCENT); doc.rect(M, y, cW, 0.8, 'F');
  y += 5;
  doc.setFontSize(8.5); doc.setFont(F,'bold'); setText(INK);
  const rodoTitleLines = doc.splitTextToSize(tr(rodoSection.title), cW - 6);
  doc.text(rodoTitleLines, M, y); y += rodoTitleLines.length * 4 + 1;
  doc.setFont(F,'normal'); doc.setFontSize(6.5); setText(TEXT);
  rodoSection.items.forEach((item, idx) => {
    const lines = doc.splitTextToSize(tr(`${idx+1}. ${item}`), cW - 6);
    if (y + lines.length * 3 > H - 15) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
    doc.text(lines, M+3, y);
    y += lines.length * 3 + 1.5;
  });

  footer(pageNum);

  // Save
  const nr = (contract.contractNumber || 'DRAFT').replace(/\//g, '-');
  const name = tr(`${client.lastName || (lang === 'pl' ? 'Klient' : 'Kunde')}`).replace(/[^A-Za-z0-9_-]/g, '');
  const fileBase = lang === 'pl' ? 'Karta_zamowienia' : 'Bestellschein';
  doc.save(`${fileBase}_${name}_${nr}.pdf`);
}
