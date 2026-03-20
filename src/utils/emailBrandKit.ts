/**
 * PolenDach24 Email Brand Kit
 * Unified brand wrapper for all outgoing emails.
 * 
 * Usage: wrapInBrandTemplate('<p>Your email body here</p>', { preheader: '...' })
 */

export interface BrandTemplateOptions {
    preheader?: string;
    showProducts?: boolean;
    showReviews?: boolean;
    showUSPs?: boolean;
}

// ── Brand Tokens ───────────────────────────────────────────
const BRAND = {
    // Colors
    accentBlue: '#3b82f6',
    accentBlueDark: '#1e40af',
    headerBg: '#1a1a1a',
    footerBg: '#1a202c',
    bodyBg: '#f3f4f6',
    textDark: '#111827',
    textMid: '#4b5563',
    textLight: '#6b7280',
    white: '#ffffff',
    // Brand
    logo: 'https://polendach24.de/wp-content/uploads/2025/06/logo-1024x197.png',
    slogan: 'Design und Komfort<br><span style="color: #3b82f6; font-weight: bold;">für Ihr Zuhause.</span>',
    website: 'https://polendach24.de',
    phone: '03561 501 9981',
    email: 'buero@polendach24.de',
    companyName: 'Polendach24 s.c.',
    owners: 'Tomasz Fijołek, Mariusz Duź',
    address: 'Kolonia Wałowice 223/33<br>66-620 Gubin, Polen',
    // Product images
    products: [
        { name: 'Trendstyle', img: 'https://polendach24.de/wp-content/uploads/2025/06/trendstyle-1024x682.webp' },
        { name: 'Ultrastyle', img: 'https://polendach24.de/wp-content/uploads/2025/06/ultrastyle-1-1024x683.webp' },
        { name: 'Designstyle', img: 'https://polendach24.de/wp-content/uploads/2025/06/designstyle-1024x682.webp' },
        { name: 'Topstyle', img: 'https://polendach24.de/wp-content/uploads/2025/06/topstyle-1024x751.webp' },
        { name: 'Pergola', img: 'https://polendach24.de/wp-content/uploads/2025/06/pergola-1024x682.webp' },
        { name: 'Pergola Deluxe', img: 'https://polendach24.de/wp-content/uploads/2025/06/pergola-deluxe-1024x768.webp' },
    ],
    usps: [
        { icon: '✔', label: 'Top-Qualität', desc: 'zu fairen Preisen' },
        { icon: '✔', label: 'Professionelle Montagen', desc: 'durch erfahrene Teams' },
        { icon: '✔', label: 'Persönliche Beratung', desc: 'vor Ort' },
        { icon: '✔', label: 'Über 1.000', desc: 'zufriedene Kunden' },
        { icon: '✔', label: '5 Jahre Garantie', desc: 'auf Konstruktion' },
    ],
    reviews: [
        { name: 'Thomas M. – Berlin', text: '"Sehr schnelle und professionelle Abwicklung. Das Dach sieht fantastisch aus und die Qualität ist top. Klare Weiterempfehlung!"' },
        { name: 'Sandra K. – Cottbus', text: '"Von der Beratung bis zur Montage alles perfekt. Unser neues Terrassendach hat die Qualität unseres Gartens komplett verändert."' },
    ],
};

// ── CSS Reset ──────────────────────────────────────────────
const CSS_RESET = `
body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
table { border-collapse: collapse !important; }
body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${BRAND.bodyBg}; }
.wrapper { width: 100%; table-layout: fixed; background-color: ${BRAND.bodyBg}; padding-bottom: 40px; }
.main-content { background-color: ${BRAND.white}; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; }
.cta-button { background-color: ${BRAND.accentBlue}; border: 1px solid ${BRAND.accentBlue}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; text-decoration: none; padding: 14px 36px; color: ${BRAND.white}; display: inline-block; border-radius: 50px; font-weight: bold; text-transform: uppercase; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); letter-spacing: 0.5px; }
@media screen and (max-width: 600px) {
    .two-column { width: 100% !important; max-width: 100% !important; display: block; }
    .mobile-center { text-align: center !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .img-max { width: 100% !important; height: auto !important; }
    .header-text { padding-top: 15px !important; text-align: center !important; }
}`;

// ── Section Builders ───────────────────────────────────────

function buildHeader() {
    return `
        <tr>
            <td style="background-color: ${BRAND.headerBg}; padding: 25px 0;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td class="two-column mobile-center" width="60%" style="padding: 0 30px; vertical-align: middle;">
                            <img src="${BRAND.logo}" alt="PolenDach24" width="220" style="display: block; border: 0; max-width: 220px; height: auto;">
                        </td>
                        <td class="two-column header-text" width="40%" style="padding: 0 30px; vertical-align: middle; text-align: right; font-size: 13px; line-height: 1.4; color: #d1d5db;">
                            ${BRAND.slogan}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`;
}

