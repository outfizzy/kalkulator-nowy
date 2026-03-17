import React, { useState } from 'react';
import type { Contract, OrderedItem } from '../../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import { StorageService } from '../../services/database/storage.service';

interface Props {
    contract: Contract;
    onUpdate: (items: OrderedItem[]) => void;
    isEditing: boolean;
}

const SUPPLIERS = ['Aluxe', 'Deponti', 'Aliplast', 'Selt', 'Weinor', 'Sonstige'];

// Category → supplier suggestions
const CATEGORY_SUPPLIERS: Record<string, string[]> = {
    'Roofing': ['Aluxe', 'Deponti'],
    'Awning': ['Weinor', 'Selt', 'Aluxe'],
    'ZIP Screen': ['Weinor', 'Selt', 'Aluxe'],
    'Sliding Glass': ['Aluxe', 'Deponti', 'Aliplast'],
    'Side Wall': ['Aluxe', 'Aliplast'],
    'Accessories': ['Aluxe', 'Sonstige'],
    'Flooring': ['Sonstige'],
    'Profiles': ['Aluxe', 'Sonstige'],
    'Other': SUPPLIERS
};

const CATEGORIES: Record<string, string[]> = {
    'Roofing': ['Terrassendach', 'Lamellendach / Pergola'],
    'Awning': ['Markise unter Glas', 'Markise auf Glas', 'Gelenkarmmarkise'],
    'ZIP Screen': ['Senkrechtmarkise / ZIP Screen'],
    'Sliding Glass': ['Schiebewand / Szyby przesuwne'],
    'Side Wall': ['Seitenwand / Ściana boczna', 'Festwand / Ściana stała'],
    'Accessories': ['LED Spots', 'Heizstrahler', 'Lautsprecher', 'Rinne / Rynna'],
    'Profiles': ['Ausgleichsprofile', 'Wandanschluss', 'Bodenprofil'],
    'Flooring': ['WPC Boden / Podłoga WPC']
};

const CATEGORY_LABELS: Record<string, string> = {
    'Roofing': '🏠 Zadaszenie',
    'Awning': '🌤️ Markiza',
    'ZIP Screen': '🪟 ZIP / Senkrechtmarkise',
    'Sliding Glass': '🚪 Szyby Przesuwne',
    'Side Wall': '🧱 Ściany Boczne',
    'Accessories': '💡 Dodatki',
    'Profiles': '📏 Profile',
    'Flooring': '🪵 Podłoga',
    'Other': '📦 Inne'
};

