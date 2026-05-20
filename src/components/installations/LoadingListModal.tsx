import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Contract, OrderedItem, Installation } from '../../types';
import { DatabaseService } from '../../services/database';
import { InventoryService } from '../../services/database/inventory.service';
import {
    Package, X, CheckCircle2, Circle, Truck, ClipboardList,
    ArrowRight, Warehouse, User, Calendar, ChevronDown, ChevronUp,
    PackageCheck, AlertCircle, CheckCheck
} from 'lucide-react';

interface Props {
    installation: Installation;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

interface LoadingItem {
    id: string;
    name: string;
    source: 'contract' | 'warehouse';
    category?: string;
    quantity: number;
    technicalSpec?: string;
    supplier?: string;
    loaded: boolean;
}

const PARTS_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'none':          { label: 'Brak materiałów', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    'partial':       { label: 'Częściowo', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Package className="w-3.5 h-3.5" /> },
    'all_delivered': { label: 'Dostarczone', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <PackageCheck className="w-3.5 h-3.5" /> },
    'ready':         { label: 'Skompletowane', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    'loaded':        { label: 'Załadowane', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: <Truck className="w-3.5 h-3.5" /> },
    'on_site':       { label: 'Na miejscu', color: 'text-green-700 bg-green-50 border-green-200', icon: <CheckCheck className="w-3.5 h-3.5" /> },
};

export const LoadingListModal: React.FC<Props> = ({ installation, isOpen, onClose, onUpdate }) => {
    const { currentUser } = useAuth();
    const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [contractDetails, setContractDetails] = useState<any>(null);
    const [showWarehouse, setShowWarehouse] = useState(true);
    const [showContract, setShowContract] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        void loadData();
    }, [isOpen, installation.id]);

