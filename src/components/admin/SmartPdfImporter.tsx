import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker source logic
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SmartPdfImporterProps {
    onExtractSuccess: (queueItems: any[]) => void;
    onClose: () => void;
    products: any[];
}

export const SmartPdfImporter = ({ onExtractSuccess, onClose, products }: SmartPdfImporterProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale] = useState<number>(1.2);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [analyzedData, setAnalyzedData] = useState<any>(null);
    const [analyzedCrop, setAnalyzedCrop] = useState<PixelCrop | undefined>(undefined);
    const [analyzing, setAnalyzing] = useState(false);

    // Queue State
    const [queue, setQueue] = useState<any[]>([]);

    // Context State
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [roofType, setRoofType] = useState<'glass' | 'polycarbonate' | 'other'>('polycarbonate');
    const [snowZone, setSnowZone] = useState<string>('1'); // Added snowZone state
    const [variantName, setVariantName] = useState<string>('');

    const [provider, setProvider] = useState<string>('Inny'); // Added Provider State

    // Ref to the container that holds the Page to get the canvas
    const pageRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPageNumber(1);
            clearSelection(); // Clear selection when new file is loaded
        }
    };

    const getCroppedImg = async (pixelCrop: PixelCrop) => {
        const canvas = pageRef.current?.querySelector('canvas');
        if (!canvas) {
            console.error("No canvas found");
            return null;
        }

        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = pixelCrop.width;
        targetCanvas.height = pixelCrop.height;
        const ctx = targetCanvas.getContext('2d');

        if (!ctx) return null;

        const scaleX = canvas.width / canvas.clientWidth;
        const scaleY = canvas.height / canvas.clientHeight;

        ctx.drawImage(
            canvas,
            pixelCrop.x * scaleX,
            pixelCrop.y * scaleY,
            pixelCrop.width * scaleX,
            pixelCrop.height * scaleY,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise<Blob>((resolve, reject) => {
            targetCanvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleScanPage = async () => {
        if (!file || !selectedProductId) {
            toast.error("Wybierz plik i model zadaszenia!");
            return;
        }

        setAnalyzing(true);
        const toastId = toast.loading('Skanowanie całej strony i szukanie tabel...');

        try {
            // 1. Get Full Page Image
            const canvas = pageRef.current?.querySelector('canvas');
            if (!canvas) throw new Error("Canvas not ready");

            // Create full page crop equivalent
            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            });

            if (!blob) throw new Error("Failed to capture page");

            const formData = new FormData();
            formData.append('image', blob, 'full_page.jpg');
            formData.append('mode', 'scan_page'); // Hint to backend if supported

            const { data, error } = await supabase.functions.invoke('parse-price-pdf', {
                body: formData
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            // 2. Process Detected Tables
            const payload = data.data || data;
            const tables = payload.tables || [payload]; // Fallback if single object

            if (!tables || tables.length === 0) {
                throw new Error("Nie wykryto żadnych tabel na tej stronie.");
            }

            // 3. Auto-queue all valid tables
            let addedCount = 0;
            const newQueueItems: any[] = [];

            tables.forEach((tableData: any, idx: number) => {
                // Check if valid table data
                const rawEntries = tableData.entries || tableData.data;
                if (!rawEntries || rawEntries.length === 0) return;

                // Calculate dimensions
                const uniqueWidths = new Set(rawEntries.map((e: any) => e.width_mm || e.width));
                const uniqueProjections = new Set(rawEntries.map((e: any) => e.projection_mm || e.projection));

                // Normalize data for UI
                const normalizedData = {
                    ...tableData,
                    rows: uniqueProjections.size || tableData.rows,
                    cols: uniqueWidths.size || tableData.cols,
                    data: rawEntries
                };

                // Create Queue Item
                const productName = products.find(p => p.id === selectedProductId)?.name || 'Nieznany';

                // Use AI detected attributes OR global context
                const aiAttrs = tableData.detected_attributes || {};

                const config = {
                    roofType: aiAttrs.roof_type && ['glass', 'polycarbonate'].includes(aiAttrs.roof_type)
                        ? aiAttrs.roof_type
                        : roofType,
                    snowZone: aiAttrs.snow_zone ? String(aiAttrs.snow_zone) : snowZone,
                    subtype: aiAttrs.subtype || variantName || undefined
                };

                newQueueItems.push({
                    id: Date.now().toString() + '_' + idx,
                    matrixData: normalizedData,
                    productId: selectedProductId,
                    productName: productName,
                    variantConfig: config,
                    provider: provider, // Pass provider
                    sourceFile: file.name + ` (Strona ${pageNumber})`
                });
                addedCount++;
            });

            if (addedCount > 0) {
                setQueue(prev => [...prev, ...newQueueItems]);
                toast.success(`Znaleziono i dodano ${addedCount} tabel!`, { id: toastId });
                setAnalyzedData(payload); // Show debug info
            } else {
                toast.error("Znaleziono dane, ale nie udało się ich przetworzyć na tabele.", { id: toastId });
            }

        } catch (e: any) {
            console.error(e);
            toast.error('Błąd skanowania: ' + e.message, { id: toastId });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleAddToQueue = async () => {
        if (!completedCrop || !file) return;
        if (!selectedProductId) {
            toast.error("Wybierz model zadaszenia!");
            return;
        }

        let dataToUse = analyzedData;

        // Check if we need to analyze (new crop or first time)
        const isNewCrop = !analyzedCrop ||
            analyzedCrop.x !== completedCrop.x ||
            analyzedCrop.y !== completedCrop.y ||
            analyzedCrop.width !== completedCrop.width ||
            analyzedCrop.height !== completedCrop.height;

        if (isNewCrop) {
            setAnalyzing(true);
            const toastId = toast.loading('Analiza AI...');

            try {
                const blob = await getCroppedImg(completedCrop);
                if (!blob) throw new Error("Failed to create image from crop");

                const formData = new FormData();
                formData.append('image', blob, 'selection.jpg');

                const { data, error } = await supabase.functions.invoke('parse-price-pdf', {
                    body: formData
                });

                if (error) throw error;
                if (data.error) throw new Error(data.error);

                const payload = data.data || data;

                // EXTRACT TABLE DATA INTELLIGENTLY
                // The API returns { tables: [...] } but the frontend expects a single matrix object.
                let tableData = payload;

                // 1. Extract the specific table object
                if (payload.tables && Array.isArray(payload.tables) && payload.tables.length > 0) {
                    tableData = payload.tables[0];
                }

                // 2. Transform 'entries' to our internal standard
                // We need to ensure 'rows' and 'cols' are calculated for the UI preview.
                const entries = tableData.entries || tableData.data || [];
                if (entries.length > 0) {
                    // Calculate unique dimensions for UI 'rows x cols' preview
                    const uniqueWidths = new Set(entries.map((e: any) => e.width_mm || e.width));
                    const uniqueProjections = new Set(entries.map((e: any) => e.projection_mm || e.projection));

                    tableData.rows = uniqueProjections.size;
                    tableData.cols = uniqueWidths.size;
                    tableData.data = entries; // Ensure PricingPage finds it at .data
                }

                dataToUse = tableData; // Store the actual table data
                setAnalyzedData(payload); // Keep full payload for attribute detection
                setAnalyzedCrop(completedCrop);
                toast.dismiss(toastId);

                // Auto-detect config from AI attributes (Safe Wrap)
                try {
                    const attrs = payload?.detected_attributes || payload?.tables?.[0]?.detected_attributes;

                    if (attrs) {
                        // Roof Type
                        if (attrs.roof_type && ['glass', 'polycarbonate'].includes(attrs.roof_type)) {
                            setRoofType(attrs.roof_type as any);
                        }

                        // Snow Zone
                        if (attrs.snow_zone) {
                            setSnowZone(String(attrs.snow_zone));
                        }

                        // Variant / Subtype
                        if (attrs.subtype) {
                            setVariantName(attrs.subtype);
                        }
                    }
                } catch (autoDetectErr) {
                    console.warn("Auto-detect error:", autoDetectErr);
                    // Non-blocking
                }
            } catch (e: any) {
                console.error(e);
                let errorMessage = e.message;
                if (e && typeof e === 'object' && 'context' in e && e.context instanceof Response) {
                    try {
                        const errorBody = await e.context.json();
                        if (errorBody && errorBody.error) {
                            errorMessage = errorBody.error;
                        }
                    } catch (jsonError) {
                        console.warn('Failed to parse error response JSON', jsonError);
                    }
                }
                toast.error('Błąd analizy: ' + errorMessage, { id: toastId });
                setAnalyzing(false);
                return; // Stop if analysis failed
            } finally {
                setAnalyzing(false);
            }
        }

        // Add to Queue using dataToUse
        if (dataToUse) {
            const productName = products.find(p => p.id === selectedProductId)?.name || 'Nieznany';

            const queueItem = {
                id: Date.now().toString(),
                matrixData: dataToUse,
                productId: selectedProductId,
                productName: productName,
                variantConfig: {
                    roofType: roofType,
                    snowZone: snowZone,
                    subtype: variantName || undefined
                },
                provider: provider, // Add Provider
                sourceFile: file.name
            };

            setQueue([...queue, queueItem]);

            // UX: Put focus back on variant name or clear it? 
            // Clearing it suggests "Ready for next variant"
            setVariantName('');

            // We DO NOT clear crop here, allowing user to add another variant from same table
            toast.success(`Dodano: ${productName} (${roofType === 'glass' ? 'Szkło' : 'Poli'}, S${snowZone})`);
        }
    };

    // Helper to clear selection manually
    const clearSelection = () => {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setAnalyzedData(null);
        setAnalyzedCrop(undefined);
    };

    const handleRemoveFromQueue = (index: number) => {
        setQueue(queue.filter((_, i) => i !== index));
    };

    const handleSaveAll = () => {
        if (queue.length === 0) return;
        onExtractSuccess(queue);
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col h-full min-h-[600px]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Inteligentny Import PDF (Hurtowy)</h2>
                    <p className="text-sm text-slate-500">Wybierz model, typ dachu, zaznacz tabelę lub zeskanuj całą stronę.</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="p-2 border border-slate-200 rounded text-sm bg-white"
                    >
                        <option value="Inny">Dostawca: Inny / Własny</option>
                        <option value="Aluxe">Aluxe</option>
                        <option value="Deponti">Deponti</option>
                        <option value="TGA">TGA Metal</option>
                        <option value="Gardendreams">Gardendreams</option>
                    </select>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
                </div>
            </div>

            {!file ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-white m-4">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 text-2xl">
                            📄
                        </div>
                        <span className="text-lg font-medium text-slate-700">Wybierz plik PDF</span>
                        <span className="text-sm text-slate-400 mt-1">Maksymalnie 10MB</span>
                    </label>
                </div>
            ) : (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* TOP TOOLBAR: Pagination & File Controls */}
                    <div className="flex justify-between items-center mb-3 shrink-0">
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                            <button
                                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                                disabled={pageNumber <= 1}
                                className="w-9 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 font-bold"
                                title="Poprzednia strona"
                            >
                                ◀
                            </button>
                            <span className="px-3 text-sm font-medium text-slate-700 select-none">
                                Strona <span className="font-bold">{pageNumber}</span> z {numPages}
                            </span>
                            <button
                                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                                disabled={pageNumber >= numPages}
                                className="w-9 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 font-bold"
                                title="Następna strona"
                            >
                                ▶
                            </button>
                        </div>

                        <button
                            onClick={() => setFile(null)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-2 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-all"
                        >
                            ↶ Wybierz inny plik
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden gap-6 h-[70vh]">
                        {/* PDF Viewer */}
                        <div className="flex-[2] bg-slate-200 overflow-auto rounded-lg relative flex flex-col items-center p-4 border border-slate-300/50 shadow-inner">

                            <div ref={pageRef} className="relative shadow-lg">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    disabled={analyzing}
                                >
                                    <Document
                                        file={file}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        loading={<div className="p-10">Ładowanie PDF...</div>}
                                        error={<div className="p-10 text-red-500">Błąd ładowania PDF.</div>}
                                    >
                                        <Page
                                            pageNumber={pageNumber}
                                            scale={scale}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    </Document>
                                </ReactCrop>
                            </div>
                        </div>

                        {/* Controls & Queue */}
                        <div className="w-80 flex flex-col gap-4">
                            {/* 1. Context Selection */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-4">
                                <h3 className="font-bold text-slate-700 border-b pb-2">1. Konfiguracja</h3>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Model Zadaszenia</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={e => setSelectedProductId(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded text-sm"
                                    >
                                        <option value="">-- Wybierz Model --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.code ? `[${p.code}]` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Typ Dachu</label>
                                    <select
                                        value={roofType}
                                        onChange={e => setRoofType(e.target.value as any)}
                                        className="w-full p-2 border border-slate-200 rounded text-sm"
                                    >
                                        <option value="polycarbonate">Poliwęglan</option>
                                        <option value="glass">Szkło</option>
                                        <option value="other">Inne</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Strefa Śniegowa</label>
                                    <select
                                        value={snowZone}
                                        onChange={e => setSnowZone(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded text-sm"
                                    >
                                        <option value="1">Strefa 1 (Standard)</option>
                                        <option value="2">Strefa 2 (Wzmocniona)</option>
                                        <option value="3">Strefa 3 (Górska)</option>
                                        <option value="custom">Inna / Specjalna</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Wariant (Subtype)</label>
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            list="variant-suggestions"
                                            value={variantName}
                                            onChange={e => setVariantName(e.target.value)}
                                            placeholder={roofType === 'glass' ? 'np. mat' : 'np. ir-gold'}
                                            className="w-full p-2 border border-slate-200 rounded text-sm"
                                        />
                                        <datalist id="variant-suggestions">
                                            {roofType === 'glass' ? (
                                                <>
                                                    <option value="standard">Standard (Przeźroczyste)</option>
                                                    <option value="mat">Matowe (Opal/Milchglas)</option>
                                                    <option value="sunscreen">Sunscreen (Przyciemniane)</option>
                                                    <option value="heat-protection">Heat Protection</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="standard">Standard (Opal/Clear)</option>
                                                    <option value="ir-gold">IR Gold (Hitze Stop)</option>
                                                    <option value="iq-relax">IQ Relax</option>
                                                    <option value="clear">Clear (Przeźroczyste)</option>
                                                </>
                                            )}
                                        </datalist>
                                        <p className="text-[10px] text-slate-400">
                                            Użyj standardowych kodów (np. <code>ir-gold</code>)
                                        </p>
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                {/* ACTION BUTTONS */}
                                <div className="flex flex-col gap-2">
                                    {/* SCAN FULL PAGE BUTTON */}
                                    <button
                                        onClick={handleScanPage}
                                        disabled={analyzing || !selectedProductId}
                                        className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                    >
                                        {analyzing ? 'Skanowanie...' : '⚡ Skanuj Całą Stronę (AI)'}
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={clearSelection}
                                            disabled={!completedCrop}
                                            className="px-3 py-2 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-xs font-medium"
                                        >
                                            Wyczyść
                                        </button>
                                        <button
                                            onClick={handleAddToQueue}
                                            disabled={analyzing || !completedCrop?.width || !selectedProductId}
                                            className={`flex-1 py-2 text-white rounded-lg font-bold flex justify-center gap-2 ${analyzedData && analyzedCrop === completedCrop ? 'bg-green-600 hover:bg-green-700' : 'bg-accent hover:bg-accent/90'} disabled:opacity-50`}
                                        >
                                            {analyzing ? 'Analizowanie...' : analyzedData && analyzedCrop === completedCrop ? '➕ Dodaj' : '🔍 Analizuj Zaznaczenie'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Keyword Autodetection Effect */}
                            {analyzedData && analyzedData.detected_attributes && (
                                <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs text-yellow-800 mb-2">
                                    <strong>Wykryto AI:</strong>
                                    {analyzedData.detected_attributes.roof_type && <span className="ml-1 px-1 bg-white rounded border">Dach: {analyzedData.detected_attributes.roof_type}</span>}
                                    {analyzedData.detected_attributes.snow_zone && <span className="ml-1 px-1 bg-white rounded border">Strefa: {analyzedData.detected_attributes.snow_zone}</span>}
                                </div>
                            )}

                            {/* 2. Queue */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
                                <h3 className="font-bold text-slate-700 border-b pb-2 mb-2 flex justify-between">
                                    <span>Kolejka ({queue.length})</span>
                                    <button onClick={() => setQueue([])} className="text-xs text-red-400 hover:text-red-500">Wyczyść</button>
                                </h3>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                    {queue.map((item: any, idx: number) => (
                                        <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 text-sm relative group">
                                            <div className="font-bold text-slate-700">{item.productName}</div>
                                            <div className="text-xs text-slate-500">
                                                {item.variantConfig.roofType === 'glass' ? 'Szkło' : 'Poliwęglan'}
                                                , Strefa {item.variantConfig.snowZone}
                                                {item.variantConfig.subtype && <span className="font-medium text-slate-700"> • {item.variantConfig.subtype}</span>}
                                                <span className="opacity-70">
                                                    {item.matrixData.entries ? ` • ${item.matrixData.entries.length} pozycji` :
                                                        item.matrixData.rows ? ` • ${item.matrixData.rows}x${item.matrixData.cols}` : ''}
                                                </span>
                                                {item.provider && <span className="block text-[10px] text-blue-500">Dostawca: {item.provider}</span>}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFromQueue(idx)}
                                                className="absolute top-1 right-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {queue.length === 0 && (
                                        <div className="text-center text-slate-400 text-xs py-4">Pusta kolejka</div>
                                    )}
                                </div>

                                <button
                                    onClick={handleSaveAll}
                                    disabled={queue.length === 0}
                                    className="w-full py-3 mt-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 shadow-lg shadow-green-500/20"
                                >
                                    Zapisz Wszystkie ({queue.length})
                                </button>
                            </div>


                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
