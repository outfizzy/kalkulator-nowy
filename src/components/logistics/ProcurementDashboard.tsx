import React, { useState, useEffect } from 'react';
import { ProcurementService } from '../../services/database/procurement.service';
import { StorageService } from '../../services/database/storage.service';
import type { ProcurementItem, OrderedItem } from '../../types';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// ── Types ──
interface ContractGroup {
    sourceType: string;
    sourceId: string;
    referenceNumber: string;
    clientName: string;
    clientCity?: string;
    salesRepName?: string;
    signedAt?: string;
    advancePaid: boolean;
    advanceAmount: number;
    plannedInstallationWeeks?: number;
    items: ProcurementItem[];
    stats: { pending: number; ordered: number; delivered: number; totalCost: number };
}

interface OrderFormData {
    purchaseCost: string;
    delivery_week: string;
    confirmed_delivery_date: string;
    orderReference: string;
    notes: string;
    supplier: string;
}

const EMPTY_ORDER_FORM: OrderFormData = { purchaseCost: '', delivery_week: '', confirmed_delivery_date: '', orderReference: '', notes: '', supplier: '' };

const FALLBACK_SUPPLIERS = ['Aluxe', 'Deponti', 'Selt', 'Aliplast', 'Exlabesa', 'WPC Żary', 'Inny'];

// ── Helpers ──
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    'pending': { label: 'Oczekuje', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '⏳' },
    'ordered': { label: 'Zamówione', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '📦' },
    'delivered': { label: 'Dostarczone', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '✅' },
};

const SOURCE_LABELS: Record<string, string> = { contract: 'UMOWA', installation: 'MONTAŻ', inventory: 'MAGAZYN' };

