/**
 * Lead Sales Email Template (German)
 * Sent after initial contact — confirms snow zone check, mentions structural calculation,
 * and promises a sales rep will contact the customer.
 */
export function generateLeadSalesEmailHtml(params: {
    customerName?: string;
    postalCode?: string;
    snowZone?: string;
    snowLoad?: string;
    configuratorUrl?: string;
}): string {
    const { customerName = 'Kunde', postalCode = '', snowZone = '', snowLoad = '', configuratorUrl = '' } = params;

    const snowZoneInfo = snowZone
        ? `<tr>
            <td style="padding: 30px; background: linear-gradient(135deg, #1c3a5f 0%, #1c252e 100%); border-radius: 8px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="center" style="padding-bottom: 15px;">
                            <span style="font-size: 32px;">❄️</span>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 8px;">
                            <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Schneelastzone für PLZ ${postalCode}</span>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 5px;">
                            <span style="font-size: 28px; font-weight: 700; color: #ffffff;">Zone ${snowZone}</span>
                        </td>
                    </tr>
                    ${snowLoad ? `<tr>
                        <td align="center">
                            <span style="font-size: 14px; color: #93c5fd;">Schneelast: ${snowLoad} kN/m²</span>
                        </td>
                    </tr>` : ''}
                </table>
            </td>
        </tr>
        <tr><td style="height: 30px;"></td></tr>`
        : '';

    const configuratorButton = configuratorUrl
        ? `<tr>
            <td style="padding: 10px 40px 40px 40px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(234,88,12,0.25);">
                    <tr>
                        <td align="center" style="padding: 45px 40px; background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%);">
                            <p style="margin: 0 0 8px 0; font-size: 32px;">🏠</p>
                            <p style="margin: 0 0 8px 0; font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Ihr nächster Schritt</p>
                            <p style="margin: 0 0 25px 0; font-size: 22px; color: #ffffff; font-weight: 700; line-height: 30px;">Konfigurieren Sie jetzt Ihre<br>Wunsch-Überdachung</p>
                            <p style="margin: 0 0 25px 0; font-size: 14px; color: rgba(255,255,255,0.85); line-height: 22px;">Wählen Sie Modell, Maße, Verglasung und Extras —<br>wir erstellen Ihnen daraufhin ein <strong style="color:#fff;">individuelles Angebot.</strong></p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 14px 20px; background-color: rgba(255,255,255,0.15); border-radius: 8px; border-left: 4px solid #fef2f2;">
                                        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #ffffff;"><span style="color: #fca5a5; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">⚠ Wichtig:</span> Bitte füllen Sie das Formular möglichst vollständig aus — das beschleunigt den Angebotsprozess erheblich und ermöglicht uns, schneller zu Ihnen vor Ort zu kommen für <strong style="color:#fff;">Aufmaß und persönliche Beratung.</strong></p>
                                    </td>
                                </tr>
                            </table>
                            <a href="${configuratorUrl}" target="_blank" style="display: inline-block; padding: 18px 50px; background-color: #ffffff; color: #ea580c; font-size: 17px; font-weight: 800; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">➜ Jetzt konfigurieren</a>
                            <p style="margin: 15px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.65);">Dauert nur ca. 3 Minuten • Kostenlos & unverbindlich</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`
        : '';

    return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Ihr Projekt mit Polendach24</title>
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
        Vielen Dank für Ihre Anfrage! Wir prüfen Ihr Projekt und melden uns in Kürze bei Ihnen.
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
                                <h2 style="margin: 0 0 15px 0; font-size: 12px; color: #e67e22; letter-spacing: 4px; text-transform: uppercase; font-weight: 800; text-align: center;">Projektbestätigung</h2>
                                <h1 class="hero-title" style="margin: 0 0 30px 0; font-size: 34px; line-height: 42px; color: #1c252e; font-weight: 300; text-align: center; letter-spacing: -1px;">
                                    Willkommen bei<br><span style="font-weight: 700;">Polendach24.</span>
                                </h1>

                                <p style="margin: 0 0 20px 0; font-size: 17px; line-height: 28px; color: #4a5568; text-align: center;">
                                    Sehr geehrte/r ${customerName},
                                </p>
                                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 28px; color: #4a5568; text-align: center;">
                                    herzlichen Dank für Ihr Interesse an einer <strong>Premium-Aluminium&shy;überdachung</strong> von Polendach24. Wir freuen uns, Sie auf dem Weg zu Ihrem Traum-Projekt begleiten zu dürfen.
                                </p>
                                <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 28px; color: #4a5568; text-align: center;">
                                    Wir haben Ihren Standort geprüft und die relevante <strong>Schneelastzone</strong> ermittelt – für die statische Sicherheit Ihrer Überdachung:
                                </p>
                            </td>
                        </tr>

                        <!-- SNOW ZONE INFO -->
                        <tr>
                            <td class="content-padding" style="padding: 0 60px 20px 60px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    ${snowZoneInfo}
                                </table>
                            </td>
                        </tr>

                        <!-- ★★★ CONFIGURATOR CTA — PRIMARY ACTION ★★★ -->
                        ${configuratorButton}

                        <!-- SOCIAL PROOF BAR -->
                        <tr>
                            <td style="padding: 0 50px 40px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td width="33%" align="center" style="padding: 20px 10px; border-right: 1px solid #f0f2f5;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #1c252e;">450+</p>
                                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Projekte</p>
                                        </td>
                                        <td width="33%" align="center" style="padding: 20px 10px; border-right: 1px solid #f0f2f5;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #1c252e;">5 J.</p>
                                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Garantie</p>
                                        </td>
                                        <td width="33%" align="center" style="padding: 20px 10px;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #1c252e;">100%</p>
                                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Aluminium</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- WHAT HAPPENS NEXT — simplified -->
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
                                                            <div style="width: 34px; height: 34px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 50%; text-align: center; line-height: 34px; font-weight: 700; color: #ffffff; font-size: 15px;">1</div>
                                                        </td>
                                                        <td style="padding-left: 10px;">
                                                            <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1c252e;">Konfigurieren Sie Ihr Wunsch-Dach</p>
                                                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">Klicken Sie oben auf den Button und geben Sie Ihre Wünsche ein – Modell, Maße, Verglasung. <strong>Nur 3 Minuten.</strong></p>
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
                                                            <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1c252e;">Statik & individuelles Angebot</p>
                                                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">Unsere Ingenieure erstellen eine präzise statische Berechnung und ein maßgeschneidertes Angebot für Sie.</p>
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
                                                            <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1c252e;">Persönliche Beratung</p>
                                                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">Ihr persönlicher Projektberater meldet sich, um Details zu besprechen und alle Fragen zu beantworten.</p>
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

                        <!-- TEAM SECTION — 2×2 mobile-safe grid -->
                        <tr>
                            <td class="content-padding" style="padding: 0 40px 50px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f0f2f5; padding-top: 40px;">
                                    <tr>
                                        <td align="center" style="padding-bottom: 30px;">
                                            <h3 style="margin: 0; font-size: 20px; color: #1c252e; font-weight: 700;">Ihre Projektberater</h3>
                                            <p style="margin: 8px 0 0; font-size: 13px; color: #94a3b8;">Rufen Sie uns direkt an – wir beraten Sie persönlich & unverbindlich:</p>
                                        </td>
                                    </tr>
                                    <!-- Row 1: Oliwia + Mike -->
                                    <tr>
                                        <td>
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                                                <tr>
                                                    <td width="50%" align="center" valign="top" style="padding: 4px;">
                                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 10px;">
                                                            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #e67e22, #f59e0b); margin: 0 auto 8px; line-height: 44px; font-size: 16px; font-weight: 800; color: #fff;">OD</div>
                                                            <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1c252e;">Oliwia Duz</p>
                                                            <p style="margin: 0 0 8px; font-size: 10px; color: #e67e22; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Vertrieb & Beratung</p>
                                                            <a href="tel:+491626692445" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0162 669 2445</a>
                                                            <p style="margin: 6px 0 0; font-size: 11px;"><a href="mailto:o.duz@polendach24.de" style="color: #64748b; text-decoration: none;">o.duz@polendach24.de</a></p>
                                                        </div>
                                                    </td>
                                                    <td width="50%" align="center" valign="top" style="padding: 4px;">
                                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 10px;">
                                                            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #e67e22, #f59e0b); margin: 0 auto 8px; line-height: 44px; font-size: 16px; font-weight: 800; color: #fff;">ML</div>
                                                            <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1c252e;">Mike Ledwin</p>
                                                            <p style="margin: 0 0 8px; font-size: 10px; color: #e67e22; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Vertrieb & Beratung</p>
                                                            <a href="tel:+4915257487430" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0152 5748 7430</a>
                                                            <p style="margin: 6px 0 0; font-size: 11px;"><a href="mailto:m.ledwin@polendach24.de" style="color: #64748b; text-decoration: none;">m.ledwin@polendach24.de</a></p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- Row 2: Hubert + Artur -->
                                    <tr>
                                        <td>
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                                                <tr>
                                                    <td width="50%" align="center" valign="top" style="padding: 4px;">
                                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 10px;">
                                                            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #e67e22, #f59e0b); margin: 0 auto 8px; line-height: 44px; font-size: 16px; font-weight: 800; color: #fff;">HK</div>
                                                            <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1c252e;">Hubert Kosciow</p>
                                                            <p style="margin: 0 0 8px; font-size: 10px; color: #e67e22; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Vertrieb & Beratung</p>
                                                            <a href="tel:+48669558015" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 +48 669 558 015</a>
                                                            <p style="margin: 6px 0 0; font-size: 11px;"><a href="mailto:h.kosciow@polendach24.de" style="color: #64748b; text-decoration: none;">h.kosciow@polendach24.de</a></p>
                                                        </div>
                                                    </td>
                                                    <td width="50%" align="center" valign="top" style="padding: 4px;">
                                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 10px;">
                                                            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #e67e22, #f59e0b); margin: 0 auto 8px; line-height: 44px; font-size: 16px; font-weight: 800; color: #fff;">AN</div>
                                                            <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1c252e;">Artur Nagorny</p>
                                                            <p style="margin: 0 0 8px; font-size: 10px; color: #e67e22; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Vertrieb & Beratung</p>
                                                            <a href="tel:+4915258715652" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">📞 0152 5871 5652</a>
                                                            <p style="margin: 6px 0 0; font-size: 11px;"><a href="mailto:buero@polendach24.de" style="color: #64748b; text-decoration: none;">buero@polendach24.de</a></p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Oder schreiben Sie uns: <a href="mailto:buero@polendach24.de" style="color: #e67e22; text-decoration: none; font-weight: 700;">buero@polendach24.de</a></p>
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
                                &copy; 2026 Polendach24 S.C. All rights reserved. Precision Outdoor Architecture.
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>
    </center>
</body>
</html>`;
}

/**
 * Simple snow zone lookup based on German postal code first 2 digits.
 * Source: DIN EN 1991-1-3 / NA simplified zones.
 * Returns zone + characteristic snow load.
 */
export function getSnowZoneByPostalCode(postalCode: string): { zone: string; load: string } | null {
    if (!postalCode || postalCode.length < 2) return null;
    const prefix = postalCode.substring(0, 2);
    const num = parseInt(prefix, 10);

    // Simplified German snow zone mapping by PLZ prefix
    // Zone 1: ~0.65 kN/m², Zone 2: ~0.85 kN/m², Zone 3: ~1.10 kN/m²
    // Zone 2a: ~1.25 kN/m², Zone 3a: ~2.00 kN/m²
    const zoneMap: Record<number, { zone: string; load: string }> = {
        // Northern plains (Zone 1)
        20: { zone: '1', load: '0.65' }, 21: { zone: '1', load: '0.65' }, 22: { zone: '1', load: '0.65' }, 23: { zone: '1', load: '0.65' }, 24: { zone: '1', load: '0.65' }, 25: { zone: '1', load: '0.65' },
        26: { zone: '1', load: '0.65' }, 27: { zone: '1', load: '0.65' }, 28: { zone: '1', load: '0.65' }, 29: { zone: '1', load: '0.65' },
        // Hamburg, Bremen area
        19: { zone: '1', load: '0.65' }, 18: { zone: '1', load: '0.65' }, 17: { zone: '1', load: '0.65' },
        // Lower Saxony / NRW north
        30: { zone: '1', load: '0.65' }, 31: { zone: '2', load: '0.85' }, 32: { zone: '2', load: '0.85' }, 33: { zone: '2', load: '0.85' },
        34: { zone: '2', load: '0.85' }, 35: { zone: '2', load: '0.85' }, 36: { zone: '2', load: '0.85' }, 37: { zone: '2', load: '0.85' },
        38: { zone: '2', load: '0.85' }, 39: { zone: '2', load: '0.85' },
        // NRW (mostly Zone 1-2)
        40: { zone: '1', load: '0.65' }, 41: { zone: '1', load: '0.65' }, 42: { zone: '1', load: '0.65' }, 43: { zone: '1', load: '0.65' },
        44: { zone: '1', load: '0.65' }, 45: { zone: '1', load: '0.65' }, 46: { zone: '1', load: '0.65' }, 47: { zone: '1', load: '0.65' },
        48: { zone: '1', load: '0.65' }, 49: { zone: '1', load: '0.65' },
        // Rhineland-Palatinate / Saarland
        50: { zone: '1', load: '0.65' }, 51: { zone: '1', load: '0.65' }, 52: { zone: '1', load: '0.65' }, 53: { zone: '1', load: '0.65' },
        54: { zone: '2', load: '0.85' }, 55: { zone: '1', load: '0.65' }, 56: { zone: '1', load: '0.65' }, 57: { zone: '2', load: '0.85' },
        58: { zone: '2', load: '0.85' }, 59: { zone: '1', load: '0.65' },
        // Hessen / Central
        60: { zone: '1', load: '0.65' }, 61: { zone: '2', load: '0.85' }, 62: { zone: '1', load: '0.65' }, 63: { zone: '1', load: '0.65' },
        64: { zone: '1', load: '0.65' }, 65: { zone: '1', load: '0.65' },
        // Brandenburg / Berlin (mostly Zone 2)
        10: { zone: '2', load: '0.85' }, 11: { zone: '2', load: '0.85' }, 12: { zone: '2', load: '0.85' }, 13: { zone: '2', load: '0.85' },
        14: { zone: '2', load: '0.85' }, 15: { zone: '2', load: '0.85' }, 16: { zone: '2', load: '0.85' },
        // Saxony-Anhalt
        66: { zone: '2', load: '0.85' }, 67: { zone: '1', load: '0.65' }, 68: { zone: '1', load: '0.65' }, 69: { zone: '1', load: '0.65' },
        // Baden-Württemberg
        70: { zone: '1', load: '0.65' }, 71: { zone: '2', load: '0.85' }, 72: { zone: '2', load: '0.85' }, 73: { zone: '2', load: '0.85' },
        74: { zone: '2', load: '0.85' }, 75: { zone: '2', load: '0.85' }, 76: { zone: '1', load: '0.65' }, 77: { zone: '2', load: '0.85' },
        78: { zone: '2', load: '0.85' }, 79: { zone: '2a', load: '1.25' },
        // Bavaria
        80: { zone: '2', load: '0.85' }, 81: { zone: '2', load: '0.85' }, 82: { zone: '2a', load: '1.25' }, 83: { zone: '3', load: '1.10' },
        84: { zone: '2', load: '0.85' }, 85: { zone: '2', load: '0.85' }, 86: { zone: '2', load: '0.85' }, 87: { zone: '3', load: '1.10' },
        88: { zone: '2a', load: '1.25' }, 89: { zone: '2', load: '0.85' },
        // Thuringia / Saxony
        90: { zone: '2', load: '0.85' }, 91: { zone: '2', load: '0.85' }, 92: { zone: '2', load: '0.85' }, 93: { zone: '2', load: '0.85' },
        94: { zone: '3', load: '1.10' }, 95: { zone: '2', load: '0.85' }, 96: { zone: '2', load: '0.85' }, 97: { zone: '2', load: '0.85' },
        98: { zone: '2', load: '0.85' }, 99: { zone: '2', load: '0.85' },
        // Mecklenburg / Former East
        // 01-09 (Leipzig, Dresden, Chemnitz area)
        1: { zone: '2', load: '0.85' }, 2: { zone: '2', load: '0.85' }, 3: { zone: '2', load: '0.85' }, 4: { zone: '2', load: '0.85' },
        5: { zone: '2', load: '0.85' }, 6: { zone: '2', load: '0.85' }, 7: { zone: '2', load: '0.85' }, 8: { zone: '2', load: '0.85' },
        9: { zone: '2', load: '0.85' },
    };

    return zoneMap[num] || { zone: '2', load: '0.85' }; // Default Zone 2 if not found
}
