import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../services/database';

// Use same worker source as SmartPdfImporter (already proven to work)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type BrandMode = 'technical' | 'visualization' | 'both';

const LOGO_URL = '/PolenDach24-Logo.png';
const LOGO_ASPECT = 2240 / 547;

// ═══ Comprehensive NL → DE translation dictionary ═══
const NL_DE: Record<string, string> = {
    // Spec table labels
    'Aanzicht': 'Ansicht',
    'Vrijstaand': 'Freistehend',
    'Dak type': 'Dachtyp',
    'Dakhoek': 'Dachneigung',
    'Dakvelden': 'Dachfelder',
    'Voorstaanders': 'Vordere Stützen',
    'Achterstaanders': 'Hintere Stützen',
    'Kleur': 'Farbe',
    // M-descriptions
    'Breedte': 'Breite',
    'Diepte': 'Tiefe',
    'Onderkant muurprofiel': 'Unterkante Wandprofil',
    'Onderkant gootprofiel': 'Unterkante Rinnenprofil',
    'Binnenmaat tussen staanders': 'Innenmaß zw. Stützen',
    'Hart-op-hart liggers': 'Achsmaß Träger',
    'Binnenmaat staanders (diepte)': 'Innenmaß Stützen (Tiefe)',
    'Bovenkant muurprofiel': 'Oberkante Wandprofil',
    'Staanderbreedte': 'Stützenbreite',
    'Staanderdiepte': 'Stützentiefe',
    // Title block
    'Disclaimer': 'Haftungsausschluss',
    'Eenheid': 'Einheit',
    'Schaal': 'Maßstab',
    'Pagina': 'Seite',
    // Disclaimer body
    'Tekening is uitsluitend ter illustratie.': 'Zeichnung dient nur zur Veranschaulichung.',
    'Klant is verantwoordelijk voor alle maten.': 'Kunde ist für alle Maße verantwortlich.',
    'Orderbevestiging is leidend.': 'Auftragsbestätigung ist maßgebend.',
    // Values that need translation
    'Voor (buiten)': 'Vorne (außen)',
    'Voor (binnen)': 'Vorne (innen)',
    'Achter (buiten)': 'Hinten (außen)',
    'Achter (binnen)': 'Hinten (innen)',
    'Boven (buiten)': 'Oben (außen)',
    'Boven (binnen)': 'Oben (innen)',
    'Onder (buiten)': 'Unten (außen)',
    'Onder (binnen)': 'Unten (innen)',
    'Rechts (buiten)': 'Rechts (außen)',
    'Rechts (binnen)': 'Rechts (innen)',
    'Links (buiten)': 'Links (außen)',
    'Links (binnen)': 'Links (innen)',
    'Nee': 'Nein',
    'Ja': 'Ja',
};

interface TextItem {
    str: string;
    x: number;
    y: number;  // from BOTTOM of page (PDF coordinates)
    w: number;
    h: number;
}

/**
 * Use pdf.js to extract all text items with their exact positions from a PDF page.
 * Returns items in PDF coordinate space (origin = bottom-left).
 */
async function extractTextItems(pdfBytes: ArrayBuffer): Promise<Map<number, TextItem[]>> {
    const result = new Map<number, TextItem[]>();
    let doc: any = null;
    try {
        // Copy bytes to avoid SharedArrayBuffer issues with pdf-lib
        const copy = new Uint8Array(new ArrayBuffer(pdfBytes.byteLength));
        copy.set(new Uint8Array(pdfBytes));
        doc = await pdfjs.getDocument({ data: copy, useSystemFonts: true }).promise;

        for (let pn = 1; pn <= doc.numPages; pn++) {
            try {
                const page = await doc.getPage(pn);
                const textContent = await page.getTextContent();
                const items: TextItem[] = [];

                for (const item of textContent.items) {
                    const ti = item as any;
                    if (ti.str && ti.str.trim()) {
                        items.push({
                            str: ti.str,
                            x: ti.transform[4],
                            y: ti.transform[5],
                            w: ti.width || 0,
                            h: ti.height || 7,
                        });
                    }
                }
                result.set(pn - 1, items);
            } catch (pageErr) {
                console.warn(`Text extraction failed for page ${pn}:`, pageErr);
            }
        }
    } catch (err) {
        console.error('pdf.js text extraction failed:', err);
    } finally {
        try { if (doc) doc.destroy(); } catch {}
    }
    return result;
}

interface LeadOption {
    id: string;
    name: string;
    email?: string;
    city?: string;
}

