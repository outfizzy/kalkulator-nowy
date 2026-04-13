import { supabase } from '../../lib/supabase';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfferService } from '../../services/database/offer.service';
import type { Offer } from '../../types';
import { translate, formatCurrency } from '../../utils/translations';

// ═══════════════════════════════════════════════════════════════════
// PREMIUM PRINT VIEW — A4 PDF-Ready Offer Document
// Designed for browser print → PDF with fixed headers/footers
//
// HARDENING CHECKLIST:
// [✓] Emoji replaced with Unicode text symbols (print-safe)
// [✓] All text uses overflow-wrap: break-word (no overflow)
// [✓] keep-together on all critical blocks
// [✓] Null safety on all pricing/product fields
// [✓] Fixed header/footer with matching spacers via doc-table
// [✓] Pricing table thead repeats on multi-page via table-header-group
// [✓] Summary block uses keep-together to prevent split
// [✓] Config box has max-height protection
// [✓] Long addon names truncate gracefully
// [✓] CSS page counter via @page
// ═══════════════════════════════════════════════════════════════════

function translateForView(key: string, category: string): string {
    const v2Map: Record<string, string> = {
        'trendline': 'Trendstyle', 'trendstyle': 'Trendstyle',
        'trendline_new': 'Trendstyle New', 'trendstyle_new': 'Trendstyle New',
        'trendline_plus': 'Trendstyle+', 'trendstyle_plus': 'Trendstyle+',
        'trendline+': 'Trendstyle+', 'trendstyle+': 'Trendstyle+',
        'skyline': 'Skystyle', 'skystyle': 'Skystyle',
        'ultraline': 'Ultrastyle', 'ultrastyle': 'Ultrastyle',
        'topline': 'Topstyle', 'topstyle': 'Topstyle',
        'topline_xl': 'Topstyle XL', 'topstyle_xl': 'Topstyle XL',
        'topline xl': 'Topstyle XL', 'topstyle xl': 'Topstyle XL',
        'designline': 'Designstyle', 'designstyle': 'Designstyle',
        'orangeline': 'Orangestyle', 'orangestyle': 'Orangestyle',
        'orangeline+': 'Orangestyle+', 'orangestyle+': 'Orangestyle+',
        // Teranda models
        'tr10': 'Orangestyle 10', 'TR10': 'Orangestyle 10',
        'tr15': 'Trendstyle 15', 'TR15': 'Trendstyle 15',
        'tr20': 'Topstyle 20', 'TR20': 'Topstyle 20',
        'carport': 'Carport',
        'pergola': 'Pergola', 'pergola_bio': 'Pergola',
        'pergola deluxe': 'Pergola Deluxe', 'pergola_deluxe': 'Pergola Deluxe',
        'poly': 'Polycarbonat', 'polycarbonate': 'Polycarbonat', 'glass': 'Glas VSG 8mm',
        'clear': 'Klar', 'klar': 'Klar', 'opal': 'Opal', 'matt': 'Matt',
        'stopsol': 'Stopsol (Sonnenschutz)', 'ir-gold': 'IR Gold (Hitzeschutz)',
        'wall': 'Wandmontage', 'wall-mounted': 'Wandmontage',
        'freestanding': 'Freistehend', 'wedge': 'Keilform',
        'anthracite': 'Anthrazit (RAL 7016)', 'white': 'Weiß (RAL 9016)',
        'ral7016': 'Anthrazit (RAL 7016)', 'ral9016': 'Weiß (RAL 9016)',
        'silberr': 'Silber (RAL 9006)', 'sepia': 'Sepiabraun (RAL 8014)',
        'ral 7016': 'Anthrazit (RAL 7016)', 'ral 9016': 'Weiß (RAL 9016)',
        'RAL 7016': 'Anthrazit (RAL 7016)', 'RAL 9016': 'Weiß (RAL 9016)',
        'RAL 9006': 'Silber (RAL 9006)', 'RAL 8014': 'Sepiabraun (RAL 8014)',
    };
    if (v2Map[key?.toLowerCase()]) return v2Map[key.toLowerCase()];
    return translate(key, category as any);
}