function buildProductGrid() {
    const rows: string[] = [];
    for (let i = 0; i < BRAND.products.length; i += 2) {
        const p1 = BRAND.products[i];
        const p2 = BRAND.products[i + 1];
        rows.push(`
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td class="two-column" width="50%" style="padding: 0 8px 15px 8px; vertical-align: top;">
                        <img src="${p1.img}" alt="${p1.name}" width="268" class="img-max" style="width: 100%; max-width: 268px; height: 180px; object-fit: cover; border-radius: 8px; display: block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <p style="text-align: center; font-size: 13px; font-weight: bold; color: #374151; margin: 8px 0 0;">${p1.name}</p>
                    </td>
                    ${p2 ? `<td class="two-column" width="50%" style="padding: 0 8px 15px 8px; vertical-align: top;">
                        <img src="${p2.img}" alt="${p2.name}" width="268" class="img-max" style="width: 100%; max-width: 268px; height: 180px; object-fit: cover; border-radius: 8px; display: block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <p style="text-align: center; font-size: 13px; font-weight: bold; color: #374151; margin: 8px 0 0;">${p2.name}</p>
                    </td>` : '<td width="50%"></td>'}
                </tr>
            </table>`);
    }
    return `
        <tr>
            <td style="padding: 30px 20px; background-color: #fafafa; border-top: 1px solid #f3f4f6;">
                <h3 style="text-align: center; margin: 0 0 25px; color: ${BRAND.textDark}; font-size: 22px;">Unsere Produktpalette</h3>
                ${rows.join('')}
                <div style="text-align: center; margin-top: 10px;">
                    <a href="${BRAND.website}" style="color: ${BRAND.accentBlue}; font-size: 14px; text-decoration: none; font-weight: bold;">Alle Produkte ansehen →</a>
                </div>
            </td>
        </tr>`;
}

function buildReviews() {
    const reviewHtml = BRAND.reviews.map(r => `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px;">
            <tr>
                <td style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                    <div style="font-size: 14px; font-weight: bold; color: ${BRAND.textDark};">${r.name}</div>
                    <div style="color: #fbbf24; font-size: 14px; margin: 3px 0;">★★★★★</div>
                    <div style="font-style: italic; color: ${BRAND.textMid}; margin-top: 8px; font-size: 14px; line-height: 1.5;">${r.text}</div>
                </td>
            </tr>
        </table>`).join('');
    return `
        <tr>
            <td style="padding: 40px 20px; background-color: #ffffff;">
                <h3 style="text-align: center; margin: 0 0 25px; color: ${BRAND.textDark}; font-size: 22px;">Das sagen unsere Kunden</h3>
                ${reviewHtml}
            </td>
        </tr>`;
}

