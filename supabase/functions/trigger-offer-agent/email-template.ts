/**
 * Professional Offer Email Template
 * Matches Polendach24 brand design (leadSalesEmailTemplate style)
 */

interface EmailVariant {
    tier: string;
    label: string;
    modelName?: string;
    tagline?: string;
    dimensions?: string;
    totalGrossEUR: number;
    totalNetEUR: number;
    heroImage?: string;
}

interface EmailParsedData {
    customerName?: string;
    width?: number;
    depth?: number;
    color?: string;
    postalCode?: string;
}

const APP_URL = 'https://polendach24.app';

export function buildOfferEmail(
    parsed: EmailParsedData,
    offerNumber: string,
    offerUrl: string,
    variants: EmailVariant[]
): string {
    const eco = variants.find(v => v.tier === 'economy');
    const rec = variants.find(v => v.tier === 'recommended');
    const prem = variants.find(v => v.tier === 'premium');
    const fmt = (v: number | undefined) =>
        v ? v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';
    const name = parsed.customerName || 'Kunde';
    const n = variants.length;

    // Build package cards HTML
    const recCard = rec ? `
<tr><td style="padding:0 40px 12px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:2px solid #818cf8;border-radius:16px;">
<tr><td style="padding:28px 24px;">
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:5px 18px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px;">&#11088; EMPFOHLEN</div>
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
<td><p style="color:#312e81;font-size:20px;font-weight:800;margin:0;">${rec.modelName || rec.label}</p><p style="color:#4338ca;font-size:13px;margin:4px 0 0;">${rec.tagline || ''} &middot; ${rec.dimensions || ''}</p></td>
<td align="right"><p style="color:#4338ca;font-size:28px;font-weight:800;margin:0;">${fmt(rec.totalGrossEUR)} &euro;</p><p style="color:#6366f1;font-size:11px;margin:2px 0 0;">inkl. MwSt. &amp; Montage</p></td>
</tr></table>
</td></tr></table>
</td></tr>` : '';

    const ecoCard = eco ? `
<tr><td style="padding:0 40px 12px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
<tr><td style="padding:18px 24px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
<td><p style="font-weight:700;color:#334155;font-size:16px;margin:0;">${eco.modelName || eco.label}</p><p style="color:#64748b;font-size:12px;margin:4px 0 0;">${eco.tagline || ''}</p></td>
<td align="right"><p style="color:#334155;font-size:22px;font-weight:700;margin:0;">ab ${fmt(eco.totalGrossEUR)} &euro;</p></td>
</tr></table>
</td></tr></table>
</td></tr>` : '';

    const premCard = prem ? `
<tr><td style="padding:0 40px 32px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fbbf24;border-radius:12px;">
<tr><td style="padding:18px 24px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
<td><p style="font-weight:700;color:#78350f;font-size:16px;margin:0;">&#127942; ${prem.label}</p><p style="color:#92400e;font-size:12px;margin:4px 0 0;">${prem.modelName || ''} &middot; ${prem.tagline || ''}</p></td>
<td align="right"><p style="color:#78350f;font-size:22px;font-weight:700;margin:0;">${fmt(prem.totalGrossEUR)} &euro;</p></td>
</tr></table>
</td></tr></table>
</td></tr>` : '';

    return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Angebot ${offerNumber}</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%}table{border-collapse:collapse!important}img{border:0;display:block}body{margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f7f9fb}@media screen and (max-width:600px){.ctr{width:100%!important}.cp{padding:30px 20px!important}}</style></head>
<body style="margin:0;padding:0;background:#f7f9fb;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;opacity:0;overflow:hidden;">Ihr pers&ouml;nliches Angebot mit ${n} Paketen</div>
<center>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f9fb;"><tr><td align="center" style="padding:20px 0;">
<table border="0" cellpadding="0" cellspacing="0" width="650" class="ctr" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.08);max-width:650px;">

<!-- LOGO -->
<tr><td align="center" style="padding:45px 0 35px;">
<a href="https://www.polendach24.de" target="_blank"><img src="${APP_URL}/PolenDach24-Logo.png" width="280" alt="Polendach24" style="max-width:100%;height:auto;"></a>
<div style="height:1px;width:60px;background:#e67e22;margin-top:20px;"></div>
</td></tr>

<!-- HERO -->
<tr><td style="padding:0;"><img src="${APP_URL}/skystylezdj.jpg" width="650" style="width:100%;max-width:650px;height:auto;" alt="Premium Aluminium-&Uuml;berdachung"></td></tr>

<!-- GREETING -->
<tr><td class="cp" style="padding:50px 50px 30px;">
<h2 style="margin:0 0 15px;font-size:12px;color:#e67e22;letter-spacing:4px;text-transform:uppercase;font-weight:800;text-align:center;">Ihr pers&ouml;nliches Angebot</h2>
<h1 style="margin:0 0 25px;font-size:30px;line-height:38px;color:#1c252e;font-weight:300;text-align:center;">Sehr geehrte/r <span style="font-weight:700;">${name},</span></h1>
<p style="margin:0;font-size:16px;line-height:28px;color:#4a5568;text-align:center;">vielen Dank f&uuml;r Ihr Interesse an einer <strong>Premium-Aluminium&uuml;berdachung</strong>. Wir haben <strong>${n} ma&szlig;geschneiderte Pakete</strong> f&uuml;r Sie zusammengestellt &mdash; jedes mit professioneller Montage und 10 Jahren Garantie.</p>
</td></tr>

