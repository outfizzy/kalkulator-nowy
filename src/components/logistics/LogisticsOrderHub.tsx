import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/database';
import { StorageService } from '../../services/database/storage.service';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { Contract, OrderedItem } from '../../types';

// ── Flat item with contract context ──
interface FlatOrderItem extends OrderedItem {
    contractId: string;
    contractNumber: string;
    clientName: string;
    clientCity: string;
    salesRepName: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
    pending: { label: 'Oczekuje', icon: '⏳', bg: 'bg-amber-50', color: 'text-amber-700' },
    ordered: { label: 'Zamówione', icon: '📦', bg: 'bg-blue-50', color: 'text-blue-700' },
    in_production: { label: 'W Produkcji', icon: '🏭', bg: 'bg-purple-50', color: 'text-purple-700' },
    shipped: { label: 'Wysłane', icon: '🚚', bg: 'bg-teal-50', color: 'text-teal-700' },
    delivered: { label: 'Dostarczone', icon: '✅', bg: 'bg-green-50', color: 'text-green-700' },
};

const SUPPLIERS = ['Aluxe', 'Sonnenschein', 'Solisio', 'Warema', 'Heroal', 'Schüco', 'Somfy', 'Weinor', 'MLL', 'Inny'];

export const LogisticsOrderHub: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSupplier, setFilterSupplier] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

    // Batch order form
    const [batchSupplier, setBatchSupplier] = useState('');
    const [batchPrice, setBatchPrice] = useState('');
    const [batchDeliveryDate, setBatchDeliveryDate] = useState('');
    const [batchDeliveryWeek, setBatchDeliveryWeek] = useState('');
    const [batchOrderRef, setBatchOrderRef] = useState('');

    // ── Load all contracts ──
    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        try {
            setLoading(true);
            const data = await DatabaseService.getContracts();
            // Only keep contracts with ordered items
            setContracts(data.filter(c => c.orderedItems && c.orderedItems.length > 0));
        } catch {
            toast.error('Błąd ładowania umów');
        } finally {
            setLoading(false);
        }
    };

    // ── Flatten all items across contracts ──
    const flatItems = useMemo<FlatOrderItem[]>(() => {
        const items: FlatOrderItem[] = [];
        contracts.forEach(contract => {
            (contract.orderedItems || []).forEach(item => {
                items.push({
                    ...item,
                    contractId: contract.id,
                    contractNumber: contract.contractNumber || '—',
                    clientName: `${contract.client.firstName} ${contract.client.lastName}`,
                    clientCity: contract.client.city || '',
                    salesRepName: contract.salesRepName || '',
                });
            });
        });
        return items;
    }, [contracts]);

    // ── Filtered items ──
    const filteredItems = useMemo(() => {
        let result = flatItems;
        if (filterStatus !== 'all') result = result.filter(i => i.status === filterStatus);
        if (filterSupplier !== 'all') result = result.filter(i => i.supplier === filterSupplier);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.clientName.toLowerCase().includes(q) ||
                i.contractNumber.toLowerCase().includes(q) ||
                (i.supplier || '').toLowerCase().includes(q) ||
                (i.orderReference || '').toLowerCase().includes(q)
            );
        }
        return result;
    }, [flatItems, filterStatus, filterSupplier, searchQuery]);

    // ── Stats ──
    const stats = useMemo(() => ({
        total: flatItems.length,
        pending: flatItems.filter(i => i.status === 'pending').length,
        ordered: flatItems.filter(i => i.status === 'ordered').length,
        inProduction: flatItems.filter(i => i.status === 'in_production').length,
        shipped: flatItems.filter(i => i.status === 'shipped').length,
        delivered: flatItems.filter(i => i.status === 'delivered').length,
    }), [flatItems]);

    // ── Update an item in its contract ──
    const updateItem = async (item: FlatOrderItem, updates: Partial<OrderedItem>) => {
        const contract = contracts.find(c => c.id === item.contractId);
        if (!contract) return;

        const newItems = (contract.orderedItems || []).map(i =>
            i.id === item.id ? { ...i, ...updates } : i
        );

        try {
            await DatabaseService.updateContract(contract.id, { ...contract, orderedItems: newItems } as any);
            setContracts(prev => prev.map(c =>
                c.id === contract.id ? { ...c, orderedItems: newItems } : c
            ));
        } catch {
            toast.error('Błąd zapisu');
        }
    };

    // ── Batch order ──
    const handleBatchOrder = async () => {
        if (selectedIds.size === 0) return;
        const groupId = crypto.randomUUID();
        const totalPrice = parseFloat(batchPrice) || 0;
        const perItemPrice = totalPrice / selectedIds.size;

        // Group items by contract
        const contractUpdates = new Map<string, { contract: Contract; items: OrderedItem[] }>();

        contracts.forEach(contract => {
            const updatedItems = (contract.orderedItems || []).map(item => {
                if (!selectedIds.has(item.id)) return item;
                return {
                    ...item,
                    status: 'ordered' as const,
                    supplier: batchSupplier || item.supplier,
                    purchaseCost: perItemPrice || item.purchaseCost,
                    plannedDeliveryDate: batchDeliveryDate || item.plannedDeliveryDate,
                    deliveryWeek: batchDeliveryWeek || item.deliveryWeek,
                    orderReference: batchOrderRef || item.orderReference,
                    orderedAt: new Date().toISOString(),
                    orderGroupId: groupId,
                    orderGroupTotal: totalPrice,
                };
            });

            // Check if any items were updated
            if (updatedItems.some((item, idx) => item !== (contract.orderedItems || [])[idx])) {
                contractUpdates.set(contract.id, { contract, items: updatedItems });
            }
        });

        try {
            for (const [contractId, { contract, items }] of contractUpdates) {
                await DatabaseService.updateContract(contractId, { ...contract, orderedItems: items } as any);
            }

            setContracts(prev => prev.map(c => {
                const upd = contractUpdates.get(c.id);
                return upd ? { ...c, orderedItems: upd.items } : c;
            }));

            toast.success(`📦 Zamówiono ${selectedIds.size} pozycji w grupie`);
            setSelectedIds(new Set());
            setSelectionMode(false);
            setBatchSupplier('');
            setBatchPrice('');
            setBatchDeliveryDate('');
            setBatchDeliveryWeek('');
            setBatchOrderRef('');
        } catch {
            toast.error('Błąd zamówienia grupowego');
        }
    };

    // ── File Upload ──
    const handleFileUpload = async (item: FlatOrderItem, file: File) => {
        setUploadingItemId(item.id);
        try {
            const url = await StorageService.uploadFile(file, 'attachments', `contracts/${item.contractId}/orders`);
            const doc = { name: file.name, url, uploadedAt: new Date().toISOString() };
            await updateItem(item, { orderDocuments: [...(item.orderDocuments || []), doc] });
            toast.success(`Dokument "${file.name}" dodany`);
        } catch {
            toast.error('Błąd przesyłania pliku');
        } finally {
            setUploadingItemId(null);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // ── Unique suppliers from data ──
    const usedSuppliers = useMemo(() =>
        [...new Set(flatItems.map(i => i.supplier).filter(Boolean))] as string[],
        [flatItems]
    );

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">📦 Zarządzanie Zamówieniami</h1>
                    <p className="text-sm text-slate-500 mt-1">Wszystkie pozycje ze wszystkich umów w jednym miejscu</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/logistics" className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">
                        📅 Kalendarz
                    </Link>
                    <button
                        onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors border ${selectionMode
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                    >
                        {selectionMode ? `✕ Anuluj (${selectedIds.size})` : '☑ Zamów Grupowo'}
                    </button>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Wszystkie', value: stats.total, color: 'slate', filter: 'all' },
                    { label: 'Oczekujące', value: stats.pending, color: 'amber', filter: 'pending' },
                    { label: 'Zamówione', value: stats.ordered, color: 'blue', filter: 'ordered' },
                    { label: 'W Produkcji', value: stats.inProduction, color: 'purple', filter: 'in_production' },
                    { label: 'Wysłane', value: stats.shipped, color: 'teal', filter: 'shipped' },
                    { label: 'Dostarczone', value: stats.delivered, color: 'green', filter: 'delivered' },
                ].map(stat => (
                    <button
                        key={stat.filter}
                        onClick={() => setFilterStatus(stat.filter)}
                        className={`p-3 rounded-xl border text-left transition-all ${filterStatus === stat.filter
                            ? `bg-${stat.color}-50 border-${stat.color}-300 ring-2 ring-${stat.color}-200`
                            : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</div>
                    </button>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3 items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="🔍 Szukaj po nazwie, kliencie, nr umowy, dostawcy..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    />
                </div>
                <select
                    value={filterSupplier}
                    onChange={e => setFilterSupplier(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                    <option value="all">Wszystkie dostawcy</option>
                    {usedSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-xs text-slate-400 font-bold">{filteredItems.length} pozycji</span>
            </div>

            {/* ── Batch Order Panel ── */}
            {selectionMode && selectedIds.size > 0 && (
                <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-300 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-indigo-900">🔗 Zamówienie Grupowe — {selectedIds.size} pozycji</h3>
                        <button onClick={() => {
                            // Select all visible
                            const allIds = new Set(filteredItems.map(i => i.id));
                            setSelectedIds(allIds);
                        }} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">
                            Zaznacz wszystkie ({filteredItems.length})
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Dostawca</label>
                            <select value={batchSupplier} onChange={e => setBatchSupplier(e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white">
                                <option value="">— Wybierz —</option>
                                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Kwota Razem (EUR)</label>
                            <input type="number" step="0.01" value={batchPrice} onChange={e => setBatchPrice(e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" placeholder="0.00" />
                            {batchPrice && selectedIds.size > 1 && (
                                <span className="text-[9px] text-indigo-500">≈ {(parseFloat(batchPrice) / selectedIds.size).toFixed(2)} €/szt.</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Termin Dostawy</label>
                            <input type="date" value={batchDeliveryDate} onChange={e => setBatchDeliveryDate(e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tydzień (KW)</label>
                            <input value={batchDeliveryWeek} onChange={e => setBatchDeliveryWeek(e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" placeholder="np. KW 15" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Nr Zamówienia</label>
                            <input value={batchOrderRef} onChange={e => setBatchOrderRef(e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" placeholder="np. ALX-2026-0124" />
                        </div>
                    </div>
                    <button
                        onClick={handleBatchOrder}
                        className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                        📦 Zamów {selectedIds.size} Pozycji Razem
                    </button>
                </div>
            )}

            {/* ── Items List ── */}
            <div className="space-y-2">
                {filteredItems.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                        <p className="text-slate-400 text-sm">Brak pozycji do wyświetlenia</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                        const isExpanded = expandedItemId === item.id;
                        const isSelected = selectedIds.has(item.id);

                        return (
                            <div key={`${item.contractId}-${item.id}`} className={`bg-white rounded-xl border overflow-hidden transition-all ${isSelected ? 'ring-2 ring-indigo-400 border-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                {/* Row */}
                                <div
                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => selectionMode ? toggleSelection(item.id) : setExpandedItemId(isExpanded ? null : item.id)}
                                >
                                    {selectionMode && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelection(item.id)}
                                            className="w-4 h-4 text-indigo-600 rounded flex-shrink-0"
                                            onClick={e => e.stopPropagation()}
                                        />
                                    )}
                                    <span className="text-sm">{sc.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-slate-800">{item.name}</span>
                                            {(item.quantity || 1) > 1 && (
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">×{item.quantity}</span>
                                            )}
                                            {(item as any).orderGroupId && (
                                                <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-200">🔗 Grupa</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                            <Link
                                                to={`/contracts/${item.contractId}`}
                                                className="text-blue-500 hover:text-blue-700 font-mono font-bold"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {item.contractNumber}
                                            </Link>
                                            <span>👤 {item.clientName}</span>
                                            {item.clientCity && <span>📍 {item.clientCity}</span>}
                                        </div>
                                    </div>

                                    {/* Quick Info */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {item.supplier && (
                                            <span className="hidden sm:inline text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold border border-purple-200">{item.supplier}</span>
                                        )}
                                        {item.purchaseCost ? (
                                            <span className="hidden sm:inline text-[10px] font-bold text-slate-600">{item.purchaseCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                        ) : null}
                                        {item.deliveryWeek && (
                                            <span className="hidden sm:inline text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{item.deliveryWeek}</span>
                                        )}
                                        {(item.orderDocuments || []).length > 0 && (
                                            <span className="text-[10px]" title={`${item.orderDocuments!.length} dokument(ów)`}>📎{item.orderDocuments!.length}</span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded Form */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                                        {/* Details banner */}
                                        {item.details && (
                                            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                                                <span className="text-sm flex-shrink-0">📋</span>
                                                <div className="whitespace-pre-wrap">{item.details}</div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {/* Supplier */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dostawca</label>
                                                <select value={item.supplier || ''} onChange={e => updateItem(item, { supplier: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm bg-white">
                                                    <option value="">— Wybierz —</option>
                                                    {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            {/* Order Ref */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nr Zamówienia</label>
                                                <input value={item.orderReference || ''} onChange={e => updateItem(item, { orderReference: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" placeholder="ALX-2026-0124" />
                                            </div>
                                            {/* Cost */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Koszt Zakupu (EUR)</label>
                                                <input type="number" step="0.01" value={item.purchaseCost || ''} onChange={e => updateItem(item, { purchaseCost: parseFloat(e.target.value) || 0 })} className="w-full p-1.5 border rounded-lg text-sm text-right" placeholder="0.00" />
                                            </div>
                                            {/* Status */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                                                <select value={item.status} onChange={e => updateItem(item, { status: e.target.value as OrderedItem['status'] })} className="w-full p-1.5 border rounded-lg text-sm bg-white">
                                                    <option value="pending">⏳ Oczekuje</option>
                                                    <option value="ordered">📦 Zamówione</option>
                                                    <option value="in_production">🏭 W Produkcji</option>
                                                    <option value="shipped">🚚 Wysłane</option>
                                                    <option value="delivered">✅ Dostarczone</option>
                                                </select>
                                            </div>
                                            {/* Delivery Date */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Planowana Dostawa</label>
                                                <input type="date" value={item.plannedDeliveryDate || ''} onChange={e => updateItem(item, { plannedDeliveryDate: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" />
                                            </div>
                                            {/* KW */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tydzień (KW)</label>
                                                <input value={item.deliveryWeek || ''} onChange={e => updateItem(item, { deliveryWeek: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" placeholder="KW 15" />
                                            </div>
                                            {/* Technical Spec */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Specyfikacja</label>
                                                <div className="text-sm text-slate-700 font-mono p-1.5">{item.technicalSpec || '—'}</div>
                                            </div>
                                            {/* Qty */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ilość</label>
                                                <div className="text-sm font-medium text-slate-800 p-1.5">{item.quantity || 1}</div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notatki</label>
                                            <textarea value={item.notes || ''} onChange={e => updateItem(item, { notes: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm resize-none" rows={2} placeholder="Dodatkowe uwagi..." />
                                        </div>

                                        {/* ── Documents ── */}
                                        <div className="pt-3 border-t border-slate-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">📄 Dokumenty Zamówieniowe</label>
                                                <label className={`text-[10px] font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors ${uploadingItemId === item.id ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                                        className="hidden"
                                                        disabled={uploadingItemId === item.id}
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(item, file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    {uploadingItemId === item.id ? '⏳ Wysyłanie...' : '📎 Dodaj Dokument'}
                                                </label>
                                            </div>
                                            {(item.orderDocuments || []).length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {(item.orderDocuments || []).map((doc, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 group">
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 truncate">
                                                                <span>{doc.name.endsWith('.pdf') ? '📄' : doc.name.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📎'}</span>
                                                                <span className="truncate">{doc.name}</span>
                                                            </a>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('de-DE')}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const docs = (item.orderDocuments || []).filter(d => d.url !== doc.url);
                                                                        updateItem(item, { orderDocuments: docs });
                                                                        toast.success('Dokument usunięty');
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 italic">Brak dokumentów</p>
                                            )}
                                        </div>

                                        {/* Contract link */}
                                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                                            <div className="flex items-center gap-3">
                                                <span>📋 Umowa: <Link to={`/contracts/${item.contractId}`} className="text-blue-500 hover:text-blue-700 font-bold">{item.contractNumber}</Link></span>
                                                <span>👤 {item.clientName}</span>
                                                {item.salesRepName && <span>🏢 {item.salesRepName}</span>}
                                            </div>
                                            {item.orderedAt && (
                                                <span>📦 {new Date(item.orderedAt).toLocaleDateString('de-DE')}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
