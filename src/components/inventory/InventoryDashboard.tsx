import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { InventoryService, type InventoryItem, WAREHOUSE_CATEGORIES } from '../../services/database/inventory.service';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getStockStatus, fmtEur } from './WarehouseHelpers';
import type { Supplier } from './WarehouseHelpers';
import { AddItemModal } from './AddItemModal';
import { IssueItemModal } from './IssueItemModal';
import { DocumentScannerModal } from './DocumentScannerModal';
import {
  Warehouse, Search, Plus, Minus, Filter, RefreshCw, Package, AlertTriangle,
  History, ArrowDownToLine, ScanLine, ChevronDown, ChevronRight, Truck, MapPin, Palette,
  ShieldCheck, Ban, CircleDollarSign, Layers, BadgeEuro, PackageOpen, Settings, X,
  Tag, Trash2, GripVertical, Download, FileSpreadsheet, Upload, ClipboardList,
  BarChart3, Users, Check, Pencil, Camera
} from 'lucide-react';

interface InventoryTransaction {
  id: string; created_at: string; user_id: string; user?: { email: string };
  operation_type: 'adjustment' | 'purchase' | 'usage' | 'return';
  change_amount: number; new_quantity: number; comment?: string;
}

export const InventoryDashboard: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { currentUser } = useAuth();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok' | 'inactive'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [issueItem, setIssueItem] = useState<InventoryItem | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<InventoryTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'purchasePrice' | 'location' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Bulk receipt
  const [showBulkReceipt, setShowBulkReceipt] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkParsed, setBulkParsed] = useState<{ name: string; qty: number; price: number; matchedId?: string }[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{ topItems: any[]; userStats: any[] } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Stocktake
  const [showStocktake, setShowStocktake] = useState(false);
  const [stocktakeItems, setStocktakeItems] = useState<{ item: InventoryItem; counted: string; diff: number }[]>([]);
  const [stocktakeSaving, setStocktakeSaving] = useState(false);

  // OCR Scanner
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { loadItems(); loadSuppliers(); loadCustomCategories(); }, []);

  const loadCustomCategories = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'warehouse_categories').single();
      if (data?.value) setCustomCategories(data.value as string[]);
    } catch { /* no custom categories yet */ }
  };

  const saveCustomCategories = async (cats: string[]) => {
    setCustomCategories(cats);
    await supabase.from('app_settings').upsert({ key: 'warehouse_categories', value: cats, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || allCategories.includes(trimmed)) return;
    saveCustomCategories([...customCategories, trimmed]);
    setNewCategory('');
    toast.success(`Dodano kategorię: ${trimmed}`);
  };

  const removeCategory = (cat: string) => {
    saveCustomCategories(customCategories.filter(c => c !== cat));
    toast.success(`Usunięto kategorię: ${cat}`);
  };

  const allCategories = [...new Set([...WAREHOUSE_CATEGORIES, ...customCategories, ...items.map(i => i.category)])];


  const loadItems = async () => {
    try { setLoading(true); setItems(await InventoryService.getItems()); }
    catch { toast.error('Błąd ładowania magazynu'); }
    finally { setLoading(false); }
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name');
    if (data) setSuppliers(data);
  };

  const handleUpdateQuantity = async (id: string, currentQty: number, change: number) => {
    if (!currentUser) return;
    const newQty = Math.max(0, currentQty + change);
    try {
      await InventoryService.updateQuantity(id, newQty, currentUser.id, 'adjustment', undefined, undefined, change > 0 ? 'Korekta (+)' : 'Korekta (-)');
      setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    } catch { toast.error('Błąd aktualizacji stanu'); }
  };

  const handleAddItem = async (itemData: any) => {
    await InventoryService.addItem(itemData);
    toast.success('Dodano pozycję');
    loadItems();
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    const msg = item.quantity > 0
      ? `"${item.name}" ma stan ${item.quantity} ${item.unit}. Na pewno usunąć całkowicie?`
      : `Usunąć "${item.name}" na stałe?`;
    if (!window.confirm(msg)) return;
    try {
      await InventoryService.deleteItem(item.id);
      toast.success(`Usunięto: ${item.name}`);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      toast.error('Błąd usuwania pozycji');
    }
  };

  const handleIssueToInstallation = async (itemId: string, installationId: string, quantity: number) => {
    if (!currentUser) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    await InventoryService.updateQuantity(item.id, item.quantity - quantity, currentUser.id, 'usage', installationId, 'installation', 'Pobranie do montażu');
    toast.success('Wydano materiał');
    setIssueItem(null);
    setShowScanModal(false);
    loadItems();
  };

  const loadHistory = async (item: InventoryItem) => {
    setHistoryItem(item); setLoadingHistory(true);
    try { setHistoryLogs(await InventoryService.getTransactions(item.id)); }
    catch { toast.error('Błąd ładowania historii'); }
    finally { setLoadingHistory(false); }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Nazwa', 'SKU', 'Kategoria', 'Kolor', 'Stan', 'Jednostka', 'Min. ilość', 'Cena zakupu (€)', 'Wartość (€)', 'Lokalizacja', 'Dostawca'];
    const rows = items.filter(i => i.isActive).map(i => [
      i.name, i.sku || '', i.category, i.color || '', i.quantity, i.unit, i.minQuantity,
      i.purchasePrice?.toFixed(2) || '', ((i.purchasePrice || 0) * i.quantity).toFixed(2),
      i.location || '', i.supplierName || ''
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magazyn_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Eksport CSV gotowy');
  };

  // Inline edit
  const startEdit = (item: InventoryItem, field: 'name' | 'purchasePrice' | 'location') => {
    setEditingCell({ id: item.id, field });
    setEditValue(field === 'purchasePrice' ? (item.purchasePrice?.toString() || '0') : (item[field] || ''));
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    try {
      const update: any = {};
      if (field === 'purchasePrice') update.purchasePrice = parseFloat(editValue) || 0;
      else update[field] = editValue.trim();
      await InventoryService.updateItem(id, update);
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...update } : i));
      toast.success('Zapisano');
    } catch { toast.error('Błąd zapisu'); }
    setEditingCell(null);
  };

  // Bulk receipt parse
  const parseBulkText = (text: string) => {
    setBulkText(text);
    const lines = text.split('\n').filter(l => l.trim());
    const parsed = lines.map(line => {
      const parts = line.split(/[;|\t]/).map(p => p.trim());
      const name = parts[0] || '';
      const qty = parseInt(parts[1]) || 1;
      const price = parseFloat(parts[2]?.replace(',', '.')) || 0;
      const match = items.find(i => i.name.toLowerCase() === name.toLowerCase() || (i.sku && i.sku.toLowerCase() === name.toLowerCase()));
      return { name, qty, price, matchedId: match?.id };
    }).filter(p => p.name);
    setBulkParsed(parsed);
  };

  const handleBulkReceive = async () => {
    if (!currentUser || bulkParsed.length === 0) return;
    setBulkSaving(true);
    try {
      for (const entry of bulkParsed) {
        if (entry.matchedId) {
          const item = items.find(i => i.id === entry.matchedId)!;
          await InventoryService.updateQuantity(entry.matchedId, item.quantity + entry.qty, currentUser.id, 'purchase', undefined, undefined, 'Przyjęcie z faktury');
          if (entry.price > 0) await InventoryService.updateItem(entry.matchedId, { purchasePrice: entry.price });
        } else {
          await InventoryService.addItem({ name: entry.name, quantity: entry.qty, purchasePrice: entry.price || undefined, category: 'Inne', unit: 'szt', minQuantity: 0, isActive: true });
        }
      }
      toast.success(`Przyjęto ${bulkParsed.length} pozycji`);
      setShowBulkReceipt(false); setBulkText(''); setBulkParsed([]);
      loadItems();
    } catch { toast.error('Błąd przyjęcia'); }
    finally { setBulkSaving(false); }
  };

  // Analytics
  const loadAnalytics = async () => {
    setShowAnalytics(true); setLoadingAnalytics(true);
    try {
      const { data: txns } = await supabase.from('inventory_transactions').select('inventory_item_id, change_amount, user_id, operation_type, created_at').eq('operation_type', 'usage');
      if (!txns) { setAnalyticsData({ topItems: [], userStats: [] }); return; }
      // Top items by usage
      const itemUsage: Record<string, { id: string; totalQty: number }> = {};
      const userUsage: Record<string, { id: string; totalQty: number; totalCost: number; ops: number }> = {};
      for (const t of txns) {
        const iid = t.inventory_item_id;
        if (!itemUsage[iid]) itemUsage[iid] = { id: iid, totalQty: 0 };
        itemUsage[iid].totalQty += Math.abs(t.change_amount);
        const uid = t.user_id;
        if (!userUsage[uid]) userUsage[uid] = { id: uid, totalQty: 0, totalCost: 0, ops: 0 };
        userUsage[uid].totalQty += Math.abs(t.change_amount);
        userUsage[uid].ops += 1;
        const item = items.find(i => i.id === iid);
        if (item?.purchasePrice) userUsage[uid].totalCost += Math.abs(t.change_amount) * item.purchasePrice;
      }
      const topItems = Object.values(itemUsage).sort((a, b) => b.totalQty - a.totalQty).slice(0, 10).map(u => ({ ...u, item: items.find(i => i.id === u.id) }));
      // User names
      const uids = Object.keys(userUsage);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uids);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name || 'Nieznany'; });
      const userStats = Object.entries(userUsage).map(([uid, data]) => ({ ...data, name: nameMap[uid] || uid.slice(0, 8) })).sort((a, b) => b.totalCost - a.totalCost);
      setAnalyticsData({ topItems, userStats });
    } catch { toast.error('Błąd ładowania analityki'); }
    finally { setLoadingAnalytics(false); }
  };

  // Stocktake
  const startStocktake = () => {
    setStocktakeItems(items.filter(i => i.isActive).map(i => ({ item: i, counted: '', diff: 0 })));
    setShowStocktake(true);
  };

  const handleStocktakeSave = async () => {
    if (!currentUser) return;
    setStocktakeSaving(true);
    const today = new Date().toLocaleDateString('pl-PL');
    let corrections = 0;
    try {
      for (const entry of stocktakeItems) {
        if (entry.counted === '' || entry.counted === String(entry.item.quantity)) continue;
        const counted = parseInt(entry.counted);
        if (isNaN(counted)) continue;
        await InventoryService.updateQuantity(entry.item.id, counted, currentUser.id, 'adjustment', undefined, undefined, `Inwentaryzacja ${today}`);
        corrections++;
      }
      toast.success(`Inwentaryzacja zakończona: ${corrections} korekt`);
      setShowStocktake(false);
      loadItems();
    } catch { toast.error('Błąd zapisu inwentaryzacji'); }
    finally { setStocktakeSaving(false); }
  };

  const toggleCategory = (cat: string) => setCollapsedCategories(prev => {
    const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n;
  });

  // Filtering
  const filtered = items.filter(item => {
    if (statusFilter === 'low' && !(item.quantity <= item.minQuantity && item.minQuantity > 0)) return false;
    if (statusFilter === 'ok' && (item.quantity <= item.minQuantity && item.minQuantity > 0)) return false;
    if (statusFilter === 'inactive' && item.isActive) return false;
    if (statusFilter !== 'inactive' && !item.isActive) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.sku || '').toLowerCase().includes(q) ||
        (item.color || '').toLowerCase().includes(q) || (item.location || '').toLowerCase().includes(q) ||
        (item.supplierName || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Group by category
  const grouped: Record<string, InventoryItem[]> = {};
  filtered.forEach(item => { if (!grouped[item.category]) grouped[item.category] = []; grouped[item.category].push(item); });

  // KPIs
  const activeItems = items.filter(i => i.isActive);
  const lowStockCount = activeItems.filter(i => i.minQuantity > 0 && i.quantity <= i.minQuantity).length;
  const totalValue = activeItems.reduce((s, i) => s + (i.quantity * (i.purchasePrice || 0)), 0);
  const categories = [...new Set(items.map(i => i.category))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" /></div>;

  return (
    <div className="space-y-5 pb-20 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Magazyn Materiałów</h1>
            <p className="text-sm text-slate-500 mt-0.5">{activeItems.length} pozycji · {categories.length} kategorii</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Ustawienia magazynu">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={handleExportCSV} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Eksport CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={loadAnalytics} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Analityka">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button onClick={startStocktake} className="px-3 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 border border-violet-200" title="Inwentaryzacja">
            <ClipboardList className="w-4 h-4" /> Inwentaryzacja
          </button>
          <button onClick={() => setShowScanner(true)} className="px-3 py-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 border border-blue-200 shadow-sm">
            <Camera className="w-4 h-4" /> OCR Skan
          </button>
          <button onClick={() => { setShowBulkReceipt(true); setBulkText(''); setBulkParsed([]); }} className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 border border-emerald-200">
            <Upload className="w-4 h-4" /> Przyjęcie
          </button>
          <button onClick={() => setShowScanModal(true)} className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 border border-indigo-200">
            <ScanLine className="w-4 h-4" /> Skanuj & Wydaj
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Dodaj
          </button>
          <button onClick={loadItems} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Pozycji</p>
            <div className="p-1.5 rounded-lg text-amber-600 bg-amber-50"><Package className="w-5 h-5" /></div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{activeItems.length}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Aktywne w magazynie</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Niski stan</p>
            <div className={`p-1.5 rounded-lg ${lowStockCount > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <h3 className={`text-xl sm:text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockCount}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{lowStockCount > 0 ? 'Wymaga uwagi!' : 'Wszystko OK'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Wartość</p>
            <div className="p-1.5 rounded-lg text-blue-600 bg-blue-50"><BadgeEuro className="w-5 h-5" /></div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{fmtEur(totalValue)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Szacunkowa wartość stanu</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Kategorii</p>
            <div className="p-1.5 rounded-lg text-violet-600 bg-violet-50"><Layers className="w-5 h-5" /></div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{allCategories.length}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Grup produktowych</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl flex-shrink-0">
            {([
              ['all', 'Wszystkie', <Layers className="w-3.5 h-3.5" />],
              ['low', 'Niski stan', <AlertTriangle className="w-3.5 h-3.5" />],
              ['ok', 'Dostępne', <ShieldCheck className="w-3.5 h-3.5" />],
              ['inactive', 'Nieaktywne', <Ban className="w-3.5 h-3.5" />]
            ] as const).map(([key, label, icon]) => (
              <button key={key as string} onClick={() => setStatusFilter(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${statusFilter === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{icon}{label}</button>
            ))}
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none">
            <option value="all">Wszystkie kategorie</option>
            {allCategories.sort().map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Szukaj po nazwie, SKU, kolorze, lokalizacji..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nazwa / SKU</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kolor</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Lokalizacja</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Stan</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Cena/szt.</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Wartość</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => (
                <React.Fragment key={category}>
                  <tr className="bg-slate-50/80 cursor-pointer hover:bg-slate-100/80" onClick={() => toggleCategory(category)}>
                    <td colSpan={8} className="px-4 py-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                        {collapsedCategories.has(category) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {category} <span className="text-slate-400 font-normal">({catItems.length})</span>
                      </div>
                    </td>
                  </tr>
                  {!collapsedCategories.has(category) && catItems.map(item => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell.field === 'name' ? (
                            <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full px-2 py-1 border border-amber-400 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                          ) : (
                            <div className="font-medium text-slate-800 cursor-pointer hover:text-amber-600 group/edit" onDoubleClick={() => startEdit(item, 'name')}>
                              {item.name}
                              <Pencil className="w-3 h-3 inline ml-1 opacity-0 group-hover/edit:opacity-40" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.sku && <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{item.sku}</span>}
                            {item.supplierName && <span className="text-[10px] text-violet-600 flex items-center gap-0.5"><Truck className="w-3 h-3" />{item.supplierName}</span>}
                          </div>
                          {item.description && <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>}
                        </td>
                        <td className="px-3 py-3">
                          {item.color && <span className="text-xs text-slate-600 flex items-center gap-1"><Palette className="w-3 h-3 text-slate-400" />{item.color}</span>}
                          {item.lengthMm && <span className="text-[10px] text-slate-400 block">{item.lengthMm}mm</span>}
                        </td>
                        <td className="px-3 py-3">
                          {item.location && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{item.location}</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)} className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className={`font-mono font-bold text-sm min-w-[40px] ${item.minQuantity > 0 && item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-900'}`}>
                              {item.quantity}
                            </span>
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)} className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] text-slate-400">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {editingCell?.id === item.id && editingCell.field === 'purchasePrice' ? (
                            <input type="number" step="0.01" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-20 px-2 py-1 border border-amber-400 rounded-lg text-sm text-right focus:ring-2 focus:ring-amber-500 outline-none" />
                          ) : item.purchasePrice ? (
                            <div className="cursor-pointer hover:text-amber-600 group/edit" onDoubleClick={() => startEdit(item, 'purchasePrice')}>
                              <span className="text-xs font-semibold text-slate-700 flex items-center justify-end gap-1">
                                <BadgeEuro className="w-3 h-3 text-slate-400" />{fmtEur(item.purchasePrice)}
                              </span>
                              <span className="text-[10px] text-slate-400">za {item.unit || 'szt.'}</span>
                            </div>
                          ) : <span className="text-xs text-slate-300 cursor-pointer" onDoubleClick={() => startEdit(item, 'purchasePrice')}>—</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {item.purchasePrice ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              {fmtEur(item.purchasePrice * item.quantity)}
                            </span>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => loadHistory(item)} className="px-2 py-1 text-[10px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1">
                              <History className="w-3 h-3" /> Historia
                            </button>
                            <button onClick={() => setIssueItem(item)} className="px-2 py-1 text-[10px] font-medium border border-orange-200 rounded-lg hover:bg-orange-50 text-orange-600 transition-colors flex items-center gap-1">
                              <ArrowDownToLine className="w-3 h-3" /> Wydaj
                            </button>
                            <button onClick={() => handleDeleteItem(item)} className="px-2 py-1 text-[10px] font-medium border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Brak elementów</p>
                  <p className="text-xs mt-1">Zmień filtry lub dodaj nową pozycję</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => (
          <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                {collapsedCategories.has(category) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {category}
              </span>
              <span className="text-[10px] text-slate-400">{catItems.length}</span>
            </button>
            {!collapsedCategories.has(category) && <div className="divide-y divide-slate-100">
              {catItems.map(item => {
                const status = getStockStatus(item);
                return (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-800">{item.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {item.sku && <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{item.sku}</span>}
                          {item.color && <span className="text-[10px] text-slate-500">{item.color}</span>}
                          {item.location && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.location}</span>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${status.color}`}>
                        {status.icon}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className={`font-mono font-bold ${item.minQuantity > 0 && item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-900'}`}>{item.quantity} {item.unit}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => loadHistory(item)} className="px-2 py-1 text-[10px] border border-slate-200 rounded-lg text-slate-600"><History className="w-3 h-3" /></button>
                        <button onClick={() => setIssueItem(item)} className="px-2 py-1 text-[10px] border border-orange-200 rounded-lg text-orange-600"><ArrowDownToLine className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteItem(item)} className="px-2 py-1 text-[10px] border border-red-200 rounded-lg text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    {/* Price row */}
                    {item.purchasePrice != null && item.purchasePrice > 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><BadgeEuro className="w-3 h-3" /> {fmtEur(item.purchasePrice)}/{item.unit || 'szt.'}</span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Σ {fmtEur(item.purchasePrice * item.quantity)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showAddModal && <AddItemModal suppliers={suppliers} existingCategories={allCategories} onAdd={handleAddItem} onClose={() => setShowAddModal(false)} />}
      {(issueItem || showScanModal) && <IssueItemModal item={issueItem} onClose={() => { setIssueItem(null); setShowScanModal(false); }} onAssign={handleIssueToInstallation} />}

      {/* History Modal */}
      {historyItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setHistoryItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-slate-400" />Historia: {historyItem.name}</h3>
                <span className="text-xs text-slate-400">Stan: {historyItem.quantity} {historyItem.unit}</span>
              </div>
              <button onClick={() => setHistoryItem(null)} className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingHistory ? <div className="p-8 text-center text-slate-400">Ładowanie...</div>
              : historyLogs.length === 0 ? <div className="p-8 text-center text-slate-400">Brak historii</div>
              : <table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Użytkownik</th><th className="px-4 py-2">Typ</th><th className="px-4 py-2 text-right">Zmiana</th><th className="px-4 py-2 text-right">Stan po</th></tr>
              </thead><tbody className="divide-y divide-slate-100">
                {historyLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pl-PL')}</td>
                    <td className="px-4 py-2.5">{log.user?.email || 'System'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.operation_type === 'purchase' ? 'bg-emerald-50 text-emerald-700' :
                        log.operation_type === 'usage' ? 'bg-orange-50 text-orange-700' :
                        log.operation_type === 'return' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {log.operation_type === 'adjustment' && 'Korekta'}
                        {log.operation_type === 'usage' && 'Wydanie'}
                        {log.operation_type === 'purchase' && 'Zakup'}
                        {log.operation_type === 'return' && 'Zwrot'}
                      </span>
                      {log.comment && <div className="text-[10px] text-slate-400 mt-0.5">{log.comment}</div>}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-medium ${log.change_amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">{log.new_quantity}</td>
                  </tr>
                ))}
              </tbody></table>}
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Settings className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-800">Ustawienia magazynu</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Zarządzaj kategoriami i konfiguracją</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Categories Management */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" /> Kategorie produktowe
                </h4>

                {/* Add new category */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCategory()}
                    placeholder="Nowa kategoria..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCategory.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Dodaj
                  </button>
                </div>

                {/* Category list */}
                <div className="space-y-1.5">
                  {/* Built-in categories */}
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-2 mb-1">Domyślne</p>
                  {(WAREHOUSE_CATEGORIES as readonly string[]).map(cat => (
                    <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span className="text-sm text-slate-600 flex-1">{cat}</span>
                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">domyślna</span>
                    </div>
                  ))}

                  {/* Custom categories */}
                  {customCategories.length > 0 && (
                    <>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-3 mb-1">Własne</p>
                      {customCategories.map(cat => (
                        <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-amber-50/50 rounded-lg border border-amber-200 group">
                          <Tag className="w-3 h-3 text-amber-500" />
                          <span className="text-sm text-slate-700 flex-1 font-medium">{cat}</span>
                          <span className="text-[9px] text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded mr-1">
                            {items.filter(i => i.category === cat).length} pozycji
                          </span>
                          <button
                            onClick={() => {
                              if (items.some(i => i.category === cat)) {
                                if (!window.confirm(`Kategoria "${cat}" ma przypisane pozycje. Usunąć?`)) return;
                              }
                              removeCategory(cat);
                            }}
                            className="w-6 h-6 rounded-full hover:bg-red-100 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Categories from items not in defaults/custom */}
                  {(() => {
                    const otherCats = items
                      .map(i => i.category)
                      .filter(c => !WAREHOUSE_CATEGORIES.includes(c as any) && !customCategories.includes(c))
                      .filter((v, i, a) => a.indexOf(v) === i);
                    if (otherCats.length === 0) return null;
                    return (
                      <>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-3 mb-1">Z pozycji</p>
                        {otherCats.map(cat => (
                          <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-200">
                            <Tag className="w-3 h-3 text-blue-400" />
                            <span className="text-sm text-slate-600 flex-1">{cat}</span>
                            <span className="text-[9px] text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                              {items.filter(i => i.category === cat).length} pozycji
                            </span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Podsumowanie
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase">Pozycji aktywnych</p>
                    <p className="text-lg font-bold text-slate-800">{activeItems.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase">Wartość magazynu</p>
                    <p className="text-lg font-bold text-slate-800">{fmtEur(totalValue)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase">Niski stan</p>
                    <p className={`text-lg font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowStockCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase">Kategorii</p>
                    <p className="text-lg font-bold text-slate-800">{allCategories.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Receipt Modal */}
      {showBulkReceipt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowBulkReceipt(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Upload className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-800">Przyjęcie towaru (Bulk)</h3>
                  <p className="text-xs text-slate-400">Wklej dane z faktury: nazwa;ilość;cena za szt.</p>
                </div>
              </div>
              <button onClick={() => setShowBulkReceipt(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <textarea value={bulkText} onChange={e => parseBulkText(e.target.value)} rows={6} placeholder={"Słup 80x80;10;45.00\nProfil 40x40;20;22.50\nŚruba M10;100;0.35"} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
              {bulkParsed.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50"><tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Nazwa</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Ilość</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Cena</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkParsed.map((entry, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{entry.name}</td>
                          <td className="px-3 py-2 text-center font-mono">{entry.qty}</td>
                          <td className="px-3 py-2 text-right font-mono">{entry.price > 0 ? `${entry.price.toFixed(2)} €` : '—'}</td>
                          <td className="px-3 py-2 text-center">
                            {entry.matchedId ? <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">✓ Istniejący</span>
                              : <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-medium">+ Nowy</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 flex justify-between items-center">
              <span className="text-xs text-slate-400">{bulkParsed.length} pozycji do przyjęcia</span>
              <div className="flex gap-2">
                <button onClick={() => setShowBulkReceipt(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm">Anuluj</button>
                <button onClick={handleBulkReceive} disabled={bulkParsed.length === 0 || bulkSaving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-1.5">
                  {bulkSaving ? 'Zapisywanie...' : <><Check className="w-4 h-4" /> Przyjmij wszystko</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowAnalytics(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><BarChart3 className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-800">Analityka magazynu</h3>
                  <p className="text-xs text-slate-400">Zużycie materiałów i koszty per użytkownik</p>
                </div>
              </div>
              <button onClick={() => setShowAnalytics(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-6 overflow-y-auto flex-1">
              {loadingAnalytics ? <div className="p-8 text-center text-slate-400">Ładowanie danych...</div> : analyticsData && (
                <>
                  {/* Top Used Items */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Top 10 — najczęściej wydawane</h4>
                    <div className="space-y-2">
                      {analyticsData.topItems.map((entry, i) => {
                        const maxQty = analyticsData.topItems[0]?.totalQty || 1;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-400 w-5 text-right">{i + 1}.</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-slate-700">{entry.item?.name || 'Usunięty'}</span>
                                <span className="text-xs font-mono font-bold text-slate-600">{entry.totalQty} {entry.item?.unit || 'szt'}</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${(entry.totalQty / maxQty) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {analyticsData.topItems.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Brak danych o wydaniach</p>}
                    </div>
                  </div>

                  {/* Per-User Costs */}
                  <div className="border-t border-slate-200 pt-5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Koszty per użytkownik</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Użytkownik</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Operacji</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Wydano szt.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Koszt materiałów</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {analyticsData.userStats.map((u, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-medium text-slate-800">{u.name}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600">{u.ops}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600">{u.totalQty}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-red-600">{fmtEur(u.totalCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button onClick={() => setShowAnalytics(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium">Zamknij</button>
            </div>
          </div>
        </div>
      )}

      {/* Stocktake Modal */}
      {showStocktake && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowStocktake(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><ClipboardList className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-800">Inwentaryzacja</h3>
                  <p className="text-xs text-slate-400">Wpisz rzeczywisty stan — różnice zostaną automatycznie skorygowane</p>
                </div>
              </div>
              <button onClick={() => setShowStocktake(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0"><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Nazwa</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Stan systemowy</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Stan rzeczywisty</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Różnica</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stocktakeItems.map((entry, i) => {
                    const counted = entry.counted === '' ? null : parseInt(entry.counted);
                    const diff = counted !== null ? counted - entry.item.quantity : 0;
                    return (
                      <tr key={entry.item.id} className={`hover:bg-slate-50 ${diff !== 0 ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-800 text-sm">{entry.item.name}</div>
                          <div className="text-[10px] text-slate-400">{entry.item.category} · {entry.item.unit}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-600">{entry.item.quantity}</td>
                        <td className="px-3 py-2.5 text-center">
                          <input type="number" value={entry.counted} onChange={e => {
                            const upd = [...stocktakeItems];
                            upd[i] = { ...upd[i], counted: e.target.value };
                            setStocktakeItems(upd);
                          }} placeholder="—" className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-violet-500 outline-none font-mono" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {counted !== null && diff !== 0 ? (
                            <span className={`font-mono font-bold text-sm ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{diff > 0 ? '+' : ''}{diff}</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 p-4 flex justify-between items-center">
              <span className="text-xs text-slate-400">{stocktakeItems.filter(e => e.counted !== '' && e.counted !== String(e.item.quantity)).length} korekt do zapisu</span>
              <div className="flex gap-2">
                <button onClick={() => setShowStocktake(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm">Anuluj</button>
                <button onClick={handleStocktakeSave} disabled={stocktakeSaving} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-1.5">
                  {stocktakeSaving ? 'Zapisywanie...' : <><Check className="w-4 h-4" /> Zapisz inwentaryzację</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR Scanner Modal */}
      <DocumentScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        existingItems={items}
        onImport={async (scannedItems) => {
          if (!currentUser) return;
          let imported = 0;
          for (const entry of scannedItems) {
            if (entry.matchedId) {
              const item = items.find(i => i.id === entry.matchedId)!;
              await InventoryService.updateQuantity(entry.matchedId, item.quantity + entry.qty, currentUser.id, 'purchase', undefined, undefined, 'OCR Skan — przyjęcie');
              if (entry.price > 0) await InventoryService.updateItem(entry.matchedId, { purchasePrice: entry.price });
            } else {
              await InventoryService.addItem({ name: entry.name, quantity: entry.qty, purchasePrice: entry.price || undefined, category: entry.category || 'Inne', unit: entry.unit || 'szt', minQuantity: 0, isActive: true });
            }
            imported++;
          }
          toast.success(`✅ Zaimportowano ${imported} pozycji z dokumentu`);
          loadItems();
        }}
      />
    </div>
  );
};