${recCard}
${ecoCard}
${premCard}

<!-- CTA -->
<tr><td style="padding:0 40px 16px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(234,88,12,.25);">
<tr><td align="center" style="padding:40px;background:linear-gradient(135deg,#f97316,#ea580c 50%,#c2410c);">
<p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:3px;font-weight:700;">Ihr n&auml;chster Schritt</p>
<p style="margin:0 0 25px;font-size:22px;color:#fff;font-weight:700;line-height:30px;">Alle ${n} Pakete interaktiv<br>vergleichen &amp; ausw&auml;hlen</p>
<a href="${offerUrl}" target="_blank" style="display:inline-block;padding:18px 56px;background:#fff;color:#ea580c;font-size:17px;font-weight:800;text-decoration:none;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,.15);">&#10148; Angebot jetzt ansehen</a>
<p style="margin:15px 0 0;font-size:12px;color:rgba(255,255,255,.7);">Angebot Nr. ${offerNumber} &middot; 30 Tage g&uuml;ltig</p>
</td></tr></table>
</td></tr>

<!-- SOCIAL PROOF -->
<tr><td style="padding:24px 50px 30px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
<td width="33%" align="center" style="padding:20px 10px;border-right:1px solid #f0f2f5;"><p style="margin:0;font-size:28px;font-weight:800;color:#1c252e;">450+</p><p style="margin:5px 0 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Projekte</p></td>
<td width="33%" align="center" style="padding:20px 10px;border-right:1px solid #f0f2f5;"><p style="margin:0;font-size:28px;font-weight:800;color:#1c252e;">10 J.</p><p style="margin:5px 0 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Garantie</p></td>
<td width="33%" align="center" style="padding:20px 10px;"><p style="margin:0;font-size:28px;font-weight:800;color:#1c252e;">100%</p><p style="margin:5px 0 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Aluminium</p></td>
</tr></table>
</td></tr>

<!-- NOTE -->
<tr><td style="padding:0 40px 30px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
<tr><td style="padding:18px 24px;"><p style="color:#92400e;font-size:12px;line-height:1.7;margin:0;"><strong>&#9888;&#65039; Hinweis:</strong> Diese Kalkulation enth&auml;lt <strong>1 Montagetag</strong>. Nach Kl&auml;rung aller technischen Details erhalten Sie eine verbindliche Angebotsbest&auml;tigung.</p></td></tr>
</table>
</td></tr>

<!-- TRUST -->
<tr><td class="cp" style="padding:0 50px 50px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#1c252e;color:#fff;border-radius:4px;">
<tr><td style="padding:40px;" class="cp">
<h3 style="margin:0 0 25px;font-size:14px;color:#e67e22;text-transform:uppercase;letter-spacing:3px;font-weight:800;text-align:center;">Polendach24 Excellence</h3>
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tr><td style="padding-bottom:20px;font-size:15px;line-height:24px;"><span style="color:#e67e22;font-weight:bold;font-size:18px;">&#9670;</span> <strong>Statik inklusive:</strong> Individuelle statische Berechnung.</td></tr>
<tr><td style="padding-bottom:20px;font-size:15px;line-height:24px;"><span style="color:#e67e22;font-weight:bold;font-size:18px;">&#9670;</span> <strong>Premium Aluminium:</strong> Pulverbeschichtet, wartungsfrei.</td></tr>
<tr><td style="font-size:15px;line-height:24px;"><span style="color:#e67e22;font-weight:bold;font-size:18px;">&#9670;</span> <strong>Full Service:</strong> Beratung bis fachgerechte Montage.</td></tr>
</table>
</td></tr></table>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#1a202c;padding:50px;color:#fff;">
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding-bottom:20px;"><p style="margin:0 0 8px;font-size:16px;letter-spacing:5px;font-weight:300;text-transform:uppercase;">POLENDACH24 S.C.</p><p style="margin:0;font-size:12px;color:#94a3b8;">Gesch&auml;ftsf&uuml;hrung: Tomasz Fijo&#322;ek, Mariusz Du&#378;</p></td></tr>
<tr><td align="center" style="padding-bottom:15px;"><p style="margin:0;font-size:12px;color:#cbd5e1;line-height:22px;">E-Mail: <a href="mailto:buero@polendach24.de" style="color:#fff;text-decoration:none;">buero@polendach24.de</a><br>Zentrale: +49 3561 501 9981</p></td></tr>
<tr><td align="center"><p style="margin:0;font-size:10px;color:#64748b;">Dieses Angebot ist unverbindlich.</p></td></tr>
</table>
</td></tr>

</table>
<table border="0" cellpadding="0" cellspacing="0" width="650" class="ctr"><tr><td align="center" style="padding:30px;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:3px;">&copy; 2026 Polendach24 S.C.</td></tr></table>
</td></tr></table>
</center>
</body></html>`;
}
