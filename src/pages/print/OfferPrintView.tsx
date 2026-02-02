import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfferService } from '../../services/database/offer.service';
import type { Offer } from '../../types';
import { translate, formatCurrency } from '../../utils/translations';
// import { LOGO_BASE64 } from '../../utils/assets'; // Unused

// UTILS
function translateForView(key: string, category: string): string {
    const v2Map: Record<string, string> = {
        // Models - using "style" naming convention
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
        'stopsol': 'Stopsol (Sonnenschutz)', 'ir-gold': 'IR Gold (Hitzeschutz)',
        // Installation
        'wall': 'Wandmontage', 'wall-mounted': 'Wandmontage',
        'freestanding': 'Freistehend', 'wedge': 'Keilform',
        // Colors
        'anthracite': 'Anthrazit (RAL 7016)', 'white': 'Weiss (RAL 9016)',
        'ral7016': 'Anthrazit (RAL 7016)', 'ral9016': 'Weiss (RAL 9016)',
        'silberr': 'Silber (RAL 9006)', 'sepia': 'Sepiabraun (RAL 8014)'
    };
    if (v2Map[key?.toLowerCase()]) return v2Map[key.toLowerCase()];
    return translate(key, category as any);
}

export const OfferPrintView: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOffer = async () => {
            if (!token) return;
            try {
                // Try to get offer by token (Public) - using upgraded RPC
                const data = await OfferService.getOfferByToken(token);
                setOffer(data);

                // Automatically trigger print dialog once loaded and images ready
                if (data) {
                    setTimeout(() => {
                        window.print();
                    }, 1500); // Slightly longer delay to ensure font rendering
                }
            } catch (error) {
                console.error('Error loading offer:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOffer();
    }, [token]);

    if (loading) return <div className="h-screen flex items-center justify-center">Lade Angebot...</div>;
    if (!offer) return <div className="h-screen flex items-center justify-center">Angebot nicht gefunden.</div>;

    // --- CONTEXT ---
    let repName = 'Ihr Expertenteam';
    let repPhone = '03561 501 9981';
    let repEmail = 'buero@polendach24.de';

    // Logic to find creator (Handles snake_case from DB RPC or camelCase if mapped)
    if (offer.creator) {
        const c = offer.creator as any;
        if (c.full_name) {
            repName = c.full_name;
        } else if (c.firstName) {
            repName = `${c.firstName} ${c.lastName || ''}`;
        }

        repPhone = c.phone || repPhone;
        repEmail = c.email || c.email_config?.sender_email || repEmail;
    }

    const c = offer.customer || {} as any;
    const model = translateForView(offer.product?.modelId || '', 'models');

    // Calculations
    const net = offer.pricing?.sellingPriceNet || 0;
    const discount = offer.pricing?.discountValue || 0;
    const vat = net * 0.19;
    const gross = net + vat;
    const preDiscount = net + discount;

    return (
        <div className="bg-slate-100 min-h-screen print:bg-white print:min-h-0 font-sans">
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
                    }
                    
                    /* Fixed Header - Compact Premium */
                    .print-fixed-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 28mm; /* Reduced from 35mm */
                        background: #121c2d !important;
                        z-index: 1000;
                    }

                    /* Fixed Footer - Compact Premium */
                    .print-fixed-footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: white !important;
                        padding: 4mm 15mm;
                        border-top: 1px solid #e2e8f0;
                        height: 22mm; /* Reduced from 30mm */
                        z-index: 1000;
                    }

                    /* Spacers matching Fixed Elements + Padding */
                    .header-space { height: 32mm; } /* 28mm + 4mm buffer */
                    .footer-space { height: 25mm; } /* 22mm + 3mm buffer */

                    .doc-table { width: 100%; border-collapse: collapse; border: none; }
                    .content-table thead { display: table-header-group; }
                    .content-table tr { page-break-inside: avoid; }
                    .keep-together { page-break-inside: avoid; }
                }
            `}</style>

            {/* --- VISUAL FIXED ELEMENTS (Out of Flow) --- */}

            {/* Header */}
            <div className="print-fixed-header print:block hidden">
                <div className="px-[15mm] h-full flex items-center justify-between">
                    <div className="w-[45mm]">
                        <img src="/logo.png" alt="PolenDach24" className="h-[12mm] w-auto object-contain brightness-0 invert" />
                    </div>
                    <div className="text-right">
                        <p className="text-slate-300 text-[10px]">Ihr Premium Partner für Terrassen.</p>
                        <p className="text-[#c5a065] font-bold text-sm leading-tight">www.polendach24.de</p>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[1.5mm] bg-[#c5a065] print:bg-[#c5a065]"></div>
            </div>

            {/* Footer */}
            <div className="print-fixed-footer print:block hidden">
                <div className="grid grid-cols-3 gap-4 text-[7px] text-slate-500 leading-tight">
                    <div>
                        <span className="font-bold block text-slate-700 mb-0.5">PolenDach24 S.C.</span>
                        Kolonia Wałowice 221/33, 66-620 Gubin<br />NIP: PL9261695520
                    </div>
                    <div>
                        <span className="font-bold block text-slate-700 mb-0.5">Kontakt</span>
                        Tel: +49 157 5064 6936<br />Email: buero@polendach24.de
                    </div>
                    <div>
                        <span className="font-bold block text-slate-700 mb-0.5">Bankverbindung</span>
                        Sparkasse Spree-Neiße | DE79 1805 0000 0190 1228 89<br />BIC: WELADED1CBN
                    </div>
                </div>
            </div>

            {/* --- DOCUMENT FLOW --- */}
            <div className="bg-white shadow-xl px-[15mm] pb-[10mm] max-w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:px-0 print:pb-0 print:max-w-none print:mx-0">
                <table className="doc-table">
                    <thead className="print:table-header-group hidden"><tr><td><div className="header-space"></div></td></tr></thead>
                    <tfoot className="print:table-footer-group hidden"><tr><td><div className="footer-space"></div></td></tr></tfoot>

                    <tbody>
                        <tr>
                            <td className="align-top py-8 print:py-0 px-[15mm] print:px-[15mm]">

                                {/* WEB HEADER (Hidden Print) */}
                                <header className="bg-[#121c2d] h-[28mm] flex flex-col justify-center relative mb-8 -mx-[15mm] print:hidden">
                                    <div className="px-[15mm] flex items-center justify-between">
                                        <div className="w-[45mm]"><img src="/logo.png" alt="PolenDach24" className="h-[12mm] brightness-0 invert" /></div>
                                        <div className="text-right">
                                            <p className="text-slate-300 text-[10px]">Ihr Premium Partner für Terrassen.</p>
                                            <p className="text-[#c5a065] font-bold text-sm">www.polendach24.de</p>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-[1.5mm] bg-[#c5a065]"></div>
                                </header>

                                {/* METADATA */}
                                <div className="flex justify-between items-start mb-8">
                                    <div className="text-[11px] leading-relaxed">
                                        <p className="text-slate-400 mb-3 text-[10px]">PolenDach24 S.C. - Kolonia Wałowice 221/33 - 66-620 Gubin</p>
                                        {c.companyName && <p className="font-bold text-slate-900">{c.companyName}</p>}
                                        <p className="text-slate-900">{c.salutation} {c.firstName} {c.lastName}</p>
                                        <p className="text-slate-900">{c.street} {c.houseNumber}</p>
                                        <p className="text-slate-900">{c.postalCode} {c.city}</p>
                                        <p className="text-slate-900">{c.country || 'Deutschland'}</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-3 w-[70mm] rounded-sm">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Angebot</span>
                                            <span className="font-bold text-[#121c2d]">{offer.offerNumber || 'DRAFT'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500">Datum</span>
                                            <span className="font-medium text-slate-900">{new Date().toLocaleDateString('de-DE')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HERO */}
                                <div className="mb-6">
                                    <h1 className="text-2xl font-bold text-[#121c2d] mb-0.5">{model}</h1>
                                    <p className="text-[#c5a065] font-medium text-base">Ihr exklusives Angebot</p>
                                </div>
                                <div className="text-[13px] text-slate-600 leading-relaxed mb-6 max-w-[160mm]">
                                    <p className="mb-2">
                                        {c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.lastName},` : c.lastName ? `Sehr geehrter Herr ${c.lastName},` : 'Sehr geehrte Damen und Herren,'}
                                    </p>
                                    <p>vielen Dank für Ihr Interesse. Hier ist Ihre persönliche Konfiguration:</p>
                                </div>

                                {/* SPECS */}
                                <div className="bg-[#121c2d] text-white p-5 rounded-sm mb-8 print:bg-[#121c2d]">
                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                        <div><span className="block text-slate-400 text-[10px] mb-0.5">Maße (B x T)</span><span className="font-bold text-sm block">{offer.product?.width} x {offer.product?.projection} mm</span></div>
                                        <div><span className="block text-slate-400 text-[10px] mb-0.5">Farbe</span><span className="font-bold text-sm block">{translateForView(offer.product?.color || '', 'colors')}</span></div>
                                        <div><span className="block text-slate-400 text-[10px] mb-0.5">Eindeckung</span><span className="font-bold text-sm block">{translateForView(offer.product?.roofType || '', 'roofTypes')}</span></div>
                                    </div>
                                </div>

                                {/* MAIN TABLE */}
                                <div className="mb-8">
                                    <table className="w-full text-sm content-table border-collapse">
                                        <thead className="bg-slate-50 text-[#121c2d] font-bold border-y border-slate-200 print:bg-slate-50">
                                            <tr className="h-4 print:h-[10mm] border-none bg-white print:bg-white"><th colSpan={3}></th></tr>
                                            <tr>
                                                <th className="py-2 px-3 text-left w-12 text-xs uppercase tracking-wider">Pos.</th>
                                                <th className="py-2 px-3 text-left text-xs uppercase tracking-wider">Beschreibung</th>
                                                <th className="py-2 px-3 text-right w-28 text-xs uppercase tracking-wider">Preis</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Base */}
                                            <tr className="print:bg-white break-inside-avoid">
                                                <td className="py-3 px-3 text-center align-top text-slate-400">1</td>
                                                <td className="py-3 px-3 align-top">
                                                    <div className="font-bold text-slate-900 mb-0.5">{model} Konstruktion</div>
                                                    <div className="text-xs text-slate-500 leading-snug">Basissystem inklusive Stützen und Rinnenprofil.</div>
                                                </td>
                                                <td className="py-3 px-3 text-right align-top font-medium">{formatCurrency(offer.pricing?.basePrice || 0)}</td>
                                            </tr>
                                            {/* Addons */}
                                            {(offer.product?.addons || []).map((addon, idx) => (
                                                <tr key={idx} className="print:bg-white break-inside-avoid">
                                                    <td className="py-2 px-3 text-center align-top text-slate-400">{2 + idx}</td>
                                                    <td className="py-2 px-3 align-top">
                                                        <div className="text-slate-800">{addon.name}</div>
                                                        {addon.variant && <div className="text-[11px] text-slate-500">{addon.variant}</div>}
                                                    </td>
                                                    <td className="py-2 px-3 text-right align-top text-slate-800">{formatCurrency(addon.price)}</td>
                                                </tr>
                                            ))}
                                            {/* V2 Items */}
                                            {((offer.product as any).items || []).filter((i: any) => !i.name.toLowerCase().includes(offer.product.modelId.toLowerCase())).map((item: any, idx: number) => (
                                                <tr key={`v2-${idx}`} className="print:bg-white break-inside-avoid">
                                                    <td className="py-2 px-3 text-center align-top text-slate-400">{(offer.product.addons?.length || 0) + 2 + idx}</td>
                                                    <td className="py-2 px-3 align-top">
                                                        <div className="text-slate-800">{item.name}</div>
                                                        {item.config && <div className="text-[11px] text-slate-500">{item.config}</div>}
                                                    </td>
                                                    <td className="py-2 px-3 text-right align-top text-slate-800">{formatCurrency(item.price)}</td>
                                                </tr>
                                            ))}
                                            {/* Installation */}
                                            {offer.pricing?.installationCosts && (
                                                <tr className="bg-slate-50 print:bg-slate-50 break-inside-avoid">
                                                    <td className="py-3 px-3 text-center align-top text-slate-400">M</td>
                                                    <td className="py-3 px-3 align-top">
                                                        <div className="font-medium text-slate-900">Montage & Logistik</div>
                                                        <div className="text-[11px] text-slate-500">Fachgerechte Montage am Objektstandort.</div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right align-top font-medium">{formatCurrency(offer.pricing.installationCosts.totalInstallation)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* SUMMARY BLOCK */}
                                <div className="break-inside-avoid page-break-box mt-4 border-t-2 border-slate-100 pt-6">
                                    <div className="grid grid-cols-2 gap-10">

                                        {/* Contact */}
                                        <div className="pt-2">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-[#121c2d] font-bold border border-slate-200 print:bg-slate-100">
                                                    {repName.split(' ')[0][0]}{repName.split(' ').length > 1 ? repName.split(' ')[1][0] : ''}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#121c2d] text-sm">{repName}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase">Ihr Ansprechpartner</div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-600 space-y-1 pl-1">
                                                <div className="flex gap-2"><span>📱</span> {repPhone}</div>
                                                <div className="flex gap-2"><span>✉️</span> {repEmail}</div>
                                            </div>
                                        </div>

                                        {/* Calculation */}
                                        <div>
                                            <div className="space-y-1.5 text-sm mb-4">
                                                <div className="flex justify-between text-slate-500">
                                                    <span>Zwischensumme:</span>
                                                    <span>{formatCurrency(preDiscount)}</span>
                                                </div>
                                                {discount > 0 && (
                                                    <div className="flex justify-between text-[#d63031]">
                                                        <span>Rabatt:</span>
                                                        <span>- {formatCurrency(discount)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                                                    <span>Netto:</span>
                                                    <span>{formatCurrency(net)}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-500 text-xs">
                                                    <span>+ 19% MwSt.:</span>
                                                    <span>{formatCurrency(vat)}</span>
                                                </div>
                                            </div>
                                            <div className="bg-[#121c2d] text-white p-4 rounded-sm flex justify-between items-center print:bg-[#121c2d] print:text-white">
                                                <span className="font-bold text-sm">GESAMTPREIS</span>
                                                <span className="font-bold text-xl text-[#c5a065]">{formatCurrency(gross)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trust Badges */}
                                    <div className="mt-8 flex justify-center gap-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-4">
                                        <span className="flex items-center gap-1.5"><span className="text-[#c5a065]">✓</span> 5 Jahre Garantie</span>
                                        <span className="flex items-center gap-1.5"><span className="text-[#c5a065]">✓</span> Pulverbeschichtung</span>
                                        <span className="flex items-center gap-1.5"><span className="text-[#c5a065]">✓</span> Statik geprüft</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* UI CONTROLS */}
            <div className="fixed bottom-6 right-6 print:hidden flex gap-4 z-50">
                <button onClick={() => window.close()} className="bg-white border hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-full shadow-lg font-bold text-sm transition-all">Schließen</button>
                <button onClick={() => window.print()} className="bg-[#121c2d] hover:bg-slate-800 text-white px-6 py-2.5 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 transition-all"><span>🖨️</span> PDF Speichern</button>
            </div>
        </div>
    );
};
