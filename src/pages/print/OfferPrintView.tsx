import { supabase } from '../../lib/supabase';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfferService } from '../../services/database/offer.service';
import type { Offer } from '../../types';
import { translate, formatCurrency } from '../../utils/translations';

// ═══════════════════════════════════════════════════
// PREMIUM PRINT VIEW — A4 PDF-Ready Offer Document
// Designed for browser print → PDF with fixed headers/footers
// ═══════════════════════════════════════════════════

function translateForView(key: string, category: string): string {
    const v2Map: Record<string, string> = {
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
        'pergola': 'Pergola', 'pergola_bio': 'Pergola',
        'pergola deluxe': 'Pergola Deluxe', 'pergola_deluxe': 'Pergola Deluxe',
        'poly': 'Polycarbonat', 'polycarbonate': 'Polycarbonat', 'glass': 'Glas VSG 8mm',
        'clear': 'Klar', 'klar': 'Klar', 'opal': 'Opal', 'matt': 'Matt',
        'stopsol': 'Stopsol (Sonnenschutz)', 'ir-gold': 'IR Gold (Hitzeschutz)',
        'wall': 'Wandmontage', 'wall-mounted': 'Wandmontage',
        'freestanding': 'Freistehend', 'wedge': 'Keilform',
        'anthracite': 'Anthrazit (RAL 7016)', 'white': 'Weiß (RAL 9016)',
        'ral7016': 'Anthrazit (RAL 7016)', 'ral9016': 'Weiß (RAL 9016)',
        'silberr': 'Silber (RAL 9006)', 'sepia': 'Sepiabraun (RAL 8014)'
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
function getAddonSubtext(name: string, config?: string): string | null {
    const n = (name || '').toLowerCase();
    if (n.includes('seitenwand') || n.includes('side wall')) return 'Festverglaste Aluminium-Seitenwand';
    if (n.includes('frontwand') || n.includes('front wall')) return 'Festverglaste Aluminium-Frontwand';
    if (n.includes('keilfenster') || n.includes('wedge')) return 'Dreieckiges Keilfenster (Giebeldreieck)';
    if (n.includes('schiebetür') || n.includes('schiebetuer')) return 'Aluminium-Schiebetür mit Rollenlaufwerk';
    if (n.includes('panorama')) return 'Rahmenlose Panorama-Glasschiebewand, ESG 10 mm';
    if (n.includes('zip')) return 'ZIP-Senkrechtmarkise mit Somfy-Motor (Textilscreen)';
    if (n.includes('markise') || n.includes('awning')) return 'Aufdachmarkise mit Somfy-Motor';
    if (n.includes('led') && n.includes('spot')) return 'Einbau in Sparren, warmweiß 3000K';
    if (n.includes('led') && n.includes('strip')) return 'Indirekte Beleuchtung, warmweiß 3000K';
    if (n.includes('led')) return 'Integriert in Konstruktion, warmweiß 3000K';
    if (n.includes('heiz') || n.includes('infrarot')) return 'Fernbedienung, spritzwassergeschützt (IP65)';
    if (n.includes('wpc')) return 'Premium Holz-Kunststoff-Verbundwerkstoff, rutschfest';
    return null;
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
                // NOTE: No auto-print — user clicks "PDF Speichern" button when ready
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
    const dach = p?.dachrechnerData;

    // Calculations
    const installNet = offer.pricing?.installationCosts?.totalInstallation || 0;
    const totalNet = offer.pricing?.sellingPriceNet || 0;
    const totalGross = offer.pricing?.sellingPriceGross || (totalNet * 1.19);
    const totalVat = totalGross - totalNet;
    const productOnlyNet = totalNet - installNet;
    const discount = offer.pricing?.discountValue || 0;
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

    // Structural data
    const postCount = p?.numberOfPosts || Math.max(2, Math.ceil((p?.width || 3000) / 3500) + 1);
    const fieldCount = p?.numberOfFields || Math.max(2, Math.ceil((p?.width || 3000) / 900));
    const rafterCount = fieldCount + 1;
    const isCombined = !!(p?.splitPoint && p?.width > 7000);
    const hasKeil = dach && (dach.keilhoeheK1 != null || dach.keilhoeheK2 != null);

    // Collect all line items
    const lineItems: Array<{ name: string; subtext?: string; price: number; isBold?: boolean }> = [];

    // Base product
    if (!isManual) {
        lineItems.push({
            name: `${model} Terrassenüberdachung`,
            subtext: 'Hochwertiges Aluminiumprofilsystem, pulverbeschichtet.\nInkl. Pfosten, Rinnenprofil und Wandanschluss.',
            price: offer.pricing?.basePrice || 0,
            isBold: true,
        });
    }

    // Addons (V1)
    (offer.product?.addons || []).forEach((addon: any) => {
        lineItems.push({
            name: translateAddonName(addon.name),
            subtext: addon.variant || getAddonSubtext(addon.name) || undefined,
            price: addon.price,
        });
    });

    // Items (V2)
    ((p?.items || []) as any[])
        .filter((i: any) => !i.name?.toLowerCase().includes(p.modelId?.toLowerCase() || ''))
        .forEach((item: any) => {
            lineItems.push({
                name: translateAddonName(item.name),
                subtext: item.config || getAddonSubtext(item.name, item.config) || undefined,
                price: item.price,
            });
        });

    // Custom items (manual positions)
    ((p?.customItems || []) as any[]).forEach((ci: any) => {
        const qty = ci.quantity || 1;
        lineItems.push({
            name: ci.name || 'Zusätzliche Position',
            subtext: (ci.description && ci.description !== 'Manuelle Angebotsposition' && ci.description !== 'Manuelle Position')
                ? `${ci.description}${qty > 1 ? ` · Menge: ${qty} Stk.` : ''}`
                : qty > 1 ? `Menge: ${qty} Stk.` : undefined,
            price: ci.price * qty,
        });
    });

    return (
        <div className="bg-slate-100 min-h-screen print:bg-white print:min-h-0 font-['Helvetica_Neue',Helvetica,Arial,sans-serif]">
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
                    
                    /* Fixed Header */
                    .print-fixed-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 24mm;
                        background: #121c2d !important;
                        z-index: 1000;
                    }

                    /* Fixed Footer */
                    .print-fixed-footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: white !important;
                        padding: 3mm 15mm;
                        border-top: 0.5pt solid #e2e8f0;
                        height: 18mm;
                        z-index: 1000;
                    }

                    /* Spacers */
                    .header-space { height: 28mm; }
                    .footer-space { height: 21mm; }

                    .doc-table { width: 100%; border-collapse: collapse; border: none; }
                    .content-table thead { display: table-header-group; }
                    .content-table tr { page-break-inside: avoid; }
                    .keep-together { page-break-inside: avoid; break-inside: avoid; }
                    .page-break { page-break-before: always; break-before: page; }

                    /* Page counter */
                    .print-fixed-footer .page-counter {
                        counter-increment: page;
                    }
                    .print-fixed-footer .page-counter::after {
                        content: counter(page);
                    }
                }

                /* Screen preview styles */
                @media screen {
                    .print-fixed-header, .print-fixed-footer { display: none; }
                    .header-space, .footer-space { display: none; }
                }
            `}</style>

            {/* ═══ FIXED HEADER (Print only) ═══ */}
            <div className="print-fixed-header print:block hidden">
                <div className="px-[15mm] h-full flex items-center justify-between">
                    <div className="w-[40mm]">
                        <img src="/logo.png" alt="Polendach24" className="h-[10mm] w-auto object-contain brightness-0 invert" />
                    </div>
                    <div className="text-right">
                        <p className="text-slate-300 text-[8pt] leading-tight">Ihr Premium Partner für Terrassen</p>
                        <p className="text-[#c5a065] font-bold text-[9pt]">www.polendach24.de</p>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[1mm] bg-[#c5a065] print:bg-[#c5a065]"></div>
            </div>

            {/* ═══ FIXED FOOTER (Print only) ═══ */}
            <div className="print-fixed-footer print:block hidden">
                <div className="flex justify-between items-end text-[6.5pt] text-slate-400 leading-tight">
                    <div>
                        <span className="font-bold text-slate-600">PolenDach24 S.C.</span><br />
                        Kolonia Wałowice 221/33, 66-620 Gubin<br />
                        NIP: PL9261695520
                    </div>
                    <div className="text-center">
                        Tel: 03561 501 9981 | +49 157 5064 6936<br />
                        E-Mail: buero@polendach24.de
                    </div>
                    <div className="text-right">
                        Sparkasse Spree-Neiße<br />
                        IBAN: DE79 1805 0000 0190 1228 89<br />
                        BIC: WELADED1CBN
                    </div>
                </div>
            </div>

            {/* ═══ DOCUMENT FLOW ═══ */}
            <div className="bg-white shadow-xl px-[15mm] pb-[10mm] max-w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:px-0 print:pb-0 print:max-w-none print:mx-0">
                <table className="doc-table">
                    <thead className="print:table-header-group hidden"><tr><td><div className="header-space"></div></td></tr></thead>
                    <tfoot className="print:table-footer-group hidden"><tr><td><div className="footer-space"></div></td></tr></tfoot>

                    <tbody>
                        <tr>
                            <td className="align-top py-8 print:py-0 px-[15mm] print:px-[15mm]">

                                {/* ═══ WEB HEADER (Hidden in Print) ═══ */}
                                <header className="bg-[#121c2d] h-[24mm] flex flex-col justify-center relative mb-6 -mx-[15mm] print:hidden">
                                    <div className="px-[15mm] flex items-center justify-between">
                                        <div className="w-[40mm]"><img src="/logo.png" alt="Polendach24" className="h-[10mm] brightness-0 invert" /></div>
                                        <div className="text-right">
                                            <p className="text-slate-300 text-[8pt]">Ihr Premium Partner für Terrassen</p>
                                            <p className="text-[#c5a065] font-bold text-[9pt]">www.polendach24.de</p>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-[1mm] bg-[#c5a065]"></div>
                                </header>

                                {/* ═══════════════════════════════ */}
                                {/* PAGE 1: COVER & CONFIGURATION  */}
                                {/* ═══════════════════════════════ */}
                                <div className="min-h-[220mm] flex flex-col">

                                    {/* ─── METADATA ROW ─── */}
                                    <div className="flex justify-between items-start mb-8">
                                        {/* Customer Address */}
                                        <div className="text-[10pt] leading-relaxed max-w-[55%]">
                                            <p className="text-slate-400 mb-3 text-[8pt] tracking-wide">
                                                PolenDach24 S.C. · Kolonia Wałowice 221/33 · 66-620 Gubin
                                            </p>
                                            {c.companyName && <p className="font-bold text-slate-900">{c.companyName}</p>}
                                            <p className="text-slate-900">{[c.salutation, c.firstName, c.lastName].filter(Boolean).join(' ') || 'Kunde'}</p>
                                            <p className="text-slate-900">{[c.street, c.houseNumber].filter(Boolean).join(' ')}</p>
                                            <p className="text-slate-900">{[c.postalCode, c.city].filter(Boolean).join(' ')}</p>
                                            <p className="text-slate-900">{c.country || 'Deutschland'}</p>
                                        </div>

                                        {/* Offer Badge */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-sm overflow-hidden w-[70mm] shrink-0">
                                            <div className="bg-[#121c2d] px-4 py-1.5 print:bg-[#121c2d]">
                                                <span className="text-[#c5a065] text-[7pt] font-bold uppercase tracking-[0.15em]">Angebot</span>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[8pt] text-slate-400 uppercase tracking-wider font-medium">Nr.</span>
                                                    <span className="font-bold text-[#121c2d] text-[11pt]">{offer.offerNumber || 'ENTWURF'}</span>
                                                </div>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[8pt] text-slate-400">Datum</span>
                                                    <span className="font-medium text-slate-800 text-[9pt]">{offerDate}</span>
                                                </div>
                                                <div className="flex justify-between items-baseline border-t border-slate-100 pt-1.5">
                                                    <span className="text-[8pt] text-slate-400">Gültig bis</span>
                                                    <span className="font-medium text-slate-800 text-[9pt]">{validUntilStr}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── HERO TITLE + PRODUCT IMAGE ─── */}
                                    <div className="mb-6 flex justify-between gap-6 items-start">
                                        <div className="flex-1 min-w-0">
                                            <h1 className="text-[22pt] font-bold text-[#121c2d] mb-1 leading-tight">{model}</h1>
                                            <h2 className="text-[#c5a065] font-medium text-[12pt] mb-5">Ihr persönliches Angebot</h2>

                                            <div className="text-[10pt] text-slate-600 leading-relaxed space-y-2">
                                                <p>
                                                    {c.salutation === 'Frau'
                                                        ? `Sehr geehrte Frau ${c.lastName},`
                                                        : c.lastName
                                                            ? `Sehr geehrter Herr ${c.lastName},`
                                                            : 'Sehr geehrte Damen und Herren,'}
                                                </p>
                                                <p>
                                                    vielen Dank für Ihr Vertrauen und das Interesse an unseren hochwertigen Aluminiumsystemen.
                                                    Wir freuen uns, Ihnen basierend auf Ihren Wünschen diese maßgeschneiderte Lösung präsentieren zu dürfen.
                                                </p>
                                                <p>
                                                    Bei <b>Polendach24</b> stehen Qualität, Langlebigkeit und Ästhetik an erster Stelle.
                                                    Ihre gewählte Konfiguration vereint modernes Design mit höchster Funktionalität.
                                                </p>
                                            </div>
                                        </div>

                                        {productImage && (
                                            <div className="w-[75mm] shrink-0 pt-3">
                                                <div className="relative aspect-video rounded-sm overflow-hidden shadow-sm border border-slate-200 bg-slate-50">
                                                    <img src={productImage} alt={model} className="object-cover w-full h-full" />
                                                </div>
                                                <div className="text-[7pt] text-slate-400 text-center mt-1.5 italic">Beispielabbildung {model}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── CONFIGURATION HIGHLIGHT BOX ─── */}
                                    <div className="bg-[#121c2d] text-white p-6 rounded-sm shadow-sm print:bg-[#121c2d] print:text-white keep-together">
                                        <h3 className="text-[#c5a065] text-[7pt] font-bold uppercase tracking-[0.2em] mb-4 border-b border-white/10 pb-2">
                                            {isManual ? 'Ihr individuelles Angebot' : 'Ihre Konfiguration im Überblick'}
                                        </h3>

                                        {isManual ? (
                                            <div>
                                                {p.manualDescription ? (
                                                    <div className="text-slate-200 text-[9pt] leading-relaxed whitespace-pre-wrap">{p.manualDescription}</div>
                                                ) : (
                                                    <div className="text-slate-400 text-[9pt] italic">Detaillierte Positionen finden Sie auf der nächsten Seite.</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-y-5 gap-x-6">
                                                <div>
                                                    <span className="block text-slate-400 text-[7pt] uppercase tracking-wide mb-0.5">Modell</span>
                                                    <span className="font-bold text-[13pt] block">{model}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-400 text-[7pt] uppercase tracking-wide mb-0.5">Abmessungen (B × T)</span>
                                                    <span className="font-bold text-[13pt] block">{p.width} × {p.projection} mm</span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-400 text-[7pt] uppercase tracking-wide mb-0.5">Farbgebung</span>
                                                    <span className="font-bold text-[12pt] block">{translateForView(p.color || '', 'colors')}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-400 text-[7pt] uppercase tracking-wide mb-0.5">Dacheindeckung</span>
                                                    <span className="font-bold text-[12pt] block">{translateForView(p.roofType || '', 'roofTypes')}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-400 text-[7pt] uppercase tracking-wide mb-0.5">Montage</span>
                                                    <span className="font-bold text-[12pt] block">{translateForView(p.installationType || 'wall', 'installation')}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-400 text-[7pt] uppercase tracking-wide mb-0.5">Pfosten / Sparren</span>
                                                    <span className="font-bold text-[12pt] block">{postCount} Pfosten · {rafterCount} Sparren</span>
                                                </div>
                                                {isCombined && (
                                                    <div className="col-span-3 pt-2 border-t border-white/10">
                                                        <span className="block text-[#c5a065] text-[7pt] uppercase tracking-wide mb-0.5">✂ Verbundkonstruktion</span>
                                                        <span className="font-bold text-[11pt] block">
                                                            Teilungspfosten bei {p.splitPoint} mm — Segment 1: {p.splitPoint} mm · Segment 2: {p.width - p.splitPoint} mm
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ─── DACHRECHNER TECHNICAL DATA ─── */}
                                        {dach && !isManual && (
                                            <div className="mt-4 pt-3 border-t border-white/10">
                                                <span className="text-[#c5a065] text-[6.5pt] font-bold uppercase tracking-[0.15em] block mb-2">
                                                    Technische Daten (Dachrechner)
                                                </span>
                                                <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-[8pt] text-slate-300">
                                                    {dach.angleAlpha != null && <span>Neigung: {dach.angleAlpha.toFixed(1)}°</span>}
                                                    {dach.h3 != null && <span>H3 Rinne: {Math.round(dach.h3)} mm</span>}
                                                    {dach.h1 != null && <span>H1 Wand: {Math.round(dach.h1)} mm</span>}
                                                    {dach.sparrenMitte != null && <span>Sparrenabstand: {Math.round(dach.sparrenMitte)} mm</span>}
                                                    {dach.inclinationMmM != null && <span>Gefälle: {dach.inclinationMmM.toFixed(0)} mm/m</span>}
                                                    {dach.depthD2 != null && <span>D2 m. Rinne: {Math.round(dach.depthD2)} mm</span>}
                                                    {dach.fensterF2 != null && <span>Fensterbreite: {Math.round(dach.fensterF2)} mm</span>}
                                                    {p.postWidth && <span>Pfostenbreite: {p.postWidth} mm</span>}
                                                </div>
                                                {hasKeil && (
                                                    <div className="grid grid-cols-4 gap-x-4 mt-1 text-[8pt] text-[#c5a065]">
                                                        <span>K1 Rinne: {dach.keilhoeheK1 != null ? `${Math.round(dach.keilhoeheK1)} mm` : '—'}</span>
                                                        <span>K2 Haus: {dach.keilhoeheK2 != null ? `${Math.round(dach.keilhoeheK2)} mm` : '—'}</span>
                                                        {dach.fensterF1 != null && (
                                                            <span>F1/F3: {Math.round(dach.fensterF1)}/{dach.fensterF3 != null ? Math.round(dach.fensterF3) : '—'} mm</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Page 1 bottom note */}
                                    <div className="text-[8pt] text-slate-400 text-center mt-auto pt-8 pb-2">
                                        Detaillierte Kostenaufstellung auf der nächsten Seite →
                                    </div>
                                </div>

                                {/* ═══ PAGE BREAK ═══ */}
                                <div className="page-break"></div>

                                {/* ═══════════════════════════════ */}
                                {/* PAGE 2: PRICING TABLE          */}
                                {/* ═══════════════════════════════ */}
                                <div className="mt-6">
                                    <h3 className="text-[14pt] font-bold text-[#121c2d] mb-1">Detaillierte Kostenaufstellung</h3>
                                    <p className="text-[8pt] text-slate-400 mb-4">
                                        Angebot Nr. {offer.offerNumber || 'ENTWURF'} · {model} · {offerDate}
                                    </p>

                                    <table className="w-full text-[9pt] content-table border-collapse">
                                        <thead className="bg-slate-50 print:bg-slate-50">
                                            <tr className="border-y border-slate-200">
                                                <th className="py-2 px-2 text-left w-[10mm] text-[7pt] uppercase tracking-wider font-bold text-[#121c2d]">Pos.</th>
                                                <th className="py-2 px-2 text-left text-[7pt] uppercase tracking-wider font-bold text-[#121c2d]">Beschreibung</th>
                                                <th className="py-2 px-2 text-right w-[28mm] text-[7pt] uppercase tracking-wider font-bold text-[#121c2d]">Betrag (netto)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="print:bg-white keep-together">
                                                    <td className="py-2.5 px-2 text-center align-top text-slate-400 text-[8pt]">{idx + 1}</td>
                                                    <td className="py-2.5 px-2 align-top">
                                                        <div className={`text-slate-800 ${item.isBold ? 'font-bold' : ''}`}>
                                                            {item.name}
                                                        </div>
                                                        {item.subtext && (
                                                            <div className="text-[8pt] text-slate-500 mt-0.5 whitespace-pre-line leading-snug">
                                                                {item.subtext}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right align-top font-medium text-slate-800 tabular-nums">
                                                        {formatCurrency(item.price)}
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Installation row */}
                                            {installNet > 0 && (
                                                <tr className="bg-slate-50 print:bg-slate-50 keep-together">
                                                    <td className="py-2.5 px-2 text-center align-top text-slate-400 text-[8pt]">M</td>
                                                    <td className="py-2.5 px-2 align-top">
                                                        <div className="font-medium text-slate-900">Fachmontage & Logistik</div>
                                                        <div className="text-[8pt] text-slate-500 mt-0.5">
                                                            Lieferung und fachgerechte Montage durch unser Expertenteam.<br />
                                                            Inkl. aller Befestigungsmaterialien und Kleinmaterial.
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right align-top font-medium text-slate-800 tabular-nums">
                                                        {formatCurrency(installNet)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ═══ SUMMARY BLOCK ═══ */}
                                <div className="keep-together mt-6 border-t-2 border-slate-100 pt-5">
                                    <div className="grid grid-cols-2 gap-8">

                                        {/* ─── LEFT: Sales Rep Contact ─── */}
                                        <div className="pt-1">
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[#121c2d] text-[9pt] font-bold border border-slate-200 print:bg-slate-100 shrink-0">
                                                    {repName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#121c2d] text-[10pt]">{repName}</div>
                                                    <div className="text-[7pt] text-slate-500 uppercase tracking-wide">Ihr Ansprechpartner</div>
                                                </div>
                                            </div>
                                            <div className="text-[8.5pt] text-slate-600 space-y-1 pl-0.5">
                                                <div className="flex gap-1.5 items-center"><span className="text-slate-400 text-[7pt]">📱</span> {repPhone}</div>
                                                <div className="flex gap-1.5 items-center"><span className="text-slate-400 text-[7pt]">✉</span> {repEmail}</div>
                                                <div className="flex gap-1.5 items-center"><span className="text-slate-400 text-[7pt]">🌐</span> www.polendach24.de</div>
                                            </div>
                                        </div>

                                        {/* ─── RIGHT: Price Calculation ─── */}
                                        <div>
                                            <div className="space-y-1.5 text-[9pt] mb-4">
                                                {/* Product net */}
                                                <div className="flex justify-between text-slate-500">
                                                    <span>Terrassenüberdachung:</span>
                                                    <span className="tabular-nums">{formatCurrency(productOnlyNet)}</span>
                                                </div>
                                                {/* Installation net */}
                                                {installNet > 0 && (
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Montage & Lieferung:</span>
                                                        <span className="tabular-nums">{formatCurrency(installNet)}</span>
                                                    </div>
                                                )}
                                                {/* Netto sum */}
                                                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                                                    <span>Summe netto:</span>
                                                    <span className="tabular-nums">{formatCurrency(totalNet)}</span>
                                                </div>
                                                {/* VAT */}
                                                <div className="flex justify-between text-slate-500 text-[8pt]">
                                                    <span>zzgl. 19% MwSt.:</span>
                                                    <span className="tabular-nums">{formatCurrency(totalVat)}</span>
                                                </div>
                                                {/* Discount */}
                                                {hasDiscount && (
                                                    <>
                                                        <div className="flex justify-between text-slate-400 pt-1 text-[8pt]">
                                                            <span>Regulärer Bruttopreis:</span>
                                                            <span className="line-through tabular-nums">{formatCurrency(originalGross)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-green-600 font-bold bg-green-50 rounded px-2 py-1 text-[9pt] print:bg-green-50">
                                                            <span>🏷 {offer.pricing?.discountPercentage
                                                                ? `Sonderrabatt (−${offer.pricing.discountPercentage}%)`
                                                                : 'Sonderrabatt'
                                                            }:</span>
                                                            <span className="tabular-nums">−{formatCurrency(discountGross)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Grand Total */}
                                            <div className="bg-[#121c2d] text-white p-4 rounded-sm flex justify-between items-center print:bg-[#121c2d] print:text-white">
                                                <div>
                                                    <span className="block font-bold text-[10pt]">GESAMTBETRAG</span>
                                                    <span className="text-[7pt] text-slate-400">Inkl. MwSt.{installNet > 0 ? ' & Montage' : ''}</span>
                                                </div>
                                                <span className="font-bold text-[16pt] text-[#c5a065]">{formatCurrency(totalGross)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── SIGNATURE AREA ─── */}
                                    <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between text-[8pt] text-slate-400">
                                        <div className="w-[38%]">
                                            <div className="border-t border-slate-300 pt-1.5">Ort, Datum</div>
                                        </div>
                                        <div className="w-[38%]">
                                            <div className="border-t border-slate-300 pt-1.5">Unterschrift / Stempel</div>
                                        </div>
                                    </div>

                                    {/* ─── TRUST BADGES ─── */}
                                    <div className="mt-8 flex justify-center gap-6 text-[7pt] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                        <span className="flex items-center gap-1"><span className="text-[#c5a065]">✓</span> Premium Qualität Made in EU</span>
                                        <span className="flex items-center gap-1"><span className="text-[#c5a065]">✓</span> 5 Jahre Garantie</span>
                                        <span className="flex items-center gap-1"><span className="text-[#c5a065]">✓</span> Pulverbeschichtung nach GSB</span>
                                        <span className="flex items-center gap-1"><span className="text-[#c5a065]">✓</span> Zertifizierte Statik</span>
                                    </div>

                                    {/* ─── VALIDITY ─── */}
                                    <div className="mt-4 text-center text-[7pt] text-slate-400">
                                        Dieses Angebot ist gültig bis {validUntilStr}. Alle Preise in EUR. Es gelten unsere AGB.
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══ UI CONTROLS (Screen only) ═══ */}
            <div className="fixed bottom-6 right-6 print:hidden flex gap-3 z-50">
                <button
                    onClick={() => window.close()}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-full shadow-lg font-bold text-sm transition-all"
                >
                    Schließen
                </button>
                <button
                    onClick={() => window.print()}
                    className="bg-[#121c2d] hover:bg-slate-800 text-white px-6 py-2.5 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 transition-all"
                >
                    <span>🖨️</span> PDF Speichern
                </button>
            </div>
        </div>
    );
};
