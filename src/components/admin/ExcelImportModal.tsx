import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertTriangle, ArrowRight, Scissors, Settings, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// --- Types ---

interface ExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void; // Callback to refresh data
}

type ImportPhase = 'upload' | 'preview' | 'mapping' | 'saving';

// Mapping Types
type ColumnType =
    | 'ignore'
    | 'width'
    | 'projection'
    | 'price'
    | 'price_option' // Column is a Price Variant (e.g. "Price Opal") -> Requires mapped Attribute Value
    | 'attribute_glass' // Shorthand for known attribute
    | 'attribute_color'
    | 'attribute_other';

// NEW: Metadata for granular attribute mapping
type ColumnMetadata = {
    attributes: Record<string, string>; // e.g. { subtype: 'opal', snow_zone: '1' }
};

interface ParsedSheet {
    name: string;
    rows: any[][]; // Raw data
    previewRows?: string[][]; // For display
    isActive: boolean;
    detectedProductId?: string; // If we can guess it
    // Creation State
    isCreatingNew: boolean;
    newProductName: string;
    newProductType: 'roof' | 'awning' | 'sliding_wall' | 'accessory' | 'other';

    // Matrix
    matrixData?: {
        type: 'matrix' | 'transposed';
        widthRowIndex: number;
        projColIndex: number;
        data: any[];
    };
    // Mapping
    columnMapping: ColumnType[];
    colMetadata: ColumnMetadata[]; // NEW: store key/value per column
    status: 'pending' | 'ready' | 'saved' | 'error';
}

const KNOWN_ATTRIBUTES = [
    { label: 'Wariant (Opal/Clear/Matt)', key: 'subtype', values: ['opal', 'clear', 'matt', 'standard'] }, // Critical: Calculator uses 'subtype'
    { label: 'Strefa Śniegowa', key: 'snow_zone', values: ['1', '2', '3', '35'] },
    { label: 'Kolor', key: 'color', values: ['standard', 'non_standard'] },
    { label: 'System', key: 'system', values: [] },
];

