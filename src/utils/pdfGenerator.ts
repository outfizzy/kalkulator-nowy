import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Offer } from '../types';
import { getSalesProfile, getCurrentUser } from './storage';
import { translate, formatCurrency } from './translations';
import { LOGO_BASE64 } from './assets';
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './pdfFonts';

// --- ULTRA PREMIUM DESIGN SYSTEM ---
const THEME = {
    primary: [18, 28, 45] as [number, number, number],      // Dark Midnight Navy
    secondary: [197, 160, 101] as [number, number, number], // Muted Brass/Gold
    surface: [250, 250, 250] as [number, number, number],   // Ultra-Light Gray
    text: [30, 30, 30] as [number, number, number],         // Soft Black
    textLight: [100, 100, 100] as [number, number, number], // Slate Gray
    white: [255, 255, 255] as [number, number, number],
    line: [230, 230, 230] as [number, number, number]
};

const FONTS = {
    bold: 'Roboto',
    normal: 'Roboto',
};

const MARGIN = 18;

// SAFE STRING UTILS
function safeStr(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val);
}

// sanitizeText removed — Roboto fonts support UTF-8 natively

function translateForPDF(key: string, category: string): string {
    const v2Map: Record<string, string> = {
        // Models
        'trendline': 'Trendstyle', 'trendstyle': 'Trendstyle',
        'trendline_new': 'Trendstyle New', 'trendstyle_new': 'Trendstyle New',
        'trendline_plus': 'Trendstyle+', 'trendstyle_plus': 'Trendstyle+',
        'skyline': 'Skystyle', 'skystyle': 'Skystyle',
        'ultraline': 'Ultrastyle', 'ultrastyle': 'Ultrastyle',
        'topline': 'Topstyle', 'topstyle': 'Topstyle',
        'topline_xl': 'Topstyle XL', 'topstyle_xl': 'Topstyle XL',
        'designline': 'Designstyle', 'designstyle': 'Designstyle',
        'orangeline': 'Orangestyle', 'orangestyle': 'Orangestyle',
        'orangeline+': 'Orangestyle+', 'orangestyle+': 'Orangestyle+',
        // Roof types
        'poly': 'Polycarbonat', 'polycarbonate': 'Polycarbonat', 'glass': 'Glas VSG 8mm',
        'clear': 'Klar', 'klar': 'Klar', 'opal': 'Opal', 'matt': 'Matt',
        'stopsol': 'UV Reflex (Sonnenschutz)', 'ir-gold': 'IR Gold (Hitzeschutz)',
        // Installation types
        'wall': 'Wandmontage', 'wall-mounted': 'Wandmontage',
        'freestanding': 'Freistehend', 'wedge': 'Keilform',
        // Colors
        'anthracite': 'Anthrazit (RAL 7016)', 'white': 'Weiss (RAL 9016)',
        'ral7016': 'Anthrazit (RAL 7016)', 'ral9016': 'Weiss (RAL 9016)',
        'silberr': 'Silber (RAL 9006)', 'sepia': 'Sepiabraun (RAL 8014)'
    };
    if (v2Map[key.toLowerCase()]) return v2Map[key.toLowerCase()];
    return translate(key, category as any);
}

// === PROFESSIONAL PRODUCT DESCRIPTIONS FOR PDF ===
// Parses item name + config to produce rich German descriptions with material specs

function getGlassTypeLabel(config: string): string {
    const c = (config || '').toLowerCase();
    if (c.includes('isolierglas') || c.includes('iso')) return 'Wärmedämm-Isolierglas';
    if (c.includes('matt') || c.includes('satiniert')) return 'VSG Sicherheitsglas satiniert (Sichtschutz)';
    if (c.includes('stopsol')) return 'UV Reflex Sonnenschutzglas';
    if (c.includes('klar')) return 'VSG Sicherheitsglas klar';
    if (c.includes('vsg')) return 'VSG Sicherheitsglas';
    return '';
}

function getRoofCoverLabel(config: string): string {
    const c = (config || '').toLowerCase();
    if (c.includes('glass') || c.includes('glas')) {
        if (c.includes('matt') || c.includes('satiniert')) return 'VSG Sicherheitsglas 8 mm satiniert';
        if (c.includes('stopsol')) return 'UV Reflex Sonnenschutzglas 8 mm';
        return 'VSG Sicherheitsglas 8 mm klar';
    }
    if (c.includes('poly')) {
        if (c.includes('ir') || c.includes('gold')) return 'Polycarbonat Stegplatten 16 mm (IR-Wärmeschutz)';
        if (c.includes('opal')) return 'Polycarbonat Stegplatten 16 mm opal';
        return 'Polycarbonat Stegplatten 16 mm klar';
    }
    return '';
}