function buildUSPs() {
    const items = BRAND.usps.map((u, i) => `
        <tr>
            <td style="padding: ${i === 0 ? '0' : '15px 0 0 0'}; padding-bottom: ${i < BRAND.usps.length - 1 ? '15px' : '0'}; font-size: 16px; ${i < BRAND.usps.length - 1 ? 'border-bottom: 1px solid #333;' : ''}">
                <span style="color: ${BRAND.accentBlue}; margin-right: 10px;">${u.icon}</span> <strong>${u.label}</strong> ${u.desc}
            </td>
        </tr>`).join('');
    return `
        <tr>
            <td style="background-color: ${BRAND.headerBg}; color: #ffffff; padding: 50px 30px; text-align: center;">
                <h2 style="margin: 0 0 20px; font-size: 24px;">Warum PolenDach24?</h2>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; max-width: 480px; margin-left: auto; margin-right: auto;">
                    ${items}
                </table>
                <div style="margin-top: 40px;">
                    <p style="margin: 0 0 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; font-weight: 700;">IHRE ANSPRECHPARTNER</p>
                    <p style="margin: 0 0 15px; font-size: 13px; color: #cbd5e1;">Rufen Sie uns direkt an – persönlich & unverbindlich:</p>
                    <!-- Row 1: Mike + Oliwia -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; margin: 0 auto 6px;">
                        <tr>
                            <td width="50%" align="center" style="padding: 3px;">
                                <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #60a5fa); margin: 0 auto 6px; line-height: 36px; font-size: 13px; font-weight: 800; color: #fff;">ML</div>
                                    <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Mike Ledwin</div>
                                    <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb & Beratung</div>
                                    <a href="tel:+4915257487430" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0152 5748 7430</a>
                                </div>
                            </td>
                            <td width="50%" align="center" style="padding: 3px;">
                                <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #60a5fa); margin: 0 auto 6px; line-height: 36px; font-size: 13px; font-weight: 800; color: #fff;">OD</div>
                                    <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Oliwia Duz</div>
                                    <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb & Beratung</div>
                                    <a href="tel:+491626692445" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0162 669 2445</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <!-- Row 2: Hubert + Artur -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; margin: 0 auto 12px;">
                        <tr>
                            <td width="50%" align="center" style="padding: 3px;">
                                <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #60a5fa); margin: 0 auto 6px; line-height: 36px; font-size: 13px; font-weight: 800; color: #fff;">HK</div>
                                    <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Hubert Kosciow</div>
                                    <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb & Beratung</div>
                                    <a href="tel:+48669558015" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 +48 669 558 015</a>
                                </div>
                            </td>
                            <td width="50%" align="center" style="padding: 3px;">
                                <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #60a5fa); margin: 0 auto 6px; line-height: 36px; font-size: 13px; font-weight: 800; color: #fff;">AN</div>
                                    <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Artur Nagorny</div>
                                    <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb & Beratung</div>
                                    <a href="tel:+4915258715652" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0152 5871 5652</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <p style="margin: 0; font-size: 11px; color: #64748b;">Oder: <a href="mailto:buero@polendach24.de" style="color: ${BRAND.accentBlue}; text-decoration: none; font-weight: 700;">buero@polendach24.de</a> | <a href="${BRAND.website}" style="color: ${BRAND.accentBlue}; text-decoration: none;">polendach24.de</a></p>
                </div>
            </td>
        </tr>`;
}

function buildFooter() {
    const year = new Date().getFullYear();
    return `
        <tr>
            <td style="padding: 40px 30px; text-align: center; font-size: 12px; color: ${BRAND.textLight}; background-color: ${BRAND.bodyBg}; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 15px; font-weight: bold; color: #374151; font-size: 14px;">
                    ${BRAND.companyName}
                </p>
                <p style="margin: 0 0 15px; line-height: 1.6;">
                    Inhaber: ${BRAND.owners}<br>
                    ${BRAND.address}
                </p>
                <p style="margin: 0 0 10px;">
                    Tel: <a href="tel:+4935615019981" style="color: ${BRAND.accentBlue}; text-decoration: none;">${BRAND.phone}</a> | 
                    E-Mail: <a href="mailto:${BRAND.email}" style="color: ${BRAND.accentBlue}; text-decoration: none;">${BRAND.email}</a>
                </p>
                <p style="margin: 0;">
                    Web: <a href="${BRAND.website}" style="color: ${BRAND.accentBlue}; text-decoration: none;">polendach24.de</a>
                </p>
                <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
                    &copy; ${year} PolenDach24. Alle Rechte vorbehalten.
                </p>
            </td>
        </tr>`;
}

// ── Main Wrapper Function ──────────────────────────────────