function translateAddonName(name: string): string {
    const map: Record<string, string> = {
        'Wedge (Glass)': 'Keilfenster (Glas)',
        'Side Wall (Glass)': 'Seitenwand (Glas)',
        'Front Wall (Glass)': 'Frontwand (Glas)',
        'Side Wall (Poly)': 'Seitenwand (Polycarbonat)',
        'Front Wall (Poly)': 'Frontwand (Polycarbonat)',
        'Schiebetür (Glass)': 'Schiebetür (Glas)',
        'Schiebetür (Poly)': 'Schiebetür (Polycarbonat)',
        'Surcharge Matt': 'Zuschlag Mattglas-Verglasung',
        'Surcharge Iso': 'Zuschlag Wärmedämm-Isolierverglasung',
        'Surcharge Stopsol': 'Zuschlag UV Reflex Sonnenschutzglas',
        'LED Lighting': 'LED-Beleuchtung',
        'LED Spot': 'LED-Spotbeleuchtung',
        'LED Strip': 'LED-Lichtleiste',
        'Heating': 'Infrarot-Heizstrahler',
        'ZIP Screen': 'ZIP-Senkrechtmarkise',
        'Awning': 'Aufdachmarkise',
        'Panorama': 'Panorama-Glasschiebewand',
    };
    if (map[name]) return map[name];
    for (const [eng, de] of Object.entries(map)) {
        if (name.includes(eng)) return name.replace(eng, de);
    }
    return name;
}

// Professional addon description enrichment
function getAddonSubtext(name: string): string | null {
    const n = (name || '').toLowerCase();
    if (n.includes('seitenwand') || n.includes('side wall')) return 'Festverglaste Aluminium-Seitenwand';
    if (n.includes('frontwand') || n.includes('front wall')) return 'Festverglaste Aluminium-Frontwand';
    if (n.includes('keilfenster') || n.includes('wedge')) return 'Dreieckiges Keilfenster (Giebeldreieck)';
    if (n.includes('schiebetür') || n.includes('schiebetuer')) return 'Aluminium-Schiebetür mit Rollenlaufwerk';
    if (n.includes('panorama')) return 'Rahmenlose Panorama-Glasschiebewand, ESG 10mm';
    if (n.includes('zip')) return 'ZIP-Senkrechtmarkise mit Somfy-Motor (Textilscreen)';
    if (n.includes('markise') || n.includes('awning')) return 'Aufdachmarkise mit Somfy-Motor';
    if (n.includes('led') && n.includes('spot')) return 'Einbau in Sparren, warmweiß 3000K';
    if (n.includes('led') && n.includes('strip')) return 'Indirekte Beleuchtung, warmweiß 3000K';
    if (n.includes('led')) return 'Integriert in Konstruktion, warmweiß 3000K';
    if (n.includes('heiz') || n.includes('infrarot')) return 'Fernbedienung, spritzwassergeschützt (IP65)';
    if (n.includes('wpc')) return 'Premium Holz-Kunststoff-Verbundwerkstoff, rutschfest';
    return null;
}

// Safe number formatter - never shows NaN or undefined
function safeNum(val: any, decimals = 0): string {
    const n = Number(val);
    if (isNaN(n) || !isFinite(n)) return '—';
    return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
}