export const PdfRebrandTool: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<BrandMode>('both');
    const [translateTexts, setTranslateTexts] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    // Lead assignment
    const [leadSearch, setLeadSearch] = useState('');
    const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
    const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [savingToLead, setSavingToLead] = useState(false);
    const [lastProcessedPdf, setLastProcessedPdf] = useState<{ bytes: Uint8Array; fileName: string } | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (dropped.length === 0) { toast.error('Tylko pliki PDF'); return; }
        setFiles(prev => [...prev, ...dropped]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
        setFiles(prev => [...prev, ...selected]);
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    /** Find Teranda logo image position from content stream */
    function findLogoPosition(context: any, page: any, pageHeight: number) {
        try {
            const pageNode = (page as any).node;
            const contentsRef = pageNode.get(context.obj('Contents'));
            if (!contentsRef) return null;
            const contentsObj = context.lookup(contentsRef);
            const refs: any[] = [];
            if (contentsObj?.constructor?.name === 'PDFArray') {
                for (let i = 0; i < contentsObj.size(); i++) refs.push(contentsObj.get(i));
            } else refs.push(contentsRef);

            for (const ref of refs) {
                const stream = context.lookup(ref);
                if (!stream?.getContents) continue;
                const bytes = stream.getContents();
                let str = '';
                for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
                const m = str.match(/([\d.]+)\s+0\s+0\s+([\d.\-]+)\s+([\d.]+)\s+([\d.]+)\s+cm\s+\/\w+\s+Do/);
                if (m) return {
                    x: parseFloat(m[3]),
                    y: pageHeight - parseFloat(m[4]),
                    w: Math.abs(parseFloat(m[1])),
                    h: Math.abs(parseFloat(m[2])),
                };
            }
        } catch {}
        return null;
    }

    const processAllPdfs = async () => {
        if (files.length === 0) return;
        setProcessing(true);
        setProgress(0);

        try {
            const logoResp = await fetch(LOGO_URL);
            const logoBytes = await logoResp.arrayBuffer();

            for (let fi = 0; fi < files.length; fi++) {
                const file = files[fi];
                setProgress(Math.round(((fi) / files.length) * 100));

                try {
                    const fileBytes = await file.arrayBuffer();

                    // ── Step 1: Extract text positions using pdf.js ──
                    let textMap: Map<number, TextItem[]> = new Map();
                    if (translateTexts) {
                        try {
                            textMap = await extractTextItems(fileBytes);
                        } catch (err) {
                            console.warn('Text extraction failed:', err);
                        }
                    }

                    // ── Step 2: Modify PDF using pdf-lib ──
                    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
                    const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBytes));
                    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                    const context = (pdfDoc as any).context;
                    const pages = pdfDoc.getPages();

                    for (let pi = 0; pi < pages.length; pi++) {
                        const page = pages[pi];
                        const { width, height } = page.getSize();

                        // ═══ LOGO REPLACEMENT ═══
                        const logoPos = findLogoPosition(context, page, height) || {
                            x: 656.22, y: height - 538.58, w: 73.42, h: 16.16,
                        };

                        if (mode === 'technical' || mode === 'both') {
                            // White cover over Teranda logo
                            const cx = logoPos.x - 5;
                            const cy = logoPos.y - 4;
                            const cw = logoPos.w + 12;
                            const ch = logoPos.h + 8;
                            page.drawRectangle({ x: cx, y: cy, width: cw, height: ch, color: rgb(1, 1, 1) });

                            // PolenDach24 logo — small, fits within the cell
                            let lw = cw - 4;
                            let lh = lw / LOGO_ASPECT;
                            if (lh > ch - 2) { lh = ch - 2; lw = lh * LOGO_ASPECT; }
                            page.drawImage(logoImage, {
                                x: cx + (cw - lw) / 2,
                                y: cy + (ch - lh) / 2,
                                width: lw, height: lh,
                            });
                        }

                        if (mode === 'visualization' || mode === 'both') {
                            if (logoPos.y > height / 2) {
                                const cx = logoPos.x - 5;
                                const cy = logoPos.y - 4;
                                const cw = logoPos.w + 12;
                                const ch = logoPos.h + 8;
                                page.drawRectangle({ x: cx, y: cy, width: cw, height: ch, color: rgb(1, 1, 1) });
                                let lw = cw - 4; let lh = lw / LOGO_ASPECT;
                                if (lh > ch - 2) { lh = ch - 2; lw = lh * LOGO_ASPECT; }
                                page.drawImage(logoImage, {
                                    x: cx + (cw - lw) / 2, y: cy + (ch - lh) / 2, width: lw, height: lh,
                                });
                            }
                        }

                        // ═══ DYNAMIC TEXT TRANSLATION ═══
                        const textItems = textMap.get(pi) || [];
                        const textColor = rgb(0, 0, 0);

                        for (const item of textItems) {
                            try {
                                const translation = NL_DE[item.str];
                                if (!translation) continue;
                                if (item.str === 'Ja') continue;

                                // Font size = exact from pdf.js (NEVER shrink)
                                const fontSize = item.h;
                                const isSmall = item.h < 5; // Einheit, Maßstab etc.

                                // German text width
                                let deWidth = item.w;
                                try { deWidth = font.widthOfTextAtSize(translation, fontSize); } catch {}

                                // ALL table labels are CENTER-ALIGNED (verified: center=671.81 / 756.85)
                                // Small labels (Einheit etc.) are LEFT-ALIGNED
                                const originalCenter = item.x + item.w / 2;
                                let drawX: number;
                                if (isSmall) {
                                    drawX = item.x; // left-aligned
                                } else {
                                    drawX = originalCenter - deWidth / 2; // centered at same point
                                }

                                // White rectangle: tight cover of both original + translated area
                                // Small labels need VERY tight padding to avoid covering cell borders
                                const rectLeft = Math.min(item.x, drawX) - 0.5;
                                const rectRight = Math.max(item.x + item.w, drawX + deWidth) + 0.5;
                                const yPad = isSmall ? 0.3 : 1.5;  // tight for small, normal for large
                                const hPad = isSmall ? 0.6 : 2.5;
                                page.drawRectangle({
                                    x: rectLeft,
                                    y: item.y - yPad,
                                    width: rectRight - rectLeft,
                                    height: item.h + hPad,
                                    color: rgb(1, 1, 1),
                                });

                                page.drawText(translation, {
                                    x: drawX,
                                    y: item.y,
                                    size: fontSize,
                                    font,
                                    color: textColor,
                                });
                            } catch (textErr) {
                                console.warn(`Failed to translate "${item.str}":`, textErr);
                            }
                        }
                    }

                    const pdfBytes2 = await pdfDoc.save();

                    // Always download
                    const blob = new Blob([pdfBytes2], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name.replace(/\.pdf$/i, '_Polendach24.pdf');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    // Store for optional lead upload
                    setLastProcessedPdf({ bytes: pdfBytes2, fileName: file.name });
                } catch (err) {
                    console.error(`Error processing ${file.name}:`, err);
                    toast.error(`Błąd przy ${file.name}`);
                }
            }

            setProgress(100);
            toast.success(`${files.length} PDF skonwertowane i pobrane`);
            setFiles([]);
        } catch (err) {
            console.error('PDF processing error:', err);
            toast.error('Błąd podczas przetwarzania PDF');
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };

    const modes: { id: BrandMode; label: string; desc: string; icon: string }[] = [
        { id: 'technical', label: 'Rysunek techniczny', desc: 'Logo + teksty zamień', icon: '📐' },
        { id: 'visualization', label: 'Wizualizacja 3D', desc: 'Tylko logo zamień', icon: '🏠' },
        { id: 'both', label: 'Obie pozycje', desc: 'Logo + teksty (wszystko)', icon: '🔄' },
    ];

    // Lead search with debounce
    const searchLeads = useCallback(async (query: string) => {
        if (query.length < 2) { setLeadOptions([]); return; }
        try {
            const { data } = await supabase
                .from('leads')
                .select('id, customer_data, status')
                .or(`customer_data->>firstName.ilike.%${query}%,customer_data->>lastName.ilike.%${query}%,customer_data->>email.ilike.%${query}%,customer_data->>phone.ilike.%${query}%`)
                .not('status', 'eq', 'lost')
                .limit(8);
            if (data) {
                setLeadOptions(data.map((l: any) => ({
                    id: l.id,
                    name: `${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || ''}`.trim() || 'Unbekannt',
                    email: l.customer_data?.email || '',
                    city: l.customer_data?.city || '',
                })));
            }
        } catch { setLeadOptions([]); }
    }, []);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => searchLeads(leadSearch), 300);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [leadSearch, searchLeads]);

    return (
        <div className="space-y-5">
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Typ dokumentu</label>
                <div className="grid grid-cols-3 gap-2">
                    {modes.map(m => (
                        <button key={m.id} onClick={() => setMode(m.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${mode === m.id ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{m.icon}</span>
                                <span className={`text-xs font-bold ${mode === m.id ? 'text-indigo-700' : 'text-slate-700'}`}>{m.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-snug">{m.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="text-sm">🇳🇱→🇩🇪</span>
                    <div>
                        <p className="text-xs font-bold text-slate-700">Tłumacz teksty</p>
                        <p className="text-[10px] text-slate-400">Automatyczne rozpoznanie + tłumaczenie</p>
                    </div>
                </div>
                <button onClick={() => setTranslateTexts(!translateTexts)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${translateTexts ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${translateTexts ? 'left-5' : 'left-0.5'}`} />
                </button>
            </div>

            <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'}`}>
                <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleFileSelect} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dragActive ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                        <svg className={`w-6 h-6 ${dragActive ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Upuść pliki PDF tutaj</p>
                    <p className="text-xs text-slate-400">lub kliknij aby wybrać</p>
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{files.length} plik{files.length > 1 ? 'ów' : ''}</label>
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                                <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {processing && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-indigo-600">Analiza + konwersja...</span>
                        <span className="text-slate-400">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {/* Lead Assignment — optional */}
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Przypisz do leada (opcjonalne)</label>
                <div className="relative">
                    {selectedLead ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-bold">
                                    {selectedLead.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-emerald-800">{selectedLead.name}</p>
                                    <p className="text-[10px] text-emerald-600">{selectedLead.email || selectedLead.city || ''}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedLead(null); setLeadSearch(''); }} className="text-emerald-400 hover:text-red-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={leadSearch}
                                onChange={e => { setLeadSearch(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Szukaj po nazwisku, email lub telefonie..."
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                            {showDropdown && leadOptions.length > 0 && (
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {leadOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { setSelectedLead(opt); setShowDropdown(false); setLeadSearch(''); }}
                                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0">
                                                {opt.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-800">{opt.name}</p>
                                                <p className="text-[10px] text-slate-400">{[opt.email, opt.city].filter(Boolean).join(' · ')}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button onClick={processAllPdfs} disabled={files.length === 0 || processing}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                    {processing ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analiza + konwersja...</>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Konwertuj i pobierz ({files.length})
                        </>
                    )}
                </button>
            </div>

            {/* Save to Lead — appears after processing when lead is selected */}
            {lastProcessedPdf && selectedLead && (
                <button
                    onClick={async () => {
                        try {
                            setSavingToLead(true);
                            const isVisualization = mode === 'visualization';
                            const fileName = isVisualization ? 'visualization.pdf' : 'technical.pdf';
                            const storagePath = `${selectedLead.id}/${fileName}`;

                            const { error: uploadErr } = await supabase.storage
                                .from('lead-attachments')
                                .upload(storagePath, new Blob([lastProcessedPdf.bytes], { type: 'application/pdf' }), {
                                    upsert: true,
                                });
                            if (uploadErr) throw uploadErr;

                            const { data: urlData } = supabase.storage
                                .from('lead-attachments')
                                .getPublicUrl(storagePath);

                            const updates: Record<string, string> = {};
                            if (mode === 'visualization') {
                                updates.visualizationPdfUrl = urlData.publicUrl;
                            } else if (mode === 'technical') {
                                updates.technicalPdfUrl = urlData.publicUrl;
                            } else {
                                updates.technicalPdfUrl = urlData.publicUrl;
                            }

                            await DatabaseService.updateLead(selectedLead.id, updates as any);
                            toast.success(`Zapisano przy leadzie: ${selectedLead.name}`);
                            setLastProcessedPdf(null);
                        } catch (saveErr) {
                            console.error('Save to lead error:', saveErr);
                            toast.error('Błąd zapisu przy leadzie');
                        } finally {
                            setSavingToLead(false);
                        }
                    }}
                    disabled={savingToLead}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    {savingToLead ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Zapisywanie przy leadzie...</>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            Zapisz przy leadzie — {selectedLead.name}
                        </>
                    )}
                </button>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <p className="text-xs font-semibold text-emerald-700">Inteligentne rozpoznawanie</p>
                    <p className="text-[10px] text-emerald-600 leading-relaxed mt-0.5">
                        Teksty są automatycznie wykrywane w PDF i zastępowane niemieckim tłumaczeniem w dokładnie tej samej pozycji.
                        Działa ze wszystkimi modelami Teranda.
                    </p>
                </div>
            </div>
        </div>
    );
};
