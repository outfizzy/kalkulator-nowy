import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { SmartPastePreviewModal } from './SmartPastePreviewModal';
import { ImportManual } from './ManualPriceImporter';

interface MatrixEditorProps {
    tableId: string;
    onClose: () => void;
    tableName: string;
    products: any[];
}

interface MatrixEntry {
    id?: string;
    width_mm: number;
    projection_mm: number;
    price: number; // Total price (legacy or calculated)
    price_table_id?: string;
    structure_price?: number;
    glass_price?: number;
    properties?: {
        rafters?: number;
        posts?: number;
        [key: string]: any;
    };
    _changed?: boolean;
    _isNew?: boolean;
}


export const MatrixEditor: React.FC<MatrixEditorProps> = ({ tableId, onClose, tableName, products }) => {
    const [entries, setEntries] = useState<MatrixEntry[]>([]);
    const [widths, setWidths] = useState<number[]>([]);
    const [projections, setProjections] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bulkValue, setBulkValue] = useState<string>('');
    const [bulkOperation, setBulkOperation] = useState<'add' | 'multiply' | 'set'>('set');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [showImporter, setShowImporter] = useState(false);

    // Dimension Modal State
    const [addDimType, setAddDimType] = useState<'width' | 'projection' | null>(null);
    const [addDimValue, setAddDimValue] = useState('');

    // Smart Paste State
    const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
    const [smartPasteText, setSmartPasteText] = useState('');
    const [smartPasteRows, setSmartPasteRows] = useState<number[][]>([]);
    const [isSmartPasteLoading, setIsSmartPasteLoading] = useState(false);
    const [pasteOrigin, setPasteOrigin] = useState<{ width: number, projection: number, targetField?: keyof MatrixEntry } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'groups' | 'manual_list'>('list'); // Default to list as requested

    const uniqueSurchargeNames = React.useMemo(() => {
        const names = new Set<string>();
        entries.forEach(e => {
            if (e.properties?.surcharges && Array.isArray(e.properties.surcharges)) {
                e.properties.surcharges.forEach((s: any) => {
                    if (s.name) names.add(s.name);
                });
            }
        });
        return Array.from(names).sort();
    }, [entries]);

    const componentGroups = React.useMemo(() => {
        const groups: Record<string, MatrixEntry[]> = {};
        entries.forEach(d => {
            const name = d.properties?.name || 'Inne';
            if (!groups[name]) groups[name] = [];
            groups[name].push(d);
        });
        return Object.keys(groups).map(name => ({ name, entries: groups[name] }));
    }, [entries]);

    const [componentImages, setComponentImages] = useState<Record<string, string>>({}); // name -> url
    const [mainImage, setMainImage] = useState<string | null>(null);

    const handleMainImageUpload = async (file: File) => {
        const toastId = toast.loading('Wysyłanie zdjęcia głównego...');
        try {
            const ext = file.name.split('.').pop();
            const fileName = `product_main_${tableId}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('product-images').upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

            setMainImage(publicUrl);

            // Fetch current attributes first to merge
            const { data: currentTable } = await supabase.from('price_tables').select('attributes').eq('id', tableId).single();
            const currentAttrs = currentTable?.attributes || {};

            await supabase.from('price_tables').update({
                attributes: { ...currentAttrs, image_url: publicUrl }
            }).eq('id', tableId);

            toast.success('Zdjęcie główne ustawione!', { id: toastId });
        } catch (e: any) {
            console.error(e);
            toast.error('Błąd wysyłania: ' + e.message, { id: toastId });
        }
    };

    const loadMatrix = async () => {
        setLoading(true);

        // 1. Fetch Table Metadata & Check for Manual Data Priority
        const { data: tableData } = await supabase.from('price_tables').select('attributes, type, product_definition_id, variant_config').eq('id', tableId).single();
        if (tableData?.product_definition_id) setSelectedProductId(tableData.product_definition_id);
        if (tableData?.attributes?.component_images) setComponentImages(tableData.attributes.component_images);
        if (tableData?.attributes?.image_url) setMainImage(tableData.attributes.image_url);

        const { data: manualData } = await supabase
            .from('pricing_base')
            .select('*')
            .eq('source_import_id', tableId)
            .order('width_mm', { ascending: true })
            .order('depth_mm', { ascending: true });

        if (manualData && manualData.length > 0) {
            const mappedEntries: MatrixEntry[] = manualData.map(d => ({
                id: d.id,
                width_mm: d.width_mm,
                projection_mm: d.depth_mm, // Map depth to projection
                price: d.price_upe_net_eur,
                structure_price: d.price_upe_net_eur,
                glass_price: 0,
                properties: {
                    cover_type: d.cover_type,
                    model_family: d.model_family,
                    construction_type: d.construction_type,
                    zone: d.zone,
                    posts: d.posts_count,
                    fields: d.fields_count,
                    area: d.area_m2,
                    variant_note: d.variant_note,
                    surcharges: d.properties?.surcharges,
                    ...d.properties
                },
                price_table_id: tableId
            }));
            setEntries(mappedEntries);
            updateDimensions(mappedEntries);
            setViewMode('manual_list');
            setLoading(false);
            return;
        } else {
            // Diagnostic: Check if we EXPECT manual data
            if (tableData?.variant_config?.subtype?.includes('Poly') || tableData?.variant_config?.subtype?.includes('Glass') || tableData?.variant_config?.subtype === 'Manual') {
                console.warn("Manual Data Expected but NOT FOUND. RLS Check Required.");
                setViewMode('manual_list'); // FORCE VIEW MODE so we see the empty table/headers
                setEntries([]); // Clear entries
                toast.error((t) => (
                    <div>
                        <b>Brak danych manualnych!</b>
                        <p className="text-xs">Cennik oznaczony jako manualny, ale tabela `pricing_base` jest pusta.</p>
                        <p className="text-xs mt-1 text-red-600 font-bold">Wymagana naprawa uprawnień (RLS).</p>
                    </div>
                ), { duration: 5000, id: 'missing-data-warning' });
                setLoading(false); // Stop loading here, don't fallback to standard
                return;
            }
        }
        const { data, error } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', tableId)
            .order('width_mm', { ascending: true })
            .order('projection_mm', { ascending: true });

        if (error) {
            toast.error('Błąd pobierania danych');
            console.error(error);
        } else if (data && data.length > 0) {
            // Standard Matrix Data
            setEntries(data.map(d => ({
                ...d,
                structure_price: d.structure_price || d.price, // Fallback
                glass_price: d.glass_price || 0,
                properties: d.properties || { rafters: 0, posts: 2 }
            })));

            const { data: tableData } = await supabase.from('price_tables').select('attributes, type, product_definition_id').eq('id', tableId).single();
            if (tableData?.product_definition_id) setSelectedProductId(tableData.product_definition_id);
            if (tableData?.attributes?.component_images) setComponentImages(tableData.attributes.component_images);

            const hasGroups = data.some(d => d.properties?.name);
            const isSimpleType = tableData?.type === 'simple' || tableData?.type === 'component';
            if (hasGroups || isSimpleType) setViewMode('groups');
            else updateDimensions(data);
        } else {
            setLoading(false);
            return;
        }

    };

    const updateDimensions = (data: MatrixEntry[]) => {
        const distinctWidths = [...new Set(data.map(e => e.width_mm))].sort((a, b) => a - b);
        const distinctProjections = [...new Set(data.map(e => e.projection_mm))].sort((a, b) => a - b);
        setWidths(distinctWidths);
        setProjections(distinctProjections);
    };

    // Grouping Logic for Pivot View (Manual Mode)
    const groupedManualEntries = React.useMemo(() => {
        if (viewMode !== 'manual_list') return [];

        const groups: Record<string, {
            width: number;
            depth: number;
            zone: number;
            baseEntry?: MatrixEntry;
            relaxEntry?: MatrixEntry;
            otherEntries: MatrixEntry[];
        }> = {};

        entries.forEach(e => {
            const key = `${e.width_mm}-${e.projection_mm}-${e.properties?.zone || 1}`;
            if (!groups[key]) {
                groups[key] = {
                    width: e.width_mm,
                    depth: e.projection_mm,
                    zone: parseInt(e.properties?.zone || '1'),
                    otherEntries: []
                };
            }

            // Classify Entry
            const cv = (e.properties?.cover_type || '').toLowerCase();
            const isRelax = cv.includes('relax') || cv.includes('tinted') || cv.includes('ir-gold');

            if (isRelax) {
                groups[key].relaxEntry = e;
            } else {
                if (!groups[key].baseEntry) groups[key].baseEntry = e;
                else groups[key].otherEntries.push(e);
            }
        });

        return Object.values(groups).sort((a, b) => a.width - b.width || a.depth - b.depth);
    }, [entries, viewMode]);

    useEffect(() => {
        loadMatrix();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableId]);

    const handleEntryChange = (id: string | undefined, field: keyof MatrixEntry | string, value: any, width?: number, projection?: number) => {
        setEntries(prev => prev.map(e => {
            const match = id ? e.id === id : (e.width_mm === width && e.projection_mm === projection);

            if (match) {
                let updated = { ...e, _changed: true };

                if (field === 'structure_price' || field === 'glass_price') {
                    // Update specific price component
                    updated = { ...updated, [field]: parseFloat(value) || 0 };
                    // Recalculate total price
                    updated.price = (updated.structure_price || 0) + (updated.glass_price || 0);
                } else if (field.startsWith('prop_')) {
                    // Update property
                    const propName = field.replace('prop_', '');
                    const newProps = { ...updated.properties, [propName]: value };

                    // Sync legacy name if changing translations
                    if (propName === 'name_pl' || propName === 'name_de') {
                        const pl = propName === 'name_pl' ? value : (newProps.name_pl || '');
                        const de = propName === 'name_de' ? value : (newProps.name_de || '');
                        // Format: "NamePL (NameDE)" if DE exists, else just "NamePL"
                        newProps.name = de ? `${pl} (${de})` : pl;
                    }

                    updated.properties = newProps;
                } else if (field.startsWith('surcharge_')) {
                    // Update specific surcharge
                    const surchargeName = field.replace('surcharge_', '');
                    const val = parseFloat(value) || 0;
                    const currentSurcharges = updated.properties?.surcharges || [];

                    // Clone array
                    const newSurcharges = [...currentSurcharges];
                    const existingIndex = newSurcharges.findIndex((s: any) => s.name === surchargeName);

                    if (existingIndex >= 0) {
                        // Update existing
                        newSurcharges[existingIndex] = { ...newSurcharges[existingIndex], price: val };
                    } else if (val !== 0) {
                        // Add new if not zero
                        newSurcharges.push({ name: surchargeName, price: val });
                    }
                    // Filter out zero price surcharges to keep it clean? 
                    // No, keeping them with 0 is fine for editing experience, or maybe remove if 0?
                    // Let's keep them if they exist for now, or just let them stay.

                    updated.properties = { ...updated.properties, surcharges: newSurcharges };
                } else {
                    // Direct field update
                    // @ts-ignore
                    updated[field] = value;
                }
                return updated;
            }
            return e;
        }));
    };

    const confirmAddDimension = () => {
        if (!addDimType || !addDimValue) return;
        const val = parseInt(addDimValue);
        const type = addDimType;

        // Reset Modal
        setAddDimType(null);
        setAddDimValue('');

        if (isNaN(val) || val <= 0) {
            toast.error('Nieprawidłowa wartość');
            return;
        }
        if (isNaN(val) || val <= 0) return;

        if (type === 'width' && widths.includes(val)) {
            toast.error('Taka szerokość już istnieje');
            return;
        }
        if (type === 'projection' && projections.includes(val)) {
            toast.error('Taki wysięg już istnieje');
            return;
        }

        // Generate new entries
        const newEntries: MatrixEntry[] = [];

        if (type === 'width') {
            // Add column: Create entry for this width for EVERY existing projection
            projections.forEach(p => {
                newEntries.push({
                    width_mm: val,
                    projection_mm: p,
                    price: 0,
                    structure_price: 0,
                    glass_price: 0,
                    properties: { rafters: Math.ceil(val / 800) + 1, posts: 2 },
                    _changed: true,
                    _isNew: true
                });
            });
            setWidths([...widths, val].sort((a, b) => a - b));
        } else {
            // Add row: Create entry for this projection for EVERY existing width
            widths.forEach(w => {
                newEntries.push({
                    width_mm: w,
                    projection_mm: val,
                    price: 0,
                    structure_price: 0,
                    glass_price: 0,
                    properties: { rafters: Math.ceil(w / 800) + 1, posts: 2 },
                    _changed: true,
                    _isNew: true
                });
            });
            setProjections([...projections, val].sort((a, b) => a - b));
        }

        setEntries([...entries, ...newEntries]);
        toast.success(`Dodano ${newEntries.length} nowych pól do uzupełnienia`);
    };

    const saveChanges = async () => {
        setSaving(true);
        const changed = entries.filter(e => e._changed);
        if (changed.length === 0) {
            setSaving(false);
            return;
        }

        // Determine target table logic
        // If these entries came from pricing_base, they have a virtual ID or we know from context.
        // We can check if `source_import_id` matches current tableId in a quick check, 
        // OR simpler: Try to save to `pricing_base` if we loaded from it. 
        // But `entries` doesn't strictly store source.

        // Strategy: Check if we have ANY entry in `pricing_base` for this table.
        const { count } = await supabase.from('pricing_base').select('*', { count: 'exact', head: true }).eq('source_import_id', tableId);
        const isManualTable = (count || 0) > 0;

        let error = null;

        if (isManualTable) {
            // Save to pricing_base
            const manualPayload = changed.map(e => ({
                id: e.id && e.id.includes('-') ? e.id : undefined, // Check if valid UUID, though we might not have it for new rows
                source_import_id: tableId,
                width_mm: e.width_mm,
                depth_mm: e.projection_mm, // Map projection -> depth
                price_upe_net_eur: e.price,
                // Reconstruct fields from properties
                model_family: e.properties?.model_family || 'Unknown',
                construction_type: e.properties?.construction_type || 'wall',
                cover_type: e.properties?.cover_type || 'unknown',
                zone: e.properties?.zone || 1,
                posts_count: e.properties?.posts,
                fields_count: e.properties?.fields,
                area_m2: e.properties?.area,
                variant_note: e.properties?.variant_note
            }));

            const { error: manualErr } = await supabase.from('pricing_base').upsert(manualPayload, { onConflict: 'model_family, construction_type, cover_type, zone, width_mm, depth_mm' });
            if (manualErr) error = manualErr;

        } else {
            // Standard Save
            const payload = changed.map(e => ({
                id: e.id,
                price_table_id: tableId,
                width_mm: e.width_mm,
                projection_mm: e.projection_mm,
                price: e.price,
                structure_price: e.structure_price,
                glass_price: e.glass_price,
                properties: e.properties
            }));

            // Split into inserts (no ID) and updates (ID)
            const toInsert = payload.filter(p => !p.id);
            const toUpdate = payload.filter(p => p.id);

            if (toInsert.length > 0) {
                const { error: insertErr } = await supabase.from('price_matrix_entries').insert(toInsert);
                if (insertErr) error = insertErr;
            }

            if (toUpdate.length > 0 && !error) {
                const { error: updateErr } = await supabase.from('price_matrix_entries').upsert(toUpdate);
                if (updateErr) error = updateErr;
            }
        }

        if (error) {
            toast.error('Błąd zapisu');
            console.error(error);
        } else {
            toast.success('Zapisano zmiany');
            loadMatrix(); // Reload to get IDs and clean state
        }
        setSaving(false);
    };

    const handlePaste = async (e: React.ClipboardEvent, width: number, projection: number, targetField?: string) => {
        // Try getting text from clipboard
        const text = e.clipboardData.getData('text');


        // Heuristic: If it contains newlines OR tabs, treat as potential smart paste
        // Also if it looks like a list of numbers separated by newlines (single column)
        const isMultiLine = text.includes('\n') || text.includes('\r');
        const isTabular = text.includes('\t');

        // If it's just a single number (no newlines/tabs), let default handler work (normal paste)
        if (!isMultiLine && !isTabular) {
            return;
        }

        e.preventDefault();

        setPasteOrigin({ width, projection, targetField: targetField as keyof MatrixEntry });
        setSmartPasteText(text);

        // Open modal immediately to show feedback
        setIsSmartPasteOpen(true);
        setIsSmartPasteLoading(true);
        setSmartPasteRows([]);

        try {
            // Call AI Function
            // Note: If text is small, AI might need context. 
            // We pass simply text_content. The AI function should handle partials.
            const { data, error } = await supabase.functions.invoke('parse-pricing-text', {
                body: { text_content: text }
            });

            if (error) throw error;
            if (data?.rows) {
                setSmartPasteRows(data.rows);
                toast.success('Dane przeanalizowane. Sprawdź dopasowanie.');
            }
        } catch (err) {
            console.error('Smart Paste Error:', err);
            toast.error('Błąd analizy tekstu. Spróbuj ręcznie.');
            // Don't close modal, let user see error or use manual edit if we add that later
            setIsSmartPasteLoading(false);
        } finally {
            setIsSmartPasteLoading(false);
        }
    };

    const confirmSmartPaste = (finalRows?: number[][]) => {
        const rowsToUse = finalRows || smartPasteRows;

        if (!pasteOrigin || rowsToUse.length === 0) return;

        const startWIdx = widths.indexOf(pasteOrigin.width);
        const startPIdx = projections.indexOf(pasteOrigin.projection);

        if (startWIdx === -1 || startPIdx === -1) {
            toast.error('Błąd: Punkt startowy nie istnieje już w tabeli');
            return;
        }

        const newEntries = [...entries];
        let updatedCount = 0;

        rowsToUse.forEach((row, rIdx) => {
            row.forEach((price, cIdx) => {
                const targetWIdx = startWIdx + cIdx;
                const targetPIdx = startPIdx + rIdx;

                if (targetWIdx < widths.length && targetPIdx < projections.length) {
                    const w = widths[targetWIdx];
                    const p = projections[targetPIdx];

                    const entryIndex = newEntries.findIndex(e => e.width_mm === w && e.projection_mm === p);
                    if (entryIndex >= 0) {
                        newEntries[entryIndex] = {
                            ...newEntries[entryIndex],
                            price: price,
                            structure_price: price, // Assume structure price update for now
                            _changed: true
                        };
                        updatedCount++;
                    } else {
                        // Create if missing (rare case if matrix is full)
                        newEntries.push({
                            price_table_id: tableId,
                            width_mm: w,
                            projection_mm: p,
                            price: price,
                            structure_price: price,
                            _changed: true,
                            _isNew: true
                        });
                        updatedCount++;
                    }
                }
            });
        });

        setEntries(newEntries);
        toast.success(`Wklejono ${updatedCount} cen! Pamiętaj o zapisaniu zmian.`);
        setIsSmartPasteOpen(false);
        setPasteOrigin(null);
    };

    // Helper to get entry
    const getEntry = (w: number, p: number) => entries.find(e => e.width_mm === w && e.projection_mm === p);

    const [editedTableName, setEditedTableName] = useState(tableName);

    // Update local state if prop changes
    useEffect(() => {
        setEditedTableName(tableName);
    }, [tableName]);

    const handleNameChange = async () => {
        if (editedTableName === tableName) return;
        try {
            const { error } = await supabase.from('price_tables').update({ name: editedTableName }).eq('id', tableId);
            if (error) throw error;
            toast.success('Zmieniono nazwę cennika');
            // Optimistically update parent? Ideally parent fetches, but we can't easily trigger it. 
            // Name update is usually minor.
        } catch (error) {
            console.error(error);
            toast.error('Błąd zmiany nazwy');
        }
    };

    const handleUploadImage = async (groupName: string, file: File) => {
        const toastId = toast.loading('Wysyłanie zdjęcia...');
        try {
            const ext = file.name.split('.').pop();
            const fileName = `component_${tableId}_${groupName.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('product-images').upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

            // Save to table attributes
            const newImages = { ...componentImages, [groupName]: publicUrl };
            setComponentImages(newImages);

            // Fetch current attributes first to merge
            const { data: currentTable } = await supabase.from('price_tables').select('attributes').eq('id', tableId).single();
            const currentAttrs = currentTable?.attributes || {};

            await supabase.from('price_tables').update({
                attributes: { ...currentAttrs, component_images: newImages }
            }).eq('id', tableId);

            toast.success('Zdjęcie dodane!', { id: toastId });
        } catch (e: any) {
            console.error(e);
            toast.error('Błąd wysyłania: ' + e.message, { id: toastId });
        }
    };

    const handleProductChange = async (newProductId: string) => {
        setSelectedProductId(newProductId);
        const { error } = await supabase.from('price_tables')
            .update({ product_definition_id: newProductId || null })
            .eq('id', tableId);

        if (error) {
            toast.error('Błąd zmiany produktu');
            console.error(error);
        } else {
            toast.success('Przypisano produkt');
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-40 flex flex-col">
            {showImporter && (
                <ImportManual
                    isOpen={showImporter}
                    onClose={() => setShowImporter(false)}
                    products={products}
                    targetTableId={tableId}
                    targetTableName={tableName}
                    onSuccess={() => {
                        setShowImporter(false);
                        loadMatrix(); // Reload data
                        toast.success('Dane zaimportowane pomyślnie');
                    }}
                />
            )}

            {/* Add Dimension Modal */}
            {addDimType && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 bg-blue-50/50 p-2 rounded -mx-2">
                            ➕ Dodaj {addDimType === 'width' ? 'Szerokość' : 'Wysięg'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                    Wartość (mm)
                                </label>
                                <input
                                    autoFocus
                                    type="number"
                                    className="w-full text-2xl font-bold p-3 border border-slate-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700"
                                    placeholder="np. 3500"
                                    value={addDimValue}
                                    onChange={e => setAddDimValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') confirmAddDimension();
                                        if (e.key === 'Escape') setAddDimType(null);
                                    }}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setAddDimType(null)}
                                    className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={confirmAddDimension}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"
                                >
                                    Dodaj
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SmartPastePreviewModal
                isOpen={isSmartPasteOpen}
                onClose={() => setIsSmartPasteOpen(false)}
                onConfirm={confirmSmartPaste}
                parsedRows={smartPasteRows}
                originalText={smartPasteText}
                isLoading={isSmartPasteLoading}
                startColIndex={widths.indexOf(pasteOrigin?.width || 0)}
                startRowIndex={projections.indexOf(pasteOrigin?.projection || 0)}
                targetWidths={widths}
                targetProjections={projections}
            />

            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg shrink-0">
                <div className="flex items-center gap-4">
                    {/* Main Image Upload */}
                    {mainImage ? (
                        <div className="relative group shrink-0">
                            <img src={mainImage} className="h-12 w-16 object-cover rounded border border-slate-600 bg-black" alt="Main" />
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded text-xs text-white">
                                📷
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleMainImageUpload(e.target.files[0])} />
                            </label>
                        </div>
                    ) : (
                        <label className="h-12 w-12 flex items-center justify-center bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 cursor-pointer text-white hover:text-blue-400 transition-colors shrink-0" title="Dodaj zdjęcie główne">
                            📷
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleMainImageUpload(e.target.files[0])} />
                        </label>
                    )}

                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            📏 Edytor Cennika: <span className="text-blue-400">{tableName}</span>
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span>Przypisany Model:</span>
                            <select
                                value={selectedProductId}
                                onChange={(e) => handleProductChange(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="">-- Brak (Ogólny) --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.code ? `[${p.code}]` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-800 rounded p-1">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded text-xs ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Lista</button>
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded text-xs ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Siatka</button>
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded text-xs ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Siatka</button>
                        <button onClick={() => setViewMode(viewMode === 'groups' ? 'list' : 'groups')} className={`px-3 py-1 rounded text-xs ${viewMode === 'groups' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>Komponenty</button>
                        <button onClick={() => setViewMode('manual_list')} className={`px-3 py-1 rounded text-xs ${viewMode === 'manual_list' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Manual</button>
                    </div>

                    <div className="flex gap-2">
                        {viewMode !== 'groups' && (
                            <>
                                <button
                                    onClick={() => { setAddDimType('width'); setAddDimValue(''); }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 hover:border-slate-500 transition-all active:scale-95"
                                >
                                    + Szerokość
                                </button>
                                <button
                                    onClick={() => { setAddDimType('projection'); setAddDimValue(''); }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 hover:border-slate-500 transition-all active:scale-95"
                                >
                                    + Wysięg
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setShowImporter(true)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1"
                        >
                            📤 Import CSV
                        </button>
                        <button onClick={onClose} className="px-4 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded font-medium text-sm">Anuluj</button>
                        <button onClick={saveChanges} disabled={saving} className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-sm disabled:opacity-50">
                            {saving ? 'Zapisuję...' : 'Zapisz'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-0 bg-white">
                {
                    loading ? (
                        <div className="flex justify-center items-center h-full text-slate-400">Ładowanie cennika...</div>
                    ) : (
                        <>
                            {viewMode === 'groups' && (
                                <div className="p-6 space-y-8">
                                    {componentGroups.map(group => (
                                        <div key={group.name} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        className="font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-accent focus:outline-none"
                                                        value={group.name}
                                                        onChange={() => { }}
                                                        disabled
                                                    />
                                                    {componentImages[group.name] || group.entries[0]?.properties?.image_url ? (
                                                        <img src={componentImages[group.name] || group.entries[0]?.properties?.image_url} alt={group.name} className="h-10 w-10 object-cover rounded border border-slate-300" />
                                                    ) : (
                                                        <div className="h-10 w-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">Brak foto</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="cursor-pointer px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm flex items-center gap-1">
                                                        <span>📷 Zmień zdjęcie</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                            if (e.target.files?.[0]) handleUploadImage(group.name, e.target.files[0]);
                                                        }} />
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="p-0">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                                        <tr>
                                                            <th className="p-3 w-1/3">
                                                                <div className="flex gap-2 text-xs uppercase text-slate-400">
                                                                    <span className="flex-1">PL</span>
                                                                    <span className="flex-1">DE (Opcjonalne)</span>
                                                                </div>
                                                                Nazwa Produktu
                                                            </th>
                                                            <th className="p-3 w-1/4">Opis (Admin)</th>
                                                            <th className="p-3 w-24 text-center">Jednostka</th>
                                                            <th className="p-3 w-32 text-right">Cena</th>
                                                            {uniqueSurchargeNames.map(sName => (
                                                                <th key={sName} className="p-3 w-28 text-center bg-amber-50 text-amber-900 border-l border-amber-100">
                                                                    <div className="text-[10px] uppercase text-amber-500">Dopłata</div>
                                                                    {sName}
                                                                </th>
                                                            ))}
                                                            <th className="p-3 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {group.entries.map(entry => (
                                                            <tr key={entry.id || Math.random()} className="hover:bg-slate-50 group-row">
                                                                <td className="p-3">
                                                                    <div className="flex flex-col gap-1">
                                                                        <input
                                                                            type="text"
                                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none font-medium"
                                                                            value={entry.properties?.name_pl || entry.properties?.name || ''}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'prop_name_pl', e.target.value)}
                                                                            placeholder="Nazwa (PL)"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            className="w-full text-sm text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none italic"
                                                                            value={entry.properties?.name_de || ''}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'prop_name_de', e.target.value)}
                                                                            placeholder="Nazwa (DE)"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none"
                                                                        value={entry.properties?.description || ''}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_description', e.target.value)}
                                                                        placeholder="Opis techniczny"
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none"
                                                                        value={entry.properties?.unit || 'szt.'}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_unit', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <div className="relative inline-block w-32">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                                        <input
                                                                            type="number"
                                                                            value={entry.price}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'price', e.target.value)}
                                                                            onPaste={(e) => handlePaste(e, entry.width_mm, entry.projection_mm)}
                                                                            className="w-full pl-6 pr-2 py-1 text-right border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                {
                                                                    uniqueSurchargeNames.map(sName => {
                                                                        const surcharge = entry.properties?.surcharges?.find((s: any) => s.name === sName);
                                                                        const price = surcharge?.price || 0;
                                                                        return (
                                                                            <td key={sName} className="p-3 text-center bg-amber-50/30 border-l border-amber-100/50">
                                                                                <div className="relative">
                                                                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">+</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={price}
                                                                                        onChange={(e) => handleEntryChange(entry.id, `surcharge_${sName}`, e.target.value)}
                                                                                        className="w-20 pl-4 pr-1 py-1 text-center bg-transparent border-b border-dashed border-amber-200 hover:border-amber-400 focus:border-amber-600 outline-none text-sm font-medium text-amber-700"
                                                                                        placeholder="0"
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })
                                                                }
                                                                <td className="p-3 text-center">
                                                                    <button
                                                                        title="Usuń wiersz"
                                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => {
                                                                            if (confirm('Usunąć ten wiersz?')) {
                                                                                if (entry.id) {
                                                                                    // Logic to mark as deleted or delete directly?
                                                                                    // For now just remove from state, verify save handles deletion?
                                                                                    // Save currently only UPSERTS. Deletion requires explicit call.
                                                                                    // TODO: Add delete logic. For now local remove:
                                                                                    // Actually we need to delete from DB if it has ID.
                                                                                    // Let's implement delete later or just confirm.
                                                                                    // A simpler way: set _deleted flag and handle in save.
                                                                                }
                                                                                setEntries(prev => prev.filter(e => e !== entry));
                                                                            }
                                                                        }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {/* Add Row Button */}
                                                        <tr>
                                                            <td colSpan={5} className="p-2 bg-slate-50">
                                                                <button
                                                                    onClick={() => {
                                                                        const newEntry: MatrixEntry = {
                                                                            width_mm: 0,
                                                                            projection_mm: 0,
                                                                            price: 0,
                                                                            structure_price: 0,
                                                                            glass_price: 0,
                                                                            properties: {
                                                                                name: group.name, // Keep in same group
                                                                                description: '',
                                                                                unit: 'szt.'
                                                                            },
                                                                            _changed: true,
                                                                            _isNew: true
                                                                        };
                                                                        setEntries([...entries, newEntry]);
                                                                    }}
                                                                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded text-slate-400 hover:border-accent hover:text-accent font-bold text-sm transition-all"
                                                                >
                                                                    + Dodaj wiersz do grupy "{group.name}"
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Group Button */}
                                    <div className="mt-8 border-t pt-8 text-center">
                                        <button
                                            onClick={() => {
                                                const groupName = prompt("Podaj nazwę nowej grupy (np. 'Opcje Dodatkowe'):");
                                                if (groupName) {
                                                    const newEntry: MatrixEntry = {
                                                        width_mm: 0,
                                                        projection_mm: 0,
                                                        price: 0,
                                                        structure_price: 0,
                                                        glass_price: 0,
                                                        properties: {
                                                            name: groupName, // New name creates new group
                                                            description: '',
                                                            unit: 'szt.'
                                                        },
                                                        _changed: true,
                                                        _isNew: true
                                                    };
                                                    setEntries([...entries, newEntry]);
                                                }
                                            }}
                                            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300"
                                        >
                                            + Utwórz nową grupę
                                        </button>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'grid' && (
                                <div className="p-4">
                                    <div className="inline-block min-w-full">
                                        <div className="grid gap-px bg-slate-200 border border-slate-300 shadow-sm rounded-lg overflow-hidden"
                                            style={{
                                                gridTemplateColumns: `100px repeat(${widths.length}, minmax(120px, 1fr))`
                                            }}>
                                            {/* Header Row */}
                                            <div className="bg-slate-100 p-3 font-bold text-xs text-slate-500 sticky top-0 z-10 flex items-center justify-center">
                                                Wysięg \ Szer.
                                            </div>
                                            {widths.map(w => (
                                                <div key={w} className="bg-slate-100 p-3 font-bold text-xs text-slate-700 text-center sticky top-0 z-10">
                                                    {w} mm
                                                </div>
                                            ))}

                                            {/* Rows */}
                                            {projections.map(p => (
                                                <React.Fragment key={p}>
                                                    <div className="bg-slate-100 p-3 font-bold text-xs text-slate-700 flex items-center justify-center sticky left-0 z-10">
                                                        {p} mm
                                                    </div>
                                                    {widths.map(w => {
                                                        const entry = getEntry(w, p);
                                                        const changed = entry?._changed;
                                                        return (
                                                            <div key={`${w}-${p}`} className={`bg-white p-1 relative group ${changed ? 'bg-yellow-50' : ''}`}>
                                                                <div className="flex flex-col h-full justify-center">
                                                                    <label className="text-[10px] text-slate-400 text-center">Całość</label>
                                                                    <input
                                                                        type="text"
                                                                        // Use text type to allow handling raw paste events better without browser interfering
                                                                        // Format simply as string, but handle change as number
                                                                        value={entry?.price || ''}
                                                                        onChange={(e) => {
                                                                            // Allow typing logic (numbers only)
                                                                            const val = e.target.value;
                                                                            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                                                                handleEntryChange(entry?.id, 'price', val, w, p);
                                                                            }
                                                                        }}
                                                                        onPaste={(e) => handlePaste(e, w, p)}
                                                                        className={`w-full text-center text-sm font-bold focus:outline-none bg-transparent ${changed ? 'text-amber-700' : 'text-slate-800'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(viewMode === 'list' || !viewMode || (viewMode !== 'grid' && viewMode !== 'groups')) && (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-3 border-b text-center bg-orange-100 border-orange-200">Wymiar (mm)</th>
                                                <th className="p-3 border-b text-center w-32 bg-yellow-50">Cena Konstr.</th>
                                                <th className="p-3 border-b text-center w-32 bg-blue-50">Cena Szkła</th>
                                                <th className="p-3 border-b text-center w-32 bg-green-50">Suma (Auto)</th>
                                                <th className="p-3 border-b text-center w-20">Pola</th>
                                                <th className="p-3 border-b text-center w-20">Słupy</th>
                                                <th className="p-3 border-b text-center w-24">Pow. (m²)</th>
                                                <th className="p-3 border-b text-center w-32 bg-purple-50">Dodatki</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Group by Projection for readability like in the image */}
                                            {projections.map(p => (
                                                <React.Fragment key={p}>
                                                    {widths.map(w => {
                                                        const entry = getEntry(w, p);
                                                        if (!entry) return null;
                                                        return (
                                                            <tr key={`${w}-${p}`} className={`hover:bg-slate-50 ${entry._changed ? 'bg-yellow-50/50' : ''}`}>
                                                                <td className="p-2 border-r border-slate-100 font-bold text-slate-700 text-center">
                                                                    {w} x {p}
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 bg-yellow-50/30">
                                                                    <div className="relative">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-6 pr-2 py-1 text-right bg-white border border-slate-200 rounded text-sm focus:ring-2 focus:ring-accent"
                                                                            value={entry.structure_price || 0}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value.replace(',', '.');
                                                                                // Allow numeric + dot + comma during typing, only set if valid-ish
                                                                                if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                                                                                    handleEntryChange(entry.id, 'structure_price', val, w, p);
                                                                                }
                                                                            }}
                                                                            onPaste={(e) => handlePaste(e, w, p, 'structure_price')}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 bg-blue-50/30">
                                                                    <div className="relative">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-6 pr-2 py-1 text-right bg-white border border-slate-200 rounded text-sm focus:ring-2 focus:ring-accent"
                                                                            value={entry.glass_price || 0}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value.replace(',', '.');
                                                                                if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                                                                                    handleEntryChange(entry.id, 'glass_price', val, w, p);
                                                                                }
                                                                            }}
                                                                            onPaste={(e) => handlePaste(e, w, p, 'glass_price')}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 font-bold text-right text-green-700 bg-green-50/30">
                                                                    € {((entry.structure_price || 0) + (entry.glass_price || 0)).toFixed(2)}
                                                                </td>
                                                                <td className="p-2 text-center border-r border-slate-100">
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-center bg-white border border-slate-200 rounded text-sm"
                                                                        // Prefer 'fields' property, fallback to 'rafters-1'
                                                                        value={entry.properties?.fields ?? (entry.properties?.rafters ? entry.properties.rafters - 1 : 0)}
                                                                        title="Liczba pól"
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_fields', parseInt(e.target.value), w, p)}
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center border-r border-slate-100">
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-center bg-white border border-slate-200 rounded text-sm"
                                                                        value={entry.properties?.posts || 2}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_posts', parseInt(e.target.value), w, p)}
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-20 text-center bg-white border border-slate-200 rounded text-sm"
                                                                            // Standardize on area_m2, fallback to legacy area
                                                                            value={entry.properties?.area_m2 ?? entry.properties?.area ?? 0}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'prop_area_m2', parseFloat(e.target.value), w, p)}
                                                                        />
                                                                        <span className="absolute right-1 top-1.5 text-slate-400 text-[10px]">m²</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 text-xs text-slate-500">
                                                                    {/* Render Rafter Type / Reinforcement / Surcharges */}
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        {entry.properties?.surcharges && Array.isArray(entry.properties.surcharges) && entry.properties.surcharges.length > 0 && (
                                                                            <div className="group/tooltip relative">
                                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 font-bold border border-amber-200 cursor-help">
                                                                                    + {entry.properties.surcharges.length} DOPŁATY
                                                                                </span>
                                                                                <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                                                                    {entry.properties.surcharges.map((s: any, idx: number) => (
                                                                                        <div key={idx} className="flex justify-between">
                                                                                            <span>{s.name}:</span>
                                                                                            <span className="font-mono">€{s.price}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {entry.properties?.rafter_type && entry.properties.rafter_type !== 'std' && (
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-white
                                                                                ${entry.properties.rafter_type === 'M' ? 'bg-slate-400' :
                                                                                    entry.properties.rafter_type === 'L' ? 'bg-blue-400' :
                                                                                        entry.properties.rafter_type === 'XL' ? 'bg-purple-500' : 'bg-red-500'}`}>
                                                                                {entry.properties.rafter_type.replace('_Steel', '+Steel')}
                                                                            </span>
                                                                        )}
                                                                        {entry.properties?.reinforcement && (
                                                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold border border-red-200">
                                                                                + STAL
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {/* Separator row */}
                                                    <tr className="bg-slate-100 h-2"><td colSpan={6}></td></tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {viewMode === 'manual_list' && (
                                <div className="p-0">
                                    <div className="bg-amber-50 border-b border-amber-100 p-2 text-center text-xs text-amber-800 font-medium sticky top-0 z-20 flex justify-between items-center px-4">
                                        <span>Tryb edycji manualnej (Aluxe) - Widok Scalony</span>
                                        <button onClick={loadMatrix} className="text-amber-600 hover:text-amber-900 border border-amber-200 rounded px-2 hover:bg-amber-100 transition-colors">Odśwież</button>
                                    </div>
                                    <table className="w-full text-xs border-collapse bg-white">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b sticky top-8 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-2 border-r min-w-[60px]">Szer.</th>
                                                <th className="p-2 border-r min-w-[60px]">Głęb.</th>
                                                <th className="p-2 border-r min-w-[120px]">Model/Strefa</th>

                                                {/* Base Price Column */}
                                                <th className="p-2 border-r min-w-[100px] text-right bg-blue-50 text-blue-900 border-l border-blue-200">
                                                    Cena Podstawowa<br />
                                                    <span className="text-[9px] font-normal opacity-70">(Clear/Opal/Konstr.)</span>
                                                </th>

                                                {/* Relax Price Column */}
                                                <th className="p-2 border-r min-w-[100px] text-right bg-purple-50 text-purple-900 border-l border-purple-200">
                                                    Cena Relax<br />
                                                    <span className="text-[9px] font-normal opacity-70">(IQ Relax/Tinted)</span>
                                                </th>

                                                <th className="p-2 border-r min-w-[50px]">Słupy</th>
                                                <th className="p-2 border-r min-w-[50px]">Pola</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {groupedManualEntries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-slate-400 bg-slate-50/50">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-2xl">📭</span>
                                                            <span className="font-bold">Brak danych w tym cenniku</span>
                                                            <p className="text-xs max-w-xs">
                                                                Może to oznaczać brak importu lub brak uprawnień (RLS) do odczytu danych manualnych.
                                                            </p>
                                                            <button
                                                                onClick={() => loadMatrix()}
                                                                className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-bold underline"
                                                            >
                                                                Odśwież dane
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                groupedManualEntries.map((group, idx) => (
                                                    <tr key={`${group.width}-${group.depth}-${idx}`} className="hover:bg-slate-50 font-mono">
                                                        <td className="p-1 border-r text-center">{group.width}</td>
                                                        <td className="p-1 border-r text-center">{group.depth}</td>
                                                        <td className="p-1 border-r">
                                                            <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                                                                <span>{group.baseEntry?.properties?.model_family || group.relaxEntry?.properties?.model_family}</span>
                                                                {(group.baseEntry?.properties?.variant_note || group.relaxEntry?.properties?.variant_note) && (
                                                                    <span title="Dopisek / Wzmocnienie" className="text-red-600 font-extrabold bg-red-100 px-1.5 rounded text-[10px] border border-red-200 shadow-sm">
                                                                        {group.baseEntry?.properties?.variant_note || group.relaxEntry?.properties?.variant_note}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <select
                                                                className="bg-transparent w-full text-[10px]"
                                                                value={group.zone}
                                                                onChange={e => {
                                                                    // Update all entries in this group
                                                                    [group.baseEntry, group.relaxEntry, ...group.otherEntries].forEach(entry => {
                                                                        if (entry) handleEntryChange(entry.id, 'prop_zone', e.target.value);
                                                                    });
                                                                }}
                                                            >
                                                                <option value="1">Strefa 1</option>
                                                                <option value="2">Strefa 2</option>
                                                                <option value="3">Strefa 3</option>
                                                            </select>
                                                        </td>

                                                        {/* Base Price Input */}
                                                        <td className="p-1 border-r text-right bg-blue-50/10">
                                                            {group.baseEntry ? (
                                                                <input
                                                                    className={`text-right font-bold w-full p-1 border rounded ${group.baseEntry._changed ? 'bg-amber-50 border-amber-300' : 'border-transparent hover:border-blue-200'}`}
                                                                    value={group.baseEntry.price}
                                                                    onChange={e => handleEntryChange(group.baseEntry!.id, 'price', e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="text-slate-300 text-center block">-</span>
                                                            )}
                                                        </td>

                                                        {/* Relax Price Input */}
                                                        <td className="p-1 border-r text-right bg-purple-50/10">
                                                            {group.relaxEntry ? (
                                                                <input
                                                                    className={`text-right font-bold w-full p-1 border rounded text-purple-700 ${group.relaxEntry._changed ? 'bg-amber-50 border-amber-300' : 'border-transparent hover:border-purple-200'}`}
                                                                    value={group.relaxEntry.price}
                                                                    onChange={e => handleEntryChange(group.relaxEntry!.id, 'price', e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="text-slate-300 text-center block text-xs italic opacity-50">Brak wariantu</span>
                                                            )}
                                                        </td>

                                                        <td className="p-1 border-r text-center text-slate-400">{group.baseEntry?.properties?.posts || group.relaxEntry?.properties?.posts || '-'}</td>
                                                        <td className="p-1 border-r text-center text-slate-400">{group.baseEntry?.properties?.fields || group.relaxEntry?.properties?.fields || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </>
                    )
                }
                {/* Smart Paste Modal */}
                {
                    isSmartPasteOpen && pasteOrigin && (
                        <SmartPastePreviewModal
                            isOpen={isSmartPasteOpen}
                            onClose={() => setIsSmartPasteOpen(false)}
                            onConfirm={confirmSmartPaste}
                            parsedRows={smartPasteRows}
                            startColIndex={widths.indexOf(pasteOrigin.width)}
                            startRowIndex={projections.indexOf(pasteOrigin.projection)}
                            targetWidths={widths}
                            targetProjections={projections}
                            isLoading={isSmartPasteLoading}
                            originalText={smartPasteText}
                            // Product Context
                            products={products}
                            selectedProductId={selectedProductId}
                            onProductChange={async (id) => {
                                setSelectedProductId(id);
                                // Also update the table in DB immediately if user changes it here
                                try {
                                    await supabase.from('price_tables').update({ product_definition_id: id }).eq('id', tableId);
                                    toast.success('Zaktualizowano model zadaszenia');
                                } catch (e) {
                                    console.error(e);
                                    toast.error('Błąd zapisu modelu');
                                }
                            }}
                            targetFieldName={
                                pasteOrigin.targetField === 'glass_price' ? 'Szklane' :
                                    pasteOrigin.targetField === 'structure_price' ? 'Konstrukcja' :
                                        'Cena Całkowita'
                            }
                        />
                    )
                }
            </div >
        </div >
    );
};
