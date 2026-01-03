import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { InventoryService, type InventoryItem } from '../../services/database/inventory.service';
import { useAuth } from '../../contexts/AuthContext';
import { OrderService } from '../../services/database/order.service';
import type { Installation } from '../../types';

interface InventoryTransaction {
    id: string;
    created_at: string;
    user_id: string;
    user?: { email: string };
    operation_type: 'adjustment' | 'purchase' | 'usage' | 'return';
    change_amount: number;
    new_quantity: number;
    comment?: string;
    inventory_item_id: string;
}

export const InventoryDashboard: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Inne');
    const [newItemMinQty, setNewItemMinQty] = useState(5);
    const [newItemDescription, setNewItemDescription] = useState('');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const data = await InventoryService.getItems();
            setItems(data);
        } catch {
            toast.error('Błąd ładowania magazynu');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await InventoryService.addItem({
                name: newItemName,
                category: newItemCategory,
                quantity: 0,
                minQuantity: newItemMinQty,
                unit: 'szt',
                description: newItemDescription
            });
            toast.success('Dodano element');
            setNewItemName('');
            setNewItemDescription('');
            loadItems();
        } catch {
            toast.error('Błąd dodawania elementu');
        }
    };

    const { currentUser } = useAuth();
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    const [historyLogs, setHistoryLogs] = useState<InventoryTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [assignItem, setAssignItem] = useState<InventoryItem | null>(null);

    const loadHistory = async (item: InventoryItem) => {
        setHistoryItem(item);
        setLoadingHistory(true);
        try {
            const logs = await InventoryService.getTransactions(item.id);
            setHistoryLogs(logs);
        } catch (error) {
            console.error('Error loading history:', error);
            toast.error('Błąd ładowania historii');
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUpdateQuantity = async (id: string, currentQty: number, change: number) => {
        if (!currentUser) return;
        try {
            const newQty = Math.max(0, currentQty + change);
            await InventoryService.updateQuantity(
                id,
                newQty,
                currentUser.id,
                'adjustment',
                undefined,
                undefined,
                change > 0 ? 'Korekta (+)' : 'Korekta (-)'
            );
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, quantity: newQty } : item
            ));
        } catch {
            toast.error('Błąd aktualizacji stanu');
        }
    };

    const handleOrderRequest = async (item: InventoryItem) => {
        if (!currentUser) {
            toast.error('Musisz być zalogowany');
            return;
        }

        const confirmOrder = window.confirm(`Czy na pewno chcesz zgłosić zapotrzebowanie na: ${item.name}?`);
        if (!confirmOrder) return;

        try {
            const { error } = await OrderService.createOrderRequest({
                userId: currentUser.id,
                itemName: item.name,
                quantity: Math.max(item.minQuantity * 2, 10), // Suggest meaningful quantity, default logic
                description: `Automatyczne zgłoszenie z magazynu for ${item.category}`,
                inventoryItemId: item.id,
                status: 'pending'
            });

            if (error) throw error;

            toast.success('Zgłoszono zapotrzebowanie', {
                icon: '📦',
                duration: 4000
            });
        } catch (error) {
            console.error('Error creating order request:', error);
            toast.error('Błąd zgłaszania zapotrzebowania');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Ładowanie magazynu...</div>;

    const categories = Array.from(new Set(items.map(i => i.category)));

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Magazyn</h1>

            {/* Use Quick Add Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                <h2 className="text-sm font-semibold text-gray-600 uppercase mb-4">Dodaj nowy element</h2>
                <form onSubmit={handleAddItem} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Nazwa</label>
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                            placeholder="np. Uchwyt rynnowy"
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Opis (opcjonalnie)</label>
                        <input
                            type="text"
                            value={newItemDescription}
                            onChange={(e) => setNewItemDescription(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                            placeholder="Krótki opis, uwagi..."
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-xs text-gray-500 mb-1">Kategoria</label>
                        <input
                            type="text"
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                            placeholder="Kategoria"
                            list="categories"
                        />
                        <datalist id="categories">
                            <option value="Elektronika" />
                            <option value="Montażowe" />
                            <option value="Biuro" />
                            {categories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                    <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Min. Ilość</label>
                        <input
                            type="number"
                            value={newItemMinQty}
                            onChange={(e) => setNewItemMinQty(parseInt(e.target.value))}
                            className="w-full border rounded px-3 py-2 text-sm"
                            min="0"
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        Dodaj
                    </button>
                </form>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Nazwa</th>
                            <th className="px-6 py-3">Kategoria</th>
                            <th className="px-6 py-3 text-center">Stan</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Brak elementów w magazynie</td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const isLowStock = item.quantity <= item.minQuantity;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div>{item.name}</div>
                                            {item.description && <div className="text-xs text-gray-500 font-normal mt-0.5">{item.description}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{item.category}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                                                    className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
                                                >
                                                    -
                                                </button>
                                                <span className={`font-mono font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                                                    className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isLowStock ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200">
                                                    Niski stan (Min: {item.minQuantity})
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => loadHistory(item)}
                                                className="text-gray-600 hover:text-gray-800 text-xs font-medium border border-gray-200 px-3 py-1 rounded bg-gray-50"
                                            >
                                                Historia
                                            </button>
                                            <button
                                                onClick={() => setAssignItem(item)}
                                                className="text-orange-600 hover:text-orange-800 text-xs font-medium border border-orange-200 px-3 py-1 rounded bg-orange-50"
                                            >
                                                Pobierz
                                            </button>
                                            {isLowStock && (
                                                <button
                                                    onClick={() => handleOrderRequest(item)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-3 py-1 rounded bg-blue-50"
                                                >
                                                    Zamów
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assign Modal */}
            {
                assignItem && (
                    <AssignToInstallationModal
                        item={assignItem}
                        onClose={() => setAssignItem(null)}
                        onAssign={async (installationId, quantity) => {
                            try {
                                await InventoryService.updateQuantity(
                                    assignItem.id,
                                    assignItem.quantity - quantity,
                                    currentUser?.id,
                                    'usage',
                                    installationId,
                                    'installation',
                                    'Pobranie do montażu'
                                );
                                toast.success('Pobrano materiał');
                                setAssignItem(null);
                                loadItems(); // Refresh
                            } catch (error) {
                                console.error(error);
                                toast.error('Błąd pobierania');
                            }
                        }}
                    />
                )
            }

            {/* History Modal */}
            {
                historyItem && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                                <h3 className="font-semibold text-gray-800">
                                    Historia: {historyItem.name}
                                    <span className="text-gray-400 font-normal ml-2 text-sm">(Stan: {historyItem.quantity})</span>
                                </h3>
                                <button
                                    onClick={() => setHistoryItem(null)}
                                    className="w-8 h-8 rounded-full bg-white text-gray-400 hover:text-gray-600 flex items-center justify-center border border-gray-200"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-0 overflow-y-auto flex-1">
                                {loadingHistory ? (
                                    <div className="p-8 text-center text-gray-400">Ładowanie historii...</div>
                                ) : historyLogs.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">Brak historii transakcji</div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Data</th>
                                                <th className="px-6 py-3">Użytkownik</th>
                                                <th className="px-6 py-3">Typ</th>
                                                <th className="px-6 py-3 text-right">Zmiana</th>
                                                <th className="px-6 py-3 text-right">Stan po</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {historyLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                                                        {new Date(log.created_at).toLocaleString('pl-PL')}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-900">
                                                        {log.user?.email || 'System'}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${log.operation_type === 'adjustment' ? 'bg-gray-100 text-gray-700' :
                                                            log.operation_type === 'usage' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {log.operation_type === 'adjustment' && 'Korekta'}
                                                            {log.operation_type === 'usage' && 'Zużycie'}
                                                            {log.operation_type === 'purchase' && 'Zakup'}
                                                            {log.operation_type === 'return' && 'Zwrot'}
                                                        </span>
                                                        {log.comment && (
                                                            <div className="text-xs text-gray-400 mt-1">{log.comment}</div>
                                                        )}
                                                    </td>
                                                    <td className={`px-6 py-3 text-right font-mono font-medium ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-mono text-gray-600">
                                                        {log.new_quantity}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

const AssignToInstallationModal: React.FC<{
    item: InventoryItem;
    onClose: () => void;
    onAssign: (installationId: string, quantity: number) => Promise<void>;
}> = ({ item, onClose, onAssign }) => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInst, setSelectedInst] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [assigning, setAssigning] = useState(false);

    // Lazy load InstallationService to avoid circular deps if any, or just import at top if clean
    // Assuming simple import works.
    useEffect(() => {
        import('../../services/database/installation.service').then(async ({ InstallationService }) => {
            try {
                const data = await InstallationService.getAllInstallations();
                // Filter only active ones
                const active = data.filter(i =>
                    i.status === 'scheduled' ||
                    i.status === 'pending' ||
                    i.status === 'verification' ||
                    i.status === 'issue'
                );
                setInstallations(active);
            } catch (e) {
                console.error(e);
                toast.error('Błąd ładowania montaży');
            } finally {
                setLoading(false);
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInst) {
            toast.error('Wybierz montaż');
            return;
        }
        if (quantity > item.quantity) {
            toast.error('Brak wystarczającej ilości w magazynie');
            return;
        }

        setAssigning(true);
        await onAssign(selectedInst, quantity);
        setAssigning(false);
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Pobierz materiał</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Element: <span className="font-medium text-gray-900">{item.name}</span><br />
                    Dostępne: {item.quantity} {item.unit}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Montaż / Klient</label>
                        {loading ? (
                            <div className="text-sm text-gray-500">Ładowanie listy...</div>
                        ) : (
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                value={selectedInst}
                                onChange={e => setSelectedInst(e.target.value)}
                                required
                            >
                                <option value="">-- Wybierz montaż --</option>
                                {installations.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.client?.lastName} {inst.productSummary} ({inst.scheduledDate || 'Nieznana data'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ilość do pobrania</label>
                        <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value))}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border">
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={assigning || loading}
                            className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
                        >
                            {assigning ? 'Pobieranie...' : 'Zatwierdź pobranie'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