const CATEGORY_COLORS: Record<string, { badge: string; border: string }> = {
    'Roofing': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-l-indigo-500' },
    'Awning': { badge: 'bg-orange-50 text-orange-700 border-orange-200', border: 'border-l-orange-400' },
    'ZIP Screen': { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', border: 'border-l-cyan-500' },
    'Sliding Glass': { badge: 'bg-sky-50 text-sky-700 border-sky-200', border: 'border-l-sky-500' },
    'Side Wall': { badge: 'bg-stone-50 text-stone-700 border-stone-200', border: 'border-l-stone-400' },
    'Accessories': { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', border: 'border-l-yellow-400' },
    'Profiles': { badge: 'bg-slate-100 text-slate-700 border-slate-300', border: 'border-l-slate-400' },
    'Flooring': { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-500' },
    'Other': { badge: 'bg-slate-50 text-slate-600 border-slate-200', border: 'border-l-slate-300' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    'pending': { label: 'Oczekuje', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '⏳' },
    'ordered': { label: 'Zamówione', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '📦' },
    'in_production': { label: 'W Produkcji', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '🏭' },
    'shipped': { label: 'Wysłane', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: '🚚' },
    'delivered': { label: 'Dostarczone', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '✅' }
};

export const OrderedItemsModule: React.FC<Props> = ({ contract, onUpdate, isEditing }) => {
    const { isAdmin } = useAuth();
    const [customItem, setCustomItem] = useState('');
    const [customCategory, setCustomCategory] = useState<OrderedItem['category']>('Other');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [showAddSection, setShowAddSection] = useState(false);
    const [groupByCategory, setGroupByCategory] = useState(true);

    // ── Grouped Ordering State ──
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchSupplier, setBatchSupplier] = useState('');
    const [batchPrice, setBatchPrice] = useState('');
    const [batchDeliveryDate, setBatchDeliveryDate] = useState('');
    const [batchDeliveryWeek, setBatchDeliveryWeek] = useState('');
    const [batchOrderRef, setBatchOrderRef] = useState('');
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

    const items = contract.orderedItems || [];

    // ── Progress Stats ──
    const totalItems = items.length;
    const pendingCount = items.filter(i => i.status === 'pending').length;
    const orderedCount = items.filter(i => i.status === 'ordered').length;
    const inProductionCount = items.filter(i => i.status === 'in_production').length;
    const shippedCount = items.filter(i => i.status === 'shipped').length;
    const deliveredCount = items.filter(i => i.status === 'delivered').length;
    const doneCount = deliveredCount + shippedCount;
    const progressPercent = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;
    const totalPurchaseCost = items.reduce((sum, item) => sum + ((item.purchaseCost || 0) * (item.quantity || 1)), 0);

    // ── Grouped items ──
    const groupedItems = items.reduce<Record<string, typeof items>>((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // Sort categories by importance
    const categoryOrder = ['Roofing', 'Sliding Glass', 'ZIP Screen', 'Side Wall', 'Awning', 'Accessories', 'Profiles', 'Flooring', 'Other'];
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
        const ia = categoryOrder.indexOf(a);
        const ib = categoryOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    // ── Handlers ──
    const handleToggleItem = (category: OrderedItem['category'], name: string) => {
        const existingIdx = items.findIndex(item => item.category === category && item.name === name);
        const newItems = [...items];
        if (existingIdx >= 0) {
            newItems.splice(existingIdx, 1);
        } else {
            newItems.push({ id: crypto.randomUUID(), category, name, status: 'pending', quantity: 1 });
        }
        onUpdate(newItems);
    };

    const handleUpdateItem = (itemId: string, updates: Partial<OrderedItem>) => {
        const newItems = items.map(item => item.id === itemId ? { ...item, ...updates } : item);
        onUpdate(newItems);
    };

    const handleAddCustomItem = () => {
        if (!customItem.trim()) return;
        const newItem: OrderedItem = {
            id: crypto.randomUUID(),
            category: customCategory,
            name: customItem,
            status: 'pending',
            quantity: 1
        };
        onUpdate([...items, newItem]);
        setCustomItem('');
        toast.success('Dodano element');
    };

    const handleQuickStatusChange = async (itemId: string, newStatus: OrderedItem['status']) => {
        const now = new Date().toISOString();
        const newItems = items.map(item =>
            item.id === itemId
                ? {
                    ...item,
                    status: newStatus,
                    ...(newStatus === 'ordered' ? { orderedAt: now } : {}),
                }
                : item
        );
        onUpdate(newItems);
        try {
            await DatabaseService.updateContract(contract.id, { ...contract, orderedItems: newItems } as any);
            toast.success(`Status → ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        } catch {
            toast.error('Błąd zapisu');
        }
    };

    const handleRemoveItem = (itemId: string) => {
        onUpdate(items.filter(i => i.id !== itemId));
    };

    const isSelected = (category: string, name: string) =>
        items.some(item => item.category === category && item.name === name);

    // ── Selection Mode Handlers ──
    const toggleSelection = (itemId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const handleBatchOrder = async () => {
        if (selectedIds.size === 0) return;
        const now = new Date().toISOString();
        const groupId = crypto.randomUUID().slice(0, 8);
        const pricePerItem = batchPrice ? parseFloat(batchPrice) / selectedIds.size : undefined;

        const newItems = items.map(item => {
            if (!selectedIds.has(item.id)) return item;
            return {
                ...item,
                status: 'ordered' as const,
                orderedAt: now,
                supplier: batchSupplier || item.supplier,
                purchaseCost: pricePerItem ?? item.purchaseCost,
                plannedDeliveryDate: batchDeliveryDate || item.plannedDeliveryDate,
                deliveryWeek: batchDeliveryWeek || item.deliveryWeek,
                orderReference: batchOrderRef || item.orderReference,
                orderGroupId: groupId,
                orderGroupTotal: batchPrice ? parseFloat(batchPrice) : undefined,
            };
        });
        onUpdate(newItems);
        try {
            await DatabaseService.updateContract(contract.id, { ...contract, orderedItems: newItems } as any);
            toast.success(`${selectedIds.size} pozycji zamówionych razem`);
        } catch {
            toast.error('Błąd zapisu');
        }
        // Reset
        setSelectionMode(false);
        setSelectedIds(new Set());
        setBatchSupplier('');
        setBatchPrice('');
        setBatchDeliveryDate('');
        setBatchDeliveryWeek('');
        setBatchOrderRef('');
    };

    // ── File Upload Handler ──
    const handleFileUpload = async (itemId: string, file: File) => {
        setUploadingItemId(itemId);
        try {
            const url = await StorageService.uploadFile(file, 'attachments', `contracts/${contract.id}/orders`);
            const doc = { name: file.name, url, uploadedAt: new Date().toISOString() };
            const newItems = items.map(item => {
                if (item.id !== itemId) return item;
                return { ...item, orderDocuments: [...(item.orderDocuments || []), doc] };
            });
            onUpdate(newItems);
            await DatabaseService.updateContract(contract.id, { ...contract, orderedItems: newItems } as any);
            toast.success(`Dokument "${file.name}" dodany`);
        } catch {
            toast.error('Błąd przesyłania pliku');
        } finally {
            setUploadingItemId(null);
        }
    };

    const handleRemoveDocument = async (itemId: string, docUrl: string) => {
        const newItems = items.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, orderDocuments: (item.orderDocuments || []).filter(d => d.url !== docUrl) };
        });
        onUpdate(newItems);
        await DatabaseService.updateContract(contract.id, { ...contract, orderedItems: newItems } as any);
        toast.success('Dokument usunięty');
    };

    // ── Next status logic ──
    const getNextStatus = (current: string): { status: string; label: string } | null => {
        const flow: Record<string, { status: string; label: string }> = {
            'pending': { status: 'ordered', label: 'Zamów' },
            'ordered': { status: 'in_production', label: 'W Produkcji' },
            'in_production': { status: 'shipped', label: 'Wysłano' },
            'shipped': { status: 'delivered', label: 'Odebrano' },
        };
        return flow[current] || null;
    };

    // ── Render item row ──
    const renderItem = (item: OrderedItem) => {
        const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['pending'];
        const isExpanded = expandedItemId === item.id;
        const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];
        const nextAction = getNextStatus(item.status);
        const suggestedSuppliers = CATEGORY_SUPPLIERS[item.category] || SUPPLIERS;

        return (
            <div key={item.id} className={`border rounded-xl overflow-hidden transition-all border-l-4 ${catColor.border} ${isExpanded ? 'border-indigo-200 shadow-sm' : 'border-slate-200 hover:border-slate-300'} ${selectionMode && selectedIds.has(item.id) ? 'ring-2 ring-indigo-400 bg-indigo-50/30' : ''}`}>
                {/* Item Row */}
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => selectionMode ? toggleSelection(item.id) : setExpandedItemId(isExpanded ? null : item.id)}>
                    {selectionMode && (
                        <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
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
                            {!groupByCategory && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${catColor.badge}`}>
                                    {CATEGORY_LABELS[item.category]?.replace(/^[^\s]+\s/, '') || item.category}
                                </span>
                            )}
                        </div>
                        {item.technicalSpec && (
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{item.technicalSpec}</div>
                        )}
                        {/* Details row — show measurement/tech data */}
                        {item.details && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md">{item.details}</div>
                        )}
                    </div>

                    {/* Quick Status Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.supplier && (
                            <span className="hidden sm:inline text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold border border-purple-200">{item.supplier}</span>
                        )}
                        {(item as any).orderGroupId && (
                            <span className="hidden sm:inline text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-200" title="Zamówione w grupie">
                                🔗 Grupa
                            </span>
                        )}
                        {item.orderedAt && item.status !== 'pending' && (
                            <span className="hidden sm:inline text-[9px] text-slate-400">
                                {new Date(item.orderedAt).toLocaleDateString('de-DE')}
                            </span>
                        )}
                        {nextAction && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(item.id, nextAction.status as any); }}
                                className={`px-2.5 py-1 text-white text-[10px] font-bold rounded-lg transition-colors ${
                                    nextAction.status === 'ordered' ? 'bg-blue-600 hover:bg-blue-700' :
                                    nextAction.status === 'in_production' ? 'bg-purple-600 hover:bg-purple-700' :
                                    nextAction.status === 'shipped' ? 'bg-teal-600 hover:bg-teal-700' :
                                    'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {nextAction.label}
                            </button>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.color}`}>
                            {sc.label}
                        </span>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                        {/* Details banner (if exists) */}
                        {item.details && (
                            <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                                <span className="text-sm flex-shrink-0">📋</span>
                                <div className="whitespace-pre-wrap">{item.details}</div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Quantity */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ilość</label>
                                {isEditing ? (
                                    <input type="number" min="1" value={item.quantity || 1} onChange={e => handleUpdateItem(item.id, { quantity: parseInt(e.target.value) || 1 })} className="w-full p-1.5 border rounded-lg text-sm" />
                                ) : (
                                    <div className="text-sm font-medium text-slate-800">{item.quantity || 1}</div>
                                )}
                            </div>
                            {/* Technical Spec */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Wymiary / Specyfikacja</label>
                                {isEditing ? (
                                    <input value={item.technicalSpec || ''} onChange={e => handleUpdateItem(item.id, { technicalSpec: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" placeholder="np. 3500x2100mm, RAL 7016" />
                                ) : (
                                    <div className="text-sm text-slate-700 font-mono">{item.technicalSpec || '—'}</div>
                                )}
                            </div>
                            {/* Supplier — ALWAYS EDITABLE */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dostawca</label>
                                <select value={item.supplier || ''} onChange={e => handleUpdateItem(item.id, { supplier: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm bg-white">
                                    <option value="">— Wybierz —</option>
                                    {suggestedSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option disabled>────────</option>
                                    {SUPPLIERS.filter(s => !suggestedSuppliers.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            {/* Order Reference — ALWAYS EDITABLE */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nr Zamówienia</label>
                                <input value={item.orderReference || ''} onChange={e => handleUpdateItem(item.id, { orderReference: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" placeholder="np. ALX-2026-0124" />
                            </div>
                            {/* Planned Delivery — ALWAYS EDITABLE */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Planowana Dostawa</label>
                                <input type="date" value={item.plannedDeliveryDate || ''} onChange={e => handleUpdateItem(item.id, { plannedDeliveryDate: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" />
                            </div>
                            {/* Delivery Week — ALWAYS EDITABLE */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tydzień Dostawy (KW)</label>
                                <input value={item.deliveryWeek || ''} onChange={e => handleUpdateItem(item.id, { deliveryWeek: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm" placeholder="np. KW 15" />
                            </div>
                            {/* Purchase Cost (admin only) — ALWAYS EDITABLE */}
                            {isAdmin() && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Koszt Zakupu (EUR)</label>
                                    <input type="number" step="0.01" value={item.purchaseCost || ''} onChange={e => handleUpdateItem(item.id, { purchaseCost: parseFloat(e.target.value) || 0 })} className="w-full p-1.5 border rounded-lg text-sm text-right" placeholder="0.00" />
                                </div>
                            )}
                            {/* Status — ALWAYS EDITABLE */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                                <select value={item.status} onChange={e => handleUpdateItem(item.id, { status: e.target.value as OrderedItem['status'] })} className="w-full p-1.5 border rounded-lg text-sm bg-white">
                                    <option value="pending">⏳ Oczekuje</option>
                                    <option value="ordered">📦 Zamówione</option>
                                    <option value="in_production">🏭 W Produkcji</option>
                                    <option value="shipped">🚚 Wysłane</option>
                                    <option value="delivered">✅ Dostarczone</option>
                                </select>
                            </div>
                            {/* Notes — ALWAYS EDITABLE */}
                            <div className="sm:col-span-2 lg:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notatki</label>
                                <textarea value={item.notes || ''} onChange={e => handleUpdateItem(item.id, { notes: e.target.value })} className="w-full p-1.5 border rounded-lg text-sm resize-none" rows={2} placeholder="Dodatkowe uwagi do zamówienia..." />
                            </div>
                        </div>

                        {/* Timestamps row */}
                        {(item.orderedAt || item.plannedDeliveryDate) && !isEditing && (
                            <div className="mt-3 pt-2 border-t border-slate-200 flex gap-4 flex-wrap text-[10px] text-slate-400">
                                {item.orderedAt && <span>📦 Zamówiono: {new Date(item.orderedAt).toLocaleDateString('de-DE')}</span>}
                                {item.plannedDeliveryDate && <span>📅 Planowana dostawa: {new Date(item.plannedDeliveryDate).toLocaleDateString('de-DE')}</span>}
                                {item.deliveryWeek && <span>🗓️ {item.deliveryWeek}</span>}
                            </div>
                        )}

                        {/* ── Order Documents ── */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">📄 Dokumenty Zamówieniowe</label>
                                <label className={`text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors ${uploadingItemId === item.id ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        className="hidden"
                                        disabled={uploadingItemId === item.id}
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(item.id, file);
                                            e.target.value = '';
                                        }}
                                    />
                                    {uploadingItemId === item.id ? '⏳ Wysyłanie...' : '📎 Dodaj Dokument'}
                                </label>
                            </div>
                            {(item.orderDocuments || []).length > 0 ? (
                                <div className="space-y-1.5">
                                    {(item.orderDocuments || []).map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 truncate">
                                                <span>{doc.name.endsWith('.pdf') ? '📄' : doc.name.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📎'}</span>
                                                <span className="truncate">{doc.name}</span>
                                            </a>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('de-DE')}</span>
                                                {isEditing && (
                                                    <button onClick={() => handleRemoveDocument(item.id, doc.url)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 italic">Brak dokumentów</p>
                            )}
                        </div>

                        {/* Delete in edit mode */}
                        {isEditing && (
                            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                                <button onClick={() => handleRemoveItem(item.id)} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Usuń element
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            {/* ── Header with Progress ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Zamówione Elementy</h3>
                        <p className="text-[10px] text-slate-400">{totalItems} pozycji • {sortedCategories.length} {sortedCategories.length === 1 ? 'kategoria' : 'kategorii'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isAdmin() && totalPurchaseCost > 0 && (
                        <div className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-bold border border-red-200">
                            Koszt: {totalPurchaseCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                    )}
                    {totalItems > 0 && (
                        <button
                            onClick={() => setGroupByCategory(!groupByCategory)}
                            className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            {groupByCategory ? '▤ Lista' : '▦ Grupy'}
                        </button>
                    )}
                    {totalItems > 1 && (
                        <button
                            onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
                            className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${selectionMode ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`}
                        >
                            {selectionMode ? '✕ Anuluj' : '☑ Zamów Grupowo'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddSection(!showAddSection)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${showAddSection ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {showAddSection ? '✕ Zamknij' : '＋ Dodaj Elementy'}
                    </button>
                </div>
            </div>

            {/* ── Batch Ordering Panel ── */}
            {selectionMode && selectedIds.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-indigo-800 mb-3 flex items-center gap-2">
                        ☑ Zamówienie Grupowe — <span className="text-indigo-500">{selectedIds.size} pozycji zaznaczonych</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Dostawca</label>
                            <select value={batchSupplier} onChange={e => setBatchSupplier(e.target.value)} className="w-full p-1.5 border border-indigo-300 rounded-lg text-sm bg-white">
                                <option value="">— Wybierz —</option>
                                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Kwota razem (EUR)</label>
                            <input type="number" step="0.01" value={batchPrice} onChange={e => setBatchPrice(e.target.value)} className="w-full p-1.5 border border-indigo-300 rounded-lg text-sm" placeholder="np. 4500.00" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Termin Dostawy</label>
                            <input type="date" value={batchDeliveryDate} onChange={e => setBatchDeliveryDate(e.target.value)} className="w-full p-1.5 border border-indigo-300 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tydzień (KW)</label>
                            <input value={batchDeliveryWeek} onChange={e => setBatchDeliveryWeek(e.target.value)} className="w-full p-1.5 border border-indigo-300 rounded-lg text-sm" placeholder="np. KW 18" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Nr Zamówienia</label>
                            <input value={batchOrderRef} onChange={e => setBatchOrderRef(e.target.value)} className="w-full p-1.5 border border-indigo-300 rounded-lg text-sm" placeholder="np. ALX-2026-042" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-indigo-200">
                        <div className="text-[10px] text-indigo-500">
                            {batchPrice && selectedIds.size > 0 && (
                                <span>≈ {(parseFloat(batchPrice) / selectedIds.size).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / pozycję</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800">
                                Anuluj
                            </button>
                            <button onClick={handleBatchOrder} className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                📦 Zamów {selectedIds.size} Pozycji Razem
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Progress Bar ── */}
            {totalItems > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            {pendingCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Oczekuje: {pendingCount}</span>
                                </div>
                            )}
                            {orderedCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Zamówione: {orderedCount}</span>
                                </div>
                            )}
                            {inProductionCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Produkcja: {inProductionCount}</span>
                                </div>
                            )}
                            {shippedCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Wysłane: {shippedCount}</span>
                                </div>
                            )}
                            {deliveredCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Dostarczone: {deliveredCount}</span>
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        {deliveredCount > 0 && (
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(deliveredCount / totalItems) * 100}%` }}></div>
                        )}
                        {shippedCount > 0 && (
                            <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${(shippedCount / totalItems) * 100}%` }}></div>
                        )}
                        {inProductionCount > 0 && (
                            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(inProductionCount / totalItems) * 100}%` }}></div>
                        )}
                        {orderedCount > 0 && (
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(orderedCount / totalItems) * 100}%` }}></div>
                        )}
                        {pendingCount > 0 && (
                            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(pendingCount / totalItems) * 100}%` }}></div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Add Items Section (collapsible) ── */}
            {showAddSection && (
                <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Wybierz elementy do zamówienia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Object.entries(CATEGORIES).map(([category, options]) => (
                            <div key={category} className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-600 border-b border-slate-200 pb-1">{CATEGORY_LABELS[category] || category}</h5>
                                {options.map(option => (
                                    <label key={option} className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer text-sm ${isSelected(category, option) ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-medium' : 'hover:bg-white border-slate-200 text-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected(category, option)}
                                            onChange={() => handleToggleItem(category as OrderedItem['category'], option)}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        ))}

                        {/* Custom Items */}
                        <div className="space-y-2">
                            <h5 className="text-xs font-bold text-slate-600 border-b border-slate-200 pb-1">📝 Inne / Własne</h5>
                            {items.filter(item => !Object.values(CATEGORIES).flat().includes(item.name)).map(item => (
                                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-sm">
                                    <span className="text-slate-700">{item.name} <span className="text-[10px] text-slate-400">({CATEGORY_LABELS[item.category]?.replace(/^[^\s]+\s/, '') || item.category})</span></span>
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-0.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2 mt-2">
                                <select value={customCategory} onChange={e => setCustomCategory(e.target.value as OrderedItem['category'])} className="p-1.5 border rounded-lg text-xs bg-white">
                                    {Object.keys(CATEGORY_LABELS).map(cat => (
                                        <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.replace(/^[^\s]+\s/, '') || cat}</option>
                                    ))}
                                </select>
                                <input value={customItem} onChange={e => setCustomItem(e.target.value)} placeholder="Np. Inny dodatek..." className="flex-1 p-1.5 border rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleAddCustomItem()} />
                                <button onClick={handleAddCustomItem} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-xs font-bold">
                                    + Dodaj
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Items List ── */}
            {totalItems > 0 ? (
                groupByCategory ? (
                    <div className="space-y-4">
                        {sortedCategories.map(category => (
                            <div key={category}>
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {CATEGORY_LABELS[category] || category}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-medium">({groupedItems[category].length})</span>
                                </div>
                                <div className="space-y-2">
                                    {groupedItems[category].map(renderItem)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map(renderItem)}
                    </div>
                )
            ) : (
                <div className="text-center py-10 text-slate-400">
                    <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    <p className="text-sm font-medium">Brak zamówionych elementów</p>
                    <p className="text-xs mt-1">Kliknij „+ Dodaj Elementy" aby dodać pozycje</p>
                </div>
            )}
        </div>
    );
};
