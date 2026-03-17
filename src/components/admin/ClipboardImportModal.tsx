import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ClipboardImportModalProps {
    onClose: () => void;
    onSave: (data: any[], attributes?: any) => void;
    products: any[];
}

type ColumnType = 'ignore' | 'width' | 'projection' | 'dimension_attributes' | 'price' | 'structure_price' | 'glass_price' | 'surcharge' | 'notes' | 'fields' | 'posts' | 'area' | 'name' | 'unit';

interface ColumnConfig {
    type: ColumnType;
    surchargeName?: string; // Only if type === 'surcharge'
}

export const ClipboardImportModal: React.FC<ClipboardImportModalProps> = ({ onClose, onSave, products }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [rawText, setRawText] = useState('');
    const [parsedRows, setParsedRows] = useState<string[][]>([]);
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
    const [snowZone, setSnowZone] = useState<'1' | '2' | '3'>('1');
    const [mountingType, setMountingType] = useState<'wall' | 'free'>('wall');
    const [manufacturer, setManufacturer] = useState<'Aluxe' | 'Deponti' | 'Inny'>('Aluxe');
    const [productHint, setProductHint] = useState<string>('');
    const [tableType, setTableType] = useState<'standard' | 'component_list'>('standard');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [lastFailureReason, setLastFailureReason] = useState<string | null>(null);

    // Templates definition
    const applyTemplate = (type: 'glass' | 'poly' | 'carport' | 'carport_tin') => {
        if (parsedRows.length === 0) return;
        setTableType('standard'); // Reset to standard
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
        setTableType('component_list'); // Tag as component list
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
        setTableType('standard'); // Matrix is always standard pricing

        // Robust Number Parser for EU formats (1.234,56 or 1 234,56 or 2.000)
        const parseEurNumber = (str: string) => {
            if (!str) return NaN;
            // Remove spaces (common thousands separator)
            let clean = str.replace(/\s+/g, '');
            // Clean other noise (keep digits, dot, comma, minus)
            clean = clean.replace(/[^\d.,-]/g, '');

            if (!clean) return NaN;

            // Case 1: "1.234,56" or "1234,56" (Comma is decimal)
            if (clean.includes(',')) {
                // If standard EU format, remove dots (thousands), replace comma with dot
                return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
            }

            // Case 2: "1.234" (Dot only) - Ambiguous
            // If it ends with exactly 3 digits, assume it's thousands separator (e.g. 2.000mm)
            // Unless it's small value like 1.234 (price)? 
            // In our context (Dimensions/Prices):
            // Dimensions > 500. Prices usually > 10.
            if (clean.includes('.')) {
                const parts = clean.split('.');
                const lastPart = parts[parts.length - 1];

                // Heuristic: If 3 decimals and value < 50 interpreted normally, treat as thousands.
                const normalVal = parseFloat(clean);
                if (lastPart.length === 3 && normalVal < 50) {
                    return parseFloat(clean.replace(/\./g, ''));
                }
                return normalVal;
            }

            return parseFloat(clean);
        };

        // 1. Identify Header Row (Projections)
        let headerRowIdx = -1;
        let headerProjections: number[] = [];

        // Try to find the header row
        for (let i = 0; i < Math.min(5, parsedRows.length); i++) {
            const row = parsedRows[i];
            // Use robust parser
            const numbers = row.map(c => parseEurNumber(c)).filter(n => !isNaN(n) && n > 500);

            if (numbers.length >= 2) {
                headerRowIdx = i;
                headerProjections = numbers;
                break;
            }
        }

        if (headerRowIdx === -1) {
            // Failed to find explicit header row. try to infer from data.
            // 1. Gather stats on large numbers count per row
            const counts = new Map<number, number>();
            let maxCount = 0;
            let mostFrequentCount = 0;

            for (let i = 0; i < parsedRows.length; i++) {
                const row = parsedRows[i];
                const nums = row.map(c => parseEurNumber(c)).filter(n => !isNaN(n) && n > 10);
                if (nums.length > 2) { // Only consider rows with meaningful data
                    const count = nums.length;
                    counts.set(count, (counts.get(count) || 0) + 1);
                    if (counts.get(count)! > maxCount) {
                        maxCount = counts.get(count)!;
                        mostFrequentCount = count;
                    }
                }
            }

            if (mostFrequentCount > 2) {
                // Infer header structure
                // expect mostFrequentCount numbers. 1 is Width, rest are Prices.
                // Generate dummy header or try to use standard logic?
                // Price columns count
                const priceCols = mostFrequentCount - 1;

                // Fallback Awnings/ZIP standard projections logic
                // If it looks like 6 columns, maybe it's 2500-5000? 
                // If 9 columns, maybe 1000-3000?
                // But safer to just create placeholders if we can't be sure, OR use the contextType hints.

                if (priceCols === 6) {
                    headerProjections = [2500, 3000, 3500, 4000, 4500, 5000];
                    toast('Wykryto 6 kolumn cenowych. Zastosowano standardowy nagłówek (2500-5000).', { icon: '🤖' });
                } else if (priceCols === 9) {
                    headerProjections = [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000];
                    toast('Wykryto 9 kolumn cenowych. Zastosowano standardowy nagłówek ZIP (1000-3000).', { icon: '🤖' });
                } else {
                    // Generic fallback
                    headerProjections = Array(priceCols).fill(0).map((_, i) => (i + 1) * 500 + 2000); // arbitrary
                    toast(`Wykryto ${priceCols} kolumn cenowych. Zastosowano domyślne nagłówki. Sprawdź wartości!`, { icon: '⚠️' });
                }


            } else {
                // Double fallback for ZIP Screen if inference failed
                const isZip = contextType === 'zip_screen' || contextType === 'aufdachmarkise_zip' || contextType === 'unterdachmarkise_zip';
                if (isZip) {
                    headerProjections = [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000];
                    toast('Nie wykryto nagłówka ani danych - użyto standard ZIP (1000-3000).', { icon: 'ℹ️' });
                } else {
                    toast.error('Nie znaleziono wiersza nagłówkowego ani spójnych danych. Upewnij się, że zaznaczyłeś tabelę.');
                    return;
                }
            }
        } else {
        }

        // 2. Flatten Data
        const flattenedRows: string[][] = [];
        let skippedRowsCount = 0;
        let lastFailureReason = '';

        // Iterate data rows (skip header if explicit)
        for (let i = 0; i < parsedRows.length; i++) {
            if (i === headerRowIdx) continue;

            const row = parsedRows[i];
            const allLargeNumbers: number[] = [];

            for (let k = 0; k < row.length; k++) {
                const cell = row[k];
                if (['€', 'EUR', 'PLN', 'zł'].includes(cell.trim())) continue;

                const val = parseEurNumber(cell);
                if (!isNaN(val) && val > 10) { // Threshold > 10 excludes fixings (2,3)
                    allLargeNumbers.push(val);
                }
            }

            // check count
            const expectedCount = headerProjections.length + 1;

            if (allLargeNumbers.length >= expectedCount) {
                // Take LAST expectedCount numbers (Price columns + 1 Width column before them)
                const relevantNumbers = allLargeNumbers.slice(-expectedCount);
                const width = relevantNumbers[0];
                const prices = relevantNumbers.slice(1);

                if (width < 500) continue; // Width sanity check

                for (let j = 0; j < prices.length; j++) {
                    const priceVal = prices[j];
                    const projection = headerProjections[j];

                    flattenedRows.push([
                        width.toString(),
                        projection.toString(),
                        priceVal.toString()
                    ]);
                }
            } else {
                if (allLargeNumbers.length > 0) {
                    skippedRowsCount++;
                    lastFailureReason = `Wiersz ma ${allLargeNumbers.length} liczb, oczekiwano ${expectedCount}`;
                }
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

            // Auto-select manufacturer
            if (contextType === 'aufdachmarkise_zip' || contextType === 'unterdachmarkise_zip') {
                setManufacturer('Aluxe');
                setProductHint(contextType);
                toast.success(`Przekształcono macierz: ${flattenedRows.length} poz. (${contextType})`);
            } else if (contextType === 'zip_screen') {
                setManufacturer('Aluxe');
                setProductHint(contextType);
                toast.success('Przekształcono macierz: ZIP Screen.');
            } else {
                setProductHint('');
                toast.success(`Przekształcono macierz: ${flattenedRows.length} wierszy.`);
            }
        } else {
            toast.error(`Błąd: Nie dopasowano danych. ${lastFailureReason || 'Sprawdź czy zaznaczyłeś całą tabelę.'}`);
            console.warn('Matrix transform failed.', lastFailureReason);
        }
    };

    const [parseMode, setParseMode] = useState<'auto' | 'excel' | 'text' | 'matrix'>('auto'); // Added 'matrix'
    const [reverseOrder, setReverseOrder] = useState<boolean>(false); // Added reverse toggl

    const reset = () => {
        setStep(1);
        setRawText('');
        setParsedRows([]);
        setColumnConfigs([]);
        setLastFailureReason(null);
        setParseMode('auto');
        setReverseOrder(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRawText(e.target.value);
    };

    // ... (helper functions omitted for brevity if not changed) ...

    const parseText = (append: boolean = false) => {
        if (!rawText.trim()) return;

        let rows: string[][] = [];
        let headerRow: string[] = []; // Hoisted for shared usage
        const dimensionPattern = /^(\d{3,5})x(\d{3,5})([*+]*)$/i;

        // DETECT PARSING STRATEGY
        // 1. Explicit Excel Mode -> Strict Tab Split
        // 2. Auto + Tabs Detected -> Strict Tab Split
        // 3. Text/PDF Mode -> Token/Dimension Strategy

        const hasTabs = rawText.includes('\t');
        // SMART LAYOUT DETECTION
        // Heuristics to determine: Reverse, Matrix, Transposed

        let workingText = rawText;
        let detectedReverse = false;
        let detectedLayout: 'matrix' | 'stream' | 'excel' = 'stream'; // Default to stream
        let detectedTranspose = false;

        // 1. Check for Reverse Order (Last line is Header-like, First line is Data-like)
        const rawLines = workingText.split('\n').filter(l => l.trim());
        if (rawLines.length > 3) {
            const firstLineTokens = rawLines[0].split(/[\t\s]+/).filter(t => /^\d+$/.test(t.replace(/[.,]/g, '')));
            const lastLineTokens = rawLines[rawLines.length - 1].split(/[\t\s]+/).filter(t => /^\d+$/.test(t.replace(/[.,]/g, '')));

            // Header usually has many numbers (Projections/Widths). Data line has 1 (Side Header) + Prices.
            // If Last Line has > 2 numbers (Header) AND First Line has fewer, assume Reverse.
            if (lastLineTokens.length > 2 && firstLineTokens.length < lastLineTokens.length) {
                detectedReverse = true;
                if (!reverseOrder && parseMode === 'auto') { // Only auto-reverse if not manually overridden
                    workingText = rawLines.reverse().join('\n');
                    toast('Wykryto odwróconą kolejność - automatycznie naprawiono.', { icon: '🔃' });
                }
            }
        }
        if (reverseOrder) { // Manual override takes precedence
            const lines = rawText.split('\n'); // Use original rawText for manual reverse
            workingText = lines.reverse().join('\n');
        }

        const lines = workingText.split(/\n+/).filter(l => l.trim().length > 0);

        // 2. Check for Matrix Pattern
        // Line 0: Header (Many numbers)
        // Line 1..N: Start with Number (Side Header) + Prices
        if (lines.length > 1) {
            const headerTokens = lines[0].split(/[\t\s]+/).filter(t => /^\d+$/.test(t.replace(/[.,]/g, '')));
            const nextLineTokens = lines[1].split(/[\t\s]+/).filter(t => /^\d+$/.test(t.replace(/[.,]/g, '')));

            // Matrix if Header has > 2 nums.
            if (headerTokens.length > 2) {
                detectedLayout = 'matrix';
            }
        }

        // 3. Check for Transpose (Widths Vertical?)
        // If "Header" values are SMALL (Projections < 3000) and "Side" values are LARGE (Widths > 3000)
        // Then we are Transposed.
        if (detectedLayout === 'matrix') {
            const headerTokens = lines[0].split(/[\t\s]+/).filter(t => /^\d+$/.test(t.replace(/[.,]/g, '')));
            const sideToken = lines[1].split(/[\t\s]+/)[0].replace(/[.,]/g, ''); // 2nd line first element

            const headerAvg = headerTokens.reduce((s, n) => s + parseFloat(n), 0) / headerTokens.length;
            const sideVal = parseFloat(sideToken);

            // Heuristic: Widths are usually > 2500. Projections < 5000 (overlap).
            // But if Header Avg < 3000 (Projections) and Side > 3000 (Width) -> Transposed.
            if (headerAvg < 3000 && sideVal > 3000) {
                detectedTranspose = true;
                toast('Wykryto transpozycję (Szerokości w pionie).', { icon: '📐' });
            }
        }

        // FORCE MODES based on detection if AUTO
        const actualMode = parseMode === 'auto' ? (detectedLayout === 'matrix' ? 'matrix' : (hasTabs ? 'excel' : 'stream')) : parseMode;

        if (actualMode === 'matrix') {
            // MATRIX PARSING LOGIC
            let headerLineIdx = 0;
            let headerValues: number[] = [];

            // Find first line that looks like a header (numbers)
            for (let i = 0; i < Math.min(lines.length, 5); i++) {
                const tokens = lines[i].split(/[\t\s]+/).filter(t => /^\d+$/.test(t.replace(/[.,]/g, '')));
                const nums = tokens.map(t => parseFloat(t.replace(/[.,]/g, '')));
                if (nums.length > 1) { // Relaxed: > 1 number is enough
                    headerValues = nums;
                    headerLineIdx = i;
                    break;
                }
            }

            if (headerValues.length === 0) {
                // If explicit matrix mode, warn. If auto, allow fallback.
                if (parseMode === 'matrix') {
                    toast.error('Nie znaleziono wiersza nagłówkowego.');
                    return;
                }
            } else {
                const matrixRows: string[][] = [];
                for (let i = headerLineIdx + 1; i < lines.length; i++) {
                    const line = lines[i];
                    const tokens = line.split(/[\t\s]+/).filter(t => t.trim() !== '' && !['€', 'PLN'].includes(t));

                    if (tokens.length === 0) continue;

                    const sideHeaderStr = tokens[0];
                    const cleanSide = parseFloat(sideHeaderStr.replace(/[.,]/g, ''));

                    if (isNaN(cleanSide)) continue;

                    const prices = tokens.slice(1);

                    prices.forEach((priceStr, colIdx) => {
                        if (colIdx < headerValues.length) {
                            let width: number, proj: number;
                            if (detectedTranspose) {
                                width = cleanSide;
                                proj = headerValues[colIdx];
                            } else {
                                width = headerValues[colIdx];
                                proj = cleanSide;
                            }
                            matrixRows.push([width.toString(), proj.toString(), '', priceStr]);
                        }
                    });
                }
                if (matrixRows.length > 0) {
                    rows = matrixRows;
                    toast.success(`Macierz przetworzona: ${headerValues.length} x ${lines.length - headerLineIdx - 1}`);
                }
            }
        }

        // Fallback or Excel Mode
        // Fallback or Excel Mode
        if (rows.length === 0 && actualMode === 'excel') {
            const lines = workingText.split(/\n+/).filter(l => l.trim().length > 0);
            rows = lines.map(line => line.split('\t').map(c => c.trim()));
            if (lines.length > 0) headerRow = lines[0].split('\t').map(c => c.trim());
            toast.success(`Użyto trybu Excel/Tab (Zachowano puste kolumny).`);
        } else if (rows.length === 0) {
            // Stream / Fallback
            const lines = workingText.split(/\n+/).filter(l => l.trim().length > 0);
            const firstLine = lines[0] || '';
            const keywords = ['preis', 'price', 'breite', 'tiefe', 'ausfall', 'felder', 'pfosten', 'm2', 'oberfläche', 'surcharge', 'width', 'projection', 'fields', 'posts', 'area', 'structure', 'glass', 'netto', 'brutto', 'aufpreis', 'extra'];

            if (keywords.some(k => firstLine.toLowerCase().includes(k)) && !firstLine.match(/^[\d.,\s]+$/)) {
                // It's likely a header. Parse it with tab/space logic
                const hasTabs = firstLine.includes('\t');
                const delimiter = hasTabs ? '\t' : / {2,}|;/;
                headerRow = firstLine.split(delimiter).map(c => c.trim()).filter(c => c !== '');
            }
        }

        // If simple line split gives more consistant rows than token logic (which requires dimensions), use line split
        const lineRows = lines.map(line => {
            const hasTabs = line.includes('\t');

            // Heuristic: If line contains mostly numbers and symbols, allow valid single space splitting.
            // If it contains text (like "Szkło Mleczne"), stick to 2-spaces or tabs.
            const isDataLike = /^[\d\s.,€EURzłPLN+%*()-]+$/i.test(line);

            let delimiter: string | RegExp;
            if (hasTabs) {
                delimiter = '\t';
            } else if (isDataLike) {
                // For number-only rows (headers or data), single space is a valid separator
                delimiter = /[\s\t]+|;/;
            } else {
                // For text-heavy rows, require 2 spaces to avoid splitting phrases
                delimiter = / {2,}|;/;
            }

            return line.split(delimiter)
                .map(c => c.trim())
                .filter(c => c !== '' && !['€', 'EUR', 'PLN', 'zł'].includes(c));
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

        // NEW: "Unified Queue" Strategy (Handles Interleaved & Columnar Streams)
        // 1. Queue all Dimensions FIRST.
        // 2. Distribute Prices to the Queue (FIFO).
        // 3. Distribute Triplets (Data) to the Queue (FIFO or Batch).

        const dimRegex = new RegExp(dimensionPattern);
        // Robust tokenizer: preserve "3000x2000" but also "1.200,00"
        // Valid token chars: digits, dot, comma, x (for dims), *, +, -
        const validTokenRegex = /^[0-9.,x*+-]+$/i;

        const allTokens = rawText.split(/[\s\t\n]+/)
            .map(t => t.trim())
            .filter(t => t !== '' && validTokenRegex.test(t) && !['€', 'EUR', 'zł', 'PLN'].includes(t));

        // State Queues
        interface PendingRow {
            width: string;
            projection: string;
            suffix: string;
            prices: string[];
            data: string[];
        }
        const pendingRows: PendingRow[] = [];

        // Cursor for assigning data
        let priceCursor = 0;
        let dataCursor = 0;

        // Helper to qualify tokens
        const isDim = (t: string) => dimRegex.test(t);
        const isPrice = (t: string) => {
            // Heuristic: Has comma/dot AND usually > 50 (to avoid small ints like '4')
            // OR explicitly currency-like (handled by filter, but check values)
            const val = parseFloat(t.replace(/\./g, '').replace(',', '.'));
            if (val > 50) return true;
            // If contains comma, it's likely a price (e.g. 7,5 is small but decimal)
            if (t.includes(',')) return true;
            return false;
        };
        const isSurcharge = (t: string) => {
            // Stars or Plus
            return t.includes('*') || t.includes('+');
        };

        // 1. PASS 1: Identify Dims & Separate Stream
        const stream: string[] = [];

        for (const token of allTokens) {
            const match = token.match(dimensionPattern);
            if (match) {
                pendingRows.push({
                    width: match[1],
                    projection: match[2],
                    suffix: match[3] || '',
                    prices: [],
                    data: []
                });
            } else {
                stream.push(token);
            }
        }

        // 2. PASS 2: Consume Stream (Prices & Data)
        // We assume stream order matches row order (FIFO)
        // Data pattern: [Price1, Price2..., Data1, Data2...] OR [Price1, Data1, Price2, Data2]

        // We need to identify "Blocks" in the stream.
        // Price is a block. Data (Triplet) is a block.
        // Triplet: 3 numbers [Fields, Posts, Area]. 
        // - Fields (3-30), Posts (2-10), Area (Float)
        // - "4 2 6" -> 4, 2, 6.

        let i = 0;
        while (i < stream.length) {
            const t = stream[i];

            // Check for Triplet (3 tokens)
            let foundTriplet = false;
            if (i + 2 < stream.length) {
                const t1 = stream[i];
                const t2 = stream[i + 1];
                const t3 = stream[i + 2];

                const v1 = parseFloat(t1.replace(',', '.'));
                const v2 = parseFloat(t2.replace(',', '.'));
                const v3 = parseFloat(t3.replace(',', '.'));

                // Fields: 2-50 (int), Posts: 2-20 (int), Area: >0 (float)
                // Posts usually smaller than Fields? No, usually 2 posts vs 4 fields.
                // Area depends on size.

                const isInt = (n: number) => Math.abs(n - Math.round(n)) < 0.01;

                // Loose constraints to catch "4 2 6"
                if (v1 <= 50 && isInt(v1) && v2 <= 20 && isInt(v2) && v3 > 0) {
                    // Found Triplet!
                    // Assign to CURRENT DataCursor
                    if (dataCursor < pendingRows.length) {
                        // SPECIAL RULE: "4 2 6" applies to which row?
                        // If we have 5 pending rows and 1 triplet, maybe it applies to ALL?
                        // Or just the one at dataCursor?
                        // User example: 1 triplet at the very end of a block of 5 dims.
                        // BUT user example "4 2 6" was relatively small area (6m2).
                        // The last dim was 3000x5000 (15m2). 
                        // So "4 2 6" likely matches 3000x2000 (6m2).
                        // Conclusion: This triplet belongs to the "matching" row, usually the first in the block?
                        // Let's stick to FIFO. If "4 2 6" is found, assign to dataCursor.

                        const targetRow = pendingRows[dataCursor];
                        targetRow.data = [t1, t2, t3];

                        // If this triplet repeats (User says "to dodałeś... coś jest nie tak", implying bad distribution)
                        // Maybe we should replicate strict stream behavior.
                        // If FIFO: we assign to Row 0. Row 1..4 get nothing.
                        // This is safer than random guessing.

                        dataCursor++;
                        i += 3;
                        foundTriplet = true;
                        continue;
                    }
                }
            }

            if (!foundTriplet) {
                // It's likely a Price or Surcharge
                if (priceCursor < pendingRows.length) {
                    const targetRow = pendingRows[priceCursor];

                    // If row already has 2 prices, maybe move to next? 
                    // Limit to e.g. 5 prices (Struct, Glass, Surcharges...)
                    // But if we encounter a "break" (like next token is huge jump), maybe next row?
                    // Let's blindly accumulate prices until we hit a Triplet or run out?
                    // NO. In "Columnar" paste: P1, P2, P3... correspond to R1, R2, R3...
                    // One price per row? Or Two?
                    // user ex: "2.439,47 € 2.709,23 €". Two prices.
                    // But just 2 dims before.
                    // So P1 -> D1. P2 -> D2.
                    // This implies 1 Price per Row in that block.
                    // What if there are 2 prices per row? (Struct + Glass)?
                    // Then we'd see P1a P1b P2a P2b.
                    // User ex has P1 P2. Dims D1 D2.
                    // Perfect match 1:1.

                    // STRATEGY: One "Major Price" per row advances the cursor?
                    // "2.439,47" is major.
                    // "441,60" is ...? Surcharge? Or Price for another item?
                    // "3000x3500*" -> 441,60. (Maybe just Surcharge?)
                    // "3000x4000**" -> 110,40.

                    // If it's a Surcharge (small), append to current cursor.
                    // If it's a Major Price (large), assign to current cursor, then Advance?
                    // Or if current cursor HAS Major Price, then Advance?
                    // YES. If targetRow already has "Main Price" and we see another "Main Price", Advance!

                    const val = parseFloat(t.replace(/\./g, '').replace(',', '.'));
                    // Threshold for "Main Price" vs Surcharge?
                    // Maybe > 600? Or relative?
                    // Let's assume > 1000 is Main Price? No, cheap items exist.
                    // Let's assume if we already have a "Big Number" (>500), and we see another "Big Number", it belongs to next row.

                    const hasMainPrice = targetRow.prices.some(p => parseFloat(p.replace(/\./g, '').replace(',', '.')) > 500);

                    if (hasMainPrice && val > 500) {
                        // Move to next row
                        priceCursor++;
                        if (priceCursor < pendingRows.length) {
                            pendingRows[priceCursor].prices.push(t);
                        }
                    } else {
                        // Append to current (as 2nd price or surcharge)
                        targetRow.prices.push(t);
                    }
                }
                i++;
            }
        }

        // Convert PendingRows to Result Rows
        if (pendingRows.length > 0) {
            rows = pendingRows.map(pr => {
                // Prices: Struct, Glass, Total...
                // We just dump them in columns.
                // Data: [Fields, Posts, Area]

                // Padding for alignment handled by existing logic?
                // We need to return rectangular data.
                // [Width, Proj, Suffix, Price1, Price2..., Data1, Data2, Data3]

                return [
                    pr.width,
                    pr.projection,
                    pr.suffix,
                    ...pr.prices,
                    ...pr.data
                ];
            });
            toast.success(`Zkolejkowano ${rows.length} wierszy (Tryb Strumieniowy).`);
        }

        // FALLBACK LOGIC (Restored for non-standard formats)
        const lineCount = rawText.split('\n').filter(l => l.trim().length > 0).length;
        if (rows.length === 0 || (rows.length < lineCount * 0.5 && lineCount > 5)) {
            const fallbackHeaderRow: string[] = [];

            // Legacy Line Logic
            const lines = rawText.split(/\n+/).filter(l => l.trim());
            // Check for headers
            if (lines.length > 0) {
                const firstLine = lines[0];
                const keywords = ['preis', 'price', 'breite', 'tiefe', 'ausfall', 'felder', 'pfosten', 'm2', 'oberfläche', 'surcharge', 'width', 'projection', 'fields', 'posts', 'area', 'structure', 'glass', 'netto', 'brutto', 'aufpreis', 'extra'];
                if (keywords.some(k => firstLine.toLowerCase().includes(k)) && !firstLine.match(/^[\d.,\s]+$/)) {
                    const hasTabs = firstLine.includes('\t');
                    const delimiter = hasTabs ? '\t' : / {2,}|;/;
                    const cols = firstLine.split(delimiter).map(c => c.trim()).filter(c => c !== '');
                    fallbackHeaderRow.push(...cols);
                    if (headerRow.length === 0) headerRow.push(...cols);
                }
            }

            const lineRows = lines.map(line => {
                const hasTabs = line.includes('\t');
                const isDataLike = /^[\d\s.,€EURzłPLN+%*()-]+$/i.test(line);

                let delimiter: string | RegExp;
                if (hasTabs) {
                    delimiter = '\t';
                } else if (isDataLike) {
                    delimiter = /[\s\t]+|;/;
                } else {
                    delimiter = / {2,}|;/;
                }

                return line.split(delimiter)
                    .map(c => c.trim())
                    .filter(c => c !== '' && !['€', 'EUR', 'PLN', 'zł'].includes(c));
            });

            if (fallbackHeaderRow.length > 0 && lineRows.length > 0 && lineRows[0].join('') === fallbackHeaderRow.join('')) {
                lineRows.shift();
            }

            if (lineRows.length > rows.length) {
                rows = lineRows;
                toast('Użyto standardowego trybu wierszowego (Fallback).', { icon: '🔄' });
            }
        }


        if (rows.length === 0) {
            toast.error('Nie udało się odczytać żadnych danych.');
            return;
        }

        const maxCols = Math.max(...rows.map(r => r.length));

        if (append) {
            // APPEND MODE
            const existingMaxCols = parsedRows.length > 0 ? Math.max(...parsedRows.map(r => r.length)) : 0;

            // CHECK FOR COLUMN MISMATCH
            if (maxCols !== existingMaxCols) {
                toast('Uwaga: Nowe dane mają inną liczbę kolumn niż istniejąca tabela!', { icon: '⚠️' });
            }

            // If new data has more columns than existing, we need to extend config
            if (maxCols > existingMaxCols) {
                const newColsCount = maxCols - existingMaxCols;
                const extension = Array(newColsCount).fill(null).map(() => ({ type: 'ignore' as ColumnType }));
                setColumnConfigs(prev => [...prev, ...extension]);
                toast('Rozszerzono liczbę kolumn dla nowych danych.', { icon: '↔️' });
            }

            setParsedRows(prev => [...prev, ...rows]);
            toast.success(`Dopisano ${rows.length} wierszy! Łącznie: ${parsedRows.length + rows.length}`);
        } else {
            // REPLACE MODE
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
                setColumnConfigs(initialConfigs);
            }

            if (!append) { // Only force step change if not appending (start fresh)
                setStep(2);
            }

            // Auto-detect template?
            // If 10 cols -> Glass? If 8 cols -> Poly?
            if (maxCols === 10) {
                // Defer to user or auto-apply? Let's just notify or define separate button.
                // Let's not auto-override without user asking, but specific button is fast.
            }
            toast.success(`Wykryto ${rows.length} wierszy. Maks. kolumn: ${maxCols}`);
        }
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

                // SANITIZATION HELPERS
                const toNum = (v: any) => {
                    if (typeof v === 'number' && !isNaN(v)) return v;
                    if (typeof v === 'string') {
                        // Handle "1.200,50" -> 1200.50
                        let clean = v.replace(/\s/g, '').replace('€', '').replace('zł', '').replace('PLN', '');
                        // Check format: 1.200,00 vs 1,200.00
                        if (clean.includes(',') && clean.includes('.')) {
                            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                                // 1.200,50
                                clean = clean.replace(/\./g, '').replace(',', '.');
                            } else {
                                // 1,200.50
                                clean = clean.replace(/,/g, '');
                            }
                        } else if (clean.includes(',')) {
                            // 1200,50 -> 1200.50
                            clean = clean.replace(',', '.');
                        }
                        const p = parseFloat(clean);
                        return isNaN(p) ? 0 : p;
                    }
                    return 0;
                };

                // Apply Strict Numbers
                if (hasValidData) {
                    entry.width_mm = toNum(entry.width_mm);
                    entry.projection_mm = toNum(entry.projection_mm);
                    entry.price = toNum(entry.price);
                    entry.structure_price = toNum(entry.structure_price);
                    entry.glass_price = toNum(entry.glass_price);

                    if (entry.properties?.area_m2) entry.properties.area_m2 = toNum(entry.properties.area_m2);

                    // Logic to ensure price fields
                    if (!entry.price || entry.price === 0) entry.price = (entry.structure_price || 0) + (entry.glass_price || 0);
                    if (!entry.structure_price || entry.structure_price === 0) entry.structure_price = entry.price;

                    // STRICT VALIDATION
                    // Must have Width AND (Price OR StructurePrice)
                    // If Width is 0 but it's a Named Item (Component), it might be valid?
                    // Let's assume Valid Price is Key.
                    if (entry.price > 0 || entry.structure_price > 0) {
                        resultData.push(entry);
                    }
                }
            }

            if (resultData.length === 0) {
                toast.error('Błąd: Żaden wiersz nie zawiera poprawnej ceny i wymiarów.');
                return;
            }

            const skipped = parsedRows.length - resultData.length;
            if (skipped > 0) {
                toast(`Pominięto ${skipped} nieprawidłowych/pustych wierszy.`, { icon: '🧹' });
            }

            // --- PRICE CONSISTENCY CHECK --- //
            const prices = resultData.map(r => r.price).sort((a, b) => a - b);
            if (prices.length > 3) {
                // 1. Calculate Median
                const mid = Math.floor(prices.length / 2);
                const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

                // 2. Identify Suspiciously Low Prices (e.g. < 10% of Median)
                // This catches scenarios where "Posts" (5) was mapped to "Price".
                const threshold = median * 0.1;
                const outliers = resultData.filter(r => r.price < threshold);

                if (outliers.length > 0) {
                    const confirmSave = window.confirm(
                        `⚠️ UWAGA: Wykryto ${outliers.length} wierszy z bardzo niską ceną (poniżej ${(threshold).toFixed(2)}).\n\n` +
                        `Przykłady: ${outliers.slice(0, 3).map(r => r.price).join(', ')}...\n\n` +
                        `Czy na pewno chcesz zapisać? (Może to być błąd mapowania kolumn)`
                    );
                    if (!confirmSave) return;
                }

                // 3. Monotonic Check (Optional but useful)
                // If sorted by width/projection, price should roughly correlate.
                // Simple heuristic: Count how many times price DROPS by > 50% vs previous row
                // This implies "interleaved data" or "misalignment".
                let drops = 0;
                for (let i = 1; i < resultData.length; i++) {
                    if (resultData[i].price < resultData[i - 1].price * 0.5) {
                        drops++;
                    }
                }
                if (drops > resultData.length * 0.2) { // more than 20% significant drops
                    const confirmChaotic = window.confirm(
                        `⚠️ UWAGA: Ceny w liście wydają się chaotyczne (nagłe spadki). \n` +
                        `Upewnij się, że kolumny są poprawnie przypisane.\n\nCzy zapisać mimo to?`
                    );
                    if (!confirmChaotic) return;
                }
            }
            // ------------------------------- //

            // Pass detected attributes
            onSave(resultData, {
                snow_zone: snowZone,
                mounting_type: mountingType,
                provider: manufacturer,
                product_code: productHint,
                table_type: tableType,
                product_id: selectedProductId // Pass selected product
            });
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
                            <div className="flex justify-between pt-2 items-center">
                                <div className="text-sm text-slate-500">
                                    {parsedRows.length > 0 && <span>W pamięci: <strong>{parsedRows.length}</strong> wierszy.</span>}
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                                            <input
                                                type="radio"
                                                name="parseMode"
                                                checked={parseMode === 'auto'}
                                                onChange={() => setParseMode('auto')}
                                            />
                                            Auto (Wykryj)
                                        </label>
                                        <label className="flex items-center gap-1 text-xs cursor-pointer" title="Wymusza podział wg tabulatorów. Zachowuje puste kolumny.">
                                            <input
                                                type="radio"
                                                name="parseMode"
                                                checked={parseMode === 'excel'}
                                                onChange={() => setParseMode('excel')}
                                            />
                                            Excel (Tabulatory)
                                        </label>
                                        <label className="flex items-center gap-1 text-xs cursor-pointer" title="Inteligentne wykrywanie 3000x2000. Dobre dla PDF.">
                                            <input
                                                type="radio"
                                                name="parseMode"
                                                checked={parseMode === 'text'}
                                                onChange={() => setParseMode('text')}
                                            />
                                            PDF/Tekst (Smart)
                                        </label>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {parsedRows.length > 0 && (
                                        <button
                                            onClick={() => parseText(true)}
                                            disabled={!rawText.trim()}
                                            className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 disabled:opacity-50"
                                            title="Dodaj te dane do istniejącej tabeli (nie usuwaj poprzednich)"
                                        >
                                            + Analizuj i Dopisz
                                        </button>
                                    )}
                                    <button
                                        onClick={() => parseText(false)}
                                        disabled={!rawText.trim()}
                                        className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50"
                                    >
                                        {parsedRows.length > 0 ? 'Zastąp Wszystko' : 'Dalej → Analizuj Kolumny'}
                                    </button>
                                    {parsedRows.length > 0 && (
                                        <button
                                            onClick={() => setStep(2)}
                                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                        >
                                            Przejdź do edycji →
                                        </button>
                                    )}
                                </div>
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

                                        {/* Product Selection Group */}
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 block mb-1">Model (Opcjonalnie):</span>
                                            <select
                                                value={selectedProductId}
                                                onChange={(e) => setSelectedProductId(e.target.value)}
                                                className="p-1.5 text-sm border rounded bg-white w-[180px]"
                                            >
                                                <option value="">-- Wybierz lub Auto --</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
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
