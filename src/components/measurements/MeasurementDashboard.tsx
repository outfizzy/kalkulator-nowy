import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MeasurementCalendar } from './MeasurementCalendar';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import type { Measurement, Offer } from '../../types';
import { AddMeasurementFromOffer } from './AddMeasurementFromOffer';
import { MeasurementRouteView } from './MeasurementRouteView';
import { CustomerSelector } from './CustomerSelector';
import type { Customer } from '../../types';
import { GeocodingService } from '../../services/GeocodingService';
import { MapPin } from 'lucide-react';
import { MeasurementModal } from './MeasurementModal';

export const MeasurementDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showOfferSelectionModal, setShowOfferSelectionModal] = useState(false);
    const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
    const [initialModalData, setInitialModalData] = useState<Partial<Measurement> | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'calendar' | 'route'>('calendar');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCustomerSelector, setShowCustomerSelector] = useState(false);
    const [availableOffersForCustomer, setAvailableOffersForCustomer] = useState<Offer[]>([]);

    const loadMeasurements = React.useCallback(async () => {
        try {
            setLoading(true);
            let data: Measurement[];

            if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
                data = await DatabaseService.getMeasurements();
            } else if (currentUser?.id) {
                data = await DatabaseService.getMeasurementsBySalesRep(currentUser.id);
            } else {
                data = [];
            }

            setMeasurements(data);
        } catch (error) {
            console.error('Error loading measurements:', error);
            toast.error('Błąd wczytywania pomiarów');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        loadMeasurements();
    }, [loadMeasurements]);

    const handleAddMeasurement = async (data: Partial<Measurement>) => {
        try {
            if (!currentUser?.id) {
                toast.error('Brak ID użytkownika');
                return;
            }

            if (!data.scheduledDate || !data.customerName || !data.customerAddress) {
                toast.error('Wymagane pola: Data, Klient, Adres');
                return;
            }

            await DatabaseService.createMeasurement({
                offerId: data.offerId,
                scheduledDate: data.scheduledDate,
                salesRepId: currentUser.id,
                customerName: data.customerName,
                customerAddress: data.customerAddress,
                customerPhone: data.customerPhone,
                notes: data.notes,
                estimatedDuration: data.estimatedDuration,
                locationLat: data.locationLat,
                locationLng: data.locationLng
            });

            toast.success('Pomiar został dodany');
            setShowAddModal(false);
            loadMeasurements();
        } catch (error) {
            console.error('Error creating measurement:', error);
            toast.error('Błąd dodawania pomiaru');
        }
    };

    const handleUpdateMeasurement = async (id: string, updates: Partial<Measurement>) => {
        try {
            await DatabaseService.updateMeasurement(id, updates);
            toast.success('Pomiar zaktualizowany');
            setEditingMeasurement(null);
            loadMeasurements();
        } catch (error) {
            console.error('Error updating measurement:', error);
            toast.error('Błąd aktualizacji pomiaru');
        }
    };

    const handleDragDrop = async (measurementId: string, newDateStr: string) => {
        try {
            const newDate = new Date(newDateStr);
            await DatabaseService.updateMeasurement(measurementId, {
                scheduledDate: newDate
            });
            toast.success('Pomiar przesunięty');
            loadMeasurements();
        } catch (error) {
            console.error('Error rescheduling measurement:', error);
            toast.error('Błąd przesuwania pomiaru');
        }
    };

    const handleDeleteMeasurement = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten pomiar?')) return;

        try {
            await DatabaseService.deleteMeasurement(id);
            toast.success('Pomiar usunięty');
            setEditingMeasurement(null);
            loadMeasurements();
        } catch (error) {
            console.error('Error deleting measurement:', error);
            toast.error('Błąd usuwania pomiaru');
        }
    };

    const handleOfferSelect = (offer: Offer) => {
        setInitialModalData({
            offerId: offer.id,
            customerName: `${offer.customer.firstName} ${offer.customer.lastName}`,
            customerAddress: `${offer.customer.street} ${offer.customer.houseNumber}, ${offer.customer.postalCode} ${offer.customer.city}`,
            customerPhone: offer.customer.phone,
            notes: `Oferta: ${offer.offerNumber}\nProdukt: ${offer.product.modelId}`
        });
        setShowOfferSelectionModal(false);
        setAvailableOffersForCustomer([]); // Clear specific offers list as we selected one
        setShowAddModal(true);
    };

    const handleCustomerSelect = async (customer: Customer) => {
        setShowCustomerSelector(false);

        // Find offers for this customer to allow linking
        try {
            const allOffers = await DatabaseService.getOffers();
            const customerOffers = allOffers.filter(o =>
                o.customer.email === customer.email ||
                (o.customer.firstName === customer.firstName && o.customer.lastName === customer.lastName)
            );
            setAvailableOffersForCustomer(customerOffers);
        } catch (e) {
            console.error('Error fetching customer offers', e);
            setAvailableOffersForCustomer([]);
        }

        setInitialModalData({
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerAddress: `${customer.street} ${customer.houseNumber}, ${customer.postalCode} ${customer.city}`,
            customerPhone: customer.phone,
        });
        setShowAddModal(true);
    };

    const handleReorder = async (newOrder: Measurement[]) => {
        try {
            // Update local state first (optimistic)
            setMeasurements(prev => {
                const otherMeasurements = prev.filter(m => !newOrder.find(nm => nm.id === m.id));
                return [...otherMeasurements, ...newOrder];
            });

            // Save to DB
            await Promise.all(newOrder.map((m, index) =>
                DatabaseService.updateMeasurement(m.id, { orderInRoute: index })
            ));

            toast.success('Kolejność zaktualizowana');
        } catch (error) {
            console.error('Error reordering:', error);
            toast.error('Błąd zapisu kolejności');
            loadMeasurements(); // Revert on error
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Kalendarz Pomiarowy</h1>
                    <p className="text-slate-500 mt-1">Zarządzaj pomiarami i trasami handlowców</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                        <span className="text-sm text-slate-500 mr-2">Zalogowany jako:</span>
                        <span className="font-bold text-slate-700">
                            {currentUser?.firstName} {currentUser?.lastName}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-semibold transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Dodaj Pomiar
                    </button>
                    <button
                        onClick={() => setShowOfferSelectionModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Dodaj z Oferty
                    </button>
                    <button
                        onClick={() => setShowCustomerSelector(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Dodaj z Bazy Klientów
                    </button>
                </div>
            </div>


            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'calendar' ? 'text-accent' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Kalendarz
                    {activeTab === 'calendar' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('route')}
                    className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'route' ? 'text-accent' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Trasa
                    {activeTab === 'route' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                    )}
                </button>
            </div>

            {/* Content */}
            {
                activeTab === 'calendar' ? (
                    <MeasurementCalendar
                        measurements={measurements}
                        onEdit={setEditingMeasurement}
                        onDragDrop={handleDragDrop}
                    />
                ) : (
                    <div className="space-y-4">
                        {/* Date Navigation for Route View */}
                        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <button
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setDate(newDate.getDate() - 1);
                                    setSelectedDate(newDate);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Poprzedni dzień
                            </button>

                            <div className="text-lg font-semibold text-slate-800">
                                {selectedDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>

                            <button
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setDate(newDate.getDate() + 1);
                                    setSelectedDate(newDate);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                Następny dzień
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <MeasurementRouteView
                            measurements={measurements.filter(m =>
                                new Date(m.scheduledDate).toDateString() === selectedDate.toDateString()
                            )}
                            onReorder={handleReorder}
                            date={selectedDate}
                        />
                    </div>
                )
            }

            {/* Add/Edit Modal */}
            {
                (showAddModal || editingMeasurement) && (
                    <MeasurementModal
                        measurement={editingMeasurement}
                        initialData={initialModalData}
                        onSave={(data) => {
                            if (editingMeasurement) {
                                handleUpdateMeasurement(editingMeasurement.id, data);
                            } else {
                                handleAddMeasurement(data);
                            }
                        }}
                        onDelete={editingMeasurement ? () => handleDeleteMeasurement(editingMeasurement.id) : undefined}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingMeasurement(null);
                            setInitialModalData(undefined);
                            setAvailableOffersForCustomer([]);
                        }}
                        availableOffers={availableOffersForCustomer}
                    />
                )
            }

            {/* Customer Selector Modal */}
            {
                showCustomerSelector && (
                    <CustomerSelector
                        onSelect={handleCustomerSelect}
                        onClose={() => setShowCustomerSelector(false)}
                    />
                )
            }

            {/* Offer Selection Modal */}
            {
                showOfferSelectionModal && (
                    <AddMeasurementFromOffer
                        onSelect={handleOfferSelect}
                        onClose={() => setShowOfferSelectionModal(false)}
                    />
                )
            }
        </div >
    );
};

// End of MeasurementDashboard
