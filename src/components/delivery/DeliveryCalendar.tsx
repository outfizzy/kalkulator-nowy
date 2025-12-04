import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import type { Contract, OrderedItem } from '../../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

interface DeliveryItem extends OrderedItem {
    contractId: string;
    contractNumber: string;
    clientName: string;
}

export const DeliveryCalendar: React.FC = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getContracts();
            setContracts(data);
        } catch (error) {
            console.error('Error loading contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract all deliveries from all contracts
    const allDeliveries = useMemo((): DeliveryItem[] => {
        const deliveries: DeliveryItem[] = [];
        contracts.forEach(contract => {
            contract.orderedItems?.forEach(item => {
                if (item.plannedDeliveryDate) {
                    deliveries.push({
                        ...item,
                        contractId: contract.id,
                        contractNumber: contract.contractNumber,
                        clientName: `${contract.client.firstName} ${contract.client.lastName}`
                    });
                }
            });
        });
        return deliveries.sort((a, b) =>
            new Date(a.plannedDeliveryDate!).getTime() - new Date(b.plannedDeliveryDate!).getTime()
        );
    }, [contracts]);

    // Filter deliveries for current week view
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

    const getDeliveriesForDay = (date: Date) => {
        return allDeliveries.filter(d =>
            d.plannedDeliveryDate && isSameDay(parseISO(d.plannedDeliveryDate), date)
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'ordered': return 'bg-blue-100 border-blue-300 text-blue-800';
            case 'delivered': return 'bg-green-100 border-green-300 text-green-800';
            default: return 'bg-gray-100 border-gray-300 text-gray-800';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Roofing': return '🏠';
            case 'Awning': return '🌤️';
            case 'ZIP Screen': return '🪟';
            case 'Sliding Glass': return '🚪';
            case 'Accessories': return '💡';
            case 'Flooring': return '🪵';
            default: return '📦';
        }
    };

    // Upcoming deliveries (next 30 days)
    const upcomingDeliveries = allDeliveries.filter(d => {
        if (!d.plannedDeliveryDate) return false;
        const date = parseISO(d.plannedDeliveryDate);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return date >= now && date <= thirtyDaysFromNow;
    });

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Ładowanie kalendarza dostaw...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Kalendarz Dostaw</h1>
                    <p className="text-slate-500 mt-1">Planowane dostawy elementów zamówień</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'week' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Tydzień
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Lista
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-2xl font-bold text-slate-800">{allDeliveries.length}</div>
                    <div className="text-sm text-slate-500">Wszystkie dostawy</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-700">
                        {allDeliveries.filter(d => d.status === 'pending').length}
                    </div>
                    <div className="text-sm text-yellow-600">Oczekujące</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">
                        {allDeliveries.filter(d => d.status === 'ordered').length}
                    </div>
                    <div className="text-sm text-blue-600">Zamówione</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-700">
                        {allDeliveries.filter(d => d.status === 'delivered').length}
                    </div>
                    <div className="text-sm text-green-600">Dostarczone</div>
                </div>
            </div>

            {viewMode === 'week' ? (
                <>
                    {/* Week Navigation */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <button
                                onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="text-lg font-medium text-slate-800">
                                {format(currentWeekStart, 'd MMM', { locale: pl })} - {format(weekEnd, 'd MMM yyyy', { locale: pl })}
                            </div>
                            <button
                                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Week Grid */}
                        <div className="grid grid-cols-7 divide-x divide-slate-200">
                            {weekDays.map(day => {
                                const dayDeliveries = getDeliveriesForDay(day);
                                return (
                                    <div key={day.toISOString()} className={`min-h-[200px] ${isToday(day) ? 'bg-accent/5' : ''}`}>
                                        <div className={`p-2 text-center border-b ${isToday(day) ? 'bg-accent text-white' : 'bg-slate-50'}`}>
                                            <div className="text-xs uppercase">{format(day, 'EEE', { locale: pl })}</div>
                                            <div className="text-lg font-bold">{format(day, 'd')}</div>
                                        </div>
                                        <div className="p-2 space-y-2">
                                            {dayDeliveries.map(delivery => (
                                                <div
                                                    key={delivery.id}
                                                    onClick={() => navigate(`/contracts/${delivery.contractId}`)}
                                                    className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(delivery.status)}`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <span>{getCategoryIcon(delivery.category)}</span>
                                                        <span className="text-xs font-medium truncate">{delivery.name}</span>
                                                    </div>
                                                    <div className="text-xs opacity-75 truncate mt-1">{delivery.clientName}</div>
                                                    <div className="text-xs font-mono opacity-60">{delivery.contractNumber}</div>
                                                </div>
                                            ))}
                                            {dayDeliveries.length === 0 && (
                                                <div className="text-xs text-slate-300 text-center py-4">Brak dostaw</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-slate-50">
                        <h3 className="font-medium text-slate-700">Nadchodzące Dostawy (30 dni)</h3>
                    </div>
                    {upcomingDeliveries.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            Brak zaplanowanych dostaw w ciągu najbliższych 30 dni
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {upcomingDeliveries.map(delivery => (
                                <div
                                    key={delivery.id}
                                    onClick={() => navigate(`/contracts/${delivery.contractId}`)}
                                    className="p-4 hover:bg-slate-50 cursor-pointer flex items-center gap-4"
                                >
                                    <div className="text-2xl">{getCategoryIcon(delivery.category)}</div>
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800">{delivery.name}</div>
                                        <div className="text-sm text-slate-500">
                                            {delivery.clientName} • {delivery.contractNumber}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-slate-800">
                                            {format(parseISO(delivery.plannedDeliveryDate!), 'd MMM yyyy', { locale: pl })}
                                        </div>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                                            {delivery.status === 'pending' ? 'Oczekuje' : delivery.status === 'ordered' ? 'Zamówione' : 'Dostarczone'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