export function wrapInBrandTemplate(
    bodyContent: string,
    options: BrandTemplateOptions = {}
): string {
    const { preheader = '', showProducts = false, showReviews = false, showUSPs = false } = options;

    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PolenDach24</title>
    <style>${CSS_RESET}</style>
</head>
<body>
    ${preheader ? `<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">${preheader}</div>` : ''}
    <center class="wrapper">
        <table class="main-content" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            ${buildHeader()}
            <!-- BODY CONTENT -->
            <tr>
                <td style="padding: 40px 30px;">
                    ${bodyContent}
                </td>
            </tr>
            ${showProducts ? buildProductGrid() : ''}
            ${showReviews ? buildReviews() : ''}
            ${showUSPs ? buildUSPs() : ''}
            ${buildFooter()}
        </table>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
            <tr>
                <td style="text-align: center; padding: 15px 30px 25px;">
                    <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
                        Sie erhalten diese E-Mail, weil Sie Kontakt mit Polendach24 hatten.<br>
                        <a href="#UNSUBSCRIBE_URL#" style="color: #64748b; text-decoration: underline;">Sie möchten keine E-Mails mehr erhalten? Hier abmelden</a>
                    </p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`;
}

/**
 * Wraps plain text (with line breaks) into styled HTML paragraphs for use inside wrapInBrandTemplate.
 */
export function textToEmailHtml(text: string): string {
    return text
        .split('\n\n')
        .map(p => `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4b5563;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

/**
 * All built-in system templates for display/preview in admin.
 */
export interface SystemTemplate {
    id: string;
    name: string;
    description: string;
    category: 'offer' | 'sales' | 'fair' | 'service' | 'installation';
    previewHtml: () => string;
}

export function getSystemTemplates(): SystemTemplate[] {
    return [
        {
            id: 'system_offer',
            name: 'Wysyłka Oferty (PDF + Link)',
            description: 'Automatyczny szablon wysyłany z ofertą PDF. Zawiera zdjęcia produktów, opinie klientów i sekcję USP.',
            category: 'offer',
            previewHtml: () => {
                // Use the brand wrapper with sample content
                const sampleBody = `
                    <h1 style="margin: 0 0 20px; font-size: 26px; color: #111827; letter-spacing: -0.5px; text-align: center;">
                        Ihr persönliches Angebot ist fertig
                    </h1>
                    <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                        Sehr geehrte/r Kunde,<br><br>
                        vielen Dank für Ihr Interesse an unseren Produkten. Basierend auf Ihren Wünschen haben wir eine individuelle Kalkulation <strong>(Nr. 2025-001)</strong> für Ihre neue Terrassenüberdachung erstellt.<br><br>
                        Wir setzen auf höchste Qualität, modernes Design und Langlebigkeit – damit Sie viele Jahre Freude an Ihrem Garten haben.
                    </p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px;">
                        <tr>
                            <td align="center" style="padding: 35px;">
                                <p style="margin: 0 0 20px; font-weight: bold; color: #1e40af; font-size: 18px;">Exklusiv für Sie vorbereitet:</p>
                                <a href="#" class="cta-button">Angebot 2025-001 ansehen</a>
                                <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">Das detaillierte Angebot finden Sie im Anhang dieser E-Mail.</p>
                            </td>
                        </tr>
                    </table>`;
                return wrapInBrandTemplate(sampleBody, { showProducts: true, showReviews: true, showUSPs: true });
            }
        },
        {
            id: 'system_fair_catalog',
            name: 'Messe Follow-up (Katalog)',
            description: 'Premium follow-up po targach. Zawiera hero image, link do katalogu online, sekcję USP i prezentację zespołu doradców.',
            category: 'fair',
            previewHtml: () => {
                const sampleBody = `
                    <div style="text-align: center;">
                        <h2 style="margin: 0 0 15px; font-size: 13px; color: #3b82f6; letter-spacing: 4px; text-transform: uppercase; font-weight: 800;">Messe-Follow-up</h2>
                        <h1 style="margin: 0 0 35px; font-size: 32px; line-height: 40px; color: #111827; font-weight: 300; letter-spacing: -1px;">
                            Visionen werden <br><span style="font-weight: 700;">gemeinsam real.</span>
                        </h1>
                        <p style="margin: 0 0 25px; font-size: 17px; line-height: 30px; color: #4b5563;">
                            Sehr geehrte Damen und Herren,
                        </p>
                        <p style="margin: 0 0 25px; font-size: 17px; line-height: 30px; color: #4b5563;">
                            vielen Dank für das inspirierende Gespräch an unserem Messestand! Es hat uns große Freude bereitet, Ihre Ideen für ein neues Terrassendach oder einen modernen Carport kennenzulernen.
                        </p>
                        <p style="margin: 0 0 40px; font-size: 17px; line-height: 30px; color: #4b5563;">
                            Wie versprochen, senden wir Ihnen hiermit unseren aktuellen Katalog – eine Welt voller Inspirationen für Ihr exklusives Outdoor-Living:
                        </p>
                        <table border="0" cellspacing="0" cellpadding="0" align="center" width="100%">
                            <tr><td align="center">
                                <a href="#" class="cta-button">Katalog öffnen</a>
                            </td></tr>
                        </table>

                        <!-- Divider + next steps -->
                        <div style="margin-top: 50px; padding-top: 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 30px; font-size: 17px; line-height: 30px; color: #4b5563;">
                                Wir brennen darauf, Ihr Projekt nun auf die nächste Stufe zu heben. Ein gemeinsames Treffen bei Ihnen vor Ort ist der ideale Weg, um ein <strong>präzises Aufmaß</strong> zu nehmen.
                            </p>
                            <p style="margin: 0 0 40px; font-size: 19px; line-height: 32px; color: #111827; font-weight: bold; font-style: italic;">
                                Lassen Sie uns gemeinsam Ihren neuen Lieblingsplatz gestalten. Qualität fängt bei der Planung an.
                            </p>
                        </div>
                    </div>

                    <!-- USP Dark Box -->
                    <div style="background-color: #1a1a1a; color: #ffffff; border-radius: 8px; padding: 40px; margin: 30px 0;">
                        <h3 style="margin: 0 0 25px; font-size: 14px; color: #3b82f6; text-transform: uppercase; letter-spacing: 3px; font-weight: 800; text-align: center;">Polendach24 Excellence</h3>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr><td style="padding-bottom: 20px; font-size: 15px; line-height: 24px;">
                                <span style="color: #3b82f6; font-weight: bold; margin-right: 12px; font-size: 18px;">◈</span> <strong>Überdachungen:</strong> Wetterfest und zeitlos schön – Ihr erweitertes Wohnzimmer.
                            </td></tr>
                            <tr><td style="padding-bottom: 20px; font-size: 15px; line-height: 24px;">
                                <span style="color: #3b82f6; font-weight: bold; margin-right: 12px; font-size: 18px;">◈</span> <strong>Carports:</strong> Hochwertiges Aluminium-Design für optimalen Fahrzeugschutz.
                            </td></tr>
                            <tr><td style="font-size: 15px; line-height: 24px;">
                                <span style="color: #3b82f6; font-weight: bold; margin-right: 12px; font-size: 18px;">◈</span> <strong>Full Service:</strong> Von der ersten Beratung bis zur fachgerechten Montage.
                            </td></tr>
                        </table>
                    </div>

                    <!-- Team Section -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 35px; margin-top: 20px;">
                        <h3 style="text-align: center; margin: 0 0 30px; font-size: 20px; color: #111827; font-weight: 700;">Ihre Experten für Outdoor-Lösungen</h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td width="33%" align="center" style="padding: 0 10px; vertical-align: top;">
                                    <div style="width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; margin: 0 auto 12px; line-height: 70px; font-size: 20px; font-weight: bold; color: #64748b;">OD</div>
                                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #111827;">Oliwia Duź</p>
                                    <p style="margin: 4px 0 10px; font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Projektberatung</p>
                                    <p style="margin: 0; font-size: 12px; color: #64748b;">o.duz@polendach24.de</p>
                                </td>
                                <td width="33%" align="center" style="padding: 0 10px; vertical-align: top; border-left: 1px solid #f0f2f5; border-right: 1px solid #f0f2f5;">
                                    <div style="width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; margin: 0 auto 12px; line-height: 70px; font-size: 20px; font-weight: bold; color: #64748b;">ML</div>
                                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #111827;">Mike Ledwin</p>
                                    <p style="margin: 4px 0 10px; font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Projektberatung</p>
                                    <p style="margin: 0; font-size: 12px; color: #64748b;">m.ledwin@polendach24.de</p>
                                </td>
                                <td width="33%" align="center" style="padding: 0 10px; vertical-align: top;">
                                    <div style="width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; margin: 0 auto 12px; line-height: 70px; font-size: 20px; font-weight: bold; color: #64748b;">HK</div>
                                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #111827;">Hubert Kościów</p>
                                    <p style="margin: 4px 0 10px; font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Projektberatung</p>
                                    <p style="margin: 0; font-size: 12px; color: #64748b;">h.kosciow@polendach24.de</p>
                                </td>
                            </tr>
                        </table>
                    </div>`;
                return wrapInBrandTemplate(sampleBody, { showUSPs: true });
            }
        },
        {
            id: 'system_welcome',
            name: 'Erstkontakt – Willkommen',
            description: 'Erster Kontakt nach Anfrage. Professionell, einladend und verkaufsorientiert – sorgt für sofortiges Vertrauen.',
            category: 'sales',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #eff6ff; border-radius: 50%; line-height: 60px; font-size: 28px;">🏠</div>
                    </div>
                    <h1 style="margin: 0 0 25px; font-size: 26px; color: #111827; text-align: center; letter-spacing: -0.5px;">Willkommen bei Polendach24!</h1>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Sehr geehrte Damen und Herren,</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">herzlichen Dank für Ihr Interesse an unseren <strong>Premium-Terrassenüberdachungen</strong>! Wir freuen uns sehr, dass Sie sich für Qualität aus Aluminium entschieden haben.</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Um Ihnen ein <strong>maßgeschneidertes Angebot</strong> erstellen zu können, das genau zu Ihrem Zuhause passt, benötigen wir einige Details – wie Maße, Dachtyp und Ihre persönlichen Wünsche.</p>
                    <div style="background: linear-gradient(135deg, #eff6ff, #eef2ff); border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e40af;">📞 Persönliche Beratung gewünscht?</p>
                        <p style="margin: 0; font-size: 15px; color: #475569;">Rufen Sie uns direkt an – unser Beratungsteam ist gerne für Sie da!</p>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Über <strong>1.000 zufriedene Kunden</strong> vertrauen bereits auf unsere Qualität. Wir freuen uns darauf, auch Ihr Projekt zu verwirklichen!</p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Mit besten Grüßen,<br><strong>Ihr Polendach24 Beratungsteam</strong></p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_send_offer',
            name: 'Exklusives Angebot',
            description: 'Angebots-E-Mail mit starkem Sales-Pitch. Betont Premium-Qualität, 5-Jahres-Garantie und zeitlich begrenzten Rabatt.',
            category: 'sales',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; line-height: 60px; font-size: 28px;">⭐</div>
                    </div>
                    <h1 style="margin: 0 0 25px; font-size: 26px; color: #111827; text-align: center; letter-spacing: -0.5px;">Ihr exklusives Angebot ist fertig!</h1>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Sehr geehrte Damen und Herren,</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">im Anhang erhalten Sie Ihr <strong>individuell kalkuliertes Angebot</strong> für Ihre neue Terrassenüberdachung – exklusiv für Sie zusammengestellt.</p>
                    <div style="background-color: #1a1a1a; color: #ffffff; border-radius: 12px; padding: 30px; margin: 24px 0;">
                        <h3 style="margin: 0 0 15px; font-size: 15px; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; text-align: center;">Warum Polendach24?</h3>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr><td style="padding: 8px 0; font-size: 15px;">✔ <strong>Premium-Aluminium</strong> – korrosionsbeständig, wartungsfrei, langlebig</td></tr>
                            <tr><td style="padding: 8px 0; font-size: 15px;">✔ <strong>5 Jahre Garantie</strong> auf Konstruktion und Verarbeitung</td></tr>
                            <tr><td style="padding: 8px 0; font-size: 15px;">✔ <strong>Komplettservice</strong> – Beratung, Lieferung & fachgerechte Montage</td></tr>
                            <tr><td style="padding: 8px 0; font-size: 15px;">✔ <strong>Made in EU</strong> – höchste Qualitätsstandards</td></tr>
                        </table>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Dieses Angebot ist eine <strong>Investition in Ihre Lebensqualität</strong> – jahrzehntelanger Schutz und Komfort für Ihren Außenbereich.</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;"><strong>💡 Tipp:</strong> Sichern Sie sich jetzt Ihren Wunschtermin für die Montage – unsere Teams sind in der Saison schnell ausgebucht!</p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Wir freuen uns auf Ihre Rückmeldung.<br><strong>Ihr Polendach24 Team</strong></p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_followup',
            name: 'Follow-up – Erinnerung',
            description: 'Nachfass-E-Mail nach Angebotsversand. Erzeugt Dringlichkeit und bietet persönliche Beratung an.',
            category: 'sales',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; line-height: 60px; font-size: 28px;">💬</div>
                    </div>
                    <h1 style="margin: 0 0 25px; font-size: 24px; color: #111827; text-align: center;">Haben Sie noch Fragen zu Ihrem Angebot?</h1>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Sehr geehrte Damen und Herren,</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">vor Kurzem haben wir Ihnen ein <strong>individuelles Angebot</strong> für Ihre Terrassenüberdachung zugesendet. Wir möchten sicherstellen, dass alle Ihre Fragen beantwortet sind.</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Vielleicht möchten Sie noch wissen:</p>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 24px; border-left: 3px solid #3b82f6;">
                        <p style="margin: 0 0 8px; font-size: 15px; color: #334155;">→ Wie schnell kann die Montage erfolgen?</p>
                        <p style="margin: 0 0 8px; font-size: 15px; color: #334155;">→ Welche Ausstattungsoptionen gibt es?</p>
                        <p style="margin: 0 0 8px; font-size: 15px; color: #334155;">→ Gibt es eine Ratenzahlung?</p>
                        <p style="margin: 0; font-size: 15px; color: #334155;">→ Wie läuft die Montage konkret ab?</p>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;"><strong>⚡ Wichtig:</strong> In der aktuellen Saison sind unsere Montageteams stark nachgefragt. Je früher Sie sich entscheiden, desto flexibler können wir Ihren Wunschtermin einplanen.</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Ein kurzes Telefonat genügt – wir beraten Sie gerne persönlich und unverbindlich.</p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Herzliche Grüße,<br><strong>Ihr Polendach24 Team</strong></p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_service_ack',
            name: 'Serwis – Potwierdzenie Zgłoszenia',
            description: 'Automatyczne potwierdzenie przyjęcia zgłoszenia serwisowego. Wysyłane po wypełnieniu formularza serwisowego.',
            category: 'service',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #eff6ff; border-radius: 50%; line-height: 60px; font-size: 28px;">🔧</div>
                    </div>
                    <h1 style="margin: 0 0 20px; font-size: 24px; color: #111827; text-align: center;">Serviceanfrage erhalten</h1>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4b5563;">Sehr geehrte Damen und Herren,</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4b5563;">wir haben Ihre Serviceanfrage erhalten. Unsere Technikabteilung wird sich umgehend darum kümmern.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                        <p style="margin: 0 0 8px; font-weight: bold; color: #111827; font-size: 15px;">Ticket-Nummer: SRV-2025-0042</p>
                        <p style="margin: 0; font-size: 14px; color: #4b5563;">Beschreibung: Undichte Stelle an der Dachkonstruktion nach starkem Regen.</p>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4b5563;">Wir werden Sie über den Status Ihrer Anfrage informieren.</p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">Mit freundlichen Grüßen,<br><strong>Ihr Polendach24 Team</strong></p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_installation_confirm',
            name: 'Montagebestätigung',
            description: 'Terminbestätigung mit allen Details. Baut Vorfreude auf und unterstreicht die professionelle Abwicklung.',
            category: 'installation',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #eef2ff; border-radius: 50%; line-height: 60px; font-size: 28px;">📅</div>
                    </div>
                    <h1 style="margin: 0 0 10px; font-size: 26px; color: #111827; text-align: center;">Ihr Montagetermin steht fest!</h1>
                    <p style="margin: 0 0 30px; font-size: 14px; color: #6b7280; text-align: center;">Auftrag Nr. AUF-2025-0128</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Sehr geehrte Damen und Herren,</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">wir freuen uns, Ihnen Ihren <strong>persönlichen Montagetermin</strong> bestätigen zu können. Schon bald verwandelt sich Ihre Terrasse in Ihren neuen Lieblingsplatz!</p>
                    <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Produkt</div>
                            <div style="font-size: 16px; color: #0f172a; font-weight: 600;">Trendstyle 5000×3500mm, RAL 7016</div>
                        </div>
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Montagedatum</div>
                            <div style="font-size: 16px; color: #0f172a; font-weight: 600;">📅 Montag, 14. Juli 2025</div>
                        </div>
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Adresse</div>
                            <div style="font-size: 16px; color: #0f172a; font-weight: 600;">📍 Musterstraße 12, 03044 Cottbus</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Voraussichtliche Dauer</div>
                            <div style="font-size: 16px; color: #0f172a; font-weight: 600;">⏱️ 2 Arbeitstage</div>
                        </div>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Unser <strong>erfahrenes Montageteam</strong> wird in den Morgenstunden (zwischen 8:00 und 10:00 Uhr) bei Ihnen eintreffen. Sie können sich auf eine saubere, professionelle und termingerechte Arbeit verlassen.</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Bei Fragen oder wenn Sie den Termin verschieben möchten, sind wir jederzeit für Sie erreichbar.</p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Wir freuen uns auf die Montage!<br><strong>Ihr Polendach24 Team</strong></p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_installation_complete',
            name: 'Montage abgeschlossen',
            description: 'Bestätigung nach erfolgter Montage. Bedankt sich beim Kunden, bittet um Weiterempfehlung und Google-Bewertung.',
            category: 'installation',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #f0fdf4; border-radius: 50%; line-height: 60px; font-size: 28px;">✅</div>
                    </div>
                    <h1 style="margin: 0 0 10px; font-size: 26px; color: #166534; text-align: center;">Montage erfolgreich abgeschlossen!</h1>
                    <p style="margin: 0 0 30px; font-size: 14px; color: #15803d; text-align: center;">Auftrag Nr. AUF-2025-0128</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Sehr geehrte Damen und Herren,</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">die Montage Ihrer neuen Terrassenüberdachung an der <strong>Musterstraße 12, Cottbus</strong> ist abgeschlossen. Wir hoffen, Sie sind begeistert vom Ergebnis!</p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Das Abnahmeprotokoll wurde in unserem System hinterlegt. In Kürze erhalten Sie die Endabrechnung.</p>
                    <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #166534;">⭐ Zufrieden mit unserer Arbeit?</p>
                        <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563;">Ihre Meinung hilft anderen Kunden bei der Entscheidung.</p>
                        <a href="#" style="display: inline-block; background: #166534; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 700; font-size: 14px;">Google-Bewertung schreiben ★</a>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4b5563;">Kennen Sie jemanden, der auch eine Überdachung plant? <strong>Empfehlen Sie uns weiter!</strong> Wir belohnen jede erfolgreiche Empfehlung.</p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Vielen Dank für Ihr Vertrauen!<br><strong>Ihr Polendach24 Team</strong></p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_service_form_link',
            name: 'Serwis – Link do Formularza',
            description: 'Wysyłany do klienta z linkiem do formularza serwisowego online. Klient opisuje problem i dodaje zdjęcia.',
            category: 'service',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #eff6ff; border-radius: 50%; line-height: 60px; font-size: 28px;">📋</div>
                    </div>
                    <p style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">Sehr geehrte/r <strong>Max Mustermann</strong>,</p>
                    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7;">
                        vielen Dank für Ihre Kontaktaufnahme. Für Ihre Service-Anfrage
                        <strong style="color: #1e40af;">SRV-2025-0042</strong>
                        haben wir ein Formular vorbereitet, das Sie bitte ausfüllen möchten.
                    </p>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                        <p style="font-size: 13px; color: #1e40af; font-weight: 700; margin: 0 0 8px;">Bitte helfen Sie uns mit folgenden Informationen:</p>
                        <ul style="margin: 0; padding: 0 0 0 20px; font-size: 13px; color: #3b82f6; line-height: 2;">
                            <li>Genaue Beschreibung des Problems</li>
                            <li>Art und Ort der Störung</li>
                            <li>Ihre aktuellen Kontaktdaten</li>
                            <li><strong>So viele Fotos wie möglich</strong> — verschiedene Blickwinkel helfen uns enorm!</li>
                            <li>Gewünschter Termin für den Service</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 0 0 24px;">
                        <a href="#" class="cta-button">Service-Formular öffnen</a>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0 0 24px;">
                        Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br>
                        <a href="#" style="color: #3b82f6;">https://polendach24.app/service-form/abc123</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Sollten Sie Fragen haben, können Sie sich jederzeit telefonisch oder per E-Mail an uns wenden.
                    </p>
                    <p style="font-size: 14px; color: #1e293b; margin: 16px 0 0;">
                        Mit freundlichen Grüßen,<br><strong>Ihr Polendach24 Service-Team</strong>
                    </p>`;
                return wrapInBrandTemplate(body);
            }
        },
        {
            id: 'system_feedback_request',
            name: 'Feedback nach Montage',
            description: 'E-Mail mit Dankeschön nach abgeschlossener Montage und Link zum Bewertungsformular.',
            category: 'installation',
            previewHtml: () => {
                const body = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background-color: #f0fdf4; border-radius: 50%; line-height: 60px; font-size: 28px;">🏠</div>
                    </div>
                    <p style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">Sehr geehrte/r <strong>Max Mustermann</strong>,</p>
                    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7;">
                        wir bedanken uns herzlich für Ihr Vertrauen und die Zusammenarbeit! 
                        Es war uns eine große Freude, Ihr Projekt <strong style="color: #1e40af;">KS/0098/02/2026</strong> erfolgreich abzuschließen.
                    </p>
                    <div style="background: linear-gradient(135deg, #eff6ff, #f0fdf4); border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 0 0 24px; text-align: center;">
                        <p style="font-size: 24px; margin: 0 0 8px;">⭐⭐⭐⭐⭐</p>
                        <p style="font-size: 15px; color: #166534; font-weight: 700; margin: 0 0 8px;">Ihre Meinung ist uns wichtig!</p>
                        <p style="font-size: 13px; color: #4b5563; margin: 0; line-height: 1.6;">
                            Wir würden uns sehr freuen, wenn Sie sich <strong>2 Minuten</strong> Zeit nehmen, 
                            um uns Ihr ehrliches Feedback zu geben. Ihre Bewertung hilft uns, 
                            unseren Service weiter zu verbessern.
                        </p>
                    </div>
                    <div style="text-align: center; margin: 0 0 24px;">
                        <a href="#" class="cta-button" style="background: linear-gradient(135deg, #2563eb, #4f46e5); font-size: 16px; padding: 14px 40px;">⭐ Jetzt bewerten</a>
                    </div>
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                        <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.6; text-align: center;">
                            <strong>Was erwartet Sie?</strong><br>
                            ✓ 4 kurze Bewertungskategorien mit Sternchen<br>
                            ✓ Optionale Kommentare für detailliertes Feedback<br>
                            ✓ Dauert nur 2 Minuten
                        </p>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0 0 24px;">
                        Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br>
                        <a href="#" style="color: #3b82f6;">https://polendach24.app/feedback/abc123</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 14px; color: #1e293b; margin: 16px 0 0;">
                        Mit herzlichem Dank und besten Grüßen,<br><strong>Ihr Polendach24 Team</strong>
                    </p>`;
                return wrapInBrandTemplate(body);
            }
        },
    ];
}
