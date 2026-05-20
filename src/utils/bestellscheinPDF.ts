import jsPDF from 'jspdf';
import type { Contract } from '../types';
import { AGB_SECTIONS, RODO_SECTION } from './bestellscheinAGB';

// Character transliteration for helvetica
const CH: Record<string, string> = {
  'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z',
  'Ą':'A','Ć':'C','Ę':'E','Ł':'L','Ń':'N','Ó':'O','Ś':'S','Ź':'Z','Ż':'Z',
  'ü':'ue','ö':'oe','ä':'ae','Ü':'Ue','Ö':'Oe','Ä':'Ae','ß':'ss',
  '—':'-','–':'-','×':'x'
};
const t = (s: string) => s.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄß—–×]/g, c => CH[c] || c);

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

export async function generateBestellscheinPDF(contract: Contract): Promise<void> {
  const doc = new jsPDF();
  const F = 'helvetica';
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const cW = W - 2 * M;
  const product = contract.product as any;
  const pricing = contract.pricing as any;
  const client = contract.client;
  const isPL = pricing?.currency === 'PLN';
  const rawVat = pricing?.vatRate;
  const vatRate = rawVat ? (rawVat < 1 ? 1 + rawVat : rawVat) : (isPL ? 1.23 : 1.19);
  const netPrice = pricing?.finalPriceNet || pricing?.sellingPriceNet || 0;
  const grossPrice = netPrice * vatRate;
  const modelId = (product?.modelId || '').toLowerCase().replace(/line/g,'style');

  // Detect color
  const colorRaw = (product?.color || '').toLowerCase();
  let detectedColor = '';
  for (const [k,v] of Object.entries(COLOR_MAP)) {
    if (colorRaw.includes(k)) { detectedColor = v; break; }
  }

  // helpers
  const txt = (s:string, x:number, y:number, o?:any) => doc.text(t(s), x, y, o);
  const checkbox = (x:number, y:number, checked:boolean) => {
    doc.setDrawColor(100,100,100);
    doc.rect(x, y, 4, 4);
    if (checked) {
      doc.setFont(F,'bold'); doc.setFontSize(9);
      doc.setTextColor(30,30,30);
      txt('X', x+0.7, y+3.3);
    }
  };
  const footer = (page: number) => {
    doc.setFontSize(7); doc.setFont(F,'normal');
    doc.setTextColor(120,120,120);
    txt('Kunde singature:', M, H-10);
    // Logo text
    doc.setFont(F,'bold'); doc.setFontSize(9);
    doc.setTextColor(30,30,30);
    txt('PolenDach', W/2-12, H-10);
    doc.setTextColor(100,160,210);
    txt('24', W/2+10, H-10);
    // Page number
    doc.setFont(F,'normal'); doc.setFontSize(8);
    doc.setTextColor(30,30,30);
    txt(`Seite ${page}`, W-M, H-10, {align:'right'});
  };

  // ═══════════ PAGE 1 ═══════════
  let y = M;
  // Logo
  try { doc.addImage('/logo.png','PNG', M, y, 38, 14); } catch {}
  // Datum
  doc.setFontSize(10); doc.setFont(F,'normal'); doc.setTextColor(30,30,30);
  const dateStr = contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('de-DE') : '....................';
  txt(`Datum: ${dateStr}`, W-M-50, y+6);
  y += 20;

  // Title
  doc.setFontSize(13); doc.setFont(F,'bold');
  txt(`Bestellschein nr ...PL/${contract.contractNumber || '........./...../..........'}`, M+5, y);
  y += 10;

  // Client/Company table
  doc.setFontSize(9); doc.setFont(F,'normal');
  const tableY = y;
  doc.setDrawColor(180,180,180);
  // Headers
  doc.setFont(F,'bold');
  txt('Zwischen', M, y); txt('Und', W/2+5, y);
  y += 5;
  doc.setFont(F,'normal');
  // Rows
  const rows = [
    ['Name, Vorname', `${client.firstName || ''} ${client.lastName || ''}`, 'Polendach24 s.c.'],
    ['Adress', `${client.street || ''} ${client.houseNumber || ''}, ${client.postalCode || ''} ${client.city || ''}`, 'Kolonia Walowice dz. nr. 221/33, Gubin 66-620'],
    ['Mobil', client.phone || '', '03561 501 9981'],
    ['E-mail', client.email || '', 'buero@polendach24.de'],
  ];
  rows.forEach(([label, left, right]) => {
    doc.setDrawColor(200,200,200); doc.line(M, y+5, W-M, y+5);
    doc.setFontSize(7); doc.setTextColor(100,100,100);
    txt(label, M, y+3);
    doc.setFontSize(9); doc.setTextColor(30,30,30);
    txt(left, M+28, y+3);
    txt(right, W/2+5, y+3);
    y += 7;
  });
  y += 4;

  // Prices
  doc.setFillColor(245,245,245); doc.rect(M, y, cW, 14, 'F');
  doc.setDrawColor(200,200,200); doc.rect(M, y, cW, 14);
  doc.setFontSize(8); doc.setFont(F,'normal'); doc.setTextColor(30,30,30);
  txt('Gesamtpreis exkl. MwSt. - NETTO', M+3, y+5);
  doc.setFont(F,'bold');
  txt(`${netPrice.toFixed(2)} EUR`, W/2+30, y+5, {align:'right'});
  doc.setFont(F,'normal');
  txt('Gesamtpreis inkl. mWst. (19 %) - BRUTTO', M+3, y+12);
  doc.setFont(F,'bold');
  txt(`${grossPrice.toFixed(2)} EUR`, W/2+30, y+12, {align:'right'});
  y += 19;

  // Konstruktionstyp
  doc.setFontSize(10); doc.setFont(F,'bold'); doc.setTextColor(30,30,30);
  txt('Konstruktionstyp', M, y); y += 6;
  doc.setFontSize(8); doc.setFont(F,'normal');
  const ktRows = [KONSTRUKTION_TYPES.slice(0,4), KONSTRUKTION_TYPES.slice(4)];
  ktRows.forEach(row => {
    let rx = M;
    row.forEach(kt => {
      const checked = modelId.includes(kt.replace('_xl','_xl').replace('_deluxe','_deluxe')) || modelId === kt;
      checkbox(rx, y, checked);
      txt(KONSTRUKTION_LABELS[kt], rx+6, y+3);
      rx += 42;
    });
    y += 8;
  });
  y += 3;

  // Art der Befestigung
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Art der befestigung', M, y); y += 6;
  doc.setFontSize(8); doc.setFont(F,'normal');
  const mountType = (product?.installationType || '').toLowerCase();
  checkbox(M, y, mountType === 'wall' || mountType === 'wall-mounted');
  txt('Wandmontage', M+6, y+3);
  checkbox(M+70, y, mountType === 'freestanding');
  txt('Freistehende Konstruktion', M+76, y+3);
  y += 10;

  // Masse der Konstruktion
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Masse der Konstruktion', M, y); y += 7;
  doc.setFontSize(9); doc.setFont(F,'normal');
  doc.setFillColor(245,245,245); doc.rect(M, y, cW, 10, 'F');
  doc.setDrawColor(200,200,200); doc.rect(M, y, cW, 10);
  const wVal = product?.width || '______';
  const dVal = product?.projection || '______';
  const hVal = (product as any)?.maxHeight || '______';
  txt(`${wVal} mm breit`, M+8, y+7);
  txt(`${dVal} mm tief`, M+65, y+7);
  txt(`${hVal} mm max.Hoehe`, M+120, y+7);
  y += 15;

  // Colors
  doc.setFontSize(8);
  let cx = M;
  COLORS_LIST.forEach(c => {
    const isChecked = detectedColor.includes(c) || (c === 'Andere' && detectedColor === '' && colorRaw !== '');
    checkbox(cx, y, isChecked);
    txt(c, cx+6, y+3);
    cx += 30;
  });
  y += 10;
  footer(1);

  // ═══════════ PAGE 2 ═══════════
  doc.addPage(); y = M;

  // Dacheindeckung polycarbonat
  doc.setFontSize(10); doc.setFont(F,'bold'); doc.setTextColor(30,30,30);
  txt('Art der Dacheindeckung (polycarbonat)', M, y); y += 7;
  const roofType = (product?.roofType || '').toLowerCase();
  const polyOpts = ['Opal','Klar','UV Reflex Opal','UV Reflex Klar'];
  doc.setFontSize(8); doc.setFont(F,'normal');
  let px = M;
  polyOpts.forEach(opt => {
    const checked = roofType.includes('poly') && roofType.includes(opt.toLowerCase().split(' ')[0]);
    checkbox(px, y, checked);
    txt(opt, px+6, y+3);
    px += 40;
  });
  y += 12;

  // Dacheindeckung glass
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Art der Dacheindeckung (glass)', M, y); y += 7;
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, roofType.includes('glass') && roofType.includes('8'));
  txt('8 mm', M+6, y+3);
  checkbox(M+30, y, roofType.includes('glass') && roofType.includes('10'));
  txt('10 mm', M+36, y+3);
  y += 8;
  const glassOpts = ['Matt/milch','Klar','Sonnenschutzglass'];
  px = M;
  glassOpts.forEach(opt => {
    const checked = roofType.includes('glass') && roofType.includes(opt.toLowerCase().split('/')[0]);
    checkbox(px, y, checked);
    txt(opt, px+6, y+3);
    px += 50;
  });
  y += 12;

  // Zusatzausstattung
  doc.setFontSize(12); doc.setFont(F,'bold');
  txt('Zusatzausstattung und Optionen', M, y); y += 8;

  // Keilfenster
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Keilfenster', M, y); y += 6;
  doc.setFontSize(8); doc.setFont(F,'normal');
  ['Polycarbonat','Glass'].forEach((opt,i) => {
    checkbox(M + i*50, y, false);
    txt(opt, M+6 + i*50, y+3);
  });
  y += 8;
  ['Matt/milch','Klar','ISO (nur glass)'].forEach((opt,i) => {
    checkbox(M + i*50, y, false);
    txt(opt, M+6 + i*50, y+3);
  });
  y += 12;

  // Seitliche optionen
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Seitliche optionen', M, y); y += 8;
  doc.setFontSize(8); doc.setFont(F,'normal');
  const sides = ['Linke seite','Front','Rechte seite'];
  const sideOpts = ['Panoramaschiebesystem','Rahmen mit schiebelementen','Festwand','ZIP Screen'];
  sides.forEach((side, si) => {
    doc.setFont(F,'bold'); doc.setFontSize(8);
    txt(side, M, y); y += 5;
    doc.setFont(F,'normal'); doc.setFontSize(7);
    sideOpts.forEach(opt => {
      checkbox(M+3, y, false);
      txt(opt, M+9, y+3);
      y += 5;
    });
    y += 3;
  });
  y += 3;

  // LED
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('LED', M, y); y += 6;
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, false); txt('SPOTS (anzahl:____ stk.)', M+6, y+3);
  checkbox(M+80, y, false); txt('LED STRIPE (anzahl:____m)', M+86, y+3);
  y += 10;
  footer(2);

  // ═══════════ PAGE 3 ═══════════
  doc.addPage(); y = M;

  // Heizstrahler
  doc.setFontSize(10); doc.setFont(F,'bold'); doc.setTextColor(30,30,30);
  txt('Heizstrahler', M, y); y += 7;
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, false); txt('2000W (typ 4)', M+6, y+3);
  checkbox(M+70, y, false); txt('2000 W (typ 5) + Music', M+76, y+3);
  y += 12;

  // Montage/Lieferung
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Montage/Lieferung', M, y); y += 7;
  doc.setFontSize(8); doc.setFont(F,'normal');
  checkbox(M, y, true); txt('Polendach24', M+6, y+3);
  checkbox(M+70, y, false); txt('Kunde', M+76, y+3);
  y += 12;

  // Zusaetzliche Auftragsbeschreibung
  doc.setFontSize(10); doc.setFont(F,'bold');
  txt('Zusaetzliche Auftragsbeschreibung', M, y); y += 7;
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
    const lines = doc.splitTextToSize(t(notes), cW - 6);
    const startY2 = y - 12*8 + 4;
    doc.text(lines.slice(0, 12), M+2, startY2);
  }
  footer(3);

  // ═══════════ PAGE 4+ AGB ═══════════
  doc.addPage(); y = M;
  doc.setFontSize(8); doc.setFont(F,'bold'); doc.setTextColor(30,30,30);
  txt('ALLGEMEINE GESCHAEFTSBEDINGUNGEN (AGB) Polendach24 s.c., Kolonia Walowice,', M, y);
  y += 4;
  txt('Flurstueck 221/33, 66-620 Gubin', M, y);
  y += 7;
  let pageNum = 4;

  AGB_SECTIONS.forEach(section => {
    if (y > H - 30) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
    doc.setFontSize(8); doc.setFont(F,'bold'); doc.setTextColor(30,30,30);
    txt(section.title, M, y); y += 5;
    doc.setFont(F,'normal'); doc.setFontSize(7);
    section.items.forEach((item, idx) => {
      const lines = doc.splitTextToSize(t(`${idx+1}. ${item}`), cW - 6);
      if (y + lines.length * 3.5 > H - 20) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
      doc.text(lines, M+3, y);
      y += lines.length * 3.5 + 1.5;
    });
    y += 3;
  });

  // Signatures
  if (y > H - 50) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
  y += 5;
  const sigW = (cW - 20) / 2;
  doc.setDrawColor(180,180,180);
  doc.rect(M, y, sigW, 25);
  doc.rect(M + sigW + 20, y, sigW, 25);
  doc.setFontSize(7); doc.setFont(F,'normal'); doc.setTextColor(100,100,100);
  txt('Unterschrift des Kunden:', M+3, y+5);
  txt('Unterschrift des Firmenvertreters:', M+sigW+23, y+5);
  y += 30;

  // RODO
  if (y > H - 60) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
  doc.setDrawColor(200,200,200);
  doc.rect(M, y, cW, 2);
  y += 5;
  doc.setFontSize(8); doc.setFont(F,'bold');
  txt(RODO_SECTION.title, M, y); y += 5;
  doc.setFont(F,'normal'); doc.setFontSize(6.5);
  RODO_SECTION.items.forEach((item, idx) => {
    const lines = doc.splitTextToSize(t(`${idx+1}. ${item}`), cW - 6);
    if (y + lines.length * 3 > H - 15) { footer(pageNum); doc.addPage(); y = M; pageNum++; }
    doc.text(lines, M+3, y);
    y += lines.length * 3 + 1.5;
  });

  footer(pageNum);

  // Save
  const nr = (contract.contractNumber || 'DRAFT').replace(/\//g, '-');
  const name = t(`${client.lastName || 'Kunde'}`);
  doc.save(`Bestellschein_${name}_${nr}.pdf`);
}