    const loadData = async () => {
        setLoading(true);
        const items: LoadingItem[] = [];

        try {
            // 1. Load contract items (orderedItems with status=delivered)
            if (installation.sourceType === 'contract' && installation.sourceId) {
                const { data: contract } = await supabase
                    .from('contracts')
                    .select('*, contract_data')
                    .eq('id', installation.sourceId)
                    .single();

                if (contract) {
                    setContractDetails(contract);
                    const orderedItems: OrderedItem[] = contract.contract_data?.orderedItems || [];
                    // Get existing loading state from installation_data
                    const existingLoadingState = (installation as any).installation_data?.loadingList || {};

                    orderedItems
                        .filter(oi => oi.status === 'delivered')
                        .forEach(oi => {
                            items.push({
                                id: `contract-${oi.id}`,
                                name: oi.name,
                                source: 'contract',
                                category: oi.category,
                                quantity: oi.quantity || 1,
                                technicalSpec: oi.technicalSpec,
                                supplier: oi.supplier,
                                loaded: existingLoadingState[`contract-${oi.id}`] || false,
                            });
                        });
                }
            }

            // 2. Load warehouse items issued for this installation
            try {
                const { data: transactions } = await supabase
                    .from('inventory_transactions')
                    .select('*, inventory_items(name, sku, category)')
                    .eq('reference_type', 'installation')
                    .eq('reference_id', installation.id)
                    .eq('type', 'usage');

                const existingLoadingState = (installation as any).installation_data?.loadingList || {};

                if (transactions) {
                    transactions.forEach((tx: any) => {
                        items.push({
                            id: `warehouse-${tx.id}`,
                            name: tx.inventory_items?.name || tx.notes || 'Pozycja magazynowa',
                            source: 'warehouse',
                            category: tx.inventory_items?.category,
                            quantity: Math.abs(tx.quantity_change),
                            loaded: existingLoadingState[`warehouse-${tx.id}`] || false,
                        });
                    });
                }
            } catch { /* inventory_transactions may not exist yet */ }

            setLoadingItems(items);
        } catch (err) {
            console.error('Failed to load loading list:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (itemId: string) => {
        setLoadingItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, loaded: !item.loaded } : item
        ));
    };

    const toggleAll = () => {
        const allLoaded = loadingItems.every(i => i.loaded);
        setLoadingItems(prev => prev.map(item => ({ ...item, loaded: !allLoaded })));
    };

    const handleConfirmLoading = async () => {
        const allLoaded = loadingItems.every(i => i.loaded);
        if (!allLoaded) {
            if (!window.confirm('Nie wszystkie pozycje zaznaczone. Kontynuować?')) return;
        }

        setSaving(true);
        try {
            // Save loading state to installation_data
            const loadingList: Record<string, boolean> = {};
            loadingItems.forEach(item => { loadingList[item.id] = item.loaded; });

            const userName = currentUser ? `${(currentUser as any).firstName || ''} ${(currentUser as any).lastName || ''}`.trim() || currentUser.email : 'System';

            const installationData = {
                ...((installation as any).installation_data || {}),
                loadingList,
                loadingConfirmedAt: new Date().toISOString(),
                loadingConfirmedBy: userName,
            };

            // Update installation
            await supabase
                .from('installations')
                .update({
                    installation_data: installationData,
                    parts_status: allLoaded ? 'loaded' : 'partial',
                    parts_ready: allLoaded,
                })
                .eq('id', installation.id);

            toast.success(allLoaded ? 'Wszystko załadowane — gotowe do wyjazdu!' : 'Lista załadunkowa zapisana');
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Failed to save loading list:', err);
            toast.error('Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const contractItems = loadingItems.filter(i => i.source === 'contract');
    const warehouseItems = loadingItems.filter(i => i.source === 'warehouse');
    const loadedCount = loadingItems.filter(i => i.loaded).length;
    const totalCount = loadingItems.length;
    const progressPercent = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;
    const allLoaded = loadedCount === totalCount && totalCount > 0;

    const currentPartsStatus = PARTS_STATUS_CONFIG[installation.partsStatus || 'none'] || PARTS_STATUS_CONFIG['none'];

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><ClipboardList className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-bold text-lg">Lista załadunkowa</h3>
                                <p className="text-indigo-100 text-xs mt-0.5">
                                    {installation.client.firstName} {installation.client.lastName} — {installation.client.city}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Status + Progress */}
                    <div className="mt-4 flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${currentPartsStatus.color}`}>
                            {currentPartsStatus.icon}
                            {currentPartsStatus.label}
                        </span>
                        <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                            <div className={`h-full transition-all duration-500 rounded-full ${allLoaded ? 'bg-emerald-400' : 'bg-white/80'}`}
                                style={{ width: `${progressPercent}%` }} />
                        </div>
                        <span className="text-sm font-bold text-white/90">{loadedCount}/{totalCount}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {loading ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-sm">Ładowanie listy materiałów...</p>
                        </div>
                    ) : totalCount === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-medium">Brak materiałów do załadowania</p>
                            <p className="text-xs mt-1">Upewnij się, że zamówione elementy mają status "Dostarczone"</p>
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <div className="flex items-center justify-between">
                                <button onClick={toggleAll}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors">
                                    {allLoaded ? <Circle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {allLoaded ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
                                </button>
                                {installation.productSummary && (
                                    <span className="text-xs text-slate-400 font-mono">{installation.productSummary}</span>
                                )}
                            </div>

                            {/* Contract Items */}
                            {contractItems.length > 0 && (
                                <div>
                                    <button onClick={() => setShowContract(!showContract)}
                                        className="flex items-center gap-2 w-full text-left mb-2">
                                        <Package className="w-4 h-4 text-indigo-500" />
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Zamówione elementy</span>
                                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                                            {contractItems.filter(i => i.loaded).length}/{contractItems.length}
                                        </span>
                                        {showContract ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
                                    </button>
                                    {showContract && (
                                        <div className="space-y-1.5">
                                            {contractItems.map(item => (
                                                <button key={item.id} onClick={() => toggleItem(item.id)}
                                                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                        item.loaded
                                                            ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                                                    }`}>
                                                    {item.loaded
                                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                        : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                                    }
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm font-semibold ${item.loaded ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
                                                            {item.name}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                                                            {item.quantity > 1 && <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">×{item.quantity}</span>}
                                                            {item.technicalSpec && <span className="font-mono">{item.technicalSpec}</span>}
                                                            {item.supplier && <span className="flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{item.supplier}</span>}
                                                        </div>
                                                    </div>
                                                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-colors ${item.loaded ? 'text-emerald-400' : 'text-slate-200'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Warehouse Items */}
                            {warehouseItems.length > 0 && (
                                <div>
                                    <button onClick={() => setShowWarehouse(!showWarehouse)}
                                        className="flex items-center gap-2 w-full text-left mb-2">
                                        <Warehouse className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Z magazynu</span>
                                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                                            {warehouseItems.filter(i => i.loaded).length}/{warehouseItems.length}
                                        </span>
                                        {showWarehouse ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
                                    </button>
                                    {showWarehouse && (
                                        <div className="space-y-1.5">
                                            {warehouseItems.map(item => (
                                                <button key={item.id} onClick={() => toggleItem(item.id)}
                                                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                        item.loaded
                                                            ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                                                            : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                                                    }`}>
                                                    {item.loaded
                                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                        : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                                    }
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm font-semibold ${item.loaded ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
                                                            {item.name}
                                                        </div>
                                                        {item.quantity > 1 && (
                                                            <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">×{item.quantity}</span>
                                                        )}
                                                    </div>
                                                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-colors ${item.loaded ? 'text-emerald-400' : 'text-slate-200'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {totalCount > 0 && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-2xl flex items-center justify-between">
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            {currentUser ? `${(currentUser as any).firstName || ''} ${(currentUser as any).lastName || ''}`.trim() || currentUser.email : ''}
                            <span className="text-slate-300">•</span>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date().toLocaleDateString('pl-PL')}
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200">
                                Zamknij
                            </button>
                            <button onClick={handleConfirmLoading} disabled={saving}
                                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 ${
                                    allLoaded
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}>
                                {allLoaded ? <CheckCheck className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                                {saving ? 'Zapisywanie...' : allLoaded ? 'Gotowe do wyjazdu!' : 'Zapisz postęp'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