export function ExcelImportModal({ isOpen, onClose, onSave }: ExcelImportModalProps) {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sheets, setSheets] = useState<ParsedSheet[]>([]);
    const [activeSheetIdx, setActiveSheetIdx] = useState<number | null>(null);
    const [products, setProducts] = useState<{ id: string, name: string }[]>([]);
    const [dragActive, setDragActive] = useState(false);

    // Simplified Import Context (Global Attributes)
    const [globalAttributes, setGlobalAttributes] = useState({
        snow_zone: '2', // Default to most common
        subtype: 'opal', // Default to most common
        roof_type: '16mm' // Default
    });

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        } else {
            // Reset
            setFile(null);
            setSheets([]);
            setActiveSheetIdx(null);
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        const { data } = await supabase.from('product_definitions').select('id, name').order('name');
        if (data) setProducts(data);
    };

    // --- File Handling ---

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (uploadedFile: File) => {
        setIsProcessing(true);
        setFile(uploadedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const parsedSheets: ParsedSheet[] = workbook.SheetNames.map(name => {
                    const ws = workbook.Sheets[name];
                    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                    const preview = rows.slice(0, 20).map(r => r.map((c: any) => String(c ?? '')));

                    // Basic Init
                    const initialMapping: ColumnType[] = new Array(rows[0]?.length || 0).fill('ignore');
                    const initialMetadata: ColumnMetadata[] = Array.from({ length: rows[0]?.length || 0 }, () => ({ attributes: {} }));

                    // AI Detection
                    const { mapping, metadata } = detectColumnMapping(rows, name);

                    return {
                        name,
                        rows,
                        previewRows: preview,
                        isActive: true,
                        isCreatingNew: false, // Default to select
                        newProductName: name,
                        newProductType: 'roof',
                        columnMapping: mapping.length ? mapping : initialMapping,
                        colMetadata: metadata,
                        status: 'pending'
                    };
                });

                setSheets(parsedSheets.filter(s => s.rows.length > 0));
                if (parsedSheets.length > 0) setActiveSheetIdx(0);

            } catch (err: any) {
                console.error("Excel Processing Error:", err);
                toast.error(`Błąd odczytu: ${err.message || 'Nieznany błąd'}`);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(uploadedFile);
    };

    // --- AI / Smart Detection ---
    const detectColumnMapping = (rows: any[][], sheetName: string): { mapping: ColumnType[], metadata: ColumnMetadata[] } => {
        if (!rows || rows.length < 2) return { mapping: [], metadata: [] };

        // Fix for Sparse Arrays (Empty Header Cells) which cause findIndex to see 'undefined'
        const rawHeader = rows[0] || [];
        const headerRow = Array.from(rawHeader).map(cell => String(cell || '').toLowerCase());
        const dataSample = rows.slice(1, 6); // Look at first few data rows
        const mapping: ColumnType[] = new Array(headerRow.length).fill('ignore');
        const metadata: ColumnMetadata[] = Array.from({ length: headerRow.length }, () => ({ attributes: {} }));

        // 1. Keyword Config
        const widthKeywords = ['szer', 'width', 'breite', 'b (mm)'];
        const projKeywords = ['wys', 'głęb', 'projection', 'ausfall', 'tiefe', 't (mm)'];
        const priceKeywords = ['cena', 'price', 'preis', 'netto'];
        const attrKeywords = ['szkło', 'glass', 'glas', 'kolor', 'color', 'farbe'];

        const glassKeywords = ['topaz', 'opal', 'klar', 'matt', 'vsG'];
        const snowKeywords = ['sk', 'load', 'zone', 'strefa'];
        const roofKeywords = ['dach', 'roof', 'type'];

        headerRow.forEach((h, idx) => {
            // Check Explicit Variants (Price Option)
            // e.g. "Cena Opal" or "Cena Dach 1"
            const isPrice = priceKeywords.some(k => h.includes(k)) || h.includes('eur') || h.includes('pln');

            if (isPrice) {
                // Heuristic: Extract Attributes from Header
                const attributes: Record<string, string> = {};

                // 1. Glass Type (Subtype)
                const glassMatch = glassKeywords.find(k => h.includes(k.toLowerCase()));
                if (glassMatch) attributes['subtype'] = glassMatch;

                // 2. Snow Zone
                // e.g. "Strefa 1" or "SK0.85"
                if (h.includes('strefa') || h.includes('sk')) {
                    const zoneMatch = h.match(/(?:strefa|sk)\s?([\d\.]+)/);
                    if (zoneMatch) attributes['snow_zone'] = zoneMatch[1];
                    else if (h.includes('1')) attributes['snow_zone'] = '1';
                    else if (h.includes('2')) attributes['snow_zone'] = '2';
                    else if (h.includes('3')) attributes['snow_zone'] = '3';
                }

                // 3. Roof Type (e.g. Type 16mm)
                // Often indicated just by text like "16mm" or "8mm"
                if (h.includes('16mm') || h.includes('16 mm')) attributes['roof_type'] = '16mm';
                if (h.includes('8mm') || h.includes('8 mm')) attributes['roof_type'] = '8mm';
                if (h.includes('vsG') || h.includes('vsg')) attributes['roof_type'] = 'vsg';

                // Decision
                if (Object.keys(attributes).length > 0) {
                    mapping[idx] = 'price_option';
                    metadata[idx] = { attributes };
                } else {
                    mapping[idx] = 'price';
                }
                return;
            }

            // Dimensions
            if (widthKeywords.some(k => h.includes(k))) { mapping[idx] = 'width'; return; }
            if (projKeywords.some(k => h.includes(k))) { mapping[idx] = 'projection'; return; }

            // Attributes (Standalone Columns)
            if (attrKeywords.some(k => h.includes(k))) {
                mapping[idx] = 'attribute_other';
                // Try guess key for List Mode
                if (h.includes('szkło') || h.includes('glass') || h.includes('poly') || h.includes('wariant')) {
                    metadata[idx].attributes = { subtype: '' }; // Tag it but no value (value comes from cell)
                }
                if (h.includes('color') || h.includes('kolor')) metadata[idx].attributes = { color: '' };
                if (h.includes('snow') || h.includes('strefa') || h.includes('zone')) metadata[idx].attributes = { snow_zone: '' };
                return;
            }
        });

        // 2. Auto-Split Detection (Combined Dimensions)
        // Look for column with "3000x2500" or simple "Maß" header
        const combinedDimIdx = headerRow.findIndex(h => h.includes('wymiar') || h.includes('maß') || h.includes('dimension'));
        if (combinedDimIdx !== -1 && mapping[combinedDimIdx] === 'ignore') {
            const sampleCell = String(dataSample[0]?.[combinedDimIdx] || '');
            if (sampleCell.match(/\d+\s*[xX]\s*\d+/) || sampleCell.includes('/')) {
                // Could auto-split here or suggest it.
            }
        }

        return { mapping, metadata };
    };


    // --- Actions ---

    const autoSplitDimensions = (sheetIdx: number) => {
        const sheet = sheets[sheetIdx];
        if (!sheet) return;

        // Auto-detect column to split
        // Look for "x" pattern in first data row
        const row1 = sheet.rows[1];
        if (!row1) return;

        const targetColIdx = row1.findIndex(val => {
            const str = String(val);
            return (str.includes('x') || str.includes('X') || str.includes('/')) && /\d/.test(str);
        });

        if (targetColIdx !== -1) {
            splitColumn(sheetIdx, targetColIdx);
        } else {
            toast.error("Nie znaleziono kolumny z wymiarami (np. 300x200)");
        }
    };

    const splitColumn = (sheetIdx: number, colIdx: number) => {
        const newSheets = [...sheets];
        const sheet = newSheets[sheetIdx];

        // Process rows: Parsing "3000 x 2500" or "3000/2500"
        const newRows = sheet.rows.map(row => {
            const val = String(row[colIdx] || '');
            let left = '', right = '';

            if (val.toLowerCase().includes('x')) {
                const parts = val.toLowerCase().split('x');
                left = parts[0].trim();
                right = parts[1].trim();
            } else if (val.includes('/')) {
                const parts = val.split('/');
                left = parts[0].trim();
                right = parts[1].trim();
            } else {
                left = val; // Fallback
            }

            // Insert Left, Insert Right, REMOVE Original
            const newRow = [...row];
            newRow.splice(colIdx, 1, left, right); // Replace 1 item with 2 items
            return newRow;
        });

        // Update Mapping: Remove 1, Add 2
        const newMapping = [...sheet.columnMapping];
        newMapping.splice(colIdx, 1, 'width', 'projection'); // Replace 'ignore' with 'width', 'projection'

        // Update Metadata
        const newMetadata = [...sheet.colMetadata];
        newMetadata.splice(colIdx, 1, { attributes: {} }, { attributes: {} }); // Reset metadata for new cols

        sheet.rows = newRows;
        sheet.columnMapping = newMapping;
        sheet.colMetadata = newMetadata;
        // Re-generate preview
        sheet.previewRows = newRows.slice(0, 20).map(r => r.map(c => String(c ?? '')));

        setSheets(newSheets);
        toast.success(`Rozdzielono i usunięto starą kolumnę ${colIdx + 1}.`);
    };

    const deleteColumn = (sheetIdx: number, colIdx: number) => {
        const newSheets = [...sheets];
        const sheet = newSheets[sheetIdx];

        const newRows = sheet.rows.map(row => {
            const newRow = [...row];
            newRow.splice(colIdx, 1);
            return newRow;
        });

        const newMapping = [...sheet.columnMapping];
        newMapping.splice(colIdx, 1);

        const newMetadata = [...sheet.colMetadata];
        newMetadata.splice(colIdx, 1);

        sheet.rows = newRows;
        sheet.columnMapping = newMapping;
        sheet.colMetadata = newMetadata;
        sheet.previewRows = newRows.slice(0, 20).map(r => r.map(c => String(c ?? '')));

        setSheets(newSheets);
        toast.success(`Usunięto kolumnę ${colIdx + 1}`);
    };

    const updateColumnMapping = (sheetIdx: number, colIdx: number, type: ColumnType) => {
        const newSheets = [...sheets];
        newSheets[sheetIdx].columnMapping[colIdx] = type;
        setSheets(newSheets);
    };

    const updateColumnMetadata = (sheetIdx: number, colIdx: number, key: string, value: string) => {
        const newSheets = [...sheets];
        const currentMeta = newSheets[sheetIdx].colMetadata[colIdx] || { attributes: {} };

        const newAttributes = { ...currentMeta.attributes };
        if (value) {
            newAttributes[key] = value;
        } else {
            delete newAttributes[key]; // Remove if empty
        }

        newSheets[sheetIdx].colMetadata[colIdx] = {
            attributes: newAttributes
        };
        setSheets(newSheets);
    };


    const handleSaveSheet = async (idx: number) => {
        const sheet = sheets[idx];
        const hasListMapping = sheet.columnMapping.includes('width')
            && sheet.columnMapping.includes('projection')
            && (sheet.columnMapping.includes('price') || sheet.columnMapping.includes('price_option'));

        if (!hasListMapping) {
            toast.error("Brak wymiarów (width/projection) lub ceny.");
            return;
        }

        let targetProductId = sheet.detectedProductId;

        try {
            // 1. Create Product if needed
            if (sheet.isCreatingNew) {
                const { data: newProd, error } = await supabase.from('product_definitions').insert({
                    name: sheet.newProductName,
                    type: sheet.newProductType,
                    system_name: sheet.newProductName.toLowerCase().replace(/\s+/g, '_'),
                    is_active: true
                }).select().single();
                if (error) throw error;
                targetProductId = newProd.id;
                await fetchProducts(); // refresh
                toast.success(`Utworzono produkt ${sheet.newProductName}`);
            }

            if (!targetProductId) throw new Error("Nie wybrano produktu docelowego.");

            // Helper to clean values (e.g. "Strefa 1" -> "1")
            const normalizeAttrValue = (key: string, val: string) => {
                if (!val) return val;
                if (key === 'snow_zone') {
                    const match = val.match(/[\d\.]+/);
                    return match ? match[0] : val;
                }
                return val.trim();
            };

            // 2. Identify Columns
            const priceOptionCols = sheet.columnMapping
                .map((t, idx) => ({ type: t, idx }))
                .filter(x => x.type === 'price_option');

            const isColumnarMode = priceOptionCols.length > 0;
            const productName = sheet.isCreatingNew ? sheet.newProductName : products.find(p => p.id === targetProductId)?.name;

            // --- COLUMNAR MODE (Variants in Columns) ---
            if (isColumnarMode) {
                let totalInserted = 0;
                let tablesCreated = 0;
                const headerRow = sheet.rows[0];

                for (const col of priceOptionCols) {
                    const headerName = String(headerRow[col.idx] || `Wariant ${col.idx}`);
                    const meta = sheet.colMetadata[col.idx];

                    // Metadata Attributes took precedence
                    const colAttributes = meta?.attributes || {};
                    // context: User Global Attributes (base) + Column Attributes (override)
                    const attributes = { ...globalAttributes, ...colAttributes };

                    // Name construction
                    const variantParts = Object.values(attributes).filter(v => !!v).join(' ');
                    const finalVariantName = variantParts || headerName;
                    const tableName = `${productName} - ${finalVariantName}`;

                    // Create Table
                    const { data: tableData, error: tableError } = await supabase
                        .from('price_tables')
                        .insert({
                            product_id: targetProductId,
                            name: tableName,
                            type: 'simple',
                            is_active: true,
                            attributes: attributes // Store exact map { subtype: 'opal', snow_zone: '1', roof_type: '16mm' }
                        })
                        .select().single();

                    if (tableError) {
                        console.error("Table Error", tableError);
                        toast.error(`Błąd tabeli: ${tableName}`);
                        continue;
                    }

                    // Collect Prices
                    const pricesPayload = [];
                    for (let r = 1; r < sheet.rows.length; r++) {
                        const row = sheet.rows[r];
                        let width = 0, projection = 0;

                        sheet.columnMapping.forEach((type, idx) => {
                            if (type === 'width') width = parseFloat(String(row[idx])?.replace(',', '.') || '0');
                            if (type === 'projection') projection = parseFloat(String(row[idx])?.replace(',', '.') || '0');
                        });

                        const price = parseFloat(String(row[col.idx])?.replace(',', '.') || '0');

                        if (width && projection && price) {
                            pricesPayload.push({
                                price_table_id: tableData.id,
                                width, projection, price,
                                price_type: 'base'
                            });
                        }
                    }

                    // Bulk Insert
                    if (pricesPayload.length > 0) {
                        const chunkSize = 100;
                        for (let i = 0; i < pricesPayload.length; i += chunkSize) {
                            const chunk = pricesPayload.slice(i, i + chunkSize);
                            await supabase.from('prices').insert(chunk);
                        }
                        totalInserted += pricesPayload.length;
                    }
                }
                toast.success(`Zapisano ${totalInserted} cen (Kolumnowy + Atrybuty).`);

            } else {
                // --- LIST MODE (Single Price + Attributes per Row) ---
                const attrIndices = sheet.columnMapping
                    .map((t, idx) => (t.startsWith('attribute_') ? idx : -1))
                    .filter(idx => idx !== -1);

                const rowsByGroup: Record<string, { rows: any[], attrs: any }> = {};

                // Group Rows by Attribute Signature
                for (let r = 1; r < sheet.rows.length; r++) {
                    const row = sheet.rows[r];
                    let width = 0, projection = 0, price = 0;

                    sheet.columnMapping.forEach((type, idx) => {
                        if (type === 'width') width = parseFloat(String(row[idx])?.replace(',', '.') || '0');
                        if (type === 'projection') projection = parseFloat(String(row[idx])?.replace(',', '.') || '0');
                        if (type === 'price') price = parseFloat(String(row[idx])?.replace(',', '.') || '0');
                    });

                    if (!width || !projection || !price) continue;

                    // Build Attributes
                    const rowAttrs: any = {};
                    const keyParts: string[] = [];

                    attrIndices.forEach(idx => {
                        const cellVal = String(row[idx] || '').trim();
                        if (!cellVal) return;

                        // In List Mode, we need to know WHICH attribute key this column represents.
                        // We use the first key found in metadata.attributes (e.g. { subtype: 'opal' } -> key is subtype)
                        // This allows users to tag the column as "Subtype" even if values vary per row.

                        const meta = sheet.colMetadata[idx];
                        const knownKeys = Object.keys(meta?.attributes || {});
                        const attrKey = knownKeys[0] || `attr_${idx}`;

                        // We do NOT take the value from metadata (that was just for tagging), we take from CELL.
                        // Unless... the user Wants to override? 
                        // Standard List Mode: Column Header = Key, Cell = Value.
                        // But our metadata stores Key AND Value. 
                        // Let's assume: If user tagged it with [Subtype: Opal], they MEAN "Subtype" Key.

                        if (cellVal) {
                            const cleanVal = normalizeAttrValue(attrKey, cellVal);
                            rowAttrs[attrKey] = cleanVal;
                            keyParts.push(`${attrKey}:${cleanVal}`);
                        }
                    });

                    const groupKey = keyParts.sort().join('__') || 'Standard';

                    if (!rowsByGroup[groupKey]) {
                        rowsByGroup[groupKey] = { rows: [], attrs: rowAttrs };
                    }
                    rowsByGroup[groupKey].rows.push({ width, projection, price });
                }

                // Insert Groups
                let totalInserted = 0;
                for (const [key, group] of Object.entries(rowsByGroup)) {
                    const tableName = key === 'Standard' ? productName : `${productName} - ${key.replace(/__/g, ' ')}`;

                    // Merge Global Attributes
                    const finalAttributes = { ...globalAttributes, ...group.attrs };

                    const { data: tableData, error: tableError } = await supabase
                        .from('price_tables')
                        .insert({
                            product_id: targetProductId,
                            name: tableName,
                            type: 'simple',
                            is_active: true,
                            attributes: finalAttributes
                        }).select().single();

                    if (tableError) continue;

                    const pricesPayload = group.rows.map(item => ({
                        price_table_id: tableData.id,
                        width: item.width,
                        projection: item.projection,
                        price: item.price,
                        price_type: 'base'
                    }));

                    const chunkSize = 100;
                    for (let i = 0; i < pricesPayload.length; i += chunkSize) {
                        const chunk = pricesPayload.slice(i, i + chunkSize);
                        await supabase.from('prices').insert(chunk);
                    }
                    totalInserted += pricesPayload.length;
                }
                toast.success(`Zapisano ${totalInserted} cen (Lista).`);
            }

            // Finish
            const newSheets = [...sheets];
            newSheets[idx].status = 'saved';
            setSheets(newSheets);
            onSave();

        } catch (e: any) {
            console.error(e);
            toast.error(`Błąd: ${e.message}`);
        }
    };


    const activeSheet = activeSheetIdx !== null ? sheets[activeSheetIdx] : null;

    if (!isOpen) return null;

    // --- RENDER ---
    if (!isProcessing && !file) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-2xl p-8 shadow-2xl relative">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-full">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Import Masowy z Excela</h2>
                    <div className={`border-3 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        onClick={() => document.getElementById('excel-upload')?.click()}>
                        <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                        <h3 className="text-lg font-medium text-slate-700">Wgraj plik Excel</h3>
                        <input id="excel-upload" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] shadow-2xl flex overflow-hidden">
                {/* SIDEBAR */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-700">Arkusze</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {sheets.map((sheet, idx) => (
                            <button key={idx} onClick={() => setActiveSheetIdx(idx)}
                                className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${activeSheetIdx === idx ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                                <span className="truncate font-medium">{sheet.name}</span>
                                {sheet.status === 'saved' && <Check className="w-4 h-4 text-green-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {activeSheet ? (
                        <>
                            {/* Toolbar */}
                            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-slate-800">{activeSheet.name}</h2>
                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                        <button className={`px-3 py-1 text-sm rounded-md ${!activeSheet.isCreatingNew ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}
                                            onClick={() => {
                                                const ns = [...sheets];
                                                if (activeSheetIdx !== null) ns[activeSheetIdx].isCreatingNew = false;
                                                setSheets(ns);
                                            }}>Wybierz Produkt</button>
                                        <button className={`px-3 py-1 text-sm rounded-md ${activeSheet.isCreatingNew ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}
                                            onClick={() => {
                                                const ns = [...sheets];
                                                if (activeSheetIdx !== null) ns[activeSheetIdx].isCreatingNew = true;
                                                setSheets(ns);
                                            }}>Utwórz Nowy</button>
                                    </div>
                                    {!activeSheet.isCreatingNew && (
                                        <select className="border rounded-md px-2 py-1 text-sm max-w-[200px]"
                                            value={activeSheet.detectedProductId || ''}
                                            onChange={(e) => {
                                                const ns = [...sheets];
                                                if (activeSheetIdx !== null) ns[activeSheetIdx].detectedProductId = e.target.value;
                                                setSheets(ns);
                                            }}>
                                            <option value="">-- Wybierz Produkt --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    )}
                                    {activeSheet.isCreatingNew && (
                                        <input type="text" className="border rounded-md px-2 py-1 text-sm w-[200px]" placeholder="Nazwa Produktu"
                                            value={activeSheet.newProductName}
                                            onChange={(e) => {
                                                const ns = [...sheets];
                                                if (activeSheetIdx !== null) ns[activeSheetIdx].newProductName = e.target.value;
                                                setSheets(ns);
                                            }} />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => activeSheetIdx !== null && autoSplitDimensions(activeSheetIdx)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center gap-2">
                                        <Scissors className="w-4 h-4" /> Auto-Rozdziel
                                    </button>
                                    <button onClick={() => activeSheetIdx !== null && handleSaveSheet(activeSheetIdx)}
                                        disabled={activeSheet.status === 'saved'}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                                        {activeSheet.status === 'saved' ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                                        {activeSheet.status === 'saved' ? 'Zapisano' : 'Importuj Arkusz'}
                                    </button>
                                </div>
                            </div>

                            {/* PREVIEW GRID */}
                            <div className="flex-1 overflow-auto bg-slate-50 p-4">
                                <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="p-2 border-b bg-slate-50 w-12 text-center text-slate-400">#</th>
                                                {activeSheet.previewRows?.[0]?.map((_, colIdx) => (
                                                    <th key={colIdx} className="p-2 border-b bg-slate-50 min-w-[200px] align-top group">
                                                        <div className="flex flex-col gap-2">
                                                            {/* Type Selector */}
                                                            <div className="flex justify-between items-center gap-2">
                                                                <select
                                                                    className={`w-full text-xs p-1.5 rounded border font-medium ${activeSheet.columnMapping[colIdx] === 'ignore' ? 'text-slate-400 border-slate-200' : 'text-blue-700 border-blue-300 bg-blue-50'}`}
                                                                    value={activeSheet.columnMapping[colIdx]}
                                                                    onChange={(e) => activeSheetIdx !== null && updateColumnMapping(activeSheetIdx, colIdx, e.target.value as ColumnType)}
                                                                >
                                                                    <option value="ignore">Ignoruj</option>
                                                                    <option value="width">Szerokość</option>
                                                                    <option value="projection">Wysięg</option>
                                                                    <option value="price">Cena (Podst.)</option>
                                                                    <option value="price_option">Cena (Wariant)</option>
                                                                    <option value="attribute_glass">Atrybut: Szkło</option>
                                                                    <option value="attribute_color">Atrybut: Kolor</option>
                                                                    <option value="attribute_other">Atrybut: Inny</option>
                                                                </select>

                                                                {/* Toolbar Buttons */}
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => activeSheetIdx !== null && splitColumn(activeSheetIdx, colIdx)} title="Rozdziel" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600">
                                                                        <Scissors className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => activeSheetIdx !== null && deleteColumn(activeSheetIdx, colIdx)} title="Usuń" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Multi-Attribute Tag Editor */}
                                                            {(activeSheet.columnMapping[colIdx] === 'price_option' || activeSheet.columnMapping[colIdx].startsWith('attribute')) && (
                                                                <div className="mt-2 flex flex-col gap-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded">

                                                                    {/* Active Tags */}
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {Object.entries(activeSheet.colMetadata[colIdx]?.attributes || {}).map(([k, v]) => (
                                                                            <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-medium border border-indigo-200">
                                                                                <span className="opacity-70">{k}:</span> <span className="font-bold">{v}</span>
                                                                                <button onClick={() => activeSheetIdx !== null && updateColumnMetadata(activeSheetIdx, colIdx, k, '')}
                                                                                    className="hover:text-red-500 ml-0.5">
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                        {Object.keys(activeSheet.colMetadata[colIdx]?.attributes || {}).length === 0 && (
                                                                            <span className="text-[10px] text-indigo-400 italic">Brak atrybutów</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Quick Add Helper */}
                                                                    <div className="flex flex-col gap-1 border-t border-indigo-100/50 pt-2 mt-1">
                                                                        <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Dodaj Tag:</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {KNOWN_ATTRIBUTES.map(attr => (
                                                                                <div key={attr.key} className="group relative">
                                                                                    <button className="text-[9px] px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors font-medium">
                                                                                        + {attr.label.split(' ')[0]}
                                                                                    </button>
                                                                                    {/* Hover Dropdown for values */}
                                                                                    <div className="hidden group-hover:flex absolute left-0 bottom-full mb-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 flex-col min-w-[120px] overflow-hidden">
                                                                                        <div className="bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500 border-b">{attr.label}</div>
                                                                                        {attr.values.map(val => (
                                                                                            <button key={val}
                                                                                                onClick={() => activeSheetIdx !== null && updateColumnMetadata(activeSheetIdx, colIdx, attr.key, val)}
                                                                                                className="text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0">
                                                                                                {val}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSheet.previewRows?.map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-slate-50 border-b last:border-0 border-slate-100 group">
                                                    <td className="p-2 text-center text-xs text-slate-400 font-mono group-hover:bg-slate-100 transition-colors">{rIdx + 1}</td>
                                                    {row.map((cell, cIdx) => (
                                                        <td key={cIdx} className={`p-2 text-sm truncate max-w-[200px] border-l border-transparent group-hover:border-slate-100 ${activeSheet.columnMapping[cIdx] !== 'ignore' ? 'text-slate-800 font-medium' : 'text-slate-400 opacity-60'}`}>
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <FileSpreadsheet className="w-16 h-16 opacity-20" />
                            <p>Wybierz arkusz z listy po lewej, aby rozpocząć import.</p>
                        </div>
                    )}
                </div>
                {/* CLOSE BTN */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg z-50 hover:bg-slate-50 transition-transform hover:scale-105 active:scale-95">
                    <X className="w-5 h-5 text-slate-600" />
                </button>
            </div>
        </div>
    );
}
