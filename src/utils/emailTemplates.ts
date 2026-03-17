interface RepInfo {
    name?: string;
    phone?: string;
    email?: string;
    clientPhone?: string;
    clientEmail?: string;
}

export const getOfferEmailHtml = (offerLinks: { number: string, url: string }[], customerName?: string, repInfo?: RepInfo, offerIndex?: number) => {
    const isMultiple = offerLinks.length > 1;
    const numbersString = offerLinks.map(o => o.number).join(', ');
    const isFollowUp = (offerIndex || 1) > 1;

    // Adapt title and text based on whether this is a first or follow-up offer
    const title = isFollowUp
        ? (isMultiple ? 'Ihre aktualisierten Angebote — Polendach24' : 'Ihr aktualisiertes Angebot — Polendach24')
        : (isMultiple ? 'Ihre Angebote von Polendach24' : 'Ihr Angebot von Polendach24');

    const heroTitle = isFollowUp
        ? (isMultiple ? 'Ihre aktualisierten<br>Angebote sind da.' : 'Ihr aktualisiertes<br>Angebot ist da.')
        : (isMultiple ? 'Ihre Angebote sind' : 'Ihr Angebot ist');

    const heroTitleSuffix = isFollowUp ? '' : '<br><span style="font-weight: 700;">fertig für Sie.</span>';

    const heroSubtitle = isFollowUp ? 'Aktualisiertes Angebot' : 'Ihr individuelles Angebot';

    const bodyText = isFollowUp
        ? `wie besprochen haben wir Ihr Angebot <strong>(Nr. ${numbersString})</strong> überarbeitet und an Ihre Wünsche angepasst. Bitte schauen Sie sich die aktualisierte Kalkulation in Ruhe an.`
        : `vielen Dank für Ihr Interesse an unseren <strong>Premium-Aluminium&shy;überdachungen</strong>. Basierend auf Ihren Wünschen ${isMultiple ? 'haben wir individuelle Kalkulationen' : 'haben wir eine individuelle Kalkulation'} <strong>(Nr. ${numbersString})</strong> für Sie erstellt.`;

    const previewText = isFollowUp
        ? `Ihr aktualisiertes Angebot Nr. ${numbersString} — Jetzt ansehen!`
        : `${isMultiple ? `Ihre Angebote Nr. ${numbersString}` : `Ihr Angebot Nr. ${numbersString}`} — Jetzt ansehen und profitieren!`;

    // Rep contact: prefer client-facing, fallback to internal
    const repPhone = repInfo?.clientPhone || repInfo?.phone || '';
    const repEmail = repInfo?.clientEmail || repInfo?.email || '';
    const repName = repInfo?.name || '';
    const repInitials = repName ? repName.split(' ').map((n: string) => n.charAt(0)).join('').substring(0, 2) : '';

    const greeting = customerName ? `Sehr geehrte/r ${customerName},` : 'Sehr geehrte Damen und Herren,';

    // Build offer buttons
    const offerButtonsHtml = offerLinks.map(link => {
        if (link.url && link.url !== '#') {
            return `
                <tr><td style="padding-bottom: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="center" style="padding: 45px 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%); border-radius: 12px;">
                                <p style="margin: 0 0 8px 0; font-size: 32px;">📄</p>
                                <p style="margin: 0 0 8px 0; font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Ihr persönliches Angebot</p>
                                <p style="margin: 0 0 25px 0; font-size: 22px; color: #ffffff; font-weight: 700; line-height: 30px;">Angebot Nr. ${link.number}</p>
                                <p style="margin: 0 0 25px 0; font-size: 14px; color: rgba(255,255,255,0.85); line-height: 22px;">Klicken Sie auf den Button, um Ihr<br><strong style="color:#fff;">individuelles Angebot online anzusehen.</strong></p>
                                <a href="${link.url}" target="_blank" style="display: inline-block; padding: 18px 50px; background-color: #ffffff; color: #1d4ed8; font-size: 17px; font-weight: 800; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">➜ Angebot jetzt ansehen</a>
                                <p style="margin: 15px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.65);">Interaktiv • Alle Details auf einen Blick</p>
                            </td>
                        </tr>
                    </table>
                </td></tr>`;
        } else {
            return `
                <tr><td style="padding-bottom: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="background: #f0f7ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px 24px;">
                                <p style="margin: 0; color: #1e40af; font-weight: 700; font-size: 16px;">📄 Angebot Nr. ${link.number}</p>
                                <p style="margin: 8px 0 0; color: #475569; font-size: 14px;">Bitte öffnen Sie die beigefügte PDF-Datei.</p>
                            </td>
                        </tr>
                    </table>
                </td></tr>`;
        }
    }).join('');

    // Build rep section
    const repSectionHtml = repName ? `
        <tr>
            <td class="content-padding" style="padding: 0 60px 40px 60px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f8fafc, #eef2ff); border: 1px solid #e2e8f0; border-radius: 8px;">
                    <tr>
                        <td style="padding: 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="56" valign="top">
                                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; text-align: center; line-height: 48px; color: #ffffff; font-weight: 800; font-size: 18px;">${repInitials}</div>
                                    </td>
                                    <td style="padding-left: 16px;" valign="top">
                                        <p style="margin: 0; font-size: 11px; color: #e67e22; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Ihr persönlicher Berater</p>
                                        <p style="margin: 4px 0 12px; font-size: 18px; font-weight: 800; color: #1c252e;">${repName}</p>
                                        ${repPhone ? `<p style="margin: 0 0 6px; font-size: 14px; color: #334155;">📞 <a href="tel:${repPhone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${repPhone}</a></p>` : ''}
                                        ${repEmail ? `<p style="margin: 0; font-size: 14px; color: #334155;">✉️ <a href="mailto:${repEmail}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${repEmail}</a></p>` : ''}
                                    </td>
                                </tr>
                            </table>
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-size: 14px; color: #475569; line-height: 24px;">
                                    Ich habe Ihr Angebot persönlich für Sie erstellt und stehe Ihnen für alle Fragen gerne zur Verfügung. Zögern Sie nicht, mich direkt zu kontaktieren!
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>` : '';

    return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f7f9fb; color: #1a202c; }
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; max-width: 100% !important; }
            .content-padding { padding: 30px 20px !important; }
            .mobile-center { text-align: center !important; }
            .mobile-stack { display: block !important; width: 100% !important; padding: 0 0 20px 0 !important; border-right: none !important; border-bottom: 1px solid #f0f2f5 !important; }
            .mobile-stack-last { border-bottom: none !important; padding-bottom: 0 !important; }
            .hero-title { font-size: 24px !important; line-height: 32px !important; }
            .logo-img { width: 220px !important; height: auto !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9fb;">

    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        ${previewText}
    </div>

    <center>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f9fb;">
            <tr>
                <td align="center" style="padding: 20px 0;">

                    <table border="0" cellpadding="0" cellspacing="0" width="650" class="container" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.08); max-width: 650px;">

                        <!-- HEADER / LOGO -->
                        <tr>
                            <td align="center" style="padding: 55px 0 45px 0;">
                                <a href="https://www.polendach24.de" target="_blank">
                                    <img src="https://polendach24.app/PolenDach24-Logo.png" width="280" class="logo-img" alt="Polendach24 Premium" style="font-weight: bold; letter-spacing: 5px; color: #1c252e; text-transform: uppercase; border: none; display: block; max-width: 100%; height: auto;">
                                </a>
                                <div style="height: 1px; width: 60px; background-color: #e67e22; margin-top: 25px;"></div>
                            </td>
                        </tr>

                        <!-- HERO IMAGE -->
                        <tr>
                            <td align="center" style="padding: 0;">
                                <img src="https://polendach24.app/skystylezdj.jpg" width="650" style="width: 100%; max-width: 650px; display: block; height: auto;" alt="Premium Aluminium-Überdachung">
                            </td>
                        </tr>

                        <!-- BODY CONTENT -->
                        <tr>
                            <td class="content-padding" style="padding: 60px 60px 30px 60px;">
                                <h2 style="margin: 0 0 15px 0; font-size: 12px; color: #e67e22; letter-spacing: 4px; text-transform: uppercase; font-weight: 800; text-align: center;">${heroSubtitle}</h2>
                                <h1 class="hero-title" style="margin: 0 0 30px 0; font-size: 34px; line-height: 42px; color: #1c252e; font-weight: 300; text-align: center; letter-spacing: -1px;">
                                    ${heroTitle}${heroTitleSuffix}
                                </h1>

                                <p style="margin: 0 0 20px 0; font-size: 17px; line-height: 28px; color: #4a5568; text-align: center;">
                                    ${greeting}
                                </p>
                                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 28px; color: #4a5568; text-align: center;">
                                    ${bodyText}
                                </p>
                                ${!isFollowUp ? `<p style="margin: 0 0 10px 0; font-size: 16px; line-height: 28px; color: #4a5568; text-align: center;">
                                    Wir setzen auf höchste Qualität, modernes Design und Langlebigkeit — damit Sie viele Jahre Freude an Ihrem Garten haben.
                                </p>` : ''}
                            </td>
                        </tr>

                        <!-- ★★★ OFFER CTA BUTTONS ★★★ -->
                        <tr>
                            <td style="padding: 10px 40px 40px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    ${offerButtonsHtml}
                                </table>
                            </td>
                        </tr>

                        <!-- PERSONAL ADVISOR -->
                        ${repSectionHtml}

                        <!-- SOCIAL PROOF BAR -->
                        <tr>
                            <td style="padding: 0 50px 40px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td width="33%" align="center" class="mobile-stack" style="padding: 20px 10px; border-right: 1px solid #f0f2f5;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #1c252e;">450+</p>
                                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Projekte</p>
                                        </td>
                                        <td width="33%" align="center" class="mobile-stack" style="padding: 20px 10px; border-right: 1px solid #f0f2f5;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #1c252e;">5 J.</p>
                                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Garantie</p>
                                        </td>
                                        <td width="33%" align="center" class="mobile-stack mobile-stack-last" style="padding: 20px 10px;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #1c252e;">100%</p>
                                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Aluminium</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- FREE CONSULTATION -->
                        <tr>
                            <td class="content-padding" style="padding: 0 40px 40px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(22,163,74,0.2);">
                                    <tr>
                                        <td align="center" style="padding: 40px; background: linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%);">
                                            <p style="margin: 0 0 8px; font-size: 32px;">📐</p>
                                            <p style="margin: 0 0 8px; font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Nächster Schritt</p>
                                            <p style="margin: 0 0 20px; font-size: 20px; color: #ffffff; font-weight: 700; line-height: 28px;">Kostenlose Beratung &<br>Aufmaß vor Ort</p>
                                            <p style="margin: 0 0 20px; font-size: 14px; color: rgba(255,255,255,0.85); line-height: 22px;">Unser Experte kommt zu Ihnen — <strong style="color:#fff;">kostenlos und unverbindlich.</strong><br>Wir vermessen, beraten individuell und beantworten alle Fragen.</p>
                                            <a href="tel:${repPhone || '+4935615019981'}" target="_blank" style="display: inline-block; padding: 16px 40px; background-color: #ffffff; color: #16a34a; font-size: 16px; font-weight: 800; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">📞 Jetzt Termin vereinbaren</a>
                                            <p style="margin: 15px 0 0; font-size: 12px; color: rgba(255,255,255,0.65);">${repPhone || '03561 501 9981'} • Unverbindlich</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- WHAT HAPPENS NEXT -->
                        <tr>
                            <td class="content-padding" style="padding: 0 60px 50px 60px;">
                                <div style="border-top: 1px solid #f0f2f5; padding-top: 40px;">
                                    <h3 style="margin: 0 0 25px 0; font-size: 14px; color: #e67e22; text-transform: uppercase; letter-spacing: 3px; font-weight: 800; text-align: center;">So geht es weiter</h3>

                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td style="padding-bottom: 18px;">
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                    <tr>
                                                        <td width="46" valign="top" style="padding-top: 2px;">
                                                            <div style="width: 34px; height: 34px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 50%; text-align: center; line-height: 34px; font-weight: 700; color: #ffffff; font-size: 15px;">1</div>
                                                        </td>
                                                        <td style="padding-left: 10px;">
                                                            <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1c252e;">Angebot ansehen</p>
                                                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">Klicken Sie oben auf den Button und prüfen Sie Ihr <strong>individuelles Angebot</strong> in Ruhe.</p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-bottom: 18px;">
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                    <tr>
                                                        <td width="46" valign="top" style="padding-top: 2px;">
                                                            <div style="width: 34px; height: 34px; background-color: #eef2ff; border-radius: 50%; text-align: center; line-height: 34px; font-weight: 700; color: #4f46e5; font-size: 15px;">2</div>
                                                        </td>
                                                        <td style="padding-left: 10px;">
                                                            <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1c252e;">Kostenloser Vor-Ort-Termin</p>
                                                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">Wir kommen zu Ihnen nach Hause für eine <strong>persönliche Beratung und präzises Aufmaß.</strong></p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                    <tr>
                                                        <td width="46" valign="top" style="padding-top: 2px;">
                                                            <div style="width: 34px; height: 34px; background-color: #dcfce7; border-radius: 50%; text-align: center; line-height: 34px; font-weight: 700; color: #16a34a; font-size: 15px;">3</div>
                                                        </td>
                                                        <td style="padding-left: 10px;">
                                                            <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1c252e;">Produktion & Montage</p>
                                                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">Ihre Überdachung wird maßgefertigt produziert und <strong>fachgerecht bei Ihnen montiert.</strong></p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </td>
                        </tr>

                        <!-- TRUST USPs -->
                        <tr>
                            <td class="content-padding" style="padding: 0 50px 60px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1c252e; color: #ffffff; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                                    <tr>
                                        <td style="padding: 50px;" class="content-padding">
                                            <h3 style="margin: 0 0 30px 0; font-size: 16px; color: #e67e22; text-transform: uppercase; letter-spacing: 3px; font-weight: 800; text-align: center;">Polendach24 Excellence</h3>
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="padding-bottom: 25px; font-size: 16px; line-height: 26px;">
                                                        <span style="color: #e67e22; font-weight: bold; margin-right: 15px; font-size: 20px;">◈</span> <strong>Statik inklusive:</strong> Jedes Projekt mit individueller statischer Berechnung.
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-bottom: 25px; font-size: 16px; line-height: 26px;">
                                                        <span style="color: #e67e22; font-weight: bold; margin-right: 15px; font-size: 20px;">◈</span> <strong>Premium Aluminium:</strong> Pulverbeschichtet, witterungsbeständig, wartungsfrei.
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-size: 16px; line-height: 26px;">
                                                        <span style="color: #e67e22; font-weight: bold; margin-right: 15px; font-size: 20px;">◈</span> <strong>Full Service:</strong> Von der Beratung über Produktion bis zur fachgerechten Montage.
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- CUSTOMER REVIEWS -->
                        <tr>
                            <td class="content-padding" style="padding: 0 50px 50px 50px;">
                                <h3 style="margin: 0 0 20px 0; font-size: 14px; color: #e67e22; text-transform: uppercase; letter-spacing: 3px; font-weight: 800; text-align: center;">Das sagen unsere Kunden</h3>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                                    <tr>
                                        <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                                            <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1c252e;">Thomas M. — Berlin</p>
                                            <p style="margin: 0 0 8px; color: #f59e0b; font-size: 14px; letter-spacing: 2px;">★★★★★</p>
                                            <p style="margin: 0; font-style: italic; color: #475569; font-size: 14px; line-height: 22px;">"Sehr schnelle und professionelle Abwicklung. Das Dach sieht fantastisch aus und die Qualität ist top!"</p>
                                        </td>
                                    </tr>
                                </table>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                                            <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1c252e;">Sandra K. — Cottbus</p>
                                            <p style="margin: 0 0 8px; color: #f59e0b; font-size: 14px; letter-spacing: 2px;">★★★★★</p>
                                            <p style="margin: 0; font-style: italic; color: #475569; font-size: 14px; line-height: 22px;">"Von der Beratung bis zur Montage alles perfekt. Unser Terrassendach hat die Qualität unseres Gartens komplett verändert."</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td style="background-color: #1a202c; padding: 70px 50px; color: #ffffff;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding-bottom: 40px;">
                                            <p style="margin: 0 0 10px 0; font-size: 18px; letter-spacing: 5px; font-weight: 300; text-transform: uppercase;">POLENDACH24 S.C.</p>
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8; letter-spacing: 1px;">
                                                Geschäftsführung: Tomasz Fijołek, Mariusz Duź
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td width="50%" class="mobile-stack mobile-center" valign="top" style="padding: 0 20px;">
                                                        <p style="margin: 0 0 15px 0; font-size: 13px; font-weight: 700; color: #e67e22; text-transform: uppercase;">Kontakt & Sitz</p>
                                                        <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 22px; color: #cbd5e1;">
                                                            Kolonia Wałowice dz. nr 221/33<br>
                                                            66-620 Gubin, Polska / Polen
                                                        </p>
                                                        <p style="margin: 0 0 5px 0; font-size: 13px; color: #cbd5e1;">
                                                            Steuernummer: PL9261695520
                                                        </p>
                                                        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
                                                            E-Mail: <a href="mailto:buero@polendach24.de" style="color: #ffffff; text-decoration: none;">buero@polendach24.de</a>
                                                        </p>
                                                        <p style="margin: 10px 0 0 0; font-size: 13px; color: #cbd5e1;">
                                                            Zentrale: +49 3561 501 9981 / 82
                                                        </p>
                                                    </td>
                                                    <td width="50%" class="mobile-stack mobile-stack-last mobile-center" valign="top" style="padding: 0 20px;">
                                                        <p style="margin: 0 0 15px 0; font-size: 13px; font-weight: 700; color: #e67e22; text-transform: uppercase;">Bankverbindung</p>
                                                        <p style="margin: 0 0 5px 0; font-size: 13px; line-height: 22px; color: #cbd5e1;">
                                                            <strong>Bank:</strong> SPARKASSE
                                                        </p>
                                                        <p style="margin: 0 0 5px 0; font-size: 13px; color: #cbd5e1;">
                                                            <strong>IBAN:</strong> DE79 1805 0000 0190 1228 89
                                                        </p>
                                                        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
                                                            <strong>SWIFT/BIC:</strong> WELADED1CBN
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 50px;">
                                            <a href="https://www.polendach24.de" style="color: #ffffff; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Website: www.polendach24.de</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>

                    <!-- BOTTOM COPYRIGHT -->
                    <table border="0" cellpadding="0" cellspacing="0" width="650" class="container">
                        <tr>
                            <td align="center" style="padding: 40px; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 3px;">
                                &copy; ${new Date().getFullYear()} Polendach24 S.C. All rights reserved. Precision Outdoor Architecture.
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>
    </center>
</body>
</html>`;
};
