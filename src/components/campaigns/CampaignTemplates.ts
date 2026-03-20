import { wrapInBrandTemplate } from '../../utils/emailBrandKit';

export interface CampaignTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    subject: string;
    /** Which param fields this template uses */
    fields: string[];
    /** Generates the body HTML (between header/footer) with placeholder replacements */
    generateBody: (params: CampaignTemplateParams) => string;
    /** Full preview with brand wrapper */
    previewHtml: (params: CampaignTemplateParams) => string;
}

export interface CampaignTemplateParams {
    // Letzte Referenz
    projectTitle?: string;
    projectLocation?: string;
    projectModel?: string;
    projectDimensions?: string;
    projectColor?: string;
    projectDescription?: string;
    heroImage?: string;
    galleryImages?: string[];
    ctaUrl?: string;
    ctaText?: string;
    customHtml?: string;
    // Sonderaktion
    promoTitle?: string;
    promoSubtitle?: string;
    promoDiscount?: string;
    promoDeadline?: string;
    promoDescription?: string;
    promoProducts?: string;
    // Kundenbewertung
    customerName?: string;
    installationDate?: string;
    googleReviewUrl?: string;
    reviewMessage?: string;
    // Neuigkeiten
    newsletterIntro?: string;
    newsItems?: { title: string; text: string; image?: string }[];
}

const DEFAULT_HERO = 'https://polendach24.de/wp-content/uploads/2025/06/trendstyle-1024x682.webp';

function buildImageGallery(images: string[]): string {
    if (!images || images.length === 0) return '';
    const rows: string[] = [];
    for (let i = 0; i < images.length; i += 2) {
        const img1 = images[i];
        const img2 = images[i + 1];
        rows.push(`
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 10px;">
                <tr>
                    <td width="${img2 ? '49%' : '100%'}" style="padding: 0 ${img2 ? '5px 0 0' : '0'};">
                        <img src="${img1}" width="100%" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Projektfoto">
                    </td>
                    ${img2 ? `<td width="49%" style="padding: 0 0 0 5px;">
                        <img src="${img2}" width="100%" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Projektfoto">
                    </td>` : ''}
                </tr>
            </table>`);
    }
    return `
        <div style="margin: 30px 0;">
            <h3 style="text-align: center; margin: 0 0 20px; font-size: 18px; color: #111827; font-weight: 700;">📸 Impressionen vom Projekt</h3>
            ${rows.join('')}
        </div>`;
}