function getPlacementLabel(config: string): string {
    const c = (config || '').toLowerCase();
    if (c.includes('front:') || c.includes('front')) return 'Frontseite';
    if (c.includes('links:') || c.includes('links') || c.includes('left')) return 'Linke Seite';
    if (c.includes('rechts:') || c.includes('rechts') || c.includes('right')) return 'Rechte Seite';
    return '';
}

function professionalItemDescription(name: string, config?: string): string {
    const n = (name || '').toLowerCase();
    const conf = config || '';
    
    // Helper: extract dimensions from config string
    const dimMatch = conf.match(/(\d+)\s*[×x]\s*(\d+)\s*mm/i);
    const dimStr = dimMatch ? `${dimMatch[1]} × ${dimMatch[2]} mm` : '';

    // --- WALLS ---
    if (n.includes('seitenwand') || n.includes('side wall')) {
        const glass = getGlassTypeLabel(conf) || getGlassTypeLabel(n);
        const placement = getPlacementLabel(conf);
        let desc = 'Festverglaste Aluminium-Seitenwand';
        if (glass) desc += `\ninkl. ${glass}`;
        if (dimStr) desc += ` · ${dimStr}`;
        if (placement) desc += ` · ${placement}`;
        return desc;
    }

    if (n.includes('frontwand') || n.includes('front wall')) {
        const glass = getGlassTypeLabel(conf) || getGlassTypeLabel(n);
        const placement = getPlacementLabel(conf);
        let desc = 'Festverglaste Aluminium-Frontwand';
        if (glass) desc += `\ninkl. ${glass}`;
        if (dimStr) desc += ` · ${dimStr}`;
        if (placement) desc += ` · ${placement}`;
        return desc;
    }

    // --- KEILFENSTER (Wedge) ---
    if (n.includes('keilfenster') || n.includes('wedge')) {
        const placement = getPlacementLabel(conf);
        let desc = 'Dreieckiges Keilfenster (Giebeldreieck)';
        const glass = getGlassTypeLabel(conf) || getGlassTypeLabel(n);
        if (glass) desc += `\ninkl. ${glass}`;
        if (dimStr) desc += ` · ${dimStr}`;
        if (placement) desc += ` · ${placement}`;
        // Add accessories from config
        if (conf.toLowerCase().includes('kipp-fenster') || conf.toLowerCase().includes('kippfenster')) {
            desc += '\nMit integriertem Dreh-Kipp-Fenster';
        }
        return desc;
    }

    // --- SCHIEBETÜR (Framed sliding door) ---
    if (n.includes('schiebetür') || n.includes('schiebetuer') || n.includes('drzwi przesuwne')) {
        const glass = getGlassTypeLabel(conf) || getGlassTypeLabel(n);
        let desc = 'Aluminium-Schiebetür';
        if (glass) desc += `, ${glass}`;
        // Extract panels
        const panelMatch = conf.match(/(\d+-\d*\s*Flügel|\d+\s*Flügel)/i);
        if (panelMatch) desc += `, ${panelMatch[1]}`;
        // Extract opening direction
        if (conf.toLowerCase().includes('links')) desc += '\nÖffnung nach links';
        else if (conf.toLowerCase().includes('rechts')) desc += '\nÖffnung nach rechts';
        else if (conf.toLowerCase().includes('mittig')) desc += '\nMittig öffnend';
        // Extract handle
        const handleMatch = conf.match(/Handgriff[^(]*/i);
        if (handleMatch) desc += ` · ${handleMatch[0].trim()}`;
        return desc;
    }

    // --- PANORAMA (Frameless sliding glass) ---
    if (n.includes('panorama')) {
        const modelMatch = n.match(/AL\d+/i);
        const trackMatch = n.match(/(\d+)-Tor/i);
        let desc = 'Rahmenlose Panorama-Glasschiebewand';
        if (modelMatch) desc += ` (${modelMatch[0].toUpperCase()})`;
        if (trackMatch) desc += `\n${trackMatch[1]}-spuriges System, ESG Sicherheitsglas 10 mm`;
        const placement = getPlacementLabel(conf);
        if (placement) desc += ` · ${placement}`;
        return desc;
    }

    // --- MARKISE / ZIP ---
    if (n.includes('zip') || n.includes('markise') || n.includes('awning')) {
        const placement = getPlacementLabel(conf);
        if (n.includes('zip')) {
            let desc = 'ZIP-Senkrechtmarkise mit Somfy-Motor (Textilscreen)';
            if (dimStr) desc += `\n${dimStr}`;
            if (placement) desc += ` · ${placement}`;
            return desc;
        }
        let desc = 'Aufdachmarkise mit Somfy-Motor';
        if (dimStr) desc += `\n${dimStr}`;
        if (placement) desc += ` · ${placement}`;
        return desc;
    }

    // --- LED ---
    if (n.includes('led')) {
        if (n.includes('spot')) return 'LED-Spotbeleuchtung\nEinbau in Sparren, warmweiß 3000K';
        if (n.includes('strip')) return 'LED-Lichtleiste\nIndirekte Beleuchtung, warmweiß 3000K';
        return 'LED-Beleuchtung\nIntegriert in Konstruktion, warmweiß 3000K';
    }

    // --- HEIZSTRAHLER ---
    if (n.includes('heiz') || n.includes('heating') || n.includes('infrarot')) {
        return 'Infrarot-Heizstrahler\nFernbedienung, spritzwassergeschützt (IP65)';
    }

    // --- WPC BODEN ---
    if (n.includes('wpc')) {
        return `WPC Terrassendielen\n${conf || 'Premium Holz-Kunststoff-Verbundwerkstoff, rutschfest'}`;
    }

    // --- U-Profil, Schrauben-Set, Abdeckung (Keil accessories) ---
    if (n.includes('u-profil')) return 'U-Profil 55×29 mm (Ausgleichsprofil)';
    if (n.includes('schrauben')) return 'Montage-Schrauben-Set';
    if (n.includes('abdeckung')) return `Abdeckprofil ${n.match(/EL\d+/i)?.[0] || ''}`;
    if (n.includes('kipp-fenster') || n.includes('kippfenster')) return 'Dreh-Kipp-Fenster (für Keilfenster)';

    // --- FALLBACK: simple translate map ---
    const simpleMap: Record<string, string> = {
        'Surcharge Matt': 'Aufpreis Mattglas-Verglasung',
        'Surcharge Iso': 'Aufpreis Wärmedämm-Isolierverglasung',
        'Surcharge Stopsol': 'Aufpreis UV Reflex Sonnenschutzglas',
    };
    if (simpleMap[name]) return simpleMap[name];

    return name;
}

export async function generateOfferPDF(offer: Offer) {
    try {
        const doc = await createDocument(offer);
        const safeId = offer.offerNumber || (offer.id ? offer.id.substring(0, 8) : 'draft');
        doc.save(`Angebot_${safeId}.pdf`);
    } catch (e) {
        console.error("PDF Fail:", e);
        alert("PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
    }
}

export async function generateOfferPDFData(offer: Offer): Promise<string> {
    const doc = await createDocument(offer);
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1];
    return base64;
}

async function createDocument(offer: Offer): Promise<jsPDF> {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Register Roboto fonts for UTF-8 support (ä, ö, ü, ß, €)
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- SALES CONTEXT ---
    let repName = 'Ihr Expertenteam';
    let repPhone = '+49 157 5064 6936';
    let repEmail = 'buero@polendach24.de';

    if (offer.creator) {
        repName = `${offer.creator.firstName} ${offer.creator.lastName}`;
        repPhone = offer.creator.phone || repPhone;
        repEmail = offer.creator.email || repEmail;
    } else {
        const profile = getSalesProfile();
        if (profile) {
            repName = `${profile.firstName} ${profile.lastName}`;
            repPhone = profile.phone || repPhone;
            repEmail = profile.email || repEmail;
        } else {
            const user = getCurrentUser();
            if (user) {
                repName = `${user.firstName} ${user.lastName}`;
                repPhone = user.phone || repPhone;
                repEmail = user.email || repEmail;
            }
        }
    }

    const c = offer.customer || {} as any;
    const model = translateForPDF(offer.product?.modelId || '', 'models');

    // --- DATE HANDLING: Use offer creation date, not today! ---
    const offerDate = offer.createdAt
        ? new Date(offer.createdAt).toLocaleDateString('de-DE')
        : new Date().toLocaleDateString('de-DE');

    // Validity: 30 days from creation
    const createdDate = offer.createdAt ? new Date(offer.createdAt) : new Date();
    const validUntil = new Date(createdDate);
    validUntil.setDate(validUntil.getDate() + 30);
    const validUntilStr = validUntil.toLocaleDateString('de-DE');

    // --- RENDER HELPERS ---

    const drawHeader = () => {
        doc.setFillColor(...THEME.primary);
        doc.rect(0, 0, pageWidth, 35, 'F');

        if (LOGO_BASE64) {
            doc.addImage(LOGO_BASE64, 'PNG', MARGIN, 10, 42, 14);
        } else {
            doc.setFont(FONTS.bold, 'bold');
            doc.setFontSize(20);
            doc.setTextColor(...THEME.white);
            doc.text('POLENDACH24', MARGIN, 24);
        }

        doc.setFont(FONTS.normal, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(200, 200, 200);
        doc.text('Ihr Premium Partner für Terrassen.', pageWidth - MARGIN, 15, { align: 'right' });

        doc.setFont(FONTS.bold, 'bold');
        doc.setTextColor(...THEME.secondary);
        doc.text('www.polendach24.de', pageWidth - MARGIN, 24, { align: 'right' });

        // Gold Accent Line
        doc.setFillColor(...THEME.secondary);
        doc.rect(0, 35, pageWidth, 1.5, 'F');
    };

    const drawFooter = (pageNo: number, pageCount: number) => {
        const y = pageHeight - 22;
        doc.setDrawColor(...THEME.line);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, y, pageWidth - MARGIN, y);

        doc.setFontSize(7);
        doc.setTextColor(...THEME.textLight);
        doc.setFont(FONTS.normal, 'normal');

        const col1 = MARGIN;
        const col2 = MARGIN + 60;
        const col3 = MARGIN + 120;

        doc.text('PolenDach24 S.C.', col1, y + 5);
        doc.text('Kolonia Walowice 221/33, 66-620 Gubin', col1, y + 9);
        doc.text('NIP: PL9261695520', col1, y + 13);

        doc.text('Zentrale: +49 157 5064 6936', col2, y + 5);
        doc.text('Email: buero@polendach24.de', col2, y + 9);

        doc.text('Bank: Sparkasse Spree-Neisse', col3, y + 5);
        doc.text('IBAN: DE79 1805 0000 0190 1228 89', col3, y + 9);

        doc.text(`Seite ${pageNo} / ${pageCount}`, pageWidth - MARGIN, y + 13, { align: 'right' });
    };

    // Helper: ensure enough space or add new page
    const ensureSpace = (neededMm: number, currentY: number): number => {
        const usableBottom = pageHeight - 25; // footer reserve
        if (currentY + neededMm > usableBottom) {
            doc.addPage();
            drawHeader();
            return 50; // below header
        }
        return currentY;
    };

    // --- PAGE 1 START ---

    drawHeader();
    let y = 50;

    // 1. TOP SECTION: DATA & ADDRESS

    // Offer Badge (Right)
    doc.setFillColor(...THEME.surface);
    doc.roundedRect(pageWidth - MARGIN - 70, y, 70, 28, 1, 1, 'F');
    doc.setDrawColor(...THEME.line);
    doc.rect(pageWidth - MARGIN - 70, y, 70, 28, 'S');

    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.text('ANGEBOTS-NUMMER', pageWidth - MARGIN - 65, y + 6);
    doc.text('DATUM', pageWidth - MARGIN - 25, y + 6);

    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...THEME.primary);
    const offerNum = safeStr(offer.offerNumber || offer.id?.substring(0, 8) || 'ENTWURF');
    doc.text(offerNum, pageWidth - MARGIN - 65, y + 13);
    doc.text(offerDate, pageWidth - MARGIN - 25, y + 13);

    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.setFont(FONTS.normal, 'normal');
    doc.text(`GÜLTIG BIS: ${validUntilStr}`, pageWidth - MARGIN - 65, y + 22);

    // Customer Address (Left)
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.text('PolenDach24 S.C. - Kolonia Walowice 221/33 - 66-620 Gubin', MARGIN, y - 2);

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(...THEME.text);

    if (c.companyName) {
        doc.setFont(FONTS.bold, 'bold');
        doc.text((c.companyName), MARGIN, y);
        y += 5;
    }

    doc.setFont(FONTS.normal, 'normal');
    const name = `${safeStr(c.salutation)} ${safeStr(c.firstName)} ${safeStr(c.lastName)}`.trim();
    doc.text((name || 'Kunde'), MARGIN, y);
    y += 5;
    doc.text((`${safeStr(c.street)} ${safeStr(c.houseNumber)}`.trim()), MARGIN, y);
    y += 5;
    doc.text((`${safeStr(c.postalCode)} ${safeStr(c.city)}`.trim()), MARGIN, y);
    y += 5;
    doc.text((safeStr(c.country) || 'Deutschland'), MARGIN, y);

    // 2. HERO TITLE
    y = 90;

    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...THEME.primary);
    doc.text(model, MARGIN, y);

    doc.setFontSize(12);
    doc.setTextColor(...THEME.secondary);
    doc.text('Ihr exklusives Angebot', MARGIN + doc.getTextWidth(model) + 5, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont(FONTS.normal, 'normal');
    doc.setTextColor(...THEME.text);

    let greeting = 'Sehr geehrte Damen und Herren,';
    if (c.lastName) {
        greeting = c.salutation === 'Frau' ? `Sehr geehrte Frau ${(c.lastName)},` : `Sehr geehrter Herr ${(c.lastName)},`;
    }

    doc.text(greeting, MARGIN, y);
    y += 6;

    const introText = 'vielen Dank für Ihr Vertrauen. Wir freuen uns, Ihnen Ihre individuelle maßgefertigte Überdachung anbieten zu dürfen. ' +
        'Nachfolgend finden Sie alle Details zu Ihrer Wunschkonfiguration.';

    const lines = doc.splitTextToSize(introText, pageWidth - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += (lines.length * 5) + 12;

    // 3. PRODUCT HIGHLIGHTS — Calculate box height FIRST, then draw ONCE
    const p = offer.product as any;
    const dach = p?.dachrechnerData;
    const hasKeil = dach && (dach.keilhoeheK1 != null || dach.keilhoeheK2 != null);

    let boxHeight = 48; // Base height: header + 2 rows
    if (dach) {
        boxHeight = hasKeil ? 82 : 72; // 3rd row + optional keil row
    }

    // Ensure the box fits on current page
    y = ensureSpace(boxHeight + 15, y);

    // Draw the dark box ONCE with correct height
    doc.setFillColor(...THEME.primary);
    doc.roundedRect(MARGIN, y, pageWidth - (MARGIN * 2), boxHeight, 1, 1, 'F');

    // Box Title
    doc.setTextColor(...THEME.secondary);
    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(9);
    doc.text('IHRE KONFIGURATION', MARGIN + 8, y + 8);

    // Row 1: Specs columns
    doc.setTextColor(...THEME.white);
    doc.setFontSize(10);
    doc.setFont(FONTS.normal, 'normal');

    const specsY = y + 16;
    const colW = (pageWidth - MARGIN * 2) / 3;

    // Col 1 — Dimensions
    doc.text('Dimensionen:', MARGIN + 8, specsY);
    doc.setFont(FONTS.bold, 'bold');
    doc.text(`${offer.product?.width} x ${offer.product?.projection} mm`, MARGIN + 8, specsY + 5);

    // Col 2 — Color
    doc.setFont(FONTS.normal, 'normal');
    doc.text('Farbe / Ausfuehrung:', MARGIN + 8 + colW, specsY);
    doc.setFont(FONTS.bold, 'bold');
    const color = translateForPDF(offer.product?.color || '', 'colors');
    doc.text(color, MARGIN + 8 + colW, specsY + 5);

    // Col 3 — Roof covering
    doc.setFont(FONTS.normal, 'normal');
    doc.text('Dacheindeckung:', MARGIN + 8 + (colW * 2), specsY);
    doc.setFont(FONTS.bold, 'bold');
    const roof = translateForPDF(offer.product?.roofType || '', 'roofTypes');
    doc.text(roof, MARGIN + 8 + (colW * 2), specsY + 5);

    // Row 2: Structural specs
    const specsY2 = specsY + 14;
    const postCount = p?.numberOfPosts || Math.max(2, Math.ceil((p?.width || 3000) / 3500) + 1);
    const fieldCount = p?.numberOfFields || Math.max(2, Math.ceil((p?.width || 3000) / 900));
    const rafterCount = fieldCount + 1;
    const montage = translateForPDF(p?.installationType || 'wall', 'installation');

    doc.setFont(FONTS.normal, 'normal');
    doc.text('Montage:', MARGIN + 8, specsY2);
    doc.setFont(FONTS.bold, 'bold');
    doc.text(montage, MARGIN + 8, specsY2 + 5);

    doc.setFont(FONTS.normal, 'normal');
    doc.text('Pfosten / Sparren:', MARGIN + 8 + colW, specsY2);
    doc.setFont(FONTS.bold, 'bold');
    doc.text(`${postCount} Pfosten / ${rafterCount} Sparren`, MARGIN + 8 + colW, specsY2 + 5);

    if (p?.splitPoint && p?.width > 7000) {
        doc.setFont(FONTS.normal, 'normal');
        doc.text('Verbundkonstruktion:', MARGIN + 8 + (colW * 2), specsY2);
        doc.setFont(FONTS.bold, 'bold');
        doc.text(`Teilung bei ${p.splitPoint} mm`, MARGIN + 8 + (colW * 2), specsY2 + 5);
    }

    // Row 3: Dachrechner Technical Data (if present)
    if (dach) {
        const specsY3 = specsY2 + 14;
        doc.setDrawColor(60, 80, 110);
        doc.setLineWidth(0.2);
        doc.line(MARGIN + 8, specsY3 - 4, pageWidth - MARGIN - 8, specsY3 - 4);

        doc.setTextColor(...THEME.secondary);
        doc.setFont(FONTS.bold, 'bold');
        doc.setFontSize(7);
        doc.text('TECHNISCHE DATEN (DACHRECHNER)', MARGIN + 8, specsY3);

        doc.setTextColor(200, 200, 200);
        doc.setFont(FONTS.normal, 'normal');
        doc.setFontSize(8);
        const colW4 = (pageWidth - MARGIN * 2 - 16) / 4;
        const tx = MARGIN + 8;
        const ty3 = specsY3 + 6;

        if (dach.angleAlpha != null) doc.text(`Neigung: ${dach.angleAlpha.toFixed(1)}deg`, tx, ty3);
        if (dach.h3 != null) doc.text(`H3 Rinne: ${Math.round(dach.h3)} mm`, tx + colW4, ty3);
        if (dach.fensterF2 != null) doc.text(`Fensterbreite: ${Math.round(dach.fensterF2)} mm`, tx + colW4 * 2, ty3);
        if (dach.sparrenMitte != null) doc.text(`Sparren: ${Math.round(dach.sparrenMitte)} mm`, tx + colW4 * 3, ty3);

        const ty4 = ty3 + 5;
        if (dach.inclinationMmM != null) doc.text(`Gefaelle: ${dach.inclinationMmM.toFixed(0)} mm/m`, tx, ty4);
        if (dach.h1 != null) doc.text(`H1 Wand: ${Math.round(dach.h1)} mm`, tx + colW4, ty4);
        if (dach.depthD2 != null) doc.text(`D2 m. Rinne: ${Math.round(dach.depthD2)} mm`, tx + colW4 * 2, ty4);
        if (p?.postWidth) doc.text(`Pfostenbreite: ${p.postWidth} mm`, tx + colW4 * 3, ty4);

        if (hasKeil) {
            const ty5 = ty4 + 5;
            doc.setTextColor(...THEME.secondary);
            doc.text(`K1 Rinnenseite: ${dach.keilhoeheK1 != null ? Math.round(dach.keilhoeheK1) + ' mm' : '-'}`, tx, ty5);
            doc.text(`K2 Hausseite: ${dach.keilhoeheK2 != null ? Math.round(dach.keilhoeheK2) + ' mm' : '-'}`, tx + colW4, ty5);
            if (dach.fensterF1 != null) {
                doc.text(`F1/F3: ${Math.round(dach.fensterF1)}/${dach.fensterF3 != null ? Math.round(dach.fensterF3) : '-'} mm`, tx + colW4 * 2, ty5);
            }
        }
    }

    y += boxHeight + 10;

    // 4. PRICING TABLE
    const bodyRows: any[] = [];
    let pos = 1;

    // Main Product — include roof cover type from config
    const roofConfig = (offer.product as any).items?.find((i: any) => i.category === 'roof')?.config || '';
    const coverLabel = getRoofCoverLabel(roofConfig || (offer.product as any).cover || '');
    const mainDesc = coverLabel
        ? `${model} Aluminiumkonstruktion\ninkl. ${coverLabel} · Pulverbeschichtung · Integrierte Entwässerung`
        : `${model} Aluminiumkonstruktion\nPremium Pulverbeschichtung, Verstärkte Profile, Integrierte Entwässerung.`;
    bodyRows.push([
        { content: String(pos++), styles: { halign: 'center' } },
        {
            content: mainDesc,
            styles: { fontStyle: 'bold' }
        },
        formatCurrency(offer.pricing?.basePrice || 0)
    ]);

    // Items (basket items from configurator)
    const items = (offer.product as any).items || [];
    if (items.length > 0) {
        items.forEach((item: any) => {
            if (item.name?.toLowerCase().includes(offer.product?.modelId)) return;
            bodyRows.push([
                { content: String(pos++), styles: { halign: 'center' } },
                (professionalItemDescription(item.name, item.config)),
                formatCurrency(item.price)
            ]);
        });
    } else if (offer.product?.addons) {
        offer.product.addons.forEach((a: any) => {
            bodyRows.push([
                { content: String(pos++), styles: { halign: 'center' } },
                (professionalItemDescription(a.name, a.variant)),
                formatCurrency(a.price)
            ]);
        });
    }

    // Custom Items (manually added positions)
    const customItems = (offer as any).customItems || (offer.product as any)?.customItems || [];
    if (customItems.length > 0) {
        customItems.forEach((ci: any) => {
            bodyRows.push([
                { content: String(pos++), styles: { halign: 'center' } },
                (ci.name || ci.description || 'Zusätzliche Position'),
                formatCurrency(ci.price || 0)
            ]);
        });
    }

    // Installation
    if (offer.pricing?.installationCosts) {
        const inst = offer.pricing.installationCosts;
        const instDesc = ['Fachgerechte Montage & Lieferung', 'Durch zertifiziertes Montageteam inkl. Kleinmaterial.'];

        // Add breakdown details if available
        if (inst.installationDays) {
            instDesc.push(`Montagezeit: ${inst.installationDays} Tag(e)`);
        }
        if (inst.travelCosts && inst.travelCosts > 0) {
            instDesc.push(`Inkl. Anfahrtskosten`);
        }

        bodyRows.push([
            { content: String(pos++), styles: { halign: 'center' } },
            (instDesc.join('\n')),
            formatCurrency(inst.totalInstallation)
        ]);
    }

    autoTable(doc, {
        startY: y,
        head: [['Pos.', 'Beschreibung', 'Betrag']],
        body: bodyRows,
        theme: 'grid',
        styles: {
            font: 'Roboto',
            fontSize: 9,
            cellPadding: 6,
            lineWidth: 0.1,
            lineColor: THEME.line,
            textColor: THEME.text,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: THEME.surface,
            textColor: THEME.primary,
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: THEME.line
        },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: THEME.white
        },
        // Multi-page handling
        margin: { left: MARGIN, right: MARGIN, top: 50, bottom: 25 },
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
        didDrawPage: function (_data) {
            drawHeader();
        }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // 5. BOTTOM BLOCK: CONTACT CARD (Left) vs TOTALS (Right)
    // Need ~90mm for the bottom block (card + totals + trust badges + signatures)
    const bottomBlockHeight = 90;
    y = ensureSpace(bottomBlockHeight, y);

    const midPoint = pageWidth / 2;

    // --- LEFT: SALES REP CARD ---
    const cardY = y;

    doc.setDrawColor(...THEME.line);
    doc.setLineWidth(0.1);
    doc.rect(MARGIN, cardY, 80, 45);

    doc.setFillColor(...THEME.primary);
    doc.rect(MARGIN, cardY, 80, 8, 'F');
    doc.setTextColor(...THEME.white);
    doc.setFontSize(8);
    doc.setFont(FONTS.bold, 'bold');
    doc.text('IHR PERSÖNLICHER ANSPRECHPARTNER', MARGIN + 4, cardY + 5);

    doc.setFillColor(...THEME.surface);
    doc.circle(MARGIN + 12, cardY + 22, 6, 'F');
    doc.setTextColor(...THEME.secondary);
    const initials = repName.split(' ').map(n => n[0]).join('').substring(0, 2);
    doc.setFontSize(9);
    doc.text(initials, MARGIN + 12, cardY + 23, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...THEME.primary);
    doc.text((repName), MARGIN + 22, cardY + 18);

    doc.setFontSize(8);
    doc.setTextColor(...THEME.textLight);
    doc.setFont(FONTS.normal, 'normal');
    doc.text('Experte für Überdachungen', MARGIN + 22, cardY + 22);

    doc.setTextColor(...THEME.text);
    doc.text((repPhone), MARGIN + 22, cardY + 30);
    doc.text((repEmail), MARGIN + 22, cardY + 34);

    doc.setTextColor(...THEME.secondary);
    doc.setFontSize(7);
    doc.text('Fragen Sie mich nach Aktionen!', MARGIN + 4, cardY + 41);

    // --- RIGHT: TOTALS BLOCK ---
    const totalBoxWidth = 85;
    const totalBoxX = pageWidth - MARGIN - totalBoxWidth;
    let ty = y;

    doc.setFontSize(10);
    const net = offer.pricing?.sellingPriceNet || 0;
    const discount = offer.pricing?.discountValue || 0;
    const preDiscount = net + discount;
    const vat = net * 0.19;
    // Use gross from DB if available, otherwise calculate
    const gross = offer.pricing?.sellingPriceGross || (net + vat);

    if (discount > 0) {
        // Strikethrough effect — Listenpreis with dimmed color
        doc.setTextColor(180, 180, 180);
        doc.text('Listenpreis (Netto):', totalBoxX, ty + 5);
        doc.text(formatCurrency(preDiscount), pageWidth - MARGIN, ty + 5, { align: 'right' });
        // Draw strikethrough line
        const priceTextWidth = doc.getTextWidth(formatCurrency(preDiscount));
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(pageWidth - MARGIN - priceTextWidth, ty + 4, pageWidth - MARGIN, ty + 4);
        ty += 6;

        // Sonderrabatt label — green color for positive association
        const discountLabel = offer.pricing?.discountPercentage
            ? `Sonderrabatt (−${offer.pricing.discountPercentage}%):`
            : 'Sonderrabatt:';
        doc.setTextColor(22, 163, 74); // green-600
        doc.setFont(FONTS.bold, 'bold');
        doc.text(discountLabel, totalBoxX, ty + 5);
        doc.text(`− ${formatCurrency(discount)}`, pageWidth - MARGIN, ty + 5, { align: 'right' });
        doc.setFont(FONTS.normal, 'normal');
        ty += 8;

        doc.setDrawColor(...THEME.line);
        doc.setLineWidth(0.1);
        doc.line(totalBoxX, ty, pageWidth - MARGIN, ty);
        ty += 2;
    }

    doc.setTextColor(...THEME.text);
    doc.setFont(FONTS.bold, 'bold');
    doc.text('Endpreis Netto:', totalBoxX, ty + 5);
    doc.text(formatCurrency(net), pageWidth - MARGIN, ty + 5, { align: 'right' });
    ty += 6;

    doc.setFont(FONTS.normal, 'normal');
    doc.setTextColor(...THEME.textLight);
    doc.text('zzgl. 19% MwSt.:', totalBoxX, ty + 5);
    doc.text(formatCurrency(vat), pageWidth - MARGIN, ty + 5, { align: 'right' });
    ty += 10;

    // Grand Total Box
    doc.setFillColor(...THEME.primary);
    doc.roundedRect(totalBoxX, ty, totalBoxWidth, 14, 1, 1, 'F');

    doc.setTextColor(...THEME.white);
    doc.setFont(FONTS.bold, 'bold');
    doc.setFontSize(12);
    doc.text('GESAMT BETRAG:', totalBoxX + 5, ty + 9);
    doc.text(formatCurrency(gross), pageWidth - MARGIN - 5, ty + 9, { align: 'right' });

    // 6. CLOSING & SIGNATURES
    y = Math.max(ty + 25, cardY + 55);

    // Ensure trust badges + signatures fit
    y = ensureSpace(35, y);

    // Trust badges (Text based)
    doc.setFontSize(8);
    doc.setTextColor(...THEME.textLight);
    const badges = "Premium Qualität Made in Germany  |  5 Jahre Garantie  |  Alles aus einer Hand";
    doc.text(badges, pageWidth / 2, y, { align: 'center' });

    y += 8;

    // Validity notice
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.text(`Dieses Angebot ist gültig bis ${validUntilStr}. Preise in EUR, netto zzgl. 19% MwSt.`, pageWidth / 2, y, { align: 'center' });

    y += 12;

    // Sign lines
    doc.setDrawColor(...THEME.textLight);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y + 10, MARGIN + 60, y + 10);
    doc.line(pageWidth - MARGIN - 60, y + 10, pageWidth - MARGIN, y + 10);

    doc.setFontSize(7);
    doc.setTextColor(...THEME.textLight);
    doc.text((repName), MARGIN, y + 14);
    doc.text('Ort, Datum, Unterschrift Kunde', pageWidth - MARGIN - 60, y + 14);

    // Footer Loop — apply to ALL pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawFooter(i, pageCount);
    }

    return doc;
}
