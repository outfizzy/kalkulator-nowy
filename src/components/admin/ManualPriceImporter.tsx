import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FileText } from 'lucide-react';
import { ProductEditorModal } from './ProductEditorModal';

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

    // Loose Parts
    description?: string;
    unit?: string;

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

    // State for Custom Config
    const [rawText, setRawText] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [columnsCount, setColumnsCount] = useState(0);
    const [activeMode, setActiveMode] = useState<ParsingMode>('standard');
    const [forcedMode, setForcedMode] = useState<ParsingMode | 'auto'>('auto');

    // Column Mapping State
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

    // Surcharge Mapping State
    const [surchargeType, setSurchargeType] = useState<string>('poly_surcharge'); // Default

    // Loose Parts State
    const [activeTab, setActiveTab] = useState<'base' | 'surcharges' | 'loose_parts'>('base');
    const [addonGroup, setAddonGroup] = useState<string>('accessories'); // Default group
    const [addonImportMode, setAddonImportMode] = useState<'list' | 'matrix'>('list'); // NEW: Toggle between List and Matrix
    const [awningType, setAwningType] = useState<'over_glass' | 'under_glass'>('over_glass');
    const [motorCount, setMotorCount] = useState<number>(1); // 1 or 2
    const [isGlobalImport, setIsGlobalImport] = useState(false); // New Subtype

    const addonGroups = [
        { id: 'awnings', label: 'Markizy (Dachowe/Pod)' },
        { id: 'zip_screens', label: 'Rolety ZIP (Pionowe)' },
        { id: 'sliding_doors', label: 'Szklane Ściany (Przesuwne)' },
        { id: 'walls_aluminum', label: 'Zabudowa Stała (Alu/Ściany)' },
        { id: 'panorama', label: 'Szyby Panoramiczne (Panorama)' },
        { id: 'keilfenster', label: 'Zaplecze / Kliny (Keilfenster)' },
        { id: 'wpc_floor', label: 'Podłoga WPC' },
        { id: 'lighting', label: 'Oświetlenie' },
        { id: 'heating', label: 'Ogrzewanie' },
        { id: 'accessories', label: 'Pozostałe akcesoria (Inne)' }
    ];


    // Config for Aluxe Poly
    const [polySurchargeIndex, setPolySurchargeIndex] = useState(4); // Default Index 4 (Column 5)

    // 3. Column Mapping (Standard Mode)

    // Custom Model State
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);

    // -- Freestanding Auto-Generation --
    const [genFreestanding, setGenFreestanding] = useState(false);
    const [fsRules, setFsRules] = useState([
        { maxWidth: 3000, price: 0 },
        { maxWidth: 4000, price: 0 },
        { maxWidth: 5000, price: 0 },
        { maxWidth: 6000, price: 0 },
        { maxWidth: 7000, price: 0 },
    ]);
    const [fsBaseSurcharge, setFsBaseSurcharge] = useState(0); // Fallback / Base


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

    // -- Auto-Load Rules Logic --
    useEffect(() => {
        if (!modelFamily || modelFamily === '__CUSTOM__') return;

        const loadRules = async () => {
            const product = products?.find(p => p.name.trim().toLowerCase() === modelFamily.trim().toLowerCase());
            if (!product) return;

            const { data } = await supabase
                .from('product_definitions')
                .select('configuration')
                .eq('id', product.id)
                .single();

            if (data?.configuration?.freestanding_surcharge_rules) {
                console.log('⚡ Auto-loading Freestanding Rules for', modelFamily);
                const loadedRules = data.configuration.freestanding_surcharge_rules.map((r: any) => ({
                    maxWidth: r.max_width,
                    price: r.price
                })).sort((a: any, b: any) => a.maxWidth - b.maxWidth);

                if (loadedRules.length > 0) {
                    setFsRules(loadedRules);
                    toast.success(`Wczytano zapisane reguły dopłat dla ${modelFamily}`, { icon: '🪄' });
                }
            } else {
                // If no rules found for this product, KEEP the current rules (don't reset).
                // This allows the user to set rules once and apply them to multiple models by switching and saving.
                // UNLESS the current rules are all zero (fresh start), in which case we might want to stay zero.
                // But generally, persistence is preferred here as per user request ("dla szkła też niech zasysa...").
                console.log('ℹ️ No specific rules for', modelFamily, '- keeping current values.');
            }
        };

        loadRules();
    }, [modelFamily, products]);

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

        // Loose Parts Context
        let currentContextName = '';

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
            } else if (activeTab === 'surcharges') {
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
            } else if (activeTab === 'loose_parts') {
                if (addonImportMode === 'matrix') {
                    // MATRIX MODE (Like Base)
                    // Format: Width x Height/Projection | Price
                    let width = 0;
                    let height = 0; // mapped to depth in ParsedRow

                    // 1. Identify Dimensions (Same as Base)
                    for (const c of cells) {
                        const m = c.match(/(\d{3,5})\s*[xX*]\s*(\d{3,5})/);
                        if (m) { width = parseInt(m[1]); height = parseInt(m[2]); break; }
                    }

                    if (width > 0 && height > 0) {
                        // Find Price - assume first valid number
                        const numValues = cells.map(c => parsePrice(c));
                        const price = numValues.find(v => v !== null && v > 0);

                        if (price) {
                            rows.push({
                                width,
                                depth: height, // Map height to depth
                                prices: [price],
                                entries: [{ coverType: 'matrix_price', price }],
                                originalLine: line,
                                description: modelFamily // Use model name as desc
                            });
                        }
                    }
                } else {
                    // LIST MODE (Existing Custom Logic)
                    // Loose Parts Mode
                    // Expected format: Description | Dimensions? | Unit | Price

                    const cleanCells = cells.filter(c => c && c.length > 0);

                    if (cleanCells.length > 0) {
                        // Try to identify Price
                        let priceIndex = -1;
                        for (let i = cleanCells.length - 1; i >= 0; i--) {
                            if (parsePrice(cleanCells[i]) !== null) {
                                priceIndex = i;
                                break;
                            }
                        }

                        if (priceIndex > -1) {
                            // CASE A: Row HAS Price -> It's an ITEM
                            const price = parsePrice(cleanCells[priceIndex]);
                            if (price !== null) {
                                // Extract Unit (often just before price)
                                let unit = 'szt';
                                let descEndIndex = priceIndex - 1;

                                if (descEndIndex >= 0) {
                                    const unitCandidate = cleanCells[descEndIndex];
                                    const commonUnits = ['stk', 'stk.', 'm', 'lfm', 'set', 'kpl', 'szt', 'szt.', 'pauschal'];
                                    if (commonUnits.some(u => unitCandidate.toLowerCase().includes(u))) {
                                        unit = unitCandidate;
                                        descEndIndex--;
                                    }
                                }

                                // Full Name Construction
                                // 1. Current Row Text
                                const rowName = cleanCells.slice(0, descEndIndex + 1).join(' ');

                                // 2. Combine with Header Context if exists
                                let finalName = rowName;
                                // Only prepend context if the row seems meaningless purely numerical/short
                                if (currentContextName) {
                                    const normalizedRow = rowName.toLowerCase();
                                    const normalizedContext = currentContextName.toLowerCase();

                                    // Check if rowName ALREADY contains contextName to avoid duplication (e.g. "LED" -> "LED Strip")
                                    if (!normalizedRow.includes(normalizedContext)) {
                                        finalName = `${currentContextName} ${rowName}`;
                                    } else {
                                        finalName = rowName;
                                    }
                                }

                                rows.push({
                                    width: 0,
                                    depth: 0,
                                    prices: [price],
                                    entries: [{ coverType: 'accessory', price: price }],
                                    originalLine: line,
                                    description: finalName,
                                    unit: unit
                                });
                            }
                        } else {
                            // CASE B: Row has NO Price -> Treat as HEADER / CONTEXT
                            // Only if it has text
                            const potentialHeader = cleanCells.join(' ').trim();
                            if (potentialHeader.length > 2) {
                                currentContextName = potentialHeader;
                            }
                        }
                    }
                }
            }
        });

        // Determine Final Mode
        let finalMode: ParsingMode = 'standard';

        // 0. ADDON MATRIX SPECIAL LOGIC
        // If we are in Addon Matrix mode, we need to handle the 2D structure (Width x Projection)
        if (activeTab === 'loose_parts' && addonImportMode === 'matrix' && lines.length > 1) {
            // Reset rows because the loop above might have processed them as simple items
            // Actually, we should prevent the loop above from strictly processing if we are in this mode, 
            // OR just clear and overwrite here. Overwriting is safer.
            rows.length = 0;
            currentContextName = ''; // Reset context

            // 1. Identify Header Row (Projections / Depths)
            // Assumption: First valid row contains projections
            let headerCells: string[] = [];
            let bodyStartIndex = 0;

            // Find first row with at least 2 numbers (heuristic)
            for (let i = 0; i < lines.length; i++) {
                const l = lines[i].trim().split(/\t|\s{2,}/).map(c => c.trim());
                const nums = l.filter(c => parsePrice(c) !== null);
                if (nums.length >= 2) {
                    headerCells = l;
                    bodyStartIndex = i + 1;
                    break;
                }
            }

            if (headerCells.length > 0) {
                // Map Column Index -> Projection/Depth
                const projectionMap: Record<number, number> = {};

                // Heuristic: Check if first cell of header is a number > 500
                // If yes, it means the header row is "Compact" (starts directly with projection values)
                // So we need to shift the mapping by +1 because Body rows have Width at index 0.
                const firstHeaderValue = parsePrice(headerCells[0]);
                const isCompactHeader = firstHeaderValue !== null && firstHeaderValue > 500;
                const indexOffset = isCompactHeader ? 1 : 0;

                headerCells.forEach((cell, idx) => {
                    const val = parsePrice(cell);
                    // Heuristic: Projections are usually > 500. 
                    if (val && val > 500) {
                        projectionMap[idx + indexOffset] = val;
                    }
                });

                // 2. Process Body Rows
                for (let i = bodyStartIndex; i < lines.length; i++) {
                    const line = lines[i];
                    const cells = line.trim().split(/\t|\s{2,}/).map(c => c.trim());

                    // First cell is usually Width
                    const widthVal = parsePrice(cells[0]);

                    if (widthVal && widthVal > 500) {
                        // Iterate columns
                        cells.forEach((cell, colIdx) => {
                            // Skip col 0 (Width)
                            if (colIdx === 0) return;

                            const projection = projectionMap[colIdx];
                            if (projection) {
                                const price = parsePrice(cell);
                                if (price !== null) {
                                    rows.push({
                                        width: widthVal,
                                        depth: projection, // Mapped from Header
                                        prices: [price],
                                        entries: [{ coverType: 'matrix_entry', price }], // Dummy entry for later
                                        originalLine: line,
                                        description: `${modelFamily} ${widthVal}x${projection}`, // Helper desc
                                        variantNote: 'matrix'
                                    });
                                }
                            }
                        });
                    }
                }
            }
        }


        if (activeTab === 'base') {
            if (forcedMode !== 'auto') {
                finalMode = forcedMode;
            } else {
                // Auto-detect logic
                if (modelFamily.toLowerCase().includes('ultrastyle')) finalMode = 'aluxe_glass';
                else if (glassScore > rows.length * 0.4) finalMode = 'aluxe_glass';
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
            } else if (activeTab === 'loose_parts') {
                // Pass through
                if (row.entries.length > 0) entries.push(...row.entries);
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
    }, [rawText, forcedMode, activeTab, polySurchargeIndex]);


    const handleSave = async () => {
        if (!modelFamily && !isGlobalImport) return toast.error('Wybierz model!');
        if (parsedRows.length === 0) return toast.error('Brak danych do zapisania');

        const toastId = toast.loading(`Przetwarzanie...`);
        const zoneInt = parseInt(snowZone) || 1;

        // 1. Create Tracker in price_tables
        let assignedTableId: string | null = null;
        let productId: string | undefined;
        try {
            // Find product ID by name mapping
            // Note: DB names might differ slightly (Trendstyle vs TRENDSTYLE), checking rough match with trim
            const detectedProduct = products?.find(p =>
                p.name.trim().toLowerCase() === modelFamily.trim().toLowerCase()
            );

            productId = detectedProduct?.id;

            // Determine Roof Type for Metadata (Moved UP to be available for Product Creation)
            let roofType = 'polycarbonate'; // Default
            if (activeMode === 'aluxe_glass' || (activeMode === 'standard' && (activeTab === 'base' && Object.values(columnMapping).some(v => v?.includes('glass'))))) {
                roofType = 'glass';
            } else if (activeMode === 'aluxe_poly' || (activeMode === 'standard' && (activeTab === 'base' && Object.values(columnMapping).some(v => v?.includes('poly'))))) {
                roofType = 'polycarbonate';
            }

            // FIX: If product does not exist, CREATE IT to avoid "null value in column product_definition_id" error
            // The constraint requires a valid ID.
            if (!productId) {
                console.log('✨ Creating new Product Definition for:', modelFamily);
                const codeCandidate = modelFamily.trim().toLowerCase().replace(/\s+/g, '');

                const { data: newProd, error: createError } = await supabase
                    .from('product_definitions')
                    .insert({
                        code: codeCandidate,
                        name: modelFamily.trim(),
                        category: roofType === 'glass' ? 'roof' : 'other',
                        provider: 'Manual Import'
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error('Failed to auto-create product:', createError);

                    // If failed due to DUPLICATE (23505), we MUST be able to find it.
                    // Retry with exact match on code first.
                    const { data: fallbackCode } = await supabase
                        .from('product_definitions')
                        .select('id')
                        .eq('code', codeCandidate) // Use eq to be exact if unique constraint failed this specific code
                        .maybeSingle();

                    if (fallbackCode) {
                        productId = fallbackCode.id;
                    } else {
                        // Fallback 2: Try finding by NAME (maybe code is different)
                        const { data: fallbackName } = await supabase
                            .from('product_definitions')
                            .select('id')
                            .ilike('name', modelFamily.trim())
                            .maybeSingle();

                        if (fallbackName) {
                            productId = fallbackName.id;
                        } else {
                            // Fallback 3: Try ignoring case on code (ilike)
                            const { data: fallbackCodeLoose } = await supabase
                                .from('product_definitions')
                                .select('id')
                                .ilike('code', codeCandidate)
                                .maybeSingle();

                            if (fallbackCodeLoose) {
                                productId = fallbackCodeLoose.id;
                            } else {
                                // Give up with detailed error
                                throw new Error(`Nie można utworzyć produktu "${modelFamily}". Błąd DB: ${createError.message} (Kod: ${createError.code}) - Produkt prawdopodobnie istnieje, ale nie mogę go pobrać (sprawdź RLS).`);
                            }
                        }
                    }
                } else {
                    productId = newProd.id;
                }
            }

            let tableName = `Manual Import - ${modelFamily}`;
            if (constructionType === 'free') tableName += ' - Freestanding';
            tableName += ` - S${snowZone} (${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')})`;

            const { data: tableData, error: tableError } = await supabase.from('price_tables').insert({
                name: tableName,
                product_definition_id: productId, // Now guaranteed to be valid or throw
                type: 'matrix',
                is_active: true,
                variant_config: {
                    snowZone: snowZone,
                    constructionType: constructionType,
                    manualModel: modelFamily,
                    roofType: roofType,
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
                            properties: {
                                ...((entry as any).properties || {}),
                                // Inject Global Addon Context if applicable
                                ...(activeTab === 'loose_parts' && addonGroup === 'awnings' ? {
                                    motor_count: motorCount,
                                    awning_type: awningType
                                } : {})
                            }
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

            // --- SURCHARGE APPLICATION LOGIC ---
            // Case A: Wall -> Generate Freestanding Copy (Old Logic)
            // Case B: Freestanding -> Apply to Current Rows (Direct Math)

            if (genFreestanding) {
                console.log('⚡ Applying Surcharge Rules...');

                // Helper to find surcharge
                const getSurcharge = (width: number) => {
                    const sorted = [...fsRules].sort((a, b) => a.maxWidth - b.maxWidth);
                    const match = sorted.find(r => width <= r.maxWidth);
                    if (match && match.price > 0) return match.price;
                    return fsBaseSurcharge;
                };

                // Logic A: Construction = Wall -> Create COPY with Surcharge
                if (constructionType === 'wall') {
                    console.log(' -> Generating Separate Freestanding Variant');
                    parsedRows.forEach(row => {
                        const surcharge = getSurcharge(row.width);
                        if (activeMode !== 'standard' && row.entries.length > 0) {
                            row.entries.forEach(entry => {
                                entriesToInsert.push({
                                    model_family: modelFamily,
                                    construction_type: 'freestanding',
                                    cover_type: entry.coverType,
                                    zone: zoneInt,
                                    width_mm: row.width,
                                    depth_mm: row.depth,
                                    price_upe_net_eur: parseFloat((entry.price + surcharge).toFixed(2)),
                                    currency: 'EUR',
                                    posts_count: row.posts,
                                    fields_count: row.fields,
                                    area_m2: row.area,
                                    variant_note: row.variantNote,
                                    source_import_id: assignedTableId,
                                    properties: (entry as any).properties || {}
                                });
                            });
                        } else {
                            Object.entries(columnMapping).forEach(([colIdxStr, coverType]) => {
                                if (!coverType || coverType === 'IGNORE') return;
                                const price = row.prices[parseInt(colIdxStr)];
                                if (price) {
                                    entriesToInsert.push({
                                        model_family: modelFamily,
                                        construction_type: 'freestanding',
                                        cover_type: coverType,
                                        zone: zoneInt,
                                        width_mm: row.width,
                                        depth_mm: row.depth,
                                        price_upe_net_eur: price + surcharge,
                                        currency: 'EUR',
                                        variant_note: row.variantNote,
                                        source_import_id: assignedTableId
                                    });
                                }
                            });
                        }
                    });
                }

                // Logic B: Construction = Pure Freestanding -> Apply to PRIMARY rows (Modify entriesToInsert directly?)
                // Actually, entriesToInsert is already populated above. 
                // If constructionType is 'free', entriesToInsert contains 'freestanding' rows with base price.
                // We need to UPDATE their prices.
                else if (constructionType === 'free') {
                    console.log(' -> Updating Primary Freestanding Prices');
                    // We need to iterate over entriesToInsert and ADD surcharge
                    // entriesToInsert is mutable array.
                    entriesToInsert.forEach(entry => {
                        const surcharge = getSurcharge(entry.width_mm);
                        if (surcharge > 0) {
                            entry.price_upe_net_eur = parseFloat((entry.price_upe_net_eur + surcharge).toFixed(2));
                        }
                    });
                }

                // 3. ALWAYS SAVE RULES if enabled (So calculator knows about them for future reference or display)
                // We can reuse the logic from 'surcharge type' tab, but here we do it for base tab save too?
                // Yes, let's auto-update product config if we have new rules.
                if (productId) {
                    const rules = fsRules.map(r => ({ max_width: r.maxWidth, price: r.price }));
                    // We'll update silently or with small toast?
                    // Let's do it.
                    supabase.from('product_definitions').select('configuration').eq('id', productId).single()
                        .then(({ data }) => {
                            const currentConfig = data?.configuration || {};
                            supabase.from('product_definitions').update({
                                configuration: {
                                    ...currentConfig,
                                    freestanding_surcharge_rules: rules,
                                    freestanding_is_additive: true
                                }
                            }).eq('id', productId).then(({ error }) => {
                                if (!error) console.log('✅ Updated Product Rules (Background)');
                            });
                        });
                }
            }
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

            // 0. LOOSE PARTS MODE
            if (activeTab === 'loose_parts') {
                if (addonImportMode === 'list') {
                    // LIST MODE (Previous Logic)
                    // 1. Create a Price Table container for these addons
                    const tableName = `${modelFamily} - ${addonGroups.find(g => g.id === addonGroup)?.label || 'Części'} (${new Date().toLocaleDateString()})`;

                    const { data: tableData, error: tableErr } = await supabase.from('price_tables').insert({
                        name: tableName,
                        type: 'addons', // List type
                        is_active: true,
                        currency: 'EUR',
                        variant_config: {
                            manualModel: modelFamily,
                            addonGroup: addonGroup
                        },
                        product_definition_id: products?.find(p => p.name === modelFamily)?.id
                    }).select().single();

                    if (tableErr) {
                        error = tableErr;
                    } else {
                        // 2. Insert Parts linked to this Table
                        const partsToInsert = parsedRows.map(row => {
                            const cleanName = (row.description || 'Unknown').trim();
                            const slug = cleanName
                                .toLowerCase()
                                .replace(/[^\w\s-]/g, '')
                                .replace(/\s+/g, '-');

                            const finalCode = `${modelFamily.toLowerCase()}-${slug}-${crypto.randomUUID().slice(0, 4)}`;

                            // Prefix only if model family isn't already part of the name to avoid "Renson Renson ZIP"
                            // Actually user said: "exactly create attributes to be linked".
                            const prefix = (!cleanName.toLowerCase().includes(modelFamily.toLowerCase()) && modelFamily !== '__CUSTOM__') ? `[${modelFamily}] ` : '';

                            return {
                                price_table_id: tableData.id,
                                addon_code: finalCode,
                                addon_name: `${prefix}${cleanName}`,
                                pricing_basis: 'FIXED',
                                price_upe_net_eur: row.entries[0]?.price || 0,
                                unit: row.unit || 'szt',
                                addon_group: addonGroup,
                                properties: {
                                    imported_from: isGlobalImport ? undefined : modelFamily,
                                    original_line: row.originalLine
                                }
                            };
                        });

                        const { error: err } = await supabase
                            .from('pricing_addons')
                            .insert(partsToInsert);

                        error = err;
                    }
                } else {
                    // MATRIX MODE (Price Table + Single Addon Pointer)
                    console.log('💎 Saving Addon Matrix...');

                    // 1. Create Price Table (Type: addon_matrix)
                    const tableName = `Matrix - ${modelFamily} - ${addonGroups.find(g => g.id === addonGroup)?.label || 'Addon'} (${new Date().toLocaleDateString()})`;

                    const { data: tableData, error: tableErr } = await supabase.from('price_tables').insert({
                        name: tableName,
                        type: 'addon_matrix', // NEW TYPE
                        is_active: true,
                        currency: 'EUR',
                        variant_config: {
                            manualModel: modelFamily,
                            addonGroup: addonGroup
                        },
                        product_definition_id: products?.find(p => p.name === modelFamily)?.id
                    }).select().single();

                    if (tableErr) {
                        error = tableErr;
                    } else {
                        // 2. Insert Matrix Entries into `pricing_base` (Reuse existing table? Or NEW `pricing_matrix`?)
                        // We decided to reuse `pricing_base`? Or `price_tables.entries`?
                        // `pricing_base` schema: model_family, construction_type, cover_type...
                        // If we use `pricing_base`, we need unique `model_family`.
                        // Using `source_import_id` is cleaner.
                        // We will check `PricingService` logic. It uses `source_import_id`.

                        // We will insert into `pricing_base` but with `cover_type` = 'matrix_entry'?
                        // Or just use the dimensions.

                        const entriesToInsert = parsedRows.map(row => ({
                            model_family: modelFamily, // Virtual Model Name
                            // Let's use 'wall' as default.
                            construction_type: 'wall',
                            cover_type: 'matrix_entry',
                            zone: 1, // Default
                            width_mm: row.width,
                            depth_mm: row.depth, // Uses depth column for Height/Projection
                            price_upe_net_eur: row.entries[0]?.price || 0,
                            currency: 'EUR',
                            source_import_id: tableData.id // CRITICAL
                        }));

                        const { error: errBase } = await supabase
                            .from('pricing_base')
                            .insert(entriesToInsert);

                        if (errBase) {
                            error = errBase;
                        } else {
                            // 3. Create SINGLE Addon Entry linked to this table
                            // This is the "Product" the user selects in the dropdown.
                            const finalCode = `${modelFamily.toLowerCase().replace(/\s+/g, '_')}_matrix`;

                            const { error: errAddon } = await supabase.from('pricing_addons').insert({
                                addon_code: finalCode,
                                addon_name: modelFamily, // The name of the Product/Matrix (e.g. "Fixscreen 100")
                                addon_group: addonGroup,
                                pricing_basis: 'MATRIX', // Triggers Matrix Logic
                                properties: {
                                    price_table_id: tableData.id,
                                    dimension_type: addonGroup === 'awnings' ? 'width_projection' : 'field_height', // Heuristic
                                    awning_type: addonGroup === 'awnings' ? awningType : undefined, // Save Subtype
                                    motor_count: addonGroup === 'awnings' ? motorCount : undefined, // Save Motor Count
                                    imported_from: isGlobalImport ? undefined : modelFamily // Scope logic
                                }
                            });
                            error = errAddon;
                        }
                    }
                }
            } else {
                // SURCHARGE MODE (Previous Logic)

                // 1. Save to Legacy Table (Backup)
                const { error: err } = await supabase

                    .from('pricing_surcharges')
                    .upsert(surchargesToInsert, {
                        onConflict: 'model_family, surcharge_type, width_mm',
                        ignoreDuplicates: false
                    });
                error = err;

                // 2. NEW: Save Freestanding Rules to Product Configuration (Primary for Calculator)
                if (!err && surchargeType === 'freestanding' && productId) {
                    console.log('⚡ Saving Freestanding Rules to Product Config:', productId);

                    // Convert parsed rows to cleaner rule format
                    const rules = parsedRows.map(row => ({
                        max_width: row.width,
                        price: row.entries[0]?.price || 0
                    }));

                    // Fetch current config first to merge (avoid overwriting other config)
                    const { data: currentProd } = await supabase
                        .from('product_definitions')
                        .select('configuration')
                        .eq('id', productId)
                        .single();

                    const currentConfig = currentProd?.configuration || {};

                    // Update configuration
                    const { error: configError } = await supabase
                        .from('product_definitions')
                        .update({
                            configuration: {
                                ...currentConfig,
                                freestanding_surcharge_rules: rules,
                                freestanding_is_additive: true // EXPLICITLY MARK AS ADDITIVE
                            }
                        })
                        .eq('id', productId);

                    if (configError) {
                        console.error('Failed to update product config:', configError);
                        toast.error('Zapisano w tabeli, ale nie udało się zaktualizować konfiguracji produktu (Kalkulator może tego nie widzieć).', { id: toastId });
                    } else {
                        toast.success('Zaktualizowano reguły wolnostojące w produkcie!', { id: toastId });
                    }
                }
            }
        }

        if (error) {
            toast.error(error.message, { id: toastId });
        } else {
            toast.success(`Zapisano pomyślnie! ${activeTab === 'loose_parts' ? 'Dodano części.' : ''}`, { id: toastId });
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

                        {/* Mode Selector (Loose Parts) */}
                        {activeTab === 'loose_parts' && (
                            <span className="text-xs px-2 py-1 rounded font-mono bg-orange-100 text-orange-800">
                                Aktywny: Części Luźne (Accessories)
                            </span>
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

                        {/* Tab Switcher */}
                        <div className="flex bg-slate-100 rounded-lg p-1 ml-4 border border-slate-200">
                            <button
                                onClick={() => setActiveTab('base')}
                                className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'base' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Baza
                            </button>
                            <button
                                onClick={() => setActiveTab('surcharges')}
                                className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'surcharges' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Dopłaty
                            </button>
                            <button
                                onClick={() => setActiveTab('loose_parts')}
                                className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'loose_parts' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Części
                            </button>
                        </div>
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
                    {/* --- Freestanding Generator Options --- */}
                    {activeTab === 'base' && (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                <input
                                    type="checkbox"
                                    checked={genFreestanding}
                                    onChange={e => setGenFreestanding(e.target.checked)}
                                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                />
                                <span className="font-bold text-slate-800">
                                    {constructionType === 'wall'
                                        ? 'Generuj TAKŻE wariant Wolnostojący (Kopia + Dopłata)'
                                        : 'Dolicz dopłatę do cen (Reguły szerokości)'}
                                </span>
                            </label>

                            {genFreestanding && (
                                <div className="animate-in slide-in-from-top-2">
                                    <p className="text-xs text-slate-500 mb-3">
                                        {constructionType === 'wall'
                                            ? 'System utworzy kopię cennika przyściennego z typem "Freestanding" i doliczy poniższe kwoty.'
                                            : 'System doliczy do zaimportowanych cen poniższe wartości w zależności od szerokości.'}
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {fsRules.map((rule, idx) => (
                                            <div key={idx} className="bg-white p-2 rounded border border-amber-200 shadow-sm">
                                                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
                                                    Do {rule.maxWidth}mm
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 text-xs">+</span>
                                                    <input
                                                        type="number"
                                                        value={rule.price || ''}
                                                        onChange={e => {
                                                            const newRules = [...fsRules];
                                                            newRules[idx].price = parseFloat(e.target.value) || 0;
                                                            setFsRules(newRules);
                                                        }}
                                                        placeholder="0"
                                                        className="w-full text-sm font-bold text-slate-700 focus:outline-none"
                                                    />
                                                    <span className="text-slate-400 text-xs">EUR</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Optional Base Surcharge if needed, currently reusing rules */}
                                </div>
                            )}
                        </div>
                    )}

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
                                onClick={() => setActiveTab('loose_parts')}
                                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'loose_parts' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Systemy i Dodatki (Akcesoria)
                            </button>
                        </div>

                        <div className="space-y-3 p-3 bg-white border rounded shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Parametry Importu</h3>
                            <div>
                                <div>
                                    <label className="text-xs font-bold flex justify-between items-center">
                                        Model
                                        <div className="flex gap-2">
                                            {modelFamily && modelFamily !== '__CUSTOM__' && (
                                                <button
                                                    onClick={() => setIsProductEditorOpen(true)}
                                                    className="text-[10px] text-accent font-bold hover:underline cursor-pointer bg-accent/10 px-2 py-0.5 rounded"
                                                >
                                                    📷 Edytuj (Zdjęcie/Info)
                                                </button>
                                            )}
                                            {isCustomMode && (
                                                <button
                                                    onClick={() => setIsCustomMode(false)}
                                                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                                >
                                                    (Wróć do listy)
                                                </button>
                                            )}
                                        </div>
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

                            {activeTab === 'loose_parts' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold">Kategoria Dodatków</label>
                                        <select
                                            value={addonGroup}
                                            onChange={e => setAddonGroup(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-accent focus:ring-accent"
                                        >
                                            {addonGroups.map(g => (
                                                <option key={g.id} value={g.id}>{g.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {addonGroup === 'awnings' && (
                                        <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-3">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold">Typ Markizy</label>
                                                <select
                                                    value={awningType}
                                                    onChange={e => setAwningType(e.target.value as any)}
                                                    className="w-full px-3 py-1.5 rounded-lg border text-sm mt-1 bg-white"
                                                >
                                                    <option value="over_glass">Nad szkłem (Aufdach)</option>
                                                    <option value="under_glass">Pod szkłem (Unterdach)</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-bold">Liczba Silników</label>
                                                <div className="flex bg-slate-100 p-1 rounded-lg mt-1 h-[34px] items-center">
                                                    <button
                                                        onClick={() => setMotorCount(1)}
                                                        className={`flex-1 h-full rounded-md text-xs font-bold transition-all ${motorCount === 1 ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        1 Silnik
                                                    </button>
                                                    <button
                                                        onClick={() => setMotorCount(2)}
                                                        className={`flex-1 h-full rounded-md text-xs font-bold transition-all ${motorCount === 2 ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        2 Siln.
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={isGlobalImport}
                                            onChange={e => setIsGlobalImport(e.target.checked)}
                                            className="w-4 h-4 text-accent rounded focus:ring-accent"
                                        />
                                        <label className="text-sm font-medium text-slate-700">Dostępne dla wszystkich modeli</label>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold">Tryb Importu</label>
                                        <div className="flex bg-slate-100 p-1 rounded-lg mt-1">
                                            <button
                                                onClick={() => setAddonImportMode('list')}
                                                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${addonImportMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Lista (Prosta)
                                            </button>
                                            <button
                                                onClick={() => setAddonImportMode('matrix')}
                                                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${addonImportMode === 'matrix' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Macierz (Wymiary)
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                                        {addonImportMode === 'list'
                                            ? 'Prosta lista: Nazwa | Cena. Użyj dla pojedynczych komponentów.'
                                            : 'Tabela wymiarowa: Szerokość (Kolumny) x Wysięg (Wiersze). Tworzy macierz.'
                                        }
                                    </p>
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
                                        {activeTab === 'loose_parts' ? (
                                            addonImportMode === 'matrix' ? (
                                                <>
                                                    <th className="p-2 border bg-slate-200 w-12">#</th>
                                                    <th className="p-2 border bg-slate-200 w-24">Szer. (mm)</th>
                                                    <th className="p-2 border bg-slate-200 w-24">Głęb. (mm)</th>
                                                    <th className="p-2 border bg-slate-200 text-right">Cena (EUR)</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-2 border bg-slate-200 w-12">#</th>
                                                    <th className="p-2 border bg-slate-200">Opis / Nazwa</th>
                                                    <th className="p-2 border bg-slate-200 w-24">J.m.</th>
                                                    <th className="p-2 border bg-slate-200 w-32 text-right">Cena (EUR)</th>
                                                </>
                                            )
                                        ) : (
                                            <>
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
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {parsedRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 font-mono text-xs">
                                            {activeTab === 'loose_parts' ? (
                                                addonImportMode === 'matrix' ? (
                                                    <>
                                                        <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                                                        <td className="p-2 text-center font-bold text-slate-700">{row.width}</td>
                                                        <td className="p-2 text-center font-bold text-slate-700">{row.depth}</td>
                                                        <td className="p-2 text-right font-bold text-green-600">
                                                            {row.entries[0]?.price?.toFixed(2)} EUR
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                                                        <td className="p-2 font-bold text-slate-800">{row.description}</td>
                                                        <td className="p-2 text-center text-slate-600">{row.unit}</td>
                                                        <td className="p-2 text-right font-bold text-green-600">
                                                            {row.entries[0]?.price?.toFixed(2)} EUR
                                                        </td>
                                                    </>
                                                )
                                            ) : (
                                                <>
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
                                                                // Fallback
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
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <ProductEditorModal
                isOpen={isProductEditorOpen}
                onClose={() => setIsProductEditorOpen(false)}
                productName={modelFamily}
                onSuccess={() => {
                    // Refresh not strictly needed as we just edited metadata
                }}
            />
        </div >
    );
};
