export const getOfferEmailHtml = (offerLinks: { number: string, url: string }[]) => {
    const isMultiple = offerLinks.length > 1;
    const title = isMultiple ? 'Ihre Angebote von PolenDach24' : 'Ihr Angebot von PolenDach24';
    const numbersString = offerLinks.map(o => o.number).join(', ');

    // Template content
    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        /* Reset i podstawy */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f3f4f6; }
        
        /* Kolorystyka PolenDach24 */
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
        .main-content { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; }
        
        /* Przycisk CTA */
        .cta-button { 
            background-color: #3b82f6; 
            border: 1px solid #3b82f6;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 18px; 
            text-decoration: none; 
            padding: 16px 40px; 
            color: #ffffff; 
            display: inline-block; 
            border-radius: 50px; 
            font-weight: bold; 
            text-transform: uppercase;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
            margin: 10px 0;
        }

        /* Responsywność */
        @media screen and (max-width: 600px) {
            .two-column { width: 100% !important; max-width: 100% !important; display: block; }
            .mobile-center { text-align: center !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .img-max { width: 100% !important; height: auto !important; }
            .header-text { padding-top: 15px !important; text-align: center !important; }
        }
    </style>
</head>
<body>

    <center class="wrapper">
        <table class="main-content" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            
            <!-- HEADER -->
            <tr>
                <td style="background-color: #1a1a1a; padding: 30px 0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <!-- Logo -->
                            <td class="two-column mobile-center" width="50%" style="padding: 0 30px; vertical-align: middle;">
                                <img src="https://polendach24.de/wp-content/uploads/2021/03/logo-polendach24-white.png" alt="PolenDach24" width="200" style="display: block; border: 0;">
                            </td>
                            <!-- Slogan -->
                            <td class="two-column header-text" width="50%" style="padding: 0 30px; vertical-align: middle; text-align: right; font-size: 14px; line-height: 1.4; color: #d1d5db;">
                                Design und Komfort<br>
                                <span style="color: #3b82f6; font-weight: bold;">für Ihr Zuhause.</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- HERO SECTION -->
            <tr>
                <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0 0 20px; font-size: 26px; color: #111827; letter-spacing: -0.5px;">
                        ${isMultiple ? 'Ihre persönlichen Angebote sind fertig' : 'Ihr persönliches Angebot ist fertig'}
                    </h1>
                    <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                        Sehr geehrte Damen und Herren,<br><br>
                        vielen Dank für Ihr Interesse an unseren Produkten. Basierend auf Ihren Wünschen haben wir ${isMultiple ? 'individuelle Kalkulationen' : 'eine individuelle Kalkulation'} <strong>(Nr. ${numbersString})</strong> für Ihre neue Terrassenüberdachung erstellt. <br><br>
                        Wir setzen auf höchste Qualität, modernes Design und Langlebigkeit – damit Sie viele Jahre Freude an Ihrem Garten haben.
                    </p>

                    <!-- CTA SECTION -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px;">
                        <tr>
                            <td align="center" style="padding: 35px;">
                                <p style="margin: 0 0 20px; font-weight: bold; color: #1e40af; font-size: 18px;">Exklusiv für Sie vorbereitet:</p>
                                
                                <table border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center">
                                            ${offerLinks.map(link => {
        if (link.url && link.url !== '#') {
            return `
                <a href="${link.url}" target="_blank" class="cta-button">Angebot ${link.number} ansehen</a><br>
                <p style="margin-top: 5px; font-size: 13px; color: #6b7280;">Oder über diesen Link öffnen: <a href="${link.url}" style="color: #3b82f6;">${link.url}</a></p>
                <br>
                `;
        } else {
            return `
            <div style="background-color: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                <p style="margin: 0; color: #0369a1; font-weight: bold; font-size: 16px;">
                    📄 Angebot ${link.number}
                </p>
                <p style="margin: 5px 0 0 0; color: #0c4a6e; font-size: 13px;">
                    Bitte öffnen Sie die beigefügte PDF-Datei.
                </p>
            </div>
            `;
        }
    }).join('')}
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">Das detaillierte Angebot finden Sie im Anhang dieser E-Mail.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- REALIZACJE -->
            <tr>
                <td style="padding: 30px 20px; background-color: #fafafa; border-top: 1px solid #f3f4f6;">
                    <h3 style="text-align: center; margin: 0 0 30px; color: #111827; font-size: 22px;">Unsere neuesten Projekte</h3>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td class="two-column" width="50%" style="padding: 0 10px 20px 10px; vertical-align: top;">
                                <img src="https://images.unsplash.com/photo-1623157390772-2d334b220c5c?auto=format&fit=crop&w=280&h=200&q=80" alt="Terrassenüberdachung Modern" width="280" class="img-max" style="width: 100%; max-width: 280px; height:auto; border-radius: 8px; display: block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            </td>
                            <td class="two-column" width="50%" style="padding: 0 10px 20px 10px; vertical-align: top;">
                                <img src="https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=280&h=200&q=80" alt="Aluminium Konstruktion" width="280" class="img-max" style="width: 100%; max-width: 280px; height:auto; border-radius: 8px; display: block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- OPINIE -->
            <tr>
                <td style="padding: 40px 20px; background-color: #ffffff;">
                    <h3 style="text-align: center; margin: 0 0 30px; color: #111827;">Das sagen unsere Kunden</h3>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                            <td style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
                                <table width="100%">
                                    <tr>
                                        <td width="30" style="vertical-align: top; padding-right: 15px;">
                                            <span style="font-size: 24px;">G</span>
                                        </td>
                                        <td>
                                            <div style="font-size: 14px; font-weight: bold; color: #111827;">Thomas M.</div>
                                            <div style="color: #fbbf24; font-size: 14px; margin: 3px 0;">★★★★★</div>
                                            <div style="font-style: italic; color: #4b5563; margin-top: 8px; font-size: 14px; line-height: 1.5;">
                                                "Sehr schnelle und professionelle Abwicklung. Das Dach sieht fantastisch aus und die Qualität ist top. Klare Weiterempfehlung!"
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- USP -->
            <tr>
                <td style="background-color: #1a1a1a; color: #ffffff; padding: 50px 30px; text-align: center;">
                    <h2 style="margin: 0 0 20px; font-size: 24px;">Warum PolenDach24?</h2>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; max-width: 480px; margin-left: auto; margin-right: auto;">
                        <tr>
                            <td style="padding-bottom: 15px; font-size: 16px; border-bottom: 1px solid #333;">
                                <span style="color: #3b82f6; margin-right: 10px;">✔</span> <strong>Top-Qualität</strong> zu fairen Preisen
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 15px 0; font-size: 16px; border-bottom: 1px solid #333;">
                                <span style="color: #3b82f6; margin-right: 10px;">✔</span> <strong>Komplett-Service</strong> inkl. Montage
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-top: 15px; font-size: 16px;">
                                <span style="color: #3b82f6; margin-right: 10px;">✔</span> <strong>Persönliche Beratung</strong> vor Ort
                            </td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 40px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #9ca3af;">Haben Sie noch Fragen? Rufen Sie uns an:</p>
                        <a href="tel:+4935615019981" style="display: inline-block; color: #ffffff; font-weight: bold; text-decoration: none; font-size: 22px; background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px;">
                            📞 +49 356 150 199 81
                        </a>
                        <p style="margin-top: 15px; font-size: 14px;">
                            <a href="https://polendach24.de" style="color: #3b82f6; text-decoration: none;">www.polendach24.de</a>
                        </p>
                    </div>
                </td>
            </tr>

            <!-- FOOTER -->
            <tr>
                <td style="padding: 40px 30px; text-align: center; font-size: 12px; color: #6b7280; background-color: #f3f4f6; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 15px; font-weight: bold; color: #374151; font-size: 14px;">
                        Polendach24 s.c.
                    </p>
                    <p style="margin: 0 0 15px; line-height: 1.6;">
                        Inhaber: Tomasz Fijołek, Mariusz Duź<br>
                        Kolonia Wałowice 223/33<br>
                        66-620 Gubin, Polen
                    </p>
                    <p style="margin: 0;">
                        Tel: +49 356 150 199 81 | Web: <a href="https://polendach24.de" style="color: #3b82f6; text-decoration: none;">polendach24.de</a>
                    </p>
                    <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
                        &copy; ${new Date().getFullYear()} PolenDach24. Alle Rechte vorbehalten.
                    </p>
                </td>
            </tr>

        </table>
    </center>

</body>
</html>
    `;
};
