import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ClipboardImportModalProps {
    onClose: () => void;
    onSave: (data: any[], attributes?: any) => void;
}

type ColumnType = 'ignore' | 'width' | 'projection' | 'dimension_attributes' | 'price' | 'structure_price' | 'glass_price' | 'surcharge' | 'notes' | 'fields' | 'posts' | 'area' | 'name' | 'unit';

interface ColumnConfig {
    type: ColumnType;
    surchargeName?: string; // Only if type === 'surcharge'
}

export const ClipboardImportModal: React.FC<ClipboardImportModalProps> = ({ onClose, onSave }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [rawText, setRawText] = useState('');
    const [parsedRows, setParsedRows] = useState<string[][]>([]);
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
    const [snowZone, setSnowZone] = useState<'1' | '2' | '3'>('1');
    const [mountingType, setMountingType] = useState<'wall' | 'free'>('wall');
    const [manufacturer, setManufacturer] = useState<'Aluxe' | 'Deponti' | 'Inny'>('Aluxe');
    const [productHint, setProductHint] = useState<string>('');

    // Templates definition
    const applyTemplate = (type: 'glass' | 'poly' | 'carport' | 'carport_tin') => {
        if (parsedRows.length === 0) return;
        const maxCols = Math.max(...parsedRows.map(r => r.length));

        // Default clean slate
        let newConfigs: ColumnConfig[] = Array(maxCols).fill(null).map(() => ({ type: 'ignore' }));

        // Helper to safely set if index exists
        const setMap = (idx: number, type: ColumnType, surchargeName?: string) => {
            if (idx >= 0 && idx < newConfigs.length) {
                newConfigs[idx] = { type, surchargeName };
            }
        };

        // Note: parsedRows have split dimensions (Width, Proj) at 0, 1.

        // Dynamic Mapping Strategy:
        // Anchors: 
        // Start: Width(0), Proj(1), Suffix(2), Struct(3), Glass(4), Total(5)
        // End: Fields(L-3), Posts(L-2), Area(L-1)
        // Middle: Surcharges (6 ... L-4)

        if (type === 'glass' || type === 'poly') {
            setMap(0, 'width');
            setMap(1, 'projection');
            setMap(2, 'dimension_attributes');
            setMap(3, 'structure_price');
            setMap(4, 'glass_price');
            setMap(5, 'price');

            // Triplet (End Anchors)
            const lastIdx = maxCols - 1;
            setMap(lastIdx, 'area');
            setMap(lastIdx - 1, 'posts');
            setMap(lastIdx - 2, 'fields');

            // Surcharges (Middle)
            const surchargeStart = 6;
            const surchargeEnd = lastIdx - 3; // Inclusive

            if (surchargeStart <= surchargeEnd) {
                for (let i = surchargeStart; i <= surchargeEnd; i++) {
                    if (type === 'poly') {
                        setMap(i, 'surcharge', 'Poliwęglan IR-Gold');
                    } else {
                        // Glass surcharges - try to guess names? 
                        // 1st = Mat, 2nd = Sunscreen?
                        const offset = i - surchargeStart;
                        if (offset === 0) setMap(i, 'surcharge', 'Szkło matowe/mleczne');
                        else if (offset === 1) setMap(i, 'surcharge', 'Szkło przeciwsłoneczne');
                        else setMap(i, 'surcharge', `Dopłata ${offset + 1}`);
                    }
                }
            }

            if (type === 'glass') {
                toast.success(`Zastosowano szablon: Szkło (Dynamiczny, ${maxCols} kolumn)`);
            } else {
                toast.success(`Zastosowano szablon: Poliwęglan (Dynamiczny, ${maxCols} kolumn)`);
            }
        } else if (type === 'carport' || type === 'carport_tin') {
            // Carport: 6 source cols -> ~8 internal cols
            // Map: W, P, S, Struct, Total, Fields, Posts, Area
            // Usually no "Glass Price" or "Surcharges" unless detected.

            setMap(0, 'width');
            setMap(1, 'projection');
            setMap(2, 'dimension_attributes');
            setMap(3, 'structure_price');

            if (type === 'carport_tin') {
                // Map to 'glass_price' (interpreted as Roofing/Tin price)
                setMap(4, 'glass_price');
                toast.success('Zastosowano szablon: Carport (Blacha)');
            } else {
                // Map to 'price' (Total)
                setMap(4, 'price');
                toast.success('Zastosowano szablon: Carport (Konstrukcja)');
            }

            // Triplet
            const lastIdx = maxCols - 1;
            setMap(lastIdx, 'area');
            setMap(lastIdx - 1, 'posts');
            setMap(lastIdx - 2, 'fields');

            // Handle any middle columns as surcharges just in case
            const surchargeStart = 5;
            const surchargeEnd = lastIdx - 3;
            if (surchargeStart <= surchargeEnd) {
                for (let i = surchargeStart; i <= surchargeEnd; i++) {
                    setMap(i, 'surcharge', `Dodatek ${i - surchargeStart + 1}`);
                }
            }
        }

        setColumnConfigs(newConfigs);
    };

    const applyComponentTemplate = () => {
        if (parsedRows.length === 0) return;
        const maxCols = Math.max(...parsedRows.map(r => r.length));

        // Template: Name | Width | Unit | Price
        // Or Name | Width | Price
        let newConfigs: ColumnConfig[] = Array(maxCols).fill(null).map(() => ({ type: 'ignore' }));

        if (maxCols >= 2) {
            newConfigs[0] = { type: 'name' };
            newConfigs[1] = { type: 'width' };
            // Check for Unit column
            let priceIdx = 2;
            if (maxCols >= 4) {
                // Assume Col 2 is Unit, Col 3 is Price
                // But wait, user data: Name (0), Dim (1), Unit (2), Price (3)
                newConfigs[2] = { type: 'unit' };
                priceIdx = 3;
            }
            if (priceIdx < maxCols) newConfigs[priceIdx] = { type: 'price' };
        }

        setColumnConfigs(newConfigs);
        toast.success(`Zastosowano szablon: Lista Elementów (${maxCols} kolumn)`);
    };


    const applyMatrixTemplate = (contextType?: string) => {
        if (parsedRows.length < 2) return;

        // 1. Identify Header Row (Projections)
        let headerRowIdx = -1;
        let headerProjections: number[] = [];

        // Try to find the header row
        for (let i = 0; i < Math.min(5, parsedRows.length); i++) {
            const row = parsedRows[i];
            const numbers = row.map(c => parseFloat(c.replace(/[^\d.,]/g, '').replace(',', '.'))).filter(n => !isNaN(n) && n > 500);
            if (numbers.length >= 2) { // Changed to >= 2 to allow smaller matrices
                headerRowIdx = i;
                headerProjections = numbers;
                break;
            }
        }

        if (headerRowIdx === -1) {
            toast.error('Nie znaleziono wiersza nagłówkowego z wymiarami.');
            return;
        }

        const headerRow = parsedRows[headerRowIdx];
        console.log('Detected Matrix Header:', headerRow);

        // 2. Flatten Data
        const flattenedRows: string[][] = [];

        // Iterate data rows (skip header)
        for (let i = 0; i < parsedRows.length; i++) {
            if (i === headerRowIdx) continue;

            const row = parsedRows[i];
            if (row.length < headerProjections.length + 1) continue;

            const widthStr = row[0];
            const width = parseFloat(widthStr.replace(/[^\d.,]/g, '').replace(',', '.'));

            if (isNaN(width) || width < 500) continue;

            const offset = row.length - headerProjections.length;
            if (offset < 1) continue;

            for (let j = 0; j < headerProjections.length; j++) {
                const priceIdx = j + offset;
                if (priceIdx >= row.length) break;

                const priceRaw = row[priceIdx];
                const projection = headerProjections[j];

                flattenedRows.push([
                    width.toString(),
                    projection.toString(),
                    priceRaw
                ]);
            }
        }

        if (flattenedRows.length > 0) {
            setParsedRows(flattenedRows);
            const newConfigs: ColumnConfig[] = [
                { type: 'width' },
                { type: 'projection' },
                { type: 'price' }
            ];
            setColumnConfigs(newConfigs);

            // Auto-select manufacturer for Awnings if context provided
            if (contextType === 'aufdachmarkise_zip' || contextType === 'unterdachmarkise_zip') {
                setManufacturer('Aluxe'); // Default to Aluxe for these
                setProductHint(contextType);
                toast.success(`Przekształcono macierz dla: ${contextType === 'aufdachmarkise_zip' ? 'Aufdach' : 'Unterdach'}.`);
            } else if (contextType === 'zip_screen') {
                setManufacturer('Aluxe');
                setProductHint(contextType);
                toast.success('Przekształcono macierz: ZIP Screen.');
            } else {
                setProductHint('');
                toast.success(`Przekształcono macierz: ${flattenedRows.length} wierszy.`);
            }
        } else {
            toast.error('Błąd przekształcania macierzy. Sprawdź format.');
        }
    };

    const parseText = () => {
        if (!rawText.trim()) return;

        let rows: string[][] = [];
        const dimensionPattern = /^(\d{3,5})x(\d{3,5})([*+]*)$/i; // Updated to capture suffix group 3

        // Strategy: Tokenize everything and reconstruct rows based on Dimension anchors
        // This handles weird line breaks, "sequence" inputs, and noise like "€" better than line-based logic.

        // 1. Tokenize: Split by any whitespace/newline, filter noise
        const tokens = rawText.split(/[\s\n\t]+/)
            .map(t => t.trim())
            .filter(t => t !== '' && t !== '€' && t !== 'EUR' && t !== 'zł' && t !== 'PLN' && t !== '+');

        // 2. Scan tokens
        let currentRow: string[] = [];

        tokens.forEach(token => {
            // Check if token is a Dimension Anchor (Start of new row)
            const match = token.match(dimensionPattern);
            if (match) {
                // If we have a current row built up, push it
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                // Start new row with THREE tokens: Width, Projection, Suffix
                // match[1] = Width, match[2] = Projection, match[3] = Suffix (may be empty)
                currentRow = [match[1], match[2], match[3] || ''];
            } else {
                // Append to current row if it exists (skip leading noise before first row)
                if (currentRow.length > 0) {
                    currentRow.push(token);
                }
            }
        });

        // Push the last row
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        // Fallback to line splitting if token strategy fails (e.g. no 4000x3000 pattern found)
        // OR if the user pasted headers which don't have dimensions, we might want to capture headers first!

        // BETTER STRATEGY:
        // Identify if the first line looks like a header (text words, no numbers).
        const lines = rawText.split(/\n+/).filter(l => l.trim());
        let headerRow: string[] = [];

        // Check first line for keywords
        if (lines.length > 0) {
            const firstLine = lines[0];
            // Simple check: does it contain "Preis", "Breite", "Tiefe", "Felder"?
            const keywords = ['preis', 'price', 'breite', 'tiefe', 'ausfall', 'felder', 'pfosten', 'm2', 'oberfläche', 'surcharge', 'width', 'projection', 'fields', 'posts', 'area', 'structure', 'glass', 'netto', 'brutto', 'aufpreis', 'extra'];
            if (keywords.some(k => firstLine.toLowerCase().includes(k)) && !firstLine.match(/^[\d.,\s]+$/)) { // Ensure it's not just numbers
                // It's likely a header. Parse it with tab/space logic
                const hasTabs = firstLine.includes('\t');
                const delimiter = hasTabs ? '\t' : / {2,}|;/;
                headerRow = firstLine.split(delimiter).map(c => c.trim()).filter(c => c !== '');
            }
        }

        // If simple line split gives more consistant rows than token logic (which requires dimensions), use line split
        const lineRows = lines.map(line => {
            const hasTabs = line.includes('\t');
            const delimiter = hasTabs ? '\t' : / {2,}|;/;
            return line.split(delimiter).map(c => c.trim()).filter(c => c !== '');
        });

        // Decide which parser to use. 
        // If token logic found rows with dimensions, use it (it's robust for body).
        // But token logic strips headers!
        // Combine?

        if (rows.length === 0) { // If token-based parsing found no dimension patterns
            rows = lineRows; // Fallback to line-based parsing
            // If headerRow was detected, remove it from data rows
            if (headerRow.length > 0 && rows.length > 0 && rows[0].join('') === headerRow.join('')) {
                rows.shift();
            }
        } else {
            // Token logic worked for data.
            // If we detected a header row separately, prepend it?
            // Token logic splits "4000x3000" into 2 cols. Header might have "Maß" (1 col) or "Breite | Tiefe" (2 cols).
            // This mismatch is tricky. 
            // Let's stick to Body Parsing for rows, but use Header for Config Detection (Index matching).
        }

        // NEW: "Block Stream" Strategy (Best for interleaved tables with fragmented rows)
        // 1. Identify all Dimension Tokens and their indices in the raw tokens list
        // 2. Group them into "Blocks" (sequences of dimensions)
        // 3. For each Block, capture the "Data Tokens" following it until the next Block
        // 4. Distribute Data Tokens evenly among the Dimensions in the Block

        const dimRegex = new RegExp(dimensionPattern);
        // Robust tokenizer: preserve "3000x2000" but also "1.200,00"
        // Valid token chars: digits, dot, comma, x (for dims), *, +, -
        const validTokenRegex = /^[0-9.,x*+-]+$/i;

        const allTokens = rawText.split(/[\s\t\n]+/)
            .map(t => t.trim())
            .filter(t => t !== '' && validTokenRegex.test(t) && !['€', 'EUR', 'zł', 'PLN'].includes(t));

        // Identify indices of dimensions
        const dimIndices: number[] = [];
        allTokens.forEach((t, i) => {
            if (dimRegex.test(t)) dimIndices.push(i);
        });

        if (dimIndices.length > 0) {
            const refinedRows: string[][] = [];

            // 1. Split Dims into Blocks based on Projection Reset
            // e.g. 3000x2000...3000x5000 followed by 4000x2000. 5000->2000 is a reset.
            // Or just contiguous check? The user paste had 5000,6000,7000 contiguous.
            // We need to queue ALL dimensions first.

            // 2. Identify Data Tokens (everything NOT in dimIndices)
            // Actually, the structure is Dims... then Data...
            // Let's deduce where Data starts. 
            // Ideally: Dims are at the start.
            // But if interleaved, we need a stream.

            // Let's consume tokens.
            // If token is Dim -> Queue it as "Awaiting Data".
            // If token is Data -> Accumulate.
            // How do we know when a Row ends? Triplet Heuristic!

            const dimQueue: string[] = [];
            let currentDataBuffer: string[] = [];

            for (let i = 0; i < allTokens.length; i++) {
                const token = allTokens[i];
                const isDim = dimRegex.test(token);

                if (isDim) {
                    dimQueue.push(token);
                } else {
                    currentDataBuffer.push(token);

                    // Check for End-of-Row Pattern in the last 3 tokens
                    // Pattern: [Fields (3-15)], [Posts (2-5)], [Area (Num)]
                    if (currentDataBuffer.length >= 3) {
                        const tArea = currentDataBuffer[currentDataBuffer.length - 1];
                        const tPosts = currentDataBuffer[currentDataBuffer.length - 2];
                        const tFields = currentDataBuffer[currentDataBuffer.length - 3];

                        const isNum = (s: string) => /^[0-9,.]+$/.test(s);
                        const parseLoc = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

                        if (isNum(tArea) && isNum(tPosts) && isNum(tFields)) {
                            const vFields = parseLoc(tFields);
                            const vPosts = parseLoc(tPosts);
                            const vArea = parseLoc(tArea);

                            // Heuristic checks
                            const isInt = (n: number) => Math.abs(n - Math.round(n)) < 0.01;
                            const validFields = vFields >= 3 && vFields <= 30 && isInt(vFields); // User says "od 3"
                            const validPosts = vPosts >= 2 && vPosts <= 10 && isInt(vPosts); // "od 2"
                            const validArea = vArea >= 5.0; // User says "od 6", let's use 5.0 to be safe but stricter than 0.1

                            if (validFields && validPosts && validArea) {
                                // Found a row end!

                                // SELECTIVE CONSUMPTION STRATEGY
                                // The buffer might contain: [S1, G1, S2, G2, ... T1, Su1, Triplet1]
                                // We need to find S1, G1 that sum to T1.

                                // 1. Identify Candidate 'Total' (T1). Usually immediately before Triplet.
                                // Or maybe separated by Surcharges.
                                // Let's scan backwards from Triplet for a number that could be Total.

                                const bufferVals = currentDataBuffer.map(t => ({ token: t, val: parseLoc(t) }));
                                const tripletStartIdx = currentDataBuffer.length - 3; // Index of tFields

                                let totalIdx = -1;
                                let structIdx = -1;
                                let glassIdx = -1;

                                // Look for Total in the 5 tokens before Triplet (Total, Surch1, Surch2...)
                                const scanStart = Math.max(0, tripletStartIdx - 5);

                                // We match Total against ANY pair in the buffer (A + B = Total)
                                // Preferring A and B that are at the START of the buffer?
                                // Yes, S1 G1 should be early.

                                for (let t = tripletStartIdx - 1; t >= scanStart; t--) {
                                    const candTotal = bufferVals[t].val;
                                    if (candTotal < 100) continue; // Unlikely to be Total

                                    // Find A + B = candTotal
                                    for (let i = 0; i < t; i++) {
                                        for (let j = i + 1; j < t; j++) {
                                            const sum = bufferVals[i].val + bufferVals[j].val;
                                            if (Math.abs(sum - candTotal) < 1.0) {
                                                // Found Match!
                                                totalIdx = t;
                                                // Determine Struct vs Glass (Struct > Glass usually)
                                                if (bufferVals[i].val > bufferVals[j].val) {
                                                    structIdx = i;
                                                    glassIdx = j;
                                                } else {
                                                    structIdx = j;
                                                    glassIdx = i;
                                                }
                                                break;
                                            }
                                        }
                                        if (totalIdx !== -1) break;
                                    }
                                    if (totalIdx !== -1) break;
                                }

                                // If match found, consume SPECIFIC tokens
                                if (totalIdx !== -1 && structIdx !== -1) {
                                    const structToken = currentDataBuffer[structIdx];
                                    const glassToken = currentDataBuffer[glassIdx];
                                    const totalToken = currentDataBuffer[totalIdx];
                                    const structVal = parseLoc(structToken);

                                    // Collect Surcharges
                                    // 1. Post-Total: Always Surcharges
                                    // 2. Pre-Total (Sandwiched): Check magnitude. 
                                    //    If small (< 0.4 * Struct), it's likely a Surcharge for THIS row.
                                    //    If large, it's likely Data for NEXT row (Interleaved).

                                    const surcharges: string[] = [];
                                    const indicesToConsume = new Set([structIdx, glassIdx, totalIdx]);

                                    // Scan all tokens before Triplet
                                    for (let k = 0; k < tripletStartIdx; k++) {
                                        if (k === structIdx || k === glassIdx || k === totalIdx) continue;

                                        if (k > totalIdx) {
                                            // Post-Total: Definitely Surcharge
                                            surcharges.push(currentDataBuffer[k]);
                                            indicesToConsume.add(k);
                                        } else {
                                            // Pre-Total (Sandwiched or Leading)
                                            const val = parseLoc(currentDataBuffer[k]);
                                            // Heuristic: Surcharge is usually small. Structure Price is big.
                                            // Threshold: 40% of Structure Price.
                                            if (val < (structVal * 0.4)) {
                                                surcharges.push(currentDataBuffer[k]);
                                                indicesToConsume.add(k);
                                            }
                                            // Else: It's a big number (e.g. S2), leave it in buffer.
                                        }
                                    }

                                    const rowData = [
                                        structToken,
                                        glassToken,
                                        totalToken,
                                        ...surcharges,
                                        ...currentDataBuffer.slice(tripletStartIdx) // Triplet
                                    ];

                                    // ASSIGN ROW
                                    const nextDim = dimQueue.shift();
                                    if (nextDim) {
                                        const dimMatch = nextDim.match(dimensionPattern);
                                        if (dimMatch) {
                                            refinedRows.push([dimMatch[1], dimMatch[2], dimMatch[3] || '', ...rowData]);
                                        }
                                    }

                                    // CLEAN BUFFER
                                    // Keep only indices NOT in indicesToConsume (and NOT Triplet which is implicit consume)
                                    // We iterate up to tripletStartIdx because Triplet is consumed by definition
                                    // Wait, if we leave 'Big Numbers' before triplet, we keep them.
                                    // Triplet indices (tripletStartIdx to end) are consumed.

                                    const newBuffer: string[] = [];
                                    for (let k = 0; k < tripletStartIdx; k++) {
                                        if (!indicesToConsume.has(k)) {
                                            newBuffer.push(currentDataBuffer[k]);
                                        }
                                    }
                                    currentDataBuffer = newBuffer;

                                } else { // Fallback: No Sum match found.
                                    // Maybe simple row? Consume everything?
                                    // If we are in "7000" interleaved mode, blindly consuming is BAD.
                                    // But if we don't consume, we get stuck.
                                    // Let's assume strict sum match is required for interleaved robustness.
                                    // If check fails, maybe we wait for more data? (Maybe Total is defined later?)
                                    // No, Triplet is end of row. Total MUST be present.

                                    // Let's try to match Total with ONE element? (Maybe only Struct provided?)
                                    // Or maybe just consume all?
                                    // For safety, if no match, we consume ALL to avoid infinite loop, 
                                    // but warn/toast?
                                    // Actually, standard rows should match.
                                    // If simple row: S, G, T. Match found.
                                    // If interleaved S1, G1, S2, G2, T1... Match found.
                                    // If no match, data is weird.

                                    const nextDim = dimQueue.shift();
                                    if (nextDim) {
                                        const dimMatch = nextDim.match(dimensionPattern);
                                        if (dimMatch) {
                                            refinedRows.push([dimMatch[1], dimMatch[2], dimMatch[3] || '', ...currentDataBuffer]);
                                        }
                                    }
                                    currentDataBuffer = [];
                                }
                            }
                        }
                    }
                }
            }

            if (refinedRows.length > 0) {
                // Smart Column Mapping: Normalize data column order based on A + B = Total relationship
                // Standard Order required for Templates: [Struct, Glass, Total, Surch1, Surch2...]

                const structuredRows = refinedRows.map(row => {
                    const [w, p, suffix, ...data] = row;

                    // Identify the Triplet at the end (Fields, Posts, Area)
                    // We know the last 3 are the triplet because Smart Segmentation put them there.
                    // But let's be safe.
                    const triplet = data.slice(-3);
                    const values = data.slice(0, -3);

                    // Try to identify Struct/Glass/Total in 'values'
                    const nums = values.map(v => parseFloat(v.replace(/\./g, '').replace(',', '.')));

                    let structIdx = -1;
                    let glassIdx = -1;
                    let totalIdx = -1;

                    // Find A + B = C
                    for (let i = 0; i < nums.length; i++) {
                        for (let j = 0; j < nums.length; j++) {
                            if (i === j) continue;
                            for (let k = 0; k < nums.length; k++) {
                                if (k === i || k === j) continue;

                                if (Math.abs(nums[i] + nums[j] - nums[k]) < 1.0) {
                                    totalIdx = k;
                                    // Struct is usually larger than Glass
                                    if (nums[i] > nums[j]) {
                                        structIdx = i;
                                        glassIdx = j;
                                    } else {
                                        structIdx = j;
                                        glassIdx = i;
                                    }
                                    break;
                                }
                            }
                            if (totalIdx !== -1) break;
                        }
                        if (totalIdx !== -1) break;
                    }

                    if (totalIdx !== -1) {
                        // Found relationship! Reorder.
                        const structToken = values[structIdx];
                        const glassToken = values[glassIdx];
                        const totalToken = values[totalIdx];

                        const surcharges = values.filter((_, idx) => idx !== totalIdx && idx !== structIdx && idx !== glassIdx);

                        return {
                            header: [w, p, suffix],
                            prices: [structToken, glassToken, totalToken],
                            surcharges: surcharges,
                            triplet: triplet
                        };
                    }

                    // Fallback: If no relation, assume standard order or just split
                    // Since we don't know structure, we can't easily separate Surcharges.
                    // But usually fallback means messy data.
                    // Let's assume standard: S, G, T, [Sur], Triplet
                    if (values.length >= 3) {
                        return {
                            header: [w, p, suffix],
                            prices: [values[0], values[1], values[2]],
                            surcharges: values.slice(3),
                            triplet: triplet
                        };
                    }
                    return null; // Skip invalid
                }).filter(r => r !== null) as any[]; // Intermediate type

                // 2. Determine Max Surcharges
                const maxSurcharges = Math.max(0, ...structuredRows.map(r => r.surcharges.length));
                // Force at least 1 surcharge column for consistency with Poly template if expected
                // Actually, let's just make it rectangular.

                // 3. Reconstruct Rectangular Rows
                rows = structuredRows.map(r => {
                    const currentSurcharges = r.surcharges;
                    const paddingCount = maxSurcharges - currentSurcharges.length;
                    const padding = Array(paddingCount).fill('');

                    return [
                        ...r.header,
                        ...r.prices,
                        ...currentSurcharges,
                        ...padding,
                        ...r.triplet
                    ];
                });

                toast.success(`Zrekonstruowano i wyrównano ${rows.length} wierszy (Max dopłat: ${maxSurcharges}).`);
            }
        }

        if (rows.length === 0) {
            toast.error('Nie udało się odczytać żadnych danych.');
            return;
        }

        const maxCols = Math.max(...rows.map(r => r.length));
        setParsedRows(rows);

        // SMART CONFIG DETECTION
        const initialConfigs: ColumnConfig[] = Array(maxCols).fill(null).map(() => ({ type: 'ignore' }));

        // Try to map based on headerRow if matched
        if (headerRow.length > 0) {
            // We need to match header cols to data cols. 
            // If data has split dimensions (2 cols) but header has 1 "Maß", we need to offset.
            // Heuristic: Check if data[0] looks like split dimension.
            // We need to match header cols to data cols. 
            let headerIdx = 0;
            for (let i = 0; i < maxCols; i++) {
                if (headerIdx >= headerRow.length) break;
                const header = headerRow[headerIdx].toLowerCase();

                // Apply mapping
                if (header.includes('breite') || header.includes('width')) {
                    initialConfigs[i] = { type: 'width' };
                    headerIdx++;
                    // If next data col is projection but header didn't specify?
                } else if (header.includes('tiefe') || header.includes('ausfall') || header.includes('projection')) {
                    initialConfigs[i] = { type: 'projection' };
                    headerIdx++;
                } else if (header.includes('maß') || header.includes('mass')) {
                    // "Maß" usually implies Width AND Projection in one header col, but data has 2 cols.
                    initialConfigs[i] = { type: 'width' };
                    if (i + 1 < maxCols) {
                        initialConfigs[i + 1] = { type: 'projection' };
                        i++; // Skip next data col
                    }
                    headerIdx++;
                } else if (header.includes('felder') || header.includes('fields')) {
                    initialConfigs[i] = { type: 'fields' };
                    headerIdx++;
                } else if (header.includes('pfosten') || header.includes('posts')) {
                    initialConfigs[i] = { type: 'posts' };
                    headerIdx++;
                } else if (header.includes('oberfläche') || header.includes('area') || header.includes('m2')) {
                    initialConfigs[i] = { type: 'area' };
                    headerIdx++;
                } else if (header.includes('exkl') || header.includes('netto') || header.includes('structure')) {
                    initialConfigs[i] = { type: 'structure_price' };
                    headerIdx++;
                } else if (header.includes('inkl') || header.includes('brutto') || header.includes('glass')) {
                    // Heuristic: if structure_price is present, incl might be full price or glass price
                    initialConfigs[i] = { type: 'price' }; // Default to Price (Total)
                    headerIdx++;
                } else if (header.includes('preis') || header.includes('price')) {
                    initialConfigs[i] = { type: 'price' };
                    headerIdx++;
                } else if (header.includes('aufpreis') || header.includes('extra') || header.includes('surcharge')) {
                    initialConfigs[i] = { type: 'surcharge', surchargeName: headerRow[headerIdx] };
                    headerIdx++;
                } else {
                    headerIdx++;
                }
            }
            if (headerRow.length > 0) toast.success('Automatycznie rozpoznano nagłówki!');
        }

        setColumnConfigs(initialConfigs);

        setStep(2);

        // Auto-detect template?
        // If 10 cols -> Glass? If 8 cols -> Poly?
        if (maxCols === 10) {
            // Defer to user or auto-apply? Let's just notify or define separate button.
            // Let's not auto-override without user asking, but specific button is fast.
        }
        toast.success(`Wykryto ${rows.length} wierszy. Maks. kolumn: ${maxCols}`);
    };

    const updateConfig = (index: number, updates: Partial<ColumnConfig>) => {
        const newConfigs = [...columnConfigs];
        newConfigs[index] = { ...newConfigs[index], ...updates };

        // Auto-suggest surcharge name from header row (first row) if strictly switching to surcharge
        if (updates.type === 'surcharge' && !newConfigs[index].surchargeName && parsedRows.length > 0) {
            newConfigs[index].surchargeName = parsedRows[0][index] || 'Dopłata';
        }

        setColumnConfigs(newConfigs);
    };

    const handleSave = () => {
        try {
            const resultData: any[] = [];
            let currentGroupName = ''; // For stateful lists formatted like "Group Header" then items

            // Skip header row usually? Let's check if first row is strictly text headers.
            // For now, iterate all rows and try to parse numbers. If fail, skip (likely header).

            for (let i = 0; i < parsedRows.length; i++) {
                const row = parsedRows[i];
                const entry: any = {
                    surcharges: [],
                    properties: {} // Init properties
                };
                let hasValidData = false;

                // Pre-scan for Name column to update group
                const nameColIdx = columnConfigs.findIndex(c => c.type === 'name');
                if (nameColIdx !== -1) {
                    const val = row[nameColIdx];
                    if (val && val.trim() !== '') {
                        currentGroupName = val.trim();
                    }
                    if (currentGroupName) {
                        entry.properties.name = currentGroupName;
                    }
                }

                columnConfigs.forEach((config, colIndex) => {
                    const cellValue = row[colIndex];
                    if (!cellValue) return;

                    // Clean string to number (replace comma with dot, remove non-numeric except dot)
                    // Be careful with currency like "2.500,00 €" -> "2500.00"
                    // Simple parser: remove formatting spaces, replace comma with dot
                    const cleanNumFunc = (str: string) => {
                        const clean = str.replace(/[^\d.,-]/g, '').replace(',', '.');
                        // if multiple dots, keep last one? Standard logic needed.
                        // Assume standard float format 1000.00 or 1000,00
                        return parseFloat(clean);
                    };

                    const numVal = cleanNumFunc(cellValue);

                    if (config.type === 'width') {
                        entry.width_mm = numVal;
                        hasValidData = true;
                    } else if (config.type === 'projection') {
                        entry.projection_mm = numVal;
                        hasValidData = true;
                    } else if (config.type === 'price') {
                        entry.price = numVal;
                        hasValidData = true;
                    } else if (config.type === 'structure_price') {
                        entry.structure_price = numVal;
                    } else if (config.type === 'glass_price') {
                        entry.glass_price = numVal;
                    } else if (config.type === 'surcharge') {
                        if (config.surchargeName && !isNaN(numVal)) {
                            entry.surcharges.push({
                                name: config.surchargeName,
                                price: numVal,
                                unit: 'fixed' // Default to fixed, maybe infer?
                            });
                        }
                    } else if (config.type === 'notes') {
                        entry.notes = cellValue;
                    } else if (config.type === 'name') {
                        // Handle Name grouping
                        if (cellValue && cellValue.trim() !== '') {
                            entry.properties.name = cellValue;
                            // Update current group name for next iterations
                            // Note: This logic assumes rows are processed in order and currentGroupName is updated 
                            // properly in the pre-scan above. This check here is mainly to save it to the entry.
                        }
                    } else if (config.type === 'unit') {
                        entry.properties.unit = cellValue;
                    } else if (config.type === 'fields') {
                        entry.properties.fields_count = numVal;
                    } else if (config.type === 'posts') {
                        entry.properties.posts_count = numVal;
                    } else if (config.type === 'area') {
                        entry.properties.area_m2 = numVal;
                    } else if (config.type === 'dimension_attributes') {
                        // Parse suffix
                        const suffix = typeof cellValue === 'string' ? cellValue : '';
                        let rafter = 'std';
                        let reinforced = false;

                        const stars = (suffix.match(/\*/g) || []).length;
                        if (stars === 1) rafter = 'M';
                        if (stars === 2) rafter = 'L';
                        if (stars === 3) rafter = 'XL';
                        if (stars === 4) rafter = 'XL_Steel';

                        if (suffix.includes('+')) reinforced = true;

                        if (rafter !== 'std') entry.properties.rafter_type = rafter;
                        if (reinforced) entry.properties.reinforcement = true;
                    }
                });

                // Validation: Must have structure_price OR price.
                // For Components, width might be Length. Projection = 0.
                if (hasValidData && (entry.price || entry.structure_price)) {
                    // Default dims if missing
                    if (!entry.width_mm && entry.properties.name) entry.width_mm = 0; // Accept 0 width for pure items? 
                    // Actually database requires NON NULL? schema says width_mm can be null? No, usually required.
                    // But for components, maybe we map Length to Width.

                    if (!entry.width_mm) entry.width_mm = 0;
                    if (!entry.projection_mm) entry.projection_mm = 0;

                    // Logic to ensure price fields
                    if (!entry.price) entry.price = (entry.structure_price || 0) + (entry.glass_price || 0);
                    if (!entry.structure_price) entry.structure_price = entry.price;

                    resultData.push(entry);
                }
            }

            if (resultData.length === 0) {
                toast.error('Nie znaleziono poprawnych wierszy z danymi (Szerokość + Wysięg + Cena). Sprawdź mapowanie.');
                return;
            }

            // Pass detected attributes
            onSave(resultData, { snow_zone: snowZone, mounting_type: mountingType, provider: manufacturer, product_code: productHint });
            onClose();
            toast.success(`Zaimportowano ${resultData.length} wierszy!`);

        } catch (e: any) {
            console.error(e);
            toast.error('Błąd importu: ' + e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-xl font-bold">Import ze Schowka (Excel/PDF)</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-2xl">×</button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    {step === 1 ? (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                                <p className="font-bold mb-1">Instrukcja:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Zaznacz tabelę w Excelu lub PDF.</li>
                                    <li>Skopiuj (Ctrl+C).</li>
                                    <li>Wklej poniżej (Ctrl+V).</li>
                                    <li>Kliknij "Dalej", aby przypisać kolumny.</li>
                                </ol>
                            </div>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="flex-1 w-full p-4 border border-slate-300 rounded-lg font-mono text-sm focus:border-accent focus:ring-1 focus:ring-accent"
                                placeholder="Wklej tutaj dane..."
                            />
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={parseText}
                                    disabled={!rawText.trim()}
                                    className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50"
                                >
                                    Dalej → Analizuj Kolumny
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex flex-wrap gap-6 items-start">
                                    {/* Global Settings Group */}
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 block mb-1">Globalne Ustawienia:</span>
                                            <div className="flex gap-2">
                                                <select
                                                    value={snowZone}
                                                    onChange={(e) => setSnowZone(e.target.value as any)}
                                                    className="p-1.5 text-sm border rounded bg-white"
                                                    title="Strefa Śniegowa"
                                                >
                                                    <option value="1">Strefa 1 (0.65)</option>
                                                    <option value="2">Strefa 2 (0.85)</option>
                                                    <option value="3">Strefa 3 (1.10+)</option>
                                                </select>
                                                <select
                                                    value={mountingType}
                                                    onChange={(e) => setMountingType(e.target.value as any)}
                                                    className="p-1.5 text-sm border rounded bg-white"
                                                    title="Typ Montażu"
                                                >
                                                    <option value="wall">Montaż: Ściana</option>
                                                    <option value="free">Montaż: Wolnostojący</option>
                                                </select>
                                                <select
                                                    value={manufacturer}
                                                    onChange={(e) => setManufacturer(e.target.value as any)}
                                                    className="p-1.5 text-sm border rounded bg-white"
                                                    title="Producent"
                                                >
                                                    <option value="Aluxe">Aluxe</option>
                                                    <option value="Deponti">Deponti</option>
                                                    <option value="Inny">Inny</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vertical Separator (hidden on mobile) */}
                                    <div className="hidden md:block w-px self-stretch bg-slate-300 mx-2"></div>

                                    {/* Templates Group */}
                                    <div className="flex-1 min-w-[300px]">
                                        <span className="text-xs font-bold text-slate-700 block mb-1">Szybkie Szablony (Kliknij aby zastosować):</span>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="flex gap-1 items-center bg-white p-1 rounded border border-slate-200">
                                                <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">Dachy</span>
                                                <button onClick={() => applyTemplate('glass')} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 border border-blue-100">Szkło (9)</button>
                                                <button onClick={() => applyTemplate('poly')} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded hover:bg-amber-100 border border-amber-100">Poly (8)</button>
                                            </div>

                                            <div className="flex gap-1 items-center bg-white p-1 rounded border border-slate-200">
                                                <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">Carport</span>
                                                <button onClick={() => applyTemplate('carport')} className="px-2 py-1 bg-zinc-50 text-zinc-700 text-xs rounded hover:bg-zinc-100 border border-zinc-100">Konstr.</button>
                                                <button onClick={() => applyTemplate('carport_tin')} className="px-2 py-1 bg-slate-50 text-slate-700 text-xs rounded hover:bg-slate-100 border border-slate-100">Blacha</button>
                                            </div>

                                            <div className="flex gap-1 items-center bg-white p-1 rounded border border-slate-200">
                                                <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">Rolety</span>
                                                <button onClick={() => applyMatrixTemplate('zip_screen')} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded hover:bg-purple-100 border border-purple-100">ZIP Screen</button>
                                                <button onClick={() => applyMatrixTemplate('aufdachmarkise_zip')} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100 border border-indigo-100">Aufdach (Dachowa)</button>
                                                <button onClick={() => applyMatrixTemplate('unterdachmarkise_zip')} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded hover:bg-teal-100 border border-teal-100">Unterdach (Poddachowa)</button>
                                            </div>
                                            <div className="flex gap-1 items-center bg-white p-1 rounded border border-slate-200">
                                                <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">Komponenty</span>
                                                <button onClick={applyComponentTemplate} className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded hover:bg-gray-100 border border-gray-100">Lista Części</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                                <strong>Wskazówka:</strong> Przypisz nagłówki do kolumn. Ignoruj kolumny niepotrzebne. Wiersze nagłówkowe (tekstowe) zostaną automatycznie pominięte przy imporcie.
                            </div>

                            <div className="flex-1 overflow-auto border border-slate-300 rounded-lg">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr>
                                            {columnConfigs.map((config, idx) => (
                                                <th key={idx} className="p-2 border-b border-r border-slate-200 bg-slate-100 min-w-[150px] sticky top-0 z-10">
                                                    <div className="flex flex-col gap-2">
                                                        <select
                                                            value={config.type}
                                                            onChange={(e) => updateConfig(idx, { type: e.target.value as ColumnType })}
                                                            className={`w-full text-xs p-1 rounded border font-bold ${config.type === 'ignore' ? 'bg-slate-200 text-slate-500' :
                                                                config.type.includes('price') ? 'bg-green-100 text-green-700 border-green-300' :
                                                                    config.type === 'width' || config.type === 'projection' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                                                        'bg-amber-100 text-amber-700 border-amber-300'
                                                                }`}
                                                        >
                                                            <option value="ignore">Ignoruj</option>
                                                            <option value="width">Szerokość (mm)</option>
                                                            <option value="projection">Głębokość / Wysokość (mm)</option>
                                                            <option value="dimension_attributes">Wymagany Dodatek (* / +)</option>
                                                            <option value="structure_price">Cena Konstrukcji</option>
                                                            <option value="glass_price">Cena Pokrycia (Szkło/Poly/Blacha)</option>
                                                            <option value="price">Cena Całkowita (Komplet)</option>
                                                            <option value="surcharge">Dopłata (Inne)</option>
                                                            <option value="fields">Liczba Pól</option>
                                                            <option value="posts">Liczba Słupów</option>
                                                            <option value="area">Powierzchnia (m²)</option>
                                                            <option value="name" className="font-bold border-t border-slate-300">Nazwa Elementu (Grupa)</option>
                                                            <option value="unit">Jednostka (np. Stk)</option>
                                                        </select>

                                                        {config.type === 'surcharge' && (
                                                            <input
                                                                type="text"
                                                                placeholder="Nazwa dopłaty"
                                                                value={config.surchargeName || ''}
                                                                onChange={(e) => updateConfig(idx, { surchargeName: e.target.value })}
                                                                className="text-xs p-1 border rounded"
                                                            />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedRows.slice(0, 50).map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-50">
                                                {columnConfigs.map((config, cIdx) => (
                                                    <td key={cIdx} className={`p-2 border-r border-slate-100 text-xs truncate max-w-[150px] ${config.type !== 'ignore' ? 'font-medium text-slate-900' : 'text-slate-400 opacity-50'}`}>
                                                        {row[cIdx]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between pt-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                                >
                                    ← Wróć do tekstu
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                                >
                                    Zapisz Dane ({parsedRows.length} wierszy)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
