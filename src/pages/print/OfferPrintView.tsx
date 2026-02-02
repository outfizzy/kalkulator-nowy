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
        <div className="bg-slate-100 min-h-screen print:bg-white print:min-h-0">
            <style>{`
                @media print {
                    @page { 
                        size: A4;
                        margin: 0; /* Hide browser header/footer */
                    }
                    html, body {
                        height: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible;
                    }
                    
                    /* Fixed Header/Footer - Visuals Only */
                    .print-fixed-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 35mm;
                        background: #121c2d !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        z-index: 1000;
                    }

                    .print-fixed-footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: white !important;
                        padding: 5mm 15mm;
                        border-top: 1px solid #e2e8f0;
                        height: 30mm;
                        z-index: 1000;
                    }

                    /* Document Structure Table */
                    .doc-table {
                        width: 100%;
                        border-collapse: collapse;
                        border: none;
                    }
                    
                    /* Spacers to reserve area on every page */
                    .header-space { height: 38mm; } /* Sligthly more than header */
                    .footer-space { height: 32mm; } /* Slightly more than footer */

                    /* Table handling */
                    .content-table thead { display: table-header-group; }
                    .content-table tr { page-break-inside: avoid; }
                    
                    /* Blocks */
                    .keep-together { page-break-inside: avoid; }
                }
            `}</style>

            {/* --- VISUAL FIXED ELEMENTS (Out of Flow) --- */}

            {/* Header */}
            <div className="print-fixed-header print:block hidden">
                <div className="px-[15mm] h-full flex items-center justify-between">
                    <div className="w-[45mm]">
                        <img src="/logo.png" alt="PolenDach24" className="h-[14mm] w-auto object-contain brightness-0 invert" />
                    </div>
                    <div className="text-right">
                        <p className="text-slate-300 text-xs">Ihr Premium Partner für Terrassen.</p>
                        <p className="text-[#c5a065] font-bold text-sm">www.polendach24.de</p>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[1.5mm] bg-[#c5a065] print:bg-[#c5a065]"></div>
            </div>

            {/* Footer */}
            <div className="print-fixed-footer print:block hidden">
                <div className="grid grid-cols-3 gap-4 text-[8px] text-slate-500 leading-tight">
                    <div>
                        <span className="font-bold block text-slate-700 mb-1">PolenDach24 S.C.</span>
                        Kolonia Wałowice 221/33<br />66-620 Gubin<br />NIP: PL9261695520
                    </div>
                    <div>
                        <span className="font-bold block text-slate-700 mb-1">Kontakt</span>
                        Zentrale: +49 157 5064 6936<br />Email: buero@polendach24.de<br />Web: www.polendach24.de
                    </div>
                    <div>
                        <span className="font-bold block text-slate-700 mb-1">Bankverbindung</span>
                        Sparkasse Spree-Neiße<br />IBAN: DE79 1805 0000 0190 1228 89<br />BIC: WELADED1CBN
                    </div>
                </div>
            </div>

            {/* --- DOCUMENT FLOW --- */}
            <div className="bg-white shadow-xl px-[15mm] pb-[10mm] max-w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:px-0 print:pb-0 print:max-w-none print:mx-0">
                <table className="doc-table">
                    {/* Header Spacer (Repeats on every page) */}
                    <thead className="print:table-header-group hidden">
                        <tr><td><div className="header-space"></div></td></tr>
                    </thead>

                    {/* Footer Spacer (Repeats on every page) */}
                    <tfoot className="print:table-footer-group hidden">
                        <tr><td><div className="footer-space"></div></td></tr>
                    </tfoot>

                    {/* Main Content */}
                    <tbody>
                        <tr>
                            <td className="align-top py-8 print:py-0 px-[15mm] print:px-[15mm]">

                                {/* HEADER FOR WEB PREVIEW (Hidden in Print) */}
                                <header className="bg-[#121c2d] h-[35mm] relative mb-8 -mx-[15mm] print:hidden">
                                    <div className="px-[15mm] h-full flex items-center justify-between">
                                        <div className="w-[45mm]">
                                            <img src="/logo.png" alt="PolenDach24" className="h-[14mm] w-auto object-contain brightness-0 invert" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-300 text-xs">Ihr Premium Partner für Terrassen.</p>
                                            <p className="text-[#c5a065] font-bold text-sm">www.polendach24.de</p>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-[1.5mm] bg-[#c5a065]"></div>
                                </header>

                                {/* CONTENT START */}

                                {/* Metadata */}
                                <div className="flex justify-between items-start mb-10">
                                    <div className="text-xs">
                                        <p className="text-slate-400 mb-2">PolenDach24 S.C. - Kolonia Wałowice 221/33 - 66-620 Gubin</p>
                                        <div className="text-sm text-slate-800 leading-relaxed">
                                            {c.companyName && <p className="font-bold">{c.companyName}</p>}
                                            <p>{c.salutation} {c.firstName} {c.lastName}</p>
                                            <p>{c.street} {c.houseNumber}</p>
                                            <p>{c.postalCode} {c.city}</p>
                                            <p>{c.country || 'Deutschland'}</p>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 bg-slate-50 p-4 w-[70mm] rounded-sm">
                                        <div className="grid grid-cols-2 gap-4 text-xs mb-2">
                                            <div>
                                                <span className="block text-slate-400 uppercase text-[10px] tracking-wider">Angebots-Nr.</span>
                                                <span className="font-bold text-[#121c2d] text-sm block mt-1">{offer.offerNumber || 'DRAFT'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase text-[10px] tracking-wider">Datum</span>
                                                <span className="font-bold text-[#121c2d] text-sm block mt-1">{new Date().toLocaleDateString('de-DE')}</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-zinc-400 mt-2 pt-2 border-t border-slate-200">
                                            Bitte bei Rückfragen angeben
                                        </div>
                                    </div>
                                </div>

                                {/* Title & Intro */}
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold text-[#121c2d] mb-1">{model}</h1>
                                    <p className="text-[#c5a065] font-medium text-lg">Ihr exklusives Angebot</p>
                                </div>
                                <div className="text-sm text-slate-700 leading-relaxed mb-8 max-w-[170mm]">
                                    <p className="mb-4">
                                        {c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.lastName},` : c.lastName ? `Sehr geehrter Herr ${c.lastName},` : 'Sehr geehrte Damen und Herren,'}
                                    </p>
                                    <p>
                                        vielen Dank für Ihr Vertrauen. Wir freuen uns, Ihnen Ihre individuelle maßgefertigte Überdachung anbieten zu dürfen.
                                        Nachfolgend finden Sie alle Details zu Ihrer Wunschkonfiguration, sorgfältig für Sie zusammengestellt.
                                    </p>
                                </div>

                                {/* Specs */}
                                <div className="bg-[#121c2d] text-white p-6 rounded-sm mb-10 keep-together">
                                    <h3 className="text-[#c5a065] text-xs font-bold uppercase tracking-wider mb-4">Ihre Konfiguration</h3>
                                    <div className="grid grid-cols-3 gap-6 text-sm">
                                        <div>
                                            <span className="block text-slate-400 text-xs mb-1">Dimensionen</span>
                                            <span className="font-bold">{offer.product?.width} x {offer.product?.projection} mm</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-400 text-xs mb-1">Farbe / Ausführung</span>
                                            <span className="font-bold">{translateForView(offer.product?.color || '', 'colors')}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-400 text-xs mb-1">Dacheindeckung</span>
                                            <span className="font-bold">{translateForView(offer.product?.roofType || '', 'roofTypes')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="mb-8">
                                    <table className="w-full text-sm content-table">
                                        <thead className="bg-slate-100 text-[#121c2d] font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="py-3 px-4 text-left w-12">Pos.</th>
                                                <th className="py-3 px-4 text-left">Beschreibung</th>
                                                <th className="py-3 px-4 text-right w-32">Betrag</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="break-inside-avoid">
                                                <td className="py-4 px-4 text-center font-medium">1</td>
                                                <td className="py-4 px-4">
                                                    <div className="font-bold mb-1">{model} Aluminiumkonstruktion</div>
                                                    <div className="text-xs text-slate-500">Premium Pulverbeschichtung, Verstärkte Profile, Integrierte Entwässerung.</div>
                                                </td>
                                                <td className="py-4 px-4 text-right font-medium">{formatCurrency(offer.pricing?.basePrice || 0)}</td>
                                            </tr>
                                            {/* Addons */}
                                            {offer.product?.addons?.map((addon, idx) => (
                                                <tr key={idx} className="break-inside-avoid">
                                                    <td className="py-3 px-4 text-center text-slate-400">{2 + idx}</td>
                                                    <td className="py-3 px-4">
                                                        <div>{addon.name}</div>
                                                        {addon.variant && <div className="text-xs text-slate-500">{addon.variant}</div>}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">{formatCurrency(addon.price)}</td>
                                                </tr>
                                            ))}
                                            {/* V2 Items */}
                                            {(offer.product as any).items?.filter((i: any) => !i.name.toLowerCase().includes(offer.product.modelId.toLowerCase())).map((item: any, idx: number) => (
                                                <tr key={`v2-${idx}`} className="break-inside-avoid">
                                                    <td className="py-3 px-4 text-center text-slate-400">{(offer.product.addons?.length || 0) + 2 + idx}</td>
                                                    <td className="py-3 px-4">
                                                        <div>{item.name}</div>
                                                        {item.config && <div className="text-xs text-slate-500">{item.config}</div>}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">{formatCurrency(item.price)}</td>
                                                </tr>
                                            ))}
                                            {/* Installation */}
                                            {offer.pricing?.installationCosts && (
                                                <tr className="bg-slate-50/50 break-inside-avoid">
                                                    <td className="py-4 px-4 text-center text-slate-400">M</td>
                                                    <td className="py-4 px-4">
                                                        <div className="font-medium">Fachgerechte Montage & Lieferung</div>
                                                        <div className="text-xs text-slate-500">Durch zertifiziertes Montageteam. Anfahrt {offer.pricing.installationCosts.travelDistance}km.</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">{formatCurrency(offer.pricing.installationCosts.totalInstallation)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>


                                {/* Bottom Block */}
                                <div className="keep-together mt-8">
                                    <div className="grid grid-cols-2 gap-8 items-end">

                                        {/* Rep Card */}
                                        <div className="relative">
                                            <div className="border border-slate-200 rounded-sm overflow-hidden">
                                                <div className="bg-[#121c2d] h-2 w-full"></div>
                                                <div className="p-4">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Ihr persönlicher Ansprechpartner</div>
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-[#121c2d] font-bold text-lg border border-slate-200">
                                                            {repName.split(' ')[0][0]}{repName.split(' ').length > 1 ? repName.split(' ')[1][0] : ''}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[#121c2d] text-sm">{repName}</div>
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-wide">Experte für Überdachungen</div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 text-xs text-slate-600">
                                                        <div className="flex items-center gap-2"><span className="text-slate-400">📱</span> {repPhone}</div>
                                                        <div className="flex items-center gap-2"><span className="text-slate-400">✉️</span> {repEmail}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Totals */}
                                        <div className="flex flex-col justify-end">
                                            {discount > 0 && (
                                                <div className="space-y-1 mb-3 border-b border-slate-200 pb-3 text-sm">
                                                    <div className="flex justify-between text-slate-500"><span>Listenpreis:</span><span>{formatCurrency(preDiscount)}</span></div>
                                                    <div className="flex justify-between text-[#d63031] font-medium"><span>Rabatt (-{offer.pricing?.discountPercentage}%):</span><span>- {formatCurrency(discount)}</span></div>
                                                </div>
                                            )}
                                            <div className="space-y-1 mb-4 text-sm">
                                                <div className="flex justify-between font-bold text-slate-800"><span>Endpreis Netto:</span><span>{formatCurrency(net)}</span></div>
                                                <div className="flex justify-between text-slate-500"><span>zzgl. 19% MwSt.:</span><span>{formatCurrency(vat)}</span></div>
                                            </div>
                                            <div className="bg-[#121c2d] text-white p-4 rounded-sm flex justify-between items-center">
                                                <div className="flex flex-col"><span className="font-bold text-sm">GESAMTBETRAG</span><span className="text-[9px] opacity-70">inkl. MwSt. & Montage</span></div>
                                                <span className="font-bold text-xl text-[#c5a065]">{formatCurrency(gross)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="mt-12 text-center pt-6 border-t border-slate-200">
                                        <div className="flex justify-center gap-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><span className="text-[#c5a065] text-lg">✓</span> Bestpreis</span>
                                            <span className="flex items-center gap-1"><span className="text-[#c5a065] text-lg">✓</span> 5 Jahre Garantie</span>
                                            <span className="flex items-center gap-1"><span className="text-[#c5a065] text-lg">✓</span> Alles aus einer Hand</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* UI CONTROLS */}
            <div className="fixed bottom-8 right-8 print:hidden flex gap-4 z-50">
                <button onClick={() => window.close()} className="bg-white border text-slate-700 px-6 py-3 rounded-full shadow-lg font-bold">Schließen</button>
                <button onClick={() => window.print()} className="bg-[#121c2d] text-white px-8 py-3 rounded-full shadow-xl font-bold flex items-center gap-2"><span>🖨️</span> Drucken / PDF</button>
            </div>
        </div>
    );
};
