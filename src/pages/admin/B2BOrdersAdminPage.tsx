/**
 * B2B Orders Admin Page
 * Admin page for reviewing and approving B2B partner orders
 */

import React, { useState, useEffect } from 'react';
import { B2BService, B2BOrder, B2BOrderStatus } from '../../services/database/b2b.service';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

const STATUS_CONFIG: Record<B2BOrderStatus, { label: string; color: string; icon: string }> = {
    pending: { label: 'Oczekuje', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⏳' },
    approved: { label: 'Zatwierdzone', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '✅' },
    rejected: { label: 'Odrzucone', color: 'bg-red-100 text-red-800 border-red-300', icon: '❌' },
    awaiting_payment: { label: 'Oczekuje na zaliczkę', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '💳' },
    in_production: { label: 'W produkcji', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🏭' },
    shipped: { label: 'Wysłane', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: '🚚' },
    delivered: { label: 'Dostarczone', color: 'bg-green-100 text-green-800 border-green-300', icon: '📦' },
    cancelled: { label: 'Anulowane', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '🚫' }
};

type FilterStatus = 'all' | 'pending' | 'active' | 'completed';

export function B2BOrdersAdminPage() {
    const [orders, setOrders] = useState<B2BOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<B2BOrder | null>(null);
    const [filter, setFilter] = useState<FilterStatus>('pending');
    const [processing, setProcessing] = useState(false);

    // Rejection modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Status update modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState<B2BOrderStatus | null>(null);
    const [statusNote, setStatusNote] = useState('');

    // Tracking modal
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        setLoading(true);
        try {
            const data = await B2BService.getOrders();
            setOrders(data);
        } catch (err) {
            console.error('Error loading orders:', err);
        }
        setLoading(false);
    }

    async function loadOrderDetail(orderId: string) {
        try {
            const order = await B2BService.getOrderById(orderId);
            setSelectedOrder(order);
        } catch (err) {
            console.error('Error loading order:', err);
        }
    }

    async function handleApprove(orderId: string) {
        setProcessing(true);
        try {
            await B2BService.approveOrder(orderId);
            await loadOrders();
            await loadOrderDetail(orderId);
        } catch (err) {
            console.error('Error approving order:', err);
        }
        setProcessing(false);
    }

    async function handleReject() {
        if (!selectedOrder || !rejectReason.trim()) return;
        setProcessing(true);
        try {
            await B2BService.rejectOrder(selectedOrder.id, rejectReason);
            await loadOrders();
            await loadOrderDetail(selectedOrder.id);
            setShowRejectModal(false);
            setRejectReason('');
        } catch (err) {
            console.error('Error rejecting order:', err);
        }
        setProcessing(false);
    }

    async function handleStatusUpdate() {
        if (!selectedOrder || !newStatus) return;
        setProcessing(true);
        try {
            await B2BService.updateOrderStatus(selectedOrder.id, newStatus, statusNote);
            await loadOrders();
            await loadOrderDetail(selectedOrder.id);
            setShowStatusModal(false);
            setNewStatus(null);
            setStatusNote('');
        } catch (err) {
            console.error('Error updating status:', err);
        }
        setProcessing(false);
    }

    async function handleSetTracking() {
        if (!selectedOrder || !trackingNumber.trim()) return;
        setProcessing(true);
        try {
            await B2BService.setTrackingNumber(selectedOrder.id, trackingNumber);
            await loadOrders();
            await loadOrderDetail(selectedOrder.id);
            setShowTrackingModal(false);
            setTrackingNumber('');
        } catch (err) {
            console.error('Error setting tracking:', err);
        }
        setProcessing(false);
    }

    // Filter orders
    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'pending') return order.status === 'pending';
        if (filter === 'active') return ['approved', 'awaiting_payment', 'in_production', 'shipped'].includes(order.status);
        if (filter === 'completed') return ['delivered', 'rejected', 'cancelled'].includes(order.status);
        return true;
    });

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const activeCount = orders.filter(o => ['approved', 'awaiting_payment', 'in_production', 'shipped'].includes(o.status)).length;

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    📋 Zamówienia B2B
                </h1>
                <p className="text-gray-500 mt-1">Akceptuj zamówienia partnerów i zarządzaj statusami</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div
                    onClick={() => setFilter('pending')}
                    className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-yellow-400' : 'hover:border-gray-300'}`}
                >
                    <div className="text-sm text-gray-500">⏳ Oczekujące</div>
                    <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
                </div>
                <div
                    onClick={() => setFilter('active')}
                    className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${filter === 'active' ? 'ring-2 ring-blue-400' : 'hover:border-gray-300'}`}
                >
                    <div className="text-sm text-gray-500">🔄 W realizacji</div>
                    <div className="text-3xl font-bold text-blue-600">{activeCount}</div>
                </div>
                <div
                    onClick={() => setFilter('completed')}
                    className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${filter === 'completed' ? 'ring-2 ring-green-400' : 'hover:border-gray-300'}`}
                >
                    <div className="text-sm text-gray-500">✅ Zakończone</div>
                    <div className="text-3xl font-bold text-green-600">
                        {orders.filter(o => o.status === 'delivered').length}
                    </div>
                </div>
                <div
                    onClick={() => setFilter('all')}
                    className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-gray-400' : 'hover:border-gray-300'}`}
                >
                    <div className="text-sm text-gray-500">📊 Łącznie</div>
                    <div className="text-3xl font-bold text-gray-900">{orders.length}</div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Ładowanie zamówień...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Orders List */}
                    <div className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                            <h2 className="font-semibold text-gray-800">
                                {filter === 'pending' && '⏳ Oczekujące na akceptację'}
                                {filter === 'active' && '🔄 Zamówienia w realizacji'}
                                {filter === 'completed' && '✅ Zamówienia zakończone'}
                                {filter === 'all' && '📋 Wszystkie zamówienia'}
                            </h2>
                            <span className="text-sm text-gray-500">{filteredOrders.length}</span>
                        </div>
                        <div className="divide-y max-h-[700px] overflow-y-auto">
                            {filteredOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>Brak zamówień w tej kategorii</p>
                                </div>
                            ) : (
                                filteredOrders.map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => loadOrderDetail(order.id)}
                                        className={`p-4 cursor-pointer transition-colors ${selectedOrder?.id === order.id
                                                ? 'bg-blue-50 border-l-4 border-blue-600'
                                                : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-bold text-gray-900">{order.order_number}</span>
                                                <span className="ml-2 text-sm text-gray-500">
                                                    {order.partner?.company_name}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium border ${STATUS_CONFIG[order.status].color}`}>
                                                {STATUS_CONFIG[order.status].icon} {STATUS_CONFIG[order.status].label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">
                                                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: de })}
                                            </span>
                                            <span className="font-semibold text-gray-900">
                                                €{order.total_amount.toLocaleString()}
                                            </span>
                                        </div>
                                        {order.status === 'pending' && (
                                            <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                                ⚠️ Wymaga akceptacji
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Order Detail */}
                    <div className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-sm border min-h-[700px]">
                        {selectedOrder ? (
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6 pb-4 border-b">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                                        <p className="text-gray-500">{selectedOrder.partner?.company_name}</p>
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${STATUS_CONFIG[selectedOrder.status].color}`}>
                                            {STATUS_CONFIG[selectedOrder.status].icon} {STATUS_CONFIG[selectedOrder.status].label}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-gray-900">
                                            €{selectedOrder.total_amount.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {format(new Date(selectedOrder.created_at), 'dd.MM.yyyy HH:mm')}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons for Pending */}
                                {selectedOrder.status === 'pending' && (
                                    <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                        <h3 className="font-semibold text-yellow-800 mb-3">⚠️ Zamówienie wymaga akceptacji</h3>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApprove(selectedOrder.id)}
                                                disabled={processing}
                                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2"
                                            >
                                                ✅ Akceptuj zamówienie
                                            </button>
                                            <button
                                                onClick={() => setShowRejectModal(true)}
                                                disabled={processing}
                                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center gap-2"
                                            >
                                                ❌ Odrzuć
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Prepayment Info */}
                                {selectedOrder.prepayment_status === 'pending' && (
                                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                                        <h3 className="font-semibold text-orange-800 mb-2">💳 Oczekiwana zaliczka</h3>
                                        <div className="flex justify-between items-center">
                                            <span className="text-orange-700">
                                                Kwota: <b>€{selectedOrder.prepayment_amount.toLocaleString()}</b>
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setNewStatus('in_production');
                                                    setStatusNote('Zaliczka opłacona');
                                                    setShowStatusModal(true);
                                                }}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                                            >
                                                ✓ Oznacz jako opłacone
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Order Details Grid */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-700 mb-2">📦 Produkty</h4>
                                            {selectedOrder.offer?.items?.length ? (
                                                <div className="space-y-2">
                                                    {selectedOrder.offer.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span>{item.product_name} {item.variant && `(${item.variant})`}</span>
                                                            <span className="font-medium">€{item.partner_price?.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-400 text-sm">Brak szczegółów produktów</p>
                                            )}
                                        </div>
                                        {selectedOrder.tracking_number && (
                                            <div className="p-4 bg-indigo-50 rounded-lg">
                                                <h4 className="font-medium text-indigo-700 mb-1">🚚 Tracking</h4>
                                                <p className="font-mono text-indigo-900">{selectedOrder.tracking_number}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-700 mb-2">📍 Adres dostawy</h4>
                                            {selectedOrder.shipping_address ? (
                                                <div className="text-sm text-gray-600">
                                                    <p>{selectedOrder.shipping_address.street}</p>
                                                    <p>{selectedOrder.shipping_address.zip} {selectedOrder.shipping_address.city}</p>
                                                    <p>{selectedOrder.shipping_address.country}</p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-400 text-sm">Brak adresu</p>
                                            )}
                                        </div>
                                        {selectedOrder.estimated_delivery && (
                                            <div className="p-4 bg-blue-50 rounded-lg">
                                                <h4 className="font-medium text-blue-700 mb-1">📅 Szacowana dostawa</h4>
                                                <p className="font-medium text-blue-900">
                                                    {format(new Date(selectedOrder.estimated_delivery), 'dd.MM.yyyy')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="border-t pt-6">
                                    <h4 className="font-semibold text-gray-700 mb-4">📜 Historia zamówienia</h4>
                                    {selectedOrder.timeline?.length ? (
                                        <div className="space-y-3">
                                            {selectedOrder.timeline.map((entry, idx) => (
                                                <div key={entry.id} className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                                                        {STATUS_CONFIG[entry.status as B2BOrderStatus]?.icon || '•'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">
                                                                {STATUS_CONFIG[entry.status as B2BOrderStatus]?.label || entry.status}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm')}
                                                            </span>
                                                        </div>
                                                        {entry.notes && (
                                                            <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm">Brak wpisów w historii</p>
                                    )}
                                </div>

                                {/* Admin Actions */}
                                {!['rejected', 'cancelled', 'delivered', 'pending'].includes(selectedOrder.status) && (
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="font-semibold text-gray-700 mb-3">⚙️ Akcje administracyjne</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedOrder.status === 'in_production' && (
                                                <button
                                                    onClick={() => setShowTrackingModal(true)}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                                                >
                                                    🚚 Dodaj tracking i wyślij
                                                </button>
                                            )}
                                            {selectedOrder.status === 'shipped' && (
                                                <button
                                                    onClick={() => {
                                                        setNewStatus('delivered');
                                                        setShowStatusModal(true);
                                                    }}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                >
                                                    📦 Oznacz jako dostarczone
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowStatusModal(true)}
                                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                                            >
                                                📋 Zmień status
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Rejection reason */}
                                {selectedOrder.status === 'rejected' && selectedOrder.rejection_reason && (
                                    <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                                        <h4 className="font-medium text-red-800 mb-1">❌ Powód odrzucenia</h4>
                                        <p className="text-red-700">{selectedOrder.rejection_reason}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                                <div className="text-6xl mb-6 opacity-20">👈</div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">Wybierz zamówienie</h3>
                                <p>Kliknij w zamówienie z listy aby zobaczyć szczegóły</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">❌ Odrzuć zamówienie</h3>
                        <p className="text-gray-600 mb-4">Podaj powód odrzucenia zamówienia. Partner zostanie o tym poinformowany.</p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
                            placeholder="Powód odrzucenia..."
                            rows={3}
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || processing}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {processing ? 'Przetwarzam...' : 'Odrzuć zamówienie'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Zmień status zamówienia</h3>
                        <select
                            value={newStatus || ''}
                            onChange={e => setNewStatus(e.target.value as B2BOrderStatus)}
                            className="w-full px-3 py-2 border rounded-lg mb-4"
                        >
                            <option value="">Wybierz nowy status</option>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.icon} {config.label}</option>
                            ))}
                        </select>
                        <textarea
                            value={statusNote}
                            onChange={e => setStatusNote(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg mb-4"
                            placeholder="Notatka (opcjonalna)..."
                            rows={2}
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowStatusModal(false); setNewStatus(null); }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleStatusUpdate}
                                disabled={!newStatus || processing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing ? 'Przetwarzam...' : 'Zmień status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking Modal */}
            {showTrackingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">🚚 Dodaj numer śledzenia</h3>
                        <p className="text-gray-600 mb-4">Podaj numer przesyłki. Status zamówienia zostanie zmieniony na "Wysłane".</p>
                        <input
                            type="text"
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4"
                            placeholder="Np. DHL123456789"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowTrackingModal(false); setTrackingNumber(''); }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSetTracking}
                                disabled={!trackingNumber.trim() || processing}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {processing ? 'Przetwarzam...' : 'Zapisz i wyślij'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BOrdersAdminPage;
