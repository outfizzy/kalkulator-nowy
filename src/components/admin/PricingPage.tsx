import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

// Icons
const IconUpload = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const IconPlus = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;

import { MatrixEditor } from './PricingMatrixEditor';
import { SupplierCostsManager } from './SupplierCostsManager';
import { SimulationService, type SimulationReport } from '../../services/simulation.service';
import { AdditionalCostsManager } from './AdditionalCostsManager';
import { formatCurrency } from '../../utils/translations';

export const PricingPage = () => {
    const [activeTab, setActiveTab] = useState<'tables' | 'import' | 'costs' | 'surcharges'>('tables');
    const [priceTables, setPriceTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTable, setEditingTable] = useState<{ id: string, name: string } | null>(null);

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
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [newProductName, setNewProductName] = useState<string>('');

    // Fetch products for dropdown
    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase.from('product_definitions').select('id, name').order('name');
            setProducts(data || []);
        };
        fetchProducts();
    }, []);

    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [importAttributes, setImportAttributes] = useState<{ key: string, value: string }[]>([]);

    const addAttribute = () => {
        setImportAttributes([...importAttributes, { key: '', value: '' }]);
    };

    const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
        const newAttrs = [...importAttributes];
        newAttrs[index][field] = val;
        setImportAttributes(newAttrs);
    };

    const removeAttribute = (index: number) => {
        setImportAttributes(importAttributes.filter((_, i) => i !== index));
    };

    const handleFileUpload = async (file: File) => {
        setImporting(true);
        const toastId = toast.loading('Analizowanie PDF przez AI... (To może potrwać do 30s)');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const { data, error } = await supabase.functions.invoke('parse-price-pdf', {
                body: formData
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setPreviewData(data);

            // Try to auto-match product
            if (data.detected_product_name) {
                const match = products.find(p => p.name.toLowerCase().includes(data.detected_product_name.toLowerCase()));
                if (match) {
                    setSelectedProductId(match.id);
                } else {
                    setSelectedProductId('new');
                    setNewProductName(data.detected_product_name);
                }
            }

            // Auto-fill attributes
            if (data.detected_attributes) {
                const newAttrs: { key: string, value: string }[] = [];
                if (data.detected_attributes.snow_zone) {
                    newAttrs.push({ key: 'snow_zone', value: String(data.detected_attributes.snow_zone) });
                }
                if (data.detected_attributes.roof_type) {
                    newAttrs.push({ key: 'roof_type', value: data.detected_attributes.roof_type });
                }
                if (data.detected_attributes.mounting) {
                    newAttrs.push({ key: 'mounting', value: data.detected_attributes.mounting });
                }
                if (newAttrs.length > 0) {
                    setImportAttributes(newAttrs);
                    toast.success(`Wykryto atrybuty: ${newAttrs.map(a => `${a.key}=${a.value}`).join(', ')}`);
                }
            }

            toast.success('Pomyślnie przeanalizowano plik!', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(`Błąd: ${err.message}`, { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    const saveImport = async () => {
        if (!previewData) return;

        let finalProductId = selectedProductId;
        let finalProductName = '';

        // Handle "New Product" creation
        if (selectedProductId === 'new') {
            if (!newProductName) {
                toast.error('Podaj nazwę nowego produktu');
                return;
            }
            const code = newProductName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const { data: newProd, error: pErr } = await supabase.from('product_definitions').insert({
                name: newProductName,
                code: code + '_' + Date.now(), // Ensure uniqueness
                category: 'awning', // Default, maybe ask?
                provider: 'Inny'
            }).select().single();

            if (pErr) {
                toast.error('Błąd tworzenia produktu: ' + pErr.message);
                return;
            }
            finalProductId = newProd.id;
            finalProductName = newProductName;
        } else {
            // Existing
            finalProductName = products.find(p => p.id === selectedProductId)?.name || '';
        }

        if (!finalProductId) {
            toast.error('Wybierz produkt!');
            return;
        }

        const name = prompt('Podaj nazwę dla tego cennika (np. Cennik 2025):', `Cennik ${finalProductName} ${new Date().getFullYear()}`);
        if (!name) return;

        const { data: table, error: tErr } = await supabase.from('price_tables').insert({
            name: name,
            product_definition_id: finalProductId,
            type: 'matrix',
            attributes: importAttributes.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
            is_active: false // Start inactive so user can check
        }).select().single();

        if (tErr) {
            toast.error('Błąd tworzenia tabeli cennika');
            return;
        }

        // 2. Insert Entries
        const entries = previewData.entries.map((e: any) => ({
            price_table_id: table.id,
            width_mm: e.width_mm,
            projection_mm: e.projection_mm,
            price: e.price
        }));

        const { error: eErr } = await supabase.from('price_matrix_entries').insert(entries);

        if (eErr) {
            toast.error('Błąd zapisu cen');
        } else {
            toast.success('Cennik zaimportowany i przypisany!');
            setPreviewData(null);
            setNewProductName('');
            setSelectedProductId('');
            setImportAttributes([]);
            setActiveTab('tables');
            fetchPriceTables();
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {editingTable && (
                <MatrixEditor
                    tableId={editingTable.id}
                    tableName={editingTable.name}
                    onClose={() => setEditingTable(null)}
                />
            )}

            {/* Import Preview Modal */}
            {previewData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                        <h3 className="text-xl font-bold mb-4">Podgląd Importu AI</h3>
                        <p className="mb-4 text-sm text-slate-500">
                            Wykryto {previewData.entries.length} pozycji cenowych.
                            Pewność: {previewData.confidence}%.
                        </p>
                        <div className="bg-slate-50 p-4 rounded mb-4 overflow-auto max-h-60 border border-slate-200">
                            <pre className="text-xs">{JSON.stringify(previewData.entries.slice(0, 5), null, 2)} ... i więcej</pre>
                        </div>

                        {/* Import Preview & Configuration */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200">
                            <h3 className="text-lg font-bold mb-4">Konfiguracja Cennika</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Produkt</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                    >
                                        <option value="">-- Wybierz produkt --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        <option value="new">+ Utwórz nowy produkt (wykryto: {previewData.detected_product_name})</option>
                                    </select>
                                </div>

                                {selectedProductId === 'new' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa Nowego Produktu</label>
                                        <input
                                            type="text"
                                            value={newProductName}
                                            onChange={(e) => setNewProductName(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Attributes Section */}
                            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-bold text-slate-700">Warianty / Atrybuty (Exact Match)</h4>
                                    <button onClick={addAttribute} className="text-xs text-accent hover:underline">+ Dodaj atrybut</button>
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

            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Zarządzanie Cennikami</h1>
                    <p className="text-slate-500">Edytuj ceny, importuj PDF i zarządzaj kosztami</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('import')}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
                    >
                        <IconUpload /> Importuj PDF (AI)
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                        <IconPlus /> Nowy Pusty Cennik
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('tables')}
                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'tables' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Aktywne Cenniki
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'import' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Import AI
                </button>
                <button
                    onClick={() => setActiveTab('costs')}
                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'costs' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-600'}`}
                >
                    Koszty Dostawców (Logistyka)
                </button>
                <button
                    onClick={() => setActiveTab('surcharges')}
                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'surcharges' ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-600'}`}
                >
                    Cennik Dopłat (Exact)
                </button>
            </div>

            {/* CONTENT */}
            {activeTab === 'tables' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nazwa</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Produkt</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Ważny od</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Warianty</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Ładowanie...</td></tr>
                            ) : priceTables.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Brak cenników. Zaimportuj pierwszy!</td></tr>
                            ) : (
                                priceTables.map((table) => (
                                    <tr key={table.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900">{table.name}</td>
                                        <td className="p-4 text-slate-600 badge">
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{table.product?.name || 'Nieznany'}</span>
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm">
                                            {table.valid_from ? format(new Date(table.valid_from), 'd MMM yyyy', { locale: pl }) : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {table.attributes && Object.entries(table.attributes).map(([key, val]) => (
                                                    <span key={key} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                                                        {key}: <strong>{val as string}</strong>
                                                    </span>
                                                ))}
                                                {(!table.attributes || Object.keys(table.attributes).length === 0) && (
                                                    <span className="text-xs text-slate-400 italic">Baza (Domyślny)</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleToggleActive(table.id, table.is_active)}
                                                className={`text-xs font-bold px-2 py-1 rounded-full border ${table.is_active
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                            >
                                                {table.is_active ? 'AKTYWNY' : 'NIEAKTYWNY'}
                                            </button>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => runSimulation(table.id)}
                                                disabled={isSimulating}
                                                className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50"
                                            >
                                                {isSimulating ? 'Symulowanie...' : 'Symuluj'}
                                            </button>
                                            <button
                                                onClick={() => setEditingTable({ id: table.id, name: table.name })}
                                                className="text-sm font-medium text-accent hover:text-accent/80 hover:underline"
                                            >
                                                Edytuj
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Simulation Results Modal */}
            {simulationReport && (
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
            )}

            {activeTab === 'costs' && <SupplierCostsManager />}
            {activeTab === 'surcharges' && <AdditionalCostsManager />}

            {activeTab === 'import' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconUpload />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Wgraj Cennik PDF</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Nasza sztuczna inteligencja przeanalizuje dokument, wykryje tabelki z cenami i pozwoli Ci je zweryfikować przed zapisaniem.
                    </p>

                    <label className="inline-block relative">
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            disabled={importing}
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                            }}
                        />
                        <span className={`px-6 py-3 bg-accent text-white rounded-lg font-bold cursor-pointer hover:bg-accent/90 shadow-md ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {importing ? 'Analizowanie...' : 'Wybierz plik z dysku'}
                        </span>
                    </label>
                </div>
            )}
        </div>
    );
};
