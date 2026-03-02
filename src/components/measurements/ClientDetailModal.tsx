import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Measurement, Lead, Offer } from '../../types';
import { DatabaseService } from '../../services/database';
import { toast } from 'react-hot-toast';
import {
    X, User, MapPin, Phone, Mail, FileText, ExternalLink, Clock,
    Calendar, Tag, CheckCircle, AlertCircle, Loader2, Package, Briefcase
} from 'lucide-react';

interface ClientDetailModalProps {
    measurement: Measurement;
    onClose: () => void;
    onEdit: (measurement: Measurement) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
    measurement,
    onClose,
    onEdit,
}) => {
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContext = async () => {
            setLoading(true);
            try {
                // Try to load lead
                if (measurement.leadId) {
                    const leadData = await DatabaseService.getLead(measurement.leadId);
                    setLead(leadData);

                    // Load offers linked to this lead
                    if (leadData) {
                        try {
                            const leadOffers = await DatabaseService.getLeadOffers(measurement.leadId);
                            setOffers(leadOffers);
                        } catch (e) {
                            console.error('Error loading offers:', e);
                        }
                    }
                }

                // If we have an offerId directly, load that offer
                if (measurement.offerId && offers.length === 0) {
                    try {
                        const offer = await DatabaseService.getOffer(measurement.offerId);
                        if (offer) {
                            setOffers(prev => {
                                if (prev.find(o => o.id === offer.id)) return prev;
                                return [...prev, offer];
                            });
                        }
                    } catch (e) {
                        console.error('Error loading offer:', e);
                    }
                }
            } catch (e) {
                console.error('Error loading client context:', e);
            } finally {
                setLoading(false);
            }
        };

        loadContext();
    }, [measurement.leadId, measurement.offerId]);

    const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
        scheduled: { label: 'Zaplanowany', color: 'bg-blue-100 text-blue-700', icon: Calendar },
        completed: { label: 'Zrealizowany', color: 'bg-green-100 text-green-700', icon: CheckCircle },
        cancelled: { label: 'Anulowany', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    };

    const outcomeConfig: Record<string, { label: string; color: string }> = {
        signed: { label: 'Podpisano umowę', color: 'bg-green-100 text-green-700' },
        considering: { label: 'Do przemyślenia', color: 'bg-amber-100 text-amber-700' },
        rejected: { label: 'Rezygnacja', color: 'bg-red-100 text-red-700' },
        no_show: { label: 'Nie stawił się', color: 'bg-slate-100 text-slate-600' },
    };

    const status = statusConfig[measurement.status] || statusConfig.scheduled;
    const StatusIcon = status.icon;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 pb-3 border-b border-slate-100">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {measurement.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 truncate">{measurement.customerName}</h2>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {status.label}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kontakt</h3>
                        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                            {measurement.customerAddress && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(measurement.customerAddress)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-accent transition-colors group"
                                >
                                    <MapPin className="w-4 h-4 text-slate-400 group-hover:text-accent shrink-0" />
                                    <span className="truncate">{measurement.customerAddress}</span>
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                                </a>
                            )}
                            {measurement.customerPhone && (
                                <a
                                    href={`tel:${measurement.customerPhone}`}
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-accent transition-colors"
                                >
                                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                    {measurement.customerPhone}
                                </a>
                            )}
                            {lead?.email && (
                                <a
                                    href={`mailto:${lead.email}`}
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-accent transition-colors"
                                >
                                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                    {lead.email}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Measurement Details */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Szczegóły pomiaru</h3>
                        <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Data
                                </span>
                                <span className="font-medium text-slate-800">
                                    {new Date(measurement.scheduledDate).toLocaleDateString('pl-PL', {
                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Przedstawiciel
                                </span>
                                <span className="font-medium text-slate-800">{measurement.salesRepName}</span>
                            </div>
                            {measurement.outcome && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Wynik</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${outcomeConfig[measurement.outcome]?.color || ''}`}>
                                        {outcomeConfig[measurement.outcome]?.label || measurement.outcome}
                                    </span>
                                </div>
                            )}
                            {measurement.notes && (
                                <div className="pt-2 border-t border-slate-200">
                                    <p className="text-slate-600 italic text-xs">„{measurement.notes}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lead Section */}
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                            <span className="ml-2 text-sm text-slate-400">Ładowanie danych klienta...</span>
                        </div>
                    ) : (
                        <>
                            {lead && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead / Zapytanie</h3>
                                    <button
                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all text-left group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold text-blue-800 flex items-center gap-1.5">
                                                <Briefcase className="w-4 h-4" />
                                                {lead.name || lead.company || measurement.customerName}
                                            </span>
                                            <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        {lead.source && (
                                            <div className="flex items-center gap-1 text-xs text-blue-600">
                                                <Tag className="w-3 h-3" />
                                                Źródło: {lead.source}
                                            </div>
                                        )}
                                        {lead.status && (
                                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                Status: {lead.status}
                                            </div>
                                        )}
                                        <div className="mt-1.5 text-[11px] text-blue-500">
                                            Kliknij aby otworzyć szczegóły leada →
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Offers */}
                            {offers.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Oferty ({offers.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {offers.map(offer => (
                                            <button
                                                key={offer.id}
                                                onClick={() => navigate(`/offers/${offer.id}`)}
                                                className="w-full bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-200 hover:border-emerald-300 hover:shadow-sm transition-all text-left group"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                                                        <Package className="w-4 h-4" />
                                                        {offer.offerNumber || 'Oferta'}
                                                    </span>
                                                    <ExternalLink className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-emerald-600">
                                                    {offer.productName && (
                                                        <span>{offer.productName}</span>
                                                    )}
                                                    {offer.totalPrice !== undefined && offer.totalPrice > 0 && (
                                                        <span className="font-bold">
                                                            {offer.totalPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} €
                                                        </span>
                                                    )}
                                                </div>
                                                {offer.createdAt && (
                                                    <div className="text-[11px] text-emerald-500 mt-0.5">
                                                        Utworzono: {new Date(offer.createdAt).toLocaleDateString('pl-PL')}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No lead warning */}
                            {!lead && !measurement.leadId && (
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                                    <div className="flex items-center gap-2 text-sm text-amber-700">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>Ten pomiar nie ma przypisanego leada.</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-slate-100 flex gap-2">
                    <button
                        onClick={() => {
                            onClose();
                            onEdit(measurement);
                        }}
                        className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Edytuj pomiar
                    </button>
                    {measurement.leadId && (
                        <button
                            onClick={() => navigate(`/leads/${measurement.leadId}`)}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        >
                            <Briefcase className="w-4 h-4" />
                            Otwórz Lead
                        </button>
                    )}
                    {measurement.customerPhone && (
                        <a
                            href={`tel:${measurement.customerPhone}`}
                            className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        >
                            <Phone className="w-4 h-4" />
                            Zadzwoń
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
