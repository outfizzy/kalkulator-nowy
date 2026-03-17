import React, { useEffect, useState } from 'react';
import { OfferService } from '../../services/database/offer.service';

interface Interaction {
    id: string;
    offerId?: string;
    eventType: string;
    eventData: Record<string, any>;
    createdAt: Date;
}

interface CustomerActivityTimelineProps {
    leadId?: string;
    customerId?: string;
}

const EVENT_CONFIG: Record<string, { icon: string; label: string; colorClass: string }> = {
    offer_view: { icon: '👁️', label: 'Wyświetlono ofertę', colorClass: 'bg-blue-100 text-blue-700 border-blue-200' },
    pdf_click: { icon: '📄', label: 'Kliknięto "Akceptuj/PDF"', colorClass: 'bg-green-100 text-green-700 border-green-200' },
    measurement_request: { icon: '📏', label: 'Prośba o pomiar', colorClass: 'bg-amber-100 text-amber-700 border-amber-200' },
    message_sent: { icon: '💬', label: 'Wysłano wiadomość', colorClass: 'bg-purple-100 text-purple-700 border-purple-200' },
    addon_inquiry: { icon: '➕', label: 'Zapytanie o dodatki', colorClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    contact_request: { icon: '📞', label: 'Prośba o kontakt', colorClass: 'bg-teal-100 text-teal-700 border-teal-200' },
};

export const CustomerActivityTimeline: React.FC<CustomerActivityTimelineProps> = ({ leadId, customerId }) => {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInteractions = async () => {
            try {
                let data: Interaction[] = [];
                if (leadId) {
                    data = await OfferService.getLeadInteractions(leadId);
                } else if (customerId) {
                    data = await OfferService.getCustomerInteractions(customerId);
                }
                setInteractions(data);
            } catch (error) {
                console.error('Error fetching interactions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInteractions();
    }, [leadId, customerId]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-slate-100 rounded-lg" />
                ))}
            </div>
        );
    }

    if (interactions.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm">Brak aktywności klienta</p>
                <p className="text-xs mt-1">Aktywność pojawi się gdy klient otworzy ofertę</p>
            </div>
        );
    }

    // Group by date
    const groupedByDate = interactions.reduce((acc, item) => {
        const dateKey = item.createdAt.toLocaleDateString('pl-PL');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {} as Record<string, Interaction[]>);

    return (
        <div className="space-y-4">
            {Object.entries(groupedByDate).map(([date, items]) => (
                <div key={date}>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{date}</div>
                    <div className="space-y-2">
                        {items.map(interaction => {
                            const config = EVENT_CONFIG[interaction.eventType] || {
                                icon: '📌',
                                label: interaction.eventType,
                                colorClass: 'bg-slate-100 text-slate-700 border-slate-200'
                            };

                            return (
                                <div
                                    key={interaction.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${config.colorClass}`}
                                >
                                    <span className="text-lg">{config.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">{config.label}</div>
                                        {interaction.eventData?.messagePreview && (
                                            <div className="text-xs text-slate-500 truncate">
                                                "{interaction.eventData.messagePreview}..."
                                            </div>
                                        )}
                                        {interaction.eventData?.preferredDays && (
                                            <div className="text-xs text-slate-500">
                                                Dni: {Array.isArray(interaction.eventData.preferredDays) ? interaction.eventData.preferredDays.join(', ') : String(interaction.eventData.preferredDays)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 shrink-0">
                                        {interaction.createdAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