export function getCampaignTemplates(): CampaignTemplate[] {
    return [
        // ── 1. LETZTE REFERENZ (SALES-ORIENTED) ──────────────
        {
            id: 'letzte_referenz',
            name: 'Letzte Referenz',
            description: 'Sprzedażowa prezentacja realizacji — region, zdjęcia, nakłanianie do decyzji.',
            category: 'marketing',
            subject: '🏡 Gerade fertiggestellt in {location} – Ist Ihr Zuhause als Nächstes dran?',
            fields: ['projectTitle', 'projectLocation', 'projectModel', 'projectDimensions', 'projectColor', 'projectDescription', 'heroImage', 'galleryImages'],
            generateBody: (params) => {
                const {
                    projectTitle = 'Exklusive Terrassenüberdachung',
                    projectLocation = 'Brandenburg',
                    projectModel = 'Trendstyle',
                    projectDimensions = '6000 × 4000 mm',
                    projectColor = 'RAL 7016 Anthrazitgrau',
                    projectDescription = 'Ein wunderschönes Projekt für unseren zufriedenen Kunden. Premium-Aluminium, fachgerechte Montage und ein Design, das begeistert.',
                    heroImage = DEFAULT_HERO,
                    galleryImages = [],
                } = params;

                return `
                    <div style="background: linear-gradient(135deg, #065f46, #047857); border-radius: 12px; padding: 10px 20px; margin-bottom: 25px; text-align: center;">
                        <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 1px;">✅ GERADE FERTIGGESTELLT — ${projectLocation.toUpperCase()}</span>
                    </div>

                    <img src="${heroImage}" width="100%" style="width: 100%; max-height: 380px; object-fit: cover; border-radius: 12px; display: block; box-shadow: 0 8px 30px rgba(0,0,0,0.15); margin-bottom: 25px;" alt="${projectTitle}">

                    <div style="text-align: center; margin-bottom: 10px;">
                        <span style="display: inline-block; font-size: 11px; color: #059669; text-transform: uppercase; letter-spacing: 3px; font-weight: 800;">Frisch montiert • ${projectLocation}</span>
                    </div>
                    <h1 style="margin: 0 0 8px; font-size: 26px; color: #111827; text-align: center; font-weight: 300; letter-spacing: -0.5px;">
                        ${projectTitle}<br><span style="font-weight: 800;">in ${projectLocation}</span>
                    </h1>
                    <p style="text-align: center; font-size: 15px; color: #64748b; margin: 5px 0 25px; font-style: italic;">
                        „Ein weiterer zufriedener Kunde – und vielleicht bald auch Sie?"
                    </p>

                    <!-- Project specs dark card -->
                    <div style="background: linear-gradient(135deg, #1a1a1a, #1c252e); border-radius: 12px; padding: 24px; margin: 25px 0; color: #ffffff;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td width="50%" style="padding: 8px 12px 8px 0; border-right: 1px solid rgba(255,255,255,0.1);">
                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700;">Modell</div>
                                    <div style="font-size: 16px; font-weight: 700; margin-top: 5px; color: #34d399;">${projectModel}</div>
                                </td>
                                <td width="50%" style="padding: 8px 0 8px 12px;">
                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700;">Maße</div>
                                    <div style="font-size: 16px; font-weight: 700; margin-top: 5px;">${projectDimensions}</div>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700;">Farbe</div>
                                    <div style="font-size: 15px; font-weight: 600; margin-top: 5px;">${projectColor}</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <p style="margin: 0 0 25px; font-size: 15px; line-height: 1.8; color: #4b5563; text-align: center;">${projectDescription}</p>

                    ${buildImageGallery(galleryImages)}

                    <!-- CTA green box -->
                    <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #6ee7b7; border-radius: 16px; padding: 25px 20px; margin: 30px 0; text-align: center;">
                        <div style="font-size: 28px; margin-bottom: 8px;">🏡</div>
                        <p style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: #065f46;">Wir sind auch in Ihrer Region!</p>
                        <p style="margin: 0 0 6px; font-size: 14px; color: #047857; font-weight: 600;">Gerade haben wir in ${projectLocation} montiert – und können auch direkt bei Ihnen vorbeikommen.</p>
                        <p style="margin: 0 0 18px; font-size: 13px; color: #64748b;">Kostenloser Aufmaßtermin • Unverbindliches Angebot • Professionelle Montage</p>
                        <a href="https://polendach24.de" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 800; font-size: 15px; box-shadow: 0 6px 20px rgba(5,150,105,0.35);">Jetzt kostenlosen Termin sichern →</a>
                    </div>

                    <!-- Benefits list -->
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #1e293b;">✨ Das bekommen Sie bei uns:</p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr><td style="padding: 5px 0; font-size: 13px; color: #475569;">✅ Premium-Aluminium – kein Rost, kein Streichen</td></tr>
                            <tr><td style="padding: 5px 0; font-size: 13px; color: #475569;">✅ 5 Jahre Garantie auf Material &amp; Montage</td></tr>
                            <tr><td style="padding: 5px 0; font-size: 13px; color: #475569;">✅ Professionelle Montage durch erfahrene Teams</td></tr>
                            <tr><td style="padding: 5px 0; font-size: 13px; color: #475569;">✅ Individuelle Maßanfertigung nach Ihren Wünschen</td></tr>
                            <tr><td style="padding: 5px 0; font-size: 13px; color: #475569;">✅ Kompetente Beratung direkt bei Ihnen vor Ort</td></tr>
                        </table>
                    </div>

                    <!-- Urgency banner -->
                    <div style="background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1px solid #fde047; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: #854d0e;">⚡ Aktuell: Kurze Lieferzeiten in Ihrer Region!</p>
                        <p style="margin: 0; font-size: 12px; color: #92400e;">Unsere Teams sind gerade in ${projectLocation} im Einsatz. Sichern Sie sich noch in dieser Saison Ihren Wunschtermin.</p>
                    </div>

                    <!-- SALES TEAM — 2×2 grid, mobile-safe -->
                    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; padding: 24px 12px; margin: 25px 0; color: #ffffff; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; font-weight: 700;">IHRE ANSPRECHPARTNER</p>
                        <p style="margin: 0 0 16px; font-size: 13px; color: #cbd5e1;">Rufen Sie uns an – persönlich &amp; unverbindlich:</p>

                        <!-- Row 1 -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 6px;">
                            <tr>
                                <td width="50%" align="center" style="padding: 3px;">
                                    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #059669, #34d399); margin: 0 auto 6px; line-height: 38px; font-size: 14px; font-weight: 800; color: #fff;">ML</div>
                                        <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Mike Ledwin</div>
                                        <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb &amp; Beratung</div>
                                        <a href="tel:+4915257487430" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0152 5748 7430</a>
                                    </div>
                                </td>
                                <td width="50%" align="center" style="padding: 3px;">
                                    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #059669, #34d399); margin: 0 auto 6px; line-height: 38px; font-size: 14px; font-weight: 800; color: #fff;">OD</div>
                                        <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Oliwia Duz</div>
                                        <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb &amp; Beratung</div>
                                        <a href="tel:+491626692445" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0162 669 2445</a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                        <!-- Row 2 -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                            <tr>
                                <td width="50%" align="center" style="padding: 3px;">
                                    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #059669, #34d399); margin: 0 auto 6px; line-height: 38px; font-size: 14px; font-weight: 800; color: #fff;">HK</div>
                                        <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Hubert Kosciow</div>
                                        <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb &amp; Beratung</div>
                                        <a href="tel:+48669558015" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 +48 669 558 015</a>
                                    </div>
                                </td>
                                <td width="50%" align="center" style="padding: 3px;">
                                    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 6px;">
                                        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #059669, #34d399); margin: 0 auto 6px; line-height: 38px; font-size: 14px; font-weight: 800; color: #fff;">AN</div>
                                        <div style="font-size: 13px; font-weight: 800; color: #f1f5f9;">Artur Nagorny</div>
                                        <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">Vertrieb &amp; Beratung</div>
                                        <a href="tel:+4915258715652" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0152 5871 5652</a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                        <p style="margin: 0; font-size: 11px; color: #64748b;">Oder schreiben Sie uns: <a href="mailto:buero@polendach24.de" style="color: #34d399; text-decoration: none; font-weight: 700;">buero@polendach24.de</a></p>
                    </div>

                    <!-- Trust badges -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px;">
                        <tr>
                            <td width="33%" align="center" style="padding: 10px 4px;"><div style="font-size: 20px;">🏆</div><div style="font-size: 10px; color: #6b7280; font-weight: 700; margin-top: 3px;">450+ Projekte</div></td>
                            <td width="34%" align="center" style="padding: 10px 4px; border-left: 1px solid #f0f2f5; border-right: 1px solid #f0f2f5;"><div style="font-size: 20px;">🛡️</div><div style="font-size: 10px; color: #6b7280; font-weight: 700; margin-top: 3px;">5 Jahre Garantie</div></td>
                            <td width="33%" align="center" style="padding: 10px 4px;"><div style="font-size: 20px;">⭐</div><div style="font-size: 10px; color: #6b7280; font-weight: 700; margin-top: 3px;">Top Bewertungen</div></td>
                        </tr>
                    </table>`;
            },
            previewHtml: (params) => {
                const tpls = getCampaignTemplates();
                return wrapInBrandTemplate(tpls[0].generateBody(params), { showProducts: true, showUSPs: true });
            }
        },

        // ── 2. SONDERAKTION ───────────────────────────────────
        {
            id: 'sonderaktion',
            name: 'Sonderaktion',
            description: 'Promocja sezonowa z rabatem i terminem ważności.',
            category: 'marketing',
            subject: '🔥 Exklusives Angebot: {discount} auf Ihre Terrassenüberdachung!',
            fields: ['promoTitle', 'promoSubtitle', 'promoDiscount', 'promoDeadline', 'promoDescription', 'promoProducts', 'heroImage', 'galleryImages'],
            generateBody: (params) => {
                const {
                    promoTitle = 'Frühlings-Sonderaktion',
                    promoSubtitle = 'Nur für kurze Zeit',
                    promoDiscount = '15% Rabatt',
                    promoDeadline = '31.03.2026',
                    promoDescription = 'Sichern Sie sich jetzt Ihre Premium-Terrassenüberdachung zum Sonderpreis. Hochwertige Aluminium-Konstruktionen mit 5 Jahren Garantie.',
                    promoProducts = 'Terrassenüberdachungen, Carports, Pergolen',
                    heroImage = DEFAULT_HERO,
                    galleryImages = [],
                } = params;

                return `
                    <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); border-radius: 12px; padding: 8px 20px; margin-bottom: 25px; text-align: center;">
                        <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 1px;">⏰ NUR BIS ${promoDeadline} — ${promoSubtitle.toUpperCase()}</span>
                    </div>
                    ${heroImage ? `<img src="${heroImage}" width="100%" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; display: block; margin-bottom: 25px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" alt="Sonderaktion">` : ''}
                    <div style="text-align: center; margin-bottom: 10px;">
                        <span style="display: inline-block; font-size: 11px; color: #dc2626; text-transform: uppercase; letter-spacing: 3px; font-weight: 800;">Exklusives Angebot</span>
                    </div>
                    <h1 style="margin: 0 0 15px; font-size: 30px; color: #111827; text-align: center; font-weight: 800; letter-spacing: -0.5px;">${promoTitle}</h1>
                    <div style="text-align: center; margin: 25px 0;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 2px solid #fca5a5; border-radius: 16px; padding: 20px 40px;">
                            <div style="font-size: 36px; font-weight: 900; color: #dc2626; letter-spacing: -1px;">${promoDiscount}</div>
                            <div style="font-size: 13px; color: #991b1b; font-weight: 600; margin-top: 4px;">auf ausgewählte Produkte</div>
                        </div>
                    </div>
                    <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.7; color: #4b5563; text-align: center;">${promoDescription}</p>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px 25px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 700; margin-bottom: 10px;">Gilt für:</div>
                        <div style="font-size: 15px; color: #334155; font-weight: 600;">${promoProducts}</div>
                    </div>
                    ${buildImageGallery(galleryImages)}
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="https://polendach24.de" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 16px 45px; border-radius: 50px; font-weight: 800; font-size: 16px; box-shadow: 0 6px 20px rgba(220,38,38,0.3); letter-spacing: 0.5px;">Jetzt Angebot sichern →</a>
                    </div>
                    <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 15px;">* Aktion gültig bis ${promoDeadline}. Nicht mit anderen Rabatten kombinierbar.</p>`;
            },
            previewHtml: (params) => {
                const tpls = getCampaignTemplates();
                return wrapInBrandTemplate(tpls[1].generateBody(params), { showUSPs: true });
            }
        },

        // ── 3. KUNDENBEWERTUNG ────────────────────────────────
        {
            id: 'kundenbewertung',
            name: 'Kundenbewertung',
            description: 'Prośba o opinię Google po zakończonym montażu.',
            category: 'after_sales',
            subject: 'Wie zufrieden sind Sie mit Ihrer neuen Terrassenüberdachung?',
            fields: ['customerName', 'installationDate', 'googleReviewUrl', 'reviewMessage', 'heroImage'],
            generateBody: (params) => {
                const {
                    customerName = 'Sehr geehrter Kunde',
                    installationDate = '',
                    googleReviewUrl = 'https://g.page/r/polendach24/review',
                    reviewMessage = 'Wir hoffen, dass Sie Ihre neue Terrassenüberdachung in vollen Zügen genießen. Ihre Meinung ist uns sehr wichtig und hilft anderen Kunden bei ihrer Entscheidung.',
                    heroImage = '',
                } = params;

                return `
                    <div style="text-align: center; margin-bottom: 10px;">
                        <span style="display: inline-block; font-size: 11px; color: #f59e0b; text-transform: uppercase; letter-spacing: 3px; font-weight: 800;">Ihre Meinung zählt</span>
                    </div>
                    <h1 style="margin: 0 0 20px; font-size: 26px; color: #111827; text-align: center; font-weight: 700;">
                        Hallo ${customerName}! 👋
                    </h1>
                    ${heroImage ? `<img src="${heroImage}" width="100%" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 12px; display: block; margin: 0 auto 25px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" alt="Ihre Überdachung">` : ''}
                    <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #4b5563; text-align: center;">${reviewMessage}</p>
                    ${installationDate ? `<p style="margin: 0 0 25px; font-size: 14px; color: #94a3b8; text-align: center;">Montage am: ${installationDate}</p>` : ''}
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="font-size: 40px; letter-spacing: 8px;">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">Wie würden Sie uns bewerten?</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fcd34d; border-radius: 16px; padding: 30px; margin: 25px 0; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 12px;">🏅</div>
                        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #92400e;">Teilen Sie Ihre Erfahrung</p>
                        <p style="margin: 0 0 20px; font-size: 14px; color: #78716c;">Es dauert nur 1–2 Minuten und hilft uns enorm.</p>
                        <a href="${googleReviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(245,158,11,0.3);">⭐ Jetzt bewerten</a>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #475569;">💡 Worüber könnten Sie schreiben?</p>
                        <ul style="margin: 0; padding: 0 0 0 18px; color: #64748b; font-size: 13px; line-height: 2;">
                            <li>Qualität der Materialien</li>
                            <li>Sauberkeit und Pünktlichkeit der Montage</li>
                            <li>Beratung und Kommunikation</li>
                            <li>Gesamteindruck und Ergebnis</li>
                        </ul>
                    </div>
                    <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 25px;">
                        Vielen Dank für Ihr Vertrauen! 🙏<br><strong>Ihr Sonnenschutz24-Team</strong>
                    </p>`;
            },
            previewHtml: (params) => {
                const tpls = getCampaignTemplates();
                return wrapInBrandTemplate(tpls[2].generateBody(params), {});
            }
        },

        // ── 4. NEUIGKEITEN (Newsletter) ───────────────────────
        {
            id: 'neuigkeiten',
            name: 'Neuigkeiten',
            description: 'Newsletter z aktualnościami — wiele sekcji z wiadomościami.',
            category: 'newsletter',
            subject: 'Neuigkeiten von Sonnenschutz24 – {month}',
            fields: ['newsletterIntro', 'heroImage', 'galleryImages', 'customHtml'],
            generateBody: (params) => {
                const {
                    newsletterIntro = 'Liebe Kunden und Interessenten, hier sind die neuesten Nachrichten von Sonnenschutz24.',
                    heroImage = '',
                    galleryImages = [],
                    customHtml = '',
                } = params;

                return `
                    <div style="text-align: center; margin-bottom: 10px;">
                        <span style="display: inline-block; font-size: 11px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 3px; font-weight: 800;">Newsletter</span>
                    </div>
                    <h1 style="margin: 0 0 8px; font-size: 28px; color: #111827; text-align: center; font-weight: 300;">
                        Neuigkeiten von<br><span style="font-weight: 800;">Sonnenschutz24</span>
                    </h1>
                    <p style="text-align: center; font-size: 13px; color: #94a3b8; margin: 0 0 30px;">📅 ${new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
                    ${heroImage ? `<img src="${heroImage}" width="100%" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; display: block; margin-bottom: 25px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" alt="Newsletter">` : ''}
                    <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.7; color: #4b5563; text-align: center;">${newsletterIntro}</p>
                    <div style="border-top: 2px solid #f0f2f5; margin: 20px 0;"></div>
                    ${customHtml ? `<div style="font-size: 15px; line-height: 1.8; color: #374151;">${customHtml}</div>` : ''}
                    ${buildImageGallery(galleryImages)}
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="https://polendach24.de" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(139,92,246,0.3);">Mehr auf unserer Website →</a>
                    </div>
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f2f5;">
                        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 8px;">Folgen Sie uns:</p>
                        <p style="font-size: 20px; letter-spacing: 15px; margin: 0;">
                            <a href="https://facebook.com/polendach24" style="text-decoration: none;">📘</a>
                            <a href="https://instagram.com/polendach24" style="text-decoration: none;">📸</a>
                            <a href="https://polendach24.de" style="text-decoration: none;">🌐</a>
                        </p>
                    </div>`;
            },
            previewHtml: (params) => {
                const tpls = getCampaignTemplates();
                return wrapInBrandTemplate(tpls[3].generateBody(params), { showUSPs: true });
            }
        },

        // ── 5. CUSTOM ─────────────────────────────────────────
        {
            id: 'custom',
            name: 'Eigener Inhalt',
            description: 'Własna treść — pisz swój tekst, dodawaj zdjęcia.',
            category: 'custom',
            subject: '',
            fields: ['customHtml', 'galleryImages'],
            generateBody: (params) => {
                const { customHtml = '', galleryImages = [] } = params;
                return `
                    ${customHtml}
                    ${buildImageGallery(galleryImages)}`;
            },
            previewHtml: (params) => {
                const tpls = getCampaignTemplates();
                return wrapInBrandTemplate(tpls[4].generateBody(params), { showUSPs: true });
            }
        }
    ];
}
