/**
 * B2B Orders Page
 * Partner page for viewing order status and timeline
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BOrder, B2BOrderStatus } from '../../services/database/b2b.service';
import { format } from 'date-fns';
import { de, pl, enUS } from 'date-fns/locale';
import { useTranslation } from '../../contexts/TranslationContext';

const STATUS_STYLES: Record<B2BOrderStatus, { color: string; icon: string; step: number }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⏳', step: 1 },
    approved: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '✅', step: 2 },
    rejected: { color: 'bg-red-100 text-red-800 border-red-300', icon: '❌', step: -1 },
    awaiting_payment: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '💳', step: 2 },
    in_production: { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🏭', step: 3 },
    shipped: { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: '🚚', step: 4 },
    delivered: { color: 'bg-green-100 text-green-800 border-green-300', icon: '📦', step: 5 },
    cancelled: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '🚫', step: -1 }
};

type FilterType = 'all' | 'active' | 'completed';

export function B2BOrdersPage() {
    const { t, language } = useTranslation();
    const [orders, setOrders] = useState<B2BOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<B2BOrder | null>(null);
    const [filter, setFilter] = useState<FilterType>('active');

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        setLoading(true);
        try {
            const partner = await B2BService.getCurrentPartner();
            if (partner) {
                const data = await B2BService.getOrders(partner.id);
                setOrders(data);
            }
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

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'active') return ['pending', 'approved', 'awaiting_payment', 'in_production', 'shipped'].includes(order.status);
        if (filter === 'completed') return ['delivered', 'rejected', 'cancelled'].includes(order.status);
        return true;
    });

    const counts = {
        all: orders.length,
        active: orders.filter(o => ['pending', 'approved', 'awaiting_payment', 'in_production', 'shipped'].includes(o.status)).length,
        completed: orders.filter(o => ['delivered', 'rejected', 'cancelled'].includes(o.status)).length
    };

    // Progress steps for visualization
    const progressSteps = [
        { step: 1, label: t('b2b.ordersPage.steps.ordered'), icon: '📋' },
        { step: 2, label: t('b2b.ordersPage.steps.approved'), icon: '✅' },
        { step: 3, label: t('b2b.ordersPage.steps.production'), icon: '🏭' },
        { step: 4, label: t('b2b.ordersPage.steps.shipping'), icon: '🚚' },
        { step: 5, label: t('b2b.ordersPage.steps.delivered'), icon: '📦' }
    ];

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    🛒 {t('b2b.ordersPage.title')}
                </h1>
                <p className="text-gray-500 mt-1">{t('b2b.ordersPage.subtitle')}</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['active', 'completed', 'all'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {f === 'all' && `${t('b2b.offers.filterAll')} (${counts.all})`}
                            {f === 'active' && `${t('b2b.ordersPage.filterActive')} (${counts.active})`}
                            {f === 'completed' && `${t('b2b.ordersPage.filterCompleted')} (${counts.completed})`}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Lade Bestellungen...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Orders List */}
                    <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-800">
                                {filteredOrders.length} Bestellungen
                            </h2>
                        </div>
                        <div className="divide-y max-h-[700px] overflow-y-auto">
                            {filteredOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">📦</div>
                                    <p>{t('b2b.ordersPage.noOrders')}</p>
                                    <Link to="/b2b/offers" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                                        {t('b2b.ordersPage.viewOffers')} →
                                    </Link>
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
                                            <span className="font-bold text-gray-900">{order.order_number}</span>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium border ${STATUS_STYLES[order.status]?.color}`}>
                                                {STATUS_STYLES[order.status]?.icon}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 mb-1">
                                            {t(`statuses.${order.status}`)}
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">
                                                {format(new Date(order.created_at), 'dd.MM.yyyy')}
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                €{order.total_amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Order Detail */}
                    <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border min-h-[700px]">
                        {selectedOrder ? (
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLES[selectedOrder.status]?.color}`}>
                                            {STATUS_STYLES[selectedOrder.status]?.icon} {t(`statuses.${selectedOrder.status}`)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-gray-900">
                                            €{selectedOrder.total_amount.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Bestellt: {format(new Date(selectedOrder.created_at), 'dd.MM.yyyy HH:mm')}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {!['rejected', 'cancelled'].includes(selectedOrder.status) && (
                                    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                        <h3 className="font-semibold text-blue-900 mb-4">📍 Bestellstatus</h3>
                                        <div className="flex justify-between relative">
                                            {/* Progress Line */}
                                            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 mx-8"></div>
                                            <div
                                                className="absolute top-5 left-0 h-1 bg-blue-500 mx-8 transition-all duration-500"
                                                style={{
                                                    width: `calc(${((STATUS_CONFIG[selectedOrder.status]?.step || 1) - 1) / 4 * 100}% - 4rem)`
                                                }}
                                            ></div>

                                            {progressSteps.map((step, idx) => {
                                                const currentStep = STATUS_CONFIG[selectedOrder.status]?.step || 0;
                                                const isComplete = step.step <= currentStep;
                                                const isCurrent = step.step === currentStep;

                                                return (
                                                    <div key={step.step} className="flex flex-col items-center relative z-10">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${isComplete
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-gray-200 text-gray-500'
                                                            } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}>
                                                            {step.icon}
                                                        </div>
                                                        <span className={`mt-2 text-xs font-medium ${isComplete ? 'text-blue-700' : 'text-gray-500'
                                                            }`}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Rejection Notice */}
                                {selectedOrder.status === 'rejected' && selectedOrder.rejection_reason && (
                                    <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                                        <h3 className="font-semibold text-red-800 mb-2">❌ Bestellung abgelehnt</h3>
                                        <p className="text-red-700">{selectedOrder.rejection_reason}</p>
                                    </div>
                                )}

                                {/* Payment Info */}
                                {selectedOrder.prepayment_status === 'pending' && (
                                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                                        <h3 className="font-semibold text-orange-800 mb-2">💳 Anzahlung erforderlich</h3>
                                        <p className="text-orange-700">
                                            Bitte überweisen Sie <b>€{selectedOrder.prepayment_amount.toLocaleString()}</b> um die Bestellung zu starten.
                                        </p>
                                        <p className="text-sm text-orange-600 mt-2">
                                            Die Produktion beginnt nach Zahlungseingang.
                                        </p>
                                    </div>
                                )}

                                {/* Tracking */}
                                {selectedOrder.tracking_number && (
                                    <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                        <h3 className="font-semibold text-indigo-800 mb-2">🚚 Sendungsverfolgung</h3>
                                        <p className="font-mono text-lg text-indigo-900">{selectedOrder.tracking_number}</p>
                                    </div>
                                )}

                                {/* Delivery Date */}
                                {selectedOrder.estimated_delivery && (
                                    <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                                        <h3 className="font-semibold text-green-800 mb-2">📅 Voraussichtliche Lieferung</h3>
                                        <p className="text-lg text-green-900">
                                            {format(new Date(selectedOrder.estimated_delivery), 'EEEE, dd. MMMM yyyy', { locale: de })}
                                        </p>
                                    </div>
                                )}

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-2">📍 Lieferadresse</h4>
                                        {selectedOrder.shipping_address ? (
                                            <div className="text-sm text-gray-600">
                                                <p>{selectedOrder.shipping_address.street}</p>
                                                <p>{selectedOrder.shipping_address.zip} {selectedOrder.shipping_address.city}</p>
                                                <p>{selectedOrder.shipping_address.country}</p>
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-sm">Keine Adresse angegeben</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-2">💰 Zahlungsstatus</h4>
                                        <div className="text-sm">
                                            {selectedOrder.prepayment_status === 'not_required' && (
                                                <span className="text-gray-600">Keine Anzahlung erforderlich</span>
                                            )}
                                            {selectedOrder.prepayment_status === 'pending' && (
                                                <span className="text-orange-600 font-medium">
                                                    Anzahlung ausstehend: €{selectedOrder.prepayment_amount.toLocaleString()}
                                                </span>
                                            )}
                                            {selectedOrder.prepayment_status === 'paid' && (
                                                <span className="text-green-600 font-medium">✓ Anzahlung bezahlt</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="border-t pt-6">
                                    <h4 className="font-semibold text-gray-700 mb-4">📜 Bestellverlauf</h4>
                                    {selectedOrder.timeline?.length ? (
                                        <div className="space-y-4">
                                            {selectedOrder.timeline.map((entry, idx) => (
                                                <div key={entry.id} className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                                                        {STATUS_CONFIG[entry.status as B2BOrderStatus]?.icon || '•'}
                                                    </div>
                                                    <div className="flex-1 pb-4 border-b last:border-0">
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-medium text-gray-900">
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
                                        <p className="text-gray-400 text-sm">Keine Verlaufseinträge</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                                <div className="text-6xl mb-6 opacity-20">👈</div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">Bestellung auswählen</h3>
                                <p>Klicken Sie auf eine Bestellung, um Details anzuzeigen</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BOrdersPage;
