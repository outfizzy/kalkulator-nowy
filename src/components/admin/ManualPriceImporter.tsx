import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FileText } from 'lucide-react';

interface ManualPriceImporterProps {
    isOpen: boolean;
    onClose: () => void;
    products?: { id: string, name: string }[];
    onSuccess?: () => void;
}

interface ParsedRow {
    width: number;
    depth: number;
    prices: (number | null)[]; // For Standard Mode

    // Aluxe Common Attributes
    entries: {
        coverType: string;
        price: number;
    }[];

    fields?: number;
    posts?: number;
    area?: number;
    variantNote?: string;
    originalLine: string;
}

type ParsingMode = 'standard' | 'aluxe_poly' | 'aluxe_glass';

export const ImportManual: React.FC<ManualPriceImporterProps> = ({
    isOpen,
    onClose,
    products,
    onSuccess,
}) => {
    // 1. Context Configuration
    const [modelFamily, setModelFamily] = useState<string>('');
    const [constructionType, setConstructionType] = useState<'wall' | 'free'>('wall');
    const [snowZone, setSnowZone] = useState<string>('1');

    // 2. Paste & Parse
    const [rawText, setRawText] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [columnsCount, setColumnsCount] = useState(0);

    // Mode State: 'auto' (default) or explicit override
    const [forcedMode, setForcedMode] = useState<'auto' | 'aluxe_poly' | 'aluxe_glass' | 'standard'>('auto');
    const [activeMode, setActiveMode] = useState<ParsingMode>('standard');

    // Tabs
    const [activeTab, setActiveTab] = useState<'base' | 'surcharges'>('base');
    const [surchargeType, setSurchargeType] = useState<string>('freestanding');

    // Config for Aluxe Poly
    const [polySurchargeIndex, setPolySurchargeIndex] = useState(4); // Default Index 4 (Column 5)

    // 3. Column Mapping (Standard Mode)
    // 3. Column Mapping (Standard Mode)
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

    // Custom Model State
    const [isCustomMode, setIsCustomMode] = useState(false);

    const availableCoverTypes = [
        { id: 'glass_clear', label: 'Szkło Przeźroczyste (8mm/44.2)' },
        { id: 'glass_opal', label: 'Szkło Mleczne (Opal)' },
        { id: 'glass_tinted', label: 'Szkło Przyciemniane (55.2)' },
        { id: 'poly_clear', label: 'Poliwęglan Clear' },
        { id: 'poly_opal', label: 'Poliwęglan Opal' },
        { id: 'poly_iq_relax', label: 'Poliwęglan IQ Relax' },
    ];

    const parsePrice = (str: string): number | null => {
        if (!str) return null;
        const clean = str.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
        const val = parseFloat(clean);
        return !isNaN(val) ? Math.round(val * 100) / 100 : null;
    };

    // -- Parsing Logic --
    useEffect(() => {
        if (!rawText.trim()) {
            setParsedRows([]);
            setColumnsCount(0);
            setActiveMode('standard');
            return;
        }

        const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
        const rows: ParsedRow[] = [];
        let maxCols = 0;

        // Detection Counters
        let polyScore = 0;
        let glassScore = 0;

        lines.forEach(line => {
            const cells = line.trim().split(/\t| {2,}/).map(c => c.trim());
            maxCols = Math.max(maxCols, cells.length);

            // 1. Identify Dimensions
            let width = 0;
            let depth = 0;
            let currentVariantNote: string | undefined;

            // Try explicit heuristic on cells
            for (const c of cells) {
                // Matches 3000x2500, 3000 x 2500, 3000*2500
                const m = c.match(/(\d{3,5})\s*[xX*]\s*(\d{3,5})/);
                if (m) { width = parseInt(m[1]); depth = parseInt(m[2]); break; }
            }

            // Extract Asterisks (Leading, Trailing, or Isolated)
            // Matches: "**", "*", "++" at start/end or surrounded by space
            const asteriskMatch = line.match(/(?:^|\s)([*+]{1,3})(?=\s|$)/) || line.match(/^([*+]+)/);
            if (asteriskMatch) {
                currentVariantNote = asteriskMatch[1];
            }

            if (activeTab === 'base') {
                if (width === 0 || depth === 0) return; // Skip invalid rows that don't have dimensions

                const numValues = cells.map(c => parsePrice(c));

                // 2. Mode Detection Heuristics (only used if auto)
                if (cells.length >= 8) {
                    if (cells.length >= 9) glassScore++;
                    else polyScore++;
                }

                const rowData: ParsedRow = {
                    width,
                    depth,
                    prices: numValues,
                    entries: [],
                    originalLine: line,
                    variantNote: currentVariantNote
                };
                rows.push(rowData);
            } else {
                // Surcharge Mode: Width | Price
                // Expect simple 2 columns: Width (mm) and Price (EUR)
                // or just "3000 500"
                const cleanCells = cells.filter(c => c && c.length > 0);

                // Allow "3000" (width) ... "500" (price)
                if (cleanCells.length >= 2) {
                    const wMatch = cleanCells[0].match(/(\d{3,5})/);
                    const w = wMatch ? parseInt(wMatch[1]) : 0;

                    // Price is usually the last number-like cell
                    let p: number | null = null;
                    for (let i = cleanCells.length - 1; i >= 1; i--) {
                        const parsed = parsePrice(cleanCells[i]);
                        if (parsed !== null) {
                            p = parsed;
                            break;
                        }
                    }

                    if (w > 0 && p !== null) {
                        rows.push({
                            width: w,
                            depth: 0,
                            prices: [p],
                            entries: [{ coverType: 'surcharge', price: p }],
                            originalLine: line
                        });
                    }
                }
            }
        });

        // Determine Final Mode
        let finalMode: ParsingMode = 'standard';

        if (activeTab === 'base') {
            if (forcedMode !== 'auto') {
                finalMode = forcedMode;
            } else {
                // Auto-detect logic
                if (glassScore > rows.length * 0.4) finalMode = 'aluxe_glass';
                else if (polyScore > rows.length * 0.4) finalMode = 'aluxe_poly';
            }
        }

        setActiveMode(finalMode);

        // Second Pass: hydrate 'entries' based on determined mode
        const processedRows = rows.map(row => {
            const nums = row.prices;
            const entries = [];
            let fields, posts, area;

            if (activeTab === 'surcharges') {
                // Simple pass-through
                if (row.entries.length > 0) {
                    entries.push(...row.entries);
                }
            } else if (finalMode === 'aluxe_poly') {
                // Poly Layout
                const basePoly = nums[3];
                // Use dynamic index
                const surGold = nums[polySurchargeIndex];

                if (basePoly) {
                    entries.push({ coverType: 'poly_clear', price: basePoly });
                    entries.push({ coverType: 'poly_opal', price: basePoly });

                    // Always add IQ Relax entry, even if surcharge is missing (0)
                    // limit: > -1 to allow 0, but valid check needed? 
                    // Let's assume always add it.
                    entries.push({
                        coverType: 'poly_iq_relax',
                        price: basePoly + (surGold || 0),
                        properties: {
                            structure_surcharge: surGold || 0,
                            surcharge_name: 'IQ Relax'
                        }
                    });
                }

                fields = nums[5];
                posts = nums[6];
                area = nums[7];
            } else if (finalMode === 'aluxe_glass') {
                // Glass Layout
                const priceClear = nums[3]; // Structure (sometimes) or Structure+Glass?
                // Usually Aluxe DE lists: Structure Price, Glass Price, Surcharge
                // Let's assume standard behavior for now, but save raw values too
                const surMatt = nums[4];
                const surTint = nums[5];

                if (priceClear) {
                    entries.push({ coverType: 'glass_clear', price: priceClear });
                    entries.push({ coverType: 'vsg_8mm', price: priceClear }); // Alias

                    if (surMatt) {
                        entries.push({
                            coverType: 'glass_opal',
                            price: priceClear + surMatt,
                            properties: {
                                structure_surcharge: surMatt,
                                surcharge_name: 'Opal'
                            }
                        });
                    }
                    if (surTint) {
                        entries.push({
                            coverType: 'glass_tinted',
                            price: priceClear + surTint,
                            properties: {
                                structure_surcharge: surTint,
                                surcharge_name: 'Tinted'
                            }
                        });
                    }
                }

                fields = nums[6];
                posts = nums[7];
                area = nums[8];
            } else {
                // Standard Mode (Manual Mapping applied later or during save)
                // We don't populate entries here typically unless we want inline preview
            }

            return {
                ...row,
                entries: entries.length > 0 ? entries : row.entries,
                fields: fields || undefined,
                posts: posts || undefined,
                area: area || undefined
            };
        });

        setParsedRows(processedRows);
        setColumnsCount(maxCols);
        setParsedRows(processedRows);
        setColumnsCount(maxCols);
    }, [rawText, forcedMode, activeTab, polySurchargeIndex]);


    const handleSave = async () => {
        if (!modelFamily) return toast.error('Wybierz model!');
        if (parsedRows.length === 0) return toast.error('Brak danych do zapisania');

        const toastId = toast.loading(`Przetwarzanie...`);
        const zoneInt = parseInt(snowZone) || 1;

        // 1. Create Tracker in price_tables
        let assignedTableId: string | null = null;
        try {
            // Find product ID by name mapping
            // Note: DB names might differ slightly (Trendstyle vs TRENDSTYLE), checking rough match with trim
            const detectedProduct = products?.find(p =>
                p.name.trim().toLowerCase() === modelFamily.trim().toLowerCase()
            );

            if (!detectedProduct) {
                console.warn("Product Match Failed. Proceeding as new model:", modelFamily);
                // toast('Tworzenie nowego modelu...', { icon: '🆕', id: toastId });
                // We proceed without product_definition_id. PricingService derives models from pricing_base, so it will appear.
            }

            const tableName = `Manual Import - ${modelFamily} - S${snowZone} (${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')})`;

            // Determine Roof Type for Metadata
            let roofType = 'polycarbonate'; // Default
            if (activeMode === 'aluxe_glass' || (activeMode === 'standard' && (activeTab === 'base' && Object.values(columnMapping).some(v => v?.includes('glass'))))) {
                roofType = 'glass';
            } else if (activeMode === 'aluxe_poly' || (activeMode === 'standard' && (activeTab === 'base' && Object.values(columnMapping).some(v => v?.includes('poly'))))) {
                roofType = 'polycarbonate';
            }

            const { data: tableData, error: tableError } = await supabase.from('price_tables').insert({
                name: tableName,
                product_definition_id: detectedProduct?.id || null, // Best effort link
                type: 'matrix', // 'manual' not allowed by DB constraint
                is_active: true,
                variant_config: {
                    snowZone: snowZone,
                    constructionType: constructionType,
                    manualModel: modelFamily,
                    roofType: roofType, // NOW INCLUDED
                    subtype: activeMode === 'aluxe_poly' ? 'Poly (Mix)' : activeMode === 'aluxe_glass' ? 'Glass (Mix)' : 'Manual'
                },
                attributes: activeTab === 'surcharges' ? { type: 'surcharges', surchargeType } : { type: 'base' }
            }).select().single();

            if (tableError) {
                console.error("Error creating price table tracker", tableError);
                toast.error(`Błąd podczas tworzenia wpisu w tabeli cenników: ${tableError.message}`, { id: toastId });
                return; // Stop execution if table creation fails
            } else {
                assignedTableId = tableData.id;
            }

        } catch (e: any) {
            console.error("Error in table creation", e);
            if (e.message?.includes('violates row-level security') || e.code === '42501') {
                toast.error(() => (
                    <div className="text-sm">
                        <b>Błąd uprawnień (RLS)</b>
                        <p>Nie masz prawa do zapisu tabeli cenników.</p>
                        <p className="mt-2 text-xs text-slate-500">
                            Wymagane wykonanie skryptu SQL naprawiającego uprawnienia (sprawdź czat).
                        </p>
                    </div>
                ), { duration: 10000, id: 'rls-error' });
                return; // Stop execution, don't saveorphaned data
            }
            toast.error(`Nieoczekiwany błąd podczas tworzenia wpisu w tabeli cenników: ${e.message}`, { id: toastId });
            return;
        }


        const entriesToInsert: any[] = [];

        // Prepare Base Price Entries
        if (activeTab === 'base') {
            parsedRows.forEach(row => {
                if (activeMode !== 'standard' && row.entries.length > 0) {
                    // Auto/Forced Mode
                    row.entries.forEach(entry => {
                        entriesToInsert.push({
                            model_family: modelFamily,
                            construction_type: constructionType,
                            cover_type: entry.coverType,
                            zone: zoneInt,
                            width_mm: row.width,
                            depth_mm: row.depth,
                            price_upe_net_eur: parseFloat(entry.price.toFixed(2)),
                            currency: 'EUR',
                            posts_count: row.posts,
                            fields_count: row.fields,
                            area_m2: row.area,
                            variant_note: row.variantNote, // Detected * or ** note
                            source_import_id: assignedTableId, // Link to tracker
                            properties: (entry as any).properties || {} // *** NEW: Save properties ***
                        });
                    });
                } else {
                    // Standard Mode
                    Object.entries(columnMapping).forEach(([colIdxStr, coverType]) => {
                        if (!coverType || coverType === 'IGNORE') return;
                        const price = row.prices[parseInt(colIdxStr)];
                        if (price) {
                            entriesToInsert.push({
                                model_family: modelFamily,
                                construction_type: constructionType,
                                cover_type: coverType,
                                zone: zoneInt,
                                width_mm: row.width,
                                depth_mm: row.depth,
                                price_upe_net_eur: price,
                                currency: 'EUR',
                                variant_note: row.variantNote,
                                source_import_id: assignedTableId // Link to tracker
                            });
                        }
                    });
                }
            });
        }

        let error;

        if (activeTab === 'base') {
            const { error: err } = await supabase
                .from('pricing_base')
                .upsert(entriesToInsert, {
                    onConflict: 'model_family, construction_type, cover_type, zone, width_mm, depth_mm',
                    ignoreDuplicates: false
                });
            error = err;
        } else {
            const surchargesToInsert = parsedRows.map(row => ({
                model_family: modelFamily,
                surcharge_type: surchargeType,
                width_mm: row.width,
                price_eur: row.entries[0]?.price || 0,
                currency: 'EUR',
                // source_import_id: assignedTableId // Does pricing_surcharges have this? Probably not yet.
            }));

            const { error: err } = await supabase
                .from('pricing_surcharges')
                .upsert(surchargesToInsert, {
                    onConflict: 'model_family, surcharge_type, width_mm',
                    ignoreDuplicates: false
                });
            error = err;
        }

        if (error) {
            toast.error(error.message, { id: toastId });
        } else {
            toast.success(`Zapisano pomyślnie!`, { id: toastId });
            if (onSuccess) onSuccess();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Import Cennika (CSV/Excel)</h2>
                            <p className="text-slate-500 text-sm">Wklej dane z Excela aby szybko zaktualizować bazę</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Produkty dostępne w importerze: <b>{products?.length || 0}</b>
                                {products && products.length > 0 && products.length < 5 && ` (${products.map(p => p.name).join(', ')})`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Mode Selector */}
                        {activeTab === 'base' && (
                            <div className="flex bg-slate-200 rounded p-1 gap-1">
                                {[
                                    { val: 'auto', label: '🪄 Auto' },
                                    { val: 'aluxe_poly', label: 'Poly (DE)' },
                                    { val: 'aluxe_glass', label: 'Szkło (DE)' },
                                    { val: 'standard', label: 'Standard' }
                                ].map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => setForcedMode(opt.val as any)}
                                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${forcedMode === opt.val
                                            ? 'bg-white text-blue-700 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-300'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Active Badge */}
                        {activeTab === 'base' && (
                            <span className={`text-xs px-2 py-1 rounded font-mono ${activeMode === 'standard' ? 'bg-slate-100 text-slate-500' :
                                activeMode === 'aluxe_poly' ? 'bg-green-100 text-green-800' :
                                    'bg-cyan-100 text-cyan-800'
                                }`}>
                                Aktywny: {activeMode === 'aluxe_poly' ? 'Aluxe Poly' : activeMode === 'aluxe_glass' ? 'Aluxe Glass' : 'Standard'}
                            </span>
                        )}
                        {activeTab === 'surcharges' && (
                            <span className="text-xs px-2 py-1 rounded font-mono bg-purple-100 text-purple-800">
                                Aktywny: Dopłaty ({surchargeType})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium">Anuluj</button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            Zapisz do Bazy
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel */}
                    <div className="w-[30%] border-r bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto">

                        {/* TABS */}
                        <div className="flex border-b border-slate-200 mb-6">
                            <button
                                onClick={() => setActiveTab('base')}
                                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'base' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Cenniki Bazowe
                            </button>
                            <button
                                onClick={() => setActiveTab('surcharges')}
                                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'surcharges' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Dopłaty (Opcje)
                            </button>
                        </div>

                        <div className="space-y-3 p-3 bg-white border rounded shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Parametry Importu</h3>
                            <div>
                                <div>
                                    <label className="text-xs font-bold flex justify-between">
                                        Model
                                        {isCustomMode && (
                                            <button
                                                onClick={() => setIsCustomMode(false)}
                                                className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                            >
                                                (Wróć do listy)
                                            </button>
                                        )}
                                    </label>

                                    {!isCustomMode ? (
                                        <select
                                            value={modelFamily}
                                            onChange={e => {
                                                if (e.target.value === '__CUSTOM__') {
                                                    setIsCustomMode(true);
                                                    setModelFamily('');
                                                } else {
                                                    setModelFamily(e.target.value);
                                                }
                                            }}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-accent focus:ring-accent"
                                        >
                                            <option value="">-- Wybierz model --</option>
                                            <option value="Trendstyle">Trendstyle</option>
                                            <option value="Trendstyle+">Trendstyle+</option>
                                            <option value="Trendstyle +">Trendstyle +</option>
                                            <option value="Orangestyle">Orangestyle</option>
                                            <option value="Topstyle">Topstyle</option>
                                            <option value="Topstyle XL">Topstyle XL</option>
                                            <option value="Skystyle">Skystyle</option>
                                            <option value="Designstyle">Designstyle</option>
                                            <option value="Ultrastyle">Ultrastyle</option>
                                            <option value="Carport">Carport</option>
                                            <option value="__CUSTOM__" className="font-bold text-blue-600 bg-blue-50">➕ Inny / Nowy Model...</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={modelFamily}
                                            onChange={e => setModelFamily(e.target.value)}
                                            placeholder="Wpisz nazwę modelu..."
                                            className="w-full px-4 py-2 rounded-xl border border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-blue-50"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>

                            {activeTab === 'surcharges' && (
                                <div>
                                    <label className="text-xs font-bold">Rodzaj Dopłaty</label>
                                    <select
                                        value={surchargeType}
                                        onChange={e => setSurchargeType(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-accent focus:ring-accent"
                                    >
                                        <option value="freestanding">Wolnostojące</option>
                                    </select>
                                </div>
                            )}

                            {activeTab === 'base' && (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold">Typ Montażu</label>
                                        <select value={constructionType} onChange={e => setConstructionType(e.target.value as any)} className="w-full border p-2 rounded text-sm">
                                            <option value="wall">Przyścienne</option>
                                            <option value="free">Wolnostojące</option>
                                        </select>
                                    </div>

                                    {/* Poly Surcharge Config */}
                                    {activeMode === 'aluxe_poly' && (
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="text-xs font-bold text-green-700">Kolumna Relax</label>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    value={polySurchargeIndex + 1}
                                                    onChange={e => setPolySurchargeIndex(Math.max(0, parseInt(e.target.value) - 1))}
                                                    className="w-full border border-green-300 p-2 rounded text-sm focus:ring-green-500 bg-green-50"
                                                    title="Numer kolumny z dopłatą IQ Relax"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <label className="text-xs font-bold">Strefa Śniegowa</label>
                                        <select value={snowZone} onChange={e => setSnowZone(e.target.value)} className="w-full border p-2 rounded text-sm">
                                            <option value="1">Strefa 1 (0.85 kN)</option>
                                            <option value="2">Strefa 2 (1.25 kN)</option>
                                            <option value="3">Strefa 3 (1.50 kN)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="text-xs font-bold mb-1 flex items-center gap-2">
                                Wklej Dane (Ctrl+V)
                                <span className="text-slate-400 font-normal ml-auto text-[10px]">Tab-separated values</span>
                            </label>
                            <textarea
                                className="flex-1 w-full border rounded p-2 text-xs font-mono whitespace-pre overflow-auto focus:ring-2 ring-blue-500 outline-none resize-none"
                                placeholder="3000   2500   1500.00 ..."
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden">
                        <div className="p-3 border-b bg-slate-50 flex justify-between">
                            <div className="text-xs font-bold text-slate-600 self-center">
                                Wykryto: {parsedRows.length} wierszy
                            </div>
                            {activeTab === 'base' && activeMode === 'standard' && (
                                <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                    Tryb Ręczny - Zmapuj kolumny poniżej
                                </div>
                            )}
                            {activeTab === 'surcharges' && (
                                <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                    Tryb Dopłat - Szerokość | Cena
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                                    <tr>
                                        {/* Split Dimensions */}
                                        <th className="p-2 border bg-slate-200 w-24">Szer. (mm)</th>
                                        <th className="p-2 border bg-slate-200 w-24">Głęb. (mm)</th>

                                        {activeTab === 'base' && activeMode === 'standard' ? (
                                            Array.from({ length: columnsCount }).map((_, i) => (
                                                <th key={i} className="p-2 border min-w-[100px]">
                                                    <select
                                                        className="w-full p-1 border rounded"
                                                        value={columnMapping[i] || ''}
                                                        onChange={e => setColumnMapping(prev => ({ ...prev, [i]: e.target.value }))}
                                                    >
                                                        <option value="">-- Ignoruj --</option>
                                                        {availableCoverTypes.map(ct => (
                                                            <option key={ct.id} value={ct.id}>{ct.label}</option>
                                                        ))}
                                                    </select>
                                                </th>
                                            ))
                                        ) : activeTab === 'base' ? (
                                            <>
                                                {/* Auto-Mode Headers Preview */}
                                                {activeMode === 'aluxe_poly' ? (
                                                    <>
                                                        <th className="p-2 border bg-green-50">Poly Clear/Opal</th>
                                                        <th className="p-2 border bg-green-50">+ IQ Relax (Dopłata)</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="p-2 border bg-cyan-50">Szkło Clear</th>
                                                        <th className="p-2 border bg-cyan-50">+ Opal (Dopłata)</th>
                                                        <th className="p-2 border bg-cyan-50">+ Tinted (Dopłata)</th>
                                                    </>
                                                )}
                                                <th className="p-2 border bg-yellow-50">Felder</th>
                                                <th className="p-2 border bg-yellow-50">Pfosten</th>
                                                <th className="p-2 border bg-yellow-50">m2</th>
                                            </>
                                        ) : (
                                            <th className="p-2 border bg-purple-50 text-purple-800">Cena Dopłaty</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 border-b">
                                            {/* Split Dimensions */}
                                            <td className="p-2 border text-center font-mono text-slate-600">{row.width}</td>
                                            <td className="p-2 border text-center font-mono text-slate-600">{row.depth || '-'}</td>

                                            {activeTab === 'base' && activeMode === 'standard' ? (
                                                row.prices.map((p, i) => (
                                                    <td key={i} className={`p-2 border text-right ${columnMapping[i] ? 'bg-blue-50 font-bold' : 'text-slate-300'}`}>
                                                        {p?.toFixed(2) || '-'}
                                                    </td>
                                                ))
                                            ) : activeTab === 'base' ? (
                                                <>
                                                    {/* Auto-Mode: Explicit Mapping to Headers to ensure alignment */}
                                                    {activeMode === 'aluxe_poly' ? (
                                                        <>
                                                            <td className="p-2 border text-right font-medium">
                                                                {row.entries.find(e => e.coverType === 'poly_clear')?.price.toFixed(2) || '-'}
                                                                <div className="text-[9px] text-slate-400">Clear/Opal</div>
                                                            </td>
                                                            <td className="p-2 border text-right font-medium">
                                                                {row.entries.find(e => e.coverType === 'poly_iq_relax')?.price.toFixed(2) || '-'}
                                                                <div className="text-[9px] text-slate-400">IQ Relax</div>
                                                            </td>
                                                        </>
                                                    ) : activeMode === 'aluxe_glass' ? (
                                                        <>
                                                            <td className="p-2 border text-right font-medium">
                                                                {row.entries.find(e => e.coverType === 'glass_clear')?.price.toFixed(2) || '-'}
                                                                <div className="text-[9px] text-slate-400">Clear</div>
                                                            </td>
                                                            <td className="p-2 border text-right font-medium">
                                                                {row.entries.find(e => e.coverType === 'glass_opal')?.price.toFixed(2) || '-'}
                                                                <div className="text-[9px] text-slate-400">Opal</div>
                                                            </td>
                                                            <td className="p-2 border text-right font-medium">
                                                                {row.entries.find(e => e.coverType === 'glass_tinted')?.price.toFixed(2) || '-'}
                                                                <div className="text-[9px] text-slate-400">Tinted</div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        // Fallback for unexpected mode (shouldn't happen with current logic)
                                                        row.entries.map((e, i) => (
                                                            <td key={i} className="p-2 border text-right font-medium">
                                                                {e.price.toFixed(2)}
                                                            </td>
                                                        ))
                                                    )}

                                                    <td className="p-2 border text-center text-slate-400">{row.fields || '-'}</td>
                                                    <td className="p-2 border text-center text-slate-400">{row.posts || '-'}</td>
                                                    <td className="p-2 border text-center text-slate-400">{row.area || '-'}</td>
                                                </>
                                            ) : (
                                                <td className="p-2 border text-right font-bold text-purple-700 bg-purple-50">
                                                    {row.entries[0]?.price.toFixed(2)} EUR
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