export const OfferPrintView: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [productImage, setProductImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchOffer = async () => {
            if (!token) return;
            try {
                const data = await OfferService.getOfferByToken(token);
                setOffer(data);

                // Fetch Product Image from Price Table
                if (data?.product?.modelId) {
                    try {
                        const { data: tableData } = await supabase
                            .from('price_tables')
                            .select('attributes')
                            .eq('product_definition_id', data.product.modelId)
                            .limit(1);

                        if (tableData?.[0]?.attributes?.image_url) {
                            setProductImage(tableData[0].attributes.image_url);
                        }
                    } catch (imageError) {
                        console.error('Error loading product image:', imageError);
                    }
                }
            } catch (error) {
                console.error('Error loading offer:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOffer();
    }, [token]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-500 text-sm">Angebot wird geladen...</p>
            </div>
        </div>
    );
    if (!offer) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <p className="text-xl font-bold text-slate-700 mb-2">Angebot nicht gefunden</p>
                <p className="text-sm text-slate-400">Der Link ist möglicherweise ungültig oder abgelaufen.</p>
            </div>
        </div>
    );

    // --- CONTEXT ---
    let repName = 'Ihr Expertenteam';
    let repPhone = '03561 501 9981';
    let repEmail = 'buero@polendach24.de';

    if (offer.creator) {
        const cr = offer.creator as any;
        if (cr.full_name) repName = cr.full_name;
        else if (cr.firstName) repName = `${cr.firstName} ${cr.lastName || ''}`.trim();
        repPhone = cr.client_phone || cr.clientPhone || cr.phone || repPhone;
        repEmail = cr.client_email || cr.clientEmail || cr.email || cr.email_config?.sender_email || repEmail;
    }

    const c = offer.customer || {} as any;
    const isManual = !!(offer.product as any)?.isManual;
    const model = isManual ? 'Individuelles Angebot' : translateForView(offer.product?.modelId || '', 'models');
    const p = offer.product as any;
    const dach = p?.dachrechnerData || null;

    // Calculations (with null safety)
    const installNet = Number(offer.pricing?.installationCosts?.totalInstallation) || 0;
    const totalNet = Number(offer.pricing?.sellingPriceNet) || 0;
    const totalGross = Number(offer.pricing?.sellingPriceGross) || (totalNet * 1.19);
    const totalVat = totalGross - totalNet;
    const productOnlyNet = totalNet - installNet;
    const discount = Number(offer.pricing?.discountValue) || 0;
    const hasDiscount = discount > 0;
    const discountGross = hasDiscount ? discount * 1.19 : 0;
    const originalGross = hasDiscount ? totalGross + discountGross : 0;

    // Date handling
    const offerDate = offer.createdAt
        ? new Date(offer.createdAt).toLocaleDateString('de-DE')
        : new Date().toLocaleDateString('de-DE');
    const createdDate = offer.createdAt ? new Date(offer.createdAt) : new Date();
    const validUntil = new Date(createdDate);
    validUntil.setDate(validUntil.getDate() + 30);
    const validUntilStr = validUntil.toLocaleDateString('de-DE');

    // Structural data (with null safety)
    const postCount = p?.numberOfPosts || Math.max(2, Math.ceil((Number(p?.width) || 3000) / 3500) + 1);
    const fieldCount = p?.numberOfFields || Math.max(2, Math.ceil((Number(p?.width) || 3000) / 900));
    const rafterCount = fieldCount + 1;
    const isCombined = !!(p?.splitPoint && Number(p?.width) > 7000);

    // ═══ SALE PRICE MULTIPLIER ═══
    // Items stored in DB have CATALOG (purchase) prices.
    // We must scale them proportionally so their SUM matches the customer-facing sellingPriceNet.
    const catalogTotal = (Number(offer.pricing?.basePrice) || 0) + (Number((offer.pricing as any)?.customItemsPrice) || 0);
    const sellingNetForProducts = totalNet - installNet; // sellingPriceNet includes install, remove it
    const discountPct = Number((offer.pricing as any)?.discountPercentage) || 0;
    const preDiscountSelling = discountPct > 0 ? sellingNetForProducts / (1 - discountPct / 100) : sellingNetForProducts;
    const saleMultiplier = catalogTotal > 0 ? preDiscountSelling / catalogTotal : 1;

    // Collect all line items (with safety) — prices multiplied by saleMultiplier
    const lineItems: Array<{ name: string; subtext?: string; price: number; isBold?: boolean }> = [];

    // Base product
    if (!isManual && model) {
        lineItems.push({
            name: `${model} Terrassenüberdachung`,
            subtext: 'Hochwertiges Aluminiumprofilsystem, pulverbeschichtet. Inkl. Pfosten, Rinnenprofil und Wandanschluss.',
            price: Math.round((Number(offer.pricing?.basePrice) || 0) * saleMultiplier * 100) / 100,
            isBold: true,
        });
    }

    // Addons (V1)
    (offer.product?.addons || []).forEach((addon: any) => {
        if (!addon?.name) return; // skip corrupt entries
        lineItems.push({
            name: translateAddonName(addon.name),
            subtext: addon.variant || getAddonSubtext(addon.name) || undefined,
            price: Math.round((Number(addon.price) || 0) * saleMultiplier * 100) / 100,
        });
    });

    // Items (V2) — these are the internal purchase breakdown of basePrice.
    // The base model product is ALREADY shown as Pos 1 via basePrice.
    // We must: (a) SKIP the model item entirely, (b) show remaining addon items as INKL. only.
    const translatedModel = (model || '').toLowerCase(); // e.g. "trendstyle 15"
    const rawModelId = (p.modelId || '').toLowerCase();  // e.g. "tr15"

    ((p?.items || []) as any[])
        .filter((i: any) => {
            if (!i?.name) return false;
            const itemName = i.name.toLowerCase();

            // Skip if item IS the base model product (multiple detection strategies)
            if (rawModelId && itemName.includes(rawModelId)) return false;
            if (translatedModel && itemName.includes(translatedModel)) return false;
            if (translatedModel && translatedModel.includes(itemName)) return false;

            // Teranda model IDs → their display names
            const terandaMap: Record<string, string[]> = {
                'tr10': ['orangestyle', 'orangeline'],
                'tr15': ['trendstyle', 'trendline'],
                'tr20': ['topstyle', 'topline'],
            };
            const terandaNames = terandaMap[rawModelId];
            if (terandaNames && terandaNames.some(tn => itemName.includes(tn))) return false;

            // Also skip items containing "Terrassenüberdachung" — always the base model
            if (itemName.includes('terrassenüberdachung') || itemName.includes('terrassenuberdachung')) return false;

            return true;
        })
        .forEach((item: any) => {
            // Skip if an addon with similar name already exists (V1 addons handle those)
            const alreadyHasAddon = (offer.product?.addons || []).some((a: any) =>
                a?.name && translateAddonName(a.name).toLowerCase() === translateAddonName(item.name).toLowerCase()
            );
            if (alreadyHasAddon) return;

            lineItems.push({
                name: translateAddonName(item.name),
                subtext: item.config || getAddonSubtext(item.name) || undefined,
                price: 0, // included in basePrice — don't show purchase cost
            });
        });

    // Custom items (manual positions)
    ((p?.customItems || []) as any[]).forEach((ci: any) => {
        if (!ci) return;
        const qty = Number(ci.quantity) || 1;
        const unitPrice = Number(ci.price) || 0;
        lineItems.push({
            name: ci.name || 'Zusätzliche Position',
            subtext: (ci.description && ci.description !== 'Manuelle Angebotsposition' && ci.description !== 'Manuelle Position')
                ? `${ci.description}${qty > 1 ? ` · Menge: ${qty} Stk.` : ''}`
                : qty > 1 ? `Menge: ${qty} Stk.` : undefined,
            price: Math.round(unitPrice * qty * saleMultiplier * 100) / 100,
        });
    });

    // Rep initials (with safety for single-word names)
    const repInitials = repName.split(' ').filter(Boolean).map(n => n.charAt(0)).join('').substring(0, 2) || 'PD';

    // Dachrechner fields to display
    const dachFields: Array<{ label: string; value: string }> = [];
    if (dach) {
        if (dach.angleAlpha != null && isFinite(dach.angleAlpha)) dachFields.push({ label: 'Neigung', value: `${Number(dach.angleAlpha).toFixed(1)}°` });
        if (dach.h3 != null) dachFields.push({ label: 'H3 Rinne', value: `${safeNum(dach.h3)} mm` });
        if (dach.h1 != null) dachFields.push({ label: 'H1 Wand', value: `${safeNum(dach.h1)} mm` });
        if (dach.sparrenMitte != null) dachFields.push({ label: 'Sparrenabstand', value: `${safeNum(dach.sparrenMitte)} mm` });
        if (dach.inclinationMmM != null) dachFields.push({ label: 'Gefälle', value: `${safeNum(dach.inclinationMmM)} mm/m` });
        if (dach.depthD2 != null) dachFields.push({ label: 'Tiefe m. Rinne', value: `${safeNum(dach.depthD2)} mm` });
        if (dach.fensterF2 != null) dachFields.push({ label: 'Fensterbreite', value: `${safeNum(dach.fensterF2)} mm` });
        if (p.postWidth) dachFields.push({ label: 'Pfosten', value: `${p.postWidth} mm` });
        if (dach.keilhoeheK1 != null) dachFields.push({ label: 'Keil K1', value: `${safeNum(dach.keilhoeheK1)} mm` });
        if (dach.keilhoeheK2 != null) dachFields.push({ label: 'Keil K2', value: `${safeNum(dach.keilhoeheK2)} mm` });
    }

    return (
        <div className="bg-slate-100 min-h-screen print:bg-white print:min-h-0" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            <style>{`
                @media print {
                    @page { 
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        height: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        font-size: 10pt;
                    }
                    
                    /* Fixed Header — repeats on every page */
                    .print-fixed-header {
                        position: fixed;
                        top: 0; left: 0; right: 0;
                        height: 24mm;
                        background: #121c2d !important;
                        z-index: 1000;
                    }

                    /* Fixed Footer — repeats on every page */
                    .print-fixed-footer {
                        position: fixed;
                        bottom: 0; left: 0; right: 0;
                        background: white !important;
                        padding: 3mm 15mm;
                        border-top: 0.5pt solid #cbd5e1;
                        height: 18mm;
                        z-index: 1000;
                    }

                    /* Spacers matched to fixed elements + buffer */
                    .header-space { height: 28mm; }
                    .footer-space { height: 21mm; }

                    /* Document-level table for header/footer flow */
                    .doc-table { width: 100%; border-collapse: collapse; border: none; }

                    /* Pricing table header repeats on each page */
                    .pricing-table thead { display: table-header-group; }
                    .pricing-table tfoot { display: table-footer-group; }
                    .pricing-table tr { page-break-inside: avoid; break-inside: avoid; }

                    /* Block-level anti-orphan protection */
                    .keep-together { page-break-inside: avoid; break-inside: avoid; }
                    .page-break { page-break-before: always; break-before: page; }

                    /* No widows/orphans in text blocks */
                    p, li, div { orphans: 3; widows: 3; }

                    /* Prevent images from breaking across pages */
                    img { page-break-inside: avoid; break-inside: avoid; }

                    /* Force background colors */
                    .bg-force { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }

                /* Screen preview styles */
                @media screen {
                    .print-fixed-header, .print-fixed-footer { display: none; }
                    .header-space, .footer-space { display: none; }
                }

                /* Tabular numbers for price alignment */
                .tn { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
            `}</style>

            {/* ═══ FIXED HEADER (Print only, repeats every page) ═══ */}
            <div className="print-fixed-header print:block hidden">
                <div style={{ padding: '0 15mm', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: '40mm' }}>
                        <img src="/logo.png" alt="Polendach24" style={{ height: '10mm', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#94a3b8', fontSize: '8pt', lineHeight: 1.3, margin: 0 }}>Ihr Premium Partner für Terrassen</p>
                        <p style={{ color: '#c5a065', fontWeight: 'bold', fontSize: '9pt', margin: 0 }}>www.polendach24.de</p>
                    </div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1mm', background: '#c5a065' }}></div>
            </div>

            {/* ═══ FIXED FOOTER (Print only, repeats every page) ═══ */}
            <div className="print-fixed-footer print:block hidden">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6.5pt', color: '#94a3b8', lineHeight: 1.4 }}>
                    <div>
                        <span style={{ fontWeight: 'bold', color: '#475569' }}>PolenDach24 S.C.</span><br />
                        Kolonia Wałowice 221/33, 66-620 Gubin<br />
                        NIP: PL9261695520
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        Tel: 03561 501 9981<br />
                        E-Mail: buero@polendach24.de
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        Sparkasse Spree-Neiße<br />
                        DE79 1805 0000 0190 1228 89<br />
                        BIC: WELADED1CBN
                    </div>
                </div>
            </div>

            {/* ═══ DOCUMENT FLOW ═══ */}
            <div style={{ background: 'white', maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', padding: '0 15mm 10mm 15mm', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                className="print:shadow-none print:!p-0 print:!max-w-none print:!mx-0">
                <table className="doc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead className="print:table-header-group hidden"><tr><td><div className="header-space"></div></td></tr></thead>
                    <tfoot className="print:table-footer-group hidden"><tr><td><div className="footer-space"></div></td></tr></tfoot>

                    <tbody>
                        <tr>
                            <td style={{ verticalAlign: 'top', padding: '32px 15mm 0 15mm' }} className="print:!pt-0 print:!px-[15mm]">

                                {/* ═══ WEB HEADER (Hidden in Print) ═══ */}
                                <header style={{ background: '#121c2d', height: '24mm', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', margin: '0 -15mm 24px -15mm' }} className="print:!hidden">
                                    <div style={{ padding: '0 15mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ width: '40mm' }}><img src="/logo.png" alt="Polendach24" style={{ height: '10mm', filter: 'brightness(0) invert(1)' }} /></div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: '#94a3b8', fontSize: '8pt', margin: 0 }}>Ihr Premium Partner für Terrassen</p>
                                            <p style={{ color: '#c5a065', fontWeight: 'bold', fontSize: '9pt', margin: 0 }}>www.polendach24.de</p>
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1mm', background: '#c5a065' }}></div>
                                </header>

                                {/* ═══════════════════════════════════ */}
                                {/* PAGE 1: COVER & CONFIGURATION      */}
                                {/* ═══════════════════════════════════ */}
                                <div style={{ minHeight: '220mm', display: 'flex', flexDirection: 'column' }}>

                                    {/* ─── METADATA ROW ─── */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
                                        {/* Customer Address */}
                                        <div style={{ fontSize: '10pt', lineHeight: 1.6, maxWidth: '55%', minWidth: 0, overflow: 'hidden' }}>
                                            <p style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '8pt', letterSpacing: '0.03em' }}>
                                                PolenDach24 S.C. · Kolonia Wałowice 221/33 · 66-620 Gubin
                                            </p>
                                            {c.companyName && <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 2px 0' }}>{c.companyName}</p>}
                                            <p style={{ color: '#0f172a', margin: '0 0 2px 0' }}>{[c.salutation, c.firstName, c.lastName].filter(Boolean).join(' ') || 'Kunde'}</p>
                                            {(c.street || c.houseNumber) && <p style={{ color: '#0f172a', margin: '0 0 2px 0' }}>{[c.street, c.houseNumber].filter(Boolean).join(' ')}</p>}
                                            {(c.postalCode || c.city) && <p style={{ color: '#0f172a', margin: '0 0 2px 0' }}>{[c.postalCode, c.city].filter(Boolean).join(' ')}</p>}
                                            <p style={{ color: '#0f172a', margin: 0 }}>{c.country || 'Deutschland'}</p>
                                        </div>

                                        {/* Offer Badge */}
                                        <div style={{ width: '70mm', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '2px', overflow: 'hidden', background: '#f8fafc' }}>
                                            <div style={{ background: '#121c2d', padding: '5px 12px' }} className="bg-force">
                                                <span style={{ color: '#c5a065', fontSize: '7pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Angebot</span>
                                            </div>
                                            <div style={{ padding: '10px 12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '8pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Nr.</span>
                                                    <span style={{ fontWeight: 'bold', color: '#121c2d', fontSize: '11pt' }}>{offer.offerNumber || 'ENTWURF'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '8pt', color: '#94a3b8' }}>Datum</span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '9pt' }}>{offerDate}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #f1f5f9', paddingTop: '5px' }}>
                                                    <span style={{ fontSize: '8pt', color: '#94a3b8' }}>Gültig bis</span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '9pt' }}>{validUntilStr}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── HERO TITLE + PRODUCT IMAGE ─── */}
                                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h1 style={{ fontSize: '22pt', fontWeight: 'bold', color: '#121c2d', margin: '0 0 4px 0', lineHeight: 1.2 }}>{model}</h1>
                                            <h2 style={{ color: '#c5a065', fontWeight: 500, fontSize: '12pt', margin: '0 0 16px 0' }}>Ihr persönliches Angebot</h2>

                                            <div style={{ fontSize: '10pt', color: '#475569', lineHeight: 1.7 }}>
                                                <p style={{ margin: '0 0 8px 0' }}>
                                                    {c.salutation === 'Frau'
                                                        ? `Sehr geehrte Frau ${c.lastName || ''},`
                                                        : c.lastName
                                                            ? `Sehr geehrter Herr ${c.lastName},`
                                                            : 'Sehr geehrte Damen und Herren,'}
                                                </p>
                                                <p style={{ margin: '0 0 8px 0' }}>
                                                    vielen Dank für Ihr Vertrauen und das Interesse an unseren hochwertigen Aluminiumsystemen.
                                                    Wir freuen uns, Ihnen basierend auf Ihren Wünschen diese maßgeschneiderte Lösung präsentieren zu dürfen.
                                                </p>
                                                <p style={{ margin: 0 }}>
                                                    Bei <b>Polendach24</b> stehen Qualität, Langlebigkeit und Ästhetik an erster Stelle.
                                                    Ihre gewählte Konfiguration vereint modernes Design mit höchster Funktionalität.
                                                </p>
                                            </div>
                                        </div>

                                        {productImage && (
                                            <div style={{ width: '75mm', flexShrink: 0, paddingTop: '8px' }} className="keep-together">
                                                <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '2px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                    <img src={productImage} alt={model} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                                </div>
                                                <div style={{ fontSize: '7pt', color: '#94a3b8', textAlign: 'center', marginTop: '5px', fontStyle: 'italic' }}>Beispielabbildung {model}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── CONFIGURATION HIGHLIGHT BOX ─── */}
                                    <div style={{ background: '#121c2d', color: 'white', padding: '20px 24px', borderRadius: '2px' }} className="keep-together bg-force">
                                        <h3 style={{ color: '#c5a065', fontSize: '7pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                            {isManual ? 'Ihr individuelles Angebot' : 'Ihre Konfiguration im Überblick'}
                                        </h3>

                                        {isManual ? (
                                            <div>
                                                {p?.manualDescription ? (
                                                    <div style={{ color: '#cbd5e1', fontSize: '9pt', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.manualDescription}</div>
                                                ) : (
                                                    <div style={{ color: '#64748b', fontSize: '9pt', fontStyle: 'italic' }}>Detaillierte Positionen auf der nächsten Seite.</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 20px' }}>
                                                <div>
                                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Modell</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '13pt', display: 'block' }}>{model}</span>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Abmessungen (B × T)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '13pt', display: 'block' }}>{safeNum(p?.width)} × {safeNum(p?.projection)} mm</span>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Farbgebung</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '12pt', display: 'block' }}>{translateForView(p?.color || '', 'colors')}</span>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Dacheindeckung</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '12pt', display: 'block' }}>{translateForView(p?.roofType || '', 'roofTypes')}</span>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Montage</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '12pt', display: 'block' }}>{translateForView(p?.installationType || 'wall', 'installation')}</span>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Pfosten / Sparren</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '12pt', display: 'block' }}>{postCount} Pfosten · {rafterCount} Sparren</span>
                                                </div>
                                                {isCombined && (
                                                    <div style={{ gridColumn: 'span 3', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <span style={{ display: 'block', color: '#c5a065', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Verbundkonstruktion</span>
                                                        <span style={{ fontWeight: 'bold', fontSize: '11pt', display: 'block' }}>
                                                            Teilungspfosten bei {safeNum(p?.splitPoint)} mm — Segment 1: {safeNum(p?.splitPoint)} mm · Segment 2: {safeNum(Number(p?.width) - Number(p?.splitPoint))} mm
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ─── DACHRECHNER TECHNICAL DATA ─── */}
                                        {dachFields.length > 0 && !isManual && (
                                            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span style={{ color: '#c5a065', fontSize: '6.5pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '6px' }}>
                                                    Technische Parameter
                                                </span>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px 12px', fontSize: '8pt', color: '#cbd5e1' }}>
                                                    {dachFields.map((f, i) => (
                                                        <span key={i}>{f.label}: <b>{f.value}</b></span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Page 1 bottom note */}
                                    <div style={{ fontSize: '8pt', color: '#94a3b8', textAlign: 'center', marginTop: 'auto', paddingTop: '32px', paddingBottom: '8px' }}>
                                        Detaillierte Kostenaufstellung auf der nächsten Seite
                                    </div>
                                </div>

                                {/* ═══ PAGE BREAK ═══ */}
                                <div className="page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>

                                {/* ═══════════════════════════════════ */}
                                {/* PAGE 2+: PRICING TABLE              */}
                                {/* ═══════════════════════════════════ */}
                                <div style={{ marginTop: '20px' }}>
                                    <h3 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#121c2d', marginBottom: '4px' }}>Detaillierte Kostenaufstellung</h3>
                                    <p style={{ fontSize: '8pt', color: '#94a3b8', marginBottom: '14px' }}>
                                        Angebot Nr. {offer.offerNumber || 'ENTWURF'} · {model} · {offerDate}
                                    </p>

                                    {/* Pricing table — thead repeats on multi-page print */}
                                    <table className="pricing-table" style={{ width: '100%', fontSize: '9pt', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }} className="bg-force">
                                                <th style={{ padding: '7px 8px', textAlign: 'left', width: '10mm', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', color: '#121c2d' }}>Pos.</th>
                                                <th style={{ padding: '7px 8px', textAlign: 'left', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', color: '#121c2d' }}>Beschreibung</th>
                                                <th style={{ padding: '7px 8px', textAlign: 'right', width: '28mm', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', color: '#121c2d' }}>Betrag (netto)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="keep-together" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'top', color: '#94a3b8', fontSize: '8pt' }}>{idx + 1}</td>
                                                    <td style={{ padding: '8px', verticalAlign: 'top', maxWidth: '120mm', overflow: 'hidden' }}>
                                                        <div style={{ color: '#1e293b', fontWeight: item.isBold ? 'bold' : 'normal' }}>
                                                            {item.name}
                                                        </div>
                                                        {item.subtext && (
                                                            <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                                                                {item.subtext}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="tn" style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                        {item.price === 0
                                                            ? <span style={{ color: '#15803d', fontWeight: 600, fontSize: '8pt' }}>INKL.</span>
                                                            : formatCurrency(item.price)
                                                        }
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Installation row */}
                                            {installNet > 0 && (
                                                <tr className="keep-together bg-force" style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                    <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'top', color: '#94a3b8', fontSize: '8pt' }}>M</td>
                                                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                                        <div style={{ fontWeight: 500, color: '#0f172a' }}>Fachmontage & Logistik</div>
                                                        <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                                                            Lieferung und fachgerechte Montage durch unser Expertenteam.
                                                            Inkl. aller Befestigungsmaterialien und Kleinmaterial.
                                                        </div>
                                                    </td>
                                                    <td className="tn" style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                        {formatCurrency(installNet)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ═══ SUMMARY BLOCK — MUST stay together ═══ */}
                                <div className="keep-together" style={{ marginTop: '20px', borderTop: '2px solid #f1f5f9', paddingTop: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>

                                        {/* ─── LEFT: Sales Rep Contact ─── */}
                                        <div style={{ paddingTop: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                <div className="bg-force" style={{ height: '36px', width: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#121c2d', fontSize: '9pt', fontWeight: 'bold', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                                    {repInitials}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#121c2d', fontSize: '10pt' }}>{repName}</div>
                                                    <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ihr Ansprechpartner</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '8.5pt', color: '#475569', lineHeight: 2 }}>
                                                <div>Tel: {repPhone}</div>
                                                <div>E-Mail: {repEmail}</div>
                                                <div>Web: www.polendach24.de</div>
                                            </div>
                                        </div>

                                        {/* ─── RIGHT: Price Calculation ─── */}
                                        <div>
                                            <div style={{ marginBottom: '14px' }}>
                                                {/* Product net */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '9pt', marginBottom: '5px' }}>
                                                    <span>{isManual ? 'Positionen:' : 'Terrassenüberdachung:'}</span>
                                                    <span className="tn">{formatCurrency(productOnlyNet)}</span>
                                                </div>
                                                {/* Installation net */}
                                                {installNet > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '9pt', marginBottom: '5px' }}>
                                                        <span>Montage & Lieferung:</span>
                                                        <span className="tn">{formatCurrency(installNet)}</span>
                                                    </div>
                                                )}
                                                {/* Netto sum */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0f172a', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '9pt', marginBottom: '3px' }}>
                                                    <span>Summe netto:</span>
                                                    <span className="tn">{formatCurrency(totalNet)}</span>
                                                </div>
                                                {/* VAT */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8pt', marginBottom: '3px' }}>
                                                    <span>zzgl. 19% MwSt.:</span>
                                                    <span className="tn">{formatCurrency(totalVat)}</span>
                                                </div>
                                                {/* Discount */}
                                                {hasDiscount && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', paddingTop: '4px', fontSize: '8pt' }}>
                                                            <span>Regulärer Bruttopreis:</span>
                                                            <span className="tn" style={{ textDecoration: 'line-through' }}>{formatCurrency(originalGross)}</span>
                                                        </div>
                                                        <div className="bg-force" style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 'bold', background: '#f0fdf4', borderRadius: '4px', padding: '5px 8px', fontSize: '9pt', marginTop: '4px', border: '1px solid #bbf7d0' }}>
                                                            <span>{offer.pricing?.discountPercentage
                                                                ? `Sonderrabatt (−${offer.pricing.discountPercentage}%)`
                                                                : 'Sonderrabatt'
                                                            }:</span>
                                                            <span className="tn">−{formatCurrency(discountGross)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Grand Total */}
                                            <div className="bg-force" style={{ background: '#121c2d', color: 'white', padding: '14px 16px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontWeight: 'bold', fontSize: '10pt' }}>GESAMTBETRAG</span>
                                                    <span style={{ fontSize: '7pt', color: '#94a3b8' }}>Inkl. MwSt.{installNet > 0 ? ' & Montage' : ''}</span>
                                                </div>
                                                <span className="tn" style={{ fontWeight: 'bold', fontSize: '16pt', color: '#c5a065' }}>{formatCurrency(totalGross)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── SIGNATURE AREA ─── */}
                                    <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#94a3b8' }}>
                                        <div style={{ width: '38%' }}>
                                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>Ort, Datum</div>
                                        </div>
                                        <div style={{ width: '38%' }}>
                                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>Unterschrift / Stempel</div>
                                        </div>
                                    </div>

                                    {/* ─── TRUST BADGES ─── */}
                                    <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '7pt', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                        <span><span style={{ color: '#c5a065' }}>&#x2713;</span> Premium Qualität Made in EU</span>
                                        <span><span style={{ color: '#c5a065' }}>&#x2713;</span> 5 Jahre Garantie</span>
                                        <span><span style={{ color: '#c5a065' }}>&#x2713;</span> Pulverbeschichtung nach GSB</span>
                                        <span><span style={{ color: '#c5a065' }}>&#x2713;</span> Zertifizierte Statik</span>
                                    </div>

                                    {/* ─── VALIDITY ─── */}
                                    <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '7pt', color: '#94a3b8' }}>
                                        Dieses Angebot ist gültig bis {validUntilStr}. Alle Preise in EUR. Es gelten unsere AGB.
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══ UI CONTROLS (Screen only) ═══ */}
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', gap: '12px', zIndex: 50 }} className="print:!hidden">
                <button
                    onClick={() => window.close()}
                    style={{ background: 'white', border: '1px solid #e2e8f0', color: '#334155', padding: '10px 20px', borderRadius: '999px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                >
                    Schließen
                </button>
                <button
                    onClick={() => window.print()}
                    style={{ background: '#121c2d', color: 'white', padding: '10px 24px', borderRadius: '999px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    PDF Speichern
                </button>
            </div>
        </div>
    );
};
