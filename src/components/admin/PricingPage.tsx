import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { FileText } from 'lucide-react';

import { MatrixEditor } from './PricingMatrixEditor';
import { SimulationService, type SimulationReport } from '../../services/simulation.service';
import { formatCurrency } from '../../utils/translations';
import { ClipboardImportModal } from './ClipboardImportModal';
import { SurchargeRulesModal } from './SurchargeRulesModal';
import { DuplicateTableModal } from './DuplicateTableModal';
import { TableSettingsModal } from './TableSettingsModal';
import { ImportManual } from './ManualPriceImporter';
import { ProductEditorModal } from './ProductEditorModal';
import { ComponentsEditorModal } from './ComponentsEditorModal';
import { AddonEditor } from './AddonEditor';
import { PricingService } from '../../services/pricing.service';

export const PricingPage = () => {
    // Simplified State - Only Tables
    const [priceTables, setPriceTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTable, setEditingTable] = useState<{ id: string, name: string, type?: string } | null>(null);
    const [duplicatingTable, setDuplicatingTable] = useState<{ id: string, name: string } | null>(null);
    const [configTable, setConfigTable] = useState<{ id: string, name: string, config: any, productId?: string, productName?: string } | null>(null);
    const [settingsTable, setSettingsTable] = useState<{
        id: string;
        name: string;
        attributes: any;
        modelFamily?: string;
        zone?: number;
        coverType?: string;
        constructionType?: string;
    } | null>(null);

    // Import Modals
    const [showClipboardImport, setShowClipboardImport] = useState(false);
    const [showManualImport, setShowManualImport] = useState(false);
    const [editingProduct, setEditingProduct] = useState<string | null>(null);
    const [showComponentsEditor, setShowComponentsEditor] = useState(false);

    // Simulation State
    const [simulationReport, setSimulationReport] = useState<SimulationReport | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    const runSimulation = async (tableId: string) => {
        setIsSimulating(true);
        const toastId = toast.loading('Symulowanie wpływu na oferty...');
        try {
            const report = await SimulationService.simulateForTable(tableId);
            setSimulationReport(report);
            toast.success('Symulacja zakończona!', { id: toastId });
        } catch (e: any) {
            console.error(e);
            toast.error('Błąd symulacji: ' + e.message, { id: toastId });
        } finally {
            setIsSimulating(false);
        }
    };

    // Delete Price List
    const handleDeleteTable = async (id: string, name: string) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć cennik: "${name}"? Tej operacji nie można cofnąć.`)) {
            return;
        }

        const toastId = toast.loading('Usuwanie cennika...');

        const { error } = await supabase.from('price_tables').delete().eq('id', id);

        if (error) {
            console.error(error);
            toast.error('Błąd usuwania: ' + error.message, { id: toastId });
        } else {
            toast.success('Cennik usunięty', { id: toastId });
            fetchPriceTables();
        }
    };



    const fetchPriceTables = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('price_tables')
            .select('*, product:product_definitions(name, code)')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Błąd pobierania cenników');
            console.error(error);
        } else {
            setPriceTables(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPriceTables();
    }, []);

    const handleToggleActive = async (id: string, current: boolean) => {
        await supabase.from('price_tables').update({ is_active: !current }).eq('id', id);
        fetchPriceTables();
        toast.success(current ? 'Cennik wyłączony' : 'Cennik włączony');
    };

    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId] = useState<string>('');


    // Fetch products for dropdown
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await PricingService.getMainProducts();
                setProducts(data || []);
            } catch (error: any) {
                console.error('Product Fetch Error:', error);
                toast.error(`Błąd pobierania produktów: ${error.message}`);
            }
        };
        fetchProducts();
    }, []);

    // Bulk Import Logic
    const handleBulkImport = async (queueItems: any[]) => {
        const toastId = toast.loading(`Zapisywanie ${queueItems.length} cenników...`);
        let successCount = 0;
        let failCount = 0;

        for (const item of queueItems) {
            try {
                // 1. Create Price Table
                const subtypeStr = item.variantConfig.subtype ? ` ${item.variantConfig.subtype}` : '';
                const zoneStr = item.variantConfig.snowZone ? ` S${item.variantConfig.snowZone}` : '';
                const tableName = `${item.productName} - ${item.variantConfig.roofType === 'glass' ? 'Szkło' : 'Poliwęglan'}${zoneStr}${subtypeStr} (${format(new Date(), 'dd.MM')})`;

                // Normalization for Explicit Schema
                const rType = (item.variantConfig.roofType || 'polycarbonate').toLowerCase();
                const sub = (item.variantConfig.subtype || '').toLowerCase();
                let normalizedCover = rType.includes('glass') ? 'glass_clear' : 'poly_clear';

                if (rType.includes('glass')) {
                    if (sub.includes('opal') || sub.includes('mlecz')) normalizedCover = 'glass_opal';
                } else {
                    if (sub.includes('opal') || sub.includes('mlecz')) normalizedCover = 'poly_opal';
                    else if (sub.includes('relax') || sub.includes('iq')) normalizedCover = 'poly_iq_relax';
                    else if (sub.includes('ir')) normalizedCover = 'poly_ir_clear';
                }

                const normalizedModel = item.productName.replace(/Aluxe/i, '').replace(/_/g, ' ').trim();
                const construction = (item.variantConfig.mounting === 'freestanding' || item.variantConfig.mounting === 'free') ? 'freestanding' : 'wall';

                const { data: tableData, error: tableError } = await supabase.from('price_tables').insert({
                    name: tableName,
                    product_definition_id: item.productId,
                    variant_config: item.variantConfig,
                    type: 'matrix',
                    is_active: true,
                    currency: 'EUR',
                    attributes: item.provider ? { provider: item.provider } : {},
                    // New Explicit Fields
                    model_family: normalizedModel,
                    zone: parseInt(item.variantConfig.snowZone || '1'),
                    cover_type: normalizedCover,
                    construction_type: construction
                }).select().single();

                if (tableError) throw tableError;

                // 2. Insert Matrix Entries
                // item.matrixData.data is now array of { width, projection, price, properties }
                // Note: SmartPdfImporter might wrap it, but based on Edge Function:
                // If SmartPdfImporter saves `data.tables[0].entries` as `matrixData`, then `e` has properties.

                // We assume SmartPdfImporter passes the `entries` array directly or `matrixData.data` is that array.
                // Looking at SmartPdfImporter usage: `queueItem.matrixData = dataToUse`.
                // If dataToUse is `tables[0]`, then `entries = item.matrixData.entries`.
                // Existing code used `item.matrixData.data`. This implies a mismatch in my mental model or previous code.
                // I will try to support both `entries` and `data`.
                const rawEntries = item.matrixData.entries || item.matrixData.data || [];

                const entries = rawEntries.map((e: any) => ({
                    price_table_id: tableData.id,
                    width_mm: e.width_mm || e.width, // Support both keys
                    projection_mm: e.projection_mm || e.projection,
                    price: e.price,
                    structure_price: e.structure_price || e.price,
                    glass_price: e.glass_price || 0,
                    properties: {
                        ...(e.properties || {}),
                        // Ensure critical structural data is captured even if flattened by AI
                        area_m2: e.properties?.area_m2 || e.area_m2 || e.area,
                        posts_count: e.properties?.posts_count || e.posts_count || e.posts,
                        fields_count: e.properties?.fields_count || e.fields_count || e.fields,
                        surcharges: e.properties?.surcharges || e.surcharges || []
                    }
                }));

                const { error: entriesError } = await supabase.from('price_matrix_entries').insert(entries);
                if (entriesError) throw entriesError;

                successCount++;
            } catch (e) {
                console.error("Import error for item:", item, e);
                failCount++;
            }
        }

        if (failCount === 0) {
            toast.success(`Pomyślnie zaimportowano ${successCount} cenników!`, { id: toastId });
        } else {
            toast.success(`Zapisano ${successCount}, błędy: ${failCount}`, { id: toastId });
        }

        setShowClipboardImport(false); // Close modal (reusing state variable or assume Importer is shown via 'activeTab')
        fetchPriceTables();
    };

    // Preview / Manual Import State
    const [previewData, setPreviewData] = useState<any>(null);
    const [importAttributes, setImportAttributes] = useState<{ key: string, value: string }[]>([]);

    const updateAttribute = (idx: number, field: 'key' | 'value', val: string) => {
        const newAttrs = [...importAttributes];
        newAttrs[idx] = { ...newAttrs[idx], [field]: val };
        setImportAttributes(newAttrs);
    };

    const removeAttribute = (idx: number) => {
        setImportAttributes(importAttributes.filter((_, i) => i !== idx));
    };

    const saveImport = async () => {
        if (!previewData) return;
        const variants: any = {};
        importAttributes.forEach(a => {
            if (a.key && a.value) variants[a.key] = a.value;
        });
        const pId = selectedProductId || previewData.detected_product_name;
        const pName = products.find(p => p.id === pId)?.name || 'Nieznany Produkt';
        const queueItem = {
            id: Date.now().toString(),
            matrixData: previewData,
            productId: pId,
            productName: pName,
            variantConfig: {
                roofType: variants.roof_type || previewData.detected_attributes?.roof_type || 'polycarbonate',
                snowZone: variants.snow_zone || previewData.detected_attributes?.snow_zone || '1',
                subtype: variants.subtype || undefined
            },
            sourceFile: 'Clipboard'
        };
        await handleBulkImport([queueItem]); // Reuse bulk logic
        setPreviewData(null);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {editingTable && (
                editingTable.type === 'addons' ? (
                    <AddonEditor
                        tableId={editingTable.id}
                        tableName={editingTable.name}
                        onClose={() => setEditingTable(null)}
                    />
                ) : (
                    <MatrixEditor
                        tableId={editingTable.id}
                        tableName={editingTable.name}
                        products={products}
                        onClose={() => setEditingTable(null)}
                    />
                )
            )}

            {duplicatingTable && (
                <DuplicateTableModal
                    tableId={duplicatingTable.id}
                    sourceTableName={duplicatingTable.name}
                    products={products}
                    onClose={() => setDuplicatingTable(null)}
                    onSuccess={() => {
                        fetchPriceTables();
                        setDuplicatingTable(null);
                    }}
                />
            )}

            {previewData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <h3 className="text-xl font-bold">Weryfikacja Importu (Schowek)</h3>

                            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                                <p><strong>Liczba wierszy:</strong> {previewData.entries?.length || 0}</p>
                                <p><strong>Wykryte atrybuty:</strong> {JSON.stringify(previewData.detected_attributes)}</p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-semibold">Atrybuty Wariantu</label>
                                    <button
                                        onClick={() => setImportAttributes([...importAttributes, { key: '', value: '' }])}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        + Dodaj atrybut
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">
                                    Jeśli ta tabela dotyczy konkretnego wariantu (np. tylko 1 strefa śniegowa), dodaj to tutaj.
                                </p>

                                <div className="space-y-2">
                                    {importAttributes.map((attr, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                placeholder="Nazwa (np. snow_zone)"
                                                value={attr.key}
                                                onChange={(e) => updateAttribute(idx, 'key', e.target.value)}
                                                className="flex-1 p-2 text-sm border rounded"
                                                list="attribute-keys"
                                            />
                                            <input
                                                placeholder="Wartość (np. 1)"
                                                value={attr.value}
                                                onChange={(e) => updateAttribute(idx, 'value', e.target.value)}
                                                className="flex-1 p-2 text-sm border rounded"
                                            />
                                            <button onClick={() => removeAttribute(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded">×</button>
                                        </div>
                                    ))}
                                    <datalist id="attribute-keys">
                                        <option value="snow_zone">Strefa Śniegowa (1/2/3)</option>
                                        <option value="roof_type">Typ Dachu (poly/glass)</option>
                                        <option value="subtype">Podtyp (np. VSG Clear)</option>
                                        <option value="mounting">Montaż (wall/free)</option>
                                    </datalist>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button onClick={() => setPreviewData(null)} className="px-4 py-2 text-slate-600">Anuluj</button>
                                <button
                                    onClick={saveImport}
                                    className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                                >
                                    Zapisz Cennik
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DEBUG STATUS BAR */}
            <div className="bg-slate-800 text-white px-4 py-2 rounded-lg mb-4 flex justify-between items-center text-xs font-mono">
                <div>
                    <strong>DEBUG INFO:</strong>
                    <span className="ml-4">🔗 Projekt ID: <span className="text-yellow-400">{(supabase as any).supabaseUrl?.split('//')[1]?.split('.')[0] || 'Nieznany'}</span></span>
                    <span className="ml-4">📦 Produkty wczytane: <span className={`font-bold ${products.length === 0 ? 'text-red-400' : 'text-green-400'}`}>{products.length}</span></span>
                </div>
                <div>
                    {products.length === 0 && (
                        <span className="text-red-300">⚠️ Baza produktów pusta lub brak dostępu!</span>
                    )}
                </div>
            </div>

            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Zarządzanie Cennikami</h1>
                    <p className="text-slate-500">Edytuj ceny, importuj PDF i zarządzaj kosztami</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowComponentsEditor(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                    >
                        📚 Materiały i Elementy
                    </button>
                    <button
                        onClick={() => setShowClipboardImport(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                    >
                        📋 Import ze Schowka
                    </button>
                    <button
                        onClick={() => setShowManualImport(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-bold"
                    >
                        <FileText className="w-5 h-5" />
                        Import CSV (Manual)
                    </button>
                </div>
            </header>

            {/* CONTENT */}


            < div className="space-y-8">
                {loading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">Ładowanie...</div>
                ) : priceTables.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">Brak cenników. Zaimportuj pierwszy!</div>
                ) : (
                    <>
                        {/* 1. ADDON MATRICES (Separate Section) */}
                        {
                            priceTables.some(t => t.type === 'addon_matrix') && (
                                <div className="mb-8 border-b-2 border-slate-200 pb-8">
                                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        🧩 Cenniki Dodatków (Matrix)
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                            {priceTables.filter(t => t.type === 'addon_matrix').length}
                                        </span>
                                    </h2>
                                    {Object.entries(
                                        priceTables
                                            .filter(t => t.type === 'addon_matrix')
                                            .reduce((acc: Record<string, any[]>, table) => {
                                                const group = table.attributes?.addon_group || 'Inne';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(table);
                                                return acc;
                                            }, {})
                                    ).map(([groupName, tables]) => (
                                        <div key={groupName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
                                            <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 capitalize">
                                                    {groupName.replace(/_/g, ' ')}
                                                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                                        {tables.length} cenników
                                                    </span>
                                                </h3>
                                            </div>
                                            {/* REUSE TABLE COMPONENT OR INLINE RENDER */}
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                                    <tr>
                                                        <th className="px-6 py-3 font-semibold">Nazwa Modelu</th>
                                                        <th className="px-6 py-3 font-semibold">Aktualizacja</th>
                                                        <th className="px-6 py-3 font-semibold">Metadata</th>
                                                        <th className="px-6 py-3 font-semibold text-right">Akcje</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {tables.map(table => (
                                                        <tr key={table.id} className="hover:bg-slate-50">
                                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                                {table.name}
                                                                <div className="text-xs text-slate-400 font-normal">{table.id}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                                {format(new Date(table.created_at), 'dd.MM.yyyy HH:mm')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {table.attributes && Object.entries(table.attributes).map(([k, v]) => (
                                                                        <span key={k} className="text-[10px] bg-slate-100 px-1 rounded border">
                                                                            {k}: {String(v)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right space-x-2">
                                                                <button
                                                                    onClick={() => handleDeleteTable(table.id, table.name)}
                                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                                >
                                                                    Usuń
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingTable({ id: table.id, name: table.name, type: 'addon_matrix' })}
                                                                    className="text-accent hover:text-accent/80 text-sm font-bold"
                                                                >
                                                                    Edytuj Ceny
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            )
                        }

                        {/* 2. STANDARD ROOF LIST (Filtered) */}
                        {Object.entries(
                            priceTables
                                .filter(t => t.type !== 'addon_matrix') // Exclude Addons from main list
                                .reduce((acc: Record<string, any[]>, table) => {
                                    // Use Product Name OR Manual Model Name OR Fallback
                                    const prodName = table.product?.name || table.variant_config?.manualModel || 'Inne / Bez Konfiguracji';
                                    if (!acc[prodName]) acc[prodName] = [];
                                    acc[prodName].push(table);
                                    return acc;
                                }, {})

                        ).sort(([a], [b]) => a.localeCompare(b)).map(([productName, tables]) => (
                            <div key={productName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        📦 {productName}
                                        <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                            {tables.length} cenników
                                        </span>
                                    </h3>
                                    <button
                                        onClick={() => setEditingProduct(productName)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-white px-3 py-1 rounded border border-blue-100 shadow-sm"
                                    >
                                        ✏️ Edytuj Model / Kolory
                                    </button>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Nazwa Cennika</th>
                                            <th className="px-6 py-3 font-semibold">Producent</th>
                                            <th className="px-6 py-3 font-semibold">Aktualizacja</th>
                                            <th className="px-6 py-3 font-semibold w-32">Rabat Zak.</th>
                                            <th className="px-6 py-3 font-semibold">Atrybuty</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold text-right">Akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tables.map((table) => (
                                            <tr key={table.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {table.name}
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {/* Model Family */}
                                                        {table.model_family && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                                                {table.model_family}
                                                            </span>
                                                        )}

                                                        {/* Construction Type */}
                                                        {table.construction_type && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${table.construction_type === 'freestanding'
                                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                                }`}>
                                                                {table.construction_type === 'freestanding' ? 'Wolnostojąca' : 'Przyścienna'}
                                                            </span>
                                                        )}

                                                        {/* Cover Type */}
                                                        {table.cover_type && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${table.cover_type.includes('glass')
                                                                ? 'bg-blue-100 text-blue-600 border-blue-200'
                                                                : 'bg-orange-100 text-orange-600 border-orange-200'
                                                                }`}>
                                                                {table.cover_type}
                                                            </span>
                                                        )}

                                                        {/* Zone */}
                                                        {table.zone && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                                                S{table.zone}
                                                            </span>
                                                        )}

                                                        {/* Warning if missing */}
                                                        {/* Warning if missing */}
                                                        {!table.model_family && !table.variant_config?.manualModel && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold border border-red-200 animate-pulse">
                                                                ⚠️ Brak Mapowania
                                                            </span>
                                                        )}

                                                        {/* Legacy Fallback Badge */}
                                                        {!table.model_family && table.variant_config?.manualModel && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200" title="Legacy Mapping from variant_config">
                                                                (Legacy) {table.variant_config.manualModel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {table.attributes?.provider && (
                                                        <span className={`text-xs px-2 py-1 rounded-full font-bold border ${table.attributes.provider === 'Aluxe' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                            table.attributes.provider === 'Deponti' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>
                                                            {table.attributes.provider}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">
                                                    {table.created_at ? format(new Date(table.created_at), 'd MMM yyyy', { locale: pl }) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {/* Inline Discount Editor */}
                                                    <div className="flex items-center gap-1 group relative">
                                                        <input
                                                            type="text"
                                                            placeholder="0"
                                                            className="w-16 px-2 py-1 text-sm border border-slate-200 rounded text-center focus:border-accent focus:outline-none"
                                                            defaultValue={table.attributes?.discount || ''}
                                                            onBlur={async (e) => {
                                                                const val = e.target.value;
                                                                if (val === table.attributes?.discount) return;

                                                                // Update attributes
                                                                const newAttrs = { ...table.attributes, discount: val };
                                                                const { error } = await supabase.from('price_tables').update({ attributes: newAttrs }).eq('id', table.id);

                                                                if (error) {
                                                                    toast.error('Błąd zapisu rabatu');
                                                                } else {
                                                                    toast.success('Zapisano rabat');
                                                                    fetchPriceTables();
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-slate-400 text-xs">%</span>

                                                        {/* Calculate Effective Discount Tooltip */}
                                                        {table.attributes?.discount && table.attributes.discount.includes('+') && (
                                                            <div className="absolute left-full ml-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                                                                Efektywnie: {(() => {
                                                                    try {
                                                                        const parts = table.attributes.discount.split('+').map((p: string) => parseFloat(p));
                                                                        const multiplier = parts.reduce((acc: number, curr: number) => acc * (1 - (curr / 100)), 1);
                                                                        return ((1 - multiplier) * 100).toFixed(2) + '%';
                                                                    } catch { return '?'; }
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {table.attributes && Object.entries(table.attributes).map(([key, val]) => {
                                                            if (typeof val === 'object') return null;
                                                            if (key === 'provider') return null; // Already shown in name column
                                                            if (key === 'discount') return null; // Shown in dedicated column
                                                            return (
                                                                <span key={key} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                                                                    {key}: <strong>{val as string}</strong>
                                                                </span>
                                                            );
                                                        })}
                                                        {(!table.attributes || Object.keys(table.attributes).length === 0) && (
                                                            <span className="text-xs text-slate-400 italic">Baza (Domyślny)</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleToggleActive(table.id, table.is_active)}
                                                        className={`text-xs font-bold px-2 py-1 rounded-full border ${table.is_active
                                                            ? 'bg-green-100 text-green-700 border-green-200'
                                                            : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                                    >
                                                        {table.is_active ? 'AKTYWNY' : 'NIEAKTYWNY'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => runSimulation(table.id)}
                                                        disabled={isSimulating}
                                                        className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50"
                                                    >
                                                        {isSimulating ? 'Symulowanie...' : 'Symuluj'}
                                                    </button>
                                                    <button
                                                        onClick={() => setSettingsTable({
                                                            id: table.id,
                                                            name: table.name,
                                                            attributes: table.attributes || {},
                                                            modelFamily: table.model_family,
                                                            zone: table.zone,
                                                            coverType: table.cover_type,
                                                            constructionType: table.construction_type
                                                        })}
                                                        className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1"
                                                    >
                                                        Ustawienia
                                                    </button>
                                                    <button
                                                        onClick={() => setConfigTable({
                                                            id: table.id,
                                                            name: table.name,
                                                            config: table.configuration || {},
                                                            productId: table.product_definition_id,
                                                            productName: table.product?.name
                                                        })}
                                                        className="text-sm font-medium text-violet-600 hover:text-violet-800 hover:underline flex items-center gap-1"
                                                    >
                                                        Reguły
                                                    </button>
                                                    <button
                                                        onClick={() => setDuplicatingTable({ id: table.id, name: table.name })}
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        Kopiuj
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTable(table.id, table.name)}
                                                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                                                    >
                                                        Usuń
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingTable({ id: table.id, name: table.name, type: table.type })}
                                                        className="text-sm font-medium text-accent hover:text-accent/80 hover:underline"
                                                    >
                                                        Edytuj
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))
                        }
                    </>
                )}
            </div>


            {/* Simulation Results Modal */}
            {
                simulationReport && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Raport Symulacji Zmiany Cen</h3>
                                <button onClick={() => setSimulationReport(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded text-center">
                                    <div className="text-sm text-slate-500">Przeanalizowano</div>
                                    <div className="text-2xl font-bold text-slate-900">{simulationReport.totalOffers} ofert</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded text-center">
                                    <div className="text-sm text-slate-500">Średnia zmiana</div>
                                    <div className={`text-2xl font-bold ${simulationReport.avgChangePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {simulationReport.avgChangePercent > 0 ? '+' : ''}{simulationReport.avgChangePercent.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded text-center">
                                    <div className="text-sm text-slate-500">Różnica wartości (Total)</div>
                                    <div className={`text-2xl font-bold ${simulationReport.totalDiffValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {simulationReport.totalDiffValue > 0 ? '+' : ''}{formatCurrency(simulationReport.totalDiffValue)}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold">Oferta</th>
                                            <th className="p-3 font-semibold">Stara Cena Bazowa</th>
                                            <th className="p-3 font-semibold">Nowa Cena Bazowa</th>
                                            <th className="p-3 font-semibold text-right">Różnica</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {simulationReport.results.map((r) => (
                                            <tr key={r.offerId} className="hover:bg-slate-50">
                                                <td className="p-3">
                                                    <div className="font-medium">{r.offerNumber}</div>
                                                    <div className="text-slate-500 text-xs">{r.customerName}</div>
                                                </td>
                                                <td className="p-3 text-slate-500">{formatCurrency(r.oldPrice)}</td>
                                                <td className="p-3 font-medium">{formatCurrency(r.newPrice)}</td>
                                                <td className={`p-3 text-right font-bold ${r.diffValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {r.diffValue > 0 ? '+' : ''}{formatCurrency(r.diffValue)} ({r.diffPercent.toFixed(1)}%)
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setSimulationReport(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded font-medium">Zamknij raport</button>
                            </div>
                        </div>
                    </div>
                )
            }



            {
                showClipboardImport && (
                    <ClipboardImportModal
                        onClose={() => setShowClipboardImport(false)}
                        onSave={(data, attributes) => {
                            setPreviewData({
                                detected_product_name: '',
                                detected_attributes: {
                                    ...attributes
                                },
                                entries: data,
                                currency: 'EUR',
                                surcharges: [],
                                notes: 'Zaimportowano ze schowka'
                            });

                            if (attributes) {
                                const newAttrs: { key: string, value: string }[] = [];
                                Object.entries(attributes).forEach(([k, v]) => {
                                    if (v) newAttrs.push({ key: k, value: String(v) });
                                });
                                setImportAttributes(newAttrs);
                            }

                            setShowClipboardImport(false);
                            toast.success('Dane wczytane do podglądu. Uzupełnij atrybuty i zapisz.');
                        }}
                        products={products}
                    />
                )
            }



            {
                showManualImport && (
                    <ImportManual
                        isOpen={true}
                        onClose={() => setShowManualImport(false)}
                        products={products}
                        onSuccess={fetchPriceTables} // Refresh list after save
                    />
                )
            }

            {
                configTable && (
                    <SurchargeRulesModal
                        isOpen={!!configTable}
                        tableId={configTable.id}
                        tableName={configTable.name}
                        initialConfig={configTable.config}
                        productId={configTable.productId}
                        productName={configTable.productName}
                        onClose={() => setConfigTable(null)}
                        onSave={fetchPriceTables}
                    />
                )
            }

            {
                settingsTable && (
                    <TableSettingsModal
                        isOpen={!!settingsTable}
                        tableId={settingsTable.id}
                        tableName={settingsTable.name}
                        initialAttributes={settingsTable.attributes}
                        initialModelFamily={settingsTable.modelFamily}
                        initialZone={settingsTable.zone}
                        initialCoverType={settingsTable.coverType}
                        initialConstructionType={settingsTable.constructionType}
                        onClose={() => setSettingsTable(null)}
                        onSave={fetchPriceTables}
                    />
                )
            }

            {
                editingProduct && (
                    <ProductEditorModal
                        isOpen={!!editingProduct}
                        productName={editingProduct}
                        onClose={() => setEditingProduct(null)}
                        onSuccess={() => {
                            // Refresh products
                            const fetchProducts = async () => {
                                const data = await PricingService.getMainProducts();
                                setProducts(data || []);
                            };
                            fetchProducts();
                            setEditingProduct(null);
                        }}
                    />
                )
            }

            {
                showComponentsEditor && (
                    <ComponentsEditorModal
                        isOpen={showComponentsEditor}
                        onClose={() => setShowComponentsEditor(false)}
                    />
                )
            }

            {
                editingTable && editingTable.type === 'addon_matrix' && (
                    <AddonEditor
                        tableId={editingTable.id}
                        tableName={editingTable.name}
                        onClose={() => setEditingTable(null)}
                    />
                )
            }

            {
                editingTable && editingTable.type !== 'addon_matrix' && (
                    <MatrixEditor
                        tableId={editingTable.id}
                        tableName={editingTable.name}
                        onClose={() => setEditingTable(null)}
                    />
                )
            }


        </div >
    );
};
