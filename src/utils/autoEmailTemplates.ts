/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KOPIE szablonów e-mail wysyłanych AUTOMATYCZNIE przez backend — TYLKO DO PODGLĄDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * UWAGA: Ten plik NIE jest źródłem prawdy. Źródłem prawdy jest kod backendu:
 *
 *   1. Follow-up DE po imporcie leada z maila:
 *      supabase/functions/scan-emails/index.ts, linie ~452-490 (followUpHtml)
 *
 *   2. Follow-up PL po formularzu zadaszto.pl:
 *      supabase/functions/website-lead-pl/index.ts, linie ~142-191 (followUpHtml)
 *
 *   3. Główny mail z ofertą agenta wycen (DE):
 *      scripts/pricing-worker.ts, linie ~1033-1211 (emailHtml)
 *
 *   4. Krótki mail "retry" agenta wycen (recovery zawieszonych ofert):
 *      scripts/pricing-worker.ts, linie ~627-628
 *
 * Jeśli zmieniasz HTML w którymkolwiek z powyższych plików — zaktualizuj
 * również kopię tutaj, inaczej podgląd w galerii rozjedzie się z tym,
 * co realnie dostaje klient.
 *
 * Zmienne (${...}) z oryginałów zostały zastąpione przykładowymi wartościami
 * (np. "Max Mustermann", numer oferty "PD24-0123").
 */

export interface AutoEmailTemplate {
    id: string;
    name: string;
    language: 'de' | 'pl';
    trigger: string;
    status: 'auto';
    subject: string;
    html: string;
}