export const ProcurementDashboard: React.FC = () => {
    const [items, setItems] = useState<ProcurementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Expanded contracts
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Order modal
    const [orderingItem, setOrderingItem] = useState<ProcurementItem | null>(null);
    const [orderForm, setOrderForm] = useState<OrderFormData>(EMPTY_ORDER_FORM);

    // Batch selection
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchForm, setBatchForm] = useState<OrderFormData>(EMPTY_ORDER_FORM);
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

    // Delivery edit modal
    const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
    const [editForm, setEditForm] = useState({ delivery_week: '', confirmed_delivery_date: '' });

    // Audit log
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const { currentUser } = useAuth();
    const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    useEffect(() => { loadItems(); }, []);

    // Dynamic suppliers from DB
    const [supplierNames, setSupplierNames] = useState<string[]>(FALLBACK_SUPPLIERS);
    useEffect(() => {
        supabase.from('suppliers').select('name').eq('is_active', true).order('name').then(({ data }) => {
            if (data && data.length > 0) setSupplierNames([...data.map(s => s.name), 'Inny']);
        });
    }, []);

    const loadItems = async () => {
        try {
            const data = await ProcurementService.getItemsEnriched();
            setItems(data);
        } catch (error) {
            console.error('Failed to load procurement items', error);
            toast.error('Błąd ładowania listy zamówień');
        } finally {
            setLoading(false);
        }
    };

    const loadAuditLog = async () => {
        try {
            const log = await ProcurementService.getAuditLog(50);
            setAuditLog(log);
        } catch (e) { console.warn('Audit log load failed:', e); }
    };

    // ── Filter items ──
    const filteredItems = items.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesSearch = searchTerm === '' ||
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.technicalSpec || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // ── Group by source (contract/installation/inventory) ──
    const groups: ContractGroup[] = [];
    const groupMap = new Map<string, ContractGroup>();

    filteredItems.forEach(item => {
        const key = `${item.sourceType}_${item.sourceId}`;
        if (!groupMap.has(key)) {
            const group: ContractGroup = {
                sourceType: item.sourceType,
                sourceId: item.sourceId,
                referenceNumber: item.referenceNumber,
                clientName: item.clientName,
                clientCity: item.clientCity,
                salesRepName: item.salesRepName,
                signedAt: item.signedAt,
                advancePaid: item.advancePaid || false,
                advanceAmount: (item as any).advanceAmount || 0,
                plannedInstallationWeeks: (item as any).plannedInstallationWeeks,
                items: [],
                stats: { pending: 0, ordered: 0, delivered: 0, totalCost: 0 }
            };
            groupMap.set(key, group);
            groups.push(group);
        }
        const g = groupMap.get(key)!;
        g.items.push(item);
        if (item.status === 'pending') g.stats.pending++;
        else if (item.status === 'ordered') g.stats.ordered++;
        else if (item.status === 'delivered') g.stats.delivered++;
        g.stats.totalCost += item.purchaseCost || 0;
    });

    // Sort: groups with pending items first
    groups.sort((a, b) => b.stats.pending - a.stats.pending || a.referenceNumber.localeCompare(b.referenceNumber));

    // ── Global Stats ──
    const globalStats = {
        pendingCount: items.filter(i => i.status === 'pending').length,
        orderedCount: items.filter(i => i.status === 'ordered').length,
        deliveredCount: items.filter(i => i.status === 'delivered').length,
        pendingValue: items.filter(i => i.status === 'pending').reduce((s, i) => s + i.purchaseCost, 0),
        orderedValue: items.filter(i => i.status === 'ordered').reduce((s, i) => s + i.purchaseCost, 0),
        contractCount: new Set(items.filter(i => i.sourceType === 'contract').map(i => i.sourceId)).size,
    };

    // ── Handlers ──
    const toggleGroup = (sourceId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(sourceId)) next.delete(sourceId); else next.add(sourceId);
            return next;
        });
    };

    const toggleSelection = (itemId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
            // Auto-activate selection mode when items are checked
            if (next.size > 0) setSelectionMode(true);
            return next;
        });
    };

    const deselectAllInGroup = (group: ContractGroup) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            group.items.forEach(i => next.delete(i.itemId));
            if (next.size === 0) setSelectionMode(false);
            return next;
        });
    };

    const selectAllInGroup = (group: ContractGroup) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            group.items.filter(i => i.status === 'pending').forEach(i => next.add(i.itemId));
            return next;
        });
    };

    const handleBatchOrder = async () => {
        if (selectedIds.size === 0) return;
        setProcessingId('batch');
        const groupId = crypto.randomUUID();
        const totalPrice = parseFloat(batchForm.purchaseCost) || 0;
        const perItemPrice = selectedIds.size > 0 ? totalPrice / selectedIds.size : 0;

        try {
            // Group selected items by contract to do atomic updates
            const contractItemMap = new Map<string, ProcurementItem[]>();
            for (const item of items.filter(i => selectedIds.has(i.itemId))) {
                const key = `${item.sourceType}_${item.sourceId}`;
                if (!contractItemMap.has(key)) contractItemMap.set(key, []);
                contractItemMap.get(key)!.push(item);
            }

            // For each contract, update ALL selected items at once
            for (const [, groupItems] of contractItemMap) {
                const first = groupItems[0];
                if (first.sourceType === 'contract') {
                    // Batch update all items in one contract-write
                    await ProcurementService.batchUpdateContractItems(
                        first.sourceId,
                        groupItems.map(item => ({
                            itemId: item.itemId,
                            updates: {
                                status: 'ordered' as const,
                                orderedAt: new Date().toISOString(),
                                ...(batchForm.supplier ? { supplier: batchForm.supplier } : {}),
                                ...(perItemPrice > 0 ? { purchaseCost: perItemPrice } : {}),
                                ...(batchForm.delivery_week ? { deliveryWeek: batchForm.delivery_week } : {}),
                                ...(batchForm.confirmed_delivery_date ? { confirmedDeliveryDate: batchForm.confirmed_delivery_date } : {}),
                                ...(batchForm.orderReference ? { orderReference: batchForm.orderReference } : {}),
                                ...(batchForm.notes ? { notes: batchForm.notes } : {}),
                                orderGroupId: groupId,
                                orderGroupTotal: totalPrice,
                            },
                        }))
                    );
                } else {
                    // Non-contract items: update individually
                    for (const item of groupItems) {
                        await ProcurementService.updateItemStatus(item.sourceType, item.sourceId, item.itemId, {
                            status: 'ordered',
                            orderedAt: new Date().toISOString(),
                            ...(batchForm.supplier ? { supplier: batchForm.supplier } : {}),
                            ...(perItemPrice > 0 ? { purchaseCost: perItemPrice } : {}),
                            ...(batchForm.delivery_week ? { delivery_week: batchForm.delivery_week } : {}),
                            ...(batchForm.confirmed_delivery_date ? { confirmed_delivery_date: batchForm.confirmed_delivery_date } : {}),
                            ...(batchForm.orderReference ? { orderReference: batchForm.orderReference } : {}),
                            ...(batchForm.notes ? { notes: batchForm.notes } : {}),
                        } as any);
                    }
                }
            }

            setItems(prev => prev.map(i => selectedIds.has(i.itemId) ? {
                ...i,
                status: 'ordered',
                purchaseCost: perItemPrice || i.purchaseCost,
                delivery_week: batchForm.delivery_week || i.delivery_week,
                confirmed_delivery_date: batchForm.confirmed_delivery_date || i.confirmed_delivery_date,
            } : i));

            toast.success(`📦 Zamówiono ${selectedIds.size} pozycji w grupie`);
            // Audit log
            const itemNames = items.filter(i => selectedIds.has(i.itemId)).map(i => i.itemName).join(', ');
            ProcurementService.logAction('batch_ordered', itemNames, undefined, undefined, undefined, {
                count: selectedIds.size,
                supplier: batchForm.supplier,
                totalPrice: totalPrice,
                groupId,
            });
            setSelectedIds(new Set());
            setSelectionMode(false);
            setBatchForm(EMPTY_ORDER_FORM);
        } catch (error) {
            console.error('Batch order failed', error);
            toast.error('Błąd zamówienia grupowego');
        } finally {
            setProcessingId(null);
        }
    };

    const handleFileUpload = async (item: ProcurementItem, file: File) => {
        setUploadingItemId(item.itemId);
        try {
            const url = await StorageService.uploadFile(file, 'attachments', `procurement/${item.sourceId}`);
            const doc = { name: file.name, url, uploadedAt: new Date().toISOString() };
            const existingDocs = (item as any).orderDocuments || [];
            await ProcurementService.updateItemStatus(item.sourceType, item.sourceId, item.itemId, {
                orderDocuments: [...existingDocs, doc],
            } as any);
            setItems(prev => prev.map(i => i.itemId === item.itemId ? { ...i, orderDocuments: [...existingDocs, doc] } as any : i));
            toast.success(`📎 Dokument "${file.name}" dodany`);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Błąd przesyłania pliku');
        } finally {
            setUploadingItemId(null);
        }
    };

    const handleOpenOrderForm = (item: ProcurementItem) => {
        setOrderingItem(item);
        setOrderForm({ ...EMPTY_ORDER_FORM, purchaseCost: item.purchaseCost > 0 ? item.purchaseCost.toString() : '' });
    };

    const handleSubmitOrder = async () => {
        if (!orderingItem) return;
        setProcessingId(orderingItem.itemId);
        try {
            await ProcurementService.updateItemStatus(orderingItem.sourceType, orderingItem.sourceId, orderingItem.itemId, {
                status: 'ordered',
                orderedAt: new Date().toISOString(),
                ...(orderForm.supplier ? { supplier: orderForm.supplier } : {}),
                ...(orderForm.purchaseCost ? { purchaseCost: parseFloat(orderForm.purchaseCost) } : {}),
                ...(orderForm.delivery_week ? { delivery_week: orderForm.delivery_week } : {}),
                ...(orderForm.confirmed_delivery_date ? { confirmed_delivery_date: orderForm.confirmed_delivery_date } : {}),
                ...(orderForm.orderReference ? { orderReference: orderForm.orderReference } : {}),
                ...(orderForm.notes ? { notes: orderForm.notes } : {}),
            } as any);

            setItems(prev => prev.map(i => i.itemId === orderingItem.itemId ? {
                ...i, status: 'ordered',
                purchaseCost: orderForm.purchaseCost ? parseFloat(orderForm.purchaseCost) : i.purchaseCost,
                delivery_week: orderForm.delivery_week || i.delivery_week,
                confirmed_delivery_date: orderForm.confirmed_delivery_date || i.confirmed_delivery_date,
            } : i));
            toast.success('Zamówienie potwierdzone');
            // Audit log
            ProcurementService.logAction('ordered', orderingItem.itemName, orderingItem.sourceId, orderingItem.referenceNumber, orderingItem.itemId, {
                supplier: orderForm.supplier,
                price: orderForm.purchaseCost,
            });
            setOrderingItem(null);
        } catch (error) {
            console.error('Failed to place order', error);
            toast.error('Nie udało się zamówić');
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkDelivered = async (item: ProcurementItem) => {
        setProcessingId(item.itemId);
        try {
            await ProcurementService.updateItemStatus(item.sourceType, item.sourceId, item.itemId, { status: 'delivered' });
            setItems(prev => prev.map(i => i.itemId === item.itemId ? { ...i, status: 'delivered' } : i));
            toast.success('Oznaczono jako dostarczone');
        } catch (error) {
            console.error('Failed to update status', error);
            toast.error('Nie udało się zaktualizować statusu');
        } finally {
            setProcessingId(null);
        }
    };

    const handleEditDelivery = (item: ProcurementItem) => {
        setEditingItem(item);
        setEditForm({ delivery_week: item.delivery_week || '', confirmed_delivery_date: item.confirmed_delivery_date || '' });
    };

    const saveDeliveryInfo = async () => {
        if (!editingItem) return;
        try {
            await ProcurementService.updateItemStatus(editingItem.sourceType, editingItem.sourceId, editingItem.itemId, {
                delivery_week: editForm.delivery_week || undefined,
                confirmed_delivery_date: editForm.confirmed_delivery_date || null
            });
            setItems(prev => prev.map(i => i.itemId === editingItem.itemId ? { ...i, delivery_week: editForm.delivery_week, confirmed_delivery_date: editForm.confirmed_delivery_date } : i));
            toast.success('Zaktualizowano termin dostawy');
            setEditingItem(null);
        } catch (error) {
            console.error('Failed to update delivery info', error);
            toast.error('Błąd zapisu danych dostawy');
        }
    };

    const fmt = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Logistyka i Zamówienia</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-slate-500">{globalStats.contractCount} umów · {items.length} pozycji</p>
                        <Link to="/logistics-kpi" className="text-xs font-semibold text-teal-600 hover:text-teal-800 bg-teal-50 px-2 py-0.5 rounded transition-colors">📊 KPI Dashboard</Link>
                    </div>
                </div>
                {selectedIds.size > 0 && (
                    <button
                        onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); setBatchForm(EMPTY_ORDER_FORM); }}
                        className="px-4 py-2 text-xs font-bold rounded-lg transition-colors border bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                    >
                        ✕ Odznacz wszystkie ({selectedIds.size})
                    </button>
                )}
            </div>

            {/* ── Batch Order Panel ── */}
            {selectedIds.size > 0 && (
                <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-300 shadow-md space-y-4 sticky top-0 z-20">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-indigo-900">🔗 Zamówienie Grupowe — {selectedIds.size} pozycji</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Dostawca</label>
                            <select value={batchForm.supplier} onChange={e => setBatchForm({ ...batchForm, supplier: e.target.value })} className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white">
                                <option value="">— Wybierz —</option>
                                {supplierNames.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Kwota Razem (€)</label>
                            <input type="number" step="0.01" value={batchForm.purchaseCost} onChange={e => setBatchForm({ ...batchForm, purchaseCost: e.target.value })} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" placeholder="0.00" />
                            {batchForm.purchaseCost && selectedIds.size > 1 && (
                                <span className="text-[9px] text-indigo-500">≈ {(parseFloat(batchForm.purchaseCost) / selectedIds.size).toFixed(2)} €/szt.</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Nr Zamówienia</label>
                            <input value={batchForm.orderReference} onChange={e => setBatchForm({ ...batchForm, orderReference: e.target.value })} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" placeholder="ALX-2026-0124" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Termin dostawy</label>
                            <input type="date" value={batchForm.confirmed_delivery_date} onChange={e => setBatchForm({ ...batchForm, confirmed_delivery_date: e.target.value })} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tydzień (KW)</label>
                            <input value={batchForm.delivery_week} onChange={e => setBatchForm({ ...batchForm, delivery_week: e.target.value })} className="w-full p-2 border border-indigo-200 rounded-lg text-sm" placeholder="2026-W15" />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleBatchOrder}
                                disabled={processingId === 'batch'}
                                className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                            >
                                {processingId === 'batch' ? '⏳...' : `📦 Zamów ${selectedIds.size} Razem`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">⏳</div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Do zamówienia</div>
                            <div className="text-xl font-bold text-slate-900">{globalStats.pendingCount}</div>
                            <div className="text-[10px] text-slate-500">{fmt(globalStats.pendingValue)}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">📦</div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">W realizacji</div>
                            <div className="text-xl font-bold text-slate-900">{globalStats.orderedCount}</div>
                            <div className="text-[10px] text-slate-500">{fmt(globalStats.orderedValue)}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">✅</div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Dostarczone</div>
                            <div className="text-xl font-bold text-slate-900">{globalStats.deliveredCount}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">📋</div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Umów z pozycjami</div>
                            <div className="text-xl font-bold text-slate-900">{globalStats.contractCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {[
                        { id: 'all', label: 'Wszystkie' },
                        { id: 'pending', label: `⏳ Oczekuje (${globalStats.pendingCount})` },
                        { id: 'ordered', label: `📦 Zamówione (${globalStats.orderedCount})` },
                        { id: 'delivered', label: `✅ Dostarczone` },
                    ].map(s => (
                        <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === s.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" placeholder="Szukaj klient, nr umowy, produkt..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                </div>
            </div>

            {/* ── Grouped Contract Cards ── */}
            <div className="space-y-4">
                {groups.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        <p className="font-medium">Brak elementów spełniających kryteria</p>
                    </div>
                ) : groups.map(group => {
                    const isExpanded = expandedGroups.has(group.sourceId);
                    const total = group.items.length;
                    const deliveredPct = total > 0 ? Math.round((group.stats.delivered / total) * 100) : 0;
                    const hasPending = group.stats.pending > 0;

                    return (
                        <div key={`${group.sourceType}_${group.sourceId}`} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${hasPending ? 'border-amber-200' : 'border-slate-200'}`}>
                            {/* ── Contract Header ── */}
                            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleGroup(group.sourceId)}>
                                {/* Source badge */}
                                <div className={`p-2 rounded-lg flex-shrink-0 ${group.sourceType === 'contract' ? 'bg-indigo-50 text-indigo-600' : group.sourceType === 'installation' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {group.sourceType === 'contract' ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    ) : group.sourceType === 'installation' ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    )}
                                </div>

                                {/* Contract Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">{SOURCE_LABELS[group.sourceType] || group.sourceType}</span>
                                        {group.sourceType === 'contract' ? (
                                            <Link to={`/contracts/${group.sourceId}`} className="font-bold text-sm text-indigo-700 hover:text-indigo-900 hover:underline" onClick={e => e.stopPropagation()}>
                                                {group.referenceNumber}
                                            </Link>
                                        ) : (
                                            <span className="font-bold text-sm text-slate-800">{group.referenceNumber}</span>
                                        )}
                                        {group.advancePaid ? (
                                            <span className="text-[10px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-200">✅ Zaliczka</span>
                                        ) : group.sourceType === 'contract' && group.advanceAmount > 0 && (
                                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">⚠️ Brak zaliczki</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                                        <span className="font-medium text-slate-700">{group.clientName}</span>
                                        {group.clientCity && <span>· {group.clientCity}</span>}
                                        {group.salesRepName && <span>· 👤 {group.salesRepName}</span>}
                                        {group.signedAt && <span>· 📅 {new Date(group.signedAt).toLocaleDateString('pl-PL')}</span>}
                                        {group.plannedInstallationWeeks && (
                                            <span className="font-bold text-orange-600">· 🛠️ Montaż za {group.plannedInstallationWeeks} tyg.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Mini Progress + Count */}
                                <div className="flex items-center gap-4 flex-shrink-0">
                                    {/* Mini progress dots */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        {group.stats.pending > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{group.stats.pending} ⏳</span>}
                                        {group.stats.ordered > 0 && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{group.stats.ordered} 📦</span>}
                                        {group.stats.delivered > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{group.stats.delivered} ✅</span>}
                                    </div>
                                    {/* Small progress bar */}
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:flex">
                                        {group.stats.delivered > 0 && <div className="h-full bg-green-500" style={{ width: `${(group.stats.delivered / total) * 100}%` }}></div>}
                                        {group.stats.ordered > 0 && <div className="h-full bg-blue-500" style={{ width: `${(group.stats.ordered / total) * 100}%` }}></div>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">{deliveredPct}%</span>
                                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>

                            {/* ── Expanded Items ── */}
                            {isExpanded && (
                                <div className="border-t border-slate-100">
                                    {/* Select all in group */}
                                    {group.stats.pending > 0 && (
                                        <div className={`px-4 py-2 border-b flex items-center justify-between ${!group.advancePaid && group.advanceAmount > 0 && group.sourceType === 'contract' ? 'bg-red-50/50 border-red-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                            {!group.advancePaid && group.advanceAmount > 0 && group.sourceType === 'contract' ? (
                                                <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                                                    🚫 Zamawianie zablokowane — brak potwierdzonej zaliczki
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase">Zaznacz pozycje do zamówienia</span>
                                                    <div className="flex gap-2">
                                                        {group.items.some(i => i.status === 'pending' && selectedIds.has(i.itemId)) && (
                                                            <button onClick={() => deselectAllInGroup(group)} className="text-xs font-medium text-red-500 hover:text-red-700">
                                                                ✕ Odznacz
                                                            </button>
                                                        )}
                                                        <button onClick={() => selectAllInGroup(group)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                                                            ☑ Zaznacz wszystkie ({group.stats.pending})
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {group.items.map((item, idx) => {
                                        const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['pending'];
                                        const isSelected = selectedIds.has(item.itemId);
                                        const docs = (item as any).orderDocuments || [];
                                        return (
                                            <div key={item.itemId} className={`px-4 py-3 ${idx > 0 ? 'border-t border-slate-50' : ''} hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/40 ring-1 ring-inset ring-indigo-200' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    {/* Checkbox — always visible for pending items (disabled if advance not paid) */}
                                                    {item.status === 'pending' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            disabled={!group.advancePaid && group.advanceAmount > 0 && group.sourceType === 'contract'}
                                                            onChange={() => toggleSelection(item.itemId)}
                                                            className={`w-5 h-5 rounded focus:ring-indigo-500 flex-shrink-0 accent-indigo-600 ${!group.advancePaid && group.advanceAmount > 0 && group.sourceType === 'contract' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer text-indigo-600'}`}
                                                            title={!group.advancePaid && group.advanceAmount > 0 && group.sourceType === 'contract' ? 'Najpierw potwierdź zaliczkę na umowie' : undefined}
                                                        />
                                                    )}

                                                    {/* Status icon */}
                                                    <span className="text-sm flex-shrink-0">{sc.icon}</span>

                                                    {/* Item info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm text-slate-800">{item.itemName}</span>
                                                            <span className="text-[10px] text-slate-400">{item.category}</span>
                                                            {(item as any).orderGroupId && (
                                                                <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-200">🔗 Grupa</span>
                                                            )}
                                                        </div>
                                                        {/* Technical spec */}
                                                        {item.technicalSpec && (
                                                            <div className="text-[11px] text-indigo-600 font-mono mt-0.5">{item.technicalSpec}</div>
                                                        )}
                                                        {/* Details */}
                                                        {item.details && (
                                                            <div className="text-[10px] text-slate-500 mt-0.5">{item.details}</div>
                                                        )}
                                                        {/* Delivery/cost info */}
                                                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                                                            {(item as any).supplier && <span className="font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[10px]">{(item as any).supplier}</span>}
                                                            {item.purchaseCost > 0 && <span className="font-medium">{fmt(item.purchaseCost)}</span>}
                                                            {item.confirmed_delivery_date && (
                                                                <span className="text-green-600 font-medium">📅 {new Date(item.confirmed_delivery_date).toLocaleDateString('pl-PL')}</span>
                                                            )}
                                                            {!item.confirmed_delivery_date && item.delivery_week && (
                                                                <span className="text-blue-600 font-medium">🕐 Tydzień {item.delivery_week}</span>
                                                            )}
                                                            {item.plannedDeliveryDate && !item.confirmed_delivery_date && !item.delivery_week && (
                                                                <span>Plan: {new Date(item.plannedDeliveryDate).toLocaleDateString('pl-PL')}</span>
                                                            )}
                                                            {docs.length > 0 && <span className="text-[10px]">📎{docs.length} dok.</span>}
                                                        </div>
                                                    </div>

                                                    {/* Status + Actions */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.color}`}>{sc.label}</span>

                                                        {/* Upload doc button */}
                                                        <label className={`px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${uploadingItemId === item.itemId ? 'bg-slate-200 text-slate-400' : 'border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                                                className="hidden"
                                                                disabled={uploadingItemId === item.itemId}
                                                                onChange={e => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleFileUpload(item, file);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                            {uploadingItemId === item.itemId ? '⏳' : '📎'}
                                                        </label>

                                                        {item.status === 'pending' && !selectionMode && (
                                                            group.advancePaid || group.advanceAmount === 0 || group.sourceType !== 'contract' ? (
                                                                <button onClick={() => handleOpenOrderForm(item)} disabled={processingId === item.itemId} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50">
                                                                    {processingId === item.itemId ? '...' : '📦 Zamów'}
                                                                </button>
                                                            ) : (
                                                                <span className="px-3 py-1.5 bg-slate-200 text-slate-400 text-[10px] font-bold rounded-lg cursor-not-allowed" title="Potwierdź zaliczkę na umowie">
                                                                    🔒 Brak zaliczki
                                                                </span>
                                                            )
                                                        )}
                                                        {item.status === 'ordered' && (
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => handleEditDelivery(item)} className="px-2 py-1 border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold rounded-lg transition-colors">
                                                                    📅 Termin
                                                                </button>
                                                                <button onClick={() => handleMarkDelivered(item)} disabled={processingId === item.itemId} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50">
                                                                    {processingId === item.itemId ? '...' : '✅ Odebrano'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Documents row */}
                                                {docs.length > 0 && (
                                                    <div className="ml-11 mt-2 flex flex-wrap gap-1.5">
                                                        {docs.map((doc: any, di: number) => (
                                                            <a key={di} href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-blue-600 hover:text-blue-800 hover:border-blue-300 transition-colors">
                                                                {doc.name.endsWith('.pdf') ? '📄' : '📎'} {doc.name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Group footer */}
                                    {group.stats.totalCost > 0 && (
                                        <div className="border-t border-slate-100 px-4 py-2 bg-slate-50 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Suma kosztów zakupu</span>
                                            <span className="text-xs font-bold text-slate-700">{fmt(group.stats.totalCost)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── ORDER MODAL ── */}
            {orderingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setOrderingItem(null)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">📦</div>
                                <div>
                                    <h3 className="font-bold text-lg">Złóż Zamówienie</h3>
                                    <p className="text-blue-100 text-sm">{orderingItem.itemName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-3 text-blue-100 text-xs">
                                <span>Umowa: {orderingItem.referenceNumber}</span>
                                <span>·</span>
                                <span>{orderingItem.clientName}</span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {/* Supplier */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dostawca</label>
                                <select value={orderForm.supplier} onChange={e => setOrderForm({ ...orderForm, supplier: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                                    <option value="">— Wybierz —</option>
                                    {supplierNames.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Purchase Cost */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kwota zamówienia (EUR)</label>
                                <div className="relative">
                                    <input type="number" step="0.01" value={orderForm.purchaseCost} onChange={e => setOrderForm({ ...orderForm, purchaseCost: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold" placeholder="0.00" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                                </div>
                            </div>

                            {/* Order Reference */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nr zamówienia u dostawcy</label>
                                <input value={orderForm.orderReference} onChange={e => setOrderForm({ ...orderForm, orderReference: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="np. ALX-2026-0124" />
                            </div>

                            {/* Delivery Estimate */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tydzień dostawy</label>
                                    <input value={orderForm.delivery_week} onChange={e => setOrderForm({ ...orderForm, delivery_week: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="2026-W15" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data dostawy</label>
                                    <input type="date" value={orderForm.confirmed_delivery_date} onChange={e => setOrderForm({ ...orderForm, confirmed_delivery_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notatki</label>
                                <textarea value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" placeholder="Dodatkowe informacje o zamówieniu..." />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setOrderingItem(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
                                Anuluj
                            </button>
                            <button onClick={handleSubmitOrder} disabled={processingId === orderingItem.itemId} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold text-sm disabled:opacity-50 flex items-center gap-2">
                                {processingId === orderingItem.itemId ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : '📦'} Potwierdź Zamówienie
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELIVERY EDIT MODAL ── */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditingItem(null)}>
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Termin dostawy</h3>
                        <p className="text-sm text-slate-500 mb-4">{editingItem.itemName} — {editingItem.clientName}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tydzień dostawy</label>
                                <input type="text" placeholder="2026-W15" value={editForm.delivery_week} onChange={e => setEditForm({ ...editForm, delivery_week: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">LUB</span></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dokładna data (potwierdzona)</label>
                                <input type="date" value={editForm.confirmed_delivery_date} onChange={e => setEditForm({ ...editForm, confirmed_delivery_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Anuluj</button>
                            <button onClick={saveDeliveryInfo} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">Zapisz</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AUDIT LOG (Manager only) ── */}
            {isManager && (
                <div className="mt-8">
                    <button onClick={() => { setShowAuditLog(!showAuditLog); if (!showAuditLog && auditLog.length === 0) loadAuditLog(); }} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                        <span>📋</span>
                        <span>Historia zmian</span>
                        <svg className={`w-4 h-4 transition-transform ${showAuditLog ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showAuditLog && (
                        <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 uppercase">Ostatnie 50 akcji</span>
                                <button onClick={loadAuditLog} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">🔄 Odśwież</button>
                            </div>
                            {auditLog.length === 0 ? (
                                <div className="p-6 text-center text-sm text-slate-400">Brak wpisów w historii zmian</div>
                            ) : (
                                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                    {auditLog.map((entry, i) => (
                                        <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50/50">
                                            <span className="text-sm flex-shrink-0">
                                                {entry.action === 'ordered' ? '📦' : entry.action === 'batch_ordered' ? '📦📦' : entry.action === 'delivered' ? '✅' : entry.action === 'doc_uploaded' ? '📎' : '🔄'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-700">
                                                    <span className="font-bold">{entry.user_name}</span>
                                                    <span className="text-slate-400"> — </span>
                                                    <span className="font-medium">
                                                        {entry.action === 'ordered' ? 'zamówił' : entry.action === 'batch_ordered' ? 'zamówił grupowo' : entry.action === 'delivered' ? 'oznaczył jako dostarczone' : entry.action === 'doc_uploaded' ? 'dodał dokument' : entry.action}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate">{entry.item_name}</div>
                                                {entry.contract_ref && <div className="text-[10px] text-slate-400">Umowa: {entry.contract_ref}</div>}
                                                {entry.details?.supplier && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Dostawca: {entry.details.supplier}</span>}
                                                {entry.details?.totalPrice && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-1">{entry.details.totalPrice}€</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                                {new Date(entry.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