export const autoEmailTemplates: AutoEmailTemplate[] = [
    // ───────────────────────────────────────────────────────────────────────
    // 1. Follow-up DE — scan-emails (lead z maila przychodzącego)
    //    Źródło: supabase/functions/scan-emails/index.ts ~452-490
    //    Przykładowe wartości: clientName = "Max Mustermann", smtpUser = "buero@polendach24.de"
    // ───────────────────────────────────────────────────────────────────────
    {
        id: 'auto_scan_emails_followup_de',
        name: 'Follow-up po imporcie leada z maila (DE)',
        language: 'de',
        trigger: 'Automatycznie: Edge Function scan-emails — po sklasyfikowaniu maila przychodzącego przez AI jako lead i zapisaniu go w tabeli leads (wysyłka SMTP na adres nadawcy)',
        status: 'auto',
        subject: 'Vielen Dank für Ihre Anfrage — Max Mustermann! | Polendach24',
        html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Polendach24</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Premium Terrassenüberdachungen</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Vielen Dank für Ihre Anfrage, Max Mustermann!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;font-size:15px;">
        Wir haben Ihre Anfrage erhalten und an unseren zuständigen Berater weitergeleitet.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#166534;margin:0;font-size:14px;font-weight:600;">✅ Wie geht es weiter?</p>
        <p style="color:#166534;margin:8px 0 0;font-size:14px;line-height:1.6;">
          Unser Berater wird sich <strong>innerhalb von 24 Stunden</strong> bei Ihnen melden, um die Details zu besprechen und ein unverbindliches Angebot zu erstellen.
        </p>
      </div>
      <p style="color:#475569;line-height:1.7;margin:24px 0 16px;font-size:15px;">
        In der Zwischenzeit laden wir Sie ein, unsere Produkte auf
        <a href="https://polendach24.de" style="color:#2563eb;text-decoration:none;font-weight:600;">polendach24.de</a> zu entdecken.
      </p>
      <p style="color:#475569;line-height:1.7;margin:0;font-size:15px;">
        Bei weiteren Fragen antworten Sie einfach auf diese E-Mail — wir helfen Ihnen gerne!
      </p>
    </div>
    <div style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;margin:0;font-size:13px;line-height:1.6;">
        Mit freundlichen Grüßen,<br>
        <strong style="color:#334155;">Ihr Polendach24 Team</strong><br>
        Polendach24 GmbH<br>
        <a href="mailto:buero@polendach24.de" style="color:#2563eb;text-decoration:none;">buero@polendach24.de</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    },

    // ───────────────────────────────────────────────────────────────────────
    // 2. Follow-up PL — website-lead-pl (formularz na zadaszto.pl)
    //    Źródło: supabase/functions/website-lead-pl/index.ts ~142-191
    //    Przykładowe wartości: clientName = "Jan", smtpUser = "buero@polendach24.de"
    // ───────────────────────────────────────────────────────────────────────
    {
        id: 'auto_website_lead_pl_followup',
        name: 'Follow-up po formularzu zadaszto.pl (PL)',
        language: 'pl',
        trigger: 'Automatycznie: Edge Function website-lead-pl — natychmiast po zapisaniu leada z formularza kontaktowego na stronie zadaszto.pl (wysyłka SMTP)',
        status: 'auto',
        subject: 'Dziękujemy za zapytanie — Jan! | Zadaszto.pl',
        html: `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Zadaszto.pl</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Premium Zadaszenia Tarasowe</p>
    </div>

    <!-- Content -->
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Dziękujemy za zainteresowanie, Jan!</h2>

      <p style="color:#475569;line-height:1.7;margin:0 0 16px;font-size:15px;">
        Twoje zapytanie zostało zarejestrowane w naszym systemie i przekazane do odpowiedniego doradcy.
      </p>

      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#166534;margin:0;font-size:14px;font-weight:600;">✅ Co dalej?</p>
        <p style="color:#166534;margin:8px 0 0;font-size:14px;line-height:1.6;">
          Nasz doradca skontaktuje się z Tobą <strong>w ciągu 24 godzin</strong>, aby omówić szczegóły i przygotować wstępną wycenę.
        </p>
      </div>

      <p style="color:#475569;line-height:1.7;margin:24px 0 16px;font-size:15px;">
        W międzyczasie zachęcamy do zapoznania się z naszą ofertą na stronie
        <a href="https://zadaszto.pl" style="color:#2563eb;text-decoration:none;font-weight:600;">zadaszto.pl</a>.
      </p>

      <p style="color:#475569;line-height:1.7;margin:0;font-size:15px;">
        Jeśli masz dodatkowe pytania, odpowiedz na tego maila — chętnie pomożemy!
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;margin:0;font-size:13px;line-height:1.6;">
        Z poważaniem,<br>
        <strong style="color:#334155;">Zespół Zadaszto.pl</strong><br>
        Polendach24 GmbH<br>
        <a href="mailto:buero@polendach24.de" style="color:#2563eb;text-decoration:none;">buero@polendach24.de</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    },

    // ───────────────────────────────────────────────────────────────────────
    // 3. Główny mail z ofertą agenta wycen (DE) — pricing-worker
    //    Źródło: scripts/pricing-worker.ts ~1033-1211 (emailHtml)
    //    Przykładowe wartości: modelName = "Trendline", wymiary 6000×4000 mm,
    //    3 warianty, ceny "ab 9.450€ — bis 14.900€", token oferty "beispiel-token",
    //    numer oferty (w temacie) "PD24-0123"
    // ───────────────────────────────────────────────────────────────────────
    {
        id: 'auto_pricing_worker_offer_de',
        name: 'Oferta agenta wycen — główny mail (DE)',
        language: 'de',
        trigger: 'Automatycznie: pricing-worker (Hetzner, :3456) — po zakończeniu wyceny u dostawców i utworzeniu interaktywnej oferty; wysyłka przez Edge Function send-email + wpis do customer_communications',
        status: 'auto',
        subject: 'Ihr persönliches Angebot PD24-0123 — Trendline ab 9.450€',
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">

  <!-- Logo on subtle gray bg -->
  <tr><td style="background:#f4f6f8;padding:24px 40px 20px;text-align:center;border-bottom:2px solid #e2e8f0;">
    <img src="https://polendach24.app/PolenDach24-Logo.png" alt="Polendach24" width="180" style="max-width:180px;height:auto;display:inline-block;" />
  </td></tr>

  <!-- Hero Header -->
  <tr><td style="background:#1e293b;padding:36px 40px 30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Ihr pers&#246;nliches Angebot</h1>
    <p style="color:#7dd3fc;margin:10px 0 0;font-size:15px;">Trendline &#8212; 6000 &#215; 4000 mm</p>
  </td></tr>

  <!-- Product Image -->
  <tr><td style="padding:0;line-height:0;font-size:0;">
    <img src="https://polendach24.app/images/models/trendline-panorama.webp" alt="Trendline" width="600" style="width:100%;max-width:600px;height:auto;display:block;" />
  </td></tr>

  <!-- Body text -->
  <tr><td style="padding:36px 40px 24px;">
    <p style="color:#1e293b;font-size:16px;line-height:1.7;margin:0 0 18px;">Guten Tag,</p>
    <p style="color:#334155;font-size:16px;line-height:1.7;margin:0 0 24px;">vielen Dank f&#252;r Ihr Interesse an einer hochwertigen Terrassen&#252;berdachung aus Aluminium. Wir haben <strong>3 individuelle Varianten</strong> f&#252;r Sie zusammengestellt &#8212; von der Economy- bis zur Premium-Ausstattung.</p>

    <!-- Price Range Box -->

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr><td style="background:#f1f5f9;padding:22px 28px;border-left:4px solid #1e40af;">
        <p style="color:#64748b;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">PREISRAHMEN INKL. MONTAGE</p>
        <p style="color:#0f172a;font-size:24px;font-weight:800;margin:0;">ab 9.450&#8364; &#8212; bis 14.900&#8364;</p>
        <p style="color:#64748b;font-size:12px;margin:6px 0 0;">Brutto inkl. 19% MwSt. und professioneller Montage</p>
      </td></tr>
    </table>


    <!-- Primary CTA: View Offer -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="padding:4px 0 16px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://polendach24.app/p/offer/beispiel-token" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="15%" fillcolor="#1e40af">
        <center style="color:#ffffff;font-family:Arial;font-size:17px;font-weight:bold;">Angebot jetzt ansehen &#8594;</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!--><a href="https://polendach24.app/p/offer/beispiel-token" style="background-color:#1e40af;color:#ffffff;padding:18px 48px;border-radius:8px;text-decoration:none;font-weight:700;font-size:17px;display:inline-block;">Angebot jetzt ansehen &#8594;</a><!--<![endif]-->
      </td></tr>
    </table>
    <p style="text-align:center;color:#64748b;font-size:12px;margin:0 0 8px;">Vergleichen Sie alle Varianten interaktiv und unverbindlich</p>
  </td></tr>

  <!-- 3 USP Badges -->
  <tr><td style="padding:0 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="8" border="0">
      <tr>
        <td width="33%" align="center" valign="top" style="background:#f0fdf4;padding:20px 10px;border:1px solid #bbf7d0;">
          <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="background:#16a34a;width:36px;height:36px;color:#ffffff;font-size:18px;font-weight:700;">&#10003;</td></tr></table>
          <p style="color:#166534;font-size:13px;font-weight:700;margin:10px 0 0;line-height:1.4;">Kostenloses<br/>Aufma&#223;</p>
        </td>
        <td width="33%" align="center" valign="top" style="background:#eff6ff;padding:20px 10px;border:1px solid #bfdbfe;">
          <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="background:#2563eb;width:36px;height:36px;color:#ffffff;font-size:18px;font-weight:700;">&#10003;</td></tr></table>
          <p style="color:#1e40af;font-size:13px;font-weight:700;margin:10px 0 0;line-height:1.4;">Profilmuster<br/>vor Ort</p>
        </td>
        <td width="33%" align="center" valign="top" style="background:#fefce8;padding:20px 10px;border:1px solid #fde68a;">
          <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="background:#d97706;width:36px;height:36px;color:#ffffff;font-size:18px;font-weight:700;">&#10003;</td></tr></table>
          <p style="color:#92400e;font-size:13px;font-weight:700;margin:10px 0 0;line-height:1.4;">Professionelle<br/>Montage</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Next Steps / Consultation CTA -->
  <tr><td style="background:#f0fdf4;padding:28px 40px;border-top:2px solid #bbf7d0;border-bottom:2px solid #bbf7d0;">
    <p style="color:#166534;font-size:18px;font-weight:700;margin:0 0 12px;">Ihr n&#228;chster Schritt: Kostenloser Beratungstermin</p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">Gerne kommen wir <strong>kostenlos und unverbindlich</strong> zu Ihnen vor Ort, um:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">1.</span> &#160; Exaktes Aufma&#223; Ihrer Terrasse zu nehmen</td></tr>
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">2.</span> &#160; Ihnen unsere <strong>Aluminium-Profile</strong> zum Anfassen zu zeigen</td></tr>
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">3.</span> &#160; Alle Details und Ihre W&#252;nsche pers&#246;nlich zu besprechen</td></tr>
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">4.</span> &#160; Ein <strong>ma&#223;geschneidertes Angebot</strong> mit Festpreis zu erstellen</td></tr>
    </table>

    <!-- Green CTA: Book Appointment -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
      <tr><td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="tel:+4915888649130" style="height:54px;v-text-anchor:middle;width:340px;" arcsize="15%" fillcolor="#16a34a">
        <center style="color:#ffffff;font-family:Arial;font-size:16px;font-weight:bold;">Jetzt Termin vereinbaren: anrufen</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!--><a href="tel:+4915888649130" style="background-color:#16a34a;color:#ffffff;padding:16px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">&#9742; Jetzt anrufen: +49 1588 8649130</a><!--<![endif]-->
      </td></tr>
      <tr><td align="center" style="padding:8px 0 0;">
        <p style="color:#166534;font-size:12px;margin:0;font-weight:600;">Kostenlos &#8226; Unverbindlich &#8226; Ohne Wartezeit</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- What you get in the offer -->
  <tr><td style="padding:28px 40px;">
    <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 14px;">In Ihrem interaktiven Angebot:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; 3 Varianten im direkten Vergleich</td></tr>
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; Zusatzoptionen: Markisen, Schiebet&#252;ren, Beleuchtung</td></tr>
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; Alle Preise transparent und verst&#228;ndlich</td></tr>
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; Direkte Kontaktaufnahme per Telefon oder E-Mail</td></tr>
    </table>
  </td></tr>

  <!-- Trust section -->
  <tr><td style="background:#f8fafc;padding:28px 40px;border-top:2px solid #e2e8f0;">
    <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 14px;">Warum Polendach24?</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="50%" style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Deutsche Qualit&#228;tsstandards</td>
        <td width="50%" style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Eigene Montageteams</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> 10 Jahre Garantie</td>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Beratung bei Ihnen vor Ort</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Profilmuster zum Anfassen</td>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Montage in 1&#8211;2 Tagen</td>
      </tr>
    </table>
  </td></tr>

  <!-- Sales Team Section -->
  <tr><td style="padding:28px 40px;border-top:2px solid #e2e8f0;">
    <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 16px;">Ihre Ansprechpartner</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" valign="top" style="padding:8px 6px 8px 0;">
          <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 4px;">Mike Ledwin</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;">Vertriebsberater</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;"><a href="tel:+4915257487430" style="color:#1e40af;text-decoration:none;">+49 152 57487430</a></p>
          <p style="margin:0;"><a href="mailto:m.ledwin@polendach24.de" style="color:#1e40af;text-decoration:none;font-size:11px;">m.ledwin@polendach24.de</a></p>
        </td>
        <td width="33%" valign="top" style="padding:8px 6px;">
          <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 4px;">Hubert Ko&#347;ci&#243;w</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;">Vertriebsberater</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;"><a href="tel:+4915223634823" style="color:#1e40af;text-decoration:none;">+49 152 23634823</a></p>
          <p style="margin:0;"><a href="mailto:h.kosciow@polendach24.de" style="color:#1e40af;text-decoration:none;font-size:11px;">h.kosciow@polendach24.de</a></p>
        </td>
        <td width="33%" valign="top" style="padding:8px 0 8px 6px;">
          <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 4px;">Oliwia Du&#378;</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;">Vertriebsberaterin</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;"><a href="tel:+491626692445" style="color:#1e40af;text-decoration:none;">+49 162 6692445</a></p>
          <p style="margin:0;"><a href="mailto:o.duz@polendach24.de" style="color:#1e40af;text-decoration:none;font-size:11px;">o.duz@polendach24.de</a></p>
        </td>
      </tr>
    </table>
    <p style="color:#64748b;font-size:12px;margin:14px 0 0;">Rufen Sie einfach an oder schreiben Sie uns &#8212; wir melden uns umgehend!</p>
  </td></tr>

  <!-- Dark Footer -->
  <tr><td style="background:#0f172a;padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <p style="color:#ffffff;font-size:15px;font-weight:700;margin:0 0 2px;">Polendach24</p>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Ihr Partner f&#252;r hochwertige Terrassen&#252;berdachungen</p>
        </td>
        <td align="right" valign="middle">
          <a href="tel:+4915888649130" style="color:#7dd3fc;text-decoration:none;font-size:13px;">+49 1588 8649130</a><br/>
          <a href="mailto:buero@polendach24.de" style="color:#7dd3fc;text-decoration:none;font-size:12px;">buero@polendach24.de</a>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
<p style="text-align:center;color:#94a3b8;font-size:11px;margin:16px 0 0;">&#169; ${new Date().getFullYear()} Polendach24 | Diese E-Mail wurde automatisch erstellt.</p>
</td></tr>
</table>
</body></html>`,
    },

    // ───────────────────────────────────────────────────────────────────────
    // 4. Krótki mail "retry" agenta wycen — pricing-worker (recovery)
    //    Źródło: scripts/pricing-worker.ts ~627-628
    //    Przykładowe wartości: offer_number = "PD24-0123", public_token = "beispiel-token"
    // ───────────────────────────────────────────────────────────────────────
    {
        id: 'auto_pricing_worker_retry_de',
        name: 'Oferta agenta wycen — mail "retry" po odzyskaniu (DE)',
        language: 'de',
        trigger: 'Automatycznie: pricing-worker — recovery zawieszonych ofert (start +30 s, potem co 10 min); po udanym ponowieniu wyceny wysyła klientowi krótki mail z linkiem do oferty',
        status: 'auto',
        subject: 'Ihr persönliches Angebot PD24-0123 ist fertig!',
        html: `<p>Guten Tag,</p><p>Ihr Angebot ist nun verfügbar:</p><p><a href="https://polendach24.app/p/offer/beispiel-token">Angebot ansehen</a></p><p>Ihr Polendach24-Team</p>`,
    },
];
